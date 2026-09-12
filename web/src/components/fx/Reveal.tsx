"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

import styles from "./Reveal.module.css";

/*
 * Brings a block up as it enters the frame — the one motion primitive the long pages use.
 *
 * It reveals once and then stops observing: nothing re-animates when you scroll back, which
 * is what makes a long page feel calm rather than twitchy. Under reduced motion the element
 * is simply visible from the start; the observer never runs.
 */

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  /** Seconds of stagger, for items in a row. */
  delay?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.dataset.shown = "true";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.shown = "true";
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${className}`}
      data-shown="false"
      style={{ "--reveal-delay": `${delay}s` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
