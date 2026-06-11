/**
 * FondoUne — stytch-auth.js  v3.0
 * Usa StytchUIClient cargado vía ESM desde esm.sh.
 * No depende de UMD ni de CDN de SDK — funciona en GitHub Pages.
 */

const StytchAuth = (() => {

  const PUBLIC_TOKEN = 'public-token-test-8c7a5db8-cc10-487e-8137-05fda1c3c138';

  // Mapa email → rol
  const ROL_POR_EMAIL = {
    'nicolas.ramos@fondoune.com':  'analista',
    'naramosa@fondoune.com':       'analista',
    'gerencia@fondoune.com':       'gerencia',
    'jefe.credito@fondoune.com':   'jefe_credito',
    'director@fondoune.com':       'gerencia',
  };

  let _client       = null;
  let _methodId     = null;
  let _currentEmail = null;

  // Espera hasta que StytchUIClient esté disponible (el módulo ES carga async)
  async function _getClient() {
    if (_client) return _client;

    // Esperar hasta 5 segundos a que el módulo ESM exponga el constructor
    for (let i = 0; i < 50; i++) {
      if (typeof window.StytchUIClient !== 'undefined') break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (typeof window.StytchUIClient === 'undefined') {
      throw new Error('SDK de Stytch no disponible. Revisa tu conexión e intenta de nuevo.');
    }

    _client = new window.StytchUIClient(PUBLIC_TOKEN);
    return _client;
  }

  // ── OTP — ENVIAR ──────────────────────────────────────────────
  async function sendOTP(email) {
    const client = await _getClient();
    _currentEmail = email;
    const res = await client.otps.email.loginOrCreate({ email });
    _methodId = res.method_id;
    return res;
  }

  // ── OTP — VERIFICAR ───────────────────────────────────────────
  async function verifyOTP(code) {
    const client = await _getClient();
    if (!_methodId) throw new Error('Primero envía el código OTP.');
    const res = await client.otps.authenticate(code, _methodId, {
      session_duration_minutes: 480,
    });
    return _bridgeToSession(res.user);
  }

  // ── MAGIC LINK — ENVIAR ───────────────────────────────────────
  async function sendMagicLink(email, redirectUrl) {
    const client = await _getClient();
    _currentEmail = email;
    const url = redirectUrl || window.location.href.split('?')[0];
    await client.magicLinks.email.loginOrCreate({
      email,
      login_magic_link_url:  url,
      signup_magic_link_url: url,
    });
  }

  // ── MAGIC LINK — AUTENTICAR ───────────────────────────────────
  async function handleMagicLink(token) {
    const client = await _getClient();
    const res = await client.magicLinks.authenticate(token, {
      session_duration_minutes: 480,
    });
    const role = _bridgeToSession(res.user);
    window.history.replaceState({}, document.title, window.location.pathname);
    redirectByRole(role);
    return role;
  }

  // ── SESIÓN ────────────────────────────────────────────────────
  function hasSession() {
    if (typeof FondouneSession !== 'undefined' && FondouneSession.isLoggedIn()) return true;
    return false;
  }

  function getCurrentRole() {
    if (typeof FondouneSession !== 'undefined') {
      return FondouneSession.getUser()?.role || 'asociado';
    }
    return 'asociado';
  }

  async function logout(loginUrl) {
    try {
      const client = await _getClient();
      await client.session.revoke();
    } catch(e) {}
    _client = null;
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.logout(loginUrl || 'index.html');
    } else {
      window.location.href = loginUrl || 'index.html';
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────
  function _getRol(user) {
    const email = (user?.emails?.[0]?.email || _currentEmail || '').toLowerCase();
    if (user?.trusted_metadata?.role) return user.trusted_metadata.role;
    if (user?.unsafe_metadata?.role)  return user.unsafe_metadata.role;
    if (ROL_POR_EMAIL[email]) return ROL_POR_EMAIL[email];
    return 'asociado';
  }

  function _bridgeToSession(user) {
    const role     = _getRol(user);
    const email    = user?.emails?.[0]?.email || _currentEmail || '';
    const rawName  = [user?.name?.first_name, user?.name?.last_name].filter(Boolean).join(' ');
    const name     = rawName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const initials = name.split(' ').slice(0,2).map(n => n[0]?.toUpperCase()).filter(Boolean).join('');

    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.initUser({
        id: user?.user_id || email,
        name, email, role, initials,
        empresa: 'FondoUne',
        stytchId: user?.user_id,
      });
    }
    return role;
  }

  function redirectByRole(role) {
    const mapa = {
      asociado:     'modulo1-portal.html',
      analista:     'modulo2-analista.html',
      gerencia:     'modulo3-gerencia.html',
      jefe_credito: 'modulo3-gerencia.html',
    };
    window.location.href = mapa[role] || 'modulo1-portal.html';
  }

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
