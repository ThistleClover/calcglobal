// src/lib/engine/factory.ts
// The Engine Factory: maps a calculator ID to its calculation function.
// This is the Strategy Pattern — each country/calculator gets its own real logic.

import type { TaxInput, TaxResult } from './types';
import { calculate as calculateUS } from './countries/us';
import { calculate as calculateUK } from './countries/uk';
import { calculate as calculateFR } from './countries/fr';
import { calculate as calculateDE } from './countries/de';
import { calculate as calculateAU } from './countries/au';

type EngineFunction = (inputs: TaxInput) => TaxResult;

const engines: Record<string, EngineFunction> = {
  us: calculateUS,
  uk: calculateUK,
  fr: calculateFR,
  de: calculateDE,
  au: calculateAU,
};

// Map from calculator ID slug to engine key
const calcToEngine: Record<string, string> = {
  // USA
  'us-1099-self-employment-tax-calculator': 'us',
  's-corp-vs-llc-tax-savings-calculator': 'us',
  'w2-salary-paycheck-take-home-calculator': 'us',
  'us-home-sale-net-proceeds-capital-gains-calculator': 'us',
  'us-small-business-lease-break-even-calculator': 'us',
  // UK
  'ir35-inside-outside-calculator': 'uk',
  'sdlt-lbtt-ltt-stamp-duty-calculator': 'uk',
  'uk-gross-net-salary-pension-calculator': 'uk',
  'uk-limited-company-director-salary-dividend-calculator': 'uk',
  'uk-statutory-redundancy-settlement-calculator': 'uk',
  'uk-vat-calculator': 'uk',
  // France
  'urssaf-cotisations-micro-entreprise': 'fr',
  'frais-de-notaire-immobilier': 'fr',
  'calculateur-salaire-brut-net-cout-employeur': 'fr',
  'indemnite-rupture-conventionnelle-licenciement': 'fr',
  'calculateur-plus-value-immobiliere': 'fr',
  'sasu-impots-cotisations-dividendes': 'fr',
  'eurl-impots-cotisations-dividendes': 'fr',
  // Germany
  'brutto-netto-rechner-deutschland': 'de',
  'gewerbesteuer-rechner': 'de',
  'umsatzsteuer-rechner': 'de',
  'freiberufler-einkommensteuer': 'de',
  'kurzarbeitergeld-rechner': 'de',
  // Australia
  'ato-payg-income-tax-calculator': 'au',
  'hecs-repayment-calculator': 'au',
  'sole-trader-tax-calculator': 'au',
  'superannuation-calculator': 'au',
  'stamp-duty-calculator': 'au',
};

export async function getEngine(calculatorId: string): Promise<EngineFunction | null> {
  const engineKey = calcToEngine[calculatorId];
  if (!engineKey) return null;
  return engines[engineKey] ?? null;
}

export function getEngineKeyForCalc(calculatorId: string): string | null {
  return calcToEngine[calculatorId] ?? null;
}
