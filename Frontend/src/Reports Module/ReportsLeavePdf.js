import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Same palette as ReportsPayrollPdf.js, kept identical for visual
// consistency across every report the app generates.
const purple = [92, 63, 163];
const dark   = [26, 26, 46];
const gray   = [136, 136, 136];
const white  = [255, 255, 255];
const green  = [45, 122, 79];
const red    = [220, 53, 69];

// Takes the report payload as returned by GET /api/reports/leave
// ( { month, year, summary, employeeWise } ) and triggers a PDF download:
// a company-wide summary band, an employee-wise days table, and a
// detailed per-leave-record table underneath.
export const downloadLeaveReportPDF = ({ month, year, summary, employeeWise }) => {
    const doc = new jsPDF();
    const periodLabel = format(new Date(year, month - 1), "MMMM yyyy");

    // ── Header band ──
    doc.setFillColor(...purple);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(...white);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("LEAVE REPORT", 20, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
        `Period: ${periodLabel}   |   Generated: ${format(new Date(), "MM/dd/yyyy")}`,
        20,
        28
    );

    // ── Summary cards (3 across) ──
    const cardLabel = (label, x, y) => {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        doc.text(label.toUpperCase(), x, y);
    };

    const cardValue = (value, x, y, color = dark) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...color);
        doc.text(value, x, y + 7);
    };

    const col1 = 20, col2 = 82, col3 = 144;
    const cardRowY = 52;

    cardLabel("Employees on Leave", col1, cardRowY);
    cardValue(`${summary.totalEmployeesOnLeave ?? 0}`, col1, cardRowY);

    cardLabel("Total Paid Days", col2, cardRowY);
    cardValue(`${summary.totalPaidDays ?? 0}`, col2, cardRowY, green);

    cardLabel("Total Non-Paid Days", col3, cardRowY);
    cardValue(`${summary.totalNonPaidDays ?? 0}`, col3, cardRowY, red);

    // ── Divider + total leave days line ──
    doc.setDrawColor(220, 220, 235);
    doc.setLineWidth(0.5);
    doc.line(20, 68, 190, 68);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...purple);
    doc.text(`Total Leave Days: ${summary.totalLeaveDays ?? 0}`, 20, 78);

    // ── Employee-wise summary table ──
    const summaryTableRows = employeeWise.map((e) => {
        const name = `${e.firstName || ""} ${e.lastName || ""}`.trim();
        return [name, `${e.paidDays ?? 0}`, `${e.nonPaidDays ?? 0}`, `${e.totalDays ?? 0}`];
    });

    autoTable(doc, {
        startY: 86,
        head: [["Employee", "Paid Days", "Non-Paid Days", "Total Days"]],
        body: summaryTableRows,
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 3, textColor: dark },
        headStyles: { fillColor: purple, textColor: white, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 252] },
        columnStyles: { 0: { fontStyle: "bold" } },
        margin: { left: 20, right: 20 }
    });

    // ── Detailed leave-records table (one row per individual leave entry) ──
    const recordRows = [];
    employeeWise.forEach((e) => {
        const name = `${e.firstName || ""} ${e.lastName || ""}`.trim();
        (e.leaveRecords || []).forEach((r) => {
            recordRows.push([
                name,
                r.leaveType,
                r.fromDate ? format(new Date(r.fromDate), "dd MMM yyyy") : "—",
                r.toDate ? format(new Date(r.toDate), "dd MMM yyyy") : "—",
                r.isHalfDay ? "Yes" : "No",
                `${r.effectiveDays ?? 0}`
            ]);
        });
    });

    if (recordRows.length > 0) {
        const afterFirstTableY = doc.lastAutoTable.finalY + 14;

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...dark);
        doc.text("Leave Records", 20, afterFirstTableY);

        autoTable(doc, {
            startY: afterFirstTableY + 6,
            head: [["Employee", "Type", "From", "To", "Half Day", "Days"]],
            body: recordRows,
            theme: "striped",
            styles: { fontSize: 8, cellPadding: 3, textColor: dark },
            headStyles: { fillColor: purple, textColor: white, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [245, 245, 252] },
            columnStyles: { 0: { fontStyle: "bold" } },
            margin: { left: 20, right: 20 }
        });
    }

    // ── Footer on every page ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 180, 200);
        doc.text("This is a system-generated leave report.", 105, 290, { align: "center" });
    }

    const filename = `Leave_Report_${format(new Date(year, month - 1), "MM_yyyy")}.pdf`;
    doc.save(filename);
};