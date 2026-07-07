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

    // e.g. "2026-27" — one salary structure per employee per financial year
    financialYear: {
        type: String,
        required: true,
        trim: true
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

    //deductions (payroll — reduce monthly take-home, unrelated to income tax)
    pfPercent: { type: Number, default: 12 },        // % of basicPay
    pfAmount: { type: Number, default: 0 },

    esicPercent: { type: Number, default: 0.75 },    // % of grossEarnings
    esicAmount: { type: Number, default: 0 },
    
    professionalTax: {type: Number, default: 200},

    grossEarnings: {type: Number, default: 0},
    totalDeductions: {type: Number, default: 0},
    netPay: {type: Number, default: 0},

    // ── Income tax — regime choice + declared deductions for this financial year ──
    taxRegime: {
        type: String,
        enum: ["old", "new"],
        default: null
    },

    // Declared inputs used to compute old-vs-new regime tax comparison.
    // These do NOT affect netPay/grossEarnings — they only feed the tax-comparison calculation.
    deductions: {
        section80C: { type: Number, default: 0 },       // ELSS, PPF, EPF, life insurance etc. — capped at 150000
        section80D: { type: Number, default: 0 },        // health insurance premiums — capped at 75000
        section80CCD1B: { type: Number, default: 0 },    // NPS contribution — capped at 50000
        section24b: { type: Number, default: 0 },        // home loan interest — capped at 200000
        section80E: { type: Number, default: 0 },        // education loan interest — uncapped
        lta: { type: Number, default: 0 },                // leave travel allowance claimed — uncapped
        rentPaid: { type: Number, default: 0 },            // monthly rent paid — used to compute HRA exemption
        isMetroCity: { type: Boolean, default: false }      // used to compute HRA exemption (50% vs 40% rule)
    }
},{timestamps: true});

// One salary structure per employee per financial year — no duplicates
salarySchema.index({ employeeId: 1, financialYear: 1 }, { unique: true });

export default mongoose.model("Salary", salarySchema);