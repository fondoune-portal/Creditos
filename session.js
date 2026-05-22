/**
 * FondoUne Session Manager
 * Sistema de gestión de sesión y compartir datos entre portales
 * ============================================================
 */

/**
 * Guardar datos en la sesión
 * @param {string} key - Clave del dato
 * @param {*} value - Valor (se convierte a JSON)
 */
function setSessionData(key, value) {
  try {
    sessionStorage.setItem(`fondoune_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error guardando sesión: ${e.message}`);
  }
}

/**
 * Obtener datos de la sesión
 * @param {string} key - Clave del dato
 * @param {*} defaultValue - Valor por defecto si no existe
 * @returns {*} Valor almacenado o default
 */
function getSessionData(key, defaultValue = null) {
  try {
    const value = sessionStorage.getItem(`fondoune_${key}`);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    console.warn(`Error leyendo sesión: ${e.message}`);
    return defaultValue;
  }
}

/**
 * Eliminar dato de la sesión
 * @param {string} key - Clave del dato
 */
function removeSessionData(key) {
  try {
    sessionStorage.removeItem(`fondoune_${key}`);
  } catch (e) {
    console.warn(`Error eliminando sesión: ${e.message}`);
  }
}

/**
 * Limpiar toda la sesión
 */
function clearSession() {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('fondoune_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn(`Error limpiando sesión: ${e.message}`);
  }
}

/**
 * Inicializar sesión de usuario
 * @param {object} userData - {id, name, email, role, initials}
 */
function initUserSession(userData) {
  setSessionData('userId', userData.id);
  setSessionData('userName', userData.name);
  setSessionData('userEmail', userData.email);
  setSessionData('userRole', userData.role);
  setSessionData('userInitials', userData.initials);
  setSessionData('sessionStartTime', Date.now());
  
  console.log('✅ User session initialized');
}

/**
 * Obtener datos completos del usuario
 * @returns {object} Datos del usuario
 */
function getUserSession() {
  return {
    id: getSessionData('userId'),
    name: getSessionData('userName'),
    email: getSessionData('userEmail'),
    role: getSessionData('userRole'),
    initials: getSessionData('userInitials'),
    startTime: getSessionData('sessionStartTime')
  };
}

/**
 * Verificar si existe una sesión activa
 * @returns {boolean} True si hay sesión
 */
function hasActiveSession() {
  return getSessionData('userId') !== null;
}

/**
 * Guardar datos de solicitud de crédito
 * @param {object} solicitudData - Datos de la solicitud
 */
function saveCreditApplication(solicitudData) {
  setSessionData('creditApplication', {
    ...getSessionData('creditApplication', {}),
    ...solicitudData,
    lastUpdated: new Date().toISOString()
  });
}

/**
 * Obtener datos de solicitud de crédito
 * @returns {object} Datos guardados de la solicitud
 */
function getCreditApplication() {
  return getSessionData('creditApplication', {});
}

/**
 * Guardar referencia de solicitud
 * @param {string} solicitudId - ID de la solicitud
 */
function setSolicitudId(solicitudId) {
  setSessionData('solicitudId', solicitudId);
}

/**
 * Obtener referencia de solicitud
 * @returns {string} ID de la solicitud
 */
function getSolicitudId() {
  return getSessionData('solicitudId');
}

/**
 * Guardar datos navegacionales
 * @param {object} data - Datos a guardar
 */
function setNavigationData(data) {
  setSessionData('navigationData', data);
}

/**
 * Obtener y limpiar datos navegacionales
 * @returns {object} Datos de navegación (se elimina después de leer)
 */
function getAndClearNavigationData() {
  const data = getSessionData('navigationData', null);
  if (data) {
    removeSessionData('navigationData');
  }
  return data;
}

/**
 * Guardar estado del portal actual
 * @param {string} portalKey - Key del portal
 * @param {object} state - Estado del portal
 */
function savePortalState(portalKey, state) {
  const allStates = getSessionData('portalStates', {});
  allStates[portalKey] = {
    ...state,
    timestamp: Date.now()
  };
  setSessionData('portalStates', allStates);
}

/**
 * Obtener estado guardado de un portal
 * @param {string} portalKey - Key del portal
 * @returns {object} Estado guardado
 */
function getPortalState(portalKey) {
  const allStates = getSessionData('portalStates', {});
  return allStates[portalKey] || null;
}

/**
 * Guardar mensajes de notificación entre portales
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 */
function queueNotification(message, type = 'info') {
  const notifications = getSessionData('notifications', []);
  notifications.push({
    message,
    type,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  });
  setSessionData('notifications', notifications);
}

/**
 * Obtener y limpiar notificaciones pendientes
 * @returns {array} Array de notificaciones
 */
function getAndClearNotifications() {
  const notifications = getSessionData('notifications', []);
  removeSessionData('notifications');
  return notifications;
}

/**
 * Mostrar notificaciones pendientes
 */
function showPendingNotifications() {
  const notifications = getAndClearNotifications();
  
  notifications.forEach(notif => {
    showNotification(notif.message, notif.type);
  });
}

/**
 * Mostrar una notificación
 * @param {string} message - Mensaje
 * @param {string} type - Tipo de notificación
 */
function showNotification(message, type = 'info') {
  const icons = {
    success: 'ti-circle-check',
    error: 'ti-alert-circle',
    warning: 'ti-alert-triangle',
    info: 'ti-info-circle'
  };
  
  const colors = {
    success: '#1A7A4A',
    error: '#C0392B',
    warning: '#A06000',
    info: '#1A6BAD'
  };
  
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 16px 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;
  
  notif.innerHTML = `
    <i class="ti ${icons[type]}" style="font-size: 18px; color: ${colors[type]}"></i>
    <span style="color: #333; font-size: 14px">${message}</span>
    <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; cursor: pointer; color: #999; font-size: 16px">
      <i class="ti ti-x"></i>
    </button>
  `;
  
  document.body.appendChild(notif);
  
  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notif.remove(), 300);
  }, 5000);
}

/**
 * Inyectar animaciones de notificaciones
 */
function injectNotificationStyles() {
  if (document.getElementById('fondoune-notif-styles')) return;
  
  const styles = `
    <style id="fondoune-notif-styles">
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

// Inyectar estilos al cargar
injectNotificationStyles();

/**
 * Exportar funciones para uso global
 */
window.FondouneSession = {
  setData: setSessionData,
  getData: getSessionData,
  removeData: removeSessionData,
  clear: clearSession,
  initUser: initUserSession,
  getUser: getUserSession,
  hasSession: hasActiveSession,
  saveCreditApp: saveCreditApplication,
  getCreditApp: getCreditApplication,
  setSolicitudId: setSolicitudId,
  getSolicitudId: getSolicitudId,
  setNavData: setNavigationData,
  getNavData: getAndClearNavigationData,
  savePortalState: savePortalState,
  getPortalState: getPortalState,
  queueNotif: queueNotification,
  showNotif: showNotification,
  showPendingNotifs: showPendingNotifications
};

console.log('✅ FondoUne Session Manager loaded');
