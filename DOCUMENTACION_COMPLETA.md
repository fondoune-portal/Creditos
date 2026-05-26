# 📘 DOCUMENTACIÓN COMPLETA - FondoUne Portal de Crédito Inteligente

**Última actualización:** Mayo 2026  
**Versión:** 1.0.0  
**Estado:** Producción ✅

---

## 📑 TABLA DE CONTENIDOS

1. [Descripción General](#descripción-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Instalación](#instalación)
4. [Uso Básico](#uso-básico)
5. [Sistema de Navegación](#sistema-de-navegación)
6. [Gestor de Sesiones](#gestor-de-sesiones)
7. [Casos de Uso Reales](#casos-de-uso-reales)
8. [Mejoras Implementadas](#mejoras-implementadas)
9. [Seguridad](#seguridad)
10. [Troubleshooting](#troubleshooting)
11. [Despliegue](#despliegue)

---

## 🎯 Descripción General

**FondoUne** es un portal de crédito inteligente compuesto por 5 módulos independientes que trabajan en conjunto mediante:

- ✅ **Sistema centralizado de navegación** (`navigation.js`)
- ✅ **Gestor de sesiones compartidas** (`session.js`)
- ✅ **Control de acceso por rol** (asociado, analista, gerencia)
- ✅ **Comunicación de datos** entre portales en tiempo real
- ✅ **Notificaciones encoladas** con mensajes emergentes

### 🎭 Los 5 Portales

| # | Portal | Archivo | Rol | Descripción |
|---|--------|---------|-----|-------------|
| 0️⃣ | **Inicio** | `index.html` | Todos | Bienvenida y menú principal |
| 1️⃣ | **Nueva Solicitud** | `fondoune-portal.html` | Asociado | Crear solicitud de crédito |
| 2️⃣ | **Dashboard Analista** | `fondoune-dashboard-analista.html` | Analista | Revisar y analizar solicitudes |
| 3️⃣ | **Panel Gerencial** | `fondoune-gerencia.html` | Gerencia | Aprobación ejecutiva |
| 4️⃣ | **Firma y Desembolso** | `fondoune-firma-desembolso.html` | Asociado | Firmar pagaré y recibir fondos |

---

## 📂 Estructura del Proyecto

```
Creditos/
│
├── 📑 DOCUMENTACIÓN
│   └── DOCUMENTACION_COMPLETA.md        ← Este archivo (único)
│
├── 🔧 SISTEMA CORE (OBLIGATORIO)
│   ├── navigation.js                    ← Navegación centralizada
│   └── session.js                       ← Gestor de sesiones
│
├── 🏠 PORTALES PRINCIPALES
│   ├── index.html                       ← Inicio
│   ├── fondoune-portal.html             ← Solicitud (v2 mejorada)
│   ├── fondoune-dashboard-analista.html ← Analista (v2 mejorada)
│   ├── fondoune-gerencia.html           ← Gerencia (v2 mejorada)
│   └── fondoune-firma-desembolso.html   ← Firma (v2 mejorada)
│
├── 📚 MÓDULOS ALTERNATIVOS (Opcional)
│   ├── modulo1-portal.html
│   ├── modulo2-analista.html
│   ├── modulo3-gerencia.html
│   └── modulo4-firma.html
│
└── 🧪 EJEMPLOS (Opcional)
    ├── EJEMPLO_IMPLEMENTACION.html
    └── prototype/
```

---

## ⚙️ Instalación

### Paso 1: Verificar archivos en la raíz

Asegúrate de tener en la raíz del proyecto:
```
✅ navigation.js
✅ session.js
✅ Todos los portales HTML
```

### Paso 2: Agregar scripts a CADA portal HTML

En el `<head>` de cada archivo HTML, agrega estas líneas:

```html
<head>
  <!-- ... meta tags, title, estilos ... -->
  
  <!-- Importar sistemas de navegación -->
  <script src="navigation.js"></script>
  <script src="session.js"></script>
  
  <!-- ... más estilos si los hay ... -->
</head>
```

### Paso 3: Inicializar en cada portal

Al final del `<body>`, en cada HTML:

```html
<body>
  <!-- Tu contenido -->
  
  <script>
    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
      // Cambiar 'home' según el portal actual
      FondouneNav.init('home');           // En index.html
      FondouneNav.init('solicitud');      // En fondoune-portal.html
      FondouneNav.init('analista');       // En fondoune-dashboard-analista.html
      FondouneNav.init('gerencia');       // En fondoune-gerencia.html
      FondouneNav.init('firma');          // En fondoune-firma-desembolso.html
      
      // Mostrar notificaciones pendientes (si las hay)
      FondouneSession.showPendingNotifs();
    });
  </script>
</body>
```

---

## 🚀 Uso Básico

### 1. Iniciar sesión de usuario

```javascript
// En index.html o login
FondouneSession.initUser({
  id: '9869309',
  name: 'Carlos Andrés Gil',
  email: 'carlos.gil@une.net.co',
  role: 'asociado', // 'asociado', 'analista', 'gerencia', 'admin'
  initials: 'CA',
  empresa: 'FondoUne'
});
```

### 2. Guardar datos de solicitud

```javascript
// En fondoune-portal.html (portal de solicitud)
FondouneSession.saveCreditApp({
  monto: 8000000,
  plazo: 24,
  tipo: 'consumo',
  destino: 'gastos personales',
  tasa: 12.5
});
```

### 3. Recuperar datos en otro portal

```javascript
// En fondoune-firma-desembolso.html (portal de firma)
const solicitud = FondouneSession.getCreditApp();
console.log(solicitud.monto); // 8000000
```

### 4. Navegar a otro portal

```javascript
// Navegación simple
FondouneNav.navigateTo('firma');

// Navegación con datos
FondouneNav.navigateTo('firma', {
  solicitudId: 'SOL-2025-0847',
  aprobado: true
});
```

### 5. Mostrar notificaciones

```javascript
// Notificación inmediata
FondouneSession.showNotif('¡Solicitud guardada!', 'success');
FondouneSession.showNotif('Error al procesar', 'error');
FondouneSession.showNotif('Advertencia importante', 'warning');

// Notificación para el próximo portal (encolada)
FondouneSession.queueNotif('Aprobado por gerencia', 'success');
FondouneNav.navigateTo('firma');
// En firma se mostrará automáticamente
```

---

## 🔗 Sistema de Navegación

### Estructura de FondouneNav

```javascript
FondouneNav = {
  init(portalKey)                    // Inicializar portal
  navigateTo(portalKey, extraData)   // Navegar a otro portal
  updateUserInfo()                   // Actualizar datos usuario en barra
  toggleUserMenu()                   // Mostrar/ocultar menú usuario
  logout()                           // Cerrar sesión y volver a inicio
  PORTALES                           // Objeto con todos los portales
  ACCESO_ROL                         // Matriz de permisos por rol
  portalActual                       // Portal actual (getter)
}
```

### Control de Acceso por Rol

```javascript
ACCESO_ROL = {
  asociado:    ['home', 'solicitud', 'firma'],
  analista:    ['home', 'solicitud', 'analista', 'firma'],
  gerencia:    ['home', 'solicitud', 'analista', 'gerencia', 'firma'],
  jefe_credito:['home', 'solicitud', 'analista', 'gerencia', 'firma'],
  admin:       ['home', 'solicitud', 'analista', 'gerencia', 'firma', 'demo']
}
```

**Nota:** El menú se actualiza dinámicamente según el rol del usuario.

---

## 💾 Gestor de Sesiones

### Estructura de FondouneSession

```javascript
FondouneSession = {
  // Información del usuario
  initUser(userData)                 // Guardar usuario
  getUser()                          // Obtener usuario actual
  
  // Solicitud de crédito
  saveCreditApp(appData)             // Guardar solicitud
  getCreditApp()                     // Obtener solicitud
  
  // Datos de navegación
  saveNavData(data)                  // Guardar datos extras
  getNavData()                       // Obtener datos extras
  
  // Estado de portales
  savePortalState(key, value)        // Guardar estado
  getPortalState(key)                // Obtener estado
  
  // Notificaciones
  showNotif(message, type)           // Mostrar notificación inmediata
  queueNotif(message, type)          // Encolar notificación
  showPendingNotifs()                // Mostrar notificaciones encoladas
  
  // Limpieza
  logout(redirectUrl)                // Limpiar sesión
  clear()                            // Limpiar todo
}
```

### Tipos de Notificaciones

```javascript
// Éxito (verde)
FondouneSession.showNotif('Datos guardados', 'success');

// Error (rojo)
FondouneSession.showNotif('Error en el proceso', 'error');

// Advertencia (amarillo)
FondouneSession.showNotif('Revisa los datos', 'warning');

// Información (azul)
FondouneSession.showNotif('Proceso iniciado', 'info');
```

---

## 📌 Casos de Uso Reales

### Flujo Completo: De Solicitud a Firma

#### 1️⃣ En `index.html` (Inicio)

```html
<button onclick="iniciarSesion()" class="btn">Iniciar Sesión</button>

<script>
function iniciarSesion() {
  // Simular datos del usuario (en producción, vienen de backend)
  FondouneSession.initUser({
    id: '9869309',
    name: 'Carlos Andrés Gil',
    email: 'carlos.gil@une.net.co',
    role: 'asociado',
    initials: 'CA',
    empresa: 'FondoUne'
  });
  
  // Mostrar notificación
  FondouneSession.showNotif('¡Bienvenido Carlos!', 'success');
  
  // Navegar a solicitud
  setTimeout(() => {
    FondouneNav.navigateTo('solicitud');
  }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('home');
});
</script>
```

#### 2️⃣ En `fondoune-portal.html` (Solicitud)

```html
<form id="creditForm">
  <input id="f-monto" type="number" placeholder="Monto (ej: 8000000)">
  <input id="f-plazo" type="number" placeholder="Plazo en meses">
  <input id="f-tipo" type="text" placeholder="Tipo de crédito">
  <button type="button" onclick="guardarYContinuar()">Guardar y continuar →</button>
</form>

<script>
function guardarYContinuar() {
  // Validar datos
  const monto = document.getElementById('f-monto').value;
  const plazo = document.getElementById('f-plazo').value;
  const tipo = document.getElementById('f-tipo').value;
  
  if (!monto || !plazo || !tipo) {
    FondouneSession.showNotif('Por favor completa todos los campos', 'warning');
    return;
  }
  
  // Guardar solicitud
  FondouneSession.saveCreditApp({
    monto: parseInt(monto),
    plazo: parseInt(plazo),
    tipo: tipo,
    solicitudId: 'SOL-' + Date.now(),
    fecha: new Date().toISOString()
  });
  
  FondouneSession.showNotif('Solicitud guardada exitosamente', 'success');
  
  // Navegar a firma
  setTimeout(() => {
    FondouneNav.navigateTo('firma', {
      origen: 'solicitud',
      paso: 1
    });
  }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('solicitud');
  FondouneSession.showPendingNotifs();
});
</script>
```

#### 3️⃣ En `fondoune-firma-desembolso.html` (Firma)

```html
<div id="resumenSolicitud">
  <p>Monto: <span id="monto">—</span></p>
  <p>Plazo: <span id="plazo">—</span> meses</p>
  <p>Tipo: <span id="tipo">—</span></p>
</div>

<button onclick="firmarDigitalmente()">Firmar Digitalmente</button>

<script>
function firmarDigitalmente() {
  const solicitud = FondouneSession.getCreditApp();
  
  if (!solicitud) {
    FondouneSession.showNotif('No hay solicitud para firmar', 'error');
    return;
  }
  
  // Simular firma digital
  FondouneSession.showNotif('Procesando firma...', 'info');
  
  setTimeout(() => {
    FondouneSession.showNotif(
      `Crédito de $${solicitud.monto.toLocaleString()} aprobado`,
      'success'
    );
    
    // Guardar estado final
    FondouneSession.savePortalState('firma_completada', true);
  }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('firma');
  FondouneSession.showPendingNotifs();
  
  // Mostrar datos de la solicitud
  const solicitud = FondouneSession.getCreditApp();
  if (solicitud) {
    document.getElementById('monto').textContent = 
      '$' + solicitud.monto.toLocaleString();
    document.getElementById('plazo').textContent = solicitud.plazo;
    document.getElementById('tipo').textContent = solicitud.tipo;
  }
});
</script>
```

---

## ✨ Mejoras Implementadas

### v2.0 - Mejoras en Portales HTML

✅ **Validación de datos** en formularios  
✅ **Notificaciones mejoradas** con colores y iconos  
✅ **Recuperación de datos** al cargar portal  
✅ **Manejo de errores** robusto  
✅ **Botones de navegación** contextuales  
✅ **Estados guardados** entre navegaciones  
✅ **Confirmaciones antes de acciones** críticas  
✅ **Loading states** durante procesos asincronos  
✅ **Breadcrumbs** para navegar hacia atrás  
✅ **Resumen de datos** antes de firmar  

---

## 🔒 Seguridad

### ✅ Implementado

- ✅ Datos guardados en `sessionStorage` (se limpian al cerrar pestaña)
- ✅ Control de permisos por rol en navegación
- ✅ Validación de usuario antes de permitir acceso
- ✅ **NO se guardan contraseñas** en sesión
- ✅ Notificaciones no exponen datos sensibles

### 🔐 Buenas Prácticas

```javascript
// ✅ BIEN: Datos públicos
FondouneSession.saveCreditApp({
  monto: 8000000,
  plazo: 24
});

// ❌ MAL: Nunca guardes contraseñas
// FondouneSession.saveUser({
//   password: 'MiContraseña123'
// });

// ✅ BIEN: Token en sessionStorage solamente
// localStorage nunca para datos sensibles
```

### 🛡️ Control de Acceso

Los portales se filtran automáticamente por rol:

```javascript
// Si usuario es 'asociado'
// Solo ve: home, solicitud, firma

// Si usuario es 'analista'
// Solo ve: home, solicitud, analista, firma

// Si usuario es 'gerencia'
// Solo ve: home, solicitud, analista, gerencia, firma
```

---

## 🐛 Troubleshooting

### ❌ El menú no aparece

**Problema:** La barra de navegación no se ve en la página

**Soluciones:**
1. Verifica que `navigation.js` esté en la raíz
2. Verifica que hayas agregado el script en el `<head>`
3. Verifica que llamaste `FondouneNav.init()` en `DOMContentLoaded`
4. Abre la consola (F12) y busca errores

```javascript
// Debugging
console.log(FondouneNav);        // Debe mostrar el objeto
console.log(FondouneNav.portalActual); // Debe mostrar el portal actual
```

### ❌ Los datos no se guardan

**Problema:** Los datos no persisten entre portales

**Soluciones:**
1. Verifica que `session.js` esté en la raíz
2. Verifica que hayas llamado `saveCreditApp()` correctamente
3. Verifica el storage: `console.log(sessionStorage)`
4. No uses `localStorage` (se limpia al cerrar)

```javascript
// Verificar datos guardados
console.log(FondouneSession.getCreditApp());
console.log(FondouneSession.getUser());
```

### ❌ Las notificaciones no se muestran

**Problema:** No aparecen los mensajes de notificación

**Soluciones:**
1. Llama `showPendingNotifs()` al inicio de cada portal
2. Usa `queueNotif()` antes de navegar
3. Verifica que el tipo de notificación sea válido: 'success', 'error', 'warning', 'info'

```javascript
// Correcto
FondouneSession.queueNotif('Mensaje', 'success');
FondouneNav.navigateTo('firma');

// En firma, al cargar
FondouneSession.showPendingNotifs();
```

### ❌ No puedo acceder a un portal

**Problema:** El rol del usuario no tiene acceso

**Solución:** Verifica el rol y los permisos:

```javascript
const user = FondouneSession.getUser();
console.log('Rol:', user.role); // Muestra el rol
console.log('Acceso:', FondouneNav.ACCESO_ROL[user.role]); // Muestra portales permitidos
```

### ❌ Error en la consola: "FondouneNav is not defined"

**Solución:** El script `navigation.js` no se cargó correctamente

1. Verifica que el archivo exista en la raíz
2. Verifica que el `<script>` esté antes del código que lo usa
3. Verifica que no hay errores de sintaxis en `navigation.js`

---

## 🚀 Despliegue

### Opción 1: GitHub Pages (Gratuito)

```bash
# 1. Asegúrate de que tu repo sea público
# 2. Ve a Settings → Pages
# 3. Selecciona "Deploy from a branch"
# 4. Elige rama "main" y guarda
# 5. Tu sitio estará en: https://fondoune-portal.github.io/Creditos/
```

### Opción 2: Vercel (Recomendado)

```bash
# 1. Ve a https://vercel.com
# 2. Conecta tu repositorio de GitHub
# 3. Haz clic en "Deploy"
# 4. Tu sitio estará listo en segundos
```

### Opción 3: Firebase Hosting

```bash
# 1. Instala Firebase CLI
npm install -g firebase-tools

# 2. Inicia sesión
firebase login

# 3. Inicializa Firebase
firebase init

# 4. Despliega
firebase deploy
```

### Opción 4: Tu servidor personal

```bash
# Copia todos los archivos a tu servidor
# Asegúrate de que los scripts (navigation.js, session.js) estén en la raíz
# Abre index.html en el navegador
```

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa este documento** en la sección correspondiente
2. **Abre la consola** (F12) y busca errores
3. **Verifica los datos guardados**: `console.log(sessionStorage)`
4. **Crea un issue** en el repositorio con detalles del problema

---

## 📜 Licencia

Este proyecto es propiedad de FondoUne. Uso interno únicamente.

---

## 🎉 ¡Listo!

Tu sistema de intercomunicación está completamente funcional. 

**Próximos pasos:**
1. Prueba los portales en navegadores diferentes
2. Valida en dispositivos móviles
3. Integra con tu backend/base de datos
4. Despliega en producción

¿Preguntas? Consulta esta documentación o crea un issue en GitHub.
