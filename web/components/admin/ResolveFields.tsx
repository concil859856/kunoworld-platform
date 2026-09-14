import styles from "@/components/site/Account.module.css";
import { RESOLVE_ACTIONS } from "@/lib/admin-types";

import ui from "./Admin.module.css";

/** The fields every resolve form shares: the action, how long a restriction lasts, and the note. */
export function ResolveFields() {
  return (
    <>
      <div className={ui.row}>
        <label className={styles.field}>
          <span>Action</span>
          <select name="action" defaultValue="" required>
            <option value="" disabled>
              Choose an action
            </option>
            {RESOLVE_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Restriction length in days (restrict only)</span>
          <input name="days" type="number" min={1} max={3650} step={1} placeholder="7" inputMode="numeric" />
        </label>
      </div>
      <label className={styles.field}>
        <span>Note for the audit log</span>
        <textarea name="note" rows={2} maxLength={2000} required />
      </label>
    </>
  );
}
