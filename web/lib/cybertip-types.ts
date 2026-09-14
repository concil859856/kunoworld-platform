/** Shapes of the gateway's CyberTipline API (/admin/v1/cybertip, cybertip.py), and the labels the console shows. */

export type CybertipStatus = "draft" | "dry_run" | "submitting" | "submitted" | "failed" | "canceled";

export interface CybertipFile {
  file_id: string;
  position: number;
  /** Where the gateway keeps the content: a held blocked upload, a held refused video, a stored Standard video, or a private video a reported key opens. */
  source: "held_upload" | "held_output" | "standard_video" | "private_video" | string;
  sha256: string;
  md5: string | null;
  size: number | null;
  mime: string;
  file_name: string;
  ncmec_file_id: string | null;
  uploaded_at: number | null;
  details_sent_at: number | null;
}

export interface CybertipReport {
  report_id: string;
  status: CybertipStatus;
  item_id: string;
  hold_id: string | null;
  job_id: string | null;
  upload_id: string | null;
  account_id: string | null;
  incident_type: string;
  draft: {
    incident: { type: string; date_time: string; date_time_description?: string | null };
    reported: { esp_identifier: string | null; email: string | null; esp_service: string | null };
    summary: string[];
    additional_info: string | null;
    industry_classification: string | null;
    context: Record<string, unknown>;
  };
  reporter: Record<string, string | null>;
  files: CybertipFile[];
  /** Whether an operator opened this content in the console (from the audit log); sent as fileViewedByEsp. */
  viewed_by_esp: boolean;
  /** Only in single-report responses. */
  report_xml: string | null;
  validated_at: number | null;
  environment: "test" | "production" | null;
  ncmec_report_id: string | null;
  attempts: number;
  last_error_code: string | null;
  last_error: string | null;
  created_by: string;
  created_at: number;
  updated_at: number;
  confirmed_by: string | null;
  confirmed_at: number | null;
  submitted_at: number | null;
  canceled_by: string | null;
  canceled_at: number | null;
  cancel_note: string | null;
}

export interface CybertipItemStatus {
  item_id: string;
  eligible: boolean;
  reason: string | null;
  hold_id: string | null;
  hold_reason: string | null;
  reports: CybertipReport[];
}

export interface CybertipConfig {
  environment: "disabled" | "test" | "production";
  submissions_enabled: boolean;
  base_url: string | null;
  credentials_configured: boolean;
  reporter: Record<string, string | null>;
  reporter_placeholders: string[];
  incident_types: string[];
  industry_classifications: string[];
}

export const CYBERTIP_STATUSES: CybertipStatus[] = ["draft", "dry_run", "submitting", "submitted", "failed", "canceled"];

export const CYBERTIP_STATUS_LABEL: Record<CybertipStatus, string> = {
  draft: "Draft",
  dry_run: "Validated, not sent",
  submitting: "Submitting",
  submitted: "Submitted to NCMEC",
  failed: "Submission failed",
  canceled: "Canceled",
};

/** Statuses an admin may still confirm (a failed submission resumes where it stopped). */
export const SUBMITTABLE: CybertipStatus[] = ["draft", "dry_run", "failed"];

export const FILE_SOURCE_LABEL: Record<string, string> = {
  held_upload: "Blocked upload, kept under its hold",
  held_output: "Refused video, kept under its hold",
  standard_video: "Stored Standard video",
  private_video: "Private video, opened with the reported key",
};

export function environmentLabel(env: string | null | undefined): string {
  if (env === "production") return "NCMEC production";
  if (env === "test") return "NCMEC test environment";
  return "Disabled: confirming validates and stores the report, and nothing is sent";
}

export function bytes(size: number | null | undefined): string {
  if (size === null || size === undefined) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
