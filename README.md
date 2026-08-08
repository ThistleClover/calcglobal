# CalcGlobal 🧮

> **Free, hyper-accurate tax & financial calculators — 2026/27 tax year data**

[![Deploy to GitHub Pages](https://github.com/ThistleClover/calcglobal/actions/workflows/deploy.yml/badge.svg)](https://github.com/ThistleClover/calcglobal/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live%20Site-thistleclover.github.io%2Fcalcglobal-brightgreen)](https://thistleclover.github.io/calcglobal/)

## 🌍 Live Calculators

| Country | Calculators |
|---|---|
| 🇺🇸 United States | 1099 Self-Employment · S-Corp vs LLC · W-2 Take-Home · Home Sale Capital Gains · Lease Break-Even |
| 🇬🇧 United Kingdom | IR35 Inside/Outside · SDLT Stamp Duty · Gross-Net Salary · Ltd Co Dividend · Statutory Redundancy |
| 🇫🇷 France | URSSAF Auto-Entrepreneur · Frais de Notaire · Brut-Net Salarié · Rupture Conventionnelle · Plus-Value Immo |
| 🇩🇪 Germany | Brutto-Netto · Gewerbesteuer · Umsatzsteuer · Freiberufler ESt · Kurzarbeitergeld |
| 🇦🇺 Australia | ATO PAYG Tax · Sole Trader · Superannuation · Stamp Duty (8 states) · HECS/HELP |

## 🚀 Tech Stack

- **Framework:** [Astro](https://astro.build) — static site generator
- **UI:** React island with live donut chart + breakdown table
- **Styling:** Tailwind CSS
- **Hosting:** GitHub Pages (via GitHub Actions CI/CD)
- **Build:** `npm run build` → `dist/` — 31 static pages, 0 server required

## 📦 Development

```bash
npm install
npm run dev      # Start dev server at localhost:4321
npm run build    # Build to dist/
npm run preview  # Preview production build
```

## 📐 Architecture

```
src/
├── components/
│   └── InteractiveCalculator.tsx   # React island (client:load)
├── layouts/
│   └── Layout.astro                # Global SEO layout
├── lib/engine/
│   ├── countries/                  # Real math engines (TS)
│   │   ├── us.ts · uk.ts · fr.ts · de.ts · au.ts
│   ├── factory.ts                  # Calculator → engine routing
│   └── types.ts                    # Shared TypeScript interfaces
├── pages/
│   ├── index.astro                 # Homepage
│   ├── [country]/index.astro       # Country index
│   └── [country]/[calculator].astro # Calculator page
database/
└── countries/
    └── *.json                      # 130+ country JSON databases
```

## 🏗️ Deployment

GitHub Actions automatically builds and deploys on every push to `main`. 

Enable GitHub Pages in **[Settings → Pages → Source: GitHub Actions](https://github.com/ThistleClover/calcglobal/settings/pages)**.

## 📜 License

MIT
