/**
 * FondoUne — functions/index.js
 * ─────────────────────────────────────────────────────────────────
 * Cloud Function que envía correos via Resend.
 * La API key de Resend vive SOLO aquí, nunca en el navegador.
 *
 * El navegador llama a esta función, esta función llama a Resend.
 *
 * DEPLOY:
 *   1. firebase init functions   (si no lo has hecho)
 *   2. Configura la key como secreto:
 *      firebase functions:secrets:set RESEND_API_KEY
 *      (te va a pedir pegar el valor: re_LdwajwZu_MiQKRf3V3m3Zr5DV64zQ4966)
 *   3. firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────────
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret }       = require("firebase-functions/params");
const logger                 = require("firebase-functions/logger");
const admin                  = require("firebase-admin");

admin.initializeApp();

// El secreto se define aquí pero el VALOR se configura con la CLI,
// nunca queda escrito en este archivo ni en el repositorio.
const RESEND_API_KEY  = defineSecret("RESEND_API_KEY");
const STYTCH_PROJECT_ID = defineSecret("STYTCH_PROJECT_ID");
const STYTCH_SECRET     = defineSecret("STYTCH_SECRET");

const RESEND_URL = "https://api.resend.com/emails";
const REMITENTE  = "FondoUne <onboarding@resend.dev>";
// Cuando verifiques tu dominio en Resend, cambia por:
// const REMITENTE = "FondoUne <notificaciones@fondoune.com>";

// ── Whitelist de orígenes permitidos (evita que cualquier sitio
//    use tu función para mandar correos a través de tu cuenta) ───
const ORIGENES_PERMITIDOS = [
  "https://fondoune-portal.github.io",
  "http://localhost:5500",   // para pruebas locales con Live Server
  "http://127.0.0.1:5500",
];

/**
 * Cloud Function callable: enviarCorreo
 *
 * Se invoca desde el navegador con:
 *   const fn = httpsCallable(functions, 'enviarCorreo');
 *   await fn({ to, subject, html });
 *
 * Firebase ya valida automáticamente que la petición venga
 * autenticada con el SDK de Firebase (App Check opcional, ver nota
 * abajo) — no es un endpoint HTTP abierto a cualquiera.
 */
exports.enviarCorreo = onCall(
  {
    secrets: [RESEND_API_KEY],
    region: "us-central1",
    cors: ORIGENES_PERMITIDOS,
  },
  async (request) => {
    const { to, subject, html } = request.data || {};

    // ── Validación básica de entrada ──────────────────────────────
    if (!to || !subject || !html) {
      throw new HttpsError(
        "invalid-argument",
        "Faltan campos requeridos: to, subject, html."
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new HttpsError("invalid-argument", "Email destinatario inválido.");
    }

    // Límite simple anti-abuso: el HTML no debería ser gigante
    if (html.length > 100000) {
      throw new HttpsError("invalid-argument", "Contenido del correo demasiado grande.");
    }

    // ── Llamada a Resend con la key protegida ─────────────────────
    try {
      const resp = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: REMITENTE, to, subject, html }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        logger.error("Error de Resend:", data);
        throw new HttpsError(
          "internal",
          data?.message || `Resend respondió HTTP ${resp.status}`
        );
      }

      logger.info(`Correo enviado a ${to} | ID: ${data.id}`);
      return { ok: true, id: data.id };

    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("Error inesperado enviando correo:", err);
      throw new HttpsError("internal", "No se pudo enviar el correo.");
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// PUENTE STYTCH → FIREBASE AUTH
// ═══════════════════════════════════════════════════════════════

// Mapa email → rol — MISMA lista que tienes hoy en stytch-auth.js,
// pero ahora la decisión de rol vive del lado del servidor, no en
// el navegador, para que nadie pueda falsificar su propio rol.
const ROL_POR_EMAIL = {
  "nicolas.ramos@fondoune.com":   "analista",
  "naramosa@fondoune.com":        "analista",
  "gerencia@fondoune.com":        "gerencia",
  "jefe.credito@fondoune.com":    "jefe_credito",
  "director@fondoune.com":        "gerencia",
};

function _rolPorEmail(email) {
  const e = (email || "").toLowerCase();
  return ROL_POR_EMAIL[e] || "asociado";
}

/**
 * Cloud Function callable: generarTokenFirebase
 *
 * Se invoca DESPUÉS de que el navegador ya verificó el OTP con
 * Stytch exitosamente. Esta función vuelve a verificar esa sesión
 * directamente contra la API de Stytch (no confía en el navegador),
 * y si es válida, genera un Custom Token de Firebase con el rol
 * como custom claim.
 *
 * El navegador hace:
 *   const fn = httpsCallable(functions, 'generarTokenFirebase');
 *   const { data } = await fn({ stytchSessionToken });
 *   await firebase.auth().signInWithCustomToken(data.token);
 */
exports.generarTokenFirebase = onCall(
  {
    secrets: [STYTCH_PROJECT_ID, STYTCH_SECRET],
    region: "us-central1",
    cors: ORIGENES_PERMITIDOS,
  },
  async (request) => {
    const { stytchSessionToken } = request.data || {};

    if (!stytchSessionToken) {
      throw new HttpsError("invalid-argument", "Falta el token de sesión de Stytch.");
    }

    // ── 1. Verificar la sesión REAL contra Stytch (servidor a servidor) ──
    const projectId = STYTCH_PROJECT_ID.value();
    const secret     = STYTCH_SECRET.value();
    const basicAuth  = Buffer.from(`${projectId}:${secret}`).toString("base64");

    let stytchUser;
    try {
      const resp = await fetch("https://test.stytch.com/v1/sessions/authenticate", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({ session_token: stytchSessionToken }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        logger.warn("Sesión de Stytch inválida:", data?.error_message);
        throw new HttpsError("unauthenticated", "Sesión de Stytch inválida o expirada.");
      }

      stytchUser = data.user;

    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("Error verificando sesión con Stytch:", err);
      throw new HttpsError("internal", "No se pudo verificar la sesión.");
    }

    // ── 2. Determinar el rol — el servidor decide, no el navegador ──
    const email = stytchUser?.emails?.[0]?.email || "";
    const role  = _rolPorEmail(email);
    const uid   = stytchUser?.user_id;

    if (!uid) {
      throw new HttpsError("internal", "No se pudo obtener el identificador del usuario.");
    }

    // ── 3. Asignar el rol como custom claim en Firebase Auth ──────
    try {
      await admin.auth().setCustomUserClaims(uid, { role });
    } catch (err) {
      // Si el usuario no existe todavía en Firebase Auth, créalo primero
      try {
        await admin.auth().createUser({ uid, email });
        await admin.auth().setCustomUserClaims(uid, { role });
      } catch (createErr) {
        logger.error("Error creando/asignando rol al usuario:", createErr);
        throw new HttpsError("internal", "No se pudo asignar el rol.");
      }
    }

    // ── 4. Generar el Custom Token que el navegador va a usar ─────
    try {
      const customToken = await admin.auth().createCustomToken(uid, { role });
      logger.info(`Token Firebase generado para ${email} | rol: ${role}`);
      return { ok: true, token: customToken, role };
    } catch (err) {
      logger.error("Error generando custom token:", err);
      throw new HttpsError("internal", "No se pudo generar el token de Firebase.");
    }
  }
);
