"use client";

import { useEffect, useState } from "react";

import styles from "@/components/site/Account.module.css";
import type { ActionResult } from "@/lib/admin-types";

export const ADMIN_STATUS_EVENT = "kuno:admin-status";

/** Tells the console what the last action did. Used by forms whose card may vanish once the action succeeds. */
export function announceAdminStatus(result: ActionResult) {
  window.dispatchEvent(new CustomEvent<ActionResult>(ADMIN_STATUS_EVENT, { detail: result }));
}

/**
 * The console-wide result of the last action. Resolving a report removes its card from the open list, so the
 * confirmation can't live only inside the card.
 */
export function ConsoleStatus() {
  const [result, setResult] = useState<ActionResult | null>(null);
  useEffect(() => {
    const listener = (event: Event) => setResult((event as CustomEvent<ActionResult>).detail);
    window.addEventListener(ADMIN_STATUS_EVENT, listener);
    return () => window.removeEventListener(ADMIN_STATUS_EVENT, listener);
  }, []);
  return (
    <div data-testid="console-status" aria-live="polite">
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? styles.success : styles.error}>
          {result.message}
        </p>
      )}
    </div>
  );
}
