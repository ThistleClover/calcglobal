// src/lib/engine/countries/it.ts
// Italy Financial & Tax Engine — 2025/2026 Tax Rules (Riforma Fiscale IRPEF a 3 scaglioni)
// Sources: Agenzia delle Entrate (agenziaentrate.gov.it), INPS, TUIR (D.P.R. 917/1986)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'calcolo-stipendio-netto-ral');

  switch (calcId) {
    case 'calcolo-partita-iva-forfettario':
      return calculatePartitaIvaForfettario(inputs);
    case 'calcolo-tfr-buona-uscita':
      return calculateTfr(inputs);
    case 'calcolo-tasse-acquisto-casa-imposta-registro':
      return calculateTasseImmobiliari(inputs);
    case 'calcolo-fattura-elettronica-ritenuta-acconto':
      return calculateFatturaElettronica(inputs);
    case 'calcolo-stipendio-netto-ral':
    default:
      return calculateStipendioNetto(inputs);
  }
}

// IRPEF a 3 Scaglioni (Riforma Fiscale 2024 / 2025 / 2026)
function calculateIrpefScaglioni(imponibileIrpef: number): number {
  if (imponibileIrpef <= 0) return 0;
  let impostaLorda = 0;
  if (imponibileIrpef <= 28000) {
    impostaLorda = imponibileIrpef * 0.23;
  } else if (imponibileIrpef <= 50000) {
    impostaLorda = 28000 * 0.23 + (imponibileIrpef - 28000) * 0.35;
  } else {
    impostaLorda = 28000 * 0.23 + 22000 * 0.35 + (imponibileIrpef - 50000) * 0.43;
  }
  return impostaLorda;
}

// 1. Calcolo Stipendio Netto da RAL (Riforma IRPEF 2025/2026)
function calculateStipendioNetto(inputs: TaxInput): TaxResult {
  const ral = safeVal(inputs.ral_annua ?? inputs.ral ?? inputs.salary);
  const mensilita = safeVal(inputs.mensilita, 13);
  const tipoContratto = String(inputs.tipo_contratto || 'tempo_indeterminato');
  const regione = String(inputs.regione || 'lombardia');
  const figli = safeVal(inputs.numero_figli_carico, 0);

  if (ral <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Retribuzione Annua Lorda (RAL)', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // 1. Contributi Previdenziali INPS a carico del lavoratore (9.19%, apprendistato 5.84%)
  const aliquotaInps = tipoContratto === 'apprendistato' ? 0.0584 : 0.0919;
  const contributiInps = ral * aliquotaInps;

  // Imponibile Fiscale IRPEF
  const imponibileIrpef = Math.max(0, ral - contributiInps);

  // 2. IRPEF Lorda
  const irpefLorda = calculateIrpefScaglioni(imponibileIrpef);

  // 3. Detrazione da Lavoro Dipendente (Art. 13 TUIR - 1.955 € fino a 15.000 €)
  let detrazioneLavoro = 0;
  if (imponibileIrpef <= 15000) {
    detrazioneLavoro = 1955;
  } else if (imponibileIrpef <= 28000) {
    detrazioneLavoro = 1955 + 1190 * ((28000 - imponibileIrpef) / 13000);
  } else if (imponibileIrpef <= 50000) {
    detrazioneLavoro = 1910 * ((50000 - imponibileIrpef) / 22000);
  }

  // 4. Detrazione Carichi di Famiglia (figli > 21 anni, per < 21 c'è Assegno Unico INPS)
  const detrazioneFigli = figli * 150;

  const totaleDetrazioni = Math.min(irpefLorda, detrazioneLavoro + detrazioneFigli);
  const irpefNetta = Math.max(0, irpefLorda - totaleDetrazioni);

  // 5. Addizionali Regionale e Comunale
  let aliquotaRegionale = 0.0173; // Lombardia default ~1.73%
  if (regione === 'lazio') aliquotaRegionale = 0.0333;
  else if (regione === 'campania') aliquotaRegionale = 0.0203;
  else if (regione === 'piemonte') aliquotaRegionale = 0.0225;

  const addizionaleRegionale = imponibileIrpef * aliquotaRegionale;
  const addizionaleComunale = imponibileIrpef * 0.008; // Media 0.8%

  // 6. Beneficio Taglio Cuneo Fiscale / Trattamento Integrativo 2025/2026
  let bonusCuneo = 0;
  if (ral <= 25000) {
    bonusCuneo = 1200; // ~100 €/mese
  } else if (ral <= 35000) {
    bonusCuneo = 960; // ~80 €/mese
  } else if (ral <= 40000) {
    bonusCuneo = 480;
  }

  const totaleTasse = irpefNetta + addizionaleRegionale + addizionaleComunale + contributiInps - bonusCuneo;
  const nettoAnnuale = Math.max(0, ral - (irpefNetta + addizionaleRegionale + addizionaleComunale + contributiInps) + bonusCuneo);
  const nettoMensile = nettoAnnuale / mensilita;

  const breakdown = [
    { label: 'Retribuzione Annua Lorda (RAL)', value: ral },
    { label: `Contributi Previdenziali INPS (${(aliquotaInps * 100).toFixed(2)}%)`, value: contributiInps, isDeduction: true },
    { label: 'Imponibile Fiscale IRPEF Netto INPS', value: imponibileIrpef, isTotal: true },
    { label: 'IRPEF Lorda (Scaglioni 23% / 35% / 43%)', value: irpefLorda },
    { label: 'Detrazioni da Lavoro Dipendente Applicate', value: detrazioneLavoro, isDeduction: false },
    { label: 'IRPEF Netta Dovuta', value: irpefNetta, isDeduction: true },
    { label: `Addizionale Regionale (${(aliquotaRegionale * 100).toFixed(2)}%)`, value: addizionaleRegionale, isDeduction: true },
    { label: 'Addizionale Comunale (0,80%)', value: addizionaleComunale, isDeduction: true },
    ...(bonusCuneo > 0 ? [{ label: 'Bonus / Sgravio Cuneo Fiscale Integrativo', value: bonusCuneo }] : []),
    { label: 'Stipendio Netto Annuo Totale', value: nettoAnnuale, isFinal: true },
    { label: `Stipendio Netto Mensile (${mensilita} mensilità)`, value: Math.round(nettoMensile), isTotal: true },
  ];

  return {
    grossIncome: ral,
    netIncome: nettoAnnuale,
    totalTax: totaleTasse,
    effectiveRate: totaleTasse / ral,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      `La percentuale netta in busta paga corrisponde al ${( (nettoAnnuale / ral) * 100 ).toFixed(1)}% della tua RAL lorda.`,
      `La riforma IRPEF a 3 aliquote (23% fino a 28k, 35% da 28k a 50k, 43% oltre 50k) consolida il risparmio fiscale per i redditi medio-bassi.`,
    ],
  };
}

// 2. Regime Forfettario Partita IVA 2025/2026 (Max 85.000 €)
function calculatePartitaIvaForfettario(inputs: TaxInput): TaxResult {
  const fatturato = safeVal(inputs.fatturato_annuo ?? inputs.fatturato ?? inputs.revenue);
  const coeff = safeVal(inputs.coefficiente_redditivita || '78') / 100;
  const aliquotaImposta = safeVal(inputs.aliquota_imposta_sostitutiva || '5') / 100; // 5% startup or 15% standard
  const gestione = String(inputs.gestione_previdenziale || 'inps_gestione_separata_2607');
  const contributiVersatiPrec = safeVal(inputs.contributi_inps_versati_anno_prec, 0);

  if (fatturato <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Fatturato Annuo Incassato', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // 1. Reddito Lordo Forfettario
  const redditoForfettario = fatturato * coeff;

  // 2. Contributi Previdenziali INPS Anno Corrente
  let aliquotaInps = 0.2607; // Gestione Separata 26.07%
  let inpsCorrente = 0;

  if (gestione.includes('gestione_separata')) {
    aliquotaInps = 0.2607;
    inpsCorrente = redditoForfettario * aliquotaInps;
  } else if (gestione.includes('artigiani_commercianti')) {
    // Fisso minimo 4.400 € (con riduzione forfettario 35% -> ~2.860 €)
    const minimale = 18415;
    const quotaFissa = 4400 * 0.65;
    const quotaEccedenza = redditoForfettario > minimale ? (redditoForfettario - minimale) * 0.2448 * 0.65 : 0;
    inpsCorrente = quotaFissa + quotaEccedenza;
  } else {
    // Cassa professionale autonoma (es. Inarcassa, Cassa Forense ~14.5% - 17%)
    inpsCorrente = redditoForfettario * 0.15;
  }

  // 3. Base Imponibile Imposta Sostitutiva (Reddito Forfettario - Contributi versati nell'anno)
  const deduzioneInps = contributiVersatiPrec > 0 ? contributiVersatiPrec : inpsCorrente;
  const imponibileFiscale = Math.max(0, redditoForfettario - deduzioneInps);

  // 4. Imposta Sostitutiva (5% o 15%)
  const impostaSostitutiva = imponibileFiscale * aliquotaImposta;

  const totaleTributi = inpsCorrente + impostaSostitutiva;
  const nettoInTasca = fatturato - totaleTributi;

  const breakdown = [
    { label: 'Fatturato Lordo Annuo Incassato', value: fatturato },
    { label: `Spese Forfettarie Riconosciute Senza Fatture (${( (1 - coeff) * 100 ).toFixed(0)}%)`, value: fatturato * (1 - coeff), isDeduction: true },
    { label: `Reddito Imponibile Lordo (Coefficiente ${(coeff * 100).toFixed(0)}%)`, value: redditoForfettario, isTotal: true },
    { label: `Contributi Previdenziali Dovuti (${gestione.includes('separata') ? 'Gestione Separata 26,07%' : 'Contributi Cassa/INPS'})`, value: inpsCorrente, isDeduction: true },
    { label: `Imposta Sostitutiva Forfettaria (${(aliquotaImposta * 100).toFixed(0)}%)`, value: impostaSostitutiva, isDeduction: true },
    { label: 'Totale Tasse e Contributi INPS', value: totaleTributi, isTotal: true },
    { label: 'Netto Reale in Tasca (Guadagno Pulito)', value: nettoInTasca, isFinal: true },
    { label: 'Netto Mensile Medio (12 mesi)', value: Math.round(nettoInTasca / 12), isTotal: true },
  ];

  return {
    grossIncome: fatturato,
    netIncome: nettoInTasca,
    totalTax: totaleTributi,
    effectiveRate: totaleTributi / fatturato,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    quarterlyPayment: Math.round(totaleTributi / 4),
    additionalInsights: [
      `La pressione fiscale e previdenziale effettiva sul fatturato incassato è di appena il ${( (totaleTributi / fatturato) * 100 ).toFixed(1)}%.`,
      `Nel regime forfettario non si applica né si addebita l'IVA in fattura e si è esenti dalla ritenuta d'acconto del 20%.`,
      fatturato > 85000
        ? `Attenzione: Il fatturato supera la soglia di 85.000 €. Se supera 100.000 € si esce immediatamente dal regime in corso d'anno.`
        : `Il fatturato è entro il limite legale di 85.000 €/anno per mantenere il regime forfettario.`,
    ],
  };
}

// 3. Calcolo TFR Trattamento di Fine Rapporto
function calculateTfr(inputs: TaxInput): TaxResult {
  const ral = safeVal(inputs.retribuzione_annua_lorda ?? inputs.ral);
  const anni = safeVal(inputs.anni_servizio ?? inputs.years, 5);
  const fondo = String(inputs.tfr_accantonato_fondo || 'in_azienda');

  if (ral <= 0 || anni <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Retribuzione Annua Lorda (RAL)', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // Accantonamento annuo = RAL / 13.5 (meno 0.50% contributo INPS = 6.91% lordo della RAL)
  const quotaAnnua = (ral / 13.5) - (ral * 0.005);
  const tfrLordoMaturato = quotaAnnua * anni * 1.06; // Con rivalutazione cumulata stimata

  let aliquotaTassazione = 0.23; // Tassazione separata aliquota media in azienda (min 23%)
  if (fondo === 'fondo_pensione_complementare') {
    // Fondo pensione: 15% riducibile dello 0.30% all'anno oltre il 15° anno fino al 9%
    aliquotaTassazione = Math.max(0.09, 0.15 - Math.max(0, anni - 15) * 0.003);
  }

  const impostaTfr = tfrLordoMaturato * aliquotaTassazione;
  const tfrNettoLiquidazione = tfrLordoMaturato - impostaTfr;

  const breakdown = [
    { label: 'Retribuzione Annua Utile di Riferimento', value: ral },
    { label: `Anni di Servizio Maturati (${anni} anni)`, value: anni },
    { label: 'TFR Lordo Totale Accumulato', value: tfrLordoMaturato, isTotal: true },
    { label: `Imposta Fiscale (${fondo === 'fondo_pensione_complementare' ? `Tassazione Agevolata Fondo ${(aliquotaTassazione * 100).toFixed(1)}%` : `Tassazione Separata IRPEF ${(aliquotaTassazione * 100).toFixed(1)}%`})`, value: impostaTfr, isDeduction: true },
    { label: 'TFR Netto Liquidato al Dipendente', value: tfrNettoLiquidazione, isFinal: true },
  ];

  return {
    grossIncome: tfrLordoMaturato,
    netIncome: tfrNettoLiquidazione,
    totalTax: impostaTfr,
    effectiveRate: aliquotaTassazione,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      fondo === 'fondo_pensione_complementare'
        ? `Destinare il TFR al Fondo Pensione consente una tassazione agevolata dal 15% fino al 9%, contro il 23%-43% della tassazione ordinaria.`
        : `Il TFR lasciato in azienda è soggetto a tassazione separata calcolata dall'Agenzia delle Entrate con l'aliquota media IRPEF degli ultimi 5 anni.`,
    ],
  };
}

// 4. Imposte Acquisto Casa (Imposta di Registro, Catastale, Ipotecaria)
function calculateTasseImmobiliari(inputs: TaxInput): TaxResult {
  const prezzo = safeVal(inputs.prezzo_acquisto ?? inputs.price);
  const rendita = safeVal(inputs.valore_catastale_rendita, (prezzo * 0.6) / 115.5);
  const tipo = String(inputs.tipo_acquisto || 'prima_casa_da_privato');
  const isUnder36 = String(inputs.under_36_isee || 'no').includes('si');
  const notaio = safeVal(inputs.onorario_notaio_stimato, 1800);
  const agenzia = safeVal(inputs.frais_agenzia_immobiliare, prezzo * 0.03 * 1.22);

  if (prezzo <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Prezzo di Acquisto', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // Prezzo-valore per acquisto da privato: Rendita catastale * 1.05 * 110 (prima casa) o * 120 (seconda casa)
  const isPrimaCasa = tipo.includes('prima_casa');
  const isImpresa = tipo.includes('impresa');

  const moltiplicatore = isPrimaCasa ? 115.5 : 126.0;
  const baseImponibileCatastale = isImpresa ? prezzo : Math.max(prezzo * 0.5, rendita * moltiplicatore);

  let impostaRegistro = 0;
  let impostaIva = 0;
  let impostaIpotecaria = 50;
  let impostaCatastale = 50;

  if (isUnder36 && isPrimaCasa) {
    impostaRegistro = 0;
    impostaIpotecaria = 0;
    impostaCatastale = 0;
  } else if (isPrimaCasa && !isImpresa) {
    impostaRegistro = Math.max(1000, baseImponibileCatastale * 0.02);
  } else if (!isPrimaCasa && !isImpresa) {
    impostaRegistro = Math.max(1000, baseImponibileCatastale * 0.09);
  } else if (isPrimaCasa && isImpresa) {
    impostaIva = prezzo * 0.04;
    impostaRegistro = 200;
    impostaIpotecaria = 200;
    impostaCatastale = 200;
  } else if (!isPrimaCasa && isImpresa) {
    impostaIva = prezzo * 0.10;
    impostaRegistro = 200;
    impostaIpotecaria = 200;
    impostaCatastale = 200;
  }

  const totaleImposteStato = impostaRegistro + impostaIva + impostaIpotecaria + impostaCatastale;
  const totaleSpeseAccessorie = totaleImposteStato + notaio + agenzia;
  const costoComplessivo = prezzo + totaleSpeseAccessorie;

  const breakdown = [
    { label: 'Prezzo di Compravendita Immobile', value: prezzo },
    { label: `Valore Catastale di Riferimento (Regola Prezzo-Valore)`, value: baseImponibileCatastale },
    ...(impostaIva > 0 ? [{ label: 'IVA Costruttore (4% o 10%)', value: impostaIva, isDeduction: true }] : []),
    { label: `Imposta di Registro (${isPrimaCasa ? '2%' : '9%'})`, value: impostaRegistro, isDeduction: true },
    { label: 'Imposte Ipotecaria e Catastale Fisse', value: impostaIpotecaria + impostaCatastale, isDeduction: true },
    { label: 'Onorario Notarile Stimato (Rogito + IVA)', value: notaio, isDeduction: true },
    ...(agenzia > 0 ? [{ label: 'Provvigione Agenzia Immobiliare (3% + IVA)', value: agenzia, isDeduction: true }] : []),
    { label: 'Totale Imposte e Spese Notarili / Agenzia', value: totaleSpeseAccessorie, isTotal: true },
    { label: 'Budget Totale Necessario per l\'Acquisto', value: costoComplessivo, isFinal: true },
  ];

  return {
    grossIncome: prezzo,
    netIncome: costoComplessivo,
    totalTax: totaleSpeseAccessorie,
    effectiveRate: totaleSpeseAccessorie / prezzo,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      `Grazie alla regola del 'prezzo-valore', le imposte di registro per gli acquisti da privati si calcolano sul valore catastale e non sul prezzo effettivo di compravendita.`,
      isPrimaCasa
        ? `Acquisto Prima Casa: Imposta di registro ridotta al 2% (invece del 9% ordinario).`
        : `Acquisto Seconda Casa: Imposta di registro al 9% con minimo di 1.000 €.`,
    ],
  };
}

// 5. Calcolo Fattura Elettronica, Rivalsa INPS e Ritenuta d'Acconto
function calculateFatturaElettronica(inputs: TaxInput): TaxResult {
  const compenso = safeVal(inputs.compenso_lordo ?? inputs.compenso);
  const regime = String(inputs.tipo_regime || 'forfettario');
  const cassa = String(inputs.cassa_previdenza_tipo || 'rivalsa_inps_4');
  const ivaRate = safeVal(inputs.aliquota_iva || '22') / 100;
  const speseArt15 = safeVal(inputs.spese_anticipate_art15, 0);

  if (compenso <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Compenso Professionale', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // Rivalsa Cassa / INPS (4%)
  const rivalsRate = cassa !== 'nessuna' ? 0.04 : 0;
  const rivalsImporto = compenso * rivalsRate;

  // Base Imponibile IVA
  const imponibileIva = compenso + rivalsImporto;
  const isForfettario = regime === 'forfettario';
  const importoIva = isForfettario ? 0 : imponibileIva * ivaRate;

  // Marca da bollo 2,00 € per fatture in regime forfettario > 77,47 €
  const marcaBollo = isForfettario && compenso > 77.47 ? 2.00 : 0;

  // Totale Fattura a carico del cliente
  const totaleFattura = compenso + rivalsImporto + importoIva + speseArt15 + marcaBollo;

  // Ritenuta d'acconto (20% solo per regime ordinario, non applicata su cassa professionale)
  let ritenutaAcconto = 0;
  if (!isForfettario) {
    ritenutaAcconto = (compenso + (cassa === 'rivalsa_inps_4' ? rivalsImporto : 0)) * 0.20;
  }

  // Netto da Bonificare / Incassare
  const nettoIncasso = totaleFattura - ritenutaAcconto;

  const breakdown = [
    { label: 'Compenso Professionale Base', value: compenso },
    ...(rivalsImporto > 0 ? [{ label: `Rivalsa Previdenziale (${(rivalsRate * 100).toFixed(0)}% ${cassa === 'rivalsa_inps_4' ? 'INPS' : 'Cassa Professionale'})`, value: rivalsImporto }] : []),
    { label: 'Imponibile Fiscale Fattura', value: imponibileIva, isTotal: true },
    ...(importoIva > 0 ? [{ label: `IVA di Legge (${(ivaRate * 100).toFixed(0)}%)`, value: importoIva }] : []),
    ...(marcaBollo > 0 ? [{ label: 'Marca da Bollo Virtuale (Art. 73 DPR 642/72)', value: marcaBollo }] : []),
    ...(speseArt15 > 0 ? [{ label: 'Spese Anticipate in Nome e Conto (Art. 15 DPR 633/72)', value: speseArt15 }] : []),
    { label: 'Totale Documento / Fattura Emessa', value: totaleFattura, isTotal: true },
    ...(ritenutaAcconto > 0 ? [{ label: 'Ritenuta d\'Acconto IRPEF (20% a carico committente)', value: ritenutaAcconto, isDeduction: true }] : []),
    { label: 'Netto Effettivo da Incassare (Bonifico)', value: nettoIncasso, isFinal: true },
  ];

  return {
    grossIncome: totaleFattura,
    netIncome: nettoIncasso,
    totalTax: ritenutaAcconto + importoIva,
    effectiveRate: totaleFattura > 0 ? (ritenutaAcconto + importoIva) / totaleFattura : 0,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      isForfettario
        ? `Operazione effettuata ai sensi dell'art. 1, commi da 54 a 89, Legge n. 190/2014 e succ. modifiche. Non soggetta ad IVA e non soggetta a ritenuta d'acconto.`
        : `Il cliente verserà la ritenuta d'acconto di ${Math.round(ritenutaAcconto).toLocaleString('it-IT')} € all'Erario con Modello F24 entro il 16 del mese successivo.`,
    ],
  };
}
