import * as XLSX from "xlsx";
import { format } from "date-fns";

// Takes the report payload as returned by GET /api/reports/leave
// ( { month, year, summary, employeeWise } ) and triggers a browser
// download of a three-sheet .xlsx workbook:
//   1. Summary            – company-wide totals
//   2. Employee Summary    – one row per employee (paid/non-paid/total days)
//   3. Leave Records       – one row per individual leave entry (flattened)
export const exportLeaveReportToExcel = ({ month, year, summary, employeeWise }) => {
    if (!employeeWise || employeeWise.length === 0) return;

    const periodLabel = format(new Date(year, month - 1), "MMMM yyyy");

    // ---- Summary sheet ----
    const summaryRows = [
        { Metric: "Period", Value: periodLabel },
        { Metric: "Employees on Leave", Value: summary.totalEmployeesOnLeave ?? 0 },
        { Metric: "Total Paid Days", Value: summary.totalPaidDays ?? 0 },
        { Metric: "Total Non-Paid Days", Value: summary.totalNonPaidDays ?? 0 },
        { Metric: "Total Leave Days", Value: summary.totalLeaveDays ?? 0 }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [{ wch: 26 }, { wch: 16 }];

    // ---- Employee Summary sheet: one row per employee ----
    const employeeRows = employeeWise.map((e) => ({
        "Employee": `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        "Paid Days": e.paidDays ?? 0,
        "Non-Paid Days": e.nonPaidDays ?? 0,
        "Total Days": e.totalDays ?? 0
    }));

    const employeeSheet = XLSX.utils.json_to_sheet(employeeRows);
    employeeSheet["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];

    // ---- Leave Records sheet: one row per individual leave entry ----
    const recordRows = [];
    employeeWise.forEach((e) => {
        const name = `${e.firstName || ""} ${e.lastName || ""}`.trim();
        (e.leaveRecords || []).forEach((r) => {
            recordRows.push({
                "Employee": name,
                "Leave Type": r.leaveType,
                "From": r.fromDate ? format(new Date(r.fromDate), "dd MMM yyyy") : "",
                "To": r.toDate ? format(new Date(r.toDate), "dd MMM yyyy") : "",
                "Half Day": r.isHalfDay ? "Yes" : "No",
                "Days": r.effectiveDays ?? 0
            });
        });
    });

    const recordsSheet = XLSX.utils.json_to_sheet(recordRows);
    recordsSheet["!cols"] = [
        { wch: 24 }, // Employee
        { wch: 12 }, // Leave Type
        { wch: 14 }, // From
        { wch: 14 }, // To
        { wch: 10 }, // Half Day
        { wch: 8 }   // Days
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, employeeSheet, "Employee Summary");
    XLSX.utils.book_append_sheet(workbook, recordsSheet, "Leave Records");

    const filename = `Leave_Report_${format(new Date(year, month - 1), "MM_yyyy")}.xlsx`;
    XLSX.writeFile(workbook, filename);
};