import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

import {
  blockers,
  cards,
  creditAccount,
  generateButton,
  horizontalOverflow,
  inspector,
  openTab,
  setSetting,
  signInWithCookie,
  studioSignedIn,
  watchToReady,
} from "./helpers";

/*
 * The Storyboard tab: a scene, 2 to 12 shot cards, the stitched length and price, and submission in both privacy modes.
 *
 * The rules come from kuno_protocol/profiles.py (`_validate_storyboard`, `storyboard_duration_s`). The dev gateway may
 * predate storyboards, so /v1/models is given the catalog's storyboard limits where the live profile lacks them, and the
 * two submission tests answer the job calls themselves, in the gateway's shapes: they check what the browser sends,
 * and how a running storyboard's `shot i/N` stage reads, without a GPU or a worker that renders storyboards. Only the
 * test tagged @needs-storyboard-gateway renders one for real.
 */

const EMAIL = `e2e-storyboard-${Date.now()}@example.com`;
const CATALOG = JSON.parse(readFileSync(new URL("../../lib/profiles.json", import.meta.url), "utf8")).profiles as Array<{
  id: string;
  modes: string[];
  limits: { storyboard?: { max_shots: number; max_total_s: number } };
  pricing: { usd_per_second: Record<string, number>; standard_usd_per_second: Record<string, number> };
}>;
const FAST = CATALOG.find((p) => p.id === "ltx-2.5-fast")!;

/** LTX-2.5 at 24 fps: 8k+1 frames, 17 of them repeated by each joined shot. Mirrors storyboard_duration_s. */
function stitched(durations: number[], joined: boolean[]): number {
  const frames = durations.reduce((sum, d, i) => sum + 8 * Math.max(1, Math.round((d * 24) / 8)) + 1 - (joined[i] ? 17 : 0), 0);
  return frames / 24;
}

/** The studio's price label for a job of `seconds` at a per-second rate. */
function priceLabel(rate: number, seconds: number): string {
  const usd = Math.max(0.1, Math.round(rate * seconds * 10000) / 10000);
  return `$${usd.toFixed(2)}`;
}

/**
 * Sends an intercepted call on through the site's proxy. The proxy serves only this site's pages, which it tells by
 * Sec-Fetch-Site or Origin; a request replayed from the test carries neither, so it gets the page's Origin.
 */
function upstream(route: Route, url = route.request().url()) {
  return route.fetch({ url, headers: { ...route.request().headers(), origin: new URL(route.request().url()).origin } });
}

/** Gives live profiles the catalog's storyboard mode and limits, where a gateway from before storyboards left them out. */
async function withStoryboardProfiles(page: Page): Promise<void> {
  await page.route("**/api/kuno/v1/models", async (route) => {
    const response = await upstream(route);
    expect(response.ok(), `GET /v1/models: ${response.status()}`).toBe(true);
    const live = (await response.json()) as { models: Array<{ id: string; modes: string[]; limits: Record<string, unknown> }> };
    for (const model of live.models ?? []) {
      const catalog = CATALOG.find((p) => p.id === model.id);
      if (!catalog?.limits.storyboard || model.limits.storyboard) continue;
      model.modes = catalog.modes;
      model.limits = { ...model.limits, storyboard: catalog.limits.storyboard };
    }
    await route.fulfill({ response, json: live });
  });
}

async function openStoryboard(page: Page, { credit = false }: { credit?: boolean } = {}): Promise<void> {
  const session = await signInWithCookie(page, EMAIL);
  if (credit && session.accountId) await creditAccount(page.request, session.accountId, 25, `e2e-storyboard-${session.accountId}`);
  await withStoryboardProfiles(page);
  await page.goto("/studio?mode=storyboard");
  await expect(studioSignedIn(page)).toBeVisible();
  await openTab(page, "Storyboard");
  await expect(page.getByLabel("Model")).toContainText("LTX-2.5 Fast");
}

const scene = (page: Page) => page.getByRole("textbox", { name: "Scene" });
// The cards themselves: a card listing its problems holds list items of its own.
const shotCards = (page: Page) => page.getByRole("list", { name: "Shots" }).locator(":scope > li");
const shotCard = (page: Page, n: number) => page.getByRole("listitem", { name: `Shot ${n}`, exact: true });
const shotText = (card: Locator) => card.getByRole("textbox");
const lengthSummary = (page: Page) => page.getByTestId("storyboard-length");

async function setLength(page: Page, n: number, seconds: number): Promise<void> {
  await page.getByRole("combobox", { name: `Length of shot ${n}` }).click();
  await page.getByRole("option", { name: `${seconds} seconds`, exact: true }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

async function fillShots(page: Page, prompts: string[]): Promise<void> {
  while ((await shotCards(page).count()) < prompts.length) await page.getByRole("button", { name: "Add shot" }).click();
  for (const [i, text] of prompts.entries()) await shotText(shotCard(page, i + 1)).fill(text);
}

test("a storyboard's shots, joins, limits, stitched length and price", async ({ page }) => {
  await openStoryboard(page);

  // Two shots to start, the first always a new shot; the scene is optional.
  await expect(shotCards(page)).toHaveCount(2);
  await expect(shotCard(page, 1).getByRole("radiogroup")).toHaveCount(0);
  await expect(shotCard(page, 1)).toContainText("the first shot always starts fresh");
  await expect(shotCard(page, 2).getByRole("radio", { name: "Continue" })).toHaveAttribute("aria-checked", "true");
  await expect(shotCard(page, 2)).toContainText("Continue — one unbroken take");
  await expect(shotCard(page, 1).getByRole("button", { name: "Remove shot 1" })).toBeDisabled();

  // Nothing said until you try; then each empty shot is named on its card.
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");
  await generateButton(page).click({ force: true });
  await expect(shotCard(page, 1)).toContainText("Shot 1 needs a prompt.");
  await expect(blockers(page)).toContainText("Fix the highlighted shots above.");
  await expect(cards(page)).toHaveCount(0);

  await fillShots(page, ["The boat leaves the harbor.", "Gulls follow it out to sea."]);
  await expect(blockers(page)).toHaveCount(0);
  await expect(generateButton(page)).not.toHaveAttribute("aria-disabled", "true");

  // Two 5 s shots joined: 241 frames less 17, 9.375 s, shorter than the 10 s they add up to.
  const two = stitched([5, 5], [false, true]);
  expect(two).toBe(9.375);
  await expect(lengthSummary(page)).toContainText("Stitched video: 9.4 s.");
  await expect(lengthSummary(page)).toContainText("The shots add up to 10 s; each joined shot loses about 0.7 s");
  await expect(generateButton(page)).toContainText(priceLabel(FAST.pricing.usd_per_second["720p"], two));
  await page.getByRole("radio", { name: "Standard", exact: true }).check();
  await expect(generateButton(page)).toContainText(priceLabel(FAST.pricing.standard_usd_per_second["720p"], two));
  await page.getByRole("radio", { name: "Private", exact: true }).check();

  // A cut keeps the sound, a new shot keeps nothing: only joined shots lose their overlap.
  await shotCard(page, 2).getByRole("radio", { name: "New shot" }).click();
  await expect(shotCard(page, 2)).toContainText("New shot — nothing carried over");
  // Each shot renders 8k+1 frames, so two 5 s shots are 242 frames: 10.08 s.
  await expect(lengthSummary(page)).toHaveText("Stitched video: 10.1 s.");
  await shotCard(page, 2).getByRole("radio", { name: "Cut" }).click();
  await expect(shotCard(page, 2)).toContainText("Cut — new picture, same sound");
  await expect(lengthSummary(page)).toContainText("Stitched video: 9.4 s.");

  // Reordering moves the prompt, and whichever shot comes first starts fresh.
  await shotCard(page, 2).getByRole("button", { name: "Move shot 2 earlier" }).click();
  await expect(shotText(shotCard(page, 1))).toHaveValue("Gulls follow it out to sea.");
  await expect(shotText(shotCard(page, 2))).toHaveValue("The boat leaves the harbor.");
  await expect(shotCard(page, 1).getByRole("radiogroup")).toHaveCount(0);
  await expect(shotCard(page, 2).getByRole("radio", { name: "Continue" })).toHaveAttribute("aria-checked", "true");

  // Up to 12 shots, and never fewer than 2.
  await fillShots(page, Array.from({ length: 12 }, (_, i) => `Beat ${i + 1}.`));
  await expect(page.getByRole("button", { name: "Add shot" })).toBeDisabled();
  await expect(page.getByText("12 shots is the most")).toBeVisible();
  await shotCard(page, 12).getByRole("button", { name: "Remove shot 12" }).click();
  await expect(shotCards(page)).toHaveCount(11);
  await expect(page.getByRole("button", { name: "Add shot" })).toBeEnabled();

  // Past 120 s stitched, Generate is off and says why: seven 20 s shots joined make 140 s less six overlaps.
  while ((await shotCards(page).count()) > 7) await shotCard(page, 8).getByRole("button", { name: "Remove shot 8" }).click();
  for (let n = 1; n <= 7; n++) await setLength(page, n, 20);
  const long = stitched(Array(7).fill(20), [false, true, true, true, true, true, true]);
  await expect(blockers(page)).toContainText(`These shots make ${Number(long.toFixed(1))} s; a storyboard can be at most 120 s.`);
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");
  // Shortening one shot to 2 s brings it back under: 118 s.
  expect(stitched([...Array(6).fill(20), 2], [false, true, true, true, true, true, true])).toBeLessThanOrEqual(120);
  await setLength(page, 7, 2);
  await expect(blockers(page)).toHaveCount(0);

  // At 48 fps LTX-2.5 Fast renders up to 10 s, so every shot is fitted to it.
  await setSetting(page, "Frame rate", "48");
  await expect(page.getByRole("combobox", { name: "Length of shot 1" })).toHaveText("10 s");

  // Each shot's prompt must fit the model's limit together with the scene.
  await scene(page).fill("x".repeat(3995));
  await expect(shotCard(page, 1)).toContainText("Shot 1 and the scene come to 4,004 characters; LTX-2.5 Fast takes 4,000.");
  await scene(page).fill("A small blue fishing boat.");
  await expect(blockers(page)).toHaveCount(0);
});

test("the Storyboard tab fits a 320px phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openStoryboard(page);
  await fillShots(page, ["The boat leaves the harbor.", "Gulls follow it out to sea.", "The skipper hauls in the net."]);
  await shotCard(page, 3).getByRole("radio", { name: "Cut" }).click();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  await page.locator("section.composer").screenshot({ path: test.info().outputPath("storyboard-320.png") });
});

/** A job status in the gateway's shape. */
function status(jobId: string, body: Record<string, unknown>, extra: Record<string, unknown>) {
  return {
    job_id: jobId,
    status: "running",
    stage: "shot 2/3",
    progress: 0.4,
    params: body.params,
    enclave_id: body.enclave_id ?? "open-1",
    price_usd: 0.69,
    created_at: Date.now() / 1000,
    updated_at: Date.now() / 1000,
    output_blob_id: null,
    receipt: null,
    error_code: null,
    error: null,
    ...extra,
  };
}

const SCENE = "A small blue fishing boat and its old skipper, early morning.";
const PROMPTS = ["The boat leaves the harbor.", "Gulls follow it out to sea.", "Close on the skipper's hands hauling in the net."];

async function composeThreeShots(page: Page): Promise<void> {
  await scene(page).fill(SCENE);
  await fillShots(page, PROMPTS);
  await setLength(page, 2, 4);
  await shotCard(page, 3).getByRole("radio", { name: "Cut" }).click();
  await setLength(page, 3, 6);
}

const EXPECTED_SHOTS = [
  { duration_s: 5, join: "fresh" },
  { duration_s: 4, join: "continue" },
  { duration_s: 6, join: "cut" },
];

test("a standard storyboard sends the scene and each shot's prompt, and its progress reads shot by shot", async ({ page }) => {
  await openStoryboard(page);
  await page.getByRole("radio", { name: "Standard", exact: true }).check();
  await composeThreeShots(page);

  let created: Record<string, unknown> | null = null;
  await page.route("**/api/kuno/v1/route?**", (route) =>
    route.fulfill({ json: { profile_id: "ltx-2.5-fast", requested_profile_id: "ltx-2.5-fast", fallback_reason: null, enclaves: [] } }),
  );
  await page.route("**/api/kuno/v1/standard/videos", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    created = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: status(String(created!.job_id), created!, { status: "queued", stage: null, privacy: "standard" }) });
  });
  await page.route("**/api/kuno/v1/videos/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    if (route.request().method() !== "GET" || !created || id !== created.job_id) return route.fallback();
    return route.fulfill({ json: status(id!, created, { privacy: "standard" }) });
  });

  await generateButton(page).click();
  await expect.poll(() => created).not.toBeNull();
  const body = created as unknown as { prompt: string; shots: Array<{ prompt: string }>; params: Record<string, unknown> };
  expect(body.prompt).toBe(SCENE);
  expect(body.shots).toEqual(PROMPTS.map((prompt) => ({ prompt })));
  expect(body.params).toMatchObject({ profile_id: "ltx-2.5-fast", mode: "storyboard", fps: 24, shots: EXPECTED_SHOTS, input_roles: [] });
  expect(body.params.duration_s).toBe(stitched([5, 4, 6], [false, true, true]));

  const card = page.locator('article[data-privacy="standard"][data-step="generating"]').first();
  await expect(card).toContainText("Storyboard · Shot 2 of 3");
  await expect(inspector(page).getByRole("definition").filter({ hasText: "Shot 2 of 3" })).toBeVisible();
  await expect(inspector(page)).toContainText("13.7 s · 3 shots");
  await expect(inspector(page).getByRole("list", { name: "Shots" })).toContainText("Gulls follow it out to sea. · 4 s · Continue");
});

test("a private storyboard seals every prompt in the browser and sends only the shots' lengths and joins", async ({ page }) => {
  await openStoryboard(page, { credit: true });
  await expect(page.getByRole("radio", { name: "Private", exact: true })).toBeChecked();
  await composeThreeShots(page);

  // Routing asks the real gateway for attested workers; one from before storyboards is asked for text to video instead.
  await page.route("**/api/kuno/v1/route?**", async (route) => {
    const url = new URL(route.request().url());
    const asked = url.searchParams.get("mode");
    if (asked === "storyboard") {
      const response = await upstream(route);
      if (response.ok()) return route.fulfill({ response });
      url.searchParams.set("mode", "text_to_video");
    }
    return route.fulfill({ response: await upstream(route, url.toString()) });
  });
  let sealed: Record<string, unknown> | null = null;
  await page.route("**/api/kuno/v1/videos", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    sealed = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: status(String(sealed!.job_id), sealed!, { status: "queued", stage: null }) });
  });
  await page.route("**/api/kuno/v1/videos/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    if (route.request().method() !== "GET" || !sealed || id !== sealed.job_id) return route.fallback();
    return route.fulfill({ json: status(id!, sealed, { stage: "shot 1/3", progress: 0.2 }) });
  });

  await generateButton(page).click();
  await expect.poll(() => sealed, { timeout: 30_000 }).not.toBeNull();
  const body = sealed as unknown as { params: Record<string, unknown>; ciphertext: string; enc: string };
  expect(body.params).toMatchObject({ mode: "storyboard", shots: EXPECTED_SHOTS, input_roles: [] });
  expect(body.params.duration_s).toBe(stitched([5, 4, 6], [false, true, true]));
  expect(body.ciphertext.length).toBeGreaterThan(0);
  // Nothing readable: not the scene, not a shot.
  const sent = JSON.stringify(body);
  for (const text of [SCENE, ...PROMPTS]) expect(sent).not.toContain(text);

  const card = page.locator('article[data-privacy="private"][data-step="generating"]').first();
  await expect(card).toContainText("Storyboard · Shot 1 of 3");
  await expect(inspector(page).getByRole("definition").filter({ hasText: "Shot 1 of 3" })).toBeVisible();
});

test("a storyboard renders in both modes @needs-storyboard-gateway", async ({ page }) => {
  // Needs a gateway and worker that serve storyboards (PROTOCOL.md, "Storyboards"): no stand-ins here.
  await openStoryboard(page, { credit: true });
  for (const mode of ["Private", "Standard"] as const) {
    await page.getByRole("radio", { name: mode, exact: true }).check();
    await scene(page).fill(`A paper boat on a pond, ${mode.toLowerCase()} take.`);
    await fillShots(page, ["It drifts to the middle.", "Rain starts to fall on it."]);
    await setLength(page, 1, 2);
    await setLength(page, 2, 2);
    await generateButton(page).click();
    const card = page.locator(`article[data-privacy="${mode.toLowerCase()}"]`).first();
    await watchToReady(card);
    await page.getByRole("button", { name: "Create a video" }).click();
    await openTab(page, "Storyboard");
  }
});
