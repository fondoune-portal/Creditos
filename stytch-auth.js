/**
 * FondoUne — stytch-auth.js
 * Puente entre Stytch SDK y FondouneSession.
 *
 * SETUP (una sola vez):
 * 1. Crea cuenta en https://stytch.com (gratis, 5.000 MAU)
 * 2. Dashboard → New Project → "Consumer Authentication"
 * 3. API Keys → copia tu Public Token (empieza con "public-token-test-…")
 * 4. Redirect URLs → agrega tu URL de GitHub Pages + /index.html
 * 5. Reemplaza PUBLIC_TOKEN abajo con tu token real
 *
 * Incluir en index.html ANTES de session.js:
 *   <script src="https://cdn.jsdelivr.net/npm/@stytch/vanilla-js@latest/dist/index.umd.js"></script>
 *   <script src="stytch-auth.js"></script>
 *   <script src="session.js"></script>
 */

const StytchAuth = (() => {

  // ── CONFIGURACIÓN ──────────────────────────────────────────────
  const PUBLIC_TOKEN = 'public-token-test-8c7a5db8-cc10-487e-8137-05fda1c3c138';

  // URL base del portal — no cambiar salvo que migren de dominio
  const BASE_URL    = 'https://fondoune-portal.github.io/Creditos/';
  const LOGIN_URL   = BASE_URL + 'index.html';

  // Mapa de email → rol
  // Agrega aquí los correos del equipo FondoUne con su rol
  const ROL_POR_EMAIL = {
    'nicolas.ramos@fondoune.com':  'analista',
    'jenny.quintero@fondoune.com': 'analista',
    'juan.esteban@fondoune.com':   'analista',
    'gerencia@fondoune.com':       'gerencia',
    'jefe.credito@fondoune.com':   'jefe_credito',
    'director@fondoune.com':       'gerencia',
  };

  // Si el correo no está en la lista → asociado
  const ROL_DOMINIO = {
    // 'fondoune.com': 'analista',  // todos los de fondoune.com son analistas
  };

  // ── ESTADO ─────────────────────────────────────────────────────
  let _stytch     = null;
  let _methodId   = null;   // para OTP
  let _currentEmail = null;

  // ── VERIFICAR CONFIGURACIÓN ───────────────────────────────────
  function isConfigured() {
    return !PUBLIC_TOKEN.includes('REEMPLAZA');
  }

  // ── INIT ───────────────────────────────────────────────────────
  function init() {
    if (_stytch) return _stytch;
    if (typeof Stytch === 'undefined') {
      console.error('[StytchAuth] SDK no cargado. Agrega este script al <head> de index.html:\n<script src="https://cdn.jsdelivr.net/npm/@stytch/vanilla-js@latest/dist/index.umd.js"></script>');
      return null;
    }
    if (!isConfigured()) {
      console.error('[StytchAuth] Public Token no configurado.\n1. Ve a stytch.com → Dashboard → API Keys\n2. Copia tu public-token-test-...\n3. Pégalo en la línea 17 de stytch-auth.js');
      return null;
    }
    try {
      _stytch = Stytch(PUBLIC_TOKEN);
      return _stytch;
    } catch(e) {
      console.error('[StytchAuth] Error al inicializar con el token:', e.message);
      return null;
    }
  }

  // ── OTP — ENVIAR ───────────────────────────────────────────────
  async function sendOTP(email) {
    const client = init();
    if (!client) {
      if (typeof Stytch === 'undefined') throw new Error('SDK de Stytch no cargado. Verifica el script en el <head>.');
      if (!isConfigured()) throw new Error('Configura el PUBLIC_TOKEN en stytch-auth.js con tu token de Stytch Dashboard.');
      throw new Error('Stytch no pudo inicializarse. Revisa la consola del navegador.');
    }
    _currentEmail = email;
    const res = await client.otps.email.loginOrCreate({ email });
    _methodId = res.method_id;
    return res;
  }

  // ── OTP — VERIFICAR ────────────────────────────────────────────
  async function verifyOTP(code) {
    const client = init();
    if (!client || !_methodId) throw new Error('Primero envía el código.');
    const res = await client.otps.authenticate(code, _methodId, {
      session_duration_minutes: 480,
    });
    const role = _bridgeToSession(res.user);
    return role;
  }

  // ── MAGIC LINK — ENVIAR ────────────────────────────────────────
  async function sendMagicLink(email, redirectUrl) {
    const client = init();
    if (!client) {
      if (typeof Stytch === 'undefined') throw new Error('SDK de Stytch no cargado. Verifica el script en el <head>.');
      if (!isConfigured()) throw new Error('Configura el PUBLIC_TOKEN en stytch-auth.js con tu token de Stytch Dashboard.');
      throw new Error('Stytch no pudo inicializarse. Revisa la consola del navegador.');
    }
    _currentEmail = email;
    const url = redirectUrl || LOGIN_URL;
    await client.magicLinks.email.loginOrCreate({
      email,
      login_magic_link_url:  url,
      signup_magic_link_url: url,
    });
  }

  // ── MAGIC LINK — AUTENTICAR (desde URL token) ──────────────────
  async function handleMagicLink(token) {
    const client = init();
    if (!client) {
      if (typeof Stytch === 'undefined') throw new Error('SDK de Stytch no cargado. Verifica el script en el <head>.');
      if (!isConfigured()) throw new Error('Configura el PUBLIC_TOKEN en stytch-auth.js con tu token de Stytch Dashboard.');
      throw new Error('Stytch no pudo inicializarse. Revisa la consola del navegador.');
    }
    const res = await client.magicLinks.authenticate(token, {
      session_duration_minutes: 480,
    });
    const role = _bridgeToSession(res.user);
    // Limpiar token de la URL
    window.history.replaceState({}, document.title, window.location.pathname);
    redirectByRole(role);
    return role;
  }

  // ── SESIÓN ACTIVA ──────────────────────────────────────────────
  function hasSession() {
    const client = init();
    if (!client) return false;
    const session = client.session.getSync();
    // También verificar FondouneSession como fallback
    if (session) return true;
    if (typeof FondouneSession !== 'undefined') return FondouneSession.isLoggedIn();
    return false;
  }

  function getCurrentRole() {
    if (typeof FondouneSession !== 'undefined') {
      const u = FondouneSession.getUser();
      return u?.role || 'asociado';
    }
    return 'asociado';
  }

  // ── CERRAR SESIÓN ──────────────────────────────────────────────
  async function logout(loginUrl) {
    try {
      const client = init();
      if (client) await client.session.revoke();
    } catch(e) { console.warn('[StytchAuth] logout:', e); }
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.logout(loginUrl || 'index.html');
    } else {
      window.location.href = loginUrl || 'index.html';
    }
  }

  // ── DETERMINAR ROL ─────────────────────────────────────────────
  function _getRol(user) {
    const email = (user.emails?.[0]?.email || '').toLowerCase();

    // 1. Rol en trusted_metadata (más seguro — requiere backend)
    if (user.trusted_metadata?.role) return user.trusted_metadata.role;

    // 2. Rol en unsafe_metadata (se puede establecer client-side)
    if (user.unsafe_metadata?.role) return user.unsafe_metadata.role;

    // 3. Mapa explícito de email → rol
    if (ROL_POR_EMAIL[email]) return ROL_POR_EMAIL[email];

    // 4. Por dominio
    const domain = email.split('@')[1] || '';
    if (ROL_DOMINIO[domain]) return ROL_DOMINIO[domain];

    // 5. Default: asociado
    return 'asociado';
  }

  // ── PUENTE A FONDOUNESESSION ───────────────────────────────────
  function _bridgeToSession(user) {
    const role    = _getRol(user);
    const email   = user.emails?.[0]?.email || _currentEmail || '';
    const rawName = [user.name?.first_name, user.name?.last_name].filter(Boolean).join(' ');
    const name    = rawName || email.split('@')[0].replace('.', ' ');
    const initials= name.split(' ').slice(0,2).map(n => n[0]?.toUpperCase()).filter(Boolean).join('');

    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.initUser({
        id:        user.user_id || email,
        name:      _capitalize(name),
        email,
        role,
        initials,
        empresa:   'FondoUne',
        stytchId:  user.user_id,
      });
    }
    return role;
  }

  // ── REDIRIGIR SEGÚN ROL ────────────────────────────────────────
  function redirectByRole(role) {
    const mapa = {
      asociado:     'modulo1-portal.html',
      analista:     'modulo2-analista.html',
      gerencia:     'modulo3-gerencia.html',
      jefe_credito: 'modulo3-gerencia.html',
    };
    window.location.href = mapa[role] || 'modulo1-portal.html';
  }

  // ── HELPERS ────────────────────────────────────────────────────
  function _capitalize(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── API PÚBLICA ────────────────────────────────────────────────
  return {
    init,
    sendOTP,
    verifyOTP,
    sendMagicLink,
    handleMagicLink,
    hasSession,
    getCurrentRole,
    logout,
    redirectByRole,
    isConfigured,
    getRol: _getRol,
  };

})();
