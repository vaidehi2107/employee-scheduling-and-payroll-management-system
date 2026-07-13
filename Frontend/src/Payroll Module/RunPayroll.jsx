import { useState, useEffect } from "react";
import API from "../api.js";
import DatePicker from "react-datepicker";
import "./Payroll.css";
import PayrollPreviewTable from "./PayrollPreviewTable.jsx";

function RunPayroll() {

    const [period, setPeriod] = useState(null); // Date representing the selected pay month/year

    const [previewEmployees, setPreviewEmployees] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

    // As soon as a pay month is picked, automatically fetch the preview for
    // every eligible employee. Clearing the month clears the preview.
    useEffect(() => {
        if (!period) {
            setPreviewEmployees([]);
            return;
        }
        fetchPreview(period);
    }, [period]);

    const fetchPreview = async (selectedPeriod) => {
        setPreviewLoading(true);
        try {
            const month = selectedPeriod.getMonth() + 1;
            const year = selectedPeriod.getFullYear();

            const res = await API.post("/payroll/preview", { month, year });
            setPreviewEmployees(res.data.employees);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to load preview.", "error");
            setPreviewEmployees([]);
        } finally {
            setPreviewLoading(false);
        }
    };

    // handle generate (bulk, for every employee currently in the preview)
    const handleGenerate = async () => {
        if (!period)
            return showToast("Please select a pay month.", "error");

        if (previewEmployees.length === 0)
            return showToast("No employees to generate payroll for.", "error");

        setGenerating(true);
        try {
            const month = period.getMonth() + 1;
            const year = period.getFullYear();

            const res = await API.post("/payroll/generate-bulk", { month, year });

            const { createdCount, skippedCount, failedCount, failed } = res.data;
            const skippedNote = skippedCount ? `, ${skippedCount} skipped` : "";

            if (failedCount > 0) {
                console.error("Payroll generation failures:", failed);
                showToast(
                    `Generated ${createdCount}, ${skippedCount} skipped, ${failedCount} failed. Check console for details.`,
                    "error"
                );
            } else {
                showToast(`Generated ${createdCount} payroll${createdCount !== 1 ? "s" : ""} successfully${skippedNote}. See Payroll History for details.`);
            }

            setPeriod(null);
            setPreviewEmployees([]);

        } catch (err) {
            showToast(err.response?.data?.message || "Failed to generate payroll.", "error");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="payroll-container">

            {/* HEADER */}
            <div className="payroll-header">
                <div>
                    <h2 className="payroll-title">Run Payroll</h2>
                    <p>Select a pay month, review the preview, and generate payroll for all eligible employees</p>
                </div>
            </div>

            {/* GENERATE PANEL */}
            <div className="payroll-generate-panel">
                <div className="generate-panel-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    Generate Payroll
                </div>

                <div className="generate-panel-fields">
                    {/* Pay Month */}
                    <div className="payroll-filter-group">
                        <label>Pay Month</label>
                        <DatePicker
                            selected={period}
                            onChange={date => setPeriod(date)}
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
                        disabled={generating || previewLoading || !period || previewEmployees.length === 0}
                    >
                        {generating ? (
                            <>
                                <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* PREVIEW — appears automatically once a pay month is picked */}
            {period && (
                <PayrollPreviewTable
                    period={period}
                    employees={previewEmployees}
                    loading={previewLoading}
                />
            )}

            {/* TOAST */}
            {toast && (
                <div className={`payroll-toast payroll-toast-${toast.type}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {toast.type === "error"
                            ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                            : <><polyline points="20 6 9 17 4 12" /></>
                        }
                    </svg>
                    {toast.message}
                </div>
            )}

        </div>
    );
};
export default RunPayroll;