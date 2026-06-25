import express from "express";
import JobDescription from "../models/jobDescription.js";
import { verifyToken } from "../middleware.js";
const router = express.Router();

//create JD
router.post("/recruitment/jobs", verifyToken, async (req,res) => {
    try{
        const job = new JobDescription({ ...req.body, companyId: req.companyId });
        const savedJob = await job.save();
        res.json(savedJob);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get all jobs
router.get("/recruitment/jobs", verifyToken, async (req,res) => {
    try{
        const jobs = await JobDescription.find({companyId: req.companyId})
        .populate("companyId", "companyName")
        .populate("departmentId", "deptName")
        .sort({ createdAt: -1 });;
        res.json(jobs);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//get job by id
router.get("/recruitment/jobs/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const job = await JobDescription.findOne({_id: id ,companyId: req.companyId}).populate("companyId", "companyName");

        if(!job) return res.status(404).json({message: "Job Description not found"});

        res.json(job);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//update job
router.put("/recruitment/jobs/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        const updatedJob = await JobDescription.findOneAndUpdate(
            { _id: id, companyId: req.companyId }, 
            req.body, 
            {new:true});
        if (!updatedJob) return res.status(404).json({ message: "Job Description not found" });
        res.json(updatedJob);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

//delete job
router.delete("/recruitment/jobs/:id", verifyToken, async (req,res) => {
    try{
        const { id } = req.params;
        await JobDescription.findOneAndDelete({ _id: id, companyId: req.companyId });
        res.json({message: "Job Deleted Successfully"});
    }catch(err){
        res.status(500).json({message: err.message});
    }
});
export default router;