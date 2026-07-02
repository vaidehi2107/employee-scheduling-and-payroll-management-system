import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    leaveType: {
        type: String,
        enum: ["Paid", "NonPaid"],
        required: true
    },

    fromDate: {
        type: Date,
        required: true
    },

    toDate: {
        type: Date,
        required: true
    },

    totalDays: Number,

    isHalfDay: {
        type: Boolean,
        default: false
    },

    reason: String,

},{timestamps: true});

export default mongoose.model("Leave", leaveSchema);