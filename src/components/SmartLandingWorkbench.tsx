import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TaxInput, TaxResult, TaxBreakdownLine } from '../lib/engine/types';
import { loadCountryEngine, type CalculateFunction } from '../lib/engine/loader';
import { getUITranslation } from '../utils/translations';
import { getAffiliatePartners } from '../utils/affiliateMatching';
import AffiliateCard from './AffiliateCard';
import CpaLeadCapture from './CpaLeadCapture';

export interface CountryWorkbenchData {
  code: string;
  name: string;
  flagCode: string;
  currencySymbol: string;
  locale: string;
  authority: string;
  calculators: {
    id: string;
    title: string;
    description: string;
    category?: string;
    inputs: {
      name: string;
      label_native: string;
      type: string;
      options?: { value: string; label?: string; label_native?: string }[];
    }[];
    formula_explanation: string;
    affiliate_targets?: any[];
  }[];
}

interface Props {
  countries: CountryWorkbenchData[];
  defaultCountryCode?: string;
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#006948]/10 text-[#006948] dark:text-[#6EE7B7] border border-[#006948]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006948] dark:bg-[#6EE7B7]" />
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

// Detect visitor country from URL param or browser timezone
function detectVisitorCountry(availableCodes: string[]): string {
  if (typeof window === 'undefined') return 'us';

  // 1. Check URL params: ?country=br or ?c=br or ?q=brazil
  try {
    const params = new URLSearchParams(window.location.search);
    const countryParam = (params.get('country') || params.get('c') || '').toLowerCase();
    if (countryParam && availableCodes.includes(countryParam)) {
      return countryParam;
    }
    const qParam = (params.get('q') || '').toLowerCase();
    if (qParam) {
      if (qParam.includes('brazil') || qParam.includes('brasil') || qParam.includes('br')) return 'br';
      if (qParam.includes('france') || qParam.includes('fr')) return 'fr';
      if (qParam.includes('uk') || qParam.includes('london') || qParam.includes('britain')) return 'uk';
      if (qParam.includes('germany') || qParam.includes('deutschland') || qParam.includes('de')) return 'de';
      if (qParam.includes('australia') || qParam.includes('au')) return 'au';
      if (qParam.includes('canada') || qParam.includes('ca')) return 'ca';
    }
  } catch (e) {}

  // 2. Check Browser Timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('America/Sao_Paulo') || tz.startsWith('America/Fortaleza') || tz.startsWith('America/Recife') || tz.startsWith('America/Belem') || tz.startsWith('America/Manaus') || tz.startsWith('America/Cuiaba')) return 'br';
    if (tz.startsWith('Europe/Paris')) return 'fr';
    if (tz.startsWith('Europe/London')) return 'uk';
    if (tz.startsWith('Europe/Berlin') || tz.startsWith('Europe/Vienna')) return 'de';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver') || tz.startsWith('America/Montreal') || tz.startsWith('America/Edmonton')) return 'ca';
    if (tz.startsWith('Australia/')) return 'au';
    if (tz.startsWith('Europe/Zurich')) return 'ch';
    if (tz.startsWith('Asia/Dubai')) return 'ae';
    if (tz.startsWith('Asia/Singapore')) return 'sg';
    if (tz.startsWith('America/Mexico_City') || tz.startsWith('America/Monterrey') || tz.startsWith('America/Tijuana')) return 'mx';
    if (tz.startsWith('Europe/Madrid')) return 'es';
    if (tz.startsWith('Europe/Rome')) return 'it';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'in';
    if (tz.startsWith('Asia/Tokyo')) return 'jp';
  } catch (e) {}

  return 'us';
}

// Preset generator tailored to each currency
function getPresetsForCurrency(currencySymbol: string): number[] {
  switch (currencySymbol) {
    case 'R$': // Brazilian Real
      return [5000, 10000, 15000, 25000, 50000];
    case '¥': // Japanese Yen
      return [4000000, 7000000, 10000000, 15000000, 25000000];
    case '₹': // Indian Rupee
      return [600000, 1200000, 2000000, 3500000, 5000000];
    case 'AED':
      return [150000, 250000, 400000, 600000, 1000000];
    case 'CHF':
    case '€':
    case '£':
    case '$':
    default:
      return [45000, 75000, 95000, 120000, 200000];
  }
}

export default function SmartLandingWorkbench({ countries, defaultCountryCode = 'us' }: Props) {
  const availableCodes = countries.map(c => c.code);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(defaultCountryCode);
  const [selectedCalcId, setSelectedCalcId] = useState<string>('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const [engine, setEngine] = useState<CalculateFunction | null>(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect visitor location on mount
  useEffect(() => {
    const detected = detectVisitorCountry(availableCodes);
    if (detected && detected !== selectedCountryCode) {
      setSelectedCountryCode(detected);
    }
  }, []);

  // Sync active country object
  const activeCountry = countries.find(c => c.code === selectedCountryCode) || countries[0];
  const activeCalculators = activeCountry?.calculators || [];

  // Default to first calculator if selected is not found
  const activeCalc = activeCalculators.find(c => c.id === selectedCalcId) || activeCalculators[0] || {
    id: 'income-tax',
    title: 'Gross-to-Net Simulator',
    description: 'Calculate statutory tax deductions and take-home pay.',
    inputs: [{ name: 'gross_annual', label_native: 'Annual Gross Income', type: 'number' }],
    formula_explanation: 'Standard progressive statutory brackets.',
  };

  // Close country dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When country changes, reset values and load engine
  useEffect(() => {
    let cancelled = false;
    setEngineLoading(true);
    setResult(null);
    setValues({});
    setError(null);

    loadCountryEngine(selectedCountryCode)
      .then(fn => {
        if (!cancelled) {
          setEngine(() => fn);
          setEngineLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load engine for:', selectedCountryCode, err);
        if (!cancelled) {
          setEngineLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountryCode]);

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
        calculator_id: values.calculator_id || activeCalc.id,
      };

      let res: TaxResult;
      if (engine) {
        res = engine(allInputs);
      } else {
        throw new Error(`No engine available for ${selectedCountryCode}`);
      }

      setResult(res);
    } catch (e) {
      setError(getUITranslation('CALC_ERROR', activeCountry.locale));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [values, engine, engineLoading, activeCalc.id, selectedCountryCode, activeCountry.locale]);

  const applyPreset = (inputName: string, amount: number) => {
    handleChange(inputName, amount.toString());
  };

  const currencySymbol = activeCountry.currencySymbol || '$';
  const sym = result?.currencySymbol || currencySymbol;
  const netPct = result && result.grossIncome > 0 ? Math.max(0, Math.min(100, (result.netIncome / result.grossIncome) * 100)) : 0;
  const taxPct = 100 - netPct;
  const presets = getPresetsForCurrency(currencySymbol);

  const effectivePartners = getAffiliatePartners({
    calcId: activeCalc.id,
    countryCode: selectedCountryCode,
    category: activeCalc.category || 'tax',
    title: activeCalc.title,
    description: activeCalc.description,
    netIncome: result?.netIncome,
    grossIncome: result?.grossIncome,
    affiliateTargets: activeCalc.affiliate_targets,
    lang: activeCountry.locale.split('-')[0],
  });

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    c.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.authority.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Dynamic Workbench Container */}
      <div className="bg-[#FDFCF9] dark:bg-[#1A1816] rounded-2xl border border-[#E7E2D7] dark:border-[#2A2622] shadow-ambient dark:shadow-dark-ambient overflow-hidden relative transition-colors duration-300">
        
        {/* Country & Calculator Switcher Bar */}
        <div className="p-4 sm:p-5 border-b border-[#E7E2D7] dark:border-[#2A2622] bg-[#F8F6F0] dark:bg-[#0F0E0C] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Country Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setCountryDropdownOpen(o => !o)}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#FDFCF9] dark:bg-[#1A1816] border border-[#E7E2D7] dark:border-[#2A2622] text-[#1C1917] dark:text-[#F5F2EB] text-xs font-bold hover:border-[#006948] dark:hover:border-[#6EE7B7] shadow-xs transition-all cursor-pointer"
            >
              <img 
                src={`https://flagcdn.com/w40/${activeCountry.flagCode}.png`}
                alt={`${activeCountry.name} flag`}
                className="w-4 h-3 object-cover rounded-xs shrink-0"
                width="16"
                height="12"
              />
              <span>{activeCountry.name}</span>
              <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E] bg-[#F0EEE8] dark:bg-[#252220] px-1.5 py-0.5 rounded">
                {activeCountry.currencySymbol}
              </span>
              <i className={`ph ph-caret-down text-xs text-[#78716C] transition-transform duration-200 ${countryDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {/* Country Picker Popover */}
            {countryDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 p-2 bg-[#FDFCF9] dark:bg-[#1A1816] rounded-2xl shadow-xl border border-[#E7E2D7] dark:border-[#2A2622] z-50 animate-scale-in">
                <div className="p-1.5 mb-1.5 border-b border-[#E7E2D7] dark:border-[#2A2622]">
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] rounded-lg px-2.5 py-1 text-xs text-[#1C1917] dark:text-[#F5F2EB] placeholder-[#78716C] focus:outline-none focus:ring-1 focus:ring-[#006948]"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {filteredCountries.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountryCode(c.code);
                        setSelectedCalcId(c.calculators[0]?.id || '');
                        setCountryDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                        c.code === selectedCountryCode 
                          ? 'bg-[#006948] text-white font-bold' 
                          : 'hover:bg-[#F0EEE8] dark:hover:bg-[#252220] text-[#1C1917] dark:text-[#F5F2EB]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={`https://flagcdn.com/w40/${c.flagCode}.png`}
                          alt={`${c.name} flag`}
                          className="w-4 h-3 object-cover rounded-xs shrink-0"
                          width="16"
                          height="12"
                        />
                        <span>{c.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${c.code === selectedCountryCode ? 'text-white/80' : 'text-[#78716C]'}`}>
                        {c.calculators.length} tools
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Calculator Switcher Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto no-scrollbar">
            {activeCalculators.map(calc => {
              const isActive = (calc.id === activeCalc.id);
              return (
                <button
                  key={calc.id}
                  type="button"
                  onClick={() => {
                    setSelectedCalcId(calc.id);
                    setResult(null);
                    setValues({});
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#006948] text-white shadow-xs'
                      : 'bg-[#FDFCF9] dark:bg-[#1A1816] border border-[#E7E2D7] dark:border-[#2A2622] text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-white'
                  }`}
                >
                  {calc.title.split('(')[0].trim()}
                </button>
              );
            })}
          </div>

          {/* More Calculators Link */}
          <a
            href={`/${selectedCountryCode}/`}
            className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#006948] dark:text-[#6EE7B7] hover:underline shrink-0"
          >
            <span>More {activeCountry.name} calculators</span>
            <i className="ph ph-arrow-right text-xs"></i>
          </a>
        </div>

        {/* 2-Column Split Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
          
          {/* LEFT COLUMN: Input Control Center */}
          <div className="p-6 sm:p-8 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#E7E2D7] dark:border-[#2A2622] bg-[#F8F6F0]/70 dark:bg-[#0F0E0C]/50">
            
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E7E2D7] dark:border-[#2A2622]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006948] dark:bg-[#6EE7B7]"></span>
                <h2 className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider">
                  {getUITranslation('ENTER_DETAILS', activeCountry.locale)}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
                {activeCountry.authority} (2026)
              </span>
            </div>
            
            <div className="space-y-4">
              {activeCalc.inputs.map(input => {
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
                          <option value="">{getUITranslation('SELECT_PLACEHOLDER', activeCountry.locale)}</option>
                          {input.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label || opt.label_native}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#78716C]">
                          <i className="ph ph-caret-down text-xs"></i>
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
                            className={`block w-full rounded-xl border border-[#E7E2D7] dark:border-[#2A2622] bg-[#FDFCF9] dark:bg-[#1A1816] py-2.5 pr-3 text-[#1C1917] dark:text-[#F5F2EB] font-mono text-sm font-bold focus:ring-1 focus:ring-[#006948] focus:border-[#006948] transition-all shadow-xs ${isCurrency ? 'pl-8' : 'pl-3.5'}`}
                          />
                        </div>
                        
                        {/* Quick Presets for Primary Income only */}
                        {isPrimaryIncome && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {presets.map((preset) => (
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
                  <i className="ph ph-spinner animate-spin text-sm"></i>
                  <span>{getUITranslation('LOADING_CALC', activeCountry.locale)}</span>
                </>
              ) : loading ? (
                <>
                  <i className="ph ph-spinner animate-spin text-sm"></i>
                  <span>{getUITranslation('CALCULATING', activeCountry.locale)}</span>
                </>
              ) : (
                <>
                  <span>{getUITranslation('CALCULATE', activeCountry.locale)}</span>
                  <i className="ph ph-arrow-right text-xs"></i>
                </>
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
                    {getUITranslation('ENTER_DETAILS_CALCULATE', activeCountry.locale)}
                  </h3>
                  <p className="text-xs text-[#78716C] text-center max-w-xs leading-relaxed">
                    {activeCalc.description || getUITranslation('FILL_DETAILS', activeCountry.locale)}
                  </p>
                </div>

                {effectivePartners && effectivePartners.length > 0 && (
                  <div className="w-full mt-auto pt-4 border-t border-[#E7E2D7] dark:border-[#2A2622]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider">
                        {getUITranslation('RECOMMENDED_TOOLS', activeCountry.locale)}
                      </p>
                      <span className="text-[9px] font-mono text-[#78716C] uppercase">
                        {getUITranslation('SPONSORED', activeCountry.locale)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {effectivePartners.slice(0, 2).map((partner: any, idx: number) => (
                        <AffiliateCard
                          key={idx}
                          partner={partner}
                          currencySymbol={currencySymbol}
                          calculatorId={activeCalc.id}
                          category={activeCalc.category}
                          locale={activeCountry.locale}
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
                      {getUITranslation('ESTIMATED_NET', activeCountry.locale)}
                    </span>
                    
                    <div className="text-3xl sm:text-4xl font-black text-[#1C1917] dark:text-[#F5F2EB] tracking-tight break-words">
                      <AnimatedCounter target={result.netIncome} sym={sym} locale={activeCountry.locale} />
                      <span className="text-xs text-[#78716C] font-normal ml-1">/ yr</span>
                    </div>

                    <p className="text-xs text-[#78716C] font-mono mt-0.5">
                      Est. {sym}{formatNum(result.netIncome / 12, activeCountry.locale)} / mo
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                      <div className="px-2.5 py-0.5 rounded-full bg-[#F0EEE8] dark:bg-[#252220] text-[11px] font-medium text-[#1C1917] dark:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2A2622]">
                        <span>{getUITranslation('EFFECTIVE_RATE', activeCountry.locale)} </span>
                        <strong className="font-mono font-bold text-[#006948] dark:text-[#6EE7B7]">
                          {(result.effectiveRate * 100).toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0">
                    <DonutChart netPct={netPct} taxPct={taxPct} locale={activeCountry.locale} />
                  </div>
                </div>

                {/* Detailed Breakdown Section */}
                <div>
                  <h3 className="text-[11px] font-bold text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    {getUITranslation('TAX_BREAKDOWN', activeCountry.locale)}
                  </h3>
                  <BreakdownTable lines={result.breakdown} sym={sym} locale={activeCountry.locale} />
                </div>

                {/* Quarterly Due Notice */}
                {Boolean(result.quarterlyPayment && result.quarterlyPayment > 0) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                    <i className="ph ph-calendar-check text-base text-amber-600 dark:text-amber-400"></i>
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-200 uppercase text-[10px] tracking-wide block">
                        {getUITranslation('QUARTERLY_PAYMENT', activeCountry.locale)}
                      </span>
                      <span className="font-mono font-bold text-sm text-amber-950 dark:text-amber-100">
                        {sym}{formatNum(result.quarterlyPayment, activeCountry.locale)}
                      </span>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                        {getUITranslation('QUARTERLY_DUE', activeCountry.locale)}
                      </p>
                    </div>
                  </div>
                )}

                {/* High-Intent CPA Banner */}
                {(result.grossIncome >= 60000 || activeCalc.category === 'tax' || activeCalc.category === 'business') && (
                  <div className="pt-1">
                    <CpaLeadCapture
                      variant="banner"
                      title="Optimize Statutory Tax Architecture"
                      subtitle={`With ${sym}${formatNum(result.grossIncome, activeCountry.locale)} revenue, evaluate CPA deductions.`}
                      location={selectedCountryCode.toUpperCase()}
                      calculatorId={activeCalc.id}
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
                        {getUITranslation('RECOMMENDED_TOOLS', activeCountry.locale)}
                      </p>
                      <span className="text-[9px] font-mono text-[#78716C] uppercase">
                        {getUITranslation('SPONSORED', activeCountry.locale)}
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
                          calculatorId={activeCalc.id}
                          category={activeCalc.category}
                          locale={activeCountry.locale}
                          country={selectedCountryCode}
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
            <span>{getUITranslation('METHODOLOGY', activeCountry.locale)} ({activeCountry.authority} 2026/27)</span>
            <i className={`ph ph-caret-down text-xs text-[#78716C] transition-transform duration-300 ${showMethodology ? 'rotate-180' : ''}`}></i>
          </button>
          {showMethodology && (
            <div className="px-6 pb-5 pt-1 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-[#FDFCF9] dark:bg-[#1A1816] border border-[#E7E2D7] dark:border-[#2A2622] text-xs text-[#78716C] dark:text-[#A8A29E] leading-relaxed whitespace-pre-line">
                {activeCalc.formula_explanation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Verified Affiliate Partners Strip */}
      <div className="rounded-2xl bg-[#FDFCF9] dark:bg-[#1A1816] border border-[#E7E2D7] dark:border-[#2A2622] p-4 sm:p-5 shadow-ambient">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#006948]/10 text-[#006948] dark:text-[#6EE7B7] text-[10px] font-bold uppercase tracking-wider border border-[#006948]/20">
              Verified Compliance Network
            </span>
            <span className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB]">
              Official Accounting & Business Infrastructure Partners
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
            Audited for 2026/27 Cross-Border Operations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Partner 1: Sage Accounting */}
          <a
            href="/go/sage"
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="group flex items-center justify-between p-3.5 rounded-xl bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] hover:border-[#006948] dark:hover:border-[#6EE7B7] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00D665]/10 border border-[#00D665]/20 flex items-center justify-center text-xs font-black text-[#006948] dark:text-[#00D665]">
                SAGE
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] group-hover:text-[#006948] dark:group-hover:text-[#6EE7B7] transition-colors">
                  Sage Accounting
                </h4>
                <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E]">
                  Invoicing, payroll, and statutory tax compliance software
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#006948] dark:text-[#6EE7B7] group-hover:translate-x-0.5 transition-transform shrink-0">
              Explore Sage →
            </span>
          </a>

          {/* Partner 2: Shopify */}
          <a
            href="/go/shopify"
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="group flex items-center justify-between p-3.5 rounded-xl bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] hover:border-[#006948] dark:hover:border-[#6EE7B7] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#95BF47]/10 border border-[#95BF47]/20 flex items-center justify-center text-xs font-black text-[#6B8E23] dark:text-[#95BF47]">
                SHOP
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] group-hover:text-[#006948] dark:group-hover:text-[#6EE7B7] transition-colors">
                  Shopify Commerce
                </h4>
                <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E]">
                  Global commerce platform to sell, run, and scale worldwide
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#006948] dark:text-[#6EE7B7] group-hover:translate-x-0.5 transition-transform shrink-0">
              Free Trial →
            </span>
          </a>

        </div>
      </div>

    </div>
  );
}
