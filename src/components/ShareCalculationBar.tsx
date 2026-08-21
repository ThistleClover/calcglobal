import React, { useState, useCallback } from 'react';
import { trackShareCalculation } from '../utils/analytics';
import { getUITranslation } from '../utils/translations';

export interface ShareCalculationBarProps {
  calculatorId: string;
  countryCode: string;
  title: string;
  values: Record<string, string>;
  locale?: string;
  netIncome?: number;
  currencySymbol?: string;
  className?: string;
}

export default function ShareCalculationBar({
  calculatorId,
  countryCode,
  title,
  values,
  locale = 'en',
  netIncome,
  currencySymbol = '$',
  className = '',
}: ShareCalculationBarProps) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      // Clean previous calculation params and set current ones
      const searchParams = new URLSearchParams();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && k !== 'calculator_id') {
          searchParams.set(k, String(v));
        }
      });
      url.search = searchParams.toString();
      return url.toString();
    } catch {
      return typeof window !== 'undefined' ? window.location.href : '';
    }
  }, [values]);

  const getShareText = useCallback(() => {
    if (netIncome !== undefined && netIncome > 0) {
      const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(netIncome);
      return `${title}: Estimated Net ${currencySymbol}${formatted} | CalcGlobal`;
    }
    return `${title} - Statutory Tax & Finance Calculator | CalcGlobal`;
  }, [title, netIncome, currencySymbol, locale]);

  const handleCopy = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      trackShareCalculation({
        calculator_id: calculatorId,
        country_code: countryCode,
        share_type: 'copy_link',
      });
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const handleNativeShare = async () => {
    const url = getShareUrl();
    const text = getShareText();

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          text,
          url,
        });
        trackShareCalculation({
          calculator_id: calculatorId,
          country_code: countryCode,
          share_type: 'native',
        });
      } catch {
        // User dismissed share dialog
      }
    } else {
      handleCopy();
    }
  };

  const handleSocialClick = (platform: 'whatsapp' | 'twitter' | 'linkedin') => {
    const url = getShareUrl();
    const text = getShareText();
    let target = '';

    if (platform === 'whatsapp') {
      target = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
    } else if (platform === 'twitter') {
      target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'linkedin') {
      target = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    }

    trackShareCalculation({
      calculator_id: calculatorId,
      country_code: countryCode,
      share_type: platform,
    });

    if (typeof window !== 'undefined') {
      window.open(target, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && Boolean((navigator as any).share);

  return (
    <div className={`p-3 sm:p-3.5 rounded-xl bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Label & Status */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#006948]/10 text-[#006948] dark:text-[#6EE7B7] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] leading-none">
              {getUITranslation('SHARE_CALCULATION', locale)}
            </p>
            <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E] mt-0.5">
              {copied ? (
                <span className="text-[#006948] dark:text-[#6EE7B7] font-semibold flex items-center gap-1 animate-pulse">
                  ✓ {getUITranslation('LINK_COPIED', locale)}
                </span>
              ) : (
                'Save & share this specific calculation state'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto">
          
          {/* Copy Link Main Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              copied
                ? 'bg-[#006948] text-white'
                : 'bg-[#FDFCF9] dark:bg-[#1A1816] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2A2622] hover:border-[#006948] dark:hover:border-[#6EE7B7]'
            }`}
            title={getUITranslation('COPY_LINK', locale)}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{getUITranslation('LINK_COPIED', locale)}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-[#78716C] dark:text-[#A8A29E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>{getUITranslation('COPY_LINK', locale)}</span>
              </>
            )}
          </button>

          {/* Native Web Share Button (Mobile) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="p-1.5 rounded-lg bg-[#FDFCF9] dark:bg-[#1A1816] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2A2622] hover:bg-[#F0EEE8] dark:hover:bg-[#252220] transition-colors cursor-pointer"
              title="Share via device"
              aria-label="Share via device"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          )}

          {/* WhatsApp Direct Share */}
          <button
            type="button"
            onClick={() => handleSocialClick('whatsapp')}
            className="p-1.5 rounded-lg bg-[#FDFCF9] dark:bg-[#1A1816] text-[#25D366] border border-[#E7E2D7] dark:border-[#2A2622] hover:bg-[#25D366]/10 transition-colors cursor-pointer"
            title="Share on WhatsApp"
            aria-label="Share on WhatsApp"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.121-.529-1.558-.646-2.583-2.227-2.66-2.33-.078-.103-.635-.845-.635-1.611 0-.766.401-1.144.543-1.3.143-.156.312-.195.416-.195.104 0 .208.002.299.006.095.004.223-.036.349.267.13.312.442 1.077.481 1.155.039.078.065.169.013.273-.052.104-.078.169-.156.26-.078.091-.164.204-.234.273-.078.078-.159.162-.068.318.091.156.405.669.869 1.082.597.532 1.101.697 1.257.775.156.078.247.065.338-.039.091-.104.39-.455.494-.611.104-.156.208-.13.351-.078.143.052.909.429 1.065.507.156.078.26.117.299.182.039.065.039.377-.105.782z"/>
            </svg>
          </button>

          {/* Twitter / X Direct Share */}
          <button
            type="button"
            onClick={() => handleSocialClick('twitter')}
            className="p-1.5 rounded-lg bg-[#FDFCF9] dark:bg-[#1A1816] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2A2622] hover:bg-[#F0EEE8] dark:hover:bg-[#252220] transition-colors cursor-pointer"
            title="Share on X"
            aria-label="Share on X"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>

          {/* LinkedIn Direct Share */}
          <button
            type="button"
            onClick={() => handleSocialClick('linkedin')}
            className="p-1.5 rounded-lg bg-[#FDFCF9] dark:bg-[#1A1816] text-[#0A66C2] border border-[#E7E2D7] dark:border-[#2A2622] hover:bg-[#0A66C2]/10 transition-colors cursor-pointer"
            title="Share on LinkedIn"
            aria-label="Share on LinkedIn"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.66 1.66 0 0 0-1.67 1.66 1.67 1.67 0 0 0 1.67 1.67 1.67 1.67 0 0 0 1.67-1.67c0-.92-.75-1.66-1.67-1.66z"/>
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
}
