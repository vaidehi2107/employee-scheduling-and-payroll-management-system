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
    
    periodStart: { type: Date, required: true },
    periodEnd:   { type: Date, required: true },

    regularHours:   Number,
    overtimeHours:  Number,
    grossEarnings:  Number,   // sum of totalEarnings from attendance

    taxId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tax",
    },
    taxCode:              String,
    employeePercentage:   Number,
    employerContribution: Number,
    taxDeduction:         Number,   // grossEarnings * employeePercentage / 100
    employerTaxAmount:    Number,   // grossEarnings * employerContribution / 100
    netPay:               Number,   // grossEarnings - taxDeduction
}, {timestamps: true});

export default mongoose.model("Payroll", payrollSchema);