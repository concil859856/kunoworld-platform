"use client";

import { useState, type DragEvent, type ReactNode } from "react";

import styles from "./DropZone.module.css";

/** A file target that works by drag and drop, click, or keyboard (it wraps a real file input). */
export function DropZone({
  onFile,
  accept = "video/*",
  title,
  hint,
  busy = false,
  size = "large",
  inputId,
}: {
  onFile: (file: File) => void;
  accept?: string;
  title: ReactNode;
  hint?: ReactNode;
  busy?: boolean;
  size?: "large" | "small";
  inputId?: string;
}) {
  const [over, setOver] = useState(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <label
      className={styles.zone}
      data-over={over}
      data-busy={busy}
      data-size={size}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <span className={styles.frame} aria-hidden="true" />
      <span className={styles.title}>{title}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
