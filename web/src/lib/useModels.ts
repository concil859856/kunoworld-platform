"use client";

import type { ModelsResponse } from "@kunoworld/sdk";
import { useEffect, useState } from "react";

import { makeClient } from "./kuno";

export interface LiveModels {
  data: ModelsResponse | null;
  /** True once the first request settled (either way). */
  settled: boolean;
  error: unknown;
}

/**
 * Live /v1/models (public). Polls while the tab is visible. On failure the data is
 * dropped rather than kept stale, so pages show "—" instead of old numbers.
 */
export function useModels(pollMs = 30_000): LiveModels {
  const [state, setState] = useState<LiveModels>({ data: null, settled: false, error: null });

  useEffect(() => {
    const client = makeClient();
    let alive = true;
    let timer: number | undefined;

    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const data = await client.models(0);
          if (alive) setState({ data, settled: true, error: null });
        } catch (error) {
          if (alive) setState({ data: null, settled: true, error });
        }
      }
      if (alive) timer = window.setTimeout(tick, pollMs);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void tick();
      }
    };
    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs]);

  return state;
}
