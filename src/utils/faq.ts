// src/utils/faq.ts - Statutory FAQ Generator & Schema Helper for CalcGlobal

export interface FAQItem {
  question: string;
  answer: string;
}

interface CalcContext {
  id: string;
  title_native?: string;
  title_en?: string;
  category?: string;
  description_native?: string;
  formula_explanation?: string;
  article_faq?: FAQItem[];
}

interface CountryContext {
  country: string;
  country_code: string;
  currency?: string;
}

/**
 * Returns either existing curated FAQs from the database or generates
 * contextual, high-intent statutory Q&As for the calculator.
 */
export function getCalculatorFaqs(
  calc: CalcContext,
  country: CountryContext,
  lang: string = 'en'
): FAQItem[] {
  if (calc.article_faq && Array.isArray(calc.article_faq) && calc.article_faq.length > 0) {
    return calc.article_faq;
  }

  const baseLang = (lang || 'en').split('-')[0].toLowerCase();
  const id = calc.id.toLowerCase();
  const title = calc.title_en || calc.title_native || 'Calculator';
  const countryName = country.country;
  const curr = country.currency || '$';

  // 1. French Calculators
  if (baseLang === 'fr') {
    if (id.includes('urssaf') || id.includes('micro-entreprise') || id.includes('auto-entrepreneur')) {
      return [
        {
          question: "Quels sont les taux de cotisations sociales URSSAF en 2026 pour une micro-entreprise ?",
          answer: "Pour 2026, les cotisations sociales s'élèvent à 12,3% pour les activités d'achat/revente de marchandises (BIC) et 21,2% pour les prestations de services commerciales ou artisanales et les professions libérales (BNC). À cela s'ajoutent la contribution à la formation professionnelle (0,1% à 0,3%) et la taxe pour frais de chambre consulaire le cas échéant."
        },
        {
          question: "Comment fonctionne le versement libératoire de l'impôt sur le revenu en micro-entreprise ?",
          answer: "Le versement libératoire permet de payer son impôt sur le revenu tout au long de l'année au même rythme que les cotisations sociales (1% pour la vente, 1,7% pour les services BIC, 2,2% pour les BNC), à condition que le revenu fiscal de référence de l'avant-dernière année (N-2) ne dépasse pas le seuil légal par part fiscale."
        },
        {
          question: "Quels sont les plafonds de chiffre d'affaires applicables ?",
          answer: "Les plafonds de chiffre d'affaires pour conserver le régime de la micro-entreprise sont fixés à 188 700 € pour les activités de vente de biens et 77 700 € pour les prestations de services et professions libérales."
        }
      ];
    }
    if (id.includes('sasu') || id.includes('eurl') || id.includes('dividende')) {
      return [
        {
          question: "Faut-il privilégier le salaire ou les dividendes en société ?",
          answer: "En SASU, les dividendes ne sont pas soumis aux cotisations sociales mais au Prélèvement Forfaitaire Unique (Flat Tax de 30%), alors que les salaires subissent ~75-80% de charges sociales patronales et salariales mais ouvrent des droits complets à la retraite et prévoyance. En EURL (gérant majoritaire TNS), les cotisations sociales sur salaires sont plus faibles (~45%), mais les dividendes dépassant 10% du capital sont soumis aux cotisations sociales."
        },
        {
          question: "Comment est calculé l'Impôt sur les Sociétés (IS) ?",
          answer: "L'Impôt sur les Sociétés est prélevé au taux réduit de 15% sur la tranche de bénéfice fiscal jusqu'à 42 500 € (pour les PME éligibles), puis au taux normal de 25% au-delà."
        }
      ];
    }
    if (id.includes('salaire') || id.includes('brut-net')) {
      return [
        {
          question: "Quelle est la différence moyenne entre salaire brut et salaire net ?",
          answer: "Pour un salarié non-cadre, les cotisations sociales salariales représentent environ 22% à 23% du salaire brut. Pour un statut cadre, la déduction est généralement de 25% en raison des cotisations supplémentaires de prévoyance et de retraite complémentaire."
        },
        {
          question: "Le prélèvement à la source (PAS) est-il déduit du salaire net ?",
          answer: "Oui, le salaire net avant impôt est diminué du prélèvement à la source calculé selon votre taux personnalisé ou neutre transmis par l'administration fiscale, pour donner le 'net payé en euros' viré sur votre compte bancaire."
        }
      ];
    }
    if (id.includes('notaire') || id.includes('immobilier')) {
      return [
        {
          question: "De quoi sont composés les frais dits 'de notaire' ?",
          answer: "Les frais de notaire comprennent environ 80% de droits de mutation perçus pour l'État et les collectivités locales, 10% de débours et frais administratifs, et environ 10% de rémunération effective du notaire (émoluments réglementés)."
        }
      ];
    }
    return [
      {
        question: `Comment sont calculés les montants pour ${title} ?`,
        answer: `Les calculs intègrent les barèmes officiels et la réglementation fiscale en vigueur en ${countryName} pour l'année 2026/2027, en appliquant les seuils légaux, abattements et tranches progressives.`
      },
      {
        question: "Les résultats incluent-ils les déductions spécifiques ?",
        answer: "Le simulateur applique les règles légales standard. Vos options personnelles, crédits d'impôt spécifiques ou charges déductibles peuvent ajuster le montant net exact."
      }
    ];
  }

  // 2. German Calculators
  if (baseLang === 'de') {
    if (id.includes('brutto-netto') || id.includes('einkommensteuer')) {
      return [
        {
          question: "Welche Abzüge werden vom Bruttogehalt in Deutschland einbehalten?",
          answer: "Vom Bruttolohn werden die Lohnsteuer (abhängig von Steuerklasse I bis VI), der Solidaritätszuschlag (falls über Freigrenze), ggf. Kirchensteuer (8% oder 9%) sowie die gesetzlichen Sozialversicherungsbeiträge (Kranken-, Pflege-, Renten- und Arbeitslosenversicherung, insgesamt ca. 20-21% Arbeitnehmeranteil) abgezogen."
        },
        {
          question: "Wie hoch ist der Grundfreibetrag für das Steuerjahr 2026?",
          answer: "Der steuerliche Grundfreibetrag sichert das Existenzminimum ab und sorgt dafür, dass Einkommen bis zu diesem Betrag vollständig einkommensteuerfrei bleiben."
        }
      ];
    }
    return [
      {
        question: `Wie wird die Berechnung für ${title} durchgeführt?`,
        answer: `Die Berechnung basiert auf den aktuellen gesetzlichen Vorschriften und Steuertabellen für Deutschland im Jahr 2026.`
      },
      {
        question: "Sind die Ergebnisse rechtsverbindlich?",
        answer: "Die Berechnungen stellen Schätzungen dar und dienen der finanziellen Orientierung. Für verbindliche steuerliche Beratung empfiehlt sich die Rücksprache mit einem Steuerberater."
      }
    ];
  }

  // 3. Portuguese / Brazilian Calculators
  if (baseLang === 'pt') {
    if (id.includes('clt') || id.includes('pj') || id.includes('rescisao') || id.includes('simples')) {
      return [
        {
          question: "Qual a principal diferença entre contratação CLT e prestação de serviços PJ?",
          answer: "Na CLT, o trabalhador conta com garantias da Consolidação das Leis do Trabalho como 13º salário, férias remuneradas (+1/3), FGTS (8% + multa de 40% na demissão sem justa causa) e previdência INSS. No modelo PJ, a tributação é geralmente menor via Simples Nacional (Anexo III ou V) ou Lucro Presumido, mas exige a gestão própria de benefícios e emissão de notas fiscais."
        },
        {
          question: "Como funciona o Fator R no Simples Nacional?",
          answer: "O Fator R determina se certas atividades de serviços intelectuais serão tributadas pelo Anexo III (alíquotas a partir de 6%) ou pelo Anexo V (a partir de 15,5%). Se a folha de pagamento (incluindo pró-labore e encargos) for igual ou superior a 28% do faturamento bruto dos últimos 12 meses, a empresa pode usufruir da alíquota reduzida do Anexo III."
        }
      ];
    }
    return [
      {
        question: `Como funciona o cálculo de ${title}?`,
        answer: `O simulador aplica a legislação tributária e trabalhista brasileira vigente em 2026, considerando faixas de desconto oficiais do INSS, IRRF e alíquotas aplicáveis.`
      },
      {
        question: "Os valores calculados são exatos?",
        answer: "Os resultados constituem estimativas precisas com base nos parâmetros padrão. Convenções coletivas sindicais e deduções individuais podem alterar o valor líquido final."
      }
    ];
  }

  // 4. Spanish Calculators
  if (baseLang === 'es') {
    if (id.includes('autonomo') || id.includes('sueldo-neto') || id.includes('irpf') || id.includes('resico')) {
      return [
        {
          question: "¿Cómo se calculan las retenciones de IRPF y Seguridad Social?",
          answer: "El salario neto resulta de restar al salario bruto las cotizaciones a la Seguridad Social a cargo del trabajador y la retención a cuenta del IRPF, la cual varía progresivamente según el nivel de ingresos brutos y las circunstancias familiares del contribuyente."
        },
        {
          question: "¿Cómo funciona el sistema de cotización por ingresos reales para autónomos?",
          answer: "Los trabajadores autónomos eligen su base de cotización dentro de tramos fijados por ley en función de sus rendimientos netos reales previstos, regularizándose las cuotas al finalizar el ejercicio fiscal."
        }
      ];
    }
    return [
      {
        question: `¿Cómo se realiza el cálculo para ${title}?`,
        answer: `La herramienta aplica las tablas impositivas oficiales y normativas estatutarias de ${countryName} actualizadas para el ejercicio fiscal 2026.`
      },
      {
        question: "¿Incluye deducciones y desgravaciones personales?",
        answer: "El simulador refleja los tramos normativos estándar. Las deducciones autonómicas o deducciones por hijos e hipoteca pueden optimizar su cuota líquida final."
      }
    ];
  }

  // 5. English (US, UK, CA, AU, Global)
  if (id.includes('1099') || id.includes('self-employment')) {
    return [
      {
        question: "What is the 1099 Self-Employment Tax rate in 2026?",
        answer: "The federal self-employment tax rate is 15.3%, consisting of 12.4% for Social Security (applied up to the annual wage base limit) and 2.9% for Medicare on all net earnings, plus a 0.9% Additional Medicare Tax on income exceeding statutory thresholds ($200,000 for single filers)."
      },
      {
        question: "How do quarterly estimated taxes (1040-ES) work?",
        answer: "Independent contractors and freelancers must pay estimated taxes across 4 statutory installments (typically April 15, June 15, September 15, and January 15) to avoid IRS underpayment penalties."
      },
      {
        question: "Can I deduct half of my self-employment tax?",
        answer: "Yes, the IRS allows you to deduct 50% of your total self-employment tax from your gross income when calculating your Adjusted Gross Income (AGI)."
      }
    ];
  }

  if (id.includes('s-corp') || id.includes('llc')) {
    return [
      {
        question: "How does an S-Corp election save taxes compared to a default LLC?",
        answer: "In a single-member LLC, all net profit is subject to the 15.3% self-employment tax. With an S-Corporation election, profit is split into a Reasonable W-2 Salary (subject to payroll taxes) and Shareholder Distributions (free from self-employment tax, though still subject to income tax)."
      },
      {
        question: "At what net profit level does an S-Corp become beneficial?",
        answer: "Typically, an S-Corp becomes cost-effective when annual net profit consistently exceeds $60,000 to $80,000, offsetting additional payroll service, bookkeeping, and corporate tax filing expenses."
      }
    ];
  }

  if (id.includes('ir35') || id.includes('uk-') || country.country_code.toLowerCase() === 'uk') {
    return [
      {
        question: "What is the key financial difference between Inside and Outside IR35 in the UK?",
        answer: "Working Inside IR35 means you are taxed similarly to an employee, with Employer NI, Employee NI, Apprenticeship Levy, and PAYE income tax deducted at source. Working Outside IR35 allows contractors to operate through their Limited Company and pay corporation tax plus dividends, offering substantial tax efficiency."
      },
      {
        question: "What is the UK Personal Allowance for 2026/27?",
        answer: "The standard tax-free Personal Allowance is £12,570. For income over £100,000, the Personal Allowance is reduced by £1 for every £2 of income above £100k, creating an effective 60% marginal tax rate between £100k and £125,140."
      }
    ];
  }

  // Default fallback for any other calculator
  return [
    {
      question: `How is the calculation performed for ${title}?`,
      answer: `This calculator utilizes verified statutory tax brackets, standard allowances, and regulatory formulas applicable in ${countryName} for the 2026/27 financial year.`
    },
    {
      question: "Are these results official or guaranteed?",
      answer: "The calculations are high-accuracy estimates based on statutory standard rates. Personal deductions, credits, and municipal surcharges can influence your final tax return."
    },
    {
      question: "How can I share or save this calculation?",
      answer: "Use the 'Share Calculation' toolbar to copy a persistent link containing your exact input parameters, or share directly via WhatsApp, X (Twitter), or LinkedIn."
    }
  ];
}
