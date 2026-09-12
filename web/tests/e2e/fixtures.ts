/**
 * Input media for the e2e runs, built with ffmpeg once per machine and cached.
 *
 * Clips are VP8/WebM and audio is WAV on purpose: Playwright's bundled Chromium
 * has no H.264/AAC decoder, and the studio probes every file it is given for
 * duration and dimensions. WebM and WAV let those probes succeed, so the tests
 * exercise the real duration hints, crop warnings and retake window rules.
 * The worker's ffmpeg accepts both, and so does the protocol's mime sniffing.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CACHE = join(process.env.KUNO_E2E_MEDIA_DIR ?? tmpdir(), "kuno-e2e-media");

function build(name: string, args: (out: string) => string[]): Buffer {
  mkdirSync(CACHE, { recursive: true });
  const out = join(CACHE, name);
  if (!existsSync(out)) {
    try {
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args(out)], { stdio: "pipe" });
    } catch (err) {
      const detail = err instanceof Error && "stderr" in err ? String((err as { stderr?: Buffer }).stderr ?? "") : "";
      throw new Error(`ffmpeg couldn't build ${name}. Install ffmpeg to run these tests.\n${detail}`);
    }
  }
  return readFileSync(out);
}

/** A silent VP8/WebM clip the browser can decode, so its duration is probed in the page. */
export function clipBytes({ seconds = 4, width = 320, height = 180, hue = 0 } = {}): Buffer {
  return build(`clip-${seconds}s-${width}x${height}-${hue}.webm`, (out) => [
    "-f", "lavfi", "-t", String(seconds), "-i", `testsrc2=size=${width}x${height}:rate=24`,
    "-vf", `hue=h=${hue}`,
    "-c:v", "libvpx", "-b:v", "300k", "-deadline", "realtime", "-cpu-used", "8",
    out,
  ]);
}

/** A WAV tone. WAV is in the protocol's audio types and Chromium decodes it. */
export function wavBytes({ seconds = 4, frequency = 320 } = {}): Buffer {
  return build(`tone-${seconds}s-${frequency}.wav`, (out) => [
    "-f", "lavfi", "-t", String(seconds), "-i", `sine=frequency=${frequency}:sample_rate=48000`,
    "-c:a", "pcm_s16le", out,
  ]);
}

export function clipFile(name: string, opts?: Parameters<typeof clipBytes>[0]) {
  return { name, mimeType: "video/webm", buffer: clipBytes(opts) };
}

export function wavFile(name: string, opts?: Parameters<typeof wavBytes>[0]) {
  return { name, mimeType: "audio/wav", buffer: wavBytes(opts) };
}
