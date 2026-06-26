import { useState, useEffect } from "react";
import "./EmployeeForm.css";
import API from "../api.js";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function EmployeeForm() {

  const [employeeData, setEmployeeData] = useState({
      firstName:"", lastName:"", SSN: "",
      birthDate: "", joiningDate: "", status: "",
      physicalAddress: { addr1: "", addr2: "", country: "", state: "", city: "", zipCode: "" },
      mailAddress:     { addr1: "", addr2: "", country: "", state: "", city: "", zipCode: "" }
  });

  const navigate = useNavigate();
  const location = useLocation();
  const editingEmployee = location.state?.employee;

  useEffect(() => {
    if (editingEmployee) {
      setEmployeeData({
        ...editingEmployee,
        birthDate:   editingEmployee.birthDate?.split("T")[0],
        joiningDate: editingEmployee.joiningDate?.split("T")[0]
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split(".");
    setEmployeeData((prev) => {
      if (keys.length === 1) return { ...prev, [name]: value };
      const [parent, child] = keys;
      return { ...prev, [parent]: { ...prev[parent], [child]: value } };
    });
  };

  // ── Wages ──
  const emptyWage = { effectiveDate: "", hourlyRate: "", otMultiplier: "1.5" };
  const [wages, setWages] = useState(editingEmployee?.wages?.filter(w => w.effectiveDate) || []);
  const [editingWageIdx, setEditingWageIdx] = useState(null);
  const [wageForm, setWageForm] = useState(emptyWage);
  const [showWageForm, setShowWageForm] = useState(false);

  const handleWageChange = (e) => {
    const { name, value } = e.target;
    setWageForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddWage = () => {
    if (!wageForm.effectiveDate || !wageForm.hourlyRate) return;
    if (editingWageIdx !== null) {
      setWages((prev) => prev.map((w, i) => i === editingWageIdx ? { ...wageForm } : w));
      setEditingWageIdx(null);
    } else {
      setWages((prev) => [...prev, { ...wageForm }]);
    }
    setWageForm(emptyWage);
    setShowWageForm(false);
  };

  const handleEditWage = (idx) => {
    setWageForm({ ...wages[idx] });
    setEditingWageIdx(idx);
    setShowWageForm(true);
  };

  const handleDeleteWage = (idx) => {
    setWages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCancelWage = () => {
    setWageForm(emptyWage);
    setEditingWageIdx(null);
    setShowWageForm(false);
  };

  // ── Designations ──
  const emptyDesig = { departmentId: "", departmentName: "", jobTitle: "" };
  const [designations, setDesignations] = useState(editingEmployee?.designations || []);
  const [desigForm, setDesigForm]       = useState(emptyDesig);
  const [departments, setDepartments]   = useState([]);
  const [showDesigForm, setShowDesigForm] = useState(false);
  const [editingDesigIdx, setEditingDesigIdx] = useState(null);

  useEffect(() => {
    API.get("/departments").then(res => setDepartments(res.data)).catch(console.error);
  }, []);

  const availableJobTitles = departments.find(d => d._id === desigForm.departmentId)?.jobTitles || [];

  const handleDesigChange = (e) => {
    const { name, value } = e.target;
    if (name === "departmentId") {
      const dept = departments.find(d => d._id === value);
      setDesigForm({ departmentId: value, departmentName: dept?.deptName || "", jobTitle: "" });
    } else {
      setDesigForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddDesig = () => {
    if (!desigForm.departmentId || !desigForm.jobTitle) return;
    if (editingDesigIdx !== null) {
      setDesignations(prev => prev.map((d, i) => i === editingDesigIdx ? { ...desigForm } : d));
      setEditingDesigIdx(null);
    } else {
      setDesignations(prev => [...prev, { ...desigForm }]);
    }
    setDesigForm(emptyDesig);
    setShowDesigForm(false);
  };

  const handleEditDesig = (idx) => {
    setDesigForm({ ...designations[idx] });
    setEditingDesigIdx(idx);
    setShowDesigForm(true);
  };

  const handleDeleteDesig = (idx) => {
    setDesignations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCancelDesig = () => {
    setDesigForm(emptyDesig);
    setEditingDesigIdx(null);
    setShowDesigForm(false);
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...employeeData, wages, designations };
      if (editingEmployee) {
        await API.put(`/emp/update/${editingEmployee._id}`, payload);
        navigate("/employees", {
          state: { toast: { message: "Employee updated successfully!", type: "success" } }
        });
      } else {
        await API.post("/emp/create", payload);
        navigate("/employees", {
          state: { toast: { message: "Employee added successfully!", type: "success" } }
        });
      }
    } catch(err) {
      console.log("ERROR: ", err.message);
    }
  };

  return (
    <div className="container">
      <div className="main">

        {/* Page header */}
        <div className="form-page-header">
          <div className="form-header-row">
            <div>
              <h1 className="form-page-title">
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h1>
              <p className="form-page-sub">
                {editingEmployee ? "Update the employee details below." : "Onboard a new member to the Prismetric ecosystem."}
              </p>
            </div>
            <div className="header-actions">
              {editingEmployee && (
                <button
                  type="button"
                  className="salary-structure-btn"
                  onClick={() =>
                    navigate(`/salary/${editingEmployee._id}`, {
                      state: { employeeName: `${editingEmployee.firstName} ${editingEmployee.lastName}` }
                    })
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v12M9 9.5h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h4.5"/>
                  </svg>
                  Salary Structure
                </button>
              )}
              <Link to="/employees" className="view-emp-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                View Employees
              </Link>
            </div>
          </div>
        </div>

        <form className="employee-form" onSubmit={handleSubmit}>

          {/* ── Personal Information ── */}
          <div className="form-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              Personal Information
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" placeholder="First Name" name="firstName"
                  value={employeeData.firstName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>SSN</label>
                <input type="text" placeholder="XXX-XX-XXXX" name="SSN"
                  value={employeeData.SSN} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" placeholder="Last Name" name="lastName"
                  value={employeeData.lastName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Employment Status</label>
                <select name="status" value={employeeData.status} onChange={handleChange} className="wage-select">
                  <option value="" disabled>Select status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Birth Date</label>
                <DatePicker
                  selected={employeeData.birthDate ? new Date(employeeData.birthDate) : null}
                  onChange={(date) => setEmployeeData({ ...employeeData, birthDate: date })}
                  dateFormat="MM-dd-yyyy" placeholderText="MM-DD-YYYY"
                />
              </div>
              <div className="form-group">
                <label>Joining Date</label>
                <DatePicker
                  selected={employeeData.joiningDate ? new Date(employeeData.joiningDate) : null}
                  onChange={(date) => setEmployeeData({ ...employeeData, joiningDate: date })}
                  dateFormat="MM-dd-yyyy" placeholderText="MM-DD-YYYY"
                />
              </div>
            </div>
          </div>

          {/* ── Address sections side by side ── */}
          <div className="address-row">

            <div className="address-section">
              <div className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Physical Address
              </div>
              <div className="addr-fields">
                <input type="text" placeholder="Address 1" name="physicalAddress.addr1" value={employeeData.physicalAddress?.addr1 || ""} onChange={handleChange} />
                <input type="text" placeholder="Address 2" name="physicalAddress.addr2" value={employeeData.physicalAddress?.addr2 || ""} onChange={handleChange} />
                <div className="addr-fields-row">
                  <input type="text" placeholder="City" name="physicalAddress.city" value={employeeData.physicalAddress?.city || ""} onChange={handleChange} />
                  <input type="text" placeholder="State" name="physicalAddress.state" value={employeeData.physicalAddress?.state || ""} onChange={handleChange} />
                </div>
                <div className="addr-fields-row">
                  <input type="number" placeholder="Zip Code" name="physicalAddress.zipCode" value={employeeData.physicalAddress?.zipCode || ""} onChange={handleChange} />
                  <input type="text" placeholder="Country" name="physicalAddress.country" value={employeeData.physicalAddress?.country || ""} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="address-section">
              <div className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Mailing Address
              </div>
              <div className="addr-fields">
                <input type="text" placeholder="Address 1" name="mailAddress.addr1" value={employeeData.mailAddress?.addr1 || ""} onChange={handleChange} />
                <input type="text" placeholder="Address 2" name="mailAddress.addr2" value={employeeData.mailAddress?.addr2 || ""} onChange={handleChange} />
                <div className="addr-fields-row">
                  <input type="text" placeholder="City" name="mailAddress.city" value={employeeData.mailAddress?.city || ""} onChange={handleChange} />
                  <input type="text" placeholder="State" name="mailAddress.state" value={employeeData.mailAddress?.state || ""} onChange={handleChange} />
                </div>
                <div className="addr-fields-row">
                  <input type="number" placeholder="Zip Code" name="mailAddress.zipCode" value={employeeData.mailAddress?.zipCode || ""} onChange={handleChange} />
                  <input type="text" placeholder="Country" name="mailAddress.country" value={employeeData.mailAddress?.country || ""} onChange={handleChange} />
                </div>
              </div>
            </div>

          </div>

          {/* ── Wages (commented out — not needed for now) ──
          <div className="form-section wages-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Wages
              {!showWageForm && (
                <button type="button" className="btn-add-wage" onClick={() => setShowWageForm(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Wage
                </button>
              )}
            </div>

            {showWageForm && (
              <div className="wage-form-row">
                <div className="form-group">
                  <label>Effective Date</label>
                  <DatePicker
                    selected={wageForm.effectiveDate ? new Date(wageForm.effectiveDate) : null}
                    onChange={(date) => setWageForm((prev) => ({ ...prev, effectiveDate: date }))}
                    dateFormat="MM-dd-yyyy"
                    placeholderText="MM-DD-YYYY"
                  />
                </div>
                <div className="form-group">
                  <label>Hourly Rate ($)</label>
                  <input type="number" name="hourlyRate" placeholder="0.00" min="0" step="0.01"
                    value={wageForm.hourlyRate} onChange={handleWageChange} />
                </div>
                <div className="form-group">
                  <label>OT Multiplier</label>
                  <select name="otMultiplier" value={wageForm.otMultiplier} onChange={handleWageChange} className="wage-select">
                    <option value="1.5">1.5×</option>
                    <option value="2">2×</option>
                  </select>
                </div>
                <div className="wage-form-actions">
                  <button type="button" className="btn-wage-save" onClick={handleAddWage}>
                    {editingWageIdx !== null ? "Update" : "Save"}
                  </button>
                  <button type="button" className="btn-wage-cancel" onClick={handleCancelWage}>Cancel</button>
                </div>
              </div>
            )}

            {wages.length > 0 ? (
              <table className="wages-table">
                <thead>
                  <tr>
                    <th>Effective Date</th>
                    <th>Hourly Rate</th>
                    <th>OT Multiplier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wages.map((w, idx) => (
                    <tr key={idx} className={editingWageIdx === idx ? "wage-row-editing" : ""}>
                      <td>{w.effectiveDate ? new Date(w.effectiveDate).toLocaleDateString("en-US") : "—"}</td>
                      <td>${parseFloat(w.hourlyRate).toFixed(2)}</td>
                      <td><span className="ot-badge">{w.otMultiplier}×</span></td>
                      <td>
                        <div className="wage-actions-cell">
                          <button type="button" className="icon-btn edit-btn" onClick={() => handleEditWage(idx)} title="Edit">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button type="button" className="icon-btn delete-btn" onClick={() => handleDeleteWage(idx)} title="Delete">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
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
              !showWageForm && (
                <div className="wages-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <p>No wages added yet</p>
                </div>
              )
            )}
          </div>
          */}

          {/* ── Assign Designation ── */}
          <div className="form-section wages-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              Assign Designation
              {!showDesigForm && (
                <button type="button" className="btn-add-wage" onClick={() => setShowDesigForm(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Designation
                </button>
              )}
            </div>

            {showDesigForm && (
              <div className="wage-form-row" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="departmentId"
                    value={desigForm.departmentId}
                    onChange={handleDesigChange}
                    className="wage-select"
                  >
                    <option value="" disabled>Select department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.deptName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Job Title</label>
                  <select
                    name="jobTitle"
                    value={desigForm.jobTitle}
                    onChange={handleDesigChange}
                    className="wage-select"
                    disabled={!desigForm.departmentId}
                  >
                    <option value="" disabled>
                      {desigForm.departmentId ? "Select job title" : "Select dept first"}
                    </option>
                    {availableJobTitles.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>

                <div className="wage-form-actions">
                  <button type="button" className="btn-wage-save" onClick={handleAddDesig}>
                    {editingDesigIdx !== null ? "Update" : "Save"}
                  </button>
                  <button type="button" className="btn-wage-cancel" onClick={handleCancelDesig}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {designations.length > 0 ? (
              <table className="wages-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designations.map((d, idx) => (
                    <tr key={idx} className={editingDesigIdx === idx ? "wage-row-editing" : ""}>
                      <td>{d.departmentName}</td>
                      <td><span className="ot-badge">{d.jobTitle}</span></td>
                      <td>
                        <div className="wage-actions-cell">
                          <button type="button" className="icon-btn edit-btn" onClick={() => handleEditDesig(idx)} title="Edit">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button type="button" className="icon-btn delete-btn" onClick={() => handleDeleteDesig(idx)} title="Delete">
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
              !showDesigForm && (
                <div className="wages-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                  <p>No designations assigned yet</p>
                </div>
              )
            )}
          </div>

          {/* ── Footer ── */}
          <div className="form-footer">
            <button type="button" className="btn-cancel" onClick={() => navigate("/employees")}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {editingEmployee ? "Update Employee" : "Add Employee"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;