/**
 * Key sync, the browser's half. The gateway's half is platform/gateway/src/kuno_gateway/key_vault.py, and the design
 * is written up in subnet/PRIVACY_MODES.md ("Key sync").
 *
 * KunoWorld must never be able to open a Private video, so everything key sync stores is wrapped here first, under
 * keys the server never receives:
 *
 * - **Master key.** 32 random bytes from `crypto.getRandomValues`, one per account.
 * - **Recovery code.** 160 random bits shown once as 32 Crockford base32 characters in groups of four. PBKDF2-HMAC-
 *   SHA256 with 600,000 iterations (OWASP Password Storage Cheat Sheet's figure for PBKDF2-HMAC-SHA256) and a random
 *   16-byte salt derives an AES-256-GCM key that wraps the master key.
 * - **Passkey.** The WebAuthn PRF extension evaluated on a random 32-byte salt. Its 32-byte output is key material, not
 *   a key: HKDF-SHA256 (salt "kuno/keyvault/v1", info "passkey-kek|<account_id>|<unlocker_id>") derives the AES-256-GCM
 *   key that wraps the master key.
 * - **Job keys.** Each Private take's record (its output key, the enclave's signing key, the content digest and the
 *   take's display details) is AES-256-GCM encrypted under the master key.
 *
 * A wrapped value is base64url of magic | 12-byte IV | ciphertext with its 16-byte tag. Associated data:
 *   master key: "KVM1|kuno/keyvault/master-key|<account_id>|<unlocker_id>|<kind>"
 *   job key:    "KVJ1|kuno/keyvault/job-key|<account_id>|<job_id>"
 *
 * Once unlocked, this browser remembers the master key in localStorage, next to the film keys it already keeps there,
 * so a reload doesn't ask again. Locking the browser forgets it.
 */

import { b64d, b64e, type JobHandle } from "@kunoworld/sdk";

import type { LibraryEntry, Step } from "./library";
import type { ShotSettings } from "./shot";

export type UnlockerKind = "recovery_code" | "passkey";

export interface RecoveryParams {
  alg: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
}

export interface PasskeyParams {
  credential_id: string;
  prf_salt: string;
  rp_id: string;
  transports?: string[];
}

/** An unlocker as the gateway stores it (`created_at` only comes back from the gateway). */
export interface Unlocker {
  unlocker_id: string;
  kind: UnlockerKind;
  label: string | null;
  params: RecoveryParams | PasskeyParams;
  wrapped_master_key: string;
  created_at?: number;
}

export interface WrappedJobKey {
  job_id: string;
  wrapped: string;
  created_at: number;
  updated_at: number;
}

/** `GET /v1/me/keyvault`. */
export interface Vault {
  account_id: string;
  master_key_id: string;
  version: number;
  created_at: number;
  updated_at: number;
  job_key_count: number;
  unlockers: Unlocker[];
  job_keys: WrappedJobKey[];
  next_cursor: string | null;
}

/** OWASP's current work factor for PBKDF2-HMAC-SHA256. The gateway refuses less. */
export const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_MAX_ITERATIONS = 10_000_000;
/** The gateway's limit on one wrapped job key. */
export const MAX_WRAPPED_JOB_KEY_CHARS = 4096;
/** How much of a take's prompt travels (encrypted) with its key, so another device's library can show it. */
export const MAX_SYNCED_PROMPT_CHARS = 500;
/** How much of each storyboard shot's prompt travels with its key; a record too large keeps only the shots' lengths and joins. */
export const MAX_SYNCED_SHOT_PROMPT_CHARS = 120;

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MASTER_MAGIC = "KVM1";
const JOB_MAGIC = "KVJ1";

export class KeySyncError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "KeySyncError";
  }
}

// ---------------------------------------------------------------- bytes

const encoder = new TextEncoder();

/** A copy backed by its own ArrayBuffer, which is what WebCrypto accepts. */
function own(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out;
}

const utf8 = (text: string): Uint8Array<ArrayBuffer> => own(encoder.encode(text));

function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function toBytes(source: BufferSource): Uint8Array<ArrayBuffer> {
  return own(ArrayBuffer.isView(source) ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength) : new Uint8Array(source));
}

/** 32 lowercase hex characters: ids for master keys and unlockers. */
export function newId(): string {
  return Array.from(random(16), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newMasterKey(): Uint8Array<ArrayBuffer> {
  return random(32);
}

// ---------------------------------------------------------------- recovery codes

/** 160 random bits as 32 Crockford base32 characters: "7K3Q-9ZXM-…" (8 groups of 4). */
export function generateRecoveryCode(): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of random(20)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD[(value >> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  return out.match(/.{4}/g)!.join("-");
}

/** Upper case without separators, reading O as 0 and I or L as 1; null when it can't be a code. */
export function normalizeRecoveryCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]+/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{32}$/.test(code) ? code : null;
}

// ---------------------------------------------------------------- AES-GCM wrapping

export const masterKeyAad = (accountId: string, unlockerId: string, kind: UnlockerKind): string =>
  `KVM1|kuno/keyvault/master-key|${accountId}|${unlockerId}|${kind}`;

export const jobKeyAad = (accountId: string, jobId: string): string => `KVJ1|kuno/keyvault/job-key|${accountId}|${jobId}`;

function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", own(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(key: CryptoKey, magic: string, plaintext: Uint8Array, aad: string): Promise<string> {
  const iv = random(12);
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: utf8(aad) }, key, own(plaintext));
  return b64e(concat(utf8(magic), iv, new Uint8Array(sealed)));
}

async function unseal(key: CryptoKey, magic: string, wrapped: string, aad: string): Promise<Uint8Array<ArrayBuffer>> {
  let raw: Uint8Array;
  try {
    raw = b64d(wrapped);
  } catch {
    throw new KeySyncError("corrupt", "A stored key is damaged.");
  }
  if (raw.length < 4 + 12 + 16 || new TextDecoder().decode(raw.subarray(0, 4)) !== magic) {
    throw new KeySyncError("corrupt", "A stored key is damaged.");
  }
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: own(raw.subarray(4, 16)), additionalData: utf8(aad) }, key, own(raw.subarray(16)));
  return new Uint8Array(plain);
}

async function recoveryKek(code: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", utf8(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: own(salt), iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function passkeyKek(prfOutput: Uint8Array, accountId: string, unlockerId: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", own(prfOutput), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: utf8("kuno/keyvault/v1"), info: utf8(`passkey-kek|${accountId}|${unlockerId}`) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function makeRecoveryUnlocker(accountId: string, masterKey: Uint8Array, code: string): Promise<Unlocker> {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new KeySyncError("invalid_code", "That isn't a recovery code.");
  const salt = random(16);
  const unlockerId = newId();
  const kek = await recoveryKek(normalized, salt, PBKDF2_ITERATIONS);
  return {
    unlocker_id: unlockerId,
    kind: "recovery_code",
    label: "Recovery code",
    params: { alg: "PBKDF2-SHA256", iterations: PBKDF2_ITERATIONS, salt: b64e(salt) },
    wrapped_master_key: await seal(kek, MASTER_MAGIC, masterKey, masterKeyAad(accountId, unlockerId, "recovery_code")),
  };
}

export async function unlockWithRecoveryCode(accountId: string, unlockers: Unlocker[], code: string): Promise<Uint8Array<ArrayBuffer>> {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) {
    throw new KeySyncError("invalid_code", "A recovery code is 32 letters and digits in groups of four. Check what you typed.");
  }
  const codes = unlockers.filter((u) => u.kind === "recovery_code");
  if (!codes.length) throw new KeySyncError("no_recovery_code", "This account has no recovery code. Use a passkey.");
  for (const unlocker of codes) {
    const params = unlocker.params as RecoveryParams;
    // Refuse parameters the gateway wouldn't have accepted, so a tampered response can't stall this tab.
    if (params.alg !== "PBKDF2-SHA256" || !(params.iterations >= PBKDF2_ITERATIONS && params.iterations <= PBKDF2_MAX_ITERATIONS)) continue;
    try {
      const kek = await recoveryKek(normalized, b64d(params.salt), params.iterations);
      const master = await unseal(kek, MASTER_MAGIC, unlocker.wrapped_master_key, masterKeyAad(accountId, unlocker.unlocker_id, "recovery_code"));
      if (master.length === 32) return master;
    } catch {
      /* not this unlocker */
    }
  }
  throw new KeySyncError("wrong_code", "That recovery code doesn't unlock these keys.");
}

// ---------------------------------------------------------------- passkeys (WebAuthn PRF)

export function passkeysAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && Boolean(navigator.credentials?.create);
}

function prfOutput(credential: PublicKeyCredential): Uint8Array<ArrayBuffer> | null {
  const first = credential.getClientExtensionResults().prf?.results?.first;
  return first ? toBytes(first) : null;
}

function passkeyError(err: unknown): KeySyncError {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "AbortError") {
    return new KeySyncError("passkey_canceled", "The passkey prompt was closed or timed out.");
  }
  if (name === "InvalidStateError") {
    return new KeySyncError("passkey_exists", "This device already has a KunoWorld passkey for these keys.");
  }
  return new KeySyncError("passkey_failed", "The passkey didn't work. Try again, or use your recovery code.");
}

const PRF_UNSUPPORTED =
  "This passkey can't unlock keys: its provider doesn't support the WebAuthn PRF extension. Try another passkey provider, or use your recovery code.";

interface PasskeyTarget {
  id: Uint8Array;
  salt: Uint8Array;
  transports?: string[];
}

async function assert(rpId: string, targets: PasskeyTarget[]): Promise<{ credentialId: string; output: Uint8Array<ArrayBuffer> | null }> {
  const evalByCredential: Record<string, AuthenticationExtensionsPRFValues> = {};
  for (const target of targets) evalByCredential[b64e(target.id)] = { first: own(target.salt) };
  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        rpId,
        allowCredentials: targets.map((t) => ({ type: "public-key", id: own(t.id), transports: t.transports as AuthenticatorTransport[] | undefined })),
        userVerification: "required",
        timeout: 120_000,
        extensions: { prf: { evalByCredential } },
      },
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw passkeyError(err);
  }
  if (!assertion) throw new KeySyncError("passkey_canceled", "The passkey prompt was closed or timed out.");
  return { credentialId: b64e(new Uint8Array(assertion.rawId)), output: prfOutput(assertion) };
}

/** Registers a passkey on this device and wraps the master key under its PRF output. */
export async function makePasskeyUnlocker(
  accountId: string,
  masterKey: Uint8Array,
  { userName, label, exclude = [] }: { userName: string; label?: string; exclude?: string[] },
): Promise<Unlocker> {
  if (!passkeysAvailable()) throw new KeySyncError("passkey_unsupported", "This browser doesn't support passkeys.");
  const rpId = window.location.hostname;
  const prfSalt = random(32);
  const unlockerId = newId();
  let created: PublicKeyCredential | null;
  try {
    created = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "KunoWorld", id: rpId },
        user: { id: utf8(accountId), name: userName, displayName: userName },
        challenge: random(32),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        excludeCredentials: exclude.map((id) => ({ type: "public-key", id: own(b64d(id)) })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
        timeout: 120_000,
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw passkeyError(err);
  }
  if (!created) throw new KeySyncError("passkey_canceled", "No passkey was created.");
  if (created.getClientExtensionResults().prf?.enabled === false) throw new KeySyncError("passkey_unsupported", PRF_UNSUPPORTED);
  const rawId = new Uint8Array(created.rawId);
  const response = created.response as AuthenticatorAttestationResponse;
  const transports = (typeof response.getTransports === "function" ? response.getTransports() : [])
    .filter((t) => /^[a-z][a-z-]{0,15}$/.test(t))
    .slice(0, 8);
  // Some platforms return the PRF output at creation; the rest need one assertion.
  const output = prfOutput(created) ?? (await assert(rpId, [{ id: rawId, salt: prfSalt, transports }])).output;
  if (!output) throw new KeySyncError("passkey_unsupported", PRF_UNSUPPORTED);
  const kek = await passkeyKek(output, accountId, unlockerId);
  return {
    unlocker_id: unlockerId,
    kind: "passkey",
    label: label ?? "Passkey",
    params: { credential_id: b64e(rawId), prf_salt: b64e(prfSalt), rp_id: rpId, transports },
    wrapped_master_key: await seal(kek, MASTER_MAGIC, masterKey, masterKeyAad(accountId, unlockerId, "passkey")),
  };
}

/** The passkeys that can work on this site: a passkey belongs to the host it was made on. */
export function passkeysForThisSite(unlockers: Unlocker[]): Unlocker[] {
  if (typeof window === "undefined") return [];
  return unlockers.filter((u) => u.kind === "passkey" && (u.params as PasskeyParams).rp_id === window.location.hostname);
}

export async function unlockWithPasskey(accountId: string, unlockers: Unlocker[]): Promise<Uint8Array<ArrayBuffer>> {
  const passkeys = passkeysForThisSite(unlockers);
  if (!passkeys.length) throw new KeySyncError("no_passkey", "No passkey for this site unlocks these keys. Use your recovery code.");
  const { credentialId, output } = await assert(
    window.location.hostname,
    passkeys.map((u) => {
      const p = u.params as PasskeyParams;
      return { id: b64d(p.credential_id), salt: b64d(p.prf_salt), transports: p.transports };
    }),
  );
  const unlocker = passkeys.find((u) => (u.params as PasskeyParams).credential_id === credentialId);
  if (!unlocker) throw new KeySyncError("wrong_passkey", "That passkey doesn't unlock these keys.");
  if (!output) throw new KeySyncError("passkey_unsupported", PRF_UNSUPPORTED);
  try {
    const kek = await passkeyKek(output, accountId, unlocker.unlocker_id);
    return await unseal(kek, MASTER_MAGIC, unlocker.wrapped_master_key, masterKeyAad(accountId, unlocker.unlocker_id, "passkey"));
  } catch {
    throw new KeySyncError("wrong_passkey", "That passkey didn't unlock these keys.");
  }
}

// ---------------------------------------------------------------- job key records

/** What one synced key record holds. Everything needed to find, verify and open the take on another device. */
export interface JobKeyRecord {
  v: 1;
  jobId: string;
  outputKey: string;
  signingPublicKey: string;
  enclaveId: string;
  profileId: string;
  fallbackReason: string | null;
  /** The handle's creation time, Unix seconds. */
  createdAt: number;
  /** Known once the take has rendered and its receipt checked. */
  contentDigest: string | null;
  meta?: {
    prompt: string;
    createdAtMs: number;
    tab: LibraryEntry["tab"];
    editOp: LibraryEntry["editOp"];
    mode: LibraryEntry["mode"];
    requestedProfileId: string;
    settings: ShotSettings;
    inputs: Array<Omit<LibraryEntry["inputs"][number], "name">>;
    price: number | null;
    /** A storyboard's shots. Records from before storyboards have none. */
    shots?: NonNullable<LibraryEntry["shots"]>;
  };
}

const FALLBACK_SETTINGS: ShotSettings = {
  resolution: "",
  aspectRatio: "16:9",
  durationS: 5,
  fps: 24,
  audio: true,
  seed: "",
  negativePrompt: "",
  enhance: false,
};

/** A take whose key is worth syncing: a submitted private take that didn't fail. */
export function syncable(entry: LibraryEntry): boolean {
  const handle = entry.handle as JobHandle | null;
  return Boolean(
    handle &&
      entry.privacy !== "standard" &&
      typeof handle.outputKey === "string" &&
      typeof handle.signingPublicKey === "string" &&
      !entry.id.startsWith("local-") &&
      entry.step !== "failed" &&
      entry.step !== "canceled",
  );
}

/** What a take's synced record says about it; a change means the record is uploaded again. */
export function syncedState(entry: LibraryEntry): string {
  return entry.receipt?.body.content_digest ?? "";
}

function recordFor(entry: LibraryEntry): JobKeyRecord {
  const handle = entry.handle as JobHandle;
  return {
    v: 1,
    jobId: handle.jobId,
    outputKey: handle.outputKey,
    signingPublicKey: handle.signingPublicKey,
    enclaveId: handle.enclaveId,
    profileId: handle.profileId,
    fallbackReason: handle.fallbackReason ?? null,
    createdAt: handle.createdAt,
    contentDigest: syncedState(entry) || null,
    meta: {
      prompt: entry.prompt.slice(0, MAX_SYNCED_PROMPT_CHARS),
      createdAtMs: entry.createdAt,
      tab: entry.tab,
      editOp: entry.editOp,
      mode: entry.mode,
      requestedProfileId: entry.requestedProfileId,
      settings: entry.settings,
      inputs: entry.inputs.map(({ role, timeS, startS, endS }) => ({ role, timeS, startS, endS })),
      price: entry.price,
      shots: entry.shots?.map(({ prompt, durationS, join }) => ({ prompt: prompt.slice(0, MAX_SYNCED_SHOT_PROMPT_CHARS), durationS, join })),
    },
  };
}

/** Wraps a take's key record under the master key, trimming its display details if it would be too large. */
export async function wrapJobKey(accountId: string, masterKey: Uint8Array, entry: LibraryEntry): Promise<string> {
  const key = await aesKey(masterKey);
  const full = recordFor(entry);
  const trimmed = full.meta && {
    ...full.meta,
    prompt: full.meta.prompt.slice(0, 80),
    inputs: [],
    shots: full.meta.shots?.map((shot) => ({ ...shot, prompt: "" })),
  };
  const attempts: JobKeyRecord[] = [full, { ...full, meta: trimmed }, { ...full, meta: undefined }];
  for (const record of attempts) {
    const wrapped = await seal(key, JOB_MAGIC, utf8(JSON.stringify(record)), jobKeyAad(accountId, record.jobId));
    if (wrapped.length <= MAX_WRAPPED_JOB_KEY_CHARS) return wrapped;
  }
  throw new KeySyncError("too_large", "This take's key record is too large to sync.");
}

export async function unwrapJobKey(accountId: string, masterKey: Uint8Array, item: WrappedJobKey): Promise<JobKeyRecord> {
  let record: JobKeyRecord;
  try {
    const plain = await unseal(await aesKey(masterKey), JOB_MAGIC, item.wrapped, jobKeyAad(accountId, item.job_id));
    record = JSON.parse(new TextDecoder().decode(plain)) as JobKeyRecord;
  } catch {
    throw new KeySyncError("corrupt", "A synced key didn't open with this master key.");
  }
  if (record?.v !== 1 || record.jobId !== item.job_id || typeof record.outputKey !== "string" || typeof record.signingPublicKey !== "string") {
    throw new KeySyncError("corrupt", "A synced key record is malformed.");
  }
  return record;
}

/** For a rotation: opens a record with the old master key and wraps the same bytes under the new one. */
export async function rewrapJobKey(accountId: string, oldKey: Uint8Array, newKey: Uint8Array, item: WrappedJobKey): Promise<string> {
  const aad = jobKeyAad(accountId, item.job_id);
  let plain: Uint8Array;
  try {
    plain = await unseal(await aesKey(oldKey), JOB_MAGIC, item.wrapped, aad);
  } catch {
    throw new KeySyncError("corrupt", "A synced key didn't open, so the rotation stopped. Nothing changed.");
  }
  return seal(await aesKey(newKey), JOB_MAGIC, plain, aad);
}

/** A library entry for a take this browser learned about from key sync. Unfinished takes resume watching. */
export function entryFromRecord(record: JobKeyRecord): LibraryEntry {
  const meta = record.meta;
  const handle: JobHandle = {
    jobId: record.jobId,
    outputKey: record.outputKey,
    signingPublicKey: record.signingPublicKey,
    enclaveId: record.enclaveId,
    profileId: record.profileId,
    fallbackReason: record.fallbackReason,
    createdAt: record.createdAt,
  };
  const step: Step = record.contentDigest ? "ready" : "queued";
  return {
    id: record.jobId,
    handle,
    privacy: "private",
    createdAt: typeof meta?.createdAtMs === "number" ? meta.createdAtMs : record.createdAt * 1000,
    prompt: typeof meta?.prompt === "string" ? meta.prompt : "",
    tab: meta?.tab ?? "text",
    editOp: meta?.editOp ?? "edit",
    mode: meta?.mode ?? "text_to_video",
    requestedProfileId: meta?.requestedProfileId ?? record.profileId,
    profileId: record.profileId,
    fallbackReason: record.fallbackReason,
    settings: { ...FALLBACK_SETTINGS, ...meta?.settings },
    inputs: Array.isArray(meta?.inputs) ? meta.inputs.map((i) => ({ ...i, name: "" })) : [],
    shots: Array.isArray(meta?.shots) ? meta.shots : undefined,
    step,
    progress: step === "ready" ? 1 : 0,
    price: typeof meta?.price === "number" ? meta.price : null,
  };
}

// ---------------------------------------------------------------- this browser

const DEVICE_KEY = "kuno.keysync.v1:";
const SYNCED = "kuno.keysync.synced.v1:";
const DISMISSED = "kuno.keysync.prompt-dismissed.v1:";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: this browser asks again next time */
  }
}

export function loadDeviceKey(fingerprint: string): { masterKeyId: string; key: Uint8Array } | null {
  try {
    const parsed = JSON.parse(read(DEVICE_KEY + fingerprint) ?? "null") as { masterKeyId?: unknown; key?: unknown } | null;
    if (!parsed || typeof parsed.masterKeyId !== "string" || typeof parsed.key !== "string") return null;
    const key = b64d(parsed.key);
    return key.length === 32 ? { masterKeyId: parsed.masterKeyId, key } : null;
  } catch {
    return null;
  }
}

export function saveDeviceKey(fingerprint: string, masterKeyId: string, key: Uint8Array): void {
  write(DEVICE_KEY + fingerprint, JSON.stringify({ masterKeyId, key: b64e(key) }));
}

export function forgetDeviceKey(fingerprint: string): void {
  write(DEVICE_KEY + fingerprint, null);
}

/** job id → the synced state last uploaded or downloaded for it. */
export function loadSynced(fingerprint: string): Record<string, string> {
  try {
    const parsed = JSON.parse(read(SYNCED + fingerprint) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveSynced(fingerprint: string, synced: Record<string, string>): void {
  write(SYNCED + fingerprint, JSON.stringify(synced));
}

export function promptDismissed(fingerprint: string): boolean {
  return read(DISMISSED + fingerprint) === "1";
}

export function dismissPrompt(fingerprint: string): void {
  write(DISMISSED + fingerprint, "1");
}
