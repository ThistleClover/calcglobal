import { useState, useCallback } from 'react';
import type { TaxInput, TaxResult, TaxBreakdownLine } from '../lib/engine/types';
import { getUITranslation } from '../utils/translations';

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
    affiliate_targets?: any[];
  };
  /** Serialized calculate function — passed as a string from build-time Astro */
  engineCode: string;
  locale: string;
  currencySymbol: string;
}

function formatNum(value: number, locale: string): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function DonutChart({ netPct, taxPct }: { netPct: number; taxPct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const netDash = (netPct / 100) * circ;
  const taxDash = (taxPct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#ef4444" strokeWidth="16"
          strokeDasharray={`${taxDash} ${circ - taxDash}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#22c55e" strokeWidth="16"
          strokeDasharray={`${netDash} ${circ - netDash}`}
          strokeDashoffset={circ * 0.25 - taxDash}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="70" y="66" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f172a">
          {Math.round(netPct)}%
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="11" fill="#64748b">take-home</text>
      </svg>
      <div className="flex gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Net Income</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Total Tax</span>
      </div>
    </div>
  );
}

function BreakdownTable({ lines, sym, locale }: { lines: TaxBreakdownLine[]; sym: string; locale: string }) {
  return (
    <div className="divide-y divide-slate-100">
      {lines.map((line, i) => (
        <div key={i} className={`flex items-center justify-between py-2.5 px-1 ${
          line.isFinal ? 'bg-slate-50 rounded-lg px-3 font-bold text-slate-900' :
          line.isTotal ? 'font-semibold text-slate-800' : 'text-slate-600'
        }`}>
          <span className="text-sm">{line.label}</span>
          <span className={`text-sm tabular-nums ${
            line.isDeduction ? 'text-red-600' :
            line.isFinal ? 'text-green-700' :
            line.isTotal ? 'text-slate-900' : 'text-slate-700'
          }`}>
            {line.isDeduction ? '−' : ''}{sym}{formatNum(Math.abs(line.value), locale)}
            {line.percentage !== undefined ? ` (${line.percentage.toFixed(1)}%)` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function InteractiveCalculator({ calc, engineCode, locale, currencySymbol }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Form + Result split */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        
        {/* LEFT: Inputs */}
        <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6">{getUITranslation('ENTER_DETAILS', locale)}</h2>
          <div className="space-y-5">
            {calc.inputs.map(input => {
              if (input.type === 'hidden' || input.name === 'calculator_id') return null;
              
              const isCurrency = input.label_native.includes('€') || input.label_native.includes('$') || input.label_native.includes('£');

              return (
              <div key={input.name}>
                <label htmlFor={input.name} className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {input.label_native}
                </label>
                {input.type === 'select' ? (
                  <select
                    id={input.name}
                    value={values[input.name] || ''}
                    onChange={e => handleChange(input.name, e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                  >
                    <option value="">Select...</option>
                    {input.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    {isCurrency && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{currencySymbol}</span>
                    )}
                    <input
                      id={input.name}
                      type="number"
                      value={values[input.name] || ''}
                      onChange={e => handleChange(input.name, e.target.value)}
                      placeholder="0"
                      min="0"
                      className={`block w-full rounded-lg border border-slate-300 py-2.5 pr-4 text-slate-900 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition ${isCurrency ? 'pl-7' : 'pl-3'}`}
                    />
                  </div>
                )}
              </div>
            )})}
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="mt-8 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {getUITranslation('CALCULATING', locale)}
              </>
            ) : getUITranslation('CALCULATE', locale)}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-200">{error}</p>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="p-6 md:p-8 bg-slate-50">
          {!result ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4 text-3xl">
                🧮
              </div>
              <p className="text-sm font-medium">{getUITranslation('ENTER_DETAILS_CALCULATE', locale)}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{getUITranslation('ESTIMATED_NET', locale)}</p>
                  <p className="text-4xl font-extrabold text-slate-900 tabular-nums">
                    {sym}{formatNum(result.netIncome, locale)}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{getUITranslation('EFFECTIVE_RATE', locale)} <strong className="text-slate-700">{(result.effectiveRate * 100).toFixed(1)}%</strong></p>
                </div>
                <DonutChart netPct={netPct} taxPct={taxPct} />
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{getUITranslation('TAX_BREAKDOWN', locale)}</h3>
                <BreakdownTable lines={result.breakdown} sym={sym} locale={locale} />
              </div>

              {result.quarterlyPayment && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-sm font-semibold text-amber-800">{getUITranslation('QUARTERLY_PAYMENT', locale)}</p>
                  <p className="text-xl font-bold text-amber-900">{sym}{formatNum(result.quarterlyPayment, locale)}</p>
                  <p className="text-xs text-amber-700 mt-1">{getUITranslation('QUARTERLY_DUE', locale)}</p>
                </div>
              )}

              {result.additionalInsights && result.additionalInsights.length > 0 && (
                <ul className="space-y-2 mb-6">
                  {result.additionalInsights.map((insight, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                      <span className="text-blue-500 mt-0.5">ℹ</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              )}

              {calc.affiliate_targets && calc.affiliate_targets.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {getUITranslation('RECOMMENDED_TOOLS', locale)}
                  </p>
                  <div className="flex flex-col gap-3">
                    {calc.affiliate_targets.slice(0, 2).map((partner: any, idx: number) => (
                      <a
                        key={idx}
                        href={partner.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="pr-4">
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-slate-700 transition-colors">{partner.name}</h4>
                          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{partner.description}</p>
                        </div>
                        <span className="shrink-0 text-slate-300 group-hover:text-slate-600 transition-colors mt-0.5">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Methodology accordion */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowMethodology(m => !m)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <span>📐 {getUITranslation('METHODOLOGY', locale)}</span>
          <span className="text-slate-400">{showMethodology ? '▲' : '▼'}</span>
        </button>
        {showMethodology && (
          <div className="px-6 pb-6">
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{calc.formula_explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
