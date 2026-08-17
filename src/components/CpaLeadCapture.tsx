import { useState, useEffect, useId } from 'react';

export interface CpaLeadCaptureProps {
  title?: string;
  subtitle?: string;
  location?: string;
  defaultStructure?: string;
  defaultRevenue?: string;
  variant?: 'card' | 'banner' | 'modal';
  calculatorId?: string;
  buttonText?: string;
  onSubmitSuccess?: (leadData: any) => void;
  theme?: 'light' | 'dark';
}

const BUSINESS_STRUCTURES = [
  { id: 'freelancer', label: 'Freelancer / 1099 Contractor' },
  { id: 'llc_single', label: 'Single-Member LLC' },
  { id: 'scorp', label: 'S-Corporation (S-Corp)' },
  { id: 'ccorp', label: 'C-Corporation' },
  { id: 'partnership', label: 'Partnership / Multi-Member' },
];

const REVENUE_RANGES = [
  { id: 'under_50k', label: 'Under $50k' },
  { id: '50k_100k', label: '$50k – $100k' },
  { id: '100k_250k', label: '$100k – $250k' },
  { id: '250k_plus', label: '$250k+' },
];

export default function CpaLeadCapture({
  title = 'Consult a Verified CPA / Accountant',
  subtitle = 'Get expert 2026 tax strategy, S-Corp election analysis, and Schedule C deduction optimization from licensed CPAs.',
  location = 'United States',
  defaultStructure = 'freelancer',
  defaultRevenue = '100k_250k',
  variant = 'card',
  calculatorId = 'general',
  buttonText = 'Request Free Consultation',
  onSubmitSuccess,
}: CpaLeadCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [businessStructure, setBusinessStructure] = useState(defaultStructure);
  const [annualRevenue, setAnnualRevenue] = useState(defaultRevenue);
  const [userLocation, setUserLocation] = useState(location);
  const [taxNeed, setTaxNeed] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; gdpr?: string }>({});

  useEffect(() => {
    if (location && !userLocation) {
      setUserLocation(location);
    }
  }, [location]);

  const validate = () => {
    const errs: { fullName?: string; email?: string; gdpr?: string } = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!gdprConsent) {
      errs.gdpr = 'You must consent to data sharing to proceed.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const generatedRef = 'CPA-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const leadData = {
      id: generatedRef,
      timestamp: new Date().toISOString(),
      fullName: fullName.trim(),
      email: email.trim(),
      businessStructure,
      annualRevenue,
      location: userLocation,
      taxNeed: taxNeed.trim(),
      calculatorId,
      gdprConsent,
    };

    try {
      const storedLeads = JSON.parse(localStorage.getItem('calcglobal_cpa_leads') || '[]');
      storedLeads.push(leadData);
      localStorage.setItem('calcglobal_cpa_leads', JSON.stringify(storedLeads));
    } catch (err) {
      console.warn('Could not store lead to localStorage', err);
    }

    try {
      if (typeof window !== 'undefined') {
        if (typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'cpa_lead_submission', {
            calculator_id: calculatorId,
            structure: businessStructure,
            revenue: annualRevenue,
            location: userLocation,
          });
        }
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'cpa_lead_submission',
          calculatorId,
          businessStructure,
          annualRevenue,
          location: userLocation,
        });
      }
    } catch (err) {
      console.error('GA4 lead submission event tracking error:', err);
    }

    setLoading(false);
    setSubmitted(true);
    setRefCode(generatedRef);
    if (onSubmitSuccess) {
      onSubmitSuccess(leadData);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFullName('');
    setEmail('');
    setTaxNeed('');
    setGdprConsent(false);
    setErrors({});
  };

  // Banner Variant
  if (variant === 'banner') {
    return (
      <div className="bg-[#FDFCF9] dark:bg-[#141210] rounded-2xl p-5 border border-[#E7E2D7] dark:border-[#2C2724] shadow-ambient flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006948]/10 text-[#006948] dark:text-[#85f8c4] border border-[#006948]/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="bg-[#006948]/10 text-[#006948] dark:text-[#85f8c4] text-[9px] font-bold px-2 py-0.5 rounded border border-[#006948]/20 uppercase tracking-widest">
                CPA Network
              </span>
              <span className="text-[#78716C] dark:text-[#A8A29E] text-[11px] font-medium">2026/27 Tax Regulations</span>
            </div>
            <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F2EB] tracking-tight">{title}</h3>
            <p className="text-[#78716C] dark:text-[#A8A29E] text-xs mt-0.5 max-w-lg leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="shrink-0 w-full sm:w-auto bg-[#006948] hover:bg-[#005137] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>{buttonText}</span>
          <span>→</span>
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FDFCF9] dark:bg-[#1C1916] text-[#1C1917] dark:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2C2724] shadow-2xl p-6 sm:p-8 animate-scale-in">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-[#78716C] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] p-1.5 rounded-lg hover:bg-[#F0EEE8] dark:hover:bg-[#2C2724] transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
              <CpaFormContent
                title={title}
                subtitle={subtitle}
                userLocation={userLocation}
                setUserLocation={setUserLocation}
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                businessStructure={businessStructure}
                setBusinessStructure={setBusinessStructure}
                annualRevenue={annualRevenue}
                setAnnualRevenue={setAnnualRevenue}
                taxNeed={taxNeed}
                setTaxNeed={setTaxNeed}
                gdprConsent={gdprConsent}
                setGdprConsent={setGdprConsent}
                loading={loading}
                submitted={submitted}
                refCode={refCode}
                errors={errors}
                handleSubmit={handleSubmit}
                handleReset={handleReset}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Inline Card (Default)
  return (
    <div className="rounded-2xl border border-[#E7E2D7] dark:border-[#2C2724] bg-[#FDFCF9] dark:bg-[#1C1916] p-6 sm:p-8 shadow-ambient relative overflow-hidden">
      <CpaFormContent
        title={title}
        subtitle={subtitle}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
        fullName={fullName}
        setFullName={setFullName}
        email={email}
        setEmail={setEmail}
        businessStructure={businessStructure}
        setBusinessStructure={setBusinessStructure}
        annualRevenue={annualRevenue}
        setAnnualRevenue={setAnnualRevenue}
        taxNeed={taxNeed}
        setTaxNeed={setTaxNeed}
        gdprConsent={gdprConsent}
        setGdprConsent={setGdprConsent}
        loading={loading}
        submitted={submitted}
        refCode={refCode}
        errors={errors}
        handleSubmit={handleSubmit}
        handleReset={handleReset}
      />
    </div>
  );
}

// Inner Form Content
function CpaFormContent({
  title,
  subtitle,
  userLocation,
  setUserLocation,
  fullName,
  setFullName,
  email,
  setEmail,
  businessStructure,
  setBusinessStructure,
  annualRevenue,
  setAnnualRevenue,
  taxNeed,
  setTaxNeed,
  gdprConsent,
  setGdprConsent,
  loading,
  submitted,
  refCode,
  errors,
  handleSubmit,
  handleReset,
  onClose,
}: any) {
  const gdprId = useId();

  if (submitted) {
    return (
      <div className="text-center py-4 animate-fade-in">
        <div className="w-12 h-12 bg-[#006948]/10 text-[#006948] dark:text-[#85f8c4] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#006948]/20">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span className="inline-block px-2.5 py-0.5 bg-[#006948]/10 text-[#006948] dark:text-[#85f8c4] text-[10px] font-bold rounded-full border border-[#006948]/20 mb-2">
          Consultation Request Confirmed
        </span>

        <h3 className="text-lg font-bold text-[#1C1917] dark:text-[#F5F2EB] mb-1">
          You're All Set, {fullName.split(' ')[0]}!
        </h3>
        
        <p className="text-[#78716C] dark:text-[#A8A29E] text-xs max-w-sm mx-auto mb-4 leading-relaxed">
          A verified CPA specializing in <strong>{BUSINESS_STRUCTURES.find(b => b.id === businessStructure)?.label}</strong> in <strong>{userLocation}</strong> will reach out to <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EB]">{email}</span> within 24h.
        </p>

        <div className="bg-[#F8F6F0] dark:bg-[#141210] border border-[#E7E2D7] dark:border-[#2C2724] rounded-xl p-3 max-w-sm mx-auto mb-5 text-left text-xs space-y-1.5">
          <div className="flex justify-between border-b border-[#E7E2D7] dark:border-[#2C2724] pb-1">
            <span className="text-[#78716C]">Reference Code</span>
            <span className="font-mono font-bold text-[#1C1917] dark:text-[#F5F2EB]">{refCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#78716C]">Target SLA</span>
            <span className="font-semibold text-[#006948] dark:text-[#85f8c4]">Within 24 Business Hours</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {onClose ? (
            <button
              onClick={onClose}
              className="bg-[#006948] hover:bg-[#005137] text-white font-semibold py-2 px-5 rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="bg-[#F0EEE8] dark:bg-[#2C2724] text-[#1C1917] dark:text-[#F5F2EB] font-semibold py-2 px-4 rounded-xl text-xs transition-colors border border-[#E7E2D7] dark:border-[#2C2724]"
            >
              Submit Another Request
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#006948]/10 text-[#006948] dark:text-[#85f8c4] text-[10px] font-bold rounded-full border border-[#006948]/20">
            ✓ CPA Verified
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F0EEE8] dark:bg-[#2C2724] text-[#1C1917] dark:text-[#F5F2EB] text-[10px] font-semibold rounded-full border border-[#E7E2D7] dark:border-[#2C2724]">
            🔒 100% Confidential
          </span>
        </div>

        <h2 className="text-xl font-bold text-[#1C1917] dark:text-[#F5F2EB] tracking-tight">{title}</h2>
        <p className="text-[#78716C] dark:text-[#A8A29E] text-xs mt-1 leading-relaxed">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              className={`w-full rounded-xl border ${errors.fullName ? 'border-red-400 bg-red-50/20' : 'border-[#E7E2D7] dark:border-[#2C2724]'} bg-[#FDFCF9] dark:bg-[#1C1916] py-2 px-3 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948] focus:border-[#006948] transition-all`}
            />
            {errors.fullName && <p className="text-[10px] text-red-500 mt-0.5">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">
              Work Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className={`w-full rounded-xl border ${errors.email ? 'border-red-400 bg-red-50/20' : 'border-[#E7E2D7] dark:border-[#2C2724]'} bg-[#FDFCF9] dark:bg-[#1C1916] py-2 px-3 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948] focus:border-[#006948] transition-all`}
            />
            {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">Structure</label>
            <select
              value={businessStructure}
              onChange={e => setBusinessStructure(e.target.value)}
              className="w-full rounded-xl border border-[#E7E2D7] dark:border-[#2C2724] bg-[#FDFCF9] dark:bg-[#1C1916] py-2 px-2.5 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948]"
            >
              {BUSINESS_STRUCTURES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">Annual Revenue</label>
            <select
              value={annualRevenue}
              onChange={e => setAnnualRevenue(e.target.value)}
              className="w-full rounded-xl border border-[#E7E2D7] dark:border-[#2C2724] bg-[#FDFCF9] dark:bg-[#1C1916] py-2 px-2.5 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948]"
            >
              {REVENUE_RANGES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">Location / State</label>
            <input
              type="text"
              value={userLocation}
              onChange={e => setUserLocation(e.target.value)}
              placeholder="e.g. California, USA"
              className="w-full rounded-xl border border-[#E7E2D7] dark:border-[#2C2724] bg-[#FDFCF9] dark:bg-[#1C1916] py-2 px-2.5 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">Tax Goal / Specific Questions (Optional)</label>
          <textarea
            value={taxNeed}
            onChange={e => setTaxNeed(e.target.value)}
            rows={2}
            placeholder="e.g. Evaluating S-Corp election, reducing self-employment tax, cross-border W8-BEN..."
            className="w-full rounded-xl border border-[#E7E2D7] dark:border-[#2C2724] bg-[#FDFCF9] dark:bg-[#1C1916] py-2 px-3 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948]"
          />
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            id={gdprId}
            type="checkbox"
            checked={gdprConsent}
            onChange={e => setGdprConsent(e.target.checked)}
            className="mt-0.5 rounded border-[#E7E2D7] text-[#006948] focus:ring-[#006948]"
          />
          <label htmlFor={gdprId} className="text-[11px] text-[#78716C] dark:text-[#A8A29E] leading-tight">
            I agree to share these details with a certified CPA for a free evaluation.
          </label>
        </div>
        {errors.gdpr && <p className="text-[10px] text-red-500">{errors.gdpr}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#006948] hover:bg-[#005137] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? 'Submitting...' : 'Request Free CPA Consultation →'}
        </button>
      </form>
    </div>
  );
}
