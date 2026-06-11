/**
 * FondoUne — stytch-auth.js  v2
 * Llama directamente a la API web de Stytch via fetch.
 * NO requiere ningún script/SDK externo.
 *
 * SETUP (5 minutos):
 * 1. stytch.com → New Project → Consumer Authentication
 * 2. Dashboard → API Keys → copia tu Public Token
 * 3. Dashboard → Redirect URLs → agrega:
 *      https://fondoune-portal.github.io/Creditos/index.html
 *      https://fondoune-portal.github.io/Creditos/
 * 4. Reemplaza PUBLIC_TOKEN abajo con tu token real
 * 5. Agrega correos del equipo en ROL_POR_EMAIL
 */

const StytchAuth = (() => {

  // ── CONFIGURACIÓN ─────────────────────────────────────────────
  const PUBLIC_TOKEN = 'public-token-test-REEMPLAZA-CON-TU-TOKEN';

  // URL base de la API web de Stytch (usada internamente por su SDK)
  const API = 'https://web.stytch.com/sdk/v1';

  // Mapa email → rol. Agrega todos los correos del equipo FondoUne.
  const ROL_POR_EMAIL = {
    'naramosa@fondoune.com':       'analista',
    'nicolas.ramos@fondoune.com':  'analista',
    'jenny.quintero@fondoune.com': 'analista',
    'gerencia@fondoune.com':       'gerencia',
    'jefe.credito@fondoune.com':   'jefe_credito',
    'director@fondoune.com':       'gerencia',
  };

  // ── ESTADO ────────────────────────────────────────────────────
  let _methodId     = null;
  let _smsMethodId  = null;
  let _currentEmail = null;

  // ── HELPERS ───────────────────────────────────────────────────
  function isConfigured() {
    return !PUBLIC_TOKEN.includes('REEMPLAZA');
  }

  function _headers() {
    return {
      'Content-Type':    'application/json',
      'Authorization':   'Bearer ' + PUBLIC_TOKEN,
    };
  }

  async function _post(path, body) {
    const resp = await fetch(API + path, {
      method:  'POST',
      headers: _headers(),
      body:    JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(
        data.error_message ||
        data.message       ||
        'Error en la solicitud (' + resp.status + ')'
      );
    }
    return data;
  }

  // ── OTP — ENVIAR ──────────────────────────────────────────────
  async function sendOTP(email) {
    if (!isConfigured()) {
      throw new Error('Configura el PUBLIC_TOKEN en stytch-auth.js con tu token de Stytch Dashboard.');
    }
    _currentEmail = email;
    const data = await _post('/otps/email/login_or_create', { email });
    _methodId = data.method_id;
    return data;
  }

  // ── OTP — VERIFICAR (email o SMS) ────────────────────────────
  async function verifyOTP(code) {
    if (!_methodId && !_smsMethodId) throw new Error('Primero envía el código de verificación.');
    const trimmed = code.trim();
    let data = null;
    let lastError = null;

    // Intentar con email primero, luego SMS
    const methodIds = [_methodId, _smsMethodId].filter(Boolean);
    for (const mid of methodIds) {
      try {
        data = await _post('/otps/authenticate', {
          method_id:               mid,
          code:                    trimmed,
          session_duration_minutes: 480,
        });
        break; // Autenticado correctamente
      } catch(e) {
        lastError = e;
      }
    }
    if (!data) throw lastError || new Error('Código incorrecto o expirado.');

    // Guardar sesión
    if (data.session_token) {
      sessionStorage.setItem('_fu_stytch_session', data.session_token);
      sessionStorage.setItem('_fu_stytch_user',    JSON.stringify(data.user));
    }
    const role = _bridgeToSession(data.user, _currentEmail);
    return role;
  }

  // ── SMS — ENVIAR ─────────────────────────────────────────────────
  /**
   * Envía OTP por SMS al número dado.
   * @param {string} phone — número colombiano 10 dígitos (ej: 3001234567)
   *                         o E.164 (+573001234567)
   */
  async function sendSMSOTP(phone) {
    if (!isConfigured()) throw new Error('Configura el PUBLIC_TOKEN.');
    // Normalizar a E.164 para Colombia
    let e164 = phone.replace(/\s/g, '').replace(/[^+\d]/g, '');
    if (!e164.startsWith('+')) {
      e164 = '+57' + e164.replace(/^0+/, '');
    }
    const data = await _post('/otps/sms/login_or_create', { phone_number: e164 });
    _smsMethodId = data.method_id;
    return data;
  }

  // ── MAGIC LINK — ENVIAR ───────────────────────────────────────

  async function sendMagicLink(email, redirectUrl) {
    if (!isConfigured()) {
      throw new Error('Configura el PUBLIC_TOKEN en stytch-auth.js.');
    }
    _currentEmail = email;
    const url = redirectUrl || 'https://fondoune-portal.github.io/Creditos/index.html';
    await _post('/magic_links/email/login_or_create', {
      email,
      login_magic_link_url:  url,
      signup_magic_link_url: url,
    });
  }

  // ── MAGIC LINK — AUTENTICAR DESDE URL ─────────────────────────
  async function handleMagicLink(token) {
    const data = await _post('/magic_links/authenticate', {
      token,
      session_duration_minutes: 480,
    });
    if (data.session_token) {
      sessionStorage.setItem('_fu_stytch_session', data.session_token);
      sessionStorage.setItem('_fu_stytch_user',    JSON.stringify(data.user));
    }
    // Limpiar token de la URL
    window.history.replaceState({}, document.title, window.location.pathname);
    const role = _bridgeToSession(data.user, data.user?.emails?.[0]?.email);
    redirectByRole(role);
    return role;
  }

  // ── SESIÓN ────────────────────────────────────────────────────
  function hasSession() {
    if (sessionStorage.getItem('_fu_stytch_session')) return true;
    if (typeof FondouneSession !== 'undefined') return FondouneSession.isLoggedIn();
    return false;
  }

  function getCurrentRole() {
    if (typeof FondouneSession !== 'undefined') {
      return FondouneSession.getUser()?.role || 'asociado';
    }
    return 'asociado';
  }

  async function logout(loginUrl) {
    sessionStorage.removeItem('_fu_stytch_session');
    sessionStorage.removeItem('_fu_stytch_user');
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.logout(loginUrl || 'index.html');
    } else {
      window.location.href = loginUrl || 'index.html';
    }
  }

  // ── ROL Y SESIÓN ──────────────────────────────────────────────
  function _getRol(user, email) {
    const addr = (email || user?.emails?.[0]?.email || '').toLowerCase();

    if (user?.trusted_metadata?.role) return user.trusted_metadata.role;
    if (user?.unsafe_metadata?.role)  return user.unsafe_metadata.role;
    if (ROL_POR_EMAIL[addr])          return ROL_POR_EMAIL[addr];

    return 'asociado';
  }

  function _bridgeToSession(user, email) {
    const role     = _getRol(user, email);
    const addr     = email || user?.emails?.[0]?.email || '';
    const rawName  = [user?.name?.first_name, user?.name?.last_name].filter(Boolean).join(' ');
    const name     = rawName || addr.split('@')[0].replace(/[._]/g, ' ');
    const initials = name.split(' ').slice(0,2).map(n => n[0]?.toUpperCase()).filter(Boolean).join('');

    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.initUser({
        id:       user?.user_id || addr,
        name:     _capitalize(name),
        email:    addr,
        role,
        initials,
        empresa:  'FondoUne',
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

  function _capitalize(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── API PÚBLICA ───────────────────────────────────────────────
  return {
    isConfigured,
    sendOTP,
    sendSMSOTP,
    verifyOTP,
    sendMagicLink,
    handleMagicLink,
    hasSession,
    getCurrentRole,
    logout,
    redirectByRole,
  };

})();
