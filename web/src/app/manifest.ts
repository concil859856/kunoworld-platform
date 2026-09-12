import type { MetadataRoute } from "next";

import { SITE } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — a private AI film studio`,
    short_name: SITE.name,
    description:
      "Make video inside sealed hardware. Prompts and footage are encrypted on your device and opened only inside the stage that renders them.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0907",
    theme_color: "#0b0907",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
