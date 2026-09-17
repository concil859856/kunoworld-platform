import type { Provenance } from "@kunoworld/sdk";

import { hardwareLabel, teeLabel, type CertificateChecks } from "@/lib/certificate";
import { seconds, utcStamp } from "@/lib/format";

import { EndCredits, type CreditLine } from "./EndCredits";

const tick = (ok: boolean) => (ok ? "✓" : "✗");

/** The full certificate for a film, as end credits. Shared by /verify and the studio. */
export function CertificateView({
  prov,
  checks,
  variant = "full",
  id,
}: {
  prov: Provenance;
  checks: CertificateChecks;
  variant?: "full" | "compact";
  id?: string;
}) {
  const body = prov.receipt.body;
  const video = body.video;
  const signatureOk = checks.signature && prov.signature_valid;
  const lines: CreditLine[] = [
    { role: "Model", value: prov.model.name },
    ...(prov.model.attribution ? [{ role: "Attribution", value: prov.model.attribution }] : []),
    { role: "Stage (enclave)", value: prov.enclave.enclave_id, mono: true },
    {
      role: "Sealed hardware",
      value: teeLabel(prov.enclave.tee),
      tone: prov.enclave.tee === "mock" ? undefined : checks.hardware?.ok ? "ok" : undefined,
    },
    { role: "Hardware", value: hardwareLabel(prov.enclave.hardware), mono: true },
    { role: "Software image", value: prov.enclave.image_digest, mono: true },
    {
      role: "Attestation digest",
      value: body.attestation_digest,
      mono: true,
      note: checks.hardware
        ? checks.hardware.ok
          ? `${tick(true)} Evidence matched the published manifest when recorded${checks.hardware.simulated ? " (simulated quote)" : ""}`
          : `${tick(false)} Evidence didn't match the manifest: ${checks.hardware.reasons.join("; ")}`
        : "Manifest unavailable — evidence not re-checked here",
    },
    {
      role: "Content hash",
      value: body.content_digest,
      mono: true,
      note:
        checks.hashMatches === null
          ? "Looked up by hash"
          : checks.hashMatches
            ? `${tick(true)} Matches the file you checked`
            : `${tick(false)} Does not match the file`,
    },
    {
      role: "Signature",
      value: signatureOk ? "Valid ✓" : "Invalid ✗",
      tone: signatureOk ? "ok" : "bad",
      note: `${tick(checks.signature)} checked in your browser · ${tick(prov.signature_valid)} checked by the gateway · ${tick(checks.stageKeys)} stage id matches its keys`,
    },
    {
      role: "Rendered",
      value: utcStamp(body.finished_at),
      note: `${seconds(body.finished_at - body.started_at)} in the stage · ${seconds(body.gpu_seconds)} of GPU time`,
    },
    // A plan's receipt describes a plan, not a video.
    video
      ? {
          role: "Format",
          value: `${video.width}×${video.height} · ${video.fps} fps · ${seconds(video.duration_s)}${video.audio ? " · stereo audio" : " · silent"}`,
        }
      : { role: "Format", value: body.plan ? `A plan: ${body.plan.shots} shots, ${seconds(body.plan.duration_s)}` : "—" },
    { role: "Job", value: body.job_id, mono: true },
  ];
  return <EndCredits lines={lines} variant={variant} id={id} />;
}
