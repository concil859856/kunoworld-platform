import { expect, test } from "@playwright/test";

import { cards, connect, generate, pickStock, watchToReady } from "./helpers";

test("verify finds a real film's certificate and rejects an unrelated file", async ({ page }, testInfo) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "Slow dolly through a darkroom as a print develops in the tray");
  await watchToReady(cards(page).first());

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download" }).click()]);
  const film = testInfo.outputPath("film.mp4");
  await download.saveAs(film);

  await page.goto("/verify");
  await page.getByLabel(/Drop a video here/).setInputFiles(film);

  await expect(page.getByText("Valid ✓")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Matches the file you checked/)).toBeVisible();
  await expect(page.getByText("LTX-2.5 Fast")).toBeVisible();

  await page.getByLabel(/Drop a video here/).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a film") });
  await expect(page.getByText("No KunoWorld certificate matches this file.")).toBeVisible();
});
