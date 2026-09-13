"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import styles from "./Account.module.css";

const REFRESH_EVERY_MS = 5_000;
const REFRESHES = 12;

/**
 * Shown after returning from a provider's checkout. The redirect proves nothing: credit arrives
 * when the provider's webhook reaches the gateway, so the page re-reads balance and history for a
 * minute instead of claiming success.
 */
export function TopUpNotice({ outcome }: { outcome: "success" | "canceled" }) {
  const router = useRouter();

  useEffect(() => {
    if (outcome !== "success") return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= REFRESHES) window.clearInterval(timer);
    }, REFRESH_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [outcome, router]);

  return (
    <p className={`notice ${styles.notice}`} role="status">
      {outcome === "success" ? (
        <>
          <strong>Payment received — credit appears once the provider confirms it.</strong> Your balance and payment
          history below update on their own.
        </>
      ) : (
        <>Checkout canceled. Start a new top-up whenever you&apos;re ready.</>
      )}
    </p>
  );
}
