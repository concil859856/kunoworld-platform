import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KunoWorld — Think it. Make it move.", description: "Explore a new world of AI video. Create with text and images, discover MiniMax H3 and LTX-2.5, and build with the KunoWorld video protocol.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en" className="dark"><body>{children}</body></html>}
