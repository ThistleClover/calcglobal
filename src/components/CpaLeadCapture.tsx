import { useState, useEffect, useId } from 'react';

export interface CpaLeadCaptureProps {
  /** Title / headline for the lead capture form */
  title?: string;
  /** Subtitle / description text */
  subtitle?: string;
  /** Pre-filled state or country location */
  location?: string;
  /** Default selected business structure */
  defaultStructure?: string;
  /** Default estimated annual income */
  defaultRevenue?: string;
  /** Display variant: 'card' (inline form), 'banner' (compact CTA card), or 'modal' (button triggering modal) */
  variant?: 'card' | 'banner' | 'modal';
  /** Calculator ID for lead tracking context */
  calculatorId?: string;
  /** Custom button label */
  buttonText?: string;
  /** Callback after successful submission */
  onSubmitSuccess?: (leadData: any) => void;
  /** Optional theme override: 'light' | 'dark' */
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
  theme = 'light',
}: CpaLeadCaptureProps) {
  const [isOpen, setIsOpen] = useState(variant !== 'modal');
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
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

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
    setErrors(errs as any);
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
      location: userLocation.trim() || location,
      taxNeed: taxNeed.trim(),
      calculatorId,
    };

    const webhookUrl = "https://hook.eu1.make.com/scp48m1hrl9tz5hz925k2fhfbwd9xtlf";
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(leadData),
        });
      } catch (err) {
        console.error('Error sending lead data to webhook:', err);
      }
    }

    try {
      const existing = JSON.parse(localStorage.getItem('cpa_leads_v1') || '[]');
      localStorage.setItem('cpa_leads_v1', JSON.stringify([leadData, ...existing]));
    } catch (err) {
      console.warn('Could not save CPA lead to localStorage:', err);
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

  // Render Banner Variant CTA
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white border border-slate-700/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest">
                CPA Network
              </span>
              <span className="text-slate-400 text-xs font-semibold">2026 Tax Year Regulations</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl font-medium">{subtitle}</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="shrink-0 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>{buttonText}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white text-slate-900 shadow-2xl p-6 sm:p-8">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
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

  // Render Modal trigger button variant
  if (variant === 'modal') {
    return (
      <>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg border border-slate-700/80 active:scale-[0.98]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{title}</span>
          </button>
        )}

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white text-slate-900 shadow-2xl p-6 sm:p-8">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
      </>
    );
  }

  // Render Full Inline Card (Default)
  const bgCardClass = theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className={`rounded-3xl border ${bgCardClass} p-6 sm:p-8 md:p-10 shadow-lg relative overflow-hidden`}>
      {/* Decorative top border highlight */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500"></div>

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

// Helper Inner Form Component
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
      <div className="text-center py-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-200 shadow-sm">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 mb-3">
          Consultation Request Confirmed
        </span>

        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">You're All Set, {fullName.split(' ')[0]}!</h3>
        
        <p className="text-slate-600 text-sm max-w-md mx-auto mb-6 leading-relaxed">
          A verified CPA specializing in <strong>{BUSINESS_STRUCTURES.find(b => b.id === businessStructure)?.label}</strong> tax strategy in <strong>{userLocation}</strong> will review your details and contact you at <span className="text-slate-900 font-semibold">{email}</span> within 24 business hours.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto mb-6 text-left space-y-2 text-xs text-slate-700">
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Reference Code</span>
            <span className="font-mono font-bold text-slate-900">{refCode}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Target Response Time</span>
            <span className="font-semibold text-emerald-700">Within 24h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Services Included</span>
            <span className="font-semibold text-slate-900">S-Corp vs LLC Review, Write-offs</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {onClose ? (
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl text-xs transition-all border border-slate-300"
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
      {/* Header & Badges */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            CPA Verified
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            100% Confidential
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            2026 Fiscal Regulations
          </span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">{title}</h2>
        <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">{subtitle}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className={`w-full rounded-xl border ${errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'} bg-white py-3 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
            />
            {errors.fullName && <p className="text-xs text-red-600 mt-1 font-medium">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className={`w-full rounded-xl border ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-300'} bg-white py-3 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>}
          </div>
        </div>

        {/* Business Structure & Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Structure
            </label>
            <select
              value={businessStructure}
              onChange={e => setBusinessStructure(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            >
              {BUSINESS_STRUCTURES.map(bs => (
                <option key={bs.id} value={bs.id}>
                  {bs.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Est. Annual Income / Revenue
            </label>
            <select
              value={annualRevenue}
              onChange={e => setAnnualRevenue(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            >
              {REVENUE_RANGES.map(rr => (
                <option key={rr.id} value={rr.id}>
                  {rr.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* State / Country */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            State / Country
          </label>
          <input
            type="text"
            value={userLocation}
            onChange={e => setUserLocation(e.target.value)}
            placeholder="e.g. California, US or United Kingdom"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Tax Need / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Specific Tax Need / Questions (Optional)
          </label>
          <textarea
            rows={2}
            value={taxNeed}
            onChange={e => setTaxNeed(e.target.value)}
            placeholder="e.g. Need help evaluating S-Corp election, lowering 15.3% SE tax, or filing 2026 estimated quarterly taxes..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
          ></textarea>
        </div>

        {/* GDPR Consent Checkbox */}
        <div className="flex items-start gap-3 mt-4">
          <div className="flex items-center h-5">
            <input
              id={gdprId}
              type="checkbox"
              checked={gdprConsent}
              onChange={e => setGdprConsent(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <label htmlFor={gdprId} className="text-xs text-slate-600 leading-relaxed">
            I consent to sharing my information with verified CPA partners in accordance with the Privacy Policy. <span className="text-red-500">*</span>
          </label>
        </div>
        {errors.gdpr && <p className="text-xs text-red-600 font-medium mt-1">{errors.gdpr}</p>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-xl text-base transition-all shadow-lg shadow-blue-600/25 active:scale-[0.99] flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Matching with Verified CPA...</span>
            </>
          ) : (
            <>
              <span>Get Free CPA Advisory Match</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 text-center font-medium">
          🔒 No obligation. Your details are encrypted and only shared with vetted, licensed CPAs.
        </p>
      </form>
    </div>
  );
}
