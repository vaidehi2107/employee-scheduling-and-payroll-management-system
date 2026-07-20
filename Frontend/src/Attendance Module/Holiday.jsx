import { useState, useEffect, useMemo } from "react";
import API from "../api.js";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import "./Holiday.css";

// A financial year is identified by the calendar year it STARTS in.
// e.g. 1 Apr 2026 - 31 Mar 2027 is displayed as "2026-2027".
// JS months are 0-indexed, so April = month index 3.
const getFinancialYear = (date) => {
    const d = new Date(date);
    const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
};

// Financial years offered in the filter/add dropdown: two years back and
// two years ahead of the current one, so past records stay reachable and
// upcoming holidays can still be planned well in advance.
const getFinancialYearOptions = () => {
    const currentStart = Number(getFinancialYear(new Date()).split("-")[0]);
    const years = [];
    for (let offset = -2; offset <= 2; offset++) {
        years.push(`${currentStart + offset}-${currentStart + offset + 1}`);
    }
    return years;
};

// Holiday dates are stored as UTC midnight of the intended calendar day.
// Formatting/editing that value with a plain `new Date(holiday.date)` uses
// the browser's LOCAL timezone, which only shows the right day for
// timezones at or ahead of UTC (e.g. IST) - anywhere behind UTC would roll
// it back a day. This re-anchors the same Y/M/D to local midnight so
// date-fns formatting and the DatePicker are correct in any timezone.
const toDisplayDate = (date) => {
    const [y, m, d] = new Date(date).toISOString().slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
};

const emptyForm = { name: "", date: new Date(), description: "" };

function Holiday() {

    const [holidays, setHolidays] = useState([]);
    const [financialYear, setFinancialYear] = useState(getFinancialYear(new Date()));
    const [loading, setLoading] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [toast, setToast] = useState(null);

    const financialYearOptions = useMemo(getFinancialYearOptions, []);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };

    useEffect(() => {
        fetchHolidays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [financialYear]);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const response = await API.get("/holidays", { params: { financialYear } });
            setHolidays(response.data.holidays || []);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const openAddForm = () => {
        setSelectedHoliday(null);
        setForm({ ...emptyForm, date: new Date() });
        setFormError("");
        setShowForm(true);
    };

    const openEditForm = (holiday) => {
        setSelectedHoliday(holiday);
        setForm({
            name: holiday.name,
            date: toDisplayDate(holiday.date),
            description: holiday.description || ""
        });
        setFormError("");
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setFormError("");
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!form.name.trim() || !form.date) {
            setFormError("Holiday name and date are required.");
            return;
        }

        const payload = {
            financialYear: getFinancialYear(form.date),
            name: form.name.trim(),
            // Send the plain calendar day the user picked ("YYYY-MM-DD"),
            // not toISOString() - that converts the picker's local midnight
            // to UTC and can roll it back to the previous day.
            date: format(form.date, "yyyy-MM-dd"),
            description: form.description.trim()
        };

        setSaving(true);
        setFormError("");
        try {
            if (selectedHoliday) {
                await API.put(`/holiday/${selectedHoliday._id}`, payload);
                showToast("Holiday updated successfully!");
            } else {
                await API.post("/holidays", payload);
                showToast("Holiday added successfully!");
            }
            setShowForm(false);

            // If the saved holiday belongs to a different FY than the one
            // currently filtered, switch the filter so the change is visible.
            if (payload.financialYear !== financialYear) {
                setFinancialYear(payload.financialYear);
            } else {
                fetchHolidays();
            }
        } catch (err) {
            setFormError(err.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await API.delete(`/holiday/${id}`);
            setHolidays(holidays.filter((h) => h._id !== id));
            setConfirmDeleteId(null);
            showToast("Holiday deleted.", "delete");
        } catch (err) {
            console.log(err);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="holiday-container">

            {/* HEADER */}
            <div className="holiday-header">
                <div>
                    <h2 className="holiday-title">Holiday Management</h2>
                    <p>Set up the company holiday calendar by financial year</p>
                </div>
            </div>

            {/* FILTER SECTION */}
            <div className="holiday-filter-section">
                <div className="holiday-filter-group">
                    <label>Financial Year</label>
                    <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
                        {financialYearOptions.map((fy) => (
                            <option key={fy} value={fy}>{fy}</option>
                        ))}
                    </select>
                </div>

                <button className="add-holiday-btn" onClick={openAddForm}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Holiday
                </button>
            </div>

            {/* TABLE */}
            <div className="holiday-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Holiday Name</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && holidays.length === 0 && (
                            <tr>
                                <td colSpan="5" className="holiday-empty-row">
                                    No holidays added for {financialYear} yet.
                                </td>
                            </tr>
                        )}
                        {holidays.map((holiday) => (
                            <tr key={holiday._id}>
                                <td>{format(toDisplayDate(holiday.date), "MM-dd-yyyy")}</td>
                                <td>{format(toDisplayDate(holiday.date), "EEEE")}</td>
                                <td className="holiday-name-cell">{holiday.name}</td>
                                <td className="holiday-desc-cell">{holiday.description || "—"}</td>
                                <td>
                                    <div className="holiday-actions">
                                        <button className="holiday-action-btn edit" onClick={() => openEditForm(holiday)} title="Edit">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                        </button>
                                        <button className="holiday-action-btn delete" onClick={() => setConfirmDeleteId(holiday._id)} title="Delete">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                <path d="M10 11v6M14 11v6"/>
                                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ADD/EDIT FORM */}
            {showForm && (
                <div className="holiday-form-overlay" onClick={closeForm}>
                    <div className="holiday-form" onClick={(e) => e.stopPropagation()}>
                        <h4>{selectedHoliday ? "Edit Holiday" : "Add Holiday"}</h4>

                        <form onSubmit={handleSave}>
                            <div className="holiday-form-group">
                                <label>Holiday Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Diwali"
                                />
                            </div>

                            <div className="holiday-form-group">
                                <label>Date</label>
                                <DatePicker
                                    selected={form.date}
                                    onChange={(date) => setForm({ ...form, date })}
                                    dateFormat="MM-dd-yyyy"
                                    placeholderText="MM-DD-YYYY"
                                    className="holiday-date-picker"
                                />
                            </div>

                            <div className="holiday-form-group">
                                <label>Financial Year</label>
                                <div className="holiday-fy-readout">{getFinancialYear(form.date)}</div>
                            </div>

                            <div className="holiday-form-group">
                                <label>Description (optional)</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Any additional notes"
                                    rows={3}
                                />
                            </div>

                            {formError && <p className="holiday-form-error">{formError}</p>}

                            <div className="holiday-form-actions">
                                <button type="button" className="btn-holiday-cancel" onClick={closeForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-holiday-save" disabled={saving}>
                                    {saving ? "Saving..." : selectedHoliday ? "Update Holiday" : "Add Holiday"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast && (
                <div className={`holiday-toast holiday-toast-${toast.type}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {toast.type === "delete"
                            ? <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>
                            : <polyline points="20 6 9 17 4 12"/>
                        }
                    </svg>
                    {toast.message}
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {confirmDeleteId && (
                <div className="holiday-confirm-overlay">
                    <div className="holiday-confirm-dialog">
                        <h4>Delete Holiday?</h4>
                        <p>This action cannot be undone.</p>
                        <div className="holiday-confirm-actions">
                            <button className="btn-holiday-confirm-delete" onClick={() => handleDelete(confirmDeleteId)}>
                                Delete
                            </button>
                            <button className="btn-holiday-confirm-cancel" onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Holiday;