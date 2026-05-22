/**
 * FondoUne Navigation System
 * Sistema centralizado de navegación entre portales
 * ================================================
 * Este archivo gestiona la navegación consistente entre todos los portales HTML
 * y permite compartir datos entre ellos de forma segura.
 */

// ── CONFIGURACIÓN DE PORTALES ──
const PORTALS = {
  home: {
    name: 'Inicio',
    file: 'index.html',
    icon: 'ti-home',
    description: 'Panel de inicio y bienvenida',
    role: '*' // Accesible para todos
  },
  solicitud: {
    name: 'Nueva Solicitud',
    file: 'fondoune-portal.html',
    icon: 'ti-file-text',
    description: 'Portal de crédito inteligente',
    role: 'asociado'
  },
  analista: {
    name: 'Dashboard Analista',
    file: 'fondoune-dashboard-analista.html',
    icon: 'ti-chart-bar',
    description: 'Panel de revisión de solicitudes',
    role: 'analista'
  },
  gerencia: {
    name: 'Panel Gerencial',
    file: 'fondoune-gerencia.html',
    icon: 'ti-layout-dashboard',
    description: 'Métricas ejecutivas',
    role: 'gerencia'
  },
  firma: {
    name: 'Firma y Desembolso',
    file: 'fondoune-firma-desembolso.html',
    icon: 'ti-writing-sign',
    description: 'Firma electrónica y desembolso',
    role: 'asociado'
  }
};

/**
 * Crear menú de navegación
 * @param {string} currentPortal - Portal actual (key del objeto PORTALS)
 * @returns {string} HTML del menú de navegación
 */
function renderNavigationMenu(currentPortal = null) {
  let menuHTML = `
    <nav class="fondoune-nav-menu">
      <div class="nav-container">
        <div class="nav-brand">
          <i class="ti ti-building-bank"></i>
          <span class="brand-name">FondoUne</span>
        </div>
        <div class="nav-links">
  `;
  
  for (const [key, portal] of Object.entries(PORTALS)) {
    const isActive = key === currentPortal ? 'active' : '';
    const userRole = getSessionData('userRole') || 'asociado';
    
    // Verificar permisos de acceso
    if (portal.role !== '*' && portal.role !== userRole) {
      continue;
    }
    
    menuHTML += `
      <a href="${portal.file}" class="nav-link ${isActive}" title="${portal.description}">
        <i class="ti ${portal.icon}"></i>
        <span class="nav-label">${portal.name}</span>
      </a>
    `;
  }
  
  menuHTML += `
        </div>
        <div class="nav-user">
          <span class="user-name" id="nav-user-name">Usuario</span>
          <div class="user-avatar" id="nav-user-avatar">U</div>
        </div>
      </div>
    </nav>
  `;
  
  return menuHTML;
}

/**
 * Inyectar estilos del menú de navegación
 */
function injectNavigationStyles() {
  if (document.getElementById('fondoune-nav-styles')) return; // Ya inyectado
  
  const styles = `
    <style id="fondoune-nav-styles">
      /* ── NAVEGACIÓN FONDOUNE ── */
      .fondoune-nav-menu {
        background: linear-gradient(135deg, #0B2545 0%, #134074 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.75rem 1.25rem;
        margin-bottom: 1.5rem;
        border-radius: 0 0 12px 12px;
        box-shadow: 0 4px 12px rgba(11, 37, 69, 0.15);
      }
      
      .nav-container {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }
      
      .nav-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #F0C060;
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .nav-brand i {
        font-size: 18px;
      }
      
      .brand-name {
        letter-spacing: -0.3px;
      }
      
      .nav-links {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        flex-wrap: wrap;
      }
      
      .nav-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .nav-link:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .nav-link.active {
        background: rgba(240, 192, 96, 0.2);
        color: #F0C060;
        border: 1px solid rgba(240, 192, 96, 0.3);
      }
      
      .nav-link i {
        font-size: 14px;
      }
      
      .nav-label {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .nav-user {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
        flex-shrink: 0;
      }
      
      .user-name {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1A6BAD, #C9963B);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 12px;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .nav-container {
          gap: 1rem;
        }
        
        .nav-label {
          display: none;
        }
        
        .nav-link {
          padding: 8px 10px;
        }
        
        .user-name {
          display: none;
        }
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

/**
 * Inicializar navegación en el portal actual
 * @param {string} currentPortal - Portal actual (key del objeto PORTALS)
 */
function initNavigation(currentPortal = null) {
  injectNavigationStyles();
  
  const navHTML = renderNavigationMenu(currentPortal);
  
  // Insertar el menú al inicio del body
  if (document.body) {
    document.body.insertAdjacentHTML('afterbegin', navHTML);
  } else {
    // Si el DOM no está listo, esperar
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertAdjacentHTML('afterbegin', navHTML);
    });
  }
  
  // Actualizar info del usuario en el menú
  updateUserInfoInNav();
}

/**
 * Actualizar información del usuario en el menú
 */
function updateUserInfoInNav() {
  const userName = getSessionData('userName');
  const userInitials = getSessionData('userInitials');
  
  if (userName) {
    const nameEl = document.getElementById('nav-user-name');
    if (nameEl) nameEl.textContent = userName;
  }
  
  if (userInitials) {
    const avatarEl = document.getElementById('nav-user-avatar');
    if (avatarEl) avatarEl.textContent = userInitials;
  }
}

/**
 * Navegar a un portal específico pasando datos
 * @param {string} portalKey - Key del portal en el objeto PORTALS
 * @param {object} data - Datos a pasar al siguiente portal
 */
function navigateToPortal(portalKey, data = {}) {
  if (!PORTALS[portalKey]) {
    console.error(`Portal "${portalKey}" no encontrado`);
    return;
  }
  
  // Guardar datos en sessionStorage
  if (Object.keys(data).length > 0) {
    setSessionData('navigationData', data);
  }
  
  // Navegar
  window.location.href = PORTALS[portalKey].file;
}

/**
 * Agregar botón de navegación rápida
 * @param {string} portalKey - Key del portal
 * @param {object} options - Opciones {text, data, className}
 */
function createNavButton(portalKey, options = {}) {
  const {
    text = PORTALS[portalKey]?.name || 'Navegar',
    data = {},
    className = ''
  } = options;
  
  const portal = PORTALS[portalKey];
  if (!portal) return null;
  
  const button = document.createElement('button');
  button.className = `fondoune-nav-btn ${className}`;
  button.innerHTML = `
    <i class="ti ${portal.icon}"></i>
    ${text}
  `;
  button.onclick = () => navigateToPortal(portalKey, data);
  
  return button;
}

/**
 * Agregar estilos para los botones de navegación
 */
function injectButtonStyles() {
  if (document.getElementById('fondoune-btn-styles')) return;
  
  const styles = `
    <style id="fondoune-btn-styles">
      .fondoune-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 11px 24px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        background: #0B2545;
        color: #fff;
        transition: all 0.2s ease;
      }
      
      .fondoune-nav-btn:hover {
        background: #134074;
        box-shadow: 0 4px 12px rgba(11, 37, 69, 0.25);
      }
      
      .fondoune-nav-btn i {
        font-size: 16px;
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

/**
 * Exportar funciones para uso global
 */
window.FondouneNav = {
  init: initNavigation,
  navigateTo: navigateToPortal,
  createButton: (portalKey, options) => {
    injectButtonStyles();
    return createNavButton(portalKey, options);
  },
  updateUserInfo: updateUserInfoInNav,
  PORTALS: PORTALS
};

console.log('✅ FondoUne Navigation System loaded');
