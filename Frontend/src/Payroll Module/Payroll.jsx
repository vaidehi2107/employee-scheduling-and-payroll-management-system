import { useState, useEffect } from "react";
import API from "../api.js";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import "./Payroll.css";
import PayrollView from "./PayrollView.jsx";
import { downloadPayrollPDF } from "./Payrollpdf.js";

function Payroll() {

const [employees, setEmployees] = useState([]);
const [payrolls, setPayrolls] = useState([]);
const [form, setForm] = useState({
    employeeId: "",
    period: null // Date representing the selected pay month/year
});

const [generating, setGenerating] = useState(false);
const [viewPayroll, setViewPayroll] = useState(null);
const [toast, setToast] = useState(null);

const [confirmDeleteId, setConfirmDeleteId] = useState(null);

const showToast = (message, type="success") => {
    setToast({message, type});
    setTimeout(() => setToast(null), 2000);
};

// absentDays can be fractional (e.g. 1.5) since Half-Day Unpaid counts as
// half a day. Only show decimals when there actually are any.
const formatDays = (value) => {
    if (value === undefined || value === null) return "—";
    return Number.isInteger(value) ? value : value.toFixed(1);
};

useEffect(() => {
    fetchEmployees();
    fetchPayrolls();
}, []);

const fetchEmployees = async() => {
    try{
        const res = await API.get("/emp/all");
        setEmployees(res.data.filter(emp => emp.status?.toLowerCase() === "active"));
    }catch(err){
        console.error(err);
    }
};

const fetchPayrolls = async() => {
    try{
        const res = await API.get("/payroll/all");
        setPayrolls(res.data);
    }catch(err){
        console.error(err);
    }
};

//handle generate
const handleGenerate = async() => {
     if (!form.employeeId || !form.period)
            return showToast("Please fill all fields.", "error");

    setGenerating(true);
    try{

        const month = form.period.getMonth() + 1;
        const year = form.period.getFullYear();

        const res = await API.post("/payroll/generate", {
            employeeId: form.employeeId,
            month,
            year
        });
        
        await fetchPayrolls();
        setForm({employeeId: "", period: null});
        showToast("Payroll generated successfully!");

    }catch(err){
        showToast(err.response?.data?.message || "Failed to generate payroll.", "error");
    } finally {
        setGenerating(false);
    }
};

//handle delete
const handleDelete = async(id) => {
    try{
        await API.delete(`/payroll/delete/${id}`);
        setPayrolls(prev => prev.filter(p => p._id !== id));
        setConfirmDeleteId(null);
        showToast("Payroll record deleted.", "delete");
    }catch(err){
        console.error(err);
    }
};

//handle view
const handleView = async(id) => {
    try{
        const res = await API.get(`/payroll/${id}`);
        setViewPayroll(res.data);
    }catch(err){
        console.error(err);
    }
}

    return (
        <div className="payroll-container">
 
            {/* HEADER */}
            <div className="payroll-header">
                <div>
                    <h2 className="payroll-title">Payroll Management</h2>
                    <p>Generate and manage employee payroll records</p>
                </div>
            </div>
 
            {/* GENERATE PANEL */}
            <div className="payroll-generate-panel">
                <div className="generate-panel-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    Generate Payroll
                </div>
 
                <div className="generate-panel-fields">
                    {/* Employee */}
                    <div className="payroll-filter-group">
                        <label>Employee</label>
                        <select
                            value={form.employeeId}
                            onChange={e => setForm({ ...form, employeeId: e.target.value })}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
 
                    {/* Pay Month */}
                    <div className="payroll-filter-group">
                        <label>Pay Month</label>
                        <DatePicker
                            selected={form.period}
                            onChange={date => setForm({ ...form, period: date })}
                            dateFormat="MMMM yyyy"
                            showMonthYearPicker
                            placeholderText="Select pay month"
                            className="payroll-date-picker"
                        />
                    </div>
 
                    {/* Generate Button */}
                    <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={generating}
                    >
                        {generating ? (
                            <>
                                <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </div>
 
            {/* PAYROLL HISTORY TABLE */}
            <div className="payroll-table-container">
                <div className="payroll-table-header">
                    <span className="payroll-table-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Payroll History
                    </span>
                    <span className="payroll-count">{payrolls.length} record{payrolls.length !== 1 ? "s" : ""}</span>
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
                        {payrolls.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="payroll-empty-row">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                    </svg>
                                    <p>No payroll records yet. Generate one above.</p>
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
                                    <td className="payroll-deduction">-₹{p.pfDeduction}</td>
                                    <td className="payroll-deduction">-₹{p.esicDeduction}</td>
                                    <td className="payroll-deduction">-₹{p.professionalTax}</td>
                                    <td className="payroll-deduction">-₹{p.incomeTax}</td>
                                    <td className="payroll-net">₹{p.netPay}</td>
                                    <td>
                                        <div className="payroll-actions">
                                            <button className="p-action-btn p-view-btn" onClick={() => handleView(p._id)} title="View">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </svg>
                                            </button>
                                            <button className="p-action-btn p-pdf-btn" onClick={() => downloadPayrollPDF(p)} title="Download PDF">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                    <line x1="12" y1="18" x2="12" y2="12"/>
                                                    <line x1="9" y1="15" x2="15" y2="15"/>
                                                </svg>
                                            </button>
                                            <button className="p-action-btn p-delete-btn" onClick={() => setConfirmDeleteId(p._id)} title="Delete">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                    <path d="M10 11v6M14 11v6"/>
                                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                            ? <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>
                            : toast.type === "error"
                            ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                            : <><polyline points="20 6 9 17 4 12"/></>
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
export default Payroll;