import { changeRole } from "@/app/(site)/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import { MAX_OPERATOR_EMAIL, when, type RoleRow } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

export default async function Roles() {
  const operator = await requireOperator("admin");
  const roles = await adminApi<RoleRow[]>(operator, "/roles");

  return (
    <>
      <section className={styles.section} aria-labelledby="roles-title" style={{ marginTop: 0 }}>
        <h2 id="roles-title" className={styles.sectionTitle}>
          Operator roles
        </h2>
        <p className={styles.fine}>
          Operators sign in with their own email; there is no shared admin token. <strong>Moderators</strong> work reports
          and the queue, resolve items with any action (including restricting or banning), place holds and read account
          safety. <strong>Admins</strong> can also release holds, restrict and unrestrict accounts directly, record
          credit, read the audit log and change roles. Every change is in the audit log.
        </p>
        <div className={`${styles.panel} ${styles.wide}`}>
          <ActionForm action={changeRole} submit="Save role change" label="Change an operator role" confirm="Change this person's operator role?">
            <div className={ui.row}>
              <label className={styles.field}>
                <span>Email address (at most {MAX_OPERATOR_EMAIL} characters)</span>
                <input name="email" type="email" maxLength={MAX_OPERATOR_EMAIL} autoComplete="off" required />
              </label>
              <label className={styles.field}>
                <span>Role</span>
                <select name="role" defaultValue="moderator">
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Change</span>
                <select name="change" defaultValue="grant">
                  <option value="grant">Grant</option>
                  <option value="revoke">Revoke</option>
                </select>
              </label>
            </div>
          </ActionForm>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="current-roles-title">
        <h2 id="current-roles-title" className={styles.sectionTitle}>
          Current operators
        </h2>
        {!roles.ok ? (
          <p className={styles.error} role="alert">
            Roles couldn&apos;t be loaded: {roles.error.message} ({roles.error.code}).
          </p>
        ) : roles.data.length === 0 ? (
          <p className={styles.fine}>No operators yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Current operators">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Granted</th>
                  <th scope="col">By</th>
                </tr>
              </thead>
              <tbody>
                {roles.data.map((row) => (
                  <tr key={`${row.user_id}-${row.role}`}>
                    <td>{row.email}</td>
                    <td>{row.role}</td>
                    <td>{when(row.granted_at)}</td>
                    <td>{row.granted_by ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
