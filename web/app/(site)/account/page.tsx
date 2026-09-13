import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KeyManager, type KeyRow } from "@/components/site/KeyManager";
import { TopUp, type PaymentConfig } from "@/components/site/TopUp";
import { TopUpNotice } from "@/components/site/TopUpNotice";
import { WalletLinker, type WalletRow } from "@/components/site/WalletLinker";
import { WebhookSecret } from "@/components/site/WebhookSecret";
import styles from "@/components/site/Account.module.css";
import { gateway, sessionToken } from "@/lib/gateway.server";

export const metadata: Metadata = {
  title: "Account — KunoWorld",
  robots: { index: false },
};

interface Me {
  user: { user_id: string; email: string; created_at: number };
  account: { account_id: string; balance_usd: number } | null;
}

interface Entry {
  entry_id: string;
  kind: string;
  source: string;
  amount_usd: number;
  balance_after_usd: number;
  job_id: string | null;
  description: string | null;
  created_at: number;
}

interface Payment {
  payment_id: string;
  provider: string;
  status: string;
  requested_usd: number | null;
  amount_usd: number | null;
  asset: string | null;
  asset_amount: string | null;
  chain: string | null;
  checkout_url: string | null;
  created_at: number;
  credited_at: number | null;
}

/** Two decimals, or four when a price is a fraction of a cent. */
function usd(value: number, signed = false): string {
  const abs = Math.abs(value);
  const digits = Math.round(abs * 100) === abs * 100 ? 2 : 4;
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  return `${sign}$${abs.toFixed(digits)}`;
}

const date = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

function label(entry: Entry): string {
  if (entry.kind === "charge") return "Video";
  if (entry.kind === "refund") return "Refund";
  if (entry.kind === "topup") return "Top-up";
  return (
    { signup: "Welcome credit", admin: "Credit adjustment", migration: "Opening balance", dev: "Development balance" }[
      entry.source
    ] ?? "Adjustment"
  );
}

const STATUS: Record<string, string> = {
  created: "Awaiting payment",
  pending: "Pending",
  credited: "Credited",
  needs_review: "Under review",
  failed: "Failed",
  expired: "Expired",
  below_minimum: "Below minimum",
};

function method(payment: Payment): string {
  if (payment.provider === "stripe") return "Card";
  if (payment.provider === "nowpayments") return "USDT";
  if (payment.provider === "tao") return "TAO";
  // Alpha is recorded as "alpha:<netuid>".
  const netuid = payment.asset?.split(":")[1];
  return payment.provider === "alpha" ? (netuid ? `Alpha (subnet ${netuid})` : "Alpha") : payment.provider;
}

/** What arrived on chain or at the processor, when it's known: "1.25 TAO", "25 USDT". */
function paidIn(payment: Payment): string {
  if (!payment.asset_amount) return "—";
  const unit = payment.provider === "alpha" ? "TAO value" : payment.provider === "nowpayments" ? "USDT" : (payment.asset ?? "").toUpperCase();
  return `${payment.asset_amount} ${unit}`.trim();
}

export default async function Account({ searchParams }: { searchParams: Promise<{ topup?: string }> }) {
  const token = await sessionToken();
  if (!token) redirect("/signin?next=/account");
  const { topup } = await searchParams;

  const [me, keys, entries, config, payments, wallets] = await Promise.all([
    gateway<Me>("/v1/me", { token }),
    gateway<KeyRow[]>("/v1/me/keys", { token }),
    gateway<Entry[]>("/v1/me/ledger?limit=50", { token }),
    gateway<PaymentConfig>("/v1/payments/config"),
    gateway<Payment[]>("/v1/me/topups?limit=50", { token }),
    gateway<WalletRow[]>("/v1/me/wallets", { token }),
  ]);
  if (!me.ok) {
    if (me.error.status === 401) redirect("/signin?next=/account");
    return (
      <div className={styles.account}>
        <div className="inner-content">
          <p className="notice" role="alert">
            {me.error.message} Try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  const { user, account } = me.data;
  return (
    <div className={styles.account}>
      <header className="page-heading">
        <span className="section-kicker">YOUR ACCOUNT</span>
        <h1 className={styles.email}>{user.email}</h1>
        <p>Your balance and top-ups, your API keys, and every charge and refund.</p>
      </header>

      <div className="inner-content">
        {(topup === "success" || topup === "canceled") && <TopUpNotice outcome={topup} />}

        <section className={styles.grid}>
          <div className={styles.panel}>
            <span className={styles.label}>Balance</span>
            <strong className={styles.balance} aria-label="Balance">
              {usd(account?.balance_usd ?? 0)}
            </strong>
            <p className={styles.fine}>Failed, canceled and timed-out videos are refunded automatically.</p>
            <div className={styles.actions}>
              <a className="ocean-button button-dark" href="/studio">
                Open the studio
              </a>
              <a className="text-link" href="#add-credit">
                Add credit
              </a>
            </div>
          </div>

          <div className={styles.panel}>
            <dl className={styles.facts}>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Account ID</dt>
                <dd className={styles.mono} data-account-id={account?.account_id}>
                  {account?.account_id ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{date(user.created_at)}</dd>
              </div>
            </dl>
            <form method="post" action="/auth/logout">
              <button type="submit" className="text-link">
                Sign out
              </button>
            </form>
          </div>
        </section>

        <section id="add-credit" className={styles.section} aria-labelledby="add-credit-title">
          <h2 id="add-credit-title" className={styles.sectionTitle}>
            Add credit
          </h2>
          <TopUp config={config.ok ? config.data : null} />
        </section>

        <section id="wallets" className={styles.section} aria-labelledby="wallets-title">
          <h2 id="wallets-title" className={styles.sectionTitle}>
            Linked Bittensor wallets
          </h2>
          <p className={styles.fine}>
            TAO and subnet-alpha deposits are credited only from a coldkey linked here. Linking signs a one-time message;
            it never moves funds or shares a key.
          </p>
          <WalletLinker initialWallets={wallets.ok ? wallets.data : []} />
        </section>

        <section className={styles.section} aria-labelledby="payments-title">
          <h2 id="payments-title" className={styles.sectionTitle}>
            Payment history
          </h2>
          {!payments.ok || payments.data.length === 0 ? (
            <p className={styles.fine}>No top-ups yet. Card, USDT, TAO and alpha payments will appear here.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Method</th>
                    <th scope="col">Requested</th>
                    <th scope="col">Credited</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.data.map((payment) => (
                    <tr key={payment.payment_id}>
                      <td>{date(payment.created_at)}</td>
                      <td>{method(payment)}</td>
                      <td>{payment.requested_usd === null ? "—" : usd(payment.requested_usd)}</td>
                      <td className={payment.status === "credited" ? styles.credit : undefined}>
                        {payment.amount_usd === null ? "—" : usd(payment.amount_usd)}
                      </td>
                      <td>{paidIn(payment)}</td>
                      <td>{STATUS[payment.status] ?? payment.status}</td>
                      <td>
                        {payment.checkout_url && (payment.provider === "stripe" || payment.provider === "nowpayments") && (
                          <a className="text-link" href={payment.checkout_url} rel="noopener noreferrer">
                            Continue payment
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>API keys</h2>
          <p className={styles.fine}>
            For the SDKs and the API from your own programs. The studio doesn&apos;t need one: it uses your sign-in.
          </p>
          <KeyManager initialKeys={keys.ok ? keys.data : []} />
        </section>

        <section className={styles.section} aria-labelledby="webhooks-title">
          <h2 id="webhooks-title" className={styles.sectionTitle}>
            Webhooks
          </h2>
          <p className={styles.fine}>
            Each delivery carries <code>kunoworld-signature: t=&lt;timestamp&gt;,v1=&lt;signature&gt;</code>, where the
            signature is an HMAC-SHA256 of <code>timestamp.body</code> (the raw request body) keyed with this secret.
          </p>
          <WebhookSecret />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Activity</h2>
          {!entries.ok || entries.data.length === 0 ? (
            <p className={styles.fine}>Nothing yet. Charges, refunds and credits will appear here.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">What</th>
                    <th scope="col">Details</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.data.map((entry) => (
                    <tr key={entry.entry_id}>
                      <td>{date(entry.created_at)}</td>
                      <td>{label(entry)}</td>
                      <td>{entry.description ?? ""}</td>
                      <td className={entry.amount_usd < 0 ? styles.debit : styles.credit}>{usd(entry.amount_usd, true)}</td>
                      <td>{usd(entry.balance_after_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
