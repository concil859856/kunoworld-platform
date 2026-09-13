import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KeyManager, type KeyRow } from "@/components/site/KeyManager";
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

export default async function Account() {
  const token = await sessionToken();
  if (!token) redirect("/signin?next=/account");

  const [me, keys, entries] = await Promise.all([
    gateway<Me>("/v1/me", { token }),
    gateway<KeyRow[]>("/v1/me/keys", { token }),
    gateway<Entry[]>("/v1/me/ledger?limit=50", { token }),
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
        <h1>{user.email}</h1>
        <p>Your balance, your API keys, and every charge and refund.</p>
      </header>

      <div className="inner-content">
        <section className={styles.grid}>
          <div className={styles.panel}>
            <span className={styles.label}>Balance</span>
            <strong className={styles.balance} aria-label="Balance">
              {usd(account?.balance_usd ?? 0)}
            </strong>
            <p className={styles.fine}>
              Card, USDT, TAO and subnet-alpha top-ups are being built. During the preview, credit is added by the
              KunoWorld team. Failed, canceled and timed-out videos are refunded automatically.
            </p>
            <a className="ocean-button button-dark" href="/studio">
              Open the studio
            </a>
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

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>API keys</h2>
          <p className={styles.fine}>
            For the SDKs and the API from your own programs. The studio doesn&apos;t need one: it uses your sign-in.
          </p>
          <KeyManager initialKeys={keys.ok ? keys.data : []} />
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
