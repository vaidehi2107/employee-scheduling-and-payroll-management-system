import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Same palette as Payrollpdf.js, kept identical for visual consistency
// across every payroll document the app generates.
const purple = [92, 63, 163];
const dark   = [26, 26, 46];
const gray   = [136, 136, 136];
const white  = [255, 255, 255];
const green  = [45, 122, 79];
const red    = [220, 53, 69];

const fmt = (v) => `Rs. ${(v || 0).toFixed(2)}`;

// Takes the report payload as returned by GET /api/reports/payroll
// ( { month, year, summary, rows } ) and triggers a PDF download:
// a company-wide summary band followed by a per-employee detail table.
export const downloadPayrollReportPDF = ({ month, year, summary, rows }) => {
    const doc = new jsPDF();
    const periodLabel = format(new Date(year, month - 1), "MMMM yyyy");

    // ── Header band ──
    doc.setFillColor(...purple);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(...white);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PAYROLL REPORT", 20, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
        `Period: ${periodLabel}   |   Generated: ${format(new Date(), "MM/dd/yyyy")}`,
        20,
        28
    );

    // ── Summary cards (3 columns x 2 rows) ──
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
    const cardRow1Y = 52, cardRow2Y = 72;

    cardLabel("Employees Paid", col1, cardRow1Y);
    cardValue(`${summary.totalEmployees ?? 0}`, col1, cardRow1Y);

    cardLabel("Total Gross Salary", col2, cardRow1Y);
    cardValue(fmt(summary.totalGrossEarnings), col2, cardRow1Y, green);

    cardLabel("Income Tax (TDS)", col3, cardRow1Y);
    cardValue(fmt(summary.totalIncomeTax), col3, cardRow1Y);

    cardLabel("Employer Contribution", col1, cardRow2Y);
    cardValue(fmt(summary.totalEmployerContribution), col1, cardRow2Y);

    cardLabel("Total Deductions", col2, cardRow2Y);
    cardValue(fmt(summary.totalDeductions), col2, cardRow2Y, red);

    cardLabel("Total Net Pay", col3, cardRow2Y);
    cardValue(fmt(summary.totalNetPay), col3, cardRow2Y, purple);

    // ── Divider ──
    doc.setDrawColor(220, 220, 235);
    doc.setLineWidth(0.5);
    doc.line(20, 88, 190, 88);

    // ── Employee-wise detail table ──
    const tableRows = rows.map((r) => {
        const emp = r.employeeId;
        const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
        return [
            name,
            fmt(r.grossEarnings),
            fmt(r.pfDeduction),
            fmt(r.esicDeduction),
            fmt(r.professionalTax),
            fmt(r.incomeTax),
            fmt(r.employerContribution),
            fmt(r.totalDeductions),
            fmt(r.netPay)
        ];
    });

    autoTable(doc, {
        startY: 96,
        head: [[
            "Employee", "Gross", "PF", "ESIC", "Prof. Tax",
            "Income Tax", "Employer Contrib.", "Total Ded.", "Net Pay"
        ]],
        body: tableRows,
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 3, textColor: dark },
        headStyles: { fillColor: purple, textColor: white, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 252] },
        columnStyles: { 0: { fontStyle: "bold" } },
        margin: { left: 20, right: 20 }
    });

    // ── Footer on every page ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 180, 200);
        doc.text("This is a system-generated payroll report.", 105, 290, { align: "center" });
    }

    const filename = `Payroll_Report_${format(new Date(year, month - 1), "MM_yyyy")}.pdf`;
    doc.save(filename);
};