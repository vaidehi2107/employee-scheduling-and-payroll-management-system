import Attendance from "../models/attendance.js";

export const getAttendanceSummary = async (employeeId, companyId, joiningDate, startDate, endDate) => {
    
    //Queries the DB for all attendance records of this employee, in this company, 
    // where date is between startDate and endDate
    const records = await Attendance.find({
        companyId,
        employeeId,
        date: {$gte: startDate, $lte: endDate}
    }).select("date status");

    //Map of date string (e.g. "Mon Jun 02 2026") -> that day's attendance status
    const statusByDate = new Map(records.map(r => [new Date(r.date).toDateString(), r.status]));

    //Gets the current date/time, then zeroes out hours/minutes/seconds/ms so today represents midnight of today
    const today = new Date();
    today.setHours(0,0,0,0);

    //Same idea — converts the employee's joiningDate into a Date object and strips the time
    const joinDate = new Date(joiningDate); 
    joinDate.setHours(0, 0, 0, 0);

    let workingDays = 0;
    let presentDays = 0;
    let paidLeaveDays = 0;
    // Covers explicit "Non-Paid Leave" records AND working days with no
    // record at all - an unmarked day is treated as unauthorized/unpaid,
    // so there's no separate "absent" bucket anymore.
    let nonPaidLeaveDays = 0;
    // Half-day is split by paid/unpaid because they carry different payroll
    // treatment: Half-Day Paid -> full day's pay (worked half, paid-leave
    // half), Half-Day Unpaid -> half day's pay docked.
    let halfDayPaidDays = 0;
    let halfDayUnpaidDays = 0;

    for(let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)){
        const day = new Date(cursor);
        day.setHours(0,0,0,0);

        const dow = day.getDay();
        const isWeekend = dow === 0 || dow === 6; //0-sunday,6-saturday

        const isFuture = day > today;
        const isBeforeJoining = day < joinDate;

        if (isWeekend || isFuture || isBeforeJoining) continue;

        const status = statusByDate.get(day.toDateString());

        // An explicit Holiday or an ad-hoc Week Off record means this day
        // was never a working day, even though it's a weekday - don't let
        // it count toward the working-day denominator.
        if (status === "Holiday" || status === "Week Off") continue;

        workingDays++;

        if (status === "Paid Leave") paidLeaveDays++;
        else if (status === "Non-Paid Leave") nonPaidLeaveDays++;
        else if (status === "Half-Day Paid") halfDayPaidDays++;
        else if (status === "Half-Day Unpaid") halfDayUnpaidDays++;
        else if (status === "Present") presentDays++;
        else if (!status) nonPaidLeaveDays++; // no record at all -> unmarked, treated as unpaid
        else presentDays++; // any other/unrecognised status defaults to present
    }

    // Unpaid units, in whole-day equivalents, that should reduce payable
    // salary: every Non-Paid Leave day counts as a full unit, every
    // Half-Day Unpaid counts as half a unit. Half-Day Paid contributes
    // nothing here since it's fully paid (worked half + paid-leave half).
    const unpaidUnits = nonPaidLeaveDays + halfDayUnpaidDays * 0.5;

    return {
        workingDays,
        presentDays,
        paidLeaveDays,
        nonPaidLeaveDays,
        halfDayPaidDays,
        halfDayUnpaidDays,
        unpaidUnits
    };
};