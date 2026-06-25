import mongoose from "mongoose";

const jobDescriptionSchema = new mongoose.Schema({

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    location: {
        type: String,
        required: true,
        trim: true
    },

    employmentType: {
      type: String,
      enum: [
        "Full Time",
        "Part Time",
        "Internship",
        "Contract",
        "Remote",
      ],
      required: true,
    },

    experienceRequired: {
        type: String,
        default: ""
    },

    salaryRange: {
        type: String,
        default: ""
    },

    description: {
        type: String,
        default: ""
    },

    responsibilities: [
        {
         type: String
        },
    ],

    requirements: [
        {
         type: String
        },
    ],

    skills: [
        {
         type: String
        },
    ],

    status: {
        type: String,
        enum: ["Active", "Closed"],
        default: "Active"
    },

    createdBy: {
        type: String,
        default: "Admin"
    }
},{timestamps: true});

export default mongoose.model("JobDescription", jobDescriptionSchema);