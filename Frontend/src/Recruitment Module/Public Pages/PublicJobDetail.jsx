import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./PublicJobDetail.css";
import API from "../../api.js";
import JobApplyModal from "../JobApplyModal.jsx";

const toLines = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return String(val).split("\n").map(s => s.trim()).filter(Boolean);
};

const getDeptName = (job) =>
    job.departmentId?.deptName || null;

export default function PublicJobDetail() {
    const { companyId, jobId } = useParams();
    const [job, setJob]           = useState(null);
    const [company, setCompany]   = useState(null);
    const [loading, setLoading]   = useState(true);
    const [applyOpen, setApplyOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await API.get(`/public/jobs/${companyId}/${jobId}`);
                const data = res.data;
                // API may return { job, company } or just the job with company nested
                if (data.job) {
                    setJob(data.job);
                    setCompany(data.company || null);
                } else {
                    setJob(data);
                    setCompany(data.company || null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [companyId, jobId]);

    if (loading) return (
        <div className="pjd-page">
            <div className="pjd-topbar">
                <div className="pjd-topbar-inner">
                    <div className="pjd-skeleton-logo" />
                </div>
            </div>
            <div className="pjd-container">
                <div className="pjd-skeleton-header" />
                <div className="pjd-skeleton-body" />
            </div>
        </div>
    );

    if (!job) return (
        <div className="pjd-page">
            <div className="pjd-topbar">
                <div className="pjd-topbar-inner">
                    <span className="pjd-topbar-brand">Careers</span>
                </div>
            </div>
            <div className="pjd-container pjd-not-found">
                <div className="pjd-nf-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        <line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="16" x2="11.01" y2="16"/>
                    </svg>
                </div>
                <h2>Position not found</h2>
                <p>This role may have been filled or the link may be incorrect.</p>
            </div>
        </div>
    );

    const deptName  = getDeptName(job);
    const isClosed  = job.status !== "Active";
    const companyName = company?.companyName || job?.companyId?.companyName || "Company";


    return (
        <div className="pjd-page">

            {/* ── Top Navigation Bar ── */}
            <nav className="pjd-topbar">
                <div className="pjd-topbar-inner">
                    <div className="pjd-topbar-brand-wrap">
                        <span className="pjd-topbar-brand">{companyName}</span>
                    </div>
                    <a href={`/careers/${companyId}`} className="pjd-topbar-link">
                        ← All openings
                    </a>
                </div>
            </nav>

            <div className="pjd-container">
                <div className="pjd-layout">

                    {/* ── Main Card ── */}
                    <main className="pjd-card">

                        {/* Header */}
                        <div className="pjd-header">
                            <div className="pjd-header-left">
                                <span className="pjd-eyebrow">{companyName} · Job Opening</span>
                                <h1 className="pjd-job-title">{job.title}</h1>
                                <div className="pjd-meta-row">
                                    {job.location && (
                                        <span className="pjd-meta-item">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                                                <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            {job.location}
                                        </span>
                                    )}
                                    {job.employmentType && (
                                        <span className="pjd-meta-item">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="7" width="20" height="14" rx="2"/>
                                                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                                            </svg>
                                            {job.employmentType}
                                        </span>
                                    )}
                                    {job.deadline && (
                                        <span className="pjd-meta-item">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                            </svg>
                                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className={`pjd-status-pill ${isClosed ? "pjd-status-closed" : "pjd-status-active"}`}>
                                        {job.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pjd-divider" />

                        {/* Key details grid */}
                        <div className="pjd-details-grid">
                            {job.salaryRange && (
                                <div className="pjd-detail-item">
                                    <span className="pjd-detail-label">Pay</span>
                                    <span className="pjd-detail-value">{job.salaryRange}</span>
                                </div>
                            )}
                            {deptName && (
                                <div className="pjd-detail-item">
                                    <span className="pjd-detail-label">Department</span>
                                    <span className="pjd-detail-value">{deptName}</span>
                                </div>
                            )}
                            {job.experienceRequired && (
                                <div className="pjd-detail-item">
                                    <span className="pjd-detail-label">Experience</span>
                                    <span className="pjd-detail-value">{job.experienceRequired}</span>
                                </div>
                            )}
                            {job.employmentType && (
                                <div className="pjd-detail-item">
                                    <span className="pjd-detail-label">Type</span>
                                    <span className="pjd-detail-value">{job.employmentType}</span>
                                </div>
                            )}
                            {job.openings && (
                                <div className="pjd-detail-item">
                                    <span className="pjd-detail-label">Openings</span>
                                    <span className="pjd-detail-value">{job.openings}</span>
                                </div>
                            )}
                        </div>

                        <div className="pjd-divider" />

                        {/* Body sections */}
                        <div className="pjd-body">
                            {job.description && (
                                <div className="pjd-section">
                                    <h2 className="pjd-section-title">About the role</h2>
                                    <p className="pjd-section-text">{job.description}</p>
                                </div>
                            )}

                            {job.responsibilities && (
                                <div className="pjd-section">
                                    <h2 className="pjd-section-title">What you'll do</h2>
                                    {toLines(job.responsibilities).length > 1 ? (
                                        <ul className="pjd-section-list">
                                            {toLines(job.responsibilities).map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="pjd-section-text">{job.responsibilities}</p>
                                    )}
                                </div>
                            )}

                            {job.requirements && (
                                <div className="pjd-section">
                                    <h2 className="pjd-section-title">What we're looking for</h2>
                                    {toLines(job.requirements).length > 1 ? (
                                        <ul className="pjd-section-list">
                                            {toLines(job.requirements).map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="pjd-section-text">{job.requirements}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="pjd-divider" />

                        {/* Apply footer */}
                        <div className="pjd-footer">
                            <button
                                className="pjd-apply-btn"
                                onClick={() => setApplyOpen(true)}
                                disabled={isClosed}
                            >
                                {isClosed ? "Position Closed" : "Apply Now"}
                            </button>
                            {isClosed && (
                                <span className="pjd-closed-note">
                                    This position is no longer accepting applications.
                                </span>
                            )}
                        </div>
                    </main>

                    {/* ── Right Sidebar ── */}
                    <aside className="pjd-sidebar">
                        <div className="pjd-sidebar-card">
                
                            <h3 className="pjd-sidebar-title">Interested in this role?</h3>
                            <p className="pjd-sidebar-sub">
                                Submit your application for <strong>{job.title}</strong> at {companyName}.
                            </p>
                            {job.deadline && (
                                <p className="pjd-sidebar-deadline">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                                </p>
                            )}
                            <button
                                className="pjd-apply-btn pjd-sidebar-apply-btn"
                                onClick={() => setApplyOpen(true)}
                                disabled={isClosed}
                            >
                                {isClosed ? "Position Closed" : "Apply Now"}
                            </button>
                            {isClosed && (
                                <span className="pjd-closed-note">
                                    No longer accepting applications.
                                </span>
                            )}
                        </div>

                        {/* Share card */}
                        <div className="pjd-share-card">
                            <span className="pjd-share-label">Share this job</span>
                            <div className="pjd-share-actions">
                                <button
                                    className="pjd-share-btn"
                                    title="Copy link"
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                    }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                    </svg>
                                    Copy link
                                </button>
                                <a
                                    className="pjd-share-btn"
                                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Share on LinkedIn"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                                        <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                                    </svg>
                                    LinkedIn
                                </a>
                            </div>
                        </div>
                    </aside>

                </div>
            </div>

            {applyOpen && (
                <JobApplyModal
                    job={job}
                    onClose={() => setApplyOpen(false)}
                    applyEndpoint={`/public/jobs/${companyId}/${job._id}/apply`}
                />
            )}
        </div>
    );
}