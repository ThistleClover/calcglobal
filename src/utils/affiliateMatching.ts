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
}

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
    description: 'Marktführende Buchhaltungs- und ERP-Software für Unternehmen. (Leading accounting software)',
    logo: '💻',
    cta: 'Découvrir',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    type: 'ecommerce',
    url: 'https://shopify.pxf.io/QYEAXA',
    description: 'La plateforme de commerce tout-en-un pour lancer et gérer votre entreprise partout dans le monde.',
    logo: '🛒',
    cta: 'Essai Gratuit',
  }
];

export function getAffiliateRedirectUrl(partnerId: string): string {
  return `/go/${partnerId}`;
}

export function getAffiliatePartners(options: MatchingOptions): AffiliatePartner[] {
  // Per user request, ONLY return the two links we actually have, everywhere, with /go/ router URLs.
  return GLOBAL_PARTNERS.map(partner => {
    const partnerId = partner.id || partner.name.toLowerCase();
    return {
      ...partner,
      url: getAffiliateRedirectUrl(partnerId),
    };
  });
}
