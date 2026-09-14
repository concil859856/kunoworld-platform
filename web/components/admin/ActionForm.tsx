"use client";

import { useActionState, type ReactNode } from "react";

import styles from "@/components/site/Account.module.css";
import type { ActionResult } from "@/lib/admin-types";

import ui from "./Admin.module.css";
import { announceAdminStatus } from "./ConsoleStatus";

/**
 * A console form bound to a server action. It shows the gateway's answer in place, and can ask
 * for confirmation first. It works before hydration too: the form posts to the action directly.
 */
export function ActionForm({
  action,
  submit,
  confirm,
  label,
  children,
}: {
  action: (state: ActionResult | null, form: FormData) => Promise<ActionResult>;
  submit: string;
  confirm?: string;
  /** Accessible name for the form, so several on one page can be told apart. */
  label: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(async (previous: ActionResult | null, form: FormData) => {
    const result = await action(previous, form);
    // Announce before the refreshed page arrives: a successful action can remove this form's card (a resolved
    // report leaves the open list), and an effect here would never run once the card is gone.
    announceAdminStatus(result);
    return result;
  }, null);
  return (
    <form
      action={formAction}
      aria-label={label}
      className={ui.form}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      <div className={styles.actions}>
        <button type="submit" className="ocean-button button-dark" disabled={pending}>
          {pending ? "Working…" : submit}
        </button>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? styles.success : styles.error}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
