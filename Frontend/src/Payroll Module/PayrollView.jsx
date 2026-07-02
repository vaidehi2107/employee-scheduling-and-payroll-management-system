import { format } from "date-fns";

function PayrollView({ payroll, onClose, onDownload }) {
    if (!payroll) return null;

    const emp = payroll.employeeId;
    const periodLabel = format(new Date(payroll.year, payroll.month - 1), "MMMM yyyy");

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
                            <p className="pv-period">{periodLabel}</p>
                        </div>
                    </div>
                    <button className="pv-close-btn" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Scrollable body: everything between header and footer */}
                <div className="pv-body">

                    {/* Attendance Section — compact stat grid instead of a long row list */}
                    <div className="pv-section">
                        <p className="pv-section-label">Attendance</p>
                        <div className="pv-stat-grid">
                            <div className="pv-stat">
                                <div className="pv-stat-value">{payroll.workingDays}</div>
                                <div className="pv-stat-label">Working</div>
                            </div>
                            <div className="pv-stat">
                                <div className="pv-stat-value">{payroll.presentDays}</div>
                                <div className="pv-stat-label">Present</div>
                            </div>
                            <div className="pv-stat">
                                <div className="pv-stat-value">{payroll.paidLeaveDays}</div>
                                <div className="pv-stat-label">Paid Leave</div>
                            </div>
                            <div className="pv-stat">
                                <div className="pv-stat-value">{payroll.nonPaidLeaveDays}</div>
                                <div className="pv-stat-label">Non-Paid Leave</div>
                            </div>
                            <div className="pv-stat">
                                <div className="pv-stat-value">{payroll.halfDayPaidDays}</div>
                                <div className="pv-stat-label">Half-Day Paid</div>
                            </div>
                            <div className="pv-stat">
                                <div className="pv-stat-value">{payroll.halfDayUnpaidDays}</div>
                                <div className="pv-stat-label">Half-Day Unpaid</div>
                            </div>
                        </div>
                    </div>

                    <div className="pv-divider"/>

                    {/* Earnings Section */}
                    <div className="pv-section">
                        <p className="pv-section-label">Earnings</p>
                        <div className="pv-row">
                            <span className="pv-key">Basic Pay</span>
                            <span className="pv-val">₹{payroll.basicPay?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">DA</span>
                            <span className="pv-val">₹{payroll.da?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">HRA</span>
                            <span className="pv-val">₹{payroll.hra?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">Special Allowance</span>
                            <span className="pv-val">₹{payroll.specialAllowance?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">Daily Salary</span>
                            <span className="pv-val">₹{payroll.dailySalary?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">Gross Earnings</span>
                            <span className="pv-val pv-gross">₹{payroll.grossEarnings?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pv-divider"/>

                    {/* Deductions Section */}
                    <div className="pv-section">
                        <p className="pv-section-label">Deductions</p>
                        <div className="pv-row">
                            <span className="pv-key">Attendance Deduction</span>
                            <span className="pv-val pv-deduction">-₹{payroll.attendanceDeduction?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">PF</span>
                            <span className="pv-val pv-deduction">-₹{payroll.pfDeduction?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">ESIC</span>
                            <span className="pv-val pv-deduction">-₹{payroll.esicDeduction?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">Professional Tax</span>
                            <span className="pv-val pv-deduction">-₹{payroll.professionalTax?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">Income Tax</span>
                            <span className="pv-val pv-deduction">-₹{payroll.incomeTax?.toFixed(2)}</span>
                        </div>
                        <div className="pv-row">
                            <span className="pv-key">Total Deductions</span>
                            <span className="pv-val pv-deduction">-₹{payroll.totalDeductions?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pv-divider"/>

                    {/* Net Pay */}
                    <div className="pv-net-row">
                        <span className="pv-net-label">Net Pay</span>
                        <span className="pv-net-amount">₹{payroll.netPay?.toFixed(2)}</span>
                    </div>

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