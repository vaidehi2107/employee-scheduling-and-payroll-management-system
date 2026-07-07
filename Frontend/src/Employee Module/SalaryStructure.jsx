import { useState, useEffect } from "react";
import "./SalaryStructure.css";
import API from "../api.js";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const emptySalary = {
  negotiatedSalary: "",
  basicPay: "", da: "", hra: "",
  pfPercent: "12", esicPercent: "0.75", professionalTax: "200",
};

const emptyDeductions = {
  section80C: "", section80D: "", section80CCD1B: "", section24b: "",
  section80E: "", lta: "", rentPaid: "", isMetroCity: false,
};

// April–March financial year, e.g. "2026-27" — builds a small window around "now"
// so the dropdown always covers the previous, current and upcoming FYs.
const getFinancialYears = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const currentFYStart = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let i = -2; i <= 1; i++) {
    const start = currentFYStart + i;
    years.push(`${start}-${String((start + 1) % 100).padStart(2, "0")}`);
  }
  return years;
};

const FINANCIAL_YEARS = getFinancialYears();
const DEFAULT_FY = FINANCIAL_YEARS[2]; // the "current" FY in the window above

function SalaryStructure() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const employeeName = location.state?.employeeName;

  const [records, setRecords] = useState([]); // all salary structures for this employee, one per FY
  const [financialYear, setFinancialYear] = useState(DEFAULT_FY);
  const [salaryId, setSalaryId] = useState(null);
  const [formData, setFormData] = useState(emptySalary);
  const [deductions, setDeductions] = useState(emptyDeductions);
  const [taxRegime, setTaxRegime] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [taxComparison, setTaxComparison] = useState(null);
  const [taxCompLoading, setTaxCompLoading] = useState(false);
  const [taxCompError, setTaxCompError] = useState("");
  const [regimeSaving, setRegimeSaving] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);

  // load every FY record this employee has, then default to the most recent one
  useEffect(() => {
    API.get(`/salaries/employee/${employeeId}`)
      .then((res) => {
        const all = res.data || [];
        setRecords(all);
        if (all[0]?.financialYear) setFinancialYear(all[0].financialYear);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [employeeId]);

  // whenever the selected FY (or the loaded records) changes, populate the form
  // from the matching record, or reset to a blank structure for a new FY
  useEffect(() => {
    const existing = records.find((r) => r.financialYear === financialYear);
    setTaxComparison(null);
    setTaxCompError("");
    setShowTaxModal(false);

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
      setDeductions({
        section80C: existing.deductions?.section80C ?? "",
        section80D: existing.deductions?.section80D ?? "",
        section80CCD1B: existing.deductions?.section80CCD1B ?? "",
        section24b: existing.deductions?.section24b ?? "",
        section80E: existing.deductions?.section80E ?? "",
        lta: existing.deductions?.lta ?? "",
        rentPaid: existing.deductions?.rentPaid ?? "",
        isMetroCity: existing.deductions?.isMetroCity ?? false,
      });
      setTaxRegime(existing.taxRegime ?? null);
    } else {
      setSalaryId(null);
      setFormData(emptySalary);
      setDeductions(emptyDeductions);
      setTaxRegime(null);
    }
  }, [financialYear, records]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeductionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeductions((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleYearChange = (e) => {
    setFinancialYear(e.target.value);
    setError("");
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

  const rupee = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

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
        financialYear,
        negotiatedSalary: num(formData.negotiatedSalary),
        basicPay: num(formData.basicPay),
        da: num(formData.da),
        hra: num(formData.hra),
        pfPercent: num(formData.pfPercent),
        esicPercent: num(formData.esicPercent),
        professionalTax: num(formData.professionalTax),
        deductions: {
          section80C: num(deductions.section80C),
          section80D: num(deductions.section80D),
          section80CCD1B: num(deductions.section80CCD1B),
          section24b: num(deductions.section24b),
          section80E: num(deductions.section80E),
          lta: num(deductions.lta),
          rentPaid: num(deductions.rentPaid),
          isMetroCity: !!deductions.isMetroCity,
        },
      };

      let response;
      if (salaryId) {
        response = await API.put(`/salaries/${salaryId}`, payload);
      } else {
        response = await API.post("/salaries", { ...payload, employeeId });
      }

      const saved = response.data;
      setSalaryId(saved._id);
      setTaxRegime(saved.taxRegime ?? null);
      setRecords((prev) => {
        const others = prev.filter((r) => r.financialYear !== saved.financialYear);
        return [...others, saved].sort((a, b) => (a.financialYear < b.financialYear ? 1 : -1));
      });

      navigate("/employees", {
        state: { toast: { message: "Salary structure saved successfully!", type: "success" } }
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTaxComparison = async () => {
    if (!salaryId) return;
    setShowTaxModal(true);
    setTaxCompLoading(true);
    setTaxCompError("");
    try {
      const res = await API.get(`/salaries/${salaryId}/tax-comparison`);
      setTaxComparison(res.data);
    } catch (err) {
      setTaxCompError(err.response?.data?.message || err.message);
    } finally {
      setTaxCompLoading(false);
    }
  };

  const handleChooseRegime = async (regime) => {
    if (!salaryId) return;
    setRegimeSaving(true);
    setError("");
    try {
      const res = await API.put(`/salaries/${salaryId}`, { taxRegime: regime });
      setTaxRegime(res.data.taxRegime);
      setRecords((prev) => prev.map((r) => (r._id === salaryId ? { ...r, taxRegime: res.data.taxRegime } : r)));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setRegimeSaving(false);
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
            <div className="header-actions">
              {taxRegime && (
                <span className={`regime-badge regime-badge-${taxRegime}`}>
                  On {taxRegime === "old" ? "Old" : "New"} Regime
                </span>
              )}
              <button
                type="button"
                className="tax-btn"
                onClick={handleTaxComparison}
                disabled={!salaryId || taxCompLoading}
                title={!salaryId ? "Save this salary structure first" : "Compare old vs new tax regime"}
              >
                {taxCompLoading ? "Calculating…" : "Tax Calculation"}
              </button>
              <button type="button" className="view-emp-btn" onClick={() => navigate(-1)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
            </div>
          </div>
        </div>

        {error && <div className="salary-error">{error}</div>}

        <form className="employee-form" onSubmit={handleSubmit}>

          {/* ── Financial Year ── */}
          <div className="form-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              Financial Year
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Select Financial Year</label>
                <select className="fy-select" value={financialYear} onChange={handleYearChange}>
                  {FINANCIAL_YEARS.map((fy) => {
                    const hasRecord = records.some((r) => r.financialYear === fy);
                    return (
                      <option key={fy} value={fy}>
                        {fy}{hasRecord ? " (saved)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

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

          {/* ── Deductions (payroll) ── */}
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

          {/* ── Declared deductions for income-tax comparison (old regime) ── */}
          <div className="form-section">
            <div className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
              Tax-Saving Declarations
            </div>
            <p className="field-hint">
              Used only for the old-vs-new regime comparison below — these don't affect gross or net pay.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>Section 80C (cap ₹1,50,000)</label>
                <input type="number" name="section80C" min="0" placeholder="0" value={deductions.section80C} onChange={handleDeductionChange} />
              </div>
              <div className="form-group">
                <label>Section 80D (cap ₹75,000)</label>
                <input type="number" name="section80D" min="0" placeholder="0" value={deductions.section80D} onChange={handleDeductionChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Section 80CCD(1B) — NPS (cap ₹50,000)</label>
                <input type="number" name="section80CCD1B" min="0" placeholder="0" value={deductions.section80CCD1B} onChange={handleDeductionChange} />
              </div>
              <div className="form-group">
                <label>Section 24(b) — Home Loan Interest (cap ₹2,00,000)</label>
                <input type="number" name="section24b" min="0" placeholder="0" value={deductions.section24b} onChange={handleDeductionChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Section 80E — Education Loan Interest</label>
                <input type="number" name="section80E" min="0" placeholder="0" value={deductions.section80E} onChange={handleDeductionChange} />
              </div>
              <div className="form-group">
                <label>LTA Claimed</label>
                <input type="number" name="lta" min="0" placeholder="0" value={deductions.lta} onChange={handleDeductionChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Monthly Rent Paid (for HRA exemption)</label>
                <input type="number" name="rentPaid" min="0" placeholder="0" value={deductions.rentPaid} onChange={handleDeductionChange} />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-row">
                  <input type="checkbox" name="isMetroCity" checked={!!deductions.isMetroCity} onChange={handleDeductionChange} />
                  Metro city (50% HRA rule instead of 40%)
                </label>
              </div>
            </div>
          </div>

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

      {/* ── Tax Regime Comparison popup ── */}
      {showTaxModal && (
        <div className="tax-modal-overlay" onClick={() => setShowTaxModal(false)}>
          <div className="tax-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tax-modal-header">
              <h2 className="tax-modal-title">Old vs New Regime — {financialYear}</h2>
              <button type="button" className="tax-modal-close" onClick={() => setShowTaxModal(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {taxCompLoading && <p className="salary-loading">Calculating…</p>}
            {taxCompError && <div className="salary-error">{taxCompError}</div>}

            {taxComparison && (
              <div className="comparison-grid">
                {["old", "new"].map((regime) => {
                  const data = taxComparison[regime];
                  const recommended = taxComparison.betterRegime === regime;
                  return (
                    <div key={regime} className={`regime-card${recommended ? " recommended" : ""}`}>
                      <div className="regime-card-header">
                        <span className="regime-title">{regime === "old" ? "Old Regime" : "New Regime"}</span>
                        {recommended && <span className="badge-recommended">Recommended</span>}
                      </div>

                      <div className="deduction-list">
                        {Object.entries(data.deductions).map(([key, value]) => (
                          <div className="deduction-line" key={key}>
                            <span>{key.replace(/([A-Z0-9]+)/g, " $1").replace(/^./, (c) => c.toUpperCase())}</span>
                            <span>{rupee(value)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="summary-row">
                        <span className="summary-label">Total Deductions</span>
                        <span className="summary-value">{rupee(data.totalDeductions)}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Taxable Income</span>
                        <span className="summary-value">{rupee(data.taxableIncome)}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Total Tax</span>
                        <span className="summary-value summary-deduction">{rupee(data.totalTax)}</span>
                      </div>
                      <div className="summary-row summary-net">
                        <span className="summary-label">Net Monthly</span>
                        <span className="summary-value">{rupee(data.netMonthly)}</span>
                      </div>

                      <button
                        type="button"
                        className={`regime-btn${taxRegime === regime ? " active" : ""}`}
                        onClick={() => handleChooseRegime(regime)}
                        disabled={regimeSaving}
                      >
                        {taxRegime === regime ? "Selected" : `Opt for ${regime === "old" ? "Old" : "New"} Regime`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaryStructure;