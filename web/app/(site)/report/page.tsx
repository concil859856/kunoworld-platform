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
              KunoWorld operators open a video only for a report of <strong>child sexual abuse material</strong> or{" "}
              <strong>sexual content involving a minor</strong>, or when it is under a legal hold. Every view is logged.
              Nobody at KunoWorld browses or samples videos.
            </p>
            <p className={styles.fine}>
              <strong>Other reports</strong> (harassment, copyright, extremism, intimate imagery shared without consent,
              and so on) are handled without opening the video: from what you tell us, the job&apos;s details and the
              account&apos;s history. We can still remove the video or restrict the account.
            </p>
            <p className={styles.fine}>
              <strong>Standard videos</strong> are stored readable by KunoWorld&apos;s systems. <strong>Private
              videos</strong> are encrypted end to end: even for a child-safety report, a reviewer can open one only if
              the report includes its output key.
            </p>
            <p className={styles.fine}>
              NSFW content is banned in both modes. Reports about children are handled first, and every action taken on a
              report is recorded.
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
