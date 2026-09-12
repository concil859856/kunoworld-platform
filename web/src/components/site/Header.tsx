"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ConnectButton } from "./ConnectDialog";
import styles from "./Header.module.css";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/verify", label: "Verify" },
  { href: "/network", label: "Network" },
  { href: "/developers", label: "Developers" },
];

export function Header({ variant = "site" }: { variant?: "site" | "studio" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header} data-variant={variant}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Link href="/" className={styles.wordmark} aria-label="KunoWorld, home">
        <span aria-hidden="true">
          Kuno<em>World</em>
        </span>
      </Link>
      <nav aria-label="Primary" className={styles.nav} data-open={open}>
        <ul role="list" id="primary-nav">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname?.startsWith(item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.actions}>
        <ConnectButton />
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">Menu</span>
          <span className={styles.menuIcon} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
