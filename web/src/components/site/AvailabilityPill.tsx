import type { Availability } from "@/lib/shot";

import styles from "./AvailabilityPill.module.css";

/** Live status encoded in form: a filled dot for serving, hollow for not, a stripe for region-locked. */
export function AvailabilityPill({ availability, compact = false }: { availability: Availability; compact?: boolean }) {
  return (
    <span className={styles.pill} data-state={availability.state} data-compact={compact} title={availability.detail}>
      <span className={styles.mark} aria-hidden="true" />
      {availability.label}
    </span>
  );
}
