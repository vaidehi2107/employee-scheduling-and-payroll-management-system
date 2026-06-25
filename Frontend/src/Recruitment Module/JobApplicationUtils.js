// ── Shared helpers for JobApplications + ApplicationDetail ─────────────────
// Kept in one place so both pages stay in sync on formatting and status/match logic.

// Model stores firstName + lastName separately
export const getFullName = (app) =>
    [app?.firstName, app?.lastName].filter(Boolean).join(" ") || "—";

// jobId is populated with only { title } from the GET route
export const getJobTitle = (job) => job?.title || "Unknown Position";

export const fmtDate = (d) =>
    d
        ? new Date(d).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

export const STATUS_OPTIONS = ["Pending", "Reviewed", "Shortlisted", "Rejected"];

export const STATUS_META = {
    Pending:     { cls: "ja-pill--pending",     label: "Pending" },
    Reviewed:    { cls: "ja-pill--reviewed",    label: "Reviewed" },
    Shortlisted: { cls: "ja-pill--shortlisted", label: "Shortlisted" },
    Rejected:    { cls: "ja-pill--rejected",    label: "Rejected" },
};

// ── Match score ──
// Tier thresholds mirror the buckets the AI prompt uses in geminiService.js,
// so the badge a recruiter sees lines up with the reasoning the model was given.
export const getMatchScoreTier = (score) => {
    if (typeof score !== "number") return "none";
    if (score >= 90) return "excellent";
    if (score >= 70) return "strong";
    if (score >= 40) return "partial";
    return "weak";
};

export const MATCH_SCORE_LABELS = {
    excellent: "Excellent Match",
    strong:    "Strong Match",
    partial:   "Partial Match",
    weak:      "Weak Match",
    none:      "Not yet scored",
};