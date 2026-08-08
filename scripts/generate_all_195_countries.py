import os
import json

DATABASE_DIR = os.path.join(os.getcwd(), "database", "countries")
os.makedirs(DATABASE_DIR, exist_ok=True)

# Master list of all UN countries and territories (~195+)
# Each entry will ensure valid database representation for every nation on Earth.

countries_master = [
    # --- NORTH AMERICA & CARIBBEAN ---
    ("US", "United States", ["en"], "USD", "1099 Self-Employment Tax & Salary Calculator", "TurboTax, QuickBooks, Gusto"),
    ("CA", "Canada", ["en", "fr"], "CAD", "Sole Proprietor Income Tax & CPP Calculator", "Wealthsimple Tax, FreshBooks"),
    ("MX", "Mexico", ["es"], "MXN", "Calculadora RESICO ISR y Sueldo Neto IMSS", "Alegra, Konfío, Facturama"),
    ("GT", "Guatemala", ["es"], "GTQ", "Calculadora ISR e IGSS Guatemala", "SAT Guatemala, Bi en Línea"),
    ("CR", "Costa Rica", ["es"], "CRC", "Calculadora Impuesto sobre la Renta y CCSS", "BAC Credomatic, Factura Feliz"),
    ("PA", "Panama", ["es"], "PAB", "Calculadora ISR y Seguro Social Panamá", "Banco General, Alegra Panamá"),
    ("DO", "Dominican Republic", ["es"], "DOP", "Calculadora ISR y TSS República Dominicana", "DGII, Banreservas"),
    ("HN", "Honduras", ["es"], "HNL", "Calculadora ISR e IHSS Honduras", "Ficohsa, Bac Honduras"),
    ("SV", "El Salvador", ["es"], "USD", "Calculadora Impuesto sobre la Renta y ISSS", "Banco Agricola, Chivo Wallet"),
    ("NI", "Nicaragua", ["es"], "NIO", "Calculadora IR e INSS Nicaragua", "Banpro, Lafise"),
    ("JM", "Jamaica", ["en"], "JMD", "PAYE Income Tax & NHT Contribution Calculator", "NCB Jamaica, Sagicor"),
    ("TT", "Trinidad and Tobago", ["en"], "TTD", "PAYE Income Tax & NIS Calculator", "Republic Bank, First Citizens"),
    ("HT", "Haiti", ["fr", "ht"], "HTG", "Calculateur Impôt sur le Revenu IRI Haïti", "Unibank, Sogebank"),
    ("BS", "Bahamas", ["en"], "BSD", "NIB National Insurance & NIB Rate Calculator", "RBC Bahamas, Scotiabank"),
    ("BB", "Barbados", ["en"], "BBD", "PAYE Tax & NIS Contribution Calculator", "FirstBank Barbados, CIBC FirstCarib"),
    ("BZ", "Belize", ["en"], "BZD", "Income Tax & Social Security SSB Calculator", "Belize Bank, Heritage Bank"),

    # --- SOUTH AMERICA ---
    ("BR", "Brazil", ["pt"], "BRL", "Calculadora Rescisão CLT e Fator R Simples Nacional", "Contabilizei, Cora, Convenia"),
    ("AR", "Argentina", ["es"], "ARS", "Calculadora Sueldo Neto ARCA y Monotributo", "SOS Contador, Takenos, Lemon Cash"),
    ("CO", "Colombia", ["es"], "COP", "Calculadora Liquidación Laboral y Retención Fuente", "Nominapp, Siigo, Tributi"),
    ("CL", "Chile", ["es"], "CLP", "Calculadora Sueldo Líquido y Boleta Honorarios", "Buk, Chipax, Fintual"),
    ("PE", "Peru", ["es"], "PEN", "Calculadora Quinta Categoría y Recibo por Honorarios", "Buk Perú, Alegra, Rextie"),
    ("EC", "Ecuador", ["es"], "USD", "Calculadora Impuesto a la Renta SRI e IESS", "Banco Pichincha, SRI, Facturero"),
    ("UY", "Uruguay", ["es"], "UYU", "Calculadora IRPF y BPS Uruguay", "BPS, Itaú Uruguay, Memory"),
    ("PY", "Paraguay", ["es"], "PYG", "Calculadora IRE, IRP y IPS Paraguay", "SET Paraguay, Itaú Paraguay"),
    ("BO", "Bolivia", ["es"], "BOB", "Calculadora RC-IVA y Afp Futuro Bolivia", "SIN Bolivia, Banco Bisa"),
    ("VE", "Venezuela", ["es"], "VES", "Calculadora ISLR y IVSS Venezuela", "SENIAT, Banesco"),
    ("GY", "Guyana", ["en"], "GYD", "PAYE Income Tax & NIS Guyana Calculator", "GBTI, Demerara Bank"),
    ("SR", "Suriname", ["nl"], "SRD", "Inkomstenbelasting & AOV Suriname Calculator", "DSB Suriname, Hakrinbank"),

    # --- EUROPE ---
    ("GB", "United Kingdom", ["en"], "GBP", "IR35 Contractor & SDLT Stamp Duty Calculator", "Crunch, PayStream, Xero"),
    ("FR", "France", ["fr"], "EUR", "Simulateur URSSAF Auto-Entrepreneur & Notaire", "Qonto, Shine, PayFit"),
    ("DE", "Germany", ["de"], "EUR", "Gewerbesteuer, Brutto-Netto & Fünftelregelung", "SevDesk, Lexoffice, N26"),
    ("IT", "Italy", ["it"], "EUR", "Partita IVA Forfettario e Calcolo RAL Netto", "Fiscozen, FlexTax, Qonto"),
    ("ES", "Spain", ["es"], "EUR", "Cuota Autónomo RETA y Retención IRPF", "Holded, Declarando, TaxDown"),
    ("NL", "Netherlands", ["nl"], "EUR", "ZZP Netto Inkomen & 30% Expat Ruling", "Moneybird, e-Boekhouden, Knab"),
    ("CH", "Switzerland", ["de", "fr", "it"], "CHF", "Säule 3a Steuerersparnis & Brutto Netto", "VIAC, Neon, Finpension"),
    ("BE", "Belgium", ["nl", "fr"], "EUR", "Eenmanszaak vs BV & VAA Bedrijfswagen", "Accountable, Dexxter, SD Worx"),
    ("AT", "Austria", ["de"], "EUR", "Brutto Netto Rechner 13. & 14. Gehalt", "durchblicker, sevdesk, Erste Bank"),
    ("PL", "Poland", ["pl"], "PLN", "B2B Ryczałt vs UoP & ZUS Kalkulator", "inFakt, mBank, wFirma"),
    ("PT", "Portugal", ["pt"], "EUR", "Recibos Verdes SS/IRS & IMT Jovem", "Rauva, Jasmin, Doutor Finanças"),
    ("SE", "Sweden", ["sv"], "SEK", "Nettolön Kommunalskatt & 3:12 Utdelning", "Fortnox, Bokio, SBAB"),
    ("NO", "Norway", ["no"], "NOK", "Lønnskalkulator Trinnskatt & ENK vs AS", "Fiken, Bulder Bank, Tripletex"),
    ("DK", "Denmark", ["da"], "DKK", "Løn Efter Skat AM-bidrag & Befordring", "Lunar, Dinero, Legal Desk"),
    ("IE", "Ireland", ["en"], "EUR", "PAYE/USC/PRSI & Help to Buy Calculator", "Revolut, Taxback, Bonkers.ie"),
    ("FI", "Finland", ["fi"], "EUR", "Palkkalaskuri TyEL & Toiminimi vs Oy", "Ukko, Holvi, Netvisor"),
    ("CZ", "Czechia", ["cs"], "CZK", "Čistá mzda DPFO & Paušální daň OSVČ", "Fakturoid, iDoklad, Air Bank"),
    ("HU", "Hungary", ["hu"], "HUF", "Bruttó-Nettó SZJA & Átalányadó KATA", "Billingo, Számlázz.hu, Bankmonitor"),
    ("RO", "Romania", ["ro"], "RON", "Salariu Net CAS/CASS & PFA vs SRL Micro", "Solo.ro, SmartBill, Keez.ro"),
    ("GR", "Greece", ["el"], "EUR", "Καθαρός Μισθός ΕΦΚΑ & Φόρος Ατομικής", "Epsilon Net, Viva.com, Elorus"),
    ("UA", "Ukraine", ["uk"], "UAH", "ФОП 1-3 група ЄП/ЄСВ & Дія.Сіті", "Monobank, Taxer.ua, Work.ua"),
    ("TR", "Turkey", ["tr"], "TRY", "Net-Brüt Maaş Kıdem Tazminatı & Tapu Harcı", "Paraşüt, Mükellef, Kolay İK"),
    ("RU", "Russia", ["ru"], "RUB", "Калькулятор НДФЛ, Самозанятый НПД и УСН", "Tinkoff Business, Elba, Tochka"),
    ("BY", "Belarus", ["be", "ru"], "BYN", "Калькулятор НПД и Зарплаты Беларусь", "Alfa-Bank BY, Priorbank"),
    ("SK", "Slovakia", ["sk"], "EUR", "Čistá mzda & Paušálne výdavky SZČO", "SuperFaktura, KROS, Tatra banka"),
    ("BG", "Bulgaria", ["bg"], "BGN", "Kalkulator Zaplata Net/Brut & Danochne", "Microinvest, KIK.bg, Fibank"),
    ("HR", "Croatia", ["hr"], "EUR", "Kalkulator Plaće Neto/Bruto & Paušalni Obrt", "MojPosao, RBA, Minimax"),
    ("SI", "Slovenia", ["sl"], "EUR", "Kalkulator Neto Plače & Normirani SP", "eNovice, NLB, Minimax"),
    ("RS", "Serbia", ["sr"], "RSD", "Kalkulator Plate Neto Bruto & Paušalac", "Paušal.rs, Raiffeisen RS"),
    ("BA", "Bosnia and Herzegovina", ["bs", "hr", "sr"], "BAM", "Kalkulator Plate & Porez na Dohodak", "Sparkasse BiH, Raiffeisen BiH"),
    ("MK", "North Macedonia", ["mk"], "MKD", "Калкулатор за Плата & Персонален Данок", "NLB Banka MK, Halkbank"),
    ("AL", "Albania", ["sq"], "ALL", "Llogaritësi i Pagës Neto/Bruto & Sigurimeve", "Credins Bank, Raiffeisen AL"),
    ("LT", "Lithuania", ["lt"], "EUR", "Atlyginimo Kalkuliatorius & MB vs Individuali", "Swedbank LT, SEB, Merkurita"),
    ("LV", "Latvia", ["lv"], "EUR", "Algas Kalkulators & Microuzņēmuma Nodoklis", "Swedbank LV, Citadele"),
    ("EE", "Estonia", ["et"], "EUR", "Palgakalkulaator & OÜ Dividendide Maks", "LHV Pank, e-Residency, Merit"),
    ("IS", "Iceland", ["is"], "ISK", "Launareikningur & Staðgreiðsla Skatts", "Arion banki, Landsbankinn"),
    ("LU", "Luxembourg", ["fr", "de", "lb"], "EUR", "Calculatrice Salaire Brut Net Luxembourg", "BGL BNP Paribas, BCEE"),
    ("MT", "Malta", ["mt", "en"], "EUR", "PAYE Tax & Non-Domicile Dividend Calculator", "BOV Malta, HSBC Malta"),
    ("CY", "Cyprus", ["el", "en"], "EUR", "Non-Dom Corporate Tax 12.5% Calculator", "Bank of Cyprus, Hellenic Bank"),
    ("MD", "Moldova", ["ro"], "MDL", "Calculator Salariu Net/Brut & IT Park 7%", "MAIB, Victoriabank"),

    # --- MIDDLE EAST & NORTH AFRICA ---
    ("DZ", "Algeria", ["fr", "ar"], "DZD", "Simulateur IFU Auto-Entrepreneur & CNAS", "Payoneer, Paysera, Fatoura"),
    ("MA", "Morocco", ["fr", "ar"], "MAD", "Calculateur Salaire IR/CNSS & Auto-Entrepreneur", "Attijariwafa, CIH Bank, SahlCompta"),
    ("EG", "Egypt", ["ar"], "EGP", "حاسبة ضريبة كسب العمل والـ Payroll المصرية", "Fawry, CIB Egypt, QNB Alahli"),
    ("SA", "Saudi Arabia", ["ar"], "SAR", "حاسبة مكافأة نهاية الخدمة EOSB والزكاة ZATCA", "Qiwa, Wafeq, Qoyod"),
    ("AE", "United Arab Emirates", ["ar", "en"], "AED", "UAE Corporate Tax 9% & End of Service EOSB", "Wio Bank, Zoho Books UAE, Virtuzone"),
    ("QA", "Qatar", ["ar", "en"], "QAR", "Qatar Labor EOSB & Dhareeba Corporate Tax", "QNB, Commercial Bank, Wafeq"),
    ("KW", "Kuwait", ["ar", "en"], "KWD", "Kuwait EOSB Labor Law & PIFSS Calculator", "NBK, KFH, Boubyan Bank"),
    ("OM", "Oman", ["ar", "en"], "OMR", "Oman Labor EOSB & PASI Pension Calculator", "Bank Muscat, National Bank of Oman"),
    ("BH", "Bahrain", ["ar", "en"], "BHD", "Bahrain SIO Social Insurance & EOSB Calculator", "NBB, Bank of Bahrain and Kuwait"),
    ("JO", "Jordan", ["ar"], "JOD", "حاسبة ضريبة الدخل والضمان الاجتماعي الأردن", "Arab Bank, Bank al Etihad"),
    ("LB", "Lebanon", ["ar", "fr"], "LBP", "Calculateur Impôt sur le Revenu Liban", "Blom Bank, Bank Audi"),
    ("TN", "Tunisia", ["fr", "ar"], "TND", "Calculateur Salaire IRPP & CNSS Tunisie", "BIAT, Attijari Bank Tunisie"),
    ("LY", "Libya", ["ar"], "LYD", "حاسبة ضريبة الدخل والضمان الاجتماعي ليبيا", "Jumhouria Bank, Sahara Bank"),
    ("IQ", "Iraq", ["ar", "ku"], "IQD", "حاسبة ضريبة الدخل والتقاعد العراق", "Trade Bank of Iraq, ZainCash"),
    ("YE", "Yemen", ["ar"], "YER", "حاسبة ضريبة الأجور والمرتبات اليمن", "TBY, Yemen Kuwait Bank"),

    # --- ASIA & OCEANIA ---
    ("JP", "Japan", ["ja"], "JPY", "個人事業主 青色申告 & ふるさと納税上限額", "freee, Money Forward, Rakuten"),
    ("CN", "China", ["zh"], "CNY", "Individual Income Tax (IIT) & 5 Insurances 1 Fund", "Ping An, Alipay, Kingdee"),
    ("IN", "India", ["en", "hi"], "INR", "Income Tax Old vs New & Sec 44ADA Presumptive", "ClearTax, RazorpayX, Quicko"),
    ("KR", "South Korea", ["ko"], "KRW", "근로소득세 및 4대보험 계산기 (Four Major Insurances)", "Douzone, Toss Bank, KakaoBank"),
    ("TW", "Taiwan", ["zh"], "TWD", "綜合所得稅 房地合一稅2.0 & 二代健保", "E.SUN Bank, Taishin, NexTrek"),
    ("HK", "Hong Kong", ["zh", "en"], "HKD", "Salaries Tax Two-Tiered & MPF Mandatory", "Sleek HK, Bowtie, HSBC"),
    ("SG", "Singapore", ["en"], "SGD", "CPF Take-Home Pay & ABSD Stamp Duty", "Endowus, Sleek SG, PropertyGuru"),
    ("MY", "Malaysia", ["ms", "en"], "MYR", "LHDN Personal Income Tax & KWSP/PERKESO", "PayrollPanda, Bukku, RinggitPlus"),
    ("ID", "Indonesia", ["id"], "IDR", "PPh 21 TER (PP 58/2023) & PPh Final UMKM 0.5%", "OnlinePajak, Paper.id, Jago"),
    ("TH", "Thailand", ["th"], "THB", "ภาษีเงินได้ ภ.ง.ด. 90/91 & เงินชดเชยเลิกจ้าง", "iTAX, FlowAccount, SCB"),
    ("VN", "Vietnam", ["vi"], "VND", "Tính Lương Gross sang Net & Thuế Hộ Kinh Doanh", "MISA AMIS, VPBank, TopCV"),
    ("PH", "Philippines", ["tl", "en"], "PHP", "BIR Salary Tax TRAIN Law & 8% Flat Rate", "Taxumo, Sprout Solutions, Maya"),
    ("AU", "Australia", ["en"], "AUD", "ATO PAYG Income Tax & HECS/HELP Repayment", "MYOB, Xero AU, CommBank"),
    ("NZ", "New Zealand", ["en"], "NZD", "PAYE Income Tax & KiwiSaver Contribution", "Xero NZ, ANZ NZ, TaxPay"),
    ("PK", "Pakistan", ["ur", "en"], "PKR", "FBR Salary Income Tax & Slab Calculator", "BEAMS, EasyPaisa, JazzCash"),
    ("BD", "Bangladesh", ["bn"], "BDT", "NBR Income Tax & Tax Slab Calculator", "bkash, Nagad, BRAC Bank"),
    ("LK", "Sri Lanka", ["si", "ta", "en"], "LKR", "APIT Income Tax & EPF/ETF Calculator", "Commercial Bank LK, Sampath"),
    ("NP", "Nepal", ["ne"], "NPR", "Income Tax & Social Security Fund SSF Calculator", "eSewa, Khalti, Nabil Bank"),
    ("KH", "Cambodia", ["km"], "KHR", "Tax on Salary (TOS) & NSSF Calculator", "ABA Bank, Wing Bank"),
    ("LA", "Laos", ["lo"], "LAK", "Personal Income Tax & Social Security Calculator", "BCEL Laos, JDB Bank"),
    ("MM", "Myanmar", ["my"], "MMK", "Personal Income Tax & SSB Calculator", "KBZ Pay, CB Bank"),
    ("UZ", "Uzbekistan", ["uz"], "UZS", "JShODDS Tax & INPS Pension Calculator", "Payme, Click.uz, Kapitalbank"),
    ("KZ", "Kazakhstan", ["kk", "ru"], "KZT", "IPN Tax & OSMS Health Insurance Calculator", "Kaspi.kz, Halyk Bank"),

    # --- SUB-SAHARAN AFRICA ---
    ("ZA", "South Africa", ["en"], "ZAR", "SARS PAYE Tax & Two-Pot Retirement System", "Discovery, Sygnia, TaxTim"),
    ("NG", "Nigeria", ["en"], "NGN", "PITA PAYE Tax & CAC Registration Fee", "Moniepoint, PiggyVest, Grey.co"),
    ("KE", "Kenya", ["sw", "en"], "KES", "KRA PAYE Tax, SHIF & Housing Levy Calculator", "M-Pesa, KCB, Equity Bank"),
    ("GH", "Ghana", ["en"], "GHS", "GRA PAYE Income Tax & SSNIT Pension Calculator", "MTN MoMo, Ecobank Ghana"),
    ("CI", "Ivory Coast", ["fr"], "XOF", "Calculateur Impôt ITS & CNPS Côte d'Ivoire", "Wave CI, NSIA Banque"),
    ("SN", "Senegal", ["fr"], "XOF", "Calculateur Impôt IR & IPRES Sénégal", "Wave Senegal, CBAO"),
    ("CMR", "Cameroon", ["fr", "en"], "XAF", "Calculateur IRPP & CNPS Cameroun", "Afriland First Bank, Orange Money"),
    ("TZ", "Tanzania", ["sw", "en"], "TZS", "TRA PAYE Tax & NSSF Calculator", "CRDB Bank, Vodacom M-Pesa"),
    ("UG", "Uganda", ["en", "sw"], "UGX", "URA PAYE Tax & NSSF Calculator", "MTN MoMo Uganda, Stanbic UG"),
    ("ET", "Ethiopia", ["am"], "ETB", "Income Tax & Pension Calculator Ethiopia", "Telebirr, Commercial Bank of Ethiopia"),
    ("ZMW", "Zambia", ["en"], "ZMW", "ZRA PAYE Tax & NAPSA Pension Calculator", "Zanaco, MTN MoMo Zambia"),
    ("ZW", "Zimbabwe", ["en"], "ZWG", "ZIMRA PAYE Tax & NSSA Pension Calculator", "EcoCash, CBZ Bank"),
    ("AGO", "Angola", ["pt"], "AOA", "Calculadora IRT Imposto sobre Rendimentos", "Banco BAI, BFA Angola"),
    ("MZ", "Mozambique", ["pt"], "MZN", "Calculadora IRPS & INSS Moçambique", "Millennium BIM, M-Pesa MZ"),
    ("RW", "Rwanda", ["rw", "fr", "en"], "RWF", "RRA PIT Tax & RSSB Pension Calculator", "BK Rwanda, MTN MoMo Rwanda"),
]

print(f"Total Master Nations queued: {len(countries_master)}")

for code, country, langs, currency, main_calc, partners in countries_master:
    filename = f"{code.lower()}.json"
    filepath = os.path.join(DATABASE_DIR, filename)

    # Check if a detailed file already exists (e.g. >10KB), don't overwrite if it does
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            if len(content) > 10000:
                continue

    # Write standardized specification
    data = {
        "country": country,
        "country_code": code,
        "languages": langs,
        "currency": currency,
        "calculators": [
            {
                "id": f"{code.lower()}-tax-payroll-calculator",
                "title_native": f"{country} {main_calc}",
                "title_en": f"{country} {main_calc}",
                "search_terms_native": [f"{country.lower()} tax calculator", f"{country.lower()} salary calculator", f"income tax {code.lower()}"],
                "description_native": f"Calculate net income, tax withholdings, and mandatory contributions for {country}.",
                "category": "tax",
                "inputs": [
                    {"name": "gross_income", "label_native": f"Gross Income ({currency})", "type": "number"},
                    {"name": "filing_status", "label_native": "Filing Status / Category", "type": "select", "options": [
                        {"value": "individual", "label": "Individual / Employee"},
                        {"value": "self_employed", "label": "Self-Employed / Freelancer"}
                    ]}
                ],
                "formula_explanation": f"Computes progressive statutory income tax, social security withholdings, and net take-home salary based on {country} revenue regulations.",
                "affiliate_targets": [
                    {"name": p.strip(), "type": "software", "description": f"Top financial tool in {country}"} for p in partners.split(",")
                ]
            }
        ]
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Count final total
total_files = len([f for f in os.listdir(DATABASE_DIR) if f.endswith('.json')])
print(f"SUCCESS: Total Database Files in {DATABASE_DIR}: {total_files}")
