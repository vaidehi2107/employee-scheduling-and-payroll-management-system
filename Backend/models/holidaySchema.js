import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.ObjectId,
        ref: "Company",
        required: true
    },

    financialYear: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },

    description: String
},{timestamps: true});

// Prevent two holidays on the same date for the same company
holidaySchema.index({ companyId: 1, date: 1 }, { unique: true });

// Speed up the common "get holidays for a financial year" query
holidaySchema.index({ companyId: 1, financialYear: 1 });

export default mongoose.model("Holiday", holidaySchema);