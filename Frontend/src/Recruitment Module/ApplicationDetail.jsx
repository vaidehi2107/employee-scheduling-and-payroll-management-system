import { useState } from "react";
import "./ApplicationDetail.css";
import API from "../api.js";
import {
    getFullName,
    getJobTitle,
    fmtDate,
    STATUS_OPTIONS,
    getMatchScoreTier,
    MATCH_SCORE_LABELS,
} from "./JobApplicationUtils.js";

export default function ApplicationDetail({ app, job, onClose, onStatusChange }) {
    const [status, setStatus] = useState(app.status || "Pending");
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    const fullName = getFullName(app);
    const hasMatchScore = typeof app.matchScore === "number";
    const matchTier = getMatchScoreTier(app.matchScore);

    const handleStatusChange = async (newStatus) => {
        setStatus(newStatus);
        setSaving(true);
        setSaved(false);
        try {
            await API.patch(`/recruitment/applications/${app._id}`, { status: newStatus });
            onStatusChange(app._id, newStatus);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error(err);
            setStatus(app.status); // revert on error
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="ja-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ja-drawer">

                {/* Header */}
                <div className="ja-drawer-header">
                    <div>
                        <h2 className="ja-drawer-name">{fullName}</h2>
                        <p className="ja-drawer-sub">{app.email}</p>
                    </div>
                    <button className="ja-drawer-x" onClick={onClose} aria-label="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="ja-drawer-body">

                    {/* Applied For */}
                    <div className="ja-drawer-section">
                        <p className="ja-drawer-section-label">Applied For</p>
                        <div className="ja-drawer-job-chip">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                            </svg>
                            <span className="ja-drawer-job-title">{getJobTitle(job)}</span>
                        </div>
                    </div>

                    {/* Key info grid — only fields that exist on the model */}
                    <div className="ja-drawer-grid">
                        {app.phone && (
                            <div className="ja-drawer-kv">
                                <span className="ja-drawer-k">Phone</span>
                                <span className="ja-drawer-v">{app.phone}</span>
                            </div>
                        )}
                        <div className="ja-drawer-kv">
                            <span className="ja-drawer-k">Applied On</span>
                            <span className="ja-drawer-v">{fmtDate(app.createdAt)}</span>
                        </div>
                    </div>

                    {/* Resume — always present per model (required: true) */}
                    <div className="ja-drawer-section">
                        <p className="ja-drawer-section-label">Resume</p>
                        <button
                            className="ja-resume-link"
                            onClick={() => {
                                window.open(`${API.defaults.baseURL}/recruitment/applications/${app._id}/resume`, "_blank");
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            View Resume
                        </button>
                    </div>

                    {/* Match Score — shown before the AI summary since it's the quick-scan signal */}
                    <div className="ja-drawer-section">
                        <p className="ja-drawer-section-label">Match Score</p>
                        {hasMatchScore ? (
                            <div className={`ja-match-block ja-match-block--${matchTier}`}>
                                <span className="ja-match-block-score">{app.matchScore}%</span>
                                <span className="ja-match-block-label">{MATCH_SCORE_LABELS[matchTier]}</span>
                            </div>
                        ) : (
                            <div className="ja-ai-pending">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                Match score is being generated…
                            </div>
                        )}
                    </div>

                    {/* AI Summary */}
                    <div className="ja-drawer-section">
                        <p className="ja-drawer-section-label">
                            <span className="ja-ai-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                                    <path d="M12 6v6l4 2"/>
                                </svg>
                                AI Resume Summary
                            </span>
                        </p>
                        {app.aiSummary ? (
                            <div className="ja-ai-summary">
                                {app.aiSummary.split("\n").map((line, i) => {
                                    const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                                    if (line.startsWith("- ")) {
                                        return (
                                            <div key={i} className="ja-ai-bullet">
                                                <span className="ja-ai-dot" />
                                                <span dangerouslySetInnerHTML={{ __html: bold.slice(2) }} />
                                            </div>
                                        );
                                    }
                                    if (line.trim() === "") return null;
                                    return <p key={i} className="ja-ai-line" dangerouslySetInnerHTML={{ __html: bold }} />;
                                })}
                                {app.summaryCreatedAt && (
                                    <p className="ja-ai-meta">Generated {fmtDate(app.summaryCreatedAt)}</p>
                                )}
                            </div>
                        ) : (
                            <div className="ja-ai-pending">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                Summary is being generated…
                            </div>
                        )}
                    </div>

                    {/* Status update */}
                    <div className="ja-drawer-section">
                        <p className="ja-drawer-section-label">Update Status</p>
                        <div className="ja-status-btn-group">
                            {STATUS_OPTIONS.map((s) => (
                                <button
                                    key={s}
                                    className={`ja-status-opt ${status === s ? "ja-status-opt--active" : ""} ja-status-opt--${s.toLowerCase()}`}
                                    onClick={() => handleStatusChange(s)}
                                    disabled={saving}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        {saving && <p className="ja-drawer-saving">Saving…</p>}
                        {saved  && <p className="ja-drawer-saved">✓ Status updated</p>}
                    </div>

                </div>
            </div>
        </div>
    );
}