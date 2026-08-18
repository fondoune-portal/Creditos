# 🚀 FondoUne - Portal de Crédito Inteligente

## Bienvenido

Este es el repositorio oficial del **Portal de Crédito Inteligente FondoUne**, una aplicación web de gestión de solicitudes de crédito para empleados.

### ¿Qué encontrarás aquí?

- ✅ **Portal Web Completo** - Solicitud, análisis, aprobación y desembolso de créditos
- ✅ **12 Líneas de Crédito** - Educativo, vivienda, vehículos, salud, y más
- ✅ **Control de Acceso por Roles** - Asociados, analistas, gerencia
- ✅ **Autenticación Segura** - Stytch + Firebase Auth
- ✅ **Generación de Documentos** - Pagarés en PDF

## 📂 Estructura del Proyecto

```
Creditos/
├── public/              ← Archivos HTML y activos estáticos
├── src/                 ← Código JavaScript modular
├── functions/           ← Cloud Functions Firebase
├── docs/                ← Documentación completa
├── tests/               ← Pruebas automatizadas
└── .github/workflows/   ← CI/CD GitHub Actions
```

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn
- Cuenta Firebase
- Token Stytch

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/fondoune-portal/Creditos.git
cd Creditos

# Instalar dependencias
npm run setup

# Crear archivo .env
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

### Build & Deploy

```bash
# Build producción
npm run build

# Deploy a Firebase
npm run deploy
```

## 📚 Documentación

- **[01-INSTALACION.md](01-INSTALACION.md)** - Guía detallada de instalación
- **[02-ARQUITECTURA.md](02-ARQUITECTURA.md)** - Detalles técnicos de la arquitectura
- **[03-FLUJO-CREDITICIO.md](03-FLUJO-CREDITICIO.md)** - Flujo de negocio completo
- **[04-API-REFERENCE.md](04-API-REFERENCE.md)** - Referencia de funciones
- **[05-SEGURIDAD.md](05-SEGURIDAD.md)** - Políticas de seguridad
- **[06-TESTING.md](06-TESTING.md)** - Guía de testing
- **[07-DEPLOYMENT.md](07-DEPLOYMENT.md)** - Despliegue en producción
- **[08-TROUBLESHOOTING.md](08-TROUBLESHOOTING.md)** - Problemas comunes
- **[09-CONTRIBUIR.md](09-CONTRIBUIR.md)** - Cómo contribuir al proyecto

## 🎯 Características Principales

### Módulos del Portal

1. **Inicio** (`index.html`) - Login seguro con Stytch
2. **Solicitud** (`portals/solicitud.html`) - Crear solicitudes de crédito
3. **Análisis** (`portals/analista.html`) - Revisar y validar solicitudes
4. **Gerencia** (`portals/gerencia.html`) - Aprobación ejecutiva
5. **Firma** (`portals/firma.html`) - Firmar pagaré y desembolsar

### Líneas de Crédito

- 💼 Educativo
- 🏠 Vivienda
- ❤️ Salud
- ⚡ CrediExpress
- 🚗 Vehículos
- ✈️ Vacacional
- 💳 Libre Inversión
- 🏛️ Creditributo
- 🤝 Solidario
- ⭐ Especial
- 📅 Crediprima

## 🔐 Seguridad

- Autenticación passwordless (OTP + Magic Link)
- Firebase Auth para manejo de sesiones
- Control de acceso por roles
- Validación backend de todos los datos
- Variables de entorno para credenciales

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

## 📊 Roles y Permisos

| Rol | Portales Accesibles |
|-----|---------------------|
| **Asociado** | Inicio, Solicitud, Firma |
| **Analista** | Inicio, Análisis |
| **Gerencia** | Inicio, Análisis, Gerencia |
| **Admin** | Todos |

## 🤝 Contribuir

Ver [09-CONTRIBUIR.md](09-CONTRIBUIR.md) para guía completa sobre cómo contribuir.

### Ramas principales

```
main/          ← Código estable (producción)
develop/       ← Integración de cambios
feature/*      ← Nuevas funcionalidades
bugfix/*       ← Correcciones de bugs
```

## 📞 Contacto & Soporte

- **Email:** support@fondoune.com
- **Issues:** https://github.com/fondoune-portal/Creditos/issues
- **Discussions:** https://github.com/fondoune-portal/Creditos/discussions

## 📜 Licencia

MIT - Ver LICENSE para más detalles

---

**v1.0.0** - Última actualización: Agosto 2026
