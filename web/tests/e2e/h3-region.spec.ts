import { expect, test } from "@playwright/test";

import { cards, connect, expectStepOrder, generate, inspectFilm, inspector, pickStock, watchToReady } from "./helpers";

/**
 * Runs against the dev server started with NEXT_PUBLIC_KUNO_DEV_COUNTRY=JP,
 * where the MiniMax H3 Community License allows serving.
 */
test("MiniMax H3 serves directly in a licensed region and is named on the result @needs-session-gateway", async ({ page }) => {
  await connect(page);
  await pickStock(page, /MiniMax H3 Turbo/);

  await expect(page.getByText(/isn't licensed in your region/)).toHaveCount(0);

  await generate(page, "A lighthouse keeper lights the lamp at dusk");
  const card = cards(page).first();
  expectStepOrder(await watchToReady(card));

  // The licence requires "MiniMax H3" to be shown wherever H3 made the film.
  await expect(card).toContainText("MiniMax H3 Turbo");
  await expect(card).not.toContainText("Fallback");
  await expect(page.getByText("Made with MiniMax H3")).toBeVisible();

  const film = await inspectFilm(page);
  expect(film.ftyp).toBe("ftyp");

  await page.getByRole("tab", { name: "Certificate" }).click();
  await expect(inspector(page)).toContainText("MiniMax H3 Turbo");
  await expect(inspector(page)).toContainText("MiniMax H3");
  await expect(page.getByText("Valid ✓")).toBeVisible();
});
