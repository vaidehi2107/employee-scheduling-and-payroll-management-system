// A "calendar day" (holiday date, attendance date, etc.) has no time-of-day
// and no timezone - it's just "16 July 2026". Every place in this app that
// stores, compares, or keys one of these dates MUST go through this file
// instead of using local Date getters/setters (getDay, setHours, toDateString,
// getFullYear...), because those depend on whatever timezone the machine
// running the code happens to be in (browser tz vs server tz can differ,
// and even the server's tz can vary across environments/deploys).
//
// Convention: a calendar day is always stored as a Date representing
// UTC midnight of that day (e.g. "2026-07-16" -> 2026-07-16T00:00:00.000Z).

// Accepts a "YYYY-MM-DD" string (preferred - what the frontend should send),
// a full ISO string, or a Date, and returns a Date representing UTC midnight
// of that calendar day. Only the first 10 chars ("YYYY-MM-DD") are used, so
// any time-of-day/offset on the input is ignored rather than allowed to
// shift the calendar day.
export function parseDateOnly(input) {
    const str = input instanceof Date ? input.toISOString() : String(input);
    const [y, m, d] = str.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

// Canonical "YYYY-MM-DD" key for a stored date, using UTC components so the
// key is identical regardless of server timezone.
export function dateKey(date) {
    return new Date(date).toISOString().slice(0, 10);
}

// Inclusive end-of-day boundary (23:59:59.999 UTC) for a calendar day, for
// use in $gte/$lte range queries.
export function endOfDateOnly(input) {
    const d = parseDateOnly(input);
    d.setUTCHours(23, 59, 59, 999);
    return d;
}

// True if two calendar-day inputs represent the same day.
export function isSameDateOnly(a, b) {
    return dateKey(a) === dateKey(b);
}

// UTC day-of-week (0 = Sunday, 6 = Saturday) for a calendar day.
export function dayOfWeek(input) {
    return parseDateOnly(input).getUTCDay();
}

// Fixed "MM-DD-YYYY" display format, using UTC components so it's
// independent of server timezone (matches the frontend's date-fns
// "MM-dd-yyyy" format used everywhere dates are shown to the user).
export function formatMDY(input) {
    const d = parseDateOnly(input);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${mm}-${dd}-${yyyy}`;
}