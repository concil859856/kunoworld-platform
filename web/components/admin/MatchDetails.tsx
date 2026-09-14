import ui from "./Admin.module.css";

/**
 * How a blocked upload or a refused video was identified: the list, its category and, for a perceptual match, the
 * Hamming distance. Hashes and numbers only; the matched content is never shown here.
 */
export function MatchDetails({ detail }: { detail: Record<string, unknown> | null }) {
  if (!detail || typeof detail.list !== "string") return null;
  const perceptual = detail.match_kind === "perceptual";
  const num = (key: string) => (typeof detail[key] === "number" ? (detail[key] as number) : null);
  const text = (key: string) => (typeof detail[key] === "string" ? (detail[key] as string) : null);
  const distance = num("distance");
  const threshold = num("threshold");
  const frame = num("frame_time_s");
  const rows: Array<[string, string]> = [
    ["Match", perceptual ? "Perceptual (PDQ)" : "Exact (SHA-256)"],
    ["List", detail.list as string],
    ["Category", text("category") ?? "—"],
  ];
  if (perceptual) {
    rows.push(["Distance", distance === null ? "—" : `${distance} of 256 bits${threshold === null ? "" : ` (matches at ${threshold} or less)`}`]);
    if (num("quality") !== null) rows.push(["PDQ quality", String(num("quality"))]);
    if (frame !== null) rows.push(["Matching frame", `about ${Math.round(frame)} s into the video`]);
    if (text("list_version")) rows.push(["List version", text("list_version")!]);
  }
  if (text("sha256")) rows.push(["SHA-256", text("sha256")!]);

  return (
    <dl className={ui.meta} aria-label="Hash match" data-match-kind={perceptual ? "perceptual" : "exact"}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd style={label === "SHA-256" || label === "List version" ? { fontFamily: "ui-monospace, monospace" } : undefined}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
