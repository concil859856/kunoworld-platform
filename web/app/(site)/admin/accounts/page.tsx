import { randomUUID } from "node:crypto";

import { addCredit, restrictAccount, unrestrictAccount } from "@/app/(site)/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import { SAFE_ID, when, type AccountSafety } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";
import { restrictionUntil } from "@/lib/privacy-copy";

export default async function Accounts({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const operator = await requireOperator();
  const accountId = ((await searchParams).account ?? "").trim();
  const valid = SAFE_ID.test(accountId);
  const safety = valid ? await adminApi<AccountSafety>(operator, `/accounts/${encodeURIComponent(accountId)}/safety`) : null;

  return (
    <>
      <section className={styles.section} aria-labelledby="lookup-title" style={{ marginTop: 0 }}>
        <h2 id="lookup-title" className={styles.sectionTitle}>
          Account safety
        </h2>
        <form method="get" action="/admin/accounts" className={styles.inline} aria-label="Look up an account">
          <label className={styles.field}>
            <span>Account id</span>
            <input name="account" defaultValue={accountId} autoComplete="off" spellCheck={false} required />
          </label>
          <button type="submit" className="ocean-button button-dark">
            Look up
          </button>
        </form>
        {accountId && !valid && (
          <p className={styles.error} role="alert">
            That isn&apos;t an account id.
          </p>
        )}
      </section>

      {safety && !safety.ok && (
        <p className={styles.error} role="alert">
          {safety.error.status === 404 ? "No such account." : `The account couldn't be loaded: ${safety.error.message} (${safety.error.code}).`}
        </p>
      )}

      {safety?.ok && (
        <>
          <section className={styles.section} aria-labelledby="standing-title">
            <h2 id="standing-title" className={styles.sectionTitle}>
              Standing
            </h2>
            <dl className={ui.meta}>
              <div>
                <dt>Account</dt>
                <dd className={styles.mono}>{safety.data.account_id}</dd>
              </div>
              <div>
                <dt>Restricted</dt>
                <dd data-restricted={safety.data.restricted_until !== null}>
                  {safety.data.restricted_until === null ? "No" : restrictionUntil(safety.data.restricted_until)}
                </dd>
              </div>
              <div>
                <dt>Private mode</dt>
                <dd>{safety.data.private_mode?.eligible ? "Eligible" : `Not eligible${safety.data.private_mode?.reasons.length ? `: ${safety.data.private_mode.reasons.join(", ")}` : ""}`}</dd>
              </div>
              <div>
                <dt>Strikes (24 h / 7 d / 30 d)</dt>
                <dd>
                  {safety.data.strikes_24h ?? "—"} / {safety.data.strikes_7d ?? "—"} / {safety.data.strikes_30d ?? "—"}
                </dd>
              </div>
            </dl>
            {safety.data.restrictions && safety.data.restrictions.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Kind</th>
                      <th scope="col">From</th>
                      <th scope="col">Until</th>
                      <th scope="col">By</th>
                      <th scope="col">Lifted</th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safety.data.restrictions.map((r) => (
                      <tr key={`${r.created_at}-${r.kind}`}>
                        <td>{r.kind}</td>
                        <td>{when(r.created_at)}</td>
                        <td>{r.until === null ? "Until lifted" : when(r.until)}</td>
                        <td>{r.created_by ?? r.source}</td>
                        <td>{r.lifted_at ? `${when(r.lifted_at)} by ${r.lifted_by ?? "—"}` : "—"}</td>
                        <td>{r.reason ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {!operator.isAdmin && (
            <p className={styles.fine}>Restricting accounts and recording credit are for admins. You can still restrict or ban an account by resolving a report or queue item.</p>
          )}
          {operator.isAdmin && (
          <section className={styles.section} aria-labelledby="restrict-title">
            <h2 id="restrict-title" className={styles.sectionTitle}>
              Restrictions
            </h2>
            <div className={styles.grid}>
              <div className={styles.panel}>
                <ActionForm action={restrictAccount} submit="Restrict account" label="Restrict this account" confirm="Restrict this account? It can't make videos in either mode while restricted.">
                  <input type="hidden" name="account_id" value={safety.data.account_id} />
                  <label className={styles.field}>
                    <span>Days</span>
                    <input name="days" type="number" min={1} max={3650} step={1} inputMode="numeric" placeholder="7" />
                  </label>
                  <label className={ui.check}>
                    <input type="checkbox" name="indefinite" /> Until an admin lifts it
                  </label>
                  <label className={styles.field}>
                    <span>Reason for the audit log</span>
                    <textarea name="reason" rows={2} maxLength={2000} required />
                  </label>
                </ActionForm>
              </div>
              <div className={styles.panel}>
                <ActionForm action={unrestrictAccount} submit="Lift restrictions" label="Lift this account's restrictions">
                  <input type="hidden" name="account_id" value={safety.data.account_id} />
                  <label className={styles.field}>
                    <span>Reason (optional)</span>
                    <textarea name="reason" rows={2} maxLength={2000} />
                  </label>
                </ActionForm>
              </div>
            </div>
          </section>
          )}

          {operator.isAdmin && (
          <section className={styles.section} aria-labelledby="credit-title">
            <h2 id="credit-title" className={styles.sectionTitle}>
              Credit
            </h2>
            <div className={`${styles.panel} ${styles.wide}`}>
              <ActionForm action={addCredit} submit="Record credit" label="Credit this account">
                <input type="hidden" name="account_id" value={safety.data.account_id} />
                {/* A fresh key per page load, so a double submit credits once. */}
                <input type="hidden" name="idempotency_key" value={`console-${randomUUID()}`} />
                <div className={ui.row}>
                  <label className={styles.field}>
                    <span>Amount in USD (negative to debit)</span>
                    <input name="amount_usd" type="number" step="0.01" required inputMode="decimal" />
                  </label>
                  <label className={styles.field}>
                    <span>Note (shown in the customer&apos;s activity)</span>
                    <input name="note" maxLength={200} required />
                  </label>
                </div>
              </ActionForm>
            </div>
          </section>
          )}
        </>
      )}
    </>
  );
}
