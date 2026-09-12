import type { Metadata } from "next";

import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Make sealed, certified films with MiniMax H3 and LTX-2.5. Encrypted in your browser; keys never leave it.",
};

export default function StudioPage() {
  return <Studio />;
}
