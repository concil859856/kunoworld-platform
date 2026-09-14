import type { Metadata } from "next";
import { headers } from "next/headers";

import styles from "@/components/site/Share.module.css";
import { SharedVideo, type ShareDetails } from "@/components/site/SharedVideo";
import { gateway } from "@/lib/gateway.server";

/*
 * A video its owner shared with a link. Only the details and the video pass through this site's server; a private
 * video's key is in the link's fragment, which never reaches any server. Share pages are never indexed or cached.
 */

export const metadata: Metadata = {
  title: "A shared video — KunoWorld",
  description: "A video shared with a KunoWorld link.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

type Problem = "not_found" | "gone" | "busy" | "unavailable";

const PROBLEMS: Record<Problem, { title: string; message: string }> = {
  not_found: { title: "This link isn't valid", message: "Check that you copied the whole link." },
  gone: {
    title: "This link no longer works",
    message: "Its owner may have revoked it, it may have expired, or the video is no longer available.",
  },
  busy: { title: "Too many requests", message: "Too many requests came from your network. Try again in a minute." },
  unavailable: { title: "This video can't be shown right now", message: "KunoWorld can't be reached. Try again in a moment." },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let details: ShareDetails | null = null;
  let problem: Problem = "not_found";
  if (TOKEN.test(token)) {
    // The gateway limits share views per visitor; behind Cloudflare, pass on who that is.
    const visitor = (await headers()).get("cf-connecting-ip");
    const result = await gateway<ShareDetails>(`/v1/shares/${token}`, visitor ? { headers: { "cf-connecting-ip": visitor } } : {});
    if (result.ok) details = result.data;
    else problem = result.error.status === 404 ? "not_found" : result.error.status === 410 ? "gone" : result.error.status === 429 ? "busy" : "unavailable";
  }

  return (
    <div className={styles.page}>
      <header className="page-heading">
        <span className="section-kicker">SHARED WITH A LINK</span>
        <h1>{details ? "A video shared with you" : PROBLEMS[problem].title}</h1>
        <p>{details ? "Made with KunoWorld. Anyone with this link can watch it until its owner revokes the link." : PROBLEMS[problem].message}</p>
      </header>
      <div className="inner-content">
        {details ? (
          <SharedVideo token={token} details={details} />
        ) : (
          <p className="notice" role="alert">
            {PROBLEMS[problem].title}. {PROBLEMS[problem].message}
          </p>
        )}
      </div>
    </div>
  );
}
