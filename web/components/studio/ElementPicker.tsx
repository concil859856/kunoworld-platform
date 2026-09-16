"use client";

import { addElementLines, consentWithdrawn, elementRoles, type Element, type InputRole, type ModelProfile, type PrivacyMode } from "@kunoworld/sdk";
import { AudioLines, ImageIcon, UsersRound } from "lucide-react";
import { useState } from "react";

import type { ComposerApi, MediaItem } from "@/lib/composerState";
import { KIND_LABEL, STANDARD_ELEMENT_SENTENCE } from "@/lib/elements";
import type { ElementsLibrary } from "@/lib/useElements";

import { ElementPreview } from "./ElementsLibrary";
import styles from "./Elements.module.css";

/*
 * The composer's Elements picker. Choosing an Element adds its description to the prompt (a storyboard's scene), where
 * it can be edited like anything typed, and optionally puts its pictures or voice into the composer as ordinary inputs:
 * a first or last frame, a keyframe, reference pictures or a reference voice. The files are opened in this browser and
 * then go wherever any input goes: sealed to the enclave for a Private take, uploaded for a Standard one.
 *
 * Only an Element's own name shows until it's chosen, so browsing the list downloads nothing.
 */

const ROLE_ORDER: InputRole[] = ["first_frame", "last_frame", "keyframe", "reference_image", "reference_audio"];

const ROLE_BUTTON: Partial<Record<InputRole, string>> = {
  first_frame: "As the first frame",
  last_frame: "As the last frame",
  keyframe: "As a keyframe",
  reference_image: "As reference pictures",
  reference_audio: "As a reference voice",
};

function usable(profile: ModelProfile): boolean {
  return profile.available_in_region !== false && profile.enabled !== false && (profile.workers === undefined || profile.workers > 0);
}

/** The roles some model that can serve here takes this Element's files in. */
function rolesHere(element: Element, profiles: ModelProfile[]): InputRole[] {
  const roles = new Set(profiles.filter(usable).flatMap((p) => elementRoles(element, p)));
  return ROLE_ORDER.filter((r) => roles.has(r));
}

export function ElementPicker({
  composer,
  library,
  profiles,
  privacy,
  storyboard,
  focusId = null,
  onClose,
  onOpenLibrary,
}: {
  composer: ComposerApi;
  library: ElementsLibrary;
  profiles: ModelProfile[];
  privacy: PrivacyMode;
  storyboard: boolean;
  /** An Element to show chosen, from the library's "Use in a video". The studio remounts the picker when it changes. */
  focusId?: string | null;
  onClose?: () => void;
  onOpenLibrary: () => void;
}) {
  const { state, actions } = composer;
  const [open, setOpen] = useState(Boolean(focusId));
  const [chosenId, setChosenId] = useState<string | null>(focusId);
  const [picture, setPicture] = useState(0);
  const [working, setWorking] = useState(false);
  const [said, setSaid] = useState<{ text: string; error?: boolean } | null>(null);

  const chosen = library.elements.find((e) => e.elementId === chosenId) ?? null;
  const roles = chosen && !storyboard ? rolesHere(chosen, profiles) : [];
  const withdrawn = chosen ? consentWithdrawn(chosen) : false;
  const where = storyboard ? "scene" : "prompt";

  async function use(element: Element, role: InputRole | null) {
    setSaid(null);
    // The line first, from the prompt as it is now; the files may take a moment to open.
    actions.setPrompt(addElementLines(state.prompt, [element]));
    if (!role) {
      setSaid({ text: `Added ${element.name}'s description to your ${where}. Edit it there if you like.` });
      return;
    }
    const positions = role === "reference_image" ? element.files.map((_, i) => i) : [Math.min(picture, element.files.length - 1)];
    setWorking(true);
    let items: MediaItem[];
    try {
      const opened = await Promise.all(positions.map((p) => library.file(element, p)));
      items = opened.map((o, i) => actions.addMedia(o.blob, `${element.name} ${positions[i] + 1}`));
    } catch {
      setSaid({ text: `Added the description, but ${element.name}'s ${element.kind === "voice" ? "voice clip" : "pictures"} didn't open. Try again.`, error: true });
      return;
    } finally {
      setWorking(false);
    }
    if (role === "first_frame" || role === "last_frame") {
      actions.setTab("frames");
      actions.updateInputs((i) => ({ ...i, [role === "first_frame" ? "first" : "last"]: items[0] }));
    } else if (role === "keyframe") {
      actions.setTab("keyframes");
      actions.updateInputs((i) => ({ ...i, keyframes: [...i.keyframes, { ...items[0], timeS: state.settings.durationS }] }));
    } else if (role === "reference_image") {
      actions.setTab("references");
      actions.updateInputs((i) => ({ ...i, refImages: [...i.refImages, ...items] }));
    } else if (role === "reference_audio") {
      actions.setTab("references");
      actions.updateInputs((i) => ({ ...i, refAudio: [...i.refAudio, ...items] }));
    }
    const what = element.kind === "voice" ? "voice" : role === "reference_image" ? `${items.length === 1 ? "picture" : "pictures"}` : `picture ${positions[0] + 1}`;
    setSaid({ text: `Added ${element.name}'s description to your prompt, and ${element.kind === "voice" ? "the" : "its"} ${what} ${ROLE_BUTTON[role]!.replace(/^As /, "as ")}.` });
  }

  const status = library.status;
  const count = library.elements.length;

  return (
    <div className={styles.picker} data-element-picker="">
      <div className={styles.pickerHead}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => {
            if (open) onClose?.();
            setOpen(!open);
          }}
        >
          <UsersRound size={13} aria-hidden /> Elements{status === "ready" && count ? ` · ${count}` : ""}
        </button>
        <span className="text-[12px] text-muted-foreground">Reuse a character, product, place, style or voice.</span>
      </div>
      {open && (
        <div className={styles.panel} role="region" aria-label="Add an Element">
          {status !== "ready" ? (
            <>
              <p className={styles.fine}>
                {status === "key_sync_off"
                  ? "Elements use key sync's keys. Turn on key sync on the Elements page to make one."
                  : status === "locked"
                    ? "Unlock key sync on the Elements page to use your Elements here."
                    : status === "loading"
                      ? "Opening your Elements…"
                      : status === "signed_out"
                        ? "Sign in to use Elements."
                        : "Elements aren't available right now."}
              </p>
              {status !== "loading" && status !== "signed_out" && (
                <div className={styles.actions}>
                  <button type="button" className={styles.button} onClick={onOpenLibrary}>
                    Open Elements
                  </button>
                </div>
              )}
            </>
          ) : count === 0 ? (
            <>
              <p className={styles.fine}>No Elements yet.</p>
              <div className={styles.actions}>
                <button type="button" className={styles.button} onClick={onOpenLibrary}>
                  Make an Element
                </button>
              </div>
            </>
          ) : (
            <>
              <ul className={styles.choices} aria-label="Your Elements">
                {library.elements.map((element) => {
                  const cached = element.kind !== "voice" ? library.files[`${element.elementId}:${element.revision}:0`] : undefined;
                  return (
                    <li key={element.elementId}>
                      <button
                        type="button"
                        className={styles.choice}
                        aria-pressed={element.elementId === chosenId}
                        onClick={() => {
                          setChosenId(element.elementId === chosenId ? null : element.elementId);
                          setPicture(0);
                          setSaid(null);
                        }}
                      >
                        <span className={styles.thumb} aria-hidden>
                          {cached ? (
                            // eslint-disable-next-line @next/next/no-img-element -- a decrypted local object URL
                            <img src={cached.url} alt="" />
                          ) : element.kind === "voice" ? (
                            <AudioLines size={16} />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </span>
                        <span className={styles.choiceName}>{element.name}</span>
                        <span>{KIND_LABEL[element.kind]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {chosen && (
                <div className={styles.banner} data-chosen={chosen.elementId}>
                  <p className={styles.description}>
                    <strong>{chosen.name}</strong>
                    {chosen.description ? `: ${chosen.description}` : ""}
                  </p>
                  {chosen.kind !== "voice" && chosen.files.length > 1 && roles.some((r) => r !== "reference_image") && (
                    <div className={styles.pictures} role="group" aria-label="Which picture">
                      {chosen.files.map((_, p) => {
                        const opened = library.files[`${chosen.elementId}:${chosen.revision}:${p}`];
                        return (
                          <button key={p} type="button" aria-pressed={picture === p} aria-label={`Picture ${p + 1}`} onClick={() => setPicture(p)}>
                            <span className={styles.thumb}>
                              {/* eslint-disable-next-line @next/next/no-img-element -- a decrypted local object URL */}
                              {opened ? <img src={opened.url} alt="" /> : p + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {chosen.kind !== "voice" && chosen.files.length > 1 && roles.some((r) => r !== "reference_image") ? (
                    <PreloadPictures element={chosen} library={library} />
                  ) : null}
                  {withdrawn ? (
                    <p className={styles.error}>Consent for {chosen.name} was withdrawn, so it can&apos;t be used in new videos.</p>
                  ) : (
                    <div className={styles.actions}>
                      <button type="button" className={styles.button} disabled={working} onClick={() => void use(chosen, null)}>
                        Add the description
                      </button>
                      {roles.map((role) => (
                        <button key={role} type="button" className={styles.button} disabled={working} onClick={() => void use(chosen, role)}>
                          {ROLE_BUTTON[role]}
                        </button>
                      ))}
                    </div>
                  )}
                  {storyboard ? (
                    <p className={styles.fine}>A storyboard uses descriptions only: they go into the scene every shot shares.</p>
                  ) : chosen.kind === "voice" && roles.length === 0 ? (
                    <p className={styles.fine}>No model available here takes a voice yet (MiniMax H3 Director does, where it&apos;s licensed). Its description still works.</p>
                  ) : null}
                </div>
              )}
              {privacy === "standard" && <p className={styles.fine}>{STANDARD_ELEMENT_SENTENCE}</p>}
            </>
          )}
          {working && (
            <p className={styles.status} role="status">
              Opening…
            </p>
          )}
          {said && (
            <p className={said.error ? styles.error : styles.status} role={said.error ? "alert" : "status"}>
              {said.text}
            </p>
          )}
          {library.error && status === "ready" && (
            <p className={styles.error} role="alert">
              {library.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Opens a chosen Element's pictures, so the picture choice shows them. Renders nothing itself. */
function PreloadPictures({ element, library }: { element: Element; library: ElementsLibrary }) {
  return (
    <span hidden>
      <ElementPreview element={element} library={library} all />
    </span>
  );
}
