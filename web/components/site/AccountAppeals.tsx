import { reasonLabel } from "@/lib/admin-types";
import { gateway } from "@/lib/gateway.server";
import { formatUntil } from "@/lib/privacy-copy";

import styles from "./Account.module.css";
import { AppealsPanel, type AppealRef, type AppealRow, type Notice } from "./AppealsPanel";

/** `GET /v1/me/standing`. */
interface Standing {
  strikes: Array<{
    strike_id: string;
    reason: string;
    created_at: number;
    /** Within the 30 days the strike rules look at. */
    recent: boolean;
    voided_at: number | null;
    appeal: AppealRef | null;
    appealable: boolean;
  }>;
  restrictions: Array<{
    restriction_id: string;
    kind: string;
    until: number | null;
    indefinite: boolean;
    source: string;
    reason: string | null;
    created_at: number;
    active: boolean;
    appeal: AppealRef | null;
    appealable: boolean;
  }>;
  removals: Array<{ job_id: string; privacy: string; removed_at: number | null; restored: boolean; appeal: AppealRef | null; appealable: boolean }>;
  report_resolutions: Array<{
    report_id: string;
    reason: string;
    resolution: string;
    resolved_at: number | null;
    appeal: AppealRef | null;
    appealable: boolean;
  }>;
  appeals_sent_today: number;
  appeals_per_day: number;
  max_statement: number;
}

const STRIKE_REASON: Record<string, string> = {
  content_policy: "A Standard prompt was refused under the content policy.",
  safety_blocked: "A take was blocked by the content check.",
  upload_blocked: "A Standard upload was refused by the scan.",
};

const RESOLUTION: Record<string, string> = {
  restrict_account: "the account was restricted",
  ban_account: "the account was banned",
  remove_content: "the video was removed",
};

const on = (ts: number | null) => (ts === null ? "" : ` on ${formatUntil(ts)}`);

/** Turns the account's standing into notices a customer can read and appeal from. Formatting happens here, on the server. */
function notices(standing: Standing): Notice[] {
  const out: Notice[] = [];
  for (const r of standing.restrictions) {
    if (!r.active && !r.appeal) continue;
    const what = r.kind === "ban" ? "Account banned" : "Account restricted";
    out.push({
      kind: "restriction",
      subjectId: r.restriction_id,
      noun: "restriction",
      title: !r.active ? `${what} (ended)` : r.indefinite || r.until === null ? `${what} until an operator reviews it` : `${what} until ${formatUntil(r.until)}`,
      detail: r.source === "strikes" ? `Automatic, after ${r.reason ?? "repeated strikes"}.` : "Placed by KunoWorld after a review.",
      appeal: r.appeal,
      appealable: r.appealable,
    });
  }
  for (const s of standing.strikes) {
    if ((s.voided_at !== null || !s.recent) && !s.appeal) continue;
    out.push({
      kind: "strike",
      subjectId: s.strike_id,
      noun: "strike",
      title: `Strike${on(s.created_at)}${s.voided_at !== null ? " (voided)" : ""}`,
      detail: STRIKE_REASON[s.reason] ?? "A take or upload was blocked by a content check.",
      appeal: s.appeal,
      appealable: s.appealable,
    });
  }
  for (const r of standing.removals) {
    out.push({
      kind: "removal",
      subjectId: r.job_id,
      noun: "removal",
      title: `Video removed${on(r.removed_at)}${r.restored ? " (restored)" : ""}`,
      detail: `A ${r.privacy === "standard" ? "Standard" : "Private"} video (job ${r.job_id}) was removed after a review.`,
      appeal: r.appeal,
      appealable: r.appealable,
    });
  }
  for (const r of standing.report_resolutions) {
    out.push({
      kind: "report_resolution",
      subjectId: r.report_id,
      noun: "decision",
      title: `Decision on a report${on(r.resolved_at)}`,
      detail: `A report (${reasonLabel(r.reason).toLowerCase()}) was reviewed, and ${RESOLUTION[r.resolution] ?? r.resolution.replace(/_/g, " ")}.`,
      appeal: r.appeal,
      appealable: r.appealable,
    });
  }
  return out;
}

/** The account page's "Appeals" section: notices of strikes, restrictions and removals to appeal from, and decisions. */
export async function AccountAppeals({ token }: { token: string }) {
  const [standing, appeals] = await Promise.all([
    gateway<Standing>("/v1/me/standing", { token }),
    gateway<AppealRow[]>("/v1/me/appeals", { token }),
  ]);
  const list = standing.ok ? notices(standing.data) : [];
  const titles = Object.fromEntries(list.map((n) => [`${n.kind}:${n.subjectId}`, n.title]));
  return (
    <section id="appeals" className={styles.section} aria-labelledby="appeals-title">
      <h2 id="appeals-title" className={styles.sectionTitle}>
        Appeals
      </h2>
      <p className={styles.fine}>
        If a strike, a restriction, a removal or a decision on a report was a mistake, ask for it to be reviewed. A
        KunoWorld moderator reads your statement and decides from the record. We email you the decision, and it shows
        here.
      </p>
      {standing.ok && appeals.ok ? (
        <AppealsPanel
          notices={list}
          appeals={appeals.data}
          titles={titles}
          maxStatement={standing.data.max_statement}
          sentToday={standing.data.appeals_sent_today}
          perDay={standing.data.appeals_per_day}
        />
      ) : (
        <p className={styles.fine}>Appeals aren&apos;t available right now.</p>
      )}
    </section>
  );
}
