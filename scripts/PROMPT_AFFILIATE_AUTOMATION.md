# Prompt pour l'Agent d'Automatisation d'Affiliation

Copie-colle le prompt ci-dessous dans un nouvel agent Antigravity (idéalement dans un nouveau dossier) disposant du serveur MCP Puppeteer ou capable de créer un script d'automatisation locale.

---
**PROMPT:**

```text
Je veux automatiser la création de mes comptes d'affiliation pour 70 sites partenaires (Qonto, TurboTax, Shine, etc.). 
Puisque je vais utiliser le bouton "Sign in with Google" pour chaque site et qu'il y aura des captchas, une automatisation 100% headless ne marchera pas.

Ta mission :
1. Crée un script Node.js (avec Puppeteer ou Playwright) configuré avec `headless: false` (pour que je puisse voir le navigateur).
2. Le script doit lire un tableau contenant la liste des URLs partenaires (je te fournirai la liste extraite de la base de données).
3. Le script doit ouvrir le premier lien, attendre que je clique sur "Sign in with Google" et valide le compte.
4. Une fois que je tape "Suivant" dans la console (ou via un bouton injecté), le script passe automatiquement à l'URL du partenaire suivant.
5. Utilise un "user data dir" (profil persistant) dans Puppeteer pour que ma session Google soit conservée d'un site à l'autre et que je n'aie pas à remettre mon mot de passe 70 fois.

Commence par configurer le projet Node.js, installe Puppeteer, et génère le script prêt à être lancé.
```
---

### Liste des URLs à fournir à cet agent (Exemple pour la France) :
- https://qonto.com/fr/partenaires
- https://shine.fr/partenaires
- https://dougs.fr/partenaires
- https://payfit.com/fr/partenaires
- https://alan.com/partenaires
- ... (tu pourras récupérer la liste complète générée précédemment).
