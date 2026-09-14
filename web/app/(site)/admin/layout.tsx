import type { Metadata } from "next";
import type { ReactNode } from "react";

import ui from "@/components/admin/Admin.module.css";
import { ConsoleNav } from "@/components/admin/ConsoleNav";
import { ConsoleStatus } from "@/components/admin/ConsoleStatus";
import styles from "@/components/site/Account.module.css";
import { requireOperator } from "@/lib/operator.server";

export const metadata: Metadata = {
  title: "Operator console — KunoWorld",
  robots: { index: false, follow: false },
};

// One operator's view of live moderation data: rendered on every request, never cached.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const operator = await requireOperator();
  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/queue", label: "Queue" },
    { href: "/admin/appeals", label: "Appeals" },
    { href: "/admin/holds", label: "Holds" },
    { href: "/admin/cybertip", label: "CyberTipline" },
    { href: "/admin/accounts", label: "Accounts" },
    ...(operator.isAdmin
      ? [
          { href: "/admin/roles", label: "Roles" },
          { href: "/admin/audit", label: "Audit log" },
        ]
      : []),
  ];
  return (
    <div className={`${styles.account} ${ui.console}`}>
      <header className="page-heading">
        <span className="section-kicker">OPERATOR CONSOLE</span>
        <h1 className={ui.title}>Operator console</h1>
        <p>
          Signed in as {operator.me.user.email} ({operator.roles.join(", ")}). Content opens only for reports of child
          sexual abuse material or sexual content involving a minor while the report is open, or under a legal hold.
          Every view and action is recorded in the audit log under your name.
        </p>
      </header>
      <div className="inner-content">
        <ConsoleNav links={links} />
        <ConsoleStatus />
        {children}
      </div>
    </div>
  );
}
