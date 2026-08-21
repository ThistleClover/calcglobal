/**
 * CalcGlobal - Awin Safe Anti-Ban Auto-Joiner & Link Extractor
 * 
 * Fonctionnalités de Sécurité & Anti-Ban :
 * - Délais aléatoires réalistes (4 à 8 secondes) simulant un humain
 * - Défilement naturel et temporisation
 * - Détection dynamique des cases à cocher (Conditions Générales, Règles PPC, etc.)
 * - Textes de candidature contextualisés par secteur (Banque, Assurance, Comptabilité, Prêts)
 * - Gestion propre des popups et des éventuels questionnaires
 * - Export propre et sécurisé
 */
(async function safeAwinAffiliation() {
  console.log("%c🛡️ [Awin Safe Bot] Initialisation en mode sécurisé & anti-ban...", "color: #10B981; font-weight: bold; font-size: 15px;");

  const publisherId = "3027753";
  const processedMerchants = [];

  // Temporisation humaine aléatoire avec jitter
  const randomDelay = (min = 3500, max = 7000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(r => setTimeout(r, delay));
  };

  // Modèles de candidatures professionnelles contextualisées
  const PITCH_TEMPLATES = {
    banking: "CalcGlobal (https://thistleclover.github.io/calcglobal/) propose des calculateurs fiscaux et de rémunération pour indépendants et entreprises. Nos visiteurs recherchent activement des comptes bancaires professionnels et des solutions de gestion financière adaptées.",
    accounting: "Sur CalcGlobal, nos utilisateurs calculent leurs revenus nets, charges sociales et bilans d'entreprise. Nous intégrons vos solutions logicielles de comptabilité et de facturation directement au sein de nos guides et outils.",
    loans: "Nos outils de simulation de prêt immobilier, d'amortissement et de calcul d'intérêts attirent des particuliers et professionnels en recherche active de financement et de comparatifs de taux avantageux.",
    insurance: "CalcGlobal attire une audience qualifiée cherchant à optimiser ses dépenses, simuler ses couvertures et comparer les meilleures offres d'assurance adaptées à leur situation professionnelle ou personnelle.",
    default: "CalcGlobal est une plateforme internationale de simulateurs financiers, fiscaux et bancaires. Nous mettons en avant vos offres auprès d'une audience qualifiée et intentionniste via des liens et guides dédiés."
  };

  function getContextualPitch(merchantName) {
    const name = merchantName.toLowerCase();
    if (name.includes('bank') || name.includes('banque') || name.includes('qonto') || name.includes('revolut') || name.includes('shine') || name.includes('wise')) {
      return PITCH_TEMPLATES.banking;
    }
    if (name.includes('compta') || name.includes('tax') || name.includes('sage') || name.includes('quickbook') || name.includes('dougs') || name.includes('invoice') || name.includes('facture')) {
      return PITCH_TEMPLATES.accounting;
    }
    if (name.includes('pret') || name.includes('loan') || name.includes('credit') || name.includes('mortgage') || name.includes('taux')) {
      return PITCH_TEMPLATES.loans;
    }
    if (name.includes('assur') || name.includes('insur') || name.includes('allianz') || name.includes('mutuelle')) {
      return PITCH_TEMPLATES.insurance;
    }
    return PITCH_TEMPLATES.default;
  }

  // 1. Détection des lignes de programmes
  const rows = Array.from(document.querySelectorAll('tbody tr, .awin-table-row, tr[data-merchant-id]'));
  console.log(`%c📋 ${rows.length} programmes détectés sur cette page.`, "color: #3B82F6; font-weight: bold;");

  // Limite de sécurité par session pour éviter toute alerte Awin
  const MAX_PER_BATCH = 20;
  let joinedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    if (joinedCount >= MAX_PER_BATCH) {
      console.log(`%c🛑 Limite de sécurité atteinte (${MAX_PER_BATCH} adhésions). Pause recommandée pour préserver le compte Awin.`, "color: #EF4444; font-weight: bold;");
      break;
    }

    const row = rows[i];
    try {
      const nameEl = row.querySelector('td:nth-child(1), a.merchant-name, .advertiser-name, a');
      const merchantName = nameEl ? nameEl.textContent.trim() : `Annonceur_${i+1}`;
      const merchantHref = nameEl ? (nameEl.getAttribute('href') || '') : '';
      
      let mid = null;
      const match = merchantHref.match(/merchant-profile\/(\d+)/) || merchantHref.match(/id=(\d+)/);
      if (match) mid = match[1];

      const joinBtn = Array.from(row.querySelectorAll('button, a')).find(el => {
        const t = el.textContent.trim().toLowerCase();
        return t === '+ join' || t === 'join' || t === 'rejoindre' || t === '+ rejoindre' || t.includes('join');
      });

      if (!joinBtn) {
        console.log(`⏭️ [${i+1}/${rows.length}] Déjà rejoint ou en attente : ${merchantName}`);
        continue;
      }

      console.log(`\n%c👉 [${joinedCount+1}/${MAX_PER_BATCH}] Traitement de : ${merchantName} (MID: ${mid || 'Auto'})`, "color: #F59E0B; font-weight: bold;");
      
      // Simulation comportement humain : défilement doux
      joinBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await randomDelay(800, 1500);

      // Clic sur Rejoindre
      joinBtn.click();
      await randomDelay(1800, 3000);

      // 2. Gestion du modal Awin
      const modal = document.querySelector('.modal, [role="dialog"], .ui-dialog, .awin-modal, .mat-dialog-container, .cdk-overlay-pane');
      if (modal) {
        // Cocher TOUTES les cases obligatoires (Conditions d'utilisation, restrictions PPC, etc.)
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        for (const cb of checkboxes) {
          if (!cb.checked) {
            cb.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cb.click();
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            await randomDelay(300, 700);
          }
        }

        // Remplir la description personnalisée
        const textInput = modal.querySelector('textarea, input[type="text"]');
        if (textInput) {
          const pitch = getContextualPitch(merchantName);
          textInput.focus();
          textInput.value = pitch;
          textInput.dispatchEvent(new Event('input', { bubbles: true }));
          textInput.dispatchEvent(new Event('change', { bubbles: true }));
          await randomDelay(800, 1500);
        }

        // Clic sur le bouton de confirmation final
        const confirmBtn = Array.from(modal.querySelectorAll('button, input[type="submit"], a')).find(b => {
          const t = b.textContent.trim().toLowerCase();
          return t.includes('join') || t.includes('rejoindre') || t.includes('confirm') || t.includes('apply') || t.includes('confirmer') || t.includes('send');
        });

        if (confirmBtn) {
          await randomDelay(500, 1000);
          confirmBtn.click();
          console.log(`%c✅ Candidature transmise avec succès pour : ${merchantName}`, "color: #10B981; font-weight: bold;");
          joinedCount++;
        }
      }

      // Construction du lien d'affiliation standardisé Awin
      const trackingUrl = mid 
        ? `https://www.awin1.com/cread.php?awinmid=${mid}&awinaffid=${publisherId}&clickref=calcglobal&ued=`
        : `https://www.awin1.com/awclick.php?mid=${merchantName.replace(/\s+/g, '')}&id=${publisherId}`;

      processedMerchants.push({
        name: merchantName,
        merchantId: mid || 'N/A',
        publisherId: publisherId,
        trackingUrl: trackingUrl,
        category: 'Finance & Insurance',
        appliedAt: new Date().toISOString()
      });

      // Pause humaine de sécurité avant le prochain
      console.log(`⏳ Pause humaine de sécurité (4-7 sec)...`);
      await randomDelay(4000, 7500);

    } catch (err) {
      console.warn(`⚠️ Erreur sur ${i}:`, err.message);
    }
  }

  console.log(`\n%c🎉 [Session Terminée] ${processedMerchants.length} candidatures envoyées proprement !`, "color: #10B981; font-weight: bold; font-size: 15px;");

  // Export automatique du fichier JSON dans Téléchargements
  if (processedMerchants.length > 0) {
    const blob = new Blob([JSON.stringify(processedMerchants, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'calcglobal_affiliates_awin.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("💾 Fichier exporté avec succès !");
  }
})();
