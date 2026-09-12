"use client";

import { KunoError, sha256Hex, type GoldenManifest, type Provenance } from "@kunoworld/sdk";
import { useCallback, useRef, useState } from "react";

import { checkCertificate, type CertificateChecks } from "@/lib/certificate";
import { friendlyError, type FriendlyError } from "@/lib/errors";
import { lookupDigest, makeClient } from "@/lib/kuno";

export interface FileMeta {
  name: string;
  size: number;
}

export type CertificateState =
  | { kind: "idle" }
  | { kind: "hashing"; file: FileMeta }
  | { kind: "looking"; file?: FileMeta; digest: string }
  | { kind: "found"; file?: FileMeta; digest: string; prov: Provenance; checks: CertificateChecks }
  | { kind: "missing"; file?: FileMeta; digest: string }
  | { kind: "error"; file?: FileMeta; digest?: string; error: FriendlyError };

let manifestPromise: Promise<GoldenManifest | null> | null = null;
function manifestOnce(): Promise<GoldenManifest | null> {
  manifestPromise ??= makeClient()
    .manifest()
    .catch(() => {
      manifestPromise = null;
      return null;
    });
  return manifestPromise;
}

/** Hash a file locally and look up its certificate. Only the SHA-256 leaves the browser. */
export function useCertificate() {
  const [state, setState] = useState<CertificateState>({ kind: "idle" });
  const run = useRef(0);

  const settle = useCallback(
    async (ticket: number, digest: string, file: FileMeta | undefined, lookup: () => Promise<Provenance>) => {
      try {
        const [prov, manifest] = await Promise.all([lookup(), manifestOnce()]);
        if (ticket !== run.current) return;
        setState({ kind: "found", file, digest, prov, checks: checkCertificate(prov, file ? digest : null, manifest) });
      } catch (err) {
        if (ticket !== run.current) return;
        if (err instanceof KunoError && err.status === 404) setState({ kind: "missing", file, digest });
        else setState({ kind: "error", file, digest, error: friendlyError(err, "lookup") });
      }
    },
    [],
  );

  const checkFile = useCallback(
    async (file: File) => {
      const ticket = ++run.current;
      const meta = { name: file.name, size: file.size };
      setState({ kind: "hashing", file: meta });
      let bytes: Uint8Array;
      let digest: string;
      try {
        bytes = new Uint8Array(await file.arrayBuffer());
        digest = await sha256Hex(bytes);
      } catch (err) {
        if (ticket === run.current) setState({ kind: "error", file: meta, error: friendlyError(err, "lookup") });
        return;
      }
      if (ticket !== run.current) return;
      setState({ kind: "looking", file: meta, digest });
      // The SDK's public provenance() hashes the same bytes and asks the gateway by digest.
      await settle(ticket, digest, meta, () => makeClient().provenance(bytes));
    },
    [settle],
  );

  const checkDigest = useCallback(
    async (digest: string) => {
      const clean = digest.trim().toLowerCase();
      const ticket = ++run.current;
      if (!/^[0-9a-f]{64}$/.test(clean)) {
        setState({
          kind: "error",
          digest: clean,
          error: { code: "bad_digest", title: "That isn't a SHA-256 hash", detail: "A film's hash is 64 hexadecimal characters.", charge: null },
        });
        return;
      }
      setState({ kind: "looking", digest: clean });
      await settle(ticket, clean, undefined, () => lookupDigest(clean));
    },
    [settle],
  );

  const reset = useCallback(() => {
    run.current++;
    setState({ kind: "idle" });
  }, []);

  return { state, checkFile, checkDigest, reset };
}
