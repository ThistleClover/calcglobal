export const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  'fr': {
    'BUSINESS': 'Entreprise & Indépendants',
    'EMPLOYMENT': 'Salariat & RH',
    'REAL_ESTATE': 'Immobilier',
    'LEGAL': 'Juridique',
    'FINANCE': 'Finance & Investissement',
    'TAX': 'Impôts & Taxes',
    'VEHICLE': 'Véhicules & Mobilité'
  },
  'de': {
    'BUSINESS': 'Unternehmen & Selbstständige',
    'EMPLOYMENT': 'Beschäftigung & HR',
    'REAL_ESTATE': 'Immobilien',
    'LEGAL': 'Recht & Legal',
    'FINANCE': 'Finanzen & Investitionen',
    'TAX': 'Steuern',
    'VEHICLE': 'Fahrzeuge & Mobilität'
  },
  'es': {
    'BUSINESS': 'Empresa y Autónomos',
    'EMPLOYMENT': 'Empleo y Nómina',
    'REAL_ESTATE': 'Inmobiliario y Vivienda',
    'LEGAL': 'Legal y Laboral',
    'FINANCE': 'Finanzas e Inversión',
    'TAX': 'Impuestos y Fiscalidad',
    'VEHICLE': 'Vehículos y Movilidad'
  },
  'it': {
    'BUSINESS': 'Aziende e Partita IVA',
    'EMPLOYMENT': 'Lavoro e Stipendio',
    'REAL_ESTATE': 'Immobiliare e Casa',
    'LEGAL': 'Legale e Lavoro',
    'FINANCE': 'Finanza e Investimenti',
    'TAX': 'Tasse e Fisco',
    'VEHICLE': 'Veicoli e Mobilità'
  },
  'pt': {
    'BUSINESS': 'Empresas e PJ',
    'EMPLOYMENT': 'Trabalho e CLT',
    'REAL_ESTATE': 'Imóveis e Cartório',
    'LEGAL': 'Jurídico e Trabalhista',
    'FINANCE': 'Finanças e Investimentos',
    'TAX': 'Impostos e Tributos',
    'VEHICLE': 'Veículos e Mobilidade'
  },
  'ja': {
    'BUSINESS': '法人・個人事業主',
    'EMPLOYMENT': '給与・雇用・社会保険',
    'REAL_ESTATE': '不動産・住宅',
    'LEGAL': '法律・労働',
    'FINANCE': '金融・資産運用',
    'TAX': '税金・確定申告',
    'VEHICLE': '自動車・モビリティ'
  },
  'en': {
    'BUSINESS': 'Business & Self-Employed',
    'EMPLOYMENT': 'Employment & HR',
    'REAL_ESTATE': 'Real Estate',
    'LEGAL': 'Legal',
    'FINANCE': 'Finance & Investment',
    'TAX': 'Taxes',
    'VEHICLE': 'Vehicles'
  }
};

export function getTranslatedCategory(categoryKey: string, langCode: string = 'en'): string {
  if (!categoryKey) return '';
  const baseLang = (langCode || 'en').split('-')[0].toLowerCase();
  const key = (categoryKey || '').toUpperCase();
  
  if (CATEGORY_TRANSLATIONS[baseLang] && CATEGORY_TRANSLATIONS[baseLang][key]) {
    return CATEGORY_TRANSLATIONS[baseLang][key];
  }
  
  if (CATEGORY_TRANSLATIONS['en'] && CATEGORY_TRANSLATIONS['en'][key]) {
    return CATEGORY_TRANSLATIONS['en'][key];
  }
  
  return categoryKey.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  'fr': {
    'RECOMMENDED_TOOLS': 'Outils recommandés',
    'GET_STARTED': 'Découvrir →',
    'FAQ_TITLE': 'Questions Fréquemment Posées',
    'DISCLAIMER_TEXT': 'Avertissement : Les résultats sont des estimations basées sur les règles fiscales standard pour l\'année fiscale 2026 et sont fournis à titre informatif uniquement. Votre situation individuelle (déductions, crédits, règles locales) peut affecter considérablement votre impôt réel. Consultez toujours un professionnel de la fiscalité qualifié.',
    'AFFILIATE_DISCLOSURE': 'Certains liens sont des liens d\'affiliation. Nous pouvons recevoir une commission sans aucun coût supplémentaire pour vous.',
    'ENTER_DETAILS': 'Entrez vos informations',
    'CALCULATE': 'Calculer',
    'CALCULATING': 'Calcul en cours...',
    'ENTER_DETAILS_CALCULATE': 'Entrez vos informations et cliquez sur Calculer',
    'ESTIMATED_NET': 'Revenu Net Estimé',
    'EFFECTIVE_RATE': 'Taux d\'imposition effectif :',
    'TAX_BREAKDOWN': 'Détail des Taxes',
    'QUARTERLY_PAYMENT': 'Paiement Trimestriel Estimé',
    'METHODOLOGY': 'Méthodologie de calcul',
    'QUARTERLY_DUE': 'Échéances: 15 Avr · 16 Juin · 15 Sep · 15 Jan',
    'TAKE_HOME': 'Net à Payer',
    'NET_INCOME': 'Revenu Net',
    'TOTAL_TAX': 'Total Taxes',
    'SELECT_PLACEHOLDER': 'Sélectionner...',
    'CALC_ERROR': 'Erreur de calcul. Veuillez vérifier vos données et réessayer.',
    'LOADING_CALC': 'Chargement du simulateur...',
    'YOUR_RESULTS': 'Vos Résultats',
    'SPONSORED': 'Sponsorisé',
    'FILL_DETAILS': 'Renseignez vos informations à gauche pour afficher le détail et l\'analyse de votre calcul.'
  },
  'de': {
    'RECOMMENDED_TOOLS': 'Empfohlene Tools',
    'GET_STARTED': 'Loslegen →',
    'FAQ_TITLE': 'Häufig Gestellte Fragen',
    'DISCLAIMER_TEXT': 'Haftungsausschluss: Die Ergebnisse sind Schätzungen basierend auf den Standardsteuervorschriften für das Steuerjahr 2026 und dienen nur zu Informationszwecken. Ihre individuelle Situation kann Ihre tatsächliche Steuerschuld erheblich beeinflussen. Konsultieren Sie immer einen qualifizierten Steuerberater.',
    'AFFILIATE_DISCLOSURE': 'Einige Links sind Affiliate-Partnerschaften. Wir erhalten möglicherweise eine Provision ohne zusätzliche Kosten für Sie.',
    'ENTER_DETAILS': 'Geben Sie Ihre Daten ein',
    'CALCULATE': 'Berechnen',
    'CALCULATING': 'Wird berechnet...',
    'ENTER_DETAILS_CALCULATE': 'Geben Sie Ihre Daten ein und klicken Sie auf Berechnen',
    'ESTIMATED_NET': 'Geschätztes Nettoeinkommen',
    'EFFECTIVE_RATE': 'Effektiver Steuersatz:',
    'TAX_BREAKDOWN': 'Steueraufschlüsselung',
    'QUARTERLY_PAYMENT': 'Geschätzte vierteljährliche Zahlung',
    'METHODOLOGY': 'Berechnungsmethode',
    'QUARTERLY_DUE': 'Fällig: 15. Apr · 16. Jun · 15. Sep · 15. Jan',
    'TAKE_HOME': 'Netto',
    'NET_INCOME': 'Nettoeinkommen',
    'TOTAL_TAX': 'Gesamtsteuer',
    'SELECT_PLACEHOLDER': 'Auswählen...',
    'CALC_ERROR': 'Berechnungsfehler. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.',
    'LOADING_CALC': 'Rechner wird geladen...',
    'YOUR_RESULTS': 'Ihre Ergebnisse',
    'SPONSORED': 'Gesponsert',
    'FILL_DETAILS': 'Geben Sie Ihre Daten links ein, um eine vollständige Aufschlüsselung und Analyse zu erhalten.'
  },
  'es': {
    'RECOMMENDED_TOOLS': 'Herramientas recomendadas',
    'GET_STARTED': 'Comenzar →',
    'FAQ_TITLE': 'Preguntas Frecuentes',
    'DISCLAIMER_TEXT': 'Aviso legal: Los resultados son estimaciones basadas en la normativa fiscal de 2026 y se facilitan solo con fines informativos. Su situación individual puede afectar a sus impuestos reales. Consulte siempre a un asesor fiscal o contable cualificado.',
    'AFFILIATE_DISCLOSURE': 'Algunos enlaces son de afiliados. Podemos recibir una comisión sin coste adicional para usted.',
    'ENTER_DETAILS': 'Introduzca sus datos',
    'CALCULATE': 'Calcular',
    'CALCULATING': 'Calculando...',
    'ENTER_DETAILS_CALCULATE': 'Introduzca sus datos y haga clic en Calcular',
    'ESTIMATED_NET': 'Ingreso Neto Estimado',
    'EFFECTIVE_RATE': 'Tipo impositivo efectivo:',
    'TAX_BREAKDOWN': 'Desglose de Impuestos',
    'QUARTERLY_PAYMENT': 'Pago Fraccionado Trimestral Estimado',
    'METHODOLOGY': 'Metodología de cálculo',
    'QUARTERLY_DUE': 'Vencimiento: 20 Abr · 20 Jul · 20 Oct · 30 Ene',
    'TAKE_HOME': 'Neto en Mano',
    'NET_INCOME': 'Ingreso Neto',
    'TOTAL_TAX': 'Total Impuestos',
    'SELECT_PLACEHOLDER': 'Seleccionar...',
    'CALC_ERROR': 'Error de cálculo. Por favor revise sus datos e inténtelo de nuevo.',
    'LOADING_CALC': 'Cargando calculadora...',
    'YOUR_RESULTS': 'Sus Resultados',
    'SPONSORED': 'Patrocinado',
    'FILL_DETAILS': 'Rellene sus datos a la izquierda para ver el desglose y análisis completo de sus impuestos.'
  },
  'it': {
    'RECOMMENDED_TOOLS': 'Strumenti consigliati',
    'GET_STARTED': 'Inizia ora →',
    'FAQ_TITLE': 'Domande Frequenti (FAQ)',
    'DISCLAIMER_TEXT': 'Disclaimer: I risultati sono stime basate sulle aliquote e normative fiscali standard per il 2026 e hanno scopo puramente informativo. La tua situazione personale può variare l\'imposta effettiva. Consulta sempre un commercialista qualificato.',
    'AFFILIATE_DISCLOSURE': 'Alcuni link sono partnership di affiliazione. Potremmo ricevere una commissione senza alcun costo aggiuntivo per te.',
    'ENTER_DETAILS': 'Inserisci i tuoi dati',
    'CALCULATE': 'Calcola',
    'CALCULATING': 'Calcolo in corso...',
    'ENTER_DETAILS_CALCULATE': 'Inserisci i tuoi dati e clicca su Calcola',
    'ESTIMATED_NET': 'Reddito Netto Stimato',
    'EFFECTIVE_RATE': 'Aliquota effettiva totale:',
    'TAX_BREAKDOWN': 'Dettaglio Imposte e Contributi',
    'QUARTERLY_PAYMENT': 'Acconto / Versamento Periodico Stimato',
    'METHODOLOGY': 'Metodologia di calcolo',
    'QUARTERLY_DUE': 'Scadenze F24: 16 del mese / Giugno · Novembre',
    'TAKE_HOME': 'Netto in Busta / Tasca',
    'NET_INCOME': 'Reddito Netto',
    'TOTAL_TAX': 'Totale Fisco e INPS',
    'SELECT_PLACEHOLDER': 'Seleziona...',
    'CALC_ERROR': 'Errore di calcolo. Verifica i dati inseriti e riprova.',
    'LOADING_CALC': 'Caricamento calcolatore...',
    'YOUR_RESULTS': 'I tuoi Risultati',
    'SPONSORED': 'Sponsorizzato',
    'FILL_DETAILS': 'Compila i dettagli a sinistra per visualizzare il riepilogo e l\'analisi fiscale completa.'
  },
  'pt': {
    'RECOMMENDED_TOOLS': 'Ferramentas recomendadas',
    'GET_STARTED': 'Acessar →',
    'FAQ_TITLE': 'Perguntas Frequentes (FAQ)',
    'DISCLAIMER_TEXT': 'Aviso legal: Os resultados são estimativas com base na legislação trabalhista e fiscal de 2026 para fins informativos. Fatores individuais podem alterar o cálculo real. Consulte sempre um contador ou advogado trabalhista.',
    'AFFILIATE_DISCLOSURE': 'Alguns links são de parceiros afiliados. Podemos receber comissão sem nenhum custo extra para você.',
    'ENTER_DETAILS': 'Informe seus dados',
    'CALCULATE': 'Calcular',
    'CALCULATING': 'Calculando...',
    'ENTER_DETAILS_CALCULATE': 'Preencha os campos e clique em Calcular',
    'ESTIMATED_NET': 'Rendimento Líquido Estimado',
    'EFFECTIVE_RATE': 'Alíquota efetiva de tributação:',
    'TAX_BREAKDOWN': 'Detalhamento de Descontos e Impostos',
    'QUARTERLY_PAYMENT': 'Estimativa de Pagamento Periódico',
    'METHODOLOGY': 'Metodologia de cálculo',
    'QUARTERLY_DUE': 'Vencimentos DARF / DAS: Todo dia 20',
    'TAKE_HOME': 'Líquido a Receber',
    'NET_INCOME': 'Rendimento Líquido',
    'TOTAL_TAX': 'Total de Deduções e Impostos',
    'SELECT_PLACEHOLDER': 'Selecionar...',
    'CALC_ERROR': 'Erro de cálculo. Verifique os dados informados e tente novamente.',
    'LOADING_CALC': 'Carregando calculadora...',
    'YOUR_RESULTS': 'Seus Resultados',
    'SPONSORED': 'Patrocinado',
    'FILL_DETAILS': 'Preencha os dados à esquerda para visualizar o detalhamento e a análise completa.'
  },
  'ja': {
    'RECOMMENDED_TOOLS': 'おすすめのシミュレーター',
    'GET_STARTED': '計算してみる →',
    'FAQ_TITLE': 'よくあるご質問（FAQ）',
    'DISCLAIMER_TEXT': '免責事項：計算結果は2026年（令和8年）の標準的な税法・社会保険料率に基づく概算シミュレーションであり、情報提供のみを目的としています。個別の控除条件や自治体により実際の納税額は異なる場合があります。正確な税務判断については税理士または所轄の税務署へご相談ください。',
    'AFFILIATE_DISCLOSURE': '一部のリンクにはアフィリエイトパートナーシップが含まれています。ユーザー様に追加費用が発生することなく紹介手数料を受け取る場合があります。',
    'ENTER_DETAILS': '条件を入力してください',
    'CALCULATE': '計算する',
    'CALCULATING': '計算中...',
    'ENTER_DETAILS_CALCULATE': '数値を入力して「計算する」をクリックしてください',
    'ESTIMATED_NET': '手取り概算額',
    'EFFECTIVE_RATE': '実質負担率：',
    'TAX_BREAKDOWN': '税金・社会保険料の内訳',
    'QUARTERLY_PAYMENT': '予定納税・四半期目安額',
    'METHODOLOGY': '計算の根拠・計算式',
    'QUARTERLY_DUE': '納期目安：7月・11月・翌年3月',
    'TAKE_HOME': '手取り額',
    'NET_INCOME': '純所得・手取り',
    'TOTAL_TAX': '税金・社会保険料合計',
    'SELECT_PLACEHOLDER': '選択してください...',
    'CALC_ERROR': '計算エラーが発生しました。入力内容をご確認の上、再試行してください。',
    'LOADING_CALC': '計算機を読み込み中...',
    'YOUR_RESULTS': '計算結果',
    'SPONSORED': 'スポンサー',
    'FILL_DETAILS': '左側の項目を入力すると、税金の内訳と詳細なシミュレーション結果が表示されます。'
  },
  'en': {
    'RECOMMENDED_TOOLS': 'Recommended Tools',
    'GET_STARTED': 'Get Started →',
    'FAQ_TITLE': 'Frequently Asked Questions',
    'DISCLAIMER_TEXT': 'Disclaimer: Results are estimates based on standard tax rules for the 2026 tax year and are provided for informational purposes only. Individual circumstances (deductions, credits, specific state/local rules) may significantly affect your actual tax liability. Always consult a qualified tax professional or accountant for advice specific to your situation.',
    'AFFILIATE_DISCLOSURE': 'Some links are affiliate partnerships. We may earn a commission at no cost to you.',
    'ENTER_DETAILS': 'Enter Your Details',
    'CALCULATE': 'Calculate',
    'CALCULATING': 'Calculating...',
    'ENTER_DETAILS_CALCULATE': 'Enter your details and click Calculate',
    'ESTIMATED_NET': 'Estimated Net Income',
    'EFFECTIVE_RATE': 'Effective tax rate:',
    'TAX_BREAKDOWN': 'Tax Breakdown',
    'QUARTERLY_PAYMENT': 'Quarterly Estimated Payment',
    'METHODOLOGY': 'How this was calculated (Methodology)',
    'QUARTERLY_DUE': 'Due: Apr 15 · Jun 16 · Sep 15 · Jan 15',
    'TAKE_HOME': 'Take-Home',
    'NET_INCOME': 'Net Income',
    'TOTAL_TAX': 'Total Tax',
    'SELECT_PLACEHOLDER': 'Select...',
    'CALC_ERROR': 'Calculation error. Please check your inputs and try again.',
    'LOADING_CALC': 'Loading calculator...',
    'YOUR_RESULTS': 'Your Results',
    'SPONSORED': 'Sponsored',
    'FILL_DETAILS': 'Fill in your details on the left to see your full tax breakdown and analysis.'
  }
};

export function getUITranslation(key: string, langCode: string = 'en'): string {
  if (!key) return '';
  const baseLang = (langCode || 'en').split('-')[0].toLowerCase();
  const upperKey = (key || '').toUpperCase();
  
  if (UI_TRANSLATIONS[baseLang] && UI_TRANSLATIONS[baseLang][upperKey]) {
    return UI_TRANSLATIONS[baseLang][upperKey];
  }
  
  if (UI_TRANSLATIONS['en'] && UI_TRANSLATIONS['en'][upperKey]) {
    return UI_TRANSLATIONS['en'][upperKey];
  }
  
  return key;
}
