import type { Metadata } from "next";
import { Suspense } from "react";

import { Verifier } from "@/components/verify/Verifier";
// The verifier is carried over from the previous studio and uses its token names.
import "@/app/studio-compat.css";

export const metadata: Metadata = {
  title: "Verify a film — KunoWorld",
  description:
    "Drop in a video to read its KunoWorld certificate: which model made it, which sealed worker rendered it, and whether the signature matches the file.",
};

export default function Verify() {
  return (
    <>
      <header className="page-heading">
        <span className="section-kicker">CERTIFICATE CHECK</span>
        <h1>
          Every film can
          <br />
          <em>show its origin.</em>
        </h1>
        <p>
          A completed job returns a signed receipt naming the model, the worker, and the exact hash of the file. Drop a
          video in to read it back. No account, and nothing but the hash leaves your browser.
        </p>
      </header>

      <div className="inner-content">
        <div className="legacy-tokens">
          <Suspense fallback={null}>
            <Verifier />
          </Suspense>
        </div>

        <div className="notice">
          <strong>What this shows, and what it doesn&apos;t.</strong> A match proves a worker holding a specific key
          signed this exact file, and names the model and software image it was approved to run. Your browser checks the
          signature, that the worker&apos;s id derives from its own keys, and its evidence against the manifest the gateway serves (not an independently pinned copy).
          It proves nothing about an edited copy — re-encoding, trimming, or a platform&apos;s upload processing changes
          the hash. Hardware attestation is still simulated in this development preview.
        </div>

        <div className="about-copy">
          <h2>
            Looking one up
            <br />
            <em>reveals nothing.</em>
          </h2>
          <div>
            <p>
              Certificates are public by hash. The lookup returns the credits for a file — model, worker, timings,
              format — and never the prompt or the reference media, which were encrypted on your device and were never
              readable by the gateway.
            </p>
            <p>
              That is why a certificate link is safe to share: it lets someone confirm where a film came from without
              telling them how it was made.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
