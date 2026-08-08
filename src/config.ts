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

export const COUNTRY_METADATA: Record<string, { lang: string; locale: string; currencySymbol: string }> = {
  us: { lang: 'en', locale: 'en-US', currencySymbol: '$' },
  uk: { lang: 'en', locale: 'en-GB', currencySymbol: '£' },
  fr: { lang: 'fr', locale: 'fr-FR', currencySymbol: '€' },
  de: { lang: 'de', locale: 'de-DE', currencySymbol: '€' },
  au: { lang: 'en', locale: 'en-AU', currencySymbol: 'A$' },
};
