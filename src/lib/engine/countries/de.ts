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
  const grossAnnual = safeVal(inputs.gross_annual);
  const taxClass = String(inputs.tax_class || '1');
  const kirchensteuer = String(inputs.church_tax || 'no') === 'yes';
  const healthType = String(inputs.health_insurance || 'gkv');
  const zusatzbeitrag = safeVal(inputs.additional_health_contribution ?? 1.6, 0, 100) / 100;
  const state = String(inputs.state || 'OTHER');
  const kirchenRate = ['BY', 'BW'].includes(state) ? 0.08 : 0.09;

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
    kv = 300 * 12; // PKV flat estimate
  }

  const totalSV = rv + av + pv + kv;

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

  const est = einkommensteuer(Math.round(zvE), splitting, noPA);

  // ─── Solidaritätszuschlag ───
  const soli = est > 17543 ? est * 0.055 : est > 16956 ? (est - 16956) * 0.199 : 0;

  // ─── Kirchensteuer ───
  const kirche = kirchensteuer ? est * kirchenRate : 0;

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
  const gewerbeertrag = safeVal(inputs.gewerbeertrag ?? inputs.annual_profit);
  const hebesatz = safeVal(inputs.hebesatz ?? 400, 200, 1000);
  const rechtsform = String(inputs.rechtsform || inputs.legal_status || 'einzelunternehmen').toLowerCase();

  const isGmbH = rechtsform.includes('gmbh');
  const freibetrag = isGmbH ? 0 : 24500;

  // Gewerbeertrag wird auf volle 100 € abgerundet (§ 11 Abs. 1 GewStG)
  const zuVersteuernderErtrag = Math.floor(Math.max(0, gewerbeertrag - freibetrag) / 100) * 100;
  const steuermesszahl = 0.035; // 3,5% Steuermesszahl
  const steuermessbetrag = zuVersteuernderErtrag * steuermesszahl;
  const gewerbesteuer = steuermessbetrag * (hebesatz / 100);

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
  const rawAmount = safeVal(inputs.nettobetrag_oder_brutto ?? inputs.amount);
  const eingabeTyp = String(inputs.eingabe_typ || 'netto').toLowerCase();
  const mwstSatzVal = safeVal(inputs.mwst_satz ?? 19, 0, 100);
  const mwstRate = mwstSatzVal / 100;
  const kleinunternehmerInput = String(inputs.kleinunternehmer || 'nein').toLowerCase();
  const isKleinunternehmer = kleinunternehmerInput === 'ja' || kleinunternehmerInput === 'yes';
  const umsatzVorjahr = safeVal(inputs.umsatz_vorjahr);

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
    { label: `Nettobetrag`, value: netto },
    { label: `Umsatzsteuer / Mehrwertsteuer (${isKleinunternehmer ? '0% — § 19 UStG' : mwstSatzVal + '%'})`, value: mwst, isDeduction: true },
    { label: `Bruttobetrag (Rechnungsbetrag)`, value: brutto, isFinal: true },
  ];

  const insights: string[] = [];
  if (isKleinunternehmer) {
    insights.push('Gemäß Kleinunternehmerregelung (§ 19 UStG) weisen Sie keine Umsatzsteuer auf Ihren Rechnungen aus und sind von Umsatzsteuer-Voranmeldungen befreit.');
    if (umsatzVorjahr > 25000) {
      insights.push('⚠️ Hinweis: Ihr Vorjahresumsatz übersteigt 25.000 €. Sie sind 2026 voraussichtlich nicht mehr berechtigt, die Kleinunternehmerregelung zu nutzen.');
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
  const umsatz = safeVal(inputs.jahresumsatz);
  const ausgaben = safeVal(inputs.betriebsausgaben);
  const gewinn = Math.max(0, umsatz - ausgaben);
  const familienstand = String(inputs.familienstand || 'ledig').toLowerCase();
  const doubled = familienstand.includes('verheiratet');
  const kirchensteuer = String(inputs.kirchensteuer_pflichtig || 'nein').toLowerCase() === 'ja';
  const state = String(inputs.bundesland || 'OTHER');
  const kirchenRate = ['BY', 'BW'].includes(state) ? 0.08 : 0.09;

  // Freiwillige GKV/PV Schätzung für Selbstständige (~18,3% auf Gewinn bis BBG KV)
  const kvBase = Math.min(gewinn, BBG_KV_WEST_2026);
  const kvBeitrag = kvBase * 0.183;

  // Zu versteuerndes Einkommen (Gewinn minus abziehbare Vorsorgeaufwendungen)
  const zvE = Math.max(0, gewinn - (kvBeitrag * 0.85) - 1230);
  const est = einkommensteuer(Math.round(zvE), doubled);

  const soliThreshold = doubled ? 35086 : 17543;
  const soli = est > soliThreshold ? est * 0.055 : 0;
  const kirche = kirchensteuer ? est * kirchenRate : 0;

  const totalSteuern = est + soli + kirche;
  const totalAbgaben = totalSteuern + kvBeitrag;
  const netIncome = Math.max(0, gewinn - totalAbgaben);
  const effectiveRate = gewinn > 0 ? totalAbgaben / gewinn : 0;

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
    grossIncome: gewinn,
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
  const bruttoVollzeit = safeVal(inputs.bruttolohn_vollzeit);
  const hatKinder = String(inputs.kinder || 'nein').toLowerCase() === 'ja' || String(inputs.kinder) === 'yes';
  const ausfallProzent = safeVal(inputs.ausfall_prozent ?? 100, 0, 100);
  const ausfallRatio = ausfallProzent / 100;

  // Pauschaliertes Netto (Vollzeit) nach BA-Tabelle (vereinfacht 80% des Brutto)
  const pauschalNettoVollzeit = bruttoVollzeit * 0.8;
  const nettoAusfall = pauschalNettoVollzeit * ausfallRatio;
  const kugRate = hatKinder ? 0.67 : 0.60;
  const kugBetrag = nettoAusfall * kugRate;

  const istBrutto = bruttoVollzeit * (1 - ausfallRatio);
  const istNetto = istBrutto * 0.8;

  const gesamtEinkommen = istNetto + kugBetrag;
  const nettoDifferenz = pauschalNettoVollzeit - gesamtEinkommen;
  const effectiveRate = bruttoVollzeit > 0 ? (bruttoVollzeit - gesamtEinkommen) / bruttoVollzeit : 0;

  const breakdown = [
    { label: 'Soll-Bruttogehalt (Vollzeit)', value: bruttoVollzeit },
    { label: 'Pauschaliertes Vollzeit-Netto (100%)', value: pauschalNettoVollzeit, isTotal: true },
    { label: `Arbeitsausfall (${ausfallProzent}%)`, value: ausfallProzent },
    { label: 'Verbleibendes Netto aus Arbeit (Ist-Netto)', value: istNetto },
    { label: `Kurzarbeitergeld (KuG ${hatKinder ? '67% mit Kind' : '60% ohne Kind'})`, value: kugBetrag, isDeduction: false },
    { label: 'Gesamtes Nettoeinkommen während Kurzarbeit', value: gesamtEinkommen, isFinal: true },
    { label: 'Netto-Einkommenseinbuße gegenüber Vollzeit', value: nettoDifferenz, isDeduction: true },
  ];

  const insights: string[] = [
    hatKinder
      ? 'Erhöhter Leistungssatz 67%: Es ist mindestens ein Kind auf der Lohnsteuerkarte eingetragen.'
      : 'Standard-Leistungssatz 60%: Kein Kind auf der Lohnsteuerkarte eingetragen.',
    'Kurzarbeitergeld ist steuerfrei, unterliegt jedoch dem Progressionsvorbehalt (§ 32b EStG). Im Folgejahr besteht daher die Pflicht zur Abgabe einer Einkommensteuererklärung.',
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
