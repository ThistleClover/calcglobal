// src/config.ts
// Central configuration. Only countries listed here will be published.
// Other countries exist in the DB but won't generate pages until they have
// real math engines and full content.

export const ACTIVE_COUNTRIES = ['us', 'uk', 'fr', 'de', 'au'] as const;
export type ActiveCountryCode = typeof ACTIVE_COUNTRIES[number];

// Map of country code -> calculator ID -> engine module key
export const ENGINE_MAP: Record<string, Record<string, string>> = {
  us: {
    'us-1099-self-employment-tax-calculator': 'us',
    's-corp-vs-llc-tax-savings-calculator': 'us_scorp',
    'w2-salary-paycheck-take-home-calculator': 'us',
    'us-home-sale-net-proceeds-capital-gains-calculator': 'us',
    'us-small-business-lease-break-even-calculator': 'us',
  },
  uk: {
    'ir35-inside-outside-calculator': 'uk',
    'sdlt-lbtt-ltt-stamp-duty-calculator': 'uk',
    'uk-gross-net-salary-pension-calculator': 'uk',
    'uk-limited-company-director-salary-dividend-calculator': 'uk',
    'uk-statutory-redundancy-settlement-calculator': 'uk',
  },
  fr: {
    'urssaf-cotisations-micro-entreprise': 'fr',
    'frais-de-notaire-immobilier': 'fr',
    'calculateur-salaire-brut-net-cout-employeur': 'fr',
    'indemnite-rupture-conventionnelle-licenciement': 'fr',
    'calculateur-plus-value-immobiliere': 'fr',
  },
  de: {
    'brutto-netto-rechner-deutschland': 'de',
    'gewerbesteuer-rechner': 'de',
    'umsatzsteuer-rechner': 'de',
    'freiberufler-einkommensteuer': 'de',
    'kurzarbeitergeld-rechner': 'de',
  },
  au: {
    'ato-payg-income-tax-calculator': 'au',
    'hecs-repayment-calculator': 'au',
    'sole-trader-tax-calculator': 'au',
    'superannuation-calculator': 'au',
    'stamp-duty-calculator': 'au',
  },
};

export interface CountryMetadata {
  lang: string;
  locale: string;
  currencySymbol: string;
  title: string;
  h1: string;
  description: string;
  taxAuthority: string;
  authorityAbbr: string;
  intro: string;
  features: string[];
}

export const COUNTRY_METADATA: Record<string, CountryMetadata> = {
  us: {
    lang: 'en',
    locale: 'en-US',
    currencySymbol: '$',
    title: 'United States Tax Calculators 2026 | IRS Paycheck & 1099 Tools',
    h1: 'United States Tax & Paycheck Calculators (IRS 2026 Rules)',
    description: 'Free, accurate 2026 US tax calculators verified against official IRS tax brackets. Calculate 1099 self-employment tax, S-Corp tax savings, W-2 take-home pay, capital gains, and commercial lease break-even.',
    taxAuthority: 'Internal Revenue Service (IRS)',
    authorityAbbr: 'IRS',
    intro: 'All United States calculators utilize official IRS 2026 tax brackets, Social Security wage base caps ($176,100), standard deductions ($15,000 Single / $30,000 Joint), Section 199A QBI deductions, and state income tax rules.',
    features: [
      'IRS 2026 Federal Tax Brackets & Standard Deductions',
      '15.3% Self-Employment Tax & SE Tax Deduction',
      'Single, Married Joint, Head of Household & State Tax (CA, NY, TX, FL, IL, WA)',
      '1099, W-2, S-Corp Corporate Distributions & Capital Gains'
    ]
  },
  uk: {
    lang: 'en',
    locale: 'en-GB',
    currencySymbol: '£',
    title: 'UK Tax Calculators 2026/27 | HMRC IR35, SDLT & Salary Tools',
    h1: 'UK Tax, IR35 & Paycheck Calculators (HMRC 2026/27 Rules)',
    description: 'Official 2026/27 UK tax calculators compliant with HMRC guidelines. Calculate IR35 inside vs outside take-home pay, Stamp Duty (SDLT/LBTT/LTT), PAYE gross to net salary, director dividends, and statutory redundancy.',
    taxAuthority: "His Majesty's Revenue and Customs (HMRC)",
    authorityAbbr: 'HMRC',
    intro: 'All UK financial tools are calibrated for the 2026/27 tax year according to HMRC thresholds, including the £12,570 Personal Allowance, National Insurance rates, Corporation Tax taper rates, and Dividend Tax bands.',
    features: [
      'HMRC 2026/27 Income Tax, Personal Allowance (£12,570), & NIC Thresholds',
      'IR35 Inside vs Outside PSC Take-Home Pay & Umbrella Fee Calculations',
      'Stamp Duty Land Tax (SDLT), LBTT (Scotland) & LTT (Wales) Tiers',
      'Director Salary vs Dividend Tax Optimization & Statutory Redundancy Pay'
    ]
  },
  fr: {
    lang: 'fr',
    locale: 'fr-FR',
    currencySymbol: '€',
    title: 'Calculateurs Fiscaux & Salaires France 2026 | URSSAF & Impôts',
    h1: 'Calculateurs Fiscaux et Salaires France (Règles URSSAF 2026)',
    description: 'Calculateurs financiers gratuits et précis conformes aux barèmes URSSAF et fiscaux 2026. Calculez vos cotisations micro-entreprise, salaire brut en net, frais de notaire et indemnités de rupture.',
    taxAuthority: 'URSSAF & Direction Générale des Finances Publiques (DGFiP)',
    authorityAbbr: 'URSSAF / DGFiP',
    intro: 'Tous les calculateurs français intègrent les derniers barèmes sociaux URSSAF 2026, la réduction Fillon, les plafonds de la Sécurité Sociale (PASS 2026) et les abattements forfaitaires pour micro-entreprises.',
    features: [
      'Cotisations sociales URSSAF 2026 & Versements libératoires de l\'impôt',
      'Conversion Salaire Brut / Net & Coût global employeur avec charges patronales',
      'Frais de Notaire immobilier (Émoluments, droits d\'enregistrement & débours)',
      'Calcul des indemnités légales de rupture conventionnelle et licenciement'
    ]
  },
  de: {
    lang: 'de',
    locale: 'de-DE',
    currencySymbol: '€',
    title: 'Steuerrechner Deutschland 2026 | Brutto-Netto & Gewerbesteuer',
    h1: 'Steuerrechner & Brutto-Netto-Rechner Deutschland (Finanzamt 2026)',
    description: 'Präzise Steuerrechner für Deutschland nach aktuellen Vorgaben des Finanzamts und Bundesfinanzministeriums 2026. Brutto-Netto, Gewerbesteuer, Umsatzsteuer, Freiberufler-Einkommensteuer und Kurzarbeitergeld.',
    taxAuthority: 'Finanzamt & Bundesfinanzministerium (BMF)',
    authorityAbbr: 'Finanzamt / BMF',
    intro: 'Unsere Steuerrechner für Deutschland basieren auf den offiziellen Formeln des Bundesfinanzministeriums für das Steuerjahr 2026 inklusive Grundfreibetrag, Beitragsbemessungsgrenzen und Solidaritätszuschlag.',
    features: [
      'Brutto-Netto-Gehaltsrechner mit Kranken-, Renten- und Pflegeversicherung 2026',
      'Gewerbesteuer-Rechner mit Hebesätzen und § 35 EStG Anrechnung',
      'Umsatzsteuer 19% / 7% Vorsteuer und Ist-Versteuerung',
      'Einkommensteuer für Freiberufler & Kurzarbeitergeld (KUG 60%/67%)'
    ]
  },
  au: {
    lang: 'en',
    locale: 'en-AU',
    currencySymbol: 'A$',
    title: 'Australian Tax Calculators 2026 | ATO PAYG, HECS & Super Tools',
    h1: 'Australian Tax & Income Calculators (ATO 2026 Rules)',
    description: 'Free Australian tax calculators compliant with ATO 2026 individual income tax rates. Calculate PAYG withholding, HECS/HELP repayments, sole trader tax liability, superannuation, and stamp duty.',
    taxAuthority: 'Australian Taxation Office (ATO)',
    authorityAbbr: 'ATO',
    intro: 'Engineered specifically for the Australian 2026/27 financial year according to ATO guidelines, including Medicare Levy (2.0%), HECS/HELP compulsory repayment thresholds, and the 11.5% Superannuation Guarantee.',
    features: [
      'ATO 2026/27 Individual Tax Brackets & 2% Medicare Levy',
      'HECS/HELP Income-Based Compulsory Repayment Rates',
      'Sole Trader Business Net Tax & GST Accounting',
      'Superannuation Guarantee (11.5%) & State Stamp Duty Tiers'
    ]
  }
};
