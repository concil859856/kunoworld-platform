import Link from "next/link";

import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="wrap" style={{ paddingBlock: "18vh 4vh", textAlign: "center" }}>
        <p className="eyebrow">Reel missing · 404</p>
        <h1 className="display" style={{ fontSize: "clamp(40px, 7vw, 84px)", marginBlock: "18px 20px" }}>
          This scene was <em>cut</em>.
        </h1>
        <p className="muted" style={{ marginBottom: 28 }}>
          The page you asked for isn&apos;t in this print.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to the start
        </Link>
      </main>
      <Footer />
    </>
  );
}
