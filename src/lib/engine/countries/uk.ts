// src/lib/engine/countries/uk.ts
// United Kingdom Tax Engine — 2026/27 Tax Year
// Sources: HMRC, Autumn Budget 2024, Finance Act 2025

import type { TaxInput, TaxResult } from '../types';

// Helper for UK Income Tax (England / Wales / NI)
function applyUKIncomeTax(income: number, personalAllowance: number): number {
  // Taper PA: lose £1 for every £2 above £100,000
  const taperedPA = income > 100000
    ? Math.max(0, personalAllowance - Math.floor((income - 100000) / 2))
    : personalAllowance;

  const basicUpperAbsolute = taperedPA + 37700;
  const higherUpperAbsolute = 125140;

  let tax = 0;
  if (income > taperedPA) {
    const inBasic = Math.min(income, basicUpperAbsolute) - taperedPA;
    tax += Math.max(0, inBasic) * 0.20;
  }
  if (income > basicUpperAbsolute) {
    const inHigher = Math.min(income, higherUpperAbsolute) - basicUpperAbsolute;
    tax += Math.max(0, inHigher) * 0.40;
  }
  if (income > higherUpperAbsolute) {
    tax += (income - higherUpperAbsolute) * 0.45;
  }
  return Math.max(0, tax);
}

// Helper for Scottish Income Tax (2026/27)
function applyScottishIncomeTax(income: number, personalAllowance: number): number {
  const taperedPA = income > 100000
    ? Math.max(0, personalAllowance - Math.floor((income - 100000) / 2))
    : personalAllowance;

  if (income <= taperedPA) return 0;

  const starterUpper = taperedPA + 2306;
  const basicUpper = taperedPA + 13991;
  const intermediateUpper = taperedPA + 31092;
  const higherUpper = 75000;
  const advancedUpper = 125140;

  let tax = 0;

  // Starter (19%)
  const inStarter = Math.max(0, Math.min(income, starterUpper) - taperedPA);
  tax += inStarter * 0.19;

  // Basic (20%)
  if (income > starterUpper) {
    const inBasic = Math.max(0, Math.min(income, basicUpper) - Math.max(taperedPA, starterUpper));
    tax += inBasic * 0.20;
  }

  // Intermediate (21%)
  if (income > basicUpper) {
    const inIntermediate = Math.max(0, Math.min(income, intermediateUpper) - Math.max(taperedPA, basicUpper));
    tax += inIntermediate * 0.21;
  }

  // Higher (42%)
  if (income > intermediateUpper) {
    const inHigher = Math.max(0, Math.min(income, higherUpper) - Math.max(taperedPA, intermediateUpper));
    tax += inHigher * 0.42;
  }

  // Advanced (45%)
  if (income > higherUpper) {
    const inAdvanced = Math.max(0, Math.min(income, advancedUpper) - Math.max(taperedPA, higherUpper));
    tax += inAdvanced * 0.45;
  }

  // Top (48%)
  if (income > advancedUpper) {
    const inTop = Math.max(0, income - Math.max(taperedPA, advancedUpper));
    tax += inTop * 0.48;
  }

  return Math.max(0, tax);
}

function applyEmployeeNI(income: number): number {
  // 2026/27: 8% on £12,570–£50,270; 2% above
  const pt = 12570; // Primary Threshold
  const uel = 50270; // Upper Earnings Limit
  if (income <= pt) return 0;
  const lower = Math.min(income, uel) - pt;
  const upper = Math.max(0, income - uel);
  return lower * 0.08 + upper * 0.02;
}

function applyEmployerNI(income: number): number {
  // Updated: Autumn Budget 2024, effective April 2025+
  // 15.0% on income above Secondary Threshold £5,000
  const st = 5000;
  return Math.max(0, income - st) * 0.15;
}

// -------------------------------------------------------------
// PRIMARY CALCULATOR: IR35 (Inside vs Outside IR35)
// -------------------------------------------------------------
function calculateIR35(inputs: TaxInput): TaxResult {
  const dayRate = Math.max(0, parseFloat(String(inputs.day_rate)) || 0);
  const workingDays = Math.max(0, parseFloat(String(inputs.working_days_per_year)) || 220);
  const umbrellaMarginWeekly = Math.max(0, parseFloat(String(inputs.umbrella_margin_weekly)) || 0);
  const businessExpenses = Math.max(0, parseFloat(String(inputs.business_expenses_annual)) || 0);
  const pensionContribution = Math.max(0, parseFloat(String(inputs.pension_contribution_annual)) || 0);
  const otherIncome = Math.max(0, parseFloat(String(inputs.other_taxable_income)) || 0);

  const locStr = String(inputs.tax_region || inputs.tax_location || inputs.location || '').toLowerCase();
  const isScotland = locStr.includes('scotland') || String(inputs.is_scotland || '').toLowerCase() === 'yes' || String(inputs.is_scotland || '').toLowerCase() === 'true';

  const PA = 12570;
  const grossRevenue = dayRate * workingDays;
  const weeksWorked = workingDays / 5;
  const umbrellaMarginAnnual = umbrellaMarginWeekly * weeksWorked;

  // SCENARIO 1: OUTSIDE IR35 (PSC / Ltd Co)
  const directorSalary = 12570; // Optimal: uses Personal Allowance, no Employee NI
  const pscRevenue = grossRevenue;
  const pscProfit = Math.max(0, pscRevenue - businessExpenses - directorSalary - pensionContribution);

  // Corporation Tax (2026/27)
  let corpTax = 0;
  if (pscProfit <= 50000) {
    corpTax = pscProfit * 0.19;
  } else if (pscProfit >= 250000) {
    corpTax = pscProfit * 0.25;
  } else {
    // Marginal Relief
    corpTax = pscProfit * 0.25 - (250000 - pscProfit) * (3 / 200);
  }

  const retainedProfit = Math.max(0, pscProfit - corpTax);
  const dividendAllowance = 500;

  // Dividend Tax
  const dividendAboveAllowance = Math.max(0, retainedProfit - dividendAllowance);
  const nonDivIncome = directorSalary + otherIncome;
  const dividendInBasicBand = Math.min(dividendAboveAllowance, Math.max(0, PA + 37700 - nonDivIncome));
  const higherRateSpace = Math.max(0, 125140 - Math.max(PA + 37700, nonDivIncome));
  const dividendInHigherBand = Math.min(
    Math.max(0, dividendAboveAllowance - dividendInBasicBand),
    higherRateSpace
  );
  const dividendInAdditional = Math.max(0, dividendAboveAllowance - dividendInBasicBand - dividendInHigherBand);
  const dividendTax = dividendInBasicBand * 0.0875 + dividendInHigherBand * 0.3375 + dividendInAdditional * 0.3935;

  const outsideNetTakeHome = directorSalary + retainedProfit - dividendTax;
  const outsideTotalTax = corpTax + dividendTax;
  const outsideEffectiveRate = grossRevenue > 0 ? outsideTotalTax / grossRevenue : 0;

  // SCENARIO 2: INSIDE IR35 (Umbrella / PAYE)
  const assignmentRevenue = grossRevenue - umbrellaMarginAnnual;
  const employerNI = applyEmployerNI(assignmentRevenue);
  const apprenticeLevy = assignmentRevenue * 0.005;
  const grossEmployeeWage = Math.max(0, assignmentRevenue - employerNI - apprenticeLevy);
  const grossAfterPension = Math.max(0, grossEmployeeWage - pensionContribution);

  const employeeNI = applyEmployeeNI(grossAfterPension);
  const incomeTax = isScotland ? applyScottishIncomeTax(grossAfterPension + otherIncome, PA) : applyUKIncomeTax(grossAfterPension + otherIncome, PA);
  const insideNetTakeHome = Math.max(0, grossAfterPension - employeeNI - incomeTax) + pensionContribution;

  const saving = outsideNetTakeHome - (insideNetTakeHome - pensionContribution);

  const breakdown = [
    { label: 'Gross Contract Revenue (Annual)', value: grossRevenue },
    { label: '━━ OUTSIDE IR35 (Personal Service Company) ━━', value: 0, isTotal: true },
    { label: 'Director Salary (optimal)', value: directorSalary },
    { label: 'Allowable Business Expenses', value: businessExpenses, isDeduction: true },
    { label: 'Pension (Company Contribution)', value: pensionContribution, isDeduction: true },
    { label: 'Company Profit Before CT', value: pscProfit, isTotal: true },
    { label: `Corporation Tax (${pscProfit <= 50000 ? '19%' : 'Marginal'})`, value: corpTax, isDeduction: true },
    { label: 'Distributable Profit (Dividends)', value: retainedProfit },
    { label: 'Dividend Tax', value: dividendTax, isDeduction: true },
    { label: 'Net Take-Home (Outside IR35)', value: outsideNetTakeHome, isFinal: true },
    { label: '━━ INSIDE IR35 (Umbrella / PAYE) ━━', value: 0, isTotal: true },
    { label: 'Umbrella Company Margin', value: umbrellaMarginAnnual, isDeduction: true },
    { label: "Employer's NI (15.0%)", value: employerNI, isDeduction: true },
    { label: 'Apprenticeship Levy (0.5%)', value: apprenticeLevy, isDeduction: true },
    { label: 'Gross Employee Wage', value: grossEmployeeWage, isTotal: true },
    { label: "Employee NI (8%/2%)", value: employeeNI, isDeduction: true },
    { label: 'Income Tax (PAYE)', value: incomeTax, isDeduction: true, percentage: grossRevenue > 0 ? (incomeTax / grossRevenue) * 100 : 0 },
    { label: 'Net Take-Home (Inside IR35)', value: insideNetTakeHome - pensionContribution },
  ];

  const insights: string[] = [];
  if (saving > 0) {
    insights.push(`Being Outside IR35 saves you approximately £${Math.round(saving).toLocaleString()} per year compared to Inside IR35.`);
  } else {
    insights.push(`In this scenario, Inside IR35 is marginally better by £${Math.round(Math.abs(saving)).toLocaleString()} — this can occur with very low day rates or high umbrella margins.`);
  }
  if (pscProfit > 50000 && pscProfit < 250000) {
    insights.push('Your company profit falls in the Marginal Relief band (£50k–£250k) — Corporation Tax is between 19% and 25%.');
  }
  if (grossRevenue > 100000) {
    insights.push('Warning: Personal income above £100,000 begins tapering your Personal Allowance at £1 for every £2 over £100k.');
  }

  return {
    grossIncome: grossRevenue,
    netIncome: Math.max(0, outsideNetTakeHome),
    totalTax: outsideTotalTax,
    effectiveRate: outsideEffectiveRate,
    breakdown,
    currency: 'GBP',
    currencySymbol: '£',
    additionalInsights: insights,
  };
}

// -------------------------------------------------------------
// SECONDARY CALCULATOR 1: SDLT / LBTT / LTT Stamp Duty
// -------------------------------------------------------------
function calculateSDLT(inputs: TaxInput): TaxResult {
  const price = Math.max(0, parseFloat(String(inputs.property_price || inputs.price)) || 0);

  const locStr = String(inputs.property_location || inputs.location || 'england_ni').toLowerCase();
  let location = 'england_ni';
  if (locStr.includes('scotland') || locStr.includes('lbtt')) location = 'scotland';
  else if (locStr.includes('wales') || locStr.includes('ltt')) location = 'wales';

  const buyerStr = String(inputs.buyer_type || 'next_home').toLowerCase();
  let buyerType = 'next_home';
  if (buyerStr.includes('first') || buyerStr.includes('ftb')) buyerType = 'first_time';
  else if (buyerStr.includes('additional') || buyerStr.includes('second') || buyerStr.includes('buy-to-let') || buyerStr.includes('btl')) buyerType = 'additional_property';
  else if (buyerStr.includes('company') || buyerStr.includes('corporate') || buyerStr.includes('commercial')) buyerType = 'company';

  const nonUkStr = String(inputs.is_non_uk_resident || '').toLowerCase();
  const isNonUk = nonUkStr === 'yes' || nonUkStr === 'true' || nonUkStr.includes('yes');

  let totalTax = 0;
  const breakdownLines: { label: string; value: number; isDeduction?: boolean; isTotal?: boolean; isFinal?: boolean }[] = [
    { label: 'Property Purchase Price', value: price },
  ];

  if (location === 'england_ni') {
    const surchargeRate = (buyerType === 'additional_property' || buyerType === 'company' ? 0.03 : 0) + (isNonUk ? 0.02 : 0);

    if (buyerType === 'first_time' && price <= 625000) {
      // First-time buyer relief in England/NI: 0% up to £425k, 5% £425k-£625k
      const b1 = Math.min(price, 425000);
      const t1 = b1 * (0.00 + (isNonUk ? 0.02 : 0));
      const b2 = Math.max(0, price - 425000);
      const t2 = b2 * (0.05 + (isNonUk ? 0.02 : 0));

      totalTax = t1 + t2;
      breakdownLines.push({ label: 'First-Time Buyer Band £0 – £425,000 (0%)', value: t1 });
      if (b2 > 0) breakdownLines.push({ label: 'First-Time Buyer Band £425,000 – £625,000 (5%)', value: t2 });
    } else {
      // Standard rates: 0% up to £125k, 2% £125k-£250k, 5% £250k-£925k, 10% £925k-£1.5m, 12% above
      const bands = [
        { max: 125000, rate: 0.00, label: '£0 – £125,000' },
        { max: 250000, rate: 0.02, label: '£125,000 – £250,000' },
        { max: 925000, rate: 0.05, label: '£250,000 – £925,000' },
        { max: 1500000, rate: 0.10, label: '£925,000 – £1,500,000' },
        { max: Infinity, rate: 0.12, label: 'Above £1,500,000' },
      ];

      let prevLimit = 0;
      for (const band of bands) {
        if (price > prevLimit) {
          const taxableInBand = Math.min(price, band.max) - prevLimit;
          const effectiveBandRate = band.rate + surchargeRate;
          const taxInBand = taxableInBand * effectiveBandRate;
          totalTax += taxInBand;
          if (taxableInBand > 0) {
            breakdownLines.push({
              label: `SDLT Band ${band.label} (${(effectiveBandRate * 100).toFixed(1)}%)`,
              value: taxInBand,
            });
          }
          prevLimit = band.max;
        }
      }
    }
  } else if (location === 'scotland') {
    // Scotland LBTT: 0% up to £145k, 2% £145k-£250k, 5% £250k-£325k, 10% £325k-£750k, 12% above
    if (buyerType === 'first_time') {
      const bands = [
        { max: 175000, rate: 0.00, label: '£0 – £175,000 (FTB Relief)' },
        { max: 250000, rate: 0.02, label: '£175,000 – £250,000' },
        { max: 325000, rate: 0.05, label: '£250,000 – £325,000' },
        { max: 750000, rate: 0.10, label: '£325,000 – £750,000' },
        { max: Infinity, rate: 0.12, label: 'Above £750,000' },
      ];
      let prevLimit = 0;
      for (const band of bands) {
        if (price > prevLimit) {
          const taxableInBand = Math.min(price, band.max) - prevLimit;
          const taxInBand = taxableInBand * band.rate;
          totalTax += taxInBand;
          if (taxableInBand > 0) {
            breakdownLines.push({ label: `LBTT Band ${band.label}`, value: taxInBand });
          }
          prevLimit = band.max;
        }
      }
    } else {
      const bands = [
        { max: 145000, rate: 0.00, label: '£0 – £145,000' },
        { max: 250000, rate: 0.02, label: '£145,000 – £250,000' },
        { max: 325000, rate: 0.05, label: '£250,000 – £325,000' },
        { max: 750000, rate: 0.10, label: '£325,000 – £750,000' },
        { max: Infinity, rate: 0.12, label: 'Above £750,000' },
      ];
      let prevLimit = 0;
      for (const band of bands) {
        if (price > prevLimit) {
          const taxableInBand = Math.min(price, band.max) - prevLimit;
          const taxInBand = taxableInBand * band.rate;
          totalTax += taxInBand;
          if (taxableInBand > 0) {
            breakdownLines.push({ label: `LBTT Band ${band.label} (${(band.rate * 100)}%)`, value: taxInBand });
          }
          prevLimit = band.max;
        }
      }
    }

    if ((buyerType === 'additional_property' || buyerType === 'company') && price >= 40000) {
      const ads = price * 0.06;
      totalTax += ads;
      breakdownLines.push({ label: 'Additional Dwelling Supplement (ADS 6% flat)', value: ads });
    }
  } else if (location === 'wales') {
    // Wales LTT: 0% up to £225k, 6% £225k-£400k, 7.5% £400k-£750k, 10% £750k-£1.5m, 12% above
    if (buyerType === 'additional_property' || buyerType === 'company') {
      const bands = [
        { max: 180000, rate: 0.040, label: '£0 – £180,000' },
        { max: 250000, rate: 0.075, label: '£180,000 – £250,000' },
        { max: 400000, rate: 0.090, label: '£250,000 – £400,000' },
        { max: 750000, rate: 0.115, label: '£400,000 – £750,000' },
        { max: 1500000, rate: 0.140, label: '£750,000 – £1,500,000' },
        { max: Infinity, rate: 0.160, label: 'Above £1,500,000' },
      ];
      let prevLimit = 0;
      for (const band of bands) {
        if (price > prevLimit) {
          const taxableInBand = Math.min(price, band.max) - prevLimit;
          const taxInBand = taxableInBand * band.rate;
          totalTax += taxInBand;
          if (taxableInBand > 0) {
            breakdownLines.push({ label: `LTT Higher Band ${band.label} (${(band.rate * 100).toFixed(1)}%)`, value: taxInBand });
          }
          prevLimit = band.max;
        }
      }
    } else {
      const bands = [
        { max: 225000, rate: 0.000, label: '£0 – £225,000' },
        { max: 400000, rate: 0.060, label: '£225,000 – £400,000' },
        { max: 750000, rate: 0.075, label: '£400,000 – £750,000' },
        { max: 1500000, rate: 0.100, label: '£750,000 – £1,500,000' },
        { max: Infinity, rate: 0.120, label: 'Above £1,500,000' },
      ];
      let prevLimit = 0;
      for (const band of bands) {
        if (price > prevLimit) {
          const taxableInBand = Math.min(price, band.max) - prevLimit;
          const taxInBand = taxableInBand * band.rate;
          totalTax += taxInBand;
          if (taxableInBand > 0) {
            breakdownLines.push({ label: `LTT Main Band ${band.label} (${(band.rate * 100).toFixed(1)}%)`, value: taxInBand });
          }
          prevLimit = band.max;
        }
      }
    }
  }

  breakdownLines.push({ label: 'Total Property Tax Due', value: totalTax, isFinal: true });
  breakdownLines.push({ label: 'Total Outlay (Price + Tax)', value: price + totalTax, isTotal: true });

  const effectiveRate = price > 0 ? totalTax / price : 0;
  const insights: string[] = [];

  if (buyerType === 'first_time' && location === 'england_ni') {
    if (price <= 425000) {
      insights.push('First-Time Buyer Relief applies: 0% Stamp Duty on properties up to £425,000.');
    } else if (price <= 625000) {
      insights.push('Partial First-Time Buyer Relief applies: 0% on the first £425k and 5% on the portion between £425k and £625k.');
    } else {
      insights.push('Property price exceeds £625,000 — First-Time Buyer Relief does not apply and standard SDLT rates apply.');
    }
  }

  if (buyerType === 'additional_property' || buyerType === 'company') {
    if (location === 'england_ni') insights.push('A +3% additional property SDLT surcharge is included across all tax bands.');
    else if (location === 'scotland') insights.push('Scotland Additional Dwelling Supplement (ADS) adds a flat 6% surcharge to the total purchase price.');
    else if (location === 'wales') insights.push('Wales LTT Higher Residential Rates apply to additional properties starting from 4%.');
  }

  return {
    grossIncome: price,
    netIncome: price + totalTax,
    totalTax,
    effectiveRate,
    breakdown: breakdownLines,
    currency: 'GBP',
    currencySymbol: '£',
    additionalInsights: insights,
  };
}

// -------------------------------------------------------------
// SECONDARY CALCULATOR 2: UK Gross-to-Net Salary + Pension
// -------------------------------------------------------------
function calculateGrossToNet(inputs: TaxInput): TaxResult {
  const grossAnnual = Math.max(0, parseFloat(String(inputs.gross_annual || inputs.gross_salary)) || 0);
  const pensionPct = Math.max(0, parseFloat(String(inputs.pension_contribution_pct || inputs.pension_contribution_percent)) || 0);
  const studentPlan = String(inputs.student_loan_plan || 'none').toLowerCase();
  const blindAllowance = String(inputs.blind_persons_allowance || 'no').toLowerCase() === 'yes';

  const locStr = String(inputs.tax_region || inputs.tax_location || inputs.location || inputs.region || studentPlan || '').toLowerCase();
  const isScotland = locStr.includes('scotland') || locStr.includes('plan4') || String(inputs.is_scotland || '').toLowerCase() === 'yes' || String(inputs.is_scotland || '').toLowerCase() === 'true';

  // Pension deduction via Salary Sacrifice
  const pensionAnnual = grossAnnual * (pensionPct / 100);
  const taxableGross = Math.max(0, grossAnnual - pensionAnnual);

  // Personal Allowance (base £12,570 + £3,130 for Blind Person's Allowance)
  const basePA = 12570 + (blindAllowance ? 3130 : 0);
  const taperedPA = taxableGross > 100000
    ? Math.max(0, basePA - Math.floor((taxableGross - 100000) / 2))
    : basePA;

  let incomeTax = 0;
  let basicTax = 0;
  let higherTax = 0;
  let additionalTax = 0;

  let starterTax = 0;
  let intermediateTax = 0;
  let advancedTax = 0;
  let topTax = 0;

  if (isScotland) {
    const starterUpper = taperedPA + 2306;
    const basicUpper = taperedPA + 13991;
    const intermediateUpper = taperedPA + 31092;
    const higherUpper = 75000;
    const advancedUpper = 125140;

    if (taxableGross > taperedPA) {
      const inStarter = Math.max(0, Math.min(taxableGross, starterUpper) - taperedPA);
      starterTax = inStarter * 0.19;
    }
    if (taxableGross > starterUpper) {
      const inBasic = Math.max(0, Math.min(taxableGross, basicUpper) - Math.max(taperedPA, starterUpper));
      basicTax = inBasic * 0.20;
    }
    if (taxableGross > basicUpper) {
      const inIntermediate = Math.max(0, Math.min(taxableGross, intermediateUpper) - Math.max(taperedPA, basicUpper));
      intermediateTax = inIntermediate * 0.21;
    }
    if (taxableGross > intermediateUpper) {
      const inHigher = Math.max(0, Math.min(taxableGross, higherUpper) - Math.max(taperedPA, intermediateUpper));
      higherTax = inHigher * 0.42;
    }
    if (taxableGross > higherUpper) {
      const inAdvanced = Math.max(0, Math.min(taxableGross, advancedUpper) - Math.max(taperedPA, higherUpper));
      advancedTax = inAdvanced * 0.45;
    }
    if (taxableGross > advancedUpper) {
      const inTop = Math.max(0, taxableGross - Math.max(taperedPA, advancedUpper));
      topTax = inTop * 0.48;
    }

    incomeTax = starterTax + basicTax + intermediateTax + higherTax + advancedTax + topTax;
  } else {
    // Income Tax Calculation (2026/27 England/NI/Wales)
    const basicUpper = taperedPA + 37700;
    const higherUpper = 125140;

    if (taxableGross > taperedPA) {
      const inBasic = Math.min(taxableGross, basicUpper) - taperedPA;
      basicTax = Math.max(0, inBasic) * 0.20;
    }
    if (taxableGross > basicUpper) {
      const inHigher = Math.min(taxableGross, higherUpper) - basicUpper;
      higherTax = Math.max(0, inHigher) * 0.40;
    }
    if (taxableGross > higherUpper) {
      additionalTax = (taxableGross - higherUpper) * 0.45;
    }
    incomeTax = basicTax + higherTax + additionalTax;
  }

  // Employee National Insurance (Class 1 Primary: 8% £12,570–£50,270, 2% above)
  const employeeNI = applyEmployeeNI(taxableGross);

  // Student Loan Deduction
  let studentLoan = 0;
  if (studentPlan.includes('plan1')) {
    studentLoan = Math.max(0, taxableGross - 24990) * 0.09;
  } else if (studentPlan.includes('plan2')) {
    studentLoan = Math.max(0, taxableGross - 27295) * 0.09;
  } else if (studentPlan.includes('plan4')) {
    studentLoan = Math.max(0, taxableGross - 31395) * 0.09;
  } else if (studentPlan.includes('plan5')) {
    studentLoan = Math.max(0, taxableGross - 25000) * 0.09;
  } else if (studentPlan.includes('postgrad')) {
    studentLoan = Math.max(0, taxableGross - 21000) * 0.06;
  }

  const totalDeductions = incomeTax + employeeNI + studentLoan + pensionAnnual;
  const netAnnual = Math.max(0, grossAnnual - totalDeductions);
  const netMonthly = netAnnual / 12;
  const effectiveRate = grossAnnual > 0 ? (incomeTax + employeeNI + studentLoan) / grossAnnual : 0;

  const taxBreakdownLines = isScotland ? [
    ...(starterTax > 0 ? [{ label: 'Scottish Starter Rate Tax (19%)', value: starterTax, isDeduction: true }] : []),
    ...(basicTax > 0 ? [{ label: 'Scottish Basic Rate Tax (20%)', value: basicTax, isDeduction: true }] : []),
    ...(intermediateTax > 0 ? [{ label: 'Scottish Intermediate Rate Tax (21%)', value: intermediateTax, isDeduction: true }] : []),
    ...(higherTax > 0 ? [{ label: 'Scottish Higher Rate Tax (42%)', value: higherTax, isDeduction: true }] : []),
    ...(advancedTax > 0 ? [{ label: 'Scottish Advanced Rate Tax (45%)', value: advancedTax, isDeduction: true }] : []),
    ...(topTax > 0 ? [{ label: 'Scottish Top Rate Tax (48%)', value: topTax, isDeduction: true }] : []),
  ] : [
    ...(basicTax > 0 ? [{ label: 'Basic Rate Tax (20%)', value: basicTax, isDeduction: true }] : []),
    ...(higherTax > 0 ? [{ label: 'Higher Rate Tax (40%)', value: higherTax, isDeduction: true }] : []),
    ...(additionalTax > 0 ? [{ label: 'Additional Rate Tax (45%)', value: additionalTax, isDeduction: true }] : []),
  ];

  const breakdown = [
    { label: 'Gross Annual Salary', value: grossAnnual },
    { label: `Pension Contribution (${pensionPct}% Salary Sacrifice)`, value: pensionAnnual, isDeduction: true },
    { label: 'Personal Allowance (2026/27)', value: taperedPA },
    ...taxBreakdownLines,
    { label: 'Total Income Tax (PAYE)', value: incomeTax, isTotal: true },
    { label: 'Employee National Insurance (8%/2%)', value: employeeNI, isDeduction: true },
    ...(studentLoan > 0 ? [{ label: 'Student Loan Repayments', value: studentLoan, isDeduction: true }] : []),
    { label: 'Annual Net Take-Home Pay', value: netAnnual, isFinal: true },
    { label: 'Monthly Net Take-Home Pay', value: netMonthly, isTotal: true },
  ];

  const insights: string[] = [];
  if (taxableGross > 100000 && taxableGross <= 125140) {
    insights.push('Your salary falls in the £100,000–£125,140 Personal Allowance taper zone, creating an effective 60% marginal tax rate. Extra pension contributions can recover lost allowance.');
  }
  if (pensionPct > 0) {
    insights.push(`Salary Sacrifice pension saves you approximately £${Math.round(pensionAnnual * 0.28).toLocaleString()} per year in combined Income Tax and National Insurance.`);
  }
  if (studentLoan > 0) {
    insights.push(`Student loan repayment is deducted at 9% on income above your plan threshold (£${Math.round(studentLoan).toLocaleString()}/year).`);
  }
  if (isScotland) {
    insights.push('Scottish Income Tax rates and bands applied (Starter 19%, Basic 20%, Intermediate 21%, Higher 42%, Advanced 45%, Top 48%).');
  }

  return {
    grossIncome: grossAnnual,
    netIncome: netAnnual,
    totalTax: incomeTax + employeeNI + studentLoan,
    effectiveRate,
    breakdown,
    currency: 'GBP',
    currencySymbol: '£',
    additionalInsights: insights,
  };
}

// -------------------------------------------------------------
// SECONDARY CALCULATOR 3: Ltd Director Salary + Dividend Optimiser
// -------------------------------------------------------------
function calculateDirectorOptimiser(inputs: TaxInput): TaxResult {
  const profitBeforeDirector = Math.max(0, parseFloat(String(inputs.annual_company_profit || inputs.company_gross_profit)) || 0);
  const otherIncome = Math.max(0, parseFloat(String(inputs.other_income || inputs.other_personal_income)) || 0);
  const pensionContribution = Math.max(0, parseFloat(String(inputs.pension_company_contribution)) || 0);

  const profitAfterPension = Math.max(0, profitBeforeDirector - pensionContribution);

  // OPTIMAL STRATEGY (Salary £12,570 + Dividends)
  const directorSalary = 12570; // Uses PA, £0 Income Tax & £0 Employee NI
  const employerNI = applyEmployerNI(directorSalary);
  const totalEmploymentCost = directorSalary + employerNI;

  const taxableCorpProfit = Math.max(0, profitAfterPension - totalEmploymentCost);

  // Corporation Tax (2026/27)
  let corpTax = 0;
  if (taxableCorpProfit <= 50000) {
    corpTax = taxableCorpProfit * 0.19;
  } else if (taxableCorpProfit >= 250000) {
    corpTax = taxableCorpProfit * 0.25;
  } else {
    // Marginal Relief
    corpTax = taxableCorpProfit * 0.25 - (250000 - taxableCorpProfit) * (3 / 200);
  }

  const retainedProfit = Math.max(0, taxableCorpProfit - corpTax);

  // Dividend Taxation
  const dividendAllowance = 500;
  const dividendAboveAllowance = Math.max(0, retainedProfit - dividendAllowance);

  // Band calculations for dividends sitting on top of salary + otherIncome
  const personalTotal = directorSalary + otherIncome + dividendAboveAllowance;
  const taperedPA = personalTotal > 100000 
    ? Math.max(0, 12570 - Math.floor((personalTotal - 100000) / 2))
    : 12570;
  
  const personalIncomeBeforeDiv = directorSalary + otherIncome;
  const basicThreshold = taperedPA + 37700;
  const higherThreshold = 125140;

  const basicRemaining = Math.max(0, basicThreshold - Math.max(taperedPA, personalIncomeBeforeDiv));
  const higherRemaining = Math.max(0, higherThreshold - Math.max(basicThreshold, personalIncomeBeforeDiv));

  const divInBasic = Math.min(dividendAboveAllowance, basicRemaining);
  const divInHigher = Math.min(Math.max(0, dividendAboveAllowance - divInBasic), higherRemaining);
  const divInAdditional = Math.max(0, dividendAboveAllowance - divInBasic - divInHigher);

  const dividendTax = divInBasic * 0.0875 + divInHigher * 0.3375 + divInAdditional * 0.3935;

  const optimalNetPersonalCash = directorSalary + retainedProfit - dividendTax;
  const totalTaxesPaid = employerNI + corpTax + dividendTax;
  const overallEffectiveRate = profitBeforeDirector > 0 ? totalTaxesPaid / profitBeforeDirector : 0;

  // COMPARISON: 100% SALARY STRATEGY
  const salary100Cost = profitAfterPension;
  const salary100Gross = salary100Cost <= 5000 ? salary100Cost : (salary100Cost + 5000 * 0.15) / 1.15;
  const salary100EmpEE = applyEmployeeNI(salary100Gross);
  const salary100IncomeTax = applyUKIncomeTax(salary100Gross + otherIncome, 12570);
  const salary100NetCash = Math.max(0, salary100Gross - salary100EmpEE - salary100IncomeTax);

  const optimalSavings = optimalNetPersonalCash - salary100NetCash;

  const breakdown = [
    { label: 'Company Annual Gross Profit', value: profitBeforeDirector },
    ...(pensionContribution > 0 ? [{ label: 'Employer Pension Contribution (CT Deductible)', value: pensionContribution, isDeduction: true }] : []),
    { label: 'Optimal Director Salary', value: directorSalary },
    { label: "Employer's National Insurance (15.0% above £5,000)", value: employerNI, isDeduction: true },
    { label: 'Taxable Corporate Profit', value: taxableCorpProfit, isTotal: true },
    { label: `Corporation Tax (${taxableCorpProfit <= 50000 ? '19%' : 'Marginal / 25%'})`, value: corpTax, isDeduction: true },
    { label: 'Distributable Profit (Dividends Available)', value: retainedProfit, isTotal: true },
    { label: 'Tax-Free Dividend Allowance', value: Math.min(retainedProfit, dividendAllowance) },
    { label: 'Personal Dividend Tax', value: dividendTax, isDeduction: true },
    { label: 'Net Director Personal Cash Take-Home', value: optimalNetPersonalCash, isFinal: true },
    { label: '100% Salary Alternative Net Take-Home', value: salary100NetCash, isTotal: true },
  ];

  const insights: string[] = [];
  if (optimalSavings > 0) {
    insights.push(`The Optimal Salary (£12,570) + Dividend strategy saves you £${Math.round(optimalSavings).toLocaleString()} per year compared to taking 100% of profit as salary.`);
  }
  insights.push('Director salary of £12,570 utilizes your Personal Allowance with £0 Income Tax and £0 Employee NI while preserving your UK State Pension qualifying year.');
  if (taxableCorpProfit > 50000 && taxableCorpProfit < 250000) {
    insights.push('Company profit is in the Corporation Tax Marginal Relief band (£50,000–£250,000), resulting in an effective CT rate between 19% and 25%.');
  }

  return {
    grossIncome: profitBeforeDirector,
    netIncome: optimalNetPersonalCash,
    totalTax: totalTaxesPaid,
    effectiveRate: overallEffectiveRate,
    breakdown,
    currency: 'GBP',
    currencySymbol: '£',
    additionalInsights: insights,
  };
}

// -------------------------------------------------------------
// SECONDARY CALCULATOR 4: UK Statutory Redundancy Pay Calculator
// -------------------------------------------------------------
function calculateRedundancy(inputs: TaxInput): TaxResult {
  const grossWeekly = Math.max(0, parseFloat(String(inputs.weekly_pay || inputs.gross_weekly_pay)) || 0);
  const yearsService = Math.max(0, parseFloat(String(inputs.years_of_service)) || 0);
  const age = Math.max(0, parseFloat(String(inputs.age_at_redundancy)) || 0);
  const exGratia = Math.max(0, parseFloat(String(inputs.ex_gratia_severance_offer)) || 0);
  const pilon = Math.max(0, parseFloat(String(inputs.pilon_payment)) || 0);
  const otherIncome = Math.max(0, parseFloat(String(inputs.other_income || inputs.other_taxable_income || inputs.gross_annual || inputs.gross_salary)) || 0);

  const locStr = String(inputs.tax_region || inputs.tax_location || inputs.location || '').toLowerCase();
  const isScotland = locStr.includes('scotland');

  // Statutory Rules 2026/27
  const cappedWeekly = Math.min(700, grossWeekly); // 2026 statutory cap £700/week
  const effectiveService = Math.min(20, yearsService); // Capped at 20 years

  let totalWeeks = 0;
  if (yearsService >= 2) {
    const yearsOver41 = Math.max(0, Math.min(effectiveService, age - 41));
    const remainingService1 = effectiveService - yearsOver41;
    const years22To40 = Math.max(0, Math.min(remainingService1, age >= 41 ? 19 : Math.max(0, age - 21)));
    const yearsUnder22 = Math.max(0, remainingService1 - years22To40);

    totalWeeks = Math.min(30, (yearsUnder22 * 0.5) + (years22To40 * 1.0) + (yearsOver41 * 1.5));
  }

  const statutoryRedundancy = totalWeeks * cappedWeekly;
  const totalSeverance = statutoryRedundancy + exGratia;

  // Tax treatment: Section 401 ITEPA 2003 £30,000 exemption on qualifying termination payments
  const taxFreeSeverance = Math.min(30000, totalSeverance);
  const taxableSeverance = Math.max(0, totalSeverance - 30000);

  // Marginal income tax calculation based on total income
  const calcTax = (inc: number) => isScotland ? applyScottishIncomeTax(inc, 12570) : applyUKIncomeTax(inc, 12570);

  const baseTax = calcTax(otherIncome);
  const taxWithPilon = calcTax(otherIncome + pilon);
  const taxWithSeverance = calcTax(otherIncome + pilon + taxableSeverance);

  const pilonTax = taxWithPilon - baseTax;
  const severanceTax = taxWithSeverance - taxWithPilon;

  // PILON National Insurance
  const pilonNI = applyEmployeeNI(pilon);
  const netPilon = Math.max(0, pilon - pilonTax - pilonNI);

  const totalTakeHome = totalSeverance - severanceTax + netPilon;
  const totalTax = severanceTax + pilonTax + pilonNI;

  const breakdown = [
    { label: 'Actual Gross Weekly Pay', value: grossWeekly },
    { label: 'Statutory Capped Weekly Pay (2026 cap £700)', value: cappedWeekly },
    { label: 'Years of Service Counted (Max 20 years)', value: effectiveService },
    { label: `Statutory Redundancy Pay (${totalWeeks} weeks' pay)`, value: statutoryRedundancy, isTotal: true },
    ...(exGratia > 0 ? [{ label: 'Enhanced / Ex-Gratia Severance Pay', value: exGratia }] : []),
    { label: 'Total Termination Severance Package', value: totalSeverance, isTotal: true },
    { label: 'Section 401 Tax-Free Exemption (up to £30,000)', value: taxFreeSeverance },
    ...(taxableSeverance > 0 ? [{ label: 'Taxable Severance Portion (above £30k)', value: taxableSeverance, isDeduction: true }] : []),
    ...(severanceTax > 0 ? [{ label: 'Tax on Severance (> £30k)', value: severanceTax, isDeduction: true }] : []),
    ...(pilon > 0 ? [{ label: 'Pay in Lieu of Notice (PILON - Taxable)', value: pilon }] : []),
    ...(pilon > 0 ? [{ label: 'Tax & NI on PILON', value: pilonTax + pilonNI, isDeduction: true }] : []),
    { label: 'Total Net Settlement Take-Home', value: totalTakeHome, isFinal: true },
  ];

  const insights: string[] = [];
  if (yearsService < 2) {
    insights.push('You must have at least 2 full years of continuous service with your employer to qualify for statutory redundancy pay.');
  } else {
    insights.push(`Your statutory redundancy entitlement is £${Math.round(statutoryRedundancy).toLocaleString()} (${totalWeeks} weeks at £${cappedWeekly}/wk).`);
  }
  insights.push('Statutory redundancy and genuine ex-gratia payments are completely tax-free up to £30,000.');
  if (pilon > 0) {
    insights.push('Pay in Lieu of Notice (PILON) is treated as earnings and is subject to PAYE Income Tax and National Insurance.');
  }

  return {
    grossIncome: totalSeverance + pilon,
    netIncome: totalTakeHome,
    totalTax,
    effectiveRate: (totalSeverance + pilon) > 0 ? totalTax / (totalSeverance + pilon) : 0,
    breakdown,
    currency: 'GBP',
    currencySymbol: '£',
    additionalInsights: insights,
  };
}

// -------------------------------------------------------------
// SECONDARY CALCULATOR 5: UK VAT (Value Added Tax) Calculator
// -------------------------------------------------------------
function calculateVAT(inputs: TaxInput): TaxResult {
  const amt = Math.max(0, parseFloat(String(inputs.amount || inputs.gross_revenue || inputs.net_amount || 0)) || 0);
  const calcType = String(inputs.calculation_type || 'add_vat').toLowerCase();
  const scheme = String(inputs.vat_rate_scheme || 'standard_20').toLowerCase();
  const frsSectorRate = Math.max(0, parseFloat(String(inputs.frs_sector_rate || 14.5)) || 14.5);
  const frsDiscount = String(inputs.frs_first_year_discount || 'no').toLowerCase() === 'yes';

  let netAmount = 0;
  let vatAmount = 0;
  let grossAmount = 0;
  let vatRatePct = 20;

  if (scheme === 'reduced_5') {
    vatRatePct = 5;
    if (calcType === 'extract_vat') {
      grossAmount = amt;
      netAmount = amt / 1.05;
      vatAmount = amt - netAmount;
    } else {
      netAmount = amt;
      vatAmount = amt * 0.05;
      grossAmount = amt * 1.05;
    }
  } else if (scheme === 'zero_0') {
    vatRatePct = 0;
    netAmount = amt;
    vatAmount = 0;
    grossAmount = amt;
  } else if (scheme === 'flat_rate') {
    vatRatePct = 20;
    const effectiveFrsRate = Math.max(0, frsSectorRate - (frsDiscount ? 1.0 : 0.0));

    if (calcType === 'extract_vat') {
      grossAmount = amt;
      netAmount = amt / 1.20;
      vatAmount = amt - netAmount;
    } else {
      netAmount = amt;
      vatAmount = amt * 0.20;
      grossAmount = amt * 1.20;
    }

    const hmrcVatDue = grossAmount * (effectiveFrsRate / 100);
    const frsProfit = vatAmount - hmrcVatDue;

    const breakdown = [
      { label: 'Net Invoice Amount', value: netAmount },
      { label: `Client VAT Charged (Standard 20%)`, value: vatAmount },
      { label: 'Gross Invoice Total (Turnover)', value: grossAmount, isTotal: true },
      { label: `Flat Rate Scheme Sector Rate (${effectiveFrsRate.toFixed(1)}%${frsDiscount ? ' incl. 1% 1st-year discount' : ''})`, value: effectiveFrsRate },
      { label: `Flat Rate VAT Due to HMRC (${effectiveFrsRate.toFixed(1)}% of Gross)`, value: hmrcVatDue, isDeduction: true },
      { label: frsProfit >= 0 ? 'Flat Rate Scheme Retained Profit' : 'Flat Rate Scheme Loss', value: Math.abs(frsProfit), isFinal: true },
    ];

    const insights = [
      `Under FRS (${effectiveFrsRate.toFixed(1)}% sector rate), you collect £${Math.round(vatAmount).toLocaleString()} in VAT from your client and pay £${Math.round(hmrcVatDue).toLocaleString()} to HMRC.`,
      frsProfit >= 0
        ? `You retain £${Math.round(frsProfit).toLocaleString()} as additional profit under the Flat Rate Scheme.`
        : `Under FRS, you pay £${Math.round(Math.abs(frsProfit)).toLocaleString()} more than standard VAT. Consider switching to standard accounting.`,
      `Mandatory UK VAT registration threshold is £90,000 turnover per 12 months (£88,000 deregistration, £150,000 FRS join limit).`
    ];

    return {
      grossIncome: grossAmount,
      netIncome: netAmount + Math.max(0, frsProfit),
      totalTax: hmrcVatDue,
      effectiveRate: grossAmount > 0 ? hmrcVatDue / grossAmount : 0,
      breakdown,
      currency: 'GBP',
      currencySymbol: '£',
      additionalInsights: insights,
    };
  } else {
    vatRatePct = 20;
    if (calcType === 'extract_vat') {
      grossAmount = amt;
      netAmount = amt / 1.20;
      vatAmount = amt - netAmount;
    } else {
      netAmount = amt;
      vatAmount = amt * 0.20;
      grossAmount = amt * 1.20;
    }
  }

  const breakdown = [
    { label: 'Net Amount (excluding VAT)', value: netAmount },
    { label: `VAT Amount (${vatRatePct}%)`, value: vatAmount, isDeduction: calcType === 'extract_vat' },
    { label: 'Gross Amount (including VAT)', value: grossAmount, isFinal: true },
  ];

  const insights = [
    calcType === 'extract_vat'
      ? `Extracted £${Math.round(vatAmount).toLocaleString()} VAT (${vatRatePct}%) from gross total of £${Math.round(grossAmount).toLocaleString()}.`
      : `Added £${Math.round(vatAmount).toLocaleString()} VAT (${vatRatePct}%) to net amount of £${Math.round(netAmount).toLocaleString()}.`,
    `UK VAT registration threshold is £90,000 taxable turnover in any rolling 12-month period.`
  ];

  return {
    grossIncome: grossAmount,
    netIncome: netAmount,
    totalTax: vatAmount,
    effectiveRate: grossAmount > 0 ? vatAmount / grossAmount : 0,
    breakdown,
    currency: 'GBP',
    currencySymbol: '£',
    additionalInsights: insights,
  };
}

// -------------------------------------------------------------
// MAIN ENGINE ROUTER
// -------------------------------------------------------------
export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'ir35-inside-outside-calculator');

  switch (calcId) {
    case 'uk-vat-calculator':
    case 'gb-vat-calculator':
    case 'vat-calculator':
      return calculateVAT(inputs);
    case 'sdlt-lbtt-ltt-stamp-duty-calculator':
      return calculateSDLT(inputs);
    case 'uk-gross-net-salary-pension-calculator':
      return calculateGrossToNet(inputs);
    case 'uk-limited-company-director-salary-dividend-calculator':
      return calculateDirectorOptimiser(inputs);
    case 'uk-statutory-redundancy-settlement-calculator':
      return calculateRedundancy(inputs);
    case 'ir35-inside-outside-calculator':
    default:
      return calculateIR35(inputs);
  }
}
