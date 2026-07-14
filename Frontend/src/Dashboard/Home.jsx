import { useState, useEffect } from "react";
import API from "../api.js";
import "./Home.css";
import AttendanceDailyChart from "./AttendanceDailyChart.jsx";

function Home() {
    const [stats, setStats] = useState({
        totalActive: 0,
        attendanceRate: 0,
        pendingPayrolls: 0,
        totalEmployees: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const now = new Date();
            const [empRes, payrollRes, dailyRes] = await Promise.all([
                API.get("/emp/all"),
                API.get("/payroll/all", { params: { limit: "all" } }),
                API.get("/dashboard/attendance/daily-summary", {
                    params: { month: now.getMonth() + 1, year: now.getFullYear() }
                })
            ]);

            const allEmployees = empRes.data;
            const activeEmployees = allEmployees.filter(e => e.status?.toLowerCase() === "active");
            // /payroll/all returns { payrolls, totalRecords, totalPages, currentPage }, not a bare array
            const payrolls = payrollRes.data.payrolls || [];
            // /dashboard/attendance/daily-summary returns { days }, same shape the chart uses
            const days = dailyRes.data.days || [];

            // Pending payrolls = payrolls generated this month
            const thisMonthPayrolls = payrolls.filter(p => {
                const d = new Date(p.periodEnd);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });

            // Attendance rate = average of each working day's present rate,
            // same calculation the daily chart is built from (not just
            // "attended at least once this month", which hides partial absences)
            const workingDays = days.filter(d => !d.isNonWorkingDay);
            const dayRate = d => {
                const total = d.present + d.paidLeave + d.nonPaidLeave;
                return total > 0 ? (d.present / total) * 100 : 100;
            };
            const attendanceRate = workingDays.length > 0
                ? Math.round(workingDays.reduce((sum, d) => sum + dayRate(d), 0) / workingDays.length)
                : 0;

            setStats({
                totalActive: activeEmployees.length,
                totalEmployees: allEmployees.length,
                attendanceRate,
                pendingPayrolls: thisMonthPayrolls.length,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });
    const currentMonth = new Date().getMonth() + 1; // 1-12, matches backend's month convention
    const currentYear = new Date().getFullYear();

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
                    <p className="dash-meta">{loading ? "" : "Average attendance this month"}</p>
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

            {/* Daily Attendance Breakdown */}
            <div className="dash-section">
                <div className="dash-section-header">
                    <div className="dash-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Daily Attendance — {monthName}
                    </div>
                </div>
                <AttendanceDailyChart month={currentMonth} year={currentYear} />
            </div>

        </div>
    );
}

export default Home;