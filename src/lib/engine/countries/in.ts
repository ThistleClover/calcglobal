// src/lib/engine/countries/in.ts
// India Financial Calculator Engine — FY 2025-26 / AY 2026-27
// Sources: Income Tax Department (incometax.gov.in), Finance Act, Payment of Gratuity Act 1972, GST Council

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'income-tax-new-vs-old-regime-india');

  switch (calcId) {
    case 'gratuity-act-calculation-india':
      return calculateGratuity(inputs);
    case 'section-44ada-44ad-presumptive-taxation-india':
      return calculatePresumptiveTax(inputs);
    case 'stamp-duty-property-registration-tds-194ia-india':
      return calculateStampDuty(inputs);
    case 'gst-composition-vs-regular-tax-calculator-india':
      return calculateGstScheme(inputs);
    case 'income-tax-new-vs-old-regime-india':
    default:
      return calculateIncomeTax(inputs);
  }
}

// 1. Income Tax: New vs Old Regime (FY 2025-26 / AY 2026-27)
function calculateIncomeTax(inputs: TaxInput): TaxResult {
  const grossSalary = safeVal(
    inputs.gross_annual_salary ?? inputs.gross_annual ?? inputs.annual_salary ?? inputs.income ?? inputs.gross_income
  );

  if (grossSalary <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Gross Annual Income (कुल वार्षिक आय)', value: 0 },
        { label: 'Tax Payable (देय आयकर)', value: 0 },
        { label: 'Net Take-Home Pay (शुद्ध इन-हैंड वेतन)', value: 0, isFinal: true },
      ],
      currency: 'INR',
      currencySymbol: '₹',
      additionalInsights: ['Please enter your gross annual salary to calculate tax liability.'],
    };
  }

  const ageGroup = String(inputs.age_category || 'below_60');
  const basicSalary = safeVal(inputs.basic_salary_annual, 0, grossSalary);
  const hraReceived = safeVal(inputs.hra_received_annual, 0, grossSalary);
  const rentPaid = safeVal(inputs.rent_paid_annual, 0, grossSalary);
  const isMetro = String(inputs.is_metro_city || 'no') === 'yes';
  const sec80C = safeVal(inputs.section_80c, 0, 150000); // capped at 1.5L
  const sec80D = safeVal(inputs.section_80d_health_insurance, 0, 100000);
  const homeLoan24b = safeVal(inputs.home_loan_interest_24b, 0, 200000); // capped at 2L
  const otherDeductions = safeVal(inputs.other_deductions_chapter_via, 0);

  // --- NEW REGIME (Default FY 2025-26) ---
  // Standard Deduction: ₹75,000 under latest Finance Act
  const newStdDeduction = Math.min(grossSalary, 75000);
  const newTaxableIncome = Math.max(0, grossSalary - newStdDeduction);

  let newTaxBeforeRebate = 0;
  if (newTaxableIncome > 1500000) {
    newTaxBeforeRebate += (newTaxableIncome - 1500000) * 0.30;
    newTaxBeforeRebate += 300000 * 0.20; // 12L-15L
    newTaxBeforeRebate += 200000 * 0.15; // 10L-12L
    newTaxBeforeRebate += 300000 * 0.10; // 7L-10L
    newTaxBeforeRebate += 400000 * 0.05; // 3L-7L
  } else if (newTaxableIncome > 1200000) {
    newTaxBeforeRebate += (newTaxableIncome - 1200000) * 0.20;
    newTaxBeforeRebate += 200000 * 0.15;
    newTaxBeforeRebate += 300000 * 0.10;
    newTaxBeforeRebate += 400000 * 0.05;
  } else if (newTaxableIncome > 1000000) {
    newTaxBeforeRebate += (newTaxableIncome - 1000000) * 0.15;
    newTaxBeforeRebate += 300000 * 0.10;
    newTaxBeforeRebate += 400000 * 0.05;
  } else if (newTaxableIncome > 700000) {
    newTaxBeforeRebate += (newTaxableIncome - 700000) * 0.10;
    newTaxBeforeRebate += 400000 * 0.05;
  } else if (newTaxableIncome > 300000) {
    newTaxBeforeRebate += (newTaxableIncome - 300000) * 0.05;
  }

  // Section 87A Rebate in New Regime: Taxable income up to ₹7,00,000 gets 100% rebate (up to ₹25,000)
  let newRebate87A = 0;
  if (newTaxableIncome <= 700000) {
    newRebate87A = newTaxBeforeRebate;
  }
  const newTaxAfterRebate = Math.max(0, newTaxBeforeRebate - newRebate87A);
  const newCess = newTaxAfterRebate * 0.04;
  const newTotalTax = newTaxAfterRebate + newCess;

  // --- OLD REGIME ---
  const oldStdDeduction = Math.min(grossSalary, 50000);
  // HRA Exemption = min(HRA received, Rent Paid - 10% Basic, 50% Basic if metro else 40% Basic)
  let hraExemption = 0;
  if (basicSalary > 0 && rentPaid > 0 && hraReceived > 0) {
    const rentExcess = Math.max(0, rentPaid - 0.10 * basicSalary);
    const basicRatio = isMetro ? 0.50 * basicSalary : 0.40 * basicSalary;
    hraExemption = Math.min(hraReceived, rentExcess, basicRatio);
  }

  const oldTotalDeductions = oldStdDeduction + hraExemption + sec80C + sec80D + homeLoan24b + otherDeductions;
  const oldTaxableIncome = Math.max(0, grossSalary - oldTotalDeductions);

  // Slabs for Old Regime based on age
  let oldExemptionLimit = 250000;
  if (ageGroup === 'senior_60_to_80') oldExemptionLimit = 300000;
  if (ageGroup === 'super_senior_above_80') oldExemptionLimit = 500000;

  let oldTaxBeforeRebate = 0;
  if (oldTaxableIncome > 1000000) {
    oldTaxBeforeRebate += (oldTaxableIncome - 1000000) * 0.30;
    oldTaxBeforeRebate += 500000 * 0.20;
    if (oldExemptionLimit === 250000) {
      oldTaxBeforeRebate += 250000 * 0.05;
    } else if (oldExemptionLimit === 300000) {
      oldTaxBeforeRebate += 200000 * 0.05;
    }
  } else if (oldTaxableIncome > 500000) {
    oldTaxBeforeRebate += (oldTaxableIncome - 500000) * 0.20;
    if (oldExemptionLimit === 250000) {
      oldTaxBeforeRebate += 250000 * 0.05;
    } else if (oldExemptionLimit === 300000) {
      oldTaxBeforeRebate += 200000 * 0.05;
    }
  } else if (oldTaxableIncome > oldExemptionLimit) {
    oldTaxBeforeRebate += (oldTaxableIncome - oldExemptionLimit) * 0.05;
  }

  // Section 87A rebate in Old Regime: Taxable income <= ₹5,00,000 gets up to ₹12,500 rebate
  let oldRebate87A = 0;
  if (oldTaxableIncome <= 500000) {
    oldRebate87A = Math.min(oldTaxBeforeRebate, 12500);
  }
  const oldTaxAfterRebate = Math.max(0, oldTaxBeforeRebate - oldRebate87A);
  const oldCess = oldTaxAfterRebate * 0.04;
  const oldTotalTax = oldTaxAfterRebate + oldCess;

  const isNewBetter = newTotalTax <= oldTotalTax;
  const recommendedTax = Math.min(newTotalTax, oldTotalTax);
  const taxSavings = Math.abs(oldTotalTax - newTotalTax);
  const netIncome = grossSalary - recommendedTax;
  const effectiveRate = grossSalary > 0 ? recommendedTax / grossSalary : 0;

  const breakdown = [
    { label: 'Gross Annual Salary (कुल वार्षिक वेतन)', value: grossSalary },
    { label: 'New Regime Standard Deduction (₹75,000)', value: newStdDeduction, isDeduction: true },
    { label: 'New Regime Taxable Income', value: newTaxableIncome, isTotal: true },
    { label: 'New Regime Total Tax (including 4% Cess)', value: newTotalTax, isDeduction: true },
    { label: 'Old Regime Total Deductions (80C, 80D, HRA, etc.)', value: oldTotalDeductions, isDeduction: true },
    { label: 'Old Regime Taxable Income', value: oldTaxableIncome, isTotal: true },
    { label: 'Old Regime Total Tax (including 4% Cess)', value: oldTotalTax, isDeduction: true },
    {
      label: isNewBetter
        ? `Tax Savings with New Regime: ₹${Math.round(taxSavings).toLocaleString('en-IN')}`
        : `Tax Savings with Old Regime: ₹${Math.round(taxSavings).toLocaleString('en-IN')}`,
      value: taxSavings,
    },
    { label: 'Net Annual Take-Home Pay (Optimized)', value: netIncome, isFinal: true },
    { label: 'Monthly In-Hand Salary (मासिक वेतन)', value: Math.round(netIncome / 12), isTotal: true },
  ];

  const insights = [
    isNewBetter
      ? `The New Tax Regime is more beneficial for you, saving ₹${Math.round(taxSavings).toLocaleString('en-IN')} in tax.`
      : `The Old Tax Regime saves you ₹${Math.round(taxSavings).toLocaleString('en-IN')} thanks to your total deductions of ₹${Math.round(oldTotalDeductions).toLocaleString('en-IN')}.`,
    `Under the New Tax Regime, total income up to ₹7,75,000 incurs ZERO tax thanks to the ₹75,000 Standard Deduction and Section 87A rebate.`,
    `Health and Education Cess is 4% applied on the income tax liability in both regimes.`,
  ];

  return {
    grossIncome: grossSalary,
    netIncome,
    totalTax: recommendedTax,
    effectiveRate,
    breakdown,
    currency: 'INR',
    currencySymbol: '₹',
    quarterlyPayment: Math.round(recommendedTax / 4),
    additionalInsights: insights,
  };
}

// 2. Payment of Gratuity Act 1972
function calculateGratuity(inputs: TaxInput): TaxResult {
  const lastBasicDa = safeVal(inputs.last_drawn_basic_da ?? inputs.basic_salary);
  const years = safeVal(inputs.completed_years_service ?? inputs.years);
  const months = safeVal(inputs.additional_months_service ?? inputs.months);
  const isCovered = String(inputs.is_covered_under_gratuity_act || 'covered') !== 'not_covered';

  if (lastBasicDa <= 0 || (years === 0 && months < 6)) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Last Drawn Basic + DA', value: 0 },
        { label: 'Total Gratuity Payable', value: 0, isFinal: true },
      ],
      currency: 'INR',
      currencySymbol: '₹',
      additionalInsights: ['Minimum 5 years of continuous service is generally required for gratuity eligibility.'],
    };
  }

  let effectiveTenure = years;
  let gratuityAmount = 0;

  if (isCovered) {
    // If covered: additional months > 6 counts as 1 full year; formula = (15 * Basic * Tenure) / 26
    if (months > 6) effectiveTenure += 1;
    gratuityAmount = (15 * lastBasicDa * effectiveTenure) / 26;
  } else {
    // If not covered: full years only; formula = (15 * Basic * Tenure) / 30
    gratuityAmount = (15 * lastBasicDa * effectiveTenure) / 30;
  }

  // Statutory exemption cap under Section 10(10): ₹20,00,000 (20 Lakhs)
  const maxExemption = 2000000;
  const exemptGratuity = Math.min(gratuityAmount, maxExemption);
  const taxableGratuity = Math.max(0, gratuityAmount - maxExemption);
  // Estimate tax on taxable portion at 30% slab rate
  const estimatedTax = taxableGratuity * 0.312; // 30% + 4% cess

  const netGratuity = gratuityAmount - estimatedTax;

  const breakdown = [
    { label: 'Last Drawn Monthly Basic + DA', value: lastBasicDa },
    { label: `Effective Service Tenure (${effectiveTenure} years)`, value: effectiveTenure },
    { label: 'Gross Gratuity Entitlement (ग्रेच्युटी राशि)', value: gratuityAmount, isTotal: true },
    { label: 'Tax-Exempt Amount under Section 10(10) (Max ₹20 Lakhs)', value: exemptGratuity },
    ...(taxableGratuity > 0 ? [{ label: 'Taxable Gratuity Exceeding ₹20L Limit', value: taxableGratuity, isDeduction: true }] : []),
    ...(estimatedTax > 0 ? [{ label: 'Estimated Tax on Excess Gratuity (30% + Cess)', value: estimatedTax, isDeduction: true }] : []),
    { label: 'Net Gratuity Payable in Hand', value: netGratuity, isFinal: true },
  ];

  return {
    grossIncome: gratuityAmount,
    netIncome: netGratuity,
    totalTax: estimatedTax,
    effectiveRate: gratuityAmount > 0 ? estimatedTax / gratuityAmount : 0,
    breakdown,
    currency: 'INR',
    currencySymbol: '₹',
    additionalInsights: [
      `Under Section 10(10) of the Income Tax Act, gratuity up to ₹20,00,000 is 100% tax-free.`,
      isCovered
        ? `Calculation formula for covered establishments: (15 × Last Basic & DA × Service Years) ÷ 26 working days.`
        : `Calculation formula for non-covered establishments: (15 × Last Basic & DA × Completed Years) ÷ 30 calendar days.`,
      `Continuous service of 5 years is mandatory, except in cases of death or permanent disability of the employee.`,
    ],
  };
}

// 3. Section 44ADA / 44AD Presumptive Taxation
function calculatePresumptiveTax(inputs: TaxInput): TaxResult {
  const turnover = safeVal(inputs.gross_turnover_receipts ?? inputs.turnover);
  const schemeType = String(inputs.scheme_type || '44ada_professionals');
  const actualExpenses = safeVal(inputs.actual_expenses_estimate, 0);
  const otherIncome = safeVal(inputs.other_income, 0);

  if (turnover <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Receipts / Turnover', value: 0 }],
      currency: 'INR',
      currencySymbol: '₹',
    };
  }

  let presumptiveRate = 0.50; // default 50% for 44ADA
  let maxTurnoverLimit = 7500000; // 75L for 44ADA if 95% digital

  if (schemeType === '44ad_business_digital') {
    presumptiveRate = 0.06; // 6% for digital transactions
    maxTurnoverLimit = 30000000; // 3 Cr
  } else if (schemeType === '44ad_business_cash') {
    presumptiveRate = 0.08; // 8% for cash transactions
    maxTurnoverLimit = 20000000; // 2 Cr
  }

  const presumptiveIncome = turnover * presumptiveRate;
  const totalTaxableIncome = presumptiveIncome + otherIncome;

  // Calculate tax using New Tax Regime slabs
  let tax = 0;
  if (totalTaxableIncome > 1500000) {
    tax = (totalTaxableIncome - 1500000) * 0.30 + 140000;
  } else if (totalTaxableIncome > 1200000) {
    tax = (totalTaxableIncome - 1200000) * 0.20 + 80000;
  } else if (totalTaxableIncome > 1000000) {
    tax = (totalTaxableIncome - 1000000) * 0.15 + 50000;
  } else if (totalTaxableIncome > 700000) {
    tax = (totalTaxableIncome - 700000) * 0.10 + 20000;
  } else if (totalTaxableIncome > 300000) {
    tax = (totalTaxableIncome - 300000) * 0.05;
  }

  // 87A rebate for income <= 7L
  if (totalTaxableIncome <= 700000) tax = 0;

  const cess = tax * 0.04;
  const totalTax = tax + cess;
  const netEarnings = turnover - totalTax - actualExpenses;

  const breakdown = [
    { label: 'Gross Receipts / Turnover (सकल प्राप्तियां)', value: turnover },
    { label: `Deemed Presumptive Profit (${(presumptiveRate * 100).toFixed(0)}%)`, value: presumptiveIncome, isTotal: true },
    ...(otherIncome > 0 ? [{ label: 'Other Taxable Income', value: otherIncome }] : []),
    { label: 'Total Taxable Income (Presumptive)', value: totalTaxableIncome, isTotal: true },
    { label: 'Income Tax on Presumptive Income', value: tax, isDeduction: true },
    { label: 'Health & Education Cess (4%)', value: cess, isDeduction: true },
    { label: 'Total Tax Liability', value: totalTax, isDeduction: true },
    ...(actualExpenses > 0 ? [{ label: 'Actual Operating Expenses Incurred', value: actualExpenses, isDeduction: true }] : []),
    { label: 'Net Take-Home Profit (शुद्ध लाभ)', value: netEarnings, isFinal: true },
  ];

  return {
    grossIncome: turnover,
    netIncome: netEarnings,
    totalTax,
    effectiveRate: turnover > 0 ? totalTax / turnover : 0,
    breakdown,
    currency: 'INR',
    currencySymbol: '₹',
    quarterlyPayment: totalTax, // Advance tax 100% due by March 15 under 44AD/44ADA
    additionalInsights: [
      `Under Section ${schemeType.startsWith('44ada') ? '44ADA' : '44AD'}, no books of accounts or tax audit required under Section 44AB.`,
      `100% of the advance tax can be paid in a single installment on or before March 15 of the financial year.`,
      turnover > maxTurnoverLimit
        ? `Warning: Turnover exceeds ₹${(maxTurnoverLimit / 10000000).toFixed(1)} Crore limit. Mandatory tax audit under Section 44AB applies.`
        : `Turnover is within the statutory presumptive ceiling of ₹${(maxTurnoverLimit / 10000000).toFixed(1)} Crore.`,
    ],
  };
}

// 4. Stamp Duty, Registration & TDS 194-IA
function calculateStampDuty(inputs: TaxInput): TaxResult {
  const agreementValue = safeVal(inputs.property_agreement_value ?? inputs.property_price);
  const circleRateValue = safeVal(inputs.guidance_value_circle_rate, 0);
  const taxableValue = Math.max(agreementValue, circleRateValue);
  const state = String(inputs.state_location || 'maharashtra_mumbai');
  const gender = String(inputs.buyer_gender || 'male');

  if (taxableValue <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Property Value', value: 0 }],
      currency: 'INR',
      currencySymbol: '₹',
    };
  }

  let stampRate = 0.05;
  let regFee = Math.min(30000, taxableValue * 0.01);

  if (state.includes('maharashtra')) {
    stampRate = gender === 'female' ? 0.05 : 0.06; // 5% + 1% metro cess
    regFee = Math.min(30000, taxableValue * 0.01);
  } else if (state.includes('karnataka')) {
    stampRate = 0.056; // 5% + 10% cess
    regFee = taxableValue * 0.01;
  } else if (state.includes('delhi')) {
    stampRate = gender === 'female' ? 0.04 : gender === 'joint' ? 0.05 : 0.06;
    regFee = taxableValue * 0.01;
  } else if (state.includes('tamil_nadu')) {
    stampRate = 0.07;
    regFee = taxableValue * 0.02;
  } else if (state.includes('telangana')) {
    stampRate = 0.055 + 0.015; // 7.0%
    regFee = taxableValue * 0.005;
  } else if (state.includes('uttar_pradesh')) {
    stampRate = gender === 'female' ? 0.06 : 0.07;
    regFee = Math.min(20000, taxableValue * 0.01);
  } else if (state.includes('west_bengal')) {
    stampRate = taxableValue > 4000000 ? 0.06 : 0.05;
    regFee = taxableValue * 0.01;
  }

  const stampDutyAmount = taxableValue * stampRate;
  // TDS under Section 194-IA: 1% if property value >= ₹50 Lakhs
  const isTdsApplicable = taxableValue >= 5000000;
  const tdsAmount = isTdsApplicable ? taxableValue * 0.01 : 0;
  const totalGovtCharges = stampDutyAmount + regFee + tdsAmount;
  const totalCostOfAcquisition = taxableValue + stampDutyAmount + regFee;

  const breakdown = [
    { label: 'Property Taxable Value (उच्चतम: करार या सर्किल दर)', value: taxableValue },
    { label: `Stamp Duty Stamp Duty (${(stampRate * 100).toFixed(1)}%)`, value: stampDutyAmount, isDeduction: true },
    { label: 'Registration Charges (पंजीकरण शुल्क)', value: regFee, isDeduction: true },
    ...(isTdsApplicable
      ? [{ label: 'TDS under Section 194-IA (1% to be deducted by Buyer)', value: tdsAmount, isDeduction: true }]
      : []),
    { label: 'Total Government Taxes & Fees (कुल सरकारी शुल्क)', value: totalGovtCharges, isTotal: true },
    { label: 'Total Acquisition Cost of Property', value: totalCostOfAcquisition, isFinal: true },
  ];

  return {
    grossIncome: taxableValue,
    netIncome: totalCostOfAcquisition,
    totalTax: totalGovtCharges,
    effectiveRate: totalGovtCharges / taxableValue,
    breakdown,
    currency: 'INR',
    currencySymbol: '₹',
    additionalInsights: [
      isTdsApplicable
        ? `Mandatory TDS of 1% (₹${Math.round(tdsAmount).toLocaleString('en-IN')}) must be deposited using Form 26QB within 30 days of transaction.`
        : `Property value is below ₹50 Lakhs; Section 194-IA 1% TDS deduction is not applicable.`,
      `Stamp duty must be paid before or at the time of deed execution to ensure clear legal title.`,
    ],
  };
}

// 5. GST Composition Scheme vs Regular Scheme
function calculateGstScheme(inputs: TaxInput): TaxResult {
  const turnover = safeVal(inputs.annual_turnover ?? inputs.turnover);
  const businessType = String(inputs.business_type || 'traders_manufacturers');
  const purchases = safeVal(inputs.input_purchases_annual, 0);
  const inputRate = safeVal(inputs.input_gst_rate || '18') / 100;
  const outputRate = safeVal(inputs.output_gst_rate || '18') / 100;

  if (turnover <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Annual Turnover', value: 0 }],
      currency: 'INR',
      currencySymbol: '₹',
    };
  }

  // Composition Scheme Tax Rate
  let compositionRate = 0.01; // 1% for traders & manufacturers
  if (businessType === 'restaurant_services') {
    compositionRate = 0.05; // 5% for restaurants
  } else if (businessType === 'other_service_providers') {
    compositionRate = 0.06; // 6% under Section 10(2A)
  }

  const compositionGst = turnover * compositionRate;
  // Under composition: no ITC can be claimed
  const compositionNetProfit = turnover - purchases - compositionGst;

  // Regular Scheme
  const regularOutputGst = turnover * outputRate;
  const regularItc = purchases * inputRate;
  const regularNetGstPayable = Math.max(0, regularOutputGst - regularItc);
  // Under regular: GST collected is passed to buyer; cost is just purchases
  const regularNetProfit = turnover - purchases;

  const isCompositionBetter = compositionGst < regularNetGstPayable;
  const taxDiff = Math.abs(regularNetGstPayable - compositionGst);

  const breakdown = [
    { label: 'Annual Business Turnover (वार्षिक कारोबार)', value: turnover },
    { label: 'Annual Purchases / Inward Supplies (खरीद लागत)', value: purchases },
    { label: `Composition GST Rate (${(compositionRate * 100).toFixed(0)}%)`, value: compositionGst, isDeduction: true },
    { label: `Regular Output GST (${(outputRate * 100).toFixed(0)}%)`, value: regularOutputGst },
    { label: `Eligible Input Tax Credit (ITC - ${(inputRate * 100).toFixed(0)}%)`, value: regularItc, isDeduction: true },
    { label: 'Regular Net GST Payable (Cash Ledger)', value: regularNetGstPayable, isDeduction: true },
    { label: 'Net Profit under Composition Scheme', value: compositionNetProfit },
    { label: 'Net Profit under Regular GST Scheme', value: regularNetProfit, isFinal: true },
  ];

  return {
    grossIncome: turnover,
    netIncome: regularNetProfit,
    totalTax: regularNetGstPayable,
    effectiveRate: turnover > 0 ? regularNetGstPayable / turnover : 0,
    breakdown,
    currency: 'INR',
    currencySymbol: '₹',
    quarterlyPayment: Math.round(compositionGst / 4),
    additionalInsights: [
      isCompositionBetter
        ? `Composition Scheme results in lower cash tax outflow of ₹${Math.round(compositionGst).toLocaleString('en-IN')}/year.`
        : `Regular Scheme allows full Input Tax Credit recovery of ₹${Math.round(regularItc).toLocaleString('en-IN')}.`,
      `Composition dealers file quarterly GSTR-4 and cannot issue tax invoices to pass credit to B2B customers.`,
    ],
  };
}
