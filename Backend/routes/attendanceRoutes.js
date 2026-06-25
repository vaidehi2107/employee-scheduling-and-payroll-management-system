import express from "express";
import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import Payroll from "../models/payroll.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

const timeToMinutes = (timeStr) => {
      if (!timeStr || !timeStr.trim()) return null;

      const str = timeStr.trim().toUpperCase();
      const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/); // AM/PM now REQUIRED
      if (!match) return null; // rejects "01:30" (no meridiem) safely

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const meridiem = match[3];

      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const getEffectiveWage = (wages = [], attendanceDate) => {
      const date = new Date(attendanceDate);
      const applicable = wages
        .filter(w => w.effectiveDate && new Date(w.effectiveDate) <= date)
        .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
      return applicable[0] || null;
    };

    const calculateAttendanceValues = (
        employee,
        date,
        inTime,
        breakIn,
        breakOut,
        outTime
        ) => {

        const inTimeMinutes = timeToMinutes(inTime);
        const outTimeMinutes = timeToMinutes(outTime);
        const breakInMinutes = timeToMinutes(breakIn);
        const breakOutMinutes = timeToMinutes(breakOut);

        if (inTimeMinutes === null || outTimeMinutes === null) return { regularHours: 0, overtimeHours: 0, regEarnings: 0, otEarnings: 0, totalEarnings: 0 };

        let totalMinutes = outTimeMinutes - inTimeMinutes;

        if (breakInMinutes !== null && breakOutMinutes !== null) {
            totalMinutes -= (breakOutMinutes - breakInMinutes);
        }

        if (totalMinutes <= 0) return { regularHours: 0, overtimeHours: 0, regEarnings: 0, otEarnings: 0, totalEarnings: 0 };

        const totalHours = totalMinutes / 60;
        let regularHours, overtimeHours;

        if (totalHours <= 8) {
            regularHours = totalHours.toFixed(2);
            overtimeHours = 0;
        } else {
            regularHours = 8;
            overtimeHours = (totalHours - 8).toFixed(2);
        }

        // Earnings
        const wage = getEffectiveWage(employee.wages, date);
        if (!wage) return { regularHours, overtimeHours, regEarnings: 0, otEarnings: 0, totalEarnings: 0 };

        const hourlyRate   = parseFloat(wage.hourlyRate);
        const otMultiplier = parseFloat(wage.otMultiplier);
        const regEarnings   = (parseFloat(regularHours)  * hourlyRate).toFixed(2);
        const otEarnings    = (parseFloat(overtimeHours) * hourlyRate * otMultiplier).toFixed(2);
        const totalEarnings = (parseFloat(regEarnings) + parseFloat(otEarnings)).toFixed(2);

        return {
            regularHours: parseFloat(regularHours),
            overtimeHours: parseFloat(overtimeHours),
            regEarnings: parseFloat(regEarnings),
            otEarnings: parseFloat(otEarnings),
            totalEarnings: parseFloat(totalEarnings)
        };
    };

    //Payroll lock check
    const isLockedByPayroll = async (attendanceId) => {
        const record = await Attendance.findById(attendanceId);
        if(!record) return false;
        
        const payroll = await Payroll.findOne({
            employeeId: record.employeeId,
            periodStart: { $lte: record.date }, //periodstart ajni attendance date ya eni pelani hoy to lock
            periodEnd: {$gte: record.date} //periodend ajni attendance date ya eni pachi ni hoy to lock
        });

        return !!payroll; //converts payroll into boolean - locked if true else false
    };


//Create Attendance
router.post("/attendance", verifyToken, async (req,res) => {
    try{
        const employee = await Employee.findOne({ 
            _id: req.body.employeeId, 
            companyId: req.companyId  // make sure employee belongs to this company
        });
        if (!employee) {
            return res.status(404).json({message: "Employee not found"});
        }

        // Joining date check
        const attendanceDate = new Date(req.body.date);
        const joiningDate = new Date(employee.joiningDate);

        // strip time — compare dates only
        attendanceDate.setHours(0, 0, 0, 0);
        joiningDate.setHours(0, 0, 0, 0);

        if (attendanceDate < joiningDate) {
            return res.status(400).json({
                message: `Attendance date cannot be before joining date (${joiningDate.toDateString()}).`
            });
        }

        const calculated =
            calculateAttendanceValues(
                employee,
                req.body.date,
                req.body.inTime,
                req.body.breakIn,
                req.body.breakOut,
                req.body.outTime
            );
            const attendance = new Attendance({
                ...req.body,
                ...calculated,
                companyId: req.companyId
            });
        const savedAttendance = await attendance.save();
        res.status(201).json(savedAttendance);
   

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//Filter Attendance
router.get("/attendance/filter", verifyToken, async (req,res) => {
    try {

        const {startDate, endDate, employeeId } = req.query;

        let filter = { companyId: req.companyId }; // filter object

        //Date Range filter
        if(startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate), //greater than equal to
                $lte: new Date(endDate)   //less than equal to
            };
        }

        //Employee filter
        if(employeeId) {
            filter.employeeId = employeeId;
        }

        const attendance = await Attendance.find(filter).populate("employeeId", "firstName lastName wages");
        //populate - search for employeeid and returns firstname and lastname and wages - similar to joins in sql

        //Attache islocked to every record
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

        res.json(lockedAttendance);

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

        // Joining date check
        const attendanceDate = new Date(req.body.date);
        const joiningDate = new Date(employee.joiningDate);

        // strip time — compare dates only
        attendanceDate.setHours(0, 0, 0, 0);
        joiningDate.setHours(0, 0, 0, 0);

        if (attendanceDate < joiningDate) {
            return res.status(400).json({
                message: `Attendance date cannot be before joining date (${joiningDate.toDateString()}).`
            });
        }
        
        const calculated =
            calculateAttendanceValues(
                employee,
                req.body.date,
                req.body.inTime,
                req.body.breakIn,
                req.body.breakOut,
                req.body.outTime
            );
            const updatedAttendance =await Attendance.findByIdAndUpdate(
                id,
                {
                    ...req.body,
                    ...calculated
                },
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