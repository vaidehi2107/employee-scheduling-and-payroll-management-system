import API from "../api.js";
import { useState, useEffect } from "react";
import "./Tax.css";

const emptySlabRow = () => ({
    _key: crypto.randomUUID(),
    startRange: "",
    endRange: "",
    employeePercentage: ""
});

const FY_PATTERN = /^\d{4}-\d{2}$/;

function Tax() {
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [viewSlabs, setViewSlabs] = useState({ old: [], new: [] });
    const [loading, setLoading] = useState(false);

    // Draft (add / copy) workflow state — nothing here touches the server
    // until "Confirm & Save" is clicked.
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [draftMode, setDraftMode] = useState(null); // "blank" | "copy" | null
    const [copySourceYear, setCopySourceYear] = useState("");
    const [draftYear, setDraftYear] = useState("");
    const [draftSlabs, setDraftSlabs] = useState({ old: [emptySlabRow()], new: [emptySlabRow()] });
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchYears();
    }, []);

    const fetchYears = async () => {
        try {
            const res = await API.get("/tax/years");
            setYears(res.data);
            if (res.data.length > 0) {
                setSelectedYear(res.data[0]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (selectedYear) {
            fetchYearData(selectedYear);
        }
    }, [selectedYear]);

    const fetchYearData = async (year) => {
        setLoading(true);
        try {
            const res = await API.get(`/tax/all?year=${encodeURIComponent(year)}`);
            const old = res.data.find(d => d.regime === "old");
            const newer = res.data.find(d => d.regime === "new");
            setViewSlabs({
                old: old ? old.slabs : [],
                new: newer ? newer.slabs : []
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Draft workflow ──

    const openAddPanel = () => {
        setShowAddPanel(true);
        setDraftMode(null);
        setDraftYear("");
        setCopySourceYear("");
        setFormError("");
    };

    const startBlankDraft = () => {
        setDraftMode("blank");
        setDraftSlabs({ old: [emptySlabRow()], new: [emptySlabRow()] });
    };

    const startCopyDraft = async (sourceYear) => {
        setCopySourceYear(sourceYear);
        try {
            const res = await API.get(`/tax/all?year=${encodeURIComponent(sourceYear)}`);
            const old = res.data.find(d => d.regime === "old");
            const newer = res.data.find(d => d.regime === "new");
            const cloneSlabs = (slabs) => (slabs && slabs.length > 0
                ? slabs.map(s => ({
                    _key: crypto.randomUUID(),
                    startRange: s.startRange,
                    endRange: s.endRange,
                    employeePercentage: s.employeePercentage
                }))
                : [emptySlabRow()]);
            setDraftSlabs({
                old: cloneSlabs(old?.slabs),
                new: cloneSlabs(newer?.slabs)
            });
            setDraftMode("copy");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDraftYearChange = (e) => {
        setDraftYear(e.target.value);
        setFormError("");
    };

    const handleSlabFieldChange = (regime, key, field, value) => {
        setDraftSlabs(prev => ({
            ...prev,
            [regime]: prev[regime].map(row => row._key === key ? { ...row, [field]: value } : row)
        }));
    };

    const addSlabRow = (regime) => {
        setDraftSlabs(prev => ({
            ...prev,
            [regime]: [...prev[regime], emptySlabRow()]
        }));
    };

    const removeSlabRow = (regime, key) => {
        setDraftSlabs(prev => ({
            ...prev,
            [regime]: prev[regime].filter(row => row._key !== key)
        }));
    };

    const cancelDraft = () => {
        setShowAddPanel(false);
        setDraftMode(null);
        setDraftYear("");
        setCopySourceYear("");
        setFormError("");
    };

    const validateDraft = () => {
        if (!FY_PATTERN.test(draftYear)) {
            return "Enter the financial year like 2027-28";
        }
        if (years.includes(draftYear)) {
            return `Tax slabs for ${draftYear} already exist`;
        }
        for (const regime of ["old", "new"]) {
            const rows = draftSlabs[regime];
            if (rows.length === 0) {
                return `Add at least one ${regime} regime slab`;
            }
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const isLastRow = i === rows.length - 1;
                if (row.startRange === "" || row.employeePercentage === "") {
                    return `Fill in all fields for the ${regime} regime slabs`;
                }
                // endRange is optional only on the last row (open-ended top slab, e.g. "24,00,000 and above")
                if (!isLastRow && row.endRange === "") {
                    return `Fill in end range for ${regime} regime slab ${i + 1}`;
                }
            }
        }
        return "";
    };

    const handleConfirmSave = async () => {
        const error = validateDraft();
        if (error) {
            setFormError(error);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                financialYear: draftYear,
                regimes: ["old", "new"].map(regime => ({
                    regime,
                    slabs: draftSlabs[regime].map(row => ({
                        startRange: Number(row.startRange),
                        endRange: row.endRange === "" ? null : Number(row.endRange),
                        employeePercentage: Number(row.employeePercentage)
                    }))
                }))
            };
            await API.post("/tax/add", payload);
            await fetchYears();
            setSelectedYear(draftYear);
            cancelDraft();
        } catch (err) {
            setFormError(err.response?.data?.message || "Something went wrong while saving");
        } finally {
            setSaving(false);
        }
    };

    const renderSlabTable = (regimeLabel, slabs) => (
        <div className="tax-regime-section">
            <div className="tax-regime-title">{regimeLabel}</div>
            {slabs.length > 0 ? (
                <table className="tax-table">
                    <thead>
                        <tr>
                            <th>Range</th>
                            <th>Employee %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slabs.map((slab, i) => (
                            <tr key={slab._id || i}>
                                <td>
                                    ₹{(slab.startRange ?? 0).toLocaleString("en-IN")}
                                    {" – "}
                                    {slab.endRange == null ? "and above" : `₹${slab.endRange.toLocaleString("en-IN")}`}
                                </td>
                                <td><span className="tax-badge">{slab.employeePercentage}%</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="tax-empty-small">No slabs defined</div>
            )}
        </div>
    );

    const renderDraftSlabTable = (regime, regimeLabel) => (
        <div className="tax-regime-section">
            <div className="tax-regime-title">{regimeLabel}</div>
            <table className="tax-table tax-draft-table">
                <thead>
                    <tr>
                        <th>Start Range</th>
                        <th>End Range</th>
                        <th>Employee %</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {draftSlabs[regime].map((row, i) => {
                        const isLastRow = i === draftSlabs[regime].length - 1;
                        return (
                        <tr key={row._key}>
                            <td>
                                <input
                                    value={row.startRange}
                                    onChange={e => handleSlabFieldChange(regime, row._key, "startRange", e.target.value)}
                                    placeholder="0"
                                />
                            </td>
                            <td>
                                <input
                                    value={row.endRange}
                                    onChange={e => handleSlabFieldChange(regime, row._key, "endRange", e.target.value)}
                                    placeholder={isLastRow ? "no limit" : "0"}
                                />
                            </td>
                            <td>
                                <input
                                    value={row.employeePercentage}
                                    onChange={e => handleSlabFieldChange(regime, row._key, "employeePercentage", e.target.value)}
                                    placeholder="0"
                                />
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="tax-icon-btn tax-remove-slab-btn"
                                    onClick={() => removeSlabRow(regime, row._key)}
                                    title="Remove slab"
                                >
                                    ×
                                </button>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
            <button type="button" className="btn-add-slab-row" onClick={() => addSlabRow(regime)}>
                + Add Slab
            </button>
        </div>
    );

    return (
        <div className="tax-container">

            {/* HEADER */}
            <div className="tax-header">
                <div>
                    <h2 className="tax-title">Employee Tax Management</h2>
                    <p>Manage year-wise old and new regime tax slabs</p>
                </div>
            </div>

            {/* TAX SECTION CARD */}
            <div className="tax-section">

                <div className="tax-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    Tax Module

                    {!showAddPanel && years.length > 0 && (
                        <select
                            className="tax-year-select"
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}

                    {!showAddPanel && (
                        <button type="button" className="btn-add-tax" onClick={openAddPanel}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Financial Year
                        </button>
                    )}
                </div>

                {/* Step 1: choose blank vs copy */}
                {showAddPanel && draftMode === null && (
                    <div className="tax-add-panel">
                        <div className="tax-form-group">
                            <label>New Financial Year</label>
                            <input value={draftYear} onChange={handleDraftYearChange} placeholder="e.g. 2027-28" />
                        </div>

                        <div className="tax-add-panel-choices">
                            <button type="button" className="btn-tax-save" onClick={startBlankDraft}>
                                Start Blank
                            </button>

                            {years.length > 0 && (
                                <div className="tax-copy-choice">
                                    <span>or copy from</span>
                                    <select
                                        className="tax-year-select"
                                        value={copySourceYear}
                                        onChange={e => e.target.value && startCopyDraft(e.target.value)}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select year</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {formError && <div className="tax-form-error">{formError}</div>}

                        <button type="button" className="btn-tax-cancel" onClick={cancelDraft}>
                            Cancel
                        </button>
                    </div>
                )}

                {/* Step 2: preview / edit the draft, then confirm */}
                {showAddPanel && draftMode !== null && (
                    <div className="tax-draft-panel">
                        <div className="tax-draft-banner">
                            Previewing <strong>{draftYear || "new year"}</strong>
                            {draftMode === "copy" && <> — copied from <strong>{copySourceYear}</strong>, edit as needed</>}
                            {" "}before saving. Nothing is saved yet.
                        </div>

                        {renderDraftSlabTable("old", "Old Regime")}
                        {renderDraftSlabTable("new", "New Regime")}

                        {formError && <div className="tax-form-error">{formError}</div>}

                        <div className="tax-form-actions tax-draft-actions">
                            <button type="button" className="btn-tax-save" onClick={handleConfirmSave} disabled={saving}>
                                {saving ? "Saving..." : "Confirm & Save"}
                            </button>
                            <button type="button" className="btn-tax-cancel" onClick={cancelDraft}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Read-only view of the selected year */}
                {!showAddPanel && (
                    loading ? (
                        <div className="tax-empty"><p>Loading...</p></div>
                    ) : years.length === 0 ? (
                        <div className="tax-empty">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            <p>No tax slabs added yet</p>
                        </div>
                    ) : (
                        <>
                            {renderSlabTable("Old Regime", viewSlabs.old)}
                            {renderSlabTable("New Regime", viewSlabs.new)}
                        </>
                    )
                )}

            </div>
        </div>
    );
}

export default Tax;