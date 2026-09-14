import { gateway } from "@/lib/gateway.server";

import styles from "./Account.module.css";
import { CloseAccount, type ClosurePreview } from "./CloseAccount";
import { DataExport, type ExportRow } from "./DataExport";

/**
 * The account page's "Your data" section: a copy of everything the account holds, and closing the account. On a
 * gateway without these routes, both parts say they aren't available instead of failing the page.
 */
export async function YourData({ token, closing = false }: { token: string; closing?: boolean }) {
  const [exports, preview] = await Promise.all([
    gateway<ExportRow[]>("/v1/me/exports?limit=10", { token }),
    gateway<ClosurePreview>("/v1/me/close", { token }),
  ]);
  return (
    <section id="your-data" className={styles.section} aria-labelledby="your-data-title">
      <h2 id="your-data-title" className={styles.sectionTitle}>
        Your data
      </h2>
      <DataExport initialExports={exports.ok ? exports.data : null} />
      <CloseAccount preview={preview.ok ? preview.data : null} initiallyOpen={closing} />
    </section>
  );
}
