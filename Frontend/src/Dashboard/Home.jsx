import { useState, useEffect } from "react";
import API from "../api.js";
import "./Home.css";

function Home() {
    const [stats, setStats] = useState({
        totalActive: 0,
        attendanceRate: 0,
        pendingPayrolls: 0,
        totalEmployees: 0,
    });
    const [absentEmployees, setAbsentEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [empRes, payrollRes, attendanceRes] = await Promise.all([
                API.get("/emp/all"),
                API.get("/payroll/all"),
                API.get("/attendance/filter", {
                    params: {
                        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        endDate: new Date(),
                    }
                })
            ]);

            const allEmployees = empRes.data;
            const activeEmployees = allEmployees.filter(e => e.status?.toLowerCase() === "active");
            const payrolls = payrollRes.data;
            // /attendance/filter returns { records, summary }, not a bare array
            const attendance = attendanceRes.data.records || [];

            // Pending payrolls = payrolls generated this month
            const now = new Date();
            const thisMonthPayrolls = payrolls.filter(p => {
                const d = new Date(p.periodEnd);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });

            // Attendance rate = unique active employees who have attended this month / total active
            const presentIds = new Set(attendance.map(a => a.employeeId?._id || a.employeeId));
            const attendanceRate = activeEmployees.length > 0
                ? Math.round((presentIds.size / activeEmployees.length) * 100)
                : 0;

            // Absent employees = active employees with NO attendance record this month
            const absentList = activeEmployees.filter(e => !presentIds.has(e._id));

            setStats({
                totalActive: activeEmployees.length,
                totalEmployees: allEmployees.length,
                attendanceRate,
                pendingPayrolls: thisMonthPayrolls.length,
            });
            setAbsentEmployees(absentList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (firstName = "", lastName = "") =>
        (firstName[0] || "") + (lastName[0] || "");

    const AVATAR_COLORS = [
        { bg: "#e6f1fb", color: "#185fa5" },
        { bg: "#e1f5ee", color: "#0f6e56" },
        { bg: "#faeeda", color: "#854f0b" },
        { bg: "#eeedfe", color: "#534ab7" },
        { bg: "#fbeaf0", color: "#993556" },
    ];
    const avatarColor = (name = "") =>
        AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

    const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

    return (
        <div className="dash-page">

            {/* Header */}
            <div className="dash-header">
                <h2 className="dash-title">Welcome back, <span className="dash-name">Admin</span>.</h2>
                <p className="dash-subtitle">Here's an overview of your organization's current status.</p>
            </div>

            {/* Stat Cards */}
            <div className="dash-grid">

                {/* Total Employees */}
                <div className="dash-card">
                    <div className="dash-card-top">
                        <div className="dash-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <span className="dash-badge purple">Total</span>
                    </div>
                    <p className="dash-label">Total Employees</p>
                    <p className="dash-value">{loading ? "—" : stats.totalEmployees}</p>
                    <div className="dash-bar">
                        <div className="dash-bar-fill" style={{ width: "100%" }}/>
                    </div>
                    <p className="dash-meta">{loading ? "" : `${stats.totalActive} active · ${stats.totalEmployees - stats.totalActive} inactive`}</p>
                </div>

                {/* Attendance Rate */}
                <div className="dash-card">
                    <div className="dash-card-top">
                        <div className="dash-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <span className={`dash-badge ${stats.attendanceRate >= 80 ? "green" : stats.attendanceRate >= 50 ? "orange" : "red"}`}>
                            {loading ? "—" : `${stats.attendanceRate}%`}
                        </span>
                    </div>
                    <p className="dash-label">Attendance This Month</p>
                    <p className="dash-value">{loading ? "—" : `${stats.attendanceRate}%`}</p>
                    <div className="dash-bar">
                        <div className="dash-bar-fill" style={{ width: `${stats.attendanceRate}%` }}/>
                    </div>
                    <p className="dash-meta">{loading ? "" : `${absentEmployees.length} absent this month`}</p>
                </div>

                {/* Payroll */}
                <div className="dash-card">
                    <div className="dash-card-top">
                        <div className="dash-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2"/>
                                <line x1="2" y1="10" x2="22" y2="10"/>
                            </svg>
                        </div>
                        <span className="dash-badge orange">{loading ? "—" : `${stats.pendingPayrolls} this month`}</span>
                    </div>
                    <p className="dash-label">Payroll</p>
                    <p className="dash-value">{loading ? "—" : stats.pendingPayrolls}</p>
                    <div className="dash-bar">
                        <div className="dash-bar-fill" style={{ width: stats.pendingPayrolls > 0 ? "60%" : "0%" }}/>
                    </div>
                    <p className="dash-meta">Records generated this month</p>
                </div>

                {/* Active Employees */}
                <div className="dash-card">
                    <div className="dash-card-top">
                        <div className="dash-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="4"/>
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                                <polyline points="16 11 18 13 22 9"/>
                            </svg>
                        </div>
                        <span className="dash-badge green">Active</span>
                    </div>
                    <p className="dash-label">Active Employees</p>
                    <p className="dash-value">{loading ? "—" : stats.totalActive}</p>
                    <div className="dash-bar">
                        <div className="dash-bar-fill" style={{ width: stats.totalEmployees ? `${(stats.totalActive / stats.totalEmployees) * 100}%` : "0%" }}/>
                    </div>
                    <p className="dash-meta">{loading ? "" : `of ${stats.totalEmployees} total`}</p>
                </div>

            </div>

            {/* Absent Employees This Month */}
            <div className="dash-section">
                <div className="dash-section-header">
                    <div className="dash-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Employees with No Attendance — {monthName}
                    </div>
                    {!loading && (
                        <span className="dash-absent-count">{absentEmployees.length} employee{absentEmployees.length !== 1 ? "s" : ""}</span>
                    )}
                </div>

                {loading ? (
                    <div className="dash-empty">Loading...</div>
                ) : absentEmployees.length === 0 ? (
                    <div className="dash-empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c8c4e8" strokeWidth="1.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <p>All active employees have attendance records this month.</p>
                    </div>
                ) : (
                    <div className="dash-absent-grid">
                        {absentEmployees.map((emp) => {
                            const av = avatarColor(emp.firstName);
                            return (
                                <div className="dash-absent-card" key={emp._id}>
                                    <div className="dash-absent-avatar" style={{ background: av.bg, color: av.color }}>
                                        {getInitials(emp.firstName, emp.lastName)}
                                    </div>
                                    <div className="dash-absent-info">
                                        <p className="dash-absent-name">{emp.firstName} {emp.lastName}</p>
                                        <p className="dash-absent-sub">{emp.physicalAddress?.city || "—"}</p>
                                    </div>
                                    <span className="dash-absent-badge">No Records</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}

export default Home;