// src/lib/engine/countries/mx.ts
// Mexico Financial & Tax Engine — 2025/2026 Tax Rules
// Sources: Servicio de Administración Tributaria (sat.gob.mx - SAT), IMSS, Ley Federal del Trabajo (LFT)

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'sueldo-neto-mexico');

  switch (calcId) {
    case 'resico-isr-iva-calculator':
      return calculateResico(inputs);
    case 'finiquito-liquidacion-despido-lft':
      return calculateFiniquitoLiquidacion(inputs);
    case 'gastos-escrituracion-isai-hipoteca':
      return calculateGastosEscrituracion(inputs);
    case 'ptu-participacion-utilidades-lft':
      return calculatePtu(inputs);
    case 'sueldo-neto-mexico':
    default:
      return calculateSueldoNeto(inputs);
  }
}

// Progressive monthly ISR (Art. 96 LISR - Tarifa mensual 2025/2026)
function calculateIsrMensual(baseGravable: number, umaMensual = 3439.46): number {
  if (baseGravable <= 0) return 0;

  const tramos = [
    { limite: 746.04, cuotaFija: 0, porc: 0.0192 },
    { limite: 6332.05, cuotaFija: 14.32, porc: 0.064 },
    { limite: 11128.01, cuotaFija: 371.83, porc: 0.1088 },
    { limite: 12935.82, cuotaFija: 893.63, porc: 0.16 },
    { limite: 15487.71, cuotaFija: 1182.88, porc: 0.1792 },
    { limite: 31236.49, cuotaFija: 1640.18, porc: 0.2136 },
    { limite: 49233.00, cuotaFija: 5000.80, porc: 0.2352 },
    { limite: 93993.90, cuotaFija: 9233.67, porc: 0.30 },
    { limite: 125325.20, cuotaFija: 22661.94, porc: 0.32 },
    { limite: 375975.61, cuotaFija: 32687.96, porc: 0.34 },
    { limite: Infinity, cuotaFija: 117909.10, porc: 0.35 },
  ];

  let isr = 0;
  let limiteInferior = 0;
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i];
    if (baseGravable <= t.limite || i === tramos.length - 1) {
      isr = t.cuotaFija + (baseGravable - limiteInferior) * t.porc;
      break;
    }
    limiteInferior = t.limite;
  }

  // Subsidio para el empleo (Decreto 2024/2026: hasta 9,081 MXN/mes -> cuota ~390 MXN)
  let subsidio = 0;
  if (baseGravable <= 9081.00) {
    subsidio = 390.00;
  }

  return Math.max(0, isr - subsidio);
}

// 1. Calculadora Sueldo Neto México (ISR & IMSS)
function calculateSueldoNeto(inputs: TaxInput): TaxResult {
  const salarioBruto = safeVal(inputs.gross_salary ?? inputs.salario ?? inputs.salary);
  const frecuencia = String(inputs.pay_frequency || 'mensual');
  const umaDiaria = safeVal(inputs.uma_value_daily, 113.14);
  const valesDespensa = safeVal(inputs.grocery_vouchers_monthly, 0);
  const fondoAhorro = safeVal(inputs.savings_fund_monthly, 0);

  if (salarioBruto <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Sueldo Bruto Mensual', value: 0 }],
      currency: 'MXN',
      currencySymbol: '$',
    };
  }

  // Salario Diario Base de Cotización (SBC) para IMSS (Factor de integración mínimo primer año: 1.0493)
  const salarioDiario = salarioBruto / 30;
  const sbc = Math.min(salarioDiario * 1.0493, umaDiaria * 25); // Topado a 25 UMAs

  // Cuota Obrera IMSS (~2.4% a 2.7% del SBC mensual)
  // Enfermedad y Maternidad, Invalidez y Vida (0.625%), Cesantía y Vejez (1.125%), Excedente 3 UMA (0.40%)
  const cuotaImssObrero = (sbc * 30) * 0.0245;

  // ISR Mensual
  const isrRetenido = calculateIsrMensual(salarioBruto, umaDiaria * 30.4);

  const totalDeducciones = cuotaImssObrero + isrRetenido;
  const sueldoNetoMensual = salarioBruto - totalDeducciones + valesDespensa + fondoAhorro;

  // Factor de frecuencia
  let factor = 1;
  if (frecuencia === 'quincenal') factor = 0.5;
  if (frecuencia === 'semanal') factor = 1 / 4.33;

  const breakdown = [
    { label: 'Sueldo Bruto Mensual (Salario Base)', value: salarioBruto },
    { label: 'Retención ISR Mensual (Tarifa SAT Art. 96)', value: isrRetenido, isDeduction: true },
    { label: 'Cuota Obrera IMSS (Seguro Social)', value: cuotaImssObrero, isDeduction: true },
    ...(valesDespensa > 0 ? [{ label: 'Vales de Despensa Electrónicos (Exentos)', value: valesDespensa }] : []),
    ...(fondoAhorro > 0 ? [{ label: 'Fondo de Ahorro Empresa', value: fondoAhorro }] : []),
    { label: 'Sueldo Neto Total Mensual', value: sueldoNetoMensual, isFinal: true },
    ...(frecuencia !== 'mensual'
      ? [{ label: `Sueldo Neto por Periodo (${frecuencia})`, value: Math.round(sueldoNetoMensual * factor), isTotal: true }]
      : []),
  ];

  return {
    grossIncome: salarioBruto,
    netIncome: sueldoNetoMensual,
    totalTax: totalDeducciones,
    effectiveRate: totalDeducciones / salarioBruto,
    breakdown,
    currency: 'MXN',
    currencySymbol: '$',
    additionalInsights: [
      `Tu sueldo neto representa el ${( (sueldoNetoMensual / salarioBruto) * 100 ).toFixed(1)}% de tu salario bruto pactado.`,
      `El Salario Base de Cotización (SBC) registrado ante el IMSS incluye el factor de integración de aguinaldo (15 días) y prima vacacional (25%).`,
    ],
  };
}

// 2. RESICO (Régimen Simplificado de Confianza & IVA)
function calculateResico(inputs: TaxInput): TaxResult {
  const ingresosMensuales = safeVal(inputs.monthly_income_invoiced ?? inputs.ingresos);
  const tipoCliente = String(inputs.client_type || 'persona_moral_retencion');
  const zonaIva = String(inputs.iva_zone || 'general_16');
  const gastosDeducibles = safeVal(inputs.monthly_deductible_expenses, 0);

  if (ingresosMensuales <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Ingresos Mensuales Facturados', value: 0 }],
      currency: 'MXN',
      currencySymbol: '$',
    };
  }

  // Tarifa Mensual RESICO Personas Físicas (hasta 3.5 millones MXN/año)
  let tasaIsr = 0.01;
  if (ingresosMensuales > 208333.33) tasaIsr = 0.025;
  else if (ingresosMensuales > 83333.33) tasaIsr = 0.02;
  else if (ingresosMensuales > 50000.00) tasaIsr = 0.015;
  else if (ingresosMensuales > 25000.00) tasaIsr = 0.011;

  const isrCausado = ingresosMensuales * tasaIsr;

  // Retención 1.25% ISR por Persona Moral
  let retencionIsr = 0;
  if (tipoCliente.includes('persona_moral') || tipoCliente.includes('mixto')) {
    const porcMoral = tipoCliente.includes('mixto') ? 0.50 : 1.0;
    retencionIsr = ingresosMensuales * porcMoral * 0.0125;
  }

  const isrNetoPagar = Math.max(0, isrCausado - retencionIsr);

  // IVA
  let tasaIva = 0.16;
  if (zonaIva.includes('fronteriza')) tasaIva = 0.08;
  if (zonaIva.includes('cero') || zonaIva.includes('exento')) tasaIva = 0.0;

  const ivaCobrado = ingresosMensuales * tasaIva;
  const ivaAcreditable = gastosDeducibles * tasaIva;

  let retencionIva = 0;
  if (tipoCliente.includes('persona_moral') && tasaIva > 0) {
    // Retención 2/3 de IVA (10.6667%)
    retencionIva = ingresosMensuales * (tasaIva * (2 / 3));
  }

  const ivaNetoPagar = Math.max(0, ivaCobrado - ivaAcreditable - retencionIva);
  const totalImpuestosSat = isrNetoPagar + ivaNetoPagar;
  const gananciaNeta = ingresosMensuales - isrCausado - gastosDeducibles;

  const breakdown = [
    { label: 'Ingresos Brutos Facturados (Sin IVA)', value: ingresosMensuales },
    { label: `ISR RESICO Causado (${(tasaIsr * 100).toFixed(2)}%)`, value: isrCausado, isDeduction: true },
    ...(retencionIsr > 0 ? [{ label: 'Retención de ISR (1.25% Persona Moral)', value: retencionIsr }] : []),
    { label: 'Pago Definitivo Mensual ISR al SAT', value: isrNetoPagar, isDeduction: true },
    ...(tasaIva > 0
      ? [
          { label: `IVA Trasladado / Cobrado (${(tasaIva * 100).toFixed(0)}%)`, value: ivaCobrado },
          { label: 'IVA Acreditable por Gastos', value: ivaAcreditable, isDeduction: true },
          ...(retencionIva > 0 ? [{ label: 'Retención de IVA Persona Moral (2/3)', value: retencionIva, isDeduction: true }] : []),
          { label: 'Neto IVA por Pagar al SAT', value: ivaNetoPagar, isDeduction: true },
        ]
      : []),
    { label: 'Total Impuestos Mensuales por Pagar al SAT', value: totalImpuestosSat, isTotal: true },
    { label: 'Utilidad Neta Real en Bolsillo', value: gananciaNeta, isFinal: true },
  ];

  return {
    grossIncome: ingresosMensuales,
    netIncome: gananciaNeta,
    totalTax: totalImpuestosSat,
    effectiveRate: totalImpuestosSat / ingresosMensuales,
    breakdown,
    currency: 'MXN',
    currencySymbol: '$',
    additionalInsights: [
      `En RESICO la tasa efectiva de ISR es extraordinariamente baja (de 1.0% a 2.5%), no requiriendo deducciones para el cálculo del ISR.`,
      `El pago definitivo mensual de ISR e IVA debe presentarse a más tardar el día 17 del mes siguiente a través del portal del SAT.`,
    ],
  };
}

// 3. Finiquito y Liquidación por Despido LFT
function calculateFiniquitoLiquidacion(inputs: TaxInput): TaxResult {
  const salarioMensual = safeVal(inputs.monthly_gross_salary ?? inputs.salario);
  const anos = safeVal(inputs.tenure_years ?? inputs.years, 2);
  const razon = String(inputs.separation_reason || 'despido_injustificado');
  const vacacionesPendientes = safeVal(inputs.pending_vacation_days, 0);

  if (salarioMensual <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Salario Mensual Bruto', value: 0 }],
      currency: 'MXN',
      currencySymbol: '$',
    };
  }

  const salarioDiario = salarioMensual / 30;
  const sdi = salarioDiario * 1.0493; // Salario Diario Integrado

  // 1. Finiquito: Aguinaldo proporcional (15 días) + Vacaciones (12 días min) + Prima vacacional (25%)
  const aguinaldoProporcional = salarioDiario * 15 * 0.5; // Estimado medio año
  const vacacionesValor = salarioDiario * Math.max(vacacionesPendientes, 12);
  const primaVacacional = vacacionesValor * 0.25;
  const finiquitoTotal = aguinaldoProporcional + vacacionesValor + primaVacacional;

  // 2. Liquidación (Despido Injustificado / Sin Causa)
  let indemnizacionConstitucional = 0;
  let primaAntiguedad = 0;
  let veinteDiasPorAno = 0;

  if (razon === 'despido_injustificado') {
    // 3 meses de salario integrado (90 días)
    indemnizacionConstitucional = sdi * 90;
    // Prima de antigüedad: 12 días por año topado a 2 salarios mínimos (~498 MXN/día)
    const salarioTopadoAntiguedad = Math.min(salarioDiario, 498.00);
    primaAntiguedad = salarioTopadoAntiguedad * 12 * Math.max(1, anos);
    veinteDiasPorAno = sdi * 20 * anos;
  }

  const totalBruto = finiquitoTotal + indemnizacionConstitucional + primaAntiguedad + veinteDiasPorAno;

  // Exenciones Art. 93 LISR: 90 UMAs por año en indemnización, 30 UMAs aguinaldo, 15 UMAs prima vacacional
  const uma = 113.14;
  const exencionIndemnizacion = Math.min(totalBruto, 90 * uma * Math.max(1, anos));
  const baseGravable = Math.max(0, totalBruto - exencionIndemnizacion);
  const isrRetenido = baseGravable * 0.20; // Tasa promedio de retención de finiquito

  const totalNetoLiquidacion = totalBruto - isrRetenido;

  const breakdown = [
    { label: 'Salario Diario Integrado (SDI)', value: sdi },
    { label: 'Aguinaldo y Vacaciones Proporcionales (Finiquito)', value: aguinaldoProporcional + vacacionesValor },
    { label: 'Prima Vacacional Legal (25%)', value: primaVacacional },
    ...(indemnizacionConstitucional > 0 ? [{ label: 'Indemnización Constitucional (3 Meses / 90 Días SDI)', value: indemnizacionConstitucional }] : []),
    ...(primaAntiguedad > 0 ? [{ label: `Prima de Antigüedad (${anos} años)`, value: primaAntiguedad }] : []),
    { label: 'Total Bruto a Liquidar (Finiquito + Liquidación)', value: totalBruto, isTotal: true },
    ...(isrRetenido > 0 ? [{ label: 'Retención de ISR sobre Montos Gravables', value: isrRetenido, isDeduction: true }] : []),
    { label: 'Importe Neto Total a Recibir en Cheque / Transferencia', value: totalNetoLiquidacion, isFinal: true },
  ];

  return {
    grossIncome: totalBruto,
    netIncome: totalNetoLiquidacion,
    totalTax: isrRetenido,
    effectiveRate: totalBruto > 0 ? isrRetenido / totalBruto : 0,
    breakdown,
    currency: 'MXN',
    currencySymbol: '$',
    additionalInsights: [
      razon === 'despido_injustificado'
        ? `Por despido injustificado te corresponden 3 meses de salario integrado constitucional más 12 días por año de prima de antigüedad.`
        : `En renuncia voluntaria solo corresponde el finiquito de prestaciones devengadas (aguinaldo, vacaciones y prima vacacional).`,
      `La indemnización por despido está exenta de ISR hasta por el equivalente a 90 UMAs por cada año laborado ($${Math.round(90 * uma * anos).toLocaleString('es-MX')} MXN).`,
    ],
  };
}

// 4. Gastos de Escrituración, ISAI e Hipoteca
function calculateGastosEscrituracion(inputs: TaxInput): TaxResult {
  const precio = safeVal(inputs.property_price ?? inputs.precio);
  const estado = String(inputs.state_location || 'cdmx');
  const isJornada = String(inputs.is_jornada_notarial || 'no').includes('si');
  const creditoMonto = safeVal(inputs.mortgage_amount, 0);

  if (precio <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Precio del Inmueble', value: 0 }],
      currency: 'MXN',
      currencySymbol: '$',
    };
  }

  // ISAI (Impuesto sobre Adquisición de Inmuebles)
  let tasaIsai = 0.045; // CDMX promedio ~4.5% a 6.0%
  if (estado === 'edomex') tasaIsai = 0.02;
  if (estado === 'jalisco' || estado === 'nuevo_leon') tasaIsai = 0.025;
  if (estado === 'queretaro' || estado === 'puebla') tasaIsai = 0.03;

  let isaiMonto = precio * tasaIsai;
  if (isJornada && estado === 'cdmx') {
    isaiMonto = isaiMonto * 0.60; // 40% descuento jornada notarial
  }

  // Honorarios Notario (~1.0% a 1.5% + IVA)
  const honorariosNotario = precio * 0.012 * 1.16;

  // Derechos de Registro Público de la Propiedad (RPP)
  const derechosRpp = Math.min(22000, Math.max(3000, precio * 0.005));

  // Gastos de Crédito Hipotecario (Avalúo y comisión de apertura ~2%)
  const gastosCredito = creditoMonto > 0 ? creditoMonto * 0.02 : 0;

  const totalGastosCierre = isaiMonto + honorariosNotario + derechosRpp + gastosCredito;
  const costoTotalAdquisicion = precio + totalGastosCierre;

  const breakdown = [
    { label: 'Precio de Compraventa del Inmueble', value: precio },
    { label: `ISAI / Impuesto de Traslación de Dominio (${(tasaIsai * 100).toFixed(1)}%)`, value: isaiMonto, isDeduction: true },
    { label: 'Honorarios del Notario Público (Arancel + IVA)', value: honorariosNotario, isDeduction: true },
    { label: 'Derechos de Inscripción en Registro Público (RPP)', value: derechosRpp, isDeduction: true },
    ...(gastosCredito > 0 ? [{ label: 'Gastos de Avalúo y Apertura de Crédito Hipotecario', value: gastosCredito, isDeduction: true }] : []),
    { label: 'Total de Gastos de Escrituración e Impuestos', value: totalGastosCierre, isTotal: true },
    { label: 'Monto Total Requerido para la Compra', value: costoTotalAdquisicion, isFinal: true },
  ];

  return {
    grossIncome: precio,
    netIncome: costoTotalAdquisicion,
    totalTax: totalGastosCierre,
    effectiveRate: totalGastosCierre / precio,
    breakdown,
    currency: 'MXN',
    currencySymbol: '$',
    additionalInsights: [
      `Los gastos de escrituración e impuestos representan aproximadamente el ${( (totalGastosCierre / precio) * 100 ).toFixed(1)}% del valor del inmueble.`,
      isJornada
        ? `Descuento del programa Jornada Notarial aplicado exitosamente en el ISAI y aranceles.`
        : `En la CDMX y varios estados, el programa de Jornada Notarial ofrece descuentos de hasta 60% en impuestos para viviendas de interés social y medio.`,
    ],
  };
}

// 5. Participación de los Trabajadores en las Utilidades (PTU)
function calculatePtu(inputs: TaxInput): TaxResult {
  const salarioMensual = safeVal(inputs.worker_monthly_gross_salary ?? inputs.salario);
  const diasTrabajados = safeVal(inputs.worked_days_in_year, 365);
  const poolPtuEmpresa = safeVal(inputs.total_company_ptu_pool, 500000);
  const totalDiasEmpresa = safeVal(inputs.total_company_worked_days, 3650);
  const totalSalariosEmpresa = safeVal(inputs.total_company_salaries_sum, 2400000);
  const ptuPromedio3Anos = safeVal(inputs.ptu_avg_last_3_years, 0);

  if (salarioMensual <= 0 || diasTrabajados < 60) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Salario Mensual del Trabajador', value: 0 }],
      currency: 'MXN',
      currencySymbol: '$',
      additionalInsights: ['Se requiere un mínimo de 60 días laborados en el año fiscal para tener derecho al reparto de utilidades (PTU).'],
    };
  }

  // 1. 50% distribuido por días laborados
  const poolPorDias = poolPtuEmpresa * 0.50;
  const factorDias = poolPorDias / Math.max(1, totalDiasEmpresa);
  const ptuPorDias = factorDias * diasTrabajados;

  // 2. 50% distribuido por salario devengado en el año
  const poolPorSalario = poolPtuEmpresa * 0.50;
  const salarioAnualTrabajador = salarioMensual * (diasTrabajados / 30);
  const factorSalario = poolPorSalario / Math.max(1, totalSalariosEmpresa);
  const ptuPorSalario = factorSalario * salarioAnualTrabajador;

  const ptuCalculadaBruta = ptuPorDias + ptuPorSalario;

  // 3. Tope de PTU (Reforma LFT Art. 127 Fracción VIII: Más favorable entre 3 meses de salario o promedio 3 años)
  const tope3Meses = salarioMensual * 3;
  const topeLegal = Math.max(tope3Meses, ptuPromedio3Anos);
  const ptuFinalTopada = Math.min(ptuCalculadaBruta, topeLegal);

  // 4. Exención de ISR (15 UMAs = ~1,700 MXN)
  const uma = 113.14;
  const exencionIsr = Math.min(ptuFinalTopada, 15 * uma);
  const ptuGravable = Math.max(0, ptuFinalTopada - exencionIsr);
  const isrRetenido = ptuGravable * 0.15; // Estimado retención provisional

  const ptuNetaPagar = ptuFinalTopada - isrRetenido;

  const breakdown = [
    { label: 'PTU Correspondiente por Días Laborados (50%)', value: ptuPorDias },
    { label: 'PTU Correspondiente por Salario Devengado (50%)', value: ptuPorSalario },
    { label: 'Monto de PTU Calculado sin Topes', value: ptuCalculadaBruta, isTotal: true },
    { label: 'Límite Máximo Legal (Tope 3 Meses de Salario LFT)', value: tope3Meses },
    { label: 'PTU Bruta a Pagar (Aplicando Tope Legal LFT)', value: ptuFinalTopada, isTotal: true },
    { label: 'Parte Exenta de ISR (15 UMAs de Ley)', value: exencionIsr },
    { label: 'Retención de ISR sobre PTU Gravable', value: isrRetenido, isDeduction: true },
    { label: 'PTU Neta a Recibir en Mano', value: ptuNetaPagar, isFinal: true },
  ];

  return {
    grossIncome: ptuFinalTopada,
    netIncome: ptuNetaPagar,
    totalTax: isrRetenido,
    effectiveRate: ptuFinalTopada > 0 ? isrRetenido / ptuFinalTopada : 0,
    breakdown,
    currency: 'MXN',
    currencySymbol: '$',
    additionalInsights: [
      `Conforme a la reforma a la LFT del 2021, el monto de la PTU está topado a un máximo de 3 meses de salario ($${Math.round(tope3Meses).toLocaleString('es-MX')} MXN) o el promedio de los últimos 3 años.`,
      `El pago de PTU debe realizarse entre el 1 de abril y el 30 de mayo para empresas (Personas Morales), o hasta el 29 de junio para patrones personas físicas.`,
    ],
  };
}
