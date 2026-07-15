import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { exportPayrollReportToExcel } from "./reportsPayrollExcel";
import { downloadPayrollReportPDF } from "./reportsPayrollPdf";
import "./PayrollReport.css";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + 1 - i); // last 6 years, newest first

function formatCurrency(value) {
    return (value || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    });
}

function formatNumber(value) {
    return (value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function PayrollReport() {
    const [employees, setEmployees] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(CURRENT_YEAR);
    const [employeeId, setEmployeeId] = useState("");

    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(""); // "" | "excel" | "pdf"

    // ---- Load employee list once, for the filter dropdown ----
    useEffect(() => {
        API.get("/reports/employees")
            .then((res) => setEmployees(Array.isArray(res.data) ? res.data : []))
            .catch(() => setEmployees([]));
    }, []);

    // ---- Load report whenever filters or page change ----
    const loadReport = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { month, year, page, limit: 10 };
            if (employeeId) params.employeeId = employeeId;

            const res = await API.get("/reports/payroll", { params });

            setSummary(res.data.summary);
            setRows(res.data.rows || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load payroll report");
            setSummary(null);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [month, year, employeeId, page]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    // Reset to page 1 whenever the filters themselves change (not on page change)
    useEffect(() => {
        setPage(1);
    }, [month, year, employeeId]);

    // ---- Export: always fetch the FULL filtered set (not just the current page) ----
    const fetchFullReport = async () => {
        const params = { month, year, limit: "all" };
        if (employeeId) params.employeeId = employeeId;
        const res = await API.get("/reports/payroll", { params });
        return res.data;
    };

    const handleExportExcel = async () => {
        setExporting("excel");
        try {
            const fullData = await fetchFullReport();
            exportPayrollReportToExcel(fullData);
        } catch (err) {
            setError(err.response?.data?.message || "Excel export failed");
        } finally {
            setExporting("");
        }
    };

    const handleExportPdf = async () => {
        setExporting("pdf");
        try {
            const fullData = await fetchFullReport();
            downloadPayrollReportPDF(fullData);
        } catch (err) {
            setError(err.response?.data?.message || "PDF export failed");
        } finally {
            setExporting("");
        }
    };

    return (
        <div className="report-page">
            <div className="report-header">
                <div>
                    <h1 className="report-title">Payroll Report</h1>
                    <p className="report-subtitle">
                        Company-wide salary, tax, and employer contribution summary
                    </p>
                </div>

                <div className="report-actions no-print">
                    <button
                        className="btn btn--outline"
                        onClick={handleExportExcel}
                        disabled={exporting !== "" || loading || totalRecords === 0}
                    >
                        {exporting === "excel" ? "Exporting…" : "Export Excel"}
                    </button>
                    <button
                        className="btn btn--outline"
                        onClick={handleExportPdf}
                        disabled={exporting !== "" || loading || totalRecords === 0}
                    >
                        {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                    </button>
                </div>
            </div>

            {/* ---- Filters ---- */}
            <div className="report-filters no-print">
                <div className="filter-field">
                    <label>Month</label>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                        {MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-field">
                    <label>Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                        {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-field">
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

            {error && <div className="report-error">{error}</div>}

            {/* ---- Summary cards ---- */}
            <div className="summary-grid">
                <div className="summary-card">
                    <span className="summary-label">Employees Paid</span>
                    <span className="summary-value">
                        {loading ? "—" : summary?.totalEmployees ?? 0}
                    </span>
                </div>

                <div className="summary-card summary-card--accent">
                    <span className="summary-label">Total Gross Salary</span>
                    <span className="summary-value">
                        {loading ? "—" : formatCurrency(summary?.totalGrossEarnings)}
                    </span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Income Tax (TDS)</span>
                    <span className="summary-value">
                        {loading ? "—" : formatCurrency(summary?.totalIncomeTax)}
                    </span>
                    <span className="summary-hint">Deducted from employees, remitted to govt</span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Employer Contribution</span>
                    <span className="summary-value">
                        {loading ? "—" : formatCurrency(summary?.totalEmployerContribution)}
                    </span>
                    <span className="summary-hint">
                        {loading
                            ? ""
                            : `PF ${formatCurrency(summary?.totalEmployerPfContribution)} · ESIC ${formatCurrency(summary?.totalEmployerEsicContribution)}`}
                    </span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Total Deductions</span>
                    <span className="summary-value">
                        {loading ? "—" : formatCurrency(summary?.totalDeductions)}
                    </span>
                </div>

                <div className="summary-card summary-card--highlight">
                    <span className="summary-label">Total Net Pay</span>
                    <span className="summary-value">
                        {loading ? "—" : formatCurrency(summary?.totalNetPay)}
                    </span>
                </div>
            </div>

            {/* ---- Detailed table ---- */}
            <div className="report-table-wrapper">
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Gross</th>
                            <th>PF (Emp.)</th>
                            <th>ESIC (Emp.)</th>
                            <th>Prof. Tax</th>
                            <th>Income Tax</th>
                            <th>Employer PF</th>
                            <th>Employer ESIC</th>
                            <th>Total Deductions</th>
                            <th>Net Pay</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={10} className="report-table-empty">Loading…</td></tr>
                        )}

                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={10} className="report-table-empty">
                                    No payroll records found for this filter.
                                </td>
                            </tr>
                        )}

                        {!loading && rows.map((r) => (
                            <tr key={r._id}>
                                <td className="report-table-name">
                                    {r.employeeId
                                        ? `${r.employeeId.firstName} ${r.employeeId.lastName}`
                                        : "—"}
                                </td>
                                <td>{formatNumber(r.grossEarnings)}</td>
                                <td>{formatNumber(r.pfDeduction)}</td>
                                <td>{formatNumber(r.esicDeduction)}</td>
                                <td>{formatNumber(r.professionalTax)}</td>
                                <td>{formatNumber(r.incomeTax)}</td>
                                <td>{formatNumber(r.employerPfContribution)}</td>
                                <td>{formatNumber(r.employerEsicContribution)}</td>
                                <td>{formatNumber(r.totalDeductions)}</td>
                                <td className="report-table-netpay">{formatNumber(r.netPay)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ---- Pagination ---- */}
            {totalRecords > 0 && (
                <div className="report-pagination no-print">
                    <span className="pagination-info">
                        Page {page} of {totalPages} · {totalRecords} record{totalRecords !== 1 ? "s" : ""}
                    </span>
                    <div className="pagination-controls">
                        <button
                            className="btn btn--outline btn--sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                        >
                            Previous
                        </button>
                        <button
                            className="btn btn--outline btn--sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PayrollReport;