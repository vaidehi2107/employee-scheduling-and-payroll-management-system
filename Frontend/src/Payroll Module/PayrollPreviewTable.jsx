import { format } from "date-fns";

function PayrollPreviewTable({ period, employees, loading }) {
    const count = employees.length;

    return (
        <div className="payroll-table-container payroll-preview-panel">
            <div className="payroll-table-header">
                <span className="payroll-table-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Preview — {format(period, "MMMM yyyy")}
                </span>
                <span className="payroll-count">
                    {loading ? "Loading..." : `${count} employee${count !== 1 ? "s" : ""}`}
                </span>
            </div>

            {loading ? (
                <div className="payroll-empty-row">
                    <p>Calculating payroll for all employees...</p>
                </div>
            ) : count === 0 ? (
                <div className="payroll-empty-row">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    <p>Nothing to generate — every active employee already has payroll for this month, or has no salary structure on file.</p>
                </div>
            ) : (
                <table className="payroll-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Gross</th>
                            <th>Attendance Ded.</th>
                            <th>PF</th>
                            <th>ESIC</th>
                            <th>Prof. Tax</th>
                            <th>Income Tax</th>
                            <th>Total Ded.</th>
                            <th>Net Pay</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.employeeId}>
                                <td className="payroll-emp-cell">
                                    <div className="payroll-emp-avatar">
                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                    </div>
                                    <span>{emp.firstName} {emp.lastName}</span>
                                </td>
                                <td className="payroll-gross">₹{emp.grossEarnings?.toFixed(2)}</td>
                                <td className="payroll-deduction">₹{emp.attendanceDeduction?.toFixed(2)}</td>
                                <td className="payroll-deduction">₹{emp.pfDeduction?.toFixed(2)}</td>
                                <td className="payroll-deduction">₹{emp.esicDeduction?.toFixed(2)}</td>
                                <td className="payroll-deduction">₹{emp.professionalTax?.toFixed(2)}</td>
                                <td className="payroll-deduction">₹{emp.incomeTax?.toFixed(2)}</td>
                                <td className="payroll-deduction">₹{emp.totalDeductions?.toFixed(2)}</td>
                                <td className="payroll-net">₹{emp.netPay?.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default PayrollPreviewTable;