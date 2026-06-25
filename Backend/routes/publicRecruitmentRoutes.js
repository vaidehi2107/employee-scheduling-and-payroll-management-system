import express from "express";
import JobDescription from "../models/jobDescription.js";
import path from "path";
import multer from "multer";
import JobApplication from "../models/jobApplication.js";
import { analyzeResume } from "../services/geminiService.js";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/resumes/"),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    },
});

const upload = multer({ storage });

// Builds plain-text JD content to feed the AI prompt, matching the JobDescription schema.
const buildJobDescriptionText = (job) => {
    return `
Job Title: ${job.title || ""}
Location: ${job.location || ""}
Employment Type: ${job.employmentType || ""}
Experience Required: ${job.experienceRequired || ""}
Description: ${job.description || ""}
Responsibilities: ${(job.responsibilities || []).join(", ")}
Requirements: ${(job.requirements || []).join(", ")}
Skills: ${(job.skills || []).join(", ")}
`.trim();
};

// Runs in background after response is sent to user
const generateAndSaveSummary = async (applicationId, resumeUrl, jobDescriptionText) => {
    try {

        const filePath = path.join(process.cwd(), resumeUrl.replace(/\//g, path.sep));
        const { summary, matchScore } = await analyzeResume(filePath, jobDescriptionText);
        await JobApplication.findByIdAndUpdate(applicationId, {
            aiSummary: summary,
            matchScore,
            summaryCreatedAt: new Date(),
        });
        console.log(` AI summary + match score saved for application ${applicationId}`);
    } catch (err) {
        console.error(` Summary failed for ${applicationId}:`, err.message);
    }
};

router.get("/jobs/:companyId", async (req,res) => {
    try{
        const { companyId } = req.params;
        const jobs = await JobDescription.find({ companyId, status: "Active" })
        .populate("departmentId", "deptName")
        .populate("companyId", "companyName");
        res.json(jobs);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

router.get("/jobs/:companyId/:jobId", async (req,res) => {
    const { companyId, jobId } = req.params;
    try{
        const job = await JobDescription.findOne({ _id: jobId, companyId, status: "Active" })
        .populate("departmentId", "deptName")
        .populate("companyId", "companyName");
        if (!job) return res.status(404).json({message: "Job not found"});
        res.json(job);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});

router.post("/jobs/:companyId/:jobId/apply", upload.single("resume"), async (req,res) => {
    try{
        //verify job exists
        const { companyId, jobId } = req.params;
        const job = await JobDescription.findOne({ _id: jobId, companyId, status: "Active" });
        if (!job) return res.status(404).json({message: "Job not found"});

        //once job exists then create application
        const { firstName, lastName, email, phone } = req.body;
        const application = await JobApplication.create({
            jobId, companyId, firstName, lastName, email, phone,
            resumeUrl:  `/uploads/resumes/${req.file.filename.replace(/\\/g, "/")}`,
            resumeMime: req.file.mimetype
        });

        // Trigger AI summary + match score in background — does not block user response
        const jdText = buildJobDescriptionText(job);
        generateAndSaveSummary(application._id, application.resumeUrl, jdText);

        res.status(201).json(application);
    }catch(err){
        res.status(500).json({message: err.message});
    }
});
export default router;