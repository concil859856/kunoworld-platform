import { expect, test } from "@playwright/test";

import { clipFile } from "./fixtures";
import {
  blockers,
  cards,
  connect,
  generateButton,
  openTab,
  pickEditOp,
  pickStock,
  pngBytes,
  prompt,
  settingOptions,
  slot,
} from "./helpers";

/**
 * The client-side rules mirror validate_params / validate_roles in
 * kuno_protocol/profiles.py. These check that a broken request is explained here
 * and the Generate button is off, instead of being refused by the gateway.
 */

const png = (name: string) => ({ name, mimeType: "image/png", buffer: pngBytes(320, 320, [40, 80, 120]) });

test("Generate is off with a reason, and pressing it explains rather than spends", async ({ page }) => {
  await connect(page, { credit: false });
  await pickStock(page, /LTX-2\.5 Fast/);

  const go = generateButton(page);
  await expect(go).toHaveAttribute("aria-disabled", "true");
  // The reason is on the button before it is ever pressed.
  await expect(go).toHaveAttribute("title", "Describe the shot first.");
  await expect(blockers(page)).toHaveCount(0);

  // aria-disabled, not disabled: a real user can still press it, and doing so is
  // what reveals the problems the composer keeps quiet until you try.
  await go.click({ force: true });
  await expect(blockers(page)).toContainText("Describe the shot first.");
  await expect(cards(page)).toHaveCount(0);

  await prompt(page).fill("A ferry crosses a harbour at first light");
  await expect(go).not.toHaveAttribute("aria-disabled", "true");
  await expect(blockers(page)).toHaveCount(0);
});

test("a prompt past the stock's limit is caught before anything is encrypted", async ({ page }) => {
  await connect(page, { credit: false });
  await pickStock(page, /LTX-2\.5 Fast/);

  await prompt(page).fill("x".repeat(4001));
  await expect(page.getByText("4,001/4,000")).toBeVisible();
  await expect(blockers(page)).toContainText("Prompts are limited to 4,000 characters on LTX-2.5 Fast.");
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");

  await prompt(page).fill("x".repeat(4000));
  await expect(generateButton(page)).not.toHaveAttribute("aria-disabled", "true");
});

test("a seed outside the range is refused with the range", async ({ page }) => {
  await connect(page, { credit: false });
  await pickStock(page, /LTX-2\.5 Fast/);
  await prompt(page).fill("A ferry crosses a harbour at first light");

  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByLabel("Seed").fill("9999999999");
  await expect(blockers(page)).toContainText("Seeds are whole numbers from 0 to 2,147,483,647.");
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");

  await page.getByLabel("Seed").fill("12345");
  await expect(generateButton(page)).not.toHaveAttribute("aria-disabled", "true");
});

test("negative prompts and the prompt enhancer follow the profile", async ({ page }) => {
  await connect(page, { credit: false });

  // LTX-2.5 Fast: a seed and the enhancer, no negative prompt.
  await pickStock(page, /LTX-2\.5 Fast/);
  await page.getByRole("button", { name: "Advanced" }).click();
  await expect(page.getByLabel("Seed")).toBeVisible();
  await expect(page.getByLabel("Negative prompt")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Enhance prompt/ })).toBeVisible();

  // LTX-2.5 Pro adds the negative prompt.
  await pickStock(page, /LTX-2\.5 Pro/);
  await expect(page.getByLabel("Negative prompt")).toBeVisible();

  // MiniMax H3 has neither.
  await pickStock(page, /MiniMax H3 Turbo/);
  await expect(page.getByLabel("Negative prompt")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Enhance prompt/ })).toHaveCount(0);
});

test("the chips only offer sizes, lengths and frame rates the stock renders", async ({ page }) => {
  await connect(page, { credit: false });

  await pickStock(page, /LTX-2\.5 Fast/);
  expect(await settingOptions(page, "Frame rate")).toEqual(["24 fps", "25 fps", "48 fps", "50 fps"]);
  expect(await settingOptions(page, "Resolution")).toHaveLength(2);
  // 2–20 s in 1 s steps.
  expect(await settingOptions(page, "Duration")).toHaveLength(19);

  // MiniMax H3 is 768p at 24 fps only, so those stop being choices.
  await pickStock(page, /MiniMax H3 Turbo/);
  await expect(page.getByLabel("Frame rate")).toHaveCount(0);
  await expect(page.getByLabel("Resolution")).toHaveCount(0);
  // 5–14 s.
  expect(await settingOptions(page, "Duration")).toHaveLength(10);
});

test("more keyframes than the stock takes are turned away at the slot", async ({ page }) => {
  await connect(page, { credit: false });
  await openTab(page, "Keyframes");

  await slot(page, "Add keyframes").setInputFiles(Array.from({ length: 10 }, (_, i) => png(`k${i}.png`)));
  await expect(page.getByText("Only 8 more keyframes fit on LTX-2.5 Fast.")).toBeVisible();
  await expect(page.getByText("8/8 keyframes")).toBeVisible();
  await expect(slot(page, "Add keyframes")).toHaveCount(0);
});

test("the retake window has to start before it ends and fit inside the clip", async ({ page }) => {
  await connect(page, { credit: false });
  await openTab(page, "Edit");
  await pickEditOp(page, "Retake");
  await prompt(page).fill("Re-shoot the middle of the take");
  await slot(page, "Source video").setInputFiles(clipFile("take-1.webm", { seconds: 4 }));
  await expect(page.getByText("of 4.0 s")).toBeVisible();

  const start = page.getByRole("spinbutton", { name: "Retake window start in seconds" });
  const end = page.getByRole("spinbutton", { name: "Retake window end in seconds" });

  await start.fill("3");
  await end.fill("1");
  await expect(page.getByText("The retake window must start before it ends.")).toBeVisible();
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");

  await end.fill("9");
  await expect(page.getByText("The retake window ends after the clip does (4.0 s).")).toBeVisible();
  await expect(generateButton(page)).toHaveAttribute("aria-disabled", "true");

  await start.fill("1");
  await end.fill("3");
  await expect(generateButton(page)).not.toHaveAttribute("aria-disabled", "true");
});
