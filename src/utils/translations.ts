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

export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  'fr': {
    'RECOMMENDED_TOOLS': 'Outils recommandés pour vous',
    'GET_STARTED': 'Découvrir →',
    'FAQ_TITLE': 'Questions Fréquemment Posées',
    'DISCLAIMER_TEXT': 'Avertissement : Les résultats sont des estimations basées sur les règles fiscales standard pour l\'année fiscale 2026 et sont fournis à titre informatif uniquement. Votre situation individuelle (déductions, crédits, règles locales) peut affecter considérablement votre impôt réel. Consultez toujours un professionnel de la fiscalité qualifié.'
  },
  'de': {
    'RECOMMENDED_TOOLS': 'Empfohlene Tools für Sie',
    'GET_STARTED': 'Loslegen →',
    'FAQ_TITLE': 'Häufig Gestellte Fragen',
    'DISCLAIMER_TEXT': 'Haftungsausschluss: Die Ergebnisse sind Schätzungen basierend auf den Standardsteuervorschriften für das Steuerjahr 2026 und dienen nur zu Informationszwecken. Ihre individuelle Situation kann Ihre tatsächliche Steuerschuld erheblich beeinflussen. Konsultieren Sie immer einen qualifizierten Steuerberater.'
  },
  'en': {
    'RECOMMENDED_TOOLS': 'Recommended Tools for You',
    'GET_STARTED': 'Get Started →',
    'FAQ_TITLE': 'Frequently Asked Questions',
    'DISCLAIMER_TEXT': 'Disclaimer: Results are estimates based on standard tax rules for the 2026 tax year and are provided for informational purposes only. Individual circumstances (deductions, credits, specific state/local rules) may significantly affect your actual tax liability. Always consult a qualified tax professional or accountant for advice specific to your situation.'
  }
};

export function getUITranslation(key: string, langCode: string): string {
  if (!key) return '';
  const baseLang = langCode.split('-')[0].toLowerCase();
  
  if (UI_TRANSLATIONS[baseLang] && UI_TRANSLATIONS[baseLang][key]) {
    return UI_TRANSLATIONS[baseLang][key];
  }
  
  if (UI_TRANSLATIONS['en'][key]) {
    return UI_TRANSLATIONS['en'][key];
  }
  
  return key;
}
