const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'database', 'countries');

const updates = {
  "us.json": {
    "us-1099-self-employment-tax-calculator": {
      title_native: "1099 Self-Employment & Quarterly Tax Calculator",
      title_en: "1099 Self-Employment & Quarterly Tax Calculator",
      description_native: "Calculate your 15.3% self-employment tax, federal income tax, and 1040-ES quarterly estimated payments. See your exact net income after SE tax deductions."
    },
    "s-corp-vs-llc-tax-savings-calculator": {
      title_native: "S-Corp vs LLC Tax Savings Calculator",
      title_en: "S-Corp vs LLC Tax Savings Calculator",
      description_native: "Compare S-Corp election against Single-Member LLC taxation to see your exact FICA tax savings. Factoring officer salary, payroll taxes, and annual compliance fees."
    },
    "w2-salary-paycheck-take-home-calculator": {
      title_native: "W-2 Paycheck & Take-Home Tax Calculator",
      title_en: "W-2 Paycheck & Take-Home Tax Calculator",
      description_native: "Determine your net take-home pay per paycheck after federal withholding, FICA taxes, state taxes, and 401(k) deductions. See your complete net earnings breakdown."
    },
    "us-home-sale-net-proceeds-capital-gains-calculator": {
      title_native: "Home Sale Net Proceeds & Capital Gains Calculator",
      title_en: "Home Sale Net Proceeds & Capital Gains Calculator",
      description_native: "Estimate your net cash proceeds at closing and federal capital gains tax when selling your home. Includes IRS Section 121 exclusions, agent fees, and cost basis adjustments."
    },
    "us-small-business-lease-break-even-calculator": {
      title_native: "Commercial Lease & Break-Even Sales Calculator",
      title_en: "Commercial Lease & Break-Even Sales Calculator",
      description_native: "Calculate total monthly commercial lease costs including NNN expenses and determine your break-even sales volume. Find out the revenue needed to run a profitable space."
    }
  },
  "uk.json": {
    "ir35-inside-outside-calculator": {
      title_native: "UK IR35 Inside vs Outside Pay Calculator",
      title_en: "UK IR35 Inside vs Outside Pay Calculator",
      description_native: "Compare net take-home pay between Inside IR35 umbrella contracts and Outside IR35 Ltd companies. Get a clear breakdown of tax, NI, and umbrella fees."
    },
    "sdlt-lbtt-ltt-stamp-duty-calculator": {
      title_native: "UK Stamp Duty Tax Calculator (SDLT, LBTT, LTT)",
      title_en: "UK Stamp Duty Tax Calculator (SDLT, LBTT, LTT)",
      description_native: "Calculate exact property transfer taxes for England, Scotland, and Wales. Factor in first-time buyer relief, second home surcharges, and non-resident tax rates."
    },
    "uk-gross-net-salary-pension-calculator": {
      title_native: "UK Take-Home Salary & Tax Calculator",
      title_en: "UK Take-Home Salary & Tax Calculator",
      description_native: "Calculate your exact monthly take-home pay after Income Tax, National Insurance, pension salary sacrifice, and student loans. Includes Scottish tax bands and £100k taper rules."
    },
    "uk-limited-company-director-salary-dividend-calculator": {
      title_native: "UK Director Salary & Dividend Optimizer",
      title_en: "UK Director Salary & Dividend Optimizer",
      description_native: "Find the optimal salary and dividend split to minimize Corporation Tax and Dividend Tax. See your maximum net take-home cash as a UK company director."
    },
    "uk-statutory-redundancy-settlement-calculator": {
      title_native: "UK Redundancy & Settlement Tax Calculator",
      title_en: "UK Redundancy & Settlement Tax Calculator",
      description_native: "Calculate your statutory redundancy entitlement and settlement pay tax. Applies the £30,000 tax-free exemption, PILON rules, and age-based multipliers."
    }
  },
  "fr.json": {
    "urssaf-cotisations-micro-entreprise": {
      title_native: "Simulateur Cotisations Auto-Entrepreneur & Net",
      title_en: "URSSAF Auto-Entrepreneur Net Income Simulator",
      description_native: "Calculez le montant exact de vos charges URSSAF et votre revenu net en auto-entreprise. Prend en compte l'ACRE, le versement libératoire et votre activité (BNC/BIC)."
    },
    "frais-de-notaire-immobilier": {
      title_native: "Simulateur de Frais de Notaire Immobilier",
      title_en: "French Real Estate Notary Fees Calculator",
      description_native: "Estimez vos frais d'acquisition immobilière pour un achat dans l'ancien ou le neuf. Obtenez le détail des droits de mutation, émoluments et débours."
    },
    "calculateur-salaire-brut-net-cout-employeur": {
      title_native: "Calculateur Salaire Brut en Net & Coût Employeur",
      title_en: "France Gross to Net Salary & Total Employer Cost",
      description_native: "Convertissez votre salaire brut en net après prélèvement à la source pour statut cadre ou non-cadre. Obtenez le coût total employeur détaillé."
    },
    "indemnite-rupture-conventionnelle-licenciement": {
      title_native: "Calculateur Indemnité Rupture Conventionnelle",
      title_en: "French Severance & Mutual Agreement Calculator",
      description_native: "Calculez l'indemnité légale ou conventionnelle de rupture conventionnelle et de licenciement. Obtenez le montant net perçu et le coût employeur."
    },
    "calculateur-plus-value-immobiliere": {
      title_native: "Simulateur de Plus-Value Immobilière",
      title_en: "French Real Estate Capital Gains Tax Calculator",
      description_native: "Calculez l'impôt sur la plus-value immobilière pour une résidence secondaire ou locative. Intègre les abattements par année de détention et les surtaxes."
    }
  },
  "de.json": {
    "brutto-netto-rechner-deutschland": {
      title_native: "Brutto-Netto-Rechner 2026 Deutschland",
      title_en: "Germany Gross to Net Salary Calculator",
      description_native: "Berechnen Sie Ihr monatliches Nettogehalt nach Steuerklasse, Krankenversicherung und Pflegeabgaben. Erhalten Sie eine exakte Gehaltsabrechnung."
    },
    "gewerbesteuer-rechner": {
      title_native: "Gewerbesteuer-Rechner 2026 mit Hebesatz",
      title_en: "Germany Trade Tax Calculator 2026",
      description_native: "Berechnen Sie die Gewerbesteuer für Einzelunternehmen, Personengesellschaften und GmbHs. Berücksichtigt Gemeindehebesatz, Freibeträge und § 35 EStG Anrechnung."
    },
    "umsatzsteuer-rechner": {
      title_native: "Umsatzsteuer & Kleinunternehmer Rechner",
      title_en: "Germany VAT & Small Business Calculator",
      description_native: "Berechnen Sie die Mehrwertsteuer aus Netto- oder Bruttobeträgen mit 19% und 7%. Prüfen Sie Ihre Steuerbefreiung nach § 19 UStG Kleinunternehmerregelung."
    },
    "freiberufler-einkommensteuer": {
      title_native: "Freiberufler Einkommensteuer-Rechner",
      title_en: "Germany Freelancer Income Tax Calculator",
      description_native: "Berechnen Sie Ihr Nettoeinkommen als Freiberufler nach der Einnahmen-Überschuss-Rechnung (EÜR). Ermitteln Sie Ihre Einkommensteuer und Krankenversicherungsabgaben."
    },
    "kurzarbeitergeld-rechner": {
      title_native: "Kurzarbeitergeld-Rechner 2026 (KuG)",
      title_en: "Germany Short-Time Work Pay Calculator",
      description_native: "Berechnen Sie Ihren Anspruch auf Kurzarbeitergeld bei Arbeitsausfall mit 60% oder 67% Leistungssatz. Ermitteln Sie Ihr monatliches Gesamteinkommen."
    }
  },
  "au.json": {
    "ato-payg-income-tax-calculator": {
      title_native: "Australia Income Tax & PAYG Calculator",
      title_en: "Australia ATO Income Tax & PAYG Calculator",
      description_native: "Calculate your exact net take-home pay for 2026/27 under ATO brackets. Includes Medicare Levy, LITO offsets, and HECS/HELP student loan repayments."
    },
    "sole-trader-tax-calculator": {
      title_native: "Australia Sole Trader Tax Calculator",
      title_en: "Australia Sole Trader Tax Calculator",
      description_native: "Calculate tax payable for ABN sole traders in 2026/27 after business deductions. Includes home office, vehicle costs, super contributions, and SBITO offset."
    },
    "superannuation-calculator": {
      title_native: "Australia Superannuation Growth Calculator",
      title_en: "Australia Superannuation Growth Calculator",
      description_native: "Project your super balance at retirement with the 12% Super Guarantee rate. Calculates contribution taxes, compound investment growth, and monthly drawdown."
    },
    "stamp-duty-calculator": {
      title_native: "Australia Property Stamp Duty Calculator",
      title_en: "Australia Property Stamp Duty Calculator",
      description_native: "Calculate property transfer stamp duty across all Australian states and territories. Factors in first home buyer exemptions and foreign buyer surcharges."
    },
    "hecs-repayment-calculator": {
      title_native: "Australia HECS/HELP Loan Repayment Calculator",
      title_en: "Australia HECS/HELP Loan Repayment Calculator",
      description_native: "Calculate compulsory HECS/HELP repayments and payoff timelines for 2026/27. Factors in ATO repayment income thresholds and annual CPI indexation."
    }
  }
};

const auditLog = [];

for (const [filename, fileUpdates] of Object.entries(updates)) {
  const filePath = path.join(baseDir, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  for (const calc of data.calculators) {
    if (fileUpdates[calc.id]) {
      const up = fileUpdates[calc.id];
      auditLog.push({
        file: filename,
        id: calc.id,
        before_title_native: calc.title_native,
        after_title_native: up.title_native,
        before_title_en: calc.title_en,
        after_title_en: up.title_en,
        before_description_native: calc.description_native,
        after_description_native: up.description_native
      });
      calc.title_native = up.title_native;
      calc.title_en = up.title_en;
      calc.description_native = up.description_native;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${filename}`);
}

fs.writeFileSync(path.join(__dirname, 'audit_log.json'), JSON.stringify(auditLog, null, 2), 'utf-8');
console.log(`Audit log written to audit_log.json (${auditLog.length} calculators modified)`);
