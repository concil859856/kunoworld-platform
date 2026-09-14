import { cancelCybertip, dryRunCybertip, prepareCybertip, submitCybertip } from "@/app/(site)/admin/cybertip/actions";
import styles from "@/components/site/Account.module.css";
import { when } from "@/lib/admin-types";
import {
  CYBERTIP_STATUS_LABEL,
  FILE_SOURCE_LABEL,
  SUBMITTABLE,
  bytes,
  environmentLabel,
  type CybertipConfig,
  type CybertipItemStatus,
  type CybertipReport,
} from "@/lib/cybertip-types";
import { adminApi, type Operator } from "@/lib/operator.server";

import { ActionForm } from "./ActionForm";
import ui from "./Admin.module.css";

/**
 * The item page's CyberTipline section: prepare a draft (moderator), review and validate it, confirm the submission
 * (admin), and follow its status. The gateway decides whether an item is eligible; the console never re-derives it.
 */
export async function CybertipSection({ operator, itemId }: { operator: Operator; itemId: string }) {
  const [status, config] = await Promise.all([
    adminApi<CybertipItemStatus>(operator, `/cybertip/items/${encodeURIComponent(itemId)}`),
    adminApi<CybertipConfig>(operator, "/cybertip/config"),
  ]);
  const summary = status.ok ? status.data.reports.find((r) => r.status !== "canceled") : undefined;
  const detail = summary ? await adminApi<CybertipReport>(operator, `/cybertip/reports/${encodeURIComponent(summary.report_id)}`) : null;
  const report = detail?.ok ? detail.data : summary;
  const canceled = status.ok ? status.data.reports.filter((r) => r.status === "canceled") : [];

  return (
    <section className={styles.section} aria-labelledby="cybertip-title" id="cybertip">
      <h2 id="cybertip-title" className={styles.sectionTitle}>
        CyberTipline report
      </h2>
      {config.ok && (
        <p className={styles.fine} data-cybertip-environment={config.data.environment}>
          Reporting: {environmentLabel(config.data.environment)}.
          {config.data.reporter_placeholders.length > 0 &&
            " The reporter details are still placeholders ([REPORTING ENTITY], [POINT OF CONTACT]); a production submission refuses them."}
        </p>
      )}
      {!status.ok ? (
        <p className={styles.error} role="alert">
          The CyberTipline status couldn&apos;t be loaded: {status.error.message} ({status.error.code}).
        </p>
      ) : report ? (
        <ReportCard report={report} operator={operator} config={config.ok ? config.data : null} />
      ) : status.data.eligible ? (
        <PrepareForm itemId={itemId} config={config.ok ? config.data : null} />
      ) : (
        <p className={ui.note} role="note">
          A CyberTipline report can be prepared only for an item under an active child-safety hold: a report of child sexual
          abuse material or sexual content involving a minor, or a match against a child-safety hash list.
        </p>
      )}
      {canceled.length > 0 && (
        <p className={styles.fine}>
          Canceled earlier:{" "}
          {canceled.map((r) => `${when(r.canceled_at)} by ${r.canceled_by ?? "—"}${r.cancel_note ? ` (${r.cancel_note})` : ""}`).join("; ")}
        </p>
      )}
    </section>
  );
}

function PrepareForm({ itemId, config }: { itemId: string; config: CybertipConfig | null }) {
  return (
    <div className={`${styles.panel} ${styles.wide}`}>
      <p className={styles.fine}>
        The draft is built from this item&apos;s metadata: the incident type and time, the account&apos;s identifiers, the content&apos;s
        digests and the held file. Nothing is sent until an admin reviews and confirms it.
      </p>
      <ActionForm action={prepareCybertip} submit="Prepare report draft" label="Prepare a CyberTipline report">
        <input type="hidden" name="item_id" value={itemId} />
        <div className={ui.row}>
          <label className={styles.field}>
            <span>Incident type</span>
            <select name="incident_type" defaultValue={config?.incident_types[0]}>
              {(config?.incident_types ?? []).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Industry classification</span>
            <select name="industry_classification" defaultValue="">
              <option value="">Not classified</option>
              {(config?.industry_classifications ?? ["A1", "A2", "B1", "B2"]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span>Note for NCMEC (optional)</span>
          <textarea name="additional_info" rows={3} maxLength={4000} />
        </label>
      </ActionForm>
    </div>
  );
}

function ReportCard({ report, operator, config }: { report: CybertipReport; operator: Operator; config: CybertipConfig | null }) {
  const open = SUBMITTABLE.includes(report.status);
  const env = config?.environment ?? "disabled";
  return (
    <div className={ui.card} data-cybertip-report={report.report_id} data-status={report.status}>
      <div className={ui.cardHead}>
        <h3 className={ui.cardTitle}>{report.incident_type}</h3>
        <span className={`${ui.badge} ${report.status === "failed" ? ui.urgent : ""}`} data-testid="cybertip-status">
          {CYBERTIP_STATUS_LABEL[report.status] ?? report.status}
        </span>
      </div>
      <dl className={ui.meta}>
        <div>
          <dt>Incident time</dt>
          <dd>{report.draft.incident.date_time}</dd>
        </div>
        <div>
          <dt>Reported account</dt>
          <dd className={styles.mono}>{report.draft.reported.esp_identifier ?? "—"}</dd>
        </div>
        <div>
          <dt>Account email</dt>
          <dd>{report.draft.reported.email ?? "—"}</dd>
        </div>
        <div>
          <dt>Service</dt>
          <dd>{report.draft.reported.esp_service ?? "—"}</dd>
        </div>
        <div>
          <dt>Prepared</dt>
          <dd>
            {when(report.created_at)} by {report.created_by}
          </dd>
        </div>
        <div>
          <dt>Viewed by an operator</dt>
          <dd>{report.viewed_by_esp ? "Yes" : "No"}</dd>
        </div>
        {report.confirmed_by && (
          <div>
            <dt>Confirmed</dt>
            <dd>
              {when(report.confirmed_at)} by {report.confirmed_by}
            </dd>
          </div>
        )}
        {report.environment && (
          <div>
            <dt>Sent to</dt>
            <dd>{environmentLabel(report.environment)}</dd>
          </div>
        )}
        {report.ncmec_report_id && (
          <div>
            <dt>NCMEC report id</dt>
            <dd className={styles.mono}>{report.ncmec_report_id}</dd>
          </div>
        )}
        {report.submitted_at && (
          <div>
            <dt>Submitted</dt>
            <dd>{when(report.submitted_at)}</dd>
          </div>
        )}
        {report.attempts > 0 && (
          <div>
            <dt>Attempts</dt>
            <dd>{report.attempts}</dd>
          </div>
        )}
        <div>
          <dt>Reporter</dt>
          <dd>
            {[report.reporter.first_name, report.reporter.last_name].filter(Boolean).join(" ")} · {report.reporter.email ?? "—"} ·{" "}
            {report.reporter.reporting_entity ?? "—"}
          </dd>
        </div>
      </dl>
      {report.last_error_code && (
        <p className={styles.error} role="alert">
          Last attempt failed: {report.last_error ?? "error"} ({report.last_error_code}).{" "}
          {open && "Confirming again resumes where it stopped."}
        </p>
      )}
      {report.draft.summary.length > 0 && <p className={ui.pre}>{report.draft.summary.join("\n")}</p>}
      {report.draft.additional_info && <p className={styles.fine}>Moderator note: {report.draft.additional_info}</p>}

      <h4 className={ui.cardTitle}>Files</h4>
      {report.files.length === 0 ? (
        <p className={styles.fine}>No file is attached: the gateway holds nothing it may send for this item.</p>
      ) : (
        <ul className={ui.list} aria-label="Files in this report">
          {report.files.map((f) => (
            <li key={f.file_id}>
              <dl className={ui.meta}>
                <div>
                  <dt>File</dt>
                  <dd>
                    {f.file_name} · {f.mime} · {bytes(f.size)}
                  </dd>
                </div>
                <div>
                  <dt>Kept as</dt>
                  <dd>{FILE_SOURCE_LABEL[f.source] ?? f.source}</dd>
                </div>
                <div>
                  <dt>SHA-256</dt>
                  <dd className={styles.mono}>{f.sha256}</dd>
                </div>
                {f.ncmec_file_id && (
                  <div>
                    <dt>NCMEC file id</dt>
                    <dd className={styles.mono}>{f.ncmec_file_id}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
      {report.report_xml && (
        <details className={ui.details}>
          <summary>Report XML{report.validated_at ? ` (validated ${when(report.validated_at)})` : ""}</summary>
          <pre className={ui.pre} aria-label="Report XML">
            {report.report_xml}
          </pre>
        </details>
      )}

      {open && (
        <details className={ui.details} open={report.status === "draft"}>
          <summary>Validate the draft</summary>
          <ActionForm action={dryRunCybertip} submit="Validate report" label="Validate this CyberTipline report">
            <input type="hidden" name="report_id" value={report.report_id} />
            <p className={styles.fine}>Builds the report XML and checks it against NCMEC&apos;s documented format. Nothing is sent.</p>
          </ActionForm>
        </details>
      )}
      {open && operator.isAdmin && (
        <details className={ui.details}>
          <summary>Review and confirm submission</summary>
          <ActionForm
            action={submitCybertip}
            submit={env === "disabled" ? "Confirm (dry run)" : "Confirm and submit to NCMEC"}
            label="Confirm this CyberTipline report"
            confirm={
              env === "disabled"
                ? "Confirm this report? Reporting is disabled on this gateway, so it is validated and stored, and nothing is sent."
                : `Submit this report to ${environmentLabel(env)}? Once NCMEC finishes it, it can't be recalled.`
            }
          >
            <input type="hidden" name="report_id" value={report.report_id} />
            <label className={ui.check}>
              <input type="checkbox" name="reviewed" required /> I reviewed this draft, its files and the reporter details.
            </label>
            <label className={styles.field}>
              <span>Note for the audit log</span>
              <textarea name="note" rows={2} maxLength={2000} required />
            </label>
          </ActionForm>
        </details>
      )}
      {open && operator.isAdmin && (
        <details className={ui.details}>
          <summary>Cancel this report</summary>
          <ActionForm action={cancelCybertip} submit="Cancel report" label="Cancel this CyberTipline report" confirm="Cancel this report?">
            <input type="hidden" name="report_id" value={report.report_id} />
            <label className={styles.field}>
              <span>Note for the audit log</span>
              <textarea name="note" rows={2} maxLength={2000} required />
            </label>
          </ActionForm>
        </details>
      )}
      {open && !operator.isAdmin && <p className={styles.fine}>An admin reviews the draft and confirms the submission.</p>}
    </div>
  );
}
