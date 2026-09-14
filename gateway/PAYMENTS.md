# Top-ups

> **Prices are placeholders.** Every job price the gateway charges and shows (`GET /v1/models`, `JobStatus.price_usd`)
> is a placeholder until the owner sets real pricing; `GET /v1/models` returns `pricing_placeholder: true`. The top-up
> limits below are configuration, not pricing.

Customers buy credit ahead of use. Every top-up is a row in `payments`, keyed by provider and the
provider's own reference, and credits the ledger at most once under the key
`topup:{provider}:{reference}`. Each method stays off until it is configured, and
`GET /v1/payments/config` tells the site which are on.

| Method | Provider | Confirmed by | Credited amount |
| --- | --- | --- | --- |
| Card | Stripe Checkout | Signed webhook | Session total, in cents |
| USDT (TRON, Ethereum) | NOWPayments invoice | Signed IPN, then NOWPayments' API | Invoice price |
| TAO | None; direct to the treasury | Finalized block | TAO x median TAO/USD |
| Subnet alpha | None; stake transfer to the treasury | Finalized block | Conservative TAO value x TAO/USD |

Limits: `KUNO_TOPUP_MIN_USD` (default 5) and `KUNO_TOPUP_MAX_USD` (default 5000) apply to card and USDT.

## Card: Stripe

```
KUNO_STRIPE_SECRET_KEY=sk_live_...        # a restricted key with Checkout Sessions: write is enough
KUNO_STRIPE_WEBHOOK_SECRET=whsec_...
KUNO_SITE_URL=https://kunoworld.com       # where Checkout returns the customer
```

Create a webhook endpoint at `https://<gateway>/v1/webhooks/stripe` with these events:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `refund.created`
- `charge.dispute.created`

- **Credit:** the gateway credits only when the signed event says the session is paid, the payment is in USD, and the payment belongs to the account that started it. Returning to the success page credits nothing.
- **Retries:** Stripe's retries are safe.
- **Refunds and disputes:** they take the amount back out, even into a negative balance, and mark the payment for review.

## USDT: NOWPayments

```
KUNO_NOWPAYMENTS_API_KEY=...
KUNO_NOWPAYMENTS_IPN_SECRET=...
KUNO_NOWPAYMENTS_SANDBOX=0                # 1 uses api-sandbox.nowpayments.io
KUNO_NOWPAYMENTS_MIN_USD=20               # network fees make small USDT payments mostly fee
KUNO_PUBLIC_API_URL=https://api.kunoworld.com   # the IPN callback is built from this
```

In the NOWPayments dashboard, set the IPN secret, and turn off anything that would pay out to a wallet other than the one you intend.

- **Invoices** are fixed-rate, and their `order_id` is the payment id.
- **Signature:** an IPN is verified with HMAC-SHA512 over its JSON, keys sorted, exactly as JavaScript writes numbers. Test vectors signed by Node are in `tests/nowpayments_ipn_vectors.json`.
- **Confirmation:** for a `finished` payment the gateway fetches `GET /v1/payment/{id}` and credits only if that record agrees on status, order, currency and amount.
- **When NOWPayments is unreachable,** the webhook answers 502 and NOWPayments retries it.
- **Partial payments** (`partially_paid`) are held for review.

## TAO and subnet alpha

```
KUNO_TAO_TREASURY=5...                    # the treasury coldkey's ss58 address; watching starts when set
KUNO_SUBTENSOR_URL=wss://entrypoint-finney.opentensor.ai:443   # run your own node or archive for production
KUNO_TAO_MIN_DEPOSIT=0.05
KUNO_ALPHA_NETUIDS=51                     # comma-separated; empty turns alpha off
KUNO_ALPHA_HAIRCUT=0.10
KUNO_ALPHA_MAX_USD=500
KUNO_PRICE_MAX_DIVERGENCE=0.02
```

Install the gateway with its `chain` extra (`substrate-interface`). Without it, the watcher logs an error and stays off.

**Linking a coldkey.** The customer asks for a challenge (`POST /v1/me/wallets/challenge`) and signs it with the coldkey. Either signing method works:
- the polkadot{.js} extension's `signRaw`;
- `btcli wallet sign --message`.

They send the signature to `POST /v1/me/wallets/verify`. A coldkey links to one account only.

**Crediting.** Once a coldkey is linked, the customer sends TAO (a balance transfer) or alpha (`btcli stake transfer`) to the treasury coldkey. Every 12 seconds the watcher reads the finalized blocks after its cursor, in order, and credits a deposit only when all of these hold:
- the extrinsic emitted `System.ExtrinsicSuccess`;
- the event happened while applying an extrinsic, not during block initialization;
- the recipient is the treasury;
- the sender is a linked coldkey;
- TAO/USD is available as the median of Kraken, Coinbase and CoinGecko, from at least two sources agreeing within `KUNO_PRICE_MAX_DIVERGENCE`. If it isn't, crediting pauses at that block and resumes when prices agree.

**Idempotency.** A deposit's reference is `block_hash:extrinsic:position`, and the cursor moves in the same transaction as the block's credits. After a crash, the block is read again without crediting twice.

**Alpha valuation.** Alpha is valued at the lowest of:
- the TAO the chain reports moved;
- what selling that alpha into the subnet's pool would return;
- the subnet's moving price.

The haircut is then applied, and deposits above `KUNO_ALPHA_MAX_USD` are held for review. Pool state is read at the deposit's own block. Public nodes keep only about 256 blocks of state, so a watcher that falls more than 200 blocks behind holds alpha deposits for review instead of pricing them at today's pool.

**First start.** The cursor starts at the current finalized block. Deposits made before the watcher first ran aren't picked up.

**Operating the treasury.** The treasury's alpha is staked to whichever hotkey the customer staked to. Move it to your own hotkey, or unstake it, on your own schedule; the gateway never holds treasury keys.

## Payments held for review

A payment's `status` is one of:
- `created`
- `pending`
- `credited`
- `needs_review`
- `failed`
- `expired`
- `below_minimum`

`needs_review` means money may have arrived but wasn't credited automatically. The `detail` column says why, for example:
- a sender coldkey that isn't linked (account `unattributed`);
- an unaccepted subnet;
- an amount mismatch;
- a partial payment;
- a refund or dispute.

Resolve these by hand. To credit, an operator with the `admin` role (signed in by email; see `MODERATION.md`) uses `POST /admin/v1/accounts/{id}/credits` (`amount_usd`, `idempotency_key` naming the payment, `note`); each credit is in the audit log under their email. To refund, send it back through the provider or on chain.

Find them with:

```sql
SELECT id, provider, provider_ref, account_id, asset, asset_amount, detail, created_at
FROM payments WHERE status = 'needs_review' ORDER BY created_at;
```
