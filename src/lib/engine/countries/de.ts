// src/lib/engine/countries/de.ts
// Germany Tax Engine — 2026 Tax Year
// Primary: Brutto-Netto-Rechner
// Secondary: Gewerbesteuer, Umsatzsteuer, Freiberufler ESt, Kurzarbeitergeld
// Sources: Bundesfinanzministerium, §32a EStG, §19 UStG, §11/§35 GewStG, SGB IV, BA-Tabelle

import { safeVal, type TaxInput, type TaxResult } from '../types';

/** German progressive income tax using §32a EStG 2026 zones */
function einkommensteuer(zvE: number, doubled: boolean = false, noPA: boolean = false): number {
  if (isNaN(zvE) || !isFinite(zvE) || zvE <= 0) return 0;
  if (doubled) {
    // Splittingverfahren: halve, compute, double
    return einkommensteuer(zvE / 2, false, noPA) * 2;
  }
  const x = noPA && zvE > 0 ? zvE + 12096 : zvE;
  if (x <= 12096) return 0;
  if (x <= 17404) {
    const y = (x - 12096) / 10000;
    return Math.floor((922.98 * y + 1400) * y);
  }
  if (x <= 66760) {
    const y = (x - 17404) / 10000;
    return Math.floor((181.19 * y + 2397) * y + 1025);
  }
  if (x <= 277825) return Math.floor(0.42 * x - 10036);
  return Math.floor(0.45 * x - 18392);
}

const BBG_RV_WEST_2026 = 90600;   // Beitragsbemessungsgrenze Rentenversicherung
const BBG_KV_WEST_2026 = 66150;   // Beitragsbemessungsgrenze Krankenversicherung

/** Hauptfunktion zur Steuerberechnung (verteilt nach calculator_id) */
export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'brutto-netto-rechner-deutschland');
  switch (calcId) {
    case 'gewerbesteuer-rechner':
      return calculateGewerbesteuer(inputs);
    case 'umsatzsteuer-rechner':
      return calculateUmsatzsteuer(inputs);
    case 'freiberufler-einkommensteuer':
      return calculateFreiberufler(inputs);
    case 'kurzarbeitergeld-rechner':
      return calculateKurzarbeitergeld(inputs);
    case 'brutto-netto-rechner-deutschland':
    default:
      return calculateBruttoNetto(inputs);
  }
}

/** 0. Primärer Brutto-Netto-Rechner Deutschland (Arbeitnehmer) */
function calculateBruttoNetto(inputs: TaxInput): TaxResult {
  const grossAnnual = safeVal(inputs.brutto_gehalt ?? inputs.gross_annual ?? inputs.gross_income ?? inputs.salary ?? inputs.bruttogehalt);
  
  if (grossAnnual <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Jahresbrutto', value: 0 },
        { label: 'Gesamte Sozialversicherung', value: 0, isTotal: true },
        { label: 'Einkommensteuer', value: 0, isDeduction: true },
        { label: 'Jahresnettogehalt', value: 0, isFinal: true },
        { label: 'Monatliches Nettogehalt', value: 0, isTotal: true },
      ],
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: [],
    };
  }

  const rawTaxClass = String(inputs.tax_class ?? inputs.steuerklasse ?? inputs.taxClass ?? '1');
  const taxClass = ['1', '2', '3', '4', '5', '6'].includes(rawTaxClass) ? rawTaxClass : '1';

  const churchTaxInput = inputs.church_tax ?? inputs.kirchensteuer ?? inputs.kirchensteuer_pflichtig;
  const kirchensteuer = churchTaxInput === true || ['yes', 'ja', 'true', '1'].includes(String(churchTaxInput || '').toLowerCase());

  const healthType = String(inputs.health_insurance ?? inputs.krankenversicherung ?? 'gkv').toLowerCase();
  const zusatzbeitrag = safeVal(inputs.additional_health_contribution ?? inputs.zusatzbeitrag ?? 1.6, 0, 100) / 100;
  
  const state = String(inputs.state ?? inputs.bundesland ?? inputs.land ?? 'OTHER').toUpperCase();
  const kirchenRate = ['BY', 'BW', 'BAYERN', 'BADEN-WÜRTTEMBERG', 'BADEN-WUERTTEMBERG'].includes(state) ? 0.08 : 0.09;

  // ─── Sozialversicherung (Arbeitnehmer-Anteil) ───
  const rvBase = Math.min(grossAnnual, BBG_RV_WEST_2026);
  const rv = rvBase * 0.093;                    // Rentenversicherung 9.3%
  const av = rvBase * 0.013;                    // Arbeitslosenversicherung 1.3%
  const pvBase = Math.min(grossAnnual, BBG_KV_WEST_2026); // Pflegeversicherung
  const pvRate = 0.018 + 0.006;                 // 1.8% + 0.6% Kinderlosenzuschlag
  const pv = pvBase * pvRate;

  let kv = 0;
  if (healthType === 'gkv') {
    const kvBase = Math.min(grossAnnual, BBG_KV_WEST_2026);
    kv = kvBase * (0.073 + zusatzbeitrag / 2);   // Arbeitnehmeranteil
  } else {
    kv = Math.min(grossAnnual, 300 * 12); // PKV flat estimate capped at gross
  }

  const totalSV = Math.min(grossAnnual, rv + av + pv + kv);

  // ─── Zu versteuerndes Einkommen (zvE) ───
  const pauschbetrag = 1230;
  let zvE = Math.max(0, grossAnnual - totalSV - pauschbetrag);

  // ─── Steuerklasse adjustments ───
  let splitting = false;
  let noPA = false;
  switch (taxClass) {
    case '2': zvE = Math.max(0, zvE - 4260); break;   // Entlastungsbetrag Alleinerziehende
    case '3': splitting = true; zvE = Math.max(0, zvE - 1230); break; // Splitting
    case '5': noPA = true; break;
    case '6': noPA = true; break;
  }

  const estRaw = einkommensteuer(Math.round(zvE), splitting, noPA);

  // Tax cannot exceed remaining income after SV (guard for low income tax class 5/6)
  const maxTaxAllowed = Math.max(0, grossAnnual - totalSV);
  const est = Math.min(maxTaxAllowed, estRaw);

  // ─── Solidaritätszuschlag ───
  // Freigrenze 2026: 18,130 € for single, 36,260 € for married/splitting
  const soliFreigrenze = splitting ? 36260 : 18130;
  const soliRaw = est > soliFreigrenze ? Math.min(est * 0.055, (est - soliFreigrenze) * 0.119) : 0;

  // ─── Kirchensteuer ───
  const kircheRaw = kirchensteuer ? est * kirchenRate : 0;

  // Ensure total tax doesn't push total deductions above grossAnnual
  const kirche = Math.min(Math.max(0, maxTaxAllowed - est), kircheRaw);
  const soli = Math.min(Math.max(0, maxTaxAllowed - est - kirche), soliRaw);

  const totalTax = est + soli + kirche;
  const totalDeductions = totalSV + totalTax;
  const netAnnual = Math.max(0, grossAnnual - totalDeductions);
  const netMonthly = netAnnual / 12;
  const effectiveRate = grossAnnual > 0 ? totalDeductions / grossAnnual : 0;

  const breakdown = [
    { label: 'Jahresbrutto', value: grossAnnual },
    { label: 'Rentenversicherung AN (9.3%)', value: rv, isDeduction: true },
    { label: 'Arbeitslosenversicherung (1.3%)', value: av, isDeduction: true },
    { label: `Krankenversicherung (${healthType === 'gkv' ? 'GKV' : 'PKV-Schätzung'})`, value: kv, isDeduction: true },
    { label: `Pflegeversicherung (${(pvRate * 100).toFixed(1)}%)`, value: pv, isDeduction: true },
    { label: 'Gesamte Sozialversicherung', value: totalSV, isTotal: true },
    { label: `Einkommensteuer (Klasse ${taxClass})`, value: est, isDeduction: true },
    ...(soli > 0 ? [{ label: 'Solidaritätszuschlag (5.5%)', value: soli, isDeduction: true }] : []),
    ...(kirche > 0 ? [{ label: `Kirchensteuer (${(kirchenRate * 100).toFixed(0)}%)`, value: kirche, isDeduction: true }] : []),
    { label: 'Jahresnettogehalt', value: netAnnual, isFinal: true },
    { label: 'Monatliches Nettogehalt', value: netMonthly, isTotal: true },
  ];

  const insights: string[] = [];
  if (taxClass === '3') {
    insights.push('Steuerklasse 3: Das Splittingverfahren gilt. Ihr Partner hat wahrscheinlich Klasse 5. Die Steuerlast wird erst bei der Steuererklärung endgültig berechnet.');
  }
  if (grossAnnual > BBG_RV_WEST_2026) {
    insights.push(`Ihr Gehalt übersteigt die Beitragsbemessungsgrenze (${BBG_RV_WEST_2026.toLocaleString('de-DE')} €). Auf den Mehrbetrag fallen keine Rentenversicherungsbeiträge an.`);
  }
  if (soli === 0) {
    insights.push('Sie zahlen keinen Solidaritätszuschlag — seit 2021 entfällt er für ca. 90% der Steuerzahler.');
  }

  return {
    grossIncome: grossAnnual,
    netIncome: netAnnual,
    totalTax: totalDeductions,
    effectiveRate,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: insights,
  };
}

/** 1. Gewerbesteuer-Rechner (Steuermessbetrag, Gewerbesteuer, §35 EStG Anrechnung) */
function calculateGewerbesteuer(inputs: TaxInput): TaxResult {
  const gewerbeertrag = safeVal(inputs.gewerbeertrag ?? inputs.annual_profit ?? inputs.profit ?? inputs.ertrag);
  
  const rawHebesatz = inputs.hebesatz ?? inputs.tax_rate;
  const hebesatz = rawHebesatz === undefined || rawHebesatz === null || String(rawHebesatz).trim() === ''
    ? 400
    : safeVal(rawHebesatz, 0, 1000);

  if (gewerbeertrag <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Gewerbeertrag vor Steuern', value: 0 },
        { label: 'Gewerbesteuer', value: 0, isDeduction: true },
        { label: 'Effektive Gewerbesteuerbelastung nach ESt-Anrechnung', value: 0, isFinal: true },
      ],
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: ['Gewerbeertrag ist 0 € — es fällt keine Gewerbesteuer an.'],
    };
  }

  const rechtsform = String(inputs.rechtsform || inputs.legal_status || inputs.legal_form || 'einzelunternehmen').toLowerCase();
  const isGmbH = rechtsform.includes('gmbh') || rechtsform.includes('ug') || rechtsform.includes('ag') || rechtsform.includes('kapitalgesellschaft');
  const freibetrag = isGmbH ? 0 : 24500;

  // Gewerbeertrag wird auf volle 100 € abgerundet (§ 11 Abs. 1 GewStG)
  const zuVersteuernderErtrag = Math.floor(Math.max(0, gewerbeertrag - freibetrag) / 100) * 100;
  const steuermesszahl = 0.035; // 3,5% Steuermesszahl
  const steuermessbetrag = zuVersteuernderErtrag * steuermesszahl;
  const gewerbesteuer = hebesatz > 0 ? steuermessbetrag * (hebesatz / 100) : 0;

  // ESt-Anrechnung nach § 35 EStG (max. 4,0x Steuermessbetrag für Einzelunternehmer/Personengesellschaften)
  const maxEstAnrechnung = steuermessbetrag * 4.0;
  const estAnrechnung = isGmbH ? 0 : Math.min(gewerbesteuer, maxEstAnrechnung);
  const effektiveBelastung = Math.max(0, gewerbesteuer - estAnrechnung);

  const netIncome = Math.max(0, gewerbeertrag - gewerbesteuer);
  const effectiveRate = gewerbeertrag > 0 ? gewerbesteuer / gewerbeertrag : 0;

  const breakdown = [
    { label: 'Gewerbeertrag vor Steuern', value: gewerbeertrag },
    { label: `Freibetrag (§ 11 Abs. 1 GewStG${isGmbH ? ' — entfällt für GmbH' : ''})`, value: freibetrag, isDeduction: true },
    { label: 'Zu versteuernder Gewerbeertrag (abgerundet)', value: zuVersteuernderErtrag, isTotal: true },
    { label: 'Steuermessbetrag (3,5% Steuermesszahl)', value: steuermessbetrag },
    { label: `Gewerbesteuer (Hebesatz ${hebesatz}%)`, value: gewerbesteuer, isDeduction: true },
    ...(!isGmbH && estAnrechnung > 0 ? [{ label: 'ESt-Anrechnung (§ 35 EStG — max. 4,0x Messbetrag)', value: estAnrechnung }] : []),
    { label: 'Effektive Gewerbesteuerbelastung nach ESt-Anrechnung', value: effektiveBelastung, isFinal: true },
  ];

  const insights: string[] = [];
  if (isGmbH) {
    insights.push('Kapitalgesellschaften (GmbH / UG) erhalten keinen Gewerbesteuer-Freibetrag (24.500 €) und keine Anrechnung auf die Einkommensteuer nach § 35 EStG.');
  } else if (hebesatz <= 400) {
    insights.push(`Bei einem Hebesatz von ${hebesatz}% wird die Gewerbesteuer durch die ESt-Anrechnung (§ 35 EStG, max. 400%) nahezu vollständig auf die persönliche Einkommensteuer angerechnet.`);
  } else {
    insights.push(`Bei einem Hebesatz über 400% (hier ${hebesatz}%) verbleibt eine effektive Gewerbesteuerbelastung von ${effektiveBelastung.toFixed(2)} €, da die ESt-Anrechnung auf das 4,0-Fache des Messbetrags gedeckelt ist.`);
  }

  return {
    grossIncome: gewerbeertrag,
    netIncome,
    totalTax: gewerbesteuer,
    effectiveRate,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: insights,
  };
}

/** 2. Umsatzsteuer-Rechner / Kleinunternehmerregelung (§ 19 UStG) */
function calculateUmsatzsteuer(inputs: TaxInput): TaxResult {
  const rawAmount = safeVal(inputs.net_amount ?? inputs.nettobetrag_oder_brutto ?? inputs.amount ?? inputs.bruttobetrag);
  const eingabeTyp = String(inputs.eingabe_typ || inputs.input_type || 'netto').toLowerCase();
  
  const rawVatRate = inputs.vat_rate ?? inputs.mwst_satz ?? inputs.tax_rate;
  const mwstSatzVal = rawVatRate === undefined || rawVatRate === null || String(rawVatRate).trim() === ''
    ? 19
    : safeVal(rawVatRate, 0, 100);
  const mwstRate = mwstSatzVal / 100;

  const kleinunternehmerInput = String(inputs.kleinunternehmer ?? inputs.is_kleinunternehmer ?? 'nein').toLowerCase();
  const umsatzVorjahr = safeVal(inputs.umsatz_vorjahr ?? inputs.prior_year_revenue);
  
  // Kleinunternehmer (§19 UStG): if opted OR if prior year revenue / revenue < 22,000 € (and not explicitly set to false/nein/no)
  const explicitNo = ['nein', 'no', 'false', '0'].includes(kleinunternehmerInput);
  const explicitYes = ['ja', 'yes', 'true', '1'].includes(kleinunternehmerInput);
  const isKleinunternehmer = explicitYes || (!explicitNo && (umsatzVorjahr > 0 && umsatzVorjahr <= 22000));

  if (rawAmount <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Nettobetrag', value: 0 },
        { label: 'Umsatzsteuer / Mehrwertsteuer (0%)', value: 0, isDeduction: true },
        { label: 'Bruttobetrag (Rechnungsbetrag)', value: 0, isFinal: true },
      ],
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: [],
    };
  }

  let netto = 0;
  let mwst = 0;
  let brutto = 0;
  let mwstErsparnis = 0;

  if (isKleinunternehmer) {
    netto = rawAmount;
    brutto = rawAmount;
    mwst = 0;
    mwstErsparnis = rawAmount * mwstRate;
  } else {
    if (eingabeTyp === 'netto') {
      netto = rawAmount;
      mwst = netto * mwstRate;
      brutto = netto + mwst;
    } else {
      brutto = rawAmount;
      const denom = 1 + mwstRate;
      netto = denom === 0 ? 0 : brutto / denom;
      mwst = brutto - netto;
    }
  }

  const effectiveRate = brutto > 0 ? mwst / brutto : 0;

  const breakdown = [
    { label: 'Nettobetrag', value: netto },
    { label: `Umsatzsteuer / Mehrwertsteuer (${isKleinunternehmer ? '0% — § 19 UStG' : mwstSatzVal + '%'})`, value: mwst, isDeduction: true },
    { label: 'Bruttobetrag (Rechnungsbetrag)', value: brutto, isFinal: true },
  ];

  const insights: string[] = [];
  if (isKleinunternehmer) {
    insights.push('Gemäß Kleinunternehmerregelung (§ 19 UStG) weisen Sie keine Umsatzsteuer auf Ihren Rechnungen aus und sind von Umsatzsteuer-Voranmeldungen befreit.');
    if (umsatzVorjahr > 22000) {
      insights.push('⚠️ Hinweis: Ihr Vorjahresumsatz übersteigt 22.000 €. Sie sind voraussichtlich nicht mehr berechtigt, die Kleinunternehmerregelung zu nutzen.');
    } else {
      insights.push(`Ersparnis/Vermeidungsbetrag USt auf diesen Betrag: ${mwstErsparnis.toFixed(2)} €.`);
    }
  } else {
    insights.push(`Regelbesteuerung mit ${mwstSatzVal}% USt: Die erhobene Umsatzsteuer ist als Durchlaufposten an das Finanzamt abzuführen.`);
  }

  return {
    grossIncome: brutto,
    netIncome: netto,
    totalTax: mwst,
    effectiveRate,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: insights,
  };
}

/** 3. Freiberufler Einkommensteuer-Rechner (Katalogberufe § 18 EStG) */
function calculateFreiberufler(inputs: TaxInput): TaxResult {
  const umsatz = safeVal(inputs.jahresumsatz ?? inputs.revenue ?? inputs.umsatz ?? inputs.gross_income);
  const ausgaben = safeVal(inputs.betriebsausgaben ?? inputs.expenses ?? inputs.ausgaben ?? inputs.betriebskosten);
  
  if (umsatz <= 0 || ausgaben >= umsatz) {
    const gewinn = Math.max(0, umsatz - ausgaben);
    return {
      grossIncome: umsatz,
      netIncome: gewinn,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Jahresumsatz (Einnahmen)', value: umsatz },
        { label: 'Betriebsausgaben', value: ausgaben, isDeduction: true },
        { label: 'Reingewinn (EÜR)', value: gewinn, isTotal: true },
        { label: 'Einkommensteuer', value: 0, isDeduction: true },
        { label: 'Netto-Reingewinn nach Abgaben', value: gewinn, isFinal: true },
      ],
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: [
        umsatz <= 0
          ? 'Jahresumsatz ist 0 € — es fällt keine Einkommensteuer an.'
          : 'Betriebsausgaben übersteigen oder entsprechen dem Jahresumsatz (negativer/null Gewinn) — es fällt keine Einkommensteuer an.',
      ],
    };
  }

  const gewinn = Math.max(0, umsatz - ausgaben);
  const familienstand = String(inputs.familienstand || inputs.marital_status || 'ledig').toLowerCase();
  const doubled = familienstand.includes('verheiratet') || familienstand.includes('married');
  
  const kirchensteuerInput = inputs.kirchensteuer_pflichtig ?? inputs.kirchensteuer ?? inputs.church_tax;
  const kirchensteuer = kirchensteuerInput === true || ['ja', 'yes', 'true', '1'].includes(String(kirchensteuerInput || '').toLowerCase());
  
  const state = String(inputs.bundesland || inputs.state || inputs.land || 'OTHER').toUpperCase();
  const kirchenRate = ['BY', 'BW', 'BAYERN', 'BADEN-WÜRTTEMBERG', 'BADEN-WUERTTEMBERG'].includes(state) ? 0.08 : 0.09;

  // Freiwillige GKV/PV Schätzung für Selbstständige (~18,3% auf Gewinn bis BBG KV)
  const kvBase = Math.min(gewinn, BBG_KV_WEST_2026);
  const kvBeitrag = kvBase * 0.183;

  // Zu versteuerndes Einkommen (Gewinn minus abziehbare Vorsorgeaufwendungen)
  const zvE = Math.max(0, gewinn - (kvBeitrag * 0.85) - 1230);
  const est = einkommensteuer(Math.round(zvE), doubled);

  const soliThreshold = doubled ? 36260 : 18130;
  const soli = est > soliThreshold ? Math.min(est * 0.055, (est - soliThreshold) * 0.119) : 0;
  const kirche = kirchensteuer ? est * kirchenRate : 0;

  const totalSteuern = est + soli + kirche;
  const totalAbgaben = totalSteuern + kvBeitrag;
  const netIncome = Math.max(0, gewinn - totalAbgaben);
  const effectiveRate = umsatz > 0 ? totalAbgaben / umsatz : 0;

  const breakdown = [
    { label: 'Jahresumsatz (Einnahmen)', value: umsatz },
    { label: 'Betriebsausgaben', value: ausgaben, isDeduction: true },
    { label: 'Reingewinn (EÜR)', value: gewinn, isTotal: true },
    { label: 'Kranken- & Pflegeversicherung (GKV freiwillig ~18,3%)', value: kvBeitrag, isDeduction: true },
    { label: 'Zu versteuerndes Einkommen (zvE estim.)', value: zvE, isTotal: true },
    { label: `Einkommensteuer (${doubled ? 'Splittingtarif' : 'Grundtarif'})`, value: est, isDeduction: true },
    ...(soli > 0 ? [{ label: 'Solidaritätszuschlag (5.5%)', value: soli, isDeduction: true }] : []),
    ...(kirche > 0 ? [{ label: `Kirchensteuer (${(kirchenRate * 100).toFixed(0)}%)`, value: kirche, isDeduction: true }] : []),
    { label: 'Netto-Reingewinn nach Abgaben', value: netIncome, isFinal: true },
  ];

  const insights: string[] = [
    'Freiberufler nach § 18 EStG (Katalogberufe) zahlen 0 € Gewerbesteuer und müssen keine Gewerbeanmeldung durchführen.',
    'Die Einkommensteuer wird auf Basis der Einnahmen-Überschuss-Rechnung (EÜR) berechnet.',
  ];

  return {
    grossIncome: umsatz,
    netIncome,
    totalTax: totalAbgaben,
    effectiveRate,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: insights,
  };
}

/** 4. Kurzarbeitergeld-Rechner (KuG & Nettoentgeltausfall) */
function calculateKurzarbeitergeld(inputs: TaxInput): TaxResult {
  const hoursContractedRaw = inputs.hours_contracted ?? inputs.soll_stunden;
  const hoursWorkedRaw = inputs.hours_worked ?? inputs.ist_stunden;
  const hourlyRateRaw = inputs.hourly_rate ?? inputs.stundenlohn;

  if (hoursContractedRaw !== undefined && hoursWorkedRaw !== undefined) {
    const hoursContracted = safeVal(hoursContractedRaw);
    const hoursWorked = safeVal(hoursWorkedRaw);
    
    if (hoursWorked > hoursContracted) {
      return {
        grossIncome: 0,
        netIncome: 0,
        totalTax: 0,
        effectiveRate: 0,
        breakdown: [],
        currency: 'EUR',
        currencySymbol: '€',
        additionalInsights: ['⚠️ Hours worked cannot exceed contracted hours. Please check your inputs.'],
      };
    }
  }

  let bruttoVollzeit = 0;
  let ausfallRatio = 0;
  let ausfallProzent = 0;

  if (hourlyRateRaw !== undefined && hoursContractedRaw !== undefined) {
    const hourlyRate = safeVal(hourlyRateRaw);
    const hoursContracted = safeVal(hoursContractedRaw);
    const hoursWorked = safeVal(hoursWorkedRaw ?? hoursContracted);

    if (hourlyRate === 0 || hoursContracted === 0) {
      return {
        grossIncome: 0,
        netIncome: 0,
        totalTax: 0,
        effectiveRate: 0,
        breakdown: [
          { label: 'Soll-Bruttogehalt (Vollzeit)', value: 0 },
          { label: 'Gesamtes Nettoeinkommen während Kurzarbeit', value: 0, isFinal: true },
        ],
        currency: 'EUR',
        currencySymbol: '€',
        additionalInsights: ['Stundenlohn oder Soll-Stunden ist 0 € — es entsteht kein Anspruch auf Kurzarbeitergeld.'],
      };
    }

    bruttoVollzeit = hoursContracted * hourlyRate * 4.33; // Monthly gross estimate
    if (hoursContracted > 0) {
      ausfallRatio = Math.max(0, (hoursContracted - hoursWorked) / hoursContracted);
      ausfallProzent = ausfallRatio * 100;
    }
  } else {
    bruttoVollzeit = safeVal(inputs.bruttolohn_vollzeit ?? inputs.gross_salary);
    ausfallProzent = safeVal(inputs.ausfall_prozent ?? 100, 0, 100);
    ausfallRatio = ausfallProzent / 100;
  }

  if (bruttoVollzeit <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [
        { label: 'Soll-Bruttogehalt (Vollzeit)', value: 0 },
        { label: 'Gesamtes Nettoeinkommen während Kurzarbeit', value: 0, isFinal: true },
      ],
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: ['Bruttogehalt ist 0 € — es entsteht kein Anspruch auf Kurzarbeitergeld.'],
    };
  }

  const kinderInput = inputs.kinder ?? inputs.children ?? inputs.has_children;
  const hatKinder = kinderInput === true || ['ja', 'yes', 'true', '1'].includes(String(kinderInput || '').toLowerCase()) || safeVal(kinderInput) > 0;

  // Pauschaliertes Netto (Vollzeit) nach BA-Tabelle (vereinfacht 80% des Brutto)
  const pauschalNettoVollzeit = bruttoVollzeit * 0.8;
  const nettoAusfall = pauschalNettoVollzeit * ausfallRatio;
  const kugRate = hatKinder ? 0.67 : 0.60;
  const kugBetrag = ausfallRatio === 0 ? 0 : nettoAusfall * kugRate;

  const istBrutto = bruttoVollzeit * (1 - ausfallRatio);
  const istNetto = istBrutto * 0.8;

  const gesamtEinkommen = istNetto + kugBetrag;
  const nettoDifferenz = Math.max(0, pauschalNettoVollzeit - gesamtEinkommen);
  const effectiveRate = bruttoVollzeit > 0 ? (bruttoVollzeit - gesamtEinkommen) / bruttoVollzeit : 0;

  const breakdown = [
    { label: 'Soll-Bruttogehalt (Vollzeit)', value: bruttoVollzeit },
    { label: 'Pauschaliertes Vollzeit-Netto (100%)', value: pauschalNettoVollzeit, isTotal: true },
    { label: `Arbeitsausfall (${ausfallProzent.toFixed(1)}%)`, value: ausfallProzent },
    { label: 'Verbleibendes Netto aus Arbeit (Ist-Netto)', value: istNetto },
    { label: `Kurzarbeitergeld (KuG ${hatKinder ? '67% mit Kind' : '60% ohne Kind'})`, value: kugBetrag, isDeduction: false },
    { label: 'Gesamtes Nettoeinkommen während Kurzarbeit', value: gesamtEinkommen, isFinal: true },
    { label: 'Netto-Einkommenseinbuße gegenüber Vollzeit', value: nettoDifferenz, isDeduction: true },
  ];

  const insights: string[] = [
    hatKinder
      ? 'Erhöhter Leistungssatz 67%: Es ist mindestens ein Kind auf der Lohnsteuerkarte eingetragen.'
      : 'Standard-Leistungssatz 60%: Kein Kind auf der Lohnsteuerkarte eingetragen.',
    ausfallRatio === 0
      ? 'Kein Arbeitsausfall (hours_worked = hours_contracted) — Kurzarbeitergeld beträgt 0 €.'
      : 'Kurzarbeitergeld ist steuerfrei, unterliegt jedoch dem Progressionsvorbehalt (§ 32b EStG). Im Folgejahr besteht daher die Pflicht zur Abgabe einer Einkommensteuererklärung.',
  ];

  return {
    grossIncome: bruttoVollzeit,
    netIncome: gesamtEinkommen,
    totalTax: Math.max(0, nettoDifferenz),
    effectiveRate,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: insights,
  };
}
