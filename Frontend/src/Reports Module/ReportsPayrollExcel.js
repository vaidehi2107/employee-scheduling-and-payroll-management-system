import * as XLSX from "xlsx";
import { format } from "date-fns";

// Takes the report payload as returned by GET /api/reports/payroll
// ( { month, year, summary, rows } ) and triggers a browser download
// of a two-sheet .xlsx workbook: company-wide Summary + per-employee detail.
export const exportPayrollReportToExcel = ({ month, year, summary, rows }) => {
    if (!rows || rows.length === 0) return;

    const periodLabel = format(new Date(year, month - 1), "MMMM yyyy");

    // ---- Summary sheet ----
    const summaryRows = [
        { Metric: "Period", Value: periodLabel },
        { Metric: "Employees Paid", Value: summary.totalEmployees ?? 0 },
        { Metric: "Total Basic Pay", Value: summary.totalBasicPay ?? 0 },
        { Metric: "Total DA", Value: summary.totalDA ?? 0 },
        { Metric: "Total HRA", Value: summary.totalHRA ?? 0 },
        { Metric: "Total Special Allowance", Value: summary.totalSpecialAllowance ?? 0 },
        { Metric: "Total Gross Earnings", Value: summary.totalGrossEarnings ?? 0 },
        { Metric: "Total Attendance Deduction", Value: summary.totalAttendanceDeduction ?? 0 },
        { Metric: "Total PF Deduction (Employee)", Value: summary.totalPfDeduction ?? 0 },
        { Metric: "Total ESIC Deduction (Employee)", Value: summary.totalEsicDeduction ?? 0 },
        { Metric: "Total Professional Tax", Value: summary.totalProfessionalTax ?? 0 },
        { Metric: "Total Income Tax (TDS)", Value: summary.totalIncomeTax ?? 0 },
        { Metric: "Employer PF Contribution", Value: summary.totalEmployerPfContribution ?? 0 },
        { Metric: "Employer ESIC Contribution", Value: summary.totalEmployerEsicContribution ?? 0 },
        { Metric: "Total Employer Contribution", Value: summary.totalEmployerContribution ?? 0 },
        { Metric: "Total Deductions", Value: summary.totalDeductions ?? 0 },
        { Metric: "Total Net Pay", Value: summary.totalNetPay ?? 0 }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [{ wch: 30 }, { wch: 18 }];

    // ---- Detail sheet: one row per employee's payroll record ----
    const detailRows = rows.map((p) => {
        const emp = p.employeeId;
        const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();

        return {
            "Employee": name,
            "Basic Pay": p.basicPay ?? 0,
            "DA": p.da ?? 0,
            "HRA": p.hra ?? 0,
            "Special Allowance": p.specialAllowance ?? 0,
            "Gross Earnings": p.grossEarnings ?? 0,
            "Attendance Deduction": p.attendanceDeduction ?? 0,
            "PF Deduction (Employee)": p.pfDeduction ?? 0,
            "ESIC Deduction (Employee)": p.esicDeduction ?? 0,
            "Professional Tax": p.professionalTax ?? 0,
            "Income Tax": p.incomeTax ?? 0,
            "Employer PF Contribution": p.employerPfContribution ?? 0,
            "Employer ESIC Contribution": p.employerEsicContribution ?? 0,
            "Employer Contribution": p.employerContribution ?? 0,
            "Total Deductions": p.totalDeductions ?? 0,
            "Net Pay": p.netPay ?? 0
        };
    });

    const detailSheet = XLSX.utils.json_to_sheet(detailRows);

    // Reasonable fixed column widths so numbers/names aren't crushed on open
    detailSheet["!cols"] = [
        { wch: 22 }, // Employee
        { wch: 12 }, // Basic Pay
        { wch: 10 }, // DA
        { wch: 10 }, // HRA
        { wch: 16 }, // Special Allowance
        { wch: 14 }, // Gross Earnings
        { wch: 18 }, // Attendance Deduction
        { wch: 18 }, // PF Deduction (Employee)
        { wch: 18 }, // ESIC Deduction (Employee)
        { wch: 16 }, // Professional Tax
        { wch: 12 }, // Income Tax
        { wch: 18 }, // Employer PF Contribution
        { wch: 18 }, // Employer ESIC Contribution
        { wch: 16 }, // Employer Contribution
        { wch: 16 }, // Total Deductions
        { wch: 12 }  // Net Pay
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Payroll Report");

    const filename = `Payroll_Report_${format(new Date(year, month - 1), "MM_yyyy")}.xlsx`;
    XLSX.writeFile(workbook, filename);
};