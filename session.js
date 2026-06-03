/**
 * FondoUne — session.js
 * Gestión de sesión de usuario, datos compartidos entre portales
 * y sistema de notificaciones.
 *
 * Uso: incluir en el <head> de cada módulo HTML
 * <script src="session.js"></script>
 */

const FondouneSession = (() => {

  // ── Claves de sessionStorage ────────────────────────────────────
  const KEYS = {
    USER:        'fu_user',
    CREDIT_APP:  'fu_credit_app',
    SOLICITUD_ID:'fu_solicitud_id',
    NOTIF_QUEUE: 'fu_notif_queue',
    KYC_DATA:    'fu_kyc_data',
    NOMINA_DATA: 'fu_nomina_data',
    DECISION:    'fu_decision',
  };

  // ── Estilos de notificaciones ───────────────────────────────────
  const NOTIF_STYLES = {
    success: { bg:'#EAF5EE', border:'rgba(26,122,74,.25)', color:'#1A7A4A', icon:'ti-circle-check' },
    info:    { bg:'#EFF4FB', border:'rgba(26,107,173,.2)',  color:'#1A5A9A', icon:'ti-info-circle'  },
    warning: { bg:'#FEF6E6', border:'rgba(160,96,0,.2)',    color:'#A06000', icon:'ti-alert-triangle'},
    error:   { bg:'#FDECEA', border:'rgba(192,57,43,.25)',  color:'#C0392B', icon:'ti-alert-circle' },
  };

  // ── Inyectar estilos base si no existen ─────────────────────────
  function injectStyles() {
    if (document.getElementById('fu-session-styles')) return;
    const style = document.createElement('style');
    style.id = 'fu-session-styles';
    style.textContent = `
      .fu-notif {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 340px;
        padding: 13px 16px;
        border-radius: 10px;
        border: 1px solid;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        box-shadow: 0 8px 32px rgba(11,37,69,.14);
        animation: fuSlideIn .3s cubic-bezier(.4,0,.2,1);
        line-height: 1.5;
        cursor: pointer;
      }
      .fu-notif-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
      .fu-notif-txt  { flex: 1; }
      .fu-notif-close{ font-size: 14px; opacity: .5; cursor: pointer; padding-left: 4px; margin-top: 1px; }
      .fu-notif-close:hover { opacity: 1; }
      .fu-notif.fu-hiding { animation: fuSlideOut .25s ease forwards; }
      @keyframes fuSlideIn  { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes fuSlideOut { from{transform:translateX(0);opacity:1} to{transform:translateX(20px);opacity:0} }
    `;
    document.head.appendChild(style);
  }

  // ── USUARIOS ─────────────────────────────────────────────────────
  function initUser(userData) {
    if (!userData || !userData.id) {
      console.warn('[FondouneSession] initUser: datos inválidos');
      return false;
    }
    sessionStorage.setItem(KEYS.USER, JSON.stringify({
      ...userData,
      sesionInicio: new Date().toISOString(),
    }));
    return true;
  }

  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.USER)) || {};
    } catch { return {}; }
  }

  function isLoggedIn() {
    const u = getUser();
    return !!(u && u.id);
  }

  // ── SOLICITUD DE CRÉDITO ─────────────────────────────────────────
  function saveCreditApp(data) {
    sessionStorage.setItem(KEYS.CREDIT_APP, JSON.stringify({
      ...data,
      _savedAt: new Date().toISOString(),
    }));
  }

  function getCreditApp() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.CREDIT_APP)) || null;
    } catch { return null; }
  }

  function setSolicitudId(id) {
    sessionStorage.setItem(KEYS.SOLICITUD_ID, id);
  }

  function getSolicitudId() {
    return sessionStorage.getItem(KEYS.SOLICITUD_ID) || null;
  }

  // ── DATOS KYC ────────────────────────────────────────────────────
  function saveKYC(data) {
    sessionStorage.setItem(KEYS.KYC_DATA, JSON.stringify(data));
  }

  function getKYC() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.KYC_DATA)) || null;
    } catch { return null; }
  }

  // ── DATOS NÓMINA ─────────────────────────────────────────────────
  function saveNomina(data) {
    sessionStorage.setItem(KEYS.NOMINA_DATA, JSON.stringify(data));
  }

  function getNomina() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.NOMINA_DATA)) || null;
    } catch { return null; }
  }

  // ── DECISIÓN / RESULTADO ─────────────────────────────────────────
  function saveDecision(data) {
    sessionStorage.setItem(KEYS.DECISION, JSON.stringify(data));
  }

  function getDecision() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.DECISION)) || null;
    } catch { return null; }
  }

  // ── NOTIFICACIONES ────────────────────────────────────────────────
  /**
   * Muestra una notificación flotante inmediata
   * @param {string} msg   - Mensaje a mostrar
   * @param {string} type  - 'success' | 'info' | 'warning' | 'error'
   * @param {number} duration - ms antes de desaparecer (0 = manual)
   */
  function showNotif(msg, type = 'info', duration = 4500) {
    injectStyles();
    const st = NOTIF_STYLES[type] || NOTIF_STYLES.info;

    const notif = document.createElement('div');
    notif.className = 'fu-notif';
    notif.style.cssText = `background:${st.bg};border-color:${st.border};color:${st.color}`;
    notif.innerHTML = `
      <i class="ti ${st.icon} fu-notif-icon"></i>
      <span class="fu-notif-txt">${msg}</span>
      <i class="ti ti-x fu-notif-close" onclick="this.closest('.fu-notif').remove()"></i>`;

    // Apilar verticalmente si hay otras notificaciones
    const existing = document.querySelectorAll('.fu-notif');
    let topOffset = 20;
    existing.forEach(n => { topOffset += n.offsetHeight + 8; });
    notif.style.top = topOffset + 'px';

    document.body.appendChild(notif);

    if (duration > 0) {
      setTimeout(() => {
        notif.classList.add('fu-hiding');
        setTimeout(() => notif.remove(), 280);
      }, duration);
    }
    return notif;
  }

  /**
   * Encola una notificación para mostrar en la PRÓXIMA página
   */
  function queueNotif(msg, type = 'info') {
    const queue = JSON.parse(sessionStorage.getItem(KEYS.NOTIF_QUEUE) || '[]');
    queue.push({ msg, type, ts: Date.now() });
    sessionStorage.setItem(KEYS.NOTIF_QUEUE, JSON.stringify(queue));
  }

  /**
   * Procesa y muestra notificaciones encoladas (llamar al cargar la página)
   */
  function flushNotifQueue() {
    try {
      const queue = JSON.parse(sessionStorage.getItem(KEYS.NOTIF_QUEUE) || '[]');
      if (!queue.length) return;
      sessionStorage.removeItem(KEYS.NOTIF_QUEUE);
      // Mostrar con pequeño delay para que la página cargue
      queue.forEach((n, i) => {
        setTimeout(() => showNotif(n.msg, n.type), 300 + i * 600);
      });
    } catch (e) {
      console.warn('[FondouneSession] flushNotifQueue error:', e);
    }
  }

  // ── LIMPIAR SESIÓN ────────────────────────────────────────────────
  function clear() {
    Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
  }

  /**
   * Cierra la sesión y redirige al login
   */
  function logout(loginUrl = 'index.html') {
    clear();
    showNotif('Sesión cerrada correctamente.', 'info', 2000);
    setTimeout(() => { window.location.href = loginUrl; }, 800);
  }

  // ── AUTO FLUSH al cargar la página ───────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', flushNotifQueue);
  } else {
    setTimeout(flushNotifQueue, 100);
  }

  // ── API PÚBLICA ───────────────────────────────────────────────────
  return {
    // Usuario
    initUser,
    getUser,
    isLoggedIn,
    // Solicitud
    saveCreditApp,
    getCreditApp,
    setSolicitudId,
    getSolicitudId,
    // KYC y nómina
    saveKYC, getKYC,
    saveNomina, getNomina,
    // Decisión
    saveDecision, getDecision,
    // Notificaciones
    showNotif,
    queueNotif,
    flushNotifQueue,
    // Sesión
    clear,
    logout,
    // Claves (para uso avanzado)
    KEYS,
  };

})();

// ── HISTORIAL DE NOTIFICACIONES (agregado Fase C) ─────────────────
// Extiende el objeto FondouneSession con métodos de log
;(function extendSession() {
  const LOG_KEY  = 'fu_notif_log';
  const MAX_LOGS = 40;

  const _orig = FondouneSession.showNotif.bind(FondouneSession);

  // Sobrescribir showNotif para que también guarde en el log
  FondouneSession.showNotif = function(msg, type = 'info', duration = 4500) {
    // Guardar en log
    try {
      const log  = JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]');
      log.push({ msg, type, ts: new Date().toISOString(), read: false });
      if (log.length > MAX_LOGS) log.splice(0, log.length - MAX_LOGS);
      sessionStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch(e) {}

    // Llamar al original solo si duration > 0
    if (duration > 0) return _orig(msg, type, duration);
  };

  FondouneSession.getNotifLog = function() {
    try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]'); }
    catch { return []; }
  };

  FondouneSession.getUnreadCount = function() {
    return FondouneSession.getNotifLog().filter(n => !n.read).length;
  };

  FondouneSession.markNotifsRead = function() {
    try {
      const log = FondouneSession.getNotifLog().map(n => ({ ...n, read: true }));
      sessionStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch(e) {}
  };

  FondouneSession.getActivitySummary = function() {
    const user = FondouneSession.getUser();
    const rol  = user?.role || 'asociado';
    const sol  = FondouneSession.getCreditApp();
    return {
      rol,
      tieneSolicitud: !!sol?.solicitudId,
      estadoSolicitud: sol?.estado || null,
      unreadNotifs: FondouneSession.getUnreadCount(),
    };
  };
})();
