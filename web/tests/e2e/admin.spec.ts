import { expect, test, type Page } from "@playwright/test";

import { GATEWAY, adminSession, bearer, gatewaySession, grantRole, horizontalOverflow, signInWithCookie } from "./helpers";

/*
 * The operator console at /admin. Operators sign in by email; the gateway lists their roles on
 * GET /v1/me and accepts their session on /admin/v1. Everyone else gets a 404.
 *
 * Tests tagged @needs-session-gateway need that gateway. The first admin is granted with
 * `kuno-gateway grant-role` (helpers.grantRole), as in production.
 */

const WIDTHS = [320, 375, 768];

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

const CONSOLE_PAGES = ["/admin", "/admin/reports", "/admin/queue", "/admin/holds", "/admin/accounts", "/admin/items/not-a-real-item"];

async function expectNotFound(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should be a 404`).toBe(404);
  await expect(page.getByRole("heading", { name: "Operator console" })).toHaveCount(0);
}

/** Files a public report about a made-up video and returns its queue item id, found with an operator session. */
async function reportAndFind(page: Page, token: string, reason: string): Promise<{ digest: string; itemId: string; reportId: string }> {
  const digest = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  const filed = await page.request.post(`${GATEWAY}/v1/reports`, { data: { content_digest: digest, reason, details: `e2e ${reason} report` } });
  expect(filed.ok(), await filed.text()).toBe(true);
  const reportId = ((await filed.json()) as { report_id: string }).report_id;
  let itemId: string | undefined;
  await expect
    .poll(async () => {
      const queue = await page.request.get(`${GATEWAY}/admin/v1/moderation/queue?limit=500`, { headers: bearer(token) });
      const items = (await queue.json()) as Array<{ item_id: string; report: { report_id: string } | null }>;
      itemId = items.find((i) => i.report?.report_id === reportId)?.item_id;
      return Boolean(itemId);
    })
    .toBe(true);
  return { digest, itemId: itemId!, reportId };
}

test("the console is a 404 for visitors and for signed-in customers", async ({ page }) => {
  for (const path of CONSOLE_PAGES) await expectNotFound(page, path);

  await signInWithCookie(page, `e2e-customer-${Date.now()}@example.com`);
  for (const path of [...CONSOLE_PAGES, "/admin/roles", "/admin/audit"]) await expectNotFound(page, path);
  await page.goto("/account");
  await expect(page.getByRole("link", { name: "Open the operator console" })).toHaveCount(0);
});

test("a moderator granted through the gateway works reports, the queue and account safety, but not admin pages @needs-session-gateway", async ({
  page,
  request,
}) => {
  const admin = await adminSession(request);
  const email = `e2e-moderator-${Date.now()}@example.com`;
  const moderator = await gatewaySession(request, email);
  const granted = await request.post(`${GATEWAY}/admin/v1/roles`, { headers: bearer(admin.token), data: { email, role: "moderator" } });
  expect(granted.ok(), await granted.text()).toBe(true);

  await signInWithCookie(page, email);
  await page.goto("/account");
  await page.getByRole("link", { name: "Open the operator console" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Operator console" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Operator console" });
  await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Accounts" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Roles" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  await expectNotFound(page, "/admin/roles");
  await expectNotFound(page, "/admin/audit");

  // Moderators read account safety, but the direct restriction and credit tools are for admins.
  await page.goto(`/admin/accounts?account=${moderator.accountId}`);
  await expect(page.getByRole("region", { name: "Standing" })).toContainText(moderator.accountId!);
  await expect(page.getByRole("form", { name: "Restrict this account" })).toHaveCount(0);
  await expect(page.getByRole("form", { name: "Credit this account" })).toHaveCount(0);

  // A harassment report: its content can't be opened, and the page says so instead of showing a player.
  const harassment = await reportAndFind(page, moderator.token, "harassment");
  await page.goto(`/admin/items/${harassment.itemId}`);
  const content = page.getByRole("region", { name: "Content" });
  await expect(content.getByRole("note")).toContainText("Content can't be opened for this report type");
  await expect(content.locator("video")).toHaveCount(0);
  await expect(content.getByRole("button", { name: "Open content" })).toHaveCount(0);
  const direct = await request.get(`${GATEWAY}/admin/v1/moderation/items/${harassment.itemId}/video`, { headers: bearer(moderator.token) });
  expect([403, 404]).toContain(direct.status());

  // Resolve it from the reports page, then find it under Resolved.
  await page.goto("/admin/reports?status=open");
  const card = page.locator(`[data-report="${harassment.reportId}"]`);
  await card.getByText("Resolve this report").click();
  await card.getByLabel("Action").selectOption("dismiss");
  await card.getByLabel("Note for the audit log").fill("e2e: nothing to act on");
  await card.getByRole("button", { name: "Resolve report" }).click();
  // Resolving removes the card from the open list, so the confirmation shows console-wide.
  await expect(page.getByTestId("console-status")).toContainText("Report resolved.");
  await expect(card).toHaveCount(0);
  await page.goto("/admin/reports?status=resolved");
  await expect(page.locator(`[data-report="${harassment.reportId}"]`)).toContainText("Resolved: dismiss");

  // The audit log (admins only) shows it, under this moderator's email.
  const log = await request.get(`${GATEWAY}/admin/v1/audit-log?target_id=${harassment.reportId}`, { headers: bearer(admin.token) });
  expect(JSON.stringify(await log.json())).toContain(email);

  for (const path of ["/admin", "/admin/reports", "/admin/queue", "/admin/holds", `/admin/accounts?account=${moderator.accountId}`, `/admin/items/${harassment.itemId}`]) {
    await page.goto(path);
    await expectFits(page, path);
  }

  // Revoked, the console is a 404 again.
  const revoked = await request.delete(`${GATEWAY}/admin/v1/roles`, { headers: bearer(admin.token), data: { email, role: "moderator" } });
  expect(revoked.ok(), await revoked.text()).toBe(true);
  await expectNotFound(page, "/admin");
});

test("an open child-safety report is reviewable, a refusal is explained, and once resolved it isn't @needs-session-gateway", async ({ page, request }) => {
  const email = `e2e-reviewer-${Date.now()}@example.com`;
  const reviewer = await gatewaySession(request, email);
  grantRole(email, "moderator");
  await signInWithCookie(page, email);
  const csam = await reportAndFind(page, reviewer.token, "csam");

  const item = await request.get(`${GATEWAY}/admin/v1/moderation/items/${csam.itemId}`, { headers: bearer(reviewer.token) });
  const body = (await item.json()) as { content_reviewable: boolean; content_access: string | null };
  expect(body).toMatchObject({ content_reviewable: true, content_access: "report:csam" });

  await page.goto(`/admin/items/${csam.itemId}`);
  const content = page.getByRole("region", { name: "Content" });
  await expect(content).toContainText("Can be opened under an open report");

  // The report names no stored video, so there's nothing to play; stand in a content_not_reviewable answer
  // to check the console explains a refusal rather than showing an empty player.
  await page.route(`**/admin/items/${csam.itemId}/video`, (route) =>
    route.fulfill({ status: 403, json: { code: "content_not_reviewable", message: "This content can't be reviewed." } }),
  );
  const open = content.getByRole("button", { name: "Open content" });
  if (await open.count()) {
    await expect(content.getByText("This view is recorded in the audit log under your name.")).toBeVisible();
    await open.click();
    await expect(content.getByRole("note")).toContainText("Content can't be opened for this report type");
  }
  await expect(content.locator("video")).toHaveCount(0);

  // Resolved, a child-safety report no longer opens its content (only a hold would).
  const resolved = await request.post(`${GATEWAY}/admin/v1/reports/${csam.reportId}/resolve`, {
    headers: bearer(reviewer.token),
    data: { action: "dismiss", note: "e2e: test report" },
  });
  expect(resolved.ok(), await resolved.text()).toBe(true);
  await page.goto(`/admin/items/${csam.itemId}`);
  await expect(content.getByRole("note")).toContainText("Content can't be opened for this report type");
});

test("an admin sees account tools and changes roles from the console @needs-session-gateway", async ({ page, request }) => {
  const admin = await adminSession(request);
  const email = `e2e-promoted-${Date.now()}@example.com`;
  const person = await gatewaySession(request, email);
  await signInWithCookie(page, admin.email);

  await page.goto("/admin/roles");
  const form = page.getByRole("form", { name: "Change an operator role" });
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Role").selectOption("moderator");
  page.once("dialog", (dialog) => void dialog.accept());
  await form.getByRole("button", { name: "Save role change" }).click();
  await expect(form.getByRole("status")).toContainText(`${email} is now a moderator.`);
  const me = await request.get(`${GATEWAY}/v1/me`, { headers: bearer(person.token) });
  expect(((await me.json()) as { roles?: string[] }).roles ?? []).toContain("moderator");

  await expect(page.getByRole("table", { name: "Current operators" })).toContainText(email);

  await page.goto(`/admin/accounts?account=${person.accountId}`);
  await expect(page.getByRole("region", { name: "Standing" })).toContainText(person.accountId!);
  await expect(page.getByRole("form", { name: "Restrict this account" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Credit this account" })).toBeVisible();
  for (const path of ["/admin/roles", "/admin/audit", `/admin/accounts?account=${person.accountId}`]) {
    await page.goto(path);
    await expectFits(page, path);
  }

  await page.goto("/admin/roles");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Change").selectOption("revoke");
  page.once("dialog", (dialog) => void dialog.accept());
  await form.getByRole("button", { name: "Save role change" }).click();
  await expect(form.getByRole("status")).toContainText(`${email} is no longer a moderator.`);
});
