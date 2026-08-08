import os
import json

DATABASE_DIR = os.path.join(os.getcwd(), "database", "countries")
os.makedirs(DATABASE_DIR, exist_ok=True)

country_data = [
    # 1. France
    {
        "country": "France",
        "country_code": "FR",
        "languages": ["fr"],
        "calculators": [
            {
                "id": "urssaf-cotisations-micro-entreprise",
                "title_native": "Simulateur de Cotisations Auto-Entrepreneur (URSSAF)",
                "title_en": "URSSAF Micro-Entreprise Social Contribution Simulator",
                "search_terms_native": ["calcul cotisations urssaf auto entrepreneur", "simulateur charges micro entreprise", "calculateur urssaf 2026"],
                "description_native": "Calculez exactement vos charges sociales URSSAF et votre revenu net selon votre activité (BNC, BIC, Achat/Vente).",
                "category": "tax",
                "inputs": [
                    {"name": "gross_revenue", "label_native": "Chiffre d'affaires brut (€)", "type": "number"},
                    {"name": "activity_type", "label_native": "Type d'activité", "type": "select", "options": [
                        {"value": "bnc", "label": "BNC (Libéral / Prestations de services)"},
                        {"value": "bic_services", "label": "BIC (Artisanal / Commercial)"},
                        {"value": "achat_vente", "label": "Vente de marchandises (BIC)"}
                    ]},
                    {"name": "acre", "label_native": "Bénéficiez-vous de l'ACRE ?", "type": "select", "options": [
                        {"value": "no", "label": "Non (Taux plein)"},
                        {"value": "yes", "label": "Oui (Taux réduit 50%)"}
                    ]}
                ],
                "formula_explanation": "BNC: 21.1% (or 10.6% ACRE). BIC Services: 21.2%. Achat/Vente: 12.3%. Multiplied by Gross Revenue.",
                "affiliate_targets": [
                    {"name": "Qonto", "type": "neobank", "description": "Compte pro obligatoire pour micro-entrepreneurs"},
                    {"name": "Shine", "type": "neobank", "description": "Compte pro et gestion des factures"},
                    {"name": "Abby", "type": "software", "description": "Logiciel de facturation spécialisé auto-entrepreneur"}
                ]
            }
        ]
    },
    # 2. United Kingdom
    {
        "country": "United Kingdom",
        "country_code": "UK",
        "languages": ["en"],
        "calculators": [
            {
                "id": "ir35-inside-outside-calculator",
                "title_native": "IR35 Status & Take-Home Pay Calculator",
                "title_en": "IR35 Status & Take-Home Pay Calculator",
                "search_terms_native": ["ir35 calculator", "inside vs outside ir35 take home pay", "contractor dividend calculator 2026"],
                "description_native": "Calculate your exact take-home pay comparing Inside IR35 (PAYE / Umbrella) vs Outside IR35 (Limited Company).",
                "category": "tax",
                "inputs": [
                    {"name": "day_rate", "label_native": "Day Rate (£)", "type": "number"},
                    {"name": "days_worked_year", "label_native": "Days Worked Per Year", "type": "number"}
                ],
                "formula_explanation": "Outside IR35 calculates salary (£12,570 tax-free) + dividends. Inside IR35 applies PAYE, Employee NI (8%), and Employers NI (13.8%).",
                "affiliate_targets": [
                    {"name": "Crunch Accounting", "type": "accounting", "description": "Specialist contractor accounting packages"},
                    {"name": "PayStream", "type": "umbrella", "description": "Top compliant UK Umbrella Company"}
                ]
            }
        ]
    },
    # 3. Germany
    {
        "country": "Germany",
        "country_code": "DE",
        "languages": ["de"],
        "calculators": [
            {
                "id": "gewerbesteuer-rechner",
                "title_native": "Gewerbesteuer-Rechner 2026",
                "title_en": "Trade Tax Calculator Germany",
                "search_terms_native": ["gewerbesteuer rechner 2026", "hebesatz gewerbesteuer berechnen"],
                "description_native": "Berechnen Sie die Gewerbesteuer für Ihr Unternehmen unter Berücksichtigung des kommunalen Hebesatzes.",
                "category": "tax",
                "inputs": [
                    {"name": "profit", "label_native": "Gewinn aus Gewerbebetrieb (€)", "type": "number"},
                    {"name": "hebesatz", "label_native": "Hebesatz der Gemeinde (%)", "type": "number"}
                ],
                "formula_explanation": "(Profit - Allowance) * 3.5% Steuermesszahl * (Hebesatz / 100).",
                "affiliate_targets": [
                    {"name": "SevDesk", "type": "software", "description": "Automatisierte Buchhaltung für Gewerbetreibende"},
                    {"name": "Lexoffice", "type": "software", "description": "Marktführende Buchhaltungssoftware"}
                ]
            }
        ]
    },
    # 4. Algeria
    {
        "country": "Algeria",
        "country_code": "DZ",
        "languages": ["fr", "ar"],
        "calculators": [
            {
                "id": "ifu-auto-entrepreneur-algerie",
                "title_native": "Simulateur Impôt Auto-Entrepreneur (IFU 0.5%)",
                "title_en": "Algerian Auto-Entrepreneur IFU Tax Simulator",
                "search_terms_native": ["simulateur ifu auto entrepreneur algerie", "calcul impot auto entrepreneur 0.5"],
                "description_native": "Calculez l'impôt forfaitaire unique (IFU de 0,5%) et les cotisations CASNOS pour le statut d'auto-entrepreneur.",
                "category": "tax",
                "inputs": [
                    {"name": "annual_revenue_dzd", "label_native": "Chiffre d'affaires annuel (DZD)", "type": "number"}
                ],
                "formula_explanation": "IFU Tax = Gross Annual Revenue (DZD) * 0.005 (0.5%).",
                "affiliate_targets": [
                    {"name": "Payoneer", "type": "neobank", "description": "Compte de paiement international"},
                    {"name": "Paysera", "type": "neobank", "description": "Compte SEPA Euro"}
                ]
            }
        ]
    },
    # 5. Brazil
    {
        "country": "Brazil",
        "country_code": "BR",
        "languages": ["pt"],
        "calculators": [
            {
                "id": "calculadora-fator-r-simples-nacional",
                "title_native": "Calculadora Fator R (Simples Nacional 2026)",
                "title_en": "Brazil Simples Nacional Fator R Calculator",
                "search_terms_native": ["calculadora fator r simples nacional", "anexo iii ou anexo v simulador"],
                "description_native": "Simule se sua empresa se enquadra no Anexo III ou Anexo V baseando-se na folha de pagamento.",
                "category": "tax",
                "inputs": [
                    {"name": "payroll_12m", "label_native": "Folha de Pagamento nos últimos 12 meses (R$)", "type": "number"},
                    {"name": "revenue_12m", "label_native": "Receita Bruta nos últimos 12 meses (R$)", "type": "number"}
                ],
                "formula_explanation": "Fator R = Payroll 12M / Revenue 12M. >= 28% -> Anexo III (6%), < 28% -> Anexo V (15.5%).",
                "affiliate_targets": [
                    {"name": "Contabilizei", "type": "accounting", "description": "Contabilidade online no Brasil"}
                ]
            }
        ]
    },
    # 6. United States
    {
        "country": "United States",
        "country_code": "US",
        "languages": ["en"],
        "calculators": [
            {
                "id": "self-employment-tax-calculator",
                "title_native": "1099 Self-Employment Tax & Quarterly Estimated Tax Calculator",
                "title_en": "1099 Self-Employment Tax Calculator",
                "search_terms_native": ["1099 tax calculator 2026", "freelance estimated quarterly tax calculator", "self employment tax deduction"],
                "description_native": "Calculate your 15.3% SE tax (Social Security + Medicare) and federal quarterly estimated payments.",
                "category": "tax",
                "inputs": [
                    {"name": "net_1099_income", "label_native": "Net 1099 Income ($)", "type": "number"},
                    {"name": "filing_status", "label_native": "Filing Status", "type": "select", "options": [
                        {"value": "single", "label": "Single"},
                        {"value": "married", "label": "Married Filing Jointly"}
                    ]}
                ],
                "formula_explanation": "92.35% of net income subject to 12.4% SS + 2.9% Medicare. Half of SE tax is deductible from Income Tax.",
                "affiliate_targets": [
                    {"name": "TurboTax Self-Employed", "type": "software", "description": "Top US tax filing software ($50 bounty)"},
                    {"name": "QuickBooks Self-Employed", "type": "software", "description": "Expense tracking and quarterly tax estimation"},
                    {"name": "Catch.co", "type": "insurance", "description": "Health insurance and retirement for freelancers"}
                ]
            }
        ]
    },
    # 7. Canada
    {
        "country": "Canada",
        "country_code": "CA",
        "languages": ["en", "fr"],
        "calculators": [
            {
                "id": "sole-proprietor-tax-calculator",
                "title_native": "Canadian Sole Proprietor Income Tax & CPP Calculator",
                "title_en": "Canadian Sole Proprietor Income Tax & CPP Calculator",
                "search_terms_native": ["canada self employed tax calculator 2026", "cpp self employed calculation", "gst hst threshold calculator"],
                "description_native": "Calculate combined Federal + Provincial income tax and both employee/employer CPP contributions.",
                "category": "tax",
                "inputs": [
                    {"name": "net_business_income", "label_native": "Net Business Income (CAD $)", "type": "number"},
                    {"name": "province", "label_native": "Province", "type": "select", "options": [
                        {"value": "on", "label": "Ontario"},
                        {"value": "bc", "label": "British Columbia"},
                        {"value": "qc", "label": "Quebec (QPP)"},
                        {"value": "ab", "label": "Alberta"}
                    ]}
                ],
                "formula_explanation": "Combines Federal brackets + Provincial progressive rates + double CPP (11.9% total up to YMPE cap).",
                "affiliate_targets": [
                    {"name": "Wealthsimple Tax", "type": "software", "description": "Free tax filing platform for Canadians"},
                    {"name": "FreshBooks Canada", "type": "software", "description": "Canadian-built invoicing software for contractors"}
                ]
            }
        ]
    },
    # 8. Japan
    {
        "country": "Japan",
        "country_code": "JP",
        "languages": ["ja"],
        "calculators": [
            {
                "id": "kojin-jigyo-tax-calculator",
                "title_native": "個人事業主の税金・国民健康保険料シミュレーター (2026年)",
                "title_en": "Japan Sole Proprietorship Tax & NHI Calculator",
                "search_terms_native": ["個人事業主 税金 シミュレーター", "青色申告 控除 計算", "国民健康保険料 計算 2026"],
                "description_native": "所得税、住民税、個人事業税、および国民健康保険料を青色申告特別控除（65万円）込みで一括計算します。",
                "category": "tax",
                "inputs": [
                    {"name": "gross_revenue", "label_native": "年間売上高 (円)", "type": "number"},
                    {"name": "expenses", "label_native": "必要経費 (円)", "type": "number"},
                    {"name": "blue_deduction", "label_native": "青色申告特別控除", "type": "select", "options": [
                        {"value": "650000", "label": "65万円控除 (e-Tax送信)"},
                        {"value": "550000", "label": "55万円控除"},
                        {"value": "100000", "label": "10万円控除 (白色/簡易)"}
                    ]}
                ],
                "formula_explanation": "Taxable Income = Revenue - Expenses - Blue Deduction - Basic Exemption (480,000 yen). Progressively taxes 5% to 45% + 10% Local Tax.",
                "affiliate_targets": [
                    {"name": "freee (フリー)", "type": "software", "description": "日本最大のクラウド会計ソフト (アフィリエイト報酬多数)"},
                    {"name": "マネーフォワード クラウド", "type": "software", "description": "確定申告・会計ソフト"},
                    {"name": "GMOあおぞらネット銀行", "type": "neobank", "description": "個人事業主向けネット銀行口座"}
                ]
            }
        ]
    },
    # 9. India
    {
        "country": "India",
        "country_code": "IN",
        "languages": ["en", "hi"],
        "calculators": [
            {
                "id": "section-44ada-presumptive-tax",
                "title_native": "Section 44ADA Presumptive Tax Calculator for Freelancers",
                "title_en": "Section 44ADA Presumptive Tax Calculator for Freelancers",
                "search_terms_native": ["section 44ada calculator 2026", "freelancer tax calculator india", "presumptive taxation professionals"],
                "description_native": "Calculate taxable income under Section 44ADA where professionals only pay tax on 50% of gross receipts.",
                "category": "tax",
                "inputs": [
                    {"name": "gross_receipts", "label_native": "Gross Annual Receipts (₹)", "type": "number"},
                    {"name": "tax_regime", "label_native": "Tax Regime", "type": "select", "options": [
                        {"value": "new", "label": "New Tax Regime (Default 2026)"},
                        {"value": "old", "label": "Old Tax Regime (With 80C deductions)"}
                    ]}
                ],
                "formula_explanation": "Presumptive profit = 50% of Receipts (up to ₹75 Lakhs threshold). Tax calculated on presumptive profit using slab rates.",
                "affiliate_targets": [
                    {"name": "ClearTax India", "type": "software", "description": "Top tax filing platform for Indian IT professionals"},
                    {"name": "RazorpayX", "type": "neobank", "description": "Business banking for Indian freelancers and startups"}
                ]
            }
        ]
    },
    # 10. Mexico
    {
        "country": "Mexico",
        "country_code": "MX",
        "languages": ["es"],
        "calculators": [
            {
                "id": "resico-isr-iva-calculator",
                "title_native": "Calculadora RESICO (Régimen Simplificado de Confianza 2026)",
                "title_en": "Mexico RESICO Tax & IVA Calculator",
                "search_terms_native": ["calculadora resico 2026", "tabla isr resico personas fisicas", "calculo iva resico"],
                "description_native": "Calcula el ISR preferencial (1% al 2.5%) y la retención del IVA para personas físicas en RESICO.",
                "category": "tax",
                "inputs": [
                    {"name": "monthly_income", "label_native": "Ingresos Cobrados al Mes (MXN $)", "type": "number"}
                ],
                "formula_explanation": "RESICO ISR rates: up to $25k MXN (1%), $50k (1.1%), $83k (1.5%), $208k (2%), $3.5M (2.5%).",
                "affiliate_targets": [
                    {"name": "Konfío", "type": "neobank", "description": "Crédito y tarjeta de negocios para PMEs mexicanas"},
                    {"name": "Alegra México", "type": "software", "description": "Facturación electrónica CFDI y contabilidad"}
                ]
            }
        ]
    }
]

for item in country_data:
    filename = f"{item['country_code'].lower()}.json"
    filepath = os.path.join(DATABASE_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(item, f, ensure_ascii=False, indent=2)
    print(f"Successfully generated database entry: {filepath}")

print(f"Total countries initialized in database: {len(country_data)}")
