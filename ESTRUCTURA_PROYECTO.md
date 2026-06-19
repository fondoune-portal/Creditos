# 📁 Estructura de Proyecto FondoUne - Portal de Crédito Inteligente

## 🎯 Descripción General

Portal de crédito inteligente para empleados de FondoUne con **5 módulos independientes** que trabajan en conjunto mediante un sistema centralizado de navegación y gestión de sesiones.

---

## 📂 Estructura de Carpetas (Recomendada)

```
Creditos/
│
├── 📑 DOCUMENTACIÓN
│   ├── README.md                           ← Inicio del proyecto
│   ├── IMPLEMENTACION_NAVEGACION.md        ← Guía completa
│   ├── SECURITY.md                         ← Política de seguridad
│   └── ESTRUCTURA_PROYECTO.md              ← Este archivo
│
├── 🔧 SISTEMA CORE
│   ├── navigation.js                       ← Sistema de navegación centralizado
│   └── session.js                          ← Gestor de sesiones y datos
│
├── 🏠 PORTALES (HTML)
│   ├── index.html                          ← 0️⃣ Inicio (Bienvenida)
│   ├── fondoune-portal.html                ← 1️⃣ Nueva Solicitud
│   ├── fondoune-dashboard-analista.html    ← 2️⃣ Dashboard Analista
│   ├── fondoune-gerencia.html              ← 3️⃣ Panel Gerencial
│   └── fondoune-firma-desembolso.html      ← 4️⃣ Firma y Desembolso
│
├── 📚 MÓDULOS ALTERNATIVOS (Versiones)
│   ├── modulo1-portal.html                 ← Alternativa: Portal Solicitud
│   ├── modulo2-analista.html               ← Alternativa: Dashboard Analista
│   ├── modulo3-gerencia.html               ← Alternativa: Panel Gerencial
│   └── modulo4-firma.html                  ← Alternativa: Firma Desembolso
│
├── 🧪 DEMOSTRACIÓN
│   ├── EJEMPLO_IMPLEMENTACION.html         ← Página de ejemplo con código
│   └── prototype/                          ← Versiones en desarrollo
│       └── fondoune-portal.html
│
└── 📦 (Opcional) Carpetas Sugeridas
    ├── assets/
    │   ├── css/                            ← Estilos compartidos
    │   ├── js/                             ← Scripts compartidos
    │   └── images/                         ← Imágenes y logos
    │
    └── docs/
        ├── guias/                          ← Guías de usuario
        ├── api/                            ← Documentación API
        └── ejemplos/                       ← Ejemplos de código
```

---

## 📌 Archivos Principales

### 🔐 Sistema Core (Obligatorio)

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| **navigation.js** | 14 KB | Menú centralizado + navegación entre portales |
| **session.js** | 9 KB | Gestor de datos + notificaciones entre portales |

> **Nota:** Estos dos archivos DEBEN estar en la raíz del proyecto para que funcionen todos los portales.

### 🏠 Portales Principales (Producción)

| Portal | Archivo | Rol | Tamaño |
|--------|---------|-----|--------|
| **Inicio** | index.html | Todos | 3.4 KB |
| **Solicitud** | fondoune-portal.html | Asociado | 68 KB |
| **Analista** | fondoune-dashboard-analista.html | Analista | 54.5 KB |
| **Gerencia** | fondoune-gerencia.html | Gerencia | 39 KB |
| **Firma** | fondoune-firma-desembolso.html | Asociado | 30 KB |

### 📚 Módulos Alternativos (Opcional)

Estas son **versiones alternativas** de los portales con nombres estandarizados `moduloX-nombre.html`. Úsalos si prefieres versiones anteriores.

---

## 🚀 Flujo de Datos entre Portales

```
┌─────────────────────────────────────────────────────────┐
│ 1. index.html (INICIO)                                  │
│    ↓ Inicia sesión del usuario                         │
│    ↓ FondouneSession.initUser()                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. fondoune-portal.html (SOLICITUD)                    │
│    ↓ Usuario completa solicitud de crédito            │
│    ↓ FondouneSession.saveCreditApp()                   │
│    ↓ FondouneNav.navigateTo('analista')                │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. fondoune-dashboard-analista.html (ANALISTA)         │
│    ↓ Analista revisa y aprueba                         │
│    ↓ FondouneSession.savePortalState('analista', ...) │
│    ↓ FondouneNav.navigateTo('gerencia')                │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. fondoune-gerencia.html (GERENCIA)                   │
│    ↓ Gerente aprueba nivel ejecutivo                   │
│    ↓ FondouneSession.queueNotif('Aprobado')           │
│    ↓ FondouneNav.navigateTo('firma')                   │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. fondoune-firma-desembolso.html (FIRMA)              │
│    ↓ Usuario firma pagaré y desembolsa                │
│    ↓ FondouneSession.showPendingNotifs()              │
│    ↓ Proceso completo ✅                               │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementación

### Paso 1: Preparar el Entorno
- [ ] Descargar/clonar el repositorio
- [ ] Asegurar que `navigation.js` y `session.js` estén en la raíz
- [ ] Verificar que todos los HTML principales existan

### Paso 2: Agregar Scripts a HTML
En el `<head>` de cada portal, agregar:
```html
<script src="navigation.js"></script>
<script src="session.js"></script>
```

### Paso 3: Inicializar Navegación
En el `<script>` de cada portal:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('home'); // Cambiar según el portal
  FondouneSession.showPendingNotifs();
});
```

### Paso 4: Pruebas
- [ ] Navegar entre portales correctamente
- [ ] Datos se guardan y recuperan
- [ ] Notificaciones funcionan
- [ ] Menú se muestra en todos los portales

---

## 🔧 Variables de Sesión Disponibles

```javascript
// Usuario
FondouneSession.getUser()           // {id, name, email, role, initials}

// Solicitud de Crédito
FondouneSession.getCreditApp()      // {monto, plazo, tipo, ...}

// Datos Navegacionales
FondouneSession.getNavData()        // Datos pasados al navegar

// Estado de Portal
FondouneSession.getPortalState(key) // Estado guardado de un portal
```

---

## 🎨 Personalización

### Cambiar Colores del Menú

En `navigation.js`, busca la sección `.fondoune-nav-menu`:
```css
.fondoune-nav-menu {
  background: linear-gradient(135deg, #0B2545 0%, #134074 100%);
  /* Cambiar estos colores */
}
```

### Agregar Nuevos Portales

En `navigation.js`, agrega una entrada al objeto `PORTALS`:
```javascript
nuevoPortal: {
  name: 'Mi Nuevo Portal',
  file: 'mi-portal.html',
  icon: 'ti-star',
  description: 'Descripción',
  role: '*' // Accesible para todos
}
```

---

## 📊 Roles y Permisos

| Rol | Portales Accesibles |
|-----|-------------------|
| **asociado** | Inicio, Solicitud, Firma |
| **analista** | Inicio, Dashboard Analista |
| **gerencia** | Inicio, Panel Gerencial |
| **admin** | Todos |

---

## 🔒 Seguridad

- ✅ Datos guardados en `sessionStorage` (no `localStorage`)
- ✅ Sesión se limpia al cerrar la pestaña
- ✅ **NO incluir contraseñas** en sesión
- ✅ Control de permisos por rol
- ✅ Validación en cada portal

Ver [SECURITY.md](SECURITY.md) para más detalles.

---

## 📱 Responsive Design

Todos los portales son **100% responsive** para:
- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (< 768px)

---

## 🆘 Solución de Problemas

**P: El menú no aparece**
- Verificar que `navigation.js` esté en la raíz
- Verificar que `FondouneNav.init()` se llame después de DOMContentLoaded

**P: Los datos no se guardan entre portales**
- Verificar que `session.js` esté en la raíz
- Usar `FondouneSession` (con mayúscula) para acceder

**P: Las notificaciones no se muestran**
- Llamar a `FondouneSession.showPendingNotifs()` en el portal destino

---

## 📞 Soporte y Contacto

- **Email:** support@fondoune.com
- **Repository:** https://github.com/fondoune-portal/Creditos
- **Issues:** https://github.com/fondoune-portal/Creditos/issues

---

## 📜 Versión

**v1.0.0** - Estructura base completa  
Última actualización: Mayo 2026

