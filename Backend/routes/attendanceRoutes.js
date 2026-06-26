import express from "express";
import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import Payroll from "../models/payroll.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

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

        const attendance = await Attendance.find(filter).populate("employeeId", "firstName lastName");
        //populate - search for employeeid and returns firstname and lastname - similar to joins in sql

        //Attach islocked to every record
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