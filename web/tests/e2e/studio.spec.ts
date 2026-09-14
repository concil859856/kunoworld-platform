import { expect, test } from "@playwright/test";

import { cards, connect, expectStepOrder, generate, inspectFilm, inspector, pickStock, pngBytes, prompt, slot, watchToReady } from "./helpers";

test("text to video on LTX-2.5 Fast: steps, decrypted film, valid certificate @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);

  await prompt(page).fill("A lighthouse keeper lights the lamp at dusk");

  // Plain Enter must never spend money.
  await prompt(page).press("Enter");
  await page.waitForTimeout(500);
  await expect(cards(page)).toHaveCount(0);

  await expect(page.getByRole("button", { name: /^Generate/ })).toContainText(/\$\d/);

  await prompt(page).press("Control+Enter");
  const card = cards(page).first();
  expectStepOrder(await watchToReady(card));

  const film = await inspectFilm(page);
  expect(film.ftyp).toBe("ftyp");
  expect(film.size).toBeGreaterThan(20_000);

  await expect(card).toContainText("LTX-2.5 Fast");

  await page.getByRole("tab", { name: "Certificate" }).click();
  await expect(page.getByText("Valid ✓")).toBeVisible();
  await expect(inspector(page)).toContainText("LTX-2.5 Fast");
});

test("first and last frame switches mode and renders @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await page.getByRole("tab", { name: "Frames", exact: true }).click();

  await slot(page, "First frame").setInputFiles({ name: "first.png", mimeType: "image/png", buffer: pngBytes(640, 360, [20, 40, 90]) });
  await slot(page, "Last frame").setInputFiles({ name: "last.png", mimeType: "image/png", buffer: pngBytes(640, 360, [150, 60, 20]) });
  await expect(page.getByText("The shot travels from your first frame to your last.")).toBeVisible();

  await generate(page, "The lamp room brightens as the keeper turns the lens");
  expectStepOrder(await watchToReady(cards(page).first()));

  // The inspector names the mode inferred from the two frames.
  await expect(inspector(page)).toContainText("First & last frame");
  const film = await inspectFilm(page);
  expect(film.ftyp).toBe("ftyp");
});

test("library survives a reload and re-opens the film @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "Rain on a tram window at night, neon smearing in the glass");
  await watchToReady(cards(page).first());

  await page.reload();
  // A reload lands on Create; the takes are kept in the library, not in the page.
  await page.getByRole("button", { name: "My creations" }).click();

  await expect(page.getByRole("button", { name: /Open take: Rain on a tram window/ })).toBeVisible();
  const card = cards(page).first();
  await expect(card).toHaveAttribute("data-step", "ready");

  // Re-downloaded as ciphertext and decrypted again with the key kept in this browser.
  await card.getByRole("button", { name: /Open take/ }).click();
  await expect(page.getByRole("link", { name: "Download" })).toBeVisible({ timeout: 60_000 });
  const film = await inspectFilm(page);
  expect(film.ftyp).toBe("ftyp");
});

test("MiniMax H3 falls back to LTX-2.5 where it isn't licensed @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /MiniMax H3 Turbo/);

  await expect(page.getByText(/isn't licensed in your region yet/)).toBeVisible();

  await generate(page, "A ferry crosses a harbour at first light");
  const card = cards(page).first();
  await watchToReady(card);

  await expect(card).toContainText("LTX-2.5");
  await expect(card).toContainText("Fallback");
  await expect(inspector(page)).toContainText(/rendered on LTX-2\.5/);
});
