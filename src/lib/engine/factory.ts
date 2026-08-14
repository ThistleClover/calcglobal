// src/lib/engine/factory.ts
// The Engine Factory: maps a calculator ID to its calculation function.
// This is the Strategy Pattern — each country/calculator gets its own real logic.

import type { TaxInput, TaxResult } from './types';
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

  // Canada
  'sole-proprietor-tax-cpp-qpp-calculator': 'ca',
  'land-transfer-tax-first-time-buyer-calculator': 'ca',
  'severance-pay-statutory-notice-calculator': 'ca',
  'ccpc-corporate-tax-dividend-vs-salary-calculator': 'ca',
  'gst-hst-qst-remittance-quick-method-calculator': 'ca',

  // Spain
  'sueldo-neto-espana': 'es',
  'cuota-autonomos-ingresos-reales': 'es',
  'gastos-compra-vivienda-itp': 'es',
  'finiquito-indemnizacion-despido': 'es',
  'iva-irpf-trimestral-autonomos': 'es',

  // Italy
  'calcolo-stipendio-netto-ral': 'it',
  'calcolo-partita-iva-forfettario': 'it',
  'calcolo-tfr-buona-uscita': 'it',
  'calcolo-tasse-acquisto-casa-imposta-registro': 'it',
  'calcolo-fattura-elettronica-ritenuta-acconto': 'it',

  // India
  'income-tax-new-vs-old-regime-india': 'in',
  'gratuity-act-calculation-india': 'in',
  'section-44ada-44ad-presumptive-taxation-india': 'in',
  'stamp-duty-property-registration-tds-194ia-india': 'in',
  'gst-composition-vs-regular-tax-calculator-india': 'in',

  // Japan
  'kojin-jigyo-tax-calculator': 'jp',
  'furusato-nozei-calculator': 'jp',
  'take-home-pay-calculator': 'jp',
  'real-estate-tax-registration-calculator': 'jp',
  'inheritance-gift-tax-calculator': 'jp',

  // Brazil
  'calculadora-rescisao-clt-br': 'br',
  'calculadora-fator-r-simples-nacional': 'br',
  'calculadora-clt-vs-pj-br': 'br',
  'calculadora-irrf-carne-leao-br': 'br',
  'calculadora-itbi-escritura-cartorio-br': 'br',

  // Mexico
  'sueldo-neto-mexico': 'mx',
  'resico-isr-iva-calculator': 'mx',
  'finiquito-liquidacion-despido-lft': 'mx',
  'gastos-escrituracion-isai-hipoteca': 'mx',
  'ptu-participacion-utilidades-lft': 'mx',

  // United Arab Emirates
  'uae-end-of-service-gratuity': 'ae',
  'uae-corporate-tax-small-business-relief': 'ae',
  'dubai-dld-property-transfer-mortgage-calculator': 'ae',
  'uae-vat-net-payable-calculator': 'ae',
  'uae-gpssa-pension-payroll-calculator': 'ae',

  // Singapore
  'sg-take-home-pay-cpf-calculator': 'sg',
  'sg-stamp-duty-absd-calculator': 'sg',
  'sg-corporate-tax-sute-calculator': 'sg',
  'sg-self-employed-medisave-tax-calculator': 'sg',
  'sg-tenancy-stamp-duty-rental-tax-calculator': 'sg',

  // Switzerland
  'gross-to-net-salary-switzerland': 'ch',
  'pillar-3a-tax-saving-switzerland': 'ch',
  'einzelfirma-vs-gmbh-switzerland': 'ch',
  'real-estate-transfer-mortgage-switzerland': 'ch',
  'eigenmietwert-rental-value-switzerland': 'ch',
};

export async function getEngine(calculatorId: string): Promise<EngineFunction | null> {
  const engineKey = calcToEngine[calculatorId];
  if (!engineKey) return null;
  return engines[engineKey] ?? null;
}

export function getEngineKeyForCalc(calculatorId: string): string | null {
  return calcToEngine[calculatorId] ?? null;
}
