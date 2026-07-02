import express from "express";
import Leave from "../models/leaves.js";
import LeaveBalance from "../models/leaveBalance.js";
import LeaveLedger from "../models/leaveLedger.js";
import {
    assertRangeNotPayrollLocked,
    applyLeaveToAttendance,
    removeLeaveFromAttendance
} from "../services/syncAttendanceForLeave.js";

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

// ---------- update leave ----------

router.put("/:leaveId", async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { fromDate, toDate, isHalfDay, reason } = req.body;

        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return res.status(404).json({ message: "Leave record not found" });
        }

        const oldTotalDays = leave.totalDays;
        const oldYear = getLeaveYear(leave.fromDate);
        const oldFrom = leave.fromDate;
        const oldTo = leave.toDate;

        const newFrom = fromDate ? new Date(fromDate) : leave.fromDate;
        const newTo = toDate ? new Date(toDate) : leave.toDate;
        const newIsHalfDay = isHalfDay !== undefined ? !!isHalfDay : leave.isHalfDay;

        if (isNaN(newFrom) || isNaN(newTo) || newTo < newFrom) {
            return res.status(400).json({ message: "Invalid date range" });
        }

        if (newIsHalfDay && !isSameDay(newFrom, newTo)) {
            return res.status(400).json({ message: "Half day leave requires the same from and to date" });
        }

        try {
            // Check both the range being vacated and the range being moved
            // into - either could touch a payroll-locked date.
            await assertRangeNotPayrollLocked(leave.employeeId, oldFrom, oldTo);
            await assertRangeNotPayrollLocked(leave.employeeId, newFrom, newTo);
        } catch (lockErr) {
            return res.status(lockErr.statusCode || 403).json({ message: lockErr.message });
        }

        const newTotalDays = newIsHalfDay ? 0.5 : calculateTotalDays(newFrom, newTo);
        const newYear = getLeaveYear(newFrom);
        const dayDifference = newTotalDays - oldTotalDays;

        // Only paid leave needs balance/ledger reconciliation
        if (leave.leaveType === "Paid" && dayDifference !== 0) {
            // Leave moved into a different year: reverse from old year, apply to new year
            const oldBalance = await getOrCreateBalance(leave.employeeId, leave.companyId, oldYear);

            if (oldYear === newYear) {
                if (oldBalance.currentBalance < dayDifference) {
                    return res.status(400).json({
                        message: `Insufficient paid leave balance for this change. Available: ${oldBalance.currentBalance}, Additional needed: ${dayDifference}`
                    });
                }
                oldBalance.totalUsed += dayDifference;
                oldBalance.currentBalance -= dayDifference;
                await oldBalance.save();

                await LeaveLedger.create({
                    employeeId: leave.employeeId,
                    companyId: leave.companyId,
                    leaveId: leave._id,
                    date: new Date(),
                    transactionType: dayDifference > 0 ? "DEBIT" : "CREDIT",
                    source: "LEAVE",
                    days: Math.abs(dayDifference),
                    balanceAfter: oldBalance.currentBalance
                });
            } else {
                // credit back all old days to old year, debit full new days from new year
                oldBalance.totalUsed -= oldTotalDays;
                oldBalance.currentBalance += oldTotalDays;
                await oldBalance.save();

                const newBalance = await getOrCreateBalance(leave.employeeId, leave.companyId, newYear);
                if (newBalance.currentBalance < newTotalDays) {
                    return res.status(400).json({
                        message: `Insufficient paid leave balance in ${newYear}. Available: ${newBalance.currentBalance}, Requested: ${newTotalDays}`
                    });
                }
                newBalance.totalUsed += newTotalDays;
                newBalance.currentBalance -= newTotalDays;
                await newBalance.save();

                await LeaveLedger.create({
                    employeeId: leave.employeeId,
                    companyId: leave.companyId,
                    leaveId: leave._id,
                    date: new Date(),
                    transactionType: "CREDIT",
                    source: "LEAVE",
                    days: oldTotalDays,
                    balanceAfter: oldBalance.currentBalance
                });
                await LeaveLedger.create({
                    employeeId: leave.employeeId,
                    companyId: leave.companyId,
                    leaveId: leave._id,
                    date: new Date(),
                    transactionType: "DEBIT",
                    source: "LEAVE",
                    days: newTotalDays,
                    balanceAfter: newBalance.currentBalance
                });
            }
        }

        leave.fromDate = newFrom;
        leave.toDate = newTo;
        leave.totalDays = newTotalDays;
        leave.isHalfDay = newIsHalfDay;
        if (reason !== undefined) leave.reason = reason;
        await leave.save();

        // Re-sync Attendance: clear whatever the old range wrote, then
        // write the current range/type. Doing both (rather than only the
        // diff) keeps this correct even when leaveType or dates change.
        await removeLeaveFromAttendance(leave.employeeId, leave.companyId, oldFrom, oldTo);
        await applyLeaveToAttendance(leave);

        res.status(200).json(leave);
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