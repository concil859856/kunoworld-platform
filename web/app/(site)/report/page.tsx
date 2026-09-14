import type { Metadata } from "next";

import styles from "@/components/site/Account.module.css";
import { ReportForm } from "@/components/site/ReportForm";

export const metadata: Metadata = {
  title: "Report a video — KunoWorld",
  description: "Report a KunoWorld video that breaks the rules, by its certificate digest, job ID or a link. No account needed.",
};

type Query = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value.slice(0, 2000) : undefined);

export default async function Report({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const initial = { jobId: one(query.job_id), digest: one(query.digest) ?? one(query.sha256), url: one(query.url) };

  return (
    <div className={styles.account}>
      <header className="page-heading">
        <span className="section-kicker">REPORT A VIDEO</span>
        <h1>Report a video</h1>
        <p>Tell us about a KunoWorld video that breaks the rules. You don&apos;t need an account.</p>
      </header>

      <div className="inner-content">
        <p className="notice">
          <strong>If someone is in immediate danger,</strong> contact your local emergency services first.
        </p>

        <section className={styles.grid}>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Your report</h2>
            <ReportForm initial={initial} />
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>What we can look at</h2>
            <p className={styles.fine}>
              <strong>Standard videos</strong> are kept readable by KunoWorld, so a reviewer can watch the video and read
              the prompt behind it.
            </p>
            <p className={styles.fine}>
              <strong>Private videos</strong> are encrypted end to end, and nobody at KunoWorld can open them. A reviewer
              can see one only if your report includes its output key. Without the key we can still act on the account
              that made it, but not look at the video.
            </p>
            <p className={styles.fine}>
              Reports about child sexual abuse material and sexual content involving minors are handled first. Every
              action taken on a report is recorded.
            </p>
            <p className={styles.fine}>
              How reports, strikes and reviews work is set out in the{" "}
              <a className="text-link" href="/terms#enforcement">
                Terms
              </a>{" "}
              and the{" "}
              <a className="text-link" href="/privacy-policy#moderation">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
