/**
 * FondoUne — creditos-config.js
 * Catálogo oficial de líneas de crédito, tasas vigentes y parámetros.
 * Fuente: Portafolio oficial FondoUne (actualizado marzo 2026)
 *
 * Incluir en todos los módulos ANTES de session.js y navigation.js:
 *   <script src="creditos-config.js"></script>
 *
 * SMMLV 2025: $1,423,500 COP
 */

const FondouneCreditos = (() => {

  const SMMLV = 1423500;

  // ── LÍNEAS DE CRÉDITO ──────────────────────────────────────────────────────
  const LINEAS = {

    educativo: {
      id:          'educativo',
      nombre:      'Educativo',
      icono:       'ti-school',
      color:       '#3B82F6',
      descripcion: 'Para matrículas de colegios, pregrado, posgrado, derechos de grado, amortización o cancelación de préstamos con ICETEX y/o entidades financieras, estudio de idiomas y compra de equipo de cómputo.',
      destinacion: [
        'Matrículas colegios, pregrado y posgrado',
        'Derechos de grado',
        'Amortización / cancelación préstamos ICETEX o entidades financieras',
        'Estudio de idiomas',
        'Compra de computador y centro de cómputo',
      ],
      plazos: { min: 6, max: 36, unidad: 'meses' },
      montoMin: 500000,
      montoMax: null, // según estudio
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1,  plazoHasta: 12, tasaEA: 13.73 },
        { plazoDesde: 13, plazoHasta: 24, tasaEA: 14.91 },
        { plazoDesde: 25, plazoHasta: 36, tasaEA: 16.11 },
      ],
    },

    vivienda: {
      id:          'vivienda',
      nombre:      'Vivienda',
      icono:       'ti-home-2',
      color:       '#10B981',
      descripcion: 'Crédito hipotecario para compra, construcción o mejora de vivienda propia. Incluye tasa fija especial para VIS y No VIS.',
      destinacion: [
        'Compra de apartamento o casa (urbana o rural)',
        'Levantamiento de hipoteca',
        'Amortización o abono a crédito hipotecario',
        'Compra de lote y construcción sobre lote propio',
      ],
      plazos: { min: 12, max: 180, unidad: 'meses' },
      montoMin: 5000000,
      montoMax: null,
      requiereCodeudor: true,
      requiereGarantia: true,
      tasas: [
        { plazoDesde: 1,   plazoHasta: 120, tasaEA: 13.73, nota: 'Tasa variable 1–10 años' },
        { plazoDesde: 121, plazoHasta: 180, tasaEA: 16.11, nota: 'Tasa variable 11–15 años' },
        { plazoDesde: 1,   plazoHasta: 120, tasaEA: 13.26, nota: 'Tasa FIJA VIS 1–10 años',  tipo: 'fija_vis'  },
        { plazoDesde: 121, plazoHasta: 180, tasaEA: 13.26, nota: 'Tasa FIJA NVIS 11–15 años', tipo: 'fija_nvis' },
      ],
    },

    salud: {
      id:          'salud',
      nombre:      'Salud',
      icono:       'ti-heart-pulse',
      color:       '#EF4444',
      descripcion: 'Para tratamientos médicos, cirugías, medicamentos y servicios de salud no cubiertos por el POS.',
      destinacion: [
        'Tratamientos médicos y odontológicos',
        'Todo tipo de cirugías',
        'Medicamentos',
        'Tratamientos en Spa con prescripción médica',
        'Servicios no cubiertos por el POS',
        'Pago de prepagadas y pólizas de vida',
      ],
      plazos: { min: 6, max: 36, unidad: 'meses' },
      montoMin: 300000,
      montoMax: null,
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1,  plazoHasta: 24, tasaEA: 12.56 },
        { plazoDesde: 25, plazoHasta: 36, tasaEA: 13.73 },
      ],
    },

    crediexpress: {
      id:          'crediexpress',
      nombre:      'CrediExpress',
      icono:       'ti-bolt',
      color:       '#F59E0B',
      descripcion: 'Cupo fijo con tope de 5 SMMLV. Libre destinación, sin garantía, sin codeudor y sin legalización. Rotativo con posibilidad de pago anticipado.',
      destinacion: [
        'Libre destinación',
        'Cruce con la misma línea sin superar el tope',
      ],
      plazos: { min: 1, max: 24, unidad: 'meses' },
      montoMin: 100000,
      montoMax: SMMLV * 5,  // 5 SMMLV → $7.117.500
      requiereCodeudor: false,
      requiereGarantia: false,
      notasEspeciales: [
        'No requiere codeudor',
        'No requiere legalización',
        `Tope máximo: 5 SMMLV (${(SMMLV * 5).toLocaleString('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0})})`,
        'Pago posible en cualquier momento',
      ],
      tasas: [
        { plazoDesde: 1, plazoHasta: 24, tasaEA: 20.05 }, // CrediAvance
      ],
    },

    vehiculos: {
      id:          'vehiculos',
      nombre:      'Vehículos',
      icono:       'ti-car',
      color:       '#8B5CF6',
      descripcion: 'Crédito exclusivo para compra de vehículo. Descuentos exclusivos hasta el 6% en vehículos Mazda y Chevrolet.',
      destinacion: [
        'Compra de vehículo nuevo o usado',
        'Descuentos exclusivos 6% en Mazda y Chevrolet',
      ],
      plazos: { min: 12, max: 72, unidad: 'meses' },
      montoMin: 3000000,
      montoMax: null,
      requiereCodeudor: true,
      requiereGarantia: true,
      tasas: [
        { plazoDesde: 1,  plazoHasta: 36, tasaEA: 16.11 },
        { plazoDesde: 37, plazoHasta: 72, tasaEA: 18.55 },
      ],
    },

    vacacional: {
      id:          'vacacional',
      nombre:      'Vacacional',
      icono:       'ti-plane',
      color:       '#06B6D4',
      descripcion: 'El crédito más utilizado del Fondo. Para programar viajes para ti y tu familia en época de vacaciones.',
      destinacion: [
        'Viajes nacionales e internacionales',
        'Planes vacacionales familiares',
        'Paquetes turísticos',
      ],
      plazos: { min: 3, max: 24, unidad: 'meses' },
      montoMin: 300000,
      montoMax: null,
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1, plazoHasta: 24, tasaEA: 14.91 },
      ],
    },

    libre_inversion: {
      id:          'libre_inversion',
      nombre:      'Libre Inversión',
      icono:       'ti-wallet',
      color:       '#64748B',
      descripcion: 'Crédito de libre destinación para dar solución a necesidades de consumo del asociado.',
      destinacion: [
        'Libre destinación según necesidades del asociado',
      ],
      plazos: { min: 6, max: 48, unidad: 'meses' },
      montoMin: 500000,
      montoMax: null,
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1,  plazoHasta: 24, tasaEA: 16.11 },
        { plazoDesde: 25, plazoHasta: 48, tasaEA: 17.04 },
      ],
    },

    creditributo: {
      id:          'creditributo',
      nombre:      'Creditributo',
      icono:       'ti-receipt-tax',
      color:       '#0EA5E9',
      descripcion: 'Para el pago de impuestos del asociado: renta, patrimonio, departamentales, vehiculares, gravámenes, multas y cuotas de administración.',
      destinacion: [
        'Impuestos renta y patrimonio',
        'Impuestos departamentales o de vehículos (incluye sanciones y recargos)',
        'Gravámenes y multas municipales',
        'Compra de libreta militar',
        'Deudas o cuotas de administración de vivienda rural o urbana',
      ],
      plazos: { min: 3, max: 24, unidad: 'meses' },
      montoMin: 100000,
      montoMax: SMMLV * 20, // 20 SMMLV → $28.470.000
      notasEspeciales: [
        'Monto hasta el 100% de los impuestos y cuotas de administración',
        `Máximo 20 SMMLV (${(SMMLV * 20).toLocaleString('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0})})`,
      ],
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1, plazoHasta: 24, tasaEA: 14.91 },
      ],
    },

    solidario: {
      id:          'solidario',
      nombre:      'Solidario',
      icono:       'ti-heart-handshake',
      color:       '#EC4899',
      descripcion: 'Crédito de emergencia para necesidades económicas imprevistas por calamidad, póliza exequial o calamidad pública decretada por el gobierno nacional.',
      destinacion: [
        'Calamidad económica imprevista',
        'Pago de póliza exequial',
        'Calamidad pública decretada por el gobierno nacional',
      ],
      plazos: { min: 3, max: 24, unidad: 'meses' },
      montoMin: 200000,
      montoMax: null,
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1, plazoHasta: 24, tasaEA: 12.56 },
      ],
    },

    especial: {
      id:          'especial',
      nombre:      'Especial',
      icono:       'ti-star',
      color:       '#D97706',
      descripcion: 'Para eventos especiales del Fondo, compra de cartera de entidades financieras (tarjetas, rotativos) y pago de pólizas de vehículo y hogar.',
      destinacion: [
        'Compras en eventos especiales programados por el Fondo',
        'Compra de cartera de tarjetas de crédito',
        'Compra de créditos rotativos y demás obligaciones',
        'Pago de pólizas de vehículo y hogar',
      ],
      plazos: { min: 6, max: 72, unidad: 'meses' },
      montoMin: 500000,
      montoMax: null,
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1,  plazoHasta: 36, tasaEA: 13.88, nota: 'Compra cartera 1–3 años' },
        { plazoDesde: 37, plazoHasta: 60, tasaEA: 16.00, nota: 'Compra cartera 4–5 años' },
        { plazoDesde: 61, plazoHasta: 72, tasaEA: 17.04, nota: 'Compra cartera 6 años'   },
      ],
    },

    crediprima: {
      id:          'crediprima',
      nombre:      'Crediprima',
      icono:       'ti-calendar-event',
      color:       '#7C3AED',
      descripcion: 'Modalidad especial con pago programado solo con primas semestrales. Hasta 3 años.',
      destinacion: [
        'Libre destinación',
        'Pago con primas semestrales (cada 6 meses)',
      ],
      plazos: { min: 6, max: 36, unidad: 'meses', nota: 'Pago con primas c/6 meses' },
      montoMin: 500000,
      montoMax: null,
      requiereCodeudor: false,
      requiereGarantia: false,
      tasas: [
        { plazoDesde: 1, plazoHasta: 36, tasaEA: 16.11 },
      ],
    },

  };

  // ── UTILIDADES DE TASA ────────────────────────────────────────────────────

  /**
   * Obtiene la tasa EA para una línea y plazo dados.
   * @param {string} lineaId  - clave de LINEAS
   * @param {number} plazoMeses
   * @param {string} [tipo]   - 'fija_vis' | 'fija_nvis' (solo vivienda)
   * @returns {number|null}   - tasa EA o null si no aplica
   */
  function getTasaEA(lineaId, plazoMeses, tipo) {
    const linea = LINEAS[lineaId];
    if (!linea) return null;
    const tramo = linea.tasas.find(t =>
      plazoMeses >= t.plazoDesde &&
      plazoMeses <= t.plazoHasta &&
      (!tipo || t.tipo === tipo)
    );
    return tramo ? tramo.tasaEA : null;
  }

  /**
   * Convierte tasa EA % a tasa mensual.
   * @param {number} ea - porcentaje EA (ej: 13.73)
   * @returns {number}  - tasa mensual en decimal
   */
  function eaAMensual(ea) {
    return Math.pow(1 + ea / 100, 1 / 12) - 1;
  }

  /**
   * Calcula cuota mensual por el sistema francés.
   * @param {number} monto      - capital
   * @param {number} plazoMeses
   * @param {number} tasaEA     - porcentaje (ej: 13.73)
   * @returns {number}          - valor cuota mensual
   */
  function calcularCuota(monto, plazoMeses, tasaEA) {
    const im = eaAMensual(tasaEA);
    if (im === 0) return monto / plazoMeses;
    return Math.round(monto * (im * Math.pow(1 + im, plazoMeses)) /
                      (Math.pow(1 + im, plazoMeses) - 1));
  }

  /**
   * Retorna un resumen calculado de la solicitud.
   * @param {string} lineaId
   * @param {number} monto
   * @param {number} plazoMeses
   * @param {number} [netoMensual] - neto nómina para % compromiso
   * @returns {object}
   */
  function simularCredito(lineaId, monto, plazoMeses, netoMensual) {
    const tasaEA   = getTasaEA(lineaId, plazoMeses);
    if (!tasaEA) return null;
    const tasaEM   = eaAMensual(tasaEA);
    const cuota    = calcularCuota(monto, plazoMeses, tasaEA);
    const totalInt = cuota * plazoMeses - monto;
    const pctComp  = netoMensual ? ((cuota / netoMensual) * 100).toFixed(1) : null;
    return {
      lineaId, monto, plazoMeses,
      tasaEA:  tasaEA.toFixed(2) + '% E.A.',
      tasaEM:  (tasaEM * 100).toFixed(4) + '% E.M.',
      cuota,
      totalIntereses: Math.round(totalInt),
      totalPagar:     cuota * plazoMeses,
      pctCompromiso:  pctComp,
      capacidadOk:    pctComp ? parseFloat(pctComp) <= 35 : null,
    };
  }

  // ── LISTA ORDENADA PARA SELECTS ───────────────────────────────────────────
  function getOpcionesSelect() {
    return Object.values(LINEAS).map(l => ({
      value: l.id,
      label: l.nombre,
      icono: l.icono,
      color: l.color,
    }));
  }

  // ── API PÚBLICA ───────────────────────────────────────────────────────────
  return {
    SMMLV,
    LINEAS,
    getTasaEA,
    eaAMensual,
    calcularCuota,
    simularCredito,
    getOpcionesSelect,
    getLinea: id => LINEAS[id] || null,
  };

})();
