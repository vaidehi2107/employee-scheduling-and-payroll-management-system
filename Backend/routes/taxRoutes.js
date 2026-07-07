import express from "express";
import mongoose from "mongoose";
import Tax from "../models/tax.js";

import { verifyToken } from "../middleware.js";

const router = express.Router();

//post - add and save to db 
router.post("/tax/add", verifyToken, async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { financialYear, regimes } = req.body;

        if (!financialYear || !Array.isArray(regimes) || regimes.length === 0) {
            return res.status(400).json({ message: "financialYear and regimes are required" });
        }

        const docsToInsert = regimes.map(r => ({
            companyId: req.companyId,
            financialYear,
            regime: r.regime,
            slabs: r.slabs
        }));

        let savedDocs;
        await session.withTransaction(async () => {
            savedDocs = await Tax.insertMany(docsToInsert, { session, ordered: true });
        });

        res.json(savedDocs);
    } catch (err) {
        console.log(err);
        if (err.code === 11000) {
            return res.status(409).json({ message: `Tax slabs for ${req.body.financialYear} already exist` });
        }
        res.status(500).json({ message: err.message });
    } finally {
        session.endSession();
    }
});

//get all records - if year is specified than only that year's record is shown
router.get("/tax/all", verifyToken, async(req,res) => {
    try{
        const filter = {companyId: req.companyId};
        if(req.query.year){
            filter.financialYear = req.query.year;
        }
        const taxes = await Tax.find(filter).sort({regime: 1});
        res.json(taxes);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get years for the dropdown - 
// like aa company na ketla years no record che to etla years dropdown ma show krse
router.get("/tax/years", verifyToken, async (req,res) => {
    try{
        const years = await Tax.distinct("financialYear", { companyId: req.companyId });
        years.sort().reverse();
        res.json(years);
    }catch(err){
        res.status(500).json({message: err,message});
    }
});

//update records
router.put("/tax/update/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const updatedTax = await Tax.findByIdAndUpdate(id, req.body, {new: true});
        res.json(updatedTax);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//delete records
router.delete("/tax/delete/:id", verifyToken, async(req,res) => {
    try{
        const { id } = req.params;
        await Tax.findByIdAndDelete(id);
        res.json({message: "Record deleted Successfully"});
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

export default router;