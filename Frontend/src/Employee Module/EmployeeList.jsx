import { useEffect, useState } from "react";
import "./EmployeeList.css";
import API from "../api.js";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LeaveModal from "./LeaveModal.jsx";

function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [leaveEmployee, setLeaveEmployee] = useState(null);

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

    useEffect(() => {
        const fetchEmployees = async () => {
            const res = await API.get("/emp/all");
            setEmployees(res.data);
        };
        fetchEmployees();
    }, []);

    const handleEdit = (employee) => {
        navigate("/add-employee", { state: { employee } });
    };

    const handleDelete = async (id) => {
        try {
            await API.delete(`/emp/delete/${id}`);
            setEmployees((prev) => prev.filter(emp => emp._id !== id));
            setConfirmDeleteId(null);
            showToast("Employee deleted Successfully.", "delete");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="emp-page">

            {/* Page header */}
            <div className="emp-header">
                <div className="emp-header-left">
                    <h2 className="emp-title">Employee Directory</h2>
                    <p className="emp-subtitle">Manage and monitor your workforce</p>
                </div>
                <Link to="/add-employee" className="add-emp-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/>
                        <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                    Add Employee
                </Link>

            </div>

            {/* Cards grid */}
            <div className="emp-grid">
                {employees.map((emp) => (
                    <div className="emp-card" key={emp._id}>

                        {/* Avatar + Name */}
                        <div className="emp-card-top">
                            <div className="emp-avatar">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div className="emp-identity">
                                <h3 className="emp-name">{emp.firstName} {emp.lastName}</h3>
                                {emp.designations?.length > 0 && (
                                    <span className="emp-designation-badge">
                                        {emp.designations[emp.designations.length - 1].jobTitle}
                                    </span>
                                )}
                            </div>
                            <div className="emp-actions">
                                <div className="emp-action-btns">
                                <button className="action-btn edit" onClick={() => handleEdit(emp)} title="Edit">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                                <button className="action-btn delete" onClick={() => setConfirmDeleteId(emp._id)} title="Delete">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                        <path d="M10 11v6M14 11v6"/>
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                    </svg>
                                </button>
                                <button className="action-btn leave" onClick={() => setLeaveEmployee(emp)} title="Leave">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </button>
                                </div>
                                {/* Status badge moved here, below action buttons */}
                                <span className={`emp-status-badge emp-status-${emp.status}`}>
                                    {emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : "—"}
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="emp-divider"></div>

                        {/* Info rows */}
                        <div className="emp-details">
                            <div className="emp-detail-row">
                                <span className="detail-label">SSN</span>
                                <span className="detail-value">XXX-XX-{emp.SSN}</span>
                            </div>
                            <div className="emp-detail-row">
                                <span className="detail-label">City</span>
                                <span className="detail-value">{emp.physicalAddress?.city || "—"}</span>
                            </div>
                        </div>

                    </div>
                ))}

                {/* Quick Add card */}
                <Link to="/add-employee" className="emp-card quick-add-card">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <p className="quick-add-title">Quick Add Employee</p>
                    <p className="quick-add-sub">Instantly create a new profile</p>
                </Link>
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

            {/* LEAVE MODAL */}
            {leaveEmployee && (
                <LeaveModal
                    employee={leaveEmployee}
                    onClose={() => setLeaveEmployee(null)}
                    showToast={showToast}
                />
            )}

            {/* DELETE CONFIRMATION */}
            {confirmDeleteId && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h4>Delete Employee?</h4>
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
}

export default EmployeeList;