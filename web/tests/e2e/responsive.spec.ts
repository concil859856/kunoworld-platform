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
    await connect(page, { credit: false });
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
    for (const path of ["/verify", "/models", "/developers", "/signin"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page), `overflow on ${path}`).toBeLessThanOrEqual(1);
    }
  });
});

/*
 * Mobile is a guarantee, not a spot check: every public page, at every width we claim to
 * support, must lay out without a sideways scrollbar and without anything spilling past
 * the viewport. 320px is the narrowest phone still in use; 1024 catches the tablet
 * breakpoints where multi-column grids collapse.
 */
const WIDTHS = [320, 375, 414, 768, 1024];
const PAGES = ["/", "/studio", "/verify", "/models", "/developers", "/signin"];

test.describe("every width", () => {
  for (const width of WIDTHS) {
    test(`nothing overflows at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 820 });
      for (const path of PAGES) {
        await page.goto(path);
        // Presence, not visibility: the studio hides its "Studio" title at narrow widths
        // where the rail collapses, and that is intentional. We only need the page to have
        // rendered before measuring it.
        await expect(page.locator("h1").first()).toBeAttached();
        await page.waitForTimeout(400);

        expect(await horizontalOverflow(page), `sideways scroll on ${path} at ${width}px`).toBeLessThanOrEqual(1);

        // A page without a sideways scrollbar can still have an element poking out from
        // under a clip. Deliberate horizontal scrollers (the custody filmstrip, wide
        // tables, code blocks) are the exception: their content is meant to be wider than
        // the screen, so we check that the scroller itself fits and skip what's inside it.
        const spills = await page.evaluate((w) => {
          // Two ancestors make a wide child legitimate: a horizontal scroller, whose content
          // is meant to exceed the screen, and a clipping box, where the overflow cannot be
          // seen or scrolled to at all — the hero video is deliberately scaled past the frame
          // and clipped by overflow:hidden.
          const clippedOrScrollable = (el: Element | null): boolean => {
            for (let node = el; node && node !== document.body; node = node.parentElement) {
              const overflowX = getComputedStyle(node).overflowX;
              if (overflowX === "hidden" || overflowX === "clip") return true;
              if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth) return true;
            }
            return false;
          };
          const bad: string[] = [];
          for (const el of Array.from(document.body.querySelectorAll("*"))) {
            const style = getComputedStyle(el);
            if (style.position === "fixed" || style.visibility === "hidden" || style.display === "none") continue;
            const box = el.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) continue;
            if (clippedOrScrollable(el.parentElement)) continue;
            // Parked off-canvas drawers (the studio's library and inspector at narrow
            // widths) sit wholly outside the viewport until opened, which is correct.
            // A genuine cut-off straddles an edge: partly on screen, partly lost.
            if (box.left >= w || box.right <= 0) continue;
            if (box.right > w + 1.5 || box.left < -1.5) {
              bad.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} [${Math.round(box.left)}…${Math.round(box.right)}]`);
            }
          }
          return bad.slice(0, 5);
        }, width);
        expect(spills, `elements spilling past ${width}px on ${path}`).toEqual([]);
      }
    });
  }
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

    // Nothing anywhere may still be animating, which is stronger than checking one layer.
    const animating = await page.evaluate(() =>
      Array.from(document.querySelectorAll("*"))
        .filter((el) => getComputedStyle(el).animationName !== "none")
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`)
        .slice(0, 5),
    );
    expect(animating).toEqual([]);

    // No hero video may be playing under reduced motion.
    const playing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-hero="true"] video')).filter((v) => !(v as HTMLVideoElement).paused).length,
    );
    expect(playing).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("landing-reduced-motion.png") });
  });
});
