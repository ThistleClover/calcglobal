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
    'RECOMMENDED_TOOLS': 'Outils recommandés',
    'GET_STARTED': 'Découvrir →',
    'FAQ_TITLE': 'Questions Fréquemment Posées',
    'DISCLAIMER_TEXT': 'Avertissement : Les résultats sont des estimations basées sur les règles fiscales standard pour l\'année fiscale 2026 et sont fournis à titre informatif uniquement. Votre situation individuelle (déductions, crédits, règles locales) peut affecter considérablement votre impôt réel. Consultez toujours un professionnel de la fiscalité qualifié.',
    'AFFILIATE_DISCLOSURE': 'Certains liens sont des liens d\'affiliation. Nous pouvons recevoir une commission sans aucun coût supplémentaire pour vous.',
    'ENTER_DETAILS': 'Entrez vos informations',
    'CALCULATE': 'Calculer',
    'CALCULATING': 'Calcul en cours...',
    'ENTER_DETAILS_CALCULATE': 'Entrez vos informations et cliquez sur Calculer',
    'ESTIMATED_NET': 'Revenu Net Estimé',
    'EFFECTIVE_RATE': 'Taux d\'imposition effectif :',
    'TAX_BREAKDOWN': 'Détail des Taxes',
    'QUARTERLY_PAYMENT': 'Paiement Trimestriel Estimé',
    'METHODOLOGY': 'Méthodologie de calcul',
    'QUARTERLY_DUE': 'Échéances: 15 Avr · 16 Juin · 15 Sep · 15 Jan',
    'TAKE_HOME': 'Net à Payer',
    'NET_INCOME': 'Revenu Net',
    'TOTAL_TAX': 'Total Taxes'
  },
  'de': {
    'RECOMMENDED_TOOLS': 'Empfohlene Tools',
    'GET_STARTED': 'Loslegen →',
    'FAQ_TITLE': 'Häufig Gestellte Fragen',
    'DISCLAIMER_TEXT': 'Haftungsausschluss: Die Ergebnisse sind Schätzungen basierend auf den Standardsteuervorschriften für das Steuerjahr 2026 und dienen nur zu Informationszwecken. Ihre individuelle Situation kann Ihre tatsächliche Steuerschuld erheblich beeinflussen. Konsultieren Sie immer einen qualifizierten Steuerberater.',
    'AFFILIATE_DISCLOSURE': 'Einige Links sind Affiliate-Partnerschaften. Wir erhalten möglicherweise eine Provision ohne zusätzliche Kosten für Sie.',
    'ENTER_DETAILS': 'Geben Sie Ihre Daten ein',
    'CALCULATE': 'Berechnen',
    'CALCULATING': 'Wird berechnet...',
    'ENTER_DETAILS_CALCULATE': 'Geben Sie Ihre Daten ein und klicken Sie auf Berechnen',
    'ESTIMATED_NET': 'Geschätztes Nettoeinkommen',
    'EFFECTIVE_RATE': 'Effektiver Steuersatz:',
    'TAX_BREAKDOWN': 'Steueraufschlüsselung',
    'QUARTERLY_PAYMENT': 'Geschätzte vierteljährliche Zahlung',
    'METHODOLOGY': 'Berechnungsmethode',
    'QUARTERLY_DUE': 'Fällig: 15. Apr · 16. Jun · 15. Sep · 15. Jan',
    'TAKE_HOME': 'Netto',
    'NET_INCOME': 'Nettoeinkommen',
    'TOTAL_TAX': 'Gesamtsteuer'
  },
  'en': {
    'RECOMMENDED_TOOLS': 'Recommended Tools',
    'GET_STARTED': 'Get Started →',
    'FAQ_TITLE': 'Frequently Asked Questions',
    'DISCLAIMER_TEXT': 'Disclaimer: Results are estimates based on standard tax rules for the 2026 tax year and are provided for informational purposes only. Individual circumstances (deductions, credits, specific state/local rules) may significantly affect your actual tax liability. Always consult a qualified tax professional or accountant for advice specific to your situation.',
    'AFFILIATE_DISCLOSURE': 'Some links are affiliate partnerships. We may earn a commission at no cost to you.',
    'ENTER_DETAILS': 'Enter Your Details',
    'CALCULATE': 'Calculate',
    'CALCULATING': 'Calculating...',
    'ENTER_DETAILS_CALCULATE': 'Enter your details and click Calculate',
    'ESTIMATED_NET': 'Estimated Net Income',
    'EFFECTIVE_RATE': 'Effective tax rate:',
    'TAX_BREAKDOWN': 'Tax Breakdown',
    'QUARTERLY_PAYMENT': 'Quarterly Estimated Payment',
    'METHODOLOGY': 'How this was calculated (Methodology)',
    'QUARTERLY_DUE': 'Due: Apr 15 · Jun 16 · Sep 15 · Jan 15',
    'TAKE_HOME': 'Take-Home',
    'NET_INCOME': 'Net Income',
    'TOTAL_TAX': 'Total Tax'
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
