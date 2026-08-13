export interface AffiliatePartner {
  name: string;
  type?: string;
  description: string;
  url?: string;
  logo?: string;
  cta?: string;
}

export interface AffiliateContext {
  netIncome?: number;
  grossIncome?: number;
  currencySymbol?: string;
  calculatorId?: string;
  category?: string;
  locale?: string;
}

export function formatCurrencyAmount(val: number, currencySymbol: string = '$', locale: string = 'en-US'): string {
  if (isNaN(val) || !isFinite(val)) return '0';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(val));
  return `${currencySymbol}${formatted}`;
}

export function getAffiliateLogo(partner: AffiliatePartner): string {
  if (partner.logo) return partner.logo;
  const type = (partner.type || '').toLowerCase();
  if (type.includes('bank') || type.includes('neo') || type.includes('fintech')) return '🏦';
  if (type.includes('soft') || type.includes('account') || type.includes('tax') || type.includes('book')) return '💻';
  if (type.includes('insur') || type.includes('liab')) return '🛡️';
  if (type.includes('leg') || type.includes('incorp') || type.includes('llc')) return '⚖️';
  if (type.includes('pay') || type.includes('hr')) return '💼';
  if (type.includes('real') || type.includes('mortg')) return '🏠';
  return '⚡';
}

export function getAffiliateButtonText(partner: AffiliatePartner, fallbackCta?: string): string {
  if (partner.cta) return partner.cta;
  if (fallbackCta) return fallbackCta;
  const type = (partner.type || '').toLowerCase();
  if (type.includes('soft') || type.includes('account')) return 'Try Free';
  if (type.includes('bank') || type.includes('neo')) return 'Open Account';
  if (type.includes('insur')) return 'Get Quote';
  if (type.includes('leg') || type.includes('incorp')) return 'Form Entity';
  return 'Get Started';
}

export function getAffiliateContextualCopy(partner: AffiliatePartner, context: AffiliateContext): string {
  const { netIncome, grossIncome, currencySymbol = '$', locale = 'en-US' } = context;
  const type = (partner.type || '').toLowerCase();
  const name = partner.name;

  const hasNet = netIncome !== undefined && netIncome > 0;
  const hasGross = grossIncome !== undefined && grossIncome > 0;

  const formattedNet = hasNet ? formatCurrencyAmount(netIncome!, currencySymbol, locale) : '';
  const formattedGross = hasGross ? formatCurrencyAmount(grossIncome!, currencySymbol, locale) : '';

  if (type.includes('bank') || type.includes('neo') || type.includes('fintech')) {
    if (hasNet) return `Manage your ${formattedNet} net income with ${name}`;
    if (hasGross) return `Save on business account fees for your ${formattedGross} revenue with ${name}`;
    return `Open a business account with ${name} to keep earnings organized`;
  }

  if (type.includes('soft') || type.includes('account') || type.includes('tax') || type.includes('book')) {
    if (hasNet) return `Automate tax tracking & expenses for your ${formattedNet} net income with ${name}`;
    if (hasGross) return `Track invoices and save tax on your ${formattedGross} revenue with ${name}`;
    return `Streamline accounting and tax deductions with ${name}`;
  }

  if (type.includes('insur') || type.includes('liab')) {
    if (hasGross) return `Protect your ${formattedGross} revenue with tailored liability coverage from ${name}`;
    if (hasNet) return `Safeguard your ${formattedNet} net earnings with tailored insurance from ${name}`;
    return `Protect your business operations with insurance from ${name}`;
  }

  if (type.includes('leg') || type.includes('incorp') || type.includes('llc')) {
    if (hasNet) return `Structure your business to optimize your ${formattedNet} net income with ${name}`;
    if (hasGross) return `Form an LLC/S-Corp to protect your ${formattedGross} revenue with ${name}`;
    return `Establish legal protection for your business with ${name}`;
  }

  if (type.includes('pay') || type.includes('hr')) {
    if (hasNet) return `Streamline payroll and payouts for your ${formattedNet} net income with ${name}`;
    if (hasGross) return `Run seamless team payroll for your ${formattedGross} revenue with ${name}`;
    return `Manage payroll and compliance with ${name}`;
  }

  if (type.includes('real') || type.includes('mortg')) {
    if (hasNet) return `Qualify for competitive mortgage rates using your ${formattedNet} verified net income`;
    return `Explore financing options tailored for self-employed professionals with ${name}`;
  }

  // Fallback
  if (hasNet) return `Optimize financial tools for your ${formattedNet} net income with ${name}`;
  if (hasGross) return `Scale business tools for your ${formattedGross} revenue with ${name}`;
  return partner.description;
}
