import Attendance from "../models/attendance.js";
import Payroll from "../models/payroll.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const LEAVE_STATUS = {
    Paid: "Paid Leave",
    NonPaid: "Non-Paid Leave"
};

// Every calendar day in [fromDate, toDate], inclusive, skipping weekends.
// Weekends already render as "Week Off" in the UI regardless of any
// Attendance record, so there's nothing useful to write for them.
function workingDatesInRange(fromDate, toDate) {
    const dates = [];
    for (let cursor = new Date(fromDate); cursor <= toDate; cursor = new Date(cursor.getTime() + MS_PER_DAY)) {
        const day = new Date(cursor);
        day.setHours(0, 0, 0, 0);
        const dow = day.getDay();
        if (dow !== 0 && dow !== 6) dates.push(day);
    }
    return dates;
}

// Throws a 403 if payroll has already been generated for any working day in
// the range, so a leave apply/edit/delete can never silently rewrite
// attendance a payroll run already relied on.
export async function assertRangeNotPayrollLocked(employeeId, fromDate, toDate) {
    const dates = workingDatesInRange(fromDate, toDate);
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

const HALF_DAY_STATUS = {
    Paid: "Half-Day Paid",
    NonPaid: "Half-Day Unpaid"
};

// Upserts an Attendance row with the appropriate status for every working
// day in the leave's range, clearing any clock in/out times since the
// employee wasn't in (or only partially in, for a half day).
//
// Half-day leave (leave.isHalfDay) writes "Half-Day Paid" or "Half-Day
// Unpaid" depending on leave.leaveType, so the paid/unpaid distinction is
// preserved on the Attendance record itself - payroll (which reads
// Attendance.status directly) doesn't lose that information. The UI is
// free to display both as a single generic "Half-Day" badge.
export async function applyLeaveToAttendance(leave) {
    const status = leave.isHalfDay ? HALF_DAY_STATUS[leave.leaveType] : LEAVE_STATUS[leave.leaveType];
    const dates = workingDatesInRange(leave.fromDate, leave.toDate);

    await Promise.all(dates.map((date) =>
        Attendance.findOneAndUpdate(
            { employeeId: leave.employeeId, companyId: leave.companyId, date },
            {
                $set: { status },
                $unset: { inTime: "", breakIn: "", breakOut: "", outTime: "" },
                $setOnInsert: { employeeId: leave.employeeId, companyId: leave.companyId, date }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
    ));
}

// Removes the Attendance rows a leave's date range created. Only rows still
// carrying a leave-originated status (full-day or half-day, paid or
// unpaid) are touched, so this never clobbers a record that was since
// manually edited (e.g. back to "Present").
export async function removeLeaveFromAttendance(employeeId, companyId, fromDate, toDate) {
    const dates = workingDatesInRange(fromDate, toDate);
    if (dates.length === 0) return;

    await Attendance.deleteMany({
        employeeId,
        companyId,
        date: { $gte: dates[0], $lte: dates[dates.length - 1] },
        status: { $in: ["Paid Leave", "Non-Paid Leave", "Half-Day Paid", "Half-Day Unpaid"] }
    });
}