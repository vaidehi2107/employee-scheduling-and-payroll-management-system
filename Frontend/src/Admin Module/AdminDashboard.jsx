import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API = "http://localhost:5000/api/admin";

function getInitials(name = "") {
    return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
    { bg: "#e6f1fb", color: "#185fa5" },
    { bg: "#e1f5ee", color: "#0f6e56" },
    { bg: "#faeeda", color: "#854f0b" },
    { bg: "#eeedfe", color: "#534ab7" },
    { bg: "#fbeaf0", color: "#993556" },
];
function avatarColor(name = "") {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function AdminDashboard() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading]     = useState(true);
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        async function fetchCompanies() {
            try {
                const res = await axios.get(`${API}/company/all`, { headers });
                setCompanies(res.data);
            } catch (err) {
                console.error("Failed to load companies", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCompanies();
    }, []);

    const total         = companies.length;
    const totalActive   = companies.filter((c) => c.isActive).length;
    const totalInactive = total - totalActive;

    const activePercent   = total ? Math.round((totalActive / total) * 100) : 0;
    const inactivePercent = total ? Math.round((totalInactive / total) * 100) : 0;

    // 5 most recently added
    const recent = [...companies].reverse().slice(0, 5);

    return (
        <div className="dashboard-page">

            {/* Header */}
            <div className="dashboard-header">
                <h2 className="dashboard-title">
                    Welcome back, <span>Admin</span>.
                </h2>
                <p className="dashboard-sub">Here's an overview of all companies on the platform.</p>
            </div>

            {/* Stat cards */}
            <div className="dashboard-stats">

                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <p className="stat-label">Total companies</p>
                    <p className="stat-value">{loading ? "—" : total}</p>
                    <div className="stat-bar">
                        <div className="stat-bar-fill" style={{ width: "100%" }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <p className="stat-label">Active</p>
                    <p className={`stat-value stat-active`}>{loading ? "—" : totalActive}</p>
                    <div className="stat-bar">
                        <div className="stat-bar-fill green" style={{ width: `${activePercent}%` }} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏸️</div>
                    <p className="stat-label">Inactive</p>
                    <p className={`stat-value stat-inactive`}>{loading ? "—" : totalInactive}</p>
                    <div className="stat-bar">
                        <div className="stat-bar-fill muted" style={{ width: `${inactivePercent}%` }} />
                    </div>
                </div>

            </div>

            {/* Recently added */}
            <div className="recent-section">
                <div className="recent-header">
                    <h3 className="recent-title">Recently added</h3>
                    <button className="view-all-btn" onClick={() => navigate("/admin/companies")}>
                        View all →
                    </button>
                </div>

                {loading ? (
                    <div className="recent-empty">Loading…</div>
                ) : recent.length === 0 ? (
                    <div className="recent-empty">No companies yet. Add one to get started.</div>
                ) : (
                    <div className="recent-list">
                        {recent.map((company) => {
                            const av = avatarColor(company.companyName);
                            return (
                                <div className="recent-item" key={company._id}>
                                    <div className="avatar" style={{ background: av.bg, color: av.color }}>
                                        {getInitials(company.companyName)}
                                    </div>
                                    <div className="recent-info">
                                        <span className="recent-name">{company.companyName}</span>
                                        <span className="recent-email">{company.email || "—"}</span>
                                    </div>
                                    <span className={`badge ${company.isActive ? "badge-active" : "badge-inactive"}`}>
                                        <span className="badge-dot" />
                                        {company.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}