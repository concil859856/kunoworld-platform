import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import { contentReviewable, reasonLabel, when, type AdminItem } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

const STATUSES = ["open", "resolved"] as const;
type Status = (typeof STATUSES)[number];

const KIND_LABEL: Record<string, string> = {
  report: "Report",
  appeal: "Appeal",
  upload_blocked: "Blocked upload",
  strike_threshold: "Strike threshold",
};

export default async function Queue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const operator = await requireOperator();
  const requested = (await searchParams).status;
  const status: Status = STATUSES.includes(requested as Status) ? (requested as Status) : "open";
  const items = await adminApi<AdminItem[]>(operator, `/moderation/queue?status=${status}&limit=200`);

  return (
    <section className={styles.section} aria-labelledby="queue-title" style={{ marginTop: 0 }}>
      <h2 id="queue-title" className={styles.sectionTitle}>
        Moderation queue
      </h2>
      <nav className={ui.filters} aria-label="Filter the queue">
        <span className={styles.fine}>Show:</span>
        {STATUSES.map((s) => (
          <a key={s} href={`/admin/queue?status=${s}`} aria-current={s === status ? "page" : undefined}>
            {s === "open" ? "Open" : "Resolved"}
          </a>
        ))}
      </nav>
      <p className={styles.fine}>Highest priority first, then oldest. There is no sampled review of new videos.</p>

      {!items.ok ? (
        <p className={styles.error} role="alert">
          The queue couldn&apos;t be loaded: {items.error.message} ({items.error.code}).
        </p>
      ) : items.data.length === 0 ? (
        <p className={styles.fine}>Nothing {status} in the queue.</p>
      ) : (
        <ul className={ui.list} aria-label="Queue items">
          {items.data.map((item) => (
            <li key={item.item_id} className={ui.card} data-item={item.item_id}>
              <div className={ui.cardHead}>
                <h3 className={ui.cardTitle}>
                  <a className="text-link" href={`/admin/items/${encodeURIComponent(item.item_id)}`}>
                    {KIND_LABEL[item.kind] ?? item.kind}
                    {item.report ? `: ${reasonLabel(item.report.reason)}` : ""}
                  </a>
                </h3>
                <span className={`${ui.badge} ${item.priority >= 100 ? ui.urgent : ""}`}>Priority {item.priority}</span>
              </div>
              <dl className={ui.meta}>
                <div>
                  <dt>Created</dt>
                  <dd>{when(item.created_at)}</dd>
                </div>
                <div>
                  <dt>Job</dt>
                  <dd className={styles.mono}>{item.job ? `${item.job.job_id} (${item.job.privacy})` : "—"}</dd>
                </div>
                <div>
                  <dt>Content</dt>
                  <dd>{contentReviewable(item) ? "Can be opened (logged)" : "Can't be opened for this type"}</dd>
                </div>
                {item.status === "resolved" && (
                  <div>
                    <dt>Resolution</dt>
                    <dd>{item.resolution ?? "—"}</dd>
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
