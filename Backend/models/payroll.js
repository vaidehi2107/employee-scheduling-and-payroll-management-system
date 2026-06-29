import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
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

    month: {
        type: Number, // 1-12
        required: true
    },

    year: {
        type: Number, // e.g. 2026
        required: true
    },

    // Attendance Summary
    workingDays: {
        type: Number,
        default: 0
    },

    presentDays: {
        type: Number,
        default: 0
    },

    absentDays: {
        type: Number,
        default: 0
    },

    // Salary
    grossEarnings: {
        type: Number,
        default: 0
    },

    dailySalary: {
        type: Number,
        default: 0
    },

    attendanceDeduction: {
        type: Number,
        default: 0
    },

    // Deductions
    pfDeduction: {
        type: Number,
        default: 0
    },

    esicDeduction: {
        type: Number,
        default: 0
    },

    professionalTax: {
        type: Number,
        default: 0
    },

    incomeTax: {
        type: Number,
        default: 0
    },

    totalDeductions: {
        type: Number,
        default: 0
    },

    netPay: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

export default mongoose.model("Payroll", payrollSchema);