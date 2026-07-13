import { useState, useEffect } from "react";
import API from "../api.js";
import { format } from "date-fns";
import "./Payroll.css";
import PayrollView from "./PayrollView.jsx";
import { downloadPayrollPDF } from "./Payrollpdf.js";
import { exportPayrollsToExcel } from "./PayrollExcel.js";

const PAGE_SIZE = 10;

// Indian financial year (Apr–Mar) for "today", e.g. "2026-27"
const getCurrentFinancialYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    return month >= 4
        ? `${year}-${String(year + 1).slice(-2)}`
        : `${year - 1}-${String(year).slice(-2)}`;
};

function PayrollHistory() {

    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);

    // Server-reported pagination state (source of truth — not derived locally)
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters — Financial Year and Employee, combinable.
    // Year defaults to the current financial year; Employee defaults to "" (all).
    const [selectedFinancialYear, setSelectedFinancialYear] = useState(getCurrentFinancialYear());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [filterOptions, setFilterOptions] = useState({ financialYears: [], employees: [] });

    const [exporting, setExporting] = useState(false);

    const [viewPayroll, setViewPayroll] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };

    // absentDays can be fractional (e.g. 1.5) since a half-day unpaid record
    // counts as half a day. Only show decimals when there actually are any.
    const formatDays = (value) => {
        if (value === undefined || value === null) return "—";
        return Number.isInteger(value) ? value : value.toFixed(1);
    };

    // Filter dropdown options — fetched once. Only years/employees that
    // actually have a payroll record show up, so no combination is
    // guaranteed to return an empty table.
    useEffect(() => {
        API.get("/payroll/filters")
            .then(res => setFilterOptions(res.data))
            .catch(err => console.error(err));
    }, []);

    // Re-fetch whenever a filter or the page changes. Selecting a new filter
    // resets to page 1 (handled in the filter onChange handlers below).
    useEffect(() => {
        fetchPayrolls();
    }, [selectedFinancialYear, selectedEmployeeId, currentPage]);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const res = await API.get("/payroll/all", {
                params: {
                    financialYear: selectedFinancialYear || undefined,
                    employeeId: selectedEmployeeId || undefined,
                    page: currentPage,
                    limit: PAGE_SIZE
                }
            });
            setPayrolls(res.data.payrolls);
            setTotalRecords(res.data.totalRecords);
            setTotalPages(res.data.totalPages);
            // If a delete emptied out the last page, snap back to the new last page
            if (res.data.currentPage !== currentPage) {
                setCurrentPage(res.data.currentPage);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFinancialYearChange = (value) => {
        setSelectedFinancialYear(value);
        setCurrentPage(1);
    };

    const handleEmployeeChange = (value) => {
        setSelectedEmployeeId(value);
        setCurrentPage(1);
    };

    // "Clear" returns to the default view: current financial year, all employees
    const clearFilters = () => {
        setSelectedFinancialYear(getCurrentFinancialYear());
        setSelectedEmployeeId("");
        setCurrentPage(1);
    };

    const hasActiveFilters = selectedFinancialYear !== getCurrentFinancialYear() || selectedEmployeeId;

    // Exports every record matching the current filters, not just the
    // visible page — pulls with limit=all so the export always matches
    // what the filters describe, regardless of pagination.
    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await API.get("/payroll/all", {
                params: {
                    financialYear: selectedFinancialYear || undefined,
                    employeeId: selectedEmployeeId || undefined,
                    limit: "all"
                }
            });
            if (res.data.payrolls.length === 0) {
                showToast("No records to export.", "error");
                return;
            }
            exportPayrollsToExcel(res.data.payrolls);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to export.", "error");
        } finally {
            setExporting(false);
        }
    };

    // handle delete
    const handleDelete = async (id) => {
        try {
            await API.delete(`/payroll/delete/${id}`);
            setConfirmDeleteId(null);
            showToast("Payroll record deleted.", "delete");
            fetchPayrolls(); // re-fetch — deleting can shift totals/pages
        } catch (err) {
            console.error(err);
        }
    };

    // handle view
    const handleView = async (id) => {
        try {
            const res = await API.get(`/payroll/${id}`);
            setViewPayroll(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="payroll-container">

            {/* HEADER */}
            <div className="payroll-header">
                <div>
                    <h2 className="payroll-title">Payroll History</h2>
                    <p>View, export, and manage previously generated payroll records</p>
                </div>
            </div>

            {/* FILTERS */}
            <div className="payroll-generate-panel">
                <div className="generate-panel-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filters
                </div>

                <div className="generate-panel-fields">
                    <div className="payroll-filter-group">
                        <label>Financial Year</label>
                        <select value={selectedFinancialYear} onChange={e => handleFinancialYearChange(e.target.value)}>
                            <option value="">All Years</option>
                            {/* Always offer the current FY even before any payroll exists for it */}
                            {Array.from(new Set([getCurrentFinancialYear(), ...filterOptions.financialYears]))
                                .sort()
                                .reverse()
                                .map(fy => (
                                    <option key={fy} value={fy}>{fy}</option>
                                ))}
                        </select>
                    </div>

                    <div className="payroll-filter-group">
                        <label>Employee</label>
                        <select value={selectedEmployeeId} onChange={e => handleEmployeeChange(e.target.value)}>
                            <option value="">All Employees</option>
                            {filterOptions.employees.map(emp => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button className="clear-filters-btn" onClick={clearFilters}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* PAYROLL HISTORY TABLE */}
            <div className="payroll-table-container">
                <div className="payroll-table-header">
                    <span className="payroll-table-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Payroll History
                    </span>
                    <div className="payroll-header-right">
                        <span className="payroll-count">
                            {loading ? "Loading..." : `${totalRecords} record${totalRecords !== 1 ? "s" : ""}`}
                        </span>
                        <button
                            className="export-excel-btn"
                            onClick={handleExport}
                            disabled={exporting || totalRecords === 0}
                            title="Export to Excel"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            {exporting ? "Exporting..." : "Export to Excel"}
                        </button>
                    </div>
                </div>

                <table className="payroll-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Period</th>
                            <th>Attendance</th>
                            <th>Gross Pay</th>
                            <th>PF</th>
                            <th>ESIC</th>
                            <th>Prof. Tax</th>
                            <th>Income Tax</th>
                            <th>Net Pay</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" className="payroll-empty-row">
                                    <p>Loading payroll records...</p>
                                </td>
                            </tr>
                        ) : payrolls.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="payroll-empty-row">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                        <rect x="2" y="7" width="20" height="14" rx="2" />
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                    </svg>
                                    <p>
                                        {hasActiveFilters
                                            ? "No payroll records match the selected filters."
                                            : "No payroll records yet. Go to Run Payroll to generate for a pay month."}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            payrolls.map(p => (
                                <tr key={p._id}>
                                    <td className="payroll-emp-cell">
                                        <div className="payroll-emp-avatar">
                                            {p.employeeId?.firstName?.[0]}{p.employeeId?.lastName?.[0]}
                                        </div>
                                        <span>{p.employeeId?.firstName} {p.employeeId?.lastName}</span>
                                    </td>
                                    <td>
                                        {p.year && p.month
                                            ? format(new Date(p.year, p.month - 1), "MMMM yyyy")
                                            : "—"}
                                    </td>
                                    <td>
                                        <div className="payroll-attendance">
                                            <span className="attendance-present">{formatDays(p.presentDays)}P</span>
                                            <span className="period-sep">/</span>
                                            <span className="attendance-absent">{formatDays(p.absentDays)}A</span>
                                        </div>
                                    </td>
                                    <td className="payroll-gross">₹{p.grossEarnings}</td>
                                    <td className="payroll-deduction">₹{p.pfDeduction}</td>
                                    <td className="payroll-deduction">₹{p.esicDeduction}</td>
                                    <td className="payroll-deduction">₹{p.professionalTax}</td>
                                    <td className="payroll-deduction">₹{p.incomeTax}</td>
                                    <td className="payroll-net">₹{p.netPay}</td>
                                    <td>
                                        <div className="payroll-actions">
                                            <button className="p-action-btn p-view-btn" onClick={() => handleView(p._id)} title="View">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                            <button className="p-action-btn p-pdf-btn" onClick={() => downloadPayrollPDF(p)} title="Download PDF">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="12" y1="18" x2="12" y2="12" />
                                                    <line x1="9" y1="15" x2="15" y2="15" />
                                                </svg>
                                            </button>
                                            <button className="p-action-btn p-delete-btn" onClick={() => setConfirmDeleteId(p._id)} title="Delete">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                    <path d="M10 11v6M14 11v6" />
                                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* PAGINATION */}
                {!loading && totalRecords > 0 && (
                    <div className="payroll-pagination">
                        <span className="pagination-info">
                            Page {currentPage} of {totalPages} — {totalRecords} record{totalRecords !== 1 ? "s" : ""}
                        </span>
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                title="Previous page"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <span className="pagination-page-label">{currentPage} / {totalPages}</span>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                title="Next page"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* VIEW MODAL */}
            {viewPayroll && (
                <PayrollView
                    payroll={viewPayroll}
                    onClose={() => setViewPayroll(null)}
                    onDownload={() => downloadPayrollPDF(viewPayroll)}
                />
            )}

            {/* TOAST */}
            {toast && (
                <div className={`payroll-toast payroll-toast-${toast.type}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {toast.type === "delete"
                            ? <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>
                            : toast.type === "error"
                                ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                                : <><polyline points="20 6 9 17 4 12" /></>
                        }
                    </svg>
                    {toast.message}
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {confirmDeleteId && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h4>Delete Payroll Record?</h4>
                        <p>This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button className="btn-confirm-delete" onClick={() => handleDelete(confirmDeleteId)}>
                                Delete
                            </button>
                            <button className="btn-confirm-cancel" onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default PayrollHistory;