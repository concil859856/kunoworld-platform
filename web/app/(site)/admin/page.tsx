import ui from "@/components/admin/Admin.module.css";
import styles from "@/components/site/Account.module.css";
import type { AdminHold, AdminItem, AdminReport } from "@/lib/admin-types";
import { adminApi, requireOperator } from "@/lib/operator.server";

export default async function ConsoleOverview() {
  const operator = await requireOperator();
  const [reports, queue, holds] = await Promise.all([
    adminApi<AdminReport[]>(operator, "/reports?status=open&limit=500"),
    adminApi<AdminItem[]>(operator, "/moderation/queue?status=open&limit=500"),
    adminApi<AdminHold[]>(operator, "/holds?status=active&limit=500"),
  ]);
  const count = (r: { ok: boolean; data?: unknown[] }) => (r.ok && Array.isArray(r.data) ? String(r.data.length) : "—");
  const urgent = reports.ok ? reports.data.filter((r) => r.reason === "csam" || r.reason === "sexual_minor").length : 0;

  const tiles = [
    { href: "/admin/reports", label: "Open reports", value: count(reports), note: urgent ? `${urgent} about children, first in line` : "" },
    { href: "/admin/queue", label: "Open queue items", value: count(queue), note: "" },
    { href: "/admin/holds", label: "Active holds", value: count(holds), note: "" },
  ];

  return (
    <section className={styles.section} aria-labelledby="overview-title" style={{ marginTop: 0 }}>
      <h2 id="overview-title" className={styles.sectionTitle}>
        Overview
      </h2>
      <ul className={ui.list}>
        {tiles.map((tile) => (
          <li key={tile.href} className={ui.card}>
            <a className="text-link" href={tile.href}>
              {tile.label}
            </a>
            <strong className={styles.balance}>{tile.value}</strong>
            {tile.note && <span className={`${ui.badge} ${ui.urgent}`}>{tile.note}</span>}
          </li>
        ))}
      </ul>
      {(!reports.ok || !queue.ok || !holds.ok) && (
        <p className={styles.error} role="alert">
          Some counts couldn&apos;t be loaded from the gateway.
        </p>
      )}
      <p className={styles.fine}>
        There is no sampled review of new videos. Other reports are decided without opening the content: from the
        report, the job&apos;s details and the account&apos;s history.
      </p>
    </section>
  );
}
