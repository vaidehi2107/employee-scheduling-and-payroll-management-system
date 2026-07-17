import Attendance from "../models/attendance.js";
import { getHolidayMap } from "./holidayHelper.js";

export const getAttendanceSummary = async (employeeId, companyId, joiningDate, startDate, endDate) => {

    //Queries the DB for all attendance records of this employee, in this company,
    // where date is between startDate and endDate
    const records = await Attendance.find({
        companyId,
        employeeId,
        date: {$gte: startDate, $lte: endDate}
    }).select("date status isHalfDay");

    //Map of date string (e.g. "Mon Jun 02 2026") -> that day's { status, isHalfDay }
    const recordByDate = new Map(
        records.map(r => [new Date(r.date).toDateString(), { status: r.status, isHalfDay: !!r.isHalfDay }])
    );

    //Map of date string -> holiday doc for every holiday in this range
    const holidayByDate = await getHolidayMap(companyId, startDate, endDate);

    //Gets the current date/time, then zeroes out hours/minutes/seconds/ms so today represents midnight of today
    const today = new Date();
    today.setHours(0,0,0,0);

    //Same idea — converts the employee's joiningDate into a Date object and strips the time
    const joinDate = new Date(joiningDate);
    joinDate.setHours(0, 0, 0, 0);

    let workingDays = 0;

    let presentDays = 0;
    let paidLeaveDays = 0;
    let nonPaidLeaveDays = 0;

    for(let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)){
        const day = new Date(cursor);
        day.setHours(0,0,0,0);

        const dow = day.getDay();
        const isWeekend = dow === 0 || dow === 6; //0-sunday,6-saturday

        const isFuture = day > today;
        const isBeforeJoining = day < joinDate;
        const isHoliday = holidayByDate.has(day.toDateString());

        if (isWeekend || isFuture || isBeforeJoining || isHoliday) continue;

        const record = recordByDate.get(day.toDateString());
        const status = record?.status;
        const isHalfDay = !!record?.isHalfDay;

        if (status === "Holiday" || status === "Week Off") continue;

        workingDays++;

        const unit = isHalfDay ? 0.5 : 1;

        if (status === "Present") presentDays += unit;
        else if (status === "Paid Leave") paidLeaveDays += unit;
        else if (status === "Non-Paid Leave") nonPaidLeaveDays += unit;
        else if (!status) nonPaidLeaveDays += 1; // no record at all -> unmarked, always a full unpaid day
        else presentDays += unit; // any other status defaults to present
    }

    return {
        workingDays,
        presentDays,
        paidLeaveDays,
        nonPaidLeaveDays

    };
};