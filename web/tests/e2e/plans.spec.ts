import { readFileSync } from "node:fs";

import { expect, test, type Page, type Request, type Route } from "@playwright/test";

import { creditAccount, generateButton, horizontalOverflow, openTab, signInWithCookie, studioSignedIn, watchToReady } from "./helpers";

/*
 * Plans from a brief (Director), in the Storyboard tab: a brief, a target length and a style become a scene and shot
 * cards, written inside a confidential worker; the cards are edited, a shot is rewritten, and the storyboard renders.
 *
 * The test tagged @needs-plan-gateway runs the whole path on a gateway that routes plans (`features` in /v1/route,
 * `mode: "plan"`, /v1/standard/plans) and a mock worker, whose canned planner writes a plan from the brief: nothing is
 * stood in, and no GPU is needed. The rest run on any gateway: where /v1/models or /v1/route predate plans they are given
 * the catalog's plan limits and the plan/1 feature, and the job calls that fail are answered here.
 */

const EMAIL = `e2e-plans-${Date.now()}@example.com`;
const CATALOG = JSON.parse(readFileSync(new URL("../../lib/profiles.json", import.meta.url), "utf8")).profiles as Array<{
  id: string;
  modes: string[];
  limits: Record<string, unknown>;
  pricing: Record<string, unknown> & { usd_per_second: Record<string, number>; plan_usd: number; standard_plan_usd: number };
}>;
const FAST = CATALOG.find((p) => p.id === "ltx-2.5-fast")!;
const BRIEF = 'A 30-second ad for a small coffee roastery, warm and handmade. End on "Roasted this morning."';

function upstream(route: Route, url = route.request().url()) {
  return route.fetch({ url, headers: { ...route.request().headers(), origin: new URL(route.request().url()).origin } });
}

/** Where the gateway predates plans: the catalog's plan mode, limits and prices, and plan/1 on attested workers. */
async function withPlanSupport(page: Page): Promise<void> {
  await page.route("**/api/kuno/v1/models", async (route) => {
    const response = await upstream(route);
    const live = (await response.json()) as { models: Array<{ id: string; modes: string[]; limits: Record<string, unknown>; pricing: Record<string, unknown> }> };
    for (const model of live.models ?? []) {
      const catalog = CATALOG.find((p) => p.id === model.id);
      if (!catalog?.limits.plan || model.limits.plan) continue;
      model.modes = catalog.modes;
      model.limits = { ...model.limits, storyboard: catalog.limits.storyboard, plan: catalog.limits.plan };
      model.pricing = { ...model.pricing, plan_usd: catalog.pricing.plan_usd, standard_plan_usd: catalog.pricing.standard_plan_usd };
    }
    await route.fulfill({ response, json: live });
  });
  await page.route("**/api/kuno/v1/route?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("mode") !== "plan") return route.fallback();
    let response = await upstream(route);
    if (!response.ok()) {
      url.searchParams.set("mode", "text_to_video");
      response = await upstream(route, url.toString());
    }
    const body = (await response.json()) as { enclaves: Array<{ features?: string[] }> };
    for (const enclave of body.enclaves ?? []) enclave.features ??= ["plan/1"];
    await route.fulfill({ response, json: body });
  });
}

async function openPlanner(page: Page, { credit = false, support = true } = {}): Promise<void> {
  const session = await signInWithCookie(page, EMAIL);
  if (credit && session.accountId) await creditAccount(page.request, session.accountId, 25, `e2e-plans-${session.accountId}`);
  if (support) await withPlanSupport(page);
  await page.goto("/studio?mode=storyboard");
  await expect(studioSignedIn(page)).toBeVisible();
  await openTab(page, "Storyboard");
  await expect(page.getByLabel("Model")).toContainText("LTX-2.5 Fast");
}

const panel = (page: Page) => page.getByRole("region", { name: "Plan from a brief" });
const brief = (page: Page) => panel(page).getByRole("textbox", { name: "Brief" });
const planButton = (page: Page) => panel(page).getByRole("button", { name: /^Plan · / });
const scene = (page: Page) => page.getByRole("textbox", { name: "Scene" });
const shotCards = (page: Page) => page.getByRole("list", { name: "Shots" }).locator(":scope > li");
const shotCard = (page: Page, n: number) => page.getByRole("listitem", { name: `Shot ${n}`, exact: true });

/** A job status in the gateway's shape. */
function status(jobId: string, params: unknown, extra: Record<string, unknown>) {
  const now = Date.now() / 1000;
  return {
    job_id: jobId, status: "running", stage: "planning", progress: 0.05, params, enclave_id: "e", price_usd: 0.1, created_at: now,
    updated_at: now, output_blob_id: null, receipt: null, error_code: null, error: null, ...extra,
  };
}

test("the panel: target lengths within the plan limits, the flat price in each mode, and a brief first", async ({ page }) => {
  await openPlanner(page);
  await expect(panel(page)).toContainText("Planned inside a confidential worker");
  const lengths = panel(page).getByRole("radiogroup", { name: "Length" }).getByRole("radio");
  await expect(lengths).toHaveText(["15 s", "30 s", "45 s", "60 s", "90 s", "120 s"]);
  await expect(panel(page).getByRole("radio", { name: "30 s" })).toHaveAttribute("aria-checked", "true");
  await panel(page).getByRole("radio", { name: "30 s" }).press("ArrowRight");
  await expect(panel(page).getByRole("radio", { name: "45 s" })).toHaveAttribute("aria-checked", "true");
  await expect(panel(page)).toContainText("16:9 · 720p · Sound on");
  await expect(planButton(page)).toHaveText(`Plan · $${FAST.pricing.plan_usd.toFixed(2)}`);

  await page.getByRole("radio", { name: "Standard", exact: true }).check();
  await expect(planButton(page)).toHaveText(`Plan · $${FAST.pricing.standard_plan_usd.toFixed(2)}`);
  await expect(panel(page)).toContainText("Standard: KunoWorld can read the brief");
  await page.getByRole("radio", { name: "Private", exact: true }).check();

  // Nothing is sent without a brief.
  const sent: string[] = [];
  page.on("request", (r) => r.method() === "POST" && sent.push(new URL(r.url()).pathname));
  await planButton(page).click();
  await expect(panel(page).getByRole("alert")).toContainText("Write a brief first.");
  expect(sent.filter((p) => /videos|plans|blobs/.test(p))).toEqual([]);

  // The storyboard's own button says what it does.
  await expect(generateButton(page)).toHaveText(/^Render storyboard/);
});

test("a plan that fails, is blocked, or has no worker reads plainly", async ({ page }) => {
  // Private mode needs a credited account; the job calls that fail are answered here.
  await openPlanner(page, { credit: true });
  let failure: { code: string; message: string } = { code: "plan_failed", message: "The planner could not write a usable plan for this brief." };
  const created: Array<Record<string, unknown>> = [];
  await page.route("**/api/kuno/v1/videos", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    created.push(body);
    return route.fulfill({ status: 201, json: status(String(body.job_id), body.params, { status: "queued", stage: null }) });
  });
  await page.route("**/api/kuno/v1/videos/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    const job = created.find((c) => c.job_id === id);
    if (route.request().method() !== "GET" || !job) return route.fallback();
    return route.fulfill({ json: status(id!, job.params, { status: "failed", stage: null, error_code: failure.code, error: failure.message }) });
  });

  await brief(page).fill(BRIEF);
  await planButton(page).click();
  await expect(panel(page).getByRole("alert")).toContainText("Couldn't plan this brief. You weren't charged. Try rephrasing it.");
  // What the gateway saw: the frame and the target, and ciphertext.
  const [first] = created as Array<{ params: Record<string, unknown>; ciphertext: string }>;
  expect(first.params).toEqual({ profile_id: "ltx-2.5-fast", mode: "plan", duration_s: 30, resolution: "720p", aspect_ratio: "16:9", fps: 24, audio: true, input_roles: [] });
  expect(JSON.stringify(first)).not.toContain("roastery");

  failure = { code: "safety_blocked", message: "Blocked." };
  await planButton(page).click();
  await expect(panel(page).getByRole("alert")).toContainText("Blocked by the content policy. The check inside the sealed worker stopped this plan, so no person read your brief.");
  await expect(panel(page).getByRole("alert")).toContainText("You weren't charged.");

  await page.route("**/api/kuno/v1/route?**", async (route) => {
    const response = await upstream(route);
    const body = (await response.json()) as { enclaves: Array<{ features?: string[] }> };
    for (const enclave of body.enclaves ?? []) enclave.features = [];
    await route.fulfill({ response, json: body });
  });
  await planButton(page).click();
  await expect(panel(page).getByRole("alert")).toContainText("No worker can write plans right now. Nothing was sent or charged.");
  expect(created).toHaveLength(2);
  await expect(shotCards(page)).toHaveCount(2);
});

test("the plan panel fits a 320px phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPlanner(page);
  await brief(page).fill(BRIEF);
  await panel(page).getByLabel("Style (optional)").fill("warm, handheld, 35mm film look");
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  await panel(page).screenshot({ path: test.info().outputPath("plan-panel-320.png") });
});

test("a brief becomes editable shot cards, a shot is rewritten, and the storyboard renders @needs-plan-gateway", async ({ page }) => {
  // Needs a gateway that routes plans and a worker that writes them (the mock worker's canned planner): no stand-ins.
  await openPlanner(page, { credit: true, support: false });
  const posted: Request[] = [];
  page.on("request", (r) => r.method() === "POST" && /\/api\/kuno\/v1\/(videos|standard\/plans)$/.test(new URL(r.url()).pathname) && posted.push(r));

  await brief(page).fill(BRIEF);
  await panel(page).getByRole("radio", { name: "30 s" }).click();
  await panel(page).getByLabel("Style (optional)").fill("35mm film, warm");
  await planButton(page).click();
  await expect(panel(page).getByRole("status")).toContainText(/Sending the brief…|Planning…|Checking the plan…/);

  // The mock planner writes five 7 s shots; the fit brings the stitched length to 30.375 s.
  await expect(shotCards(page)).toHaveCount(5, { timeout: 60_000 });
  await expect(panel(page).getByRole("status")).toHaveCount(0);
  await expect(scene(page)).toHaveValue("A plain, evenly lit studio set.");
  await expect(shotCard(page, 1)).toContainText("Beat 1");
  await expect(shotCard(page, 5).getByRole("textbox", { name: "What happens in shot 5" })).toHaveValue(/"Roasted this morning\."/);
  const notes = panel(page).getByRole("list", { name: "About this plan" });
  await expect(notes).toContainText("Adjusted: the shots ran 32.375 s; shots 1 and 2 shortened to reach 30.375 s.");
  await expect(notes).toContainText("Planner note: Written by the mock planner.");
  await expect(page.getByTestId("storyboard-length")).toContainText("Stitched video: 30.4 s.");
  const renderPrice = `$${(Math.round(FAST.pricing.usd_per_second["720p"] * 30.375 * 10000) / 10000).toFixed(2)}`;
  await expect(generateButton(page)).toHaveText(new RegExp(`Render storyboard · \\${renderPrice}`));

  // Sealed: the gateway saw the plan's frame and target, never the brief or the style.
  const planJob = posted[0].postDataJSON() as { params: Record<string, unknown> };
  expect(planJob.params).toMatchObject({ mode: "plan", duration_s: 30, resolution: "720p" });
  expect(posted[0].postData()).not.toContain("roastery");
  expect(posted[0].postData()).not.toContain("35mm");

  // Dismiss a notice; edit shot 1 by hand; rewrite shot 2 only.
  await notes.getByRole("button", { name: "Dismiss" }).last().click();
  await expect(notes).not.toContainText("Planner note");
  const edited = "Extreme close-up; roasted beans tumble into the cooling tray. The drum hums.";
  await shotCard(page, 1).getByRole("textbox", { name: "What happens in shot 1" }).fill(edited);
  const before = await Promise.all([3, 4, 5].map((n) => shotCard(page, n).getByRole("textbox", { name: `What happens in shot ${n}` }).inputValue()));
  await shotCard(page, 2).getByRole("button", { name: "Rewrite shot 2", exact: true }).click();
  await shotCard(page, 2).getByRole("textbox", { name: "What to change in shot 2" }).fill("darker, at night");
  await shotCard(page, 2).getByRole("button", { name: /^Rewrite shot 2 · \$0\.10$/ }).click();
  await expect(shotCard(page, 2).getByRole("textbox", { name: "What happens in shot 2" })).toHaveValue(/^Medium shot; the subject\./, { timeout: 60_000 });
  await expect(page.getByRole("status").filter({ hasText: "Rewriting" })).toHaveCount(0);
  await expect(shotCard(page, 1).getByRole("textbox", { name: "What happens in shot 1" })).toHaveValue(edited);
  for (const [i, n] of [3, 4, 5].entries()) {
    await expect(shotCard(page, n).getByRole("textbox", { name: `What happens in shot ${n}` })).toHaveValue(before[i]);
  }
  expect(posted).toHaveLength(2);
  expect(posted[1].postData()).not.toContain("darker");
  await page.locator('[data-plan-panel]').screenshot({ path: test.info().outputPath("plan-panel-after.png") });
  await page.locator("section.composer").screenshot({ path: test.info().outputPath("plan-storyboard.png") });
  // The planned cards, their Rewrite buttons and the notices fit a phone.
  await page.setViewportSize({ width: 320, height: 900 });
  await shotCard(page, 3).getByRole("button", { name: "Rewrite shot 3", exact: true }).click();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  await page.locator("section.composer").screenshot({ path: test.info().outputPath("plan-storyboard-320.png") });
  await shotCard(page, 3).getByRole("button", { name: "Rewrite shot 3", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 720 });

  // Rendered as the storyboard on the cards.
  await generateButton(page).click();
  await expect.poll(() => posted.length, { timeout: 30_000 }).toBe(3);
  const render = posted[2].postDataJSON() as { params: { mode: string; shots: Array<{ duration_s: number; join: string }> } };
  expect(render.params.mode).toBe("storyboard");
  expect(render.params.shots).toHaveLength(5);
  expect(render.params.shots[0].join).toBe("fresh");
  await watchToReady(page.locator('article[data-privacy="private"]').first());

  // A Standard plan goes through /v1/standard/plans, readable by KunoWorld.
  await page.getByRole("button", { name: "Create a video" }).click();
  await openTab(page, "Storyboard");
  await page.getByRole("radio", { name: "Standard", exact: true }).check();
  await brief(page).fill("A 15-second film: a paper boat drifts across a pond in the rain.");
  await panel(page).getByRole("radio", { name: "15 s" }).click();
  await planButton(page).click();
  await expect(panel(page).getByRole("status")).toHaveCount(0, { timeout: 60_000 });
  await expect(panel(page).getByRole("alert")).toHaveCount(0);
  const standard = posted.find((r) => new URL(r.url()).pathname.endsWith("/standard/plans"))!;
  expect(standard.postDataJSON()).toMatchObject({ brief: "A 15-second film: a paper boat drifts across a pond in the rain.", params: { mode: "plan", duration_s: 15 } });
  await expect(shotCards(page)).toHaveCount(3);
});
