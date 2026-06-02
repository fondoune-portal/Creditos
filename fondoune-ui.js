/**
 * FondoUne — fondoune-ui.js (Fase C)
 * Toast unificado, centro de notificaciones y helpers responsive.
 * Requiere: session.js (FondouneSession)
 */
const FondouneUI = (() => {
  const TOAST_TYPE_MAP = {
    ok: 'success',
    success: 'success',
    't-ok': 'success',
    'toast-ok': 'success',
    err: 'error',
    error: 'error',
    't-err': 'error',
    'toast-err': 'error',
    warn: 'warning',
    warning: 'warning',
    't-warn': 'warning',
    'toast-warn': 'warning',
    info: 'info',
    blue: 'info',
    't-info': 'info',
    'toast-blue': 'info',
  };

  const NOTIF_ICONS = {
    success: 'ti-circle-check',
    info: 'ti-info-circle',
    warning: 'ti-alert-triangle',
    error: 'ti-alert-circle',
  };

  let _drawerReady = false;

  function normalizeType(type) {
    return TOAST_TYPE_MAP[type] || type || 'info';
  }

  /**
   * Toast unificado → FondouneSession.showNotif (registra en historial).
   */
  function toast(msg, type = 'info', duration) {
    const t = normalizeType(type);
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.showNotif(msg, t, duration);
      refreshNotifPip();
      return;
    }
    console.warn('[FondouneUI] FondouneSession no disponible:', msg);
  }

  function fmtCOP(n) {
    if (typeof FondouneSolicitudes !== 'undefined') {
      return FondouneSolicitudes.fmtCOP(n);
    }
    return '$' + Number(n || 0).toLocaleString('es-CO');
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return 'Hace ' + Math.floor(diff / 60000) + ' min';
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function ensureNotifDrawer() {
    if (_drawerReady || document.getElementById('fu-notif-drawer')) {
      _drawerReady = true;
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'fu-notif-backdrop';
    backdrop.className = 'fu-notif-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const drawer = document.createElement('aside');
    drawer.id = 'fu-notif-drawer';
    drawer.className = 'fu-notif-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Notificaciones');
    drawer.innerHTML = `
      <div class="fu-notif-drawer-head">
        <h2><i class="ti ti-bell"></i> Notificaciones</h2>
        <div class="fu-notif-drawer-actions">
          <button type="button" id="fu-notif-mark-read">Marcar leídas</button>
          <button type="button" id="fu-notif-close" aria-label="Cerrar"><i class="ti ti-x"></i></button>
        </div>
      </div>
      <div class="fu-notif-summary" id="fu-notif-summary"></div>
      <div class="fu-notif-list" id="fu-notif-list"></div>`;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    backdrop.addEventListener('click', closeNotifDrawer);
    document.getElementById('fu-notif-close')?.addEventListener('click', closeNotifDrawer);
    document.getElementById('fu-notif-mark-read')?.addEventListener('click', () => {
      if (typeof FondouneSession !== 'undefined') {
        FondouneSession.markAllNotifsRead();
      }
      renderNotifDrawer();
      refreshNotifPip();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeNotifDrawer();
      }
    });

    _drawerReady = true;
  }

  function renderNotifSummary() {
    const el = document.getElementById('fu-notif-summary');
    if (!el || typeof FondouneSession === 'undefined') return;

    const sum = FondouneSession.getActivitySummary();
    const chips = [];
    if (sum.analistaPendientes > 0) {
      chips.push(
        '<span class="fu-notif-chip"><strong>' + sum.analistaPendientes +
        '</strong> en bandeja analista</span>'
      );
    }
    if (sum.gerenciaPendientes > 0) {
      chips.push(
        '<span class="fu-notif-chip"><strong>' + sum.gerenciaPendientes +
        '</strong> autorización gerencia</span>'
      );
    }
    if (sum.portalNuevas > 0) {
      chips.push(
        '<span class="fu-notif-chip"><strong>' + sum.portalNuevas +
        '</strong> desde portal</span>'
      );
    }
    el.innerHTML = chips.length
      ? chips.join('')
      : '<span class="fu-notif-chip">Sin pendientes críticos en sesión</span>';
  }

  function renderNotifDrawer() {
    ensureNotifDrawer();
    const list = document.getElementById('fu-notif-list');
    if (!list) return;

    renderNotifSummary();

    const log = typeof FondouneSession !== 'undefined'
      ? FondouneSession.getNotifLog()
      : [];

    if (!log.length) {
      list.innerHTML =
        '<div class="fu-notif-empty"><i class="ti ti-bell-off"></i>No hay notificaciones recientes.<br><span style="font-size:11px">Las alertas del flujo aparecerán aquí.</span></div>';
      return;
    }

    list.innerHTML = log.map((n) => {
      const type = normalizeType(n.type);
      const icon = NOTIF_ICONS[type] || NOTIF_ICONS.info;
      const unread = n.read ? '' : ' unread';
      return (
        '<div class="fu-notif-item' + unread + '" data-notif-id="' + n.id + '">' +
        '<i class="ti ' + icon + '"></i>' +
        '<div class="fu-notif-item-body">' +
        '<div class="fu-notif-item-msg">' + escapeHtml(n.msg) + '</div>' +
        '<div class="fu-notif-item-time">' + fmtTime(n.ts) + '</div>' +
        '</div></div>'
      );
    }).join('');

    list.querySelectorAll('.fu-notif-item').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-notif-id');
        if (id && typeof FondouneSession !== 'undefined') {
          FondouneSession.markNotifRead(id);
        }
        row.classList.remove('unread');
        refreshNotifPip();
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openNotifDrawer() {
    ensureNotifDrawer();
    renderNotifDrawer();
    document.getElementById('fu-notif-backdrop')?.classList.add('open');
    document.getElementById('fu-notif-drawer')?.classList.add('open');
    document.getElementById('fu-notif-backdrop')?.setAttribute('aria-hidden', 'false');
  }

  function closeNotifDrawer() {
    document.getElementById('fu-notif-backdrop')?.classList.remove('open');
    document.getElementById('fu-notif-drawer')?.classList.remove('open');
    document.getElementById('fu-notif-backdrop')?.setAttribute('aria-hidden', 'true');
  }

  function toggleNotifDrawer() {
    const drawer = document.getElementById('fu-notif-drawer');
    if (drawer?.classList.contains('open')) closeNotifDrawer();
    else openNotifDrawer();
  }

  function refreshNotifPip(pipSelector) {
    const sel = pipSelector || '#notif-pip, #fu-notif-pip, .fu-notif-pip';
    const count = typeof FondouneSession !== 'undefined'
      ? FondouneSession.getUnreadNotifCount()
      : 0;
    document.querySelectorAll(sel).forEach((pip) => {
      pip.style.display = count > 0 ? 'block' : 'none';
    });
  }

  /**
   * @param {object} opts - { btn, pip }
   */
  function initNotifCenter(opts = {}) {
    const btnSel = opts.btn || '#notif-btn, #fu-notif-btn';
    const buttons = document.querySelectorAll(btnSel);
    if (!buttons.length) return;

    ensureNotifDrawer();
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleNotifDrawer();
      });
    });

    refreshNotifPip(opts.pip);
    renderNotifSummary();
  }

  function initAnalystMobile() {
    if (!document.body.classList.contains('fu-module-analista')) return;

    let backBtn = document.getElementById('detail-back');
    if (!backBtn) {
      backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.id = 'detail-back';
      backBtn.className = 'icon-btn';
      backBtn.title = 'Volver a la lista';
      backBtn.style.display = 'none';
      backBtn.innerHTML = '<i class="ti ti-arrow-left"></i>';
      const navR = document.querySelector('.topnav .nav-r');
      if (navR) navR.insertBefore(backBtn, navR.firstChild);
    }

    backBtn.addEventListener('click', () => {
      document.body.classList.remove('fu-detail-open');
      const empty = document.getElementById('empty-state');
      const detail = document.getElementById('detail-body');
      if (empty) empty.style.display = 'flex';
      if (detail) detail.style.display = 'none';
    });

    const origSelect = window.selectSol;
    if (typeof origSelect === 'function' && !origSelect._fuMobile) {
      const wrapped = function (id) {
        origSelect(id);
        if (window.matchMedia('(max-width: 900px)').matches) {
          document.body.classList.add('fu-detail-open');
        }
      };
      wrapped._fuMobile = true;
      window.selectSol = wrapped;
    }
  }

  function boot() {
    initNotifCenter();
    initAnalystMobile();
    refreshNotifPip();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 50);
  }

  return {
    toast,
    fmtCOP,
    fmtTime,
    initNotifCenter,
    initAnalystMobile,
    openNotifDrawer,
    closeNotifDrawer,
    refreshNotifPip,
    renderNotifDrawer,
  };
})();
