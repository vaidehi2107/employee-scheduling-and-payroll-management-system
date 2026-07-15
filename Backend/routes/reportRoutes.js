import express from "express";
import mongoose from "mongoose";
import Payroll from "../models/payroll.js";
import Leave from "../models/leaves.js";
import Employee from "../models/employee.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Employer contribution rates (statutory %, India)                    */
/* Employer PF is mirrored 1:1 off employee PF (both commonly 12% of   */
/* the same PF wage). Employer ESIC is a DIFFERENT rate from employee  */
/* ESIC, so it's derived via the rate ratio, not mirrored.             */
/* Tune these here if your company's applicable slabs differ.          */
/* ------------------------------------------------------------------ */
const PF_EMPLOYEE_RATE = 12;     // %
const PF_EMPLOYER_RATE = 12;     // %
const ESIC_EMPLOYEE_RATE = 0.75; // %
const ESIC_EMPLOYER_RATE = 3.25; // %

const PF_EMPLOYER_MULTIPLIER = PF_EMPLOYER_RATE / PF_EMPLOYEE_RATE;
const ESIC_EMPLOYER_MULTIPLIER = ESIC_EMPLOYER_RATE / ESIC_EMPLOYEE_RATE;

/* ------------------------------------------------------------------ */
/* Shared: Employee filter dropdown (used by both Payroll & Leave UI)  */
/* ------------------------------------------------------------------ */
router.get("/employees", verifyToken, async (req, res) => {
    try {
        const employees = await Employee.find({
            companyId: req.companyId,
            status: { $regex: /^active$/i }
        })
            .select("firstName lastName")
            .sort({ firstName: 1, lastName: 1 });

        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ------------------------------------------------------------------ */
/* Payroll Report                                                      */
/* GET /api/reports/payroll?month=7&year=2026&employeeId=&page=&limit= */
/* ------------------------------------------------------------------ */
router.get("/payroll", verifyToken, async (req, res) => {
    try {
        const { month, year, employeeId, page = 1, limit = 10 } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required" });
        }

        const match = {
            companyId: new mongoose.Types.ObjectId(req.companyId),
            month: Number(month),
            year: Number(year)
        };

        if (employeeId) {
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return res.status(400).json({ message: "Invalid employeeId" });
            }
            match.employeeId = new mongoose.Types.ObjectId(employeeId);
        }

        // ---- Summary cards: computed over the FULL filtered set, not just the page ----
        const summaryAgg = await Payroll.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalEmployees: { $addToSet: "$employeeId" },
                    totalBasicPay: { $sum: "$basicPay" },
                    totalDA: { $sum: "$da" },
                    totalHRA: { $sum: "$hra" },
                    totalSpecialAllowance: { $sum: "$specialAllowance" },
                    totalGrossEarnings: { $sum: "$grossEarnings" },
                    totalAttendanceDeduction: { $sum: "$attendanceDeduction" },
                    totalPfDeduction: { $sum: "$pfDeduction" },       // employee's own PF cut
                    totalEsicDeduction: { $sum: "$esicDeduction" },   // employee's own ESIC cut
                    totalProfessionalTax: { $sum: "$professionalTax" },
                    totalIncomeTax: { $sum: "$incomeTax" },           // TDS - what company remits to govt
                    totalDeductions: { $sum: "$totalDeductions" },
                    totalNetPay: { $sum: "$netPay" }
                }
            },
            { $addFields: { totalEmployees: { $size: "$totalEmployees" } } },
            { $project: { _id: 0 } }
        ]);

        const summary = summaryAgg[0] || {
            totalEmployees: 0,
            totalBasicPay: 0,
            totalDA: 0,
            totalHRA: 0,
            totalSpecialAllowance: 0,
            totalGrossEarnings: 0,
            totalAttendanceDeduction: 0,
            totalPfDeduction: 0,
            totalEsicDeduction: 0,
            totalProfessionalTax: 0,
            totalIncomeTax: 0,
            totalDeductions: 0,
            totalNetPay: 0
        };

        // Employer contribution derived from the employee-side PF/ESIC deductions
        // already stored on Payroll - no schema change needed. See rate constants
        // at the top of this file.
        summary.totalEmployerPfContribution = parseFloat(
            (summary.totalPfDeduction * PF_EMPLOYER_MULTIPLIER).toFixed(2)
        );
        summary.totalEmployerEsicContribution = parseFloat(
            (summary.totalEsicDeduction * ESIC_EMPLOYER_MULTIPLIER).toFixed(2)
        );
        summary.totalEmployerContribution = parseFloat(
            (summary.totalEmployerPfContribution + summary.totalEmployerEsicContribution).toFixed(2)
        );

        // ---- Detailed, paginated rows for the table ----
        const totalRecords = await Payroll.countDocuments(match);
        const wantsAll = limit === "all";
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = wantsAll ? (totalRecords || 1) : Math.max(1, parseInt(limit, 10) || 10);

        let rowsQuery = Payroll.find(match)
            .populate("employeeId", "firstName lastName")
            .sort({ createdAt: -1 });

        if (!wantsAll) {
            rowsQuery = rowsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
        }

        const rawRows = await rowsQuery;

        // Attach per-employee employer contribution (derived, not stored)
        const rows = rawRows.map((r) => {
            const row = r.toObject();
            const employerPfContribution = parseFloat(
                ((row.pfDeduction || 0) * PF_EMPLOYER_MULTIPLIER).toFixed(2)
            );
            const employerEsicContribution = parseFloat(
                ((row.esicDeduction || 0) * ESIC_EMPLOYER_MULTIPLIER).toFixed(2)
            );
            return {
                ...row,
                employerPfContribution,
                employerEsicContribution,
                employerContribution: parseFloat(
                    (employerPfContribution + employerEsicContribution).toFixed(2)
                )
            };
        });

        res.json({
            month: Number(month),
            year: Number(year),
            summary,
            rows,
            totalRecords,
            totalPages: wantsAll ? 1 : Math.max(1, Math.ceil(totalRecords / limitNum)),
            currentPage: wantsAll ? 1 : pageNum
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ------------------------------------------------------------------ */
/* Leave Report                                                        */
/* GET /api/reports/leave?month=7&year=2026&employeeId=                */
/* Employee-wise breakdown of who was on leave this month, and how     */
/* many (paid/non-paid/total) days, clamped to the selected month.     */
/* ------------------------------------------------------------------ */
router.get("/leave", verifyToken, async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required" });
        }

        const monthStart = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
        const monthEnd = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

        const match = {
            companyId: new mongoose.Types.ObjectId(req.companyId),
            // any leave that OVERLAPS this month, not just ones fully inside it
            fromDate: { $lte: monthEnd },
            toDate: { $gte: monthStart }
        };

        if (employeeId) {
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return res.status(400).json({ message: "Invalid employeeId" });
            }
            match.employeeId = new mongoose.Types.ObjectId(employeeId);
        }

        const pipeline = [
            { $match: match },
            // Clamp each leave's range to the selected month, so a leave
            // spanning e.g. 28 Jun - 3 Jul only counts the days that
            // actually fall inside July when July is selected.
            {
                $addFields: {
                    clampedFrom: { $cond: [{ $gt: ["$fromDate", monthStart] }, "$fromDate", monthStart] },
                    clampedTo: { $cond: [{ $lt: ["$toDate", monthEnd] }, "$toDate", monthEnd] }
                }
            },
            {
                $addFields: {
                    effectiveDays: {
                        $cond: [
                            "$isHalfDay",
                            0.5,
                            {
                                $add: [
                                    {
                                        $divide: [
                                            { $subtract: ["$clampedTo", "$clampedFrom"] },
                                            1000 * 60 * 60 * 24
                                        ]
                                    },
                                    1
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employeeId",
                    foreignField: "_id",
                    as: "employee"
                }
            },
            { $unwind: "$employee" },
            {
                $group: {
                    _id: "$employeeId",
                    firstName: { $first: "$employee.firstName" },
                    lastName: { $first: "$employee.lastName" },
                    paidDays: { $sum: { $cond: [{ $eq: ["$leaveType", "Paid"] }, "$effectiveDays", 0] } },
                    nonPaidDays: { $sum: { $cond: [{ $eq: ["$leaveType", "NonPaid"] }, "$effectiveDays", 0] } },
                    totalDays: { $sum: "$effectiveDays" },
                    leaveRecords: {
                        $push: {
                            leaveId: "$_id",
                            leaveType: "$leaveType",
                            fromDate: "$fromDate",
                            toDate: "$toDate",
                            isHalfDay: "$isHalfDay",
                            effectiveDays: "$effectiveDays"
                        }
                    }
                }
            },
            { $sort: { totalDays: -1 } }
        ];

        const employeeWise = await Leave.aggregate(pipeline);

        const summary = employeeWise.reduce(
            (acc, e) => {
                acc.totalEmployeesOnLeave += 1;
                acc.totalPaidDays += e.paidDays;
                acc.totalNonPaidDays += e.nonPaidDays;
                acc.totalLeaveDays += e.totalDays;
                return acc;
            },
            { totalEmployeesOnLeave: 0, totalPaidDays: 0, totalNonPaidDays: 0, totalLeaveDays: 0 }
        );

        res.json({
            month: Number(month),
            year: Number(year),
            summary,
            employeeWise
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;