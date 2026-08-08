// src/lib/engine/types.ts
// Shared TypeScript types for the Tax Engine

export interface TaxInput {
  [key: string]: string | number | boolean;
}

export interface TaxBreakdownLine {
  label: string;
  value: number;
  isDeduction?: boolean;
  isTotal?: boolean;
  isFinal?: boolean;
  percentage?: number;
}

export interface TaxResult {
  grossIncome: number;
  netIncome: number;
  totalTax: number;
  effectiveRate: number; // as a decimal, e.g. 0.28 = 28%
  breakdown: TaxBreakdownLine[];
  currency: string;
  currencySymbol: string;
  quarterlyPayment?: number;
  additionalInsights?: string[];
}

export interface ITaxEngine {
  calculate(inputs: TaxInput): TaxResult;
}
