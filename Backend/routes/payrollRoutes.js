import express from "express";
import Attendance from "../models/attendance.js";
import Tax from "../models/tax.js";
import Payroll from "../models/payroll.js";
import EmployeeTax from "../models/employeeTax.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

router.post("/payroll/generate", verifyToken, async(req,res) => {
    try{

    const { employeeId, periodStart, periodEnd } = req.body;

    //guard duplicate generation of payroll
    const existing = await Payroll.findOne({
        employeeId,
        companyId: req.companyId,
        periodStart: { $lte: new Date(periodEnd) },
        periodEnd:   { $gte: new Date(periodStart) }
    });
    if(existing) {
        return res.status(404).json({message: "Payroll already generated"});
    }

    //1. Sum earnings for the period 
    const records = await Attendance.find({
        employeeId,
        companyId: req.companyId,
        date: {
            $gte: new Date(periodStart), 
            $lte: new Date(periodEnd) 
        }
    }); 

    //reduce loops over all records and sums total earnings and for safe side starts from 0
    const grossEarnings = records.reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
    const regularHours = records.reduce((sum,r) => sum + (r.regularHours || 0), 0);
    const overtimeHours = records.reduce((sum,r) => sum + (r.overtimeHours || 0), 0);

    // First look for employee-specific tax override
    let tax = await EmployeeTax.findOne({
        employeeId,
        companyId: req.companyId,
        status: "active",
        startRange: { $lte: grossEarnings },
        endRange: { $gte: grossEarnings }
    });

    // If no override exists, use global tax slab
    if (!tax) {
        tax = await Tax.findOne({
            companyId: req.companyId,
            status: "active",
            startRange: { $lte: grossEarnings },
            endRange: { $gte: grossEarnings }
        });
    }
    const employeePercentage   = tax?.employeePercentage   || 0;
    const employerContribution = tax?.employerContribution || 0;
    const taxDeduction         = parseFloat((grossEarnings * employeePercentage   / 100).toFixed(2));
    const employerTaxAmount    = parseFloat((grossEarnings * employerContribution / 100).toFixed(2));
    const netPay               = parseFloat((grossEarnings - taxDeduction).toFixed(2));

    // 3. Save and return
    const payroll = new Payroll({
        employeeId, periodStart, periodEnd,
        regularHours, overtimeHours, grossEarnings,
        taxId: tax?._id, taxCode: tax?.taxCode,
        employeePercentage, employerContribution,
        taxDeduction, employerTaxAmount, netPay,
        companyId: req.companyId
    });

    await payroll.save();
    res.json(payroll);
   
    } catch(err){
        res.status(500).json({message: err.message});
    }
 });

//GET Payroll all
router.get("/payroll/all", verifyToken, async(req,res) => {
    try{
        const payrolls = await Payroll.find({companyId: req.companyId})
        .populate("employeeId", "firstName lastName")  // add this
        .sort({ createdAt: -1 });
        res.json(payrolls);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

// Get single payroll by ID (for View modal)
router.get("/payroll/:id", verifyToken, async (req, res) => {
    try {
        const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId })
            .populate("employeeId", "firstName lastName");
        res.json(payroll);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//Delete Payroll
router.delete("/payroll/delete/:id", verifyToken, async(req,res)=> {
    try{
        const { id } = req.params;
        await Payroll.findByIdAndDelete(id);
        res.json({message: "Record deleted Successfully"});

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

export default router;