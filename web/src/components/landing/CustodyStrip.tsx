import { edgeCode } from "@/lib/format";

import styles from "./CustodyStrip.module.css";

const FRAMES = [
  {
    title: "Your device",
    text: "Your prompt and footage are encrypted in this browser, to a key held only by the stage that will render them.",
    icon: "device",
  },
  {
    title: "In transit",
    text: "What travels is ciphertext. We relay it and store it; we can't read it.",
    icon: "transit",
  },
  {
    title: "The stage",
    text: "A GPU server sealed inside hardware that proves what software it runs — your browser checks before sending anything.",
    icon: "stage",
  },
  {
    title: "Sealed print",
    text: "The finished film is encrypted to your key and signed by the stage, with a certificate of what made it.",
    icon: "print",
  },
  {
    title: "Back to you",
    text: "Only this browser holds the key that opens it. Not the stage's owner. Not us.",
    icon: "back",
  },
] as const;

function Icon({ kind }: { kind: (typeof FRAMES)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "device":
      return (
        <svg viewBox="0 0 64 48" aria-hidden="true">
          <rect x="10" y="6" width="44" height="30" rx="2" {...common} />
          <path d="M4 42h56" {...common} />
          <rect x="26" y="18" width="12" height="10" rx="1.5" {...common} className={styles.accent} />
          <path d="M28.5 18v-3a3.5 3.5 0 0 1 7 0v3" {...common} className={styles.accent} />
        </svg>
      );
    case "transit":
      return (
        <svg viewBox="0 0 64 48" aria-hidden="true">
          <text x="32" y="20" textAnchor="middle" className={styles.cipher}>
            9f3c a41e 07b2
          </text>
          <text x="32" y="31" textAnchor="middle" className={styles.cipher}>
            e6d0 1c58 b39a
          </text>
          <path d="M6 40h52m-6-4 6 4-6 4" {...common} className={styles.accent} />
        </svg>
      );
    case "stage":
      return (
        <svg viewBox="0 0 64 48" aria-hidden="true">
          <rect x="12" y="8" width="40" height="32" rx="2" {...common} />
          <path d="M12 16h40M18 12h2m4 0h2" {...common} />
          <path d="M25 28l5 5 10-11" {...common} className={styles.accent} />
        </svg>
      );
    case "print":
      return (
        <svg viewBox="0 0 64 48" aria-hidden="true">
          <rect x="14" y="6" width="36" height="28" rx="1.5" {...common} />
          <path d="M18 28l8-9 6 6 5-4 9 7" {...common} />
          <circle cx="42" cy="36" r="7" {...common} className={styles.accent} />
          <path d="M39 36l2 2 4-4" {...common} className={styles.accent} />
        </svg>
      );
    case "back":
      return (
        <svg viewBox="0 0 64 48" aria-hidden="true">
          <circle cx="22" cy="24" r="8" {...common} className={styles.accent} />
          <path d="M30 24h26m-6 0v6m-7-6v4" {...common} className={styles.accent} />
          <path d="M8 40c6-6 12-6 18 0" {...common} />
        </svg>
      );
  }
}

/** Chain of custody as five frames on a strip of film. Edge codes are decorative. */
export function CustodyStrip() {
  return (
    <div className={styles.strip}>
      <div className={styles.perfs} aria-hidden="true" />
      <ol className={styles.frames} role="list">
        {FRAMES.map((frame, i) => (
          <li key={frame.title} className={styles.frame}>
            <span className={styles.code} aria-hidden="true">
              KW ▸ {String(i + 1).padStart(2, "0")} · {edgeCode(frame.title, 12).replace(/(.{4})/g, "$1 ").trim()}
            </span>
            <div className={styles.picture}>
              <Icon kind={frame.icon} />
            </div>
            <h3 className={styles.title}>
              <span className={styles.num}>{i + 1}</span> {frame.title}
            </h3>
            <p className={styles.text}>{frame.text}</p>
          </li>
        ))}
      </ol>
      <div className={styles.perfs} aria-hidden="true" />
    </div>
  );
}
