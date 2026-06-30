
/**
 * FondoUne — stytch-auth.js  v3.0
 * Usa StytchUIClient cargado vía ESM desde esm.sh.
 * No depende de UMD ni de CDN de SDK — funciona en GitHub Pages.
 */

const StytchAuth = (() => {

  const PUBLIC_TOKEN = 'public-token-test-271a860b-aa52-4105-87ac-d5af1ccab375';

  // Mapa email → rol
  const ROL_POR_EMAIL = {
    'Creditosvivienda@fondoune.com':  'analista',
    'naramosa@fondoune.com':       'admin',
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
    const cleanEmail = String(email || '').trim().toLowerCase();
    _currentEmail = cleanEmail;
  
    const res = await client.otps.email.loginOrCreate(cleanEmail, {
      expiration_minutes: 5,
    });
  
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

  const stytchSessionToken = res.session_token;
  if (!stytchSessionToken) {
    throw new Error('Stytch autenticó al usuario pero no devolvió session_token.');
  }

  const role = _bridgeToSession(res.user);

  return {
    role,
    user: res.user,
    stytchSessionToken,
  };
}

return {
  isConfigured,
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
