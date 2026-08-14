// src/lib/engine/countries/ch.ts
// Switzerland Financial & Tax Engine — 2025/2026 Rules
// Sources: Eidgenössische Steuerverwaltung (ESTV / AFC), BSV, Cantonal Tax Administrations (ZH, BE, GE, VD, ZG, BS, etc.)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'gross-to-net-salary-switzerland');

  switch (calcId) {
    case 'pillar-3a-tax-saving-switzerland':
      return calculatePillar3a(inputs);
    case 'einzelfirma-vs-gmbh-switzerland':
      return calculateEinzelfirmaVsGmbh(inputs);
    case 'real-estate-transfer-mortgage-switzerland':
      return calculateSwissRealEstate(inputs);
    case 'eigenmietwert-rental-value-switzerland':
      return calculateEigenmietwert(inputs);
    case 'gross-to-net-salary-switzerland':
    default:
      return calculateGrossToNet(inputs);
  }
}

// Cantonal average tax rates multiplier
function getCantonTaxMultiplier(canton: string): { name: string; multiplier: number; corporateRate: number } {
  const c = canton.toLowerCase();
  if (c.includes('zg') || c.includes('zug')) return { name: 'Zug', multiplier: 0.11, corporateRate: 0.118 };
  if (c.includes('sz') || c.includes('schwyz')) return { name: 'Schwyz', multiplier: 0.12, corporateRate: 0.125 };
  if (c.includes('nw') || c.includes('nidwalden')) return { name: 'Nidwalden', multiplier: 0.125, corporateRate: 0.125 };
  if (c.includes('zh') || c.includes('zürich') || c.includes('zurich')) return { name: 'Zürich', multiplier: 0.18, corporateRate: 0.197 };
  if (c.includes('lu') || c.includes('luzern')) return { name: 'Luzern', multiplier: 0.155, corporateRate: 0.123 };
  if (c.includes('bs') || c.includes('basel-stadt')) return { name: 'Basel-Stadt', multiplier: 0.22, corporateRate: 0.130 };
  if (c.includes('ge') || c.includes('genève') || c.includes('geneva')) return { name: 'Genève', multiplier: 0.23, corporateRate: 0.140 };
  if (c.includes('vd') || c.includes('vaud')) return { name: 'Vaud', multiplier: 0.235, corporateRate: 0.140 };
  if (c.includes('be') || c.includes('bern')) return { name: 'Bern', multiplier: 0.24, corporateRate: 0.210 };
  if (c.includes('ne') || c.includes('neuchâtel')) return { name: 'Neuchâtel', multiplier: 0.245, corporateRate: 0.135 };
  return { name: 'Switzerland Average', multiplier: 0.18, corporateRate: 0.15 };
}

// 1. Gross to Net Salary & Social Deductions (Lohnabrechnung Schweiz)
function calculateGrossToNet(inputs: TaxInput): TaxResult {
  const grossSalary = safeVal(inputs.gross_salary ?? inputs.salary);
  const payPeriod = String(inputs.pay_period || 'monatlich_12x');
  const age = safeVal(inputs.age, 35);
  const canton = String(inputs.canton || 'zh');
  const children = safeVal(inputs.number_of_children, 0);

  if (grossSalary <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Annual Salary (Bruttolohn)', value: 0 }],
      currency: 'CHF',
      currencySymbol: 'CHF ',
    };
  }

  // Annual gross
  let annualGross = grossSalary;
  if (payPeriod.includes('12x') || payPeriod.includes('12')) annualGross = grossSalary * 12;
  if (payPeriod.includes('13x') || payPeriod.includes('13')) annualGross = grossSalary * 13;

  // 1. AHV / IV / EO (AVS / AI / APG): 5.30% employee (unlimited)
  const ahvEmployee = annualGross * 0.053;

  // 2. ALV / AC (Unemployment): 1.10% up to CHF 148,200 (solidarity ALV2 abolished in 2023)
  const alvEmployee = Math.min(annualGross, 148200) * 0.011;

  // 3. NBUV (Non-occupational accident insurance): ~1.2% up to CHF 148,200
  const nbuvEmployee = Math.min(annualGross, 148200) * 0.012;

  // 4. KTG (Daily sickness allowance): ~0.8%
  const ktgEmployee = annualGross * 0.008;

  // 5. 2nd Pillar BVG / LPP (Pensionskasse):
  // Coordination deduction (Koordinationsabzug 2025/2026): CHF 25,725
  // Coordinated salary capped at CHF 62,475
  const coordDeduction = 25725;
  const bvgCap = 88200;
  let bvgEmployee = 0;

  if (annualGross > 22050) {
    const coordinatedSalary = Math.min(Math.max(0, annualGross - coordDeduction), 62475);
    // BVG age graduated rates (employee share ~50%):
    // 25-34: 3.5%, 35-44: 5.0%, 45-54: 7.5%, 55-65: 9.0%
    let bvgRate = 0.05;
    if (age < 25) bvgRate = 0.0;
    else if (age <= 34) bvgRate = 0.035;
    else if (age <= 44) bvgRate = 0.050;
    else if (age <= 54) bvgRate = 0.075;
    else bvgRate = 0.090;

    bvgEmployee = coordinatedSalary * bvgRate;
  }

  const totalSocialDeductions = ahvEmployee + alvEmployee + nbuvEmployee + ktgEmployee + bvgEmployee;

  // 6. Taxes (Direct Federal Tax + Cantonal/Communal Tax)
  const cantonInfo = getCantonTaxMultiplier(canton);
  const taxableIncome = Math.max(0, annualGross - totalSocialDeductions - (children * 6500) - 3000);
  const federalTax = taxableIncome > 14500 ? taxableIncome * 0.035 : 0;
  const cantonalTax = taxableIncome * cantonInfo.multiplier;
  const totalTax = federalTax + cantonalTax;

  const totalAllDeductions = totalSocialDeductions + totalTax;
  const annualNetTakeHome = annualGross - totalAllDeductions;
  const monthlyNet = annualNetTakeHome / 12;

  const breakdown = [
    { label: 'Gross Annual Salary (Bruttojahreslohn)', value: annualGross },
    { label: 'AHV / IV / EO (1. Säule AVS/AI/APG 5,30%)', value: ahvEmployee, isDeduction: true },
    { label: 'ALV / AC (Arbeitslosenversicherung 1,10%)', value: alvEmployee, isDeduction: true },
    { label: 'NBUV & KTG (Unfall- & Krankentaggeld ~2,00%)', value: nbuvEmployee + ktgEmployee, isDeduction: true },
    { label: 'BVG / LPP Pensionskasse (2. Säule)', value: bvgEmployee, isDeduction: true },
    { label: 'Total Social Security Contributions (Sozialabzüge)', value: totalSocialDeductions, isTotal: true },
    { label: `Direct Federal Tax (Direkte Bundessteuer)`, value: federalTax, isDeduction: true },
    { label: `Cantonal & Communal Income Tax (${cantonInfo.name} Staats- & Gemeindesteuer)`, value: cantonalTax, isDeduction: true },
    { label: 'Annual Net Take-Home Pay (Nettojahreslohn)', value: annualNetTakeHome, isFinal: true },
    { label: 'Monthly Net Take-Home Pay (Nettomonatslohn)', value: Math.round(monthlyNet), isTotal: true },
  ];

  return {
    grossIncome: annualGross,
    netIncome: annualNetTakeHome,
    totalTax: totalAllDeductions,
    effectiveRate: totalAllDeductions / annualGross,
    breakdown,
    currency: 'CHF',
    currencySymbol: 'CHF ',
    additionalInsights: [
      `Your annual take-home ratio in Canton ${cantonInfo.name} is ${( (annualNetTakeHome / annualGross) * 100 ).toFixed(1)}% of gross compensation.`,
      `Your employer matches your AHV (5.30%), ALV (1.10%), and BVG 2nd Pillar pension contributions on top of your gross wage.`,
    ],
  };
}

// 2. Pillar 3a Tax Savings (Säule 3a Steuerersparnis)
function calculatePillar3a(inputs: TaxInput): TaxResult {
  const income = safeVal(inputs.taxable_income ?? inputs.income);
  const canton = String(inputs.canton || 'zh');
  const empType = String(inputs.employment_type || 'employed_with_bvg');
  const contribution = safeVal(inputs.planned_contribution, 7258);
  const years = safeVal(inputs.years_to_retirement, 20);

  if (income <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Taxable Income', value: 0 }],
      currency: 'CHF',
      currencySymbol: 'CHF ',
    };
  }

  // Statutory Limits 2025/2026:
  // With BVG: CHF 7,258/year
  // Without BVG (Self-employed): 20% of net income up to CHF 36,288/year
  const hasBvg = empType.includes('employed') || empType.includes('with_bvg');
  const maxLimit = hasBvg ? 7258 : Math.min(36288, income * 0.20);
  const actualContribution = Math.min(contribution, maxLimit);

  const cantonInfo = getCantonTaxMultiplier(canton);
  // Marginal tax rate (Federal + Cantonal)
  const marginalRate = Math.min(0.42, 0.08 + cantonInfo.multiplier * 1.15);
  const annualTaxSavings = actualContribution * marginalRate;

  // Long-term retirement wealth accumulation (assuming 4.5% annual return)
  let accumulatedWealth = 0;
  for (let i = 0; i < years; i++) {
    accumulatedWealth = (accumulatedWealth + actualContribution) * 1.045;
  }

  const breakdown = [
    { label: 'Taxable Income (Steuerbares Einkommen)', value: income },
    { label: `Statutory Maximum Pillar 3a Limit (Maximalbetrag ${hasBvg ? 'mit BVG' : 'ohne BVG'})`, value: maxLimit },
    { label: 'Annual Pillar 3a Contribution (Einzahlung Säule 3a)', value: actualContribution },
    { label: `Estimated Marginal Tax Rate (${cantonInfo.name} Grenzsteuersatz ${(marginalRate * 100).toFixed(1)}%)`, value: marginalRate * 100 },
    { label: 'Immediate Annual Tax Savings (Jährliche Steuerersparnis)', value: annualTaxSavings, isFinal: true },
    { label: `Projected Retirement Wealth after ${years} Years (at 4.5% p.a.)`, value: Math.round(accumulatedWealth), isTotal: true },
  ];

  return {
    grossIncome: actualContribution,
    netIncome: annualTaxSavings,
    totalTax: 0,
    effectiveRate: 0,
    breakdown,
    currency: 'CHF',
    currencySymbol: 'CHF ',
    additionalInsights: [
      `By depositing CHF ${Math.round(actualContribution).toLocaleString('de-CH')} into Pillar 3a, you save approximately CHF ${Math.round(annualTaxSavings).toLocaleString('de-CH')} directly on your tax return this year.`,
      `Over ${years} years, your contributions generate approximately CHF ${Math.round(accumulatedWealth).toLocaleString('de-CH')} in tax-deferred retirement capital.`,
    ],
  };
}

// 3. Sole Proprietorship vs GmbH (Einzelfirma vs. GmbH Simulator)
function calculateEinzelfirmaVsGmbh(inputs: TaxInput): TaxResult {
  const revenue = safeVal(inputs.annual_revenue ?? inputs.revenue);
  const expenses = safeVal(inputs.business_expenses ?? inputs.expenses);
  const canton = String(inputs.canton_seat || 'zh');
  const targetSalary = safeVal(inputs.target_director_salary, 100000);
  const dividendOption = String(inputs.dividend_payout_ratio || '100_pct');

  if (revenue <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Annual Business Revenue', value: 0 }],
      currency: 'CHF',
      currencySymbol: 'CHF ',
    };
  }

  const cantonInfo = getCantonTaxMultiplier(canton);
  const netOperatingProfit = Math.max(0, revenue - expenses);

  // --- 1. EINZELFIRMA ---
  // SVA AHV/IV/EO sliding scale (~10% for profit >= 58,800) + admin fee
  const ahvEinzelfirma = netOperatingProfit * 0.103;
  const taxableIncomeEinzelfirma = Math.max(0, netOperatingProfit - ahvEinzelfirma);
  const taxEinzelfirma = taxableIncomeEinzelfirma * (0.05 + cantonInfo.multiplier);
  const totalDeductionsEinzelfirma = ahvEinzelfirma + taxEinzelfirma;
  const netCashEinzelfirma = netOperatingProfit - totalDeductionsEinzelfirma;

  // --- 2. GMBH ---
  // Director Salary deducted from company
  const actualSalary = Math.min(targetSalary, netOperatingProfit);
  const socialOnSalary = actualSalary * 0.15; // AHV, ALV, BVG, UVG (~15% total split)
  const companyProfitBeforeTax = Math.max(0, netOperatingProfit - actualSalary - (socialOnSalary * 0.5));
  const corporateTax = companyProfitBeforeTax * cantonInfo.corporateRate;
  const netCorporateProfit = companyProfitBeforeTax - corporateTax;

  // Dividends: 70% partial taxation under Swiss Federal and Cantonal rules
  const dividendPayout = dividendOption.includes('100') ? netCorporateProfit : dividendOption.includes('70') ? netCorporateProfit * 0.7 : dividendOption.includes('50') ? netCorporateProfit * 0.5 : 0;
  const dividendTax = dividendPayout * 0.70 * (0.05 + cantonInfo.multiplier);
  const personalTaxOnSalary = Math.max(0, actualSalary - (socialOnSalary * 0.5)) * (0.04 + cantonInfo.multiplier);

  const totalGmbhTaxes = corporateTax + (socialOnSalary * 0.5) + personalTaxOnSalary + dividendTax;
  const netCashGmbh = (actualSalary - (socialOnSalary * 0.5) - personalTaxOnSalary) + (dividendPayout - dividendTax);

  const difference = netCashGmbh - netCashEinzelfirma;
  const isGmbhBetter = difference > 0;

  const breakdown = [
    { label: 'Annual Gross Operating Profit (EBITDA)', value: netOperatingProfit },
    { label: 'Einzelfirma: AHV/IV/EO Contributions (SVA ~10,3%)', value: ahvEinzelfirma, isDeduction: true },
    { label: 'Einzelfirma: Personal Income Tax', value: taxEinzelfirma, isDeduction: true },
    { label: 'Einzelfirma: Net Total Cash in Pocket', value: netCashEinzelfirma, isTotal: true },
    { label: `GmbH: Corporate Profit Tax (${(cantonInfo.corporateRate * 100).toFixed(1)}% Combined Rate)`, value: corporateTax, isDeduction: true },
    { label: 'GmbH: Director Salary & Dividend Taxes', value: personalTaxOnSalary + dividendTax, isDeduction: true },
    { label: 'GmbH: Net Total Cash in Pocket', value: netCashGmbh, isFinal: true },
    {
      label: isGmbhBetter
        ? `GmbH Annual Financial Advantage: +CHF ${Math.round(difference).toLocaleString('de-CH')}`
        : `Einzelfirma Annual Financial Advantage: +CHF ${Math.round(Math.abs(difference)).toLocaleString('de-CH')}`,
      value: Math.abs(difference),
    },
  ];

  return {
    grossIncome: netOperatingProfit,
    netIncome: isGmbhBetter ? netCashGmbh : netCashEinzelfirma,
    totalTax: isGmbhBetter ? totalGmbhTaxes : totalDeductionsEinzelfirma,
    effectiveRate: (isGmbhBetter ? totalGmbhTaxes : totalDeductionsEinzelfirma) / netOperatingProfit,
    breakdown,
    currency: 'CHF',
    currencySymbol: 'CHF ',
    additionalInsights: [
      `A GmbH provides full limited liability protection and allows optimization via the partial taxation of dividends (Teilbesteuerung 70%).`,
      `In low-tax cantons (e.g. Zug, Schwyz, Nidwalden), corporate profit tax is as low as 11.8% - 12.5%.`,
    ],
  };
}

// 4. Real Estate Purchase Fees & FINMA Mortgage Affordability (Tragbarkeitsprüfung)
function calculateSwissRealEstate(inputs: TaxInput): TaxResult {
  const price = safeVal(inputs.purchase_price ?? inputs.price);
  const canton = String(inputs.canton || 'zh');
  const downPayment = safeVal(inputs.down_payment, price * 0.20);
  const householdIncome = safeVal(inputs.gross_household_income, 180000);

  if (price <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Property Purchase Price', value: 0 }],
      currency: 'CHF',
      currencySymbol: 'CHF ',
    };
  }

  // Notary & Land Transfer Tax by canton:
  // ZH: 0.25%, BE: 1.8%, VD/GE: 3.3% - 4.0%, ZG/SZ: 0.3%
  let transferFeeRate = 0.015;
  const c = canton.toLowerCase();
  if (c.includes('zh') || c.includes('zürich')) transferFeeRate = 0.0025;
  else if (c.includes('be') || c.includes('bern')) transferFeeRate = 0.018;
  else if (c.includes('vd') || c.includes('vaud') || c.includes('ge') || c.includes('genève')) transferFeeRate = 0.035;
  else if (c.includes('zg') || c.includes('sz')) transferFeeRate = 0.003;

  const notaryAndTransferFee = price * transferFeeRate;
  const mortgageLoan = Math.max(0, price - downPayment);
  const schuldbriefFee = mortgageLoan * 0.002; // Mortgage deed fee ~0.2%
  const totalPurchaseFees = notaryAndTransferFee + schuldbriefFee;

  // FINMA Affordability Calculation (Tragbarkeitsprüfung):
  // 1. Imputed interest at 5.0%
  const imputedInterest = mortgageLoan * 0.05;
  // 2. Amortization (2nd mortgage down to 66.7% over 15 years)
  const secondMortgage = Math.max(0, mortgageLoan - price * 0.6667);
  const annualAmortization = secondMortgage / 15;
  // 3. Maintenance and ancillary costs at 1.0%
  const maintenanceCosts = price * 0.01;

  const totalAnnualHousingCosts = imputedInterest + annualAmortization + maintenanceCosts;
  const affordabilityRatio = householdIncome > 0 ? (totalAnnualHousingCosts / householdIncome) * 100 : 0;
  const isAffordable = affordabilityRatio <= 33.33;

  const breakdown = [
    { label: 'Property Purchase Price (Kaufpreis)', value: price },
    { label: 'Down Payment Equity Provided (Eigenkapital)', value: downPayment },
    { label: `Mortgage Loan Required (Hypothek ${( (mortgageLoan / price) * 100 ).toFixed(1)}% LTV)`, value: mortgageLoan },
    { label: `Notary & Property Transfer Tax (${(transferFeeRate * 100).toFixed(2)}%)`, value: notaryAndTransferFee, isDeduction: true },
    { label: 'Land Registry & Mortgage Deed Fees (Schuldbrieferrichtung)', value: schuldbriefFee, isDeduction: true },
    { label: 'Total Transaction Closing Costs (Kaufnebenkosten)', value: totalPurchaseFees, isTotal: true },
    { label: 'FINMA Theoretical Annual Housing Costs (5% Zinssatz + Nebenkosten)', value: totalAnnualHousingCosts },
    { label: `FINMA Affordability Ratio (${affordabilityRatio.toFixed(1)}% / Max 33.3%)`, value: affordabilityRatio, isFinal: true },
  ];

  return {
    grossIncome: price,
    netIncome: price + totalPurchaseFees,
    totalTax: totalPurchaseFees,
    effectiveRate: totalPurchaseFees / price,
    breakdown,
    currency: 'CHF',
    currencySymbol: 'CHF ',
    additionalInsights: [
      isAffordable
        ? `Passed FINMA Affordability Check: Housing costs represent ${affordabilityRatio.toFixed(1)}% of your gross income (≤ 33.3% bank threshold).`
        : `Warning: Affordability ratio of ${affordabilityRatio.toFixed(1)}% exceeds the 33.3% threshold. You need a higher down payment or gross income of at least CHF ${Math.round(totalAnnualHousingCosts * 3).toLocaleString('de-CH')}/year.`,
      `Minimum 20% equity is legally required by FINMA (at least 10% from 'hard' non-pension funds).`,
    ],
  };
}

// 5. Imputed Rental Value (Eigenmietwert & Property Deductions)
function calculateEigenmietwert(inputs: TaxInput): TaxResult {
  const propertyVal = safeVal(inputs.taxable_property_value ?? inputs.property_value);
  const canton = String(inputs.canton || 'zh');
  const mortgageInterest = safeVal(inputs.annual_mortgage_interest, 0);
  const actualMaintenance = safeVal(inputs.actual_maintenance_expenses, 0);
  const ageYears = safeVal(inputs.property_age_years, 12);
  const baseIncome = safeVal(inputs.taxable_income_before_property, 150000);

  if (propertyVal <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Taxable Property Value', value: 0 }],
      currency: 'CHF',
      currencySymbol: 'CHF ',
    };
  }

  // Eigenmietwert: ~3.5% to 4.5% of official taxable value
  const eigenmietwertRate = 0.04;
  const eigenmietwertAmount = propertyVal * eigenmietwertRate;

  // Maintenance Deduction: Pauschale (10% if <= 10 yrs, 20% if > 10 yrs) vs Actual
  const pauschalRate = ageYears <= 10 ? 0.10 : 0.20;
  const pauschalDeduction = eigenmietwertAmount * pauschalRate;
  const maintenanceDeduction = Math.max(pauschalDeduction, actualMaintenance);

  // Net Taxable Property Addition = Eigenmietwert - Mortgage Interest - Maintenance
  const netPropertyTaxAddition = eigenmietwertAmount - mortgageInterest - maintenanceDeduction;
  const updatedTaxableIncome = Math.max(0, baseIncome + netPropertyTaxAddition);

  const cantonInfo = getCantonTaxMultiplier(canton);
  const marginalTaxRate = 0.25; // Average marginal rate
  const taxImpact = netPropertyTaxAddition * marginalTaxRate;

  const breakdown = [
    { label: 'Official Taxable Property Cadastral Value (Steuerwert)', value: propertyVal },
    { label: 'Imputed Rental Value Added to Income (Eigenmietwert ~4%)', value: eigenmietwertAmount },
    { label: 'Deductible Mortgage Interest (Schuldzinsen)', value: mortgageInterest, isDeduction: true },
    {
      label: `Maintenance Deduction Claimed (${actualMaintenance > pauschalDeduction ? 'Actual Expenses' : `Pauschale ${(pauschalRate * 100).toFixed(0)}%`})`,
      value: maintenanceDeduction,
      isDeduction: true,
    },
    { label: 'Net Annual Taxable Impact of Real Estate', value: netPropertyTaxAddition, isTotal: true },
    { label: 'Adjusted Total Taxable Household Income', value: updatedTaxableIncome, isFinal: true },
  ];

  return {
    grossIncome: eigenmietwertAmount,
    netIncome: updatedTaxableIncome,
    totalTax: Math.max(0, taxImpact),
    effectiveRate: Math.abs(taxImpact) / propertyVal,
    breakdown,
    currency: 'CHF',
    currencySymbol: 'CHF ',
    additionalInsights: [
      netPropertyTaxAddition > 0
        ? `Owning this home adds CHF ${Math.round(netPropertyTaxAddition).toLocaleString('de-CH')} to your taxable income, increasing your tax bill by ~CHF ${Math.round(taxImpact).toLocaleString('de-CH')}.`
        : `Your deductions (mortgage interest + maintenance) exceed the Eigenmietwert, reducing your overall taxable income by CHF ${Math.round(Math.abs(netPropertyTaxAddition)).toLocaleString('de-CH')}.`,
      `The Swiss Parliament has passed legislation to reform the Eigenmietwert system for primary residences; monitor cantonal implementation timelines.`,
    ],
  };
}
