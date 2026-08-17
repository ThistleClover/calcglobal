import { useState, useEffect, useCallback, useRef } from 'react';
import type { TaxInput, TaxResult, TaxBreakdownLine } from '../lib/engine/types';
import { loadCountryEngine, type CalculateFunction } from '../lib/engine/loader';
import { getEngineKeyForCalc } from '../lib/engine/factory';
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
  engineCode?: string;
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

// Custom Animated Counter for Executive Numeric Readouts
function AnimatedCounter({ target, sym, locale }: { target: number; sym: string; locale: string }) {
  const [current, setCurrent] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const duration = 500;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(start + diff * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
        setCurrent(target);
      }
    }

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return (
    <span className="font-mono tabular-nums tracking-tight">
      {sym}{formatNum(current, locale)}
    </span>
  );
}

// Executive Donut Chart with Creamy Surfaces & Surgical Emerald
function DonutChart({ netPct, taxPct, locale }: { netPct: number; taxPct: number; locale: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const netDash = Math.max(0, Math.min(circ, (netPct / 100) * circ));
  const taxDash = Math.max(0, Math.min(circ, (taxPct / 100) * circ));

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
          <circle 
            cx="64" 
            cy="64" 
            r={r} 
            fill="none" 
            className="stroke-[#F0EEE8] dark:stroke-[#2A2622]" 
            strokeWidth="12" 
          />
          <circle 
            cx="64" 
            cy="64" 
            r={r} 
            fill="none" 
            stroke="#f87171" 
            strokeWidth="12"
            strokeDasharray={`${taxDash} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          <circle 
            cx="64" 
            cy="64" 
            r={r} 
            fill="none" 
            stroke="#006948" 
            strokeWidth="12"
            strokeDasharray={`${netDash} ${circ}`}
            strokeDashoffset={-taxDash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold font-mono tabular-nums text-[#1C1917] dark:text-[#F5F2EB]">
            {Math.round(netPct)}%
          </span>
          <span className="text-[8px] font-bold text-[#78716C] dark:text-[#A8A29E] uppercase tracking-wider">
            {getUITranslation('TAKE_HOME', locale)}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2 text-[10px] font-semibold text-[#78716C] dark:text-[#A8A29E]">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#006948]/10 text-[#006948] dark:text-[#85f8c4] border border-[#006948]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006948]" />
          {getUITranslation('NET_INCOME', locale)}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {getUITranslation('TOTAL_TAX', locale)}
        </span>
      </div>
    </div>
  );
}

// Executive Breakdown Table
function BreakdownTable({ lines, sym, locale }: { lines: TaxBreakdownLine[]; sym: string; locale: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E7E2D7] dark:border-[#2A2622] bg-[#FDFCF9] dark:bg-[#1A1816]">
      <div className="divide-y divide-[#E7E2D7]/80 dark:divide-[#2A2622]/80 text-xs">
        {lines.map((line, i) => {
          const isFinal = line.isFinal;
          const isTotal = line.isTotal;
          const isDeduction = line.isDeduction;

          return (
            <div 
              key={i} 
              className={`flex items-center justify-between py-2.5 px-3.5 transition-colors ${
                isFinal 
                  ? 'bg-[#006948]/10 font-bold border-t border-[#006948]/30' 
                  : isTotal 
                    ? 'bg-[#F0EEE8] dark:bg-[#252220]/60 font-semibold' 
                    : i % 2 === 0 ? 'bg-[#FDFCF9] dark:bg-[#1A1816]' : 'bg-[#F8F6F0] dark:bg-[#0F0E0C]'
              }`}
            >
              <span className={`${isFinal ? 'text-[#006948] dark:text-[#6EE7B7]' : isTotal ? 'text-[#1C1917] dark:text-[#F5F2EB]' : 'text-[#78716C] dark:text-[#A8A29E]'}`}>
                {line.label}
              </span>
              <span className={`font-mono tabular-nums tracking-tight ${
                isDeduction 
                  ? 'text-red-600 dark:text-red-400 font-medium' 
                  : isFinal 
                    ? 'text-[#006948] dark:text-[#6EE7B7] font-bold text-sm' 
                    : isTotal 
                      ? 'text-[#1C1917] dark:text-[#F5F2EB] font-semibold' 
                      : 'text-[#1C1917] dark:text-[#F5F2EB]'
              }`}>
                {isDeduction ? '−' : ''}{sym}{formatNum(Math.abs(line.value), locale)}
                {line.percentage !== undefined && (
                  <span className="text-[#78716C] dark:text-[#A8A29E] font-normal ml-1.5 text-[10px]">
                    ({line.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InteractiveCalculator({ calc, engineCode, locale, currencySymbol, countryCode }: Props) {
  const [engine, setEngine] = useState<CalculateFunction | null>(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const engineKey = (countryCode || getEngineKeyForCalc(calc.id) || '').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    if (!engineKey) {
      setEngineLoading(false);
      return;
    }
    setEngineLoading(true);
    loadCountryEngine(engineKey)
      .then(fn => {
        if (!cancelled) {
          setEngine(() => fn);
          setEngineLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load engine:', err);
        if (!cancelled) {
          setEngineLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [engineKey]);

  const effectivePartners = getAffiliatePartners({
    calcId: calc.id,
    countryCode: countryCode || '',
    category: calc.category,
    title: calc.title_native,
    description: calc.description_native,
    netIncome: result?.netIncome,
    grossIncome: result?.grossIncome,
    affiliateTargets: calc.affiliate_targets,
    lang: locale ? locale.split('-')[0] : countryCode,
  });

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleCalculate = useCallback(() => {
    if (engineLoading) return;
    setLoading(true);
    setError(null);
    try {
      const allInputs: TaxInput = {
        ...values,
        calculator_id: values.calculator_id || calc.id,
      };

      let res: TaxResult;
      if (engine) {
        res = engine(allInputs);
      } else if (engineCode && engineCode.trim().length > 0) {
        // eslint-disable-next-line no-new-func
        const calculateFn = new Function('inputs', engineCode) as (inputs: TaxInput) => TaxResult;
        res = calculateFn(allInputs);
      } else {
        throw new Error(`No calculation engine found for ${engineKey || calc.id}`);
      }

      setResult(res);
    } catch (e) {
      setError(getUITranslation('CALC_ERROR', locale));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [values, engine, engineLoading, engineCode, engineKey, calc.id, locale]);

  const applyPreset = (inputName: string, amount: number) => {
    handleChange(inputName, amount.toString());
  };

  const sym = result?.currencySymbol || currencySymbol;
  const netPct = result && result.grossIncome > 0 ? Math.max(0, Math.min(100, (result.netIncome / result.grossIncome) * 100)) : 0;
  const taxPct = 100 - netPct;

  return (
    <div className="bg-[#FDFCF9] dark:bg-[#1A1816] rounded-2xl border border-[#E7E2D7] dark:border-[#2A2622] shadow-ambient dark:shadow-dark-ambient overflow-hidden relative transition-colors duration-300">
      
      {/* 2-Column Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* LEFT COLUMN: Input Control Center */}
        <div className="p-6 sm:p-8 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#E7E2D7] dark:border-[#2A2622] bg-[#F8F6F0]/70 dark:bg-[#0F0E0C]/50">
          
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E7E2D7] dark:border-[#2A2622]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006948] dark:bg-[#6EE7B7]"></span>
              <h2 className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider">
                {getUITranslation('ENTER_DETAILS', locale)}
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
              Tax Year 2026/27
            </span>
          </div>
          
          <div className="space-y-4">
            {calc.inputs.map(input => {
              if (input.type === 'hidden' || input.name === 'calculator_id') return null;
              
              const isCurrency = input.label_native.includes('€') || 
                                 input.label_native.includes('$') || 
                                 input.label_native.includes('£') || 
                                 input.label_native.includes('R$') || 
                                 input.label_native.includes('CHF') ||
                                 input.label_native.includes('AED') ||
                                 input.label_native.includes('₹') ||
                                 input.label_native.includes('¥') ||
                                 input.name.includes('salary') ||
                                 input.name.includes('income') ||
                                 input.name.includes('revenue') ||
                                 input.name.includes('profit') ||
                                 input.name.includes('gross') ||
                                 input.name.includes('price') ||
                                 input.name.includes('salario') ||
                                 input.name.includes('amount');

              const isPrimaryIncome = isCurrency && (
                input.name.includes('gross') || 
                input.name.includes('salary') || 
                input.name.includes('income') || 
                input.name.includes('profit') || 
                input.name.includes('revenue') || 
                input.name.includes('salario') || 
                input.name.includes('ral') ||
                input.name.includes('brutto')
              );

              const currentVal = values[input.name] || '';

              return (
                <div key={input.name} className="group">
                  <label htmlFor={input.name} className="block text-[11px] font-semibold text-[#78716C] dark:text-[#A8A29E] mb-1">
                    {input.label_native}
                  </label>

                  {input.type === 'select' ? (
                    <div className="relative">
                      <select
                        id={input.name}
                        value={currentVal}
                        onChange={e => handleChange(input.name, e.target.value)}
                        className="block w-full rounded-xl border border-[#E7E2D7] dark:border-[#2A2622] bg-[#FDFCF9] dark:bg-[#1A1816] py-2.5 px-3.5 text-[#1C1917] dark:text-[#F5F2EB] text-xs font-medium focus:ring-1 focus:ring-[#006948] focus:border-[#006948] transition-all shadow-xs appearance-none cursor-pointer"
                      >
                        <option value="">{getUITranslation('SELECT_PLACEHOLDER', locale)}</option>
                        {input.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#78716C]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        {isCurrency && (
                          <span className="absolute left-3 text-[#78716C] dark:text-[#A8A29E] font-mono font-bold text-xs select-none pointer-events-none">
                            {currencySymbol}
                          </span>
                        )}
                        <input
                          id={input.name}
                          type="number"
                          value={currentVal}
                          onChange={e => handleChange(input.name, e.target.value)}
                          placeholder="0"
                          min="0"
                          className={`block w-full rounded-xl border border-[#E7E2D7] dark:border-[#2A2622] bg-[#FDFCF9] dark:bg-[#1A1816] py-2.5 pr-3 text-[#1C1917] dark:text-[#F5F2EB] font-mono text-sm font-bold focus:ring-1 focus:ring-[#006948] focus:border-[#006948] transition-all shadow-xs ${isCurrency ? 'pl-7' : 'pl-3.5'}`}
                        />
                      </div>
                      
                      {/* Creamy Presets Chips */}
                      {isPrimaryIncome && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {[45000, 75000, 95000, 120000, 200000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => applyPreset(input.name, preset)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E7E2D7]/80 dark:bg-[#252220] text-[#1C1917] dark:text-[#F5F2EB] hover:bg-[#006948] hover:text-white dark:hover:bg-[#6EE7B7] dark:hover:text-[#002114] transition-colors cursor-pointer"
                            >
                              {currencySymbol}{preset >= 1000 ? `${preset / 1000}k` : preset}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading || engineLoading}
            className="mt-6 w-full bg-[#006948] hover:bg-[#005137] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {engineLoading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>{getUITranslation('LOADING_CALC', locale)}</span>
              </>
            ) : loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>{getUITranslation('CALCULATING', locale)}</span>
              </>
            ) : (
              <span>{getUITranslation('CALCULATE', locale)} →</span>
            )}
          </button>

          {error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2 border border-red-200 dark:border-red-800 font-medium flex items-center gap-2">
              {error}
            </p>
          )}
        </div>

        {/* RIGHT COLUMN: Output & Financial Intelligence Panel */}
        <div className="p-6 sm:p-8 lg:col-span-7 bg-[#FDFCF9] dark:bg-[#1A1816] flex flex-col justify-between">
          {!result ? (
            <div className="flex flex-col items-center justify-between h-full min-h-[340px]">
              <div className="flex flex-col items-center justify-center text-[#78716C] py-10 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] flex items-center justify-center mb-3 shadow-xs">
                  <i className="ph ph-scales text-xl text-[#78716C] dark:text-[#A8A29E]"></i>
                </div>
                <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F2EB] mb-1">
                  {getUITranslation('ENTER_DETAILS_CALCULATE', locale)}
                </h3>
                <p className="text-xs text-[#78716C] text-center max-w-xs leading-relaxed">
                  {getUITranslation('FILL_DETAILS', locale)}
                </p>
              </div>

              {effectivePartners && effectivePartners.length > 0 && (
                <div className="w-full mt-auto pt-4 border-t border-[#E7E2D7] dark:border-[#2A2622]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider">
                      {getUITranslation('RECOMMENDED_TOOLS', locale)}
                    </p>
                    <span className="text-[9px] font-mono text-[#78716C] uppercase">
                      {getUITranslation('SPONSORED', locale)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {effectivePartners.slice(0, 2).map((partner: any, idx: number) => (
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
            <div className="animate-fade-in space-y-5">
              
              {/* Top Readout Card */}
              <div className="p-5 rounded-xl bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                <div className="text-center sm:text-left flex-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#78716C] dark:text-[#A8A29E] uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006948] dark:bg-[#6EE7B7]"></span>
                    {getUITranslation('ESTIMATED_NET', locale)}
                  </span>
                  
                  <div className="text-3xl sm:text-4xl font-black text-[#1C1917] dark:text-[#F5F2EB] tracking-tight break-words">
                    <AnimatedCounter target={result.netIncome} sym={sym} locale={locale} />
                    <span className="text-xs text-[#78716C] font-normal ml-1">/ yr</span>
                  </div>

                  <p className="text-xs text-[#78716C] font-mono mt-0.5">
                    Est. {sym}{formatNum(result.netIncome / 12, locale)} / mo
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                    <div className="px-2.5 py-0.5 rounded-full bg-[#F0EEE8] dark:bg-[#252220] text-[11px] font-medium text-[#1C1917] dark:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2A2622]">
                      <span>{getUITranslation('EFFECTIVE_RATE', locale)} </span>
                      <strong className="font-mono font-bold text-[#006948] dark:text-[#6EE7B7]">
                        {(result.effectiveRate * 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0">
                  <DonutChart netPct={netPct} taxPct={taxPct} locale={locale} />
                </div>
              </div>

              {/* Detailed Breakdown Section */}
              <div>
                <h3 className="text-[11px] font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  {getUITranslation('TAX_BREAKDOWN', locale)}
                </h3>
                <BreakdownTable lines={result.breakdown} sym={sym} locale={locale} />
              </div>

              {/* Quarterly Due Notice */}
              {Boolean(result.quarterlyPayment && result.quarterlyPayment > 0) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                  <i className="ph ph-calendar-check text-base text-amber-600 dark:text-amber-400"></i>
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-200 uppercase text-[10px] tracking-wide block">
                      {getUITranslation('QUARTERLY_PAYMENT', locale)}
                    </span>
                    <span className="font-mono font-bold text-sm text-amber-950 dark:text-amber-100">
                      {sym}{formatNum(result.quarterlyPayment, locale)}
                    </span>
                    <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                      {getUITranslation('QUARTERLY_DUE', locale)}
                    </p>
                  </div>
                </div>
              )}

              {/* High-Intent CPA Banner */}
              {(result.grossIncome >= 80000 || calc.category === 'tax' || calc.category === 'business') && (
                <div className="pt-1">
                  <CpaLeadCapture
                    variant="banner"
                    title="Optimize Statutory Tax Architecture"
                    subtitle={`With ${sym}${formatNum(result.grossIncome, locale)} revenue, evaluate CPA deductions.`}
                    location={countryCode ? countryCode.toUpperCase() : 'US'}
                    calculatorId={calc.id}
                    defaultRevenue={result.grossIncome >= 250000 ? '250k_plus' : result.grossIncome >= 100000 ? '100k_250k' : '50k_100k'}
                    buttonText="Consult a CPA"
                  />
                </div>
              )}

              {/* Affiliate Recommendation Cards */}
              {effectivePartners && effectivePartners.length > 0 && (
                <div className="pt-3 border-t border-[#E7E2D7] dark:border-[#2A2622]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider">
                      {getUITranslation('RECOMMENDED_TOOLS', locale)}
                    </p>
                    <span className="text-[9px] font-mono text-[#78716C] uppercase">
                      {getUITranslation('SPONSORED', locale)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

      {/* Methodology Accordion */}
      <div className="border-t border-[#E7E2D7] dark:border-[#2A2622] bg-[#F8F6F0] dark:bg-[#0F0E0C] relative z-10 transition-colors duration-300">
        <button
          onClick={() => setShowMethodology(m => !m)}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-semibold text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] transition-colors cursor-pointer"
        >
          <span>{getUITranslation('METHODOLOGY', locale)} (2026/27 Verified)</span>
          <span className={`text-[#78716C] transition-transform duration-300 ${showMethodology ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {showMethodology && (
          <div className="px-6 pb-5 pt-1 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-[#FDFCF9] dark:bg-[#1A1816] border border-[#E7E2D7] dark:border-[#2A2622] text-xs text-[#78716C] dark:text-[#A8A29E] leading-relaxed whitespace-pre-line">
              {calc.formula_explanation}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Floating Bar */}
      {result && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-[#1C1917]/95 dark:bg-[#F5F2EB]/95 text-white dark:text-[#1C1917] p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between animate-slide-up border border-white/10 dark:border-black/10">
          <div>
            <span className="text-[9px] uppercase font-bold text-[#A8A29E] dark:text-[#78716C] tracking-wider block">
              {getUITranslation('ESTIMATED_NET', locale)}
            </span>
            <span className="text-base font-black font-mono tabular-nums">
              {sym}{formatNum(result.netIncome, locale)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { const el = document.querySelector('.lg\\:col-span-7'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-3 py-1.5 rounded-xl bg-white/20 dark:bg-black/10 text-xs font-semibold"
          >
            Breakdown ↑
          </button>
        </div>
      )}
    </div>
  );
}
