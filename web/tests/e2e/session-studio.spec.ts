import { expect, test, type Page, type Request } from "@playwright/test";

import {
  GATEWAY,
  bearer,
  cards,
  connect,
  devApiKey,
  generate,
  horizontalOverflow,
  inspector,
  pickStock,
  studioSignedIn,
  watchToReady,
} from "./helpers";

/*
 * The studio on the web session only: no API key or gateway token in the page, the same-origin
 * /api/kuno proxy, deleting takes in both modes, the key-backup panel, and the content-policy message.
 *
 * Tests tagged @needs-session-gateway need a gateway whose job API accepts the web session and
 * serves DELETE /v1/videos/{id}. The rest run against an older gateway too.
 */

const WIDTHS = [320, 375, 768];

async function expectFits(page: Page, what: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    expect(await horizontalOverflow(page), `${what} scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

/** Every request the page makes, with any Authorization header it carried. */
function recordRequests(page: Page): Array<{ url: string; authorization?: string }> {
  const seen: Array<{ url: string; authorization?: string }> = [];
  page.on("request", (r: Request) => {
    if (/^(data|blob):/.test(r.url())) return;
    seen.push({ url: r.url(), authorization: r.headers()["authorization"] });
  });
  return seen;
}

function expectNoCredentialsSent(requests: Array<{ url: string; authorization?: string }>): void {
  expect(requests.filter((r) => r.authorization), "no request from the page carries an Authorization header").toEqual([]);
  const gateway = new URL(GATEWAY).origin;
  expect(requests.filter((r) => new URL(r.url).origin === gateway).map((r) => r.url), "the page never calls the gateway directly").toEqual([]);
}

/** Everything page scripts can read that could hold a credential. */
async function scriptVisibleState(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => ({
    cookie: document.cookie,
    localStorage: JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
    sessionStorage: JSON.stringify(Object.fromEntries(Object.entries(sessionStorage))),
    html: document.documentElement.outerHTML,
  }));
}

function privacy(page: Page, name: "Private" | "Standard") {
  return page.getByRole("radio", { name, exact: true });
}

test("the studio signs in from the session and keeps no key or token in the page", async ({ page }) => {
  // An older studio saved API keys here; the current one removes any it finds.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-seeded")) {
      localStorage.setItem("kuno.apiKey.v1", "kw_live_left_over_from_an_old_studio");
      sessionStorage.setItem("e2e-seeded", "1");
    }
  });
  const requests = recordRequests(page);
  const session = await connect(page, { credit: false });

  await expect.poll(() => page.evaluate(() => localStorage.getItem("kuno.apiKey.v1"))).toBeNull();
  await page.getByRole("button", { name: "My creations" }).click();
  await expect(page.getByRole("region", { name: "Your private video keys" })).toBeVisible();

  const state = await scriptVisibleState(page);
  for (const [where, value] of Object.entries(state)) {
    expect(value, `${where} holds the session`).not.toContain(session.token);
    expect(value, `${where} holds a gateway credential`).not.toMatch(/kwt_|kw_live_|bearer\s/i);
  }
  expect(state.cookie).toContain("kw_signed_in=1");
  expect(state.cookie, "the session cookie is HttpOnly").not.toContain("kw_session");

  expect(requests.some((r) => r.url.includes("/api/kuno/v1/models")), "models come through the proxy").toBe(true);
  expectNoCredentialsSent(requests);
});

test("signed out, the studio asks you to sign in, and the proxy refuses without a session", async ({ page, baseURL, request }) => {
  await page.goto("/studio");
  await expect(page.getByRole("link", { name: "Sign in to create" })).toHaveAttribute("href", "/signin?next=/studio");

  await page.getByRole("textbox", { name: /prompt/i }).fill("A take made without signing in");
  await page.getByRole("textbox", { name: /prompt/i }).press("Control+Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Sign in with your email to make videos" })).toBeVisible();

  const answers = await page.evaluate(async (key) => {
    const call = async (path: string, init?: RequestInit) => {
      const response = await fetch(path, init);
      const body = (await response.json().catch(() => null)) as { detail?: { code?: string } } | null;
      return { status: response.status, code: body?.detail?.code ?? null };
    };
    return {
      noSession: await call("/api/kuno/v1/videos"),
      // A key the page supplies itself is never forwarded: still signed out.
      pageKey: await call("/api/kuno/v1/videos", { headers: { authorization: `Bearer ${key}` } }),
      accountApi: await call("/api/kuno/v1/me/keys"),
      adminApi: await call("/api/kuno/admin/v1/reports"),
      publicModels: await call("/api/kuno/v1/models"),
    };
  }, devApiKey());
  expect(answers.noSession).toEqual({ status: 401, code: "signed_out" });
  expect(answers.pageKey).toEqual({ status: 401, code: "signed_out" });
  expect(answers.accountApi.status).toBe(404);
  expect(answers.adminApi.status).toBe(404);
  expect(answers.publicModels.status).toBe(200);

  // Another site can't use a visitor's session through the proxy.
  const crossSite = await request.get(`${baseURL}/api/kuno/v1/models`, { headers: { "sec-fetch-site": "cross-site" } });
  expect(crossSite.status()).toBe(403);
});

test("the library puts key backup first, says plainly what a lost key means, and fits a phone", async ({ page }) => {
  await connect(page, { credit: false });
  await page.getByRole("button", { name: "My creations" }).click();
  const panel = page.getByRole("region", { name: "Your private video keys" });
  await expect(panel).toContainText(
    "Private videos can only be opened with keys stored on your devices — back them up, or a lost key means a lost video.",
  );
  await expect(panel.getByRole("button", { name: "Back up film keys" })).toBeVisible();
  await expect(panel.getByLabel("Restore keys")).toBeAttached();
  await expect(page.getByText(/stored on KunoWorld's storage \(Cloudflare R2\) until you delete them/).first()).toBeVisible();
  // No retention periods or expiry dates: "Nothing expires on its own" is the only mention allowed.
  await expect(page.getByText(/days by default|kept for \d+ days|Kept until \w|expires on (?!its own)\w|has expired/)).toHaveCount(0);
  await expectFits(page, "studio library");

  await page.goto("/account");
  await expect(page.getByRole("region", { name: "How your videos are kept" })).toContainText("until you delete them");
  await expect(page.getByRole("heading", { name: "API keys for developers" })).toBeVisible();
  await expectFits(page, "account page");
});

test("a standard take the content policy refuses says NSFW is banned in both modes", async ({ page }) => {
  await connect(page, { credit: false });
  await pickStock(page, /LTX-2\.5 Fast/);
  await privacy(page, "Standard").check();

  // Routing and the refusal stand in for the gateway, in its own shapes, so this runs on any gateway.
  await page.route("**/api/kuno/v1/route?**", (route) =>
    route.fulfill({ json: { profile_id: "ltx-2.5-fast", requested_profile_id: "ltx-2.5-fast", fallback_reason: null, enclaves: [] } }),
  );
  await page.route("**/api/kuno/v1/standard/videos", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 422, json: { detail: { code: "content_policy", message: "This request breaks the content policy." } } })
      : route.fallback(),
  );
  await generate(page, "A request the content policy refuses");
  const card = page.locator('article[data-step][data-privacy="standard"]').first();
  await expect(card).toHaveAttribute("data-step", "failed");
  await expect(card.getByRole("alert")).toContainText("Blocked by the content policy");
  await expect(card.getByRole("alert")).toContainText("NSFW content is banned in both modes");
  await expect(card.getByRole("alert")).toContainText("Nothing was charged");
});

test("a private take renders with no token in the page, then deletes from storage and from this browser @needs-session-gateway", async ({
  page,
  request,
}) => {
  const requests = recordRequests(page);
  const session = await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await generate(page, "A private take to delete: a kite over dunes");
  const card = cards(page).first();
  await watchToReady(card);
  await expect(card).toHaveAttribute("data-privacy", "private");
  const jobId = (await card.getAttribute("data-take"))!;

  const status = await request.get(`${GATEWAY}/v1/videos/${jobId}`, { headers: bearer(session.token) });
  const blobId = ((await status.json()) as { output_blob_id: string }).output_blob_id;
  expect((await request.get(`${GATEWAY}/v1/blobs/${blobId}`, { headers: bearer(session.token) })).status()).toBe(200);

  page.once("dialog", (dialog) => void dialog.accept());
  await inspector(page).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(`article[data-take="${jobId}"]`)).toHaveCount(0);

  // Gone from storage, and its key gone from this browser.
  expect([404, 410]).toContain((await request.get(`${GATEWAY}/v1/blobs/${blobId}`, { headers: bearer(session.token) })).status());
  expect((await scriptVisibleState(page)).localStorage).not.toContain(jobId);
  await page.reload();
  await expect(studioSignedIn(page)).toBeVisible();
  await page.getByRole("button", { name: "My creations" }).click();
  await expect(page.locator(`article[data-take="${jobId}"]`)).toHaveCount(0);

  expectNoCredentialsSent(requests);
});

test("a standard take renders, then deletes from storage @needs-session-gateway", async ({ page, request }) => {
  const session = await connect(page);
  await pickStock(page, /LTX-2\.5 Fast/);
  await privacy(page, "Standard").check();
  await generate(page, "A standard take to delete: a paper lantern on a pond");
  const card = page.locator('article[data-step][data-privacy="standard"]').first();
  await watchToReady(card);
  const jobId = (await card.getAttribute("data-take"))!;
  await expect(inspector(page)).toContainText("Until you delete it");
  expect((await request.get(`${GATEWAY}/v1/standard/videos/${jobId}/video`, { headers: bearer(session.token) })).status()).toBe(200);

  page.once("dialog", (dialog) => void dialog.accept());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(`article[data-take="${jobId}"]`)).toHaveCount(0);
  expect([404, 410]).toContain(
    (await request.get(`${GATEWAY}/v1/standard/videos/${jobId}/video`, { headers: bearer(session.token) })).status(),
  );

  await page.reload();
  await page.getByRole("button", { name: "My creations" }).click();
  await expect(page.locator(`article[data-take="${jobId}"]`)).toHaveCount(0);
});
