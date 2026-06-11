/**
 * FondoUne — stytch-auth.js  v2.0
 * Autenticación Stytch via REST API directa (sin SDK).
 * Compatible con GitHub Pages — no requiere bundler ni npm.
 *
 * SETUP:
 * 1. dashboard.stytch.com → API Keys → copia el Public Token
 * 2. Email Magic Links → Redirect URLs → agrega tu URL de GitHub Pages
 * 3. Reemplaza PUBLIC_TOKEN abajo
 */

const StytchAuth = (() => {

  // ── CONFIGURACIÓN ──────────────────────────────────────────────
  const PUBLIC_TOKEN = 'public-token-test-8c7a5db8-cc10-487e-8137-05fda1c3c138';
  const API_BASE     = 'https://api.stytch.com/sdk/v1';

  // Mapa email → rol. Si el correo no está aquí → asociado
  const ROL_POR_EMAIL = {
    'nicolas.ramos@fondoune.com':  'analista',
    'naramosa@fondoune.com':       'analista',
    'gerencia@fondoune.com':       'gerencia',
    'jefe.credito@fondoune.com':   'jefe_credito',
    'director@fondoune.com':       'gerencia',
  };

  // ── ESTADO INTERNO ─────────────────────────────────────────────
  let _methodId     = null;
  let _currentEmail = null;
  let _sessionToken = null;

  // ── HEADERS ESTÁNDAR ───────────────────────────────────────────
  function _headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': 'Basic ' + btoa(PUBLIC_TOKEN + ':'),
    };
  }

  // ── FETCH HELPER ───────────────────────────────────────────────
  async function _post(path, body) {
    const res = await fetch(API_BASE + path, {
      method:  'POST',
      headers: _headers(),
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error_message || json.message || 'Error ' + res.status);
    }
    return json;
  }

  async function _get(path) {
    const res = await fetch(API_BASE + path, {
      method:  'GET',
      headers: _headers(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error_message || 'Error ' + res.status);
    return json;
  }

  // ── OTP — ENVIAR ───────────────────────────────────────────────
  async function sendOTP(email) {
    _currentEmail = email;
    const data = await _post('/otps/email/login_or_create', { email });
    _methodId = data.email_id;
    return data;
  }

  // ── OTP — VERIFICAR ────────────────────────────────────────────
  async function verifyOTP(code) {
    if (!_methodId) throw new Error('Primero envía el código OTP.');
    const data = await _post('/otps/authenticate', {
      method_id:               _methodId,
      code,
      session_duration_minutes: 480,
    });
    _sessionToken = data.session_token;
    const role = _bridgeToSession(data.user, data.session_token);
    return role;
  }

  // ── MAGIC LINK — ENVIAR ────────────────────────────────────────
  async function sendMagicLink(email, redirectUrl) {
    _currentEmail = email;
    const url = redirectUrl || (window.location.href.split('?')[0]);
    await _post('/magic_links/email/login_or_create', {
      email,
      login_magic_link_url:  url,
      signup_magic_link_url: url,
    });
  }

  // ── MAGIC LINK — AUTENTICAR (desde token en URL) ───────────────
  async function handleMagicLink(token) {
    const data = await _post('/magic_links/authenticate', {
      token,
      session_duration_minutes: 480,
    });
    _sessionToken = data.session_token;
    const role = _bridgeToSession(data.user, data.session_token);
    window.history.replaceState({}, document.title, window.location.pathname);
    redirectByRole(role);
    return role;
  }

  // ── SESIÓN ACTIVA ──────────────────────────────────────────────
  function hasSession() {
    if (_sessionToken) return true;
    if (typeof FondouneSession !== 'undefined') return FondouneSession.isLoggedIn();
    return false;
  }

  function getCurrentRole() {
    if (typeof FondouneSession !== 'undefined') {
      return FondouneSession.getUser()?.role || 'asociado';
    }
    return 'asociado';
  }

  // ── CERRAR SESIÓN ──────────────────────────────────────────────
  async function logout(loginUrl) {
    if (_sessionToken) {
      try {
        await _post('/sessions/revoke', { session_token: _sessionToken });
      } catch(e) {}
    }
    _sessionToken = null;
    _methodId     = null;
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.logout(loginUrl || 'index.html');
    } else {
      window.location.href = loginUrl || 'index.html';
    }
  }

  // ── DETERMINAR ROL ─────────────────────────────────────────────
  function _getRol(user) {
    const email = (user?.emails?.[0]?.email || _currentEmail || '').toLowerCase();
    if (user?.trusted_metadata?.role) return user.trusted_metadata.role;
    if (user?.unsafe_metadata?.role)  return user.unsafe_metadata.role;
    if (ROL_POR_EMAIL[email]) return ROL_POR_EMAIL[email];
    return 'asociado';
  }

  // ── PUENTE A FONDOUNESESSION ───────────────────────────────────
  function _bridgeToSession(user, sessionToken) {
    const role    = _getRol(user);
    const email   = user?.emails?.[0]?.email || _currentEmail || '';
    const rawName = [user?.name?.first_name, user?.name?.last_name].filter(Boolean).join(' ');
    const name    = rawName || _capitalize(email.split('@')[0].replace(/[._]/g, ' '));
    const initials = name.split(' ').slice(0,2).map(n => n[0]?.toUpperCase()).filter(Boolean).join('');

    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.initUser({
        id:           user?.user_id || email,
        name,
        email,
        role,
        initials,
        empresa:      'FondoUne',
        stytchId:     user?.user_id,
        sessionToken,
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
    sendOTP,
    verifyOTP,
    sendMagicLink,
    handleMagicLink,
    hasSession,
    getCurrentRole,
    logout,
    redirectByRole,
  };

})();
