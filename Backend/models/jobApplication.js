import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    jobId:      { type: mongoose.Schema.Types.ObjectId, ref: "JobDescription", required: true },
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    firstName:  { type: String, required: true },
    lastName:   { type: String, required: true },
    email:      { type: String, required: true },
    phone:      { type: String, required: true },
    resumeUrl:  { type: String, required: true },
    resumeMime: { type: String, default: "application/pdf" },
    status:     { type: String, enum: ["Pending", "Reviewed", "Shortlisted", "Rejected"], default: "Pending" },
    aiSummary:  {type: String},
    matchScore: {type: Number, min: 0, max: 100},
    SummaryCreatedAt: {type: Date}

}, { timestamps: true });

export default mongoose.model("JobApplication", applicationSchema);
