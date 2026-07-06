import { useState, useEffect } from "react";
import "./SalaryStructure.css";
import API from "../api.js";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const emptySalary = {
  negotiatedSalary: "",
  basicPay: "", da: "", hra: "",
  pfPercent: "12", esicPercent: "0.75", professionalTax: "200",
};

function SalaryStructure() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const employeeName = location.state?.employeeName;

  const [salaryId, setSalaryId] = useState(null);
  const [formData, setFormData] = useState(emptySalary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/salaries/employee/${employeeId}`)
      .then((res) => {
        const existing = res.data?.[0];
        if (existing) {
          setSalaryId(existing._id);
          setFormData({
            negotiatedSalary: existing.negotiatedSalary ?? "",
            basicPay: existing.basicPay ?? "",
            da: existing.da ?? "",
            hra: existing.hra ?? "",
            pfPercent: existing.pfPercent ?? "12",
            esicPercent: existing.esicPercent ?? "0.75",
            professionalTax: existing.professionalTax ?? "200",
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // live preview only — mirrors the server-side calculateSalary() helper exactly
  const num = (v) => Number(v) || 0;
  const negotiatedSalary = num(formData.negotiatedSalary);
  const fixedComponents = num(formData.basicPay) + num(formData.da) + num(formData.hra);
  const specialAllowance = negotiatedSalary - fixedComponents;
  // true once Basic + DA + HRA alone eat up more than the negotiated salary
  const remainderNegative = negotiatedSalary > 0 && specialAllowance < 0;
  // grossEarnings always equals negotiatedSalary by construction; falls back to
  // the raw entered sum only while the remainder is invalid, so the overage is visible
  const grossEarnings = remainderNegative ? fixedComponents : negotiatedSalary;

  const pfAmount = Math.round((num(formData.pfPercent) / 100) * num(formData.basicPay));
  // ESIC only applies if gross earnings are within the statutory wage limit
  const esicAmount = grossEarnings <= 21000
    ? Math.round((num(formData.esicPercent) / 100) * grossEarnings)
    : 0;
  const totalDeductions = pfAmount + esicAmount + num(formData.professionalTax);
  const netPay = grossEarnings - totalDeductions;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (remainderNegative) {
      setError("Basic Pay + DA + HRA exceed the negotiated salary. Please adjust the figures.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        negotiatedSalary: num(formData.negotiatedSalary),
        basicPay: num(formData.basicPay),
        da: num(formData.da),
        hra: num(formData.hra),
        pfPercent: num(formData.pfPercent),
        esicPercent: num(formData.esicPercent),
        professionalTax: num(formData.professionalTax),
      };

      if (salaryId) {
        await API.put(`/salaries/${salaryId}`, payload);
      } else {
        await API.post("/salaries", { ...payload, employeeId });
      }

      navigate("/employees", {
        state: { toast: { message: "Salary structure saved successfully!", type: "success" } }
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main">
          <p className="salary-loading">Loading salary structure…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main">

        <div className="form-page-header">
          <div className="form-header-row">
            <div>
              <h1 className="form-page-title">Salary Structure</h1>
              <p className="form-page-sub">
                {employeeName ? `Manage pay components for ${employeeName}.` : "Manage pay components for this employee."}
              </p>
            </div>
            <button type="button" className="view-emp-btn" onClick={() => navigate(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          </div>
        </div>

        {error && <div className="salary-error">{error}</div>}

        <form className="employee-form" onSubmit={handleSubmit}>

          {/* ── Negotiated Salary ── */}
          <div className="form-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Negotiated Salary
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Negotiated Salary (CTC)</label>
                <input
                  type="number" name="negotiatedSalary" min="0" placeholder="0"
                  value={formData.negotiatedSalary} onChange={handleChange} required
                />
              </div>
            </div>
          </div>

          {/* ── Earnings ── */}
          <div className="form-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Earnings
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Basic Pay</label>
                <input type="number" name="basicPay" min="0" placeholder="0" value={formData.basicPay} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>DA</label>
                <input type="number" name="da" min="0" placeholder="0" value={formData.da} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>HRA</label>
                <input type="number" name="hra" min="0" placeholder="0" value={formData.hra} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Special Allowance</label>
                <input
                  type="text"
                  className={`computed-amount${remainderNegative ? " computed-amount-negative" : ""}`}
                  value={`₹${specialAllowance.toLocaleString("en-IN")}`}
                  disabled readOnly
                />
              </div>
            </div>
            
          </div>

          {/* ── Deductions ── */}
          <div className="form-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="14" rx="2"/>
                <path d="M3 10h18"/>
              </svg>
              Deductions
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>PF Rate (%)</label>
                <input type="number" name="pfPercent" min="0" step="0.01" placeholder="12" value={formData.pfPercent} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>PF Amount</label>
                <input type="text" className="computed-amount" value={`₹${pfAmount.toLocaleString("en-IN")}`} disabled readOnly />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ESIC Rate (%)</label>
                <input type="number" name="esicPercent" min="0" step="0.01" placeholder="0.75" value={formData.esicPercent} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ESIC Amount</label>
                <input type="text" className="computed-amount" value={`₹${esicAmount.toLocaleString("en-IN")}`} disabled readOnly />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Professional Tax</label>
                <input type="number" name="professionalTax" min="0" placeholder="200" value={formData.professionalTax} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ── Summary ── */}
  

            {remainderNegative && (
              <p className="salary-warning">
                Basic Pay + DA + HRA exceed the negotiated salary by ₹{Math.abs(specialAllowance).toLocaleString("en-IN")}.
              </p>
            )}
  
          <div className="form-footer">
            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={saving || remainderNegative}>
              {saving ? "Saving…" : salaryId ? "Update Salary" : "Save Salary"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default SalaryStructure;