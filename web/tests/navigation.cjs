// Run against `npm run start -- --port 8787` after a production build.
// Point PLAYWRIGHT_MODULE to an existing Playwright installation if needed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.SITE_TEST_ORIGIN || 'http://127.0.0.1:8787';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function clickTo(link, path, target = 'h1') {
      await link.click();
      await page.waitForURL(origin + path);
      await page.locator(target).first().waitFor();
      assert.equal(await page.locator('body').innerText().then(t => t.includes('Beyond this horizon.')), false);
    }
    // Click links after hydration: direct URL checks missed the original bug.
    for (const [label, path] of [['Studio', '/studio'], ['Showcase', '/showcase'], ['Use cases', '/use-cases'], ['Models', '/models'], ['Developers', '/developers'], ['Journal', '/blog']]) {
      await page.goto(origin);
      await page.getByRole('button', { name: 'Play background video' }).first().waitFor();
      await clickTo(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: label, exact: true }), path, path === '/studio' ? '#video-prompt' : 'h1');
    }
    await page.goto(origin);
    await clickTo(page.locator('.nav-docs'), '/docs');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'API reference', exact: true }), '/api');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'Our vision', exact: true }), '/about');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'Privacy & provenance', exact: true }), '/privacy');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'Project status', exact: true }), '/docs#project-status');
    await page.goto(origin);
    await clickTo(page.getByRole('link', { name: 'Create your first world', exact: false }), '/studio', '#video-prompt');
    await clickTo(page.getByRole('link', { name: 'Back to website', exact: false }), '/');
    const sceneLink = page.locator('a[href="/studio?scene=paper-metropolis"]').first();
    await clickTo(sceneLink, '/studio?scene=paper-metropolis', '#video-prompt');
    await page.waitForFunction(() => document.querySelector('#video-prompt').value.includes('miniature city'));
    await page.goBack();
    await page.waitForURL(origin + '/');
    await page.goto(origin + '/showcase');
    await clickTo(page.getByRole('link', { name: 'Create from A moment, in vermilion', exact: true }), '/studio?scene=sculptural-fashion&aspect=9:16', '#video-prompt');
    await page.waitForFunction(() => document.querySelector('#video-prompt').value.includes('vermilion'));
    await page.goto(origin + '/use-cases');
    await clickTo(page.getByRole('link', { name: 'Explore a product film', exact: false }), '/studio?scene=chrome-runner&model=ltx-2.5-pro', '#video-prompt');
    await page.waitForFunction(() => document.querySelector('#video-prompt').value.includes('running shoe'));
    await page.getByRole('button', { name: 'Create this paper city', exact: false }).click();
    await page.waitForFunction(() => document.querySelector('#video-prompt').value.includes('miniature city'));
    await page.goto(origin + '/blog');
    await clickTo(page.locator('a[href="/blog/directing-the-impossible"]').first(), '/blog/directing-the-impossible');
    await clickTo(page.getByRole('link', { name: 'Back to the journal', exact: false }), '/blog');
    await page.setViewportSize({ width: 390, height: 900 });
    for (const [label, path] of [['Studio', '/studio'], ['Showcase', '/showcase'], ['Use cases', '/use-cases'], ['Documentation', '/docs']]) {
      await page.goto(origin);
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await clickTo(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: label, exact: false }), path, path === '/studio' ? '#video-prompt' : 'h1');
      assert.equal(await page.getByRole('dialog').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('Production navigation passed: desktop, mobile, CTA, footer, hash, scene, journal, and browser back; no page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
