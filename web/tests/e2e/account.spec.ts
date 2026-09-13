import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { cards, generate, pickStock, watchToReady } from "./helpers";

/** Signing in by email link, managing keys, and making videos on your own balance. */

const DATA_DIR = process.env.KUNO_DATA_DIR ?? "/tmp/kuno-web-data";
const GATEWAY = process.env.NEXT_PUBLIC_KUNO_API ?? "http://localhost:8080";

function devEnv(name: string): string {
  const match = new RegExp(`^${name}=(.+)$`, "m").exec(readFileSync(join(DATA_DIR, "dev.env"), "utf8"));
  if (!match) throw new Error(`${name} is missing from ${DATA_DIR}/dev.env`);
  return match[1].trim();
}

/** With no email provider configured, the gateway writes sign-in email to its outbox. */
function signInLink(email: string): string | null {
  let files: string[];
  try {
    files = readdirSync(join(DATA_DIR, "outbox")).sort().reverse();
  } catch {
    return null;
  }
  for (const file of files) {
    const message = JSON.parse(readFileSync(join(DATA_DIR, "outbox", file), "utf8")) as { to: string; text: string };
    if (message.to === email) return /https?:\/\/\S+\/auth\/verify\?token=[\w-]+(?:&next=\S+)?/.exec(message.text)?.[0] ?? null;
  }
  return null;
}

async function signIn(page: Page, email: string, next = "/account"): Promise<void> {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  let link: string | null = null;
  await expect.poll(() => (link = signInLink(email))).not.toBeNull();
  await page.goto(link!);
  await page.getByRole("button", { name: "Continue signing in" }).click();
}

test("sign in by email link, manage a key, make a video on your own balance, sign out", async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await signIn(page, email);

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(email);
  await expect(page.getByLabel("Balance")).toHaveText("$0.00");

  // Credit arrives through the ledger and shows up as activity.
  const accountId = await page.locator("[data-account-id]").getAttribute("data-account-id");
  const credit = await request.post(`${GATEWAY}/admin/v1/accounts/${accountId}/credits`, {
    headers: { authorization: `Bearer ${devEnv("KUNO_ADMIN_TOKEN")}` },
    data: { amount_usd: 2, idempotency_key: `e2e-${accountId}`, note: "End-to-end test credit" },
  });
  expect(credit.ok()).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Balance")).toHaveText("$2.00");
  await expect(page.getByRole("cell", { name: "End-to-end test credit" })).toBeVisible();

  // A key is shown once, works, and stops when revoked.
  await page.getByLabel("Key name").fill("render farm");
  await page.getByRole("button", { name: "Create key" }).click();
  const reveal = page.getByRole("status").filter({ hasText: "only time the key is shown" });
  await expect(reveal).toBeVisible();
  const key = (await reveal.locator("code").textContent()) ?? "";
  expect(key).toMatch(/^kw_live_/);
  expect((await request.get(`${GATEWAY}/v1/account`, { headers: { authorization: `Bearer ${key}` } })).status()).toBe(200);

  await page.reload();
  await expect(page.getByText(key)).toHaveCount(0);
  const row = page.getByRole("row", { name: /render farm/ });
  page.once("dialog", (dialog) => void dialog.accept());
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(row).toContainText("Revoked");
  expect((await request.get(`${GATEWAY}/v1/account`, { headers: { authorization: `Bearer ${key}` } })).status()).toBe(401);

  // The studio connects itself from the session, with no key in the page, and charges this account.
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: /Gateway connected/ })).toBeVisible();
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "A paper boat crosses a rain puddle");
  await watchToReady(cards(page).first());

  await page.goto("/account");
  await expect(page.getByRole("cell", { name: "Video", exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Balance")).not.toHaveText("$2.00");

  // Signing out ends the session.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin/);
});

test("a spent or made-up link sends you back to ask for another", async ({ page }) => {
  await page.goto("/auth/verify?token=not-a-real-sign-in-token&next=/account");
  await page.getByRole("button", { name: "Continue signing in" }).click();
  await expect(page).toHaveURL(/\/signin\?error=invalid_link/);
  await expect(page.getByRole("alert")).toContainText("expired or was already used");
});

test("signed out, the account page asks you to sign in", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin\?next=(%2F|\/)account/);
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
});
