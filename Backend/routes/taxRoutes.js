import express from "express";
import Tax from "../models/tax.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

//post - add and save to db 
router.post("/tax/add", verifyToken, async (req,res) => {
 
    try{
        const tax = new Tax({ ...req.body, companyId: req.companyId });
        const savedTax = await tax.save();
        res.json(savedTax);

    } catch(err){
        console.log("Full error:", err); 
        res.status(500).json({message: err.message});
    } 
});

//get all records
router.get("/tax/all", verifyToken, async(req,res) => {
    try{
        const taxes = await Tax.find({ companyId: req.companyId });
        res.json(taxes);
    }catch(err){
        res.status(500).json({message: err.message});
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