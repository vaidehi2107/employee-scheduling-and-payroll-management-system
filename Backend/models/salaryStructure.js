import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
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

    negotiatedSalary: {
        type: Number,
        required: true
    },

    //earnings
    basicPay : {type: Number, required: true, default: 0},
    da: {type: Number, default: 0},
    hra: {type: Number, default: 0},
    specialAllowance: {type: Number, default: 0},

    //deductions
    pfPercent: { type: Number, default: 12 },        // % of basicPay
    pfAmount: { type: Number, default: 0 },

    esicPercent: { type: Number, default: 0.75 },    // % of grossEarnings
    esicAmount: { type: Number, default: 0 },
    
    professionalTax: {type: Number, default: 200},

    grossEarnings: {type: Number, default: 0},
    totalDeductions: {type: Number, default: 0},
    netPay: {type: Number, default: 0}
},{timestamps: true});

export default mongoose.model("Salary", salarySchema);