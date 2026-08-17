import React, { useState } from 'react';
import worldMap from '@svg-maps/world';

export interface WorldMapCountry {
  code: string;
  name: string;
  flagCode: string;
  continent: 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America' | 'Middle East';
  authority: string;
  calculatorCount: number;
  currencySymbol: string;
  topCalculators: { id: string; title: string }[];
  cx?: number;
  cy?: number;
}

interface Props {
  countries: WorldMapCountry[];
  base?: string;
}

const mapIdToCountryCode: Record<string, string> = {
  gb: 'uk',
  us: 'us',
  br: 'br',
  fr: 'fr',
  de: 'de',
  ca: 'ca',
  au: 'au',
  jp: 'jp',
  in: 'in',
  mx: 'mx',
  ch: 'ch',
  es: 'es',
  it: 'it',
  ae: 'ae',
  sg: 'sg',
};

export default function WorldMapDirectory({ countries, base = '' }: Props) {
  const [hoveredCountry, setHoveredCountry] = useState<WorldMapCountry | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const continents = ['all', 'North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East'];

  // Map country code to full data object
  const countryByCode = new Map<string, WorldMapCountry>();
  countries.forEach(c => countryByCode.set(c.code.toLowerCase(), c));

  const filteredCountries = countries.filter(c => {
    const matchesContinent = (selectedContinent === 'all' || c.continent === selectedContinent);
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesContinent && matchesSearch;
  });

  // Top 5 Most Used Jurisdictions ("Legacy / High-Intent Engines")
  const top5Codes = ['us', 'uk', 'fr', 'de', 'br'];
  const top5Countries = top5Codes.map(code => countryByCode.get(code)).filter(Boolean) as WorldMapCountry[];

  const rawMap = (worldMap as any).default || worldMap;
  const locations: Array<{ name: string; id: string; path: string }> = rawMap?.locations || [];
  const viewBox: string = rawMap?.viewBox || '0 0 1010 666';

  return (
    <section className="space-y-8">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#006948]/10 text-[#006948] dark:text-[#6EE7B7] border border-[#006948]/20 text-[10px] font-bold uppercase tracking-wider mb-2">
            <i className="ph ph-globe-hemisphere-west text-xs"></i>
            <span>Interactive World Map</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C1917] dark:text-[#F5F2EB] tracking-tight">
            Browse Jurisdictions & Tax Frameworks
          </h2>
          <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5 max-w-xl">
            Click on any country on the world map or filter by continent for localized statutory salary, corporate, dividend, and social security calculators.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search 15 jurisdictions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#FDFCF9] dark:bg-[#1A1816] border border-[#E7E2D7] dark:border-[#2A2622] rounded-full px-4 py-2 text-xs text-[#1C1917] dark:text-[#F5F2EB] placeholder-[#78716C] focus:outline-none focus:ring-1 focus:ring-[#006948] dark:focus:ring-[#6EE7B7] transition-all shadow-xs"
          />
          <div className="absolute right-3.5 top-2.5 text-[#78716C] pointer-events-none text-xs">
            <i className="ph ph-magnifying-glass"></i>
          </div>
        </div>
      </div>

      {/* Top 5 Most Used Countries Showcase */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] flex items-center gap-1.5">
            <i className="ph ph-trend-up text-xs text-[#006948] dark:text-[#6EE7B7]"></i>
            <span>Top 5 Most Used Calculators</span>
          </span>
          <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
            Verified 2026/27 Tax Engines
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {top5Countries.map(country => {
            const isHovered = hoveredCountry?.code === country.code;
            return (
              <a
                key={country.code}
                href={`${base}/${country.code}/`}
                onMouseEnter={() => setHoveredCountry(country)}
                onMouseLeave={() => setHoveredCountry(null)}
                className={`group p-3.5 rounded-2xl bg-[#FDFCF9] dark:bg-[#1A1816] border transition-all duration-200 flex flex-col justify-between shadow-ambient hover:shadow-ambient-hover ${
                  isHovered 
                    ? 'border-[#006948] dark:border-[#6EE7B7] ring-1 ring-[#006948]/20 dark:ring-[#6EE7B7]/20' 
                    : 'border-[#E7E2D7] dark:border-[#2A2622] hover:border-[#006948] dark:hover:border-[#6EE7B7]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://flagcdn.com/w40/${country.flagCode}.png`}
                        alt={`${country.name} flag`}
                        className="w-5 h-3.5 object-cover rounded-xs shrink-0 shadow-xs"
                        width="20"
                        height="14"
                        loading="lazy"
                      />
                      <h3 className="font-bold text-xs text-[#1C1917] dark:text-[#F5F2EB] group-hover:text-[#006948] dark:group-hover:text-[#6EE7B7] transition-colors">
                        {country.name}
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F0EEE8] dark:bg-[#252220] text-[#78716C] dark:text-[#A8A29E]">
                      {country.calculatorCount} tools
                    </span>
                  </div>

                  <p className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E] truncate mb-2">
                    {country.authority}
                  </p>

                  <div className="space-y-1">
                    {country.topCalculators.slice(0, 2).map((calc, idx) => (
                      <div key={idx} className="text-[10px] text-[#78716C] dark:text-[#A8A29E] flex items-center gap-1 truncate">
                        <span className="w-1 h-1 rounded-full bg-[#006948] dark:bg-[#6EE7B7] shrink-0"></span>
                        <span className="truncate">{calc.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#E7E2D7]/70 dark:border-[#2A2622]/70 flex items-center justify-between text-[11px] font-semibold text-[#006948] dark:text-[#6EE7B7]">
                  <span>More {country.name} calculators</span>
                  <i className="ph ph-arrow-right text-xs group-hover:translate-x-0.5 transition-transform"></i>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Section: Real SVG World Map (Left 60%) + Continent Breakdown (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Realistic Vector SVG World Map with Individual Country Highlights */}
        <div className="lg:col-span-7 bg-[#FDFCF9] dark:bg-[#1A1816] rounded-2xl border border-[#E7E2D7] dark:border-[#2A2622] p-5 sm:p-6 shadow-ambient relative overflow-hidden flex flex-col justify-between">
          
          <div className="flex items-center justify-between mb-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#006948] dark:bg-[#6EE7B7] animate-pulse"></span>
              <span className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB]">
                15 Active Country Engines Highlighted
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
              Hover any country to highlight & preview
            </span>
          </div>

          {/* SVG Vector World Map */}
          <div className="relative w-full aspect-[1010/580] flex items-center justify-center my-1 bg-[#F8F6F0]/60 dark:bg-[#0F0E0C]/40 rounded-xl p-2 border border-[#E7E2D7]/60 dark:border-[#2A2622]/60">
            <svg
              viewBox={viewBox}
              className="w-full h-full select-none"
            >
              {locations.map(loc => {
                const appCode = mapIdToCountryCode[loc.id];
                const countryData = appCode ? countryByCode.get(appCode) : null;
                const isActive = Boolean(countryData);
                const isHovered = hoveredCountry && countryData && hoveredCountry.code === countryData.code;

                if (!isActive) {
                  // Inactive / background world country path
                  return (
                    <path
                      key={loc.id}
                      id={loc.id}
                      d={loc.path}
                      className="fill-[#E6E1D6] dark:fill-[#201D1A] stroke-[#DBD4C7] dark:stroke-[#2B2723] transition-colors duration-150"
                      strokeWidth="0.4"
                    />
                  );
                }

                // Active supported country path (with rich emerald hover highlight)
                return (
                  <path
                    key={loc.id}
                    id={loc.id}
                    d={loc.path}
                    onClick={() => {
                      if (typeof window !== 'undefined' && countryData) {
                        window.location.href = `${base}/${countryData.code}/`;
                      }
                    }}
                    onMouseEnter={() => {
                      if (countryData) setHoveredCountry(countryData);
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                    className={`cursor-pointer transition-all duration-200 ${
                      isHovered
                        ? 'fill-[#006948] dark:fill-[#6EE7B7] stroke-[#003B28] dark:stroke-[#FFFFFF] opacity-100'
                        : 'fill-[#CBE3D5] dark:fill-[#16402E] stroke-[#006948] dark:stroke-[#6EE7B7] opacity-90 hover:opacity-100'
                    }`}
                    strokeWidth={isHovered ? '1.2' : '0.7'}
                  >
                    <title>{countryData?.name} — Click to view calculators</title>
                  </path>
                );
              })}
            </svg>
          </div>

          {/* Interactive Info Footer Bar */}
          <div className="mt-3 p-3 rounded-xl bg-[#F8F6F0] dark:bg-[#0F0E0C] border border-[#E7E2D7] dark:border-[#2A2622] transition-all min-h-[58px] flex items-center justify-between">
            {hoveredCountry ? (
              <div className="flex items-center justify-between w-full gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={`https://flagcdn.com/w40/${hoveredCountry.flagCode}.png`}
                    alt={`${hoveredCountry.name} flag`}
                    className="w-6 h-4.5 object-cover rounded-xs shadow-xs shrink-0"
                    width="24"
                    height="18"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1C1917] dark:text-[#F5F2EB] truncate">
                        {hoveredCountry.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#006948]/10 text-[#006948] dark:text-[#6EE7B7] text-[10px] font-mono font-semibold">
                        {hoveredCountry.calculatorCount} calculators
                      </span>
                    </div>
                    <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] truncate block">
                      {hoveredCountry.authority} (2026/27 Rules)
                    </span>
                  </div>
                </div>

                <a
                  href={`${base}/${hoveredCountry.code}/`}
                  className="px-3 py-1.5 rounded-full bg-[#006948] text-white hover:bg-[#004A33] text-[11px] font-semibold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>More {hoveredCountry.name} calculators</span>
                  <i className="ph ph-arrow-right text-xs"></i>
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full text-xs text-[#78716C] dark:text-[#A8A29E]">
                <div className="flex items-center gap-2">
                  <i className="ph ph-cursor-click text-base text-[#006948] dark:text-[#6EE7B7]"></i>
                  <span>Hover over any country on the map to highlight it and view available calculators.</span>
                </div>
                <span className="font-mono text-[10px] hidden sm:inline">15 Active Countries</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Continent Directory & Search Results */}
        <div className="lg:col-span-5 bg-[#FDFCF9] dark:bg-[#1A1816] rounded-2xl border border-[#E7E2D7] dark:border-[#2A2622] p-5 sm:p-6 shadow-ambient flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E7E2D7] dark:border-[#2A2622]">
              <h3 className="font-bold text-xs text-[#1C1917] dark:text-[#F5F2EB] uppercase tracking-wider">
                Jurisdictions by Region
              </h3>
              <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
                {filteredCountries.length} countries
              </span>
            </div>

            {/* Continent Filter Tabs */}
            <div className="flex flex-wrap gap-1 mb-4">
              {continents.map(cont => {
                const isActive = selectedContinent === cont;
                const label = cont === 'all' ? `All (${countries.length})` : cont;
                return (
                  <button
                    key={cont}
                    type="button"
                    onClick={() => setSelectedContinent(cont)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#1C1917] text-white dark:bg-[#F5F2EB] dark:text-[#1C1917] font-semibold'
                        : 'bg-[#F8F6F0] dark:bg-[#0F0E0C] text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EB] border border-[#E7E2D7] dark:border-[#2A2622]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Countries List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredCountries.map(country => {
                const isHovered = hoveredCountry?.code === country.code;
                return (
                  <a
                    key={country.code}
                    href={`${base}/${country.code}/`}
                    onMouseEnter={() => setHoveredCountry(country)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                      isHovered
                        ? 'bg-[#006948]/10 border-[#006948] dark:border-[#6EE7B7] text-[#006948] dark:text-[#6EE7B7]'
                        : 'bg-[#F8F6F0] dark:bg-[#0F0E0C] border-[#E7E2D7] dark:border-[#2A2622] hover:border-[#006948] dark:hover:border-[#6EE7B7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={`https://flagcdn.com/w40/${country.flagCode}.png`}
                        alt={`${country.name} flag`}
                        className="w-5 h-3.5 object-cover rounded-xs shrink-0 shadow-xs"
                        width="20"
                        height="14"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#1C1917] dark:text-[#F5F2EB] block truncate">
                          {country.name}
                        </span>
                        <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] truncate block">
                          {country.authority}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E7E2D7]/60 dark:bg-[#252220] text-[#1C1917] dark:text-[#F5F2EB]">
                        {country.calculatorCount} tools
                      </span>
                      <i className="ph ph-arrow-right text-xs text-[#78716C] group-hover:text-[#006948] transition-colors"></i>
                    </div>
                  </a>
                );
              })}

              {filteredCountries.length === 0 && (
                <div className="text-center py-8 text-xs text-[#78716C]">
                  No countries found matching your filter.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[#E7E2D7] dark:border-[#2A2622] flex items-center justify-between text-[11px] text-[#78716C] dark:text-[#A8A29E]">
            <span>15 Jurisdictions • 166 Calculations</span>
            <span className="text-[#006948] dark:text-[#6EE7B7] font-semibold">100% Privacy</span>
          </div>
        </div>

      </div>
    </section>
  );
}
