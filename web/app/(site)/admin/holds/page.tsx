import { placeHold } from "@/app/(site)/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import ui from "@/components/admin/Admin.module.css";
import { HoldCard } from "@/components/admin/HoldCard";
import { HoldFields } from "@/components/admin/HoldFields";
import styles from "@/components/site/Account.module.css";
import type { AdminHold } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

const STATUSES = ["active", "released", "all"] as const;
type Status = (typeof STATUSES)[number];

export default async function Holds({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const operator = await requireOperator();
  const requested = (await searchParams).status;
  const status: Status = STATUSES.includes(requested as Status) ? (requested as Status) : "active";
  const holds = await adminApi<AdminHold[]>(operator, `/holds?status=${status}&limit=200`);

  return (
    <>
      <section className={styles.section} aria-labelledby="place-hold-title" style={{ marginTop: 0 }}>
        <h2 id="place-hold-title" className={styles.sectionTitle}>
          Place a preservation hold
        </h2>
        <p className={styles.fine}>
          A hold keeps a job&apos;s stored content even if its owner deletes it, for a report of child sexual abuse
          material or a legal request. Content under a legal hold can be opened from its queue item, and every view is
          logged. {operator.isAdmin ? "" : "Only admins can release holds."}
        </p>
        <div className={`${styles.panel} ${styles.wide}`}>
          <ActionForm action={placeHold} submit="Place hold" label="Place a hold">
            <HoldFields />
          </ActionForm>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="holds-title">
        <h2 id="holds-title" className={styles.sectionTitle}>
          Holds
        </h2>
        <nav className={ui.filters} aria-label="Filter holds">
          <span className={styles.fine}>Show:</span>
          {STATUSES.map((s) => (
            <a key={s} href={`/admin/holds?status=${s}`} aria-current={s === status ? "page" : undefined}>
              {s === "active" ? "Active" : s === "released" ? "Released" : "All"}
            </a>
          ))}
        </nav>
        {!holds.ok ? (
          <p className={styles.error} role="alert">
            Holds couldn&apos;t be loaded: {holds.error.message} ({holds.error.code}).
          </p>
        ) : holds.data.length === 0 ? (
          <p className={styles.fine}>No {status === "all" ? "" : status} holds.</p>
        ) : (
          <ul className={ui.list} aria-label="Holds">
            {holds.data.map((hold) => (
              <HoldCard key={hold.hold_id} hold={hold} canRelease={operator.isAdmin} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
