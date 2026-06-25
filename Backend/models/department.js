import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    deptName: {
        type: String,
        required: true,
        trim: true
    },

    jobTitles: [{
        type: String,
        trim: true
    }]

},{timestamps: true});

export default mongoose.model("Department", departmentSchema);