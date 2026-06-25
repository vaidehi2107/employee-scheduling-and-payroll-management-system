import { useEffect, useState } from "react";
import "./JobListings.css";
import API from "../api.js";
import { Link, useNavigate, useLocation } from "react-router-dom";

function JobListings() {
    const [jobs, setJobs] = useState([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

    useEffect(() => {
        if (location.state?.toast) {
            showToast(location.state.toast.message, location.state.toast.type);
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location, navigate]);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await API.get("/recruitment/jobs");
                setJobs(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchJobs();
        
    }, []);

    const handleDelete = async (id) => {
        try {
            await API.delete(`/recruitment/jobs/${id}`);
            setJobs((prev) => prev.filter((j) => j._id !== id));
            setConfirmDeleteId(null);
            showToast("Job listing deleted.", "delete");
        } catch (err) {
            console.error(err);
        }
    };

    const employmentTypeColor = (type) => {
        const map = {
            "Full Time":  { bg: "rgba(45,122,79,0.10)",  color: "#2d7a4f" },
            "Part Time":  { bg: "rgba(92,63,163,0.10)",  color: "#5c3fa3" },
            "Internship": { bg: "rgba(214,128,30,0.10)", color: "#b36a00" },
            "Contract":   { bg: "rgba(14,116,189,0.10)", color: "#0e74bd" },
            "Remote":     { bg: "rgba(80,160,180,0.10)", color: "#1a8090" },
        };
        return map[type] || { bg: "rgba(150,150,150,0.10)", color: "#666" };
    };

    const statusColor = (status) =>
        status === "Active"
            ? { bg: "rgba(45,122,79,0.10)", color: "#2d7a4f" }
            : { bg: "rgba(220,53,69,0.08)", color: "#dc3545" };

    return (
        <div className="jl-page">
            {/* Header */}
            <div className="jl-header">
                <div className="jl-header-left">
                    <h2 className="jl-title">Job Listings</h2>
                    <p className="jl-subtitle">Manage open roles and recruitment pipelines</p>
                </div>
                <Link to="/job-listings/new" className="jl-add-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Post a Job
                </Link>
            </div>

            {/* Cards Grid */}
            <div className="jl-grid">
                {jobs.map((job) => {
                    const typStyle = employmentTypeColor(job.employmentType);
                    const stStyle  = statusColor(job.status);
                    return (
                        <div className="jl-card" key={job._id}>
                            {/* Card Top */}
                            <div className="jl-card-top">
                                <div className="jl-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                                    </svg>
                                </div>
                                <div className="jl-card-meta">
                                    <h3 className="jl-job-title">{job.title}</h3>
                                    <span className="jl-dept">{job.departmentId?.deptName || "—"}</span>
                                </div>
                                <span className="jl-status-badge" style={{ background: stStyle.bg, color: stStyle.color }}>
                                    {job.status}
                                </span>
                            </div>

                            <div className="jl-divider" />

                            {/* Info rows */}
                            <div className="jl-details">
                                <div className="jl-detail-row">
                                    <span className="jl-label">Location</span>
                                    <span className="jl-value">{job.location || "—"}</span>
                                </div>
                                <div className="jl-detail-row">
                                    <span className="jl-label">Experience</span>
                                    <span className="jl-value">{job.experienceRequired || "—"}</span>
                                </div>
                                <div className="jl-detail-row">
                                    <span className="jl-label">Salary</span>
                                    <span className="jl-value">{job.salaryRange || "—"}</span>
                                </div>
                            </div>

                            {/* Footer: type badge + 3 action buttons */}
                            <div className="jl-card-footer">
                                <span className="jl-type-badge" style={{ background: typStyle.bg, color: typStyle.color }}>
                                    {job.employmentType}
                                </span>
                                <div className="jl-card-actions">
                                    {/* View */}
                                    <button
                                        className="jl-action-btn view"
                                        title="View"
                                        onClick={() => navigate(`/job-listings/${job._id}`)}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                    {/* Edit */}
                                    <button
                                        className="jl-action-btn edit"
                                        title="Edit"
                                        onClick={() => navigate("/job-listings/edit", { state: { job } })}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    {/* Delete */}
                                    <button
                                        className="jl-action-btn delete"
                                        title="Delete"
                                        onClick={() => setConfirmDeleteId(job._id)}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"/>
                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                            <path d="M10 11v6M14 11v6"/>
                                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Quick Post card */}
                <Link to="/job-listings/new" className="jl-card jl-quick-add">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <p className="jl-quick-title">Post a New Role</p>
                    <p className="jl-quick-sub">Add a job listing in seconds</p>
                </Link>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`jl-toast jl-toast-${toast.type}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {toast.type === "delete"
                            ? <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>
                            : <polyline points="20 6 9 17 4 12"/>
                        }
                    </svg>
                    {toast.message}
                </div>
            )}

            {/* Delete Confirm */}
            {confirmDeleteId && (
                <div className="jl-confirm-overlay">
                    <div className="jl-confirm-dialog">
                        <h4>Delete Job Listing?</h4>
                        <p>This action cannot be undone.</p>
                        <div className="jl-confirm-actions">
                            <button className="btn-confirm-delete" onClick={() => handleDelete(confirmDeleteId)}>Delete</button>
                            <button className="btn-confirm-cancel" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default JobListings;