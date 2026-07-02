/**
 * FondoUne — sheets-connector.js  v2.1
 * Conecta el portal con Google Apps Script para leer
 * los datos del asociado directamente desde Google Sheets.
 *
 * Cambios v2.1 (seguridad):
 *  - Validación de cédula vía FondouneValidator antes de consultar
 *  - Sanitización de todos los datos recibidos del servidor
 *  - Verificación de origen de la respuesta (no confiar ciegamente)
 *  - Timeout en fetch para evitar cuelgues silenciosos
 *  - Headers de seguridad en la petición
 *  - Mensajes de error sin exponer detalles internos al usuario
 */

const SheetsConnector = (() => {

  // ── URL del Google Apps Script desplegado ─────────────────────
  const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw9xkhjxc9Ti_rkL82RMnYDIIzEtJzNJYbavDsVgpPPYEisZ5qbA-I4YzDd3ocl38uVhw/exec';

  // ── Caché en sessionStorage (5 min TTL) ───────────────────────
  const CACHE_KEY    = 'fu_sheets_cache';
  const CACHE_TTL_MS = 5 * 60 * 1000;

  // ── Timeout de red ────────────────────────────────────────────
  const FETCH_TIMEOUT_MS = 25000; // 25 segundos máximo

  // ─────────────────────────────────────────────────────────────
  // OBTENER DATOS DEL ASOCIADO
  // ─────────────────────────────────────────────────────────────
  async function obtenerAsociado(cedula) {
    // 1. Validar cédula antes de enviar al servidor
    const v = (typeof FondouneValidator !== 'undefined')
      ? FondouneValidator.validarCedula(cedula)
      : { ok: !!cedula, valor: String(cedula || '').replace(/[.,\s]/g,'').trim(), error: null };

    if (!v.ok) {
      console.warn('[SheetsConnector] Cédula inválida:', v.error);
      return null;
    }

    const cedulaLimpia = v.valor;

    // 2. Revisar caché primero
    const cached = getCache(cedulaLimpia);
    if (cached) {
      console.log('[SheetsConnector] Datos desde caché para:', cedulaLimpia);
      return cached;
    }

    try {
      const url = `${GAS_WEB_APP_URL}?action=getAsociado&cedula=${encodeURIComponent(cedulaLimpia)}`;

      // 3. Fetch con timeout y sin credentials para evitar CSRF
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const resp = await fetch(url, {
        method:      'GET',
        signal:      controller.signal,
        credentials: 'omit',            // no enviar cookies ni credenciales
        headers: {
          'Accept': 'application/json',
        },
      });
      clearTimeout(timer);

      if (!resp.ok) {
        console.error('[SheetsConnector] HTTP error:', resp.status);
        return null;
      }

      const json = await resp.json();

      // 4. Verificar estructura de la respuesta antes de usarla
      if (typeof json !== 'object' || json === null) {
        console.error('[SheetsConnector] Respuesta inesperada del servidor');
        return null;
      }

      if (!json.ok) {
        console.error('[SheetsConnector] Error del servidor (detalles en log interno)');
        return null;
      }

      if (!json.data || typeof json.data !== 'object') {
        console.error('[SheetsConnector] Estructura de datos inválida');
        return null;
      }

      const data = json.data;
      if (!data.encontrado) return null;

      // 5. Sanitizar TODOS los datos antes de usarlos
      const datosLimpios = sanitizarDatosAsociado(data);

      setCache(cedulaLimpia, datosLimpios);
      return datosLimpios;

    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[SheetsConnector] Timeout: el servidor tardó demasiado');
        return { encontrado: false, _error: 'timeout' };
      } else {
        console.error('[SheetsConnector] Error de conexión');
        return { encontrado: false, _error: 'conexion' };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SANITIZAR DATOS DEL ASOCIADO
  // Asegura que ningún campo venga con contenido inesperado
  // ─────────────────────────────────────────────────────────────
  function sanitizarDatosAsociado(data) {
    const s = (typeof FondouneValidator !== 'undefined')
      ? FondouneValidator.sanitize
      : (v) => String(v || '').replace(/[<>"']/g, '').trim();

    const n = (v) => {
      const num = Number(v);
      return isNaN(num) || num < 0 ? 0 : num;
    };

    return {
      encontrado:      true,
      cedula:          s(data.cedula),
      nombre:          s(data.nombre),
      primerNombre:    s(data.primerNombre),
      primerApellido:  s(data.primerApellido),
      estado:          /^[AI]$/.test(data.estado) ? data.estado : 'I', // solo A o I
      activo:          data.activo === true,
      direccion:       s(data.direccion),
      telefono:        s(data.telefono).replace(/\D/g, '').slice(0, 13),
      email:           s(data.email).toLowerCase().slice(0, 254),
      fechaNacimiento: s(data.fechaNacimiento),
      empresa:         s(data.empresa),
      codigoEmpresa:   s(data.codigoEmpresa),
      agencia:         s(data.agencia),
      ciudad:          s(data.ciudad),
      fechaIngreso:    s(data.fechaIngreso),
      salarioBasico:   n(data.salarioBasico),
      aportes:         n(data.aportes),
      cuotaAporte:     n(data.cuotaAporte),
      totalDevengado:  n(data.totalDevengado),
      totalDeducciones:n(data.totalDeducciones),
      netoPagado:      n(data.netoPagado),
      libranzasActivas:n(data.libranzasActivas),
      capacidadPago:   n(data.capacidadPago),
      periodoNomina:   s(data.periodoNomina),
      fuente:          'Google Sheets FondoUne',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CARGAR DATOS EN EL PORTAL — pre-llena el formulario módulo 1
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

    // ── Pre-llenar campos del formulario (usando textContent, nunca innerHTML) ──
    setField('f-cedula',    datos.cedula);
    setField('f-nombre',    datos.nombre);
    setField('f-empresa',   datos.empresa);
    setField('f-email',     datos.email || '');
    setField('f-cel',       datos.telefono);
    setField('f-direccion', datos.direccion);

    // ── Actualizar tarjeta de nómina si existe ──
    updateNominaCard(datos);

    if (ui) {
      // Usar textContent (no innerHTML) para el mensaje de estado
      ui.textContent = `✓ Datos cargados desde el sistema FondoUne (${datos.agencia})`;
      ui.className   = 'sheets-ok';
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFICAR CAPACIDAD DE PAGO
  // ─────────────────────────────────────────────────────────────
  async function verificarCapacidad(cedula, montoSolicitado, plazoMeses) {
    // Validar entradas
    const vMonto = (typeof FondouneValidator !== 'undefined')
      ? FondouneValidator.validarMonto(montoSolicitado)
      : { ok: montoSolicitado > 0, valor: montoSolicitado };

    const vPlazo = (typeof FondouneValidator !== 'undefined')
      ? FondouneValidator.validarPlazo(plazoMeses)
      : { ok: plazoMeses > 0, valor: plazoMeses };

    if (!vMonto.ok || !vPlazo.ok) return null;

    const nomina = (typeof FondouneSession !== 'undefined')
      ? FondouneSession.getNomina()
      : null;

    const datos = nomina || await obtenerAsociado(cedula);
    if (!datos) return null;

    const neto      = nomina?.neto      || datos.netoPagado    || 0;
    const libranzas = nomina?.libranzas || datos.libranzasActivas || 0;
    const TASA      = 0.011; // 1.1% E.M.

    const monto = vMonto.valor;
    const plazo = vPlazo.valor;

    const cuota = monto *
      (TASA * Math.pow(1 + TASA, plazo)) /
      (Math.pow(1 + TASA, plazo) - 1);

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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(`${GAS_WEB_APP_URL}?action=ping`, {
        method:      'GET',
        signal:      controller.signal,
        credentials: 'omit',
      });
      clearTimeout(timer);

      if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
      const json = await resp.json();
      return json;
    } catch (err) {
      return { ok: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────
  function setField(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) {
      // Usar value para inputs — nunca innerHTML
      el.value = String(val);
    }
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
      // textContent en vez de innerHTML — nunca insertar datos del servidor en HTML crudo
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
    } catch {}
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
