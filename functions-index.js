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
