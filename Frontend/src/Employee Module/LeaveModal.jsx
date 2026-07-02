import { useEffect, useState } from "react";
import "./LeaveModal.css";
import API from "../api.js";

// Mirrors getLeaveYear() on the backend: the Indian leave year runs
// April -> March and is identified by the calendar year it starts in.
function getLeaveYear(date = new Date()) {
    const d = new Date(date);
    return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

// NOTE: assumes leave routes are mounted at "/leaves" on the API
// (i.e. app.use("/leaves", leaveRoutes)), matching the "/emp" pattern
// used for employee routes. Adjust the paths below if your mount point differs.

function LeaveModal({ employee, onClose, showToast }) {
    const [activeTab, setActiveTab] = useState("apply");

    // ---- apply form state ----
    const [leaveType, setLeaveType] = useState("Paid");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // ---- history/balance state ----
    const [year, setYear] = useState(getLeaveYear());
    const [balance, setBalance] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const employeeName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

    const loadHistory = async (targetYear = year) => {
        setHistoryLoading(true);
        try {
            const [balanceRes, leavesRes] = await Promise.all([
                API.get(`/leaves/${employee._id}/balance`, {
                    params: { companyId: employee.companyId, year: targetYear }
                }),
                API.get(`/leaves/${employee._id}`, { params: { year: targetYear } })
            ]);
            setBalance(balanceRes.data);
            setLeaves(leavesRes.data);
        } catch (err) {
            console.log(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "history") {
            loadHistory(year);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, year]);

    const handleFromDateChange = (value) => {
        setFromDate(value);
        if (isHalfDay) setToDate(value);
    };

    const handleHalfDayToggle = (checked) => {
        setIsHalfDay(checked);
        if (checked && fromDate) setToDate(fromDate);
    };

    const resetForm = () => {
        setLeaveType("Paid");
        setFromDate("");
        setToDate("");
        setIsHalfDay(false);
        setReason("");
        setFormError("");
    };

    const handleApply = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!fromDate || !toDate) {
            setFormError("Please select both from and to dates.");
            return;
        }
        if (new Date(toDate) < new Date(fromDate)) {
            setFormError("To date cannot be before from date.");
            return;
        }

        setSubmitting(true);
        try {
            await API.post("/leaves/", {
                employeeId: employee._id,
                companyId: employee.companyId,
                leaveType,
                fromDate,
                toDate: isHalfDay ? fromDate : toDate,
                isHalfDay,
                reason
            });
            showToast?.("Leave applied successfully.", "success");
            resetForm();
            setActiveTab("history");
            setYear(getLeaveYear(new Date(fromDate)));
        } catch (err) {
            setFormError(err.response?.data?.message || "Could not apply leave. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLeave = async (leaveId) => {
        try {
            await API.delete(`/leaves/${leaveId}`);
            setConfirmDeleteId(null);
            showToast?.("Leave record deleted.", "delete");
            loadHistory(year);
        } catch (err) {
            console.log(err);
            setConfirmDeleteId(null);
        }
    };

    const formatDate = (d) =>
        new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const yearOptions = [year, year - 1, year - 2].filter((v, i, arr) => arr.indexOf(v) === i);

    return (
        <div className="leave-modal-overlay" onClick={onClose}>
            <div className="leave-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="leave-modal-header">
                    <div className="leave-modal-identity">
                        <div className="leave-modal-avatar">
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </div>
                        <div>
                            <h3>{employeeName || "Employee"}</h3>
                            <p>Leave</p>
                        </div>
                    </div>
                    <button className="leave-modal-close" onClick={onClose} title="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="leave-modal-tabs">
                    <button
                        className={`leave-tab-btn ${activeTab === "apply" ? "active" : ""}`}
                        onClick={() => setActiveTab("apply")}
                    >
                        Apply Leave
                    </button>
                    <button
                        className={`leave-tab-btn ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => setActiveTab("history")}
                    >
                        History &amp; Balance
                    </button>
                </div>

                <div className="leave-modal-body">
                    {activeTab === "apply" && (
                        <form className="leave-form" onSubmit={handleApply}>
                            <div className="leave-type-toggle">
                                <button
                                    type="button"
                                    className={`leave-type-chip ${leaveType === "Paid" ? "active" : ""}`}
                                    onClick={() => setLeaveType("Paid")}
                                >
                                    Paid
                                </button>
                                <button
                                    type="button"
                                    className={`leave-type-chip ${leaveType === "NonPaid" ? "active" : ""}`}
                                    onClick={() => setLeaveType("NonPaid")}
                                >
                                    Unpaid
                                </button>
                            </div>

                            <div className="leave-date-row">
                                <div className="leave-field">
                                    <label>From</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => handleFromDateChange(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="leave-field">
                                    <label>To</label>
                                    <input
                                        type="date"
                                        value={isHalfDay ? fromDate : toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        min={fromDate || undefined}
                                        disabled={isHalfDay}
                                        required
                                    />
                                </div>
                            </div>

                            <label className="leave-halfday-check">
                                <input
                                    type="checkbox"
                                    checked={isHalfDay}
                                    onChange={(e) => handleHalfDayToggle(e.target.checked)}
                                />
                                <span>Half day</span>
                                <span className="leave-halfday-hint">Counts as 0.5 day, single date only</span>
                            </label>

                            <div className="leave-field">
                                <label>Reason</label>
                                <textarea
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Optional note for this leave"
                                />
                            </div>

                            {formError && <div className="leave-form-error">{formError}</div>}

                            <button type="submit" className="leave-submit-btn" disabled={submitting}>
                                {submitting ? "Applying..." : "Apply Leave"}
                            </button>
                        </form>
                    )}

                    {activeTab === "history" && (
                        <div className="leave-history">
                            <div className="leave-history-toolbar">
                                <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                                    {yearOptions.map((y) => (
                                        <option key={y} value={y}>{y}–{(y + 1).toString().slice(-2)}</option>
                                    ))}
                                </select>
                            </div>

                            {historyLoading ? (
                                <p className="leave-muted">Loading...</p>
                            ) : (
                                <>
                                    <div className="leave-balance-cards">
                                        <div className="leave-balance-card">
                                            <span className="leave-balance-label">Credited</span>
                                            <span className="leave-balance-value">{balance?.totalCredited ?? 0}</span>
                                        </div>
                                        <div className="leave-balance-card">
                                            <span className="leave-balance-label">Used</span>
                                            <span className="leave-balance-value">{balance?.totalUsed ?? 0}</span>
                                        </div>
                                        <div className="leave-balance-card highlight">
                                            <span className="leave-balance-label">Balance</span>
                                            <span className="leave-balance-value">{balance?.currentBalance ?? 0}</span>
                                        </div>
                                    </div>

                                    <div className="leave-list">
                                        {leaves.length === 0 && (
                                            <p className="leave-muted">No leave records for {year}.</p>
                                        )}
                                        {leaves.map((lv) => (
                                            <div className="leave-list-item" key={lv._id}>
                                                <div className="leave-list-main">
                                                    <div className="leave-list-dates">
                                                        {formatDate(lv.fromDate)}
                                                        {lv.fromDate !== lv.toDate && ` – ${formatDate(lv.toDate)}`}
                                                    </div>
                                                    <div className="leave-list-tags">
                                                        <span className={`leave-tag leave-tag-${lv.leaveType.toLowerCase()}`}>
                                                            {lv.leaveType === "Paid" ? "Paid" : "Unpaid"}
                                                        </span>
                                                        <span className="leave-tag leave-tag-days">
                                                            {lv.totalDays} {lv.totalDays === 1 ? "day" : "days"}
                                                            {lv.isHalfDay ? " (half day)" : ""}
                                                        </span>
                                                    </div>
                                                    {lv.reason && <p className="leave-list-reason">{lv.reason}</p>}
                                                </div>

                                                {confirmDeleteId === lv._id ? (
                                                    <div className="leave-inline-confirm">
                                                        <button onClick={() => handleDeleteLeave(lv._id)}>Delete</button>
                                                        <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="leave-list-delete"
                                                        title="Delete"
                                                        onClick={() => setConfirmDeleteId(lv._id)}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                            <path d="M10 11v6M14 11v6" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LeaveModal;