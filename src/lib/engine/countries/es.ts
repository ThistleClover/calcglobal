// src/lib/engine/countries/es.ts
// Spain Financial & Tax Engine — 2025/2026 Tax Rules
// Sources: Agencia Tributaria (agenciatributaria.es - AEAT), Seguridad Social, Estatuto de los Trabajadores

import { safeVal, type TaxInput, type TaxResult } from '../types';

export function calculate(inputs: TaxInput): TaxResult {
  const calcId = String(inputs.calculator_id || 'sueldo-neto-espana');

  switch (calcId) {
    case 'cuota-autonomos-ingresos-reales':
      return calculateCuotaAutonomos(inputs);
    case 'gastos-compra-vivienda-itp':
      return calculateGastosViviendaItp(inputs);
    case 'finiquito-indemnizacion-despido':
      return calculateFiniquitoDespido(inputs);
    case 'iva-irpf-trimestral-autonomos':
      return calculateIvaIrpfAutonomos(inputs);
    case 'sueldo-neto-espana':
    default:
      return calculateSueldoNeto(inputs);
  }
}

// IRPF Estatal + Autonómico General (Tramos 2025/2026)
function calculateIrpfEspana(baseLiquidabile: number, minimoPersonal = 5550): number {
  if (baseLiquidabile <= 0) return 0;

  function escala(base: number): number {
    if (base <= 0) return 0;
    let cuota = 0;
    let rem = base;
    if (rem > 300000) { cuota += (rem - 300000) * 0.47; rem = 300000; }
    if (rem > 60000)  { cuota += (rem - 60000) * 0.45;  rem = 60000;  }
    if (rem > 35200)  { cuota += (rem - 35200) * 0.37;  rem = 35200;  }
    if (rem > 20200)  { cuota += (rem - 20200) * 0.30;  rem = 20200;  }
    if (rem > 12450)  { cuota += (rem - 12450) * 0.24;  rem = 12450;  }
    if (rem > 0)      { cuota += rem * 0.19; }
    return cuota;
  }

  const cuotaLorda = escala(baseLiquidabile);
  const cuotaMinimo = escala(minimoPersonal);
  return Math.max(0, cuotaLorda - cuotaMinimo);
}

// 1. Calculadora Sueldo Neto España (IRPF & Seguridad Social 2025/2026)
function calculateSueldoNeto(inputs: TaxInput): TaxResult {
  const brutoAnual = safeVal(inputs.salario_bruto_anual ?? inputs.salario ?? inputs.salary);
  const numPagas = safeVal(inputs.numero_pagas, 12);
  const situacion = String(inputs.situacion_familiar || 'soltero_sin_hijos');
  const hijos = safeVal(inputs.numero_hijos, 0);

  if (brutoAnual <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Salario Bruto Anual', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // Cotizaciones Seguridad Social Trabajador (6.47% total con MEI 2025/2026):
  // Contingencias Comunes 4.70%, Desempleo 1.55%, Formación 0.10%, MEI 0.12%
  // Base máxima mensual: 4.720,50 € (56.646 €/año)
  const baseCotizacionAnual = Math.min(brutoAnual, 56646);
  const cuotaSsTrabajador = baseCotizacionAnual * 0.0647;

  // Gastos deducibles generales IRPF (2.000 € fijos)
  const gastosGeneralesIrpf = 2000;

  // Reducción por obtención de rendimientos del trabajo (Art. 20 LIRPF hasta 7.302 € para rentas < 19.747 €)
  let reduccionTrabajo = 0;
  if (brutoAnual <= 14047.50) {
    reduccionTrabajo = 7302;
  } else if (brutoAnual <= 19747.50) {
    reduccionTrabajo = Math.max(0, 7302 - 1.75 * (brutoAnual - 14047.50));
  }

  const baseLiquidabile = Math.max(0, brutoAnual - cuotaSsTrabajador - gastosGeneralesIrpf - reduccionTrabajo);

  // Mínimo Personal y Familiar
  let minimoPersonalFamiliar = 5550;
  if (hijos === 1) minimoPersonalFamiliar += 2400;
  else if (hijos === 2) minimoPersonalFamiliar += 2400 + 2700;
  else if (hijos >= 3) minimoPersonalFamiliar += 2400 + 2700 + (hijos - 2) * 4000;

  if (situacion === 'monoparental') minimoPersonalFamiliar += 2150;

  const retencionIrpfAnual = calculateIrpfEspana(baseLiquidabile, minimoPersonalFamiliar);
  const totalDeducciones = cuotaSsTrabajador + retencionIrpfAnual;
  const netoAnual = brutoAnual - totalDeducciones;
  const netoMensual = netoAnual / numPagas;

  const breakdown = [
    { label: 'Salario Bruto Anual Pactado', value: brutoAnual },
    { label: 'Cotización Seguridad Social Trabajador (6,47% incl. MEI)', value: cuotaSsTrabajador, isDeduction: true },
    { label: 'Base Liquidable General IRPF', value: baseLiquidabile, isTotal: true },
    { label: 'Retención IRPF Anual Estimada (Hacienda)', value: retencionIrpfAnual, isDeduction: true },
    { label: 'Salario Neto Anual Disponible', value: netoAnual, isFinal: true },
    { label: `Salario Neto Mensual (${numPagas} pagas)`, value: Math.round(netoMensual), isTotal: true },
  ];

  return {
    grossIncome: brutoAnual,
    netIncome: netoAnual,
    totalTax: totalDeducciones,
    effectiveRate: totalDeducciones / brutoAnual,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      `Tu tipo de retención IRPF efectivo es del ${( (retencionIrpfAnual / brutoAnual) * 100 ).toFixed(2)}%.`,
      `El salario neto que recibes en tu cuenta bancaria representa el ${( (netoAnual / brutoAnual) * 100 ).toFixed(1)}% de tu retribución bruta.`,
    ],
  };
}

// 2. Cuota de Autónomos por Ingresos Reales (Sistema RETA 2025/2026)
function calculateCuotaAutonomos(inputs: TaxInput): TaxResult {
  const rendimientoMensual = safeVal(inputs.rendimiento_neto_mensual_esperado ?? inputs.ingresos);
  const esTarifaPlana = String(inputs.es_tarifa_plana_primer_ano || 'no').includes('si');
  const esCuotaCero = String(inputs.comunidad_cuota_cero || 'ninguna') !== 'ninguna';

  if (rendimientoMensual <= 0 && !esTarifaPlana) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Rendimiento Neto Mensual', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // Tabla de Tramos RETA 2025/2026 (15 tramos de rendimientos netos)
  let cuotaMensualReta = 294.00; // Tramo intermedio estándar

  if (esTarifaPlana) {
    cuotaMensualReta = esCuotaCero ? 0 : 80.00; // Tarifa Plana 80 € o Cuota Cero
  } else {
    if (rendimientoMensual < 670) cuotaMensualReta = 200.00;
    else if (rendimientoMensual <= 900) cuotaMensualReta = 220.00;
    else if (rendimientoMensual <= 1166.70) cuotaMensualReta = 260.00;
    else if (rendimientoMensual <= 1300) cuotaMensualReta = 291.00;
    else if (rendimientoMensual <= 1500) cuotaMensualReta = 294.00;
    else if (rendimientoMensual <= 1700) cuotaMensualReta = 294.00;
    else if (rendimientoMensual <= 1850) cuotaMensualReta = 315.00;
    else if (rendimientoMensual <= 2030) cuotaMensualReta = 330.00;
    else if (rendimientoMensual <= 2330) cuotaMensualReta = 350.00;
    else if (rendimientoMensual <= 2760) cuotaMensualReta = 390.00;
    else if (rendimientoMensual <= 3190) cuotaMensualReta = 415.00;
    else if (rendimientoMensual <= 3620) cuotaMensualReta = 440.00;
    else if (rendimientoMensual <= 4050) cuotaMensualReta = 465.00;
    else if (rendimientoMensual <= 6000) cuotaMensualReta = 530.00;
    else cuotaMensualReta = 590.00;
  }

  // IRPF Modelo 130 (20% sobre rendimiento neto menos cuota RETA)
  const rendimientoNetoFiscal = Math.max(0, rendimientoMensual - cuotaMensualReta);
  const irpfMensualEstimado = rendimientoNetoFiscal * 0.20;

  const totalCargasMensuales = cuotaMensualReta + irpfMensualEstimado;
  const netoMensualEnBolsillo = Math.max(0, rendimientoMensual - totalCargasMensuales);

  const breakdown = [
    { label: 'Rendimiento Neto Mensual Previsto (Ingresos − Gastos)', value: rendimientoMensual },
    {
      label: esTarifaPlana
        ? `Cuota RETA (Tarifa Plana Reducida ${esCuotaCero ? 'Cuota Cero' : '80 €/mes'})`
        : `Cuota RETA Seguridad Social (Tramo según Rendimientos Reales)`,
      value: cuotaMensualReta,
      isDeduction: true,
    },
    { label: 'Pago a Cuenta IRPF Estimado (Modelo 130 - 20%)', value: irpfMensualEstimado, isDeduction: true },
    { label: 'Total Pagos Mensuales a Seguridad Social y Hacienda', value: totalCargasMensuales, isTotal: true },
    { label: 'Rendimiento Neto Disponible en Cuenta (Neto Mensual)', value: netoMensualEnBolsillo, isFinal: true },
  ];

  return {
    grossIncome: rendimientoMensual,
    netIncome: netoMensualEnBolsillo,
    totalTax: totalCargasMensuales,
    effectiveRate: rendimientoMensual > 0 ? totalCargasMensuales / rendimientoMensual : 0,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    quarterlyPayment: (cuotaMensualReta + irpfMensualEstimado) * 3,
    additionalInsights: [
      esTarifaPlana
        ? `Disfrutas de la Tarifa Plana estatal de 80 €/mes durante tus primeros 12 meses de actividad como autónomo.`
        : `Tu cuota se ajusta a tu tramo de ingresos reales de acuerdo con el sistema de cotización RETA. Puedes modificar tu base hasta 6 veces al año.`,
    ],
  };
}

// 3. Gastos e Impuestos de Compra de Vivienda (ITP & AJD)
function calculateGastosViviendaItp(inputs: TaxInput): TaxResult {
  const precio = safeVal(inputs.precio_inmueble ?? inputs.precio);
  const tipoVivienda = String(inputs.tipo_vivienda || 'segunda_mano_itp');
  const ccaa = String(inputs.comunidad_autonoma || 'madrid');
  const edad = safeVal(inputs.edad_comprador, 35);
  const hipoteca = String(inputs.necesita_hipoteca || 'si') === 'si';

  if (precio <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Precio del Inmueble', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  let impuestoCompra = 0;
  let tipoImpuestoNombre = '';

  if (tipoVivienda === 'obra_nueva_iva') {
    // Obra Nueva: 10% IVA + AJD (0.5% a 1.5%)
    const iva = precio * 0.10;
    let tasaAjd = 0.015;
    if (ccaa === 'madrid') tasaAjd = 0.0075;
    const ajd = precio * tasaAjd;
    impuestoCompra = iva + ajd;
    tipoImpuestoNombre = `IVA Obra Nueva (10%) + AJD (${(tasaAjd * 100).toFixed(2)}%)`;
  } else {
    // Segunda Mano: ITP según CCAA
    let tasaItp = 0.08; // Media general
    if (ccaa === 'madrid') tasaItp = edad < 35 ? 0.04 : 0.06;
    else if (ccaa === 'cataluna' || ccaa === 'valencia') tasaItp = edad < 32 ? 0.05 : 0.10;
    else if (ccaa === 'andalucia') tasaItp = edad < 35 && precio <= 150000 ? 0.035 : 0.07;
    else if (ccaa === 'galicia') tasaItp = 0.08;
    else if (ccaa === 'baleares') tasaItp = 0.08;

    impuestoCompra = precio * tasaItp;
    tipoImpuestoNombre = `ITP Impuesto Transmisiones Patrimoniales (${(tasaItp * 100).toFixed(1)}%)`;
  }

  // Notaría, Registro y Gestoría (Aranceles regulados)
  const notaria = Math.min(1500, Math.max(600, precio * 0.002 + 450));
  const registro = Math.min(800, Math.max(350, precio * 0.001 + 250));
  const gestoria = 400;
  const tasacion = hipoteca ? 350 : 0;

  const totalGastosCompra = impuestoCompra + notaria + registro + gestoria + tasacion;
  const inversionTotal = precio + totalGastosCompra;

  const breakdown = [
    { label: 'Precio de Compraventa Inmueble', value: precio },
    { label: tipoImpuestoNombre, value: impuestoCompra, isDeduction: true },
    { label: 'Aranceles Notaría (Escritura Pública de Compraventa)', value: notaria, isDeduction: true },
    { label: 'Inscripción en el Registro de la Propiedad', value: registro, isDeduction: true },
    { label: 'Honorarios de Gestoría Administrativa', value: gestoria, isDeduction: true },
    ...(tasacion > 0 ? [{ label: 'Tasación Oficial Hipotecaria Homologada', value: tasacion, isDeduction: true }] : []),
    { label: 'Total Gastos e Impuestos de Adquisición', value: totalGastosCompra, isTotal: true },
    { label: 'Desembolso Total Necesario para la Compra', value: inversionTotal, isFinal: true },
  ];

  return {
    grossIncome: precio,
    netIncome: inversionTotal,
    totalTax: totalGastosCompra,
    effectiveRate: totalGastosCompra / precio,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      `Los gastos totales e impuestos representan aproximadamente el ${( (totalGastosCompra / precio) * 100 ).toFixed(2)}% del valor de la vivienda (regla del 10%-12%).`,
      tipoVivienda === 'segunda_mano_itp'
        ? `El ITP debe liquidarse ante la Agencia Tributaria autonómica en un plazo máximo de 30 días hábiles mediante el Modelo 600.`
        : `Para vivienda nueva, el IVA del 10% se abona directamente al promotor y el AJD mediante el Modelo 601.`,
    ],
  };
}

// 4. Finiquito e Indemnización por Despido (Estatuto de los Trabajadores)
function calculateFiniquitoDespido(inputs: TaxInput): TaxResult {
  const salarioMensual = safeVal(inputs.salario_bruto_mensual ?? inputs.salario);
  const numPagas = safeVal(inputs.numero_pagas, 12);
  const anos = safeVal(inputs.antiguedad_anos ?? inputs.years, 2);
  const meses = safeVal(inputs.antiguedad_meses, 0);
  const tipoDespido = String(inputs.tipo_despido || 'despido_improcedente');
  const vacacionesPendientes = safeVal(inputs.dias_vacaciones_pendientes, 0);

  if (salarioMensual <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Salario Mensual Bruto', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  const salarioAnual = salarioMensual * numPagas;
  const salarioDiario = salarioAnual / 365;
  const antiguedadTotalAnos = anos + meses / 12;

  // 1. Indemnización
  let diasPorAno = 33; // Improcedente (33 días, máx 24 mensualidades)
  let maxMeses = 24;

  if (tipoDespido === 'despido_objetivo_economico') {
    diasPorAno = 20; // Objetivo (20 días, máx 12 mensualidades)
    maxMeses = 12;
  } else if (tipoDespido === 'fin_contrato_temporal') {
    diasPorAno = 12; // Fin contrato temporal (12 días)
    maxMeses = 12;
  } else if (tipoDespido === 'baja_voluntaria_dimision' || tipoDespido === 'despido_disciplinario_procedente') {
    diasPorAno = 0;
    maxMeses = 0;
  }

  const indemnizacionCalculada = salarioDiario * diasPorAno * antiguedadTotalAnos;
  const topeIndemnizacion = salarioMensual * maxMeses;
  const indemnizacionFinal = Math.min(indemnizacionCalculada, topeIndemnizacion);

  // 2. Finiquito (Pagas extras devengadas + Vacaciones no disfrutadas)
  const vacacionesImporte = salarioDiario * vacacionesPendientes;
  const pagasExtrasDevengadas = numPagas === 14 ? (salarioMensual * 2) * 0.5 : 0; // Estimado medio semestre
  const totalFiniquito = vacacionesImporte + pagasExtrasDevengadas;

  // Exención de IRPF: La indemnización legal por despido improcedente u objetivo está 100% exenta hasta 180.000 €
  const totalNetoCobrar = indemnizacionFinal + totalFiniquito;

  const breakdown = [
    { label: 'Salario Diario de Referencia', value: salarioDiario },
    { label: `Antigüedad Total en la Empresa (${antiguedadTotalAnos.toFixed(2)} años)`, value: antiguedadTotalAnos },
    ...(indemnizacionFinal > 0
      ? [
          {
            label: `Indemnización por Despido (${diasPorAno} días/año - 100% Exenta IRPF)`,
            value: indemnizacionFinal,
            isTotal: true,
          },
        ]
      : []),
    ...(vacacionesImporte > 0 ? [{ label: `Vacaciones No Disfrutadas (${vacacionesPendientes} días)`, value: vacacionesImporte }] : []),
    ...(pagasExtrasDevengadas > 0 ? [{ label: 'Parte Proporcional Pagas Extraordinarias Devengadas', value: pagasExtrasDevengadas }] : []),
    { label: 'Total Finiquito y Liquidación a Percibir', value: totalNetoCobrar, isFinal: true },
  ];

  return {
    grossIncome: totalNetoCobrar,
    netIncome: totalNetoCobrar,
    totalTax: 0,
    effectiveRate: 0,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    additionalInsights: [
      `Conforme al Art. 7.e de la Ley del IRPF, la indemnización legal por despido está totalmente exenta de tributación hasta el límite de 180.000 €.`,
      `El finiquito de vacaciones y pagas extras sí cotiza a la Seguridad Social y tributa en el IRPF del mes de liquidación.`,
    ],
  };
}

// 5. Modelos 303 de IVA y 130 de IRPF Trimestral
function calculateIvaIrpfAutonomos(inputs: TaxInput): TaxResult {
  const ingresosTrimestre = safeVal(inputs.ingresos_trimestre_sin_iva ?? inputs.ingresos);
  const ivaRate = safeVal(inputs.tipo_iva_repercutido || '21') / 100;
  const gastosTrimestre = safeVal(inputs.gastos_deducibles_sin_iva ?? inputs.gastos);
  const ivaSoportado = safeVal(inputs.iva_soportado_compras, gastosTrimestre * ivaRate);
  const retencionesIrpf = safeVal(inputs.retenciones_irpf_ya_practicadas, 0);

  if (ingresosTrimestre <= 0) {
    return {
      grossIncome: 0,
      netIncome: 0,
      totalTax: 0,
      effectiveRate: 0,
      breakdown: [{ label: 'Ingresos del Trimestre', value: 0 }],
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  // 1. Modelo 303 (IVA Trimestral)
  const ivaRepercutido = ingresosTrimestre * ivaRate;
  const resultadoModelo303 = Math.max(0, ivaRepercutido - ivaSoportado);

  // 2. Modelo 130 (IRPF Trimestral - 20% sobre rendimiento neto)
  const rendimientoNetoTrimestre = Math.max(0, ingresosTrimestre - gastosTrimestre);
  const pagoCuentaIrpf = Math.max(0, rendimientoNetoTrimestre * 0.20 - retencionesIrpf);

  const totalLiquidacionHacienda = resultadoModelo303 + pagoCuentaIrpf;
  const beneficioLimpio = ingresosTrimestre - gastosTrimestre - pagoCuentaIrpf;

  const breakdown = [
    { label: 'Ingresos Trimestrales Facturados (Base Imponible)', value: ingresosTrimestre },
    { label: 'Gastos Deducibles de la Actividad (Base Imponible)', value: gastosTrimestre, isDeduction: true },
    { label: `IVA Repercutido / Cobrado a Clientes (${(ivaRate * 100).toFixed(0)}%)`, value: ivaRepercutido },
    { label: 'IVA Soportado / Deducible en Compras', value: ivaSoportado, isDeduction: true },
    { label: 'Resultado Liquidación IVA Modelo 303', value: resultadoModelo303, isDeduction: true },
    { label: 'Pago Fraccionado IRPF Modelo 130 (20% Rendimiento Neto)', value: pagoCuentaIrpf, isDeduction: true },
    { label: 'Total a Pagar a la AEAT este Trimestre', value: totalLiquidacionHacienda, isTotal: true },
    { label: 'Beneficio Limpio Real del Trimestre', value: beneficioLimpio, isFinal: true },
  ];

  return {
    grossIncome: ingresosTrimestre,
    netIncome: beneficioLimpio,
    totalTax: totalLiquidacionHacienda,
    effectiveRate: totalLiquidacionHacienda / ingresosTrimestre,
    breakdown,
    currency: 'EUR',
    currencySymbol: '€',
    quarterlyPayment: totalLiquidacionHacienda,
    additionalInsights: [
      `Los trimestres fiscales vencen el 20 de abril (1T), 20 de julio (2T), 20 de octubre (3T) y 30 de enero (4T).`,
      `Si más del 70% de tu facturación está sujeta a retención de IRPF en factura por ser clientes empresas o autónomos españoles, estás exento de presentar el Modelo 130.`,
    ],
  };
}
