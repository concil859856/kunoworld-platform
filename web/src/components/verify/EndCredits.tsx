import type { ReactNode } from "react";

import styles from "./EndCredits.module.css";

export interface CreditLine {
  role: string;
  value: ReactNode;
  /** Hashes and ids: set in monospace and allowed to break anywhere. */
  mono?: boolean;
  tone?: "ok" | "bad";
  note?: ReactNode;
}

/** A certificate laid out like a film's end credits: role on the left, credit on the right. */
export function EndCredits({
  kicker = "A KunoWorld film",
  title = "Certificate",
  lines,
  footer,
  variant = "full",
  id,
}: {
  kicker?: string;
  title?: ReactNode;
  lines: CreditLine[];
  footer?: ReactNode;
  variant?: "full" | "compact";
  id?: string;
}) {
  return (
    <section className={styles.credits} data-variant={variant} aria-labelledby={id}>
      <p className={styles.kicker}>{kicker}</p>
      <h3 id={id} className={`display ${styles.title}`}>
        {title}
      </h3>
      <dl className={styles.list}>
        {lines.map((line) => (
          <div key={line.role} className={styles.row} data-tone={line.tone}>
            <dt>{line.role}</dt>
            <dd>
              <span className={line.mono ? styles.mono : styles.name}>{line.value}</span>
              {line.note && <span className={styles.note}>{line.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {footer && <div className={styles.footer}>{footer}</div>}
    </section>
  );
}
