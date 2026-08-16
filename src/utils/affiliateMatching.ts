export interface AffiliatePartner {
  id?: string;
  name: string;
  type?: string;
  description: string;
  url?: string;
  logo?: string;
  cta?: string;
}

export interface MatchingOptions {
  calcId?: string;
  countryCode?: string;
  category?: string;
  title?: string;
  description?: string;
  netIncome?: number;
  grossIncome?: number;
  affiliateTargets?: AffiliatePartner[];
  lang?: string;
}

export const CTA_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    try_free: 'Essai Gratuit',
    discover: 'Découvrir',
    explore: 'Découvrir',
    get_started: 'Commencer',
  },
  en: {
    try_free: 'Free Trial',
    discover: 'Explore',
    explore: 'Explore',
    get_started: 'Get Started',
  },
  de: {
    try_free: 'Kostenlos testen',
    discover: 'Entdecken',
    explore: 'Sage entdecken',
    get_started: 'Jetzt starten',
  },
  es: {
    try_free: 'Prueba Gratis',
    discover: 'Descubrir',
    explore: 'Descubrir',
    get_started: 'Empezar',
  },
  it: {
    try_free: 'Prova Gratuita',
    discover: 'Scopri di più',
    explore: 'Scopri di più',
    get_started: 'Inizia ora',
  },
  pt: {
    try_free: 'Teste Grátis',
    discover: 'Conhecer',
    explore: 'Conhecer',
    get_started: 'Começar',
  },
  ja: {
    try_free: '無料体験',
    discover: '詳しく見る',
    explore: '詳しく見る',
    get_started: '始める',
  },
};

export const PARTNER_I18N: Record<string, Record<string, { cta: string; description: string }>> = {
  fr: {
    sage: {
      cta: 'Découvrir',
      description: 'Logiciel de comptabilité et de facturation leader pour entreprises et indépendants.',
    },
    shopify: {
      cta: 'Essai Gratuit',
      description: 'La plateforme de commerce tout-en-un pour lancer et gérer votre entreprise partout dans le monde.',
    },
  },
  en: {
    sage: {
      cta: 'Explore Sage',
      description: 'Market-leading accounting and invoicing software for businesses and entrepreneurs.',
    },
    shopify: {
      cta: 'Free Trial',
      description: 'The all-in-one commerce platform to start, run, and grow your business worldwide.',
    },
  },
  de: {
    sage: {
      cta: 'Sage entdecken',
      description: 'Marktführende Buchhaltungs- und ERP-Software für Unternehmen.',
    },
    shopify: {
      cta: 'Kostenlos testen',
      description: 'Die All-in-One-Commerce-Plattform zum Starten, Führen und Skalieren Ihres Online-Geschäfts.',
    },
  },
  es: {
    sage: {
      cta: 'Descubrir Sage',
      description: 'Software líder de contabilidad y gestión para empresas y autónomos.',
    },
    shopify: {
      cta: 'Prueba Gratis',
      description: 'La plataforma de comercio todo en uno para crear, gestionar y hacer crecer tu negocio.',
    },
  },
  it: {
    sage: {
      cta: 'Scopri Sage',
      description: 'Software leader di contabilità e fatturazione per aziende e professionisti.',
    },
    shopify: {
      cta: 'Prova Gratuita',
      description: 'La plateforme de commerce all-in-one per avviare e gestire la tua attività ovunque.',
    },
  },
  pt: {
    sage: {
      cta: 'Conhecer Sage',
      description: 'Software líder em contabilidade e faturamento para empresas e autônomos.',
    },
    shopify: {
      cta: 'Teste Grátis',
      description: 'A plataforma de comércio completa para criar, administrar e expandir seus negócios.',
    },
  },
  ja: {
    sage: {
      cta: 'Sageを詳しく見る',
      description: '企業および個人事業主向けの大手会計・請求管理ソフトウェア。',
    },
    shopify: {
      cta: '無料体験',
      description: '世界中でビジネスを立ち上げ、運営、成長させるためのオールインワンのコマースプラットフォーム。',
    },
  },
};

export function isForbiddenCategory(
  calcId: string = '',
  category: string = '',
  title: string = '',
  description: string = ''
): boolean {
  // Even if forbidden, the user explicitly requested to show these two links EVERYWHERE
  // until new ones are provided. So we bypass the forbidden check for now.
  return false; 
}

export function isFintechPartner(partner: AffiliatePartner): boolean {
  return true;
}

export function isPartnerAllowedForCalc(
  partner: AffiliatePartner,
  options: MatchingOptions
): boolean {
  // User explicitly requested to show the links they have EVERYWHERE.
  return true;
}

export const GLOBAL_PARTNERS: AffiliatePartner[] = [
  {
    id: 'sage',
    name: 'Sage',
    type: 'software',
    url: 'https://sagegmbh.sjv.io/YVKbYR',
    description: 'Market-leading accounting and invoicing software for businesses and entrepreneurs.',
    logo: '💻',
    cta: 'Explore Sage',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    type: 'ecommerce',
    url: 'https://shopify.pxf.io/QYEAXA',
    description: 'The all-in-one commerce platform to start, run, and grow your business worldwide.',
    logo: '🛒',
    cta: 'Free Trial',
  }
];

export function getAffiliateRedirectUrl(partnerId: string): string {
  return `/go/${partnerId}`;
}

export function resolveLanguage(options?: MatchingOptions): string {
  if (options?.lang) {
    return options.lang.toLowerCase().slice(0, 2);
  }
  if (options?.countryCode) {
    const c = options.countryCode.toLowerCase();
    if (c === 'fr') return 'fr';
    if (c === 'de') return 'de';
    if (c === 'es') return 'es';
    if (c === 'it') return 'it';
    if (c === 'pt' || c === 'br') return 'pt';
    if (c === 'jp' || c === 'ja') return 'ja';
  }
  return 'en';
}

export function getAffiliatePartners(options: MatchingOptions = {}): AffiliatePartner[] {
  const lang = resolveLanguage(options);
  const localized = PARTNER_I18N[lang] || PARTNER_I18N.en;

  // Per user request, ONLY return the two links we actually have, everywhere, with /go/ router URLs.
  return GLOBAL_PARTNERS.map(partner => {
    const partnerId = partner.id || partner.name.toLowerCase();
    const partnerText = localized[partnerId];
    return {
      ...partner,
      description: partnerText?.description || partner.description,
      cta: partnerText?.cta || partner.cta,
      url: getAffiliateRedirectUrl(partnerId),
    };
  });
}
