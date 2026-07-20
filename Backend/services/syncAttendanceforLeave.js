import Attendance from "../models/attendance.js";
import Payroll from "../models/payroll.js";
import { getHolidayMap } from "./holidayHelper.js";
import { parseDateOnly, dateKey, dayOfWeek } from "../services/dateOnly.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const LEAVE_STATUS = {
    Paid: "Paid Leave",
    NonPaid: "Non-Paid Leave"
};

// Every calendar day in [fromDate, toDate], inclusive, skipping weekends
// and holidays. Weekends already render as "Week Off" and holidays render
// as "Holiday" in the UI regardless of any Attendance record, so there's
// nothing useful to write for either - a leave day here shouldn't burn a
// leave entitlement or overwrite a holiday.
export async function workingDatesInRange(companyId, fromDate, toDate) {
    const from = parseDateOnly(fromDate);
    const to = parseDateOnly(toDate);

    const dates = [];
    for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += MS_PER_DAY) {
        const day = new Date(cursor);
        const dow = dayOfWeek(day);
        if (dow !== 0 && dow !== 6) dates.push(day);
    }

    if (dates.length === 0) return dates;

    const holidayByDate = await getHolidayMap(companyId, dates[0], dates[dates.length - 1]);
    return dates.filter(day => !holidayByDate.has(dateKey(day)));
}

// Throws a 403 if payroll has already been generated for any working day in
// the range, so a leave apply/edit/delete can never silently rewrite
// attendance a payroll run already relied on.
export async function assertRangeNotPayrollLocked(employeeId, companyId, fromDate, toDate) {
    const dates = await workingDatesInRange(companyId, fromDate, toDate);
    if (dates.length === 0) return;

    const locked = await Payroll.findOne({
        employeeId,
        periodStart: { $lte: dates[dates.length - 1] },
        periodEnd: { $gte: dates[0] }
    });

    if (locked) {
        const err = new Error(
            "Payroll has already been generated for part of this date range. Leave cannot be applied, edited, or removed for locked dates."
        );
        err.statusCode = 403;
        throw err;
    }
}

// Upserts an Attendance row with the appropriate status for every working
// day in the leave's range, clearing any clock in/out times since the
// employee wasn't in (or only partially in, for a half day).
//
// Half-day leave (leave.isHalfDay) no longer gets its own status - it
// writes the same "Paid Leave"/"Non-Paid Leave" status as a full-day leave,
// plus isHalfDay: true on the record. getAttendanceSummary reads that flag
// and counts it as 0.5 of a day instead of 1, so the paid/unpaid
// distinction and the half-day fraction both survive on the record itself.
export async function applyLeaveToAttendance(leave) {
    const status = LEAVE_STATUS[leave.leaveType];
    const isHalfDay = !!leave.isHalfDay;
    const dates = await workingDatesInRange(leave.companyId, leave.fromDate, leave.toDate);

    await Promise.all(dates.map((date) =>
        Attendance.findOneAndUpdate(
            { employeeId: leave.employeeId, companyId: leave.companyId, date },
            {
                $set: { status, isHalfDay },
                $unset: { inTime: "", breakIn: "", breakOut: "", outTime: "" },
                $setOnInsert: { employeeId: leave.employeeId, companyId: leave.companyId, date }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
    ));
}

// Removes the Attendance rows a leave's date range created. Only rows still
// carrying a leave-originated status (Paid Leave or Non-Paid Leave, whether
// full-day or half-day - half-day is just the isHalfDay flag on the same
// status now) are touched, so this never clobbers a record that was since
// manually edited (e.g. back to "Present").
export async function removeLeaveFromAttendance(employeeId, companyId, fromDate, toDate) {
    const dates = await workingDatesInRange(companyId, fromDate, toDate);
    if (dates.length === 0) return;

    await Attendance.deleteMany({
        employeeId,
        companyId,
        date: { $gte: dates[0], $lte: dates[dates.length - 1] },
        status: { $in: ["Paid Leave", "Non-Paid Leave"] }
    });
}