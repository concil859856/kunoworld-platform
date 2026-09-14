import { expect, test, type Page } from "@playwright/test";

import {
  GATEWAY,
  bearer,
  cards,
  creditAccount,
  generate,
  horizontalOverflow,
  inspectFilm,
  inspector,
  pickStock,
  signInWithCookie,
  studioSignedIn,
  watchToReady,
  type GatewaySession,
} from "./helpers";

/*
 * Key sync and share links (subnet/PRIVACY_MODES.md, "Key sync"; platform/gateway/STANDARD_MODE.md, "Key sync" and
 * "Share links").
 *
 * The tests run in order on one account of their own: the recovery code set up in the first unlocks a fresh browser
 * in the second. Tests tagged @needs-new-gateway need a gateway with /v1/me/keyvault and share links (migration 0011).
 */

test.describe.configure({ mode: "serial" });

const EMAIL = `e2e-keysync-${Date.now()}@example.com`;
const WIDTHS = [320, 375, 768];
const CODE = /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/;

let credited = false;
let recoveryCode = "";
let privateJobId = "";

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function openStudio(page: Page, { credit = true }: { credit?: boolean } = {}): Promise<GatewaySession> {
  const session = await signInWithCookie(page, EMAIL);
  if (credit && !credited && session.accountId) {
    // An operator credit also makes the account eligible for private mode.
    await creditAccount(page.request, session.accountId, 60, `e2e-keysync-${session.accountId}`);
    credited = true;
  }
  await page.goto("/studio");
  await expect(studioSignedIn(page)).toBeVisible();
  return session;
}

function privacy(page: Page, name: "Private" | "Standard") {
  return page.getByRole("radio", { name, exact: true });
}

/** Selects a take, makes a share link for it in the inspector, and returns the link as shown. */
async function createLink(page: Page, jobId: string, prompt: string): Promise<string> {
  await page.locator(`article[data-take="${jobId}"]`).getByText(prompt).click();
  const panel = inspector(page);
  await expect(panel.getByRole("heading", { name: prompt })).toBeVisible();
  await panel.getByRole("button", { name: "Share", exact: true }).click();
  const share = panel.getByRole("region", { name: "Share this video" });
  await expect(share).toContainText("Anyone with this link can watch this video");
  await share.getByRole("button", { name: "Create link" }).click();
  const field = share.getByLabel("Share link");
  await expect(field).toHaveValue(/\/s\/[A-Za-z0-9_-]{43}/);
  return field.inputValue();
}

/** The film key this browser's library holds for a take. */
function libraryKey(page: Page, jobId: string): Promise<string | null> {
  return page.evaluate((id) => {
    for (const [name, value] of Object.entries(localStorage)) {
      if (!name.startsWith("kuno.library.v1:")) continue;
      const entry = (JSON.parse(value) as Array<{ id: string; handle: { outputKey?: string } }>).find((e) => e.id === id);
      if (entry?.handle.outputKey) return entry.handle.outputKey;
    }
    return null;
  }, jobId);
}

test("after the first private take, key sync is set up with a recovery code shown once @needs-new-gateway", async ({ page }) => {
  const session = await openStudio(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  const prompt = "A private take whose key syncs: a paper boat on a canal";
  await generate(page, prompt);
  const card = cards(page).first();
  await watchToReady(card);
  await expect(card).toHaveAttribute("data-privacy", "private");
  privateJobId = (await card.getAttribute("data-take"))!;

  const offer = page.getByRole("region", { name: "Set up key sync" });
  await expect(offer).toContainText("Your private video keys are only in this browser");
  await offer.getByRole("button", { name: "Set up key sync" }).click();

  const panel = page.getByRole("region", { name: "Key sync" });
  recoveryCode = (await panel.getByLabel("Your recovery code").innerText()).trim();
  expect(recoveryCode).toMatch(CODE);
  await expectFits(page, "the recovery code step");
  const turnOn = panel.getByRole("button", { name: "Turn on key sync" });
  await expect(turnOn).toBeDisabled();
  await panel.getByLabel("I saved my recovery code somewhere safe").check();
  await expect(turnOn).toBeDisabled();
  await panel.getByLabel("Type its last four characters to confirm").fill(recoveryCode.slice(-4).toLowerCase());
  await turnOn.click();

  await expect(panel.getByRole("heading", { name: "Key sync is on" })).toBeVisible({ timeout: 30_000 });
  const done = panel.getByRole("button", { name: "Done" });
  if (await done.isVisible()) await done.click();
  await expect(panel).toContainText("1 private video key synced", { timeout: 30_000 });
  // The code is shown once: it's gone from the page now.
  await expect(page.getByLabel("Your recovery code")).toHaveCount(0);

  // KunoWorld holds the key wrapped: never the key itself, and never the code.
  const outputKey = await libraryKey(page, privateJobId);
  expect(outputKey).toBeTruthy();
  const vault = await page.request.get(`${GATEWAY}/v1/me/keyvault`, { headers: bearer(session.token) });
  expect(vault.ok(), await vault.text()).toBe(true);
  const text = await vault.text();
  const body = JSON.parse(text) as { job_keys: Array<{ job_id: string }>; unlockers: Array<{ kind: string; params: { iterations: number } }> };
  expect(body.job_keys.map((k) => k.job_id)).toContain(privateJobId);
  expect(body.unlockers).toHaveLength(1);
  expect(body.unlockers[0].kind).toBe("recovery_code");
  expect(body.unlockers[0].params.iterations).toBeGreaterThanOrEqual(600_000);
  expect(text).not.toContain(outputKey!);
  expect(text).not.toContain(recoveryCode.replace(/-/g, ""));
  expect(text).not.toContain(prompt);
});

test("a fresh browser unlocks with the recovery code and opens the private take @needs-new-gateway", async ({ browser, baseURL }) => {
  test.skip(!recoveryCode || !privateJobId, "needs the key sync set up by the previous test");
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await openStudio(page, { credit: false });
  await page.getByRole("button", { name: "My creations" }).click();
  const card = page.locator(`article[data-take="${privateJobId}"]`);
  await expect(card).toHaveCount(0);

  const panel = page.getByRole("region", { name: "Key sync" });
  await expect(panel.getByRole("heading", { name: "Unlock your private video keys" })).toBeVisible();
  await expectFits(page, "the unlock form");
  await panel.getByLabel("Recovery code").fill("AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH");
  await panel.getByRole("button", { name: "Unlock" }).click();
  await expect(panel.getByRole("alert")).toContainText("doesn't unlock these keys");
  await expect(card).toHaveCount(0);

  // Typed any way: lower case, spaces instead of dashes.
  await panel.getByLabel("Recovery code").fill(recoveryCode.toLowerCase().replace(/-/g, " "));
  await panel.getByRole("button", { name: "Unlock" }).click();
  await expect(card).toHaveCount(1, { timeout: 30_000 });
  await expect(card).toHaveAttribute("data-step", "ready");
  await expect(card).toContainText("a paper boat on a canal");
  await expect(panel.getByRole("heading", { name: "Key sync is on" })).toBeVisible();

  await card.getByRole("button", { name: /Open take/ }).click();
  await expect(page.getByRole("link", { name: /Download video/ }).first()).toBeVisible({ timeout: 60_000 });
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");

  // Still unlocked after a reload; locking forgets the key in this browser only.
  await page.reload();
  await page.getByRole("button", { name: "My creations" }).click();
  await expect(page.getByRole("region", { name: "Key sync" }).getByRole("heading", { name: "Key sync is on" })).toBeVisible();
  await page.getByRole("region", { name: "Key sync" }).getByRole("button", { name: "Lock this browser" }).click();
  await expect(page.getByRole("region", { name: "Key sync" }).getByRole("heading", { name: "Unlock your private video keys" })).toBeVisible();
  await context.close();
});

test("share a standard and a private video, watch both from another browser, then revoke them @needs-new-gateway", async ({
  page,
  browser,
  baseURL,
}) => {
  await openStudio(page);
  await pickStock(page, /LTX-2\.5 Fast/);

  const standardPrompt = "A standard take to share: lanterns drifting on a lake";
  await privacy(page, "Standard").check();
  await generate(page, standardPrompt);
  const standardCard = page.locator('article[data-step][data-privacy="standard"]').first();
  await watchToReady(standardCard);
  const standardJob = (await standardCard.getAttribute("data-take"))!;
  const standardLink = await createLink(page, standardJob, standardPrompt);
  expect(standardLink).not.toContain("#");

  await page.getByRole("button", { name: "Create a video" }).click();
  const privatePrompt = "A private take to share: a kite over dunes at dusk";
  await privacy(page, "Private").check();
  await generate(page, privatePrompt);
  const privateCard = page.locator('article[data-step][data-privacy="private"]').first();
  await watchToReady(privateCard);
  const privateJob = (await privateCard.getAttribute("data-take"))!;
  const privateLink = await createLink(page, privateJob, privatePrompt);
  const key = /#k=([A-Za-z0-9_-]{43})$/.exec(privateLink)?.[1];
  expect(key).toBe(await libraryKey(page, privateJob));
  await expect(inspector(page).getByRole("region", { name: "Share this video" })).toContainText("KunoWorld still can't see the video");

  const viewer = await browser.newContext({ baseURL });
  const watch = await viewer.newPage();
  const sent: string[] = [];
  watch.on("request", (r) => sent.push(`${r.url()} ${JSON.stringify(r.headers())} ${r.postData() ?? ""}`));

  // Standard: streams from KunoWorld through this site.
  await watch.goto(standardLink);
  await expect(watch.getByRole("heading", { name: "A video shared with you" })).toBeVisible();
  expect(await watch.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  const video = watch.getByLabel("Shared video");
  await expect(video).toHaveAttribute("src", /\/api\/kuno\/v1\/shares\/[A-Za-z0-9_-]{43}\/video$/);
  const streamed = await watch.evaluate(async (src) => {
    const response = await fetch(src as string);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, ftyp: String.fromCharCode(...bytes.slice(4, 8)) };
  }, await video.getAttribute("src"));
  expect(streamed).toEqual({ status: 200, ftyp: "ftyp" });
  await expect(watch.getByText("Signed by the attested GPU enclave")).toBeVisible();
  expect((await watch.request.get(standardLink)).headers()["x-robots-tag"]).toContain("noindex");

  // Private: the ciphertext comes through this site; the key in the fragment opens it here.
  await watch.goto(privateLink);
  const privateVideo = watch.getByLabel("Shared video");
  await expect(privateVideo).toHaveAttribute("src", /^blob:/, { timeout: 60_000 });
  const opened = await watch.evaluate(async (src) => {
    const bytes = new Uint8Array(await (await fetch(src as string)).arrayBuffer());
    return String.fromCharCode(...bytes.slice(4, 8));
  }, await privateVideo.getAttribute("src"));
  expect(opened).toBe("ftyp");
  await expectFits(watch, "a shared private video");
  expect(sent.filter((line) => line.includes(key!)), "the key never leaves the viewer's browser").toEqual([]);

  // A link without its key, or with the wrong one, says so.
  await watch.goto("about:blank");
  await watch.goto(privateLink.split("#")[0]);
  // (Next's route announcer is also an alert, so match on the words.)
  await expect(watch.getByRole("alert").filter({ hasText: "missing its key" })).toBeVisible();
  await watch.goto("about:blank");
  await watch.goto(privateLink.replace(/#k=.*$/, `#k=${"A".repeat(43)}`));
  await expect(watch.getByRole("alert").filter({ hasText: "doesn't open this video" })).toBeVisible({ timeout: 30_000 });

  // The owner revokes both on the account page; the links stop working.
  await page.goto("/account");
  const links = page.getByRole("region", { name: "Share links" });
  for (const jobId of [standardJob, privateJob]) {
    const row = links.locator(`tr[data-job-id="${jobId}"]`);
    await expect(row).toContainText("Working");
    page.once("dialog", (dialog) => void dialog.accept());
    await row.getByRole("button", { name: /Revoke the link/ }).click();
    await expect(row).toContainText("Revoked");
  }
  await expectFits(page, "the account page with share links");

  for (const link of [standardLink, privateLink]) {
    await watch.goto("about:blank");
    await watch.goto(link);
    await expect(watch.getByRole("heading", { name: "This link no longer works" })).toBeVisible();
  }
  await viewer.close();
});

test("share pages, key sync and share links fit a phone, and share pages aren't indexed", async ({ page }) => {
  const missing = `/s/${"x".repeat(43)}`;
  await page.goto(missing);
  await expect(page.getByRole("heading", { name: /This link isn't valid|can't be shown right now/ })).toBeVisible();
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  expect((await page.request.get(missing)).headers()["x-robots-tag"]).toContain("noindex");
  await expectFits(page, "a share page");

  await openStudio(page, { credit: false });
  await page.getByRole("button", { name: "My creations" }).click();
  await expect(page.getByRole("region", { name: /Key sync|Set up key sync/ })).toBeVisible();
  await expectFits(page, "the studio library with key sync");

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Keys & recovery", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Share links", exact: true })).toBeVisible();
  await expectFits(page, "the account page");
});
