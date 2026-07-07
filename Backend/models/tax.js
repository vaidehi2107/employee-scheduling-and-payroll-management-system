import mongoose from "mongoose";

const slabSchema = new mongoose.Schema({
    startRange: {
        type: Number,
        required: true,
    },
    endRange: {
        type: Number,
        default: null ,
    },
    employeePercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
}, { _id: false });

const taxSchema = new mongoose.Schema({

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    // e.g. "2026-27"
    financialYear: {
        type: String,
        required: true,
        trim: true
    },

    regime: {
        type: String,
        enum: ["old", "new"],
        required: true
    },

    slabs: {
        type: [slabSchema],
        required: true,
        validate: v => Array.isArray(v) && v.length > 0
    },

},
    {
        timestamps: true
    });

// One regime's slab table per company per financial year — no duplicates
taxSchema.index({ companyId: 1, financialYear: 1, regime: 1 }, { unique: true });

export default mongoose.model("Tax", taxSchema);