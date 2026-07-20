import express from "express";
import mongoose from "mongoose";
import Employee from "../models/employee.js";
import Attendance from "../models/attendance.js";
import Holiday from "../models/holidaySchema.js";
import { verifyToken } from "../middleware.js";
import { dateKey, dayOfWeek } from "../services/dateOnly.js";

const router = express.Router();

router.get("/dashboard/attendance/daily-summary", verifyToken, async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required" });
        }

        const companyId = req.companyId;
        const monthNum = Number(month);
        const yearNum = Number(year);

        const periodStart = new Date(Date.UTC(yearNum, monthNum - 1, 1));
        const periodEnd = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59));
        const totalDaysInMonth = periodEnd.getUTCDate();

        const activeEmployeeCount = await Employee.countDocuments({
            companyId,
            status: "active"
        });

        // Needed so every non-working / unmarked day can list who's actually
        // in the "off" or "not yet marked" bucket, not just a count.
        const activeEmployees = await Employee.find({ companyId, status: "active" })
            .select("firstName lastName")
            .lean();
        const activeEmployeeMap = new Map(
            activeEmployees.map(e => [String(e._id), `${e.firstName || ""} ${e.lastName || ""}`.trim()])
        );

        const records = await Attendance.find({
            companyId: new mongoose.Types.ObjectId(companyId),
            date: { $gte: periodStart, $lte: periodEnd }
        })
            .select("employeeId date status isHalfDay")
            .populate("employeeId", "firstName lastName")
            .lean();

        // Holidays never get an Attendance row (marking attendance on a
        // holiday is blocked, and leave sync skips them too), so they can't
        // be inferred from records the way "Present"/"Paid Leave" can -
        // they have to be pulled from the Holiday collection directly.
        const holidays = await Holiday.find({
            companyId,
            date: { $gte: periodStart, $lte: periodEnd }
        }).select("date name").lean();
        const holidayByDate = new Map(
            holidays.map(h => [dateKey(h.date), h.name])
        );

        const recordsByDate = new Map();
        for (const r of records) {
            const key = dateKey(r.date);
            if (!recordsByDate.has(key)) recordsByDate.set(key, []);
            recordsByDate.get(key).push(r);
        }

        // Weekends never get an Attendance row written for them at all -
        // attendanceRoutes.js blocks create/update on Sat/Sun, and
        // syncAttendanceforLeave.js's workingDatesInRange skips them too.
        // So they can't be detected from "Week Off" records the way an
        // actual company Holiday can - detect them by day-of-week directly.
        const isWeekend = (date) => {
            const dow = dayOfWeek(date);
            return dow === 0 || dow === 6;
        };

        const STATUS_TO_BUCKET = {
            "Present": "present",
            "Paid Leave": "paidLeave",
            "Non-Paid Leave": "nonPaidLeave",
            "Holiday": "nonWorking",
            "Week Off": "nonWorking"
        };

        const days = [];
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const dateObj = new Date(Date.UTC(yearNum, monthNum - 1, d));
            const key = dateKey(dateObj);
            const dayRecords = recordsByDate.get(key) || [];

            const buckets = { present: [], paidLeave: [], nonPaidLeave: [], nonWorking: [] };
            const handledIds = new Set();

            for (const r of dayRecords) {
                const bucketKey = STATUS_TO_BUCKET[r.status];
                if (!bucketKey) continue;

                const empId = r.employeeId?._id ? String(r.employeeId._id) : null;
                const empName = r.employeeId
                    ? `${r.employeeId.firstName || ""} ${r.employeeId.lastName || ""}`.trim()
                    : "Unknown employee";

                if (empId) handledIds.add(empId);
                buckets[bucketKey].push({ name: empName || "Unknown employee", isHalfDay: !!r.isHalfDay });
            }

            const holidayName = holidayByDate.get(key);

            const isNonWorkingDay = isWeekend(dateObj) || !!holidayName ||
                (activeEmployeeCount > 0 && buckets.nonWorking.length >= activeEmployeeCount / 2);

            // On a non-working day, fold every active employee who doesn't
            // already have an explicit record (e.g. someone who worked a
            // holiday and is marked Present) into "off" - both the count
            // and the name list - instead of leaving them "unmarked".
            let unmarkedNames = [];
            if (isNonWorkingDay) {
                for (const [empId, empName] of activeEmployeeMap) {
                    if (!handledIds.has(empId)) {
                        buckets.nonWorking.push({ name: empName || "Unknown employee", isHalfDay: false });
                    }
                }
            } else {
                unmarkedNames = [...activeEmployeeMap]
                    .filter(([empId]) => !handledIds.has(empId))
                    .map(([, empName]) => ({ name: empName || "Unknown employee" }));
            }

            const present = buckets.present.reduce((sum, e) => sum + (e.isHalfDay ? 0.5 : 1), 0);

            days.push({
                date: key,
                day: d,
                present,
                paidLeave: buckets.paidLeave.length,
                nonPaidLeave: buckets.nonPaidLeave.length,
                nonWorking: buckets.nonWorking.length,
                unmarked: unmarkedNames.length,
                isNonWorkingDay,
                holidayName: holidayName || null,
                names: {
                    present: buckets.present,
                    paidLeave: buckets.paidLeave,
                    nonPaidLeave: buckets.nonPaidLeave,
                    nonWorking: buckets.nonWorking,
                    unmarked: unmarkedNames
                }
            });
        }

        res.json({ days, activeEmployeeCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch daily attendance summary" });
    }
});

export default router;