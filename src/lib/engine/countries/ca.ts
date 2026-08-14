// src/lib/engine/countries/ca.ts
// Canada Financial & Tax Engine — 2025/2026 Tax Rules
// Sources: Canada Revenue Agency (canada.ca/en/revenue-agency), Revenu Québec, provincial finance ministries

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'sole-proprietor-tax-cpp-qpp-calculator');

  switch (calcId) {
    case 'land-transfer-tax-first-time-buyer-calculator':
      return calculateLandTransferTax(inputs);
    case 'severance-pay-statutory-notice-calculator':
      return calculateSeverancePay(inputs);
    case 'ccpc-corporate-tax-dividend-vs-salary-calculator':
      return calculateCcpcIntegration(inputs);
    case 'gst-hst-qst-remittance-quick-method-calculator':
      return calculateGstHstQuickMethod(inputs);
    case 'sole-proprietor-tax-cpp-qpp-calculator':
    default:
      return calculateSoleProprietor(inputs);
  }
}

// Federal Income Tax (2025 / 2026 Brackets)
function calculateFederalTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let rem = taxableIncome;
  if (rem > 253414) { tax += (rem - 253414) * 0.33; rem = 253414; }
  if (rem > 177882) { tax += (rem - 177882) * 0.29; rem = 177882; }
  if (rem > 114750) { tax += (rem - 114750) * 0.26; rem = 114750; }
  if (rem > 57375)  { tax += (rem - 57375) * 0.205; rem = 57375; }
  if (rem > 0)      { tax += rem * 0.15; }

  // Basic Personal Amount Credit (~$15,705 at 15% = $2,355)
  const bpaCredit = Math.min(taxableIncome, 15705) * 0.15;
  return Math.max(0, tax - bpaCredit);
}

// Provincial Income Tax (Approximate progressive tax by province)
function calculateProvincialTax(taxableIncome: number, province: string): number {
  if (taxableIncome <= 0) return 0;
  const prov = province.toLowerCase();

  if (prov.includes('on')) {
    // Ontario: 5.05% up to 51k, 9.15% to 102k, 11.16% to 150k, 12.16% to 220k, 13.16% > 220k + Surtax
    let t = 0;
    if (taxableIncome > 220000) t += (taxableIncome - 220000) * 0.1316;
    if (taxableIncome > 150000) t += Math.min(taxableIncome - 150000, 70000) * 0.1216;
    if (taxableIncome > 102000) t += Math.min(taxableIncome - 102000, 48000) * 0.1116;
    if (taxableIncome > 51446)  t += Math.min(taxableIncome - 51446, 50554) * 0.0915;
    t += Math.min(taxableIncome, 51446) * 0.0505;
    // Ontario surtax (20% on tax over $5,315 + 36% on tax over $6,802)
    let surtax = 0;
    if (t > 5315) surtax += (t - 5315) * 0.20;
    if (t > 6802) surtax += (t - 6802) * 0.36;
    return Math.max(0, t + surtax - 600); // Basic credit
  } else if (prov.includes('bc')) {
    // BC: 5.06% to 47k, 7.7% to 95k, 10.5% to 109k, 12.29% to 133k, 14.7% to 181k, 16.8% to 252k, 20.5% > 252k
    return taxableIncome * 0.095; // Effective average
  } else if (prov.includes('ab')) {
    // Alberta: Flat-ish graduated 10% to 15%
    return taxableIncome * 0.105;
  } else if (prov.includes('qc')) {
    // Quebec: 14% to 51k, 19% to 103k, 24% to 126k, 25.75% > 126k
    return taxableIncome * 0.17;
  }
  return taxableIncome * 0.10; // General average
}

// 1. Sole Proprietorship Tax & CPP / QPP
function calculateSoleProprietor(inputs: TaxInput): TaxResult {
  const grossRev = safeVal(inputs.gross_business_revenue ?? inputs.revenue);
  const expenses = safeVal(inputs.business_expenses ?? inputs.expenses);
  const province = String(inputs.province || 'on');
  const otherIncome = safeVal(inputs.other_employment_income, 0);
  const rrsp = safeVal(inputs.rrsp_deduction_claimed, 0);
  const homeOffice = safeVal(inputs.eligible_business_use_home, 0);

  if (grossRev <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Business Revenue', value: 0 }],
      currency: 'CAD',
      currencySymbol: '$',
    };
  }

  const netBusinessIncome = Math.max(0, grossRev - expenses - homeOffice);

  // CPP Tier 1 + Tier 2 Self-Employed Contributions (2025/2026)
  // Basic Exemption = $3,500, YMPE = $71,300, Rate = 11.9% (Employee 5.95% + Employer 5.95%)
  const cppBasicExemption = 3500;
  const ympe = 71300;
  const yampe = 81200; // Tier 2 CPP2 ceiling

  let cppTier1 = 0;
  if (netBusinessIncome > cppBasicExemption) {
    const subjectTier1 = Math.min(netBusinessIncome, ympe) - cppBasicExemption;
    cppTier1 = subjectTier1 * 0.119;
  }

  let cppTier2 = 0;
  if (netBusinessIncome > ympe) {
    const subjectTier2 = Math.min(netBusinessIncome, yampe) - ympe;
    cppTier2 = subjectTier2 * 0.080; // 4% + 4% = 8%
  }

  const totalCppSelfEmployed = cppTier1 + cppTier2;
  // 50% of CPP is deductible against taxable income
  const cppDeduction = totalCppSelfEmployed * 0.50;

  const totalNetIncome = netBusinessIncome + otherIncome;
  const taxableIncome = Math.max(0, totalNetIncome - cppDeduction - rrsp);

  const federalTax = calculateFederalTax(taxableIncome);
  const provincialTax = calculateProvincialTax(taxableIncome, province);
  const totalIncomeTax = federalTax + provincialTax;

  const totalTaxAndCpp = totalIncomeTax + totalCppSelfEmployed;
  const netTakeHome = grossRev - expenses - homeOffice - totalTaxAndCpp;

  const breakdown = [
    { label: 'Gross Business Revenue (Chiffre d\'affaires)', value: grossRev },
    { label: 'Allowable Business Expenses (Depenses d\'entreprise)', value: expenses, isDeduction: true },
    ...(homeOffice > 0 ? [{ label: 'Eligible Home Office Expenses', value: homeOffice, isDeduction: true }] : []),
    { label: 'Net Business Income (Revenu net)', value: netBusinessIncome, isTotal: true },
    { label: 'CPP / QPP Self-Employed Tier 1 Contribution (11.9%)', value: cppTier1, isDeduction: true },
    ...(cppTier2 > 0 ? [{ label: 'CPP2 Second Additional Tier Contribution (8.0%)', value: cppTier2, isDeduction: true }] : []),
    { label: 'Federal Income Tax (Impot federal)', value: federalTax, isDeduction: true },
    { label: 'Provincial Income Tax (Impot provincial)', value: provincialTax, isDeduction: true },
    { label: 'Total Combined Tax & CPP Obligations', value: totalTaxAndCpp, isTotal: true },
    { label: 'Net Annual Take-Home Profit (Revenu net disponible)', value: netTakeHome, isFinal: true },
  ];

  return {
    grossIncome: grossRev,
    netIncome: netTakeHome,
    totalTax: totalTaxAndCpp,
    effectiveRate: grossRev > 0 ? totalTaxAndCpp / grossRev : 0,
    breakdown,
    currency: 'CAD',
    currencySymbol: '$',
    quarterlyPayment: Math.round(totalTaxAndCpp / 4),
    additionalInsights: [
      `As a self-employed sole proprietor in Canada, you pay both the employer and employee portions of CPP (11.9%), but 50% of it is tax-deductible.`,
      `CRA requires quarterly tax installments if your net tax owing exceeds $3,000 ($1,800 in Quebec) in the current year and either of the past two years.`,
    ],
  };
}

// 2. Land Transfer Tax (LTT / PTT / Welcoming Tax)
function calculateLandTransferTax(inputs: TaxInput): TaxResult {
  const price = safeVal(inputs.property_price ?? inputs.price);
  const prov = String(inputs.province || 'on_toronto');
  const isFthb = String(inputs.first_time_home_buyer || 'no') === 'yes';

  if (price <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Property Purchase Price', value: 0 }],
      currency: 'CAD',
      currencySymbol: '$',
    };
  }

  let provLtt = 0;
  let municipalLtt = 0;
  let fthbRebate = 0;

  if (prov.includes('on')) {
    // Ontario Provincial LTT
    if (price > 2000000) provLtt += (price - 2000000) * 0.025;
    if (price > 400000)  provLtt += Math.min(price - 400000, 1600000) * 0.02;
    if (price > 250000)  provLtt += Math.min(price - 250000, 150000) * 0.015;
    if (price > 55000)   provLtt += Math.min(price - 55000, 195000) * 0.01;
    provLtt += Math.min(price, 55000) * 0.005;

    let provRebate = isFthb ? Math.min(provLtt, 4000) : 0;

    if (prov.includes('toronto')) {
      // Toronto Municipal LTT (matches provincial brackets)
      municipalLtt = provLtt;
      let munRebate = isFthb ? Math.min(municipalLtt, 4475) : 0;
      fthbRebate = provRebate + munRebate;
    } else {
      fthbRebate = provRebate;
    }
  } else if (prov.includes('bc')) {
    // BC Property Transfer Tax (PTT): 1% on 200k, 2% 200k-2M, 3% 2M-3M, 5% >3M
    if (price > 3000000) provLtt += (price - 3000000) * 0.05;
    if (price > 2000000) provLtt += Math.min(price - 2000000, 1000000) * 0.03;
    if (price > 200000)  provLtt += Math.min(price - 200000, 1800000) * 0.02;
    provLtt += Math.min(price, 200000) * 0.01;

    // BC First-Time Home Buyers Exemption (Full exemption up to $835,000)
    if (isFthb && price <= 835000) {
      fthbRebate = provLtt;
    }
  } else if (prov.includes('qc')) {
    // Quebec Droits de mutation (Taxe de bienvenue): 0.5% to 58k, 1.0% to 294k, 1.5% to 500k, 2.0% > 500k
    if (price > 500000) provLtt += (price - 500000) * 0.02;
    if (price > 294600) provLtt += Math.min(price - 294600, 205400) * 0.015;
    if (price > 58900)  provLtt += Math.min(price - 58900, 235700) * 0.01;
    provLtt += Math.min(price, 58900) * 0.005;
  } else {
    provLtt = price * 0.015;
  }

  const totalGrossLtt = provLtt + municipalLtt;
  const netLttPayable = Math.max(0, totalGrossLtt - fthbRebate);
  const legalAndTitleFees = 1500;
  const totalClosingCosts = netLttPayable + legalAndTitleFees;

  const breakdown = [
    { label: 'Property Purchase Price', value: price },
    { label: 'Provincial Land Transfer Tax (LTT / PTT / Bienvenue)', value: provLtt, isDeduction: true },
    ...(municipalLtt > 0 ? [{ label: 'Toronto Municipal Land Transfer Tax (MLTT)', value: municipalLtt, isDeduction: true }] : []),
    ...(fthbRebate > 0 ? [{ label: 'First-Time Home Buyer Tax Rebate Applied', value: fthbRebate }] : []),
    { label: 'Net Land Transfer Tax Payable', value: netLttPayable, isTotal: true },
    { label: 'Estimated Legal & Title Insurance Closing Fees', value: legalAndTitleFees, isDeduction: true },
    { label: 'Total Cash Outlay Required at Closing', value: totalClosingCosts, isFinal: true },
  ];

  return {
    grossIncome: price,
    netIncome: price + totalClosingCosts,
    totalTax: totalClosingCosts,
    effectiveRate: totalClosingCosts / price,
    breakdown,
    currency: 'CAD',
    currencySymbol: '$',
    additionalInsights: [
      isFthb
        ? `First-Time Home Buyer rebate saved you $${Math.round(fthbRebate).toLocaleString('en-CA')} on land transfer taxes.`
        : `First-time home buyers in Ontario/Toronto can receive up to $8,475 in combined provincial and municipal tax rebates.`,
      prov.includes('toronto')
        ? `Purchasing in the City of Toronto incurs both Ontario Provincial LTT and Toronto Municipal LTT.`
        : `Outside of Toronto, only provincial land transfer tax applies.`,
    ],
  };
}

// 3. Severance Pay & Common Law Notice
function calculateSeverancePay(inputs: TaxInput): TaxResult {
  const salary = safeVal(inputs.annual_base_salary ?? inputs.salary);
  const years = safeVal(inputs.years_of_service ?? inputs.years, 3);
  const age = safeVal(inputs.age_employee, 40);
  const level = String(inputs.job_position_level || 'professional_manager');

  if (salary <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Annual Base Salary', value: 0 }],
      currency: 'CAD',
      currencySymbol: '$',
    };
  }

  const weeklySalary = salary / 52;

  // Statutory Minimum Notice (Employment Standards: 1 week per year up to 8 weeks)
  const statutoryNoticeWeeks = Math.min(8, Math.max(1, Math.floor(years)));
  const statutoryNoticePay = weeklySalary * statutoryNoticeWeeks;

  // Statutory Severance (Ontario ESA: 1 week per year up to 26 weeks if employer payroll >= $2.5M)
  const statutorySeveranceWeeks = Math.min(26, Math.floor(years));
  const statutorySeverancePay = weeklySalary * statutorySeveranceWeeks;

  // Common Law Reasonable Notice (Bardal Factors: 2 to 4 weeks per year of service, capped ~24 months)
  let commonLawWeeksPerYear = 3.0;
  if (level === 'executive_senior' || age > 50) commonLawWeeksPerYear = 4.0;
  if (level === 'entry_clerical' && age < 35) commonLawWeeksPerYear = 2.0;

  const commonLawTotalWeeks = Math.min(104, Math.max(statutoryNoticeWeeks + statutorySeveranceWeeks, years * commonLawWeeksPerYear));
  const commonLawSeveranceGross = weeklySalary * commonLawTotalWeeks;

  // CRA Retiring Allowance Withholding Tax (10% on <=$5k, 20% on $5k-$15k, 30% on >$15k)
  let withholdingRate = 0.30;
  if (commonLawSeveranceGross <= 5000) withholdingRate = 0.10;
  else if (commonLawSeveranceGross <= 15000) withholdingRate = 0.20;

  const estimatedWithholdingTax = commonLawSeveranceGross * withholdingRate;
  const netSeverancePayout = commonLawSeveranceGross - estimatedWithholdingTax;

  const breakdown = [
    { label: 'Annual Base Salary at Termination', value: salary },
    { label: `Statutory Minimum Employment Standards Notice (${statutoryNoticeWeeks} weeks)`, value: statutoryNoticePay },
    { label: `Statutory Severance Pay (${statutorySeveranceWeeks} weeks)`, value: statutorySeverancePay },
    { label: `Common Law Estimated Notice Period (${commonLawTotalWeeks.toFixed(1)} weeks)`, value: commonLawSeveranceGross, isTotal: true },
    { label: `CRA Retiring Allowance Withholding Tax (${(withholdingRate * 100).toFixed(0)}%)`, value: estimatedWithholdingTax, isDeduction: true },
    { label: 'Estimated Net Severance Settlement in Hand', value: netSeverancePayout, isFinal: true },
  ];

  return {
    grossIncome: commonLawSeveranceGross,
    netIncome: netSeverancePayout,
    totalTax: estimatedWithholdingTax,
    effectiveRate: withholdingRate,
    breakdown,
    currency: 'CAD',
    currencySymbol: '$',
    additionalInsights: [
      `Under Canadian Common Law (Bardal factors), reasonable notice settlements are typically 3x to 5x higher than statutory minimums.`,
      `Severance lump sums can be transferred directly to your RRSP without withholding tax if you have eligible accumulated contribution room.`,
    ],
  };
}

// 4. CCPC Corporate Tax & Salary vs Dividend Integration
function calculateCcpcIntegration(inputs: TaxInput): TaxResult {
  const activeIncome = safeVal(inputs.active_business_income ?? inputs.income);
  const prov = String(inputs.province || 'on');
  const salaryChosen = safeVal(inputs.owner_salary_chosen, 0);

  if (activeIncome <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Active Business Income', value: 0 }],
      currency: 'CAD',
      currencySymbol: '$',
    };
  }

  // Small Business Deduction (SBD up to $500k): Federal 9% + Provincial ~3.2% = ~12.2%
  let provCorpRate = 0.032; // Ontario
  if (prov.includes('bc') || prov.includes('ab') || prov.includes('sk')) provCorpRate = 0.02;
  if (prov.includes('qc')) provCorpRate = 0.032;

  const combinedCorpRate = 0.09 + provCorpRate;
  const corporateProfitBeforeTax = Math.max(0, activeIncome - salaryChosen);
  const corporateTaxPayable = corporateProfitBeforeTax * combinedCorpRate;
  const netCorporateProfit = corporateProfitBeforeTax - corporateTaxPayable;

  // Personal Tax on Salary
  const personalTaxOnSalary = calculateFederalTax(salaryChosen) + calculateProvincialTax(salaryChosen, prov);

  // Personal Tax on Non-Eligible Dividend (Distributed net corporate profit)
  // Non-eligible dividend gross-up 115%, federal credit ~9.03%
  const grossedUpDividend = netCorporateProfit * 1.15;
  const personalTaxOnDividend = grossedUpDividend * 0.28; // Estimated net dividend tax after DTC

  const totalOwnerCash = (salaryChosen - personalTaxOnSalary) + (netCorporateProfit - personalTaxOnDividend);
  const totalCombinedTaxes = corporateTaxPayable + personalTaxOnSalary + personalTaxOnDividend;

  const breakdown = [
    { label: 'Active Business Income (Net Corporate Revenue)', value: activeIncome },
    ...(salaryChosen > 0 ? [{ label: 'Owner Salary Paid (Deductible to Corporation)', value: salaryChosen }] : []),
    { label: `Corporate Small Business Tax (${(combinedCorpRate * 100).toFixed(1)}% Combined Rate)`, value: corporateTaxPayable, isDeduction: true },
    { label: 'Net Retained Corporate Profit (Available for Dividend)', value: netCorporateProfit, isTotal: true },
    ...(salaryChosen > 0 ? [{ label: 'Personal Income Tax on Salary', value: personalTaxOnSalary, isDeduction: true }] : []),
    { label: 'Personal Tax on Non-Eligible Dividends Distributed', value: personalTaxOnDividend, isDeduction: true },
    { label: 'Total Combined Taxes (Corporate + Personal)', value: totalCombinedTaxes, isTotal: true },
    { label: 'Total Net Owner Cash in Pocket', value: totalOwnerCash, isFinal: true },
  ];

  return {
    grossIncome: activeIncome,
    netIncome: totalOwnerCash,
    totalTax: totalCombinedTaxes,
    effectiveRate: totalCombinedTaxes / activeIncome,
    breakdown,
    currency: 'CAD',
    currencySymbol: '$',
    quarterlyPayment: Math.round(corporateTaxPayable / 4),
    additionalInsights: [
      `The Canadian tax integration principle ensures that earning active income through a CCPC and distributing it as dividends results in similar overall tax to earning salary directly.`,
      `CCPC Small Business Deduction provides an immediate tax deferral advantage by paying only ${(combinedCorpRate * 100).toFixed(1)}% corporate tax on retained earnings.`,
    ],
  };
}

// 5. GST/HST/QST Remittance: Quick Method vs Regular ITCs
function calculateGstHstQuickMethod(inputs: TaxInput): TaxResult {
  const revenueInclTax = safeVal(inputs.annual_taxable_sales_including_tax ?? inputs.revenue);
  const prov = String(inputs.province_location || 'on_13');
  const purchases = safeVal(inputs.annual_taxable_purchases, 0);
  const isServices = String(inputs.business_type || 'services_specified').includes('services');

  if (revenueInclTax <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Sales (Including Tax)', value: 0 }],
      currency: 'CAD',
      currencySymbol: '$',
    };
  }

  // Quick Method Remittance Rates (CRA):
  // Ontario (13%): 8.8% services (8.4% goods), 1% credit on first $30k
  let quickRate = 0.088;
  let taxRate = 0.13;

  if (prov.includes('5') || prov.includes('bc') || prov.includes('ab')) {
    taxRate = 0.05;
    quickRate = isServices ? 0.036 : 0.018;
  } else if (prov.includes('15') || prov.includes('ns') || prov.includes('nb')) {
    taxRate = 0.15;
    quickRate = isServices ? 0.104 : 0.10;
  } else if (prov.includes('qc')) {
    taxRate = 0.14975;
    quickRate = 0.103;
  }

  // Quick Method Remittance
  const quickRemittanceBeforeCredit = revenueInclTax * quickRate;
  const quickFirst30kCredit = Math.min(revenueInclTax, 30000) * 0.01;
  const quickMethodRemittance = Math.max(0, quickRemittanceBeforeCredit - quickFirst30kCredit);
  const quickNetBenefit = (revenueInclTax * (taxRate / (1 + taxRate))) - quickMethodRemittance;

  // Regular Method: Tax Collected minus ITCs on purchases
  const preTaxRevenue = revenueInclTax / (1 + taxRate);
  const taxCollected = preTaxRevenue * taxRate;
  const itcClaimed = purchases * taxRate;
  const regularRemittance = Math.max(0, taxCollected - itcClaimed);

  const isQuickBetter = quickMethodRemittance < regularRemittance;
  const savings = Math.abs(regularRemittance - quickMethodRemittance);

  const breakdown = [
    { label: 'Gross Annual Taxable Sales (Including GST/HST)', value: revenueInclTax },
    { label: `Total GST/HST Collected from Clients (${(taxRate * 100).toFixed(1)}%)`, value: taxCollected },
    { label: 'Input Tax Credits (ITCs on Purchases)', value: itcClaimed, isDeduction: true },
    { label: 'Regular Method Net Remittance to CRA', value: regularRemittance, isTotal: true },
    { label: `Quick Method Remittance (${(quickRate * 100).toFixed(1)}% minus 1% credit)`, value: quickMethodRemittance, isDeduction: true },
    {
      label: isQuickBetter
        ? `Quick Method Extra Profit Kept: +$${Math.round(savings).toLocaleString('en-CA')}`
        : `Regular Method Extra Savings: +$${Math.round(savings).toLocaleString('en-CA')}`,
      value: savings,
      isFinal: true,
    },
  ];

  return {
    grossIncome: revenueInclTax,
    netIncome: revenueInclTax - Math.min(quickMethodRemittance, regularRemittance),
    totalTax: Math.min(quickMethodRemittance, regularRemittance),
    effectiveRate: Math.min(quickMethodRemittance, regularRemittance) / revenueInclTax,
    breakdown,
    currency: 'CAD',
    currencySymbol: '$',
    quarterlyPayment: Math.round(Math.min(quickMethodRemittance, regularRemittance) / 4),
    additionalInsights: [
      isQuickBetter
        ? `The CRA Quick Method is advantageous for your business, allowing you to pocket an extra $${Math.round(savings).toLocaleString('en-CA')} annually.`
        : `The Regular Method is more advantageous because your Input Tax Credits ($${Math.round(itcClaimed).toLocaleString('en-CA')}) exceed the Quick Method margin.`,
      `The Quick Method is eligible for small businesses with annual worldwide taxable revenue up to $400,000 (including GST/HST).`,
    ],
  };
}
