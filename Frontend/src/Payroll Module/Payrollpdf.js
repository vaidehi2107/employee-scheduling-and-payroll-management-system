import jsPDF from "jspdf";
import { format } from "date-fns";

export const downloadPayrollPDF = (payroll) => {
    const doc = new jsPDF();
    const emp = payroll.employeeId;
    const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
    const periodStart = format(new Date(payroll.periodStart), "MM/dd/yyyy");
    const periodEnd   = format(new Date(payroll.periodEnd),   "MM/dd/yyyy");

    const purple = [92, 63, 163];
    const dark   = [26, 26, 46];
    const gray   = [136, 136, 136];
    const white  = [255, 255, 255];

    // ── Header band ──
    doc.setFillColor(...purple);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(...white);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PAYROLL SUMMARY", 20, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MM/dd/yyyy")}`, 20, 28);

    // ── Employee info ──
    doc.setTextColor(...dark);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(name, 20, 52);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(`Pay Period: ${periodStart} – ${periodEnd}`, 20, 60);

    // ── Divider ──
    doc.setDrawColor(220, 220, 235);
    doc.setLineWidth(0.5);
    doc.line(20, 66, 190, 66);

    // ── Section helper ──
    const section = (title, y) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...purple);
        doc.text(title.toUpperCase(), 20, y);
        return y + 7;
    };

    const row = (label, value, y, valueColor = dark) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        doc.text(label, 20, y);
        doc.setTextColor(...valueColor);
        doc.setFont("helvetica", "bold");
        doc.text(value, 190, y, { align: "right" });
        return y + 8;
    };

    let y = 76;

    // Hours
    y = section("Hours Worked", y);
    y = row("Regular Hours", `${payroll.regularHours} hrs`, y);
    y = row("Overtime Hours", `${payroll.overtimeHours} hrs`, y);
    y += 4;

    doc.line(20, y, 190, y);
    y += 8;

    // Earnings
    y = section("Earnings", y);
    y = row("Gross Pay", `$${payroll.grossEarnings?.toFixed(2)}`, y, [45, 122, 79]);
    y += 4;

    doc.line(20, y, 190, y);
    y += 8;

    // Tax
    y = section("Tax Details", y);
    if (payroll.taxCode) {
        y = row("Tax Bracket", payroll.taxCode, y);
        y = row(`Employee Tax (${payroll.employeePercentage}%)`, `-$${payroll.taxDeduction?.toFixed(2)}`, y, [220, 53, 69]);
        y = row(`Employer Contribution (${payroll.employerContribution}%)`, `$${payroll.employerTaxAmount?.toFixed(2)}`, y, [92, 63, 163]);
    } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...gray);
        doc.text("No active tax bracket matched this gross pay.", 20, y);
        y += 8;
    }
    y += 4;

    // ── Net Pay band ──
    doc.setFillColor(245, 245, 252);
    doc.roundedRect(15, y, 180, 22, 4, 4, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text("NET PAY", 25, y + 14);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...purple);
    doc.text(`$${payroll.netPay?.toFixed(2)}`, 185, y + 14, { align: "right" });

    // ── Footer ──
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 200);
    doc.text("This is a system-generated payroll document.", 105, 285, { align: "center" });

    // Save
    const filename = `Payroll_${name.replace(" ", "_")}_${format(new Date(payroll.periodEnd), "MMddyyyy")}.pdf`;
    doc.save(filename);
};