import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema({
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

    year: {
        type: Number,
        required: true
    },

    totalCredited: {
        type: Number,
        default: 0
    },

    totalUsed: {
        type: Number,
        default: 0
    },

    currentBalance: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

// One balance record per employee per year
leaveBalanceSchema.index(
    { employeeId: 1, companyId: 1, year: 1 },
    { unique: true }
);

export default mongoose.model("LeaveBalance", leaveBalanceSchema);