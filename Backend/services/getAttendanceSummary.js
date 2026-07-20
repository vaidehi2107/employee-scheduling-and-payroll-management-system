import Attendance from "../models/attendance.js";
import { getHolidayMap } from "./holidayHelper.js";
import { parseDateOnly, dateKey, dayOfWeek } from "../services/dateOnly.js";

export const getAttendanceSummary = async (employeeId, companyId, joiningDate, startDate, endDate) => {

    //Queries the DB for all attendance records of this employee, in this company,
    // where date is between startDate and endDate
    const records = await Attendance.find({
        companyId,
        employeeId,
        date: {$gte: startDate, $lte: endDate}
    }).select("date status isHalfDay");

    //Map of "YYYY-MM-DD" -> that day's { status, isHalfDay }
    const recordByDate = new Map(
        records.map(r => [dateKey(r.date), { status: r.status, isHalfDay: !!r.isHalfDay }])
    );

    //Map of "YYYY-MM-DD" -> holiday doc for every holiday in this range
    const holidayByDate = await getHolidayMap(companyId, startDate, endDate);

    //Today's calendar day (UTC), for past/future comparisons
    const today = parseDateOnly(new Date());

    //Employee's joining day as a plain calendar day
    const joinDate = parseDateOnly(joiningDate);

    let workingDays = 0;

    let presentDays = 0;
    let paidLeaveDays = 0;
    let nonPaidLeaveDays = 0;

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    for (let day = start; day <= end; day = new Date(day.getTime() + 24 * 60 * 60 * 1000)) {
        const dow = dayOfWeek(day);
        const isWeekend = dow === 0 || dow === 6; //0-sunday,6-saturday

        const isFuture = day > today;
        const isBeforeJoining = day < joinDate;
        const key = dateKey(day);
        const isHoliday = holidayByDate.has(key);

        if (isWeekend || isFuture || isBeforeJoining || isHoliday) continue;

        const record = recordByDate.get(key);
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