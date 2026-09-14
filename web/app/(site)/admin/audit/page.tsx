import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import { SAFE_ID, when, type AuditEntry } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

export default async function Audit({ searchParams }: { searchParams: Promise<{ target_id?: string }> }) {
  const operator = await requireOperator("admin");
  const target = ((await searchParams).target_id ?? "").trim();
  const filter = target && SAFE_ID.test(target) ? `&target_id=${encodeURIComponent(target)}` : "";
  const log = await adminApi<AuditEntry[]>(operator, `/audit-log?limit=200${filter}`);

  return (
    <section className={styles.section} aria-labelledby="audit-title" style={{ marginTop: 0 }}>
      <h2 id="audit-title" className={styles.sectionTitle}>
        Audit log
      </h2>
      <p className={styles.fine}>Every content view and every operator action, newest first.</p>
      <form method="get" action="/admin/audit" className={styles.inline} aria-label="Filter the audit log">
        <label className={styles.field}>
          <span>Target id (report, item, hold, account)</span>
          <input name="target_id" defaultValue={target} autoComplete="off" spellCheck={false} />
        </label>
        <button type="submit" className="ocean-button button-dark">
          Filter
        </button>
        {target && (
          <a className="text-link" href="/admin/audit">
            Clear
          </a>
        )}
      </form>

      {!log.ok ? (
        <p className={styles.error} role="alert">
          The audit log couldn&apos;t be loaded: {log.error.message} ({log.error.code}).
        </p>
      ) : log.data.length === 0 ? (
        <p className={styles.fine}>No entries.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Audit log entries">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Operator</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Reason</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {log.data.map((entry) => (
                <tr key={entry.id}>
                  <td>{when(entry.created_at)}</td>
                  <td>{entry.operator}</td>
                  <td>{entry.action}</td>
                  <td className={styles.mono}>
                    {entry.target_kind} {entry.target_id}
                  </td>
                  <td>{entry.reason ?? ""}</td>
                  <td>
                    {entry.detail ? <code className={ui.badge}>{JSON.stringify(entry.detail).slice(0, 160)}</code> : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
