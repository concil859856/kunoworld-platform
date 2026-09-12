"use client";

import { useId, useState, type DragEvent, type ReactNode } from "react";

import type { MediaItem } from "@/lib/composerState";
import styles from "./MediaSlot.module.css";

export const ACCEPT = {
  image: "image/png,image/jpeg,image/webp",
  video: "video/mp4,video/quicktime,video/webm",
  audio: "audio/wav,audio/x-wav,audio/mpeg,audio/ogg,audio/flac",
} as const;

function Preview({ item }: { item: MediaItem }) {
  if (item.info.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
    return <img className={styles.media} src={item.url} alt="" />;
  }
  if (item.info.kind === "video") {
    return <video className={styles.media} src={item.url} muted playsInline preload="metadata" />;
  }
  return (
    <span className={styles.audio} aria-hidden="true">
      <span className={styles.wave} />
    </span>
  );
}

/** A drop target for one input. Drag and drop, click, or keyboard (it wraps a real file input). */
export function MediaSlot({
  label,
  item,
  accept,
  onFiles,
  onRemove,
  disabled = false,
  note,
  badge,
  multiple = false,
  size = "md",
  invalid = false,
}: {
  label: string;
  item?: MediaItem | null;
  accept: string;
  onFiles?: (files: File[]) => void;
  onRemove?: () => void;
  disabled?: boolean;
  note?: ReactNode;
  badge?: ReactNode;
  multiple?: boolean;
  size?: "md" | "sm";
  invalid?: boolean;
}) {
  const [over, setOver] = useState(false);
  const ids = useId();

  if (item) {
    const duration = item.info.duration ? ` · ${item.info.duration.toFixed(1)} s` : "";
    return (
      <figure className={styles.slot} data-filled="true" data-size={size} data-invalid={invalid} aria-label={`${label}: ${item.name}${duration}`}>
        <Preview item={item} />
        <figcaption className={styles.caption}>
          {badge && <span className={styles.badge}>{badge}</span>}
          <span className={styles.name} title={item.name}>
            {label}
            {duration}
          </span>
        </figcaption>
        {onRemove && (
          <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${label}`}>
            ×
          </button>
        )}
      </figure>
    );
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    if (disabled || !onFiles) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <label
      className={styles.slot}
      data-empty="true"
      data-over={over}
      data-disabled={disabled}
      data-size={size}
      data-invalid={invalid}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {/* An explicit aria-label keeps the slot's name exactly the label: the note,
          the "+" and any counter become its description instead. */}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={note ? `${ids}-note` : undefined}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length && onFiles) onFiles(files);
          e.target.value = "";
        }}
      />
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
      {note && (
        <span className={styles.note} id={`${ids}-note`}>
          {note}
        </span>
      )}
    </label>
  );
}
