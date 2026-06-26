import { useState, useEffect, useMemo } from "react";
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

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// First and last day of the month containing `monthDate`
const getMonthRange = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

function Attendance(){

    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);

    const [employeeId, setEmployeeId] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const [showForm, setShowForm] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [toast, setToast] = useState(null);

    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try{
            const response = await API.get("/emp/all");
            setEmployees(response.data.filter(emp => emp.status?.toLowerCase() === "active"));
        }catch(err){
            console.log(err);
        }
    };

    // Load attendance whenever the selected employee or month changes
    useEffect(() => {
        if (!employeeId) {
            setAttendance([]);
            return;
        }
        const { start, end } = getMonthRange(selectedMonth);
        searchAttendance(start, end, employeeId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId, selectedMonth]);

    const searchAttendance = async (startDate, endDate, empId) => {
        try {
            const response = await API.get(
                "/attendance/filter",
                { params: { employeeId: empId, startDate: startDate.toISOString(), endDate: endDate.toISOString() } }
            );
            setAttendance(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    const refreshAttendance = () => {
        if (!employeeId) return;
        const { start, end } = getMonthRange(selectedMonth);
        searchAttendance(start, end, employeeId);
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

    const selectedEmployee = employees.find(emp => emp._id === employeeId);

    // Today, stripped to midnight, for past/future comparisons
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Build every calendar day of the selected month, merged with whatever
    // attendance records exist. Weekends are treated as days off, and days
    // after today are "upcoming" (no status yet).
    const calendarDays = useMemo(() => {
        if (!employeeId) return [];
        const { start, end } = getMonthRange(selectedMonth);
        const days = [];

        for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
            const dayDate = new Date(cursor);
            const dow = dayDate.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isFuture = dayDate > today;
            const record = attendance.find(item => isSameDay(new Date(item.date), dayDate));

            let status;
            if (isWeekend) status = "weekend";
            else if (isFuture) status = "upcoming";
            else if (record) status = "present";
            else status = "absent";

            days.push({ date: dayDate, isWeekend, isFuture, record, status });
        }
        return days;
    }, [attendance, selectedMonth, employeeId, today]);

    const workingDays = calendarDays.filter(d => d.status === "present" || d.status === "absent");
    const presentCount = calendarDays.filter(d => d.status === "present").length;
    const absentCount = workingDays.length - presentCount;

    const statusLabel = { present: "Present", absent: "Absent", weekend: "Week Off", upcoming: "Upcoming" };

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
          <label>Month</label>
          <DatePicker
            selected={selectedMonth}
            onChange={(date) => setSelectedMonth(date)}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            className="date-picker"
          />
        </div>

        <div className="filter-group">
          <label>Employee</label>
          <select name="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>

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

      {!employeeId ? (
        <div className="empty-prompt">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c8c4e8" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>Select an employee to view their monthly attendance calendar.</p>
        </div>
      ) : (
        <>
          <div className="month-view-header">
            <h3>{selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ""}</h3>
            <span>{format(selectedMonth, "MMMM yyyy")}</span>
            <div className="month-view-stats">
              <span className="stat-pill total">{workingDays.length} Working Days</span>
              <span className="stat-pill present">{presentCount} Present</span>
              <span className="stat-pill absent">{absentCount} Absent</span>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th rowSpan="2">Date</th>
                  <th rowSpan="2">In Time</th>
                  <th rowspan="2">Break In</th>
                  <th rowspan="2">Break Out</th>
                  <th rowSpan="2">Out Time</th>
                  <th rowSpan="2">Status</th>
                  <th rowSpan="2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {calendarDays.map((day) => {
                  const item = day.record;
                  const rowClass =
                    day.status === "weekend" ? "row-weekend" :
                    day.status === "upcoming" ? "row-upcoming" : "";

                  return (
                    <tr key={day.date.toISOString()} className={rowClass}>
                      <td>{format(day.date, "MM-dd-yyyy")}</td>
                      <td>{item ? formatTime(item.inTime) : "—"}</td>
                      <td>{item ? formatTime(item.breakIn) : "—"}</td>
                      <td>{item ? formatTime(item.breakOut) : "—"}</td>
                      <td>{item ? formatTime(item.outTime) : "—"}</td>
                      <td>
                        <span className={`status-badge status-${day.status}`}>
                          {statusLabel[day.status]}
                        </span>
                      </td>
                      <td>
                        <div className="emp-actions">
                          {item?.isLocked ? (
                            <span className="locked-badge">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              Locked
                            </span>
                          ) : item ? (
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
                          ) : (
                            <span className="no-action-dash">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          
        </>
      )}

      <AttendanceForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={(isEdit) => {
          refreshAttendance();
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