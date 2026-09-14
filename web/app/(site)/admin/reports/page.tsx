import { resolveReport } from "@/app/(site)/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import ui from "@/components/admin/Admin.module.css";
import { ResolveFields } from "@/components/admin/ResolveFields";
import styles from "@/components/site/Account.module.css";
import { REVIEWABLE_REPORT_REASONS, reasonLabel, when, type AdminReport } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

const STATUSES = ["open", "resolved", "all"] as const;
type Status = (typeof STATUSES)[number];

export default async function Reports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const operator = await requireOperator();
  const requested = (await searchParams).status;
  const status: Status = STATUSES.includes(requested as Status) ? (requested as Status) : "open";
  const reports = await adminApi<AdminReport[]>(operator, `/reports?status=${status}&limit=200`);

  return (
    <section className={styles.section} aria-labelledby="reports-title" style={{ marginTop: 0 }}>
      <h2 id="reports-title" className={styles.sectionTitle}>
        Reports
      </h2>
      <nav className={ui.filters} aria-label="Filter reports">
        <span className={styles.fine}>Show:</span>
        {STATUSES.map((s) => (
          <a key={s} href={`/admin/reports?status=${s}`} aria-current={s === status ? "page" : undefined}>
            {s === "open" ? "Open" : s === "resolved" ? "Resolved" : "All"}
          </a>
        ))}
      </nav>

      {!reports.ok ? (
        <p className={styles.error} role="alert">
          Reports couldn&apos;t be loaded: {reports.error.message} ({reports.error.code}).
        </p>
      ) : reports.data.length === 0 ? (
        <p className={styles.fine}>No {status === "all" ? "" : status} reports.</p>
      ) : (
        <ul className={ui.list} aria-label="Reports">
          {reports.data.map((report) => {
            const childSafety = REVIEWABLE_REPORT_REASONS.includes(report.reason);
            return (
              <li key={report.report_id} className={ui.card} data-report={report.report_id} data-status={report.status}>
                <div className={ui.cardHead}>
                  <h3 className={ui.cardTitle}>{reasonLabel(report.reason)}</h3>
                  <span className={`${ui.badge} ${childSafety ? ui.urgent : ""}`}>
                    {report.status === "open" ? `Open · priority ${report.priority}` : `Resolved: ${report.resolution ?? "—"}`}
                  </span>
                </div>
                <dl className={ui.meta}>
                  <div>
                    <dt>Reported</dt>
                    <dd>{when(report.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Job</dt>
                    <dd className={styles.mono}>{report.job_id ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Content digest</dt>
                    <dd className={styles.mono}>{report.content_digest ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Link</dt>
                    <dd>{report.url ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Account</dt>
                    <dd className={styles.mono}>
                      {report.account_id && operator.isAdmin ? (
                        <a className="text-link" href={`/admin/accounts?account=${encodeURIComponent(report.account_id)}`}>
                          {report.account_id}
                        </a>
                      ) : (
                        (report.account_id ?? "—")
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Output key supplied</dt>
                    <dd>{report.has_output_key ? "Yes" : "No"}</dd>
                  </div>
                  {report.contact_email && (
                    <div>
                      <dt>Reporter contact</dt>
                      <dd>{report.contact_email}</dd>
                    </div>
                  )}
                  {report.status === "resolved" && (
                    <div>
                      <dt>Resolved</dt>
                      <dd>
                        {when(report.resolved_at)} by {report.resolved_by ?? "—"}
                      </dd>
                    </div>
                  )}
                </dl>
                {report.details && <p className={ui.pre}>{report.details}</p>}
                {report.resolution_note && <p className={styles.fine}>Note: {report.resolution_note}</p>}
                <p className={styles.fine}>
                  {childSafety
                    ? report.status === "open"
                      ? "Child-safety report: while it's open, its content can be opened from the queue item, and the view is logged."
                      : "Resolved: its content can be opened only if a hold preserves it."
                    : "Content can't be opened for this report type. Decide from the report, the job's details and the account's history."}{" "}
                  {operator.isAdmin && (
                    <a className="text-link" href={`/admin/audit?target_id=${encodeURIComponent(report.report_id)}`}>
                      Audit trail
                    </a>
                  )}
                </p>
                {report.status === "open" && (
                  <details className={ui.details}>
                    <summary>Resolve this report</summary>
                    <ActionForm action={resolveReport} submit="Resolve report" label={`Resolve report ${report.report_id}`}>
                      <input type="hidden" name="report_id" value={report.report_id} />
                      <ResolveFields />
                    </ActionForm>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
