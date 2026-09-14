"use client";

import { KeySyncPanel } from "@/components/studio/KeySyncPanel";
import { useKeySync } from "@/lib/useKeySync";

import styles from "./Account.module.css";

/** The account page's "Keys & recovery" section: key sync status, unlockers, rotation and turning it off. */
export function KeysAndRecovery({ accountId }: { accountId: string | null }) {
  const sync = useKeySync(accountId);
  return (
    <section id="keys-and-recovery" className={styles.section} aria-labelledby="keys-and-recovery-title">
      <h2 id="keys-and-recovery-title" className={styles.sectionTitle}>
        Keys &amp; recovery
      </h2>
      <p className={styles.fine}>
        Private videos open only with their keys. Key sync keeps those keys, encrypted in your browser, so you can open your private
        videos on any device you sign in on, with a recovery code only you hold or a passkey. KunoWorld stores only the encrypted keys:
        it can&apos;t open them, and it can&apos;t recover a lost recovery code. Backing up keys to a file in the studio still works.
      </p>
      <div className={`${styles.panel} ${styles.wide}`}>
        <KeySyncPanel sync={sync} variant="account" />
      </div>
    </section>
  );
}
