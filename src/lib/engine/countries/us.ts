// src/lib/engine/countries/us.ts
// United States Federal Tax Engine — 2026 Tax Year
// Sources: IRS Rev. Proc. 2025-xx, IRC §1401, §1402, §62, §199A, §63, §121

import { safeVal, type TaxInput, type TaxResult } from '../types';

/** Apply progressive brackets to a taxable amount. Brackets = [[limit, rate], ...] */
function applyBrackets(income: number, brackets: [number, number][]): number {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of brackets) {
    if (income <= prev) break;
    const chunk = Math.min(income, limit) - prev;
    tax += chunk * rate;
    prev = limit;
  }
  return tax;
}

const BRACKETS_SINGLE_2026: [number, number][] = [
  [11925, 0.10], [48475, 0.12], [103350, 0.22],
  [197300, 0.24], [250525, 0.32], [626350, 0.35],
  [Infinity, 0.37],
];
const BRACKETS_JOINT_2026: [number, number][] = [
  [23850, 0.10], [96950, 0.12], [206700, 0.22],
  [394600, 0.24], [501050, 0.32], [751600, 0.35],
  [Infinity, 0.37],
];
const BRACKETS_HOH_2026: [number, number][] = [
  [17000, 0.10], [64850, 0.12], [103350, 0.22],
  [197300, 0.24], [250500, 0.32], [626350, 0.35],
  [Infinity, 0.37],
];

const STATE_RATES: Record<string, number> = {
  CA: 0.093, NY: 0.0685, TX: 0, FL: 0,
  IL: 0.0495, WA: 0, OTHER: 0.05,
};

const SS_WAGE_BASE_2026 = 176100;

/** 2026 Standard Deductions */
const STANDARD_DEDUCTION: Record<string, number> = {
  single: 15000, married_joint: 30000,
  head_of_household: 22500, married_separate: 15000,
};

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'us-1099-self-employment-tax-calculator');
  switch (calcId) {
    case 's-corp-vs-llc-tax-savings-calculator':
      return calculateSCorpVsLLC(inputs);
    case 'w2-salary-paycheck-take-home-calculator':
      return calculateW2Salary(inputs);
    case 'us-home-sale-net-proceeds-capital-gains-calculator':
      return calculateHomeSale(inputs);
    case 'us-small-business-lease-break-even-calculator':
      return calculateLeaseBreakEven(inputs);
    default:
      return calculatePrimary1099(inputs);
  }
}

function calculatePrimary1099(inputs: TaxInput): TaxResult {
  const profit = safeVal(inputs.net_1099_profit);
  const filingStatus = String(inputs.filing_status || 'single');
  const w2Income = safeVal(inputs.other_w2_income);
  const state = String(inputs.state || 'OTHER');

  // --- Self-Employment Tax ---
  const seTaxableIncome = profit * 0.9235;
  // Social Security: 12.4% up to wage base, reduced by W-2
  const ssBase = Math.max(0, SS_WAGE_BASE_2026 - w2Income);
  const ssIncome = Math.min(seTaxableIncome, ssBase);
  const ssTax = ssIncome * 0.124;
  // Medicare: 2.9% on all SE income
  const medicareTax = seTaxableIncome * 0.029;
  // Additional Medicare: 0.9% above threshold
  const amtThreshold = filingStatus === 'married_joint' ? 250000 : filingStatus === 'married_separate' ? 125000 : 200000;
  const totalEarnings = profit + w2Income;
  const amtBase = Math.max(0, totalEarnings - amtThreshold);
  const additionalMedicare = amtBase > 0 ? Math.min(seTaxableIncome, amtBase) * 0.009 : 0;

  const totalSETax = ssTax + medicareTax + additionalMedicare;
  const seTaxDeduction = totalSETax * 0.5; // §164(f)

  // --- Adjusted Gross Income ---
  const agi = Math.max(0, profit - seTaxDeduction);

  // --- QBI Deduction (§199A) — 20% of qualified business income ---
  const qbiThreshold = filingStatus === 'married_joint' ? 394600 : 197300;
  const qbiDeduction = agi <= qbiThreshold ? Math.min(profit, agi) * 0.20 : 0;

  // --- Federal Income Tax ---
  const stdDeduction = STANDARD_DEDUCTION[filingStatus] || 15000;
  const taxableIncome = Math.max(0, agi - stdDeduction - qbiDeduction);

  let brackets: [number, number][];
  if (filingStatus === 'married_joint') brackets = BRACKETS_JOINT_2026;
  else if (filingStatus === 'head_of_household') brackets = BRACKETS_HOH_2026;
  else brackets = BRACKETS_SINGLE_2026;

  const federalIncomeTax = applyBrackets(taxableIncome, brackets);

  // --- State Income Tax ---
  const stateRate = STATE_RATES[state] ?? 0.05;
  const stateTax = taxableIncome * stateRate;

  // --- Totals ---
  const totalTax = totalSETax + federalIncomeTax + stateTax;
  const netIncome = profit - totalTax;
  const effectiveRate = profit > 0 ? totalTax / profit : 0;
  const quarterlyPayment = (totalSETax + federalIncomeTax) / 4;

  // --- Breakdown ---
  const breakdown = [
    { label: 'Gross 1099 / Schedule C Profit', value: profit },
    { label: 'SE Tax Deduction (50% of SE Tax)', value: seTaxDeduction, isDeduction: true },
    { label: 'Adjusted Gross Income (AGI)', value: agi, isTotal: true },
    { label: `Standard Deduction (${filingStatus.replace('_', ' ')})`, value: stdDeduction, isDeduction: true },
    ...(qbiDeduction > 0 ? [{ label: 'QBI Deduction (§199A — 20%)', value: qbiDeduction, isDeduction: true }] : []),
    { label: 'Federal Taxable Income', value: taxableIncome, isTotal: true },
    { label: 'Federal Income Tax', value: federalIncomeTax, isDeduction: true, percentage: profit > 0 ? (federalIncomeTax / profit) * 100 : 0 },
    { label: `Self-Employment Tax (SS + Medicare)`, value: totalSETax, isDeduction: true, percentage: profit > 0 ? (totalSETax / profit) * 100 : 0 },
    ...(stateTax > 0 ? [{ label: `${state} State Income Tax (~${(stateRate * 100).toFixed(1)}%)`, value: stateTax, isDeduction: true }] : []),
    { label: 'Net Take-Home Income', value: netIncome, isFinal: true },
  ];

  // --- Insights ---
  const insights: string[] = [];
  if (profit > SS_WAGE_BASE_2026) {
    insights.push(`Your income exceeds the Social Security wage base cap ($${SS_WAGE_BASE_2026.toLocaleString()}). You only owe SS tax on the first $${SS_WAGE_BASE_2026.toLocaleString()}.`);
  }
  if (qbiDeduction > 0) {
    insights.push(`You qualify for the §199A QBI Deduction, saving ~$${Math.round(qbiDeduction * 0.22).toLocaleString()} in federal taxes.`);
  }
  if (profit > 80000) {
    insights.push('Consider an S-Corp election — it can significantly reduce your SE tax burden above $80,000 net profit.');
  }
  insights.push('Quarterly estimated payments are due: April 15, June 16, September 15, and January 15.');

  return {
    grossIncome: profit,
    netIncome: Math.max(0, netIncome),
    totalTax,
    effectiveRate,
    breakdown,
    currency: 'USD',
    currencySymbol: '$',
    quarterlyPayment,
    additionalInsights: insights,
  };
}

function calculateSCorpVsLLC(inputs: TaxInput): TaxResult {
  const profit = safeVal(inputs.net_profit ?? inputs.net_business_profit);
  const salaryInput = safeVal(inputs.reasonable_salary);
  const w2Salary = Math.min(profit, salaryInput);
  const filingStatus = String(inputs.filing_status || 'single');
  const accountingCost = safeVal(inputs.annual_compliance_cost ?? 3000);

  const distributions = profit - w2Salary;

  // LLC Self-Employment Tax
  const llcTaxable = profit * 0.9235;
  const llcSS = Math.min(llcTaxable, SS_WAGE_BASE_2026) * 0.124;
  const llcMedicare = llcTaxable * 0.029;
  const amtThreshold = filingStatus === 'married_joint' ? 250000 : filingStatus === 'married_separate' ? 125000 : 200000;
  const llcAddlMedicare = profit > amtThreshold ? Math.min(llcTaxable, profit - amtThreshold) * 0.009 : 0;
  const llcTotalSETax = llcSS + llcMedicare + llcAddlMedicare;

  // S-Corp Payroll FICA Tax (on salary only)
  const scorpSS = Math.min(w2Salary, SS_WAGE_BASE_2026) * 0.124;
  const scorpMedicare = w2Salary * 0.029;
  const scorpAddlMedicare = w2Salary > amtThreshold ? Math.max(0, w2Salary - amtThreshold) * 0.009 : 0;
  const scorpFicaTax = scorpSS + scorpMedicare + scorpAddlMedicare;

  const totalScorpCosts = scorpFicaTax + accountingCost;
  const netAnnualSavings = llcTotalSETax - totalScorpCosts;
  const netIncome = profit - totalScorpCosts;
  const effectiveRate = profit > 0 ? totalScorpCosts / profit : 0;

  const breakdown = [
    { label: 'Gross Annual Net Business Profit', value: profit },
    { label: 'Proposed S-Corp Officer W-2 Salary', value: w2Salary },
    { label: 'S-Corp K-1 Dividend Distributions (SE Tax Free)', value: distributions },
    { label: 'LLC Self-Employment Tax (15.3% SE Tax on Profit)', value: llcTotalSETax, isDeduction: true },
    { label: 'S-Corp Payroll FICA Taxes (on Salary)', value: scorpFicaTax, isDeduction: true },
    { label: 'S-Corp Annual Accounting & Payroll Fees', value: accountingCost, isDeduction: true },
    { label: 'Total S-Corp Tax & Admin Expenses', value: totalScorpCosts, isTotal: true },
    { label: 'Net Annual S-Corp Tax Savings', value: netAnnualSavings, isFinal: true },
  ];

  const insights: string[] = [];
  if (netAnnualSavings > 0) {
    insights.push(`By electing S-Corp tax status with a $${w2Salary.toLocaleString()} officer salary, you save approximately $${Math.round(netAnnualSavings).toLocaleString()} per year after accounting fees.`);
  } else {
    insights.push(`At $${profit.toLocaleString()} net profit, S-Corp administration costs (~$${accountingCost.toLocaleString()}) outweigh tax savings. S-Corp election is typically beneficial above $80,000 net profit.`);
  }
  insights.push('S-Corp dividends require reasonable officer W-2 compensation per IRS guidelines.');

  return {
    grossIncome: profit,
    netIncome: Math.max(0, netIncome),
    totalTax: totalScorpCosts,
    effectiveRate,
    breakdown,
    currency: 'USD',
    currencySymbol: '$',
    additionalInsights: insights,
  };
}

function calculateW2Salary(inputs: TaxInput): TaxResult {
  const grossAnnual = safeVal(inputs.gross_annual ?? inputs.gross_salary);
  const filingStatus = String(inputs.filing_status || 'single');
  const state = String(inputs.state || 'OTHER');
  const pct401k = safeVal(inputs['401k_contribution_pct'] ?? inputs.pretax_401k_pct, 0, 100);
  const payFrequency = String(inputs.pay_frequency || 'biweekly');

  const payPeriodMap: Record<string, { count: number; name: string }> = {
    weekly: { count: 52, name: 'weekly' },
    biweekly: { count: 26, name: 'bi-weekly' },
    semimonthly: { count: 24, name: 'semi-monthly' },
    monthly: { count: 12, name: 'monthly' },
  };

  const periods = payPeriodMap[payFrequency]?.count ?? 26;
  const payFreqName = payPeriodMap[payFrequency]?.name ?? 'bi-weekly';

  const annual401k = Math.min(23500, grossAnnual * (pct401k / 100));

  // Employee FICA (on gross salary before 401k)
  const ssTax = Math.min(grossAnnual, SS_WAGE_BASE_2026) * 0.062;
  const medicareTax = grossAnnual * 0.0145;
  const amtThreshold = filingStatus === 'married_joint' ? 250000 : filingStatus === 'married_separate' ? 125000 : 200000;
  const addlMedicare = grossAnnual > amtThreshold ? (grossAnnual - amtThreshold) * 0.009 : 0;
  const totalFica = ssTax + medicareTax + addlMedicare;

  // Taxable Federal Income
  const stdDeduction = STANDARD_DEDUCTION[filingStatus] || 15000;
  const fedTaxable = Math.max(0, grossAnnual - annual401k - stdDeduction);

  let brackets: [number, number][];
  if (filingStatus === 'married_joint') brackets = BRACKETS_JOINT_2026;
  else if (filingStatus === 'head_of_household') brackets = BRACKETS_HOH_2026;
  else brackets = BRACKETS_SINGLE_2026;

  const fedIncomeTax = applyBrackets(fedTaxable, brackets);

  // State Income Tax
  const stateRate = STATE_RATES[state] ?? 0.05;
  const stateTaxable = Math.max(0, grossAnnual - annual401k - stdDeduction);
  const stateTax = stateTaxable * stateRate;

  const totalTax = fedIncomeTax + totalFica + stateTax;
  const annualNet = Math.max(0, grossAnnual - totalTax - annual401k);
  const paycheckNet = periods <= 0 ? 0 : annualNet / periods;
  const effectiveRate = grossAnnual > 0 ? totalTax / grossAnnual : 0;

  const breakdown = [
    { label: 'Annual Gross Salary', value: grossAnnual },
    { label: `Pre-Tax 401(k) Contribution (${pct401k}%)`, value: annual401k, isDeduction: true },
    { label: `Standard Deduction (${filingStatus.replace('_', ' ')})`, value: stdDeduction, isDeduction: true },
    { label: 'Federal Taxable Income', value: fedTaxable, isTotal: true },
    { label: 'Federal Income Tax', value: fedIncomeTax, isDeduction: true, percentage: grossAnnual > 0 ? (fedIncomeTax / grossAnnual) * 100 : 0 },
    { label: 'Social Security Tax (6.2%)', value: ssTax, isDeduction: true },
    { label: 'Medicare Tax (1.45% + Addl)', value: medicareTax + addlMedicare, isDeduction: true },
    { label: `${state} State Income Tax (~${(stateRate * 100).toFixed(1)}%)`, value: stateTax, isDeduction: true },
    { label: 'Annual Net Take-Home Pay', value: annualNet, isTotal: true },
    { label: `Net Pay per Paycheck (${payFreqName})`, value: paycheckNet, isFinal: true },
  ];

  const insights: string[] = [];
  insights.push(`Your estimated net take-home pay is $${Math.round(paycheckNet).toLocaleString()} per paycheck (${periods} pay periods per year).`);
  if (annual401k > 0) {
    insights.push(`Your $${Math.round(annual401k).toLocaleString()} annual 401(k) contribution reduces your taxable federal income, saving ~$${Math.round(annual401k * 0.22).toLocaleString()} in income taxes.`);
  }
  if (grossAnnual > SS_WAGE_BASE_2026) {
    insights.push(`Your salary exceeds the $${SS_WAGE_BASE_2026.toLocaleString()} Social Security cap. Social Security tax stops after reaching this limit.`);
  }

  return {
    grossIncome: grossAnnual,
    netIncome: annualNet,
    totalTax,
    effectiveRate,
    breakdown,
    currency: 'USD',
    currencySymbol: '$',
    additionalInsights: insights,
  };
}

function calculateHomeSale(inputs: TaxInput): TaxResult {
  const salePrice = safeVal(inputs.sale_price ?? inputs.selling_price);
  const purchasePrice = safeVal(inputs.original_purchase_price);
  const yearsOwned = safeVal(inputs.years_owned ?? 2);
  const filingStatus = String(inputs.filing_status || 'single');
  const closingCostsPct = safeVal(inputs.closing_costs_pct ?? inputs.realtor_commission_pct ?? 8, 0, 100) / 100;
  const improvementsCost = safeVal(inputs.improvements_cost ?? inputs.capital_improvements);

  const closingCosts = salePrice * closingCostsPct;
  const netSellingProceeds = salePrice - closingCosts;
  const adjustedBasis = purchasePrice + improvementsCost;
  const grossGain = netSellingProceeds - adjustedBasis;

  // Section 121 Exclusion
  const maxExclusion = yearsOwned >= 2 ? (filingStatus === 'married_joint' ? 500000 : 250000) : 0;
  const exclusionApplied = Math.min(Math.max(0, grossGain), maxExclusion);
  const taxableGain = Math.max(0, grossGain - exclusionApplied);

  // Capital Gains Tax
  let capGainsTax = 0;
  if (taxableGain > 0) {
    if (yearsOwned < 1) {
      // Short-term cap gain (taxed as ordinary income ~24%)
      capGainsTax = taxableGain * 0.24;
    } else {
      // Long-term capital gains 2026 brackets
      const limit0 = filingStatus === 'married_joint' ? 94050 : 47025;
      const limit15 = filingStatus === 'married_joint' ? 583750 : 518900;

      const chunk15 = Math.max(0, Math.min(taxableGain, limit15) - limit0);
      const chunk20 = Math.max(0, taxableGain - limit15);
      const niitThreshold = filingStatus === 'married_joint' ? 250000 : filingStatus === 'married_separate' ? 125000 : 200000;
  const niit = taxableGain > niitThreshold ? (taxableGain - niitThreshold) * 0.038 : 0;

      capGainsTax = chunk15 * 0.15 + chunk20 * 0.20 + niit;
    }
  }

  const finalNetProceeds = netSellingProceeds - capGainsTax;
  const effectiveRate = salePrice > 0 ? capGainsTax / salePrice : 0;

  const breakdown = [
    { label: 'Home Sale Price', value: salePrice },
    { label: `Closing Costs & Commissions (${(closingCostsPct * 100).toFixed(1)}%)`, value: closingCosts, isDeduction: true },
    { label: 'Net Selling Proceeds (Before Tax)', value: netSellingProceeds, isTotal: true },
    { label: 'Original Purchase Price', value: purchasePrice },
    { label: 'Capital Improvements', value: improvementsCost },
    { label: 'Adjusted Cost Basis', value: adjustedBasis, isTotal: true },
    { label: 'Gross Realized Capital Gain', value: Math.max(0, grossGain), isTotal: true },
    { label: `IRS Section 121 Primary Exclusion (${yearsOwned >= 2 ? 'Eligible' : 'Ineligible'})`, value: exclusionApplied, isDeduction: true },
    { label: 'Taxable Capital Gain', value: taxableGain, isTotal: true },
    { label: 'Federal Capital Gains Tax Owed', value: capGainsTax, isDeduction: true },
    { label: 'Net Cash Proceeds After Tax', value: finalNetProceeds, isFinal: true },
  ];

  const insights: string[] = [];
  if (exclusionApplied > 0) {
    insights.push(`IRS Section 121 primary residence exclusion sheltered $${exclusionApplied.toLocaleString()} of capital gain from federal tax.`);
  }
  insights.push(`Your net cash proceeds after closing fees and capital gains taxes will be approximately $${Math.round(finalNetProceeds).toLocaleString()}.`);
  if (yearsOwned < 2) {
    insights.push('Property owned under 2 years — full Section 121 primary residence exclusion requires 24+ months of residence in the last 5 years.');
  }

  return {
    grossIncome: salePrice,
    netIncome: Math.max(0, finalNetProceeds),
    totalTax: capGainsTax,
    effectiveRate,
    breakdown,
    currency: 'USD',
    currencySymbol: '$',
    additionalInsights: insights,
  };
}

function calculateLeaseBreakEven(inputs: TaxInput): TaxResult {
  const monthlyRent = safeVal(inputs.monthly_rent);
  const monthlyRevenue = safeVal(inputs.monthly_revenue);
  const rawMargin = inputs.gross_margin_pct !== undefined ? safeVal(inputs.gross_margin_pct, 0, 100) : undefined;
  const defaultCogs = rawMargin !== undefined ? 100 - rawMargin : 30;
  const cogsPct = safeVal(inputs.cogs_pct ?? defaultCogs, 0, 99.9);
  const otherExpenses = safeVal(inputs.other_monthly_expenses ?? inputs.other_fixed_monthly_costs);
  const stateTaxRate = safeVal(inputs.state_tax_rate ?? 5, 0, 100) / 100;

  const cogsRate = cogsPct / 100;
  const marginRate = 1 - cogsRate;
  const monthlyCogs = monthlyRevenue * cogsRate;
  const monthlyGrossProfit = monthlyRevenue * marginRate;
  const monthlyFixedOverhead = monthlyRent + otherExpenses;
  const monthlyOperatingIncome = monthlyGrossProfit - monthlyFixedOverhead;

  const breakEvenMonthlyRevenue = marginRate <= 0 ? 0 : monthlyFixedOverhead / marginRate;
  const annualRevenue = monthlyRevenue * 12;
  const annualPreTaxProfit = monthlyOperatingIncome * 12;

  const combinedTaxRate = 0.21 + stateTaxRate;
  const annualTax = Math.max(0, annualPreTaxProfit) * combinedTaxRate;
  const annualNetProfit = annualPreTaxProfit - annualTax;

  const occupancyRatio = monthlyRevenue > 0 ? (monthlyRent / monthlyRevenue) * 100 : 0;
  const effectiveRate = annualRevenue > 0 ? annualTax / annualRevenue : 0;

  const breakdown = [
    { label: 'Estimated Monthly Gross Revenue', value: monthlyRevenue },
    { label: `Cost of Goods Sold (COGS) (${cogsPct.toFixed(1)}%)`, value: monthlyCogs, isDeduction: true },
    { label: 'Monthly Gross Profit', value: monthlyGrossProfit, isTotal: true },
    { label: 'Monthly Base Rent & Occupancy Cost', value: monthlyRent, isDeduction: true },
    { label: 'Other Monthly Operating Expenses', value: otherExpenses, isDeduction: true },
    { label: 'Monthly Net Operating Profit / (Loss)', value: monthlyOperatingIncome, isTotal: true },
    { label: 'Required Monthly Break-Even Revenue', value: breakEvenMonthlyRevenue, isTotal: true },
    { label: 'Annual Pre-Tax Profit', value: annualPreTaxProfit, isTotal: true },
    { label: `Estimated Business Tax (21% Fed + ${(stateTaxRate * 100).toFixed(1)}% State)`, value: annualTax, isDeduction: true },
    { label: 'Annual Net Profit After Tax', value: annualNetProfit, isFinal: true },
  ];

  const insights: string[] = [];
  insights.push(`Your business requires $${Math.round(breakEvenMonthlyRevenue).toLocaleString()} in monthly gross revenue to cover rent and fixed overhead.`);
  if (monthlyRevenue > 0) {
    insights.push(`Rent represents ${occupancyRatio.toFixed(1)}% of gross monthly sales (recommended industry target: 6%–10% for retail, 8%–12% for restaurants).`);
  }
  if (monthlyOperatingIncome < 0) {
    insights.push(`Warning: Current monthly operating profit is negative ($${Math.round(monthlyOperatingIncome).toLocaleString()}). You need $${Math.round(breakEvenMonthlyRevenue - monthlyRevenue).toLocaleString()} more in monthly sales to break even.`);
  }

  return {
    grossIncome: annualRevenue,
    netIncome: Math.max(0, annualNetProfit),
    totalTax: annualTax,
    effectiveRate,
    breakdown,
    currency: 'USD',
    currencySymbol: '$',
    additionalInsights: insights,
  };
}
