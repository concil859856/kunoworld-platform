import { randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { cryptoWaitReady, encodeAddress, sr25519PairFromSeed, sr25519Sign } from "@polkadot/util-crypto";

import { GATEWAY, horizontalOverflow, signIn } from "./helpers";

/** Adding credit, linking Bittensor coldkeys, payment history and the webhook secret on /account. */

interface Coldkey {
  address: string;
  /** Signs bytes exactly as given, the way btcli signs a message. */
  sign(message: string | Buffer): string;
}

/** A fresh sr25519 coldkey, standing in for a Bittensor wallet. */
async function coldkey(): Promise<Coldkey> {
  await cryptoWaitReady();
  const pair = sr25519PairFromSeed(randomBytes(32));
  return {
    address: encodeAddress(pair.publicKey, 42),
    sign: (message) => "0x" + Buffer.from(sr25519Sign(typeof message === "string" ? Buffer.from(message) : message, pair)).toString("hex"),
  };
}

/** The account page must fit a phone and a tablet with whatever is open on it. */
async function expectNoSideScroll(page: Page, state: string): Promise<void> {
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await horizontalOverflow(page), `account page (${state}) scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("top-ups follow the gateway's payment config, history starts empty, and checkout returns explain themselves", async ({
  page,
  request,
}) => {
  await signIn(page, `e2e-topup-${Date.now()}@example.com`);
  await expect(page).toHaveURL(/\/account$/);

  const response = await request.get(`${GATEWAY}/v1/payments/config`);
  expect(response.ok()).toBe(true);
  const config = (await response.json()) as Record<"card" | "usdt" | "tao" | "alpha", { enabled: boolean }>;

  const addCredit = page.getByRole("region", { name: "Add credit" });
  if (!config.card.enabled && !config.usdt.enabled && !config.tao.enabled && !config.alpha.enabled) {
    await expect(addCredit).toContainText("Top-ups aren't available yet");
    await expect(addCredit.getByRole("radio")).toHaveCount(0);
    await expect(addCredit.getByLabel("Treasury address")).toHaveCount(0);
  } else {
    // Each method appears exactly when the gateway says it's switched on.
    await expect(addCredit.getByRole("radio", { name: /^Card/ })).toHaveCount(config.card.enabled ? 1 : 0);
    await expect(addCredit.getByRole("radio", { name: /^USDT/ })).toHaveCount(config.usdt.enabled ? 1 : 0);
    await expect(addCredit.getByLabel("Treasury address")).toHaveCount(config.tao.enabled || config.alpha.enabled ? 1 : 0);
  }

  await expect(page.getByRole("region", { name: "Payment history" })).toContainText("No top-ups yet");

  // Coming back from checkout proves nothing was credited, so the page says so.
  await page.goto("/account?topup=success");
  await expect(page.getByRole("status").filter({ hasText: "Payment received" })).toContainText(
    "Payment received — credit appears once the provider confirms it",
  );
  await page.goto("/account?topup=canceled");
  await expect(page.getByRole("status").filter({ hasText: "Checkout canceled" })).toBeVisible();
  await expect(page.getByText("Payment received")).toHaveCount(0);
});

test("link coldkeys with a browser wallet and with a btcli signature, refuse bad ones, and unlink", async ({
  page,
  browser,
}) => {
  const walletKey = await coldkey();
  const cliKey = await coldkey();

  // A stand-in browser wallet holding walletKey. Like Polkadot.js, it signs <Bytes>message</Bytes>.
  await page.exposeFunction("e2eWalletSign", (hex: string) =>
    walletKey.sign(Buffer.concat([Buffer.from("<Bytes>"), Buffer.from(hex.replace(/^0x/, ""), "hex"), Buffer.from("</Bytes>")])),
  );
  await page.addInitScript((address) => {
    const w = window as unknown as { injectedWeb3: object; e2eWalletSign: (hex: string) => Promise<string> };
    w.injectedWeb3 = {
      "e2e-wallet": {
        version: "1.0.0",
        enable: async () => ({
          accounts: { get: async () => [{ address, name: "e2e coldkey" }] },
          signer: { signRaw: async ({ data }: { data: string }) => ({ id: 1, signature: await w.e2eWalletSign(data) }) },
        }),
      },
    };
  }, walletKey.address);

  await signIn(page, `e2e-wallet-${Date.now()}@example.com`);
  const wallets = page.getByRole("region", { name: "Linked Bittensor wallets" });
  await expect(wallets).toContainText("No coldkeys linked yet");

  // Something that isn't an address at all.
  await wallets.getByLabel("Coldkey address").fill("this-is-not-a-bittensor-coldkey-address-at-all");
  await wallets.getByRole("button", { name: "Link coldkey" }).click();
  await expect(wallets.getByRole("alert")).toContainText("That isn't a Bittensor coldkey");

  // Through the browser wallet: the page loads the extension bridge and asks it to sign.
  await wallets.getByLabel("Coldkey address").fill(walletKey.address);
  await wallets.getByRole("button", { name: "Link coldkey" }).click();
  await expect(wallets.getByLabel("Message to sign")).toContainText(`Coldkey: ${walletKey.address}`);
  await wallets.getByRole("button", { name: "Sign with browser extension" }).click();
  await expect(wallets.getByRole("row", { name: new RegExp(walletKey.address) })).toBeVisible();
  await expect(wallets.getByRole("status")).toContainText(`Linked ${walletKey.address}`);

  // Through btcli: the page shows the exact command, and the signature is pasted back.
  await wallets.getByLabel("Coldkey address").fill(cliKey.address);
  await wallets.getByRole("button", { name: "Link coldkey" }).click();
  const message = (await wallets.getByLabel("Message to sign").textContent()) ?? "";
  expect(message).toContain(`Coldkey: ${cliKey.address}`);
  await expect(wallets.getByLabel("btcli command")).toContainText("btcli wallet sign --message 'KunoWorld: link this Bittensor coldkey");

  // The long message and command must wrap, not push a phone screen sideways.
  await expectNoSideScroll(page, "linking a coldkey");

  // Signed by the wrong key: refused by the gateway, and the request can still be finished.
  await wallets.getByLabel("Signature").fill(walletKey.sign(message));
  await wallets.getByRole("button", { name: "Verify and link" }).click();
  await expect(wallets.getByRole("alert")).toContainText("The signature didn't check out");
  await wallets.getByLabel("Signature").fill(cliKey.sign(message));
  await wallets.getByRole("button", { name: "Verify and link" }).click();
  const cliRow = wallets.getByRole("row", { name: new RegExp(cliKey.address) });
  await expect(cliRow).toBeVisible();

  // A coldkey proven for one account can't be claimed by another.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, `e2e-wallet-other-${Date.now()}@example.com`);
  const otherWallets = otherPage.getByRole("region", { name: "Linked Bittensor wallets" });
  await otherWallets.getByLabel("Coldkey address").fill(cliKey.address);
  await otherWallets.getByRole("button", { name: "Link coldkey" }).click();
  const otherMessage = (await otherWallets.getByLabel("Message to sign").textContent()) ?? "";
  await otherWallets.getByLabel("Signature").fill(cliKey.sign(otherMessage));
  await otherWallets.getByRole("button", { name: "Verify and link" }).click();
  await expect(otherWallets.getByRole("alert")).toContainText("That coldkey belongs to another account");
  await other.close();

  page.once("dialog", (dialog) => void dialog.accept());
  await cliRow.getByRole("button", { name: "Unlink" }).click();
  await expect(cliRow).toHaveCount(0);
  await expect(wallets.getByRole("row", { name: new RegExp(walletKey.address) })).toBeVisible();
});

test("reveal, copy and rotate the webhook signing secret", async ({ page, context, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signIn(page, `e2e-webhook-${Date.now()}@example.com`);

  const webhooks = page.getByRole("region", { name: "Webhooks" });
  await expect(webhooks).toContainText("kunoworld-signature: t=<timestamp>,v1=<signature>");
  const secret = webhooks.getByLabel("Webhook signing secret");
  // Masked, and not in the page at all until asked for.
  await expect(secret).toHaveText(/^whsec_•+$/);
  expect(await page.content()).not.toMatch(/whsec_[\w-]{20,}/);

  await webhooks.getByRole("button", { name: "Reveal secret" }).click();
  await expect(secret).toHaveText(/^whsec_[\w-]{20,}$/);
  const first = (await secret.textContent()) ?? "";

  await webhooks.getByRole("button", { name: "Copy secret" }).click();
  await expect(webhooks.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first);

  await expectNoSideScroll(page, "webhook secret revealed");

  page.once("dialog", (dialog) => void dialog.accept());
  await webhooks.getByRole("button", { name: "Rotate secret" }).click();
  await expect(webhooks.getByRole("status")).toContainText("New secret in use");
  await expect(secret).toHaveText(/^whsec_[\w-]{20,}$/);
  const rotated = (await secret.textContent()) ?? "";
  expect(rotated).not.toBe(first);

  // The page shows the secret the gateway actually signs with: check it through an API key.
  await page.getByLabel("Key name").fill("webhook check");
  await page.getByRole("button", { name: "Create key" }).click();
  const key = (await page.getByRole("status").filter({ hasText: "only time the key is shown" }).locator("code").textContent()) ?? "";
  const fromGateway = await request.get(`${GATEWAY}/v1/account/webhook-secret`, { headers: { authorization: `Bearer ${key}` } });
  expect(fromGateway.ok()).toBe(true);
  expect(((await fromGateway.json()) as { secret: string }).secret).toBe(rotated);

  await page.reload();
  await expect(secret).toHaveText(/^whsec_•+$/);
});
