import type { Metadata } from "next";

import { NetworkStats } from "@/components/site/NetworkStats";
import { LINKS } from "@/lib/config";

import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "The network",
  description:
    "How KunoWorld's Bittensor subnet works: sealed GPU enclaves, remote attestation, signed receipts, scoring by verified video compute, and an honest security model.",
};

const HARDWARE = [
  { cls: "C1", gpus: "1 × NVIDIA RTX PRO 6000 Blackwell (96 GB)", serves: "LTX-2.5 Fast" },
  { cls: "C2", gpus: "1 × NVIDIA H200 (141 GB)", serves: "LTX-2.5 Pro, LTX-2.5 4K" },
  { cls: "C4", gpus: "4 × NVIDIA H100 or H200", serves: "MiniMax H3 Turbo, MiniMax H3, MiniMax H3 Director" },
  { cls: "C8", gpus: "8 × NVIDIA B200 or B300", serves: "High-throughput H3 and LTX serving" },
];

export default function NetworkPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <p className="eyebrow">For miners, validators and the curious</p>
        <h1 className={`display ${styles.title}`}>
          A network of <em>sealed stages.</em>
        </h1>
        <p className={styles.lede}>
          KunoWorld runs on a Bittensor subnet. Miners operate GPU servers inside hardware enclaves; validators check them
          and score the video compute they verifiably deliver; customers&apos; browsers check them again before sending
          anything. Nobody in the chain — including us — handles readable prompts or footage.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="how">
        <div className={styles.sectionHead}>
          <h2 id="how" className={`display ${styles.h2}`}>
            How it <em>works</em>
          </h2>
          <div className={styles.body}>
            <p>
              A worker is a confidential VM (Intel TDX) with its GPUs in NVIDIA confidential-computing mode. The VM boots a
              measured, published worker image. Inside it, the worker generates two keys that never leave the enclave: an
              X25519 key that customers encrypt to, and an Ed25519 key it signs receipts with.
            </p>
          </div>
        </div>
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>Attestation</h3>
            <p>
              The TDX quote binds both public keys and the NVIDIA GPU evidence to the VM&apos;s measurements. The gateway,
              validators and every customer SDK check it against the owner-published golden manifest before trusting a
              worker.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Sealed jobs</h3>
            <p>
              Clients encrypt prompts and media with HPKE to the attested key. The gateway relays ciphertext and sees only
              the pricing parameters: model, mode, duration, resolution, frame rate, input roles.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Receipts</h3>
            <p>
              Each finished job carries a receipt signed inside the enclave: job, profile, image digest, parameter, input
              and output digests, content hash, attestation digest and timings. It doubles as the film&apos;s public
              certificate.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Scoring</h3>
            <p>
              Validators score miners by verified video compute units: each profile has a VCU rate per output second, and
              only jobs with valid receipts from attested enclaves count. Fresh-nonce attestation challenges catch workers
              that drift from the manifest.
            </p>
          </div>
          <div className={styles.card}>
            <h3>The switch</h3>
            <p>
              The subnet owner signs a switch document: which families serve traffic (H3, LTX, both, or auto-fallback),
              disabled profiles, and the emission split between families. The gateway routes by it and validators pay by
              it — the same signed file.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="live">
        <div className={styles.sectionHead}>
          <h2 id="live" className={`display ${styles.h2}`}>
            Live <em>stats</em>
          </h2>
          <p className={styles.body}>
            Straight from the public <code>/v1/models</code> endpoint. A worker can serve several profiles, so it appears in
            each row it serves.
          </p>
        </div>
        <NetworkStats />
      </section>

      <section className={styles.section} aria-labelledby="hardware">
        <div className={styles.sectionHead}>
          <h2 id="hardware" className={`display ${styles.h2}`}>
            Hardware <em>classes</em>
          </h2>
          <div className={styles.body}>
            <p>
              <strong>Required for every class:</strong> an Intel TDX-capable host and GPUs running in NVIDIA confidential
              computing mode, with the published worker image. Anything else is rejected at attestation.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Hardware classes</caption>
            <thead>
              <tr>
                <th scope="col">Class</th>
                <th scope="col">GPUs</th>
                <th scope="col">Serves</th>
              </tr>
            </thead>
            <tbody>
              {HARDWARE.map((h) => (
                <tr key={h.cls}>
                  <td className={`mono ${styles.strong}`}>{h.cls}</td>
                  <td>{h.gpus}</td>
                  <td>{h.serves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="security">
        <div className={styles.sectionHead}>
          <h2 id="security" className={`display ${styles.h2}`}>
            The security model, <em>honestly</em>
          </h2>
          <div className={styles.body}>
            <p>
              <strong>What it protects against:</strong> the machine&apos;s operator and their software — host OS,
              hypervisor, root users, monitoring agents — reading prompts, media, outputs or keys. It also keeps the
              gateway (us) blind: we relay and store ciphertext only. A modified worker image fails attestation and gets no
              work.
            </p>
            <p>
              <strong>Known limitations:</strong> physical attacks on the memory bus — interposers on the DRAM between CPU
              and memory have been shown against current confidential-computing platforms — and microarchitectural side
              channels. These need hands on the hardware, but they are real. The gateway also sees metadata: which model,
              how long, what resolution, when, and the sizes of encrypted blobs.
            </p>
            <p>
              <strong>What we do about it:</strong> the enterprise tier routes only to workers in verified data centers
              with physical access controls. Certificates name the hardware and image, so anyone can see where a film was
              made. Development builds are labelled &ldquo;simulated&rdquo; in every certificate they sign.
            </p>
            <p>
              <strong>Content safety</strong> runs inside the enclave, because nothing outside can see the request. Blocked
              jobs are refunded automatically. MiniMax H3 is geofenced per its license (not yet available in the US, EU, UK
              or South Korea); unknown locations are treated as excluded.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="code">
        <div className={styles.sectionHead}>
          <h2 id="code" className={`display ${styles.h2}`}>
            Public <em>code</em>
          </h2>
          <div className={styles.body}>
            <p>
              The worker, validator and protocol live in{" "}
              <a className="link" href={LINKS.subnetRepo} rel="noreferrer" target="_blank">
                github.com/kunoworld/subnet
              </a>
              ; the client SDKs in{" "}
              <a className="link" href={LINKS.sdkRepo} rel="noreferrer" target="_blank">
                github.com/kunoworld/sdk
              </a>
              . Reproducible image builds let anyone recompute the measurements in the golden manifest.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
