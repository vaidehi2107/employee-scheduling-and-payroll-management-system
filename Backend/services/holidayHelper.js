import Holiday from "../models/holidaySchema.js";
import { parseDateOnly, endOfDateOnly, dateKey } from "../services/dateOnly.js";

// Single-date check - used when creating/editing one attendance record.
// Returns the holiday doc if the date is a holiday, otherwise null.
export async function getHolidayOnDate(companyId, date) {
    const startOfDay = parseDateOnly(date);
    const endOfDay = endOfDateOnly(date);

    return Holiday.findOne({
        companyId,
        date: { $gte: startOfDay, $lte: endOfDay }
    });
}

// Range check - used when scanning a date range (summaries, leave sync).
// Returns a Map of "YYYY-MM-DD" -> holiday doc.
export async function getHolidayMap(companyId, fromDate, toDate) {
    const holidays = await Holiday.find({
        companyId,
        date: { $gte: parseDateOnly(fromDate), $lte: endOfDateOnly(toDate) }
    });

    return new Map(holidays.map(h => [dateKey(h.date), h]));
}