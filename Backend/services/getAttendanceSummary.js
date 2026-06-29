import Attendance from "../models/attendance.js";

export const getAttendanceSummary = async (employeeId, companyId, joiningDate, startDate, endDate) => {
    
    //Queries the DB for all attendance records of this employee, in this company, 
    // where date is between startDate and endDate
    const records = await Attendance.find({
        companyId,
        employeeId,
        date: {$gte: startDate, $lte: endDate}
    }).select("date");

    //Converts the list of records into a Set of date strings (e.g. "Mon Jun 02 2026").
    const presentDates = new Set(records.map(r => new Date(r.date).toDateString()));

    //Gets the current date/time, then zeroes out hours/minutes/seconds/ms so today represents midnight of today
    const today = new Date();
    today.setHours(0,0,0,0);

    //Same idea — converts the employee's joiningDate into a Date object and strips the time
    const joinDate = new Date(joiningDate); 
    joinDate.setHours(0, 0, 0, 0);

    let workingDays = 0;
    let presentDays = 0;

    for(let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)){
        const day = new Date(cursor);
        day.setHours(0,0,0,0);

        const dow = day.getDay();
        const isWeekend = dow === 0 || dow === 6; //0-sunday,6-saturday

        const isFuture = day > today;
        const isBeforeJoining = day < joinDate;

        if (isWeekend || isFuture || isBeforeJoining) continue;

        workingDays++;

        if (presentDates.has(day.toDateString())) presentDays++;
    }
    return {
        workingDays,
        presentDays,
        absentDays: workingDays - presentDays
    };
};