import type { Metadata } from "next";
import { Suspense } from "react";

import { Verifier } from "@/components/verify/Verifier";

import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Verify a film",
  description: "Drag in a video to check its KunoWorld certificate: which model made it, on which sealed hardware, signed by the stage.",
};

export default function VerifyPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <p className="eyebrow">Certificate check</p>
        <h1 className={`display ${styles.title}`}>
          Check any <em>KunoWorld</em> film.
        </h1>
        <p className={styles.lede}>
          Every film a sealed stage delivers carries a signed receipt: the model that made it, the hardware it ran on, and
          the exact hash of the file. Drop a video in to read its credits. No account needed.
        </p>
      </header>
      <div className={styles.narrow}>
        <Suspense fallback={null}>
          <Verifier />
        </Suspense>
      </div>
      <section className={styles.notes} aria-labelledby="verify-notes">
        <h2 id="verify-notes" className="eyebrow">
          What the check proves — and what it doesn&apos;t
        </h2>
        <ul role="list">
          <li>
            <strong>It proves</strong> that a stage with a specific key signed this exact file, and names the model and
            software image that stage was approved to run.
          </li>
          <li>
            <strong>Checked in your browser:</strong> the receipt signature against the stage&apos;s key, that the stage id
            is derived from its keys, and the stage&apos;s hardware evidence against the published manifest.
          </li>
          <li>
            <strong>It doesn&apos;t prove</strong> anything about an edited copy. Any change to the file — re-encoding,
            trimming, a social platform&apos;s processing — changes the hash.
          </li>
          <li>
            Certificates are public by hash. Looking one up reveals nothing about the prompt or the inputs; those were
            never visible to us.
          </li>
        </ul>
      </section>
    </div>
  );
}
