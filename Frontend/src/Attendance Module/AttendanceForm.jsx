import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import API from "../api.js";
import "./AttendanceForm.css";

// Attendance dates come from the server as UTC midnight of the intended
// calendar day. Handing that straight to `new Date(...)` for the picker
// uses the browser's LOCAL timezone, which only shows the right day for
// timezones at or ahead of UTC - this re-anchors the same Y/M/D to local
// midnight so the picker prefills the correct day in any timezone.
const toDisplayDate = (date) => {
  const [y, m, d] = new Date(date).toISOString().slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

function AttendanceForm({ isOpen, onClose, onSuccess, selectedAttendance }) {
  const [employees, setEmployees] = useState([]);
  const [minDate, setMinDate] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    date: null,
    inTime: "",
    breakIn: "",
    breakOut: "",
    outTime: ""
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await API.get("/emp/all");
        setEmployees(res.data.filter(emp => emp.status?.toLowerCase() === "active"));
      } catch (err) {
        console.log(err);
      }
    };
    fetchEmployees();
  }, []);

  // Prefill when editing, reset when adding
  useEffect(() => {
    if (selectedAttendance) {
      setFormData({
        employeeId: selectedAttendance.employeeId?._id || "",
        date: selectedAttendance.date ? toDisplayDate(selectedAttendance.date) : null,
        inTime:   selectedAttendance.inTime   || "",
        breakIn:  selectedAttendance.breakIn  || "",
        breakOut: selectedAttendance.breakOut || "",
        outTime:  selectedAttendance.outTime  || "",
      });

      const emp = employees.find(e => e._id === (selectedAttendance.employeeId?._id || selectedAttendance.employeeId));
      setMinDate(emp?.joiningDate ? new Date(emp.joiningDate) : null);

    } else {
      setFormData({ employeeId: "", date: null, inTime: "", breakIn: "", breakOut: "", outTime: "" });
      setMinDate(null);
    }
  }, [selectedAttendance, employees]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        // Send the plain calendar day the user picked ("YYYY-MM-DD"), not
        // the raw Date object - JSON-serializing a Date calls toISOString()
        // internally, which converts local midnight to UTC and can roll it
        // back to the previous day.
        date: formData.date ? format(formData.date, "yyyy-MM-dd") : null
      };

      if (selectedAttendance) {
        await API.put(
          `/attendance/update/${selectedAttendance._id}`,
          payload
        );
        onSuccess(true); // true = is edit
      } else {
        await API.post("/attendance", payload);
        onSuccess(false); // false = is add
      }
      onClose();
    } catch (err) {
      console.log(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">

        <h2>{selectedAttendance ? "Edit Attendance" : "Add Attendance"}</h2>

        {/* EMPLOYEE */}
        <div className="form-group">
          <label>Employee</label>
          <select
            name="employeeId"
            value={formData.employeeId}
            onChange={(e) => {
              handleChange(e);
              const emp = employees.find(emp => emp._id === e.target.value);
              setMinDate(emp?.joiningDate ? new Date(emp.joiningDate) : null);
            }}
          >
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* DATE */}
        <div className="form-group">
          <label>Date</label>
          <DatePicker
            selected={formData.date}
            onChange={(date) => setFormData({ ...formData, date })}
            dateFormat="MM-dd-yyyy"
            placeholderText="MM-DD-YYYY"
            minDate={minDate}
          />
          {minDate && (
            <small style={{ color: "#888", fontSize: "11px", marginTop: "4px", display: "block" }}>
              Earliest allowed: {format(minDate, "MM-dd-yyyy")}
            </small>
          )}
        </div>

        {/* IN TIME */}
        <div className="form-group">
          <label>In Time</label>
          <input
            type="text"
            name="inTime"
            value={formData.inTime}
            onChange={handleChange}
            placeholder="e.g. 09:30 AM"
          />
        </div>

        {/* BREAK IN / BREAK OUT */}
        <div className="form-row">
          <div className="form-group">
            <label>Break In</label>
            <input
              type="text"
              name="breakIn"
              value={formData.breakIn}
              onChange={handleChange}
              placeholder="e.g. 01:00 PM"
            />
          </div>
          <div className="form-group">
            <label>Break Out</label>
            <input
              type="text"
              name="breakOut"
              value={formData.breakOut}
              onChange={handleChange}
              placeholder="e.g. 01:30 PM"
            />
          </div>
        </div>

        {/* OUT TIME */}
        <div className="form-group">
          <label>Out Time</label>
          <input
            type="text"
            name="outTime"
            value={formData.outTime}
            onChange={handleChange}
            placeholder="e.g. 05:30 PM"
          />
        </div>

        {/* BUTTONS */}
        <div className="modal-actions">
          <button onClick={handleSubmit} className="save-btn">
            {selectedAttendance ? "Update" : "Save"}
          </button>
          <button onClick={onClose} className="cancel-btn">Cancel</button>
        </div>

      </div>
    </div>
  );
}

export default AttendanceForm;