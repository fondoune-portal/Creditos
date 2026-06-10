/**
 * FondoUne — sheets-connector.js
 * Conecta el portal con Google Apps Script para leer
 * los datos del asociado directamente desde Google Sheets.
 *
 * Configuración requerida:
 *   1. Despliega Code.gs como Web App en Google Apps Script
 *   2. Copia la URL del despliegue en GAS_WEB_APP_URL (abajo)
 *   3. Asegúrate que "Quién tiene acceso" sea "Cualquier usuario"
 */

const SheetsConnector = (() => {

  // ── URL del Google Apps Script desplegado ─────────────────────
  // Reemplaza con tu URL después del deploy en GAS
  const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw9xkhjxc9Ti_rkL82RMnYDIIzEtJzNJYbavDsVgpPPYEisZ5qbA-I4YzDd3ocl38uVhw/exec';

  // ── Caché en sessionStorage (5 min TTL) ───────────────────────
  const CACHE_KEY    = 'fu_sheets_cache';
  const CACHE_TTL_MS = 5 * 60 * 1000;

  // ─────────────────────────────────────────────────────────────
  // OBTENER DATOS DEL ASOCIADO
  // @param {string} cedula
  // @returns {object|null}
  // ─────────────────────────────────────────────────────────────
  async function obtenerAsociado(cedula) {
    if (!cedula) {
      console.warn('[SheetsConnector] Se requiere cédula');
      return null;
    }

    // Revisar caché primero
    const cached = getCache(cedula);
    if (cached) {
      console.log('[SheetsConnector] Datos desde caché para:', cedula);
      return cached;
    }

    try {
      const url  = `${GAS_WEB_APP_URL}?action=getAsociado&cedula=${encodeURIComponent(cedula)}`;
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      if (!json.ok)      throw new Error(json.error || 'Respuesta inválida del servidor');
      if (!json.data)    throw new Error('Sin datos en la respuesta');

      const data = json.data;
      if (!data.encontrado) return null;

      setCache(cedula, data);
      return data;

    } catch (err) {
      console.error('[SheetsConnector] Error:', err.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CARGAR DATOS EN EL PORTAL — pre-llena el formulario módulo 1
  // @param {string} cedula
  // ─────────────────────────────────────────────────────────────
  async function cargarDatosEnPortal(cedula) {
    const ui = document.getElementById('sheets-status');
    if (ui) { ui.textContent = 'Consultando base de datos…'; ui.className = 'sheets-loading'; }

    const datos = await obtenerAsociado(cedula);

    if (!datos) {
      if (ui) {
        ui.textContent = '⚠ No se encontró el asociado en la base de datos.';
        ui.className   = 'sheets-warn';
      }
      return false;
    }

    if (!datos.activo) {
      if (ui) {
        ui.textContent = '⚠ El asociado figura como inactivo en el sistema.';
        ui.className   = 'sheets-warn';
      }
      return false;
    }

    // ── Actualizar sesión ──
    if (typeof FondouneSession !== 'undefined') {
      const userActual = FondouneSession.getUser();
      FondouneSession.initUser({
        ...userActual,
        name:     datos.nombre         || userActual.name,
        empresa:  datos.empresa        || userActual.empresa,
        ciudad:   datos.ciudad         || userActual.ciudad,
        tel:      datos.telefono       || userActual.tel,
        email:    datos.email          || userActual.email,
        initials: iniciales(datos.nombre) || userActual.initials,
      });

      FondouneSession.saveNomina({
        basico:       datos.salarioBasico,
        devengado:    datos.totalDevengado,
        deducciones:  datos.totalDeducciones,
        neto:         datos.netoPagado,
        libranzas:    datos.libranzasActivas || 0,
        aportes:      datos.aportes,
        cuotaAporte:  datos.cuotaAporte,
        empresa:      datos.empresa,
        periodo:      datos.periodoNomina,
        fuente:       'Google Sheets FondoUne',
      });
    }

    // ── Pre-llenar campos del formulario ──
    setField('f-cedula',    cedula);
    setField('f-nombre',    datos.nombre);
    setField('f-empresa',   datos.empresa);
    setField('f-email',     datos.email || '');
    setField('f-cel',       datos.telefono);
    setField('f-direccion', datos.direccion);

    // ── Actualizar tarjeta de nómina si existe ──
    updateNominaCard(datos);

    if (ui) {
      ui.textContent = `✓ Datos cargados desde el sistema FondoUne (${datos.agencia})`;
      ui.className   = 'sheets-ok';
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFICAR CAPACIDAD DE PAGO
  // @param {string} cedula
  // @param {number} montoSolicitado
  // @param {number} plazoMeses
  // @returns {object|null}
  // ─────────────────────────────────────────────────────────────
  async function verificarCapacidad(cedula, montoSolicitado, plazoMeses) {
    const nomina = (typeof FondouneSession !== 'undefined')
      ? FondouneSession.getNomina()
      : null;

    const datos = nomina || await obtenerAsociado(cedula);
    if (!datos) return null;

    const neto      = nomina?.neto      || datos.netoPagado    || 0;
    const libranzas = nomina?.libranzas || datos.libranzasActivas || 0;
    const TASA      = 0.011; // 1.1% E.M.

    const cuota = montoSolicitado *
      (TASA * Math.pow(1 + TASA, plazoMeses)) /
      (Math.pow(1 + TASA, plazoMeses) - 1);

    const disponible = neto * 0.35 - libranzas;
    const porcentaje = neto > 0 ? Math.round((cuota / neto) * 100 * 10) / 10 : 0;
    const aprobable  = cuota <= disponible && porcentaje <= 35;

    return {
      cuota:      Math.round(cuota),
      capacidad:  Math.round(disponible),
      porcentaje,
      aprobable,
      neto,
      libranzas,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // PING — verifica que el Apps Script esté respondiendo
  // ─────────────────────────────────────────────────────────────
  async function ping() {
    try {
      const url  = `${GAS_WEB_APP_URL}?action=ping`;
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
      return await resp.json();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────
  function setField(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  }

  function updateNominaCard(datos) {
    const fmt = n => typeof n === 'number' ? '$' + n.toLocaleString('es-CO') : (n || '—');
    const map = {
      'nomina-basico':      fmt(datos.salarioBasico),
      'nomina-devengado':   fmt(datos.totalDevengado),
      'nomina-deducciones': fmt(datos.totalDeducciones),
      'nomina-neto':        fmt(datos.netoPagado),
      'nomina-empresa':     datos.empresa,
      'nomina-periodo':     datos.periodoNomina,
      'nomina-aportes':     fmt(datos.aportes),
      'nomina-capacidad':   fmt(datos.capacidadPago),
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    });
    const card = document.getElementById('nomina-card');
    if (card) card.style.display = 'block';
  }

  function iniciales(nombre) {
    if (!nombre) return '';
    return nombre.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  function getCache(cedula) {
    try {
      const raw   = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      const entry = cache[cedula];
      if (!entry) return null;
      if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
      return entry.data;
    } catch { return null; }
  }

  function setCache(cedula, data) {
    try {
      const raw   = sessionStorage.getItem(CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      cache[cedula] = { data, ts: Date.now() };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
  }

  function clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
  }

  // ─────────────────────────────────────────────────────────────
  // AUTO-CARGA al iniciar el módulo portal
  // ─────────────────────────────────────────────────────────────
  function autoLoad() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _tryAutoLoad);
    } else {
      setTimeout(_tryAutoLoad, 300);
    }
  }

  function _tryAutoLoad() {
    if (typeof FondouneSession === 'undefined') return;
    const user = FondouneSession.getUser();
    if (!user?.id) return;
    const esPortal = document.body.classList.contains('fu-module-portal');
    if (!esPortal) return;
    cargarDatosEnPortal(user.id);
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    obtenerAsociado,
    cargarDatosEnPortal,
    verificarCapacidad,
    ping,
    clearCache,
    autoLoad,
  };

})();

// Auto-inicializar
SheetsConnector.autoLoad();
