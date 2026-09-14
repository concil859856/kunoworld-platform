import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { GATEWAY, adminSession, bearer, gatewaySession, grantRole, horizontalOverflow, pngBytes, signInWithCookie } from "./helpers";

/*
 * The console's CyberTipline workflow. A moderator prepares a report draft from a blocked upload under a child-safety
 * hold and validates it; only an admin confirms it. With reporting disabled (the gateway's default), confirming records
 * a dry run and sends nothing. The item page shows how the upload was identified, never the upload itself.
 *
 * Tagged @needs-new-gateway: it needs a gateway with the CyberTipline API (/admin/v1/cybertip) whose blocked-hash list
 * this spec can append to. Point KUNO_E2E_BLOCKED_HASHES_FILE at that gateway's KUNO_BLOCKED_HASHES_FILE.
 */

const BLOCKED_LIST = process.env.KUNO_E2E_BLOCKED_HASHES_FILE;
const WIDTHS = [320, 375, 768];

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("a moderator prepares and validates a CyberTipline draft, and only an admin confirms it @needs-new-gateway", async ({ page, request }) => {
  test.skip(!BLOCKED_LIST, "set KUNO_E2E_BLOCKED_HASHES_FILE to the gateway's KUNO_BLOCKED_HASHES_FILE");
  const stamp = Date.now();

  // A picture only this run uses, listed for the test as child sexual abuse material (the list is re-read when it changes).
  const png = pngBytes(7, 5, [stamp % 251, Math.floor(stamp / 251) % 251, Math.floor(stamp / 63001) % 251]);
  const sha256 = createHash("sha256").update(png).digest("hex");
  appendFileSync(BLOCKED_LIST!, `${sha256} csam\n`);

  const customer = await gatewaySession(request, `e2e-cybertip-customer-${stamp}@example.com`);
  const refused = await request.post(`${GATEWAY}/v1/standard/uploads?role=first_frame`, {
    headers: { ...bearer(customer.token), "content-type": "image/png" },
    data: png,
  });
  expect(refused.status(), await refused.text()).toBe(422);

  const moderatorEmail = `e2e-cybertip-moderator-${stamp}@example.com`;
  const moderator = await gatewaySession(request, moderatorEmail);
  grantRole(moderatorEmail, "moderator");
  let itemId: string | undefined;
  await expect
    .poll(async () => {
      const queue = await request.get(`${GATEWAY}/admin/v1/moderation/queue?limit=500`, { headers: bearer(moderator.token) });
      const items = (await queue.json()) as Array<{ item_id: string; kind: string; account_id: string | null }>;
      itemId = items.find((i) => i.kind === "upload_match" && i.account_id === customer.accountId)?.item_id;
      return Boolean(itemId);
    })
    .toBe(true);

  // The moderator: match details on the item, a draft, a validation. No confirmation.
  await signInWithCookie(page, moderatorEmail);
  await page.goto(`/admin/items/${itemId}`);
  const match = page.getByLabel("Hash match");
  await expect(match).toContainText("Exact (SHA-256)");
  await expect(match).toContainText("csam");
  await expect(match).toContainText(sha256);
  await expect(page.getByRole("region", { name: "Content" }).locator("img, video")).toHaveCount(0);

  const section = page.getByRole("region", { name: "CyberTipline report" });
  await expect(section).toContainText("Disabled");
  await section.getByRole("button", { name: "Prepare report draft" }).click();
  await expect(page.getByTestId("console-status")).toContainText("Draft prepared.");
  await expect(section.getByTestId("cybertip-status")).toHaveText("Draft");
  await expect(section).toContainText("Child Pornography (possession, manufacture, and distribution)");
  await expect(section.getByRole("list", { name: "Files in this report" })).toContainText(sha256);
  await expect(section.getByRole("form", { name: "Confirm this CyberTipline report" })).toHaveCount(0);
  await expect(section).toContainText("An admin reviews the draft and confirms the submission.");

  const status = await request.get(`${GATEWAY}/admin/v1/cybertip/items/${itemId}`, { headers: bearer(moderator.token) });
  const reportId = ((await status.json()) as { reports: Array<{ report_id: string }> }).reports[0].report_id;
  const direct = await request.post(`${GATEWAY}/admin/v1/cybertip/reports/${reportId}/submit`, {
    headers: bearer(moderator.token),
    data: { confirm: true, note: "e2e: moderators can't confirm" },
  });
  expect(direct.status()).toBe(403);

  await section.getByRole("button", { name: "Validate report" }).click();
  await expect(page.getByTestId("console-status")).toContainText("passes validation");
  await section.getByText("Report XML").click();
  await expect(section.getByLabel("Report XML")).toContainText("<incidentType>Child Pornography");
  await expectFits(page, "the item page with a CyberTipline draft");

  // The admin reviews and confirms. Reporting is disabled on this gateway, so it is a recorded dry run.
  const admin = await adminSession(request);
  await page.context().clearCookies();
  await signInWithCookie(page, admin.email);
  await page.goto(`/admin/items/${itemId}`);
  await section.getByText("Review and confirm submission").click();
  const form = section.getByRole("form", { name: "Confirm this CyberTipline report" });
  await form.getByLabel("I reviewed this draft").check();
  await form.getByLabel("Note for the audit log").fill("e2e: reviewed the draft");
  page.once("dialog", (dialog) => void dialog.accept());
  await form.getByRole("button", { name: "Confirm (dry run)" }).click();
  await expect(page.getByTestId("console-status")).toContainText("Nothing was sent");
  await expect(section.getByTestId("cybertip-status")).toHaveText("Validated, not sent");

  await page.goto("/admin/cybertip?status=dry_run");
  await expect(page.getByRole("navigation", { name: "Operator console" }).getByRole("link", { name: "CyberTipline" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator(`[data-cybertip-report="${reportId}"]`)).toContainText("Validated, not sent");
  await expectFits(page, "the CyberTipline reports list");

  const log = await request.get(`${GATEWAY}/admin/v1/audit-log?target_id=${reportId}`, { headers: bearer(admin.token) });
  const actions = ((await log.json()) as Array<{ operator: string; action: string }>).map((a) => `${a.operator} ${a.action}`);
  expect(actions).toEqual([`${admin.email} cybertip.submit`, `${moderatorEmail} cybertip.dry_run`, `${moderatorEmail} cybertip.prepare`]);
});
