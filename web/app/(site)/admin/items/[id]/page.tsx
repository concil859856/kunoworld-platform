import { notFound } from "next/navigation";

import { placeHold, resolveItem } from "@/app/(site)/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import ui from "@/components/admin/Admin.module.css";
import { HoldCard } from "@/components/admin/HoldCard";
import { HoldFields } from "@/components/admin/HoldFields";
import { ItemContent, NOT_REVIEWABLE_NOTE } from "@/components/admin/ItemContent";
import { ResolveFields } from "@/components/admin/ResolveFields";
import styles from "@/components/site/Account.module.css";
import { SAFE_ID, accessLabel, contentReviewable, reasonLabel, when, type AdminItem } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

export default async function Item({ params }: { params: Promise<{ id: string }> }) {
  const operator = await requireOperator();
  const { id } = await params;
  if (!SAFE_ID.test(id)) notFound();
  const result = await adminApi<AdminItem>(operator, `/moderation/items/${encodeURIComponent(id)}`);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <p className={styles.error} role="alert">
        This item couldn&apos;t be loaded: {result.error.message} ({result.error.code}).
      </p>
    );
  }
  const item = result.data;
  const { report, job } = item;
  const reviewable = contentReviewable(item);
  const holds = [...item.holds, ...(job?.holds ?? []).filter((h) => !item.holds.some((x) => x.hold_id === h.hold_id))];
  // Reviewable, but nothing stored that can be opened: a private video with no key, or content already deleted.
  const nothingToOpen = Boolean(job) && !job?.has_video;

  return (
    <>
      <section className={styles.section} aria-labelledby="item-title" style={{ marginTop: 0 }}>
        <p className={styles.fine}>
          <a className="text-link" href="/admin/queue">
            ← Back to the queue
          </a>
        </p>
        <h2 id="item-title" className={styles.sectionTitle}>
          {report ? `Report: ${reasonLabel(report.reason)}` : item.kind.replace(/_/g, " ")}
        </h2>
        <dl className={ui.meta}>
          <div>
            <dt>Status</dt>
            <dd>{item.status === "open" ? "Open" : `Resolved: ${item.resolution ?? "—"}`}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{item.priority}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{when(item.created_at)}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd className={styles.mono}>
              {item.account_id && operator.isAdmin ? (
                <a className="text-link" href={`/admin/accounts?account=${encodeURIComponent(item.account_id)}`}>
                  {item.account_id}
                </a>
              ) : (
                (item.account_id ?? job?.account_id ?? "—")
              )}
            </dd>
          </div>
          {job && (
            <>
              <div>
                <dt>Job</dt>
                <dd className={styles.mono}>{job.job_id}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{job.privacy === "standard" ? "Standard" : "Private"}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{job.profile_id}</dd>
              </div>
              <div>
                <dt>Job status</dt>
                <dd>
                  {job.status}
                  {job.deleted ? ` · content ${job.deleted}` : ""}
                  {job.held ? " · held" : ""}
                </dd>
              </div>
              <div>
                <dt>Content digest</dt>
                <dd className={styles.mono}>{job.content_digest ?? "—"}</dd>
              </div>
            </>
          )}
          {report && (
            <>
              <div>
                <dt>Output key supplied</dt>
                <dd>{report.has_output_key ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Link reported</dt>
                <dd>{report.url ?? "—"}</dd>
              </div>
            </>
          )}
        </dl>
        {report?.details && <p className={ui.pre}>{report.details}</p>}
        {operator.isAdmin && (
          <p className={styles.fine}>
            <a className="text-link" href={`/admin/audit?target_id=${encodeURIComponent(item.item_id)}`}>
              Audit trail for this item
            </a>
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="content-title">
        <h2 id="content-title" className={styles.sectionTitle}>
          Content
        </h2>
        {!reviewable ? (
          <p className={ui.note} role="note" data-reviewable="false">
            {NOT_REVIEWABLE_NOTE}
          </p>
        ) : (
          <>
            <p className={styles.fine} data-reviewable="true">
              Can be opened under {accessLabel(item.content_access)}.
            </p>
            {job?.prompt && (
              <>
                <p className={styles.fine}>Prompt (showing it on this page was recorded in the audit log):</p>
                <p className={ui.pre} aria-label="Prompt">
                  {job.prompt}
                </p>
              </>
            )}
            {nothingToOpen ? (
              <p className={ui.note} role="note">
                {job?.privacy === "private"
                  ? "This is a private video and no output key was supplied, so nobody at KunoWorld can open it. Decide from the report, the job's details and the account's history."
                  : "This video's stored content is no longer there to open."}
              </p>
            ) : (
              <ItemContent itemId={item.item_id} />
            )}
          </>
        )}
      </section>

      {item.status === "open" && (
        <section className={styles.section} aria-labelledby="resolve-title">
          <h2 id="resolve-title" className={styles.sectionTitle}>
            Resolve
          </h2>
          <div className={`${styles.panel} ${styles.wide}`}>
            <ActionForm action={resolveItem} submit="Resolve item" label="Resolve this item">
              <input type="hidden" name="item_id" value={item.item_id} />
              <ResolveFields />
            </ActionForm>
          </div>
        </section>
      )}

      <section className={styles.section} aria-labelledby="item-holds-title">
        <h2 id="item-holds-title" className={styles.sectionTitle}>
          Preservation holds
        </h2>
        {holds.length === 0 ? (
          <p className={styles.fine}>No holds on this item.</p>
        ) : (
          <ul className={ui.list} aria-label="Holds on this item">
            {holds.map((hold) => (
              <HoldCard key={hold.hold_id} hold={hold} canRelease={operator.isAdmin} />
            ))}
          </ul>
        )}
        {job && (
          <details className={ui.details}>
            <summary>Place a hold on this job</summary>
            <ActionForm action={placeHold} submit="Place hold" label="Place a hold on this job">
              <HoldFields
                jobId={job.job_id}
                reason={report?.reason === "csam" ? "report_csam" : report?.reason === "sexual_minor" ? "report_sexual_minor" : undefined}
              />
            </ActionForm>
          </details>
        )}
      </section>
    </>
  );
}
