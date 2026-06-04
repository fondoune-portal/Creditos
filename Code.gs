/**
 * FondoUne — Google Apps Script (Code.gs)
 * API REST que lee datos de asociados desde Google Sheets
 * y los entrega al portal de crédito.
 *
 * ── ESTRUCTURA DE HOJAS REQUERIDA ────────────────────────────────
 *
 *  Hoja 1: "Asociados"
 *  ┌──────────────┬─────────────────┬──────────────────────┬──────────┬──────────────────┬──────────────────────┬────────────────────┬──────────────┐
 *  │   Cedula     │     Nombre      │        Email         │ Celular  │     Empresa      │        Cargo         │  CodigoEmpleado    │    Estado    │
 *  ├──────────────┼─────────────────┼──────────────────────┼──────────┼──────────────────┼──────────────────────┼────────────────────┼──────────────┤
 *  │ 1045678901   │Carlos A. Gil    │carlos.gil@une.net.co │3148024500│Tigo-UNE S.A.S.  │Técnico de Redes      │UNE-04321           │Activo        │
 *  │ 1152445230   │Valentina Ospina │v.ospina@emtelco.com  │3201234567│Emtelco S.A.     │Asesora Call Center   │EMT-00891           │Activo        │
 *  └──────────────┴─────────────────┴──────────────────────┴──────────┴──────────────────┴──────────────────────┴────────────────────┴──────────────┘
 *
 *  Hoja 2: "Nomina"
 *  ┌──────────────┬──────────────┬────────────────┬──────────────────┬────────────┬───────────────┬─────────────────┐
 *  │   Cedula     │SalarioBasico │ TotalDevengado │ TotalDeducciones │ NetoPagado │LibranzasActivas│  PeriodoNomina  │
 *  ├──────────────┼──────────────┼────────────────┼──────────────────┼────────────┼───────────────┼─────────────────┤
 *  │ 1045678901   │  3800000     │   4250000      │    1100000       │  3150000   │      0        │   Abril 2025    │
 *  │ 1152445230   │  2800000     │   3100000      │     650000       │  2450000   │      0        │   Abril 2025    │
 *  └──────────────┴──────────────┴────────────────┴──────────────────┴────────────┴───────────────┴─────────────────┘
 *
 *  Hoja 3: "Creditos" (historial de créditos previos)
 *  ┌──────────────┬─────────────┬──────────┬────────┬───────────┬────────────┐
 *  │   Cedula     │ SolicitudId │  Monto   │ Plazo  │  Estado   │   Fecha    │
 *  ├──────────────┼─────────────┼──────────┼────────┼───────────┼────────────┤
 *  │ 1045678901   │SOL-2024-0312│ 5000000  │  12    │  Pagado   │ 2024-01-15 │
 *  └──────────────┴─────────────┴──────────┴────────┴───────────┴────────────┘
 *
 * ── CÓMO DESPLEGAR ───────────────────────────────────────────────
 *  1. Abrir script.google.com → Nuevo proyecto
 *  2. Pegar este código en Code.gs
 *  3. Guardar con Ctrl+S
 *  4. Clic en "Implementar" → "Nueva implementación"
 *  5. Tipo: Aplicación web
 *  6. Ejecutar como: Yo (tu cuenta)
 *  7. Quién tiene acceso: Cualquier usuario (para que el portal pueda llamarlo)
 *  8. Clic en "Implementar" → copiar la URL
 *  9. Pegar esa URL en sheets-connector.js → GAS_WEB_APP_URL
 */

// ── ID DE LA HOJA DE CÁLCULO ────────────────────────────────────
// Reemplaza con el ID de tu Google Sheets
// (está en la URL: docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit)
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';

// Nombres de las hojas
const SHEETS = {
  ASOCIADOS: 'Asociados',
  NOMINA:    'Nomina',
  CREDITOS:  'Creditos',
};

// ─────────────────────────────────────────────────────────────────
// ENTRY POINT — maneja todas las peticiones GET del portal
// ─────────────────────────────────────────────────────────────────
function doGet(e) {
  const params  = e.parameter || {};
  const action  = params.action || '';
  const cedula  = (params.cedula || '').trim().replace(/\./g, '').replace(/,/g, '');

  try {
    let result;

    switch (action) {
      case 'getAsociado':
        if (!cedula) return jsonError('Se requiere el parámetro cedula');
        result = getAsociado(cedula);
        break;

      case 'getNomina':
        if (!cedula) return jsonError('Se requiere el parámetro cedula');
        result = getNomina(cedula);
        break;

      case 'getHistorialCreditos':
        if (!cedula) return jsonError('Se requiere el parámetro cedula');
        result = getHistorialCreditos(cedula);
        break;

      case 'getAsociadoCompleto':
        // Devuelve asociado + nómina + historial en una sola llamada
        if (!cedula) return jsonError('Se requiere el parámetro cedula');
        result = getAsociadoCompleto(cedula);
        break;

      case 'ping':
        result = { ok: true, ts: new Date().toISOString(), version: '1.0' };
        break;

      default:
        return jsonError('Acción no reconocida: ' + action);
    }

    return jsonOk(result);

  } catch (err) {
    Logger.log('ERROR doGet: ' + err.message);
    return jsonError('Error interno del servidor: ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. OBTENER DATOS DEL ASOCIADO
// ─────────────────────────────────────────────────────────────────
function getAsociado(cedula) {
  const hoja = abrirHoja(SHEETS.ASOCIADOS);
  const fila = buscarFila(hoja, cedula, 0); // columna 0 = Cedula

  if (!fila) return { encontrado: false, cedula };

  return {
    encontrado:      true,
    cedula:          String(fila[0] || '').trim(),
    nombre:          String(fila[1] || '').trim(),
    email:           String(fila[2] || '').trim(),
    celular:         String(fila[3] || '').trim(),
    empresa:         String(fila[4] || '').trim(),
    cargo:           String(fila[5] || '').trim(),
    codigoEmpleado:  String(fila[6] || '').trim(),
    estado:          String(fila[7] || 'Activo').trim(),
  };
}

// ─────────────────────────────────────────────────────────────────
// 2. OBTENER DATOS DE NÓMINA
// ─────────────────────────────────────────────────────────────────
function getNomina(cedula) {
  const hoja = abrirHoja(SHEETS.NOMINA);
  const fila = buscarFila(hoja, cedula, 0);

  if (!fila) return { encontrado: false, cedula };

  const basico      = parseNum(fila[1]);
  const devengado   = parseNum(fila[2]);
  const deducciones = parseNum(fila[3]);
  const neto        = parseNum(fila[4]);
  const libranzas   = parseNum(fila[5]);

  return {
    encontrado:        true,
    cedula:            String(fila[0]).trim(),
    salarioBasico:     basico,
    totalDevengado:    devengado,
    totalDeducciones:  deducciones,
    netoPagado:        neto,
    libranzasActivas:  libranzas,
    periodoNomina:     String(fila[6] || '').trim(),
    // Cálculos derivados
    capacidadPago:     Math.round(neto * 0.35 - libranzas),
    porcentajeLibranza: neto > 0 ? Math.round((libranzas / neto) * 100 * 10) / 10 : 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// 3. HISTORIAL DE CRÉDITOS PREVIOS
// ─────────────────────────────────────────────────────────────────
function getHistorialCreditos(cedula) {
  const hoja    = abrirHoja(SHEETS.CREDITOS);
  const datos   = hoja.getDataRange().getValues();
  const headers = datos[0];

  const creditos = datos.slice(1).filter(row => {
    const ced = String(row[0] || '').trim().replace(/\./g, '');
    return ced === cedula;
  }).map(row => ({
    cedula:      String(row[0]).trim(),
    solicitudId: String(row[1] || '').trim(),
    monto:       parseNum(row[2]),
    plazo:       parseNum(row[3]),
    estado:      String(row[4] || '').trim(),
    fecha:       String(row[5] || '').trim(),
  }));

  const alDia     = creditos.filter(c => c.estado === 'Pagado' || c.estado === 'Al día').length;
  const enMora    = creditos.filter(c => c.estado === 'Mora').length;

  return {
    encontrado: creditos.length > 0,
    cedula,
    totalCreditos: creditos.length,
    alDia,
    enMora,
    creditos,
    buenoHistorial: enMora === 0 && alDia > 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// 4. PERFIL COMPLETO — asociado + nómina + historial (1 llamada)
// ─────────────────────────────────────────────────────────────────
function getAsociadoCompleto(cedula) {
  const asociado  = getAsociado(cedula);
  if (!asociado.encontrado) return { encontrado: false, cedula };

  const nomina    = getNomina(cedula);
  const historial = getHistorialCreditos(cedula);

  return {
    ...asociado,
    nomina:    nomina.encontrado    ? nomina    : null,
    historial: historial.encontrado ? historial : null,
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────
function abrirHoja(nombre) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error(`Hoja "${nombre}" no encontrada en el spreadsheet`);
  return hoja;
}

function buscarFila(hoja, valor, columna) {
  const datos  = hoja.getDataRange().getValues();
  const valorNorm = String(valor).trim().replace(/\./g, '').replace(/,/g, '');

  for (let i = 1; i < datos.length; i++) { // i=1: saltar encabezados
    const celdaNorm = String(datos[i][columna] || '').trim().replace(/\./g, '').replace(/,/g, '');
    if (celdaNorm === valorNorm) return datos[i];
  }
  return null;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  return Number(String(val).replace(/[$,.]/g, '').trim()) || 0;
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data, ts: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg, ts: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
// TRIGGER — se ejecuta cuando hay cambios en la hoja
// Para activarlo: Extensiones → Apps Script → Triggers → + Add Trigger
//   Función: onSheetChange | Evento: From spreadsheet → On change
// ─────────────────────────────────────────────────────────────────
function onSheetChange(e) {
  const hoja   = e.source.getActiveSheet().getName();
  const rango  = e.range ? e.range.getA1Notation() : '?';
  Logger.log(`[FondoUne] Cambio detectado en hoja "${hoja}", rango: ${rango}`);
  // Aquí puedes agregar lógica adicional:
  // - Notificar al portal via Firebase
  // - Validar datos recién ingresados
  // - Enviar email si hay cambios críticos
}

// ─────────────────────────────────────────────────────────────────
// FUNCIÓN DE PRUEBA — ejecutar manualmente desde el editor de GAS
// para verificar que todo funciona antes de desplegar
// ─────────────────────────────────────────────────────────────────
function testConexion() {
  const CEDULA_PRUEBA = '1045678901';

  Logger.log('=== TEST FONDOUNE SHEETS API ===');
  Logger.log('Buscando asociado: ' + CEDULA_PRUEBA);

  const asociado = getAsociado(CEDULA_PRUEBA);
  Logger.log('Asociado: ' + JSON.stringify(asociado));

  const nomina = getNomina(CEDULA_PRUEBA);
  Logger.log('Nómina: ' + JSON.stringify(nomina));

  const historial = getHistorialCreditos(CEDULA_PRUEBA);
  Logger.log('Historial: ' + JSON.stringify(historial));

  Logger.log('=== TEST COMPLETADO ===');
}
