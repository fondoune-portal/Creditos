/**
 * FondoUne — Google Apps Script (Code.gs)
 * API REST que lee datos de asociados desde Google Sheets.
 *
 * ── ESTRUCTURA REAL DE LA HOJA ────────────────────────────────────
 *  Hoja única: 'NARA20260515110928'
 *
 *  Col  Campo          Descripción
 *  [0]  CEDULASOCI     Cédula del asociado (clave de búsqueda)
 *  [1]  CODNIT         Código NIT
 *  [2]  AGENCIA        Código agencia
 *  [3]  NOMBREAGEN     Nombre agencia
 *  [4]  NOMBRE         Nombre completo (APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2)
 *  [5]  ESTADO         A = Activo, I = Inactivo
 *  [6]  DIRECCION      Dirección residencia
 *  [7]  TELEFONO1      Teléfono
 *  [8]  FECHANACIM     Fecha de nacimiento
 *  [9]  FECHANACI2     Fecha de nacimiento (duplicado)
 *  [10] SALARIO        Salario base
 *  [11] CODEMPRESA     Código empresa empleadora
 *  [12] NOMBREEMPR     Nombre empresa empleadora
 *  [13] APORTES        Total aportes acumulados
 *  [14] CUOTA          Cuota mensual de aporte
 *  [15] CODEMPRES2     Código empresa (duplicado)
 *  [16] EMPRESATRA     Empresa de trabajo
 *  [17] NIT            NIT del asociado
 *  [18] PRIMERAPEL     Primer apellido
 *  [19] SEGUNDOAPE     Segundo apellido
 *  [20] NOMBRES        Primer nombre
 *  [21] SEGUNDONOM     Segundo nombre
 *  [22] CIUDADEMPR     Ciudad empresa
 *  [23] FECHAINGRE     Fecha de ingreso al fondo
 *  [24] CEDNUMJC       Cédula (duplicado)
 *
 * ── CÓMO DESPLEGAR ───────────────────────────────────────────────
 *  1. Abrir script.google.com → proyecto FondoUne
 *  2. Pegar este código en Code.gs y guardar (Ctrl+S)
 *  3. Reemplazar SPREADSHEET_ID con el ID real del Sheets
 *  4. Implementar → Nueva implementación
 *     - Tipo: Aplicación web
 *     - Ejecutar como: Yo
 *     - Quién tiene acceso: Cualquier usuario
 *  5. Copiar la URL y pegarla en sheets-connector.js → GAS_WEB_APP_URL
 */

// ── CONFIGURACIÓN ─────────────────────────────────────────────────
const SPREADSHEET_ID = '1efZ-zzWq_KTZGk-vCGSiS4I6U7fvMmyRZ9WOtkg1sas';
const SHEET_NAME     = 'NARA20260515110928';

// Índices de columnas (basado en la estructura real del Sheets)
const COL = {
  CEDULA:      0,
  CODNIT:      1,
  AGENCIA:     2,
  NOMBREAGEN:  3,
  NOMBRE:      4,
  ESTADO:      5,
  DIRECCION:   6,
  TELEFONO:    7,
  FECHANACIM:  8,
  SALARIO:     10,
  CODEMPRESA:  11,
  NOMBREEMPR:  12,
  APORTES:     13,
  CUOTA:       14,
  EMPRESATRA:  16,
  NIT:         17,
  PRIMERAPEL:  18,
  SEGUNDOAPE:  19,
  NOMBRES:     20,
  SEGUNDONOM:  21,
  CIUDADEMPR:  22,
  FECHAINGRE:  23,
};

// ─────────────────────────────────────────────────────────────────
// ENTRY POINT — maneja todas las peticiones GET del portal
// ─────────────────────────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || '';
  const cedula = limpiarCedula(params.cedula || '');

  try {
    let result;

    switch (action) {

      case 'getAsociado':
        if (!cedula) return jsonError('Se requiere el parámetro cedula');
        result = getAsociado(cedula);
        break;

      case 'ping':
        result = { ok: true, ts: new Date().toISOString(), version: '2.0', sheet: SHEET_NAME };
        break;

      default:
        return jsonError('Acción no reconocida: ' + action);
    }

    return jsonOk(result);

  } catch (err) {
    Logger.log('ERROR doGet: ' + err.message);
    return jsonError('Error interno: ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// OBTENER DATOS DEL ASOCIADO
// Busca por cédula y devuelve un objeto normalizado listo para el portal
// ─────────────────────────────────────────────────────────────────
function getAsociado(cedula) {
  const hoja  = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!hoja) throw new Error('Hoja "' + SHEET_NAME + '" no encontrada');

  const datos = hoja.getDataRange().getValues();

  // Buscar fila (i=1 para saltar encabezados)
  for (let i = 1; i < datos.length; i++) {
    const filaCedula = limpiarCedula(String(datos[i][COL.CEDULA] || ''));
    if (filaCedula !== cedula) continue;

    const fila = datos[i];

    // Construir nombre legible: "Nombres Apellidos"
    const primerNombre  = cap(String(fila[COL.NOMBRES]    || '').trim());
    const segundoNombre = cap(String(fila[COL.SEGUNDONOM] || '').trim());
    const primerApe     = cap(String(fila[COL.PRIMERAPEL] || '').trim());
    const segundoApe    = cap(String(fila[COL.SEGUNDOAPE] || '').trim());
    const nombreCompleto = [primerNombre, segundoNombre, primerApe, segundoApe]
      .filter(Boolean).join(' ');

    const salario   = parseNum(fila[COL.SALARIO]);
    const aportes   = parseNum(fila[COL.APORTES]);
    const cuotaAporte = parseNum(fila[COL.CUOTA]);

    // Calcular capacidad de pago estimada (35% del salario como tope de libranza)
    const capacidadPago = Math.round(salario * 0.35);

    return {
      encontrado:     true,
      cedula:         String(fila[COL.CEDULA]).trim(),
      nombre:         nombreCompleto,
      primerNombre:   primerNombre,
      primerApellido: primerApe,
      estado:         String(fila[COL.ESTADO] || 'A').trim(),
      activo:         String(fila[COL.ESTADO] || '').trim().toUpperCase() === 'A',
      direccion:      String(fila[COL.DIRECCION] || '').trim(),
      telefono:       String(fila[COL.TELEFONO]  || '').trim().replace(/\s/g, ''),
      fechaNacimiento:formatDate(fila[COL.FECHANACIM]),
      // Empresa
      empresa:        cap(String(fila[COL.EMPRESATRA] || fila[COL.NOMBREEMPR] || '').trim()),
      codigoEmpresa:  String(fila[COL.CODEMPRESA] || '').trim(),
      agencia:        String(fila[COL.NOMBREAGEN] || '').trim(),
      ciudad:         cap(String(fila[COL.CIUDADEMPR] || '').trim()),
      fechaIngreso:   formatDate(fila[COL.FECHAINGRE]),
      // Datos financieros
      salarioBasico:  salario,
      aportes:        aportes,
      cuotaAporte:    cuotaAporte,
      // Nómina estimada (sin deducciones externas reales disponibles)
      totalDevengado:    salario,
      totalDeducciones:  cuotaAporte,
      netoPagado:        salario - cuotaAporte,
      libranzasActivas:  0,
      capacidadPago:     capacidadPago,
      periodoNomina:     periodoActual(),
      fuente:            'Google Sheets FondoUne',
    };
  }

  // No encontrado
  return { encontrado: false, cedula };
}

// ─────────────────────────────────────────────────────────────────
// FUNCIÓN DE PRUEBA — ejecutar manualmente desde el editor de GAS
// ─────────────────────────────────────────────────────────────────
function testConexion() {
  const CEDULA_PRUEBA = '9869309';
  Logger.log('=== TEST FONDOUNE SHEETS API v2 ===');
  const r = getAsociado(CEDULA_PRUEBA);
  Logger.log(JSON.stringify(r, null, 2));
  Logger.log('=== FIN TEST ===');
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function limpiarCedula(val) {
  return String(val || '').trim().replace(/[.,\s]/g, '');
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  return Number(String(val).replace(/[$,.\s]/g, '')) || 0;
}

function cap(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(val) {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch { return String(val); }
}

function periodoActual() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const now = new Date();
  return meses[now.getMonth()] + ' ' + now.getFullYear();
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
