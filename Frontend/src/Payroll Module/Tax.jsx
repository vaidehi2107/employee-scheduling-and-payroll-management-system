import API from "../api.js";
import { useState, useEffect } from "react";
import "./Tax.css";

function Tax() {
    const emptyTax = {
        taxCode: "",
        startRange: "",
        endRange: "",
        employeePercentage: "",
        employerContribution: "",
        status: "active"
    };

    const [taxes, setTaxes] = useState([]);
    const [taxForm, setTaxForm] = useState(emptyTax);
    const [showTaxForm, setShowTaxForm] = useState(false);
    const [editingTaxId, setEditingTaxId] = useState(null);

    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        fetchTaxes();
    }, []);

    const fetchTaxes = async () => {
        try {
            const res = await API.get("/tax/all");
            setTaxes(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleTaxChange = (e) => {
        setTaxForm(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleAddTax = async () => {
        try {
            const payload = {
                taxCode: taxForm.taxCode,
                startRange: Number(taxForm.startRange),
                endRange: Number(taxForm.endRange),
                employeePercentage: Number(taxForm.employeePercentage),
                employerContribution: Number(taxForm.employerContribution),
                status: taxForm.status
            };
            const res = await API.post("/tax/add", payload);
            setTaxes(prev => [...prev, res.data]);
            setTaxForm(emptyTax);
            setShowTaxForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handelEditTax = (tax) => {
        setTaxForm({
            taxCode: tax.taxCode,
            startRange: tax.startRange,
            endRange: tax.endRange,
            employeePercentage: tax.employeePercentage,
            employerContribution: tax.employerContribution,
            status: tax.status
        });
        setEditingTaxId(tax._id);
        setShowTaxForm(true);
    };
    
    const handleUpdateTax = async () => {
        try {
            const payload = {
                taxCode: taxForm.taxCode,
                startRange: Number(taxForm.startRange),
                endRange: Number(taxForm.endRange),
                employeePercentage: Number(taxForm.employeePercentage),
                employerContribution: Number(taxForm.employerContribution),
                status: taxForm.status
            };
            const res = await API.put(`/tax/update/${editingTaxId}`, payload);
            setTaxes(prev => prev.map(t => t._id === editingTaxId ? res.data : t));
            setEditingTaxId(null);
            setTaxForm(emptyTax);
            setShowTaxForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTax = async (id) => {
        try {
            await API.delete(`/tax/delete/${id}`);
            setTaxes(prev => prev.filter(t => t._id !== id));
            setConfirmDeleteId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancelTax = () => {
        setTaxForm(emptyTax);
        setEditingTaxId(null);
        setShowTaxForm(false);
    };

    return (
        <div className="tax-container">

            {/* HEADER */}
            <div className="tax-header">
                <div>
                    <h2 className="tax-title">Tax Management</h2>
                    <p>Manage and configure employee tax brackets and contributions</p>
                </div>
            </div>

            {/* TAX SECTION CARD */}
            <div className="tax-section">

                <div className="tax-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    Tax Module
                    {!showTaxForm && (
                        <button type="button" className="btn-add-tax" onClick={() => setShowTaxForm(true)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Record
                        </button>
                    )}
                </div>

                {/* Inline add/edit form */}
                {showTaxForm && (
                    <div className="tax-form-row">
                        <div className="tax-form-group">
                            <label>Tax Code</label>
                            <input name="taxCode" value={taxForm.taxCode} onChange={handleTaxChange} placeholder="e.g. TX01" />
                        </div>
                        <div className="tax-form-group">
                            <label>Start Range ($)</label>
                            <input name="startRange" value={taxForm.startRange} onChange={handleTaxChange} placeholder="0" />
                        </div>
                        <div className="tax-form-group">
                            <label>End Range ($)</label>
                            <input name="endRange" value={taxForm.endRange} onChange={handleTaxChange} placeholder="0" />
                        </div>
                        <div className="tax-form-group">
                            <label>Employee %</label>
                            <input name="employeePercentage" value={taxForm.employeePercentage} onChange={handleTaxChange} placeholder="0" />
                        </div>
                        <div className="tax-form-group">
                            <label>Employer Contribution %</label>
                            <input name="employerContribution" value={taxForm.employerContribution} onChange={handleTaxChange} placeholder="0" />
                        </div>
                        <div className="tax-form-group">
                            <label>Status</label>
                            <select name="status" value={taxForm.status} onChange={handleTaxChange} className="tax-select">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="tax-form-actions">
                            <button
                                type="button"
                                className="btn-tax-save"
                                onClick={editingTaxId ? handleUpdateTax : handleAddTax}
                            >
                                {editingTaxId ? "Update" : "Save"}
                            </button>
                            <button type="button" className="btn-tax-cancel" onClick={handleCancelTax}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Tax table */}
                {taxes.length > 0 ? (
                    <table className="tax-table">
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
                            {taxes.map(tax => (
                                <tr key={tax._id} className={editingTaxId === tax._id ? "tax-row-editing" : ""}>
                                    <td>{tax.taxCode}</td>
                                    <td>${tax.startRange.toLocaleString()} – ${tax.endRange.toLocaleString()}</td>
                                    <td><span className="tax-badge">{tax.employeePercentage}%</span></td>
                                    <td><span className="tax-badge">{tax.employerContribution}%</span></td>
                                    <td>
                                        <span className={`tax-status-badge ${tax.status}`}>
                                            {tax.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="tax-actions-cell">
                                            <button type="button" className="tax-icon-btn tax-edit-btn" onClick={() => handelEditTax(tax)} title="Edit">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            </button>
                                            <button type="button" className="tax-icon-btn tax-delete-btn" onClick={() => setConfirmDeleteId(tax._id)} title="Delete">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                    <path d="M10 11v6"/><path d="M14 11v6"/>
                                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    !showTaxForm && (
                        <div className="tax-empty">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            <p>No tax records added yet</p>
                        </div>
                    )
                )}

            </div>
            {/* DELETE CONFIRMATION */}
            {confirmDeleteId && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h4>Delete Tax Record?</h4>
                        <p>This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button className="btn-confirm-delete" onClick={() => handleDeleteTax(confirmDeleteId)}>
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

export default Tax;