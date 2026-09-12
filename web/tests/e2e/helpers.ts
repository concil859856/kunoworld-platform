import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

import { expect, type Locator, type Page } from "@playwright/test";

const DATA_DIR = process.env.KUNO_DATA_DIR ?? "/tmp/kuno-web-data";

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
  return page.getByRole("textbox", { name: "Prompt" });
}

export function cards(page: Page): Locator {
  return page.locator("li[data-step]");
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

/** Opens the studio and connects with the dev key through the real Connect dialog. */
export async function connect(page: Page): Promise<void> {
  await page.goto("/studio");
  // The empty library offers a Connect button too; use the one in the header.
  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  // Exact, because the dialog itself is labelled "Connect an API key".
  await page.getByLabel("API key", { exact: true }).fill(devApiKey());
  await page.getByRole("button", { name: "Check & connect" }).click();
  await expect(page.getByRole("button", { name: /Connected/ })).toBeVisible();
}

/**
 * A composer tab ("Text", "Frames", "Keyframes", "References", "Edit"). Matched on
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

export function generateButton(page: Page): Locator {
  return page.getByRole("button", { name: /^Generate/ });
}

/** The film-stock button, which names the stock currently loaded. */
export function stockButton(page: Page): Locator {
  return page.getByRole("button", { name: /Change film stock/ });
}

/** The visible list of reasons the Generate button is off (absent when there are none). */
export function blockers(page: Page): Locator {
  return page.getByRole("list", { name: "Problems to fix" });
}

export async function pickStock(page: Page, name: RegExp): Promise<void> {
  await page.getByRole("button", { name: /Change film stock/ }).click();
  await page.getByRole("option", { name }).click();
  await expect(page.getByRole("listbox", { name: "Film stock" })).toBeHidden();
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
  const href = await page.getByRole("link", { name: "Download" }).getAttribute("href");
  expect(href).toMatch(/^blob:/);
  return page.evaluate(async (url) => {
    const bytes = new Uint8Array(await (await fetch(url as string)).arrayBuffer());
    return { size: bytes.length, ftyp: String.fromCharCode(...bytes.slice(4, 8)) };
  }, href);
}
