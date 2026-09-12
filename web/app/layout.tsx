import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/config";
export const metadata: Metadata = { metadataBase: new URL(SITE.url), title: "KunoWorld — Think it. Make it move.", description: "Explore a new world of AI video. Create with text and images, discover MiniMax H3 and LTX-2.5, and build with the KunoWorld video protocol." };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en" className="dark"><body>{children}</body></html>}
