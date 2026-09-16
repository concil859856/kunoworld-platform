"use client";

import {
  ELEMENT_KINDS,
  ELEMENT_LIMITS,
  consentWithdrawn,
  elementDraftProblems,
  type Element,
  type ElementConsent,
  type ElementKind,
  type ModelProfile,
} from "@kunoworld/sdk";
import { AudioLines, Code2, Pencil, Plus, Trash2, UsersRound, WandSparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  ELEMENTS_PRIVACY_SENTENCE,
  ELEMENT_RULES_SENTENCE,
  KIND_HINT,
  KIND_LABEL,
  acceptFor,
  maxFilesFor,
  modelUsesSentence,
  pickFile,
  today,
  type PickedFile,
} from "@/lib/elements";
import type { ElementsLibrary as Library } from "@/lib/useElements";
import type { KeySync } from "@/lib/useKeySync";

import { KeySyncPanel } from "./KeySyncPanel";
import { MediaSlot } from "./MediaSlot";
import styles from "./Elements.module.css";

/*
 * The Elements view: reusable characters, products, locations, styles and voices, encrypted in this browser under key
 * sync's keys (lib/useElements.ts). Making one asks for the files, a name, a description the prompt can use, and for a
 * real person their consent; every save confirms the rules. Each card says which models can use it.
 */

/** The first file (or every picture) of an Element, opened when the card shows. */
export function ElementPreview({ element, library, all = false }: { element: Element; library: Library; all?: boolean }) {
  const positions = element.kind === "voice" ? [0] : all ? element.files.map((_, i) => i) : [0];
  const { file } = library;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    for (const position of positions) void file(element, position).catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- positions follow the element and `all`
  }, [element, all, file]);
  const opened = positions.map((p) => library.files[`${element.elementId}:${element.revision}:${p}`]);
  if (element.kind === "voice") {
    return opened[0] ? (
      <audio className={styles.audio} controls src={opened[0].url} aria-label={`${element.name}: voice clip`} />
    ) : (
      <div className={styles.thumb} style={{ aspectRatio: "auto", minHeight: 40 }}>
        <AudioLines size={18} aria-hidden /> {failed ? "Couldn't open" : "Opening…"}
      </div>
    );
  }
  return (
    <div className={styles.thumbs} data-count={positions.length}>
      {positions.map((p, i) => (
        <div className={styles.thumb} key={p}>
          {opened[i] ? (
            // eslint-disable-next-line @next/next/no-img-element -- a decrypted local object URL
            <img src={opened[i].url} alt={all ? `${element.name}, picture ${p + 1}` : element.name} />
          ) : failed ? (
            "Couldn't open"
          ) : (
            "Opening…"
          )}
        </div>
      ))}
    </div>
  );
}

type ConsentState = { real: boolean; subject: string; relationship: "self" | "permission"; grantedOn: string; use: string; affirmed: boolean };

const NO_CONSENT: ConsentState = { real: false, subject: "", relationship: "permission", grantedOn: today(), use: "Videos made on KunoWorld by my account", affirmed: false };

function consentState(consent: ElementConsent | null): ConsentState {
  if (!consent) return NO_CONSENT;
  return { real: true, subject: consent.subject, relationship: consent.relationship, grantedOn: consent.grantedOn, use: consent.use, affirmed: true };
}

const asItem = (file: PickedFile, n: number) => ({
  id: `${file.url}-${n}`,
  file: new Blob([new Uint8Array(file.data)], { type: file.mime }),
  name: file.name ?? `File ${n + 1}`,
  url: file.url,
  info: { kind: file.mime.startsWith("audio/") ? ("audio" as const) : ("image" as const), width: file.width, height: file.height, duration: file.durationS },
});

export function ElementForm({ library, element, onDone }: { library: Library; element?: Element; onDone: (saved: Element | null) => void }) {
  const ids = useId();
  const editing = Boolean(element);
  const [kind, setKind] = useState<ElementKind>(element?.kind ?? "character");
  const [name, setName] = useState(element?.name ?? "");
  const [description, setDescription] = useState(element?.description ?? "");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [replacing, setReplacing] = useState(!editing);
  const [consent, setConsent] = useState<ConsentState>(consentState(element?.consent ?? null));
  const [rules, setRules] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [reading, setReading] = useState(false);
  // Local previews of chosen files: removed ones are revoked as they go, the rest when the form closes.
  const picked = useRef<PickedFile[]>([]);
  useEffect(() => {
    picked.current = files;
  });
  useEffect(
    () => () => {
      for (const f of picked.current) URL.revokeObjectURL(f.url);
    },
    [],
  );

  const personKind = kind === "character" || kind === "voice";
  const max = maxFilesFor(kind);
  const draftConsent: ElementConsent | null =
    personKind && consent.real
      ? {
          subject: consent.subject.trim(),
          relationship: consent.relationship,
          grantedOn: consent.grantedOn,
          use: consent.use.trim(),
          // Set to the moment of saving in save(); a number here so the draft checks as complete.
          affirmedAt: element?.consent?.affirmedAt ?? 0,
          withdrawnAt: element?.consent?.withdrawnAt ?? null,
        }
      : null;
  const checkedFiles = replacing
    ? files.map((f) => ({ mime: f.mime, size: f.data.length, durationS: f.durationS }))
    : (element?.files ?? []).map((f) => ({ mime: f.mime, size: f.size, durationS: f.durationS }));
  const problems = [
    ...elementDraftProblems({ kind, name, description, consent: draftConsent, files: checkedFiles }),
    ...(personKind && consent.real && !consent.affirmed ? ["Confirm you have this person's permission, or that it's you."] : []),
    ...(rules ? [] : ["Confirm the Elements rules."]),
  ];
  const quiet = new Set(["Give it a name.", "Add 1 to 4 images.", "A voice is one audio clip.", "Confirm the Elements rules.", "Say who gave consent."]);
  const shown = attempted ? problems : problems.filter((p) => !quiet.has(p));

  const add = async (picked: File[]) => {
    setReading(true);
    try {
      const room = Math.max(0, max - files.length);
      const read = await Promise.all(picked.slice(0, room).map((f) => pickFile(f)));
      setFiles((current) => [...current, ...read].slice(0, max));
    } finally {
      setReading(false);
    }
  };
  const removeFile = (index: number) =>
    setFiles((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, i) => i !== index);
    });

  async function save() {
    setAttempted(true);
    if (problems.length || library.busy) return;
    const consentRecord = draftConsent && { ...draftConsent, affirmedAt: draftConsent.affirmedAt || Math.floor(Date.now() / 1000) };
    const base = { kind, name, description, consent: consentRecord };
    const saved =
      element && !replacing
        ? await library.update(element, base)
        : element
          ? await library.update(element, { ...base, files })
          : await library.create({ ...base, files });
    if (saved) onDone(saved);
  }

  return (
    <form
      className={styles.form}
      aria-labelledby={`${ids}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className={styles.formTitle} id={`${ids}-title`}>
        {editing ? `Edit ${element?.name}` : "New Element"}
      </h2>
      <div className={styles.kinds} role="radiogroup" aria-label="Kind">
        {ELEMENT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            disabled={editing && k !== kind}
            title={editing && k !== kind ? "To change the kind, make a new Element." : undefined}
            onClick={() => {
              if ((k === "voice") !== (kind === "voice")) {
                for (const f of files) URL.revokeObjectURL(f.url);
                setFiles([]);
              }
              setKind(k);
            }}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <p className={styles.fine}>{KIND_HINT[kind]}</p>

      <div className={styles.row}>
        <label className={styles.field}>
          <span>Name</span>
          <input value={name} maxLength={ELEMENT_LIMITS.maxNameChars} placeholder={kind === "voice" ? "e.g. Narrator" : "e.g. Mara"} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <label className={styles.field}>
        <span>Description · added to your prompt when you use it</span>
        <textarea
          value={description}
          maxLength={ELEMENT_LIMITS.maxDescriptionChars}
          placeholder={kind === "voice" ? "e.g. a warm, low voice with a slight rasp" : "e.g. a woman in her 60s with short silver hair and a green raincoat"}
          onChange={(e) => setDescription(e.target.value)}
        />
        <span className={styles.counter}>
          {description.length}/{ELEMENT_LIMITS.maxDescriptionChars.toLocaleString("en-US")}
        </span>
      </label>

      <div className={styles.field}>
        <span>{kind === "voice" ? "Voice clip" : `Pictures · ${replacing ? files.length : (element?.files.length ?? 0)}/${max}`}</span>
        {editing && !replacing ? (
          <>
            {element && <ElementPreview element={element} library={library} all />}
            <div className={styles.actions}>
              <button type="button" className={styles.button} onClick={() => setReplacing(true)}>
                {kind === "voice" ? "Replace the clip" : "Replace the pictures"}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.slots}>
            {files.map((f, n) => (
              <MediaSlot key={f.url} size="sm" label={kind === "voice" ? "Voice clip" : `Picture ${n + 1}`} item={asItem(f, n)} accept={acceptFor(kind)} onRemove={() => removeFile(n)} />
            ))}
            {files.length < max && (
              <MediaSlot
                size="sm"
                label={kind === "voice" ? "Add a clip" : "Add pictures"}
                accept={acceptFor(kind)}
                multiple={kind !== "voice"}
                disabled={reading}
                note={reading ? "Reading…" : kind === "voice" ? "WAV, MP3, Ogg, FLAC" : `${max - files.length} left`}
                onFiles={(picked) => void add(picked)}
              />
            )}
          </div>
        )}
        {editing && replacing && <p className={styles.fine}>Saving replaces every {kind === "voice" ? "clip" : "picture"} with the ones here.</p>}
      </div>

      {personKind && (
        <fieldset className={styles.consent}>
          <legend>Real person</legend>
          <label className={styles.check}>
            <input type="checkbox" checked={consent.real} onChange={(e) => setConsent({ ...consent, real: e.target.checked })} />
            <span>{kind === "voice" ? "This is a real person's voice" : "This shows a real person"}</span>
          </label>
          {consent.real && (
            <>
              <div className={styles.radios} role="radiogroup" aria-label="Whose consent">
                <label className={styles.check}>
                  <input type="radio" name={`${ids}-rel`} checked={consent.relationship === "self"} onChange={() => setConsent({ ...consent, relationship: "self" })} />
                  <span>It&apos;s me</span>
                </label>
                <label className={styles.check}>
                  <input type="radio" name={`${ids}-rel`} checked={consent.relationship === "permission"} onChange={() => setConsent({ ...consent, relationship: "permission" })} />
                  <span>They gave me permission</span>
                </label>
              </div>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Their name</span>
                  <input value={consent.subject} maxLength={ELEMENT_LIMITS.maxConsentChars} onChange={(e) => setConsent({ ...consent, subject: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span>Consent given on</span>
                  <input type="date" value={consent.grantedOn} max={today()} onChange={(e) => setConsent({ ...consent, grantedOn: e.target.value })} />
                </label>
              </div>
              <label className={styles.field}>
                <span>What they agreed to</span>
                <input value={consent.use} maxLength={ELEMENT_LIMITS.maxConsentChars} onChange={(e) => setConsent({ ...consent, use: e.target.value })} />
              </label>
              <label className={styles.check}>
                <input type="checkbox" checked={consent.affirmed} onChange={(e) => setConsent({ ...consent, affirmed: e.target.checked })} />
                <span>I am this person, or I have their permission to use their likeness{kind === "voice" ? " and voice" : ""} this way.</span>
              </label>
              {element?.consent?.withdrawnAt ? <p className={styles.error}>Consent was withdrawn: this Element can&apos;t be used in new videos.</p> : null}
            </>
          )}
          <p className={styles.fine}>The consent record is encrypted with the rest of the Element.</p>
        </fieldset>
      )}

      <label className={styles.check}>
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
        <span>{ELEMENT_RULES_SENTENCE}</span>
      </label>

      {shown.length > 0 && (
        <ul className={styles.problems} aria-label="Problems to fix">
          {shown.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {library.busy && (
        <p className={styles.status} role="status">
          {library.busy}
        </p>
      )}
      {library.error && (
        <p className={styles.error} role="alert">
          {library.error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={Boolean(library.busy) || reading}>
          {editing ? "Save changes" : "Save Element"}
        </button>
        <button type="button" className={styles.button} disabled={Boolean(library.busy)} onClick={() => onDone(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ElementsLibrary({
  library,
  keySync,
  profiles,
  onUse,
}: {
  library: Library;
  keySync: KeySync;
  profiles: ModelProfile[];
  onUse: (element: Element) => void;
}) {
  const [editing, setEditing] = useState<Element | "new" | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const { status, elements } = library;

  const intro = (
    <section className={`info-banner ${styles.banner}`} aria-labelledby="elements-title">
      <h2 id="elements-title" className={styles.bannerTitle}>
        <UsersRound size={18} aria-hidden /> Your Elements
      </h2>
      <p className={styles.fine}>
        Characters, products, places, styles and voices to reuse across videos. {ELEMENTS_PRIVACY_SENTENCE}
      </p>
      <p className={styles.rules}>
        <strong>Rules:</strong> {ELEMENT_RULES_SENTENCE}
      </p>
    </section>
  );

  if (status === "signed_out") {
    return (
      <div className={styles.page}>
        {intro}
        <p className={styles.fine}>Sign in with your email to make Elements.</p>
      </div>
    );
  }
  if (status === "key_sync_off" || status === "locked") {
    return (
      <div className={styles.page} data-elements={status}>
        {intro}
        <p className={styles.fine}>
          {status === "key_sync_off"
            ? "Elements are encrypted with key sync's keys, so they open on every device you unlock and nowhere else. Turn on key sync to make your first one."
            : "Unlock key sync in this browser to open your Elements."}
        </p>
        <KeySyncPanel sync={keySync} />
      </div>
    );
  }
  if (status === "loading" || status === "unavailable") {
    return (
      <div className={styles.page} data-elements={status}>
        {intro}
        <p className={styles.fine} role="status">
          {status === "loading" ? "Opening your Elements…" : "Elements aren't available right now. Try again in a moment."}
        </p>
        {library.error && (
          <p className={styles.error} role="alert">
            {library.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page} data-elements="ready">
      {intro}
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          disabled={editing !== null || elements.length >= ELEMENT_LIMITS.maxElements}
          onClick={() => {
            library.setError(null);
            setEditing("new");
          }}
        >
          <Plus size={15} aria-hidden /> New Element
        </button>
        <span className={styles.counter}>
          {elements.length}/{ELEMENT_LIMITS.maxElements} Elements
        </span>
      </div>

      {editing === "new" && <ElementForm library={library} onDone={() => setEditing(null)} />}

      {library.unreadable > 0 && (
        <p className={styles.error} role="status">
          {library.unreadable === 1 ? "One Element" : `${library.unreadable} Elements`} didn&apos;t open with this browser&apos;s keys. They may have been made
          before your keys were rotated.
        </p>
      )}
      {library.error && editing === null && (
        <p className={styles.error} role="alert">
          {library.error}
        </p>
      )}

      {elements.length === 0 && editing === null ? (
        <div className={styles.empty}>
          <UsersRound size={32} strokeWidth={1.2} aria-hidden />
          <h2>No Elements yet</h2>
          <p>Save a character, product, place, style or voice once, then add it to any video from the composer.</p>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Elements">
          {elements.map((element) =>
            editing !== null && editing !== "new" && editing.elementId === element.elementId ? (
              <li key={element.elementId} style={{ gridColumn: "1 / -1" }}>
                <ElementForm library={library} element={element} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={element.elementId}>
                <article className={styles.card} data-element={element.elementId} aria-label={element.name}>
                  <ElementPreview element={element} library={library} />
                  <div className={styles.head}>
                    <span className={styles.name}>{element.name}</span>
                    <span className={styles.badge}>{KIND_LABEL[element.kind]}</span>
                    {element.consent && (
                      <span className={styles.badge} data-tone={consentWithdrawn(element) ? "warn" : undefined}>
                        {consentWithdrawn(element) ? "Consent withdrawn" : element.consent.relationship === "self" ? "Real person · you" : "Real person · consent recorded"}
                      </span>
                    )}
                  </div>
                  {element.description && <p className={styles.description}>{element.description}</p>}
                  <p className={styles.uses}>
                    <strong>{element.kind === "voice" ? "Voice" : "Pictures"}:</strong> {modelUsesSentence(element, profiles)} <strong>Description:</strong> every model.
                  </p>
                  <div className={styles.actions}>
                    <button type="button" className={`${styles.button} ${styles.primary}`} disabled={consentWithdrawn(element)} onClick={() => onUse(element)}>
                      <WandSparkles size={14} aria-hidden /> Use in a video
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      disabled={editing !== null}
                      onClick={() => {
                        library.setError(null);
                        setEditing(element);
                      }}
                    >
                      <Pencil size={14} aria-hidden /> Edit
                    </button>
                    {element.consent && !consentWithdrawn(element) && (
                      <button
                        type="button"
                        className={styles.button}
                        disabled={Boolean(library.busy)}
                        onClick={() => {
                          if (window.confirm(`Mark consent for ${element.name} as withdrawn? It can't be used in new videos after this. Videos already made aren't changed.`)) {
                            const { kind, name, description } = element;
                            void library.update(element, { kind, name, description, consent: { ...element.consent!, withdrawnAt: Math.floor(Date.now() / 1000) } });
                          }
                        }}
                      >
                        Consent withdrawn
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.button} ${styles.danger}`}
                      disabled={Boolean(library.busy)}
                      aria-label={`Delete ${element.name}`}
                      onClick={() => {
                        if (window.confirm(`Delete ${element.name}? Its pictures, voice and details are deleted for good. Videos already made aren't changed.`)) {
                          void library.remove(element);
                        }
                      }}
                    >
                      <Trash2 size={14} aria-hidden /> Delete
                    </button>
                  </div>
                </article>
              </li>
            ),
          )}
        </ul>
      )}

      <details className={styles.details}>
        <summary>
          <Code2 size={13} aria-hidden style={{ display: "inline", marginRight: 6 }} />
          Use Elements from your own code
        </summary>
        <p className={styles.fine}>
          The SDK opens your Elements with this Elements key and an API key. It opens Elements only, not your video keys. Keep it secret like a password.
          Rotating your keys replaces it.
        </p>
        {showKey && library.keyText ? (
          <>
            <output className={styles.keyText} aria-label="Your Elements key">
              {library.keyText}
            </output>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => void navigator.clipboard?.writeText(library.keyText!).then(() => setCopied(true), () => undefined)}
              >
                {copied ? "Copied" : "Copy key"}
              </button>
              <button type="button" className={styles.button} onClick={() => setShowKey(false)}>
                Hide
              </button>
            </div>
          </>
        ) : (
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => setShowKey(true)}>
              Show Elements key
            </button>
          </div>
        )}
      </details>
    </div>
  );
}
