// Pure calculation functions for payroll and income-tax logic.

// ── Income-tax constants (change here if a future budget updates these) ──
export const STANDARD_DEDUCTION_OLD = 50000;
export const STANDARD_DEDUCTION_NEW = 75000;
export const DEDUCTION_CAPS = {
    section80C: 150000,
    section80D: 75000,
    section80CCD1B: 50000,
    section24b: 200000
};

// ── Payroll calculation (basic pay / DA / HRA -> gross, PF, ESIC, net pay) ──
export const calculateSalary = (data) => {
    const basicPay = data.basicPay || 0;
    const da = data.da || 0;
    const hra = data.hra || 0;
    const pfPercent = data.pfPercent ?? 12;
    const esicPercent = data.esicPercent ?? 0.75;
    const professionalTax = data.professionalTax ?? 200;
    const negotiatedSalary = data.negotiatedSalary;

    const fixedComponents = basicPay + da + hra;
    const specialAllowance = negotiatedSalary - fixedComponents;

    if (specialAllowance < 0) {
        throw new Error("Basic Pay + DA + HRA exceed negotiated salary");
    }

    // by construction, grossEarnings always equals negotiatedSalary
    const grossEarnings = fixedComponents + specialAllowance;

    const pfAmount = Math.round((pfPercent / 100) * basicPay);

    // ESIC only applies if gross earnings are within the statutory wage limit
    const esicAmount = grossEarnings <= 21000
        ? Math.round((esicPercent / 100) * grossEarnings)
        : 0;

    const totalDeductions = pfAmount + esicAmount + professionalTax;
    const netPay = grossEarnings - totalDeductions;

    return { specialAllowance, grossEarnings, pfAmount, esicAmount, totalDeductions, netPay };
};

// ── Income-tax comparison helpers ──

// Clamp a declared deduction amount between 0 and its statutory cap
export const capped = (value, cap) => Math.min(Math.max(value || 0, 0), cap);

// HRA exemption = least of: HRA received, rent paid minus 10% of Basic+DA, 50%/40% of Basic+DA.
// All inputs here are MONTHLY figures (matching how basicPay/da/hra/rentPaid are stored);
// the result is annualized at the end since tax is calculated on annual income.
export const calculateHRAExemption = ({ hra, basicPay, da, rentPaid, isMetroCity }) => {
    const monthlyBasicDA = (basicPay || 0) + (da || 0);
    const rentMinusTenPercent = Math.max((rentPaid || 0) - 0.10 * monthlyBasicDA, 0);
    const percentOfBasicDA = (isMetroCity ? 0.50 : 0.40) * monthlyBasicDA;

    const monthlyExemption = Math.min(hra || 0, rentMinusTenPercent, percentOfBasicDA);
    return Math.round(monthlyExemption * 12);
};

// Progressive slab tax calculator — taxes only the portion of income that falls
// within each slab's range, not the whole income at one bracket's rate.
// A slab with endRange === null is treated as open-ended ("and above").
export const calculateSlabTax = (taxableIncome, slabs) => {
    const sortedSlabs = [...slabs].sort((a, b) => a.startRange - b.startRange);
    let totalTax = 0;
    const breakdown = [];

    for (const slab of sortedSlabs) {
        if (taxableIncome <= slab.startRange) continue;

        const slabTop = slab.endRange == null ? taxableIncome : Math.min(slab.endRange, taxableIncome);
        const taxableInSlab = Math.max(slabTop - slab.startRange, 0);
        if (taxableInSlab <= 0) continue;

        const taxInSlab = Math.round((taxableInSlab * slab.employeePercentage) / 100);
        totalTax += taxInSlab;
        breakdown.push({
            startRange: slab.startRange,
            endRange: slab.endRange,
            rate: slab.employeePercentage,
            taxableAmount: taxableInSlab,
            tax: taxInSlab
        });
    }

    return { totalTax, breakdown };
};

// ── Full old-vs-new regime comparison for one salary record + its matching Tax docs ──
// Kept here (rather than only inline in the route) so any future caller — a payroll
// run, a script, a test — can get the same comparison without hitting the route.
export const compareRegimes = ({ salary, oldTaxDoc, newTaxDoc }) => {
    const annualGrossEarnings = (salary.grossEarnings || 0) * 12;
    const d = salary.deductions || {};

    const hraExemption = calculateHRAExemption({
        hra: salary.hra || 0,
        basicPay: salary.basicPay || 0,
        da: salary.da || 0,
        rentPaid: d.rentPaid || 0,
        isMetroCity: !!d.isMetroCity
    });

    // Old regime: standard deduction + HRA exemption + capped declared deductions
    const oldDeductions = {
        standardDeduction: STANDARD_DEDUCTION_OLD,
        hraExemption,
        section80C: capped(d.section80C, DEDUCTION_CAPS.section80C),
        section80D: capped(d.section80D, DEDUCTION_CAPS.section80D),
        section80CCD1B: capped(d.section80CCD1B, DEDUCTION_CAPS.section80CCD1B),
        section24b: capped(d.section24b, DEDUCTION_CAPS.section24b),
        section80E: Math.max(d.section80E || 0, 0),
        lta: Math.max(d.lta || 0, 0)
    };
    const oldTotalDeductions = Object.values(oldDeductions).reduce((sum, v) => sum + v, 0);
    const oldTaxableIncome = Math.max(annualGrossEarnings - oldTotalDeductions, 0);
    const oldResult = calculateSlabTax(oldTaxableIncome, oldTaxDoc.slabs);

    // New regime: only the standard deduction applies
    const newDeductions = { standardDeduction: STANDARD_DEDUCTION_NEW };
    const newTotalDeductions = STANDARD_DEDUCTION_NEW;
    const newTaxableIncome = Math.max(annualGrossEarnings - newTotalDeductions, 0);
    const newResult = calculateSlabTax(newTaxableIncome, newTaxDoc.slabs);

    const oldNetAnnual = annualGrossEarnings - oldResult.totalTax;
    const newNetAnnual = annualGrossEarnings - newResult.totalTax;

    return {
        financialYear: salary.financialYear,
        annualGrossEarnings,
        old: {
            deductions: oldDeductions,
            totalDeductions: oldTotalDeductions,
            taxableIncome: oldTaxableIncome,
            totalTax: oldResult.totalTax,
            breakdown: oldResult.breakdown,
            netAnnual: oldNetAnnual,
            netMonthly: Math.round(oldNetAnnual / 12)
        },
        new: {
            deductions: newDeductions,
            totalDeductions: newTotalDeductions,
            taxableIncome: newTaxableIncome,
            totalTax: newResult.totalTax,
            breakdown: newResult.breakdown,
            netAnnual: newNetAnnual,
            netMonthly: Math.round(newNetAnnual / 12)
        },
        betterRegime: oldResult.totalTax <= newResult.totalTax ? "old" : "new"
    };
};