import express from "express";
import Company from "../models/company.js";
import bcrypt from "bcryptjs";
import { adminOnly, verifyToken } from "../middleware.js";

const router = express.Router();

//create company
router.post("/company", verifyToken, adminOnly, async (req,res) => {
    try{
        
        const { companyName, username, password, email, contactPerson, phone } = req.body;
        if(!companyName || !username || !password) return res.json({message: "companyName, username and password are required"});
        
        const existing =  await Company.findOne({ username });
        if(existing) return res.json({message: "Username already exists"});

        const hashedPassword = await bcrypt.hash(password, 10);

        const company = new Company({
            companyName, username, email, contactPerson, phone, password: hashedPassword
        });
        const savedCompany = await company.save();
        const { password:_, ...companyData } = savedCompany.toObject();
        res.json(companyData);

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get all companies
router.get("/company/all",  verifyToken, adminOnly, async (req,res) => {
    try{
        const companies = await Company.find().select("-password");
        res.json(companies);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get company by id
router.get("/company/:id",  verifyToken, adminOnly, async (req,res) => {
    try{
        const { id } = req.params;
        const company = await Company.findById(id).select("-password");
        if(!company) return res.status(404).json({ message: "Company not found"});
        res.json(company);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//update company
router.put("/update/company/:id", verifyToken, adminOnly, async (req,res) => {
    try{
        const { id } = req.params;
        const { companyName, email, contactPerson, phone, isActive } = req.body;
        const updatedCompany = await Company.findByIdAndUpdate(
            id, 
            { companyName, email, contactPerson, phone, isActive }, 
            {new: true}).select("-password");

        if (!updatedCompany) return res.status(404).json({ message: "Company not found" });

        res.json(updatedCompany);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//delete company
router.delete("/delete/company/:id",  verifyToken, adminOnly, async(req,res) => {
    try{
        const { id } = req.params;
        const deleted = await Company.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Company not found" });
        res.json({message: "Company deleted successfully"});
    }catch(err){
        res.status(500).json({message: err.message});
    }
});


export default router;