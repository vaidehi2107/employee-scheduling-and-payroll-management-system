import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./JobApplications.css";
import API from "../api.js";
import ApplicationDetail from "./ApplicationDetail.jsx";
import {
    getFullName,
    fmtDate,
    STATUS_OPTIONS,
    STATUS_META,
    getMatchScoreTier,
} from "./JobApplicationUtils.js";

// ── Sub-components ─────────────────────────────────────────

function StatusPill({ status }) {
    const meta = STATUS_META[status] || { cls: "ja-pill--pending", label: status || "Unknown" };
    return <span className={`ja-status-pill ${meta.cls}`}>{meta.label}</span>;
}

function MatchScoreBadge({ score }) {
    const tier = getMatchScoreTier(score);
    if (tier === "none") return <span className="ja-match-badge ja-match-badge--none">—</span>;
    return <span className={`ja-match-badge ja-match-badge--${tier}`}>{score}%</span>;
}

function SkeletonRows() {
    return Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="ja-skeleton-row">
            {Array.from({ length: 6 }).map((_, j) => (
                <td key={j}><div className="ja-skeleton-cell" /></td>
            ))}
        </tr>
    ));
}

// ── Main Page ──────────────────────────────────────────────

export default function JobApplications() {
    const navigate = useNavigate();

    const [applications, setApplications] = useState([]);
    const [jobs,         setJobs]         = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);

    // filters
    const [search,       setSearch]      = useState("");
    const [jobFilter,    setJobFilter]   = useState("all");
    const [statusFilter, setStatus]      = useState("all");

    // sort
    const [sortKey, setSortKey] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");

    // drawer
    const [selectedApp, setSelectedApp] = useState(null);

    // ── Fetch ──
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // GET /recruitment/applications populates jobId with { title }
                const appRes = await API.get("/recruitment/applications");
                setApplications(appRes.data || []);

                // Build a jobs list from the populated jobId objects
                const jobsFromApps = Object.values(
                    (appRes.data || []).reduce((acc, app) => {
                        if (app.jobId && typeof app.jobId === "object") {
                            acc[app.jobId._id] = app.jobId;
                        }
                        return acc;
                    }, {})
                );
                setJobs(jobsFromApps);
            } catch (err) {
                console.error(err);
                setError("Failed to load applications. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
        const interval = setInterval(fetchAll, 10000); // every 10s
        return () => clearInterval(interval);
    }, []);

    // ── Job lookup map  { jobId._id → job object } ──
    const jobMap = useMemo(
        () => Object.fromEntries(jobs.map((j) => [j._id, j])),
        [jobs]
    );

    // ── Unique jobs with at least one application (for the dropdown) ──
    const jobsWithApps = useMemo(() => {
        const ids = new Set(
            applications.map((a) =>
                typeof a.jobId === "object" ? a.jobId._id : a.jobId
            )
        );
        return jobs.filter((j) => ids.has(j._id));
    }, [applications, jobs]);

    // Helper to resolve the job's _id string from an application
    const resolveJobId = (app) =>
        typeof app.jobId === "object" ? app.jobId?._id : app.jobId;

    // ── Filtered + sorted list ──
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return [...applications]
            .filter((app) => {
                const jobId      = resolveJobId(app);
                const job        = jobMap[jobId];
                const fullName   = getFullName(app).toLowerCase();
                const matchSearch =
                    fullName.includes(q) ||
                    (app.email  || "").toLowerCase().includes(q) ||
                    (job?.title || "").toLowerCase().includes(q);
                const matchJob    = jobFilter === "all" || jobId === jobFilter;
                const matchStatus = statusFilter === "all" || app.status === statusFilter;
                return matchSearch && matchJob && matchStatus;
            })
            .sort((a, b) => {
                // For name sorting, compose firstName + lastName
                const getVal = (app) => {
                    if (sortKey === "applicantName") return getFullName(app).toLowerCase();
                    if (sortKey === "createdAt")     return new Date(app.createdAt ?? 0);
                    if (sortKey === "matchScore")    return typeof app.matchScore === "number" ? app.matchScore : -1;
                    return String(app[sortKey] ?? "").toLowerCase();
                };
                const av = getVal(a);
                const bv = getVal(b);
                if (av < bv) return sortDir === "asc" ? -1 : 1;
                if (av > bv) return sortDir === "asc" ?  1 : -1;
                return 0;
            });
    }, [applications, jobMap, search, jobFilter, statusFilter, sortKey, sortDir]);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    };

    const handleStatusChange = (appId, newStatus) => {
        setApplications((prev) =>
            prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
        );
        if (selectedApp?._id === appId) {
            setSelectedApp((prev) => ({ ...prev, status: newStatus }));
        }
    };

    // SortIcon stays near the render that uses it, per code-structure preference
    const SortIcon = ({ col }) => {
        if (sortKey !== col)
            return (
                <svg className="ja-sort-icon ja-sort-icon--idle" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
                </svg>
            );
        return sortDir === "asc" ? (
            <svg className="ja-sort-icon ja-sort-icon--active" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
        ) : (
            <svg className="ja-sort-icon ja-sort-icon--active" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
        );
    };

    // ── Stats ──
    const stats = useMemo(() => ({
        total:       applications.length,
        pending:     applications.filter((a) => a.status === "Pending").length,
        shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
        rejected:    applications.filter((a) => a.status === "Rejected").length,
    }), [applications]);

    // ── Render ─────────────────────────────────────────────
    return (
        <div className="ja-page">

            {/* Page header */}
            <div className="ja-page-header">
                <div>
                    <h1 className="ja-page-title">Job Applications</h1>
                    <p className="ja-page-sub">Review and manage all received job applications</p>
                </div>
                <button className="ja-back-btn" onClick={() => navigate(-1)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to Jobs
                </button>
            </div>

            {/* Stats strip */}
            {!loading && !error && (
                <div className="ja-stats-strip">
                    <div className="ja-stat">
                        <span className="ja-stat-value">{stats.total}</span>
                        <span className="ja-stat-label">Total</span>
                    </div>
                    <div className="ja-stat-divider" />
                    <div className="ja-stat">
                        <span className="ja-stat-value ja-stat-value--pending">{stats.pending}</span>
                        <span className="ja-stat-label">Pending</span>
                    </div>
                    <div className="ja-stat-divider" />
                    <div className="ja-stat">
                        <span className="ja-stat-value ja-stat-value--shortlisted">{stats.shortlisted}</span>
                        <span className="ja-stat-label">Shortlisted</span>
                    </div>
                    <div className="ja-stat-divider" />
                    <div className="ja-stat">
                        <span className="ja-stat-value ja-stat-value--rejected">{stats.rejected}</span>
                        <span className="ja-stat-label">Rejected</span>
                    </div>
                </div>
            )}

            {/* Main card */}
            <div className="ja-card">

                {/* Filter bar */}
                <div className="ja-filter-bar">
                    <div className="ja-search-wrap">
                        <svg className="ja-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="ja-search"
                            type="text"
                            placeholder="Search by name, email or job title…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="ja-search-clear" onClick={() => setSearch("")}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className="ja-filter-right">
                        <div className="ja-select-wrap">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                            </svg>
                            <select
                                className="ja-select"
                                value={jobFilter}
                                onChange={(e) => setJobFilter(e.target.value)}
                            >
                                <option value="all">All Positions</option>
                                {jobsWithApps.map((j) => (
                                    <option key={j._id} value={j._id}>{j.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ja-select-wrap">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <select
                                className="ja-select"
                                value={statusFilter}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results count */}
                {!loading && !error && (
                    <div className="ja-results-bar">
                        <span className="ja-results-count">
                            {filtered.length} {filtered.length === 1 ? "application" : "applications"}
                            {(search || jobFilter !== "all" || statusFilter !== "all") && " · filtered"}
                        </span>
                        {(search || jobFilter !== "all" || statusFilter !== "all") && (
                            <button
                                className="ja-clear-filters"
                                onClick={() => { setSearch(""); setJobFilter("all"); setStatus("all"); }}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="ja-error">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Table */}
                {!error && (
                    <div className="ja-table-wrap">
                        <table className="ja-table">
                            <thead>
                                <tr>
                                    <th className="ja-th ja-th--sortable" onClick={() => handleSort("applicantName")}>
                                        Applicant <SortIcon col="applicantName" />
                                    </th>
                                    <th className="ja-th">Position</th>
                                    <th className="ja-th ja-th--sortable" onClick={() => handleSort("matchScore")}>
                                        Match Score <SortIcon col="matchScore" />
                                    </th>
                                    <th className="ja-th ja-th--sortable" onClick={() => handleSort("createdAt")}>
                                        Applied On <SortIcon col="createdAt" />
                                    </th>
                                    <th className="ja-th ja-th--sortable" onClick={() => handleSort("status")}>
                                        Status <SortIcon col="status" />
                                    </th>
                                    <th className="ja-th ja-th--action">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <SkeletonRows />
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="ja-empty">
                                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                </svg>
                                                <p className="ja-empty-title">No applications found</p>
                                                <p className="ja-empty-sub">
                                                    {search || jobFilter !== "all" || statusFilter !== "all"
                                                        ? "Try adjusting your filters."
                                                        : "Applications will appear here once candidates start applying."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((app) => {
                                        const jobId = resolveJobId(app);
                                        const job   = jobMap[jobId];
                                        const name  = getFullName(app);
                                        return (
                                            <tr
                                                key={app._id}
                                                className="ja-row"
                                                onClick={() => setSelectedApp(app)}
                                            >
                                                <td className="ja-td">
                                                    <div className="ja-applicant">
                                                        <div className="ja-avatar">
                                                            {name[0]?.toUpperCase() ?? "?"}
                                                        </div>
                                                        <div className="ja-applicant-info">
                                                            <span className="ja-applicant-name">{name}</span>
                                                            <span className="ja-applicant-email">{app.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="ja-td">
                                                    <span className="ja-job-title-cell">
                                                        {job?.title || <span className="ja-unknown">Unknown</span>}
                                                    </span>
                                                </td>
                                                <td className="ja-td">
                                                    <MatchScoreBadge score={app.matchScore} />
                                                </td>
                                                <td className="ja-td ja-td--muted">
                                                    {fmtDate(app.createdAt)}
                                                </td>
                                                <td className="ja-td">
                                                    <StatusPill status={app.status} />
                                                </td>
                                                <td className="ja-td ja-td--action" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className="ja-view-btn"
                                                        onClick={() => setSelectedApp(app)}
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail drawer */}
            {selectedApp && (
                <ApplicationDetail
                    app={selectedApp}
                    job={jobMap[resolveJobId(selectedApp)]}
                    onClose={() => setSelectedApp(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}