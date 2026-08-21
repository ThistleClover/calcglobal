// src/utils/analytics.ts - GA4 Telemetry & Analytics Helper Suite for CalcGlobal

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Categorize gross annual income into standard marketing & analytics tiers.
 */
export function getIncomeTier(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return 'tier_unknown';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) return 'tier_zero';
  if (num < 30000) return 'under_30k';
  if (num < 60000) return '30k_60k';
  if (num < 100000) return '60k_100k';
  if (num < 200000) return '100k_200k';
  return '200k_plus';
}

/**
 * Categorize effective tax rate into standard analytics brackets.
 * Accepts decimal (e.g. 0.25 for 25%) or percentage value (e.g. 25).
 */
export function getTaxBracketTier(rate?: number | string | null): string {
  if (rate === undefined || rate === null || rate === '') return 'bracket_unknown';
  let num = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(num)) return 'bracket_unknown';
  
  // If provided in 0..1 range (decimal), convert to 0..100
  if (num > 0 && num <= 1) {
    num = num * 100;
  }

  if (num <= 0) return '0_pct';
  if (num < 15) return 'under_15pct';
  if (num < 30) return '15pct_30pct';
  if (num < 45) return '30pct_45pct';
  return '45pct_plus';
}

/**
 * Internal non-blocking GA4 event dispatcher.
 * Dispatches safely through both gtag() and dataLayer.push().
 */
function sendGAEvent(eventName: string, params: Record<string, any>): void {
  try {
    if (typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params,
      timestamp: new Date().toISOString(),
    });

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    // Non-blocking catch to ensure calculations or UI interactions never break
    console.debug(`[CalcGlobal Analytics] Failed to send event ${eventName}:`, err);
  }
}

export interface CalculatorUsedParams {
  calculator_id: string;
  country_code: string;
  gross_income_tier: string;
  tax_bracket?: string;
  has_results: boolean;
  [key: string]: any;
}

export function trackCalculatorUsed(params: CalculatorUsedParams): void {
  sendGAEvent('calculator_used', {
    calculator_id: params.calculator_id,
    country_code: params.country_code.toLowerCase(),
    gross_income_tier: params.gross_income_tier,
    tax_bracket: params.tax_bracket || 'bracket_unknown',
    has_results: params.has_results,
    ...params,
  });
}

export interface CountrySwitchedParams {
  previous_country: string;
  new_country: string;
  source: string;
  [key: string]: any;
}

export function trackCountrySwitched(params: CountrySwitchedParams): void {
  sendGAEvent('country_switched', {
    previous_country: params.previous_country.toLowerCase(),
    new_country: params.new_country.toLowerCase(),
    source: params.source || 'ui_selector',
    ...params,
  });
}

export interface PresetClickedParams {
  currency: string;
  amount: number;
  calculator_id?: string;
  input_name?: string;
  [key: string]: any;
}

export function trackPresetClicked(params: PresetClickedParams): void {
  sendGAEvent('preset_clicked', {
    currency: params.currency,
    amount: params.amount,
    calculator_id: params.calculator_id,
    input_name: params.input_name,
    ...params,
  });
}

export interface ShareCalculationParams {
  calculator_id: string;
  country_code: string;
  share_type: 'copy_link' | 'native' | 'whatsapp' | 'twitter' | 'linkedin' | string;
  [key: string]: any;
}

export function trackShareCalculation(params: ShareCalculationParams): void {
  sendGAEvent('share_calculation', {
    calculator_id: params.calculator_id,
    country_code: params.country_code.toLowerCase(),
    share_type: params.share_type,
    ...params,
  });
}

export interface AffiliateClickParams {
  partner_name: string;
  partner_url: string;
  calculator_id: string;
  income_tier?: string;
  country_code?: string;
  position?: string;
  [key: string]: any;
}

export function trackAffiliateClick(params: AffiliateClickParams): void {
  sendGAEvent('affiliate_card_click', {
    partner_name: params.partner_name,
    cta_url: params.partner_url,
    calculator_id: params.calculator_id,
    income_tier: params.income_tier || 'tier_unknown',
    country: (params.country_code || 'US').toUpperCase(),
    position: params.position || 'results_panel',
    ...params,
  });
}
