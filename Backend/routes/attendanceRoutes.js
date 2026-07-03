import express from "express";
import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import Payroll from "../models/payroll.js";
import { verifyToken } from "../middleware.js";
import { getAttendanceSummary } from "../services/getAttendanceSummary.js";

const router = express.Router();

//Payroll lock check
const isLockedByPayroll = async (attendanceId) => {
    const record = await Attendance.findById(attendanceId);
    if(!record) return false;

    const payroll = await Payroll.findOne({
        employeeId: record.employeeId,
        periodStart: { $lte: record.date },
        periodEnd: {$gte: record.date}
    });

    return !!payroll;
};

// Weekends aren't working days - attendance is never marked for them
// (they render as "Week Off" automatically), so block create/edit outright.
const isWeekend = (date) => {
    const dow = date.getDay();
    return dow === 0 || dow === 6;
};


//Create Attendance
router.post("/attendance", verifyToken, async (req,res) => {
    try{
        const employee = await Employee.findOne({ 
            _id: req.body.employeeId, 
            companyId: req.companyId
        });
        if (!employee) {
            return res.status(404).json({message: "Employee not found"});
        }

        const attendanceDate = new Date(req.body.date);
        const joiningDate = new Date(employee.joiningDate);

        attendanceDate.setHours(0, 0, 0, 0);
        joiningDate.setHours(0, 0, 0, 0);

        if (isWeekend(attendanceDate)) {
            return res.status(400).json({ message: "Attendance cannot be marked on a weekend." });
        }

        if (attendanceDate < joiningDate) {
            return res.status(400).json({
                message: `Attendance date cannot be before joining date (${joiningDate.toDateString()}).`
            });
        }

        const attendance = new Attendance({
            ...req.body,
            companyId: req.companyId
        });
        const savedAttendance = await attendance.save();
        res.status(201).json(savedAttendance);


    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//Filter Attendance (now also returns working/present/absent summary)
router.get("/attendance/filter", verifyToken, async (req,res) => {
    try {

        const {startDate, endDate, employeeId } = req.query;

        let filter = { companyId: req.companyId };

        if(startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if(employeeId) {
            filter.employeeId = employeeId;
        }

        const attendance = await Attendance.find(filter).populate("employeeId", "firstName lastName");

        const lockedAttendance = await Promise.all(
            attendance.map(async (record) => {
                const payroll = await Payroll.findOne({
                    employeeId: record.employeeId,
                    periodStart: {$lte: record.date},
                    periodEnd: {$gte: record.date}
                });
                return {...record.toObject(), isLocked: !!payroll};
            })
        );

        // Build summary only when filtering by a single employee + date range
        let summary = null;
        if (employeeId && startDate && endDate) {
            const employee = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
            if (employee) {
                summary = await getAttendanceSummary(
                    employeeId,
                    req.companyId,
                    employee.joiningDate,
                    new Date(startDate),
                    new Date(endDate)
                );
            }
        }

        res.json({ records: lockedAttendance, summary });

    }catch(err) {
        res.status(500).json({message: err.message});
    }
});

//Get Attendance by ID
router.get("/attendance/:id", verifyToken, async (req,res) => {
    try{

        const { id } = req.params;
        const response = await Attendance.findOne({ 
            _id: req.params.id, 
            companyId: req.companyId 
        });
        if(!response) return res.status(404).json({ message: "Record not found" });
        res.json(response);

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//Put - Update Attendance by ID
router.put("/attendance/update/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;

        if(await isLockedByPayroll(id)){
            return res.status(403).json({message: "Payroll already generated for this record!"});
        }

        const employee = await Employee.findById(req.body.employeeId);
        if (!employee) {
            return res.status(404).json({message: "Employee not found"});
        }

        const attendanceDate = new Date(req.body.date);
        const joiningDate = new Date(employee.joiningDate);

        attendanceDate.setHours(0, 0, 0, 0);
        joiningDate.setHours(0, 0, 0, 0);

        if (isWeekend(attendanceDate)) {
            return res.status(400).json({ message: "Attendance cannot be marked on a weekend." });
        }

        if (attendanceDate < joiningDate) {
            return res.status(400).json({
                message: `Attendance date cannot be before joining date (${joiningDate.toDateString()}).`
            });
        }

        const updatedAttendance = await Attendance.findByIdAndUpdate(
                id,
                { ...req.body },
                { new: true }
            );
        res.json(updatedAttendance);

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//Delete Attendance
router.delete("/attendance/delete/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;

         if(await isLockedByPayroll(id)){
            return res.status(403).json({message: "Payroll already generated for this record!"});
        }

        await Attendance.findByIdAndDelete(id);
        res.json({message: "Record deleted Successfully"});
    }catch(err){
        res.status(500).json({message: err.message});
    }

});
export default router;