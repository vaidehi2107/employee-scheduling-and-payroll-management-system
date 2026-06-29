import express from "express";
import Tax from "../models/tax.js";
import Payroll from "../models/payroll.js";
import EmployeeTax from "../models/employeeTax.js";
import Salary from "../models/salaryStructure.js";
import Employee from "../models/employee.js";
import { getAttendanceSummary } from "../services/getAttendanceSummary.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

router.post("/payroll/generate", verifyToken, async (req, res) => {
    try {
        const { employeeId, month, year } = req.body;

        if (!employeeId || !month || !year) {
            return res.status(400).json({ message: "employeeId, month and year are required" });
        }

        // Guard duplicate generation of payroll for the same employee/month/year
        const existing = await Payroll.findOne({
            employeeId,
            companyId: req.companyId,
            month,
            year
        });
        if (existing) {
            return res.status(409).json({ message: "Payroll already generated for this period" });
        }

        // 1. Fetch employee's salary structure
        const salary = await Salary.findOne({ employeeId, companyId: req.companyId });
        if (!salary) {
            return res.status(404).json({ message: "Salary structure not found for employee" });
        }

        // monthlyGross is the employee's full monthly gross as already computed on SalaryStructure
        const monthlyGross = salary.grossEarnings || 0;

        // 2. Fetch employee (needed for joiningDate)
        const employee = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // 3. Attendance for the month — workingDays excludes Sat/Sun, future dates,
        //    and days before the employee's joining date; presentDays/absentDays follow from that.
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0, 23, 59, 59); // last day of month

        const { workingDays, presentDays, absentDays } = await getAttendanceSummary(
            employeeId,
            req.companyId,
            employee.joiningDate,
            periodStart,
            periodEnd
        );

        // 4. Daily salary based on total calendar days in the month (not working days)
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        const dailySalary = parseFloat((monthlyGross / totalDaysInMonth).toFixed(2));
        const attendanceDeduction = parseFloat((dailySalary * absentDays).toFixed(2));

        // Gross actually earned this month after attendance deduction
        const grossEarnings = parseFloat((monthlyGross - attendanceDeduction).toFixed(2));

        // 5. PF / ESIC - already computed and stored on SalaryStructure, used as-is.
        //    Attendance is deducted once already (via grossEarnings above); not re-applied here.
        const pfDeduction = parseFloat((salary.pfAmount || 0).toFixed(2));
        const esicDeduction = parseFloat((salary.esicAmount || 0).toFixed(2));

        // 6. Professional Tax - flat value from salary structure (state-slab driven, set at employee level)
        const professionalTax = salary.professionalTax || 0;

        // 7. Income Tax annual.

        const annualizedEarnings = monthlyGross * 12;

        // Employee-specific override first, fall back to company-wide slab
        let taxSlab = await EmployeeTax.findOne({
            employeeId,
            companyId: req.companyId,
            status: "active",
            startRange: { $lte: annualizedEarnings },
            endRange: { $gte: annualizedEarnings }
        });

        if (!taxSlab) {
            taxSlab = await Tax.findOne({
                companyId: req.companyId,
                status: "active",
                startRange: { $lte: annualizedEarnings },
                endRange: { $gte: annualizedEarnings }
            });
        }

        const annualIncomeTax = taxSlab
            ? (annualizedEarnings * taxSlab.employeePercentage) / 100
            : 0;
        const incomeTax = parseFloat((annualIncomeTax / 12).toFixed(2));

        // Employer-side contribution tied to the IT slab (not deducted from employee, stored for records)
        const employerContribution = taxSlab
            ? parseFloat(((annualizedEarnings * taxSlab.employerContribution) / 100 / 12).toFixed(2))
            : 0;

        // 8. Totals
        const totalDeductions = parseFloat(
            (pfDeduction + esicDeduction + professionalTax + incomeTax).toFixed(2)
        );
        const netPay = parseFloat((grossEarnings - totalDeductions).toFixed(2));

        // 9. Save
        const payroll = new Payroll({
            employeeId,
            companyId: req.companyId,
            month,
            year,
            workingDays,
            presentDays,
            absentDays,
            grossEarnings,
            dailySalary,
            attendanceDeduction,
            pfDeduction,
            esicDeduction,
            professionalTax,
            incomeTax,
            totalDeductions,
            netPay
        });

        await payroll.save();
        res.json({ ...payroll.toObject(), employerContribution, taxCode: taxSlab?.taxCode });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET Payroll all
router.get("/payroll/all", verifyToken, async (req, res) => {
    try {
        const payrolls = await Payroll.find({ companyId: req.companyId })
            .populate("employeeId", "firstName lastName")
            .sort({ createdAt: -1 });
        res.json(payrolls);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single payroll by ID (for View modal)
router.get("/payroll/:id", verifyToken, async (req, res) => {
    try {
        const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId })
            .populate("employeeId", "firstName lastName");
        if (!payroll) {
            return res.status(404).json({ message: "Payroll record not found" });
        }
        res.json(payroll);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete Payroll
router.delete("/payroll/delete/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Payroll.findOneAndDelete({ _id: id, companyId: req.companyId });
        if (!deleted) {
            return res.status(404).json({ message: "Payroll record not found" });
        }
        res.json({ message: "Record deleted Successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;