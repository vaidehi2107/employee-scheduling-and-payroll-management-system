import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import JobApplication from "../models/jobApplication.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/resumes/"),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    },
});
const upload = multer({ storage });

// Create and save application
router.post("/recruitment/applications", verifyToken, upload.single("resume"), async (req, res) => {
    try {
        const { jobId, companyId, firstName, lastName, email, phone } = req.body;
        const application = await JobApplication.create({
            jobId, companyId, firstName, lastName, email, phone,
            resumeUrl: `/uploads/resumes/${req.file.filename.replace(/\\/g, "/")}`,
            resumeMime: req.file.mimetype,
        });
        res.status(201).json(application);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all applications
router.get("/recruitment/applications", verifyToken, async (req, res) => {
    try {
        const apps = await JobApplication.find({ companyId: req.companyId })
            .populate("jobId", "title");
        const validApps = apps.filter(app => app.jobId);
        res.json(validApps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Status update
router.patch("/recruitment/applications/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const app = await JobApplication.findOneAndUpdate(
            { _id: id, companyId: req.companyId },
            { status: req.body.status },
            { new: true }
        );
        res.json(app);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Serve resume file
router.get("/recruitment/applications/:id/resume", async (req, res) => {
    try {
        const { id } = req.params;
        const app = await JobApplication.findById(id);
        if (!app) return res.status(404).json({ message: "Application not found." });

        const filePath = path.join(process.cwd(), app.resumeUrl.replace(/\//g, path.sep));
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found." });

        res.setHeader("Content-Type", app.resumeMime || "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;