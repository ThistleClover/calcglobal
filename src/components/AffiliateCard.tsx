import React from 'react';
import {
  getAffiliateLogo,
  getAffiliateButtonText,
  getAffiliateContextualCopy,
  type AffiliatePartner,
  type AffiliateContext
} from '../utils/affiliate';

export interface AffiliateCardProps {
  partner: AffiliatePartner;
  netIncome?: number;
  grossIncome?: number;
  currencySymbol?: string;
  calculatorId?: string;
  category?: string;
  locale?: string;
  ctaText?: string;
  className?: string;
  country?: string;
  position?: string;
}

export default function AffiliateCard({
  partner,
  netIncome,
  grossIncome,
  currencySymbol = '$',
  calculatorId,
  category,
  locale = 'en-US',
  ctaText,
  className = '',
  country,
  position = 'results_panel',
}: AffiliateCardProps) {
  const logoIcon = getAffiliateLogo(partner);
  const buttonText = getAffiliateButtonText(partner, ctaText);
  const targetUrl = partner.url || '#';

  const context: AffiliateContext = { netIncome, grossIncome, currencySymbol, calculatorId, category, locale };
  const contextualHeadline = getAffiliateContextualCopy(partner, context);
  const showContextual = (netIncome !== undefined && netIncome > 0) || (grossIncome !== undefined && grossIncome > 0);

  const handleCtaClick = () => {
    const partnerName = partner.name || '';
    const calcId = calculatorId || '';
    const resolvedCountry = (country || (partner as any).country || (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '') || 'US').toUpperCase();
    const ctaUrl = targetUrl;
    const cardPosition = position || 'results_panel';

    const payload = {
      event_name: 'affiliate_card_click',
      partner_name: partnerName,
      calculator_id: calcId,
      country: resolvedCountry,
      cta_url: ctaUrl,
      position: cardPosition,
    };

    try {
      if (typeof window !== 'undefined') {
        if (typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'affiliate_card_click', payload);
        }
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'affiliate_card_click',
          ...payload,
        });
      }
    } catch (err) {
      console.error('GA4 affiliate_card_click tracking error:', err);
    }
  };

  return (
    <div className={`group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between h-full ${className}`}>
      <div>
        {/* Top Row: Logo & Sponsored Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
            {logoIcon}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60">
            Sponsored
          </span>
        </div>

        {/* Partner Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 mb-1 transition-colors">
          {partner.name}
        </h3>

        {/* Contextual Copy / Description */}
        {showContextual ? (
          <div className="mb-4">
            <p className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50/80 p-2.5 rounded-lg border border-blue-100/80 leading-snug mb-2">
              {contextualHeadline}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {partner.description}
            </p>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            {partner.description}
          </p>
        )}
      </div>

      {/* CTA Button */}
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleCtaClick}
        className="inline-flex items-center justify-center w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors gap-1.5 mt-2"
      >
        <span>{buttonText}</span>
        <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
      </a>
    </div>
  );
}
