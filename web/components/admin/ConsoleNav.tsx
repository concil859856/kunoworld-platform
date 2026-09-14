"use client";

import { usePathname } from "next/navigation";

import styles from "./Admin.module.css";

export function ConsoleNav({ links }: { links: Array<{ href: string; label: string }> }) {
  const path = usePathname();
  return (
    <nav aria-label="Operator console" className={styles.nav}>
      {links.map((link) => {
        const current = link.href === "/admin" ? path === "/admin" : path === link.href || path.startsWith(`${link.href}/`);
        return (
          <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
