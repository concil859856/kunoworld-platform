"use client";

import { Flag, RotateCcw, Scissors, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ModelProfile } from "@kunoworld/sdk";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareLinkForm } from "@/components/studio/ShareLinkForm";
import { CertificateView } from "@/components/verify/CertificateView";
import { useCertificate } from "@/components/verify/useCertificate";
import { EMPTY_INPUTS, type ComposerApi } from "@/lib/composerState";
import { isActive, stepLabel, type InputSummary, type LibraryEntry } from "@/lib/library";
import { extractLastFrame } from "@/lib/media";
import { JOINS, fallbackNotice, storyboardLength } from "@/lib/shot";
import type { FilmState } from "@/lib/useLibrary";
import { MODE_LABEL } from "@/lib/validation";
import { PRIVACY_COPY } from "@/lib/privacy-copy";

/*
 * The inspector: everything about one take, and the things you can do to it.
 *
 * It reads the take the shelf has selected — by default the most recent one, which is
 * what you almost always mean right after generating. The action rail is the cheap way
 * back into the composer: reuse a setup, or carry a film's last frame into the next shot.
 *
 * The Certificate tab is the same lookup /verify does, by content hash, reusing the same
 * components — so a film's credits read identically whether you check your own take or
 * someone hands you a file.
 */

const ROLE_LABEL: Record<InputSummary["role"], string> = {
  first_frame: "First frame",
  last_frame: "Last frame",
  keyframe: "Keyframe",
  reference_image: "Reference image",
  reference_video: "Reference clip",
  reference_audio: "Audio reference",
  source_video: "Source video",
  source_audio: "Soundtrack",
};

/** 4 → "4", 1.5 → "1.5": seconds read better without trailing zeroes. */
const secs = (n: number) => String(Number(n.toFixed(2)));

const JOIN_LABEL = Object.fromEntries(JOINS.map((j) => [j.id, j.label]));

function summaryLine(i: InputSummary): string {
  const label = ROLE_LABEL[i.role];
  if (i.startS !== undefined && i.endS !== undefined) return `${label} ${secs(i.startS)}–${secs(i.endS)} s`;
  if (i.timeS !== undefined) return `${label} @ ${secs(i.timeS)} s`;
  return label;
}

export interface InspectorProps {
  entry: LibraryEntry | null;
  film?: FilmState;
  profiles: ModelProfile[];
  composer: ComposerApi;
  onCancel: (entry: LibraryEntry) => void;
  onRemove: (entry: LibraryEntry) => void;
  onNotice: (notice: string) => void;
  onEditComposer: () => void;
}

export function Inspector({ entry, film, profiles, composer, onCancel, onRemove, onNotice, onEditComposer }: InspectorProps) {
  const [tab, setTab] = useState<"details" | "certificate">("details");
  const certificate = useCertificate();
  const { state: certState, checkDigest } = certificate;

  const digest = entry?.receipt?.body.content_digest ?? null;

  // Looked up only when asked for, and only ever by hash.
  useEffect(() => {
    if (tab === "certificate" && digest) void checkDigest(digest);
  }, [tab, digest, checkDigest]);

  if (!entry) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <h2 className="inspector-title">Nothing selected</h2>
        <p className="inspector-hint">Pick a take to see how it was made, and what you can do with it next.</p>
      </aside>
    );
  }

  const profile = profiles.find((p) => p.id === entry.profileId);
  const requested = profiles.find((p) => p.id === entry.requestedProfileId);
  const fallback = fallbackNotice(entry.fallbackReason, requested, profile);
  const canceled = entry.step === "canceled";
  const { settings } = entry;
  const storyboard = entry.mode === "storyboard";
  const stitched = storyboard && profile && entry.shots?.length ? storyboardLength(profile, entry.shots, settings.fps) : null;

  /** Carries the film's final frame into the composer as the next shot's first frame. */
  async function carryLastFrame() {
    if (!entry || !film?.url) return;
    try {
      const frame = await extractLastFrame(film.url);
      const item = composer.actions.addMedia(frame, `last-frame-${entry.id.slice(0, 8)}.png`);
      composer.actions.setTab("frames");
      composer.actions.updateInputs((inputs) => ({ ...inputs, first: item, last: null }));
      composer.actions.setNotice("The last frame is now the first frame of a new shot.");
      onEditComposer();
    } catch (err) {
      onNotice(`Couldn't grab the last frame — ${(err as Error).message}.`);
    }
  }

  /*
   * Reference media is never persisted — the blobs were encrypted on the device and are
   * not kept — so a reused setup restores the prompt, the model and the settings, and
   * leaves the trays empty rather than pretending the files came back.
   */
  function reuseSettings() {
    if (!entry) return;
    composer.actions.load(
      {
        tab: entry.tab,
        editOp: entry.editOp,
        profileId: entry.profileId,
        prompt: entry.prompt,
        settings: entry.settings,
        inputs: EMPTY_INPUTS,
        shots: entry.shots,
      },
      "Settings are back in the composer.",
    );
    onEditComposer();
  }

  return (
    <aside className="inspector" aria-label="Inspector">
      <h2 className="inspector-title">{entry.prompt || (storyboard ? entry.shots?.[0]?.prompt || "Storyboard" : "No prompt")}</h2>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "details" | "certificate")}>
        <TabsList aria-label="Take">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="certificate">Certificate</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "details" ? (
        <>
          <dl className="inspector-rows">
            <div>
              <dt>Privacy</dt>
              <dd>{PRIVACY_COPY[entry.privacy ?? "private"].label}</dd>
            </div>
            <div>
              <dt>Kept</dt>
              <dd>Until you delete it</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{MODE_LABEL[entry.mode]}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{profile?.name ?? entry.profileId}</dd>
            </div>
            {requested && requested.id !== entry.profileId && (
              <div>
                <dt>Requested</dt>
                <dd>{requested.name}</dd>
              </div>
            )}
            <div>
              <dt>State</dt>
              <dd>{canceled ? "Canceled" : stepLabel(entry)}</dd>
            </div>
            {settings.resolution && (
              <div>
                <dt>Resolution</dt>
                <dd>{settings.resolution}</dd>
              </div>
            )}
            <div>
              <dt>Aspect ratio</dt>
              <dd>{settings.aspectRatio}</dd>
            </div>
            {storyboard && entry.shots ? (
              <div>
                <dt>Length</dt>
                <dd>
                  {stitched ? `${Number(stitched.stitchedS.toFixed(1))} s · ` : ""}
                  {entry.shots.length} shots
                </dd>
              </div>
            ) : (
              <div>
                <dt>Duration</dt>
                <dd>{secs(settings.durationS)} s</dd>
              </div>
            )}
            <div>
              <dt>Frame rate</dt>
              <dd>{settings.fps} fps</dd>
            </div>
            {settings.seed && (
              <div>
                <dt>Seed</dt>
                <dd className="mono">{settings.seed}</dd>
              </div>
            )}
          </dl>

          {storyboard && entry.shots && entry.shots.length > 0 && (
            <ol className="inspector-inputs" aria-label="Shots">
              {entry.shots.map((shot, n) => (
                <li key={n}>
                  {n + 1}. {shot.prompt || `Shot ${n + 1}`} · {secs(shot.durationS)} s · {n === 0 ? "New shot" : JOIN_LABEL[shot.join]}
                </li>
              ))}
            </ol>
          )}

          {entry.inputs.length > 0 && (
            <ul className="inspector-inputs">
              {entry.inputs.map((i, n) => (
                <li key={`${i.role}-${n}`}>{summaryLine(i)}</li>
              ))}
            </ul>
          )}

          {entry.privacy === "standard" && <p className="inspector-note">{PRIVACY_COPY.standard.sentence}</p>}

          {fallback && <p className="inspector-note">{fallback}</p>}

          {canceled && (
            <p className="inspector-note">
              You canceled this take.
              {entry.price !== null && ` Refunded $${entry.price.toFixed(2)}.`}
            </p>
          )}
        </>
      ) : !digest ? (
        <p className="inspector-hint">This take has no signed receipt yet. A certificate appears once the film is sealed.</p>
      ) : certState.kind === "found" ? (
        <CertificateView prov={certState.prov} checks={certState.checks} variant="compact" />
      ) : certState.kind === "missing" ? (
        <p className="inspector-hint">The gateway has no certificate for this film&apos;s hash.</p>
      ) : certState.kind === "error" ? (
        <p className="inspector-note">
          {certState.error.title}. {certState.error.detail}
        </p>
      ) : (
        <p className="inspector-hint">Reading the certificate…</p>
      )}

      <div className="result-actions">
        {entry.handle && isActive(entry) && (
          <button
            onClick={() => {
              onCancel(entry);
              onNotice("Canceled. The price is refunded automatically.");
            }}
          >
            <X size={16} /> Cancel
          </button>
        )}
        {film?.url && (
          <button onClick={() => void carryLastFrame()}>
            <Scissors size={16} /> Use last frame
          </button>
        )}
        <button onClick={reuseSettings}>
          <RotateCcw size={16} /> Reuse settings
        </button>
        {entry.handle && (
          <a href={`/report?job_id=${encodeURIComponent(entry.handle.jobId)}${digest ? `&digest=${digest}` : ""}`}>
            <Flag size={16} /> Report
          </a>
        )}
        <button onClick={() => onRemove(entry)}>
          <X size={16} /> {entry.handle ? "Delete" : "Remove"}
        </button>
      </div>
      <ShareLinkForm entry={entry} />
    </aside>
  );
}
