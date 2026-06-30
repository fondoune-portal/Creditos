/**
 * firebase-config.js  — FondoUne Portal Crédito
 * ─────────────────────────────────────────────────────────────────
 * Inicializa Firebase (Firestore) y expone TODAS las funciones
 * necesarias para el flujo:
 *
 *   Módulo 1 (asociado):   crearSolicitud()
 *   Módulo 2 (analista):   escucharSolicitudes(), actualizarEstado(),
 *                          aprobarSolicitud(), rechazarSolicitud()
 *   Módulo 4 (firma):      buscarPorToken(), marcarFirmado()
 *
 * Carga Firebase vía CDN (compat v9) — sin npm, funciona directo
 * en cualquier HTML con un solo <script src="firebase-config.js">
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── 1. CONFIGURACIÓN DEL PROYECTO ──────────────────────────────
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyD-kpFWfU0A2CAszogW4ODgCz1pQfYpBms",
    authDomain:        "fondoune-credito.firebaseapp.com",
    projectId:         "fondoune-credito",
    storageBucket:     "fondoune-credito.firebasestorage.app",
    messagingSenderId: "94345899414",
    appId:             "1:94345899414:web:dcba4bd86fd4132b8901b7",
    measurementId:     "G-C7ZKXX7P4P"
  };

  // Nombre de la colección principal en Firestore
  const COL = 'solicitudes';

  // ── 2. ESTADOS DEL FLUJO ───────────────────────────────────────
  const ESTADOS = {
    PENDIENTE: 'pendiente_analista',
    APROBADO:  'aprobado',
    RECHAZADO: 'rechazado',
    FIRMADO:   'firmado'
  };

  // Exponer estados globalmente para usar en otros módulos
  window.FONDOUNE_ESTADOS = ESTADOS;

  // ── 3. INICIALIZACIÓN (espera a que los SDKs estén listos) ─────
  let _db   = null;   // instancia de Firestore
  let _auth = null;   // instancia de Firebase Auth
  let _ready = false; // flag de inicialización completa

  function inicializar() {
    if (_ready) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      // Si los SDKs ya están cargados, iniciar de inmediato
      if (typeof firebase !== 'undefined') {
        _boot(resolve, reject);
      } else {
        // Esperar a que cargue el CDN
        const t = setInterval(() => {
          if (typeof firebase !== 'undefined') {
            clearInterval(t);
            _boot(resolve, reject);
          }
        }, 50);
        // Timeout de seguridad
        setTimeout(() => {
          clearInterval(t);
          reject(new Error('[FondoUne] Firebase CDN no cargó en 10 segundos'));
        }, 10000);
      }
    });
  }

  function _boot(resolve, reject) {
    try {
      // Inicializar solo si no hay una app existente
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      _db    = firebase.firestore();

      // Auth — necesario para el puente Stytch → Firebase Auth.
      // Si el SDK de firebase-auth-compat no está cargado en el HTML,
      // esto simplemente no estará disponible (no rompe Firestore).
      if (typeof firebase.auth === 'function') {
        _auth = firebase.auth();
      } else {
        console.warn('[FondoUne Firebase] ⚠️ firebase-auth-compat.js no está cargado — el puente Stytch→Firebase no funcionará hasta agregarlo.');
      }

      _ready = true;
      console.log('[FondoUne Firebase] ✅ Firestore conectado — proyecto:', FIREBASE_CONFIG.projectId);
      resolve(_db);
    } catch (e) {
      console.error('[FondoUne Firebase] ❌ Error al inicializar:', e);
      reject(e);
    }
  }

  // ── 4. HELPER: generar token único de firma ────────────────────
  function _generarToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── 5. HELPER: timestamp legible para registros ───────────────
  function _ahora() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 1 — CREAR SOLICITUD
  // ═══════════════════════════════════════════════════════════════
  /**
   * Crea una solicitud nueva en Firestore con estado "pendiente_analista".
   *
   * @param {Object} datosSolicitud — todos los datos del formulario
   *   Campos mínimos requeridos:
   *   { cedula, nombre, email, empresa, monto, plazo, cuota,
   *     nomina, scorePropio, riesgo, capacidadPago }
   *
   * @returns {Promise<{ok: boolean, id: string, error?: string}>}
   */
  async function crearSolicitud(datosSolicitud) {
    try {
      const db = await inicializar();

      // Verificar que no exista ya una solicitud PENDIENTE para esta cédula
      const existe = await db.collection(COL)
        .where('cedula', '==', String(datosSolicitud.cedula))
        .where('estado', '==', ESTADOS.PENDIENTE)
        .limit(1)
        .get();

      if (!existe.empty) {
        return {
          ok: false,
          error: 'Ya tienes una solicitud pendiente de revisión. Espera a que el analista la estudie.'
        };
      }

      const doc = {
        // ── Identificación del asociado
        cedula:               String(datosSolicitud.cedula     || ''),
        nombre:               String(datosSolicitud.nombre      || ''),
        email:                String(datosSolicitud.email       || ''),
        telefono:             String(datosSolicitud.telefono    || ''),
        empresa:              String(datosSolicitud.empresa     || ''),
        ciudadDeudor:         String(datosSolicitud.ciudad      || 'Medellín'),

        // ── Datos del crédito solicitado
        monto:                Number(datosSolicitud.monto       || 0),
        plazo:                Number(datosSolicitud.plazo       || 0),
        cuota:                Number(datosSolicitud.cuota       || 0),
        periodicidad:         String(datosSolicitud.periodicidad || 'mensuales'),
        destinoCredito:       String(datosSolicitud.destino     || ''),

        // ── Resultado del motor de análisis (Paso 3 del Módulo 1)
        scorePropio:          Number(datosSolicitud.scorePropio          || 0),
        scoreDataCredito:     Number(datosSolicitud.scoreDataCredito     || 0),
        riesgo:               String(datosSolicitud.riesgo               || 'sin_datos'),
        capacidadPago:        Number(datosSolicitud.capacidadPago        || 0),
        porcentajeCompromiso: Number(datosSolicitud.porcentajeCompromiso || 0),

        // ── Datos de nómina
        nomina: {
          salarioBasico:   Number(datosSolicitud.nomina?.salarioBasico   || 0),
          devengado:       Number(datosSolicitud.nomina?.devengado       || 0),
          deducciones:     Number(datosSolicitud.nomina?.deducciones     || 0),
          netoPagado:      Number(datosSolicitud.nomina?.netoPagado      || 0),
          libranzasActivas:Number(datosSolicitud.nomina?.libranzasActivas|| 0),
          aportesFondo:    Number(datosSolicitud.nomina?.aportesFondo    || 0),
        },

        // ── Estado del flujo
        estado:             ESTADOS.PENDIENTE,

        // ── Trazabilidad
        fechaSolicitud:     _ahora(),
        fechaDecision:      null,
        analistaId:         null,
        analistaNombre:     null,
        motivoRechazo:      null,

        // ── Token para el link de firma (se genera al aprobar, no aquí)
        tokenFirma:         null,
        tokenUsado:         false,

        // ── Número del pagaré (se asigna al aprobar)
        numeroPagare:       null,
      };

      const ref = await db.collection(COL).add(doc);

      console.log('[FondoUne] ✅ Solicitud creada:', ref.id);
      return { ok: true, id: ref.id };

    } catch (e) {
      console.error('[FondoUne] ❌ crearSolicitud:', e);
      return { ok: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 2 — ESCUCHAR SOLICITUDES EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════════
  /**
   * Abre un listener en tiempo real sobre la colección solicitudes.
   * Llama a onUpdate cada vez que hay cambios (nueva solicitud,
   * cambio de estado, etc.) — no requiere refrescar la página.
   *
   * @param {Function} onUpdate  — fn(solicitudes: Array) — array de docs
   * @param {Object}   filtros   — { estado: string | null, empresa: string | null }
   * @returns {Function} unsubscribe — llámala para detener el listener
   */
  async function escucharSolicitudes(onUpdate, filtros = {}) {
    const db = await inicializar();

    let query = db.collection(COL).orderBy('fechaSolicitud', 'desc');

    // Filtro por estado si se especifica
    if (filtros.estado) {
      query = query.where('estado', '==', filtros.estado);
    }

    const unsubscribe = query.onSnapshot(
      snapshot => {
        const solicitudes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convertir timestamps a Date para facilitar formato
          fechaSolicitud: doc.data().fechaSolicitud?.toDate?.() || null,
          fechaDecision:  doc.data().fechaDecision?.toDate?.()  || null,
        }));

        // Filtro adicional por empresa (se hace en cliente para no crear índice compuesto)
        const filtradas = filtros.empresa
          ? solicitudes.filter(s => s.empresa === filtros.empresa)
          : solicitudes;

        onUpdate(filtradas);
      },
      error => {
        console.error('[FondoUne] ❌ escucharSolicitudes:', error);
      }
    );

    return unsubscribe;
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 2 — OBTENER UNA SOLICITUD POR ID
  // ═══════════════════════════════════════════════════════════════
  async function obtenerSolicitud(id) {
    try {
      const db  = await inicializar();
      const doc = await db.collection(COL).doc(id).get();
      if (!doc.exists) return null;
      return {
        id: doc.id,
        ...doc.data(),
        fechaSolicitud: doc.data().fechaSolicitud?.toDate?.() || null,
        fechaDecision:  doc.data().fechaDecision?.toDate?.()  || null,
      };
    } catch (e) {
      console.error('[FondoUne] ❌ obtenerSolicitud:', e);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 2 — APROBAR SOLICITUD
  // ═══════════════════════════════════════════════════════════════
  /**
   * Aprueba una solicitud:
   *   1. Genera un token único de firma
   *   2. Genera el número de pagaré
   *   3. Actualiza el documento en Firestore
   *   4. Devuelve el token para que el caller construya el link
   *      y dispare el email (ver email-service.js)
   *
   * @param {string} solicitudId — ID del documento en Firestore
   * @param {string} analistaId  — ID o email del analista que aprueba
   * @param {string} analistaNombre
   * @returns {Promise<{ok: boolean, token: string, numeroPagare: string, error?: string}>}
   */
  async function aprobarSolicitud(solicitudId, analistaId, analistaNombre) {
    try {
      const db     = await inicializar();
      const token  = _generarToken();
      const numPag = 'PAG-' + Date.now().toString(36).toUpperCase();

      await db.collection(COL).doc(solicitudId).update({
        estado:         ESTADOS.APROBADO,
        tokenFirma:     token,
        tokenUsado:     false,
        numeroPagare:   numPag,
        fechaDecision:  _ahora(),
        analistaId:     analistaId   || 'sistema',
        analistaNombre: analistaNombre || '',
        motivoRechazo:  null,
      });

      console.log('[FondoUne] ✅ Solicitud aprobada:', solicitudId, '| Pagaré:', numPag);
      return { ok: true, token, numeroPagare: numPag };

    } catch (e) {
      console.error('[FondoUne] ❌ aprobarSolicitud:', e);
      return { ok: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 2 — RECHAZAR SOLICITUD
  // ═══════════════════════════════════════════════════════════════
  /**
   * @param {string} solicitudId
   * @param {string} analistaId
   * @param {string} analistaNombre
   * @param {string} motivo — texto del motivo de rechazo (obligatorio)
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function rechazarSolicitud(solicitudId, analistaId, analistaNombre, motivo) {
    try {
      if (!motivo || motivo.trim().length < 10) {
        return { ok: false, error: 'Debes ingresar un motivo de rechazo (mínimo 10 caracteres).' };
      }

      const db = await inicializar();

      await db.collection(COL).doc(solicitudId).update({
        estado:         ESTADOS.RECHAZADO,
        fechaDecision:  _ahora(),
        analistaId:     analistaId    || 'sistema',
        analistaNombre: analistaNombre || '',
        motivoRechazo:  motivo.trim(),
        tokenFirma:     null,
        tokenUsado:     false,
      });

      console.log('[FondoUne] ✅ Solicitud rechazada:', solicitudId);
      return { ok: true };

    } catch (e) {
      console.error('[FondoUne] ❌ rechazarSolicitud:', e);
      return { ok: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 4 — BUSCAR SOLICITUD POR TOKEN DE FIRMA
  // ═══════════════════════════════════════════════════════════════
  /**
   * El módulo 4 llama esta función al cargar si encuentra ?token=...
   * en la URL. Valida que el token sea válido, no usado y aprobado.
   *
   * @param {string} token
   * @returns {Promise<{ok: boolean, solicitud?: Object, error?: string}>}
   */
  async function buscarPorToken(token) {
    try {
      if (!token || token.length < 10) {
        return { ok: false, error: 'Token inválido.' };
      }

      const db     = await inicializar();
      const snap   = await db.collection(COL)
        .where('tokenFirma', '==', token)
        .limit(1)
        .get();

      if (snap.empty) {
        return { ok: false, error: 'Este link de firma no existe o ya fue utilizado.' };
      }

      const doc  = snap.docs[0];
      const data = doc.data();

      if (data.tokenUsado === true) {
        return { ok: false, error: 'Este link de firma ya fue utilizado. El pagaré ha sido firmado anteriormente.' };
      }

      if (data.estado !== ESTADOS.APROBADO) {
        return { ok: false, error: 'Esta solicitud no está en estado aprobado.' };
      }

      return {
        ok: true,
        solicitud: {
          id: doc.id,
          ...data,
          fechaSolicitud: data.fechaSolicitud?.toDate?.() || null,
          fechaDecision:  data.fechaDecision?.toDate?.()  || null,
        }
      };

    } catch (e) {
      console.error('[FondoUne] ❌ buscarPorToken:', e);
      return { ok: false, error: 'Error al validar el link: ' + e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MÓDULO 4 — MARCAR COMO FIRMADO
  // ═══════════════════════════════════════════════════════════════
  /**
   * Llamar DESPUÉS de que el asociado firma exitosamente.
   * Invalida el token (no se puede firmar dos veces).
   *
   * @param {string} solicitudId
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function marcarFirmado(solicitudId) {
    try {
      const db = await inicializar();

      await db.collection(COL).doc(solicitudId).update({
        estado:       ESTADOS.FIRMADO,
        tokenUsado:   true,
        fechaFirmado: _ahora(),
      });

      console.log('[FondoUne] ✅ Solicitud marcada como firmada:', solicitudId);
      return { ok: true };

    } catch (e) {
      console.error('[FondoUne] ❌ marcarFirmado:', e);
      return { ok: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REGLAS DE FIRESTORE — copiar en Firebase Console
  // (solo como referencia — no se ejecuta aquí)
  // ═══════════════════════════════════════════════════════════════
  /*
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {

      // Nadie puede leer/escribir directamente desde el cliente
      // excepto las reglas explícitas abajo

      match /solicitudes/{solicitudId} {

        // Crear solicitud: solo si estado = "pendiente_analista" y
        // los campos mínimos están presentes
        allow create: if
          request.resource.data.estado == 'pendiente_analista' &&
          request.resource.data.cedula  is string &&
          request.resource.data.nombre  is string &&
          request.resource.data.email   is string;

        // Leer: si conoces el ID del documento (analista que abre la
        // solicitud directamente por ID) o la búsqueda por token
        allow read: if true;  // ← ajustar a auth cuando se implemente login analista

        // Actualizar estado: solo campos permitidos
        allow update: if
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['estado','tokenFirma','tokenUsado','numeroPagare',
                      'fechaDecision','analistaId','analistaNombre',
                      'motivoRechazo','fechaFirmado']);
      }
    }
  }
  */

  // ── EXPOSICIÓN GLOBAL ─────────────────────────────────────────
  window.FondoUneFirebase = {
    // Módulo 1
    crearSolicitud,
    // Módulo 2
    escucharSolicitudes,
    obtenerSolicitud,
    aprobarSolicitud,
    rechazarSolicitud,
    // Módulo 4
    buscarPorToken,
    marcarFirmado,
    // Utilidades
    ESTADOS: window.FONDOUNE_ESTADOS,
    inicializar,
  };

  console.log('[FondoUne Firebase] 📦 firebase-config.js cargado — esperando inicialización.');


  // Exponer inicializar globalmente para uso externo
  window.inicializar = inicializar;

})();
