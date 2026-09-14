import styles from "@/components/site/Account.module.css";
import { HOLD_REASONS } from "@/lib/admin-types";

import ui from "./Admin.module.css";

/** Placing a preservation hold: on a job or an upload, with a reason, an optional length and a note. */
export function HoldFields({ jobId, uploadId, reason }: { jobId?: string; uploadId?: string; reason?: string }) {
  return (
    <>
      <div className={ui.row}>
        <label className={styles.field}>
          <span>Job id</span>
          <input name="job_id" defaultValue={jobId} autoComplete="off" spellCheck={false} />
        </label>
        <label className={styles.field}>
          <span>Or upload id</span>
          <input name="upload_id" defaultValue={uploadId} autoComplete="off" spellCheck={false} />
        </label>
      </div>
      <div className={ui.row}>
        <label className={styles.field}>
          <span>Reason</span>
          <select name="reason" defaultValue={reason ?? ""} required>
            <option value="" disabled>
              Choose a reason
            </option>
            {HOLD_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Days (empty for the default)</span>
          <input name="days" type="number" min={1} max={3650} step={1} inputMode="numeric" />
        </label>
      </div>
      <label className={styles.field}>
        <span>Note for the audit log</span>
        <textarea name="note" rows={2} maxLength={2000} required />
      </label>
    </>
  );
}
