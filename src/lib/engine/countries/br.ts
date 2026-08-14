// src/lib/engine/countries/br.ts
// Brazil Financial & Tax Engine — 2025/2026 Tax Rules
// Sources: CLT (Decreto-Lei 5.452/43), Receita Federal do Brasil (RFB), Lei Complementar 123/2006 (Simples Nacional)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'calculadora-rescisao-clt-br');

  switch (calcId) {
    case 'calculadora-fator-r-simples-nacional':
      return calculateFatorR(inputs);
    case 'calculadora-clt-vs-pj-br':
      return calculateCltVsPj(inputs);
    case 'calculadora-irrf-carne-leao-br':
      return calculateIrrfCarneLeao(inputs);
    case 'calculadora-itbi-escritura-cartorio-br':
      return calculateItbiCartorio(inputs);
    case 'calculadora-rescisao-clt-br':
    default:
      return calculateRescisaoClt(inputs);
  }
}

// Progressive INSS helper (2025/2026)
function calculateInssProgressivo(salario: number): number {
  if (salario <= 0) return 0;
  const f1 = 1412.00;
  const f2 = 2666.68;
  const f3 = 4000.03;
  const teto = 7786.02;

  let inss = 0;
  if (salario > teto) {
    inss = f1 * 0.075 + (f2 - f1) * 0.09 + (f3 - f2) * 0.12 + (teto - f3) * 0.14;
  } else if (salario > f3) {
    inss = f1 * 0.075 + (f2 - f1) * 0.09 + (f3 - f2) * 0.12 + (salario - f3) * 0.14;
  } else if (salario > f2) {
    inss = f1 * 0.075 + (f2 - f1) * 0.09 + (salario - f2) * 0.12;
  } else if (salario > f1) {
    inss = f1 * 0.075 + (salario - f1) * 0.09;
  } else {
    inss = salario * 0.075;
  }
  return inss;
}

// Progressive IRRF helper (2025/2026 with Lei 14.663/2023)
function calculateIrrf(baseCalculo: number): number {
  if (baseCalculo <= 2259.20) return 0;
  if (baseCalculo <= 2826.65) return baseCalculo * 0.075 - 169.44;
  if (baseCalculo <= 3751.05) return baseCalculo * 0.15 - 381.44;
  if (baseCalculo <= 4664.68) return baseCalculo * 0.225 - 662.77;
  return baseCalculo * 0.275 - 896.00;
}

// 1. CLT Rescisão Trabalhista (Employment Termination & Severance)
function calculateRescisaoClt(inputs: TaxInput): TaxResult {
  const salarioBruto = safeVal(inputs.salario_bruto ?? inputs.salario);
  const tipoDesligamento = String(inputs.tipo_desligamento || 'demissao_sem_justa_causa');
  const mesesTrabalhados = safeVal(inputs.meses_trabalhados_ano, 1);
  const diasTrabalhados = safeVal(inputs.dias_trabalhados_mes, 0);
  const anosServico = safeVal(inputs.anos_servico_empresa, 1);
  const avisoPrevioTipo = String(inputs.aviso_previo_tipo || 'indenizado_empresa');
  const feriasVencidas = String(inputs.possui_ferias_vencidas || 'nao');
  const saldoFgts = safeVal(inputs.saldo_fgts_fins_rescisorios, 0);
  const dependentes = safeVal(inputs.num_dependentes_irrf, 0);

  if (salarioBruto <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Salário Bruto', value: 0 }],
      currency: 'BRL',
      currencySymbol: 'R$ ',
    };
  }

  // 1. Saldo de salário
  const saldoSalario = (salarioBruto / 30) * Math.min(31, Math.max(0, diasTrabalhados));

  // 2. 13º Salário proporcional (1/12 por mês trabalhado >= 15 dias)
  let decimoTerceiro = 0;
  if (tipoDesligamento !== 'demissao_com_justa_causa') {
    decimoTerceiro = (salarioBruto / 12) * Math.min(12, Math.max(0, mesesTrabalhados));
  }

  // 3. Férias proporcionais + 1/3 constitucional
  let feriasProporcionais = 0;
  if (tipoDesligamento !== 'demissao_com_justa_causa') {
    feriasProporcionais = ((salarioBruto / 12) * Math.min(12, Math.max(0, mesesTrabalhados))) * (4 / 3);
  }

  // 4. Férias vencidas + 1/3
  let feriasVencidasTotal = 0;
  if (feriasVencidas === 'sim_1_periodo') {
    feriasVencidasTotal = salarioBruto * (4 / 3);
  } else if (feriasVencidas === 'sim_2_periodos') {
    feriasVencidasTotal = salarioBruto * (4 / 3) * 2;
  }

  // 5. Aviso Prévio Indenizado (Lei 12.506/2011: 30 dias + 3 dias por ano completo, máx 90 dias)
  let avisoPrevioValor = 0;
  let diasAviso = 0;
  if (tipoDesligamento === 'demissao_sem_justa_causa' && avisoPrevioTipo === 'indenizado_empresa') {
    diasAviso = Math.min(90, 30 + Math.floor(anosServico) * 3);
    avisoPrevioValor = (salarioBruto / 30) * diasAviso;
  }

  // 6. Multa rescisória FGTS (40% para demissão sem justa causa, 20% para acordo mútuo)
  let multaFgts = 0;
  if (tipoDesligamento === 'demissao_sem_justa_causa') {
    multaFgts = saldoFgts * 0.40;
  } else if (tipoDesligamento === 'acordo_mutuo') {
    multaFgts = saldoFgts * 0.20;
  }

  // Descontos: INSS sobre Saldo de Salário e 13º
  const inssSaldo = calculateInssProgressivo(saldoSalario);
  const inss13o = calculateInssProgressivo(decimoTerceiro);

  // IRRF sobre Saldo de Salário
  const baseIrrfSaldo = Math.max(0, saldoSalario - inssSaldo - dependentes * 189.59);
  const irrfSaldo = calculateIrrf(baseIrrfSaldo);

  // IRRF sobre 13º Salário
  const baseIrrf13o = Math.max(0, decimoTerceiro - inss13o - dependentes * 189.59);
  const irrf13o = calculateIrrf(baseIrrf13o);

  const totalProventos = saldoSalario + decimoTerceiro + feriasProporcionais + feriasVencidasTotal + avisoPrevioValor + multaFgts;
  const totalDescontos = inssSaldo + inss13o + irrfSaldo + irrf13o;
  const totalLiquidoRescisao = totalProventos - totalDescontos;

  const breakdown = [
    { label: `Saldo de Salário (${diasTrabalhados} dias)`, value: saldoSalario },
    ...(decimoTerceiro > 0 ? [{ label: `13º Salário Proporcional (${mesesTrabalhados}/12)`, value: decimoTerceiro }] : []),
    ...(feriasProporcionais > 0 ? [{ label: `Férias Proporcionais + 1/3 Constitucional`, value: feriasProporcionais }] : []),
    ...(feriasVencidasTotal > 0 ? [{ label: `Férias Vencidas + 1/3 Constitucional`, value: feriasVencidasTotal }] : []),
    ...(avisoPrevioValor > 0 ? [{ label: `Aviso Prévio Indenizado (${diasAviso} dias)`, value: avisoPrevioValor }] : []),
    ...(multaFgts > 0 ? [{ label: `Multa Rescisória FGTS (${tipoDesligamento === 'acordo_mutuo' ? '20%' : '40%'})`, value: multaFgts }] : []),
    { label: 'Total Bruto dos Proventos Rescisórios', value: totalProventos, isTotal: true },
    ...(inssSaldo + inss13o > 0 ? [{ label: 'Desconto INSS (Saldo Salário + 13º)', value: inssSaldo + inss13o, isDeduction: true }] : []),
    ...(irrfSaldo + irrf13o > 0 ? [{ label: 'Desconto IRRF Retido na Fonte', value: irrfSaldo + irrf13o, isDeduction: true }] : []),
    { label: 'Valor Líquido a Receber na Rescisão', value: totalLiquidoRescisao, isFinal: true },
  ];

  return {
    grossIncome: totalProventos,
    netIncome: totalLiquidoRescisao,
    totalTax: totalDescontos,
    effectiveRate: totalProventos > 0 ? totalDescontos / totalProventos : 0,
    breakdown,
    currency: 'BRL',
    currencySymbol: 'R$ ',
    additionalInsights: [
      `Férias indenizadas e multa do FGTS são isentas de desconto de INSS e IRRF.`,
      tipoDesligamento === 'demissao_sem_justa_causa'
        ? `Você tem direito ao saque integral do saldo FGTS (R$ ${Math.round(saldoFgts).toLocaleString('pt-BR')}) mais a multa de 40% (R$ ${Math.round(multaFgts).toLocaleString('pt-BR')}) e ao Seguro-Desemprego.`
        : `O prazo de pagamento das verbas rescisórias é de até 10 dias corridos após o término do contrato de trabalho (Art. 477 da CLT).`,
    ],
  };
}

// 2. Simples Nacional Fator R (Annex III vs Annex V)
function calculateFatorR(inputs: TaxInput): TaxResult {
  const folha12m = safeVal(inputs.folha_pagamento_12m);
  const receita12m = safeVal(inputs.receita_bruta_12m);
  const faturamentoMensal = safeVal(inputs.faturamento_mensal, receita12m / 12);

  if (receita12m <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Receita Bruta 12 Meses', value: 0 }],
      currency: 'BRL',
      currencySymbol: 'R$ ',
    };
  }

  const fatorR = folha12m / receita12m;
  const enquadraAnexoIII = fatorR >= 0.28;

  // Anexo III vs Anexo V initial effective tax rates
  const taxaAnexoIII = 0.06; // Starts at 6%
  const taxaAnexoV = 0.155; // Starts at 15.5%

  const taxaAplicada = enquadraAnexoIII ? taxaAnexoIII : taxaAnexoV;
  const impostoMensal = faturamentoMensal * taxaAplicada;
  const impostoSemFatorR = faturamentoMensal * taxaAnexoV;
  const economiaMensal = Math.max(0, impostoSemFatorR - impostoMensal);

  // Pro-labore necessary to reach 28%
  const folhaNecessaria12m = receita12m * 0.28;
  const proLaboreIdealMensal = Math.max(0, (folhaNecessaria12m - folha12m) / 12);

  const breakdown = [
    { label: 'Faturamento Mensal Atual', value: faturamentoMensal },
    { label: `Fator R Apurado: ${(fatorR * 100).toFixed(2)}% (Mínimo: 28,00%)`, value: fatorR * 100 },
    { label: `Regime Aplicado: ${enquadraAnexoIII ? 'Anexo III (Alíquota inicial 6%)' : 'Anexo V (Alíquota inicial 15,5%)'}`, value: impostoMensal, isDeduction: true },
    ...(enquadraAnexoIII
      ? [{ label: 'Economia Mensal em relação ao Anexo V', value: economiaMensal }]
      : [{ label: 'Aumento de Pró-labore Mensal Sugerido para atingir 28%', value: proLaboreIdealMensal }]),
    { label: 'Lucro Líquido Mensal Após Simples Nacional', value: faturamentoMensal - impostoMensal, isFinal: true },
  ];

  return {
    grossIncome: faturamentoMensal,
    netIncome: faturamentoMensal - impostoMensal,
    totalTax: impostoMensal,
    effectiveRate: taxaAplicada,
    breakdown,
    currency: 'BRL',
    currencySymbol: 'R$ ',
    quarterlyPayment: impostoMensal * 3,
    additionalInsights: [
      enquadraAnexoIII
        ? `Parabéns! Com Fator R de ${(fatorR * 100).toFixed(1)}% (>= 28%), sua empresa tributa pelo Anexo III (alíquota a partir de 6%), gerando economia substancial.`
        : `Atenção: Fator R de ${(fatorR * 100).toFixed(1)}% está abaixo dos 28%. Aumentando seu Pró-labore em R$ ${Math.round(proLaboreIdealMensal).toLocaleString('pt-BR')}/mês você migra para o Anexo III economizando R$ ${Math.round(economiaMensal).toLocaleString('pt-BR')}/mês em impostos.`,
    ],
  };
}

// 3. CLT vs PJ Comparison
function calculateCltVsPj(inputs: TaxInput): TaxResult {
  const salarioClt = safeVal(inputs.salario_clt_bruto);
  const beneficiosClt = safeVal(inputs.beneficios_clt_mensal, 0);
  const faturamentoPj = safeVal(inputs.faturamento_pj_bruto);
  const regimePj = String(inputs.regime_pj || 'simples_anexo_iii');
  const custosPj = safeVal(inputs.custos_mensais_pj, 400); // contabilidade, etc.
  const dependentes = safeVal(inputs.num_dependentes, 0);

  if (salarioClt <= 0 && faturamentoPj <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Salário CLT / Faturamento PJ', value: 0 }],
      currency: 'BRL',
      currencySymbol: 'R$ ',
    };
  }

  // --- CLT MONTHLY EQUIVALENT ---
  // Inss + Irrf on monthly salary
  const inssClt = calculateInssProgressivo(salarioClt);
  const baseIrrf = Math.max(0, salarioClt - inssClt - dependentes * 189.59);
  const irrfClt = calculateIrrf(baseIrrf);
  const liquidoMensalDireto = salarioClt - inssClt - irrfClt;

  // Additional CLT rights annualized to monthly basis:
  // FGTS (8%), 13º Salário (1/12), Férias + 1/3 (1/12 * 1.333)
  const fgtsMensal = salarioClt * 0.08;
  const decimoTerceiroProporcional = (salarioClt - inssClt - irrfClt) / 12;
  const feriasProporcionais = ((salarioClt - inssClt - irrfClt) * (4 / 3)) / 12;
  const totalCltRealMensal = liquidoMensalDireto + beneficiosClt + fgtsMensal + decimoTerceiroProporcional + feriasProporcionais;

  // --- PJ MONTHLY NET ---
  let aliquotaPj = 0.06; // Simples Anexo III
  if (regimePj === 'simples_anexo_v') aliquotaPj = 0.155;
  if (regimePj === 'lucro_presumido') aliquotaPj = 0.1333; // 13.33% to 16.33%
  if (regimePj === 'mei') aliquotaPj = 0.0; // Fixed DAS ~R$ 75

  const impostoPj = regimePj === 'mei' ? 75 : faturamentoPj * aliquotaPj;
  const proLaboreMinimo = 1412.00;
  const inssProLabore = proLaboreMinimo * 0.11; // 11% pro-labore
  const totalLiquidoPj = Math.max(0, faturamentoPj - impostoPj - custosPj - inssProLabore);

  const diferencaLiquida = totalLiquidoPj - totalCltRealMensal;
  const pjVantajoso = diferencaLiquida > 0;

  const breakdown = [
    { label: 'Salário CLT Bruto Mensal', value: salarioClt },
    { label: 'Salário CLT Líquido Direto na Conta', value: liquidoMensalDireto },
    { label: 'Pacote Total CLT Real (Líquido + FGTS + 13º + Férias + Benefícios)', value: totalCltRealMensal, isTotal: true },
    { label: 'Faturamento Bruto PJ Proposto', value: faturamentoPj },
    { label: `Imposto PJ (${regimePj === 'mei' ? 'DAS MEI Fixo' : (aliquotaPj * 100).toFixed(1) + '%'})`, value: impostoPj, isDeduction: true },
    { label: 'Custos Operacionais PJ (Contabilidade, taxas)', value: custosPj, isDeduction: true },
    { label: 'INSS Pró-labore Obrigatório (11% salário mínimo)', value: inssProLabore, isDeduction: true },
    { label: 'Rendimento Líquido Real PJ', value: totalLiquidoPj, isFinal: true },
    {
      label: pjVantajoso
        ? `Vantagem Líquida PJ: +R$ ${Math.round(diferencaLiquida).toLocaleString('pt-BR')}/mês`
        : `Vantagem Líquida CLT: +R$ ${Math.round(Math.abs(diferencaLiquida)).toLocaleString('pt-BR')}/mês`,
      value: Math.abs(diferencaLiquida),
    },
  ];

  return {
    grossIncome: faturamentoPj || salarioClt,
    netIncome: totalLiquidoPj,
    totalTax: impostoPj + inssProLabore,
    effectiveRate: faturamentoPj > 0 ? (impostoPj + inssProLabore) / faturamentoPj : 0,
    breakdown,
    currency: 'BRL',
    currencySymbol: 'R$ ',
    additionalInsights: [
      pjVantajoso
        ? `A proposta PJ oferece ganho financeiro de R$ ${Math.round(diferencaLiquida * 12).toLocaleString('pt-BR')} a mais por ano em relação ao pacote CLT completo.`
        : `A proposta CLT é mais vantajosa considerando FGTS, 13º, férias remuneradas e benefícios corporativos.`,
      `Como regra prática de mercado, para compensar a perda dos benefícios CLT, a proposta PJ deve ser de 1,3x a 1,5x o salário CLT bruto.`,
    ],
  };
}

// 4. IRRF & Carnê-Leão Autônomo / Aluguel
function calculateIrrfCarneLeao(inputs: TaxInput): TaxResult {
  const rendimentoBruto = safeVal(inputs.rendimento_bruto_mensal);
  const categoria = String(inputs.categoria_rendimento || 'clt_assalariado');
  const dependentes = safeVal(inputs.num_dependentes, 0);
  const pensaoAlimenticia = safeVal(inputs.pensao_alimenticia, 0);
  const despesasLivroCaixa = safeVal(inputs.despesas_livro_caixa, 0);
  const opcaoDesconto = String(inputs.usar_desconto_simplificado || 'auto');

  if (rendimentoBruto <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Rendimento Bruto Mensal', value: 0 }],
      currency: 'BRL',
      currencySymbol: 'R$ ',
    };
  }

  // INSS autônomo / CLT
  let inssDeducao = 0;
  if (categoria === 'clt_assalariado') {
    inssDeducao = calculateInssProgressivo(rendimentoBruto);
  } else if (categoria === 'autonomo_pf') {
    // Autônomo paga 20% até o teto do INSS
    inssDeducao = Math.min(rendimentoBruto, 7786.02) * 0.20;
  }

  // Deduções Legais Tradicionais
  const deducaoDependentes = dependentes * 189.59;
  const totalDeducoesLegais = inssDeducao + deducaoDependentes + pensaoAlimenticia + (categoria === 'autonomo_pf' ? despesasLivroCaixa : 0);

  // Desconto Simplificado Mensal (R$ 564,80 conforme Lei 14.663/2023)
  const descontoSimplificadoFixo = 564.80;

  let usarSimplificado = false;
  if (opcaoDesconto === 'desconto_simplificado') {
    usarSimplificado = true;
  } else if (opcaoDesconto === 'auto') {
    usarSimplificado = descontoSimplificadoFixo > totalDeducoesLegais;
  }

  const baseCalculo = usarSimplificado
    ? Math.max(0, rendimentoBruto - descontoSimplificadoFixo)
    : Math.max(0, rendimentoBruto - totalDeducoesLegais);

  const irrfDevido = calculateIrrf(baseCalculo);
  const totalDescontos = (usarSimplificado ? 0 : inssDeducao) + irrfDevido;
  const rendimentoLiquido = rendimentoBruto - totalDescontos;

  const breakdown = [
    { label: 'Rendimento Bruto Mensal', value: rendimentoBruto },
    ...(inssDeducao > 0 ? [{ label: 'Contribuição Previdenciária (INSS)', value: inssDeducao, isDeduction: true }] : []),
    {
      label: usarSimplificado
        ? 'Desconto Simplificado Mensal Aplicado (R$ 564,80)'
        : `Deduções Legais Utilizadas (Dependentes, Pensão, Livro Caixa)`,
      value: usarSimplificado ? descontoSimplificadoFixo : totalDeducoesLegais,
      isDeduction: true,
    },
    { label: 'Base de Cálculo do Imposto de Renda', value: baseCalculo, isTotal: true },
    { label: 'Imposto de Renda Retido / Carnê-Leão Devido', value: irrfDevido, isDeduction: true },
    { label: 'Rendimento Líquido Mensal em Mãos', value: rendimentoLiquido, isFinal: true },
  ];

  return {
    grossIncome: rendimentoBruto,
    netIncome: rendimentoLiquido,
    totalTax: irrfDevido + inssDeducao,
    effectiveRate: (irrfDevido + inssDeducao) / rendimentoBruto,
    breakdown,
    currency: 'BRL',
    currencySymbol: 'R$ ',
    quarterlyPayment: irrfDevido * 3,
    additionalInsights: [
      usarSimplificado
        ? `O Desconto Simplificado (R$ 564,80) resultou em menor imposto do que suas deduções legais (R$ ${Math.round(totalDeducoesLegais).toLocaleString('pt-BR')}).`
        : `As deduções legais foram mais vantajosas que o desconto simplificado fixo.`,
      categoria === 'autonomo_pf' || categoria === 'aluguel_pf'
        ? `O imposto do Carnê-Leão (DARF código 0190) deve ser recolhido até o último dia útil do mês seguinte ao do recebimento.`
        : `Rendimentos até R$ 2.259,20 são isentos de imposto de renda.`,
    ],
  };
}

// 5. ITBI, Escritura e Registro de Imóveis
function calculateItbiCartorio(inputs: TaxInput): TaxResult {
  const valorCompra = safeVal(inputs.valor_compra_venda ?? inputs.valor_imovel);
  const valorVenal = safeVal(inputs.valor_venal_iptu, 0);
  const baseCalculo = Math.max(valorCompra, valorVenal);
  const municipio = String(inputs.municipio_estado || 'sp_sao_paulo');
  const primeiroImovelSfh = String(inputs.primeiro_imovel_sfh || 'nao') === 'sim';
  const formaPagamento = String(inputs.forma_pagamento || 'a_vista_consorcio');
  const valorFinanciado = safeVal(inputs.valor_financiado, 0);

  if (baseCalculo <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Valor do Imóvel', value: 0 }],
      currency: 'BRL',
      currencySymbol: 'R$ ',
    };
  }

  // ITBI rate by city
  let aliquotaItbi = 0.03; // Standard 3% (SP, RJ, BH, DF, RS, BA)
  if (municipio.includes('curitiba') || municipio.includes('pr_')) {
    aliquotaItbi = 0.027; // 2.7%
  }

  let valorItbi = baseCalculo * aliquotaItbi;

  // Cartório: Escritura Pública + Registro de Imóveis (Estimativa por faixa estadual)
  let taxaEscritura = 0;
  let taxaRegistro = 0;

  if (baseCalculo <= 200000) {
    taxaEscritura = 2200;
    taxaRegistro = 1800;
  } else if (baseCalculo <= 500000) {
    taxaEscritura = 3800;
    taxaRegistro = 2900;
  } else if (baseCalculo <= 1000000) {
    taxaEscritura = 5600;
    taxaRegistro = 4200;
  } else {
    taxaEscritura = 7500;
    taxaRegistro = 5800;
  }

  // If bought with bank financing (SFH/SFI), bank contract replaces the Notary Deed (Escritura = R$ 0)
  if (formaPagamento.includes('financiamento')) {
    taxaEscritura = 0;
  }

  // 50% discount on registry for 1st property financed by SFH (Art. 290 da Lei 6.015/73)
  if (primeiroImovelSfh && formaPagamento === 'financiamento_sfh') {
    taxaRegistro = taxaRegistro * 0.50;
  }

  const totalCustos = valorItbi + taxaEscritura + taxaRegistro;
  const custoTotalImovel = baseCalculo + totalCustos;

  const breakdown = [
    { label: 'Valor de Aquisição do Imóvel (Base de Cálculo)', value: baseCalculo },
    { label: `ITBI Municipal (${(aliquotaItbi * 100).toFixed(1)}%)`, value: valorItbi, isDeduction: true },
    ...(taxaEscritura > 0 ? [{ label: 'Escritura Pública (Tabelionato de Notas)', value: taxaEscritura, isDeduction: true }] : []),
    {
      label: primeiroImovelSfh
        ? 'Registro de Imóveis no RGI (Com desconto de 50% Art. 290)'
        : 'Registro de Imóveis no RGI (Cartório de Registro)',
      value: taxaRegistro,
      isDeduction: true,
    },
    { label: 'Total de Custos de Escrituração e Impostos', value: totalCustos, isTotal: true },
    { label: 'Custo Total de Aquisição do Imóvel', value: custoTotalImovel, isFinal: true },
  ];

  return {
    grossIncome: baseCalculo,
    netIncome: custoTotalImovel,
    totalTax: totalCustos,
    effectiveRate: totalCustos / baseCalculo,
    breakdown,
    currency: 'BRL',
    currencySymbol: 'R$ ',
    additionalInsights: [
      `Os custos de cartório e ITBI representam aproximadamente ${( (totalCustos / baseCalculo) * 100 ).toFixed(2)}% do valor do imóvel.`,
      formaPagamento.includes('financiamento')
        ? `No financiamento bancário, o contrato do banco tem força de escritura pública, dispensando o custo do Tabelionato de Notas.`
        : `Na compra à vista, a escritura pública lavrada em tabelionato é obrigatória antes do registro no RGI.`,
      primeiroImovelSfh
        ? `Desconto de 50% no registro de imóveis aplicado conforme Art. 290 da Lei de Registros Públicos.`
        : `Primeira aquisição pelo SFH concede 50% de desconto nas taxas cartorárias de registro.`,
    ],
  };
}
