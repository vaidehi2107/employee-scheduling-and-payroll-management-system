import { useState, useEffect } from "react";
import API from "../api.js";
import "./EmployeeTaxSetup.css";

function EmployeeTaxSetup() {
    const emptyOverride = () => ({
        taxCode: "",
        startRange: "",
        endRange: "",
        employeePercentage: "",
        employerContribution: "",
        status: "active"
    });

    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const [globalTaxes, setGlobalTaxes] = useState([]);
    const [employeeOverrides, setEmployeeOverrides] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [overrideForm, setOverrideForm] = useState(emptyOverride());
    const [editingId, setEditingId] = useState(null);
    // editingFromGlobal = true means the user clicked Edit on a global (non-overridden) row
    const [editingFromGlobal, setEditingFromGlobal] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        fetchEmployees();
        fetchGlobalTaxes();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await API.get("/emp/all");
            setEmployees(res.data.filter(emp => emp.status?.toLowerCase() === "active"));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchGlobalTaxes = async () => {
        try {
            const res = await API.get("/tax/all");
            setGlobalTaxes(res.data);
        } catch (err) {
            console.error("fetchGlobalTaxes error:", err?.response?.data || err);
        }
    };

    const handleEmployeeSelect = async (e) => {
        const empId = e.target.value;
        if (!empId) {
            setSelectedEmployee(null);
            setEmployeeOverrides([]);
            return;
        }
        const emp = employees.find(em => em._id === empId);
        setSelectedEmployee(emp);
        setShowForm(false);
        setEditingId(null);
        setEditingFromGlobal(false);
        setOverrideForm(emptyOverride());
        await fetchEmployeeOverrides(empId);
    };

    const fetchEmployeeOverrides = async (empId) => {
        try {
            const res = await API.get(`/emp-tax/${empId}`);
            // const data = Array.isArray(res.data) ? res.data : (res.data?.taxes || []);
            setEmployeeOverrides(res.data);
        } catch (err) {
            console.error("fetchEmployeeOverrides error:", err);
            setEmployeeOverrides([]);
        }
    };

    // Merge: for each global tax, if an employee override exists for that taxCode use it;
    // otherwise show the global row. Then append any employee-only extras (new tax codes).
    const getMergedTaxes = () => {
        const merged = globalTaxes.map(global => {
            const override = employeeOverrides.find(o => o.taxCode === global.taxCode);
            if (override) {
                return { ...override, isOverridden: true };
            }
            return { ...global, isOverridden: false };
        });

        // Extra rows the employee has that aren't in global (added via Add Record)
        const extraOverrides = employeeOverrides.filter(
            o => !globalTaxes.find(g => g.taxCode === o.taxCode)
        );
        extraOverrides.forEach(o => merged.push({ ...o, isOverridden: true, isExtra: true }));

        return merged;
    };

    const taxRows = getMergedTaxes();
    const hasOverrides = employeeOverrides.length > 0;

    const handleFormChange = (e) => {
        setOverrideForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Add a brand-new employee-specific tax record
    const handleAddOverride = async () => {
        try {
            const { _id, __v, employeeId: _eid, ...cleanForm } = overrideForm;
            const payload = { ...cleanForm, employeeId: selectedEmployee._id };
            const res = await API.post("/emp-tax/add", payload);
            const saved = res.data?.tax || res.data;
            setEmployeeOverrides(prev => [...prev, saved]);
            setOverrideForm(emptyOverride());
            setShowForm(false);
        } catch (err) {
            console.error("Add override error:", err?.response?.data || err);
        }
    };

    // Edit button clicked — could be a global row or an already-overridden row
    const handleEditRow = (tax) => {
        setOverrideForm({
            taxCode: tax.taxCode,
            startRange: tax.startRange,
            endRange: tax.endRange,
            employeePercentage: tax.employeePercentage,
            employerContribution: tax.employerContribution,
            status: tax.status,
        });

        if (tax.isOverridden) {
            // Already an employee override — update it directly
            setEditingId(tax._id);
            setEditingFromGlobal(false);
        } else {
            // Global row — will POST a new override on save
            setEditingId(null);
            setEditingFromGlobal(true);
        }
        setShowForm(true);
    };

    // Save: either update existing override or create new one from a global row
    const handleSave = async () => {
        if (editingId) {
            // Update existing employee override
            try {
                const res = await API.put(
                    `/emp-tax/update/${editingId}`,
                    overrideForm
                );
                const updated = res.data?.tax || res.data;
                setEmployeeOverrides(prev =>
                    prev.map(r => r._id === editingId ? updated : r)
                );
                resetForm();
            } catch (err) {
                console.error("Update override error:", err?.response?.data || err);
            }
        } else {
            // Create a new override (either from a global row edit or the Add button)
            await handleAddOverride();
            setEditingFromGlobal(false);
        }
    };

    // Delete: only allowed on overridden rows — reverts row to global automatically
    const handleDeleteOverride = async (id) => {
        try {
            await API.delete(`/emp-tax/delete/${id}`);
            setEmployeeOverrides(prev => prev.filter(r => r._id !== id));
            setConfirmDeleteId(null);
        } catch (err) {
            console.error(err);
        }
    };

    // Reset all overrides for this employee back to global
    const handleResetToGlobal = async () => {
        try {
            await API.delete(
                `/emp-tax/reset/${selectedEmployee._id}`
            );
            setEmployeeOverrides([]);
            setShowForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setOverrideForm(emptyOverride());
        setEditingId(null);
        setEditingFromGlobal(false);
        setShowForm(false);
    };

    return (
        <div className="etax-container">

            {/* HEADER */}
            <div className="etax-header">
                <div>
                    <h2 className="etax-title">Employee Tax Setup</h2>
                    <p>Configure individual tax settings per employee. Defaults to the global tax module.</p>
                </div>
            </div>

            {/* EMPLOYEE SELECTOR */}
            <div className="etax-selector-card">
                <label className="etax-selector-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    Select Employee
                </label>
                <div className="etax-select-wrapper">
                    <select
                        className="etax-employee-select"
                        onChange={handleEmployeeSelect}
                        defaultValue=""
                    >
                        <option value="" disabled>— Choose an employee —</option>
                        {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>
                                {emp.firstName} {emp.lastName}
                                {emp.employeeId ? ` (${emp.employeeId})` : ""}
                            </option>
                        ))}
                    </select>
                    <svg className="etax-select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            {/* TAX SECTION */}
            {selectedEmployee && (
                <div className="etax-section">

                    {/* Section title */}
                    <div className="etax-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        Tax Configuration
                        <span className={`etax-mode-badge ${hasOverrides ? "customized" : "default"}`}>
                            {hasOverrides ? "Customised" : "Using Global Default"}
                        </span>

                        <div className="etax-title-actions">
                            {hasOverrides && (
                                <button
                                    type="button"
                                    className="btn-reset-global"
                                    onClick={handleResetToGlobal}
                                    title="Remove all overrides and revert to global tax settings"
                                >
                                    ↺ Reset to Global
                                </button>
                            )}
                            {!showForm && (
                                <button
                                    type="button"
                                    className="btn-add-override"
                                    onClick={() => {
                                        setOverrideForm(emptyOverride());
                                        setEditingId(null);
                                        setEditingFromGlobal(false);
                                        setShowForm(true);
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Record
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info banner */}
                    {!hasOverrides && (
                        <div className="etax-info-banner">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Showing global tax defaults for <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>.
                            Edit any row or add a new record to create employee-specific overrides.
                        </div>
                    )}

                    {/* Inline add/edit form */}
                    {showForm && (
                        <div className="etax-form-row">
                            <div className="etax-form-group">
                                <label>Tax Code</label>
                                <input
                                    name="taxCode"
                                    value={overrideForm.taxCode}
                                    onChange={handleFormChange}
                                    placeholder="e.g. TX01"
                                    // Lock taxCode when editing an existing row so it stays matched
                                    readOnly={!!(editingId || editingFromGlobal)}
                                />
                            </div>
                            <div className="etax-form-group">
                                <label>Start Range </label>
                                <input name="startRange" value={overrideForm.startRange} onChange={handleFormChange} placeholder="0" />
                            </div>
                            <div className="etax-form-group">
                                <label>End Range </label>
                                <input name="endRange" value={overrideForm.endRange} onChange={handleFormChange} placeholder="0" />
                            </div>
                            <div className="etax-form-group">
                                <label>Employee %</label>
                                <input name="employeePercentage" value={overrideForm.employeePercentage} onChange={handleFormChange} placeholder="0" />
                            </div>
                            <div className="etax-form-group">
                                <label>Employer Contribution %</label>
                                <input name="employerContribution" value={overrideForm.employerContribution} onChange={handleFormChange} placeholder="0" />
                            </div>
                            <div className="etax-form-group">
                                <label>Status</label>
                                <select name="status" value={overrideForm.status} onChange={handleFormChange} className="etax-select-field">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="etax-form-actions">
                                <button type="button" className="btn-etax-save" onClick={handleSave}>
                                    {editingId ? "Update" : "Save"}
                                </button>
                                <button type="button" className="btn-etax-cancel" onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tax table */}
                    {taxRows.length > 0 ? (
                        <table className="etax-table">
                            <thead>
                                <tr>
                                    <th>Tax Code</th>
                                    <th>Range</th>
                                    <th>Employee %</th>
                                    <th>Employer Contribution %</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {taxRows.map(tax => (
                                    <tr
                                        key={tax._id}
                                        className={`
                                            ${editingId === tax._id ? "etax-row-editing" : ""}
                                            ${tax.isOverridden ? "etax-row-overridden" : ""}
                                        `}
                                    >
                                        <td>
                                            {tax.taxCode}
                                            {tax.isOverridden && (
                                                <span className="etax-override-badge">customised</span>
                                            )}
                                        </td>
                                        <td>₹{Number(tax.startRange).toLocaleString()} – ₹{Number(tax.endRange).toLocaleString()}</td>
                                        <td><span className="etax-badge">{tax.employeePercentage}%</span></td>
                                        <td><span className="etax-badge">{tax.employerContribution}%</span></td>
                                        <td>
                                            <span className={`etax-status-badge ${tax.status}`}>
                                                {tax.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="etax-actions-cell">
                                                {/* Edit always available — on global rows it creates a new override */}
                                                <button
                                                    type="button"
                                                    className="etax-icon-btn etax-edit-btn"
                                                    onClick={() => handleEditRow(tax)}
                                                    title={tax.isOverridden ? "Edit override" : "Edit (creates employee override)"}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>

                                                {/* Delete only on overridden rows — global rows revert automatically when override is deleted */}
                                                {tax.isOverridden ? (
                                                    <button
                                                        type="button"
                                                        className="etax-icon-btn etax-delete-btn"
                                                        onClick={() => setConfirmDeleteId(tax._id)}
                                                        title={tax.isExtra ? "Delete record" : "Delete override (reverts to global)"}
                                                    >
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                            <path d="M10 11v6" /><path d="M14 11v6" />
                                                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    // Placeholder so layout doesn't shift
                                                    <span className="etax-delete-placeholder" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        !showForm && (
                            <div className="etax-empty">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                <p>No tax records found</p>
                            </div>
                        )
                    )}

                </div>
            )}

            {/* Placeholder when no employee selected */}
            {!selectedEmployee && (
                <div className="etax-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <p>Select an employee above to view or configure their tax setup</p>
                </div>
            )}

            {/* Delete confirmation modal */}
            {confirmDeleteId && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h4>Delete Tax Record?</h4>
                        <p>
                            {taxRows.find(t => t._id === confirmDeleteId)?.isExtra
                                ? "This record will be permanently removed."
                                : "This override will be removed and the row will revert to the global default."
                            }
                        </p>
                        <div className="confirm-actions">
                            <button className="btn-confirm-delete" onClick={() => handleDeleteOverride(confirmDeleteId)}>
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
}

export default EmployeeTaxSetup;