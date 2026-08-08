export const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  'fr': {
    'BUSINESS': 'Entreprise & Indépendants',
    'EMPLOYMENT': 'Salariat & RH',
    'REAL_ESTATE': 'Immobilier',
    'LEGAL': 'Juridique',
    'FINANCE': 'Finance & Investissement',
    'TAX': 'Impôts & Taxes',
    'VEHICLE': 'Véhicules & Mobilité'
  },
  'de': {
    'BUSINESS': 'Unternehmen & Selbstständige',
    'EMPLOYMENT': 'Beschäftigung & HR',
    'REAL_ESTATE': 'Immobilien',
    'LEGAL': 'Recht & Legal',
    'FINANCE': 'Finanzen & Investitionen',
    'TAX': 'Steuern',
    'VEHICLE': 'Fahrzeuge & Mobilität'
  },
  'en': {
    'BUSINESS': 'Business & Self-Employed',
    'EMPLOYMENT': 'Employment & HR',
    'REAL_ESTATE': 'Real Estate',
    'LEGAL': 'Legal',
    'FINANCE': 'Finance & Investment',
    'TAX': 'Taxes',
    'VEHICLE': 'Vehicles'
  }
};

export function getTranslatedCategory(categoryKey: string, langCode: string): string {
  if (!categoryKey) return '';
  const baseLang = langCode.split('-')[0].toLowerCase();
  
  if (CATEGORY_TRANSLATIONS[baseLang] && CATEGORY_TRANSLATIONS[baseLang][categoryKey]) {
    return CATEGORY_TRANSLATIONS[baseLang][categoryKey];
  }
  
  if (CATEGORY_TRANSLATIONS['en'][categoryKey]) {
    return CATEGORY_TRANSLATIONS['en'][categoryKey];
  }
  
  return categoryKey.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
