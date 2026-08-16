// Dynamic engine loader — loads only the requested country's engine
// to avoid bundling all 15 countries on every page

import type { TaxInput, TaxResult } from './types';

export type CalculateFunction = (input: TaxInput) => TaxResult;

export async function loadCountryEngine(countryCode: string): Promise<CalculateFunction> {
  switch (countryCode.toLowerCase()) {
    case 'us': return (await import('./countries/us')).calculate;
    case 'uk': return (await import('./countries/uk')).calculate;
    case 'fr': return (await import('./countries/fr')).calculate;
    case 'de': return (await import('./countries/de')).calculate;
    case 'au': return (await import('./countries/au')).calculate;
    case 'ca': return (await import('./countries/ca')).calculate;
    case 'es': return (await import('./countries/es')).calculate;
    case 'it': return (await import('./countries/it')).calculate;
    case 'in': return (await import('./countries/in')).calculate;
    case 'jp': return (await import('./countries/jp')).calculate;
    case 'br': return (await import('./countries/br')).calculate;
    case 'mx': return (await import('./countries/mx')).calculate;
    case 'ae': return (await import('./countries/ae')).calculate;
    case 'sg': return (await import('./countries/sg')).calculate;
    case 'ch': return (await import('./countries/ch')).calculate;
    default:
      throw new Error(`No engine available for country: ${countryCode}`);
  }
}
