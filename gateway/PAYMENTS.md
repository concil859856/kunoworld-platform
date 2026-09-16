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
| TAO | None; direct to the treasury | Finalized block | TAO x median TAO/USD, plus the chain bonus |
| Subnet alpha | None; stake transfer to the treasury | Finalized block | Conservative TAO value x TAO/USD, plus the chain bonus |

Limits: `KUNO_TOPUP_MIN_USD` (default 10) and `KUNO_TOPUP_MAX_USD` (default 5000) apply to card and USDT. The minimum
is $10 because Stripe keeps 8.9% of a $5 top-up and 5.9% of a $10 one. USDT also has its own, higher minimum.

**Credit never expires.** A balance changes only through ledger entries (charges, refunds, top-ups, bonuses and
operator adjustments); nothing ages it or takes unused credit back. Closing an account records its unused balance
without refunding it (`STANDARD_MODE.md`).

## Job prices

Prices are per output second, per resolution and per privacy mode, from each model profile's `pricing`
(`kuno_protocol/profiles.json`):

- `usd_per_second` is the **Private** price. Private is the default mode, so a client that reads only this field sees
  what a default job costs. `standard_usd_per_second` is the **Standard** price, or `null` where the profile is sold
  in Private mode only. `GET /v1/models` also lists each profile's `privacy_modes`.
- **Private-only profiles:** none today; every profile has a Standard price (MiniMax H3's match fal's list prices). A
  Standard job for a profile without one is refused with `422 privacy_mode_unavailable` before anything is charged, and
  so is `GET /v1/route?privacy=standard` for it.
- **Multipliers apply to the whole job:** `fps_multipliers` (LTX-2.5 at 48 or 50 fps costs 1.5x) and, in Private mode
  only, `long_clip` (a Private H3 clip over its threshold costs more per second, because longer H3 clips cost more to
  render per second; Standard prices stay flat per second, like the market's).
- **Minimum charge:** no job costs less than `min_job_usd`, $0.10.

| Profile | Private, per second | Standard, per second |
| --- | --- | --- |
| `ltx-2.5-fast` | 720p $0.12, 1080p $0.17 | 720p $0.09, 1080p $0.13 |
| `ltx-2.5-pro` | 720p $0.16, 1080p $0.22 | 720p $0.12, 1080p $0.17 |
| `ltx-2.5-4k` | 1440p $0.25, 2160p $0.39 | 1440p $0.19, 2160p $0.30 |
| `h3-turbo` | 768p $0.065, $0.091 over 8 s | 768p $0.04 |
| `h3` | 768p $0.30, $0.51 over 6 s | 768p $0.06 |
| `h3-reference` | 768p $0.50, $0.75 over 6 s | 768p $0.06 |

These placeholders follow `research/research_pricing.md`. LTX-2.5 Fast renders up to 20 s at 24 or 25 fps and up to
10 s at 48 or 50 fps (`limits.max_duration_s_by_fps`); Pro and 4K render up to 10 s.

**Storyboards** (PROTOCOL.md, "Storyboards"; LTX-2.5 Fast only today, up to 12 shots and 120 s):

- **The customer pays for the stitched video:** the profile's per-second rate for the job's `duration_s`, which for a
  storyboard is the stitched length, with the fps multiplier and the minimum charge as for any job. The frames a joined
  shot repeats from the shot before (17 per `continue` or `cut` join on LTX-2.5 Fast) are trimmed from the video and
  not charged: three 5 s shots with two joins are 13.708 s, $1.645 Private and $1.2337 Standard at 720p.
- **Private long-clip multiplier:** it looks at the longest shot (`GenerationParams.render_duration_s`), not the
  stitched length, because shots render one at a time. No LTX-2.5 profile has one today.
- **Miners are paid for what they render:** validators credit a storyboard `Σ vcu_at(resolution, fps, shot.duration_s)`
  over its shots, overlaps included (`ModelProfile.vcu_for`), each shot at its own duration factor. That is more
  seconds than the customer pays for, at a lower per-second weight than one clip of the whole length would get.
- The hold, the refund on failure and `billable_usd` work exactly as for any other job.

**Refunds.** A job's price is charged when the gateway accepts it. If the job doesn't succeed, the price is refunded in
full, automatically and once (key `refund:{job_id}`). That covers a failure, a timeout, a cancellation, a worker that
went away, an output that didn't verify, and `safety_blocked`: a Private job the enclave's safety check blocked, or a
Standard output that matched a hash list. A blocked job still counts as a strike (`MODERATION.md`). A Standard prompt
refused with `422 content_policy` is refused before anything is charged.

## Quotes

`POST /v1/quote` (`api_quote.py`) answers, before anything is sealed or uploaded, the exact price the gateway would hold
if the job were submitted now. It takes only what a client knows beforehand, never a prompt or an input:

```
{profile_id?, family?, mode?, privacy?: "private" | "standard", duration_s?, resolution?, aspect_ratio?, fps?, audio?: true,
 input_roles?: [InputRole], shots?: [{duration_s?, join?}]}
```

**What it does, in the order a job goes:**
1. **Shape checks.** `shots` makes the mode `storyboard`. With shots, `duration_s`, another `mode` or `input_roles` is
   refused (`422 invalid_params`, `invalid_shots`, `invalid_inputs`), and so is `mode: "storyboard"` without shots.
   Without `mode`, the mode comes from `input_roles` as the SDKs infer it from the inputs; without `input_roles`, the
   inputs are the ones the mode needs (`profiles.example_roles`). A shot with a `prompt` field is refused (`422`).
2. **Routing, exactly as `GET /v1/route`.** The owner's switch, licence regions, capacity and fallbacks. The size, frame
   rate and duration given (a storyboard's longest shot) filter workers by their serving envelopes. With a credential
   that works, the account's standing is checked too. Refusals are the route's: `404 unknown_model`,
   `422 mode_unsupported`, `422 privacy_mode_unavailable`, `451 region_restricted`, `409 model_disabled`,
   `503 no_capacity`, `403 private_mode_not_eligible`, `403 account_restricted`. A key that doesn't work quotes as
   anonymous, as routing does.
3. **The params a client would send.** Defaults are the SDKs' (the model's first resolution, 16:9, its default fps, 5 s
   clips and shots, joins `fresh` then `continue`, and audio where the model has it). After a fallback the requested values
   are adapted to the model that serves. `validate_params` then checks them (`422 invalid_params`).
4. **Some worker's hardware must fit the filled-in params.** Otherwise `503 no_capacity` with `max_duration_s`, as for a
   Standard job.
5. **The price:** `ModelProfile.price_usd(params, privacy)`, the function admission charges with.

**Response:**

| Field | Meaning |
|---|---|
| `price_usd`, `currency` | the hold, in USD |
| `privacy` | the mode priced |
| `profile_id`, `profile_name`, `requested_profile_id`, `fallback_reason` | the model that would serve, and why when it isn't the one asked for |
| `params` | the `GenerationParams` priced; a client that sends exactly these is charged `price_usd` |
| `breakdown` | `usd_per_second`, `billable_seconds` (a storyboard's stitched seconds), `fps_multiplier`, `long_clip_over_s` (null unless the profile has a Private long-clip rule), `long_clip_multiplier`, `subtotal_usd`, `min_job_usd`, `minimum_applied` |
| `placeholder` | `/v1/models`' `pricing_placeholder`: true while prices are placeholders |
| `balance_usd`, `balance_covers` | with a working credential, the account's balance and whether it covers the price; otherwise null |

A quote holds nothing and reserves no capacity: the job is priced again, the same way, when it is submitted. The Python
SDK's budget guard (`max_price_usd`) sends every field of the params it is about to seal, on the routed profile, and
refuses `over_budget` on the client when the price is over the limit. Its MCP server (`kunoworld-mcp`) quotes before
every job.

**Limit.** `KUNO_QUOTES_PER_MINUTE` (120) per account, or per network without a credential, counted under a keyed hash
of the address so none is stored: `429 rate_limited`. Validator accounts are exempt.

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
KUNO_CHAIN_CREDIT_BONUS=0.05              # extra credit on TAO and alpha deposits; 0 turns it off
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

**Bonus.** A credited TAO or alpha deposit also earns `KUNO_CHAIN_CREDIT_BONUS` (default 0.05: 5%) of the USD it credited, after the alpha haircut, rounded down to the micro-dollar. The bonus is its own ledger entry, so it can be audited apart from the deposit:
- kind `bonus`, source `tao` or `alpha`, key `bonus:{provider}:{reference}`;
- posted in the same transaction as the deposit, so it lands once, together with it;
- never counted as paid money (see "Billable USD" below).

`GET /v1/payments/config` shows it as `credit_bonus` under `tao` and `alpha`. A deposit held for review and credited by an operator gets no automatic bonus; add it in the same credit if it's owed.

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

## Billable USD

Every row of the validator ledger feed (`GET /validator/v1/ledger`) carries `billable_usd`: the USD of real customer
money the job earned the network, so miner pay can follow what customers actually paid rather than list prices.

- **A validator account's job** (canaries, standard canaries, Turbo benchmarks): 0.
- **A job that didn't succeed:** 0. Every such job is refunded.
- **Any other job:** its charged price x the account's paid share when it was charged. It is stored on the job
  (`jobs.billable_usd`, migration 0015) and set to 0 if the job is refunded.

The paid share is paid ÷ (paid + granted), over every credit the account has ever received (`ledger.paid_share`):
- **paid:** top-ups from Stripe, NOWPayments, TAO and alpha, less refunds and disputes of those top-ups;
- **granted:** everything else, such as operator credits, sign-up credit, the chain bonus, development balances and
  any unrecognized source.

Charges and refunds only spend or return credit already counted, so they don't change the share. An account with
nothing but granted credit has a share of 0. Jobs charged before migration 0015 report 0, and an operator credit that
settles a payment held for review counts as granted, so the figure can under-report paid money but never over-report it.
