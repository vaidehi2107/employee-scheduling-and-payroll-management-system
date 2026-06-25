import express from "express";
import EmployeeTax from "../models/employeeTax.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

//get all override records of one employee by empID
router.get("/emp-tax/:employeeId", verifyToken, async(req,res) => {
    try{
        const records = await EmployeeTax.find({
            employeeId: req.params.employeeId,
            companyId: req.companyId 
        });
        res.json(records);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//add override records
router.post("/emp-tax/add", verifyToken, async(req,res) => {
    try{
        const record = new EmployeeTax({... req.body, companyId: req.companyId  });
        const saved = await record.save();
        res.json(saved);

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//update override existing records
router.put("/emp-tax/update/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const updated = await EmployeeTax.findByIdAndUpdate(id, req.body, {new: true});
        res.json(updated);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//delete override emp record
router.delete("/emp-tax/delete/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        await EmployeeTax.findByIdAndDelete(id);
        res.json({message: "Record deleted Successfully"});    
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//delete all overrides - reset to global
router.delete("/emp-tax/reset/:employeeId", verifyToken, async (req, res) => {
    try {
        await EmployeeTax.deleteMany({ employeeId: req.params.employeeId, companyId: req.companyId });
        res.json({ message: "Employee tax reset to global defaults" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


export default router;