"use client";

import { AvailabilityPill } from "@/components/site/AvailabilityPill";
import { useModels } from "@/lib/useModels";
import { CATALOG, isH3, variantLabel } from "@/lib/catalog";
import { countryName } from "@/lib/format";
import { availability } from "@/lib/shot";

import styles from "./NetworkStats.module.css";

/** Live per-profile worker counts and switch state from /v1/models. Shows "—" when unreachable. */
export function NetworkStats() {
  const live = useModels(20_000);
  const profiles = live.data?.models ?? CATALOG;
  const sw = live.data?.switch;

  return (
    <div className={styles.stats}>
      <div className={styles.meta}>
        <span>
          <span className="eyebrow">Switch</span>{" "}
          <span className="mono">{sw ? `${sw.mode} · default ${sw.default_family} · v${sw.version}` : "—"}</span>
        </span>
        <span>
          <span className="eyebrow">Emission split</span>{" "}
          <span className="mono">
            {sw
              ? Object.entries(sw.emission_split)
                  .map(([f, v]) => `${f} ${Math.round(v * 100)}%`)
                  .join(" · ")
              : "—"}
          </span>
        </span>
        <span>
          <span className="eyebrow">Your region</span>{" "}
          <span className="mono">{live.data ? (countryName(live.data.country) ?? "unknown (treated as excluded for H3)") : "—"}</span>
        </span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="sr-only">Attested workers per model profile</caption>
          <thead>
            <tr>
              <th scope="col">Profile</th>
              <th scope="col">Class</th>
              <th scope="col">VCU / output s</th>
              <th scope="col">Attested workers</th>
              <th scope="col">Status for you</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  <span className={styles.name}>{isH3(p) ? p.name : `LTX-2.5 ${variantLabel(p)}`}</span>
                  <span className="mono">{p.id}</span>
                </th>
                <td className="mono">
                  {p.hardware_class} · {p.gpus_per_worker} GPU{p.gpus_per_worker > 1 ? "s" : ""}
                </td>
                <td className="mono">{p.vcu_per_output_second}</td>
                <td className={`mono ${styles.count}`}>{live.data ? (p.workers ?? 0) : "—"}</td>
                <td>
                  <AvailabilityPill availability={availability(p, Boolean(live.data))} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {live.settled && !live.data && <p className={styles.offline}>The network API isn&apos;t reachable from this browser, so no live numbers are shown.</p>}
    </div>
  );
}
