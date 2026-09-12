import { expect, test } from "@playwright/test";

import { clipFile, wavFile } from "./fixtures";
import {
  blockers,
  cards,
  connect,
  expectStepOrder,
  generate,
  generateButton,
  inspectFilm,
  inspector,
  openTab,
  pickEditOp,
  pngBytes,
  prompt,
  slot,
  stockButton,
  watchToReady,
} from "./helpers";

/**
 * MiniMax H3 Director (the Ref2VA checkpoint) serves references, edit, extend and
 * audio-to-video. It is region-gated, so this file runs against the Japan server.
 */

const png = (name: string, rgb: [number, number, number]) => ({ name, mimeType: "image/png", buffer: pngBytes(480, 480, rgb) });
const pngs = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => png(`cast-${from + i + 1}.png`, [30 + i * 20, 70, 120 - i * 10]));

test("References: the 9/3/3/12 caps, the audio rule, and a directed shot", async ({ page }) => {
  await connect(page);
  await openTab(page, "References");
  await expect(stockButton(page)).toContainText("Director");

  // Audio on its own has nothing to attach to.
  await slot(page, "Add audio").setInputFiles(wavFile("voice.wav", { seconds: 4 }));
  await expect(page.getByText("MiniMax H3 Director needs an image or video alongside audio.")).toBeVisible();
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Fix the highlighted inputs above.")).toBeVisible();

  // One picture satisfies it.
  await slot(page, "Add images").setInputFiles(pngs(1));
  await expect(page.getByText("MiniMax H3 Director needs an image or video alongside audio.")).toHaveCount(0);

  // Nine images is the cap for the role: the add slot goes away at nine.
  await slot(page, "Add images").setInputFiles(pngs(8, 1));
  await expect(page.getByRole("region", { name: "Images references" })).toContainText("9/9");
  await expect(slot(page, "Add images")).toHaveCount(0);

  // Three clips is the role cap, but only two still fit under the 12-file total.
  await slot(page, "Add videos").setInputFiles([
    clipFile("bar.webm", { seconds: 3 }),
    clipFile("street.webm", { seconds: 3, hue: 90 }),
    clipFile("spare.webm", { seconds: 3, hue: 180 }),
  ]);
  await expect(page.getByText("Only 2 more clips fit.")).toBeVisible();
  await expect(page.getByText("12/12 files")).toBeVisible();
  await expect(slot(page, "Add videos")).toHaveCount(0);
  await expect(slot(page, "Add audio")).toHaveCount(0);

  // Direct the scene by naming the references in the prompt.
  await prompt(page).fill("A quiet bar at closing time, with");
  await page.getByRole("button", { name: "Insert <Picture 1> into the prompt" }).click();
  await expect(prompt(page)).toHaveValue("A quiet bar at closing time, with <Picture 1> ");

  await expect(generateButton(page)).not.toHaveAttribute("aria-disabled", "true");
  await prompt(page).press("Control+Enter");
  expectStepOrder(await watchToReady(cards(page).first()));

  await expect(inspector(page)).toContainText("References");
  await expect(page.getByText("Made with MiniMax H3")).toBeVisible();
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});

test("Edit and Extend both run a source clip through MiniMax H3 Director", async ({ page }) => {
  await connect(page);
  await openTab(page, "Edit");
  await expect(page.getByRole("radio", { name: "Edit", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(stockButton(page)).toContainText("Director");

  await slot(page, "Source video").setInputFiles(clipFile("plate.webm", { seconds: 5 }));
  await generate(page, "Repaint the sky over the plate: heavy cloud, last light");
  expectStepOrder(await watchToReady(cards(page).first()));
  await expect(inspector(page)).toContainText("Edit");
  await expect(inspector(page)).toContainText("Source video");

  // The same clip, continued past its last frame.
  await pickEditOp(page, "Extend");
  await expect(stockButton(page)).toContainText("Director");
  await generate(page, "Carry on past the cut: the camera keeps drifting right");
  // Newest take first on the shelf.
  const second = cards(page).first();
  expectStepOrder(await watchToReady(second));
  await expect(inspector(page)).toContainText("Extend");
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});

test("Audio to video on Director needs a visual alongside the soundtrack", async ({ page }) => {
  await connect(page);
  await openTab(page, "Edit");
  await pickEditOp(page, "Audio → video");
  await expect(stockButton(page)).toContainText("Director");

  await slot(page, "Soundtrack").setInputFiles(wavFile("dialogue.wav", { seconds: 5 }));
  await expect(page.getByText("MiniMax H3 Director needs an image or video alongside audio.")).toBeVisible();
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");

  await slot(page, "First frame").setInputFiles(pngs(1));
  await expect(page.getByText("MiniMax H3 Director needs an image or video alongside audio.")).toHaveCount(0);
  await expect(blockers(page)).toHaveCount(0);

  await prompt(page).fill("She speaks the line to camera, lit from one side");
  await expect(generateButton(page)).not.toHaveAttribute("aria-disabled", "true");
  await expect(generateButton(page)).toContainText(/\$\d/);

  await prompt(page).press("Control+Enter");
  expectStepOrder(await watchToReady(cards(page).first()));
  await expect(inspector(page)).toContainText("Audio to video");
  await expect(inspector(page)).toContainText("Soundtrack");
  await expect(inspector(page)).toContainText("First frame");
  expect((await inspectFilm(page)).ftyp).toBe("ftyp");
});
