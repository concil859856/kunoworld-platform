// Run against `npm run start -- --port 8787` after a production build.
// Point PLAYWRIGHT_MODULE to an existing Playwright installation if needed.
// The studio only shows its composer when signed in, so this also needs the dev gateway and its
// email outbox (with no email provider, sign-in links are written to KUNO_DATA_DIR/outbox).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const origin = process.env.SITE_TEST_ORIGIN || 'http://127.0.0.1:8787';
const gateway = process.env.NEXT_PUBLIC_KUNO_API || 'http://127.0.0.1:8080';
const dataDir = process.env.KUNO_DATA_DIR || '/tmp/kuno-web-data';
// One sign-in per run: the gateway allows 5 links per email in 15 minutes.
const email = 'navigation-test@example.com';
// The composer's prompt field. Its id comes from useId, so don't target the id.
const PROMPT = '.prompt-box textarea';

/** The newest sign-in link the gateway wrote for this email, or null. Never print it. */
function signInLink() {
  let files;
  try { files = readdirSync(join(dataDir, 'outbox')).sort().reverse(); } catch { return null; }
  for (const file of files) {
    const message = JSON.parse(readFileSync(join(dataDir, 'outbox', file), 'utf8'));
    if (message.to === email) return /https?:\/\/\S+\/auth\/verify\?token=[\w-]+(?:&next=\S+)?/.exec(message.text)?.[0] ?? null;
  }
  return null;
}

/** A web session made through the gateway's email-link API, without the sign-in UI. */
async function sessionToken() {
  const previous = signInLink();
  const asked = await fetch(`${gateway}/v1/auth/magic-link`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
  assert.equal(asked.status, 202, `magic-link request failed: ${asked.status} ${await asked.text()}`);
  let link = null;
  for (const started = Date.now(); Date.now() - started < 15_000; await new Promise(r => setTimeout(r, 100))) {
    link = signInLink();
    if (link !== null && link !== previous) break;
    link = null;
  }
  assert.ok(link, `no new sign-in email for ${email} in ${dataDir}/outbox`);
  const token = new URL(link).searchParams.get('token');
  const verified = await fetch(`${gateway}/v1/auth/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  assert.ok(verified.ok, `sign-in verification failed: ${verified.status}`);
  const { session_token } = await verified.json();
  assert.ok(session_token, 'sign-in verification returned no session');
  return session_token;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    // The way the site stores a session after sign-in: the HttpOnly session cookie plus the hint cookie.
    await context.addCookies([
      { name: 'kw_session', value: await sessionToken(), url: origin, httpOnly: true, sameSite: 'Lax' },
      { name: 'kw_signed_in', value: '1', url: origin, sameSite: 'Lax' },
    ]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function clickTo(link, path, target = 'h1') {
      await link.click();
      await page.waitForURL(origin + path);
      await page.locator(target).first().waitFor();
      assert.equal(await page.locator('body').innerText().then(t => t.includes('Beyond this horizon.')), false);
    }
    const promptIncludes = text => page.waitForFunction(([selector, words]) => document.querySelector(selector)?.value.includes(words), [PROMPT, text]);
    // Click links after hydration: direct URL checks missed the original bug.
    for (const [label, path] of [['Studio', '/studio'], ['Showcase', '/showcase'], ['Use cases', '/use-cases'], ['Models', '/models'], ['Developers', '/developers'], ['Journal', '/blog']]) {
      await page.goto(origin);
      await page.getByRole('button', { name: 'Play background video' }).first().waitFor();
      await clickTo(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: label, exact: true }), path, path === '/studio' ? PROMPT : 'h1');
    }
    await page.goto(origin);
    // The header has two .nav-docs links: Docs, and Sign in or Account.
    await clickTo(page.locator('.nav-docs', { hasText: 'Docs' }), '/docs');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'API reference', exact: true }), '/api');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'Our vision', exact: true }), '/about');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'Privacy & provenance', exact: true }), '/privacy');
    await clickTo(page.locator('.ocean-footer').getByRole('link', { name: 'Project status', exact: true }), '/docs#project-status');
    await page.goto(origin);
    await clickTo(page.locator('.reel-hero').getByRole('link', { name: 'Start creating', exact: false }), '/studio', PROMPT);
    await clickTo(page.getByRole('link', { name: 'Back to website', exact: false }), '/');
    await clickTo(page.getByRole('link', { name: 'Try it: LTX-2.5 Pro', exact: true }), '/studio?model=ltx-2.5-pro', PROMPT);
    await page.goBack();
    await page.waitForURL(origin + '/');
    await page.goto(origin + '/showcase');
    await clickTo(page.getByRole('link', { name: 'Create from The paper dragon', exact: true }), '/studio?scene=origami-dragon', PROMPT);
    await promptIncludes('origami dragon');
    await page.goto(origin + '/use-cases');
    await clickTo(page.getByRole('link', { name: 'Explore a product film', exact: false }), '/studio?scene=chrome-runner&model=ltx-2.5-pro', PROMPT);
    await promptIncludes('running shoe');
    await page.getByRole('button', { name: 'Create this paper city', exact: false }).click();
    await promptIncludes('miniature city');
    await page.goto(origin + '/blog');
    await clickTo(page.locator('a[href="/blog/directing-the-impossible"]').first(), '/blog/directing-the-impossible');
    await clickTo(page.getByRole('link', { name: 'Back to the journal', exact: false }), '/blog');
    await page.setViewportSize({ width: 390, height: 900 });
    for (const [label, path] of [['Studio', '/studio'], ['Showcase', '/showcase'], ['Use cases', '/use-cases'], ['Documentation', '/docs']]) {
      await page.goto(origin);
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await clickTo(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: label, exact: false }), path, path === '/studio' ? PROMPT : 'h1');
      assert.equal(await page.getByRole('dialog').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('Production navigation passed: desktop, mobile, CTA, footer, hash, scene, journal, and browser back; no page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
