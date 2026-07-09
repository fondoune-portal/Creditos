/**
 * FondoUne — stytch-auth.js  v3.1
 * ─────────────────────────────────────────────────────────────────
 * Usa StytchUIClient vía ESM desde esm.sh.
 * Proyecto: Consumer Authentication (no B2B).
 *
 * CAMBIOS v3.1:
 *  - PUBLIC_TOKEN actualizado a proyecto Consumer Authentication
 *  - Eliminado isConfigured() duplicado
 *  - Corregido bug de mayúsculas en ROL_POR_EMAIL
 *    ('Creditosvivienda@...' → 'creditosvivienda@...')
 *  - naramosa@fondoune.com mapeado a 'admin' (igual que en el backend)
 *  - handleMagicLink expone stytchSessionToken para el puente Firebase
 *
 * Token: public-token-test-271a860b-aa52-4105-87ac-d5af1ccab375
 * Proyecto: project-test-0b71a937-a546-452e-9fe4-991890a26a51
 * Tipo: Consumer Authentication ✅
 * ─────────────────────────────────────────────────────────────────
 */

const StytchAuth = (() => {

  // ── Token del proyecto Consumer Authentication (FondoUne Creditos) ──
  // project-test-0b71a937-a546-452e-9fe4-991890a26a51
  const PUBLIC_TOKEN = 'public-token-test-271a860b-aa52-4105-87ac-d5af1ccab375';

  // ── Mapa de roles por email ───────────────────────────────────
  // IMPORTANTE: todas las keys en MINÚSCULAS — el lookup hace
  // .toLowerCase() antes de buscar, así que mayúsculas nunca hacen match.
  // Este mapa debe coincidir EXACTAMENTE con ROL_POR_EMAIL en functions/index.js
  const ROL_POR_EMAIL = {
    // ── Gerencia ──
    'mrodriguez@fondoune.com':     'gerencia',
    'gerencia@fondoune.com':       'gerencia',

    // ── Jefe de Crédito ──
    'jcredito@fondoune.com':       'jefe_credito',
    'jefecredito@fondoune.com':    'jefe_credito',

    // ── Analistas ──
    'analista@fondoune.com':       'analista',
    'analista1@fondoune.com':      'analista',
    'analista2@fondoune.com':      'analista',
    'creditosvivienda@fondoune.com':'analista',   // ← corregido (antes Creditosvivienda@...)
    'naramosa@fondoune.com':       'admin',        // ← admin (igual que en el backend)

    // ── Asociados (default — no es necesario listarlos) ──
    // Cualquier email no listado aquí cae en 'asociado' por defecto
  };

  // ── Rutas por rol ─────────────────────────────────────────────
  const RUTA_POR_ROL = {
    admin:        'modulo2-analista.html',
    gerencia:     'modulo3-gerencia.html',
    jefe_credito: 'modulo2-analista.html',
    analista:     'modulo2-analista.html',
    asociado:     'modulo1-portal.html',
  };

  // ── Estado interno ────────────────────────────────────────────
  let _client              = null;
  let _initPromise         = null;
  let _stytchSessionToken  = null;   // se guarda para el puente Firebase

  // ── Inicializar cliente Stytch (una sola vez, lazy) ───────────
  function _getClient() {
    if (_client) return Promise.resolve(_client);
    if (_initPromise) return _initPromise;

    _initPromise = import('https://esm.sh/@stytch/vanilla-js')
      .then(mod => {
        const Cls = mod.StytchUIClient || mod.default?.StytchUIClient;
        if (!Cls) throw new Error('StytchUIClient no encontrado en el módulo ESM');
        _client = new Cls(PUBLIC_TOKEN);
        console.log('[StytchAuth] ✅ Cliente inicializado (Consumer)');
        return _client;
      })
      .catch(err => {
        _initPromise = null;
        console.error('[StytchAuth] ❌ Error al inicializar:', err);
        throw err;
      });

    return _initPromise;
  }

  // ── Obtener rol del email ─────────────────────────────────────
  function getRol(email) {
    if (!email) return 'asociado';
    return ROL_POR_EMAIL[email.toLowerCase().trim()] || 'asociado';
  }

  // ── Redirigir según rol ───────────────────────────────────────
  function redirigirPorRol(email) {
    const rol  = getRol(email);
    const ruta = RUTA_POR_ROL[rol] || 'modulo1-portal.html';
    console.log(`[StytchAuth] Redirigiendo ${email} → ${ruta} (rol: ${rol})`);

    // Guardar rol en sessionStorage para que los módulos lo lean
    sessionStorage.setItem('fu_rol',   rol);
    sessionStorage.setItem('fu_email', email.toLowerCase().trim());

    // Además de fu_rol/fu_email: inicializar fu_user (FondouneSession),
    // que es lo que realmente revisa el guard de navigation.js
    // (FondouneSession.getUser().role). Sin esto, fu_rol/fu_email quedan
    // "logueados" para index.html pero navigation.js sigue viendo la
    // sesión vacía y rebota de vuelta — bucle de redirección.
    // Los módulos que hacen su propia verificación (ej. cédula en
    // modulo1) sobreescriben esto después con los datos reales.
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.initUser({
        id: email.toLowerCase().trim(),
        role: rol,
        name: email,
        initials: (email || '?').charAt(0).toUpperCase(),
      });
    }

    window.location.href = ruta;
  }

  // ══════════════════════════════════════════════════════════════
  // FLUJO OTP — enviar código al email
  // ══════════════════════════════════════════════════════════════
  async function sendOTP(email) {
    // Validar email antes de llamar a Stytch
    if (typeof FondouneValidator !== 'undefined') {
      const v = FondouneValidator.validarEmail(email);
      if (!v.ok) return { ok: false, error: v.error };
    }

    try {
      const client = await _getClient();
      const resp   = await client.otps.email.loginOrCreate(email.toLowerCase().trim());
      console.log('[StytchAuth] OTP enviado a:', email);
      return { ok: true, methodId: resp.method_id || resp.methodId };
    } catch (err) {
      console.error('[StytchAuth] ❌ sendOTP:', err);
      return { ok: false, error: _msgError(err) };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FLUJO OTP — verificar código
  // ══════════════════════════════════════════════════════════════
  async function verifyOTP(methodId, code) {
    if (!methodId || !code) {
      return { ok: false, error: 'Faltan datos para verificar el código.' };
    }

    try {
      const client = await _getClient();
      const resp   = await client.otps.authenticate(code.trim(), methodId, {
        session_duration_minutes: 60,
      });

      _stytchSessionToken = resp.session_token;

      const email = resp.user?.emails?.[0]?.email || '';
      const rol   = getRol(email);

      console.log('[StytchAuth] ✅ OTP verificado | email:', email, '| rol:', rol);
      return {
        ok:                 true,
        email,
        rol,
        stytchSessionToken: _stytchSessionToken,
        userId:             resp.user?.user_id || '',
      };

    } catch (err) {
      console.error('[StytchAuth] ❌ verifyOTP:', err);
      return { ok: false, error: _msgError(err) };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FLUJO MAGIC LINK — enviar
  // ══════════════════════════════════════════════════════════════
  async function sendMagicLink(email) {
    if (typeof FondouneValidator !== 'undefined') {
      const v = FondouneValidator.validarEmail(email);
      if (!v.ok) return { ok: false, error: v.error };
    }

    try {
      const client = await _getClient();
      await client.magicLinks.email.loginOrCreate(email.toLowerCase().trim(), {
        login_redirect_url:   'https://fondoune-portal.github.io/Creditos/index.html',
        signup_redirect_url:  'https://fondoune-portal.github.io/Creditos/index.html',
      });
      return { ok: true };
    } catch (err) {
      console.error('[StytchAuth] ❌ sendMagicLink:', err);
      return { ok: false, error: _msgError(err) };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FLUJO MAGIC LINK — manejar el token de la URL al regresar
  // ══════════════════════════════════════════════════════════════
  async function handleMagicLink() {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('stytch_token_type') === 'magic_links'
      ? params.get('token')
      : null;

    if (!token) return { ok: false, error: 'No hay token de magic link en la URL.' };

    try {
      const client = await _getClient();
      const resp   = await client.magicLinks.authenticate(token, {
        session_duration_minutes: 60,
      });

      _stytchSessionToken = resp.session_token;

      const email = resp.user?.emails?.[0]?.email || '';
      const rol   = getRol(email);

      // Limpiar el token de la URL sin recargar la página
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('stytch_token_type');
      window.history.replaceState({}, '', url.toString());

      return {
        ok:                 true,
        email,
        rol,
        stytchSessionToken: _stytchSessionToken,
        userId:             resp.user?.user_id || '',
      };

    } catch (err) {
      console.error('[StytchAuth] ❌ handleMagicLink:', err);
      return { ok: false, error: _msgError(err) };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CERRAR SESIÓN
  // ══════════════════════════════════════════════════════════════
  async function logout() {
    try {
      const client = await _getClient();
      await client.session.revoke();
    } catch (e) {
      console.warn('[StytchAuth] logout Stytch (no crítico):', e.message);
    } finally {
      _stytchSessionToken = null;
      // Limpiar sesión Firebase
      if (typeof firebase !== 'undefined') {
        try { await firebase.auth().signOut(); } catch {}
      }
      // Limpiar sessionStorage sensible
      if (typeof FondouneValidator !== 'undefined') {
        FondouneValidator.limpiarSesionSensible();
      } else {
        sessionStorage.clear();
      }
      window.location.href = 'index.html';
    }
  }

  // ── Helper: mensajes de error amigables ───────────────────────
  function _msgError(err) {
    const msg = err?.message || String(err);
    if (msg.includes('passcode_not_found') || msg.includes('invalid_code')) {
      return 'El código ingresado no es válido o ya expiró.';
    }
    if (msg.includes('too_many_requests') || msg.includes('rate_limit')) {
      return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    }
    if (msg.includes('invalid_email')) {
      return 'El correo electrónico no es válido.';
    }
    if (msg.includes('only enabled for consumer')) {
      return 'Error de configuración del proyecto. Contacta al administrador.';
    }
    if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
      return 'Sin conexión. Verifica tu internet e intenta de nuevo.';
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  // ── Verificar si el cliente está configurado con un token real ─
  function isConfigured() {
    return PUBLIC_TOKEN.startsWith('public-token-test-');
  }

  // ── API pública ───────────────────────────────────────────────
  return {
    sendOTP,
    verifyOTP,
    sendMagicLink,
    handleMagicLink,
    logout,
    getRol,
    redirigirPorRol,
    isConfigured,
    getSessionToken: () => _stytchSessionToken,
  };

})();
