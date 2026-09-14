import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import { when } from "@/lib/admin-types";
import {
  CYBERTIP_STATUSES,
  CYBERTIP_STATUS_LABEL,
  environmentLabel,
  type CybertipConfig,
  type CybertipReport,
  type CybertipStatus,
} from "@/lib/cybertip-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

type Filter = CybertipStatus | "all";

export default async function CybertipReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const operator = await requireOperator();
  const requested = (await searchParams).status;
  const status: Filter = CYBERTIP_STATUSES.includes(requested as CybertipStatus) ? (requested as CybertipStatus) : "all";
  const [reports, config] = await Promise.all([
    adminApi<CybertipReport[]>(operator, `/cybertip/reports?status=${status}&limit=200`),
    adminApi<CybertipConfig>(operator, "/cybertip/config"),
  ]);

  return (
    <section className={styles.section} aria-labelledby="cybertip-reports-title" style={{ marginTop: 0 }}>
      <h2 id="cybertip-reports-title" className={styles.sectionTitle}>
        CyberTipline reports
      </h2>
      <p className={styles.fine}>
        Reports to NCMEC&apos;s CyberTipline. A moderator prepares each one from a queue item under a child-safety hold, and an
        admin reviews and confirms it; nothing is sent automatically.{" "}
        {config.ok && (
          <span data-cybertip-environment={config.data.environment}>
            This gateway: {environmentLabel(config.data.environment)}
            {config.data.environment !== "disabled" && !config.data.credentials_configured ? ", without credentials" : ""}.
          </span>
        )}
      </p>
      <nav className={ui.filters} aria-label="Filter CyberTipline reports">
        <span className={styles.fine}>Show:</span>
        {(["all", ...CYBERTIP_STATUSES] as Filter[]).map((s) => (
          <a key={s} href={`/admin/cybertip?status=${s}`} aria-current={s === status ? "page" : undefined}>
            {s === "all" ? "All" : CYBERTIP_STATUS_LABEL[s]}
          </a>
        ))}
      </nav>
      {!reports.ok ? (
        <p className={styles.error} role="alert">
          Reports couldn&apos;t be loaded: {reports.error.message} ({reports.error.code}).
        </p>
      ) : reports.data.length === 0 ? (
        <p className={styles.fine}>No CyberTipline reports{status === "all" ? "" : ` with this status`}.</p>
      ) : (
        <ul className={ui.list} aria-label="CyberTipline reports">
          {reports.data.map((report) => (
            <li key={report.report_id} className={ui.card} data-cybertip-report={report.report_id} data-status={report.status}>
              <div className={ui.cardHead}>
                <h3 className={ui.cardTitle}>
                  <a className="text-link" href={`/admin/items/${encodeURIComponent(report.item_id)}#cybertip`}>
                    {report.incident_type}
                  </a>
                </h3>
                <span className={`${ui.badge} ${report.status === "failed" ? ui.urgent : ""}`}>
                  {CYBERTIP_STATUS_LABEL[report.status] ?? report.status}
                </span>
              </div>
              <dl className={ui.meta}>
                <div>
                  <dt>Prepared</dt>
                  <dd>
                    {when(report.created_at)} by {report.created_by}
                  </dd>
                </div>
                <div>
                  <dt>Account</dt>
                  <dd className={styles.mono}>{report.account_id ?? "—"}</dd>
                </div>
                <div>
                  <dt>Files</dt>
                  <dd>{report.files.length}</dd>
                </div>
                <div>
                  <dt>NCMEC report id</dt>
                  <dd className={styles.mono}>{report.ncmec_report_id ?? "—"}</dd>
                </div>
                {report.confirmed_by && (
                  <div>
                    <dt>Confirmed</dt>
                    <dd>
                      {when(report.confirmed_at)} by {report.confirmed_by}
                    </dd>
                  </div>
                )}
                {report.last_error_code && (
                  <div>
                    <dt>Last error</dt>
                    <dd>{report.last_error_code}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
