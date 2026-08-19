/**
 * FondoUne — creditos-config.js
 * Líneas de crédito oficiales y sus tasas vigentes, según el PDF
 * "Servicio de Crédito" publicado en fondoune.com (consultado 8/2026).
 *
 * Cada línea trae la tasa del tramo de plazo más corto/inicial como
 * tasa "de entrada" (la que se muestra en el grid de selección);
 * `tramos` conserva el detalle completo por si se necesita mostrar
 * el resto de plazos más adelante.
 *
 * Uso: incluir en el <head> de cada módulo HTML, después de
 * session.js y antes del script principal.
 * <script src="creditos-config.js"></script>
 */

const FONDOUNE_LINEAS_CREDITO = [
  {
    id: 'solidaridad',
    nombre: 'Solidaridad',
    icono: 'ti-heart-handshake',
    descripcion: 'Apoyo inmediato ante situaciones imprevistas.',
    plazoMaxAnios: 1,
    tasaMensual: 0.78,
    tasaEfectiva: 9.80,
    tramos: [
      { anios: 1, tasaNominal: 9.36, tasaEfectiva: 9.80, tasaMensual: 0.78 },
    ],
  },
  {
    id: 'educativo',
    nombre: 'Educativo',
    icono: 'ti-school',
    descripcion: 'Para tu formación o la de tu familia.',
    plazoMaxAnios: 3,
    tasaMensual: 1.05,
    tasaEfectiva: 13.35,
    tramos: [
      { anios: 1, tasaNominal: 12.55, tasaEfectiva: 13.35, tasaMensual: 1.05 },
      { anios: 2, tasaNominal: 14.62, tasaEfectiva: 15.72, tasaMensual: 1.22 },
      { anios: 3, tasaNominal: 15.67, tasaEfectiva: 16.93, tasaMensual: 1.31 },
    ],
  },
  {
    id: 'salud',
    nombre: 'Salud',
    icono: 'ti-first-aid-kit',
    descripcion: 'Atención médica, tratamientos y procedimientos.',
    plazoMaxAnios: 3,
    tasaMensual: 0.78,
    tasaEfectiva: 9.80,
    tramos: [
      { anios: 2, tasaNominal: 9.36,  tasaEfectiva: 9.80,  tasaMensual: 0.78 },
      { anios: 3, tasaNominal: 13.59, tasaEfectiva: 14.53, tasaMensual: 1.13 },
    ],
  },
  {
    id: 'vivienda',
    nombre: 'Vivienda',
    icono: 'ti-home',
    descripcion: 'Compra, inversión o construcción de vivienda.',
    plazoMaxAnios: 15,
    tasaMensual: 1.13,
    tasaEfectiva: 14.53,
    tramos: [
      { anios: 10, tasaNominal: 13.59, tasaEfectiva: 14.53, tasaMensual: 1.13 },
      { anios: 15, tasaNominal: 15.93, tasaEfectiva: 12.65, tasaMensual: 1.31 },
    ],
  },
  {
    id: 'vacacional',
    nombre: 'Vacacional - Turismo',
    icono: 'ti-plane',
    descripcion: 'Tus próximas vacaciones, sin imprevistos.',
    plazoMaxAnios: 2,
    tasaMensual: 1.32,
    tasaEfectiva: 17.18,
    tramos: [
      { anios: 2, tasaNominal: 15.87, tasaEfectiva: 17.18, tasaMensual: 1.32 },
    ],
  },
  {
    id: 'vehiculo',
    nombre: 'Vehículo',
    icono: 'ti-car',
    descripcion: 'Financia tu carro o moto nuevo o usado.',
    plazoMaxAnios: 5,
    tasaMensual: 1.31,
    tasaEfectiva: 16.93,
    tramos: [
      { anios: 3, tasaNominal: 15.67, tasaEfectiva: 16.93, tasaMensual: 1.31 },
      { anios: 5, tasaNominal: 17.76, tasaEfectiva: 19.40, tasaMensual: 1.48 },
    ],
  },
  {
    id: 'movilidad',
    nombre: 'Movilidad eléctrica',
    icono: 'ti-bike',
    descripcion: 'Bicicletas, motos y patinetas eléctricas.',
    plazoMaxAnios: 5,
    tasaMensual: 0.87,
    tasaEfectiva: 11.04,
    tramos: [
      { anios: 3, tasaNominal: 10.49, tasaEfectiva: 11.04, tasaMensual: 0.87 },
      { anios: 5, tasaNominal: 11.52, tasaEfectiva: 12.19, tasaMensual: 0.96 },
    ],
  },
  {
    id: 'libre_inversion',
    nombre: 'Libre inversión',
    icono: 'ti-wallet',
    descripcion: 'Úsalo para lo que necesites, con total flexibilidad.',
    plazoMaxAnios: 5,
    tasaMensual: 1.57,
    tasaEfectiva: 20.65,
    tramos: [
      { anios: 3, tasaNominal: 18.81, tasaEfectiva: 20.65, tasaMensual: 1.57 },
      { anios: 5, tasaNominal: 20.92, tasaEfectiva: 23.21, tasaMensual: 1.75 },
    ],
  },
  {
    id: 'creditributo',
    nombre: 'Creditributo',
    icono: 'ti-receipt-tax',
    descripcion: 'Para el pago de tus obligaciones tributarias.',
    plazoMaxAnios: 2,
    tasaMensual: 1.22,
    tasaEfectiva: 15.72,
    tramos: [
      { anios: 2, tasaNominal: 14.62, tasaEfectiva: 15.72, tasaMensual: 1.22 },
    ],
  },
  {
    id: 'crediexpress',
    nombre: 'CrediExpress',
    icono: 'ti-bolt',
    descripcion: 'Desembolso ágil para necesidades urgentes.',
    plazoMaxAnios: 2,
    tasaMensual: 1.71,
    tasaEfectiva: 22.57,
    tramos: [
      { anios: 2, tasaNominal: 20.39, tasaEfectiva: 22.57, tasaMensual: 1.71 },
    ],
  },
  {
    id: 'crediprima',
    nombre: 'Crediprima',
    icono: 'ti-calendar-dollar',
    descripcion: 'Anticipa tu prima con condiciones especiales.',
    plazoMaxAnios: 3,
    tasaMensual: 1.57,
    tasaEfectiva: 20.65,
    tramos: [
      { anios: 3, tasaNominal: 18.81, tasaEfectiva: 20.65, tasaMensual: 1.57 },
    ],
  },
];

// Exponer globalmente para uso en otros módulos
window.FONDOUNE_LINEAS_CREDITO = FONDOUNE_LINEAS_CREDITO;

/** Busca una línea de crédito por su id. Devuelve null si no existe. */
function fuBuscarLineaCredito(id) {
  return FONDOUNE_LINEAS_CREDITO.find(l => l.id === id) || null;
}
window.fuBuscarLineaCredito = fuBuscarLineaCredito;
