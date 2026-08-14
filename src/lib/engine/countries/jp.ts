// src/lib/engine/countries/jp.ts
// Japan Financial & Tax Engine — 2025/2026 Tax Rules (令和7年・令和8年)
// Sources: National Tax Agency (nta.go.jp - 国税庁), Ministry of Internal Affairs and Communications (総務省)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'kojin-jigyo-tax-calculator');

  switch (calcId) {
    case 'furusato-nozei-calculator':
      return calculateFurusatoNozei(inputs);
    case 'take-home-pay-calculator':
      return calculateTakeHomePay(inputs);
    case 'real-estate-tax-registration-calculator':
      return calculateRealEstateTaxes(inputs);
    case 'inheritance-gift-tax-calculator':
      return calculateInheritanceTax(inputs);
    case 'kojin-jigyo-tax-calculator':
    default:
      return calculateKojinJigyo(inputs);
  }
}

// National Shotoku-zei (所得税) Progressive Tax Rates
function calculateShotokuZei(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  if (taxableIncome <= 1950000) {
    tax = taxableIncome * 0.05;
  } else if (taxableIncome <= 3300000) {
    tax = taxableIncome * 0.10 - 97500;
  } else if (taxableIncome <= 6950000) {
    tax = taxableIncome * 0.20 - 427500;
  } else if (taxableIncome <= 9000000) {
    tax = taxableIncome * 0.23 - 636000;
  } else if (taxableIncome <= 18000000) {
    tax = taxableIncome * 0.33 - 1536000;
  } else if (taxableIncome <= 40000000) {
    tax = taxableIncome * 0.40 - 2796000;
  } else {
    tax = taxableIncome * 0.45 - 4796000;
  }
  // Special Reconstruction Income Tax (復興特別所得税 2.1%)
  return tax * 1.021;
}

// Employment Income Deduction (給与所得控除)
function calculateKyuyoShotokuKojo(grossSalary: number): number {
  if (grossSalary <= 1625000) return 550000;
  if (grossSalary <= 1800000) return grossSalary * 0.40 - 100000;
  if (grossSalary <= 3600000) return grossSalary * 0.30 + 80000;
  if (grossSalary <= 6600000) return grossSalary * 0.20 + 440000;
  if (grossSalary <= 8500000) return grossSalary * 0.10 + 1100000;
  return 1950000; // Cap at 1.95M for salary > 8.5M
}

// 1. 個人事業主税金シミュレーター (Sole Proprietor Blue Tax Return)
function calculateKojinJigyo(inputs: TaxInput): TaxResult {
  const revenue = safeVal(inputs.annual_revenue ?? inputs.revenue);
  const expenses = safeVal(inputs.business_expenses ?? inputs.expenses);
  const blueDeductionType = String(inputs.blue_return_deduction || 'blue_65man');
  const category = String(inputs.business_category || 'category_1_services_sales');
  const socialPaid = safeVal(inputs.social_insurance_paid, 0);
  const dependentsCount = safeVal(inputs.dependents_count, 0);
  const spouse = String(inputs.dependent_spouse || 'none');

  if (revenue <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Annual Revenue (年間売上)', value: 0 }],
      currency: 'JPY',
      currencySymbol: '¥',
    };
  }

  // Blue Return Special Deduction (青色申告特別控除)
  let blueDeduction = 0;
  if (blueDeductionType === 'blue_65man') blueDeduction = 650000;
  else if (blueDeductionType === 'blue_55man') blueDeduction = 550000;
  else if (blueDeductionType === 'blue_10man') blueDeduction = 100000;

  const netBusinessIncome = Math.max(0, revenue - expenses - blueDeduction);

  // Income Deductions (所得控除)
  const basicDeduction = 480000; // 基礎控除
  const spousalDeduction = spouse !== 'none' ? 380000 : 0;
  const dependentDeduction = dependentsCount * 380000;
  const estimatedSocialInsurance = socialPaid > 0 ? socialPaid : Math.min(1040000, netBusinessIncome * 0.10) + 203760;

  const totalDeductions = basicDeduction + spousalDeduction + dependentDeduction + estimatedSocialInsurance;
  const taxableIncome = Math.max(0, netBusinessIncome - totalDeductions);

  // 1. National Income Tax (所得税)
  const incomeTax = calculateShotokuZei(taxableIncome);

  // 2. Inhabitant Tax (住民税 - 10% Flat + ¥5,000 per capita)
  const taxableInhabitant = Math.max(0, netBusinessIncome - (basicDeduction - 50000 + spousalDeduction + dependentDeduction + estimatedSocialInsurance));
  const inhabitantTax = taxableInhabitant * 0.10 + 5000;

  // 3. Individual Enterprise Tax (個人事業税 - 5% over 2.9M allowance)
  let enterpriseTax = 0;
  const enterpriseTaxable = Math.max(0, (revenue - expenses) - 2900000);
  if (category !== 'exempt_writing_art') {
    enterpriseTax = enterpriseTaxable * 0.05;
  }

  // 4. National Health Insurance + Pension (国民健康保険・国民年金)
  const nationalInsuranceTotal = estimatedSocialInsurance;

  const totalTaxesAndSocial = incomeTax + inhabitantTax + enterpriseTax + nationalInsuranceTotal;
  const netTakeHome = Math.max(0, revenue - expenses - totalTaxesAndSocial);

  const breakdown = [
    { label: 'Annual Gross Business Revenue (年間売上)', value: revenue },
    { label: 'Necessary Business Expenses (必要経費)', value: expenses, isDeduction: true },
    ...(blueDeduction > 0 ? [{ label: `Blue Return Special Deduction (青色申告特別控除)`, value: blueDeduction, isDeduction: true }] : []),
    { label: 'Net Business Income (事業所得金額)', value: netBusinessIncome, isTotal: true },
    { label: 'National Income Tax (所得税・復興特別所得税)', value: incomeTax, isDeduction: true },
    { label: 'Inhabitant Tax (住民税 10%)', value: inhabitantTax, isDeduction: true },
    ...(enterpriseTax > 0 ? [{ label: 'Individual Enterprise Tax (個人事業税 5%)', value: enterpriseTax, isDeduction: true }] : []),
    { label: 'National Health Insurance & Pension (国保・国民年金)', value: nationalInsuranceTotal, isDeduction: true },
    { label: 'Total Taxes & Social Contributions (公租公課合計)', value: totalTaxesAndSocial, isTotal: true },
    { label: 'Net Annual In-Pocket Profit (年間手取り純利益)', value: netTakeHome, isFinal: true },
    { label: 'Monthly Take-Home (月額手取り)', value: Math.round(netTakeHome / 12), isTotal: true },
  ];

  return {
    grossIncome: revenue,
    netIncome: netTakeHome,
    totalTax: totalTaxesAndSocial,
    effectiveRate: totalTaxesAndSocial / revenue,
    breakdown,
    currency: 'JPY',
    currencySymbol: '¥',
    quarterlyPayment: Math.round(totalTaxesAndSocial / 4),
    additionalInsights: [
      blueDeductionType === 'blue_65man'
        ? `Maximizing the ¥650,000 Blue Return deduction with e-Tax saves approximately ¥${Math.round(650000 * 0.30).toLocaleString()} in taxes per year.`
        : `Filing with the ¥650,000 Blue Return with e-Tax is recommended to maximize your deductions.`,
      `Individual enterprise tax (個人事業税) applies only to net profits exceeding the ¥2,900,000 annual business allowance.`,
    ],
  };
}

// 2. ふるさと納税上限額シミュレーター (Hometown Tax Donation Limit)
function calculateFurusatoNozei(inputs: TaxInput): TaxResult {
  const grossIncome = safeVal(inputs.annual_gross_income ?? inputs.gross_income ?? inputs.salary);
  const socialPaid = safeVal(inputs.social_insurance_annual, 0);

  if (grossIncome <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Annual Gross Income', value: 0 }],
      currency: 'JPY',
      currencySymbol: '¥',
    };
  }

  // Salary deduction
  const kyuyoKojo = calculateKyuyoShotokuKojo(grossIncome);
  const kyuyoShotoku = Math.max(0, grossIncome - kyuyoKojo);

  // Deductions
  const basicKojo = 480000;
  const socialKojo = socialPaid > 0 ? socialPaid : grossIncome * 0.145;
  const taxableIncome = Math.max(0, kyuyoShotoku - basicKojo - socialKojo);

  // Inhabitant tax income portion (住民税所得割額 ~ 10%)
  const inhabitantTaxIncomePortion = taxableIncome * 0.10;

  // Marginal income tax rate
  let marginalTaxRate = 0.05;
  if (taxableIncome > 18000000) marginalTaxRate = 0.40;
  else if (taxableIncome > 9000000) marginalTaxRate = 0.33;
  else if (taxableIncome > 6950000) marginalTaxRate = 0.23;
  else if (taxableIncome > 3300000) marginalTaxRate = 0.20;
  else if (taxableIncome > 1950000) marginalTaxRate = 0.10;

  // Statutory Hometown Donation Limit formula: (Inhabitant Tax * 20%) / (90% - (MarginalRate * 1.021)) + ¥2,000
  const denominator = 0.90 - marginalTaxRate * 1.021;
  const furusatoMaxLimit = Math.max(2000, (inhabitantTaxIncomePortion * 0.20) / Math.max(0.1, denominator) + 2000);
  const selfCopay = 2000;
  const taxCreditTotal = Math.max(0, furusatoMaxLimit - selfCopay);
  const returnGiftEstValue = furusatoMaxLimit * 0.30; // 30% return gift value

  const breakdown = [
    { label: 'Annual Gross Salary (給与年収)', value: grossIncome },
    { label: 'Employment Income Deduction (給与所得控除)', value: kyuyoKojo, isDeduction: true },
    { label: 'Estimated Taxable Income (課税所得金額)', value: taxableIncome, isTotal: true },
    { label: 'Max Optimal Furusato Donation Cap (寄附上限額の目安)', value: furusatoMaxLimit, isFinal: true },
    { label: 'Self Co-Pay Cost (自己負担額)', value: selfCopay, isDeduction: true },
    { label: 'Total Tax Deduction / Credit Received (税金控除・還付額)', value: taxCreditTotal },
    { label: 'Estimated Value of Return Gifts (返礼品相当額 ~30%)', value: returnGiftEstValue, isTotal: true },
  ];

  return {
    grossIncome: furusatoMaxLimit,
    netIncome: taxCreditTotal,
    totalTax: selfCopay,
    effectiveRate: selfCopay / furusatoMaxLimit,
    breakdown,
    currency: 'JPY',
    currencySymbol: '¥',
    additionalInsights: [
      `By donating up to ¥${Math.round(furusatoMaxLimit).toLocaleString()}, you receive approximately ¥${Math.round(returnGiftEstValue).toLocaleString()} in regional products for a net cost of only ¥2,000.`,
      `Salaried employees donating to 5 or fewer municipalities can use the One-Stop Special Procedure (ワンストップ特例制度) without filing a tax return.`,
    ],
  };
}

// 3. 給与手取り計算機 (Salary Take-Home Pay)
function calculateTakeHomePay(inputs: TaxInput): TaxResult {
  const monthlySalary = safeVal(inputs.gross_salary_monthly ?? inputs.salary);
  const bonusMonths = safeVal(inputs.annual_bonus_months, 0);
  const bonusAnnual = safeVal(inputs.bonus_annual, monthlySalary * bonusMonths);
  const grossAnnual = monthlySalary * 12 + bonusAnnual;
  const age = safeVal(inputs.age, 35);
  const dependents = safeVal(inputs.dependents_count, 0);
  const hasSpouse = String(inputs.has_spouse || 'no') === 'yes';

  if (grossAnnual <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Gross Annual Salary', value: 0 }],
      currency: 'JPY',
      currencySymbol: '¥',
    };
  }

  // Social Insurance Rates (Employee share)
  // Health Insurance (健康保険 ~4.99%), Pension (厚生年金 9.15%), Employment (雇用保険 0.60%)
  const healthRate = 0.0499;
  const nursingRate = age >= 40 && age < 65 ? 0.008 : 0; // 介護保険
  const pensionRate = 0.0915;
  const employmentRate = 0.006;

  const totalSocialRate = healthRate + nursingRate + pensionRate + employmentRate;
  const annualSocialInsurance = grossAnnual * totalSocialRate;

  // Income deductions
  const kyuyoKojo = calculateKyuyoShotokuKojo(grossAnnual);
  const basicKojo = 480000;
  const spouseKojo = hasSpouse ? 380000 : 0;
  const dependentKojo = dependents * 380000;

  const taxableIncome = Math.max(0, grossAnnual - kyuyoKojo - basicKojo - spouseKojo - dependentKojo - annualSocialInsurance);

  // Income Tax + Inhabitant Tax
  const incomeTax = calculateShotokuZei(taxableIncome);
  const inhabitantTax = Math.max(0, taxableIncome * 0.10 + 5000);

  const totalDeductions = annualSocialInsurance + incomeTax + inhabitantTax;
  const netAnnualTakeHome = grossAnnual - totalDeductions;
  const netMonthly = (monthlySalary * 12 - (annualSocialInsurance * (12 * monthlySalary / grossAnnual)) - incomeTax - inhabitantTax) / 12;

  const breakdown = [
    { label: 'Annual Gross Salary (額面年収)', value: grossAnnual },
    { label: `Health Insurance & Nursing (健康保険・介護保険 ${( (healthRate + nursingRate) * 100 ).toFixed(2)}%)`, value: grossAnnual * (healthRate + nursingRate), isDeduction: true },
    { label: 'Welfare Pension (厚生年金保険 9.15%)', value: grossAnnual * pensionRate, isDeduction: true },
    { label: 'Employment Insurance (雇用保険 0.60%)', value: grossAnnual * employmentRate, isDeduction: true },
    { label: 'National Income Tax (所得税・復興税)', value: incomeTax, isDeduction: true },
    { label: 'Inhabitant Tax (住民税 10%)', value: inhabitantTax, isDeduction: true },
    { label: 'Total Annual Deductions (社会保険料・税金合計)', value: totalDeductions, isTotal: true },
    { label: 'Annual Net Take-Home Pay (年間手取り額)', value: netAnnualTakeHome, isFinal: true },
    { label: 'Estimated Monthly Take-Home (月額手取り概算)', value: Math.round(netAnnualTakeHome / 12), isTotal: true },
  ];

  return {
    grossIncome: grossAnnual,
    netIncome: netAnnualTakeHome,
    totalTax: totalDeductions,
    effectiveRate: totalDeductions / grossAnnual,
    breakdown,
    currency: 'JPY',
    currencySymbol: '¥',
    additionalInsights: [
      `Your take-home ratio is ${( (netAnnualTakeHome / grossAnnual) * 100 ).toFixed(1)}% of your gross compensation.`,
      `Social insurance contributions (社会保険料) represent the largest single deduction at ${( (annualSocialInsurance / grossAnnual) * 100 ).toFixed(1)}% of gross salary.`,
    ],
  };
}

// 4. 不動産取得税・登録免許税・仲介手数料 (Real Estate Purchase Taxes & Fees)
function calculateRealEstateTaxes(inputs: TaxInput): TaxResult {
  const price = safeVal(inputs.property_purchase_price ?? inputs.price);
  const buildingVal = safeVal(inputs.building_taxable_value, price * 0.40);
  const landVal = safeVal(inputs.land_taxable_value, price * 0.60);
  const isNew = String(inputs.is_new_construction || 'yes_standard');
  const loanAmount = safeVal(inputs.mortgage_loan_amount, 0);

  if (price <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Property Purchase Price', value: 0 }],
      currency: 'JPY',
      currencySymbol: '¥',
    };
  }

  // 1. Registration & License Tax (登録免許税)
  // Land: 1.5% (reduced)
  const landRegTax = landVal * 0.015;
  // Building: New = 0.15% (or 0.1% long-life), Used = 0.3%
  const buildingRegRate = isNew.includes('yes') ? 0.0015 : 0.003;
  const buildingRegTax = buildingVal * buildingRegRate;
  // Mortgage loan registration: 0.1%
  const mortgageRegTax = loanAmount * 0.001;

  const totalRegTax = landRegTax + buildingRegTax + mortgageRegTax;

  // 2. Real Estate Acquisition Tax (不動産取得税)
  // Residential land: (land value * 1/2) * 3% minus relief
  const landAcqTax = Math.max(0, (landVal * 0.5 * 0.03) - 45000);
  // Residential building: (building value - 12M deduction) * 3%
  const buildingAcqTax = Math.max(0, (buildingVal - (isNew.includes('yes') ? 12000000 : 10000000)) * 0.03);
  const totalAcqTax = landAcqTax + buildingAcqTax;

  // 3. Brokerage Fee (仲介手数料): (3% + ¥60,000) * 1.10
  const brokerageFee = (price * 0.03 + 60000) * 1.10;

  // 4. Judicial Scrivener & Revenue Stamps (司法書士報酬・印紙税)
  const judicialFee = 120000;
  const stampDuty = price > 50000000 ? 30000 : 10000;

  const totalClosingCosts = totalRegTax + totalAcqTax + brokerageFee + judicialFee + stampDuty;

  const breakdown = [
    { label: 'Property Purchase Price (物件購入価格)', value: price },
    { label: 'Registration & License Tax (登録免許税)', value: totalRegTax, isDeduction: true },
    { label: 'Real Estate Acquisition Tax (不動産取得税)', value: totalAcqTax, isDeduction: true },
    { label: 'Real Estate Brokerage Commission (仲介手数料・消費税込)', value: brokerageFee, isDeduction: true },
    { label: 'Judicial Scrivener Fees & Revenue Stamp (司法書士報酬・印紙税)', value: judicialFee + stampDuty, isDeduction: true },
    { label: 'Total Closing Costs & Taxes (諸費用合計)', value: totalClosingCosts, isTotal: true },
    { label: 'Total Funds Required for Acquisition', value: price + totalClosingCosts, isFinal: true },
  ];

  return {
    grossIncome: price,
    netIncome: price + totalClosingCosts,
    totalTax: totalClosingCosts,
    effectiveRate: totalClosingCosts / price,
    breakdown,
    currency: 'JPY',
    currencySymbol: '¥',
    additionalInsights: [
      `Total closing costs represent ${( (totalClosingCosts / price) * 100 ).toFixed(2)}% of the purchase price (typically 6-8% for residential real estate in Japan).`,
      `The building acquisition tax special deduction of up to ¥12,000,000 significantly reduces or eliminates acquisition tax for newly built homes.`,
    ],
  };
}

// 5. 相続税・贈与税計算機 (Inheritance & Gift Tax)
function calculateInheritanceTax(inputs: TaxInput): TaxResult {
  const estateValue = safeVal(inputs.total_estate_taxable_value ?? inputs.estate_value);
  const hasSpouse = String(inputs.has_spouse || 'yes') === 'yes';
  const children = safeVal(inputs.children_count, 2);
  const spouseSharePct = safeVal(inputs.spouse_actual_share_pct, hasSpouse ? 50 : 0) / 100;

  if (estateValue <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Total Estate Value', value: 0 }],
      currency: 'JPY',
      currencySymbol: '¥',
    };
  }

  // Statutory Heirs Count (法定相続人数)
  const totalHeirs = (hasSpouse ? 1 : 0) + Math.max(0, children);

  // Basic Estate Exemption (基礎控除): ¥30,000,000 + (¥6,000,000 * Heirs)
  const basicExemption = 30000000 + 6000000 * totalHeirs;
  const taxableEstate = Math.max(0, estateValue - basicExemption);

  if (taxableEstate === 0) {
    return {
      grossIncome: estateValue,
      netIncome: estateValue,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Total Estate Value (遺産総額)', value: estateValue },
        { label: `Basic Estate Exemption (基礎控除: ¥3,000万 + ¥600万 × ${totalHeirs}人)`, value: basicExemption },
        { label: 'Taxable Net Estate (課税遺産総額)', value: 0, isTotal: true },
        { label: 'Inheritance Tax Payable (相続税額)', value: 0, isFinal: true },
      ],
      currency: 'JPY',
      currencySymbol: '¥',
      additionalInsights: ['The total estate value is within the basic estate tax exemption. No inheritance tax return is required.'],
    };
  }

  // Statutory Heir Share Allocation (法定相続分)
  let spouseStatutoryPortion = hasSpouse ? (children > 0 ? 0.50 : 1.0) : 0;
  let childStatutoryPortion = children > 0 ? (hasSpouse ? 0.50 / children : 1.0 / children) : 0;

  function heirTax(amount: number): number {
    if (amount <= 10000000) return amount * 0.10;
    if (amount <= 30000000) return amount * 0.15 - 500000;
    if (amount <= 50000000) return amount * 0.20 - 2000000;
    if (amount <= 100000000) return amount * 0.30 - 7000000;
    if (amount <= 200000000) return amount * 0.40 - 17000000;
    if (amount <= 300000000) return amount * 0.45 - 27000000;
    if (amount <= 600000000) return amount * 0.50 - 42000000;
    return amount * 0.55 - 72000000;
  }

  const spouseStatutoryTax = hasSpouse ? heirTax(taxableEstate * spouseStatutoryPortion) : 0;
  const childStatutoryTax = children > 0 ? heirTax(taxableEstate * childStatutoryPortion) * children : 0;
  const totalStatutoryTax = spouseStatutoryTax + childStatutoryTax;

  // Spousal Tax Reduction (配偶者の税額軽減): Exemption up to max(¥160,000,000, statutory share)
  const spouseTaxDue = 0; // Spouse pays 0 due to spousal credit
  const childrenTaxDue = totalStatutoryTax * (1 - (hasSpouse ? spouseSharePct : 0));
  const finalTotalTax = childrenTaxDue;

  const breakdown = [
    { label: 'Total Gross Estate Value (遺産総額)', value: estateValue },
    { label: `Basic Estate Exemption (基礎控除: ¥${(basicExemption / 10000).toLocaleString()}万円)`, value: basicExemption, isDeduction: true },
    { label: 'Taxable Net Estate (課税遺産総額)', value: taxableEstate, isTotal: true },
    { label: 'Total Statutory Inheritance Tax Base', value: totalStatutoryTax },
    ...(hasSpouse ? [{ label: 'Spousal Tax Credit (配偶者の税額軽減 - 100%免税)', value: spouseStatutoryTax, isDeduction: true }] : []),
    { label: 'Total Net Inheritance Tax Payable (相続税納付税額)', value: finalTotalTax, isFinal: true },
    { label: 'Net Estate Distributed to Heirs (手取り遺産額)', value: estateValue - finalTotalTax, isTotal: true },
  ];

  return {
    grossIncome: estateValue,
    netIncome: estateValue - finalTotalTax,
    totalTax: finalTotalTax,
    effectiveRate: finalTotalTax / estateValue,
    breakdown,
    currency: 'JPY',
    currencySymbol: '¥',
    additionalInsights: [
      `Under Japan's Spousal Tax Credit (配偶者の税額軽減), the surviving spouse owes ¥0 tax on estates up to ¥160 Million (or their statutory share).`,
      `Inheritance tax returns must be filed and settled within 10 months following the date of death.`,
    ],
  };
}
