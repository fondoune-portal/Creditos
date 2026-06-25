/**
 * FondoUne — security-validator.js  v1.0
 * ─────────────────────────────────────────────────────────────────
 * Capa centralizada de seguridad del lado del cliente.
 * Se importa en TODOS los módulos antes de cualquier otro script.
 *
 * Responsabilidades:
 *  1. Sanitizar entradas del usuario (prevenir XSS / inyección)
 *  2. Validar formatos antes de enviar a Firebase o Apps Script
 *  3. Detectar y bloquear orígenes no autorizados (CORS client-side)
 *  4. Rate limiting local (prevenir abuso de consultas CIFIN/Sheets)
 *  5. Limpiar datos sensibles de memoria al cerrar/navegar
 *
 * Uso:
 *   FondouneValidator.sanitize(str)
 *   FondouneValidator.validarCedula(str)        → {ok, valor, error}
 *   FondouneValidator.validarMonto(n, min, max) → {ok, valor, error}
 *   FondouneValidator.validarEmail(str)         → {ok, valor, error}
 *   FondouneValidator.puedeConsultarCIFIN(ced)  → {ok, error}
 *   FondouneValidator.registrarConsultaCIFIN(ced)
 *   FondouneValidator.limpiarSesionSensible()
 * ─────────────────────────────────────────────────────────────────
 */

const FondouneValidator = (() => {
  'use strict';

  // ── Orígenes permitidos ────────────────────────────────────────
  // Solo estas URLs pueden operar el portal.
  // En desarrollo local (file://) también se permite para pruebas.
  const ORIGENES_PERMITIDOS = [
    'https://fondoune-portal.github.io',
    'https://fondoune-portal-credito.github.io',
    'http://localhost',
    'http://127.0.0.1',
  ];

  // ── Rate limiting CIFIN ────────────────────────────────────────
  // Máximo de consultas a CIFIN por cédula por sesión de trabajo.
  // Previene abuso accidental o malicioso de la API de pago.
  const CIFIN_MAX_POR_CEDULA   = 3;    // max 3 consultas por cédula
  const CIFIN_MAX_GLOBAL       = 20;   // max 20 consultas totales en la sesión
  const CIFIN_VENTANA_MS       = 60 * 60 * 1000; // ventana de 1 hora

  // Clave de sessionStorage para tracking de consultas
  const CIFIN_TRACK_KEY = '_fu_cifin_track';

  // ── Campos sensibles a limpiar al cerrar sesión ───────────────
  const CAMPOS_SENSIBLES = [
    'FondouneSession',
    'fu_sheets_cache',
    'fu_credit_app',
    'fu_nomina',
    '_fu_cifin_track',
  ];

  // ══════════════════════════════════════════════════════════════
  // 1. VERIFICACIÓN DE ORIGEN
  // ══════════════════════════════════════════════════════════════
  function verificarOrigen() {
    const origen = window.location.origin;
    const esLocal = origen.startsWith('file://') ||
                    origen.startsWith('http://localhost') ||
                    origen.startsWith('http://127.0.0.1');

    if (esLocal) return; // permitir desarrollo local

    const permitido = ORIGENES_PERMITIDOS.some(o => origen.startsWith(o));
    if (!permitido) {
      console.error('[FondouneValidator] ❌ Origen no autorizado:', origen);
      // No bloquear el render — solo registrar. El bloqueo real
      // lo hacen las reglas de Firestore y el CORS del Apps Script.
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 2. SANITIZACIÓN — prevenir XSS e inyección
  // ══════════════════════════════════════════════════════════════

  /**
   * Elimina HTML/scripts del texto de entrada.
   * Usar SIEMPRE antes de insertar texto en el DOM con innerHTML.
   * @param {any} val
   * @returns {string}
   */
  function sanitize(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Sanitiza un objeto completo recursivamente.
   * Útil para limpiar datos de sessionStorage antes de usarlos.
   * @param {Object} obj
   * @returns {Object}
   */
  function sanitizeObj(obj) {
    if (!obj || typeof obj !== 'object') return {};
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string')       result[k] = sanitize(v);
      else if (typeof v === 'number')  result[k] = Number(v) || 0;
      else if (typeof v === 'boolean') result[k] = Boolean(v);
      else if (typeof v === 'object' && v !== null) result[k] = sanitizeObj(v);
      else result[k] = '';
    }
    return result;
  }

  // ══════════════════════════════════════════════════════════════
  // 3. VALIDADORES DE CAMPO
  // Cada validador retorna { ok: bool, valor: valorLimpio, error: msg|null }
  // ══════════════════════════════════════════════════════════════

  /**
   * Valida y normaliza una cédula colombiana.
   * Acepta: solo dígitos, con puntos o espacios (se normalizan).
   */
  function validarCedula(val) {
    if (!val) return { ok: false, valor: '', error: 'La cédula es requerida.' };

    // Limpiar puntos, comas, espacios
    const limpia = String(val).replace(/[.,\s]/g, '').trim();

    if (!/^\d+$/.test(limpia)) {
      return { ok: false, valor: '', error: 'La cédula solo debe contener números.' };
    }
    if (limpia.length < 5 || limpia.length > 12) {
      return { ok: false, valor: '', error: 'La cédula debe tener entre 5 y 12 dígitos.' };
    }

    return { ok: true, valor: limpia, error: null };
  }

  /**
   * Valida un monto en pesos colombianos.
   * @param {any}    val
   * @param {number} min — monto mínimo permitido (default 500.000)
   * @param {number} max — monto máximo permitido (default 80.000.000)
   */
  function validarMonto(val, min = 500000, max = 80000000) {
    const n = Number(String(val).replace(/[$,.\s]/g, '')) || 0;

    if (!n || n <= 0) return { ok: false, valor: 0, error: 'El monto debe ser mayor a cero.' };
    if (n < min)      return { ok: false, valor: 0, error: `El monto mínimo es $${min.toLocaleString('es-CO')}.` };
    if (n > max)      return { ok: false, valor: 0, error: `El monto máximo es $${max.toLocaleString('es-CO')}.` };

    return { ok: true, valor: n, error: null };
  }

  /**
   * Valida un plazo en meses.
   * @param {any}    val
   * @param {number} min — plazo mínimo (default 3)
   * @param {number} max — plazo máximo (default 72)
   */
  function validarPlazo(val, min = 3, max = 72) {
    const n = parseInt(val, 10);

    if (isNaN(n) || n <= 0) return { ok: false, valor: 0, error: 'El plazo debe ser un número positivo.' };
    if (n < min)             return { ok: false, valor: 0, error: `El plazo mínimo es ${min} meses.` };
    if (n > max)             return { ok: false, valor: 0, error: `El plazo máximo es ${max} meses.` };

    return { ok: true, valor: n, error: null };
  }

  /**
   * Valida un correo electrónico.
   */
  function validarEmail(val) {
    if (!val) return { ok: false, valor: '', error: 'El correo es requerido.' };

    const limpio = String(val).trim().toLowerCase();
    // RFC5322 básico — suficiente para validación del lado del cliente
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

    if (!re.test(limpio)) {
      return { ok: false, valor: '', error: 'El formato del correo no es válido.' };
    }
    if (limpio.length > 254) {
      return { ok: false, valor: '', error: 'El correo es demasiado largo.' };
    }

    return { ok: true, valor: limpio, error: null };
  }

  /**
   * Valida un número de teléfono colombiano.
   * Acepta celular (10 dígitos) o fijo (7 dígitos con indicativo).
   */
  function validarTelefono(val) {
    if (!val) return { ok: true, valor: '', error: null }; // opcional

    const limpio = String(val).replace(/[\s\-().+]/g, '');
    if (!/^\d{7,13}$/.test(limpio)) {
      return { ok: false, valor: '', error: 'Número de teléfono no válido.' };
    }

    return { ok: true, valor: limpio, error: null };
  }

  /**
   * Valida texto libre (notas, observaciones).
   * Previene entradas vacías y demasiado largas.
   * @param {string} val
   * @param {number} minLen — mínimo de caracteres
   * @param {number} maxLen — máximo de caracteres
   */
  function validarTextoLibre(val, minLen = 10, maxLen = 1000) {
    const limpio = sanitize(String(val || '').trim());

    if (limpio.length < minLen) {
      return { ok: false, valor: '', error: `Mínimo ${minLen} caracteres requeridos.` };
    }
    if (limpio.length > maxLen) {
      return { ok: false, valor: limpio.slice(0, maxLen), error: `Máximo ${maxLen} caracteres permitidos.` };
    }

    return { ok: true, valor: limpio, error: null };
  }

  /**
   * Valida un token de firma (hex de 48 caracteres).
   */
  function validarToken(val) {
    if (!val) return { ok: false, valor: '', error: 'Token no proporcionado.' };

    const limpio = String(val).trim();
    if (!/^[0-9a-f]{48}$/i.test(limpio)) {
      return { ok: false, valor: '', error: 'Token de firma inválido.' };
    }

    return { ok: true, valor: limpio.toLowerCase(), error: null };
  }

  // ══════════════════════════════════════════════════════════════
  // 4. RATE LIMITING — consultas CIFIN/TransUnion
  // ══════════════════════════════════════════════════════════════

  function _getTrack() {
    try {
      const raw = sessionStorage.getItem(CIFIN_TRACK_KEY);
      if (!raw) return { porCedula: {}, global: [], ventanaInicio: Date.now() };
      return JSON.parse(raw);
    } catch { return { porCedula: {}, global: [], ventanaInicio: Date.now() }; }
  }

  function _saveTrack(track) {
    try { sessionStorage.setItem(CIFIN_TRACK_KEY, JSON.stringify(track)); } catch {}
  }

  /**
   * Verifica si se puede hacer una consulta CIFIN para la cédula dada.
   * @param {string} cedula
   * @returns {{ ok: boolean, error: string|null }}
   */
  function puedeConsultarCIFIN(cedula) {
    const v = validarCedula(cedula);
    if (!v.ok) return { ok: false, error: v.error };

    const track = _getTrack();
    const ahora = Date.now();

    // Limpiar entradas fuera de la ventana de tiempo
    const ventanaValida = ahora - track.ventanaInicio < CIFIN_VENTANA_MS;
    if (!ventanaValida) {
      // Reiniciar la ventana
      _saveTrack({ porCedula: {}, global: [], ventanaInicio: ahora });
      return { ok: true, error: null };
    }

    // Verificar límite global de la sesión
    if ((track.global || []).length >= CIFIN_MAX_GLOBAL) {
      return {
        ok: false,
        error: `Límite de consultas CIFIN alcanzado (${CIFIN_MAX_GLOBAL}/hora). Espera antes de continuar.`
      };
    }

    // Verificar límite por cédula
    const consultasCedula = (track.porCedula[v.valor] || []).length;
    if (consultasCedula >= CIFIN_MAX_POR_CEDULA) {
      return {
        ok: false,
        error: `Cédula ${v.valor} ya fue consultada ${CIFIN_MAX_POR_CEDULA} veces en esta sesión.`
      };
    }

    return { ok: true, error: null };
  }

  /**
   * Registra que se realizó una consulta CIFIN para la cédula dada.
   * Llamar DESPUÉS de que la consulta fue exitosa.
   * @param {string} cedula
   */
  function registrarConsultaCIFIN(cedula) {
    const v = validarCedula(cedula);
    if (!v.ok) return;

    const track = _getTrack();
    const ts    = Date.now();

    if (!track.porCedula[v.valor]) track.porCedula[v.valor] = [];
    track.porCedula[v.valor].push(ts);
    track.global.push({ cedula: v.valor, ts });

    _saveTrack(track);
    console.log(`[FondouneValidator] CIFIN: consulta #${track.global.length} registrada para cédula ${v.valor}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 5. LIMPIEZA DE DATOS SENSIBLES
  // ══════════════════════════════════════════════════════════════

  /**
   * Elimina de sessionStorage todos los campos sensibles.
   * Llamar al cerrar sesión o al salir del módulo 2/4.
   */
  function limpiarSesionSensible() {
    CAMPOS_SENSIBLES.forEach(k => {
      try { sessionStorage.removeItem(k); } catch {}
    });
    console.log('[FondouneValidator] 🧹 Datos sensibles limpiados de sessionStorage.');
  }

  /**
   * Limpia datos de CIFIN específicamente (no toda la sesión).
   * Útil al cambiar de solicitud en el módulo 2.
   */
  function limpiarDatosCIFIN() {
    try { sessionStorage.removeItem(CIFIN_TRACK_KEY); } catch {}
  }

  // ══════════════════════════════════════════════════════════════
  // 6. VALIDACIÓN DE SOLICITUD COMPLETA
  // Valida el objeto de solicitud antes de enviarlo a Firebase
  // ══════════════════════════════════════════════════════════════

  /**
   * Valida todos los campos de una solicitud de crédito.
   * @param {Object} datos — datos del formulario del módulo 1
   * @returns {{ ok: boolean, errores: string[], datos: Object }}
   */
  function validarSolicitud(datos) {
    const errores = [];
    const limpio  = {};

    // Cédula
    const ced = validarCedula(datos.cedula);
    if (!ced.ok) errores.push(ced.error); else limpio.cedula = ced.valor;

    // Nombre
    const nombre = sanitize(datos.nombre || '');
    if (nombre.length < 3) errores.push('El nombre debe tener al menos 3 caracteres.');
    else limpio.nombre = nombre;

    // Email
    const email = validarEmail(datos.email);
    if (!email.ok) errores.push(email.error); else limpio.email = email.valor;

    // Teléfono (opcional)
    const tel = validarTelefono(datos.telefono);
    if (!tel.ok) errores.push(tel.error); else limpio.telefono = tel.valor;

    // Empresa
    const empresa = sanitize(datos.empresa || '');
    if (empresa.length < 2) errores.push('La empresa es requerida.');
    else limpio.empresa = empresa;

    // Monto
    const monto = validarMonto(datos.monto);
    if (!monto.ok) errores.push(monto.error); else limpio.monto = monto.valor;

    // Plazo
    const plazo = validarPlazo(datos.plazo);
    if (!plazo.ok) errores.push(plazo.error); else limpio.plazo = plazo.valor;

    // Destino (opcional pero sanitizado)
    limpio.destino = sanitize(datos.destino || '');
    limpio.ciudad  = sanitize(datos.ciudad  || 'Medellín');

    return {
      ok:     errores.length === 0,
      errores,
      datos:  limpio,
    };
  }

  /**
   * Valida la nota del analista antes de confirmar una decisión.
   * @param {string} nota
   * @param {string} accion — 'aprobar' | 'rechazar' | 'info'
   * @returns {{ ok: boolean, valor: string, error: string|null }}
   */
  function validarNotaAnalista(nota, accion) {
    const minLen = accion === 'rechazar' ? 20 : 10;
    return validarTextoLibre(nota, minLen, 500);
  }

  // ══════════════════════════════════════════════════════════════
  // 7. CONTENT SECURITY POLICY — inyección de meta tag
  // ══════════════════════════════════════════════════════════════

  /**
   * Inyecta el meta tag CSP en el <head> si no existe.
   * Llamar al inicio de cada módulo.
   */
  function inyectarCSP() {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      // Solo scripts del mismo origen y CDNs permitidos
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",          // unsafe-inline necesario para scripts inline de los módulos
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://script.google.com https://firestore.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://api.resend.com https://www.googleapis.com",
      "worker-src blob:",
      "frame-src 'none'",
      "object-src 'none'",
    ].join('; ');

    document.head.insertBefore(meta, document.head.firstChild);
    console.log('[FondouneValidator] 🛡️ CSP inyectada correctamente.');
  }

  // ══════════════════════════════════════════════════════════════
  // INIT — se ejecuta automáticamente al cargar el script
  // ══════════════════════════════════════════════════════════════
  function _init() {
    verificarOrigen();
    inyectarCSP();

    // Limpiar datos sensibles al cerrar la pestaña/navegar fuera
    window.addEventListener('beforeunload', () => {
      // Solo limpiar track de CIFIN — la sesión del usuario
      // la maneja FondouneSession.logout()
      limpiarDatosCIFIN();
    });

    console.log('[FondouneValidator] 🛡️ Validador de seguridad activo.');
  }

  // Ejecutar al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    // Sanitización
    sanitize,
    sanitizeObj,

    // Validadores individuales
    validarCedula,
    validarMonto,
    validarPlazo,
    validarEmail,
    validarTelefono,
    validarTextoLibre,
    validarToken,

    // Validadores de objeto completo
    validarSolicitud,
    validarNotaAnalista,

    // Rate limiting CIFIN
    puedeConsultarCIFIN,
    registrarConsultaCIFIN,

    // Limpieza
    limpiarSesionSensible,
    limpiarDatosCIFIN,

    // CSP
    inyectarCSP,
  };

})();
