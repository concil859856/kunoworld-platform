import type { Metadata } from "next";
import Studio from "@/components/studio";
// Maps the restored composer trays' old palette tokens onto this theme.
import "@/app/studio-compat.css";
export const metadata: Metadata = { title: "Studio — KunoWorld", description: "Turn text and reference frames into video in the KunoWorld creative studio." };
export default function StudioPage() { return <div className="studio-shell"><Studio /></div>; }
