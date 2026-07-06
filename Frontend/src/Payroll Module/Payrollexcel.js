import * as XLSX from "xlsx";
import { format } from "date-fns";

// Flattens payroll records (same shape as returned by GET /payroll/all,
// populated with employeeId -> {firstName, lastName}) into one row per
// record and triggers a browser download of an .xlsx file.
export const exportPayrollsToExcel = (payrolls) => {
    if (!payrolls || payrolls.length === 0) return;

    const rows = payrolls.map(p => {
        const emp = p.employeeId;
        const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
        const periodLabel = (p.year && p.month)
            ? format(new Date(p.year, p.month - 1), "MMMM yyyy")
            : "";

        return {
            "Employee": name,
            "Period": periodLabel,
            "Working Days": p.workingDays ?? 0,
            "Present Days": p.presentDays ?? 0,
            "Paid Leave Days": p.paidLeaveDays ?? 0,
            "Non-Paid Leave Days": p.nonPaidLeaveDays ?? 0,
            "Basic Pay": p.basicPay ?? 0,
            "DA": p.da ?? 0,
            "HRA": p.hra ?? 0,
            "Special Allowance": p.specialAllowance ?? 0,
            "Gross Earnings": p.grossEarnings ?? 0,
            "Attendance Deduction": p.attendanceDeduction ?? 0,
            "PF Deduction": p.pfDeduction ?? 0,
            "ESIC Deduction": p.esicDeduction ?? 0,
            "Professional Tax": p.professionalTax ?? 0,
            "Income Tax": p.incomeTax ?? 0,
            "Total Deductions": p.totalDeductions ?? 0,
            "Net Pay": p.netPay ?? 0
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Reasonable fixed column widths so numbers/names aren't crushed on open
    worksheet["!cols"] = [
        { wch: 22 }, // Employee
        { wch: 14 }, // Period
        { wch: 12 }, // Working Days
        { wch: 12 }, // Present Days
        { wch: 14 }, // Paid Leave Days
        { wch: 16 }, // Non-Paid Leave Days
        { wch: 12 }, // Basic Pay
        { wch: 10 }, // DA
        { wch: 10 }, // HRA
        { wch: 16 }, // Special Allowance
        { wch: 14 }, // Gross Earnings
        { wch: 18 }, // Attendance Deduction
        { wch: 12 }, // PF Deduction
        { wch: 12 }, // ESIC Deduction
        { wch: 16 }, // Professional Tax
        { wch: 12 }, // Income Tax
        { wch: 16 }, // Total Deductions
        { wch: 12 }  // Net Pay
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll History");

    const filename = `Payroll_History_${format(new Date(), "MM_dd_yyyy")}.xlsx`;
    XLSX.writeFile(workbook, filename);
};