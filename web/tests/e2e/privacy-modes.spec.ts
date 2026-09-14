import { expect, test, type Page, type Route } from "@playwright/test";

import { cards, connect, creditAccount, generate, horizontalOverflow, openTab, pickStock, pngBytes, signIn, slot, studioSignedIn, watchToReady } from "./helpers";

/*
 * Private and Standard takes, the account's private-mode block, and reporting a video.
 *
 * Tests tagged @needs-standard-gateway call endpoints from platform/gateway/STANDARD_MODE.md
 * (standard jobs, /v1/me/eligibility, /v1/reports) and pass only once the dev gateway serves
 * them. The rest run against today's gateway; where they need an error a test can't provoke on
 * demand (a restriction, a blocked upload), page.route answers that one call in the gateway's shape.
 */

const WIDTHS = [320, 375, 768];

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

function privacy(page: Page, name: "Private" | "Standard") {
  return page.getByRole("radio", { name, exact: true });
}

/** Answers one gateway call with an error body, as the gateway would. */
function gatewayError(status: number, detail: Record<string, unknown>) {
  return (route: Route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": route.request().headers()["origin"] ?? "*" },
      body: JSON.stringify({ detail }),
    });
}

async function backToComposer(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Create a video" }).click();
  await expect(page.getByRole("textbox", { name: /prompt/i })).toBeVisible();
}

test("the studio asks who can see each take, remembers the answer, and fits a phone", async ({ page }) => {
  await connect(page, { credit: false });
  await expect(privacy(page, "Private")).toBeChecked();
  await expect(page.getByText("KunoWorld and the GPU provider can see this video and your prompt.")).toBeVisible();
  await expect(page.getByText("Encrypted by the SDK")).toBeVisible();

  await privacy(page, "Standard").check();
  await expect(privacy(page, "Standard")).toBeChecked();
  await expect(page.getByText("Readable by KunoWorld")).toBeVisible();

  await page.reload();
  await expect(studioSignedIn(page)).toBeVisible();
  await expect(privacy(page, "Standard")).toBeChecked();
  await expectFits(page, "studio with the privacy choice");

  await privacy(page, "Private").check();
  await page.reload();
  await expect(privacy(page, "Private")).toBeChecked();
});

test("a refused private take says why: not eligible, or restricted until when @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);

  await page.route(
    "**/api/kuno/v1/videos",
    gatewayError(403, {
      code: "private_mode_not_eligible",
      message: "Private mode needs a verified payment.",
      reasons: ["no_verified_payment"],
    }),
  );
  await generate(page, "A lighthouse beam sweeps a foggy harbour");
  const refused = cards(page).first();
  await expect(refused).toHaveAttribute("data-step", "failed");
  await expect(refused).toHaveAttribute("data-privacy", "private");
  await expect(refused.getByRole("alert")).toContainText("Private mode isn't available on this account yet");
  await expect(refused.getByRole("alert")).toContainText("Add credit once");
  await expect(refused.getByRole("link", { name: "Add credit" })).toHaveAttribute("href", "/account#add-credit");

  await page.unroute("**/api/kuno/v1/videos");
  const until = Math.floor(Date.now() / 1000) + 3600;
  await page.route("**/api/kuno/v1/videos", gatewayError(403, { code: "account_restricted", message: "Restricted.", restricted_until: until }));
  await backToComposer(page);
  await generate(page, "A second take while the account is paused");
  const paused = cards(page).first();
  await expect(paused).toHaveAttribute("data-step", "failed");
  await expect(paused.getByRole("alert")).toContainText("Your account is paused");
  await expect(paused.getByRole("alert")).toContainText("You can make videos again after");
});

test("a blocked standard upload gets a generic message", async ({ page }) => {
  await connect(page, { credit: false });
  await pickStock(page, /LTX-2\.5 Fast/);
  await privacy(page, "Standard").check();
  await openTab(page, "Frames");
  await slot(page, "First frame").setInputFiles({ name: "first.png", mimeType: "image/png", buffer: pngBytes(640, 360, [20, 40, 90]) });

  // Routing stands in too, so this runs on a gateway that doesn't take the web session yet.
  await page.route("**/api/kuno/v1/route?**", (route) =>
    route.fulfill({ json: { profile_id: "ltx-2.5-fast", requested_profile_id: "ltx-2.5-fast", fallback_reason: null, enclaves: [] } }),
  );
  await page.route("**/api/kuno/v1/standard/uploads**", gatewayError(422, { code: "upload_blocked", message: "This file can't be used." }));
  await generate(page, "The frame drifts slowly into motion");
  const card = cards(page).first();
  await expect(card).toHaveAttribute("data-privacy", "standard");
  await expect(card).toHaveAttribute("data-step", "failed");
  await expect(card.getByRole("alert")).toContainText("This file can't be used");
});

test("the report page is linked, prefilled from a take, checks what it sends, and fits a phone", async ({ page }) => {
  await page.goto("/verify");
  await expect(page.getByRole("link", { name: "Report it" })).toHaveAttribute("href", "/report");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Report a video" })).toHaveAttribute("href", "/report");

  await page.goto("/report?job_id=job-123");
  await expect(page.getByRole("heading", { level: 1, name: "Report a video" })).toBeVisible();
  await expect(page.getByLabel("Job ID")).toHaveValue("job-123");
  await expect(page.getByText(/only way a reviewer can see that one video/)).toBeVisible();
  await expectFits(page, "report page");

  await page.goto("/report");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Send report" }) });
  await page.getByLabel("Reason").selectOption("copyright");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(form.getByRole("alert")).toContainText("Tell us which video");

  await page.getByLabel("Job ID").fill("job-123");
  // A key is offered only for child-safety reports.
  await expect(page.getByLabel("Output key (optional)")).toHaveCount(0);
  await page.getByLabel("Reason").selectOption("csam");
  await page.getByLabel("Output key (optional)").fill("not a key!");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(form.getByRole("alert")).toContainText("doesn't look like a KunoWorld output key");
});

test("a report reaches the gateway @needs-standard-gateway", async ({ page }) => {
  await page.goto("/report");
  await page.getByLabel("Content digest (SHA-256)").fill("ab".repeat(32));
  await page.getByLabel("Reason").selectOption("other");
  await page.getByLabel("Details (optional)").fill("End-to-end test report");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Report received" })).toBeVisible();
});

test("a standard take renders and plays, and shares the library with private takes @needs-standard-gateway @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);

  await generate(page, "A private take: rain on a tin roof");
  await watchToReady(cards(page).first());
  await expect(cards(page).first()).toHaveAttribute("data-privacy", "private");

  await backToComposer(page);
  await privacy(page, "Standard").check();
  await generate(page, "A standard take: a paper boat crosses a puddle");
  const standard = page.locator('article[data-step][data-privacy="standard"]').first();
  await watchToReady(standard);
  await expect(standard.getByText("Standard", { exact: true })).toBeVisible();

  const video = standard.locator("video");
  await expect(video).toHaveAttribute("src", /^blob:/);
  const played = await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
    await new Promise((resolve) => setTimeout(resolve, 500));
    return v.currentTime;
  });
  expect(played, "the standard video should play").toBeGreaterThan(0);
  const jobId = await standard.getAttribute("data-take");

  // After a reload the private take comes back from this browser, the standard one from the gateway.
  await page.reload();
  await expect(studioSignedIn(page)).toBeVisible();
  await page.getByRole("button", { name: "My creations" }).click();
  const listed = page.locator(`article[data-take="${jobId}"]`);
  await expect(listed).toHaveAttribute("data-privacy", "standard");
  await expect(page.locator('article[data-privacy="private"]').first()).toBeVisible();
  await expect(listed.locator("img.take-poster")).toBeVisible();
  await listed.getByRole("button", { name: /Open take/ }).click();
  await expect(listed.locator("video")).toHaveAttribute("src", /^blob:/);

  // Deleting a standard take removes it from the gateway, so it stays gone after a reload.
  page.once("dialog", (dialog) => void dialog.accept());
  await listed.getByRole("button", { name: "Delete" }).click();
  await expect(listed).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "My creations" }).click();
  await expect(page.locator('article[data-privacy="private"]').first()).toBeVisible();
  await expect(page.locator(`article[data-take="${jobId}"]`)).toHaveCount(0);
});

test("a new account sees why private mode is off, in the studio and on its account page, until it has credit @needs-standard-gateway @needs-session-gateway", async ({
  page,
  request,
}) => {
  await signIn(page, `e2e-private-${Date.now()}@example.com`);
  await expect(page).toHaveURL(/\/account$/);
  const accountId = await page.locator("[data-account-id]").getAttribute("data-account-id");

  const block = page.getByRole("region", { name: "Private mode", exact: true });
  await expect(block.locator("[data-eligible]")).toHaveAttribute("data-eligible", "false");
  await expect(block).toContainText("Private mode isn't available on this account yet");
  await expect(block.getByRole("link", { name: "Add credit" })).toHaveAttribute("href", "#add-credit");
  await expect(block).toContainText("Strikes in the last 24 hours");
  await expectFits(page, "account page with the private-mode block");

  await page.goto("/studio");
  await expect(studioSignedIn(page)).toBeVisible();
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "A take this account can't make privately yet");
  const card = cards(page).first();
  await expect(card).toHaveAttribute("data-step", "failed");
  await expect(card.getByRole("alert")).toContainText("Private mode isn't available on this account yet");
  await expect(card.getByRole("link", { name: "Add credit" })).toBeVisible();

  await creditAccount(request, accountId!, 2, `e2e-private-${accountId}`);
  await page.goto("/account");
  await expect(block.locator("[data-eligible]")).toHaveAttribute("data-eligible", "true");
  await expect(block).toContainText("Private mode is on for this account");
});
