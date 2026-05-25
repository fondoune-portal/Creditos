/**
 * FondoUne — navigation.js
 * Barra de navegación compartida entre todos los módulos,
 * routing con datos entre portales y control de acceso por rol.
 *
 * Uso: incluir ANTES de session.js en el <head> de cada módulo
 * <script src="navigation.js"></script>
 * <script src="session.js"></script>
 */

const FondouneNav = (() => {

  // ── Mapa de portales ─────────────────────────────────────────────
  const PORTALES = {
    home:      { file: 'index.html',                label: 'Inicio',          icon: 'ti-home'           },
    solicitud: { file: 'modulo1-portal.html',        label: 'Mi Solicitud',    icon: 'ti-file-text'      },
    analista:  { file: 'modulo2-analista.html',      label: 'Analista',        icon: 'ti-chart-bar'      },
    gerencia:  { file: 'modulo3-gerencia.html',      label: 'Gerencia',        icon: 'ti-crown'          },
    firma:     { file: 'modulo4-firma.html',         label: 'Firma y Pago',    icon: 'ti-writing-sign'   },
    demo:      { file: 'demo-intercomunicacion.html',label: 'Demo sistema',    icon: 'ti-plug-connected'  },
  };

  // ── Acceso por rol ───────────────────────────────────────────────
  const ACCESO_ROL = {
    asociado: ['home', 'solicitud', 'firma'],
    analista: ['home', 'solicitud', 'analista', 'firma'],
    gerencia: ['home', 'solicitud', 'analista', 'gerencia', 'firma'],
    jefe_credito: ['home', 'solicitud', 'analista', 'gerencia', 'firma'],
  };

  let _portalActual = 'home';
  let _navInyectada = false;

  // ── Inyectar estilos de la barra ─────────────────────────────────
  function injectNavStyles() {
    if (document.getElementById('fu-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'fu-nav-styles';
    style.textContent = `
      :root { --fu-nav-h: 50px; }

      #fu-navbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: var(--fu-nav-h);
        background: #0B2545;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 12px;
        z-index: 8000;
        box-shadow: 0 2px 12px rgba(11,37,69,.3);
        font-family: 'DM Sans', 'IBM Plex Sans', sans-serif;
      }

      /* Logo */
      #fu-nav-logo {
        display: flex; align-items: center; gap: 8px;
        text-decoration: none; flex-shrink: 0;
      }
      .fu-logo-mark {
        width: 26px; height: 26px; border-radius: 7px;
        background: #C9963B;
        display: flex; align-items: center; justify-content: center;
      }
      .fu-logo-mark i { font-size: 14px; color: #0B2545; }
      .fu-logo-name {
        font-size: 14px; font-weight: 700; color: #fff;
        letter-spacing: -.2px;
      }

      .fu-nav-sep { width: 1px; height: 18px; background: rgba(255,255,255,.12); }

      /* Links de módulos */
      #fu-nav-links {
        display: flex; align-items: center; gap: 2px; flex: 1;
      }
      .fu-nav-link {
        display: flex; align-items: center; gap: 5px;
        padding: 5px 10px; border-radius: 7px;
        font-size: 12px; font-weight: 500;
        color: rgba(255,255,255,.5);
        cursor: pointer; border: none; background: none;
        transition: all .15s; text-decoration: none;
        white-space: nowrap;
      }
      .fu-nav-link:hover { background: rgba(255,255,255,.08); color: #fff; }
      .fu-nav-link.active {
        background: rgba(201,150,59,.2);
        color: #F0C060;
      }
      .fu-nav-link i { font-size: 15px; }
      .fu-nav-link.disabled { opacity: .25; cursor: not-allowed; pointer-events: none; }

      /* Módulo badge */
      .fu-mod-tag {
        font-family: 'DM Mono', 'JetBrains Mono', monospace;
        font-size: 10px; color: rgba(255,255,255,.3);
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.08);
        padding: 3px 8px; border-radius: 4px;
        flex-shrink: 0;
      }

      /* Usuario */
      #fu-nav-user {
        margin-left: auto;
        display: flex; align-items: center; gap: 8px;
        flex-shrink: 0;
      }
      .fu-user-name {
        font-size: 12px; color: rgba(255,255,255,.6);
        display: none;
      }
      @media(min-width:640px) { .fu-user-name { display: block; } }
      .fu-avatar {
        width: 26px; height: 26px; border-radius: 50%;
        background: linear-gradient(135deg, #2563EB, #C9963B);
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 700; color: #0B2545;
        cursor: pointer; flex-shrink: 0;
        font-family: 'DM Serif Display', serif;
      }
      .fu-logout-btn {
        display: flex; align-items: center; gap: 4px;
        padding: 4px 8px; border-radius: 6px;
        font-size: 11px; color: rgba(255,255,255,.4);
        cursor: pointer; border: none; background: none;
        transition: all .15s; font-family: inherit;
      }
      .fu-logout-btn:hover { color: #F07070; background: rgba(240,112,112,.1); }

      /* Ajustar padding-top del body para que la nav no tape contenido */
      body.fu-nav-active { padding-top: var(--fu-nav-h) !important; }

      /* Dropdown menú usuario (mobile) */
      .fu-user-menu {
        position: absolute; top: calc(var(--fu-nav-h) + 4px); right: 12px;
        background: #0E1420; border: 1px solid rgba(255,255,255,.1);
        border-radius: 10px; padding: 6px;
        box-shadow: 0 8px 32px rgba(0,0,0,.4);
        min-width: 180px; z-index: 8001;
        display: none;
      }
      .fu-user-menu.open { display: block; }
      .fu-um-item {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 10px; border-radius: 7px;
        font-size: 12px; color: rgba(255,255,255,.6);
        cursor: pointer; transition: background .12s;
      }
      .fu-um-item:hover { background: rgba(255,255,255,.06); color: #fff; }
      .fu-um-item i { font-size: 15px; }
      .fu-um-sep { height: 1px; background: rgba(255,255,255,.08); margin: 4px 0; }
    `;
    document.head.appendChild(style);
  }

  // ── Construir la barra de navegación ─────────────────────────────
  function buildNav(portalKey) {
    if (_navInyectada) {
      updateActiveLink(portalKey);
      updateUserInfo();
      return;
    }

    injectNavStyles();

    // Obtener usuario y rol
    const user = (typeof FondouneSession !== 'undefined') ? FondouneSession.getUser() : {};
    const rol  = user.role || 'asociado';
    const acceso = ACCESO_ROL[rol] || ACCESO_ROL.asociado;

    // Módulos visibles para este rol
    const linksHTML = Object.entries(PORTALES)
      .filter(([key]) => acceso.includes(key))
      .map(([key, portal]) => {
        const isActive  = key === portalKey ? ' active' : '';
        return `<button
          class="fu-nav-link${isActive}"
          id="fu-link-${key}"
          onclick="FondouneNav.navigateTo('${key}')"
          title="${portal.label}">
          <i class="ti ${portal.icon}"></i>
          <span class="fu-link-label">${portal.label}</span>
        </button>`;
      }).join('');

    // Badge del módulo actual
    const modLabel = PORTALES[portalKey]?.label || portalKey;

    // Avatar
    const initials = user.initials || (user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2) : '?');

    const nav = document.createElement('div');
    nav.id = 'fu-navbar';
    nav.innerHTML = `
      <a href="index.html" id="fu-nav-logo">
        <div class="fu-logo-mark"><i class="ti ti-building-bank"></i></div>
        <span class="fu-logo-name">FondoUne</span>
      </a>
      <div class="fu-nav-sep"></div>
      <span class="fu-mod-tag" id="fu-mod-tag">módulo / ${portalKey}</span>
      <div class="fu-nav-sep"></div>
      <div id="fu-nav-links">${linksHTML}</div>
      <div id="fu-nav-user">
        <span class="fu-user-name" id="fu-user-name">${user.name || ''}</span>
        <div class="fu-avatar" id="fu-avatar" onclick="FondouneNav.toggleUserMenu()"
          title="${user.name || 'Usuario'}">${initials}</div>
        <button class="fu-logout-btn" onclick="FondouneNav.logout()" title="Cerrar sesión">
          <i class="ti ti-logout"></i>
        </button>
      </div>

      <!-- Dropdown usuario -->
      <div class="fu-user-menu" id="fu-user-menu">
        <div class="fu-um-item" id="fu-um-name">
          <i class="ti ti-user-circle"></i>
          <span id="fu-um-username">${user.name || 'Sin sesión'}</span>
        </div>
        <div class="fu-um-item">
          <i class="ti ti-id"></i>
          <span id="fu-um-cedula">${user.id || '—'}</span>
        </div>
        <div class="fu-um-item">
          <i class="ti ti-building"></i>
          <span id="fu-um-empresa">${user.empresa || '—'}</span>
        </div>
        <div class="fu-um-sep"></div>
        ${Object.entries(PORTALES)
          .filter(([key]) => acceso.includes(key))
          .map(([key, p]) => `<div class="fu-um-item" onclick="FondouneNav.navigateTo('${key}')">
            <i class="ti ${p.icon}"></i><span>${p.label}</span>
          </div>`).join('')}
        <div class="fu-um-sep"></div>
        <div class="fu-um-item" style="color:#F07070" onclick="FondouneNav.logout()">
          <i class="ti ti-logout"></i><span>Cerrar sesión</span>
        </div>
      </div>`;

    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add('fu-nav-active');

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fu-nav-user')) {
        document.getElementById('fu-user-menu')?.classList.remove('open');
      }
    });

    _navInyectada = true;
    _portalActual = portalKey;
  }

  // ── Actualizar link activo ────────────────────────────────────────
  function updateActiveLink(portalKey) {
    document.querySelectorAll('.fu-nav-link').forEach(el => el.classList.remove('active'));
    const active = document.getElementById('fu-link-' + portalKey);
    if (active) active.classList.add('active');
    const tag = document.getElementById('fu-mod-tag');
    if (tag) tag.textContent = 'módulo / ' + portalKey;
  }

  // ── Actualizar info del usuario en la barra ───────────────────────
  function updateUserInfo() {
    if (!_navInyectada) return;
    const user = (typeof FondouneSession !== 'undefined') ? FondouneSession.getUser() : {};
    const initials = user.initials || (user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2) : '?');
    const nameEl   = document.getElementById('fu-user-name');
    const avatarEl = document.getElementById('fu-avatar');
    const umName   = document.getElementById('fu-um-username');
    const umCed    = document.getElementById('fu-um-cedula');
    const umEmp    = document.getElementById('fu-um-empresa');
    if (nameEl)   nameEl.textContent   = user.name || '';
    if (avatarEl) avatarEl.textContent  = initials;
    if (umName)   umName.textContent    = user.name || 'Sin sesión';
    if (umCed)    umCed.textContent     = user.id || '—';
    if (umEmp)    umEmp.textContent     = user.empresa || '—';
  }

  // ── Toggle dropdown usuario ───────────────────────────────────────
  function toggleUserMenu() {
    document.getElementById('fu-user-menu')?.classList.toggle('open');
  }

  // ── Navegar a otro portal ─────────────────────────────────────────
  /**
   * @param {string} portalKey  - clave del portal destino
   * @param {object} extraData  - datos adicionales a guardar en sesión antes de navegar
   */
  function navigateTo(portalKey, extraData = {}) {
    const portal = PORTALES[portalKey];
    if (!portal) {
      console.warn('[FondouneNav] Portal desconocido:', portalKey);
      return;
    }

    // Guardar datos extra si los hay
    if (extraData && Object.keys(extraData).length > 0 && typeof FondouneSession !== 'undefined') {
      const current = FondouneSession.getCreditApp() || {};
      FondouneSession.saveCreditApp({ ...current, ...extraData });
    }

    // Si ya estamos en este portal, no hacer nada
    if (portalKey === _portalActual) return;

    window.location.href = portal.file;
  }

  // ── Logout ────────────────────────────────────────────────────────
  function logout() {
    if (typeof FondouneSession !== 'undefined') {
      FondouneSession.logout('index.html');
    } else {
      window.location.href = 'index.html';
    }
  }

  // ── init ──────────────────────────────────────────────────────────
  /**
   * Llamar al inicio de cada portal:
   *   FondouneNav.init('solicitud');
   * @param {string} portalKey - clave del portal actual
   */
  function init(portalKey) {
    _portalActual = portalKey;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => buildNav(portalKey));
    } else {
      buildNav(portalKey);
    }
  }

  // ── API pública ───────────────────────────────────────────────────
  return {
    init,
    navigateTo,
    updateUserInfo,
    toggleUserMenu,
    logout,
    PORTALES,
    ACCESO_ROL,
    get portalActual() { return _portalActual; },
  };

})();
