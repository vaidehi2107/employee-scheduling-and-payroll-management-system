import Holiday from "../models/holidaySchema.js";

// Single-date check - used when creating/editing one attendance record.
// Returns the holiday doc if the date is a holiday, otherwise null.
export async function getHolidayOnDate(companyId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Holiday.findOne({
        companyId,
        date: { $gte: startOfDay, $lte: endOfDay }
    });
}

// Range check - used when scanning a date range (summaries, leave sync).
// Returns a Map of dateString (toDateString()) -> holiday doc.
export async function getHolidayMap(companyId, fromDate, toDate) {
    const holidays = await Holiday.find({
        companyId,
        date: { $gte: fromDate, $lte: toDate }
    });

    return new Map(holidays.map(h => [new Date(h.date).toDateString(), h]));
}