"use client";

import { useEffect, useState } from "react";

import styles from "@/components/site/Account.module.css";

import ui from "./Admin.module.css";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "shown"; url: string; mime: string }
  | { kind: "refused"; code: string; message: string };

export const NOT_REVIEWABLE_NOTE =
  "Content can't be opened for this report type. Operators open content only for reports of child sexual abuse material or sexual content involving a minor, or under a legal hold. Decide from the report, the job's details and the account's history.";

/**
 * Opens an item's content only when an operator asks, because every view is logged. The gateway
 * decides whether it may be opened; a refusal is shown as a note rather than an empty player.
 */
export function ItemContent({ itemId }: { itemId: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    return () => {
      if (state.kind === "shown") URL.revokeObjectURL(state.url);
    };
  }, [state]);

  async function open() {
    setState({ kind: "loading" });
    try {
      const response = await fetch(`/admin/items/${encodeURIComponent(itemId)}/video`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
        setState({ kind: "refused", code: body?.code ?? "error", message: body?.message ?? response.statusText });
        return;
      }
      const blob = await response.blob();
      setState({ kind: "shown", url: URL.createObjectURL(blob), mime: blob.type || "video/mp4" });
    } catch {
      setState({ kind: "refused", code: "network", message: "The content couldn't be loaded. Try again." });
    }
  }

  if (state.kind === "shown") {
    return state.mime.startsWith("image/") ? (
      // A held upload can be an image. Its bytes come from a blob URL, so next/image doesn't apply.
      // eslint-disable-next-line @next/next/no-img-element
      <img className={ui.video} src={state.url} alt="Reported upload" />
    ) : (
      <video className={ui.video} src={state.url} controls preload="metadata" aria-label="Reported content" />
    );
  }
  if (state.kind === "refused") {
    return state.code === "content_not_reviewable" ? (
      <p className={ui.note} role="note" data-reviewable="false">
        {NOT_REVIEWABLE_NOTE}
      </p>
    ) : (
      <p className={styles.error} role="alert">
        The content couldn&apos;t be opened: {state.message} ({state.code}).
      </p>
    );
  }
  return (
    <div className={styles.actions}>
      <button type="button" className="ocean-button button-dark" onClick={() => void open()} disabled={state.kind === "loading"}>
        {state.kind === "loading" ? "Opening…" : "Open content"}
      </button>
      <span className={styles.fine}>This view is recorded in the audit log under your name.</span>
    </div>
  );
}
