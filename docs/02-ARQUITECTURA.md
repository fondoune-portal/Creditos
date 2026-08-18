# 🏗️ Arquitectura del Sistema

## Visión General

FondoUne es una **aplicación web monolítica modular** con separación clara entre:

- **Frontend** (Vanilla JS + HTML + CSS)
- **Backend** (Firebase Cloud Functions)
- **Base de Datos** (Firestore)
- **Autenticación** (Stytch + Firebase Auth)

## Estructura de Carpetas

```
Creditos/
│
├── 📁 public/                    ← Archivos servidos estáticamente
│   ├── index.html                (Login principal)
│   ├── login-staff.html          (Login staff)
│   ├── portals/
│   │   ├── solicitud.html        (Módulo 1: Solicitud)
│   │   ├── analista.html         (Módulo 2: Análisis)
│   │   ├── gerencia.html         (Módulo 3: Gerencia)
│   │   └── firma.html            (Módulo 4: Firma)
│   ├── assets/
│   │   ├── images/               (Logos, iconos)
│   │   ├── css/                  (Estilos globales)
│   │   └── fonts/                (Fuentes locales)
│   └── prototype/                (Versiones en desarrollo)
│
├── 📁 src/                       ← Código fuente modular
│   ├── core/
│   │   ├── navigation.js         (Sistema de navegación centralizado)
│   │   ├── session.js            (Gestor de sesiones)
│   │   ├── logger.js             (Sistema de logging)
│   │   └── creditos-config.js    (Catálogo de líneas de crédito)
│   │
│   ├── auth/
│   │   ├── stytch-auth.js        (Integración Stytch)
│   │   └── firebase-config.js    (Configuración Firebase)
│   │
│   ├── services/
│   │   ├── email-service.js      (Notificaciones por email)
│   │   ├── sheets-connector.js   (Sincronización Google Sheets)
│   │   ├── solicitudes-bridge.js (Puente a API externa)
│   │   └── security-validator.js (Validaciones de seguridad)
│   │
│   ├── modules/
│   │   ├── solicitud/
│   │   │   ├── solicitud.js
│   │   │   └── solicitud-form.js
│   │   ├── analista/
│   │   │   ├── analista.js
│   │   │   └── review-utils.js
│   │   ├── gerencia/
│   │   │   └── gerencia.js
│   │   └── firma/
│   │       ├── firma.js
│   │       └── pagare-generator.js
│   │
│   └── utils/
│       ├── helpers.js            (Utilidades generales)
│       ├── validators.js         (Validaciones reutilizables)
│       ├── formatters.js         (Formateo de datos)
│       └── crypto.js             (Encriptación básica)
│
├── 📁 functions/                 ← Firebase Cloud Functions
│   ├── index.js                  (Entry point)
│   ├── handlers/
│   │   ├── auth.js
│   │   ├── credit.js
│   │   └── notification.js
│   ├── middleware/
│   │   ├── auth-guard.js
│   │   └── validators.js
│   └── package.json
│
├── 📁 docs/                      ← Documentación
│   ├── 00-INICIO.md
│   ├── 01-INSTALACION.md
│   ├── 02-ARQUITECTURA.md
│   ├── 03-FLUJO-CREDITICIO.md
│   ├── 04-API-REFERENCE.md
│   ├── 05-SEGURIDAD.md
│   ├── 06-TESTING.md
│   ├── 07-DEPLOYMENT.md
│   ├── 08-TROUBLESHOOTING.md
│   └── 09-CONTRIBUIR.md
│
├── 📁 tests/                     ← Pruebas automatizadas
│   ├── unit/
│   │   ├── session.test.js
│   │   ├── validators.test.js
│   │   └── creditos-config.test.js
│   ├── integration/
│   │   ├── auth-flow.test.js
│   │   └── credit-flow.test.js
│   └── e2e/
│       └── full-credit-cycle.test.js
│
├── 📁 .github/                   ← GitHub Workflows
│   └── workflows/
│       ├── lint.yml
│       ├── test.yml
│       └── deploy.yml
│
├── 📋 Configuración
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── firebase.json
│   ├── .gitignore
│   ├── package.json
│   └── README.md
```

## Flujo de Datos

### 1. Autenticación

```
Usuario → index.html
  ↓
  Ingresa email
  ↓
Stytch envía OTP/Magic Link
  ↓
Usuario verifica
  ↓
stytch-auth.js recibe token Stytch
  ↓
Llama Cloud Function 'generarTokenFirebase'
  ↓
Functions genera custom token Firebase
  ↓
firebase.auth().signInWithCustomToken()
  ↓
FondouneSession.initUser() guarda rol
  ↓
Redirige según rol (solicitud, analista, gerencia, etc.)
```

### 2. Flujo de Solicitud de Crédito

```
Modulo 1 (Solicitud)
  ├─ Usuario llena formulario
  ├─ Valida con security-validator.js
  ├─ Calcula cuota con creditos-config.js
  ├─ FondouneSession.saveCreditApp()
  └─ FondouneNav.navigateTo('analista')
       ↓
  Modulo 2 (Analista)
  ├─ Carga datos con FondouneSession.getCreditApp()
  ├─ Revisa documentos
  ├─ Valida en backend (Cloud Functions)
  ├─ Aprueba/rechaza
  └─ FondouneNav.navigateTo('gerencia') o vuelve a solicitud
       ↓
  Modulo 3 (Gerencia)
  ├─ Aprobación nivel ejecutivo
  ├─ Registra decisión
  └─ FondouneNav.navigateTo('firma')
       ↓
  Modulo 4 (Firma)
  ├─ Genera pagaré PDF (pagare-generator.js)
  ├─ Usuario firma digitalmente
  ├─ Confirma desembolso
  └─ Solicitud completada ✅
```

## Componentes Clave

### Core System (navigation.js + session.js)

**navigation.js**
- Menú centralizado
- Guardia de rutas por rol
- Navegación entre módulos
- Control de acceso

**session.js**
- Almacena datos en sessionStorage
- Comparte datos entre portales
- Sistema de notificaciones
- Gestión de sesión

### creditos-config.js

```javascript
// Define 12 líneas de crédito con:
- Montos mín/máx
- Plazos
- Tasas por tramo
- Cálculo automático de cuotas
```

### Módulos HTML

Cada módulo (`solicitud.html`, `analista.html`, etc.) incluye:

```html
<script src="/src/core/navigation.js"></script>
<script src="/src/core/session.js"></script>
<script type="module" src="/src/modules/[nombre]/init.js"></script>

<script>
  FondouneNav.init('[nombre]');
</script>
```

## Capas de Seguridad

### Frontend
- Sanitización de inputs
- Validación básica
- Control de acceso por rol
- sessionStorage (se borra al cerrar)

### Backend (Cloud Functions)
- Verificación de token JWT
- Validación completa de datos
- Cálculo de tasas en backend
- Registro de auditoría
- Transacciones Firestore

### Base de Datos (Firestore)
- Reglas de seguridad por rol
- Encriptación en tránsito (HTTPS)
- Copias de seguridad automáticas

## Ventajas de esta Arquitectura

✅ **Modular** - Cada módulo es independiente
✅ **Escalable** - Fácil agregar nuevas líneas/módulos
✅ **Segura** - Validación en backend + frontend
✅ **Performante** - sessionStorage + caché local
✅ **Testing** - Código separado por responsabilidad
✅ **Mantenible** - Estructura clara y documentada

## Stack Tecnológico

| Layer | Tecnología |
|-------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) |
| **Build** | Vite |
| **Testing** | Vitest + jsdom |
| **Linting** | ESLint + Prettier |
| **Autenticación** | Stytch + Firebase Auth |
| **Base de Datos** | Firestore |
| **Backend** | Firebase Cloud Functions (Node.js 18) |
| **Hosting** | Firebase Hosting |
| **Analytics** | Firebase Analytics |
| **Logging** | Firebase Crashlytics |
