/**
 * FondoUne — navigation.js  v2.0
 * Barra de navegación + guardia de rutas por rol.
 * El asociado NUNCA puede acceder a módulos de analista o gerencia.
 *
 * Uso: <script src="navigation.js"></script>  (antes de session.js)
 */

const FondouneNav = (() => {

  // ── Mapa de portales ──────────────────────────────────────────────
  const PORTALES = {
    home:      { file:'index.html',                  label:'Inicio',         icon:'ti-home'          },
    solicitud: { file:'modulo1-portal.html',          label:'Mi Solicitud',   icon:'ti-file-text'     },
    firma:     { file:'modulo4-firma.html',           label:'Firma y Pago',   icon:'ti-writing-sign'  },
    analista:  { file:'modulo2-analista.html',        label:'Solicitudes',    icon:'ti-chart-bar'     },
    gerencia:  { file:'modulo3-gerencia.html',        label:'Panel Ejecutivo',icon:'ti-crown'         },
    demo:      { file:'demo-intercomunicacion.html',  label:'Demo sistema',   icon:'ti-plug-connected'},
  };

  // ── Acceso estricto por rol ───────────────────────────────────────
  // El asociado NO tiene acceso a analista ni gerencia — punto.
  const ACCESO_ROL = {
    asociado:     ['home','solicitud','firma'],
    analista:     ['home','analista','firma'],
    gerencia:     ['home','analista','gerencia','firma'],
    jefe_credito: ['home','analista','gerencia','firma'],
  };

  // ── Portales restringidos (los que el asociado nunca debe ver) ────
  const SOLO_STAFF = ['analista','gerencia'];

  let _portalActual = 'home';
  let _navInyectada = false;

  // ─────────────────────────────────────────────────────────────────
  // GUARDIA DE RUTAS — se ejecuta PRIMERO al cargar cada portal
  // ─────────────────────────────────────────────────────────────────
  function guardRoute(portalKey) {
    // Si no hay session.js todavía, esperar y reintentar
    if (typeof FondouneSession === 'undefined') {
      setTimeout(() => guardRoute(portalKey), 80);
      return;
    }

    const user   = FondouneSession.getUser();
    const rol    = user?.role || null;
    const acceso = ACCESO_ROL[rol] || [];

    // ── Caso 1: No hay sesión activa ──────────────────────────────
    if (!rol && portalKey !== 'home') {
      FondouneSession.queueNotif('Debes iniciar sesión para acceder.', 'warning');
      // Redirigir al login correcto según el portal
      const loginUrl = ['analista','gerencia'].includes(portalKey) ? 'login-staff.html' : 'index.html';
      window.location.replace(loginUrl);
      return;
    }

    // ── Caso 2: Asociado intentando entrar a zona restringida ─────
    if (rol === 'asociado' && SOLO_STAFF.includes(portalKey)) {
      FondouneSession.queueNotif('No tienes permisos para acceder a esa sección.', 'error');
      FondouneSession.queueNotif('No tienes permisos para acceder a esa sección.', 'error');
      window.location.replace('index.html');
      return;
    }

    // ── Caso 3: Rol no tiene acceso a este portal ─────────────────
    if (rol && !acceso.includes(portalKey) && portalKey !== 'home') {
      FondouneSession.queueNotif('Acceso denegado para tu rol.', 'error');
      // Redirigir al primer portal disponible para ese rol
      const fallback = acceso.find(k => k !== 'home') || 'home';
      window.location.replace(PORTALES[fallback]?.file || 'index.html');
      return;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // ESTILOS
  // ─────────────────────────────────────────────────────────────────
  function injectNavStyles() {
    if (document.getElementById('fu-nav-styles')) return;
    const s = document.createElement('style');
    s.id = 'fu-nav-styles';
    s.textContent = `
      :root { --fu-nav-h: 50px; }

      #fu-navbar {
        position: fixed; top:0; left:0; right:0; height:var(--fu-nav-h);
        background:#0B2545; display:flex; align-items:center;
        padding:0 16px; gap:10px; z-index:8000;
        box-shadow:0 2px 12px rgba(11,37,69,.35);
        font-family:'DM Sans','IBM Plex Sans',sans-serif;
      }
      #fu-nav-logo {
        display:flex; align-items:center; gap:8px;
        text-decoration:none; flex-shrink:0;
      }
      .fu-logo-mark {
        width:26px; height:26px; border-radius:7px;
        background:#C9963B; display:flex; align-items:center; justify-content:center;
      }
      .fu-logo-mark i { font-size:14px; color:#0B2545; }
      .fu-logo-name   { font-size:14px; font-weight:700; color:#fff; letter-spacing:-.2px; }

      .fu-vsep { width:1px; height:18px; background:rgba(255,255,255,.12); flex-shrink:0; }

      .fu-mod-tag {
        font-family:'DM Mono','JetBrains Mono',monospace;
        font-size:10px; color:rgba(255,255,255,.3);
        background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
        padding:3px 8px; border-radius:4px; flex-shrink:0;
      }

      /* ── Links de módulos ── */
      #fu-nav-links { display:flex; align-items:center; gap:2px; flex:1; }

      .fu-nav-link {
        display:flex; align-items:center; gap:5px; padding:5px 10px;
        border-radius:7px; font-size:12px; font-weight:500;
        color:rgba(255,255,255,.5); cursor:pointer;
        border:none; background:none; transition:all .15s;
        text-decoration:none; white-space:nowrap;
      }
      .fu-nav-link:hover  { background:rgba(255,255,255,.08); color:#fff; }
      .fu-nav-link.active { background:rgba(201,150,59,.2); color:#F0C060; }
      .fu-nav-link i      { font-size:15px; }

      /* ── Chip de rol del staff ── */
      .fu-rol-chip {
        font-size:9px; font-weight:600; padding:2px 7px; border-radius:4px;
        text-transform:uppercase; letter-spacing:.06em; flex-shrink:0;
      }
      .chip-analista { background:rgba(59,130,246,.2); color:#93BFF9; }
      .chip-gerencia { background:rgba(201,150,59,.2); color:#F0C060; }

      /* ── Zona derecha (usuario) ── */
      #fu-nav-user {
        margin-left:auto; display:flex; align-items:center; gap:8px; flex-shrink:0;
      }
      .fu-user-name { font-size:12px; color:rgba(255,255,255,.6); display:none; }
      @media(min-width:600px){ .fu-user-name { display:block; } }

      .fu-avatar {
        width:26px; height:26px; border-radius:50%;
        background:linear-gradient(135deg,#2563EB,#C9963B);
        display:flex; align-items:center; justify-content:center;
        font-size:10px; font-weight:700; color:#0B2545;
        cursor:pointer; flex-shrink:0;
        font-family:'DM Serif Display',serif;
      }
      .fu-logout-btn {
        display:flex; align-items:center; gap:4px; padding:4px 8px;
        border-radius:6px; font-size:11px; color:rgba(255,255,255,.4);
        cursor:pointer; border:none; background:none; transition:all .15s;
        font-family:inherit;
      }
      .fu-logout-btn:hover { color:#F07070; background:rgba(240,112,112,.1); }

      body.fu-nav-active { padding-top:var(--fu-nav-h) !important; }

      /* ── Dropdown ── */
      .fu-user-menu {
        position:absolute; top:calc(var(--fu-nav-h) + 4px); right:12px;
        background:#0E1420; border:1px solid rgba(255,255,255,.1);
        border-radius:10px; padding:6px;
        box-shadow:0 8px 32px rgba(0,0,0,.45);
        min-width:190px; z-index:8001; display:none;
      }
      .fu-user-menu.open { display:block; }
      .fu-um-item {
        display:flex; align-items:center; gap:8px;
        padding:8px 10px; border-radius:7px;
        font-size:12px; color:rgba(255,255,255,.6);
        cursor:pointer; transition:background .12s;
      }
      .fu-um-item:hover  { background:rgba(255,255,255,.06); color:#fff; }
      .fu-um-item i      { font-size:15px; }
      .fu-um-sep         { height:1px; background:rgba(255,255,255,.08); margin:4px 0; }
      .fu-um-label {
        font-size:9px; font-weight:600; color:rgba(255,255,255,.25);
        text-transform:uppercase; letter-spacing:.08em;
        padding:6px 10px 2px;
      }

      /* ── Banner de acceso denegado ── */
      .fu-access-denied {
        position:fixed; inset:0; background:rgba(11,21,32,.96);
        display:flex; flex-direction:column; align-items:center;
        justify-content:center; z-index:9000; gap:12px; text-align:center;
        font-family:'DM Sans',sans-serif; padding:2rem;
        animation:fuFadeIn .25s ease;
      }
      @keyframes fuFadeIn { from{opacity:0} to{opacity:1} }
      .fu-access-denied i   { font-size:52px; color:#EF4444; opacity:.8; }
      .fu-access-denied h2  { font-size:20px; color:#fff; font-weight:600; }
      .fu-access-denied p   { font-size:13px; color:rgba(255,255,255,.5); max-width:340px; line-height:1.6; }
      .fu-access-denied button {
        margin-top:8px; padding:10px 24px; border-radius:8px;
        background:#C9963B; color:#0B2545; border:none;
        font-size:13px; font-weight:700; cursor:pointer;
        font-family:inherit;
      }
    `;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────────
  // CONSTRUIR BARRA
  // ─────────────────────────────────────────────────────────────────
  function buildNav(portalKey) {
    if (_navInyectada) { updateActiveLink(portalKey); updateUserInfo(); return; }
    injectNavStyles();

    const user   = (typeof FondouneSession !== 'undefined') ? FondouneSession.getUser() : {};
    const rol    = user.role || 'asociado';
    const acceso = ACCESO_ROL[rol] || ACCESO_ROL.asociado;
    const initials = user.initials || (user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2) : '?');

    // Chip de rol solo para staff
    const chipMap = { analista: 'chip-analista', gerencia: 'chip-gerencia', jefe_credito: 'chip-gerencia' };
    const chipLbl = { analista:'Analista', gerencia:'Gerencia', jefe_credito:'Jefe Crédito' };
    const rolChip = chipMap[rol]
      ? `<span class="fu-rol-chip ${chipMap[rol]}">${chipLbl[rol]}</span>`
      : '';

    // Links según acceso
    const linksHTML = Object.entries(PORTALES)
      .filter(([key]) => acceso.includes(key) && key !== 'demo')
      .map(([key, p]) => `
        <button class="fu-nav-link${key===portalKey?' active':''}"
          id="fu-link-${key}"
          onclick="FondouneNav.navigateTo('${key}')"
          title="${p.label}">
          <i class="ti ${p.icon}"></i>
          <span>${p.label}</span>
        </button>`).join('');

    // Dropdown items (solo portales del rol)
    const dropItems = Object.entries(PORTALES)
      .filter(([key]) => acceso.includes(key) && key !== 'demo')
      .map(([key, p]) => `
        <div class="fu-um-item" onclick="FondouneNav.navigateTo('${key}')">
          <i class="ti ${p.icon}"></i><span>${p.label}</span>
        </div>`).join('');

    const nav = document.createElement('div');
    nav.id = 'fu-navbar';
    nav.innerHTML = `
      <a href="index.html" id="fu-nav-logo" title="Inicio">
        <div class="fu-logo-mark"><i class="ti ti-building-bank"></i></div>
        <span class="fu-logo-name">FondoUne</span>
      </a>
      <div class="fu-vsep"></div>
      <span class="fu-mod-tag" id="fu-mod-tag">módulo / ${portalKey}</span>
      ${rolChip}
      <div class="fu-vsep"></div>
      <div id="fu-nav-links">${linksHTML}</div>
      <div id="fu-nav-user">
        <span class="fu-user-name" id="fu-user-name">${user.name || ''}</span>
        <div class="fu-avatar" id="fu-avatar"
          onclick="FondouneNav.toggleUserMenu()"
          title="${user.name || 'Usuario'}">${initials}</div>
        <button class="fu-logout-btn" onclick="FondouneNav.logout()" title="Cerrar sesión">
          <i class="ti ti-logout"></i>
        </button>
      </div>

      <div class="fu-user-menu" id="fu-user-menu">
        <div style="padding:8px 10px 6px">
          <div style="font-size:13px;font-weight:600;color:#fff" id="fu-um-username">${user.name||'Sin sesión'}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.4)" id="fu-um-rol">${chipLbl[rol]||'Asociado'}</div>
        </div>
        <div class="fu-um-item" style="pointer-events:none">
          <i class="ti ti-id"></i><span id="fu-um-cedula">${user.id||'—'}</span>
        </div>
        <div class="fu-um-item" style="pointer-events:none">
          <i class="ti ti-building"></i><span id="fu-um-empresa">${user.empresa||'—'}</span>
        </div>
        <div class="fu-um-sep"></div>
        <div class="fu-um-label">Mis portales</div>
        ${dropItems}
        <div class="fu-um-sep"></div>
        <div class="fu-um-item" style="color:#F07070" onclick="FondouneNav.logout()">
          <i class="ti ti-logout"></i><span>Cerrar sesión</span>
        </div>
      </div>`;

    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add('fu-nav-active');

    document.addEventListener('click', e => {
      if (!e.target.closest('#fu-nav-user')) {
        document.getElementById('fu-user-menu')?.classList.remove('open');
      }
    });

    _navInyectada = true;
    _portalActual = portalKey;
  }

  // ─────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────
  function updateActiveLink(portalKey) {
    document.querySelectorAll('.fu-nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById('fu-link-'+portalKey)?.classList.add('active');
    const tag = document.getElementById('fu-mod-tag');
    if (tag) tag.textContent = 'módulo / '+portalKey;
  }

  function updateUserInfo() {
    if (!_navInyectada) return;
    const user = (typeof FondouneSession !== 'undefined') ? FondouneSession.getUser() : {};
    const initials = user.initials || (user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2) : '?');
    const chipLbl  = { analista:'Analista', gerencia:'Gerencia', jefe_credito:'Jefe Crédito' };
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set('fu-user-name',  user.name  || '');
    set('fu-um-username',user.name  || 'Sin sesión');
    set('fu-um-cedula',  user.id    || '—');
    set('fu-um-empresa', user.empresa|| '—');
    set('fu-um-rol',     chipLbl[user.role] || 'Asociado');
    const av = document.getElementById('fu-avatar');
    if (av) av.textContent = initials;
  }

  function toggleUserMenu() {
    document.getElementById('fu-user-menu')?.classList.toggle('open');
  }

  // ─────────────────────────────────────────────────────────────────
  // NAVEGAR — con verificación de acceso
  // ─────────────────────────────────────────────────────────────────
  function navigateTo(portalKey, extraData = {}) {
    const portal = PORTALES[portalKey];
    if (!portal) { console.warn('[FondouneNav] Portal desconocido:', portalKey); return; }

    // Verificar acceso antes de navegar
    if (typeof FondouneSession !== 'undefined') {
      const user   = FondouneSession.getUser();
      const rol    = user?.role || 'asociado';
      const acceso = ACCESO_ROL[rol] || [];

      if (!acceso.includes(portalKey)) {
        FondouneSession.showNotif('No tienes permiso para acceder a esa sección.', 'error');
        return; // Bloquear sin redirigir — simplemente no hace nada
      }

      if (extraData && Object.keys(extraData).length > 0) {
        const cur = FondouneSession.getCreditApp() || {};
        FondouneSession.saveCreditApp({ ...cur, ...extraData });
      }
    }

    if (portalKey === _portalActual) return;
    window.location.href = portal.file;
  }

  function logout() {
    if (typeof FondouneSession !== 'undefined') FondouneSession.logout('index.html');
    else window.location.href = 'index.html';
  }

  // ─────────────────────────────────────────────────────────────────
  // INIT — punto de entrada de cada módulo
  // ─────────────────────────────────────────────────────────────────
  function init(portalKey) {
    _portalActual = portalKey;
    const run = () => {
      guardRoute(portalKey);   // ← verificar acceso PRIMERO
      buildNav(portalKey);     // ← luego construir la barra
    };
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', run)
      : run();
  }

  return { init, navigateTo, updateUserInfo, toggleUserMenu, logout, PORTALES, ACCESO_ROL };

})();
