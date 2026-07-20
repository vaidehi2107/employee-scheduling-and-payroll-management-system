import express from "express";
import mongoose from "mongoose";
import Tax from "../models/tax.js";
import Payroll from "../models/payroll.js";
import Salary from "../models/salaryStructure.js";
import Employee from "../models/employee.js";
import { getAttendanceSummary } from "../services/getAttendanceSummary.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

async function computePayrollForEmployee(employeeId, companyId, month, year) {
    // Financial year for this payroll period (Apr–Mar cycle)
    const financialYear = month >= 4
        ? `${year}-${String(year + 1).slice(-2)}`
        : `${year - 1}-${String(year).slice(-2)}`;

    // 1. Fetch employee's salary structure — must match this financial year
    const salary = await Salary.findOne({ employeeId, companyId, financialYear });
    if (!salary) {
        return { ok: false, reason: "no_salary_structure" };
    }

    // Tax regime must be explicitly selected on the salary structure before
    // payroll can be generated (defaults to null until chosen)
    if (!salary.taxRegime) {
        return { ok: false, reason: "no_tax_regime_selected" };
    }
    const taxRegimeUsed = salary.taxRegime;

    // 2. Fetch employee (needed for joiningDate + display name)
    const employee = await Employee.findOne({ _id: employeeId, companyId });
    if (!employee) {
        return { ok: false, reason: "no_employee" };
    }

    const monthlyGross = salary.grossEarnings || 0;
    const basicPay = salary.basicPay || 0;
    const da = salary.da || 0;
    const hra = salary.hra || 0;
    const specialAllowance = salary.specialAllowance || 0;

    // 3. Attendance for the month — workingDays excludes Sat/Sun, future dates,
    //    and days before the employee's joining date; presentDays/absentDays follow from that.
    //    Built directly in UTC (not the local `new Date(year, month-1, 1)` constructor)
    //    so periodStart/periodEnd land on exact UTC midnight, matching the UTC-midnight
    //    convention every Attendance.date value uses (see dateOnly.js). 
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // last day of month, UTC

    // If the employee hadn't joined yet at any point during this period
    if (employee.joiningDate && new Date(employee.joiningDate) > periodEnd) {
        return { ok: false, reason: "not_yet_joined" };
    }

    const {
        workingDays,
        presentDays,
        paidLeaveDays,
        nonPaidLeaveDays
    } = await getAttendanceSummary(
        employeeId,
        companyId,
        employee.joiningDate,
        periodStart,
        periodEnd
    );

    const absentDays = nonPaidLeaveDays;

    // 4. Daily salary based on total calendar days in the month (not working days)
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const dailySalary = parseFloat((monthlyGross / totalDaysInMonth).toFixed(2));
    const attendanceDeduction = parseFloat((dailySalary * absentDays).toFixed(2));

    const grossEarnings = parseFloat(monthlyGross.toFixed(2));

    // 5. PF / ESIC - already computed and stored on SalaryStructure
    const pfDeduction = parseFloat((salary.pfAmount || 0).toFixed(2));
    const esicDeduction = parseFloat((salary.esicAmount || 0).toFixed(2));

    // 6. Professional Tax - flat value from salary structure (state-slab driven, set at employee level)
    const professionalTax = salary.professionalTax || 0;

    // 7. Income Tax annual.
    const annualizedEarnings = monthlyGross * 12;

    // Company-wide tax slab table for this FY + the employee's chosen regime
    const taxDoc = await Tax.findOne({ companyId, financialYear, regime: taxRegimeUsed });

    let incomeTax = 0;
    // NOTE: employerContribution isn't a field on the Tax schema yet.
    // Add it (top-level or per-slab) if you need it reported here.
    let employerContribution = 0;

    if (taxDoc) {
        const slab = taxDoc.slabs.find(s =>
            annualizedEarnings >= s.startRange &&
            (s.endRange == null || annualizedEarnings <= s.endRange)
        );
        if (slab) {
            incomeTax = parseFloat(((annualizedEarnings * slab.employeePercentage) / 100 / 12).toFixed(2));
        }
    }

    // 8. Total Deductions
    const totalDeductions = parseFloat(
        (pfDeduction + esicDeduction + professionalTax + incomeTax + attendanceDeduction).toFixed(2)
    );
    const netPay = parseFloat((grossEarnings - totalDeductions).toFixed(2));

    return {
        ok: true,
        employerContribution,
        data: {
            employeeId,
            companyId,
            month,
            year,
            financialYear,
            taxRegimeUsed,
            periodStart,
            periodEnd,
            workingDays,
            presentDays,
            paidLeaveDays,
            nonPaidLeaveDays,
            absentDays,
            basicPay,
            da,
            hra,
            specialAllowance,
            grossEarnings,
            dailySalary,
            attendanceDeduction,
            pfDeduction,
            esicDeduction,
            professionalTax,
            incomeTax,
            totalDeductions,
            netPay
        }
    };
}

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

        const result = await computePayrollForEmployee(employeeId, req.companyId, month, year);

        if (!result.ok) {
            const messages = {
                no_salary_structure: "Salary structure not found for employee for this financial year",
                no_tax_regime_selected: "Tax regime (old/new) has not been selected for this employee",
                no_employee: "Employee not found",
                not_yet_joined: "Employee had not yet joined during this pay period"
            };
            return res.status(404).json({ message: messages[result.reason] || "Unable to compute payroll" });
        }

        const payroll = new Payroll(result.data);
        await payroll.save();
        res.json({ ...payroll.toObject(), employerContribution: result.employerContribution });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PREVIEW: 
router.post("/payroll/preview", verifyToken, async (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required" });
        }

        const employees = await Employee.find({
            companyId: req.companyId,
            status: { $regex: /^active$/i }
        });

        const preview = [];

        for (const employee of employees) {
            const existing = await Payroll.findOne({
                employeeId: employee._id,
                companyId: req.companyId,
                month,
                year
            });
            if (existing) continue;

            const result = await computePayrollForEmployee(employee._id, req.companyId, month, year);
            if (!result.ok) continue;

            const d = result.data;
            preview.push({
                employeeId: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                grossEarnings: d.grossEarnings,
                attendanceDeduction: d.attendanceDeduction,
                pfDeduction: d.pfDeduction,
                esicDeduction: d.esicDeduction,
                professionalTax: d.professionalTax,
                incomeTax: d.incomeTax,
                totalDeductions: d.totalDeductions,
                netPay: d.netPay
            });
        }

        res.json({ month, year, employees: preview });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// BULK GENERATE: re-computes (never trusts cached preview numbers) and saves
// the FULL payroll record (all fields) for every eligible employee.
router.post("/payroll/generate-bulk", verifyToken, async (req, res) => {
    try {
        const { month, year, employeeIds } = req.body;

        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required" });
        }

        const employeeFilter = {
            companyId: req.companyId,
            status: { $regex: /^active$/i }
        };
        if (Array.isArray(employeeIds) && employeeIds.length > 0) {
            employeeFilter._id = { $in: employeeIds };
        }

        const employees = await Employee.find(employeeFilter);

        const created = [];
        const skipped = [];
        const failed = [];

        for (const employee of employees) {
            try {
                const existing = await Payroll.findOne({
                    employeeId: employee._id,
                    companyId: req.companyId,
                    month,
                    year
                });
                if (existing) {
                    skipped.push({ employeeId: employee._id, reason: "already_generated" });
                    continue;
                }

                const result = await computePayrollForEmployee(employee._id, req.companyId, month, year);
                if (!result.ok) {
                    skipped.push({ employeeId: employee._id, reason: result.reason });
                    continue;
                }

                const payroll = new Payroll(result.data);
                await payroll.save();
                created.push(payroll);

            } catch (innerErr) {
                failed.push({ employeeId: employee._id, message: innerErr.message });
            }
        }

        res.json({
            createdCount: created.length,
            skippedCount: skipped.length,
            failedCount: failed.length,
            created,
            skipped,
            failed
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET Payroll all — supports optional year / employeeId filters (combinable)
// and pagination. Pass limit=all to bypass pagination and get every matching
// record in one go (used by the Excel export, which should export everything
// matching the current filters, not just the visible page).
router.get("/payroll/all", verifyToken, async (req, res) => {
    try {
        const { financialYear, employeeId, page = 1, limit = 10 } = req.query;

        const filter = { companyId: req.companyId };

        if (financialYear) {
            filter.financialYear = financialYear;
        }

        if (employeeId) {
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return res.status(400).json({ message: "Invalid employeeId" });
            }
            filter.employeeId = employeeId;
        }

        const totalRecords = await Payroll.countDocuments(filter);

        let query = Payroll.find(filter)
            .populate("employeeId", "firstName lastName")
            .sort({ createdAt: -1 });

        const wantsAll = limit === "all";
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = wantsAll ? totalRecords || 1 : Math.max(1, parseInt(limit, 10) || 10);

        if (!wantsAll) {
            query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
        }

        const payrolls = await query;

        res.json({
            payrolls,
            totalRecords,
            totalPages: wantsAll ? 1 : Math.max(1, Math.ceil(totalRecords / limitNum)),
            currentPage: wantsAll ? 1 : pageNum
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET filter options for Payroll History — distinct years and the distinct
// set of employees that actually have at least one payroll record, so the
// dropdowns never offer a combination guaranteed to return nothing.
router.get("/payroll/filters", verifyToken, async (req, res) => {
    try {
        const companyId = req.companyId;

        const financialYears = await Payroll.distinct("financialYear", { companyId });
        financialYears.sort().reverse(); // "2026-27" sorts correctly as a string, newest first

        const employeeIds = await Payroll.distinct("employeeId", { companyId });
        const employees = await Employee.find({ _id: { $in: employeeIds } })
            .select("firstName lastName")
            .sort({ firstName: 1, lastName: 1 });

        res.json({ financialYears, employees });
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