"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useModels, type LiveModels } from "@/lib/useModels";

const Ctx = createContext<LiveModels>({ data: null, settled: false, error: null });

/** One /v1/models poller shared by every live widget on a page. */
export function LiveModelsProvider({ children }: { children: ReactNode }) {
  const live = useModels();
  return <Ctx.Provider value={live}>{children}</Ctx.Provider>;
}

export function useLiveModels(): LiveModels {
  return useContext(Ctx);
}
