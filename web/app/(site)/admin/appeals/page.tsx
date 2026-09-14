import { resolveAppeal } from "@/app/(site)/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import { APPEAL_STATUS_LABEL, APPEAL_SUBJECT_LABEL, reasonLabel, when, type AdminAppeal } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

const STATUSES = ["open", "resolved", "all"] as const;
type Status = (typeof STATUSES)[number];

const text = (value: unknown): string => (value === null || value === undefined || value === "" ? "—" : String(value));
const time = (value: unknown): string => (typeof value === "number" ? when(value) : "—");

const RESTORE_NOTE = {
  yes: "Still stored under a hold: overturning restores it to the customer's library.",
  no: "Gone: overturning records the reversal, but the content can't be restored.",
};

/** The subject's record, as the gateway gives it: metadata only. Nothing on this page opens content. */
function subjectFacts(appeal: AdminAppeal): Array<[string, string]> {
  const s = appeal.subject ?? {};
  switch (appeal.subject_kind) {
    case "strike":
      return [
        ["Strike reason", text(s.reason)],
        ["Struck", time(s.created_at)],
        ["Job", text(s.job_id)],
        ["Live strikes in 30 days", text(s.strikes_30d)],
      ];
    case "restriction":
      return [
        ["Kind", text(s.kind)],
        ["Until", s.until === null ? "Until lifted" : time(s.until)],
        ["Source", text(s.source)],
        ["Reason (audit note)", text(s.reason)],
        ["Placed by", text(s.created_by)],
        ["In force", s.active ? "Yes" : "No"],
      ];
    case "removal":
      return [
        ["Job", text(s.job_id)],
        ["Mode", s.privacy === "standard" ? "Standard" : "Private"],
        ["Removed", time(s.removed_at)],
        ["Removed by", text(s.removed_by)],
        ["Content", s.content_restorable ? RESTORE_NOTE.yes : RESTORE_NOTE.no],
      ];
    default: {
      const facts: Array<[string, string]> = [
        ["Report", text(s.report_id)],
        ["Reason", typeof s.reason === "string" ? reasonLabel(s.reason) : "—"],
        ["Resolution", text(s.resolution)],
        ["Resolved", time(s.resolved_at)],
        ["Resolved by", text(s.resolved_by)],
        ["Resolution note", text(s.resolution_note)],
      ];
      if ("restriction_active" in s) facts.push(["Its restriction or ban in force", s.restriction_active ? "Yes" : "No"]);
      if ("content_restorable" in s) facts.push(["Content", s.content_restorable ? RESTORE_NOTE.yes : RESTORE_NOTE.no]);
      return facts;
    }
  }
}

export default async function Appeals({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const operator = await requireOperator();
  const requested = (await searchParams).status;
  const status: Status = STATUSES.includes(requested as Status) ? (requested as Status) : "open";
  const appeals = await adminApi<AdminAppeal[]>(operator, `/appeals?status=${status}&limit=200`);

  return (
    <section className={styles.section} aria-labelledby="appeals-title" style={{ marginTop: 0 }}>
      <h2 id="appeals-title" className={styles.sectionTitle}>
        Appeals
      </h2>
      <nav className={ui.filters} aria-label="Filter appeals">
        <span className={styles.fine}>Show:</span>
        {STATUSES.map((s) => (
          <a key={s} href={`/admin/appeals?status=${s}`} aria-current={s === status ? "page" : undefined}>
            {s === "open" ? "Open" : s === "resolved" ? "Decided" : "All"}
          </a>
        ))}
      </nav>
      <p className={styles.fine}>
        Customers appeal strikes, restrictions, removals and decisions on reports about them. Decide from the record:
        nothing here opens content. Upholding changes nothing. Overturning voids a strike, lifts a restriction or a
        report&apos;s ban, or restores removed content when a hold still keeps it. The customer is emailed the decision and
        your note, and both go in the audit log.
      </p>

      {!appeals.ok ? (
        <p className={styles.error} role="alert">
          Appeals couldn&apos;t be loaded: {appeals.error.message} ({appeals.error.code}).
        </p>
      ) : appeals.data.length === 0 ? (
        <p className={styles.fine}>No {status === "all" ? "" : status === "open" ? "open " : "decided "}appeals.</p>
      ) : (
        <ul className={ui.list} aria-label="Appeals">
          {appeals.data.map((appeal) => (
            <li key={appeal.appeal_id} id={`appeal-${appeal.appeal_id}`} className={ui.card} data-appeal={appeal.appeal_id}>
              <div className={ui.cardHead}>
                <h3 className={ui.cardTitle}>Appeal of {APPEAL_SUBJECT_LABEL[appeal.subject_kind] ?? appeal.subject_kind}</h3>
                <span className={ui.badge}>{APPEAL_STATUS_LABEL[appeal.status] ?? appeal.status}</span>
              </div>
              <dl className={ui.meta}>
                <div>
                  <dt>Account</dt>
                  <dd className={styles.mono}>
                    <a className="text-link" href={`/admin/accounts?account=${encodeURIComponent(appeal.account_id)}`}>
                      {appeal.account_id}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Sent</dt>
                  <dd>{when(appeal.created_at)}</dd>
                </div>
                {subjectFacts(appeal).map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                {appeal.resolved_at !== null && (
                  <div>
                    <dt>Decided</dt>
                    <dd>
                      {when(appeal.resolved_at)} by {appeal.resolved_by ?? "—"}
                      {appeal.notified_at ? " (customer emailed)" : ""}
                    </dd>
                  </div>
                )}
              </dl>
              <p className={styles.fine}>The customer&apos;s statement:</p>
              <p className={ui.pre} aria-label="Statement">
                {appeal.statement}
              </p>
              {appeal.status === "open" ? (
                <details className={ui.details}>
                  <summary>Decide this appeal</summary>
                  <ActionForm
                    action={resolveAppeal}
                    submit="Record decision"
                    label="Decide this appeal"
                    confirm="Record this decision? It takes effect now, and the customer is emailed it with your note."
                  >
                    <input type="hidden" name="appeal_id" value={appeal.appeal_id} />
                    <label className={styles.field}>
                      <span>Decision</span>
                      <select name="decision" defaultValue="" required>
                        <option value="" disabled>
                          Choose a decision
                        </option>
                        <option value="uphold">Uphold: the decision stands</option>
                        <option value="overturn">Overturn: reverse the decision</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Note (the customer reads it; it goes in the audit log)</span>
                      <textarea name="note" rows={3} maxLength={2000} required />
                    </label>
                  </ActionForm>
                </details>
              ) : (
                <>
                  {appeal.summary.map((line) => (
                    <p key={line} className={styles.fine}>
                      {line}
                    </p>
                  ))}
                  {appeal.note && <p className={ui.pre}>{appeal.note}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
