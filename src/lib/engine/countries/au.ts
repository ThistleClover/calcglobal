// src/lib/engine/countries/au.ts
// Australia ATO PAYG Income Tax Engine — 2026/27 Tax Year
// Sources: ATO.gov.au, Tax Rates 2026-27, Medicare Levy Act, HELP Act

import { safeVal, type TaxInput, type TaxResult } from '../types';

function applyResidentTax(taxable: number): number {
  if (taxable <= 18200) return 0;
  if (taxable <= 45000) return (taxable - 18200) * 0.19;
  if (taxable <= 135000) return 5092 + (taxable - 45000) * 0.325;
  if (taxable <= 190000) return 34192 + (taxable - 135000) * 0.37;
  return 54592 + (taxable - 190000) * 0.45;
}

function applyNonResidentTax(taxable: number): number {
  if (taxable <= 0) return 0;
  if (taxable <= 135000) return taxable * 0.325;
  if (taxable <= 190000) return 43875 + (taxable - 135000) * 0.37;
  return 64225 + (taxable - 190000) * 0.45;
}

function applyLITO(incomeTax: number, taxable: number): number {
  if (taxable <= 0) return 0;
  // Low Income Tax Offset: max $700, phases out
  if (taxable <= 37500) return Math.min(incomeTax, 700);
  if (taxable <= 45000) return Math.min(incomeTax, Math.max(0, 700 - (taxable - 37500) * 0.05));
  if (taxable <= 66667) return Math.min(incomeTax, Math.max(0, 325 - (taxable - 45000) * 0.015));
  return 0;
}

function calcMedicare(taxable: number, privateHealth: boolean, residency: string): number {
  if (residency !== 'resident' || taxable <= 0) return 0;
  // Medicare Levy: 2%, smoothly phased in over $22,801 at 10% of excess
  let levy = 0;
  if (taxable > 22801) {
    levy = Math.min(taxable * 0.02, (taxable - 22801) * 0.10);
  }
  // Medicare Levy Surcharge
  let surcharge = 0;
  if (!privateHealth && taxable > 93000) {
    if (taxable <= 108000) surcharge = taxable * 0.01;
    else if (taxable <= 144000) surcharge = taxable * 0.0125;
    else surcharge = taxable * 0.015;
  }
  return levy + surcharge;
}

function applyWorkingHolidayTax(taxable: number): number {
  if (taxable <= 0) return 0;
  if (taxable <= 45000) return taxable * 0.15;
  if (taxable <= 135000) return 6750 + (taxable - 45000) * 0.325;
  if (taxable <= 190000) return 36000 + (taxable - 135000) * 0.37;
  return 56350 + (taxable - 190000) * 0.45;
}

function calcHECS(income: number): { amount: number; rate: number } {
  if (income < 54435) return { amount: 0, rate: 0 };
  // 2026/27 HECS/HELP repayment thresholds
  const tiers = [
    [54435, 0.010], [62739, 0.020], [70000, 0.025], [75001, 0.030],
    [80001, 0.040], [85001, 0.045], [90001, 0.050], [95001, 0.055],
    [105001, 0.060], [115001, 0.065], [125001, 0.075], [141848, 0.100],
  ] as [number, number][];

  let rate = 0;
  for (const [threshold, r] of tiers) {
    if (income >= threshold) rate = r;
  }
  return { amount: income * rate, rate };
}

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'ato-payg-income-tax-calculator');

  switch (calcId) {
    case 'sole-trader-tax-calculator':
      return calculateSoleTrader(inputs);
    case 'superannuation-calculator':
      return calculateSuperannuation(inputs);
    case 'stamp-duty-calculator':
      return calculateStampDuty(inputs);
    case 'hecs-repayment-calculator':
      return calculateHecsRepayment(inputs);
    case 'ato-payg-income-tax-calculator':
    default:
      return calculatePrimary(inputs);
  }
}

function calculatePrimary(inputs: TaxInput): TaxResult {
  const grossAnnual = safeVal(
    inputs.gross_annual ?? inputs.gross_income ?? inputs.annual_income ?? inputs.income
  );

  if (grossAnnual <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Gross Annual Income', value: 0 },
        { label: 'Annual Net Take-Home', value: 0, isFinal: true },
        { label: 'Monthly Take-Home', value: 0, isTotal: true },
      ],
      currency: 'AUD',
      currencySymbol: 'A$',
      additionalInsights: ['Gross income is 0. No tax payable.'],
    };
  }

  const residency = String(inputs.residency || 'resident');
  const hecsDebt =
    String(inputs.hecs_debt || 'no') === 'yes' ||
    inputs.hecs_debt === true ||
    safeVal(inputs.hecs_debt_balance) > 0;
  const privateHealth =
    String(inputs.private_health || 'no') === 'yes' || inputs.private_health === true;

  // Tax on taxable income
  const incomeTax =
    residency === 'working_holiday'
      ? applyWorkingHolidayTax(grossAnnual)
      : residency === 'resident'
      ? applyResidentTax(grossAnnual)
      : applyNonResidentTax(grossAnnual);

  // LITO (residents only)
  const litoOffset = residency === 'resident' ? applyLITO(incomeTax, grossAnnual) : 0;
  const taxAfterLITO = Math.max(0, incomeTax - litoOffset);

  // Medicare
  const medicareTotal = calcMedicare(grossAnnual, privateHealth, residency);
  const medicareLevy = residency === 'resident' ? Math.min(medicareTotal, grossAnnual * 0.02) : 0;
  const medicareSurcharge = Math.max(0, medicareTotal - medicareLevy);

  // HECS/HELP
  const hecs = hecsDebt ? calcHECS(grossAnnual) : { amount: 0, rate: 0 };

  const totalTax = taxAfterLITO + medicareTotal + hecs.amount;
  const netIncome = Math.max(0, grossAnnual - totalTax);
  const effectiveRate = grossAnnual > 0 ? totalTax / grossAnnual : 0;

  const breakdown = [
    { label: 'Gross Annual Income', value: grossAnnual },
    { label: 'Income Tax (ATO Rates)', value: incomeTax, isDeduction: true },
    ...(litoOffset > 0 ? [{ label: 'Low Income Tax Offset (LITO)', value: litoOffset, isDeduction: false }] : []),
    { label: 'Tax After LITO', value: taxAfterLITO, isTotal: true },
    { label: 'Medicare Levy (2%)', value: medicareLevy, isDeduction: true },
    ...(medicareSurcharge > 0 ? [{ label: 'Medicare Levy Surcharge (no private health)', value: medicareSurcharge, isDeduction: true }] : []),
    ...(hecs.amount > 0 ? [{ label: `HECS/HELP Repayment (${(hecs.rate * 100).toFixed(1)}%)`, value: hecs.amount, isDeduction: true }] : []),
    { label: 'Annual Net Take-Home', value: netIncome, isFinal: true },
    { label: 'Monthly Take-Home', value: netIncome / 12, isTotal: true },
  ];

  const insights: string[] = [];
  if (!privateHealth && grossAnnual > 93000) {
    insights.push(`You are paying the Medicare Levy Surcharge (~A$${Math.round(medicareSurcharge).toLocaleString()}/yr). Private hospital cover could save you money.`);
  }
  if (hecsDebt && hecs.amount > 0) {
    insights.push(`Your compulsory HECS/HELP repayment is ${(hecs.rate * 100).toFixed(1)}% of income — A$${Math.round(hecs.amount).toLocaleString()} this year.`);
  }
  if (grossAnnual > 45000 && grossAnnual < 135000) {
    insights.push('You are in the 32.5% marginal tax bracket. Super salary sacrifice and deductible contributions can reduce your taxable income.');
  }

  return {
    grossIncome: grossAnnual,
    netIncome,
    totalTax,
    effectiveRate,
    breakdown,
    currency: 'AUD',
    currencySymbol: 'A$',
    additionalInsights: insights,
  };
}

function calculateSoleTrader(inputs: TaxInput): TaxResult {
  const grossRevenue = safeVal(
    inputs.gross_revenue ?? inputs.gross_income ?? inputs.revenue
  );

  if (grossRevenue <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Gross Business Revenue', value: 0 },
        { label: 'Net Take-Home Sole Trader Income', value: 0, isFinal: true },
      ],
      currency: 'AUD',
      currencySymbol: 'A$',
      additionalInsights: ['Gross revenue is 0. No tax payable.'],
    };
  }

  const businessExpenses = safeVal(inputs.business_expenses ?? inputs.expenses);
  const homeOfficeCost = safeVal(inputs.home_office_cost);
  const homeOfficePct = safeVal(inputs.home_office_pct, 0, 100) / 100;
  const vehicleCost = safeVal(inputs.vehicle_cost);
  const vehicleBusinessPct = safeVal(inputs.vehicle_business_pct, 0, 100) / 100;
  const voluntarySuper = safeVal(inputs.super_concessional_contribution);
  const residency = String(inputs.residency || 'resident');
  const privateHealth =
    String(inputs.private_health || 'no') === 'yes' || inputs.private_health === true;

  const homeOfficeDeduction = homeOfficeCost * homeOfficePct;
  const vehicleDeduction = vehicleCost * vehicleBusinessPct;
  const totalOperatingDeductions = businessExpenses + homeOfficeDeduction + vehicleDeduction;

  const grossBusinessProfit = Math.max(0, grossRevenue - totalOperatingDeductions);
  const deductibleSuper = Math.min(30000, voluntarySuper);
  const taxableIncome = Math.max(0, grossBusinessProfit - deductibleSuper);

  const incomeTax =
    residency === 'working_holiday'
      ? applyWorkingHolidayTax(taxableIncome)
      : residency === 'resident'
      ? applyResidentTax(taxableIncome)
      : applyNonResidentTax(taxableIncome);

  const lito = residency === 'resident' ? applyLITO(incomeTax, taxableIncome) : 0;
  const taxAfterLITO = Math.max(0, incomeTax - lito);

  // Small Business Income Tax Offset (SBITO): 16% of tax on business income, max $1,000 (applies only if taxable income > 0)
  const sbito = taxableIncome > 0 ? Math.min(1000, taxAfterLITO * 0.16) : 0;
  const taxAfterSBITO = Math.max(0, taxAfterLITO - sbito);

  const medicare = calcMedicare(taxableIncome, privateHealth, residency);
  const totalTax = taxAfterSBITO + medicare;

  const netIncome = grossRevenue > 0 ? Math.max(0, grossRevenue - totalOperatingDeductions - totalTax) : 0;
  const effectiveRate = grossRevenue > 0 ? totalTax / grossRevenue : 0;

  const breakdown = [
    { label: 'Gross Business Revenue', value: grossRevenue },
    { label: 'General Operating Expenses', value: businessExpenses, isDeduction: true },
    { label: `Home Office Deduction (${(homeOfficePct * 100).toFixed(0)}% of costs)`, value: homeOfficeDeduction, isDeduction: true },
    { label: `Vehicle Expense Deduction (${(vehicleBusinessPct * 100).toFixed(0)}% of costs)`, value: vehicleDeduction, isDeduction: true },
    { label: 'Gross Business Profit', value: grossBusinessProfit, isTotal: true },
    { label: 'Tax-Deductible Super Contribution (capped $30k)', value: deductibleSuper, isDeduction: true },
    { label: 'Net Taxable Income', value: taxableIncome, isTotal: true },
    { label: 'Income Tax (ATO Rates)', value: incomeTax, isDeduction: true },
    ...(lito > 0 ? [{ label: 'Low Income Tax Offset (LITO)', value: lito, isDeduction: false }] : []),
    ...(sbito > 0 ? [{ label: 'Small Business Income Tax Offset (SBITO — 16%, max $1,000)', value: sbito, isDeduction: false }] : []),
    { label: 'Medicare Levy (2%)', value: medicare, isDeduction: true },
    { label: 'Total ATO Tax Payable', value: totalTax, isDeduction: true, percentage: grossRevenue > 0 ? (totalTax / grossRevenue) * 100 : 0 },
    { label: 'Net Take-Home Sole Trader Income', value: netIncome, isFinal: true },
  ];

  const insights: string[] = [];
  if (sbito > 0) {
    insights.push(`Small Business Income Tax Offset (SBITO) saved you A$${Math.round(sbito).toLocaleString()} in tax.`);
  }
  if (voluntarySuper > 30000) {
    insights.push(`Your voluntary super contribution of A$${voluntarySuper.toLocaleString()} exceeds the annual A$30,000 concessional cap. Excess amounts are taxed at marginal rates.`);
  }
  if (taxableIncome > 45000) {
    insights.push('As a sole trader earning over A$45,000, consider keeping track of logbooks and home office hours to maximize legitimate deductions.');
  }

  return {
    grossIncome: grossRevenue,
    netIncome,
    totalTax,
    effectiveRate,
    breakdown,
    currency: 'AUD',
    currencySymbol: 'A$',
    additionalInsights: insights,
  };
}

function calculateSuperannuation(inputs: TaxInput): TaxResult {
  const currentBalance = safeVal(inputs.current_balance);
  const salary = safeVal(
    inputs.annual_salary ?? inputs.gross_annual ?? inputs.gross_income ?? inputs.salary
  );
  const years = safeVal(inputs.years_to_retirement ?? inputs.years ?? 25, 0, 100);

  const voluntaryPct = safeVal(inputs.voluntary_contribution_pct, 0, 100) / 100;

  // Growth rate fallback logic (handles both e.g. 7 for 7% or 0.07 for 7%)
  const rawReturn = inputs.growth_rate ?? inputs.expected_return_pct ?? inputs.expected_return ?? inputs.return_rate;
  const returnVal = rawReturn === undefined || rawReturn === null || String(rawReturn).trim() === '' ? 7 : safeVal(rawReturn, 0, 100);
  const returnRate = returnVal > 1 ? returnVal / 100 : returnVal;

  const sgRate = 0.12; // 12% Super Guarantee from 1 July 2025
  const totalContribRate = sgRate + voluntaryPct;
  const grossAnnualContribution = salary * totalContribRate;

  // Division 293 check (> $250k total income)
  const isDiv293 = salary + grossAnnualContribution > 250000;
  const contribTaxRate = isDiv293 ? 0.30 : 0.15;
  const netAnnualContribution = grossAnnualContribution * (1 - contribTaxRate);

  // Future Value calculation
  const r = returnRate;
  const n = years;
  const fvPV = currentBalance * Math.pow(1 + r, n);
  const fvPMT = n === 0 ? 0 : r <= 0 ? netAnnualContribution * n : netAnnualContribution * ((Math.pow(1 + r, n) - 1) / r);
  const projectedBalance = fvPV + fvPMT;

  const totalNetContributions = currentBalance + netAnnualContribution * n;
  const totalGrossContributions = currentBalance + grossAnnualContribution * n;
  const investmentGrowth = Math.max(0, projectedBalance - totalNetContributions);

  // 4% Safe Withdrawal Rule monthly drawdown
  const annualDrawdown = projectedBalance * 0.04;
  const monthlyDrawdown = annualDrawdown / 12;

  const totalContribTax = grossAnnualContribution * contribTaxRate * years;

  const breakdown = [
    { label: 'Current Super Balance', value: currentBalance },
    { label: `Annual Salary`, value: salary },
    { label: `Employer SG Contribution (12%)`, value: salary * sgRate },
    { label: `Voluntary Contribution (${(voluntaryPct * 100).toFixed(1)}%)`, value: salary * voluntaryPct },
    { label: `Gross Annual Contribution`, value: grossAnnualContribution, isTotal: true },
    { label: `Contribution Tax Rate (${(contribTaxRate * 100).toFixed(0)}%${isDiv293 ? ' Div 293' : ''})`, value: grossAnnualContribution * contribTaxRate, isDeduction: true },
    { label: `Net Annual Contribution to Fund`, value: netAnnualContribution, isTotal: true },
    { label: `Total Gross Contributions Over ${years} Years`, value: totalGrossContributions },
    { label: `Total Investment Return Growth`, value: investmentGrowth },
    { label: `Projected Balance at Retirement`, value: projectedBalance, isFinal: true },
    { label: `Estimated Monthly Drawdown (4% Rule)`, value: monthlyDrawdown, isTotal: true },
  ];

  const insights: string[] = [];
  if (isDiv293) {
    insights.push(`Your income exceeds A$250,000. Division 293 applies an extra 15% tax on concessional super contributions (30% total).`);
  }
  if (grossAnnualContribution > 30000) {
    insights.push(`Your total annual super contributions (A$${Math.round(grossAnnualContribution).toLocaleString()}) exceed the A$30,000 concessional cap.`);
  }
  insights.push(`Compound interest is projected to add A$${Math.round(investmentGrowth).toLocaleString()} to your retirement nest egg over ${years} years.`);

  return {
    grossIncome: projectedBalance,
    netIncome: projectedBalance,
    totalTax: totalContribTax,
    effectiveRate: grossAnnualContribution > 0 ? (grossAnnualContribution * contribTaxRate) / grossAnnualContribution : 0,
    breakdown,
    currency: 'AUD',
    currencySymbol: 'A$',
    additionalInsights: insights,
  };
}

function calculateStampDuty(inputs: TaxInput): TaxResult {
  const price = safeVal(
    inputs.property_price ?? inputs.property_value ?? inputs.price ?? inputs.value
  );

  if (price <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Property Purchase Price', value: 0 },
        { label: 'Total Capital Required for Purchase', value: 0, isFinal: true },
      ],
      currency: 'AUD',
      currencySymbol: 'A$',
      additionalInsights: ['Property price is 0. No stamp duty payable.'],
    };
  }

  const rawState = String(inputs.state || 'NSW').toUpperCase();
  const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
  const isInvalidState = !validStates.includes(rawState);
  const state = isInvalidState ? 'NSW' : rawState;

  const buyerType = String(inputs.buyer_type || 'owner_occupier');

  let baseDuty = 0;
  let fhbExemption = 0;
  let foreignSurchargeRate = 0;

  if (buyerType === 'foreign') {
    if (['NSW', 'VIC', 'QLD', 'TAS'].includes(state)) foreignSurchargeRate = 0.08;
    else if (['WA', 'SA'].includes(state)) foreignSurchargeRate = 0.07;
    else foreignSurchargeRate = 0;
  }

  if (price > 0) {
    switch (state) {
      case 'NSW': {
        if (price <= 17000) baseDuty = price * 0.0125;
        else if (price <= 36000) baseDuty = 212 + (price - 17000) * 0.015;
        else if (price <= 93000) baseDuty = 497 + (price - 36000) * 0.0175;
        else if (price <= 351000) baseDuty = 1495 + (price - 93000) * 0.035;
        else if (price <= 1168000) baseDuty = 10525 + (price - 351000) * 0.045;
        else baseDuty = 47290 + (price - 1168000) * 0.055;

        if (buyerType === 'first_home') {
          if (price <= 800000) fhbExemption = baseDuty;
          else if (price <= 1000000) fhbExemption = baseDuty * ((1000000 - price) / 200000);
        }
        break;
      }
      case 'VIC': {
        if (price <= 25000) baseDuty = price * 0.014;
        else if (price <= 130000) baseDuty = 350 + (price - 25000) * 0.024;
        else if (price <= 960000) baseDuty = 2870 + (price - 130000) * 0.06;
        else if (price <= 2000000) baseDuty = price * 0.055;
        else baseDuty = 110000 + (price - 2000000) * 0.065;

        if (buyerType === 'first_home') {
          if (price <= 600000) fhbExemption = baseDuty;
          else if (price <= 750000) fhbExemption = baseDuty * ((750000 - price) / 150000);
        }
        break;
      }
      case 'QLD': {
        if (price <= 5000) baseDuty = 0;
        else if (price <= 75000) baseDuty = (price - 5000) * 0.015;
        else if (price <= 540000) baseDuty = 1050 + (price - 75000) * 0.035;
        else if (price <= 1000000) baseDuty = 17325 + (price - 540000) * 0.045;
        else baseDuty = 38025 + (price - 1000000) * 0.0575;

        if (buyerType === 'first_home') {
          if (price <= 700000) fhbExemption = baseDuty;
          else if (price <= 800000) fhbExemption = baseDuty * ((800000 - price) / 100000);
        }
        break;
      }
      case 'WA': {
        if (price <= 120000) baseDuty = price * 0.019;
        else if (price <= 150000) baseDuty = 2280 + (price - 120000) * 0.0285;
        else if (price <= 360000) baseDuty = 3135 + (price - 150000) * 0.038;
        else if (price <= 725000) baseDuty = 11115 + (price - 360000) * 0.0475;
        else baseDuty = 28452.5 + (price - 725000) * 0.0515;

        if (buyerType === 'first_home') {
          if (price <= 450000) fhbExemption = baseDuty;
          else if (price <= 600000) fhbExemption = baseDuty * ((600000 - price) / 150000);
        }
        break;
      }
      case 'SA': {
        if (price <= 12000) baseDuty = price * 0.01;
        else if (price <= 30000) baseDuty = 120 + (price - 12000) * 0.02;
        else if (price <= 50000) baseDuty = 480 + (price - 30000) * 0.03;
        else if (price <= 100000) baseDuty = 1080 + (price - 50000) * 0.035;
        else if (price <= 200000) baseDuty = 2830 + (price - 100000) * 0.04;
        else if (price <= 250000) baseDuty = 6830 + (price - 200000) * 0.0425;
        else if (price <= 300000) baseDuty = 8955 + (price - 250000) * 0.0475;
        else if (price <= 500000) baseDuty = 11330 + (price - 300000) * 0.05;
        else baseDuty = 21330 + (price - 500000) * 0.055;

        if (buyerType === 'first_home') fhbExemption = baseDuty;
        break;
      }
      case 'TAS': {
        if (price <= 3000) baseDuty = 50;
        else if (price <= 25000) baseDuty = 50 + (price - 3000) * 0.0175;
        else if (price <= 75000) baseDuty = 435 + (price - 25000) * 0.0225;
        else if (price <= 200000) baseDuty = 1560 + (price - 75000) * 0.035;
        else if (price <= 375000) baseDuty = 5935 + (price - 200000) * 0.04;
        else baseDuty = 12935 + (price - 375000) * 0.045;

        if (buyerType === 'first_home' && price <= 600000) fhbExemption = baseDuty * 0.5;
        break;
      }
      case 'ACT': {
        if (price <= 260000) baseDuty = price * 0.012;
        else if (price <= 300000) baseDuty = 3120 + (price - 260000) * 0.022;
        else if (price <= 500000) baseDuty = 4000 + (price - 300000) * 0.034;
        else if (price <= 750000) baseDuty = 10800 + (price - 500000) * 0.043;
        else if (price <= 1000000) baseDuty = 21550 + (price - 750000) * 0.055;
        else baseDuty = 35300 + (price - 1000000) * 0.045;

        if (buyerType === 'first_home') fhbExemption = baseDuty;
        break;
      }
      case 'NT':
      default: {
        if (price <= 525000) baseDuty = 0.06571441 * Math.pow(price / 1000, 2) + 15 * (price / 1000);
        else if (price <= 3000000) baseDuty = price * 0.0495;
        else baseDuty = price * 0.0575;
        break;
      }
    }
  }

  const netStampDuty = Math.max(0, baseDuty - fhbExemption);
  const foreignSurcharge = price * foreignSurchargeRate;
  const transferFees = price > 0 ? 1500 : 0;
  const totalTaxAndFees = netStampDuty + foreignSurcharge + transferFees;
  const totalPurchaseCost = price + totalTaxAndFees;
  const effectiveRate = price > 0 ? netStampDuty / price : 0;

  const breakdown = [
    { label: 'Property Purchase Price', value: price },
    { label: `Base Stamp Duty (${state})`, value: baseDuty, isDeduction: true },
    ...(fhbExemption > 0 ? [{ label: 'First Home Buyer Concession / Exemption', value: fhbExemption, isDeduction: false }] : []),
    { label: 'Net Stamp Duty Payable', value: netStampDuty, isTotal: true },
    ...(foreignSurcharge > 0 ? [{ label: `Foreign Purchaser Surcharge (${(foreignSurchargeRate * 100).toFixed(0)}%)`, value: foreignSurcharge, isDeduction: true }] : []),
    { label: 'Estimated Transfer & Registration Fees', value: transferFees, isDeduction: true },
    { label: 'Total Stamp Duty & Fees', value: totalTaxAndFees, isDeduction: true, percentage: price > 0 ? (totalTaxAndFees / price) * 100 : 0 },
    { label: 'Total Capital Required for Purchase', value: totalPurchaseCost, isFinal: true },
  ];

  const insights: string[] = [];
  if (isInvalidState) {
    insights.push(`State "${inputs.state}" is invalid or missing. Defaulted calculation to NSW rates.`);
  }
  if (fhbExemption > 0) {
    insights.push(`First Home Buyer concession saved you A$${Math.round(fhbExemption).toLocaleString()} in transfer duty.`);
  }
  if (foreignSurcharge > 0) {
    insights.push(`Foreign purchaser surcharge adds A$${Math.round(foreignSurcharge).toLocaleString()} (${(foreignSurchargeRate * 100).toFixed(0)}%) to your purchase costs.`);
  }

  return {
    grossIncome: price,
    netIncome: totalPurchaseCost,
    totalTax: totalTaxAndFees,
    effectiveRate,
    breakdown,
    currency: 'AUD',
    currencySymbol: 'A$',
    additionalInsights: insights,
  };
}

function calculateHecsRepayment(inputs: TaxInput): TaxResult {
  const initialDebt = safeVal(
    inputs.hecs_debt_balance ?? inputs.hecs_debt ?? inputs.initial_debt
  );
  let income = safeVal(
    inputs.annual_income ?? inputs.gross_annual ?? inputs.gross_income ?? inputs.income
  );

  if (initialDebt <= 0) {
    return {
      grossIncome: income,
      netIncome: income,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Initial HECS/HELP Debt Balance', value: 0 },
        { label: 'Current Annual Repayment Income', value: income },
        { label: 'No Debt Outstanding', value: 0, isTotal: true },
        { label: 'Total Out-of-Pocket Cost to Pay Off HELP Debt', value: 0, isFinal: true },
      ],
      currency: 'AUD',
      currencySymbol: 'A$',
      additionalInsights: ['You have no outstanding HECS/HELP debt.'],
    };
  }

  const rawGrowth = inputs.income_growth_pct ?? inputs.growth_rate ?? 3;
  const growthVal = safeVal(rawGrowth, 0, 100);
  const growthRate = growthVal > 1 ? growthVal / 100 : growthVal;

  const voluntaryPayment = safeVal(
    inputs.voluntary_annual_repayment ?? inputs.voluntary_repayment
  );

  const indexationRate = 0.038;

  const firstYearHecs = initialDebt > 0 ? calcHECS(income) : { amount: 0, rate: 0 };
  const firstYearCompulsory = Math.min(initialDebt, firstYearHecs.amount);

  let balance = initialDebt;
  let currIncome = income;
  let years = 0;
  let totalCompulsory = 0;
  let totalVoluntary = 0;
  let totalIndexation = 0;

  while (balance > 0 && years < 30) {
    years++;
    const compulsoryRate = calcHECS(currIncome).rate;
    const compulsoryAmt = Math.min(balance, currIncome * compulsoryRate);
    const voluntaryAmt = Math.min(balance - compulsoryAmt, voluntaryPayment);
    const totalRepaidThisYear = compulsoryAmt + voluntaryAmt;

    totalCompulsory += compulsoryAmt;
    totalVoluntary += voluntaryAmt;
    balance -= totalRepaidThisYear;

    if (balance > 0) {
      const indexationThisYear = balance * indexationRate;
      totalIndexation += indexationThisYear;
      balance += indexationThisYear;
    }

    currIncome *= 1 + growthRate;
  }

  const isPaidOff = initialDebt === 0 || balance <= 0;
  const totalRepaid = totalCompulsory + totalVoluntary;
  const effectiveRate = income > 0 ? firstYearCompulsory / income : 0;

  const breakdown = [
    { label: 'Initial HECS/HELP Debt Balance', value: initialDebt },
    { label: 'Current Annual Repayment Income', value: income },
    { label: `Year 1 Compulsory Repayment (${(firstYearHecs.rate * 100).toFixed(1)}%)`, value: firstYearCompulsory, isDeduction: true },
    ...(voluntaryPayment > 0 ? [{ label: 'Year 1 Voluntary Repayment', value: voluntaryPayment, isDeduction: true }] : []),
    { label: initialDebt === 0 ? 'No Debt Outstanding' : (isPaidOff ? 'Projected Years to Debt-Free' : 'Will never pay off (30+ years)'), value: initialDebt === 0 ? 0 : (isPaidOff ? years : null), isTotal: true },
    { label: 'Total Compulsory Repayments Paid', value: totalCompulsory, isDeduction: true },
    ...(totalVoluntary > 0 ? [{ label: 'Total Voluntary Repayments Paid', value: totalVoluntary, isDeduction: true }] : []),
    { label: 'Total Indexation Added (CPI ~3.8%/yr)', value: totalIndexation, isDeduction: true },
    { label: 'Total Out-of-Pocket Cost to Pay Off HELP Debt', value: totalRepaid, isFinal: true },
  ];

  const insights: string[] = [];
  if (initialDebt === 0) {
    insights.push('You have no outstanding HECS/HELP debt.');
  } else if (firstYearHecs.amount === 0) {
    insights.push(`Your annual income (A$${income.toLocaleString()}) is below the minimum A$54,435 threshold. No compulsory repayments are required this year, but indexation will still apply.`);
  } else if (!isPaidOff) {
    insights.push('At your current income level and projected salary growth, your HECS/HELP debt will not be paid off within 30 years.');
  } else {
    insights.push(`At your current income level and projected salary growth, your HECS/HELP debt will be completely paid off in ${years} year${years > 1 ? 's' : ''}.`);
  }
  if (voluntaryPayment > 0 && initialDebt > 0) {
    insights.push(`Making voluntary payments of A$${voluntaryPayment.toLocaleString()}/yr will reduce your overall payoff time and indexation costs.`);
  }

  return {
    grossIncome: income,
    netIncome: Math.max(0, income - firstYearCompulsory),
    totalTax: firstYearCompulsory,
    effectiveRate,
    breakdown,
    currency: 'AUD',
    currencySymbol: 'A$',
    additionalInsights: insights,
  };
}
