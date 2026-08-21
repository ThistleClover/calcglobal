/**
 * CalcGlobal - Awin Complete Auto-Joiner & Link Builder Extractor
 * Automatically joins all filtered programs and exports generated affiliate links.
 */
(async function runAwinAffiliationBot() {
  console.log("%c🚀 [CalcGlobal Awin Bot] Initialisation...", "color: #10B981; font-weight: bold; font-size: 14px;");

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const publisherId = "3027753";
  const extractedAffiliates = [];

  // Message de candidature personnalisé pour CalcGlobal
  const PROMOTION_MESSAGE = "CalcGlobal (https://thistleclover.github.io/calcglobal/) is a high-traffic financial, tax, salary, and loan calculator platform connecting visitors worldwide with trusted banking, accounting, and financial services.";

  let pageNum = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`%c📄 [Page ${pageNum}] Analyse des programmes disponibles...`, "color: #3B82F6; font-weight: bold;");

    // 1. Trouver toutes les lignes de marchands
    const rows = Array.from(document.querySelectorAll('tbody tr, .awin-table-row, tr[data-merchant-id]'));
    console.log(`🔎 ${rows.length} lignes détectées sur cette page.`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Extraire les infos du marchand
        const nameEl = row.querySelector('td:nth-child(1), a.merchant-name, .advertiser-name, a');
        const merchantName = nameEl ? nameEl.textContent.trim() : `Annonceur_${i+1}`;
        const merchantLink = nameEl ? nameEl.getAttribute('href') : '';
        
        // Trouver l'ID marchand (MID)
        let mid = null;
        if (merchantLink) {
          const match = merchantLink.match(/merchant-profile\/(\d+)/) || merchantLink.match(/merchant\/(\d+)/) || merchantLink.match(/id=(\d+)/);
          if (match) mid = match[1];
        }
        if (!mid && row.dataset.merchantId) mid = row.dataset.merchantId;

        // Trouver le bouton Join
        const joinBtn = Array.from(row.querySelectorAll('button, a')).find(el => {
          const t = el.textContent.trim().toLowerCase();
          return t === '+ join' || t === 'join' || t === 'rejoindre' || t === '+ rejoindre' || t.includes('join');
        });

        if (joinBtn) {
          console.log(`👉 [%c${i+1}/${rows.length}%c] Adhésion à : %c${merchantName}%c (MID: ${mid || 'Auto'})`, "font-weight: bold;", "", "color: #F59E0B; font-weight: bold;", "");
          joinBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          joinBtn.click();
          await sleep(1200);

          // Gérer le pop-up modal
          const modal = document.querySelector('.modal, [role="dialog"], .ui-dialog, .awin-modal, .mat-dialog-container');
          if (modal) {
            // Cocher les conditions
            modal.querySelectorAll('input[type="checkbox"]').forEach(cb => {
              if (!cb.checked) {
                cb.click();
                cb.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });

            // Remplir la description si champ texte
            const textInput = modal.querySelector('textarea, input[type="text"]');
            if (textInput && !textInput.value.trim()) {
              textInput.value = PROMOTION_MESSAGE;
              textInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            await sleep(600);

            // Bouton de confirmation
            const confirmBtn = Array.from(modal.querySelectorAll('button, input[type="submit"], a')).find(b => {
              const t = b.textContent.trim().toLowerCase();
              return t.includes('join') || t.includes('rejoindre') || t.includes('confirm') || t.includes('apply') || t.includes('confirmer') || t.includes('send');
            });

            if (confirmBtn) {
              confirmBtn.click();
              console.log(`✅ Adhésion confirmée pour ${merchantName}`);
            }
          }
          await sleep(1500);
        } else {
          console.log(`ℹ️ [${i+1}/${rows.length}] Déjà rejoint ou en attente : ${merchantName}`);
        }

        // Construire le lien de tracking
        const trackingUrl = mid 
          ? `https://www.awin1.com/cread.php?awinmid=${mid}&awinaffid=${publisherId}&clickref=calcglobal&ued=`
          : `https://www.awin1.com/awclick.php?mid=${merchantName.replace(/\s+/g, '')}&id=${publisherId}`;

        extractedAffiliates.push({
          name: merchantName,
          merchantId: mid || 'N/A',
          publisherId: publisherId,
          trackingUrl: trackingUrl,
          category: 'Finance & Insurance',
          joinedAt: new Date().toISOString()
        });

      } catch (err) {
        console.warn(`Erreur lors du traitement :`, err.message);
      }
    }

    // Vérifier s'il y a une page suivante
    const nextBtn = Array.from(document.querySelectorAll('a, button, .pagination-next')).find(el => {
      const t = el.textContent.trim().toLowerCase();
      const aria = el.getAttribute('aria-label') || '';
      return t === 'next' || t === 'suivant' || t === '>' || aria.includes('next');
    });

    if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('disabled') && pageNum < 10) {
      console.log("➡️ Passage à la page suivante...");
      nextBtn.click();
      pageNum++;
      await sleep(3000);
    } else {
      hasNextPage = false;
    }
  }

  console.log(`%c🎉 [Extraction Terminée] ${extractedAffiliates.length} programmes traités !`, "color: #10B981; font-weight: bold; font-size: 16px;");

  // 1. Téléchargement automatique du fichier JSON
  const jsonBlob = new Blob([JSON.stringify(extractedAffiliates, null, 2)], { type: 'application/json' });
  const jsonLink = document.createElement('a');
  jsonLink.href = URL.createObjectURL(jsonBlob);
  jsonLink.download = 'calcglobal_affiliates_awin.json';
  document.body.appendChild(jsonLink);
  jsonLink.click();
  document.body.removeChild(jsonLink);

  // 2. Téléchargement automatique du fichier CSV
  let csvContent = "name,merchant_id,publisher_id,tracking_url,category,joined_at\n";
  extractedAffiliates.forEach(a => {
    csvContent += `"${a.name.replace(/"/g, '""')}","${a.merchantId}","${a.publisherId}","${a.trackingUrl}","${a.category}","${a.joinedAt}"\n`;
  });
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  const csvLink = document.createElement('a');
  csvLink.href = URL.createObjectURL(csvBlob);
  csvLink.download = 'calcglobal_affiliates_awin.csv';
  document.body.appendChild(csvLink);
  csvLink.click();
  document.body.removeChild(csvLink);

  console.log("%c💾 Fichiers calcglobal_affiliates_awin.json et .csv téléchargés dans votre dossier Téléchargements !", "color: #10B981; font-weight: bold;");
})();
