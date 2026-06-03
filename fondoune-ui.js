/**
 * FondoUne — fondoune-ui.js
 * Toast unificado, panel de notificaciones, helpers de formato.
 * Requiere: session.js, fondoune-shared.css
 */

const FondouneUI = (() => {

  // ── Toast unificado (debajo de la nav) ──────────────────────────
  function toast(msg, type = 'info', duration = 4500) {
    // Registrar en el historial de session.js
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.showNotif(msg, type, 0); // duration=0 → no muestra la notif flotante antigua
    }

    const iconMap = {
      success: 'ti-circle-check',
      info:    'ti-info-circle',
      warning: 'ti-alert-triangle',
      error:   'ti-alert-circle',
    };

    const t = document.createElement('div');
    t.className = `fu-toast fu-toast-${type}`;
    t.innerHTML = `
      <i class="ti ${iconMap[type]||'ti-info-circle'} fu-toast-icon"></i>
      <span class="fu-toast-txt">${msg}</span>
      <i class="ti ti-x fu-toast-close" onclick="this.closest('.fu-toast').remove()"></i>`;

    // Apilar toasts existentes
    const existing = document.querySelectorAll('.fu-toast');
    let topOffset  = 10;
    existing.forEach(el => { topOffset += el.offsetHeight + 8; });
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fu-nav-h')) || 50;
    t.style.top = (navH + topOffset) + 'px';

    document.body.appendChild(t);

    if (duration > 0) {
      setTimeout(() => {
        t.classList.add('fu-out');
        setTimeout(() => t.remove(), 220);
      }, duration);
    }
    return t;
  }

  // ── Panel de notificaciones (campana) ───────────────────────────
  let panelOpen = false;

  function buildNotifPanel() {
    if (document.getElementById('fu-notif-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'fu-notif-panel';
    panel.innerHTML = `
      <div class="fu-np-head">
        <i class="ti ti-bell" style="font-size:16px;color:#5A6E8C"></i>
        <span class="fu-np-title">Notificaciones</span>
        <span class="fu-np-badge" id="fu-np-badge" style="display:none">0</span>
        <i class="ti ti-x fu-np-close" onclick="FondouneUI.closeNotifPanel()"></i>
      </div>
      <div class="fu-np-body" id="fu-np-body">
        <div class="fu-np-empty"><i class="ti ti-bell-off"></i>Sin notificaciones</div>
      </div>
      <div class="fu-np-foot">
        <button class="fu-np-mark-btn" onclick="FondouneUI.markAllRead()">
          <i class="ti ti-checks" style="font-size:13px"></i> Marcar todas como leídas
        </button>
      </div>`;
    document.body.appendChild(panel);
  }

  function openNotifPanel() {
    buildNotifPanel();
    refreshNotifPanel();
    document.getElementById('fu-notif-panel').classList.add('open');
    panelOpen = true;
  }

  function closeNotifPanel() {
    document.getElementById('fu-notif-panel')?.classList.remove('open');
    panelOpen = false;
  }

  function toggleNotifPanel() {
    panelOpen ? closeNotifPanel() : openNotifPanel();
  }

  function refreshNotifPanel() {
    const body  = document.getElementById('fu-np-body');
    if (!body) return;

    const log = (typeof FondouneSession !== 'undefined') ? FondouneSession.getNotifLog() : [];
    if (!log.length) {
      body.innerHTML = '<div class="fu-np-empty"><i class="ti ti-bell-off"></i>Sin notificaciones</div>';
      return;
    }

    const iconMap = { success:'ti-circle-check', info:'ti-info-circle', warning:'ti-alert-triangle', error:'ti-alert-circle' };
    const clsMap  = { success:'fu-ni-success',   info:'fu-ni-info',     warning:'fu-ni-warning',    error:'fu-ni-error'   };

    body.innerHTML = log.slice().reverse().map(n => `
      <div class="fu-notif-item ${n.read?'':'unread'}">
        <div class="fu-ni-icon ${clsMap[n.type]||'fu-ni-info'}">
          <i class="ti ${iconMap[n.type]||'ti-info-circle'}"></i>
        </div>
        <div class="fu-ni-body">
          <div class="fu-ni-msg">${n.msg}</div>
          <div class="fu-ni-time">${formatTs(n.ts)}</div>
        </div>
      </div>`).join('');
  }

  function refreshNotifPip() {
    const pip = document.getElementById('notif-pip');
    if (!pip) return;
    const unread = (typeof FondouneSession !== 'undefined') ? FondouneSession.getUnreadCount() : 0;
    pip.style.display = unread > 0 ? 'block' : 'none';
    const badge = document.getElementById('fu-np-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'inline' : 'none';
    }
  }

  function markAllRead() {
    if (typeof FondouneSession !== 'undefined') FondouneSession.markNotifsRead();
    refreshNotifPanel();
    refreshNotifPip();
  }

  // ── Modo móvil analista (lista ↔ detalle) ────────────────────────
  function initAnalystMobile() {
    document.querySelectorAll('.rcard').forEach(card => {
      card.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          const dp = document.querySelector('.detail-panel');
          if (dp) dp.classList.add('mobile-open');
        }
      });
    });
  }

  // ── Helpers de formato ───────────────────────────────────────────
  function fmtCOP(n) {
    if (!n && n !== 0) return '—';
    return '$' + Number(n).toLocaleString('es-CO');
  }

  function formatTs(ts) {
    if (!ts) return '';
    const d   = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff <    60) return 'Hace un momento';
    if (diff <  3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
    return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  }

  // ── API pública ───────────────────────────────────────────────────
  return {
    toast,
    openNotifPanel,
    closeNotifPanel,
    toggleNotifPanel,
    refreshNotifPanel,
    refreshNotifPip,
    markAllRead,
    initAnalystMobile,
    fmtCOP,
    formatTs,
  };

})();
