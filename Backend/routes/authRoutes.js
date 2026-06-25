import express from "express";
import Company from "../models/company.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

//admin login route
router.post("/admin/login", async (req, res) => {
    try{
        const { username, password } = req.body;
        if(!username || !password) return res.status(400).json({message: "username or password required"});

        if(username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD){
            return res.status(401).json({message: "Invalid credentials"});
        }

        const token = jwt.sign(
            {role: "admin"},
            process.env.JWT_SECRET,
            {expiresIn: "1d"}
        );

        res.json({token, role: "admin"});

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//company login 
router.post("/login", async (req,res) => {
    try{
        const { username, password } = req.body;
        if(!username || !password) return res.status(400).json({message: "username or password required"});

        const company = await Company.findOne({ username });
         if (!company)
            return res.status(401).json({ message: "Invalid credentials" });

        if (!company.isActive)
            return res.status(403).json({ message: "Account disabled. Contact admin" });
        
        const isMatch = await bcrypt.compare(password, company.password);
        if (!isMatch)
            return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            {role: "company", companyId: company._id, companyName: company.companyName},
            process.env.JWT_SECRET,
            {expiresIn: "1d"}
        );

        res.json({token, role: "company", companyId: company._id, companyName: company.companyName })
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

router.post("/logout", (req,res) => {
    res.json({message: "Logged Out Successfully!"});
});

export default router;