import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { cards, connect, expectSetting, generate, inspectFilm, inspector, pickStock, prompt, setSetting, watchToReady } from "./helpers";

/** The things you do to a take after (or while) it renders. */

test("canceling a running take marks it canceled and refunds it", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  // The longest, largest shot this stock makes, so there is room to cancel it.
  await setSetting(page, "Resolution", "1080p");
  await setSetting(page, "Duration", "20");

  await generate(page, "A slow crane shot over a frozen lake at first light");
  const card = cards(page).first();

  // The Cancel button appears as soon as the gateway has accepted the job.
  await inspector(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Canceled. The price is refunded automatically.")).toBeVisible();

  await expect(card).toHaveAttribute("data-step", "canceled", { timeout: 60_000 });
  await expect(inspector(page)).toContainText("Canceled");
  await expect(inspector(page)).toContainText("You canceled this take.");
  await expect(inspector(page)).toContainText(/Refunded \$\d/);
  // A canceled take has no film and no certificate.
  await expect(page.getByRole("link", { name: "Download" })).toHaveCount(0);
});

test("removing a take asks first, then forgets its key for good", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "Rain on a tram window at night");
  await watchToReady(cards(page).first());

  let accept = false;
  page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));

  const remove = inspector(page).getByRole("button", { name: "Remove", exact: true });
  await remove.click();
  await expect(cards(page)).toHaveCount(1);

  accept = true;
  await remove.click();
  await expect(cards(page)).toHaveCount(0);
  await expect(inspector(page)).toContainText("Nothing selected");

  // It stays gone: the library in this browser is the only copy of the key.
  await page.reload();
  await expect(cards(page)).toHaveCount(0);
});

test("use last frame starts the next shot where the film ended", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "A lighthouse keeper climbs the stair to the lamp");
  await watchToReady(cards(page).first());

  await inspector(page).getByRole("button", { name: "Use last frame" }).click();
  await expect(page.getByText("The last frame is now the first frame of a new shot.")).toBeVisible();

  // The composer moved to Frames with the grabbed frame already loaded.
  // The tab carries a count badge once it holds a frame, so its name is "Frames 1".
  await expect(page.getByRole("tab", { name: /^Frames/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("figure", { name: /^First frame: last-frame-/ })).toBeVisible();

  await generate(page, "The lamp turns, throwing its beam out over the water");
  // Newest take first on the shelf.
  await watchToReady(cards(page).first());
  await expect(inspector(page)).toContainText("First frame");
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});

test("reuse settings puts a take's whole setup back in the composer", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await setSetting(page, "Resolution", "1080p");
  await setSetting(page, "Aspect ratio", "9:16");
  await setSetting(page, "Duration", "8");
  await setSetting(page, "Frame rate", "48");

  const text = "Vertical: a neon sign flickers awake over a wet street";
  await generate(page, text);
  await watchToReady(cards(page).first());

  // Generating moves to the library, so go back for the composer.
  await page.getByRole("button", { name: "Create a video" }).click();

  // Change the composer, then ask for the take's settings back.
  await setSetting(page, "Aspect ratio", "16:9");
  await prompt(page).fill("something else entirely");

  // The inspector lives with the takes, so go back to them to use the action rail.
  await page.getByRole("button", { name: "My creations" }).click();
  await inspector(page).getByRole("button", { name: "Reuse settings" }).click();
  await expect(page.getByText("Settings are back in the composer.")).toBeVisible();

  await expect(prompt(page)).toHaveValue(text);
  await expectSetting(page, "Resolution", "1080p");
  await expectSetting(page, "Aspect ratio", "9:16");
  await expectSetting(page, "Duration", "8");
  await expectSetting(page, "Frame rate", "48");
});

test("film keys survive a backup, a forget-all and a restore", async ({ page }) => {
  await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "A print develops in the tray under a red safelight");
  await watchToReady(cards(page).first());

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Back up film keys" }).click(),
  ]);
  const file = await download.path();
  const backup = JSON.parse(readFileSync(file, "utf8")) as { kind: string; films: Array<{ handle: { outputKey: string } }> };
  expect(backup.kind).toBe("kunoworld-film-keys");
  expect(backup.films).toHaveLength(1);
  expect(backup.films[0].handle.outputKey).toBeTruthy();

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Forget all" }).click();
  await expect(cards(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Restore keys", exact: true }).setInputFiles(file);
  await expect(page.getByText(/Restored 1 film key/)).toBeVisible();
  await expect(cards(page)).toHaveCount(1);

  // The restored key still opens the film: it is re-downloaded and decrypted here.
  await cards(page).first().getByRole("button", { name: /Open take/ }).click();
  await expect(page.getByRole("link", { name: "Download" })).toBeVisible({ timeout: 60_000 });
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");

  // A file that isn't a backup is refused with a reason, not a crash.
  await page.getByRole("button", { name: "Restore keys", exact: true }).setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.getByText(/Couldn't read that backup/)).toBeVisible();
});
