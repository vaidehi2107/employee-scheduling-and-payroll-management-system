import express from "express";
import Salary from "../models/salaryStructure.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

const calculateSalary = (data) => {
    const basicPay = data.basicPay || 0;
    const da = data.da || 0;
    const hra = data.hra || 0;
    const pfPercent = data.pfPercent ?? 12;
    const esicPercent = data.esicPercent ?? 0.75;
    const professionalTax = data.professionalTax ?? 200;
    const negotiatedSalary = data.negotiatedSalary;

    const fixedComponents = basicPay + da + hra;
    const specialAllowance = negotiatedSalary - fixedComponents;

    if (specialAllowance < 0) {
        throw new Error("Basic Pay + DA + HRA exceed negotiated salary");
    }

    // by construction, grossEarnings always equals negotiatedSalary
    const grossEarnings = fixedComponents + specialAllowance;

    const pfAmount = Math.round((pfPercent / 100) * basicPay);

    // ESIC only applies if gross earnings are within the statutory wage limit
    const esicAmount = grossEarnings <= 21000
        ? Math.round((esicPercent / 100) * grossEarnings)
        : 0;

    const totalDeductions = pfAmount + esicAmount + professionalTax;
    const netPay = grossEarnings - totalDeductions;

    return { specialAllowance, grossEarnings, pfAmount, esicAmount, totalDeductions, netPay };
};

//save salaries in db
router.post("/salaries", verifyToken, async (req,res) => {
    try{
        const calculations = calculateSalary(req.body);
        const salary = new Salary({...req.body, ...calculations, companyId: req.companyId});
        const response = await salary.save();
        res.json(response);
    }catch(err){
        res.status(400).json({message: err.message});
    }

});

//Get all salaries
router.get("/salaries", verifyToken, async (req,res) => {
    try{
        const salaries = await Salary.find({companyId: req.companyId});
        res.json(salaries);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get by employeeid
router.get("/salaries/employee/:employeeId", verifyToken, async (req,res) => {
    try{
        const { employeeId } = req.params;
        const salaries = await Salary.find({employeeId, companyId: req.companyId, });
        res.json(salaries);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get by salary Id
router.get("/salaries/:id", verifyToken, async(req,res) => {
    try{
        const { id } = req.params;
        const salary = await Salary.findOne({_id: id, companyId: req.companyId});
        res.json(salary);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//update 
router.put("/salaries/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const existing = await Salary.findOne({_id: id, companyId: req.companyId});
        if(!existing) return res.status(404).json({ message: "Salary not found" });

        // merge so calculateSalary sees full picture even on partial updates
        const merged = { ...existing.toObject(), ...req.body };
        const calculations = calculateSalary(merged);

        const updatedSalary = await Salary.findOneAndUpdate(
            {_id: id, companyId: req.companyId},
            {...req.body, ...calculations},
            {new: true});
        res.json(updatedSalary);
    }catch(err){
        res.status(400).json({message: err.message});
    }
});

//delete salary
router.delete("/salaries/:id", verifyToken, async(req,res) => {
    try{
        const { id } = req.params;
        const deleted = await Salary.findOneAndDelete({_id: id, companyId: req.companyId});
        if (!deleted) return res.status(404).json({ message: "Salary record not found" });
        res.json({message: "record deleted successfully!"});
    }catch(err){
        res.status(500).json({message: err.message});
    }
});
export default router;