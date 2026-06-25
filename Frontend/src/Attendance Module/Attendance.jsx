import { useState, useEffect } from "react";
import API from "../api.js";
import DatePicker from "react-datepicker";
import "./Attendance.css";
import { format } from "date-fns";
import AttendanceForm from "./AttendanceForm.jsx";

// Normalise any time string to "09:30 AM" for consistent table display
const formatTime = (val) => {
  if (!val) return "—";
  if (val.includes("AM") || val.includes("PM")) {
    const [time, meridiem] = val.trim().split(" ");
    const [h, m] = time.split(":").map(Number);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + " " + meridiem;
  }
  const [h, m] = val.split(":").map(Number);
  const meridiem = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return String(hour).padStart(2, "0") + ":" + String(m).padStart(2, "0") + " " + meridiem;
};

function Attendance(){

    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);

    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1-day;
        d.setDate(d.getDate()+ diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const [filters, setFilters] = useState({
        startDate: getMonday(new Date()),
        endDate: new Date(),
        employeeId: ""
    });

    const [showForm, setShowForm] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [toast, setToast] = useState(null);
    const [recalculating, setRecalculating] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };

    useEffect(() => {
        fetchEmployees();
        searchAttendance(getMonday(new Date()), new Date(), "");
    }, []);

    const fetchEmployees = async () => {
        try{
            const response = await API.get("/emp/all");
            setEmployees(response.data.filter(emp => emp.status?.toLowerCase() === "active"));
        }catch(err){
            console.log(err);
        }
    };

    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const searchAttendance = async (
        startDate = filters.startDate,
        endDate = filters.endDate,
        employeeId = filters.employeeId
    ) => {
        try {
            const response = await API.get(
                "/attendance/filter",
                { params: { employeeId, startDate, endDate } }
            );
            setAttendance(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await API.delete(`/attendance/delete/${id}`);
            setAttendance(attendance.filter(item => item._id !== id));
            setConfirmDeleteId(null);
            showToast("Attendance record deleted.", "delete");
        } catch (err) {
            console.log(err);
        }
    };

    // Returns the wage effective on a given date
    const getEffectiveWage = (wages = [], attendanceDate) => {
        const date = new Date(attendanceDate);
        const applicable = wages
            .filter(w => w.effectiveDate && new Date(w.effectiveDate) <= date)
            .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        return applicable[0] || null;
    };

    // Re-submit all stale records (zero earnings but has times) to backend for recalculation
    const handleRecalculateAll = async () => {
        const stale = attendance.filter(item => item.totalEarnings === 0 && item.inTime && item.outTime);
        if (stale.length === 0) return showToast("No records need recalculation.");
        setRecalculating(true);
        try {
            await Promise.all(stale.map(item =>
                API.put(`/attendance/update/${item._id}`, {
                    employeeId: item.employeeId?._id || item.employeeId,
                    date: item.date,
                    inTime: item.inTime,
                    breakIn: item.breakIn,
                    breakOut: item.breakOut,
                    outTime: item.outTime,
                })
            ));
            await searchAttendance();
            showToast(`${stale.length} record(s) recalculated successfully!`);
        } catch (err) {
            console.log(err);
        } finally {
            setRecalculating(false);
        }
    };

    const staleCount = attendance.filter(item => item.totalEarnings === 0 && item.inTime && item.outTime).length;

    return(
     <div className="attendance-container">

      {/* HEADER */}
      <div className="attendance-header">
        <div>
          <h2 className="emp-title">Attendance Management</h2>
          <p>Track and monitor employee attendance</p>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="filter-section">

        <div className="filter-group">
          <label>Date Range</label>
          <DatePicker
            selectsRange
            startDate={filters.startDate}
            endDate={filters.endDate}
            onChange={([start, end]) =>
              setFilters({ ...filters, startDate: start, endDate: end })
            }
            dateFormat="MM-dd-yyyy"
            placeholderText="Select date range"
            className="date-picker"
            monthsShown={2}
          />
        </div>

        <div className="filter-group">
          <label>Employee</label>
          <select name="employeeId" value={filters.employeeId} onChange={handleChange}>
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>

        <button
          className="search-btn"
          onClick={() => searchAttendance(filters.startDate, filters.endDate, filters.employeeId)}
        >
          Search
        </button>

        <button className="add-emp-btn"
          onClick={() => { setSelectedAttendance(null); setShowForm(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            Add Attendance
        </button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th rowSpan="2">Employee</th>
              <th rowSpan="2">Date</th>
              <th rowSpan="2">In Time</th>
              <th colSpan="2" className="break-header">Break</th>
              <th rowSpan="2">Out Time</th>
              <th rowSpan="2">Regular Hrs</th>
              <th rowSpan="2">OverTime Hrs</th>
              <th rowSpan="2">Reg Earnings</th>
              <th rowSpan="2">OT Earnings</th>
              <th rowSpan="2">Total Earnings</th>
            </tr>
            <tr>
              <th>Break In</th>
              <th>Break Out</th>
            </tr>
          </thead>

          <tbody>
            {attendance?.map((item) => {
              const wage = getEffectiveWage(item.employeeId?.wages, item.date);
              return (
                <tr key={item._id}>
                  <td>
                    {item.employeeId?.firstName}{" "}{item.employeeId?.lastName}
                    {wage && (
                      <div style={{ fontSize: "0.65rem", color: "#6b7280", marginTop: "2px" }}>
                        (${parseFloat(wage.hourlyRate)} /hr)
                      </div>
                    )}
                  </td>

                  <td>{format(new Date(item.date), "MM-dd-yyyy")}</td>
                  <td>{formatTime(item.inTime)}</td>
                  <td>{formatTime(item.breakIn)}</td>
                  <td>{formatTime(item.breakOut)}</td>
                  <td>{formatTime(item.outTime)}</td>
                  <td>{item.regularHours != null ? `${item.regularHours} hrs` : "—"}</td>
                  <td>{item.overtimeHours != null ? `${item.overtimeHours} hrs` : "—"}</td>
                  <td className={item.regEarnings ? "earnings-cell" : ""}>{item.regEarnings != null ? `$${item.regEarnings.toFixed(2)}` : "—"}</td>
                  <td className={item.otEarnings ? "earnings-cell" : ""}>{item.otEarnings != null ? `$${item.otEarnings.toFixed(2)}` : "—"}</td>
                  <td className={item.totalEarnings ? "earnings-cell total-cell" : ""}>{item.totalEarnings != null ? `$${item.totalEarnings.toFixed(2)}` : "—"}</td>

                  <td>
                    <div className="emp-actions">
                      {item.isLocked ? (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "rgba(124, 92, 191, 0.1)",
                          color: "#7c5cbf",
                          padding: "5px 8px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          lineHeight: 1
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          Locked
                        </span>
                      ) : (
            
                        <>
                          <button className="action-btn edit"
                            onClick={() => { setSelectedAttendance(item); setShowForm(true); }}
                            title="Edit">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                          </button>
                          <button className="action-btn delete" onClick={() => setConfirmDeleteId(item._id)} title="Delete">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AttendanceForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={(isEdit) => {
          searchAttendance();
          showToast(isEdit ? "Attendance updated successfully!" : "Attendance added successfully!");
        }}
        selectedAttendance={selectedAttendance}
      />

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

      {/* DELETE CONFIRMATION */}
      {confirmDeleteId && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h4>Delete Attendance Record?</h4>
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
export default Attendance;