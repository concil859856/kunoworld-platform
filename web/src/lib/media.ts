/** Browser media helpers: probing local files and grabbing frames. Nothing here uploads. */

export type MediaKind = "image" | "video" | "audio" | "unknown";

export interface MediaInfo {
  kind: MediaKind;
  width?: number;
  height?: number;
  duration?: number;
}

export function kindOf(file: Blob): MediaKind {
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  return "unknown";
}

function once(target: EventTarget, ok: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => cleanup(new Error("timed out reading media")), timeoutMs);
    const onOk = () => cleanup();
    const onErr = () => cleanup(new Error("this browser can't decode the media"));
    function cleanup(err?: Error) {
      window.clearTimeout(timer);
      target.removeEventListener(ok, onOk);
      target.removeEventListener("error", onErr);
      if (err) reject(err);
      else resolve();
    }
    target.addEventListener(ok, onOk);
    target.addEventListener("error", onErr);
  });
}

/** Reads dimensions and duration where the browser can decode the file; never throws. */
export async function probeMedia(file: Blob, url: string): Promise<MediaInfo> {
  const kind = kindOf(file);
  try {
    if (kind === "image") {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { kind, width: img.naturalWidth, height: img.naturalHeight };
    }
    if (kind === "video" || kind === "audio") {
      const el = document.createElement(kind);
      el.preload = "metadata";
      el.src = url;
      await once(el, "loadedmetadata");
      const info: MediaInfo = { kind, duration: Number.isFinite(el.duration) ? el.duration : undefined };
      if (el instanceof HTMLVideoElement) {
        info.width = el.videoWidth || undefined;
        info.height = el.videoHeight || undefined;
      }
      el.removeAttribute("src");
      return info;
    }
  } catch {
    /* fall through: unknown dimensions */
  }
  return { kind };
}

/** Grabs the final frame of a (decrypted, same-origin) video as a PNG. */
export async function extractLastFrame(src: string): Promise<Blob> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  await once(video, "loadeddata", 15000);
  const target = Math.max(0, (Number.isFinite(video.duration) ? video.duration : 0) - 0.05);
  if (Math.abs(video.currentTime - target) > 0.001) {
    const seeked = once(video, "seeked", 15000);
    video.currentTime = target;
    await seeked;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width) throw new Error("this browser can't decode the film to grab a frame");
  ctx.drawImage(video, 0, 0);
  video.removeAttribute("src");
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("couldn't encode the frame"))), "image/png"),
  );
}

export function ratioLabel(width?: number, height?: number): string | null {
  if (!width || !height) return null;
  const known: Array<[string, number]> = [
    ["21:9", 21 / 9],
    ["16:9", 16 / 9],
    ["4:3", 4 / 3],
    ["1:1", 1],
    ["3:4", 3 / 4],
    ["9:16", 9 / 16],
  ];
  const r = width / height;
  const [label, value] = known.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best));
  return Math.abs(value - r) / value < 0.04 ? label : `${width}×${height}`;
}

export function ratioValue(label: string): number {
  const [w, h] = label.split(":").map(Number);
  return w && h ? w / h : 16 / 9;
}

/** True when an image's shape differs enough from the shot's ratio that it will be cropped. */
export function willCrop(width: number | undefined, height: number | undefined, aspect: string): boolean {
  if (!width || !height) return false;
  const r = width / height;
  const target = ratioValue(aspect);
  return Math.abs(r - target) / target > 0.06;
}
