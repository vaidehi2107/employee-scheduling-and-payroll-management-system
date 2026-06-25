import { format } from "date-fns";

function PayrollView({ payroll, onClose, onDownload }) {
    if (!payroll) return null;

    const emp = payroll.employeeId;

    return (
        <div className="pv-overlay" onClick={onClose}>
            <div className="pv-modal" onClick={e => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="pv-header">
                    <div className="pv-header-left">
                        <div className="pv-avatar">
                            {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                        </div>
                        <div>
                            <h3 className="pv-name">{emp?.firstName} {emp?.lastName}</h3>
                            <p className="pv-period">
                                {format(new Date(payroll.periodStart), "MMM dd, yyyy")} — {format(new Date(payroll.periodEnd), "MMM dd, yyyy")}
                            </p>
                        </div>
                    </div>
                    <button className="pv-close-btn" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Hours Section */}
                <div className="pv-section">
                    <p className="pv-section-label">Hours Worked</p>
                    <div className="pv-row">
                        <span className="pv-key">Regular Hours</span>
                        <span className="pv-val">{payroll.regularHours} hrs</span>
                    </div>
                    <div className="pv-row">
                        <span className="pv-key">Overtime Hours</span>
                        <span className="pv-val">{payroll.overtimeHours} hrs</span>
                    </div>
                </div>

                <div className="pv-divider"/>

                {/* Earnings Section */}
                <div className="pv-section">
                    <p className="pv-section-label">Earnings</p>
                    <div className="pv-row">
                        <span className="pv-key">Gross Pay</span>
                        <span className="pv-val pv-gross">${payroll.grossEarnings?.toFixed(2)}</span>
                    </div>
                </div>

                <div className="pv-divider"/>

                {/* Tax Section */}
                <div className="pv-section">
                    <p className="pv-section-label">Tax Details</p>
                    {payroll.taxCode ? (
                        <>
                            <div className="pv-row">
                                <span className="pv-key">Tax Bracket</span>
                                <span className="pv-val">
                                    <span className="pv-tax-badge">{payroll.taxCode}</span>
                                </span>
                            </div>
                            <div className="pv-row">
                                <span className="pv-key">Employee Tax</span>
                                <span className="pv-val pv-deduction">
                                    {payroll.employeePercentage}% → -${payroll.taxDeduction?.toFixed(2)}
                                </span>
                            </div>
                            <div className="pv-row">
                                <span className="pv-key">Employer Contribution</span>
                                <span className="pv-val pv-employer">
                                    {payroll.employerContribution}% → ${payroll.employerTaxAmount?.toFixed(2)}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="pv-no-tax">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            No active tax bracket matched this gross pay
                        </div>
                    )}
                </div>

                <div className="pv-divider"/>

                {/* Net Pay */}
                <div className="pv-net-row">
                    <span className="pv-net-label">Net Pay</span>
                    <span className="pv-net-amount">${payroll.netPay?.toFixed(2)}</span>
                </div>

                {/* Footer */}
                <div className="pv-footer">
                    <button className="pv-download-btn" onClick={onDownload}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download PDF
                    </button>
                </div>

            </div>
        </div>
    );
}

export default PayrollView;