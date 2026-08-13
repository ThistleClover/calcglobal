import { useState, useCallback } from 'react';
import type { TaxInput, TaxResult, TaxBreakdownLine } from '../lib/engine/types';
import { getUITranslation } from '../utils/translations';
import { getAffiliatePartners } from '../utils/affiliateMatching';
import AffiliateCard from './AffiliateCard';
import CpaLeadCapture from './CpaLeadCapture';

interface CalcInput {
  name: string;
  label_native: string;
  type: string;
  options?: { value: string; label: string }[];
}

interface Props {
  calc: {
    id: string;
    title_native: string;
    description_native: string;
    inputs: CalcInput[];
    formula_explanation: string;
    currency?: string;
    currencySymbol?: string;
    category?: string;
    affiliate_targets?: any[];
  };
  /** Serialized calculate function — passed as a string from build-time Astro */
  engineCode: string;
  locale: string;
  currencySymbol: string;
  countryCode?: string;
}

function formatNum(value: number, locale: string): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function DonutChart({ netPct, taxPct, locale }: { netPct: number; taxPct: number; locale: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const netDash = (netPct / 100) * circ;
  const taxDash = (taxPct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative drop-shadow-sm">
        <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#f8fafc" strokeWidth="16" />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#f87171" strokeWidth="16"
            strokeDasharray={`${taxDash} ${circ - taxDash}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#34d399" strokeWidth="16"
            strokeDasharray={`${netDash} ${circ - netDash}`}
            strokeDashoffset={-taxDash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">
            {Math.round(netPct)}%
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            {getUITranslation('TAKE_HOME', locale)}
          </span>
        </div>
      </div>
      <div className="flex gap-4 text-xs font-semibold text-slate-600 bg-white/60 px-4 py-1.5 rounded-full border border-slate-200/60 shadow-sm backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          {getUITranslation('NET_INCOME', locale)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
          {getUITranslation('TOTAL_TAX', locale)}
        </span>
      </div>
    </div>
  );
}

function BreakdownTable({ lines, sym, locale }: { lines: TaxBreakdownLine[]; sym: string; locale: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      <div className="divide-y divide-slate-100">
        {lines.map((line, i) => {
          const bgClass = line.isFinal 
            ? 'bg-slate-50 font-bold border-t-2 border-slate-200' 
            : line.isTotal 
              ? 'bg-white font-semibold' 
              : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
              
          const textClass = line.isFinal 
            ? 'text-slate-900' 
            : line.isTotal 
              ? 'text-slate-800' 
              : 'text-slate-600';

          const valueClass = line.isDeduction 
            ? 'text-red-600 font-medium' 
            : line.isFinal 
              ? 'text-emerald-700 font-bold' 
              : line.isTotal 
                ? 'text-slate-900 font-semibold' 
                : 'text-slate-700';

          return (
            <div key={i} className={`flex items-center justify-between py-3 px-4 transition-colors hover:bg-slate-50 ${bgClass}`}>
              <span className={`text-sm ${textClass}`}>{line.label}</span>
              <span className={`text-sm tabular-nums tracking-tight ${valueClass}`}>
                {line.isDeduction ? '−' : ''}{sym}{formatNum(Math.abs(line.value), locale)}
                {line.percentage !== undefined ? (
                  <span className="text-slate-400 font-normal ml-1.5 text-xs">
                    ({line.percentage.toFixed(1)}%)
                  </span>
                ) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InteractiveCalculator({ calc, engineCode, locale, currencySymbol, countryCode }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const effectivePartners = getAffiliatePartners({
    calcId: calc.id,
    countryCode: countryCode || '',
    category: calc.category,
    title: calc.title_native,
    description: calc.description_native,
    netIncome: result?.netIncome,
    grossIncome: result?.grossIncome,
    affiliateTargets: calc.affiliate_targets,
  });

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleCalculate = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      // Engine code is serialized at build-time and evaluated client-side.
      // This is safe because the code comes entirely from our own TypeScript source.
      // eslint-disable-next-line no-new-func
      const calculateFn = new Function('inputs', engineCode) as (inputs: TaxInput) => TaxResult;
      const res = calculateFn(values as TaxInput);
      setResult(res);
    } catch (e) {
      setError('Calculation error. Please check your inputs and try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [values, engineCode]);

  const sym = result?.currencySymbol || currencySymbol;
  const netPct = result ? Math.max(0, Math.min(100, (result.netIncome / result.grossIncome) * 100)) : 0;
  const taxPct = 100 - netPct;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden relative">
      {/* Decorative gradient blur in background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      {/* Form + Result split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* LEFT: Inputs */}
        <div className="p-4 sm:p-8 lg:p-10 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/20">
              1
            </div>
            <h2 className="text-xl font-bold text-slate-900">{getUITranslation('ENTER_DETAILS', locale)}</h2>
          </div>
          
          <div className="space-y-6">
            {calc.inputs.map(input => {
              if (input.type === 'hidden' || input.name === 'calculator_id') return null;
              
              const isCurrency = input.label_native.includes('€') || input.label_native.includes('$') || input.label_native.includes('£');

              return (
              <div key={input.name} className="group">
                <label htmlFor={input.name} className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                  {input.label_native}
                </label>
                {input.type === 'select' ? (
                  <div className="relative">
                    <select
                      id={input.name}
                      value={values[input.name] || ''}
                      onChange={e => handleChange(input.name, e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 bg-white py-3.5 px-4 text-slate-900 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                    >
                      <option value="">Select...</option>
                      {input.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    {isCurrency && (
                      <span className="absolute left-4 text-slate-400 font-bold text-base select-none pointer-events-none">{currencySymbol}</span>
                    )}
                    <input
                      id={input.name}
                      type="number"
                      value={values[input.name] || ''}
                      onChange={e => handleChange(input.name, e.target.value)}
                      placeholder="0"
                      min="0"
                      className={`block w-full rounded-xl border border-slate-300 py-3.5 pr-4 text-slate-900 text-base font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm ${isCurrency ? 'pl-9' : 'pl-4'}`}
                    />
                  </div>
                )}
              </div>
            )})}
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="mt-10 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-base transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {getUITranslation('CALCULATING', locale)}
              </>
            ) : getUITranslation('CALCULATE', locale)}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200 font-medium flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </p>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="p-4 sm:p-8 lg:p-10 lg:col-span-7 bg-slate-50/50 relative">
          {!result ? (
            <div className="flex flex-col items-center justify-between h-full min-h-[400px]">
              <div className="flex flex-col items-center justify-center text-slate-400 py-12 flex-1">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6 text-4xl transform -rotate-6">
                  🧮
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{getUITranslation('ENTER_DETAILS_CALCULATE', locale)}</h3>
                <p className="text-sm font-medium text-center max-w-xs">Fill in your details on the left to see your full tax breakdown and analysis.</p>
              </div>

              {calc.affiliate_targets && calc.affiliate_targets.length > 0 && (
                <div className="w-full mt-auto pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      {getUITranslation('RECOMMENDED_TOOLS', locale)}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      Sponsored
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {calc.affiliate_targets.slice(0, 2).map((partner: any, idx: number) => (
                      <AffiliateCard
                        key={idx}
                        partner={partner}
                        currencySymbol={currencySymbol}
                        calculatorId={calc.id}
                        category={calc.category}
                        locale={locale}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20">
                  2
                </div>
                <h2 className="text-xl font-bold text-slate-900">Your Results</h2>
              </div>

              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-10 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-center md:text-left flex-1">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {getUITranslation('ESTIMATED_NET', locale)}
                  </p>
                  <p className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tabular-nums tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-700 break-words">
                    {sym}{formatNum(result.netIncome, locale)}
                  </p>
                  <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                    <span className="text-sm font-medium text-slate-500">{getUITranslation('EFFECTIVE_RATE', locale)}</span>
                    <strong className="text-sm font-black text-slate-800">{(result.effectiveRate * 100).toFixed(1)}%</strong>
                  </div>
                </div>
                <div className="shrink-0">
                  <DonutChart netPct={netPct} taxPct={taxPct} locale={locale} />
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  {getUITranslation('TAX_BREAKDOWN', locale)}
                </h3>
                <BreakdownTable lines={result.breakdown} sym={sym} locale={locale} />
              </div>

              {result.quarterlyPayment && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-5 py-4 mb-6 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900/70 uppercase tracking-wider mb-1">{getUITranslation('QUARTERLY_PAYMENT', locale)}</p>
                    <p className="text-2xl font-black text-amber-900 tabular-nums">{sym}{formatNum(result.quarterlyPayment, locale)}</p>
                    <p className="text-xs font-semibold text-amber-700 mt-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {getUITranslation('QUARTERLY_DUE', locale)}
                    </p>
                  </div>
                </div>
              )}

              {result.additionalInsights && result.additionalInsights.length > 0 && (
                <ul className="space-y-2 mb-8">
                  {result.additionalInsights.map((insight, i) => (
                    <li key={i} className="text-sm font-medium text-slate-700 flex items-start gap-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      {insight}
                    </li>
                  ))}
                </ul>
              )}

              {/* High-Intent CPA Consultation Banner */}
              {(result.grossIncome >= 80000 || calc.category === 'tax' || calc.category === 'business' || calc.id.includes('scorp') || calc.id.includes('llc') || calc.id.includes('1099') || calc.id.includes('capital') || calc.id.includes('corporate') || calc.id.includes('ir35')) && (
                <div className="my-8">
                  <CpaLeadCapture
                    variant="banner"
                    title="Optimize Your 2026 Tax Strategy"
                    subtitle={`Based on your ${sym}${formatNum(result.grossIncome, locale)} revenue, consult a licensed CPA for personalized tax optimization.`}
                    location={countryCode ? countryCode.toUpperCase() : 'US'}
                    calculatorId={calc.id}
                    defaultRevenue={result.grossIncome >= 250000 ? '250k_plus' : result.grossIncome >= 100000 ? '100k_250k' : '50k_100k'}
                    buttonText="Consult a CPA"
                  />
                </div>
              )}

              {effectivePartners && effectivePartners.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      {getUITranslation('RECOMMENDED_TOOLS', locale)}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      Sponsored
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {effectivePartners.slice(0, 2).map((partner: any, idx: number) => (
                      <AffiliateCard
                        key={idx}
                        partner={partner}
                        netIncome={result.netIncome}
                        grossIncome={result.grossIncome}
                        currencySymbol={sym}
                        calculatorId={calc.id}
                        category={calc.category}
                        locale={locale}
                        country={countryCode}
                        position="results_panel"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Methodology accordion */}
      <div className="border-t border-slate-200 bg-slate-50/50 relative z-10">
        <button
          onClick={() => setShowMethodology(m => !m)}
          className="w-full flex items-center justify-between px-8 py-5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            {getUITranslation('METHODOLOGY', locale)}
          </span>
          <span className={`text-slate-400 transition-transform duration-300 ${showMethodology ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </button>
        {showMethodology && (
          <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-2 duration-300">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line">{calc.formula_explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
