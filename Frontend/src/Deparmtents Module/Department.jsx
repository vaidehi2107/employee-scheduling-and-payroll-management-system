import API from "../api.js";
import { useState, useEffect } from "react";
import "./Department.css";
import { useNavigate, useLocation } from "react-router-dom";

function Department() {
    const emptyForm = { deptName: "" };

    const [departments, setDepartments] = useState([]);
    const [deptForm, setDeptForm]       = useState(emptyForm);
    const [jobTitles, setJobTitles]     = useState([]);
    const [jobInput, setJobInput]       = useState("");
    const [showForm, setShowForm]       = useState(false);
    const [editingId, setEditingId]     = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };

    useEffect(() => {
         console.log("Location State:", location.state);
        if (location.state?.toast) {
            showToast(
                location.state.toast.message,
                location.state.toast.type
            );

            navigate(location.pathname, {
                replace: true,
                state: null
            });
        }
    }, [location, navigate]);

    useEffect(() => { fetchDepartments(); }, []);

    const fetchDepartments = async () => {
        try {
            const res = await API.get("/departments");
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleJobKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const val = jobInput.trim();
            if (val && !jobTitles.includes(val)) {
                setJobTitles(prev => [...prev, val]);
            }
            setJobInput("");
        }
    };

    const removeJobTitle = (title) => {
        setJobTitles(prev => prev.filter(t => t !== title));
    };

    const handleAdd = async () => {
        try {
            const payload = { deptName: deptForm.deptName, jobTitles };
            const res = await API.post("/dept/add", payload);
            setDepartments(prev => [...prev, res.data]);
            resetForm();
            showToast("Department Added Successfully.");
        } catch (err) {
            alert(err.response?.data?.message || "Error adding department");
        }
    };

    const handleEdit = (dept) => {
        setDeptForm({ deptName: dept.deptName });
        setJobTitles(dept.jobTitles || []);
        setEditingId(dept._id);
        setShowForm(true);
    };

    const handleUpdate = async () => {
        try {
            const payload = { deptName: deptForm.deptName, jobTitles };
            const res = await API.put(`/dept/update/${editingId}`, payload);
            setDepartments(prev => prev.map(d => d._id === editingId ? res.data : d));
            resetForm();
            showToast("Department Updated Successfully.");
        } catch (err) {
            alert(err.response?.data?.message || "Error updating department");
        }
    };

    const handleDelete = async (id) => {
        try {
            await API.delete(`/dept/delete/${id}`);
            setDepartments(prev => prev.filter(d => d._id !== id));
            setConfirmDeleteId(null);
            showToast("Department deleted Successfully.", "delete");
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setDeptForm(emptyForm);
        setJobTitles([]);
        setJobInput("");
        setEditingId(null);
        setShowForm(false);
    };

    return (
        <div className="dept-container">

            <div className="dept-header">
                <div>
                    <h2 className="dept-title">Department Management</h2>
                    <p>Manage departments and their associated job titles</p>
                </div>
            </div>

            <div className="dept-section">

                <div className="dept-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    Departments
                    {!showForm && (
                        <button type="button" className="btn-add-dept" onClick={() => setShowForm(true)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Department
                        </button>
                    )}
                </div>

                {showForm && (
                    <div className="dept-form-row">
                        <div className="dept-form-group">
                            <label>Department Name</label>
                            <input
                                name="deptName"
                                value={deptForm.deptName}
                                onChange={(e) => setDeptForm({ deptName: e.target.value })}
                                placeholder="e.g. Engineering"
                            />
                        </div>

                        <div className="dept-form-group">
                            <label>Add Job Title</label>
                            <div className="dept-job-input-row">
                                <input
                                    value={jobInput}
                                    onChange={(e) => setJobInput(e.target.value)}
                                    onKeyDown={handleJobKeyDown}
                                    placeholder="e.g. Software Engineer"
                                />
                                <button
                                    type="button"
                                    className="btn-add-job-title"
                                    onClick={() => {
                                        const val = jobInput.trim();
                                        if (val && !jobTitles.includes(val)) {
                                            setJobTitles(prev => [...prev, val]);
                                        }
                                        setJobInput("");
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="dept-form-actions">
                            <button
                                type="button"
                                className="btn-dept-save"
                                onClick={editingId ? handleUpdate : handleAdd}
                            >
                                {editingId ? "Update" : "Save"}
                            </button>
                            <button type="button" className="btn-dept-cancel" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>

                        {jobTitles.length > 0 && (
                            <div className="dept-tags-row">
                                <span className="dept-tags-label">Job Titles:</span>
                                {jobTitles.map((title) => (
                                    <span key={title} className="dept-tag-chip">
                                        {title}
                                        <span onClick={() => removeJobTitle(title)}>×</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {departments.length > 0 ? (
                    <table className="dept-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left" }}>Department</th>
                                <th>Job Titles</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map(dept => (
                                <tr key={dept._id} className={editingId === dept._id ? "dept-row-editing" : ""}>
                                    <td>
                                        <div className="dept-name">{dept.deptName}</div>
                                        <div className="dept-meta">
                                            {dept.jobTitles?.length || 0} job title{dept.jobTitles?.length !== 1 ? "s" : ""}
                                        </div>
                                    </td>
                                    <td>
                                        {dept.jobTitles?.length > 0
                                            ? (
                                                <div className="dept-badges-row">
                                                    {dept.jobTitles.map(t => (
                                                        <span key={t} className="dept-badge">{t}</span>
                                                    ))}
                                                </div>
                                            )
                                            : <span className="dept-empty-titles">—</span>
                                        }
                                    </td>
                                    <td>
                                        <div className="dept-actions-cell">
                                            <button type="button" className="dept-icon-btn dept-edit-btn" onClick={() => handleEdit(dept)} title="Edit">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            </button>
                                            <button type="button" className="dept-icon-btn dept-delete-btn" onClick={() => setConfirmDeleteId(dept._id)} title="Delete">
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
                    !showForm && (
                        <div className="dept-empty">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                <rect x="2" y="7" width="20" height="14" rx="2"/>
                                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                            </svg>
                            <p>No departments added yet</p>
                        </div>
                    )
                )}
            </div>

            {/* TOAST */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {toast.type === "delete"
                    ? <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>
                    : <><polyline points="20 6 9 17 4 12"/></>
                    }
                </svg>
                {toast.message}
                </div>
            )}

            {/* Delete Confirmation */}
            {confirmDeleteId && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h4>Delete Department?</h4>
                        <p>This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button className="btn-confirm-delete" onClick={() => handleDelete(confirmDeleteId)}>Delete</button>
                            <button className="btn-confirm-cancel" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Department;