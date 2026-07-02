import mongoose from "mongoose";

const leaveLedgerSchema = new mongoose.Schema({
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

    leaveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Leave",
    },

    date: {
        type: Date,
        required: true
    },

    transactionType: {
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true
    },

    source: {
        type: String,
        enum: ["MONTHLY_CREDIT", "LEAVE"],
        required: true
    },

    days: {
        type: Number,
        required: true,
        min: 0.5
    },

    balanceAfter: {
        type: Number,
        required: true,
        min: 0
    }

}, { timestamps: true });

export default mongoose.model("LeaveLedger", leaveLedgerSchema);