import express from "express";
import Department from "../models/department.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

//Create Department
router.post("/dept/add", verifyToken, async (req,res) => {
    try{
        const department = new Department({ ...req.body, companyId: req.companyId });
        //check if dept already exists
        const existing = await Department.findOne({
            deptName: req.body.deptName,
            companyId: req.companyId
        });

        if (existing) {
            return res.status(400).json({message: "Department already exists"});
        }
        const savedDept = await department.save();
        res.json(savedDept);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get all deptartments
router.get("/departments", verifyToken, async (req,res) => {
    try{
        const departments = await Department.find({ companyId: req.companyId });
        res.json(departments);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get dept by id
router.get("/dept/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const dept = await Department.findOne({ _id: id, companyId: req.companyId });
        if(!dept) return res.status(404).json({message: "Dept not found!"});
        res.json(dept);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//Update dept
router.put("/dept/update/:id", verifyToken, async(req,res) => {
    try{
        const { id } = req.params;
        const updatedDept = await Department.findOneAndUpdate(
            { _id: id, companyId: req.companyId }, 
            req.body, 
            {new:true});
        res.json(updatedDept);

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//Delete dept
router.delete("/dept/delete/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        await Department.findOneAndDelete({ _id: id, companyId: req.companyId });
        res.json({message: "Department deleted successfully"});
    }catch(err){
        res.status(500).json({message: err.message});
    }
});
export default router;