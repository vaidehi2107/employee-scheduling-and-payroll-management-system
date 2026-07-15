import { useState, useEffect, useCallback, Fragment } from "react";
import API from "../api";
import { exportLeaveReportToExcel } from "./ReportsLeaveExcel";
import { downloadLeaveReportPDF } from "./ReportsLeavePdf";
import "./LeaveReport.css";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + 1 - i); // last 6 years, newest first

function formatDays(value) {
    const n = value || 0;
    // Show whole numbers cleanly, but keep the .5 for half-day leaves
    return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function LeaveReport() {
    const [employees, setEmployees] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(CURRENT_YEAR);
    const [employeeId, setEmployeeId] = useState("");

    const [summary, setSummary] = useState(null);
    const [employeeWise, setEmployeeWise] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(""); // "" | "excel" | "pdf"

    // ---- Load employee list once, for the filter dropdown ----
    useEffect(() => {
        API.get("/reports/employees")
            .then((res) => setEmployees(Array.isArray(res.data) ? res.data : []))
            .catch(() => setEmployees([]));
    }, []);

    // ---- Load report whenever filters change ----
    const loadReport = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { month, year };
            if (employeeId) params.employeeId = employeeId;

            const res = await API.get("/reports/leave", { params });

            setSummary(res.data.summary);
            setEmployeeWise(res.data.employeeWise || []);
            setExpandedRows(new Set());
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load leave report");
            setSummary(null);
            setEmployeeWise([]);
        } finally {
            setLoading(false);
        }
    }, [month, year, employeeId]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const toggleRow = (id) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Note: unlike Payroll, /reports/leave already returns the full
    // filtered dataset (no pagination), so we export straight from
    // current state instead of re-fetching an "all" page.
    const handleExportExcel = () => {
        setExporting("excel");
        try {
            exportLeaveReportToExcel({ month, year, summary, employeeWise });
        } catch (err) {
            setError("Excel export failed");
        } finally {
            setExporting("");
        }
    };

    const handleExportPdf = () => {
        setExporting("pdf");
        try {
            downloadLeaveReportPDF({ month, year, summary, employeeWise });
        } catch (err) {
            setError("PDF export failed");
        } finally {
            setExporting("");
        }
    };

    return (
        <div className="leave-report-page">
            <div className="leave-report-header">
                <div>
                    <h1 className="leave-report-title">Leave Report</h1>
                    <p className="leave-report-subtitle">
                        Employee-wise leave summary and day counts
                    </p>
                </div>

                <div className="leave-report-actions">
                    <button
                        className="leave-btn leave-btn--outline"
                        onClick={handleExportExcel}
                        disabled={exporting !== "" || loading || employeeWise.length === 0}
                    >
                        {exporting === "excel" ? "Exporting…" : "Export Excel"}
                    </button>
                    <button
                        className="leave-btn leave-btn--outline"
                        onClick={handleExportPdf}
                        disabled={exporting !== "" || loading || employeeWise.length === 0}
                    >
                        {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                    </button>
                </div>
            </div>

            {/* ---- Filters ---- */}
            <div className="leave-report-filters">
                <div className="leave-filter-field">
                    <label>Month</label>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                        {MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="leave-filter-field">
                    <label>Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                        {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="leave-filter-field">
                    <label>Employee</label>
                    <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                        <option value="">All Employees</option>
                        {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                                {emp.firstName} {emp.lastName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <div className="leave-report-error">{error}</div>}

            {/* ---- Summary cards ---- */}
            <div className="leave-summary-grid">
                <div className="leave-summary-card">
                    <span className="leave-summary-label">Employees on Leave</span>
                    <span className="leave-summary-value">
                        {loading ? "—" : summary?.totalEmployeesOnLeave ?? 0}
                    </span>
                </div>

                <div className="leave-summary-card leave-summary-card--accent">
                    <span className="leave-summary-label">Total Paid Days</span>
                    <span className="leave-summary-value">
                        {loading ? "—" : formatDays(summary?.totalPaidDays)}
                    </span>
                </div>

                <div className="leave-summary-card">
                    <span className="leave-summary-label">Total Non-Paid Days</span>
                    <span className="leave-summary-value">
                        {loading ? "—" : formatDays(summary?.totalNonPaidDays)}
                    </span>
                    <span className="leave-summary-hint">Unpaid leave, deducted at payroll</span>
                </div>

                <div className="leave-summary-card leave-summary-card--highlight">
                    <span className="leave-summary-label">Total Leave Days</span>
                    <span className="leave-summary-value">
                        {loading ? "—" : formatDays(summary?.totalLeaveDays)}
                    </span>
                </div>
            </div>

            {/* ---- Employee-wise table ---- */}
            <div className="leave-report-table-wrapper">
                <table className="leave-report-table">
                    <thead>
                        <tr>
                            <th style={{ width: 32 }}></th>
                            <th>Employee</th>
                            <th>Paid Days</th>
                            <th>Non-Paid Days</th>
                            <th>Total Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={5} className="leave-report-table-empty">Loading…</td></tr>
                        )}

                        {!loading && employeeWise.length === 0 && (
                            <tr>
                                <td colSpan={5} className="leave-report-table-empty">
                                    No leave records found for this filter.
                                </td>
                            </tr>
                        )}

                        {!loading && employeeWise.map((e) => {
                            const isExpanded = expandedRows.has(e._id);
                            return (
                                <Fragment key={e._id}>
                                    <tr className="leave-report-row">
                                        <td>
                                            <button
                                                className="leave-expand-btn"
                                                onClick={() => toggleRow(e._id)}
                                                aria-label={isExpanded ? "Collapse" : "Expand"}
                                            >
                                                {isExpanded ? "▾" : "▸"}
                                            </button>
                                        </td>
                                        <td className="leave-report-table-name">
                                            {e.firstName} {e.lastName}
                                        </td>
                                        <td>{formatDays(e.paidDays)}</td>
                                        <td>{formatDays(e.nonPaidDays)}</td>
                                        <td className="leave-report-table-total">{formatDays(e.totalDays)}</td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="leave-detail-row">
                                            <td></td>
                                            <td colSpan={4}>
                                                <table className="leave-detail-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Type</th>
                                                            <th>From</th>
                                                            <th>To</th>
                                                            <th>Half Day</th>
                                                            <th>Days</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(e.leaveRecords || []).map((rec) => (
                                                            <tr key={rec.leaveId}>
                                                                <td>
                                                                    <span className={`leave-type-badge leave-type-badge--${rec.leaveType === "Paid" ? "paid" : "nonpaid"}`}>
                                                                        {rec.leaveType}
                                                                    </span>
                                                                </td>
                                                                <td>{formatDate(rec.fromDate)}</td>
                                                                <td>{formatDate(rec.toDate)}</td>
                                                                <td>{rec.isHalfDay ? "Yes" : "No"}</td>
                                                                <td>{formatDays(rec.effectiveDays)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default LeaveReport;