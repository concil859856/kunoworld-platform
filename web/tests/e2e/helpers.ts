import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";

import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

const DATA_DIR = process.env.KUNO_DATA_DIR ?? "/tmp/kuno-web-data";

export const GATEWAY = process.env.NEXT_PUBLIC_KUNO_API ?? "http://localhost:8080";

/** A value the devkit wrote to dev.env, such as the admin token. */
export function devEnv(name: string): string {
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

/** A web session made through the gateway's own email-link API, without a browser. */
export interface GatewaySession {
  token: string;
  accountId: string | null;
  email: string;
}

// One sign-in per email per run: the gateway allows 5 links per email and 20 per IP in 15 minutes.
const sessions = new Map<string, GatewaySession>();

export async function gatewaySession(request: APIRequestContext, email: string): Promise<GatewaySession> {
  const cached = sessions.get(email);
  if (cached) return cached;
  const previous = signInLink(email);
  const asked = await request.post(`${GATEWAY}/v1/auth/magic-link`, { data: { email } });
  expect(asked.status(), await asked.text()).toBe(202);
  let link: string | null = null;
  await expect.poll(() => (link = signInLink(email)) !== null && link !== previous).toBe(true);
  const token = new URL(link!).searchParams.get("token");
  const verified = await request.post(`${GATEWAY}/v1/auth/verify`, { data: { token } });
  expect(verified.ok(), await verified.text()).toBe(true);
  const body = (await verified.json()) as { session_token: string; account: { account_id: string } | null };
  const session = { token: body.session_token, accountId: body.account?.account_id ?? null, email };
  sessions.set(email, session);
  return session;
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/**
 * Puts a session in the browser the way the site does after sign-in: an HttpOnly cookie that page
 * scripts can't read, plus the non-secret hint cookie. The email-link UI itself is covered by account.spec.
 */
export async function signInWithCookie(page: Page, email: string): Promise<GatewaySession> {
  const session = await gatewaySession(page.request, email);
  const url = test.info().project.use.baseURL ?? "http://localhost:3000";
  await page.context().addCookies([
    { name: "kw_session", value: session.token, url, httpOnly: true, sameSite: "Lax" },
    { name: "kw_signed_in", value: "1", url, sameSite: "Lax" },
  ]);
  return session;
}

/**
 * Grants an operator role with the gateway's own CLI, the way the first admin is bootstrapped. It
 * writes to the gateway database in KUNO_DATA_DIR, so the gateway needn't restart.
 */
export function grantRole(email: string, role: "moderator" | "admin"): void {
  execFileSync("uv", ["run", "kuno-gateway", "grant-role", "--email", email, "--role", role], {
    cwd: process.env.KUNO_REPO_ROOT ?? resolve(process.cwd(), "../.."),
    env: { ...process.env, KUNO_DATA_DIR: DATA_DIR },
    stdio: "pipe",
  });
}

/** The run's admin: KUNO_E2E_ADMIN_EMAIL, or a fixed test address, granted through the CLI once per run. */
export const E2E_ADMIN_EMAIL = process.env.KUNO_E2E_ADMIN_EMAIL ?? "e2e-admin@example.com";
let adminGranted = false;

export async function adminSession(request: APIRequestContext): Promise<GatewaySession> {
  const session = await gatewaySession(request, E2E_ADMIN_EMAIL);
  if (!adminGranted) {
    grantRole(E2E_ADMIN_EMAIL, "admin");
    adminGranted = true;
  }
  return session;
}

/**
 * Credits an account. The dev gateway keeps the break-glass KUNO_ADMIN_TOKEN on
 * (KUNO_ALLOW_ADMIN_TOKEN=1); without it, an admin's web session does the same.
 */
export async function creditAccount(request: APIRequestContext, accountId: string, amountUsd: number, idempotencyKey: string): Promise<void> {
  const data = { amount_usd: amountUsd, idempotency_key: idempotencyKey, note: "End-to-end test credit" };
  const url = `${GATEWAY}/admin/v1/accounts/${accountId}/credits`;
  let shared: string | null = null;
  try {
    shared = devEnv("KUNO_ADMIN_TOKEN");
  } catch {
    shared = null;
  }
  if (shared) {
    const response = await request.post(url, { headers: bearer(shared), data });
    if (response.ok()) return;
    if (![401, 403].includes(response.status())) throw new Error(`credit failed: ${response.status()} ${await response.text()}`);
  }
  const admin = await adminSession(request);
  const response = await request.post(url, { headers: bearer(admin.token), data });
  expect(response.ok(), await response.text()).toBe(true);
}

/** Signs in through the real email-link flow and lands on `next`. */
export async function signIn(page: Page, email: string, next = "/account"): Promise<void> {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  let link: string | null = null;
  await expect.poll(() => (link = signInLink(email))).not.toBeNull();
  await page.goto(link!);
  await page.getByRole("button", { name: "Continue signing in" }).click();
}

/** How far the page scrolls sideways; more than a pixel means something escaped the layout. */
export function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** The dev API key the devkit wrote, so tests use a real account. */
export function devApiKey(): string {
  if (process.env.KUNO_DEV_API_KEY) return process.env.KUNO_DEV_API_KEY;
  const env = readFileSync(join(DATA_DIR, "dev.env"), "utf8");
  const match = /^KUNO_DEV_API_KEY=(.+)$/m.exec(env);
  if (!match) throw new Error(`No KUNO_DEV_API_KEY in ${DATA_DIR}/dev.env — run: uv run kuno-devkit init --data ${DATA_DIR}`);
  return match[1].trim();
}

/** A real PNG, so both the browser preview and the worker's ffmpeg can decode it. */
export function pngBytes(width: number, height: number, rgb: [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      raw[o++] = Math.min(255, rgb[0] + Math.round((x / width) * 40));
      raw[o++] = Math.min(255, rgb[1] + Math.round((y / height) * 40));
      raw[o++] = rgb[2];
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function prompt(page: Page): Locator {
  return page.getByRole("textbox", { name: /prompt/i });
}

export function cards(page: Page): Locator {
  return page.locator("article[data-step]");
}

/** A MediaSlot's file input: its accessible name is the slot's label. */
export function slot(page: Page, label: string): Locator {
  return page.getByRole("button", { name: label, exact: true });
}

/** The right-hand inspector (the composer tray is also a tabpanel, so scope to this). */
export function inspector(page: Page): Locator {
  return page.getByRole("complementary", { name: "Inspector" });
}

const STEP_ORDER = ["encrypting", "uploading", "queued", "generating", "sealing", "decrypting", "ready"];

/** The steps a take passed through must be a forward run through the documented pipeline. */
export function expectStepOrder(steps: string[]): void {
  const indexes = steps.map((s) => STEP_ORDER.indexOf(s));
  expect(indexes, `unknown step in ${steps.join(" → ")}`).not.toContain(-1);
  expect(indexes, `steps went backwards: ${steps.join(" → ")}`).toEqual([...indexes].sort((a, b) => a - b));
  expect(steps).toContain("ready");
  expect(steps.length, `expected progress steps, saw only ${steps.join(" → ")}`).toBeGreaterThan(1);
}

/** The account the studio specs share in one run: fresh each run, so no takes pile up across runs. */
export const STUDIO_EMAIL = `e2e-studio-${Date.now()}@example.com`;
let studioCredited = false;

/** The studio's signed-in indicator. */
export function studioSignedIn(page: Page): Locator {
  return page.getByRole("link", { name: /Signed in/ });
}

/**
 * Opens the studio signed in. The browser gets only the HttpOnly session cookie; the studio has no
 * key or token of its own. `credit` tops the shared account up once, for specs that render.
 */
export async function connect(page: Page, { credit = true }: { credit?: boolean } = {}): Promise<GatewaySession> {
  const session = await signInWithCookie(page, STUDIO_EMAIL);
  if (credit && !studioCredited && session.accountId) {
    await creditAccount(page.request, session.accountId, 100, `e2e-studio-${session.accountId}`);
    studioCredited = true;
  }
  await page.goto("/studio");
  await expect(studioSignedIn(page)).toBeVisible();
  return session;
}


/**
 * A composer tab ("Text", "Frames", "Keyframes", "References", "Edit", "Storyboard"). Matched on
 * the start of the name, because a tab holding inputs shows a count after its label.
 */
export async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole("tab", { name: new RegExp(`^${name}`) });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/** One of the Edit tray's operations ("Edit", "Extend", "Retake", "Audio → video"). */
export async function pickEditOp(page: Page, name: string): Promise<void> {
  const op = page.getByRole("radio", { name, exact: true });
  await op.click();
  await expect(op).toHaveAttribute("aria-checked", "true");
}

/** The composer's main button: "Generate video", or "Render storyboard" on the Storyboard tab. */
export function generateButton(page: Page): Locator {
  return page.getByRole("button", { name: /^(Generate video|Render storyboard)/ });
}

/** The film-stock button, which names the stock currently loaded. */
export function stockButton(page: Page): Locator {
  return page.getByLabel("Model");
}

/** The visible list of reasons the Generate button is off (absent when there are none). */
export function blockers(page: Page): Locator {
  return page.getByRole("list", { name: "Problems to fix" });
}

export async function pickStock(page: Page, name: RegExp): Promise<void> {
  await page.getByLabel("Model").click();
  await page.getByRole("option", { name }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

/**
 * A setting's options are listed by label, not by value: 20 reads as "20 seconds",
 * 48 as "48 fps", and 2160p as "4K".
 */
function optionLabel(field: string, value: string): string {
  if (field === "Duration") return `${value} seconds`;
  if (field === "Frame rate") return `${value} fps`;
  if (field === "Resolution" && value === "2160p") return "4K";
  return value;
}

/** These fields only exist once the advanced row is open. */
const ADVANCED = new Set(["Aspect ratio", "Frame rate", "Seed", "Negative prompt"]);

async function revealSetting(page: Page, field: string): Promise<void> {
  if (!ADVANCED.has(field)) return;
  const toggle = page.getByRole("button", { name: "Advanced settings" });
  if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
}

/** Picks a value in one of the composer's settings (a listbox, not a native select). */
export async function setSetting(page: Page, field: string, value: string): Promise<void> {
  await revealSetting(page, field);
  await page.getByLabel(field).click();
  await page.getByRole("option", { name: optionLabel(field, value), exact: true }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

/** The options a setting offers. They only exist in the DOM while the picker is open. */
export async function settingOptions(page: Page, field: string): Promise<string[]> {
  await revealSetting(page, field);
  await page.getByLabel(field).click();
  const names = await page.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  return names.map((n) => n.trim());
}

/** The value a setting is showing. Its trigger displays the label, so match on that. */
export async function expectSetting(page: Page, field: string, value: string): Promise<void> {
  await revealSetting(page, field);
  await expect(page.getByLabel(field)).toContainText(optionLabel(field, value));
}

export async function generate(page: Page, text: string): Promise<void> {
  await prompt(page).fill(text);
  await prompt(page).press("Control+Enter");
}

/** Polls a card's state, returning every step it passed through. */
export async function watchToReady(card: Locator, timeoutMs = 150_000): Promise<string[]> {
  const seen: string[] = [];
  const started = Date.now();
  for (;;) {
    const step = await card.getAttribute("data-step");
    if (step && seen[seen.length - 1] !== step) seen.push(step);
    if (step === "ready") return seen;
    if (step === "failed" || step === "canceled") {
      throw new Error(`take ${step}: ${(await card.innerText()).replace(/\s+/g, " ")} (steps: ${seen.join(" → ")})`);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for the take (steps: ${seen.join(" → ")})`);
    await card.page().waitForTimeout(60);
  }
}

/** Reads the decrypted film back out of its blob URL to prove it opened in the browser. */
export async function inspectFilm(page: Page): Promise<{ size: number; ftyp: string }> {
  // Newest take first: with more than one film open, this is the one just made.
  const href = await page.getByRole("link", { name: /Download video/ }).first().getAttribute("href");
  expect(href).toMatch(/^blob:/);
  return page.evaluate(async (url) => {
    const bytes = new Uint8Array(await (await fetch(url as string)).arrayBuffer());
    return { size: bytes.length, ftyp: String.fromCharCode(...bytes.slice(4, 8)) };
  }, href);
}
