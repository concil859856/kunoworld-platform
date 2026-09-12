import type { LibraryEntry, Step } from "@/lib/library";

import styles from "./Steps.module.css";

const ORDER: Step[] = ["encrypting", "uploading", "queued", "generating", "sealing", "decrypting", "ready"];

const LABEL: Record<Step, string> = {
  encrypting: "Encrypting",
  uploading: "Uploading",
  queued: "Queued",
  generating: "Generating",
  sealing: "Sealing",
  decrypting: "Decrypting",
  ready: "Ready",
  failed: "Failed",
  canceled: "Canceled",
};

const DETAIL: Partial<Record<Step, string>> = {
  encrypting: "Your browser checks the stage's proof of hardware, then seals your prompt and media to it.",
  uploading: "Only ciphertext travels to the relay.",
  queued: "Waiting for the sealed stage to pick it up.",
  generating: "Rendering inside the sealed stage.",
  sealing: "The stage encrypts the film to your key and signs its receipt.",
  decrypting: "Downloading the sealed film and opening it here, with a key that never left this browser.",
  ready: "Opened here and checked against its signed receipt.",
};

export function stepLabel(entry: Pick<LibraryEntry, "step" | "progress">): string {
  if (entry.step === "generating") return `Generating ${Math.round(entry.progress * 100)}%`;
  return LABEL[entry.step];
}

/** The privacy story as a progress indicator: each step is real and says where your data is. */
export function Steps({ entry, variant = "bar" }: { entry: Pick<LibraryEntry, "step" | "progress">; variant?: "bar" | "list" }) {
  const current = ORDER.indexOf(entry.step);
  const state = (i: number) => (current < 0 ? "todo" : i < current ? "done" : i === current ? "current" : "todo");

  if (variant === "bar") {
    return (
      <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={ORDER.length} aria-valuenow={Math.max(0, current)} aria-valuetext={stepLabel(entry)}>
        <ol className={styles.segments} role="list">
          {ORDER.slice(0, -1).map((step, i) => (
            <li key={step} data-state={state(i)}>
              {step === "generating" && state(i) === "current" && (
                <span className={styles.fill} style={{ width: `${Math.round(entry.progress * 100)}%` }} />
              )}
            </li>
          ))}
        </ol>
        <span className={styles.label}>{stepLabel(entry)}</span>
      </div>
    );
  }

  return (
    <ol className={styles.list} role="list">
      {ORDER.map((step, i) => (
        <li key={step} data-state={state(i)}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.text}>
            <span className={styles.name}>
              {step === "generating" && state(i) === "current" ? stepLabel(entry) : LABEL[step]}
              {state(i) === "current" && <span className="sr-only"> (current step)</span>}
            </span>
            {state(i) === "current" && DETAIL[step] && <span className={styles.detail}>{DETAIL[step]}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
