import React from 'react';
import {
  getAffiliateLogo,
  getAffiliateButtonText,
  getAffiliateContextualCopy,
  type AffiliatePartner,
  type AffiliateContext
} from '../utils/affiliate';
import { trackAffiliateClick, getIncomeTier } from '../utils/analytics';

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
    const incomeTier = getIncomeTier(grossIncome || netIncome);

    trackAffiliateClick({
      partner_name: partnerName,
      partner_url: ctaUrl,
      calculator_id: calcId,
      income_tier: incomeTier,
      country_code: resolvedCountry,
      position: cardPosition,
    });
  };

  return (
    <div className={`group relative bg-[#FDFCF9] dark:bg-[#1A1816] rounded-xl border border-[#E7E2D7] dark:border-[#2A2622] p-3.5 shadow-xs hover:border-[#78716C] dark:hover:border-[#A8A29E] transition-all duration-200 flex flex-col justify-between h-full ${className}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] flex items-center justify-center text-base shadow-xs group-hover:scale-105 transition-transform">
            {logoIcon}
          </div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#78716C] bg-[#F0EEE8] dark:bg-[#252220] px-1.5 py-0.5 rounded border border-[#E7E2D7] dark:border-[#2A2622]">
            Sponsored
          </span>
        </div>

        <h3 className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] mb-1 transition-colors">
          {partner.name}
        </h3>

        {showContextual ? (
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-[#006948] dark:text-[#6EE7B7] bg-[#006948]/10 p-1.5 rounded-lg leading-snug mb-1">
              {contextualHeadline}
            </p>
            <p className="text-[11px] text-[#78716C] leading-relaxed line-clamp-2">
              {partner.description}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-[#78716C] leading-relaxed mb-2">
            {partner.description}
          </p>
        )}
      </div>

      <a
        href={targetUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={handleCtaClick}
        className="inline-flex items-center justify-center w-full rounded-lg bg-[#006948] hover:bg-[#005137] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-colors gap-1 mt-1 cursor-pointer"
      >
        <span>{buttonText}</span>
        <span>→</span>
      </a>
    </div>
  );
}
