// src/lib/engine/countries/fr.ts
// France Financial Calculator Engine — 2026 Tax Year
// Sources: URSSAF, Code du travail, Code général des impôts (CGI), Notaires de France

import type { TaxInput, TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'urssaf-cotisations-micro-entreprise');

  interface ActivityConfig {
    urssafRate: number;
    urssafRateACRE: number;
    cfpRate: number;
    vlRate: number;
    abattementIR: number;
    plafondCA: number;
  }

  const ACTIVITY: Record<string, ActivityConfig> = {
    bnc_liberal:   { urssafRate: 0.231, urssafRateACRE: 0.116, cfpRate: 0.002, vlRate: 0.022, abattementIR: 0.34, plafondCA: 77700 },
    bic_services:  { urssafRate: 0.212, urssafRateACRE: 0.106, cfpRate: 0.003, vlRate: 0.017, abattementIR: 0.50, plafondCA: 77700 },
    achat_vente:   { urssafRate: 0.123, urssafRateACRE: 0.062, cfpRate: 0.001, vlRate: 0.010, abattementIR: 0.71, plafondCA: 188700 },
    liberal_cipav: { urssafRate: 0.232, urssafRateACRE: 0.116, cfpRate: 0.002, vlRate: 0.022, abattementIR: 0.34, plafondCA: 77700 },
  };

  function applyFrenchIR(revenuImposable: number): number {
    if (revenuImposable <= 11497) return 0;
    let ir = 0;
    let rem = revenuImposable;
    if (rem > 180294) { ir += (rem - 180294) * 0.45; rem = 180294; }
    if (rem > 83823)  { ir += (rem - 83823) * 0.41;  rem = 83823;  }
    if (rem > 29315)  { ir += (rem - 29315) * 0.30;  rem = 29315;  }
    if (rem > 11497)  { ir += (rem - 11497) * 0.11; }
    return ir;
  }

  // --- 1. FRAIS DE NOTAIRE IMMOBILIER ---
  function calculateNotaryFees(inps: TaxInput): TaxResult {
    const propertyPrice = Math.max(0, parseFloat(String(inps.prix_bien || inps.property_price || 0)) || 0);
    const propertyType = String(inps.type_bien || inps.property_type || 'ancien');
    const deptRateType = String(inps.departement_type || inps.department_tax_rate || 'standard_45');
    const guarantee = String(inps.mortgage_guarantee || 'none');

    // Droits de mutation / Taxe de publicité foncière
    let mutationTaxRate = 0.0580665; // Standard 4.5% + 1.2% + frais d'assiette 2.37% de 4.5%
    if (propertyType === 'neuf') {
      mutationTaxRate = 0.00715; // Taxe publicité foncière réduite 0.715%
    } else if (deptRateType === 'reduced_38' || deptRateType === 'reduit') {
      mutationTaxRate = 0.0509006; // 3.8% + 1.2% + frais d'assiette
    } else if (deptRateType === 'increased_50') {
      mutationTaxRate = 0.063185; // 5.0% + 1.2% + frais d'assiette
    }

    const droitsMutation = propertyPrice * mutationTaxRate;

    // Émoluments du notaire HT (Barème dégressif légal)
    let emolumentsHT = 0;
    if (propertyPrice > 0) {
      const p1 = Math.min(propertyPrice, 6500) * 0.03870;
      const p2 = propertyPrice > 6500 ? Math.min(propertyPrice - 6500, 10500) * 0.01596 : 0;
      const p3 = propertyPrice > 17000 ? Math.min(propertyPrice - 17000, 43000) * 0.01030 : 0;
      const p4 = propertyPrice > 60000 ? (propertyPrice - 60000) * 0.00799 : 0;
      emolumentsHT = p1 + p2 + p3 + p4;
    }
    const emolumentsTTC = emolumentsHT * 1.20; // TVA 20%

    // Contribution de Sécurité Immobilière (CSI - 0.10%, min 15 €)
    const csi = propertyPrice > 0 ? Math.max(15, propertyPrice * 0.001) : 0;

    // Débours et démarches administratives
    const debours = propertyType === 'neuf' ? 800 : 1200;

    // Garantie bancaire éventuelle (Crédit logement ou Hypothèque)
    let fraisGarantie = 0;
    if (guarantee === 'caution') {
      fraisGarantie = propertyPrice * 0.8 * 0.012; // ~1.2% sur 80% du bien
    } else if (guarantee === 'hypotheque') {
      fraisGarantie = propertyPrice * 0.8 * 0.015; // ~1.5% sur 80% du bien
    }

    const totalFrais = droitsMutation + emolumentsTTC + csi + debours + fraisGarantie;
    const effectiveRate = propertyPrice > 0 ? totalFrais / propertyPrice : 0;

    const breakdown = [
      { label: `Prix d'achat du bien`, value: propertyPrice },
      { label: `Droits de mutation / Taxe de publicité foncière (${(mutationTaxRate * 100).toFixed(2)}%)`, value: droitsMutation, isDeduction: true },
      { label: `Émoluments du notaire (TVA 20% incluse)`, value: emolumentsTTC, isDeduction: true },
      { label: `Contribution de Sécurité Immobilière (CSI 0,10%)`, value: csi, isDeduction: true },
      { label: `Débours et pièces administratives (estimé)`, value: debours, isDeduction: true },
      ...(fraisGarantie > 0 ? [{ label: `Frais de garantie de prêt (${guarantee === 'caution' ? 'Caution' : 'Hypothèque'})`, value: fraisGarantie, isDeduction: true }] : []),
      { label: `Total des frais d'acquisition (frais de notaire)`, value: totalFrais, isFinal: true },
    ];

    const insights = [
      `Les frais d'acquisition représentent environ ${(effectiveRate * 100).toFixed(1)}% du prix d'achat du bien.`,
      `Les émoluments du notaire (${Math.round(emolumentsTTC).toLocaleString('fr-FR')} € TTC) sont strictement fixés par le barème réglementé national.`,
      propertyType === 'neuf'
        ? `Pour un logement neuf (VEFA), les frais de notaire sont réduits (2% à 3%) car la TVA 20% est déjà incluse dans le prix de vente.`
        : `Pour un logement ancien, les droits de mutation reversés à l'État et aux collectivités constituent environ 80% du total des frais.`
    ];

    return {
      grossIncome: propertyPrice,
      netIncome: Math.max(0, propertyPrice - totalFrais),
      totalTax: totalFrais,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  // --- 2. CALCULATEUR SALAIRE BRUT-NET ET COÛT EMPLOYEUR ---
  function calculateGrossToNet(inps: TaxInput): TaxResult {
    const rawSalary = Math.max(0, parseFloat(String(inps.salaire_brut_mensuel || inps.gross_salary || 0)) || 0);
    const period = String(inps.period || 'monthly');
    const statut = String(inps.statut || inps.status || 'non_cadre');
    const pasRate = Math.max(0, parseFloat(String(inps.pas_rate || 0)) || 0) / 100;

    let brutAnnuel = rawSalary;
    if (period === 'monthly') brutAnnuel = rawSalary * 12;
    else if (period === 'annual_13') brutAnnuel = rawSalary;

    const monthsInYear = period === 'annual_13' ? 13 : 12;
    const brutMensuel = brutAnnuel / monthsInYear;

    // Cotisations salariales moyennes 2026
    const rateSalarial = statut === 'cadre' ? 0.248 : (statut === 'fonctionnaire' ? 0.165 : 0.217);
    const cotisSalariales = brutAnnuel * rateSalarial;

    // Mutuelle et tickets resto (part salariale)
    const mutuelleSalarie = (parseFloat(String(inps.mutuelle_mensuelle || 40)) || 40) * 12;
    const trSalarie = (parseFloat(String(inps.tickets_restaurant_part_salarie || 0)) || 0) * 12;

    const netAvantImpotAnnuel = Math.max(0, brutAnnuel - cotisSalariales - mutuelleSalarie - trSalarie);
    const netAvantImpotMensuel = netAvantImpotAnnuel / monthsInYear;

    // Net imposable (net avant impôt + CSG non déductible 2.9% sur 98.25% brut + part patronale mutuelle)
    const csgNonDeductible = brutAnnuel * 0.9825 * 0.029;
    const netImposableAnnuel = netAvantImpotAnnuel + csgNonDeductible + mutuelleSalarie;

    // Impôt à la source (PAS)
    const impotPASAnnuel = netImposableAnnuel * pasRate;
    const netAPayerAnnuel = Math.max(0, netAvantImpotAnnuel - impotPASAnnuel);
    const netAPayerMensuel = netAPayerAnnuel / monthsInYear;

    // Cotisations patronales & Réduction Fillon (2026)
    const smicAnnuel2026 = 1802 * 12; // SMIC brut 2026 ~ 1 802 €/mois
    let reductionFillon = 0;
    if (brutAnnuel <= 1.6 * smicAnnuel2026 && brutAnnuel > 0) {
      const ratio = (1.6 * smicAnnuel2026 / brutAnnuel) - 1;
      const coeffFillon = Math.min(0.3191, Math.max(0, (0.3191 / 0.6) * ratio));
      reductionFillon = brutAnnuel * coeffFillon;
    }

    const companySize = String(inps.company_size || 'less_11');
    const basePatronalRate = (statut === 'cadre' ? 0.44 : 0.42) + (companySize === 'more_11' ? 0.03 : 0);
    const coutEmployeurTotalAnnuel = brutAnnuel * (1 + basePatronalRate) + mutuelleSalarie;
    const coutEmployeurTotalMensuel = coutEmployeurTotalAnnuel / monthsInYear;

    const totalDeductions = cotisSalariales + impotPASAnnuel;
    const effectiveRate = brutAnnuel > 0 ? totalDeductions / brutAnnuel : 0;

    const breakdown = [
      { label: `Salaire brut annuel`, value: brutAnnuel },
      { label: `Cotisations sociales salariales (${(rateSalarial * 100).toFixed(1)}% - CSG/CRDS, retraite, prévoyance)`, value: cotisSalariales, isDeduction: true },
      ...(mutuelleSalarie > 0 ? [{ label: `Cotisation mutuelle d'entreprise (part salariale)`, value: mutuelleSalarie, isDeduction: true }] : []),
      ...(trSalarie > 0 ? [{ label: `Tickets-restaurant (part salariale)`, value: trSalarie, isDeduction: true }] : []),
      { label: `Salaire net avant impôt (annuel)`, value: netAvantImpotAnnuel, isTotal: true },
      { label: `Salaire net avant impôt (mensuel)`, value: netAvantImpotMensuel, isTotal: true },
      ...(impotPASAnnuel > 0 ? [{ label: `Prélèvement à la source PAS (${(pasRate * 100).toFixed(1)}%)`, value: impotPASAnnuel, isDeduction: true }] : []),
      { label: `Salaire net à payer après impôt (mensuel)`, value: netAPayerMensuel, isFinal: true },
      { label: `Net imposable annuel (base PAS)`, value: netImposableAnnuel, isTotal: true },
      { label: `Coût total employeur (annuel)`, value: coutEmployeurTotalAnnuel, isTotal: true },
      { label: `Coût total employeur (mensuel)`, value: coutEmployeurTotalMensuel, isTotal: true },
    ];

    const insights = [
      `Pour un salaire brut mensuel de ${Math.round(brutMensuel).toLocaleString('fr-FR')} €, votre salaire net mensuel avant impôt est de ${Math.round(netAvantImpotMensuel).toLocaleString('fr-FR')} €.`,
      `Le coût total pour l'entreprise est de ${Math.round(coutEmployeurTotalMensuel).toLocaleString('fr-FR')} € par mois.`
    ];

    return {
      grossIncome: brutAnnuel,
      netIncome: netAPayerAnnuel,
      totalTax: totalDeductions,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  // --- 3. INDEMNITÉ DE RUPTURE CONVENTIONNELLE / LICENCIEMENT ---
  function calculateSeverance(inps: TaxInput): TaxResult {
    const refSalary = Math.max(0, parseFloat(String(inps.salaire_brut_mensuel_moyen || inps.reference_salary || 0)) || 0);
    const years = Math.max(0, parseFloat(String(inps.annees_anciennete || inps.seniority_years || 0)) || 0);
    const months = Math.max(0, Math.min(11, parseFloat(String(inps.seniority_months || 0)) || 0));
    const totalYears = years + (months / 12);
    const typeRupture = String(inps.type_rupture || inps.convention_type || 'rupture_conventionnelle');

    // Code du Travail Art. R1234-2: 1/4 mois jusqu'à 10 ans + 1/3 mois au-delà
    const yearsUnder10 = Math.min(totalYears, 10);
    const yearsOver10 = Math.max(0, totalYears - 10);
    let indemniteLegale = (yearsUnder10 * 0.25 * refSalary) + (yearsOver10 * (1 / 3) * refSalary);

    if (totalYears < (8 / 12)) {
      indemniteLegale = 0; // Moins de 8 mois d'ancienneté
    }

    let indemniteBrute = indemniteLegale;
    if (typeRupture === 'syntec') {
      indemniteBrute = Math.max(indemniteLegale, (yearsUnder10 * (1 / 3) * refSalary) + (yearsOver10 * 0.6 * refSalary));
    }

    // Exonération IR (CGI Art. 80.8): max(indemniteLegale, 2 * brutAnnuel, 50% indemnité) plafonné à 6 PASS (278 208 €)
    const pass2026 = 46368;
    const maxExoIR = Math.min(6 * pass2026, Math.max(indemniteLegale, 2 * 12 * refSalary, 0.5 * indemniteBrute));
    const partExonereeIR = Math.min(indemniteBrute, maxExoIR);
    const partImposableIR = Math.max(0, indemniteBrute - partExonereeIR);

    // Exonération cotisations sociales: part exonérée IR plafonnée à 2 PASS (92 736 €)
    const maxExoSociale = Math.min(2 * pass2026, partExonereeIR);
    const partExonereeSociale = Math.min(indemniteBrute, maxExoSociale);

    // CSG/CRDS 9.7% sur part au-delà de l'indemnité légale
    const baseCSG = Math.max(0, indemniteBrute - indemniteLegale);
    const csgAmount = baseCSG * 0.9825 * 0.0970;

    const netEstime = Math.max(0, indemniteBrute - csgAmount);

    // Contribution patronale spécifique rupture
    let contributionPatronale = 0;
    if (typeRupture === 'syntec' || typeRupture === 'rupture_conventionnelle' || typeRupture === 'legal' || typeRupture === 'metallurgie' || typeRupture === 'custom_multiplier') {
      contributionPatronale = partExonereeSociale * 0.30;
    } else {
      const supraLegale = Math.max(0, indemniteBrute - indemniteLegale);
      contributionPatronale = supraLegale * 0.30;
    }
    const coutEmployeurTotal = indemniteBrute + contributionPatronale;

    const effectiveRate = indemniteBrute > 0 ? csgAmount / indemniteBrute : 0;

    const breakdown = [
      { label: `Salaire de référence brut mensuel`, value: refSalary },
      { label: `Ancienneté retenue (${totalYears.toFixed(2)} ans)`, value: totalYears },
      { label: `Indemnité légale minimale du Code du travail`, value: indemniteLegale },
      { label: `Indemnité brute totale accordée`, value: indemniteBrute, isTotal: true },
      { label: `Part exonérée d'impôt sur le revenu (plafond 6 PASS)`, value: partExonereeIR },
      ...(partImposableIR > 0 ? [{ label: `Part imposable à l'impôt sur le revenu`, value: partImposableIR, isDeduction: true }] : []),
      ...(csgAmount > 0 ? [{ label: `CSG/CRDS (9,7% sur la part supra-légale)`, value: csgAmount, isDeduction: true }] : []),
      { label: `Indemnité nette estimée perçue par le salarié`, value: netEstime, isFinal: true },
      ...(contributionPatronale > 0 ? [{ label: `Contribution patronale spécifique (30% sur part exonérée)`, value: contributionPatronale, isDeduction: true }] : []),
      { label: `Coût total pour l'employeur`, value: coutEmployeurTotal, isTotal: true },
    ];

    const insights = [
      `L'indemnité légale minimale pour ${totalYears.toFixed(1)} ans d'ancienneté est de ${Math.round(indemniteLegale).toLocaleString('fr-FR')} €.`,
      partExonereeIR >= indemniteBrute
        ? `L'intégralité de l'indemnité (${Math.round(indemniteBrute).toLocaleString('fr-FR')} €) est exonérée d'impôt sur le revenu.`
        : `Une part de ${Math.round(partImposableIR).toLocaleString('fr-FR')} € est soumise à l'impôt sur le revenu.`,
      contributionPatronale > 0
        ? `L'employeur s'acquitte d'une contribution patronale spécifique de 30% (${Math.round(contributionPatronale).toLocaleString('fr-FR')} €).`
        : `Aucune contribution patronale spécifique 30% ne s'applique sur le licenciement économique.`
    ];

    return {
      grossIncome: indemniteBrute,
      netIncome: netEstime,
      totalTax: csgAmount,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  // --- 4. CALCULATEUR PLUS-VALUE IMMOBILIÈRE ---
  function calculateCapitalGains(inps: TaxInput): TaxResult {
    const salePrice = Math.max(0, parseFloat(String(inps.prix_vente || inps.sale_price || 0)) || 0);
    const purchasePrice = Math.max(0, parseFloat(String(inps.prix_achat || inps.purchase_price || 0)) || 0);
    const years = Math.max(0, parseFloat(String(inps.annees_detention || inps.holding_years || 0)) || 0);
    const exemptionReason = String(inps.exemption_reason || 'none');
    const acqOption = String(inps.acquisition_costs_option || 'standard_75');
    const worksOption = String(inps.construction_works_option || 'standard_15');

    if (
      exemptionReason === 'main_residence' ||
      exemptionReason === 'first_sale_reinvestment' ||
      exemptionReason === 'price_under_15k' ||
      salePrice <= 15000
    ) {
      let labelExemption = 'Exonération légale';
      if (exemptionReason === 'main_residence') labelExemption = 'Résidence Principale';
      else if (exemptionReason === 'first_sale_reinvestment') labelExemption = 'Première cession avec réemploi (résidence principale)';
      else labelExemption = 'Prix ≤ 15 000 €';

      return {
        grossIncome: salePrice,
        netIncome: salePrice,
        totalTax: 0,
        effectiveRate: 0,
        breakdown: [
          { label: `Prix de vente net vendeur`, value: salePrice },
          { label: `Motif d'exonération (${labelExemption})`, value: 0 },
          { label: `Impôt sur la plus-value (Exonération 100%)`, value: 0, isDeduction: true },
          { label: `Net perçu par le vendeur`, value: salePrice, isFinal: true },
        ],
        currency: 'EUR',
        currencySymbol: '€',
        additionalInsights: [
          `La vente bénéficie d'une exonération totale d'impôt et de prélèvements sociaux (100%).`
        ],
      };
    }

    const fraisAcq = acqOption === 'standard_75' ? (purchasePrice * 0.075) : Math.max(0, parseFloat(String(inps.frais_acquisition || 0)) || 0);
    const fraisTravaux = worksOption === 'standard_15' && years >= 5 ? (purchasePrice * 0.15) : worksOption === 'real_works' ? Math.max(0, parseFloat(String(inps.travaux_realises || 0)) || 0) : 0;

    const prixAcquisitionCorrigee = purchasePrice + fraisAcq + fraisTravaux;
    const pvBrute = Math.max(0, salePrice - prixAcquisitionCorrigee);

    // Abattements pour durée de détention (IR 19%)
    let abattementIRRate = 0;
    if (years >= 22) {
      abattementIRRate = 1.0; // Exonération totale IR après 22 ans
    } else if (years >= 6) {
      const yIR = Math.min(years, 21);
      abattementIRRate = (yIR - 5) * 0.06;
    }

    // Abattements pour durée de détention (Prélèvements Sociaux 17.2%)
    let abattementPSRate = 0;
    if (years >= 30) {
      abattementPSRate = 1.0; // Exonération totale PS après 30 ans
    } else if (years > 22) {
      abattementPSRate = 0.28 + ((years - 22) * 0.09);
    } else if (years === 22) {
      abattementPSRate = 0.28;
    } else if (years >= 6) {
      abattementPSRate = (years - 5) * 0.0165;
    }

    const pvNetIR = Math.max(0, pvBrute * (1 - abattementIRRate));
    const pvNetPS = Math.max(0, pvBrute * (1 - abattementPSRate));

    const impotIR = pvNetIR * 0.19;
    const prelevementsSociaux = pvNetPS * 0.172;

    // Surtaxe plus-values élevées (> 50k € imposable IR)
    let surtaxe = 0;
    if (pvNetIR > 50000) {
      const surtaxeRate = pvNetIR > 250000 ? 0.06 : pvNetIR > 200000 ? 0.05 : pvNetIR > 150000 ? 0.04 : pvNetIR > 100000 ? 0.03 : 0.02;
      surtaxe = pvNetIR * surtaxeRate;
    }

    const totalImpot = impotIR + prelevementsSociaux + surtaxe;
    const netVendeur = salePrice - totalImpot;
    const effectiveRate = pvBrute > 0 ? totalImpot / pvBrute : 0;

    const breakdown = [
      { label: `Prix de vente net vendeur`, value: salePrice },
      { label: `Prix d'achat initial`, value: purchasePrice },
      { label: `Frais d'acquisition majorés (${acqOption === 'standard_75' ? '7,5% forfait' : 'réels'})`, value: fraisAcq },
      ...(fraisTravaux > 0 ? [{ label: `Majorations pour travaux (${worksOption === 'standard_15' ? '15% forfait >5ans' : 'factures'})`, value: fraisTravaux }] : []),
      { label: `Prix d'acquisition corrigé`, value: prixAcquisitionCorrigee, isTotal: true },
      { label: `Plus-value brute réalisée`, value: pvBrute, isTotal: true },
      { label: `Abattement IR pour durée de détention (${(abattementIRRate * 100).toFixed(1)}%)`, value: pvBrute * abattementIRRate, isDeduction: true },
      { label: `Abattement Prélèvements Sociaux (${(abattementPSRate * 100).toFixed(1)}%)`, value: pvBrute * abattementPSRate, isDeduction: true },
      { label: `Impôt sur le Revenu (19% sur PV nette IR)`, value: impotIR, isDeduction: true },
      { label: `Prélèvements Sociaux (17,2% sur PV nette PS)`, value: prelevementsSociaux, isDeduction: true },
      ...(surtaxe > 0 ? [{ label: `Surtaxe sur plus-value élevée (> 50 k€)`, value: surtaxe, isDeduction: true }] : []),
      { label: `Montant total de l'impôt sur la plus-value`, value: totalImpot, isTotal: true },
      { label: `Net perçu par le vendeur après impôt`, value: netVendeur, isFinal: true },
    ];

    const insights = [
      `Plus-value brute de ${Math.round(pvBrute).toLocaleString('fr-FR')} € après prise en compte des majorations légales (frais & travaux).`,
      years >= 22
        ? `Vous bénéficiez d'une exonération totale d'impôt sur le revenu (22 ans révolus de détention).`
        : `L'abattement sur l'impôt sur le revenu est de ${(abattementIRRate * 100).toFixed(0)}% pour ${years} ans de détention.`,
      years >= 30
        ? `Vous bénéficiez d'une exonération totale des prélèvements sociaux (30 ans révolus).`
        : `L'abattement sur les prélèvements sociaux est de ${(abattementPSRate * 100).toFixed(1)}%.`
    ];

    return {
      grossIncome: salePrice,
      netIncome: netVendeur,
      totalTax: totalImpot,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  // --- 5. PRIMARY CALCULATOR (URSSAF MICRO-ENTREPRISE) ---
  function calculatePrimary(inps: TaxInput): TaxResult {
    let caInput = Math.max(0, parseFloat(String(inps.gross_revenue)) || 0);
    const activityType = String(inps.activity_type || 'bnc_liberal');
    const acreActive = String(inps.acre_benefit || 'no') === 'yes';
    const vlActive = String(inps.versement_liberatoire || 'no') === 'yes';
    const period = String(inps.period || 'monthly');

    const caAnnuel = period === 'monthly' ? caInput * 12 : (period === 'quarterly' ? caInput * 4 : caInput);
    const config = ACTIVITY[activityType] || ACTIVITY.bnc_liberal;

    const urssafRate = acreActive ? config.urssafRateACRE : config.urssafRate;
    const cotisationsURSSAF = caAnnuel * urssafRate;
    const cfp = caAnnuel * config.cfpRate;
    const versementLib = vlActive ? caAnnuel * config.vlRate : 0;

    const totalCharges = cotisationsURSSAF + cfp + versementLib;
    const netAvantIR = Math.max(0, caAnnuel - totalCharges);

    let irEstime = 0;
    if (!vlActive) {
      const revenuImposable = Math.max(0, caAnnuel * (1 - config.abattementIR));
      irEstime = applyFrenchIR(revenuImposable);
    }

    const netFinal = Math.max(0, netAvantIR - irEstime);
    const totalTax = totalCharges + irEstime;
    const effectiveRate = caAnnuel > 0 ? totalTax / caAnnuel : 0;

    const breakdown = [
      { label: `Chiffre d'affaires annuel HT`, value: caAnnuel },
      { label: `Cotisations URSSAF (${(urssafRate * 100).toFixed(1)}%${acreActive ? ' — ACRE' : ''})`, value: cotisationsURSSAF, isDeduction: true },
      { label: `CFP — Formation Professionnelle (${(config.cfpRate * 100).toFixed(2)}%)`, value: cfp, isDeduction: true },
      ...(vlActive ? [{ label: `Versement Libératoire IR (${(config.vlRate * 100).toFixed(2)}%)`, value: versementLib, isDeduction: true }] : []),
      { label: 'Net disponible avant IR', value: netAvantIR, isTotal: true },
      ...(!vlActive && irEstime > 0 ? [{ label: `Impôt sur le revenu estimé (après abattement ${(config.abattementIR * 100).toFixed(0)}%)`, value: irEstime, isDeduction: true }] : []),
      { label: 'Revenu Net Final', value: netFinal, isFinal: true },
      ...(period === 'monthly' ? [{ label: 'Revenu net mensuel estimé', value: netFinal / 12, isTotal: true }] : []),
      ...(period === 'quarterly' ? [{ label: 'Revenu net trimestriel estimé', value: netFinal / 4, isTotal: true }] : []),
    ];

    const insights: string[] = [];
    if (caAnnuel > config.plafondCA * 0.9) {
      insights.push(`⚠️ Attention : votre CA approche le plafond de ${config.plafondCA.toLocaleString('fr-FR')} € pour votre activité. Au-delà, vous perdez le statut auto-entrepreneur.`);
    }
    if (acreActive) {
      insights.push("Vous bénéficiez de l'ACRE (taux réduit). Attention : l'exonération est totale la 1ère année puis partielle (50%) les années suivantes.");
    }
    if (!vlActive && irEstime > 0) {
      insights.push(`L'IR estimé est calculé après l'abattement forfaitaire de ${(config.abattementIR * 100).toFixed(0)}% prévu pour votre activité.`);
    }

    return {
      grossIncome: caAnnuel,
      netIncome: netFinal,
      totalTax,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  // --- 6. CALCULATEUR SASU (IMPÔTS, COTISATIONS ASSIMILÉ SALARIÉ & DIVIDENDES) ---
  function calculateSASU(inps: TaxInput): TaxResult {
    const caOrProfit = Math.max(0, parseFloat(String(inps.gross_revenue_or_profit || inps.chiffre_affaires || 0)) || 0);
    const expenses = Math.max(0, parseFloat(String(inps.other_expenses || inps.charges_exploitation || 0)) || 0);
    const remBrute = Math.max(0, parseFloat(String(inps.director_remuneration || inps.remuneration_brute || 0)) || 0);
    const taxRegime = String(inps.tax_regime || 'is').toLowerCase();
    const distPct = Math.min(100, Math.max(0, parseFloat(String(inps.distribution_share || 100)) || 0)) / 100;

    // Statut Président SASU: Assimilé Salarié URSSAF (~65% de cotisations sur le brut)
    const cotisSociales = remBrute * 0.65;
    const remNetteAvantImpot = Math.max(0, remBrute - (remBrute * 0.22));
    const totalSalaryCompanyCost = remBrute + (remBrute * 0.43);

    const profitBeforeTax = Math.max(0, caOrProfit - expenses - totalSalaryCompanyCost);

    let isTotal = 0;
    let netDividends = 0;
    let pfuDividends = 0;
    let totalDividendsGross = 0;
    let irSurBenefice = 0;

    if (taxRegime === 'is') {
      const isTranche15 = Math.min(profitBeforeTax, 42500) * 0.15;
      const isTranche25 = Math.max(0, profitBeforeTax - 42500) * 0.25;
      isTotal = isTranche15 + isTranche25;

      const retainedProfit = Math.max(0, profitBeforeTax - isTotal);
      totalDividendsGross = retainedProfit * distPct;
      pfuDividends = totalDividendsGross * 0.30;
      netDividends = Math.max(0, totalDividendsGross - pfuDividends);
    } else {
      irSurBenefice = applyFrenchIR(profitBeforeTax);
      totalDividendsGross = Math.max(0, profitBeforeTax - irSurBenefice) * distPct;
      netDividends = totalDividendsGross;
    }

    const netTotalPerceived = remNetteAvantImpot + netDividends;
    const totalTaxAndCharges = cotisSociales + isTotal + pfuDividends + irSurBenefice;
    const effectiveRate = caOrProfit > 0 ? totalTaxAndCharges / caOrProfit : 0;

    const breakdown = [
      { label: `Chiffre d'affaires HT / Bénéfice brut`, value: caOrProfit },
      ...(expenses > 0 ? [{ label: `Frais et charges d'exploitation`, value: expenses, isDeduction: true }] : []),
      { label: `Rémunération brute du Président SASU`, value: remBrute },
      { label: `Cotisations sociales URSSAF assimilé salarié (~65% du brut)`, value: cotisSociales, isDeduction: true },
      { label: `Rémunération nette perçue par le Président`, value: remNetteAvantImpot, isTotal: true },
      { label: `Bénéfice imposable de la SASU`, value: profitBeforeTax, isTotal: true },
      ...(taxRegime === 'is' ? [
        { label: `Impôt sur les Sociétés (IS 15% / 25%)`, value: isTotal, isDeduction: true },
        { label: `Dividendes bruts distribués (${(distPct * 100).toFixed(0)}%)`, value: totalDividendsGross },
        { label: `Prélèvement Forfaitaire Unique (Flat Tax PFU 30%)`, value: pfuDividends, isDeduction: true },
        { label: `Dividendes nets perçus`, value: netDividends, isTotal: true },
      ] : [
        { label: `Impôt sur le Revenu (IR) sur le bénéfice`, value: irSurBenefice, isDeduction: true },
        { label: `Bénéfice net perçu après IR`, value: netDividends, isTotal: true },
      ]),
      { label: `Revenu net global perçu (Salaire Net + Dividendes Nets)`, value: netTotalPerceived, isFinal: true },
    ];

    const insights = [
      `En SASU, le président assimilé salarié bénéficie de la même protection sociale qu'un salarié (hors Pôle Emploi).`,
      taxRegime === 'is'
        ? `Les dividendes en SASU à l'IS ne supportent AUCUNE cotisation URSSAF, uniquement la Flat Tax de 30% (PFU).`
        : `En option IR, le bénéfice de la SASU est imposé au barème progressif sans passer par l'IS ni le PFU.`
    ];

    return {
      grossIncome: caOrProfit,
      netIncome: netTotalPerceived,
      totalTax: totalTaxAndCharges,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  // --- 7. CALCULATEUR EURL (IMPÔTS, COTISATIONS TNS & DIVIDENDES) ---
  function calculateEURL(inps: TaxInput): TaxResult {
    const caOrProfit = Math.max(0, parseFloat(String(inps.gross_revenue_or_profit || inps.chiffre_affaires || 0)) || 0);
    const expenses = Math.max(0, parseFloat(String(inps.other_expenses || inps.charges_exploitation || 0)) || 0);
    const remNette = Math.max(0, parseFloat(String(inps.director_remuneration || inps.remuneration_nette || 0)) || 0);
    const capital = Math.max(0, parseFloat(String(inps.capital_social || 1000)) || 1000);
    const taxRegime = String(inps.tax_regime || 'is').toLowerCase();
    const distPct = Math.min(100, Math.max(0, parseFloat(String(inps.distribution_share || 100)) || 0)) / 100;

    // Statut Gérant EURL: Travailleur Non Salarié (TNS - SSI/URSSAF ~45% de la rémunération nette)
    const cotisTNS = remNette * 0.45;
    const companyCostSalary = remNette + cotisTNS;

    const profitBeforeTax = Math.max(0, caOrProfit - expenses - companyCostSalary);

    let isTotal = 0;
    let netDividends = 0;
    let pfuDividends = 0;
    let divTnsCharges = 0;
    let totalDividendsGross = 0;
    let irSurBenefice = 0;
    let capitalThreshold = capital * 0.10;

    if (taxRegime === 'is') {
      const is15 = Math.min(profitBeforeTax, 42500) * 0.15;
      const is25 = Math.max(0, profitBeforeTax - 42500) * 0.25;
      isTotal = is15 + is25;

      const retainedProfit = Math.max(0, profitBeforeTax - isTotal);
      totalDividendsGross = retainedProfit * distPct;

      const divPfuPart = Math.min(totalDividendsGross, capitalThreshold);
      const divExcessPart = Math.max(0, totalDividendsGross - capitalThreshold);

      pfuDividends = divPfuPart * 0.30;
      divTnsCharges = divExcessPart * 0.45;
      const excessAfterTns = Math.max(0, divExcessPart - divTnsCharges);
      const pfuExcess = excessAfterTns * 0.30;

      const totalDivTaxes = pfuDividends + divTnsCharges + pfuExcess;
      netDividends = Math.max(0, totalDividendsGross - totalDivTaxes);
      pfuDividends += pfuExcess;
    } else {
      irSurBenefice = applyFrenchIR(profitBeforeTax);
      totalDividendsGross = Math.max(0, profitBeforeTax - irSurBenefice) * distPct;
      netDividends = totalDividendsGross;
    }

    const netTotalPerceived = remNette + netDividends;
    const totalTaxAndCharges = cotisTNS + isTotal + pfuDividends + divTnsCharges + irSurBenefice;
    const effectiveRate = caOrProfit > 0 ? totalTaxAndCharges / caOrProfit : 0;

    const breakdown = [
      { label: `Chiffre d'affaires HT / Bénéfice brut`, value: caOrProfit },
      ...(expenses > 0 ? [{ label: `Frais d'exploitation`, value: expenses, isDeduction: true }] : []),
      { label: `Rémunération nette du Gérant EURL`, value: remNette },
      { label: `Cotisations sociales TNS (URSSAF / SSI ~45% de la rémunération nette)`, value: cotisTNS, isDeduction: true },
      { label: `Bénéfice imposable de l'EURL`, value: profitBeforeTax, isTotal: true },
      ...(taxRegime === 'is' ? [
        { label: `Impôt sur les Sociétés (IS 15% / 25%)`, value: isTotal, isDeduction: true },
        { label: `Dividendes bruts distribués (${(distPct * 100).toFixed(0)}%)`, value: totalDividendsGross },
        { label: `Seuil de 10% du capital social (${capitalThreshold.toLocaleString('fr-FR')} €)`, value: capitalThreshold },
        ...(divTnsCharges > 0 ? [{ label: `Cotisations TNS 45% sur fraction de dividendes > 10% du capital`, value: divTnsCharges, isDeduction: true }] : []),
        { label: `Prélèvement Forfaitaire Unique (PFU 30%)`, value: pfuDividends, isDeduction: true },
        { label: `Dividendes nets perçus`, value: netDividends, isTotal: true },
      ] : [
        { label: `Impôt sur le Revenu (IR) sur le bénéfice`, value: irSurBenefice, isDeduction: true },
        { label: `Bénéfice net perçu après IR`, value: netDividends, isTotal: true },
      ]),
      { label: `Revenu net global perçu (Rémunération Nette + Dividendes Nets)`, value: netTotalPerceived, isFinal: true },
    ];

    const insights = [
      `En EURL, le gérant a le statut TNS avec des charges sociales (~45%) plus légères qu'en SASU (~65%-80%).`,
      taxRegime === 'is' && divTnsCharges > 0
        ? `Attention : la fraction de dividendes au-delà de 10% du capital (${capitalThreshold.toLocaleString('fr-FR')} €) est soumise aux cotisations TNS 45%.`
        : `Les dividendes jusqu'à 10% du capital sont taxés uniquement à la Flat Tax 30% (PFU).`
    ];

    return {
      grossIncome: caOrProfit,
      netIncome: netTotalPerceived,
      totalTax: totalTaxAndCharges,
      effectiveRate,
      breakdown,
      currency: 'EUR',
      currencySymbol: '€',
      additionalInsights: insights,
    };
  }

  switch (calcId) {
    case 'sasu-impots-cotisations-dividendes':
    case 'sasu-tax-calculator':
      return calculateSASU(inputs);
    case 'eurl-impots-cotisations-dividendes':
    case 'eurl-tax-calculator':
      return calculateEURL(inputs);
    case 'frais-de-notaire-immobilier':
      return calculateNotaryFees(inputs);
    case 'calculateur-salaire-brut-net-cout-employeur':
    case 'impot-revenu-france':
      return calculateGrossToNet(inputs);
    case 'indemnite-rupture-conventionnelle-licenciement':
    case 'rupture-conventionnelle':
      return calculateSeverance(inputs);
    case 'calculateur-plus-value-immobiliere':
      return calculateCapitalGains(inputs);
    case 'tva-auto-entrepreneur':
    case 'urssaf-cotisations-micro-entreprise':
    default:
      return calculatePrimary(inputs);
  }
}
