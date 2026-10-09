/**
 * FondoUne — functions/index.js
 * ─────────────────────────────────────────────────────────────────
 * Cloud Functions que actúan como puente seguro entre el portal
 * (GitHub Pages) y servicios externos con credenciales privadas.
 *
 * Funciones:
 *  - generarTokenFirebase: valida sesión Stytch → emite Custom Token
 *  - enviarEmail:          proxy hacia Resend (API key nunca en cliente)
 *
 * CAMBIOS v2.0:
 *  - ROL_POR_EMAIL alineado con stytch-auth.js (mismas keys en minúsculas)
 *  - naramosa@fondoune.com → 'admin'
 *  - creditosvivienda@fondoune.com → 'analista' (corregido mayúscula)
 *  - Stytch endpoint apunta a Consumer (/v1/sessions/authenticate)
 *  - Resend API key referenciada como secret (nunca en código)
 *
 * SECRETS REQUERIDOS (configurar en Cloud Shell antes de deploy):
 *   firebase functions:secrets:set STYTCH_PROJECT_ID
 *   firebase functions:secrets:set STYTCH_SECRET
 *   firebase functions:secrets:set RESEND_API_KEY
 * ─────────────────────────────────────────────────────────────────
 */

const { onCall, HttpsError }    = require('firebase-functions/v2/https');
const { onRequest }             = require('firebase-functions/v2/https');
const { defineSecret }          = require('firebase-functions/params');
const admin                     = require('firebase-admin');

admin.initializeApp();

// ── Secrets — nunca en código, viven en Secret Manager ───────────
const STYTCH_PROJECT_ID = defineSecret('STYTCH_PROJECT_ID');
const STYTCH_SECRET     = defineSecret('STYTCH_SECRET');
const RESEND_API_KEY    = defineSecret('RESEND_API_KEY');

// ── Mapa de roles — DEBE coincidir exactamente con stytch-auth.js ─
// Todas las keys en minúsculas (el lookup hace .toLowerCase())
const ROL_POR_EMAIL = {
  // Gerencia
  'mrodriguez@fondoune.com':      'gerencia',
  'gerencia@fondoune.com':        'gerencia',

  // Jefe de Crédito
  'jcredito@fondoune.com':        'jefe_credito',
  'jefecredito@fondoune.com':     'jefe_credito',

  // Analistas
  'analista@fondoune.com':        'analista',
  'analista1@fondoune.com':       'analista',
  'analista2@fondoune.com':       'analista',
  'creditosvivienda@fondoune.com':'analista',   // ← corregido (antes Creditosvivienda@...)
  'naramosa@fondoune.com':        'admin',       // ← admin (igual que en stytch-auth.js)
};

// ── Remitente de correos ──────────────────────────────────────────
const RESEND_FROM    = 'FondoUne <onboarding@resend.dev>';
const RESEND_API_URL = 'https://api.resend.com/emails';

// ══════════════════════════════════════════════════════════════════
// generarTokenFirebase
// Recibe el session_token de Stytch, lo valida contra la API
// Consumer de Stytch, y emite un Custom Token de Firebase con el
// claim { role } para que Firestore pueda leer el rol del usuario.
// ══════════════════════════════════════════════════════════════════
exports.generarTokenFirebase = onCall(
  {
    secrets: [STYTCH_PROJECT_ID, STYTCH_SECRET],
    cors:    ['https://fondoune-portal.github.io', 'http://localhost'],
  },
  async (request) => {

    const sessionToken = request.data?.sessionToken;
    if (!sessionToken) {
      throw new HttpsError('invalid-argument', 'Se requiere sessionToken.');
    }

    // ── Validar sesión contra la API Consumer de Stytch ──────────
    let stytchResp;
    try {
      const resp = await fetch('https://test.stytch.com/v1/sessions/authenticate', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Basic ' + Buffer.from(
            `${STYTCH_PROJECT_ID.value()}:${STYTCH_SECRET.value()}`
          ).toString('base64'),
        },
        body: JSON.stringify({ session_token: sessionToken }),
      });

      stytchResp = await resp.json();

      if (!resp.ok) {
        console.error('[generarTokenFirebase] Stytch error:', stytchResp);
        throw new HttpsError(
          'unauthenticated',
          `Stytch rechazó la sesión: ${stytchResp.error_message || resp.status}`
        );
      }

    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error('[generarTokenFirebase] Error de red a Stytch:', err);
      throw new HttpsError('internal', 'No se pudo validar la sesión con Stytch.');
    }

    // ── Extraer email y asignar rol ───────────────────────────────
    const email  = stytchResp.user?.emails?.[0]?.email?.toLowerCase()?.trim() || '';
    const userId = stytchResp.user?.user_id || '';

    if (!email || !userId) {
      throw new HttpsError('internal', 'Stytch no devolvió datos de usuario válidos.');
    }

    const rol = ROL_POR_EMAIL[email] || 'asociado';

    // ── Emitir Custom Token de Firebase con claim de rol ─────────
    let firebaseToken;
    try {
      firebaseToken = await admin.auth().createCustomToken(userId, { role: rol, email });
    } catch (err) {
      console.error('[generarTokenFirebase] Error al crear Custom Token:', err);
      throw new HttpsError('internal', 'No se pudo generar el token de Firebase.');
    }

    console.log(`[generarTokenFirebase] ✅ Token generado para ${email} | rol: ${rol}`);
    return { ok: true, token: firebaseToken, role: rol, email };
  }
);

// ══════════════════════════════════════════════════════════════════
// enviarEmail
// Proxy seguro hacia Resend. La API key nunca viaja al navegador.
// Alternativa a la solución Apps Script para entornos con Blaze.
// ══════════════════════════════════════════════════════════════════
exports.enviarEmail = onRequest(
  {
    secrets: [RESEND_API_KEY],
    cors:    ['https://fondoune-portal.github.io', 'http://localhost'],
  },
  async (req, res) => {

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Método no permitido.' });
      return;
    }

    const { to, subject, html } = req.body || {};

    if (!to || !subject || !html) {
      res.status(400).json({ ok: false, error: 'Faltan campos: to, subject o html.' });
      return;
    }

    // Validación básica del email destino
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      res.status(400).json({ ok: false, error: 'Email destino inválido.' });
      return;
    }

    try {
      const resp = await fetch(RESEND_API_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY.value()}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error('[enviarEmail] Error Resend:', data);
        res.status(resp.status).json({ ok: false, error: data.message || 'Error de Resend.' });
        return;
      }

      console.log(`[enviarEmail] ✅ Correo enviado a ${to} | ID: ${data.id}`);
      res.status(200).json({ ok: true, id: data.id });

    } catch (err) {
      console.error('[enviarEmail] Error:', err);
      res.status(500).json({ ok: false, error: 'Error interno del servidor.' });
    }
  }
);
// ─────────────────────────────────────────────────────────────
// IMPORTACIÓN DE BASE SOCIAL Y CARTERA (OPA → Firestore)
// Agregar este bloque a functions-index.js
// ─────────────────────────────────────────────────────────────
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin'); // ya debe estar inicializado arriba en functions-index.js

const BATCH_MAX = 450; // límite real de Firestore es 500 — dejamos margen

// ── Helpers compartidos (los usan importarBaseSocial e importarCartera) ──

// Por ahora se revisa el campo "rol" en usuarios/{uid}. Cuando se implemente
// el sistema de custom claims de Firebase Auth, este helper es el único
// lugar que habría que tocar.
async function verificarRolCoordinador(auth) {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para importar datos.');
  }
  const snap = await admin.firestore().collection('usuarios').doc(auth.uid).get();
  if (!snap.exists) {
    throw new HttpsError('permission-denied', 'Usuario no encontrado en el sistema.');
  }
  const rol = snap.data().rol;
  if (rol !== 'coordinador' && rol !== 'gerencia') {
    throw new HttpsError('permission-denied', 'No tienes permiso para importar datos.');
  }
  return auth.uid;
}

// Excel exporta cédulas largas en notación científica (ej. "1.017125993e+09")
// porque las interpreta como número. Esto la vuelve a texto plano, solo dígitos.
function limpiarCedula(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor).trim();
  if (/e\+?\d+$/i.test(texto)) {
    const n = Number(texto);
    if (!Number.isNaN(n)) texto = Math.round(n).toString();
  }
  return texto.replace(/\D/g, '');
}

// Confirma valor "vacío" de forma consistente (null, undefined, cadena vacía o solo espacios)
function esVacio(valor) {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

// ── Importar Base Social → colección "asociados/{cedula}" ──
exports.importarBaseSocial = onCall({ timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
  const uid = await verificarRolCoordinador(request.auth);

  const filas = request.data && request.data.filas;
  if (!Array.isArray(filas) || filas.length === 0) {
    throw new HttpsError('invalid-argument', 'No se recibieron filas para importar.');
  }

  const db = admin.firestore();
  const errores = [];
  let procesados = 0;
  let batch = db.batch();
  let opsEnBatch = 0;

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i] || {};
    const cedula = limpiarCedula(fila.CEDULASOCI);

    if (esVacio(cedula)) {
      errores.push({ fila: i + 2, motivo: 'CEDULASOCI vacía o inválida' }); // +2: la fila 1 del Excel es el encabezado
      continue;
    }

    const ref = db.collection('asociados').doc(cedula);
    batch.set(ref, {
      cedula,
      codNit:           fila.CODNIT ?? null,
      agencia:          fila.AGENCIA ?? null,
      nombreAgencia:    fila.NOMBREAGEN ?? null,
      nombre:           fila.NOMBRE ?? null,
      estado:           fila.ESTADO ?? null,
      direccion:        fila.DIRECCION ?? null,
      telefono1:        fila.TELEFONO1 ?? null,
      fechaNacimiento:  fila.FECHANACIM ?? null,
      fechaNacimiento2: fila.FECHANACI2 ?? null,
      salario:          fila.SALARIO ?? null,
      codEmpresa:       fila.CODEMPRESA ?? null,
      nombreEmpresa:    fila.NOMBREEMPR ?? null,
      aportes:          fila.APORTES ?? null,
      cuota:            fila.CUOTA ?? null,
      codEmpresa2:      fila.CODEMPRES2 ?? null,
      empresaTrabajo:   fila.EMPRESATRA ?? null,
      nit:              fila.NIT ?? null,
      primerApellido:   fila.PRIMERAPEL ?? null,
      segundoApellido:  fila.SEGUNDOAPE ?? null,
      nombres:          fila.NOMBRES ?? null,
      segundoNombre:    fila.SEGUNDONOM ?? null,
      ciudadEmpresa:    fila.CIUDADEMPR ?? null,
      fechaIngreso:     fila.FECHAINGRE ?? null,
      cedNumJc:         fila.CEDNUMJC ?? null,
      actualizadoEn:    admin.firestore.FieldValue.serverTimestamp(),
      actualizadoPor:   uid,
    }, { merge: true });

    opsEnBatch++;
    procesados++;

    if (opsEnBatch >= BATCH_MAX) {
      await batch.commit();
      batch = db.batch();
      opsEnBatch = 0;
    }
  }
  if (opsEnBatch > 0) await batch.commit();

  const resumen = {
    tipo: 'base_social',
    uid,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
    totalFilas: filas.length,
    procesados,
    errores: errores.length,
    detalleErrores: errores.slice(0, 50), // limitar tamaño del documento de auditoría
  };
  await db.collection('importaciones_base_social').add(resumen);

  return { ok: true, procesados, errores: errores.length, detalleErrores: errores.slice(0, 50) };
});

module.exports.__test__ = { verificarRolCoordinador, limpiarCedula, esVacio };
// ─────────────────────────────────────────────────────────────
// Agregar este bloque también al final de functions-index.js,
// junto al de importarBaseSocial (reutiliza sus mismos helpers:
// verificarRolCoordinador, limpiarCedula, esVacio).
// ─────────────────────────────────────────────────────────────

// PAGARE es el id del documento dentro de la subcolección — no se le quitan
// letras/guiones como a la cédula, solo se limpia espacio y caracteres que
// Firestore no acepta en un id de documento.
function limpiarPagare(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim().replace(/[/]/g, '-');
}

exports.importarCartera = onCall({ timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
  const uid = await verificarRolCoordinador(request.auth);

  const filas = request.data && request.data.filas;
  if (!Array.isArray(filas) || filas.length === 0) {
    throw new HttpsError('invalid-argument', 'No se recibieron filas para importar.');
  }

  const db = admin.firestore();
  const errores = [];
  let procesados = 0;
  let batch = db.batch();
  let opsEnBatch = 0;

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i] || {};
    const cedula = limpiarCedula(fila.CEDULASOCI);
    const pagare = limpiarPagare(fila.PAGARE);

    if (esVacio(cedula) || esVacio(pagare)) {
      errores.push({
        fila: i + 2, // +2: la fila 1 del Excel es el encabezado
        motivo: esVacio(cedula) && esVacio(pagare) ? 'CEDULASOCI y PAGARE vacíos'
              : esVacio(cedula) ? 'CEDULASOCI vacía o inválida' : 'PAGARE vacío',
      });
      continue;
    }

    const ref = db.collection('asociados').doc(cedula).collection('creditos').doc(pagare);
    batch.set(ref, {
      pagare,
      cedula,
      codLinea:      fila.CODLINEA ?? null,
      nombreLinea:   fila.NOMBRELINE ?? null,
      fechaDesembolso: fila.FECHADESEM ?? null,
      saldoCapital:  fila.SALDOCAPIT ?? null,
      plazo:         fila.PLAZO ?? null,
      tasaColocacion: fila.TASACOLOCA ?? null,
      diasMora:      fila.DIASMORA ?? null,
      cuotasMora:    fila.CUOTASMORA ?? null,
      saldoPonerAlDia: fila.SALDOPONER ?? null,
      formaPago:     fila.FORMAPAGO ?? null,
      clasifica:     fila.CLASIFICA ?? null,
      ultimoEstado:  fila.ULTIMOESTA ?? null,
      tipoCartera:   fila.TIPOCARTER ?? null,
      nombreTipo:    fila.NOMBRETIPO ?? null,
      actualizadoEn:  admin.firestore.FieldValue.serverTimestamp(),
      actualizadoPor: uid,
    }, { merge: true });

    opsEnBatch++;
    procesados++;

    if (opsEnBatch >= BATCH_MAX) {
      await batch.commit();
      batch = db.batch();
      opsEnBatch = 0;
    }
  }
  if (opsEnBatch > 0) await batch.commit();

  const resumen = {
    tipo: 'cartera',
    uid,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
    totalFilas: filas.length,
    procesados,
    errores: errores.length,
    detalleErrores: errores.slice(0, 50),
  };
  await db.collection('importaciones_base_social').add(resumen);

  return { ok: true, procesados, errores: errores.length, detalleErrores: errores.slice(0, 50) };
});

module.exports.__test_cartera__ = { limpiarPagare };
// ─────────────────────────────────────────────────────────────
// Agregar este bloque al final de functions-index.js, junto a
// los de importarBaseSocial / importarCartera.
//
// ANTES DE DESPLEGAR — configura los 4 secretos desde tu terminal
// (nunca se escriben en el código ni se comparten por chat):
//
//   firebase functions:secrets:set TWILIO_ACCOUNT_SID
//   firebase functions:secrets:set TWILIO_AUTH_TOKEN
//   firebase functions:secrets:set TWILIO_SMS_FROM
//   firebase functions:secrets:set TWILIO_WHATSAPP_FROM
//
// Cada comando te va a pedir el valor por consola (no queda en el
// código ni en el historial de git). TWILIO_SMS_FROM es tu número
// de Twilio normal (ej. +15551234567). TWILIO_WHATSAPP_FROM es el
// número habilitado para WhatsApp en Twilio (sin el prefijo
// "whatsapp:", eso lo agrega el código solo).
// ─────────────────────────────────────────────────────────────
const { defineSecret } = require('firebase-functions/params');

const TWILIO_SID     = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_TOKEN   = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_SMS_FROM = defineSecret('TWILIO_SMS_FROM');
const TWILIO_WA_FROM  = defineSecret('TWILIO_WHATSAPP_FROM');

// Un mensaje por tipo de evento — mismo texto para SMS y WhatsApp.
const MENSAJES_NOTIFICACION = {
  tomado:      (nombre, extra) => `Hola ${nombre}, tu solicitud de crédito FondoUne ya está siendo revisada por el analista ${extra || 'asignado'}.`,
  aprobado:    (nombre) => `¡Buenas noticias, ${nombre}! Tu solicitud de crédito FondoUne fue APROBADA. Revisa tu correo para los siguientes pasos.`,
  rechazado:   (nombre) => `Hola ${nombre}, tu solicitud de crédito FondoUne no fue aprobada en esta ocasión. Revisa tu correo para más detalles.`,
  revision:    (nombre) => `Hola ${nombre}, tu solicitud de crédito FondoUne requiere información adicional. Revisa tu correo o ingresa al portal.`,
  listo_firma: (nombre) => `Hola ${nombre}, tu crédito FondoUne ya está listo para firmar. Revisa tu correo para el link de firma del pagaré.`,
};

// Normaliza a formato E.164 (+57...) un teléfono colombiano guardado de
// cualquier forma (con o sin indicativo, con espacios/guiones, etc.)
function formatearTelefonoCO(telefono) {
  const soloDigitos = String(telefono || '').replace(/\D/g, '');
  if (!soloDigitos) return null;
  if (soloDigitos.length === 10) return '+57' + soloDigitos;          // celular sin indicativo
  if (soloDigitos.length === 12 && soloDigitos.startsWith('57')) return '+' + soloDigitos;
  if (soloDigitos.length >= 10) return '+' + soloDigitos;             // ya trae algún indicativo
  return null; // muy corto para ser un celular válido
}

async function enviarPorTwilio({ sid, token, from, to, mensaje }) {
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: mensaje }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.message || `Twilio respondió ${resp.status}`);
  return data.sid;
}

exports.enviarNotificacion = onCall(
  { secrets: [TWILIO_SID, TWILIO_TOKEN, TWILIO_SMS_FROM, TWILIO_WA_FROM], timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const { cedula, nombre, tipo, extra } = request.data || {};
    if (!cedula || !tipo || !MENSAJES_NOTIFICACION[tipo]) {
      throw new HttpsError('invalid-argument', 'Faltan datos o el tipo de notificación no es válido.');
    }

    const db = admin.firestore();
    const asociadoSnap = await db.collection('asociados').doc(limpiarCedula(cedula)).get();
    const telefonoCrudo = asociadoSnap.exists ? asociadoSnap.data().telefono1 : null;
    const telefono = formatearTelefonoCO(telefonoCrudo);

    if (!telefono) {
      return { ok: false, error: 'El asociado ' + cedula + ' no tiene un teléfono válido en asociados/.telefono1 — no se envió nada.' };
    }

    const mensaje = MENSAJES_NOTIFICACION[tipo](nombre || 'asociado', extra);
    const sid = TWILIO_SID.value(), token = TWILIO_TOKEN.value();
    const resultados = {};

    try {
      resultados.sms = { ok: true, sid: await enviarPorTwilio({ sid, token, from: TWILIO_SMS_FROM.value(), to: telefono, mensaje }) };
    } catch (err) {
      resultados.sms = { ok: false, error: err.message };
    }

    try {
      resultados.whatsapp = { ok: true, sid: await enviarPorTwilio({ sid, token, from: 'whatsapp:' + TWILIO_WA_FROM.value(), to: 'whatsapp:' + telefono, mensaje }) };
    } catch (err) {
      resultados.whatsapp = { ok: false, error: err.message };
    }

    return { ok: true, resultados };
  }
);

module.exports.__test_notif__ = { formatearTelefonoCO, MENSAJES_NOTIFICACION };