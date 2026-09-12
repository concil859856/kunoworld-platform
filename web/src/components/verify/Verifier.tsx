"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { bytes } from "@/lib/format";

import { CertificateView } from "./CertificateView";
import { DropZone } from "./DropZone";
import { useCertificate, type CertificateState } from "./useCertificate";
import styles from "./Verifier.module.css";

export function Verifier() {
  const params = useSearchParams();
  const { state, checkFile, checkDigest, reset } = useCertificate();
  const [hashInput, setHashInput] = useState("");
  const fromUrl = params.get("sha256");
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (fromUrl && started.current !== fromUrl) {
      started.current = fromUrl;
      void checkDigest(fromUrl);
    }
  }, [fromUrl, checkDigest]);

  function onHash(e: FormEvent) {
    e.preventDefault();
    if (hashInput.trim()) void checkDigest(hashInput);
  }

  const busy = state.kind === "hashing" || state.kind === "looking";

  return (
    <div className={styles.verifier}>
      <DropZone
        onFile={(f) => void checkFile(f)}
        busy={busy}
        inputId="verify-file"
        title={busy ? "Checking…" : "Drop a video here, or choose a file"}
        hint="The file is hashed in your browser. Only its SHA-256 fingerprint is sent to look up the certificate — never the video."
      />

      <form className={styles.hashForm} onSubmit={onHash}>
        <label htmlFor="verify-hash" className={styles.hashLabel}>
          Or look up a SHA-256
        </label>
        <div className={styles.hashRow}>
          <input
            id="verify-hash"
            className={styles.hashInput}
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            placeholder="64 hexadecimal characters"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-small" disabled={busy || !hashInput.trim()}>
            Look up
          </button>
        </div>
      </form>

      <div aria-live="polite" className={styles.result}>
        <Result state={state} onReset={reset} />
      </div>
    </div>
  );
}

function FileLine({ state }: { state: CertificateState }) {
  if (state.kind === "idle") return null;
  const file = "file" in state ? state.file : undefined;
  const digest = "digest" in state ? state.digest : undefined;
  return (
    <div className={styles.fileLine}>
      {file && (
        <span>
          {file.name} · {bytes(file.size)}
        </span>
      )}
      {digest && (
        <span className="mono">
          <span className={styles.shaLabel}>SHA-256</span> {digest}
        </span>
      )}
    </div>
  );
}

function Result({ state, onReset }: { state: CertificateState; onReset: () => void }) {
  switch (state.kind) {
    case "idle":
      return null;
    case "hashing":
      return (
        <>
          <FileLine state={state} />
          <p className={styles.status}>Hashing in your browser…</p>
        </>
      );
    case "looking":
      return (
        <>
          <FileLine state={state} />
          <p className={styles.status}>Looking up the certificate…</p>
        </>
      );
    case "missing":
      return (
        <>
          <FileLine state={state} />
          <div className={styles.missing}>
            <p className={`display ${styles.missingTitle}`}>No KunoWorld certificate matches this file.</p>
            <p>
              Certificates match the exact file a stage delivered. Re-encoding, trimming or a platform&apos;s upload
              processing changes the hash, so an edited copy of a real KunoWorld film won&apos;t match either.
            </p>
            <button type="button" className="btn btn-small" onClick={onReset}>
              Check another file
            </button>
          </div>
        </>
      );
    case "error":
      return (
        <>
          <FileLine state={state} />
          <div className={styles.error} role="alert">
            <strong>{state.error.title}</strong>
            {state.error.detail && <span>{state.error.detail}</span>}
          </div>
        </>
      );
    case "found":
      return (
        <>
          <FileLine state={state} />
          <CertificateView prov={state.prov} checks={state.checks} id="certificate-title" />
          <p className={styles.after}>
            Share this certificate:{" "}
            <Link className="link" href={`/verify?sha256=${state.digest}`}>
              kunoworld.com/verify?sha256={state.digest.slice(0, 12)}…
            </Link>
          </p>
        </>
      );
  }
}
