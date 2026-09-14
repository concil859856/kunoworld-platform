import type { Eligibility } from "@kunoworld/sdk";

import { eligibilityReason, restrictionUntil } from "@/lib/privacy-copy";

import styles from "./Account.module.css";

/** The account page's "Private mode" block, from GET /v1/me/eligibility. */
export function PrivateModeStatus({ eligibility }: { eligibility: Eligibility | null }) {
  if (!eligibility) {
    return (
      <p className={styles.fine}>
        Private mode status isn&apos;t available right now. If the studio can&apos;t make a private take, it says why.
      </p>
    );
  }

  const { private_mode: mode, restricted_until: until, strikes_24h: day, strikes_7d: week } = eligibility;
  return (
    <div className={`${styles.panel} ${styles.wide}`} data-eligible={mode.eligible}>
      {mode.eligible ? (
        <p className={styles.success}>
          <strong>Private mode is on for this account.</strong>
        </p>
      ) : (
        <p className={styles.error}>
          <strong>Private mode isn&apos;t available on this account yet.</strong>
        </p>
      )}
      <p className={styles.fine}>
        Private takes are encrypted in your browser and rendered only on confidential GPUs, so nobody at KunoWorld can
        see them. Standard takes are readable by KunoWorld and the GPU provider.
      </p>

      {!mode.eligible && mode.reasons.length > 0 && (
        <ul className={styles.list} aria-label="Why private mode isn't available">
          {mode.reasons.map((reason) => (
            <li key={reason}>{eligibilityReason(reason)}</li>
          ))}
        </ul>
      )}
      {!mode.eligible && (
        <div className={styles.actions}>
          <a className="text-link" href="#add-credit">
            Add credit
          </a>
        </div>
      )}

      {until !== null && (
        <p className={styles.error}>
          This account is restricted {restrictionUntil(until)}. No new videos can be made, in either mode, while it
          lasts.
        </p>
      )}

      <dl className={styles.facts}>
        <div>
          <dt>Strikes in the last 24 hours</dt>
          <dd data-strikes="24h">{day}</dd>
        </div>
        <div>
          <dt>Strikes in the last 7 days</dt>
          <dd data-strikes="7d">{week}</dd>
        </div>
      </dl>
      <p className={styles.fine}>
        A strike is a take the content policy blocked, in either mode, or a standard upload the scan refused. A blocked
        take only reports that it was blocked, never what. By default, 3 strikes in 24 hours pause the account for an hour, 5 in 7 days for a week, and 10 in 30
        days until someone reviews it. Private mode also needs fewer than 2 strikes in 30 days.
      </p>
    </div>
  );
}
