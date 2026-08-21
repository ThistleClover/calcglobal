/**
 * CalcGlobal - Awin Auto-Join & Link Extractor Script
 * Run this directly in your Chrome DevTools Console (F12 -> Console -> Paste -> Enter)
 * on the Awin Merchant Directory page.
 */
(async function autoJoinAwin() {
  console.log("🚀 [CalcGlobal] Démarrage du script d'adhésion automatique Awin...");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const publisherId = "3027753";
  const joinedMerchants = [];

  async function processCurrentPage() {
    // 1. Récupérer tous les boutons "+ Join" visibles
    const buttons = Array.from(document.querySelectorAll('button, a')).filter(el => {
      const txt = el.textContent.trim().toLowerCase();
      return txt === '+ join' || txt === 'join' || txt === 'rejoindre' || txt === '+ rejoindre';
    });

    console.log(`📋 Trouvé ${buttons.length} annonceurs à rejoindre sur cette page...`);

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      try {
        // Obtenir le nom du marchand depuis la ligne du tableau
        const row = btn.closest('tr') || btn.closest('.advertiser-card') || btn.parentElement;
        const merchantName = row ? row.querySelector('td, .name, a')?.textContent.trim() : `Merchant ${i+1}`;

        console.log(`👉 [${i+1}/${buttons.length}] Adhésion à : "${merchantName}"`);
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        btn.click();
        await sleep(1500);

        // Gérer le pop-up modal de confirmation
        const modal = document.querySelector('.modal, [role="dialog"], .ui-dialog, .awin-modal');
        if (modal) {
          // Cocher les cases de conditions d'utilisation
          const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => {
            if (!cb.checked) cb.click();
          });

          // Remplir le message si un champ texte est requis
          const textarea = modal.querySelector('textarea, input[type="text"]');
          if (textarea && textarea.value.trim() === '') {
            textarea.value = "CalcGlobal is a worldwide financial, tax, salary, and loan calculator platform connecting active users with tailored banking and financial solutions.";
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }

          await sleep(800);

          // Cliquer sur le bouton de confirmation final
          const confirmBtn = Array.from(modal.querySelectorAll('button, input[type="submit"], a')).find(b => {
            const t = b.textContent.trim().toLowerCase();
            return t.includes('join') || t.includes('rejoindre') || t.includes('confirm') || t.includes('apply') || t.includes('confirmer') || t.includes('send');
          });

          if (confirmBtn) {
            confirmBtn.click();
            console.log(`✅ Adhésion validée pour : "${merchantName}"`);
          }
        }

        joinedMerchants.push({
          name: merchantName,
          timestamp: new Date().toISOString()
        });

        await sleep(2000);
      } catch (err) {
        console.warn(`⚠️ Erreur sur le marchand ${i}:`, err.message);
      }
    }
  }

  // Exécution sur la page active
  await processCurrentPage();

  console.log("\n🎉 [CalcGlobal] Processus terminé avec succès !");
  console.log(`Total des annonceurs traités : ${joinedMerchants.length}`);
  console.log("Rendez-vous maintenant dans Toolbox > Link Builder pour vos liens d'affiliation !");
})();
