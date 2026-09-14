/**
 * The studio's privacy mode, remembered per browser. Private is the default, including during
 * server rendering and whenever storage is unavailable.
 */

import type { PrivacyMode } from "@kunoworld/sdk";
import { useSyncExternalStore } from "react";

import { privacyOf } from "./privacy-copy";

const STORAGE = "kuno.privacy.v1";
const EVENT = "kuno:privacy";

function read(): PrivacyMode {
  try {
    return privacyOf(window.localStorage.getItem(STORAGE));
  } catch {
    return "private";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function setPrivacyChoice(mode: PrivacyMode): void {
  try {
    window.localStorage.setItem(STORAGE, mode);
  } catch {
    /* storage blocked: the choice lasts for this page */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function usePrivacyChoice(): PrivacyMode {
  return useSyncExternalStore(subscribe, read, () => "private");
}
