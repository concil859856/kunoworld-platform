"use client";

import { useId, useState, type FormEvent } from "react";

import { accountError } from "@/lib/errors";

import styles from "./Account.module.css";

export interface PaymentConfig {
  min_usd: number;
  max_usd: number;
  card: { enabled: boolean };
  usdt: { enabled: boolean; min_usd: number; networks: string[] };
  tao: { enabled: boolean; treasury_address: string | null; min_tao: number; confirmation: string; credit_bonus?: number };
  alpha: { enabled: boolean; netuids: number[]; haircut: number; max_usd_per_deposit: number; credit_bonus?: number };
}

type Method = "card" | "usdt";

const QUICK_PICKS = [10, 25, 100];
const NETWORK_LABELS: Record<string, string> = { tron: "TRON (TRC-20)", ethereum: "Ethereum (ERC-20)" };

const dollars = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Whole dollars and cents ("25", "$19.99"), or null. Counted in cents so 19.99 stays 19.99. */
function parseAmount(text: string): number | null {
  const match = /^\s*\$?\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(text);
  if (!match) return null;
  return (Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"))) / 100;
}

/** Only an https page is a provider's checkout; anything else isn't followed. */
function checkoutUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Card and USDT top-ups for a chosen amount; TAO and alpha by deposit from a linked coldkey. */
export function TopUp({ config }: { config: PaymentConfig | null }) {
  const methods = config ? (["card", "usdt"] as const).filter((m) => config[m].enabled) : [];
  const [amount, setAmount] = useState("25");
  const [method, setMethod] = useState<Method | null>(methods[0] ?? null);
  const [network, setNetwork] = useState(config?.usdt.networks[0] ?? "tron");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const hintId = useId();

  const treasury = config && (config.tao.enabled || config.alpha.enabled) ? config.tao.treasury_address : null;
  if (!config || (methods.length === 0 && !treasury)) {
    return (
      <p className={styles.fine}>
        Top-ups aren&apos;t available yet. During the preview, credit is added by the KunoWorld team.
      </p>
    );
  }

  const minimum = method === "usdt" ? config.usdt.min_usd : config.min_usd;
  const value = parseAmount(amount);
  const problem =
    value === null
      ? "Enter an amount in dollars and cents, like 25 or 19.99."
      : value < minimum || value > config.max_usd
        ? `${method === "usdt" ? "USDT top-ups" : "Top-ups"} must be between ${dollars(minimum)} and ${dollars(config.max_usd)}.`
        : "";

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (problem || value === null || !method) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/auth/topups/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(method === "usdt" ? { amount_usd: value, network } : { amount_usd: value }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { checkout_url?: unknown; code?: string; message?: string } | null;
    const url = response?.ok ? checkoutUrl(body?.checkout_url) : null;
    if (!url) {
      setBusy(false);
      setError(
        response?.ok
          ? "The payment provider didn't return a checkout page. Nothing was charged; try again."
          : accountError(body, "Couldn't start the payment. Try again."),
      );
      return;
    }
    // Stays busy while the browser leaves for the provider's page.
    window.location.assign(url);
  }

  return (
    <div className={styles.grid}>
      {methods.length > 0 && method && (
        <form className={styles.panel} onSubmit={pay} noValidate>
          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>Amount</legend>
            <div className={styles.picks}>
              {QUICK_PICKS.filter((pick) => pick >= config.min_usd && pick <= config.max_usd).map((pick) => (
                <button
                  key={pick}
                  type="button"
                  className={styles.chip}
                  aria-pressed={value === pick}
                  onClick={() => setAmount(String(pick))}
                >
                  ${pick}
                </button>
              ))}
            </div>
            <label className={styles.field}>
              <span>Amount in US dollars</span>
              <span className={styles.money}>
                <span aria-hidden="true">$</span>
                <input
                  value={amount}
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={touched && Boolean(problem)}
                  aria-describedby={hintId}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
              </span>
            </label>
            <p id={hintId} className={touched && problem ? styles.error : styles.fine}>
              {touched && problem ? problem : `Between ${dollars(minimum)} and ${dollars(config.max_usd)}.`}
            </p>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>Pay with</legend>
            <div className={styles.choices}>
              {methods.map((m) => (
                <label key={m} className={styles.choice}>
                  <input type="radio" name="topup-method" value={m} checked={method === m} onChange={() => setMethod(m)} />
                  <span>
                    <strong>{m === "card" ? "Card" : "USDT"}</strong>
                    <small>
                      {m === "card"
                        ? "Visa, Mastercard, Amex and more, through Stripe."
                        : `Tether on TRON or Ethereum, through NOWPayments. From ${dollars(config.usdt.min_usd)}.`}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {method === "usdt" && (
            <>
              <label className={styles.field}>
                <span>Network</span>
                <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                  {config.usdt.networks.map((n) => (
                    <option key={n} value={n}>
                      {NETWORK_LABELS[n] ?? n}
                    </option>
                  ))}
                </select>
              </label>
              <p className={styles.fine}>
                USDT top-ups start at {dollars(config.usdt.min_usd)}. Send exactly what the payment page asks for, on the
                network you chose here.
              </p>
            </>
          )}

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div>
            <button type="submit" className="ocean-button button-dark" disabled={busy}>
              {busy
                ? "Opening checkout…"
                : `Pay ${value !== null && !problem ? dollars(value) + " " : ""}${method === "usdt" ? "in USDT" : "by card"}`}
            </button>
          </div>
          <p className={styles.fine}>
            You finish on {method === "usdt" ? "NOWPayments'" : "Stripe's"} page. Credit appears here once the provider
            confirms the payment.
          </p>
        </form>
      )}

      {treasury && (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>
            {config.tao.enabled && config.alpha.enabled ? "TAO or subnet alpha" : config.tao.enabled ? "TAO" : "Subnet alpha"}
          </h3>
          <p className={styles.fine}>
            No amount to choose: send to the treasury address from a coldkey you&apos;ve linked below. A deposit from any
            other coldkey can&apos;t be matched to your account.
          </p>
          <code className={styles.mono} aria-label="Treasury address">
            {treasury}
          </code>
          <div>
            <button
              type="button"
              className="text-link"
              onClick={() => void navigator.clipboard?.writeText(treasury).then(() => setCopied(true))}
            >
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
          <ul className={styles.list}>
            {config.tao.enabled && (
              <li>
                TAO: at least {config.tao.min_tao} TAO per deposit. Credited after the block is finalized, at the median
                TAO/USD price{config.tao.credit_bonus ? `, plus ${Math.round(config.tao.credit_bonus * 100)}% bonus credit` : ""}.
              </li>
            )}
            {config.alpha.enabled && (
              <li>
                Alpha from subnet{config.alpha.netuids.length === 1 ? "" : "s"} {config.alpha.netuids.join(", ")}, moved
                as stake to the treasury: valued conservatively at its TAO price less {Math.round(config.alpha.haircut * 100)}
                %. Deposits worth over {dollars(config.alpha.max_usd_per_deposit)} are held for review.
                {config.alpha.credit_bonus ? ` Credited deposits get ${Math.round(config.alpha.credit_bonus * 100)}% bonus credit.` : ""}
              </li>
            )}
          </ul>
          <div>
            <a className="text-link" href="#wallets">
              Link a coldkey
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
