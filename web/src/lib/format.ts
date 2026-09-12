/** Small formatting helpers shared by pages and the studio. */

export function usd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value > 0 && value < 0.1) return `$${trimZeros(value.toFixed(3))}`;
  return `$${value.toFixed(2)}`;
}

/** Per-second rates: up to three decimals, never scientific. */
export function rate(value: number): string {
  return `$${trimZeros(value.toFixed(3))}`;
}

/** "0.060" → "0.06", "0.024" → "0.024": at least two decimals, no trailing zeros beyond that. */
function trimZeros(s: string): string {
  const [whole, frac = ""] = s.split(".");
  return `${whole}.${frac.replace(/0+$/, "").padEnd(2, "0")}`;
}

export function shortHash(hash: string | null | undefined, head = 8, tail = 6): string {
  if (!hash) return "—";
  const clean = hash.replace(/^sha256:/, "");
  if (clean.length <= head + tail + 1) return hash;
  return `${hash.startsWith("sha256:") ? "sha256:" : ""}${clean.slice(0, head)}…${clean.slice(-tail)}`;
}

export function utcStamp(seconds: number): string {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export function seconds(value: number, digits = 1): string {
  return `${Number(value.toFixed(digits))} s`;
}

export function relativeDay(ms: number, now = Date.now()): string {
  const day = (t: number) => new Date(t).toDateString();
  if (day(ms) === day(now)) return "Today";
  if (day(ms) === day(now - 86_400_000)) return "Yesterday";
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Deterministic pseudo-hash for decorative film edge codes. Clearly not a real digest. */
export function edgeCode(seed: string, length = 16): string {
  let h = 2166136261;
  let out = "";
  for (let i = 0; out.length < length; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    out += (h & 0xffff).toString(16).padStart(4, "0");
  }
  return out.slice(0, length);
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
