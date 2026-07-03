import express from "express";
import Leave from "../models/leaves.js";
import LeaveBalance from "../models/leaveBalance.js";
import LeaveLedger from "../models/leaveLedger.js";
import {
    assertRangeNotPayrollLocked,
    applyLeaveToAttendance,
    removeLeaveFromAttendance,
    workingDatesInRange
} from "../services/syncAttendanceforLeave.js";

const router = express.Router();

// ---------- helpers ----------

// Inclusive day count between two dates (fromDate and toDate both count)
function calculateTotalDays(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.round((to - from) / msPerDay) + 1;
    return days;
}

// Same calendar day check (used to gate half-day leave)
function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

// ---------- Indian leave year (April -> March) ----------

// A leave year is identified by the calendar year it STARTS in.
// e.g. 1 Apr 2026 - 31 Mar 2027 is leave year 2026.
// JS months are 0-indexed, so April = month index 3.
function getLeaveYear(date = new Date()) {
    const d = new Date(date);
    return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

// Returns the [start, end] Date bounds for a given leave year label.
function getLeaveYearRange(leaveYear) {
    const start = new Date(leaveYear, 3, 1, 0, 0, 0, 0);        // 1 Apr, leaveYear
    const end = new Date(leaveYear + 1, 2, 31, 23, 59, 59, 999); // 31 Mar, leaveYear + 1
    return { start, end };
}

// Credits +1 paid day for the current calendar month, if not already done.
// Safe to call repeatedly - checks the ledger first, so calling it 10 times
// in the same month only ever credits once.
async function creditCurrentMonthIfDue(employeeId, companyId, balance) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const alreadyCredited = await LeaveLedger.findOne({
        employeeId,
        source: "MONTHLY_CREDIT",
        date: { $gte: periodStart, $lte: periodEnd }
    });

    if (alreadyCredited) return balance;

    balance.totalCredited += 1;
    balance.currentBalance += 1;
    await balance.save();

    await LeaveLedger.create({
        employeeId,
        companyId,
        date: now,
        transactionType: "CREDIT",
        source: "MONTHLY_CREDIT",
        days: 1,
        balanceAfter: balance.currentBalance
    });

    return balance;
}

// Get (or create) the balance record for an employee for a given leave year.
// If leaveYear is the CURRENT fiscal year, this also lazily tops up this
// month's paid credit if it hasn't happened yet - no cron job required.
async function getOrCreateBalance(employeeId, companyId, leaveYear) {
    let balance = await LeaveBalance.findOne({ employeeId, companyId, year: leaveYear });
    if (!balance) {
        balance = await LeaveBalance.create({
            employeeId,
            companyId,
            year: leaveYear,
            totalCredited: 0,
            totalUsed: 0,
            currentBalance: 0
        });
    }

    if (leaveYear === getLeaveYear(new Date())) {
        balance = await creditCurrentMonthIfDue(employeeId, companyId, balance);
    }

    return balance;
}

// Rejects if this employee already has a leave record overlapping the
// given range, so the same day can never be double-booked with two leaves.
async function hasOverlappingLeave(employeeId, companyId, from, to) {
    return await Leave.findOne({
        employeeId,
        companyId,
        fromDate: { $lte: to },
        toDate: { $gte: from }
    });
}

// ---------- apply leave ----------

router.post("/", async (req, res) => {
    try {
        const { employeeId, companyId, leaveType, fromDate, toDate, isHalfDay, reason } = req.body;

        if (!employeeId || !companyId || !leaveType || !fromDate || !toDate) {
            return res.status(400).json({ message: "employeeId, companyId, leaveType, fromDate and toDate are required" });
        }

        if (!["Paid", "NonPaid"].includes(leaveType)) {
            return res.status(400).json({ message: "leaveType must be 'Paid' or 'NonPaid'" });
        }

        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (isNaN(from) || isNaN(to) || to < from) {
            return res.status(400).json({ message: "Invalid date range" });
        }

        if (isHalfDay && !isSameDay(from, to)) {
            return res.status(400).json({ message: "Half day leave requires the same from and to date" });
        }

        // A range that's entirely Sat/Sun has no working day to apply leave
        // to - covers both a single weekend day and a multi-day range that
        // happens to fall wholly on a weekend.
        if (workingDatesInRange(from, to).length === 0) {
            return res.status(400).json({ message: "Leave cannot be applied on weekend days" });
        }

        if (await hasOverlappingLeave(employeeId, companyId, from, to)) {
            return res.status(409).json({ message: "A leave already exists for one or more of these dates" });
        }

        try {
            await assertRangeNotPayrollLocked(employeeId, from, to);
        } catch (lockErr) {
            return res.status(lockErr.statusCode || 403).json({ message: lockErr.message });
        }

        const totalDays = isHalfDay ? 0.5 : calculateTotalDays(from, to);
        const leaveYear = getLeaveYear(from);

        // For paid leave, check balance BEFORE creating the leave record
        let balance = null;
        if (leaveType === "Paid") {
            balance = await getOrCreateBalance(employeeId, companyId, leaveYear);
            if (balance.currentBalance < totalDays) {
                return res.status(400).json({
                    message: `Insufficient paid leave balance. Available: ${balance.currentBalance}, Requested: ${totalDays}`
                });
            }
        }

        // Create the leave record
        const leave = await Leave.create({
            employeeId,
            companyId,
            leaveType,
            fromDate: from,
            toDate: to,
            totalDays,
            isHalfDay: !!isHalfDay,
            reason
        });

        // Only paid leave affects balance + ledger
        if (leaveType === "Paid") {
            balance.totalUsed += totalDays;
            balance.currentBalance -= totalDays;
            await balance.save();

            await LeaveLedger.create({
                employeeId,
                companyId,
                leaveId: leave._id,
                date: new Date(),
                transactionType: "DEBIT",
                source: "LEAVE",
                days: totalDays,
                balanceAfter: balance.currentBalance
            });
        }

        await applyLeaveToAttendance(leave);

        res.status(201).json({ leave, balance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------- get all leave records of an employee ----------

router.get("/:empId", async (req, res) => {
    try {
        const { empId } = req.params;
        const { year } = req.query;

        const filter = { employeeId: empId };
        if (year) {
            const { start, end } = getLeaveYearRange(Number(year));
            filter.fromDate = { $gte: start, $lte: end };
        }

        const leaves = await Leave.find(filter).sort({ fromDate: -1 });
        res.status(200).json(leaves);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------- get paid leave balance ----------

router.get("/:empId/balance", async (req, res) => {
    try {
        const { empId } = req.params;
        const { companyId, year } = req.query;

        if (!companyId) {
            return res.status(400).json({ message: "companyId query param is required" });
        }

        const targetYear = year ? Number(year) : getLeaveYear(new Date());
        const balance = await getOrCreateBalance(empId, companyId, targetYear);

        res.status(200).json(balance);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------- get leave ledger ----------

router.get("/:empId/ledger", async (req, res) => {
    try {
        const { empId } = req.params;
        const { year } = req.query;

        const filter = { employeeId: empId };
        if (year) {
            const { start, end } = getLeaveYearRange(Number(year));
            filter.date = { $gte: start, $lte: end };
        }

        const ledger = await LeaveLedger.find(filter).sort({ date: -1 });
        res.status(200).json(ledger);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------- delete leave ----------

router.delete("/:leaveId", async (req, res) => {
    try {
        const { leaveId } = req.params;

        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return res.status(404).json({ message: "Leave record not found" });
        }

        try {
            await assertRangeNotPayrollLocked(leave.employeeId, leave.fromDate, leave.toDate);
        } catch (lockErr) {
            return res.status(lockErr.statusCode || 403).json({ message: lockErr.message });
        }

        // If it was a paid leave, refund the days back to that year's balance
        if (leave.leaveType === "Paid") {
            const year = getLeaveYear(leave.fromDate);
            const balance = await getOrCreateBalance(leave.employeeId, leave.companyId, year);

            balance.totalUsed -= leave.totalDays;
            balance.currentBalance += leave.totalDays;
            await balance.save();

            await LeaveLedger.create({
                employeeId: leave.employeeId,
                companyId: leave.companyId,
                leaveId: leave._id,
                date: new Date(),
                transactionType: "CREDIT",
                source: "LEAVE",
                days: leave.totalDays,
                balanceAfter: balance.currentBalance
            });
        }

        await Leave.findByIdAndDelete(leaveId);
        await removeLeaveFromAttendance(leave.employeeId, leave.companyId, leave.fromDate, leave.toDate);

        res.status(200).json({ message: "Leave record deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;