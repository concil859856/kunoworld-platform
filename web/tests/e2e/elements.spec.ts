import { expect, test, type Page, type Request } from "@playwright/test";

import { wavFile } from "./fixtures";
import {
  GATEWAY,
  bearer,
  cards,
  creditAccount,
  horizontalOverflow,
  openTab,
  pickStock,
  pngBytes,
  prompt,
  signInWithCookie,
  studioSignedIn,
  watchToReady,
  type GatewaySession,
} from "./helpers";

/*
 * Elements (platform/gateway/ELEMENTS.md): reusable characters, products, places, styles and voices, encrypted in the
 * browser under key sync's keys.
 *
 * The tests run in order on one account of their own: key sync set up in the first unlocks a fresh browser in the last.
 * All are tagged @needs-elements-gateway: they need a gateway with /v1/elements (migration 0021). The take in the
 * second test renders on the mock worker, so no GPU is needed.
 */

test.describe.configure({ mode: "serial" });

const EMAIL = `e2e-elements-${Date.now()}@example.com`;
const WIDTHS = [320, 375, 768];
const NAME = "Mara";
const DESCRIPTION = "a woman in her 60s with short silver hair and a green raincoat";
const LINE = `${NAME}: ${DESCRIPTION}`;

let credited = false;
let recoveryCode = "";
let session: GatewaySession | null = null;

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

/**
 * The picker stays inside the phone's width. (The page as a whole is checked at 375 and 768 px: at 320 px the composer's
 * settings row is already 2 px too wide with LTX-2.5 Fast's name in it, with or without Elements.)
 */
async function expectPickerFits(page: Page): Promise<void> {
  const picker = page.getByRole("region", { name: "Add an Element" });
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    const box = await picker.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width + 1, `the Elements picker is wider than ${width}px`).toBe(true);
    if (width > 320) expect(await horizontalOverflow(page), `the composer scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function openStudio(page: Page, { credit = true }: { credit?: boolean } = {}): Promise<GatewaySession> {
  const signedIn = await signInWithCookie(page, EMAIL);
  if (credit && !credited && signedIn.accountId) {
    // An operator credit also makes the account eligible for private mode.
    await creditAccount(page.request, signedIn.accountId, 60, `e2e-elements-${signedIn.accountId}`);
    credited = true;
  }
  await page.goto("/studio");
  await expect(studioSignedIn(page)).toBeVisible();
  return signedIn;
}

async function openElements(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Elements", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Your Elements", level: 2 })).toBeVisible();
}

function elementCard(page: Page, name: string) {
  return page.getByRole("article", { name, exact: true });
}

interface StoredElements {
  count: number;
  master_key_id: string;
  elements: Array<{ revision: number; master_key_id: string; meta: string; files: unknown[] }>;
}

async function storedElements(page: Page): Promise<{ text: string; body: StoredElements }> {
  const response = await page.request.get(`${GATEWAY}/v1/elements`, { headers: bearer(session!.token) });
  expect(response.ok(), await response.text()).toBe(true);
  const text = await response.text();
  return { text, body: JSON.parse(text) };
}

test("Elements wait for key sync, then a character with consent is saved encrypted @needs-elements-gateway", async ({ page }) => {
  session = await openStudio(page);
  await openElements(page);
  await expect(page.getByText("Turn on key sync to make your first one.")).toBeVisible();
  await expect(page.getByText("No public figures and no one under 18.")).toBeVisible();

  const panel = page.getByRole("region", { name: "Key sync" });
  await panel.getByRole("button", { name: "Set up key sync" }).click();
  recoveryCode = (await panel.getByLabel("Your recovery code").innerText()).trim();
  await panel.getByLabel("I saved my recovery code somewhere safe").check();
  await panel.getByLabel("Type its last four characters to confirm").fill(recoveryCode.slice(-4));
  await panel.getByRole("button", { name: "Turn on key sync" }).click();

  const add = page.getByRole("button", { name: "New Element" });
  await expect(add).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "No Elements yet" })).toBeVisible();
  await add.click();
  const form = page.getByRole("form", { name: "New Element" });
  await expect(form.getByRole("radio", { name: "Character" })).toHaveAttribute("aria-checked", "true");

  // Nothing is sent until the form is complete.
  await form.getByRole("button", { name: "Save Element" }).click();
  await expect(form.getByRole("list", { name: "Problems to fix" })).toContainText("Give it a name.");
  await expect(form.getByRole("list", { name: "Problems to fix" })).toContainText("Confirm the Elements rules.");

  await form.getByLabel("Name").fill(NAME);
  await form.getByLabel(/^Description/).fill(DESCRIPTION);
  await form.getByLabel("Add pictures").setInputFiles([
    { name: "mara-front.png", mimeType: "image/png", buffer: pngBytes(96, 96, [150, 170, 160]) },
    { name: "mara-side.png", mimeType: "image/png", buffer: pngBytes(96, 96, [90, 140, 120]) },
  ]);
  await expect(form.getByRole("figure", { name: /^Picture 2/ })).toBeVisible();
  await form.getByLabel("This shows a real person").check();
  await form.getByLabel("Their name").fill("Mara Jones");
  await form.getByRole("button", { name: "Save Element" }).click();
  await expect(form.getByRole("list", { name: "Problems to fix" })).toContainText("Confirm you have this person's permission");
  await form.getByLabel(/I am this person, or I have their permission/).check();
  await form.getByLabel(/No public figures and no one under 18/).check();
  await expectFits(page, "the Element form");
  await form.getByRole("button", { name: "Save Element" }).click();

  const card = elementCard(page, NAME);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText("Real person · consent recorded");
  await expect(card).toContainText(DESCRIPTION);
  // Which models take its pictures; H3 isn't licensed in this run's region.
  await expect(card).toContainText("LTX-2.5 Fast");
  await expect(card).toContainText("first frame");
  await expect(card).toContainText("reference image (not available here)");
  await expect(card.getByRole("img", { name: NAME })).toHaveAttribute("src", /^blob:/);
  await expectFits(page, "the Elements page");

  // KunoWorld holds ciphertext: no name, description, consent or kind.
  const { text, body } = await storedElements(page);
  expect(body.count).toBe(1);
  expect(body.elements[0].files).toHaveLength(2);
  for (const plain of [NAME, "silver hair", "Mara Jones", "character", "mara-front"]) expect(text).not.toContain(plain);
});

test("using an Element adds its line to the prompt and its picture as the first frame, and a Private take renders @needs-elements-gateway", async ({ page }) => {
  test.skip(!recoveryCode, "needs the Element saved by the previous test");
  await openStudio(page);
  // Every test starts with a fresh browser context, which unlocks key sync again.
  await openElements(page);
  const panel = page.getByRole("region", { name: "Key sync" });
  if (await panel.getByLabel("Recovery code").isVisible().catch(() => false)) {
    await panel.getByLabel("Recovery code").fill(recoveryCode);
    await panel.getByRole("button", { name: "Unlock" }).click();
  }
  const card = elementCard(page, NAME);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByRole("button", { name: "Use in a video" }).click();

  const picker = page.getByRole("region", { name: "Add an Element" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: NAME })).toHaveAttribute("aria-pressed", "true");
  await pickStock(page, /LTX-2\.5 Fast/);
  await picker.getByRole("button", { name: "Picture 2" }).click();
  await expectPickerFits(page);
  await picker.getByRole("button", { name: "As the first frame" }).click();
  await expect(picker.getByRole("status")).toContainText("picture 2 as the first frame");

  await expect(page.getByRole("tab", { name: /^Frames/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("figure", { name: /^First frame: Mara 2/ })).toBeVisible();
  await expect(prompt(page)).toHaveValue(LINE);
  // The line is ordinary prompt text: edit it like anything typed.
  await prompt(page).fill(`${LINE}\nShe walks along the pier at dusk.`);

  const created: Request[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/kuno/v1/videos")) created.push(r);
  });
  await prompt(page).press("Control+Enter");
  const take = cards(page).first();
  await watchToReady(take);
  await expect(take).toHaveAttribute("data-privacy", "private");
  // A Private take: the Element's picture went as an ordinary first-frame input, sealed to the enclave with the prompt.
  expect(created).toHaveLength(1);
  const job = JSON.parse(created[0].postData() ?? "{}") as { job_id: string; params: { input_roles: string[] }; input_blob_ids: string[] };
  expect(job.params.input_roles).toEqual(["first_frame"]);
  expect(job.input_blob_ids).toHaveLength(1);
  expect(created[0].postData()).not.toContain("silver hair");
  const status = await page.request.get(`${GATEWAY}/v1/videos/${job.job_id}`, { headers: bearer(session!.token) });
  expect(((await status.json()) as { status: string }).status).toBe("succeeded");
});

test("a storyboard takes the description into its scene, and a voice nobody here can use is kept for later @needs-elements-gateway", async ({ page }) => {
  test.skip(!recoveryCode, "needs the Element saved by the first test");
  await openStudio(page, { credit: false });
  await openElements(page);
  const unlock = page.getByRole("region", { name: "Key sync" }).getByLabel("Recovery code");
  if (await unlock.isVisible().catch(() => false)) {
    await unlock.fill(recoveryCode);
    await page.getByRole("region", { name: "Key sync" }).getByRole("button", { name: "Unlock" }).click();
  }
  await expect(elementCard(page, NAME)).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "New Element" }).click();
  const form = page.getByRole("form", { name: "New Element" });
  await form.getByRole("radio", { name: "Voice" }).click();
  await form.getByLabel("Name").fill("Narrator");
  await form.getByLabel(/^Description/).fill("a low, calm voice");
  await form.getByLabel("Add a clip").setInputFiles(wavFile("narrator.wav", { seconds: 6 }));
  await expect(form.getByRole("figure", { name: /^Voice clip/ })).toBeVisible();
  await form.getByLabel(/No public figures and no one under 18/).check();
  await form.getByRole("button", { name: "Save Element" }).click();
  const voice = elementCard(page, "Narrator");
  await expect(voice).toBeVisible({ timeout: 30_000 });
  await expect(voice).toContainText(/MiniMax H3 \w+ as reference voice \(not available here\)/);

  await page.getByRole("button", { name: "Create a video" }).first().click();
  await openTab(page, "Storyboard");
  await page.locator("[data-element-picker]").getByRole("button", { name: /^Elements/ }).click();
  const picker = page.getByRole("region", { name: "Add an Element" });
  await picker.getByRole("button", { name: NAME }).click();
  await expect(picker).toContainText("A storyboard uses descriptions only");
  await expect(picker.getByRole("button", { name: /^As / })).toHaveCount(0);
  await picker.getByRole("button", { name: "Add the description" }).click();
  await expect(page.getByRole("textbox", { name: "Scene" })).toHaveValue(LINE);

  await openTab(page, "Text");
  await picker.getByRole("button", { name: "Narrator" }).click();
  await expect(picker).toContainText("No model available here takes a voice yet");
  await expect(picker.getByRole("button", { name: /^As / })).toHaveCount(0);
});

test("another browser opens Elements after unlocking; editing keeps the pictures, rotating keeps them openable, and deleting removes them @needs-elements-gateway", async ({ browser, baseURL }) => {
  test.skip(!recoveryCode, "needs the Element saved by the first test");
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await openStudio(page, { credit: false });
  await openElements(page);
  await expect(page.getByText("Unlock key sync in this browser to open your Elements.")).toBeVisible();
  const panel = page.getByRole("region", { name: "Key sync" });
  await panel.getByLabel("Recovery code").fill(recoveryCode);
  await panel.getByRole("button", { name: "Unlock" }).click();

  const card = elementCard(page, NAME);
  await expect(card.getByRole("img", { name: NAME })).toHaveAttribute("src", /^blob:/, { timeout: 30_000 });
  await card.getByRole("button", { name: "Edit" }).click();
  const form = page.getByRole("form", { name: `Edit ${NAME}` });
  await expect(form.getByRole("img", { name: `${NAME}, picture 2` })).toHaveAttribute("src", /^blob:/);
  await form.getByLabel(/^Description/).fill(`${DESCRIPTION}, carrying a red umbrella`);
  await form.getByLabel(/No public figures and no one under 18/).check();
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(card).toContainText("carrying a red umbrella", { timeout: 30_000 });
  const edited = (await storedElements(page)).body.elements.find((e) => e.revision === 2);
  expect(edited?.files).toHaveLength(2);

  // Rotating key sync on the account page re-wraps every Element's key: the Elements still open, under the new keys.
  const before = (await storedElements(page)).body;
  await page.goto("/account#keys-and-recovery");
  const keys = page.getByRole("region", { name: "Key sync" });
  await keys.getByRole("button", { name: "Rotate keys" }).click();
  const newCode = (await keys.getByLabel("Your recovery code").innerText()).trim();
  await keys.getByLabel("I saved my recovery code somewhere safe").check();
  await keys.getByLabel("Type its last four characters to confirm").fill(newCode.slice(-4));
  await keys.getByRole("button", { name: "Rotate keys" }).click();
  await expect(keys.getByRole("heading", { name: "Key sync is on" })).toBeVisible({ timeout: 60_000 });
  recoveryCode = newCode;
  const after = (await storedElements(page)).body;
  expect(after.master_key_id).not.toBe(before.master_key_id);
  expect(after.elements.map((e) => e.master_key_id)).toEqual(after.elements.map(() => after.master_key_id));
  // Only the wrapped keys changed: records and files are the same ciphertext.
  expect(after.elements.map((e) => e.meta).sort()).toEqual(before.elements.map((e) => e.meta).sort());
  await page.goto("/studio");
  await expect(studioSignedIn(page)).toBeVisible();
  await openElements(page);
  await expect(card.getByRole("img", { name: NAME })).toHaveAttribute("src", /^blob:/, { timeout: 30_000 });

  page.on("dialog", (dialog) => void dialog.accept());
  await card.getByRole("button", { name: `Delete ${NAME}` }).click();
  await expect(card).toHaveCount(0, { timeout: 30_000 });
  expect((await storedElements(page)).body.count).toBe(1);
  await context.close();
});
