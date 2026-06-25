import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api.js";
import "./PublicJobListings.css";

function PublicJobListings() {
    const { companyId } = useParams();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState([]);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const companyName =
    company?.companyName ||
    jobs?.[0]?.companyId?.companyName ||
    "Careers";
    
    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await API.get(`/public/jobs/${companyId}`);
                setJobs(res.data.jobs ?? res.data);
                setCompany(res.data.company ?? null);
            } catch (err) {
                console.error(err);
                setError("We couldn't load open positions right now. Please try again shortly.");
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [companyId]);

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

    return (
        <div className="pjl-page">
            {/* ── Top nav bar (matches PublicJobDetail) ── */}
            <nav className="pjd-topbar">
                <div className="pjd-topbar-inner">
                    <div className="pjd-topbar-brand-wrap">
                        
                        <span className="pjd-topbar-brand">{companyName || "Careers"}</span>
                    
                    </div>
                </div>
            </nav>

            <div className="pjl-header">
                <h1 className="pjl-title">
                    {companyName ? `${companyName} — Open Positions` : "Open Positions"}
                </h1>
                <p className="pjl-subtitle">Find a role that fits where you want to go next.</p>
            </div>

            {loading && (
                <div className="pjl-state">
                    <p>Loading open positions…</p>
                </div>
            )}

            {!loading && error && (
                <div className="pjl-state pjl-state-error">
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && jobs.length === 0 && (
                <div className="pjl-state">
                    <p>There are no open positions right now. Check back soon.</p>
                </div>
            )}

            {!loading && !error && jobs.length > 0 && (
                <div className="pjl-grid">
                    {jobs.map((job) => {
                        const typStyle = employmentTypeColor(job.employmentType);
                        return (
                            <div className="pjl-card" key={job._id}>
                                <div className="pjl-card-top">
                                    <h3 className="pjl-job-title">{job.title}</h3>
                                    {job.departmentId?.deptName && (
                                        <span className="pjl-dept">{job.departmentId.deptName}</span>
                                    )}
                                </div>

                                <div className="pjl-divider" />

                                <div className="pjl-details">
                                    <div className="pjl-detail-row">
                                        <span className="pjl-label">Location</span>
                                        <span className="pjl-value">{job.location || "—"}</span>
                                    </div>
                                    <div className="pjl-detail-row">
                                        <span className="pjl-label">Experience</span>
                                        <span className="pjl-value">{job.experienceRequired || "—"}</span>
                                    </div>
                                    {job.salaryRange && (
                                        <div className="pjl-detail-row">
                                            <span className="pjl-label">Salary</span>
                                            <span className="pjl-value">{job.salaryRange}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pjl-card-footer">
                                    <span
                                        className="pjl-type-badge"
                                        style={{ background: typStyle.bg, color: typStyle.color }}
                                    >
                                        {job.employmentType}
                                    </span>
                                    <button
                                        className="pjl-apply-btn"
                                        onClick={() => navigate(`/careers/${companyId}/${job._id}`)}
                                    >
                                        View &amp; Apply
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default PublicJobListings;