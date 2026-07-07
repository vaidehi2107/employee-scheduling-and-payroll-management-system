import express from "express";
import Salary from "../models/salaryStructure.js";
import Tax from "../models/tax.js";
import { verifyToken } from "../middleware.js";
import { calculateSalary, compareRegimes } from "../services/taxCalculator.js";

const router = express.Router();

//save salaries in db
router.post("/salaries", verifyToken, async (req,res) => {
    try{
        const { financialYear } = req.body;
        if (!financialYear) {
            return res.status(400).json({ message: "financialYear is required" });
        }

        const calculations = calculateSalary(req.body);
        const salary = new Salary({...req.body, ...calculations, companyId: req.companyId});
        const response = await salary.save();
        res.json(response);
    }catch(err){
        if (err.code === 11000) {
            return res.status(409).json({ message: `Salary structure for ${req.body.financialYear} already exists for this employee` });
        }
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

//get by employeeid — supports history: returns all financial years, newest first
router.get("/salaries/employee/:employeeId", verifyToken, async (req,res) => {
    try{
        const { employeeId } = req.params;
        const salaries = await Salary.find({employeeId, companyId: req.companyId})
            .sort({ financialYear: -1 });
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

// ── Old vs New regime tax comparison for one salary record ──

router.get("/salaries/:id/tax-comparison", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const salary = await Salary.findOne({ _id: id, companyId: req.companyId });
        if (!salary) return res.status(404).json({ message: "Salary not found" });

        const { financialYear } = salary;

        const [oldTaxDoc, newTaxDoc] = await Promise.all([
            Tax.findOne({ companyId: req.companyId, financialYear, regime: "old" }),
            Tax.findOne({ companyId: req.companyId, financialYear, regime: "new" })
        ]);

        if (!oldTaxDoc || !newTaxDoc) {
            return res.status(400).json({
                message: `Tax slabs are not defined for both regimes in FY ${financialYear}. Add them in the Tax module first.`
            });
        }

        const comparison = compareRegimes({ salary, oldTaxDoc, newTaxDoc });
        res.json(comparison);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//update — also used to confirm/change taxRegime (e.g. { taxRegime: "old" }) and to
//edit declared deductions ({ deductions: { section80C: 150000, ... } })
router.put("/salaries/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const existing = await Salary.findOne({_id: id, companyId: req.companyId});
        if(!existing) return res.status(404).json({ message: "Salary not found" });

        // merge so calculateSalary sees full picture even on partial updates
        const merged = { ...existing.toObject(), ...req.body };
        const calculations = calculateSalary(merged);

        // deductions is a nested object — merge it explicitly so a partial update
        // (e.g. just { section80C: 150000 }) doesn't wipe out sibling fields like rentPaid
        const mergedDeductions = req.body.deductions
            ? { ...(existing.deductions?.toObject?.() ?? existing.deductions ?? {}), ...req.body.deductions }
            : undefined;

        const updatedSalary = await Salary.findOneAndUpdate(
            {_id: id, companyId: req.companyId},
            {
                ...req.body,
                ...calculations,
                ...(mergedDeductions ? { deductions: mergedDeductions } : {})
            },
            {new: true});
        res.json(updatedSalary);
    }catch(err){
        if (err.code === 11000) {
            return res.status(409).json({ message: "Salary structure for that financial year already exists for this employee" });
        }
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