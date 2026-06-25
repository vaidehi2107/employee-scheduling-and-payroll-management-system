import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./JobDetail.css";
import API from "../api.js";


const toLines = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return String(val).split("\n").map(s => s.trim()).filter(Boolean);
};

const getDeptName = (job) =>
    job.departmentId?.deptName
    || job.departmentId?.name
    || job.department?.deptName
    || job.department?.name
    || null;

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await API.get(`/recruitment/jobs/${id}`);
                setJob(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    if (loading) return (
        <div className="jd-page">
            <div className="jd-skeleton-header" />
            <div className="jd-skeleton-body" />
        </div>
    );

    if (!job) return (
        <div className="jd-page jd-not-found">
            <p>Job not found.</p>
            <button className="jd-back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
    );

    const deptName = getDeptName(job);
    const isClosed = job.status !== "Active";

    return (
        <div className="jd-page">
            <button className="jd-back-btn" onClick={() => navigate(-1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back to Listings
            </button>

            <div className="jd-layout">
            <div className="jd-card">

                {/* ── Header ── */}
                <div className="jd-header">
                    <div className="jd-header-left">
                        <h1 className="jd-job-title">{job.title}</h1>
                        <div className="jd-meta-row">
                            {/* Company */}
                            <span className="jd-meta-item">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                                </svg>
                                Prismetric
                            </span>
                            {/* Location */}
                            {job.location && (
                                <span className="jd-meta-item">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    {job.location}
                                </span>
                            )}
                            {/* Posted / deadline */}
                            {job.deadline && (
                                <span className="jd-meta-item">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Company logo / wordmark */}
                    <div className="jd-company-logo">
                        <span className="jd-logo-text">Prismetric</span>
                    </div>
                </div>

                <div className="jd-divider" />

                {/* ── Key details grid ── */}
                <div className="jd-details-grid">
                    {job.salaryRange && (
                        <div className="jd-detail-item">
                            <span className="jd-detail-label">Pay</span>
                            <span className="jd-detail-value">{job.salaryRange}</span>
                        </div>
                    )}
                    {deptName && (
                        <div className="jd-detail-item">
                            <span className="jd-detail-label">Department</span>
                            <span className="jd-detail-value">{deptName}</span>
                        </div>
                    )}
                    {job.experienceRequired && (
                        <div className="jd-detail-item">
                            <span className="jd-detail-label">Experience</span>
                            <span className="jd-detail-value">{job.experienceRequired}</span>
                        </div>
                    )}
                    {job.employmentType && (
                        <div className="jd-detail-item">
                            <span className="jd-detail-label">Type</span>
                            <span className="jd-detail-value">{job.employmentType}</span>
                        </div>
                    )}
                    {job.openings && (
                        <div className="jd-detail-item">
                            <span className="jd-detail-label">Openings</span>
                            <span className="jd-detail-value">{job.openings}</span>
                        </div>
                    )}
                    <div className="jd-detail-item">
                        <span className="jd-detail-label">Status</span>
                        <span className={`jd-status-pill ${isClosed ? "jd-status-closed" : "jd-status-active"}`}>
                            {job.status}
                        </span>
                    </div>
                </div>

                <div className="jd-divider" />

                {/* ── Body sections ── */}
                <div className="jd-body">
                    {job.description && (
                        <div className="jd-section">
                            <h2 className="jd-section-title">About the business and the role</h2>
                            <p className="jd-section-text">{job.description}</p>
                        </div>
                    )}

                    {job.responsibilities && (
                        <div className="jd-section">
                            <h2 className="jd-section-title">Job tasks and responsibilities</h2>
                            {toLines(job.responsibilities).length > 1 ? (
                                <ul className="jd-section-list">
                                    {toLines(job.responsibilities).map((line, i) => (
                                        <li key={i}>{line}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="jd-section-text">{job.responsibilities}</p>
                            )}
                        </div>
                    )}

                    {job.requirements && (
                        <div className="jd-section">
                            <h2 className="jd-section-title">Requirements</h2>
                            {toLines(job.requirements).length > 1 ? (
                                <ul className="jd-section-list">
                                    {toLines(job.requirements).map((line, i) => (
                                        <li key={i}>{line}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="jd-section-text">{job.requirements}</p>
                            )}
                        </div>
                    )}

                    {job.skills && toLines(job.skills).length > 0 && (
                        <div className="jd-section">
                            <h2 className="jd-section-title">Skills required</h2>
                            <div className="jd-skills-wrap">
                                {toLines(job.skills).map((skill, i) => (
                                    <span className="jd-skill-tag" key={i}>{skill}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              
                </div>
            </div>{/* end jd-layout */}
        </div>
    );
}