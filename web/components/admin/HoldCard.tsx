import { releaseHold } from "@/app/(site)/admin/actions";
import styles from "@/components/site/Account.module.css";
import { HOLD_REASON_LABEL, when, type AdminHold } from "@/lib/admin-types";

import { ActionForm } from "./ActionForm";
import ui from "./Admin.module.css";

export function HoldCard({ hold, canRelease }: { hold: AdminHold; canRelease: boolean }) {
  return (
    <li className={ui.card} data-hold={hold.hold_id} data-status={hold.status}>
      <div className={ui.cardHead}>
        <h3 className={ui.cardTitle}>{HOLD_REASON_LABEL[hold.reason] ?? hold.reason}</h3>
        <span className={ui.badge}>{hold.status}</span>
      </div>
      <dl className={ui.meta}>
        <div>
          <dt>Target</dt>
          <dd className={styles.mono}>{hold.job_id ? `job ${hold.job_id}` : `upload ${hold.upload_id ?? "—"}`}</dd>
        </div>
        <div>
          <dt>Placed</dt>
          <dd>
            {when(hold.created_at)} by {hold.created_by}
          </dd>
        </div>
        <div>
          <dt>Ends</dt>
          <dd>{when(hold.expires_at)}</dd>
        </div>
        {hold.released_at && (
          <div>
            <dt>Released</dt>
            <dd>
              {when(hold.released_at)} by {hold.released_by ?? "—"}
            </dd>
          </div>
        )}
        <div>
          <dt>Output key held</dt>
          <dd>{hold.has_output_key ? "Yes" : "No"}</dd>
        </div>
      </dl>
      {hold.note && <p className={styles.fine}>Note: {hold.note}</p>}
      {hold.release_note && <p className={styles.fine}>Release note: {hold.release_note}</p>}
      {canRelease && hold.status === "active" && (
        <details className={ui.details}>
          <summary>Release this hold</summary>
          <ActionForm
            action={releaseHold}
            submit="Release hold"
            label={`Release hold ${hold.hold_id}`}
            confirm="Release this hold? Content the owner already deleted is then deleted for good."
          >
            <input type="hidden" name="hold_id" value={hold.hold_id} />
            <label className={styles.field}>
              <span>Note for the audit log</span>
              <textarea name="note" rows={2} maxLength={2000} required />
            </label>
          </ActionForm>
        </details>
      )}
    </li>
  );
}
