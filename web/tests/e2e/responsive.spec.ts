import { expect, test, type Page } from "@playwright/test";

import { connect, prompt } from "./helpers";

const PHONE = { width: 400, height: 780 };

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("narrow screens", () => {
  test.use({ viewport: PHONE });

  test("landing fits 400px without sideways scroll", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("landing-400.png"), fullPage: true });
  });

  test("studio stacks at 400px and the composer works", async ({ page }, testInfo) => {
    await connect(page);
    await expect(prompt(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Generate|Connect to generate/ })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

    // The library is a drawer at this width.
    const library = page.getByRole("complementary", { name: "Library" });
    await page.getByRole("button", { name: /^Library ·/ }).click();
    await expect(library.getByRole("searchbox", { name: "Search the library" })).toBeVisible();
    await library.getByRole("button", { name: "Close" }).click();
    await page.screenshot({ path: testInfo.outputPath("studio-400.png"), fullPage: false });
  });

  test("other pages fit 400px", async ({ page }) => {
    for (const path of ["/verify", "/network", "/developers"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page), `overflow on ${path}`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the hero settles and animation is off", async ({ page }, testInfo) => {
    await page.goto("/");
    // With footage the hero holds a poster frame; without it the procedural frame
    // jumps straight to its developed state. Either way the hero must settle, and
    // nothing may still be animating.
    const hero = page.locator('[data-hero="true"]');
    await expect(hero).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const settled = page.locator('[data-phase="lit"], [data-hero="true"] video');
    await expect(settled.first()).toBeAttached({ timeout: 10_000 });

    const grainAnimation = await page.evaluate(() => getComputedStyle(document.querySelector(".grain") as Element).animationName);
    expect(grainAnimation).toBe("none");

    // No hero video may be playing under reduced motion.
    const playing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-hero="true"] video')).filter((v) => !(v as HTMLVideoElement).paused).length,
    );
    expect(playing).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("landing-reduced-motion.png") });
  });
});
