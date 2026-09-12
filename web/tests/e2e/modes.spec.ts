import { expect, test } from "@playwright/test";

import { clipFile, wavFile } from "./fixtures";
import {
  cards,
  connect,
  expectStepOrder,
  generate,
  inspectFilm,
  inspector,
  openTab,
  pickEditOp,
  pngBytes,
  slot,
  stockButton,
  watchToReady,
} from "./helpers";

const png = (name: string, rgb: [number, number, number]) => ({ name, mimeType: "image/png", buffer: pngBytes(640, 360, rgb) });

/** The modes LTX-2.5 serves. MiniMax H3's own modes live in h3-director.spec.ts. */

test("keyframes pinned to their own times render on LTX-2.5", async ({ page }) => {
  await connect(page);
  await openTab(page, "Keyframes");
  // Keyframes are an LTX feature, so the composer loads an LTX stock by itself.
  await expect(stockButton(page)).toContainText("LTX-2.5");

  await slot(page, "Add keyframes").setInputFiles([
    png("dawn.png", [20, 30, 90]),
    png("noon.png", [140, 60, 30]),
    png("dusk.png", [30, 110, 70]),
  ]);
  await expect(page.getByText("3/8 keyframes")).toBeVisible();

  // Place them by hand rather than spreading them evenly across the shot.
  await page.getByRole("checkbox", { name: /Space evenly/ }).uncheck();
  await page.getByRole("spinbutton", { name: "Keyframe 1 time in seconds" }).fill("0");
  await page.getByRole("spinbutton", { name: "Keyframe 2 time in seconds" }).fill("1.5");
  await page.getByRole("spinbutton", { name: "Keyframe 3 time in seconds" }).fill("4");

  await generate(page, "A darkroom through one day: dawn, noon, dusk");
  expectStepOrder(await watchToReady(cards(page).first()));

  await expect(inspector(page)).toContainText("Keyframes");
  // The times the keyframes were pinned to travel with the take.
  await expect(inspector(page)).toContainText("Keyframe @ 1.5 s");
  await expect(inspector(page)).toContainText("Keyframe @ 4 s");
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});

test("retake regenerates a window of a clip on LTX-2.5", async ({ page }) => {
  await connect(page);
  await openTab(page, "Edit");
  await pickEditOp(page, "Retake");
  await expect(stockButton(page)).toContainText("LTX-2.5");

  await slot(page, "Source video").setInputFiles(clipFile("take-1.webm", { seconds: 6 }));
  // The clip is probed in the browser, so the window knows how long it is.
  await expect(page.getByText("of 6.0 s")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Retake window start in seconds" }).fill("1");
  await page.getByRole("spinbutton", { name: "Retake window end in seconds" }).fill("3.5");

  await generate(page, "Re-shoot the middle: the actor turns towards the window");
  expectStepOrder(await watchToReady(cards(page).first()));

  await expect(inspector(page)).toContainText("Retake");
  await expect(inspector(page)).toContainText("Source video 1–3.5 s");
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});

test("a soundtrack drives the picture on LTX-2.5 Pro", async ({ page }) => {
  await connect(page);
  await openTab(page, "Edit");
  await pickEditOp(page, "Audio → video");
  // Only LTX-2.5 Pro does audio-to-video outside MiniMax H3.
  await expect(stockButton(page)).toContainText("Pro");

  await slot(page, "Soundtrack").setInputFiles(wavFile("score.wav", { seconds: 5 }));

  await generate(page, "Cut the picture to the beat of the score");
  expectStepOrder(await watchToReady(cards(page).first()));

  await expect(inspector(page)).toContainText("Audio to video");
  await expect(inspector(page)).toContainText("Soundtrack");
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});
