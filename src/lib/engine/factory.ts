// src/lib/engine/factory.ts
// The Engine Factory: maps a calculator ID to its calculation function.
// This is the Strategy Pattern — each country/calculator gets its own real logic.

import type { TaxInput, TaxResult } from './types';
import { ENGINE_MAP } from '../../config';
import { calculate as calculateUS } from './countries/us';
import { calculate as calculateUK } from './countries/uk';
import { calculate as calculateFR } from './countries/fr';
import { calculate as calculateDE } from './countries/de';
import { calculate as calculateAU } from './countries/au';
import { calculate as calculateCA } from './countries/ca';
import { calculate as calculateES } from './countries/es';
import { calculate as calculateIT } from './countries/it';
import { calculate as calculateIN } from './countries/in';
import { calculate as calculateJP } from './countries/jp';
import { calculate as calculateBR } from './countries/br';
import { calculate as calculateMX } from './countries/mx';
import { calculate as calculateAE } from './countries/ae';
import { calculate as calculateSG } from './countries/sg';
import { calculate as calculateCH } from './countries/ch';

type EngineFunction = (inputs: TaxInput) => TaxResult;

const engines: Record<string, EngineFunction> = {
  us: calculateUS,
  uk: calculateUK,
  fr: calculateFR,
  de: calculateDE,
  au: calculateAU,
  ca: calculateCA,
  es: calculateES,
  it: calculateIT,
  in: calculateIN,
  jp: calculateJP,
  br: calculateBR,
  mx: calculateMX,
  ae: calculateAE,
  sg: calculateSG,
  ch: calculateCH,
};

export function getEngineKeyForCalc(calculatorId: string): string | null {
  for (const countryMap of Object.values(ENGINE_MAP)) {
    if (countryMap[calculatorId]) {
      return countryMap[calculatorId];
    }
  }
  return null;
}

export async function getEngine(calculatorId: string): Promise<EngineFunction | null> {
  const engineKey = getEngineKeyForCalc(calculatorId);
  if (!engineKey) return null;
  return engines[engineKey] ?? null;
}
