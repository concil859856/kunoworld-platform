"use client";

import Link from "next/link";

import { DropZone } from "@/components/verify/DropZone";
import { EndCredits } from "@/components/verify/EndCredits";
import { useCertificate } from "@/components/verify/useCertificate";
import { utcStamp } from "@/lib/format";

import styles from "./CheckFilm.module.css";

/** The landing page's live certificate check. Hashes locally; only the SHA-256 is sent. */
export function CheckFilm() {
  const { state, checkFile, reset } = useCertificate();
  const busy = state.kind === "hashing" || state.kind === "looking";

  return (
    <div className={styles.check}>
      <DropZone
        onFile={(file) => void checkFile(file)}
        busy={busy}
        size="small"
        inputId="landing-check"
        title={busy ? (state.kind === "hashing" ? "Hashing in your browser…" : "Looking up the certificate…") : "Drop a video to check it"}
        hint="Only the file's SHA-256 fingerprint leaves your browser."
      />
      <div className={styles.result} aria-live="polite">
        {state.kind === "idle" && (
          <p className={styles.placeholder}>
            Any film made on KunoWorld can be checked by anyone, without an account. Try one you downloaded from the
            studio.
          </p>
        )}
        {state.kind === "missing" && (
          <div className={styles.missing}>
            <p className={`display ${styles.missingTitle}`}>No KunoWorld certificate matches this file.</p>
            <p className="muted">
              Edited, re-encoded or re-uploaded copies have a different hash, so they won&apos;t match either.
            </p>
            <button type="button" className="btn btn-small" onClick={reset}>
              Try another
            </button>
          </div>
        )}
        {state.kind === "error" && (
          <div className={styles.error} role="alert">
            <strong>{state.error.title}</strong> <span>{state.error.detail}</span>
          </div>
        )}
        {state.kind === "found" && (
          <EndCredits
            variant="compact"
            lines={[
              { role: "Model", value: state.prov.model.name },
              ...(state.prov.model.attribution ? [{ role: "Attribution", value: state.prov.model.attribution }] : []),
              {
                role: "Signature",
                value: state.checks.signature && state.prov.signature_valid ? "Valid ✓" : "Invalid ✗",
                tone: state.checks.signature && state.prov.signature_valid ? "ok" : "bad",
              },
              { role: "Rendered", value: utcStamp(state.prov.receipt.body.finished_at) },
              { role: "Content hash", value: state.digest, mono: true },
            ]}
            footer={
              <Link className="link" href={`/verify?sha256=${state.digest}`}>
                Read the full certificate
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
