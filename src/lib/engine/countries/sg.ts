// src/lib/engine/countries/sg.ts
// Singapore Financial & Tax Engine — YA 2025/2026 Rules
// Sources: Inland Revenue Authority of Singapore (IRAS), Central Provident Fund (CPF Board)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'sg-take-home-pay-cpf-calculator');

  switch (calcId) {
    case 'sg-stamp-duty-absd-calculator':
      return calculateStampDutyAbsd(inputs);
    case 'sg-corporate-tax-sute-calculator':
      return calculateCorporateTaxSute(inputs);
    case 'sg-self-employed-medisave-tax-calculator':
      return calculateMedisaveSelfEmployed(inputs);
    case 'sg-tenancy-stamp-duty-rental-tax-calculator':
      return calculateTenancyStampDuty(inputs);
    case 'sg-take-home-pay-cpf-calculator':
    default:
      return calculateTakeHomeCpf(inputs);
  }
}

// IRAS Resident Personal Income Tax Brackets (YA 2024 - YA 2026)
function calculateIrasIncomeTax(chargeableIncome: number): number {
  if (chargeableIncome <= 20000) return 0;
  let tax = 0;
  let rem = chargeableIncome;

  if (rem > 1000000) { tax += (rem - 1000000) * 0.24; rem = 1000000; }
  if (rem > 500000)  { tax += (rem - 500000) * 0.23;  rem = 500000;  }
  if (rem > 320000)  { tax += (rem - 320000) * 0.22;  rem = 320000;  }
  if (rem > 280000)  { tax += (rem - 280000) * 0.20;  rem = 280000;  }
  if (rem > 240000)  { tax += (rem - 240000) * 0.195; rem = 240000;  }
  if (rem > 200000)  { tax += (rem - 200000) * 0.19;  rem = 200000;  }
  if (rem > 160000)  { tax += (rem - 160000) * 0.18;  rem = 160000;  }
  if (rem > 120000)  { tax += (rem - 120000) * 0.15;  rem = 120000;  }
  if (rem > 80000)   { tax += (rem - 80000) * 0.115;  rem = 80000;   }
  if (rem > 40000)   { tax += (rem - 40000) * 0.07;   rem = 40000;   }
  if (rem > 30000)   { tax += (rem - 30000) * 0.035;  rem = 30000;   }
  if (rem > 20000)   { tax += (rem - 20000) * 0.02; }

  return tax;
}

// 1. Singapore Take-Home Pay & CPF Contribution
function calculateTakeHomeCpf(inputs: TaxInput): TaxResult {
  const monthlySalary = safeVal(inputs.gross_monthly_salary ?? inputs.salary);
  const annualBonus = safeVal(inputs.annual_bonus, 0);
  const residency = String(inputs.residency_status || 'sc');
  const ageGroup = String(inputs.age_group || 'below_55');
  const srs = safeVal(inputs.srs_contribution, 0, 15300);
  const otherReliefs = safeVal(inputs.other_tax_reliefs, 0);

  const annualGrossSalary = monthlySalary * 12 + annualBonus;

  if (annualGrossSalary <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Annual Salary', value: 0 }],
      currency: 'SGD',
      currencySymbol: 'S$',
    };
  }

  // CPF Ordinary Wage (OW) Ceiling 2025/2026: S$ 8,000/month
  const owCeilingMonthly = 8000;
  const isCpfApplicable = residency === 'sc' || residency.startsWith('spr');

  let employeeCpfRate = 0;
  let employerCpfRate = 0;

  if (isCpfApplicable) {
    if (ageGroup === 'below_55') {
      employeeCpfRate = 0.20;
      employerCpfRate = 0.17;
    } else if (ageGroup === '55_to_60') {
      employeeCpfRate = 0.16;
      employerCpfRate = 0.15;
    } else if (ageGroup === '60_to_65') {
      employeeCpfRate = 0.115;
      employerCpfRate = 0.115;
    } else if (ageGroup === '65_to_70') {
      employeeCpfRate = 0.075;
      employerCpfRate = 0.09;
    } else {
      employeeCpfRate = 0.05;
      employerCpfRate = 0.075;
    }
  }

  // Monthly CPF
  const monthlySubjectToCpf = Math.min(monthlySalary, owCeilingMonthly);
  const monthlyEmployeeCpf = monthlySubjectToCpf * employeeCpfRate;
  const monthlyEmployerCpf = monthlySubjectToCpf * employerCpfRate;

  // Additional Wage (AW) Ceiling: S$ 102,000 - Total OW subject to CPF
  const totalOwSubjectToCpf = monthlySubjectToCpf * 12;
  const maxAwSubjectToCpf = Math.max(0, 102000 - totalOwSubjectToCpf);
  const bonusSubjectToCpf = Math.min(annualBonus, maxAwSubjectToCpf);

  const bonusEmployeeCpf = bonusSubjectToCpf * employeeCpfRate;
  const bonusEmployerCpf = bonusSubjectToCpf * employerCpfRate;

  const annualEmployeeCpf = monthlyEmployeeCpf * 12 + bonusEmployeeCpf;
  const annualEmployerCpf = monthlyEmployerCpf * 12 + bonusEmployerCpf;

  // Personal Income Tax Calculation
  const earnedIncomeRelief = ageGroup === 'below_55' ? 1000 : ageGroup === '55_to_60' ? 6000 : 8000;
  const totalReliefs = Math.min(80000, earnedIncomeRelief + annualEmployeeCpf + srs + otherReliefs); // Statutory cap of S$ 80,000 on personal reliefs
  const chargeableIncome = Math.max(0, annualGrossSalary - totalReliefs);
  const annualIncomeTax = calculateIrasIncomeTax(chargeableIncome);

  const netAnnualTakeHome = annualGrossSalary - annualEmployeeCpf - annualIncomeTax;
  const totalDeductions = annualEmployeeCpf + annualIncomeTax;

  const breakdown = [
    { label: 'Annual Gross Income (Base + Bonus)', value: annualGrossSalary },
    { label: `Employee CPF Contribution (${(employeeCpfRate * 100).toFixed(1)}%)`, value: annualEmployeeCpf, isDeduction: true },
    { label: `Employer CPF Contribution (${(employerCpfRate * 100).toFixed(1)}%)`, value: annualEmployerCpf },
    { label: 'Total Annual Personal Tax Reliefs Claimed', value: totalReliefs },
    { label: 'IRAS Chargeable Taxable Income', value: chargeableIncome, isTotal: true },
    { label: 'IRAS Annual Personal Income Tax', value: annualIncomeTax, isDeduction: true },
    { label: 'Annual Net Take-Home Pay (Cash in Hand)', value: netAnnualTakeHome, isFinal: true },
    { label: 'Monthly Net Take-Home (excluding bonus)', value: Math.round((monthlySalary - monthlyEmployeeCpf) - (annualIncomeTax / 12)), isTotal: true },
  ];

  return {
    grossIncome: annualGrossSalary,
    netIncome: netAnnualTakeHome,
    totalTax: totalDeductions,
    effectiveRate: annualGrossSalary > 0 ? totalDeductions / annualGrossSalary : 0,
    breakdown,
    currency: 'SGD',
    currencySymbol: 'S$',
    additionalInsights: [
      `Your total annual CPF contributions (Employee + Employer) accumulate S$ ${Math.round(annualEmployeeCpf + annualEmployerCpf).toLocaleString('en-SG')} across your Ordinary, Special, and MediSave accounts.`,
      `The CPF Ordinary Wage (OW) monthly ceiling is S$ 8,000.`,
      `Personal income tax reliefs are subject to IRAS's statutory overall cap of S$ 80,000 per Year of Assessment.`,
    ],
  };
}

// 2. Buyer's Stamp Duty (BSD) & Additional Buyer's Stamp Duty (ABSD)
function calculateStampDutyAbsd(inputs: TaxInput): TaxResult {
  const price = safeVal(inputs.property_price ?? inputs.price);
  const propType = String(inputs.property_type || 'residential');
  const profile = String(inputs.buyer_profile || 'sc_1st_property');

  if (price <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Property Purchase Price', value: 0 }],
      currency: 'SGD',
      currencySymbol: 'S$',
    };
  }

  // Buyer's Stamp Duty (BSD) - Residential (2024 - 2026 tiers)
  let bsd = 0;
  let rem = price;
  if (propType === 'residential') {
    if (rem > 3000000) { bsd += (rem - 3000000) * 0.06; rem = 3000000; }
    if (rem > 1500000) { bsd += (rem - 1500000) * 0.05; rem = 1500000; }
    if (rem > 1000000) { bsd += (rem - 1000000) * 0.04; rem = 1000000; }
    if (rem > 360000)  { bsd += (rem - 360000) * 0.03;  rem = 360000;  }
    if (rem > 180000)  { bsd += (rem - 180000) * 0.02;  rem = 180000;  }
    if (rem > 0)       { bsd += rem * 0.01; }
  } else {
    // Non-residential BSD
    if (rem > 1500000) { bsd += (rem - 1500000) * 0.05; rem = 1500000; }
    if (rem > 1000000) { bsd += (rem - 1000000) * 0.04; rem = 1000000; }
    if (rem > 360000)  { bsd += (rem - 360000) * 0.03;  rem = 360000;  }
    if (rem > 180000)  { bsd += (rem - 180000) * 0.02;  rem = 180000;  }
    if (rem > 0)       { bsd += rem * 0.01; }
  }

  // ABSD Rates for Residential Properties
  let absdRate = 0;
  if (propType === 'residential') {
    if (profile === 'sc_1st_property') absdRate = 0;
    else if (profile === 'sc_2nd_property') absdRate = 0.20;
    else if (profile === 'sc_3rd_plus') absdRate = 0.30;
    else if (profile === 'spr_1st_property') absdRate = 0.05;
    else if (profile === 'spr_2nd_property') absdRate = 0.30;
    else if (profile === 'spr_3rd_plus') absdRate = 0.35;
    else if (profile === 'foreigner') absdRate = 0.60;
    else if (profile === 'entity_company') absdRate = 0.65;
  }

  const absd = price * absdRate;
  const totalStampDuty = bsd + absd;
  const totalAcquisitionCost = price + totalStampDuty;

  const breakdown = [
    { label: 'Property Purchase Price / Market Valuation', value: price },
    { label: `Buyer's Stamp Duty (BSD Tiered)`, value: bsd, isDeduction: true },
    ...(absd > 0 ? [{ label: `Additional Buyer's Stamp Duty (ABSD - ${(absdRate * 100).toFixed(0)}%)`, value: absd, isDeduction: true }] : []),
    { label: 'Total Stamp Duties Payable to IRAS', value: totalStampDuty, isTotal: true },
    { label: 'Total Cost of Acquisition (Price + Duties)', value: totalAcquisitionCost, isFinal: true },
  ];

  return {
    grossIncome: price,
    netIncome: totalAcquisitionCost,
    totalTax: totalStampDuty,
    effectiveRate: totalStampDuty / price,
    breakdown,
    currency: 'SGD',
    currencySymbol: 'S$',
    additionalInsights: [
      `Stamp duties must be stamped and paid to IRAS within 14 days of signing the Sale and Purchase Agreement.`,
      profile === 'sc_1st_property'
        ? `Singapore Citizens purchasing their 1st residential property enjoy 0% ABSD.`
        : `ABSD rate of ${(absdRate * 100).toFixed(0)}% applies based on your buyer residency and property count profile.`,
      `BSD for residential properties ranges progressively from 1% up to 6% for portions exceeding S$ 3,000,000.`,
    ],
  };
}

// 3. Corporate Income Tax & Start-Up Tax Exemption (SUTE)
function calculateCorporateTaxSute(inputs: TaxInput): TaxResult {
  const chargeableIncome = safeVal(inputs.chargeable_income ?? inputs.profit);
  const eligibility = String(inputs.company_eligibility || 'startup_first_3_years');

  if (chargeableIncome <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Chargeable Income', value: 0 }],
      currency: 'SGD',
      currencySymbol: 'S$',
    };
  }

  const headlineRate = 0.17; // 17%
  let exemptIncome = 0;

  if (eligibility === 'startup_first_3_years') {
    // SUTE Scheme: 75% on first $100k, 50% on next $100k
    const tier1 = Math.min(chargeableIncome, 100000) * 0.75;
    const tier2 = chargeableIncome > 100000 ? Math.min(chargeableIncome - 100000, 100000) * 0.50 : 0;
    exemptIncome = tier1 + tier2;
  } else if (eligibility === 'general_scheme_pasp') {
    // Partial Tax Exemption (PTE): 75% on first $10k, 50% on next $190k
    const tier1 = Math.min(chargeableIncome, 10000) * 0.75;
    const tier2 = chargeableIncome > 10000 ? Math.min(chargeableIncome - 10000, 190000) * 0.50 : 0;
    exemptIncome = tier1 + tier2;
  }

  const taxableIncomeAfterExemption = Math.max(0, chargeableIncome - exemptIncome);
  const taxBeforeRebate = taxableIncomeAfterExemption * headlineRate;

  // CIT Rebate (e.g. 50% capped at $40,000 for qualifying YAs)
  const citRebate = Math.min(taxBeforeRebate * 0.50, 40000);
  const finalCorporateTax = Math.max(0, taxBeforeRebate - citRebate);
  const retainedProfit = chargeableIncome - finalCorporateTax;

  const breakdown = [
    { label: 'Chargeable Corporate Income (Net Profit)', value: chargeableIncome },
    { label: `Tax-Exempt Income (${eligibility === 'startup_first_3_years' ? 'SUTE Startup Scheme' : 'Partial Tax Exemption'})`, value: exemptIncome },
    { label: 'Taxable Income Subject to 17% Rate', value: taxableIncomeAfterExemption, isTotal: true },
    { label: 'Corporate Tax (17% Headline Rate)', value: taxBeforeRebate, isDeduction: true },
    ...(citRebate > 0 ? [{ label: 'Corporate Income Tax (CIT) Rebate', value: citRebate }] : []),
    { label: 'Net Corporate Tax Payable to IRAS', value: finalCorporateTax, isDeduction: true },
    { label: 'Net Retained Corporate Profit After Tax', value: retainedProfit, isFinal: true },
  ];

  return {
    grossIncome: chargeableIncome,
    netIncome: retainedProfit,
    totalTax: finalCorporateTax,
    effectiveRate: finalCorporateTax / chargeableIncome,
    breakdown,
    currency: 'SGD',
    currencySymbol: 'S$',
    quarterlyPayment: Math.round(finalCorporateTax / 4),
    additionalInsights: [
      `Effective Corporate Tax Rate is only ${( (finalCorporateTax / chargeableIncome) * 100 ).toFixed(2)}%, well below the 17% headline rate.`,
      `Under Singapore's single-tier corporate tax system, dividends distributed to shareholders are 100% tax-exempt in the hands of recipients.`,
    ],
  };
}

// 4. Freelancer & Self-Employed MediSave & Income Tax
function calculateMedisaveSelfEmployed(inputs: TaxInput): TaxResult {
  const grossIncome = safeVal(inputs.gross_trade_income ?? inputs.income);
  const method = String(inputs.deduction_method || 'actual_expenses');
  const actualExp = safeVal(inputs.actual_expenses, 0);
  const ageGroup = String(inputs.age_group || 'below_35');
  const otherIncome = safeVal(inputs.other_employment_income, 0);
  const srs = safeVal(inputs.voluntary_srs, 0, 15300);

  if (grossIncome <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Trade Income', value: 0 }],
      currency: 'SGD',
      currencySymbol: 'S$',
    };
  }

  // Deemed 60% Simplified Expense Ratio (SER) or Actual Expenses
  const allowableExpenses = method === 'fixed_expense_ratio_ser' ? grossIncome * 0.60 : actualExp;
  const netTradeIncome = Math.max(0, grossIncome - allowableExpenses);

  // MediSave Contribution Rate (ranges 4.0% to 10.5% depending on NTI and age)
  let medisaveRate = 0.08;
  if (ageGroup === 'below_35') medisaveRate = 0.08;
  else if (ageGroup === '35_to_44') medisaveRate = 0.09;
  else if (ageGroup === '45_to_49') medisaveRate = 0.10;
  else medisaveRate = 0.105;

  let mandatoryMedisave = 0;
  if (netTradeIncome > 6000) {
    // Capped at max contribution base of S$ 84,000
    const contributionBase = Math.min(netTradeIncome, 84000);
    mandatoryMedisave = contributionBase * medisaveRate;
  }

  // Personal Income Tax on Total Assessable Income
  const assessableIncome = netTradeIncome + otherIncome;
  const earnedIncomeRelief = 1000;
  const totalReliefs = Math.min(80000, earnedIncomeRelief + mandatoryMedisave + srs);
  const chargeableIncome = Math.max(0, assessableIncome - totalReliefs);
  const incomeTax = calculateIrasIncomeTax(chargeableIncome);

  const totalObligations = mandatoryMedisave + incomeTax;
  const netTakeHome = grossIncome - allowableExpenses - totalObligations;

  const breakdown = [
    { label: 'Gross Trade Income (Freelance / Sole Proprietorship)', value: grossIncome },
    { label: 'Allowable Business Expenses Incurred', value: allowableExpenses, isDeduction: true },
    { label: 'Net Trade Income (NTI)', value: netTradeIncome, isTotal: true },
    { label: `Mandatory MediSave Contribution (${(medisaveRate * 100).toFixed(1)}%)`, value: mandatoryMedisave, isDeduction: true },
    { label: 'IRAS Personal Income Tax Liability', value: incomeTax, isDeduction: true },
    { label: 'Total Statutory Taxes & Levies', value: totalObligations, isDeduction: true },
    { label: 'Net Take-Home Earnings After Tax & MediSave', value: netTakeHome, isFinal: true },
  ];

  return {
    grossIncome,
    netIncome: netTakeHome,
    totalTax: totalObligations,
    effectiveRate: totalObligations / grossIncome,
    breakdown,
    currency: 'SGD',
    currencySymbol: 'S$',
    quarterlyPayment: Math.round(mandatoryMedisave / 4),
    additionalInsights: [
      `Self-employed individuals earning > S$ 6,000/year must contribute to MediSave to renew business registration and trade licenses.`,
      `100% of mandatory MediSave contributions qualify as personal tax relief against your taxable income.`,
    ],
  };
}

// 5. Tenancy Stamp Duty & Landlord Rental Tax
function calculateTenancyStampDuty(inputs: TaxInput): TaxResult {
  const monthlyRent = safeVal(inputs.monthly_rent ?? inputs.rent);
  const durationMonths = safeVal(inputs.lease_duration_months, 12);
  const advanceLumpSum = safeVal(inputs.advance_lump_sum, 0);
  const expenseOption = String(inputs.landlord_expense_option || 'deemed_15_pct');
  const actualExpenses = safeVal(inputs.actual_rental_expenses, 0);
  const mortgageInterest = safeVal(inputs.annual_mortgage_interest, 0);

  if (monthlyRent <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Monthly Rent', value: 0 }],
      currency: 'SGD',
      currencySymbol: 'S$',
    };
  }

  const totalRentForPeriod = monthlyRent * durationMonths + advanceLumpSum;
  const leaseYears = durationMonths / 12;
  const averageAnnualRent = totalRentForPeriod / Math.max(1, leaseYears);

  // Tenancy Stamp Duty:
  // For lease <= 4 years: 0.4% of total rent for the period
  // For lease > 4 years: 0.4% of (4 * AAR)
  let stampDuty = 0;
  if (averageAnnualRent > 1000) {
    if (leaseYears <= 4) {
      stampDuty = totalRentForPeriod * 0.004;
    } else {
      stampDuty = 4 * averageAnnualRent * 0.004;
    }
  }

  // Annual Landlord Taxable Rental Income
  const grossAnnualRent = monthlyRent * 12;
  const deemedOrActualExp = expenseOption === 'deemed_15_pct' ? grossAnnualRent * 0.15 : actualExpenses;
  const netTaxableRent = Math.max(0, grossAnnualRent - deemedOrActualExp - mortgageInterest);
  const estimatedTax = calculateIrasIncomeTax(netTaxableRent);

  const breakdown = [
    { label: `Total Rent Payable across ${durationMonths}-Month Lease`, value: totalRentForPeriod },
    { label: 'Average Annual Rent (AAR)', value: averageAnnualRent },
    { label: 'IRAS Tenancy Agreement Stamp Duty (0.4%)', value: stampDuty, isDeduction: true },
    { label: 'Annual Gross Rental Income', value: grossAnnualRent, isTotal: true },
    { label: `Landlord Allowable Expenses (${expenseOption === 'deemed_15_pct' ? '15% Deemed Flat' : 'Actual Incurred'})`, value: deemedOrActualExp, isDeduction: true },
    ...(mortgageInterest > 0 ? [{ label: 'Deductible Mortgage Interest on Property', value: mortgageInterest, isDeduction: true }] : []),
    { label: 'Net Annual Taxable Rental Income', value: netTaxableRent, isTotal: true },
    { label: 'Estimated Annual Tax on Rental Income', value: estimatedTax, isDeduction: true },
  ];

  return {
    grossIncome: grossAnnualRent,
    netIncome: grossAnnualRent - estimatedTax - deemedOrActualExp - mortgageInterest,
    totalTax: estimatedTax + stampDuty,
    effectiveRate: (estimatedTax + stampDuty) / grossAnnualRent,
    breakdown,
    currency: 'SGD',
    currencySymbol: 'S$',
    additionalInsights: [
      `Tenancy Stamp Duty is typically borne by the tenant and must be paid to IRAS within 14 days of signing the lease.`,
      `Landlords can claim a simplified 15% flat deduction of gross rental income for maintenance expenses without keeping supporting receipts.`,
    ],
  };
}
