// src/lib/engine/countries/ae.ts
// United Arab Emirates Financial & Tax Engine — 2026 Rules
// Sources: UAE Labour Law (Decree-Law 33/2021), Corporate Tax Law (Decree-Law 47/2022), FTA, DLD, GPSSA (Decree-Law 57/2023)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'uae-end-of-service-gratuity');

  switch (calcId) {
    case 'uae-corporate-tax-small-business-relief':
      return calculateCorporateTax(inputs);
    case 'dubai-dld-property-transfer-mortgage-calculator':
      return calculateDldPropertyFees(inputs);
    case 'uae-vat-net-payable-calculator':
      return calculateUaeVat(inputs);
    case 'uae-gpssa-pension-payroll-calculator':
      return calculateGpssaPension(inputs);
    case 'uae-end-of-service-gratuity':
    default:
      return calculateGratuity(inputs);
  }
}

// 1. UAE End of Service Gratuity (Federal Decree-Law No. 33 of 2021)
function calculateGratuity(inputs: TaxInput): TaxResult {
  const basicSalary = safeVal(inputs.basic_salary ?? inputs.salary);
  const years = safeVal(inputs.service_years ?? inputs.years);
  const months = safeVal(inputs.service_months ?? inputs.months);
  const unpaidDays = safeVal(inputs.unpaid_leave_days, 0);

  if (basicSalary <= 0 || (years === 0 && months === 0)) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Basic Monthly Salary', value: 0 },
        { label: 'Total End of Service Gratuity', value: 0, isFinal: true },
      ],
      currency: 'AED',
      currencySymbol: 'AED ',
      additionalInsights: ['Minimum 1 year of continuous service is required for gratuity entitlement.'],
    };
  }

  // Under UAE Labour Law 2021 (effective 2022 onwards), unlimited/limited distinction was abolished.
  // Net service duration in years
  const totalServiceYears = Math.max(0, years + months / 12 - unpaidDays / 365);

  if (totalServiceYears < 1.0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Basic Monthly Salary', value: basicSalary },
        { label: `Total Service Duration (${totalServiceYears.toFixed(2)} years)`, value: totalServiceYears },
        { label: 'Gratuity Entitlement (< 1 year service)', value: 0, isFinal: true },
      ],
      currency: 'AED',
      currencySymbol: 'AED ',
      additionalInsights: ['Under UAE Labour Law, no gratuity is payable for service under 1 continuous year.'],
    };
  }

  const dailyBasic = basicSalary / 30;
  let gratuity = 0;

  if (totalServiceYears <= 5) {
    // 21 days basic salary for each year of service
    gratuity = totalServiceYears * 21 * dailyBasic;
  } else {
    // 21 days for first 5 years + 30 days for each additional year
    const first5Years = 5 * 21 * dailyBasic;
    const additionalYears = (totalServiceYears - 5) * 30 * dailyBasic;
    gratuity = first5Years + additionalYears;
  }

  // Statutory maximum cap: Gratuity cannot exceed 2 years' total basic salary (24 * basic)
  const maxCap = 24 * basicSalary;
  const finalGratuity = Math.min(gratuity, maxCap);
  const isCapped = gratuity > maxCap;

  const breakdown = [
    { label: 'Basic Monthly Salary (الراتب الأساسي)', value: basicSalary },
    { label: `Total Service Duration (${totalServiceYears.toFixed(2)} years)`, value: totalServiceYears },
    { label: 'Daily Wage Basis (Basic ÷ 30)', value: dailyBasic },
    { label: 'Uncapped Gratuity Accrual', value: gratuity },
    ...(isCapped ? [{ label: 'Statutory 2-Year Cap Applied (24 × Basic)', value: maxCap, isTotal: true }] : []),
    { label: 'Total End of Service Gratuity Payable (مكافأة نهاية الخدمة)', value: finalGratuity, isFinal: true },
  ];

  return {
    grossIncome: finalGratuity,
    netIncome: finalGratuity, // 0 personal income tax in UAE
    totalTax: 0,
    effectiveRate: 0,
    breakdown,
    currency: 'AED',
    currencySymbol: 'AED ',
    additionalInsights: [
      `Under Article 51 of Federal Decree-Law No. 33 of 2021, severance is calculated strictly on the basic wage.`,
      `Gratuity is completely exempt from personal income tax in the UAE (0% tax rate).`,
      isCapped
        ? `Note: Total gratuity is capped at the maximum legal ceiling of 2 years' basic salary (AED ${Math.round(maxCap).toLocaleString('en-US')}).`
        : `Total gratuity is within the statutory 24-month basic salary maximum.`,
    ],
  };
}

// 2. UAE Corporate Tax & Small Business Relief (Decree-Law No. 47/2022)
function calculateCorporateTax(inputs: TaxInput): TaxResult {
  const revenue = safeVal(inputs.annual_revenue ?? inputs.revenue);
  const netProfit = safeVal(inputs.net_taxable_profit ?? inputs.profit);
  const entityType = String(inputs.entity_type || 'mainland');
  const optSbr = String(inputs.opt_small_business_relief || 'yes') === 'yes';

  if (revenue <= 0 && netProfit <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Annual Revenue', value: 0 }],
      currency: 'AED',
      currencySymbol: 'AED ',
    };
  }

  // Small Business Relief (Ministerial Decision No. 73 of 2023): Revenue <= AED 3,000,000 -> 0%
  const isSbrEligible = revenue <= 3000000 && optSbr && entityType !== 'freezone_qualifying';

  let taxPayable = 0;
  let exemptProfit = 0;
  let taxableAboveThreshold = 0;

  if (isSbrEligible) {
    taxPayable = 0;
    exemptProfit = netProfit;
  } else if (entityType === 'freezone_qualifying') {
    // Qualifying Free Zone Person (QFZP): 0% on Qualifying Income
    taxPayable = 0;
    exemptProfit = netProfit;
  } else {
    // Standard Mainland / Non-qualifying Freezone: 0% up to 375,000 AED, 9% on excess
    if (netProfit > 375000) {
      exemptProfit = 375000;
      taxableAboveThreshold = netProfit - 375000;
      taxPayable = taxableAboveThreshold * 0.09;
    } else {
      exemptProfit = Math.max(0, netProfit);
      taxPayable = 0;
    }
  }

  const postTaxProfit = Math.max(0, netProfit - taxPayable);
  const effectiveRate = netProfit > 0 ? taxPayable / netProfit : 0;

  const breakdown = [
    { label: 'Gross Annual Business Revenue', value: revenue },
    { label: 'Net Taxable Profit (الربح الخاضع للضريبة)', value: netProfit, isTotal: true },
    { label: 'Tax-Exempt Profit Threshold (0% Tier up to AED 375,000)', value: exemptProfit },
    ...(taxableAboveThreshold > 0 ? [{ label: 'Taxable Profit Subject to 9% Rate', value: taxableAboveThreshold }] : []),
    { label: 'UAE Corporate Tax Payable (ضريبة الشركات)', value: taxPayable, isDeduction: true },
    { label: 'Net Retained Corporate Profit After Tax', value: postTaxProfit, isFinal: true },
  ];

  return {
    grossIncome: netProfit,
    netIncome: postTaxProfit,
    totalTax: taxPayable,
    effectiveRate,
    breakdown,
    currency: 'AED',
    currencySymbol: 'AED ',
    additionalInsights: [
      isSbrEligible
        ? `Small Business Relief (SBR) applied: Revenue is ≤ AED 3,000,000, resulting in 0% Corporate Tax for tax periods ending on or before Dec 31, 2026.`
        : entityType === 'freezone_qualifying'
        ? `Qualifying Free Zone Person (QFZP) status applies: 0% Corporate Tax rate on Qualifying Income.`
        : `Standard Corporate Tax applies: 0% on first AED 375,000 profit and 9% on profit exceeding AED 375,000.`,
      `UAE Corporate Tax returns must be filed and tax settled within 9 months from the end of the relevant tax period.`,
    ],
  };
}

// 3. Dubai Land Department (DLD) Property Fees & Mortgage Costs
function calculateDldPropertyFees(inputs: TaxInput): TaxResult {
  const propertyPrice = safeVal(inputs.property_price ?? inputs.price);
  const isMortgaged = String(inputs.is_mortgaged || 'no') === 'yes';
  const downPaymentPct = safeVal(inputs.down_payment_percentage || '20') / 100;

  if (propertyPrice <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Property Purchase Price', value: 0 }],
      currency: 'AED',
      currencySymbol: 'AED ',
    };
  }

  // DLD Transfer Fee: 4% of property purchase price + AED 580 admin fee
  const dldTransferFee = propertyPrice * 0.04;
  const dldAdminFee = 580;

  // DLD Trustee Registration Fee: AED 4,000 + 5% VAT = 4,200 (or AED 2,000 + VAT if < 500k)
  const trusteeFee = propertyPrice >= 500000 ? 4200 : 2100;

  // Title Deed Issuance Fee: AED 250
  const titleDeedFee = 250;

  // Real Estate Agency Broker Fee: 2% of price + 5% VAT (2.1% total)
  const agencyFee = propertyPrice * 0.02 * 1.05;

  // Mortgage registration fee: 0.25% of loan amount + AED 290 admin fee
  let mortgageLoan = 0;
  let mortgageRegFee = 0;
  let bankValuationFee = 0;
  if (isMortgaged) {
    mortgageLoan = propertyPrice * (1 - downPaymentPct);
    mortgageRegFee = mortgageLoan * 0.0025 + 290;
    bankValuationFee = 3150; // AED 3,000 + 5% VAT
  }

  const totalClosingFees =
    dldTransferFee + dldAdminFee + trusteeFee + titleDeedFee + agencyFee + mortgageRegFee + bankValuationFee;
  const totalPurchaseCost = propertyPrice + totalClosingFees;

  const breakdown = [
    { label: 'Property Purchase Price (سعر العقار)', value: propertyPrice },
    { label: 'DLD Transfer Fee (4.0%)', value: dldTransferFee, isDeduction: true },
    { label: 'DLD Admin & Title Deed Fees', value: dldAdminFee + titleDeedFee, isDeduction: true },
    { label: 'Registration Trustee Fee (incl. 5% VAT)', value: trusteeFee, isDeduction: true },
    { label: 'Real Estate Agency Brokerage (2% + 5% VAT)', value: agencyFee, isDeduction: true },
    ...(isMortgaged
      ? [
          { label: `Mortgage Loan Amount (${Math.round((1 - downPaymentPct) * 100)}% LTV)`, value: mortgageLoan },
          { label: 'DLD Mortgage Registration Fee (0.25% + AED 290)', value: mortgageRegFee, isDeduction: true },
          { label: 'Bank Property Valuation Fee (incl. VAT)', value: bankValuationFee, isDeduction: true },
        ]
      : []),
    { label: 'Total Transaction & Government Fees (إجمالي الرسوم)', value: totalClosingFees, isTotal: true },
    { label: 'Total Outlay Required for Property Purchase', value: totalPurchaseCost, isFinal: true },
  ];

  return {
    grossIncome: propertyPrice,
    netIncome: totalPurchaseCost,
    totalTax: totalClosingFees,
    effectiveRate: totalClosingFees / propertyPrice,
    breakdown,
    currency: 'AED',
    currencySymbol: 'AED ',
    additionalInsights: [
      `Total upfront closing costs represent ${( (totalClosingFees / propertyPrice) * 100 ).toFixed(2)}% of the purchase price.`,
      `Dubai Land Department (DLD) transfer fee is split equally (2% buyer / 2% seller) by standard law, though in practice buyers commonly pay the full 4%.`,
      isMortgaged
        ? `Mortgage registration at 0.25% of the loan amount must be paid directly to the Dubai Land Department at trustee offices.`
        : `Cash purchases avoid all mortgage registration and bank valuation fees.`,
    ],
  };
}

// 4. UAE VAT Net Payable & Threshold
function calculateUaeVat(inputs: TaxInput): TaxResult {
  const standardSales = safeVal(inputs.taxable_sales ?? inputs.sales);
  const zeroRatedSales = safeVal(inputs.zero_rated_sales, 0);
  const taxablePurchases = safeVal(inputs.taxable_expenses ?? inputs.expenses);
  const annualTurnover = safeVal(inputs.annual_taxable_turnover, standardSales + zeroRatedSales);

  if (standardSales <= 0 && zeroRatedSales <= 0 && taxablePurchases <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Taxable Sales (5% VAT)', value: 0 }],
      currency: 'AED',
      currencySymbol: 'AED ',
    };
  }

  const outputVat = standardSales * 0.05;
  const inputVat = taxablePurchases * 0.05;
  const netVatPayable = outputVat - inputVat;
  const isRefund = netVatPayable < 0;

  // Thresholds
  const isMandatory = annualTurnover >= 375000;
  const isVoluntary = annualTurnover >= 187500;

  const breakdown = [
    { label: 'Standard-Rated Supplies (5% VAT Sales)', value: standardSales },
    ...(zeroRatedSales > 0 ? [{ label: 'Zero-Rated Supplies (0% VAT)', value: zeroRatedSales }] : []),
    { label: 'Output VAT Collected on Sales (5%)', value: outputVat, isTotal: true },
    { label: 'Taxable Business Expenses (Subject to 5% VAT)', value: taxablePurchases },
    { label: 'Input VAT Recoverable on Purchases (5%)', value: inputVat, isDeduction: true },
    {
      label: isRefund
        ? 'Net VAT Refund Due from FTA (استرداد ضريبة)'
        : 'Net VAT Payable to FTA (صافي الضريبة المستحقة)',
      value: Math.abs(netVatPayable),
      isFinal: true,
    },
  ];

  return {
    grossIncome: standardSales + zeroRatedSales,
    netIncome: Math.max(0, standardSales + zeroRatedSales - Math.max(0, netVatPayable)),
    totalTax: Math.max(0, netVatPayable),
    effectiveRate: standardSales > 0 ? Math.max(0, netVatPayable) / standardSales : 0,
    breakdown,
    currency: 'AED',
    currencySymbol: 'AED ',
    quarterlyPayment: Math.max(0, netVatPayable),
    additionalInsights: [
      isMandatory
        ? `Mandatory Registration Required: Annual taxable turnover exceeds AED 375,000 threshold.`
        : isVoluntary
        ? `Voluntary Registration Eligible: Annual turnover is between AED 187,500 and AED 375,000.`
        : `Turnover is below AED 187,500 voluntary threshold. VAT registration is not required.`,
      `Quarterly VAT returns (Form VAT201) must be submitted and settled within 28 days following the end of the tax period.`,
    ],
  };
}

// 5. UAE GPSSA Pension & Payroll for UAE / GCC Nationals
function calculateGpssaPension(inputs: TaxInput): TaxResult {
  const grossSalary = safeVal(inputs.gross_salary ?? inputs.salary);
  const contributionSalary = safeVal(inputs.contribution_salary, grossSalary);
  const sector = String(inputs.sector || 'private');
  const lawVersion = String(inputs.law_version || 'new_law_2023');

  if (grossSalary <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Monthly Salary', value: 0 }],
      currency: 'AED',
      currencySymbol: 'AED ',
    };
  }

  // Federal Decree-Law No. 57 of 2023 (New Law): 26% total
  // Employee: 11%, Employer: 12% (private, 3% nafiss subsidy) or 15% (public)
  // Old Law (1999): 20% total (Employee 5%, Employer 12.5% or 15%)
  let employeeRate = 0.11;
  let employerRate = sector === 'private' ? 0.12 : 0.15;
  let govSubsidyRate = sector === 'private' ? 0.03 : 0.0;
  let salaryCap = sector === 'private' ? 70000 : 100000;

  if (lawVersion === 'old_law_1999') {
    employeeRate = 0.05;
    employerRate = sector === 'private' ? 0.125 : 0.15;
    govSubsidyRate = sector === 'private' ? 0.025 : 0.0;
    salaryCap = 50000;
  }

  const cappedContributionSalary = Math.min(contributionSalary, salaryCap);
  const employeePension = cappedContributionSalary * employeeRate;
  const employerPension = cappedContributionSalary * employerRate;
  const govSubsidy = cappedContributionSalary * govSubsidyRate;
  const totalPensionContribution = employeePension + employerPension + govSubsidy;
  const netTakeHome = Math.max(0, grossSalary - employeePension);

  const breakdown = [
    { label: 'Gross Monthly Salary (الراتب الشهري الإجمالي)', value: grossSalary },
    { label: `Contribution Salary Base (Capped at AED ${salaryCap.toLocaleString()})`, value: cappedContributionSalary },
    { label: `Employee Pension Deduction (${(employeeRate * 100).toFixed(0)}% حصة الموظف)`, value: employeePension, isDeduction: true },
    { label: `Employer Pension Share (${(employerRate * 100).toFixed(1)}% حصة جهة العمل)`, value: employerPension },
    ...(govSubsidy > 0 ? [{ label: `Government Nafis Contribution (${(govSubsidyRate * 100).toFixed(1)}%)`, value: govSubsidy }] : []),
    { label: 'Total Monthly GPSSA Pension Contribution', value: totalPensionContribution, isTotal: true },
    { label: 'Net Monthly Take-Home Pay (صافي الراتب)', value: netTakeHome, isFinal: true },
  ];

  return {
    grossIncome: grossSalary,
    netIncome: netTakeHome,
    totalTax: employeePension,
    effectiveRate: employeePension / grossSalary,
    breakdown,
    currency: 'AED',
    currencySymbol: 'AED ',
    additionalInsights: [
      lawVersion === 'new_law_2023'
        ? `Federal Decree-Law No. 57 of 2023 applies to UAE nationals who joined the workforce after October 2023 (11% employee contribution).`
        : `Federal Law No. 7 of 1999 applies to insured nationals prior to October 2023 (5% employee contribution).`,
      `Expatriate employees are not covered by GPSSA and instead receive End of Service Gratuity or optional DEWS savings plan contributions.`,
    ],
  };
}
