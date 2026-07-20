import { useEffect, useMemo, useState, useCallback } from "react";
import API from "../api"; // preconfigured axios instance: baseURL http://localhost:5000/api + auth token attached in its request interceptor
import "./CalendarView.css";

const HOLIDAYS_ENDPOINT = "/holidays";
const ATTENDANCE_ENDPOINT = "/attendance/filter";

// Attendance statuses we actually render per-employee pills for.
const STATUS_META = {
    Present: { key: "present", label: "Present", color: "#4caf50" },
    "Paid Leave": { key: "paid_leave", label: "Paid Leave", color: "#7c5cbf" },
    "Non-Paid Leave": { key: "unpaid_leave", label: "Unpaid Leave", color: "#e5533d" },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_WEEKDAY_LABELS = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// All calendar-day math below stays in UTC, matching the backend's
// "calendar day = UTC midnight" convention (see services/dateOnly.js), so a
// given cell's dateKey means the same date regardless of the browser's
// local timezone.
function toDateKey(year, month, day) {
    // month is 0-indexed here, output is "YYYY-MM-DD"
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

// "YYYY-MM-DDT..." ISO string (as returned by the API for Date fields) -> "YYYY-MM-DD"
function isoToDateKey(iso) {
    return String(iso).slice(0, 10);
}

function dayOfWeekFromKey(dateKey) {
    return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function employeeDisplayName(emp) {
    if (!emp) return "Unknown Employee";
    const name = [emp.firstName, emp.lastName].filter(Boolean).join(" ");
    return name || `Employee #${emp._id}`;
}

function normalizeHolidays(rawHolidays, gridStartKey, gridEndKey) {
    const map = {};
    (rawHolidays || []).forEach((h) => {
        const key = isoToDateKey(h.date);
        if (key < gridStartKey || key > gridEndKey) return; // outside visible grid
        map[key] = h.name || "Holiday";
    });
    return map;
}

function normalizeAttendance(rawRecords) {
    const map = {};
    (rawRecords || []).forEach((rec) => {
        const meta = STATUS_META[rec.status];
        if (!meta) return; // "Holiday"/"Week Off" (or anything unrecognized) - not rendered here

        const key = isoToDateKey(rec.date);
        if (!map[key]) {
            map[key] = { present: [], paid_leave: [], unpaid_leave: [] };
        }

        const name = employeeDisplayName(rec.employeeId);
        map[key][meta.key].push(rec.isHalfDay ? `${name} (Half Day)` : name);
    });
    return map;
}

function CalendarView() {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [holidayMap, setHolidayMap] = useState({});
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDateKey, setSelectedDateKey] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    // Build a 6-row x 7-col grid, including the trailing days of the previous
    // month and the leading days of the next month, like the reference screenshot.
    const weeks = useMemo(() => {
        const firstOfMonth = new Date(year, month, 1);
        const startOffset = firstOfMonth.getDay(); // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const cells = [];

        // Leading days from previous month
        for (let i = startOffset - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const cellMonth = month - 1;
            const cellYear = cellMonth < 0 ? year - 1 : year;
            const normalizedMonth = (cellMonth + 12) % 12;
            cells.push({
                day,
                dateKey: toDateKey(cellYear, normalizedMonth, day),
                inCurrentMonth: false,
            });
        }

        // Current month
        for (let day = 1; day <= daysInMonth; day++) {
            cells.push({
                day,
                dateKey: toDateKey(year, month, day),
                inCurrentMonth: true,
            });
        }

        // Trailing days to fill out the final week (up to 6 rows / 42 cells)
        const totalCells = Math.ceil(cells.length / 7) * 7;
        let nextDay = 1;
        while (cells.length < totalCells) {
            const cellMonth = month + 1;
            const normalizedMonth = cellMonth % 12;
            const cellYear = cellMonth > 11 ? year + 1 : year;
            cells.push({
                day: nextDay,
                dateKey: toDateKey(cellYear, normalizedMonth, nextDay),
                inCurrentMonth: false,
            });
            nextDay++;
        }

        const rows = [];
        for (let i = 0; i < cells.length; i += 7) {
            rows.push(cells.slice(i, i + 7));
        }
        return rows;
    }, [year, month]);

    // The grid can spill into the previous/next month, so fetch attendance
    // and filter holidays against the full visible range, not just [1, daysInMonth].
    const gridStartKey = weeks[0][0].dateKey;
    const gridEndKey = weeks[weeks.length - 1][6].dateKey;

    const fetchMonthData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [holidaysRes, attendanceRes] = await Promise.all([
                API.get(HOLIDAYS_ENDPOINT),
                API.get(ATTENDANCE_ENDPOINT, {
                    params: { startDate: gridStartKey, endDate: gridEndKey },
                }),
            ]);
            setHolidayMap(normalizeHolidays(holidaysRes.data.holidays, gridStartKey, gridEndKey));
            setAttendanceMap(normalizeAttendance(attendanceRes.data.records));
        } catch (err) {
            console.error("Failed to load calendar data", err);
            setError("Couldn't load calendar data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [gridStartKey, gridEndKey]);

    useEffect(() => {
        fetchMonthData();
    }, [fetchMonthData]);

    const goCurrentMonth = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const goPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const goNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const todayTooltip = `${FULL_WEEKDAY_LABELS[today.getDay()]}, ${today.getDate()} ${MONTH_LABELS[today.getMonth()]}`;

    const selectedDetail = selectedDateKey
        ? {
              dateKey: selectedDateKey,
              holiday: holidayMap[selectedDateKey],
              isWeekOff: dayOfWeekFromKey(selectedDateKey) === 0 || dayOfWeekFromKey(selectedDateKey) === 6,
              attendance: attendanceMap[selectedDateKey],
          }
        : null;

    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <div className="calendar-header-left">
                    <div className="calendar-today-wrapper">
                        <button className="calendar-today-btn" onClick={goCurrentMonth}>Today</button>
                        <span className="calendar-today-tooltip">{todayTooltip}</span>
                    </div>
                    <button className="calendar-nav-btn" onClick={goPrevMonth} aria-label="Previous month">‹</button>
                    <button className="calendar-nav-btn" onClick={goNextMonth} aria-label="Next month">›</button>
                    <h2 className="calendar-title">
                        {year}.{String(month + 1).padStart(2, "0")}
                    </h2>
                </div>
                <div className="calendar-legend">
                    {Object.values(STATUS_META).map((meta) => (
                        <span className="legend-item" key={meta.key}>
                            <span className="legend-dot" style={{ background: meta.color }} />
                            {meta.label}
                        </span>
                    ))}
                    <span className="legend-item">
                        <span className="legend-dot legend-dot--holiday" />
                        Holiday
                    </span>
                    <span className="legend-item">
                        <span className="legend-dot legend-dot--weekoff" />
                        Week Off
                    </span>
                </div>
            </div>

            {error && <div className="calendar-error">{error}</div>}

            <div className="calendar-grid">
                <div className="calendar-weekday-row">
                    {WEEKDAY_LABELS.map((label) => (
                        <div key={label} className={`calendar-weekday ${label === "Sun" ? "is-sunday" : ""}`}>
                            {label}
                        </div>
                    ))}
                </div>

                {weeks.map((week, wi) => (
                    <div className="calendar-week-row" key={wi}>
                        {week.map((cell) => {
                            const holidayName = holidayMap[cell.dateKey];
                            const dow = dayOfWeekFromKey(cell.dateKey);
                            const isWeekOff = dow === 0 || dow === 6;
                            const dayAttendance = attendanceMap[cell.dateKey];
                            const isToday = cell.dateKey === todayKey;

                            return (
                                <button
                                    key={cell.dateKey}
                                    className={[
                                        "calendar-day-cell",
                                        cell.inCurrentMonth ? "" : "is-outside-month",
                                        isToday ? "is-today" : "",
                                        holidayName ? "is-holiday" : "",
                                        !holidayName && isWeekOff ? "is-weekoff" : "",
                                    ].join(" ").trim()}
                                    onClick={() => setSelectedDateKey(cell.dateKey)}
                                >
                                    <span className="calendar-day-number">{cell.day}</span>

                                    {holidayName ? (
                                        <span className="day-badge day-badge--holiday" title={holidayName}>
                                            {holidayName}
                                        </span>
                                    ) : isWeekOff ? (
                                        <span className="day-badge day-badge--weekoff">Week Off</span>
                                    ) : (
                                        dayAttendance && (
                                            <div className="day-status-dots">
                                                {Object.entries(STATUS_META).map(([status, meta]) => {
                                                    const count = dayAttendance[meta.key]?.length || 0;
                                                    if (!count) return null;
                                                    return (
                                                        <span
                                                            className="day-status-pill"
                                                            key={status}
                                                            style={{ background: meta.color }}
                                                        >
                                                            {count}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {loading && <div className="calendar-loading">Loading…</div>}

            {selectedDetail && (
                <div className="calendar-modal-backdrop" onClick={() => setSelectedDateKey(null)}>
                    <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="calendar-modal-header">
                            <h3>{selectedDetail.dateKey}</h3>
                            <button className="calendar-modal-close" onClick={() => setSelectedDateKey(null)}>×</button>
                        </div>

                        {selectedDetail.holiday && (
                            <p className="calendar-modal-holiday">🎉 {selectedDetail.holiday}</p>
                        )}

                        {!selectedDetail.holiday && selectedDetail.isWeekOff && (
                            <p className="calendar-modal-weekoff">Week Off - not a working day.</p>
                        )}

                        {!selectedDetail.holiday && !selectedDetail.isWeekOff && (
                            selectedDetail.attendance ? (
                                Object.entries(STATUS_META).map(([status, meta]) => {
                                    const names = selectedDetail.attendance[meta.key];
                                    if (!names || names.length === 0) return null;
                                    return (
                                        <div className="calendar-modal-section" key={status}>
                                            <p className="calendar-modal-section-title" style={{ color: meta.color }}>
                                                {meta.label} ({names.length})
                                            </p>
                                            <ul>
                                                {names.map((name, idx) => (
                                                    <li key={idx}>{name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="calendar-modal-empty">No attendance records for this day.</p>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;