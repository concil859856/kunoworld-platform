import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { GATEWAY, adminSession, bearer, gatewaySession, grantRole, horizontalOverflow, signInWithCookie } from "./helpers";

/*
 * "Your data" (a copy of the account, closing it) and "Appeals" on /account, and the operator console's Appeals page.
 *
 * Every test here is tagged @needs-new-gateway: it needs a gateway serving /v1/me/exports, /v1/me/close,
 * /v1/me/reauth, /v1/me/standing, /v1/me/appeals and /admin/v1/appeals (platform/gateway/STANDARD_MODE.md). The
 * closure test ages a session straight in the gateway's SQLite database under KUNO_DATA_DIR, so it needs a local one.
 */

const DATA_DIR = process.env.KUNO_DATA_DIR ?? "/tmp/kuno-web-data";
const WIDTHS = [320, 375, 768];

interface Mail {
  to: string;
  subject: string;
  text: string;
}

function newestMail(to: string, subject: RegExp): Mail | null {
  let files: string[];
  try {
    files = readdirSync(join(DATA_DIR, "outbox")).sort().reverse();
  } catch {
    return null;
  }
  for (const file of files) {
    const mail = JSON.parse(readFileSync(join(DATA_DIR, "outbox", file), "utf8")) as Mail;
    if (mail.to === to && subject.test(mail.subject)) return mail;
  }
  return null;
}

async function waitForMail(to: string, subject: RegExp, previous: string | null): Promise<Mail> {
  for (let attempt = 0; attempt < 150; attempt++) {
    const mail = newestMail(to, subject);
    if (mail && mail.text !== previous) return mail;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`no "${subject.source}" email reached ${to}`);
}

/** The sign-in link in an email, relative, so it opens on this run's dev server whatever KUNO_SITE_URL says. */
function linkIn(mail: Mail): string {
  const match = /https?:\/\/\S+\/auth\/verify\?token=[\w-]+(?:&next=\S+)?/.exec(mail.text);
  if (!match) throw new Error(`no sign-in link in "${mail.subject}"`);
  const url = new URL(match[0]);
  return `${url.pathname}${url.search}`;
}

/** Makes an address's sign-ins look older than the 10-minute window for closing an account. */
function ageSessions(email: string, seconds: number): void {
  const script = [
    "import os, sqlite3, sys",
    "db = sqlite3.connect(os.path.join(os.environ['KUNO_DATA_DIR'], 'gateway.db'))",
    "db.execute('update sessions set created_at = created_at - ? where user_id = (select id from users where email = ?)', (float(sys.argv[2]), sys.argv[1]))",
    "db.commit()",
  ].join("\n");
  execFileSync("uv", ["run", "python", "-c", script, email, String(seconds)], {
    cwd: process.env.KUNO_REPO_ROOT ?? resolve(process.cwd(), "../.."),
    env: { ...process.env, KUNO_DATA_DIR: DATA_DIR },
    stdio: "pipe",
  });
}

/** Signs in through the gateway's email-link API without the per-run cache, returning the new session's account. */
async function freshSignIn(request: APIRequestContext, email: string): Promise<{ token: string; accountId: string }> {
  const previous = newestMail(email, /sign-in link/)?.text ?? null;
  const asked = await request.post(`${GATEWAY}/v1/auth/magic-link`, { data: { email } });
  expect(asked.status(), await asked.text()).toBe(202);
  const mail = await waitForMail(email, /sign-in link/, previous);
  const token = new URLSearchParams(linkIn(mail).split("?")[1]).get("token");
  const verified = await request.post(`${GATEWAY}/v1/auth/verify`, { data: { token } });
  expect(verified.ok(), await verified.text()).toBe(true);
  const body = (await verified.json()) as { session_token: string; account: { account_id: string } };
  return { token: body.session_token, accountId: body.account.account_id };
}

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("request a copy of your data, watch it get ready, and download the zip @needs-new-gateway", async ({ page }) => {
  await signInWithCookie(page, `e2e-export-${Date.now()}@example.com`);
  await page.goto("/account#your-data");
  const panel = page.getByTestId("data-export");
  await expect(panel).toContainText("deleted automatically 7 days after it's ready");
  await panel.getByRole("button", { name: "Request a copy of my data" }).click();
  await expect(panel.getByRole("list", { name: "Your exports" }).getByRole("listitem")).toHaveCount(1);

  const download = panel.getByRole("link", { name: "Download zip" });
  await expect(download).toBeVisible({ timeout: 60_000 });
  await expect(panel.getByRole("listitem").first()).toHaveAttribute("data-status", "ready");
  await expect(panel.getByRole("listitem").first()).toContainText("Deleted automatically on");
  await expect(panel.getByRole("button", { name: "Request a copy of my data" })).toBeEnabled();

  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  expect(file.suggestedFilename()).toMatch(/^kunoworld-export-\d{8}\.zip$/);
  const saved = await file.path();
  expect(readFileSync(saved).subarray(0, 2).toString("latin1")).toBe("PK");

  await expectFits(page, "the account page with a ready export");
});

test("close an account: confirm by email link, type the address, and the address starts over @needs-new-gateway", async ({
  page,
  request,
}) => {
  const email = `e2e-close-${Date.now()}@example.com`;
  const session = await signInWithCookie(page, email);
  ageSessions(email, 15 * 60);

  await page.goto("/account#your-data");
  const panel = page.getByTestId("close-account");
  await panel.getByRole("button", { name: "Close my account…" }).click();
  await expect(panel).toContainText("[BALANCE ON CLOSURE POLICY]");
  await expect(panel).toContainText("[RETENTION OF RECORDS AFTER CLOSURE]");
  await expect(panel.getByRole("button", { name: "Close my account permanently" })).toHaveCount(0);
  await expectFits(page, "the closure step asking you to confirm it's you");

  const previous = newestMail(email, /Confirm it's you/)?.text ?? null;
  await panel.getByRole("button", { name: "Email me a confirmation link" }).click();
  await expect(panel.getByRole("status")).toContainText(`We sent a link to ${email}`);
  const mail = await waitForMail(email, /Confirm it's you/, previous);
  await page.goto(linkIn(mail));
  await page.getByRole("button", { name: "Continue signing in" }).click();
  await expect(page).toHaveURL(/\/account\?closing=1#close-account$/);

  const form = page.getByRole("form", { name: "Close your account" });
  const confirm = form.getByRole("button", { name: "Close my account permanently" });
  const typed = form.getByLabel(/^Type .+ to confirm$/);
  await expect(confirm).toBeDisabled();
  await typed.fill("someone-else@example.com");
  await expect(confirm).toBeDisabled();
  await typed.fill(email.toUpperCase());
  await expect(confirm).toBeEnabled();
  await expectFits(page, "the typed confirmation");
  await confirm.click();
  await expect(page.getByTestId("close-account").getByRole("status")).toContainText("Your account is closed.");

  // Signed out everywhere: the gateway refuses the old session, and the site's cookie is gone.
  expect((await request.get(`${GATEWAY}/v1/me`, { headers: bearer(session.token) })).status()).toBe(401);
  expect(newestMail(email, /account is closed/)).not.toBeNull();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin/);

  const again = await freshSignIn(request, email);
  expect(again.accountId).not.toBe(session.accountId);
});

test("appeal a restriction from its notice, and a moderator overturns it from the console @needs-new-gateway", async ({
  page,
  request,
  browser,
}) => {
  const email = `e2e-appeal-${Date.now()}@example.com`;
  const customer = await gatewaySession(request, email);
  const admin = await adminSession(request);
  const restricted = await request.post(`${GATEWAY}/admin/v1/accounts/${customer.accountId}/restrict`, {
    headers: bearer(admin.token),
    data: { until: Math.round(Date.now() / 1000) + 86400, reason: "e2e: internal note about a spam wave" },
  });
  expect(restricted.ok(), await restricted.text()).toBe(true);

  await signInWithCookie(page, email);
  await page.goto("/account#appeals");
  const appeals = page.getByRole("region", { name: "Appeals" });
  const notice = appeals.locator("[data-subject-kind='restriction']");
  await expect(notice).toContainText("Account restricted until");
  await expect(appeals).not.toContainText("internal note");
  await notice.getByRole("button", { name: "Appeal this restriction" }).click();
  // Unique per run: the shared dev database keeps resolved appeals from earlier runs.
  const statement = `e2e: I didn't send spam; this is a shared university network (${email}).`;
  await notice.getByLabel("Why should this decision change?").fill(statement);
  await expectFits(page, "the appeal form");
  await notice.getByRole("button", { name: "Send appeal" }).click();
  await expect(appeals.getByRole("status")).toContainText("Appeal sent");
  const mine = appeals.getByRole("list", { name: "Your appeals" });
  await expect(mine).toContainText("Waiting for review");
  await expect(notice).toContainText("Your appeal: Waiting for review.");

  // A moderator, in their own browser session, finds it in the queue and decides it on the Appeals page.
  const moderatorEmail = `e2e-appeals-mod-${Date.now()}@example.com`;
  await gatewaySession(request, moderatorEmail);
  grantRole(moderatorEmail, "moderator");
  const context = await browser.newContext();
  const console_ = await context.newPage();
  await signInWithCookie(console_, moderatorEmail);
  await console_.goto("/admin/queue");
  await console_.getByRole("navigation", { name: "Operator console" }).getByRole("link", { name: "Appeals" }).waitFor();
  const card = console_.locator("[data-appeal]").filter({ hasText: statement });
  await console_.goto("/admin/appeals");
  await expect(card).toContainText("Appeal of a restriction");
  await expect(card).toContainText("e2e: internal note about a spam wave");
  await expectFits(console_, "the operator Appeals page");
  await card.getByText("Decide this appeal").click();
  await card.getByLabel("Decision").selectOption("overturn");
  await card.getByLabel(/^Note/).fill("e2e: shared network confirmed");
  console_.once("dialog", (dialog) => void dialog.accept());
  await card.getByRole("button", { name: "Record decision" }).click();
  await expect(console_.getByTestId("console-status")).toContainText("overturned");
  await console_.goto("/admin/appeals?status=resolved");
  await expect(card).toContainText("Decision overturned");
  await context.close();

  // The customer sees the decision, gets the email, and isn't restricted any more.
  await page.reload();
  await expect(mine).toContainText("Decision overturned");
  await expect(mine).toContainText("e2e: shared network confirmed");
  await expect(mine).toContainText("The restriction is lifted");
  expect(newestMail(email, /appeal/)?.subject).toBe("Your KunoWorld appeal: the decision was overturned");
  const eligibility = await request.get(`${GATEWAY}/v1/me/eligibility`, { headers: bearer(customer.token) });
  expect(((await eligibility.json()) as { restricted_until: number | null }).restricted_until).toBeNull();
  await expectFits(page, "the account page with a decided appeal");
});
