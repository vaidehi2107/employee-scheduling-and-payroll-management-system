import mongoose from "mongoose";

const taxSchema = new mongoose.Schema({

    taxCode: {
        type: String,
        required: true,
        // unique: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    startRange: {
        type: Number,
        required: true,
    },
    endRange: {
        type: Number,
        required: true,
    },
    employeePercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    employerContribution: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
},
    {
        timestamps: true
    });

    taxSchema.index({ taxCode: 1, companyId: 1 }, { unique: true });
export default mongoose.model("Tax", taxSchema);