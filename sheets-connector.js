/**
 * FondoUne — sheets-connector.js  (Fase D)
 * Conecta el portal con Google Apps Script para leer
 * los datos del asociado directamente desde Google Sheets.
 *
 * Configuración requerida:
 *   1. Despliega Code.gs como Web App en Google Apps Script
 *   2. Copia la URL del despliegue en GAS_WEB_APP_URL
 *   3. Asegúrate que "Quién tiene acceso" sea "Cualquiera"
 */

const SheetsConnector = (() => {

  // ── URL de tu Google Apps Script desplegado ───────────────────────
  // Reemplaza esta URL con la tuya después de hacer el deploy en GAS
  const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec';

  // ── Caché para evitar llamadas repetidas ──────────────────────────
  const CACHE_KEY      = 'fu_sheets_cache';
  const CACHE_TTL_MS   = 5 * 60 * 1000; // 5 minutos

  // ─────────────────────────────────────────────────────────────────
  // FUNCIÓN PRINCIPAL — obtener datos del asociado
  // @param {string} cedula  — número de cédula del asociado
  // @returns {object|null}  — datos del asociado o null si no se encontró
  // ─────────────────────────────────────────────────────────────────
  async function obtenerAsociado(cedula) {
    if (!cedula) {
      console.warn('[SheetsConnector] Se requiere cédula');
      return null;
    }

    // 1. Revisar caché primero
    const cached = getCache(cedula);
    if (cached) {
      console.log('[SheetsConnector] Datos desde caché para:', cedula);
      return cached;
    }

    // 2. Llamar al Google Apps Script
    try {
      const url  = `${GAS_WEB_APP_URL}?action=getAsociado&cedula=${encodeURIComponent(cedula)}`;
      const resp = await fetch(url, { method: 'GET' });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();

      if (data.error) {
        console.warn('[SheetsConnector] Error del servidor:', data.error);
        return null;
      }

      // Guardar en caché
      setCache(cedula, data);
      return data;

    } catch (err) {
      console.error('[SheetsConnector] Error al conectar con Sheets:', err.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // APLICAR DATOS AL PORTAL — pre-llena el formulario del módulo 1
  // @param {string} cedula — cédula del asociado logueado
  // ─────────────────────────────────────────────────────────────────
  async function cargarDatosEnPortal(cedula) {
    const ui = document.getElementById('sheets-status');
    if (ui) { ui.textContent = 'Consultando base de datos…'; ui.className = 'sheets-loading'; }

    const datos = await obtenerAsociado(cedula);

    if (!datos) {
      if (ui) { ui.textContent = '⚠ No se encontró el asociado en la base de datos.'; ui.className = 'sheets-warn'; }
      return false;
    }

    // ── Actualizar sesión con los datos reales ──
    if (typeof FondouneSession !== 'undefined') {
      const userActual = FondouneSession.getUser();
      FondouneSession.initUser({
        ...userActual,
        name:    datos.nombre     || userActual.name,
        empresa: datos.empresa    || userActual.empresa,
        cargo:   datos.cargo      || userActual.cargo,
        initials: (datos.nombre||'').split(' ').map(n=>n[0]).join('').slice(0,2) || userActual.initials,
      });
      FondouneSession.saveNomina({
        basico:      datos.salarioBasico,
        devengado:   datos.totalDevengado,
        deducciones: datos.totalDeducciones,
        neto:        datos.netoPagado,
        libranzas:   datos.libranzasActivas || 0,
        empresa:     datos.empresa,
        periodo:     datos.periodoNomina,
        fuente:      'Google Sheets',
      });
    }

    // ── Actualizar campos del formulario si existen ──
    setField('f-cedula',    cedula);
    setField('f-nombre',    datos.nombre);
    setField('f-empresa',   datos.empresa);
    setField('f-cargo',     datos.cargo);
    setField('f-email',     datos.email);
    setField('f-cel',       datos.celular);

    // ── Actualizar tarjeta de nómina si existe ──
    updateNominaCard(datos);

    if (ui) {
      ui.textContent = `✓ Datos cargados automáticamente desde el sistema de RRHH (${datos.empresa})`;
      ui.className = 'sheets-ok';
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────
  // VERIFICAR CAPACIDAD DE PAGO
  // @param {number} montoSolicitado
  // @param {number} plazoMeses
  // @returns {object} { cuota, capacidad, porcentaje, aprobable }
  // ─────────────────────────────────────────────────────────────────
  async function verificarCapacidad(cedula, montoSolicitado, plazoMeses) {
    const nomina = (typeof FondouneSession !== 'undefined')
      ? FondouneSession.getNomina()
      : null;

    // Si no hay nómina en sesión, intentar cargarla
    const datos = nomina || await obtenerAsociado(cedula);
    if (!datos) return null;

    const neto       = nomina?.neto || datos.netoPagado;
    const libranzas  = nomina?.libranzas || datos.libranzasActivas || 0;
    const TASA       = 0.011; // 1.1% E.M.

    const cuota = montoSolicitado *
      (TASA * Math.pow(1 + TASA, plazoMeses)) /
      (Math.pow(1 + TASA, plazoMeses) - 1);

    const disponible   = neto * 0.35 - libranzas;
    const porcentaje   = Math.round((cuota / neto) * 100 * 10) / 10;
    const aprobable    = cuota <= disponible && porcentaje <= 35;

    return {
      cuota:      Math.round(cuota),
      capacidad:  Math.round(disponible),
      porcentaje,
      aprobable,
      neto,
      libranzas,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────────
  function setField(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  }

  function updateNominaCard(datos) {
    const map = {
      'nomina-basico':      datos.salarioBasico,
      'nomina-devengado':   datos.totalDevengado,
      'nomina-deducciones': datos.totalDeducciones,
      'nomina-neto':        datos.netoPagado,
      'nomina-empresa':     datos.empresa,
      'nomina-periodo':     datos.periodoNomina,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el || val === undefined) return;
      el.textContent = typeof val === 'number'
        ? '$' + val.toLocaleString('es-CO')
        : val;
    });
    const card = document.getElementById('nomina-card');
    if (card) card.style.display = 'block';
  }

  function getCache(cedula) {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      const entry = cache[cedula];
      if (!entry) return null;
      if (Date.now() - entry.ts > CACHE_TTL_MS) return null; // expirado
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

  // ─────────────────────────────────────────────────────────────────
  // INICIALIZACIÓN AUTOMÁTICA
  // Cuando el portal carga, lee la cédula de la sesión y busca los datos
  // ─────────────────────────────────────────────────────────────────
  function autoLoad() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _tryAutoLoad);
    } else {
      setTimeout(_tryAutoLoad, 300); // pequeño delay para que la UI cargue
    }
  }

  function _tryAutoLoad() {
    if (typeof FondouneSession === 'undefined') return;
    const user = FondouneSession.getUser();
    if (!user?.id) return;

    // Solo auto-cargar en el portal del asociado (módulo 1)
    const esPortalAsociado = document.body.classList.contains('fu-module-portal');
    if (!esPortalAsociado) return;

    cargarDatosEnPortal(user.id);
  }

  // ── API pública ───────────────────────────────────────────────────
  return {
    obtenerAsociado,
    cargarDatosEnPortal,
    verificarCapacidad,
    clearCache,
    autoLoad,
    GAS_WEB_APP_URL,
  };

})();

// Auto-inicializar al cargar el script
SheetsConnector.autoLoad();
