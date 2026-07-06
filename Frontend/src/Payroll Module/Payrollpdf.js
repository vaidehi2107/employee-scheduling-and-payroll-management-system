import jsPDF from "jspdf";
import { format } from "date-fns";

export const downloadPayrollPDF = (payroll) => {
    const doc = new jsPDF();
    const emp = payroll.employeeId;
    const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
    const periodLabel = format(new Date(payroll.year, payroll.month - 1), "MMMM yyyy");

    const purple = [92, 63, 163];
    const dark   = [26, 26, 46];
    const gray   = [136, 136, 136];
    const white  = [255, 255, 255];
    const red    = [220, 53, 69];

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
    doc.text(`Pay Period: ${periodLabel}`, 20, 60);

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
        return y + 6.5;
    };

    let y = 76;

    // Attendance
    y = section("Attendance", y);
    y = row("Working Days", `${payroll.workingDays}`, y);
    y = row("Present Days", `${payroll.presentDays}`, y);
    y = row("Paid Leave", `${payroll.paidLeaveDays}`, y);
    y = row("Non-Paid Leave", `${payroll.nonPaidLeaveDays}`, y);
    y += 4;

    doc.line(20, y, 190, y);
    y += 8;

    // Earnings
    y = section("Earnings", y);
    y = row("Basic Pay", `Rs. ${payroll.basicPay?.toFixed(2)}`, y);
    y = row("DA", `Rs. ${payroll.da?.toFixed(2)}`, y);
    y = row("HRA", `Rs. ${payroll.hra?.toFixed(2)}`, y);
    y = row("Special Allowance", `Rs. ${payroll.specialAllowance?.toFixed(2)}`, y);
    y = row("Daily Salary", `Rs. ${payroll.dailySalary?.toFixed(2)}`, y);
    y = row("Gross Earnings", `Rs. ${payroll.grossEarnings?.toFixed(2)}`, y, [45, 122, 79]);

    y += 4;

    doc.line(20, y, 190, y);
    y += 8;

    // Deductions
    y = section("Deductions", y);
    y = row("Attendance Deduction", `-Rs. ${payroll.attendanceDeduction?.toFixed(2)}`, y, red);
    y = row("PF", `-Rs. ${payroll.pfDeduction?.toFixed(2)}`, y, red);
    y = row("ESIC", `-Rs. ${payroll.esicDeduction?.toFixed(2)}`, y, red);
    y = row("Professional Tax", `-Rs. ${payroll.professionalTax?.toFixed(2)}`, y, red);
    y = row("Income Tax", `-Rs. ${payroll.incomeTax?.toFixed(2)}`, y, red);
    y = row("Total Deductions", `-Rs. ${payroll.totalDeductions?.toFixed(2)}`, y, red);
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
    doc.text(`Rs. ${payroll.netPay?.toFixed(2)}`, 185, y + 14, { align: "right" });


    // ── Footer ──
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 200);
    doc.text("This is a system-generated payroll document.", 105, 285, { align: "center" });

    // Save
    const filename = `Payroll_${name.replace(" ", "_")}_${format(new Date(payroll.year, payroll.month - 1), "MM_yyyy")}.pdf`;
    doc.save(filename);
};