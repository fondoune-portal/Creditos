# FondoUne — Portal de Crédito Inteligente

> Plataforma digital moderna para solicitud, análisis y gestión de créditos con inteligencia artificial y verificación biométrica.

## 📋 Descripción del Proyecto

FondoUne es un portal de crédito completo construido con:
- **Frontend**: HTML5, CSS3 (Grid/Flexbox), JavaScript vanilla
- **Backend**: Node.js + Express (próximamente)
- **Base de datos**: Firebase Firestore
- **Autenticación**: Firebase Auth + biometría facial
- **IA**: Integración con Claude API para análisis de documentos
- **Seguridad**: TLS 1.3, cifrado AES-256, KYC/SARLAFT

## 🏗️ Arquitectura

```
fondoune-portal/
├── frontend/                    # Aplicación web del cliente
│   ├── assets/                 # Imágenes, iconos, fuentes
│   ├── css/                    # Estilos globales
│   ├── js/                     # Lógica de negocio
│   ├── modules/                # Módulos por funcionalidad
│   │   ├── identificacion/
│   │   ├── kyc/
│   │   ├── solicitud/
│   │   ├── validacion/
│   │   └── resultado/
│   └── index.html              # Punto de entrada
├── backend/                     # API REST (Node.js)
│   ├── config/                 # Configuración (env, DB, etc)
│   ├── controllers/            # Lógica de controladores
│   ├── models/                 # Esquemas de datos
│   ├── routes/                 # Rutas API
│   ├── middleware/             # Autenticación, validación
│   ├── services/               # Servicios (integración IA, etc)
│   ├── utils/                  # Utilidades
│   └── server.js               # Entry point
├── firebase/                    # Configuración Firebase
│   ├── firestore-rules.json   # Reglas de seguridad
│   └── functions/              # Cloud Functions (opcional)
├── docs/                        # Documentación
│   ├── API.md                  # Especificación API
│   ├── ARCHITECTURE.md         # Detalles arquitectura
│   ├── KYC-FLOW.md            # Flujo KYC completo
│   └── DEPLOYMENT.md           # Guía despliegue
├── tests/                       # Pruebas automatizadas
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example                # Variables de entorno
├── .gitignore                  # Archivos ignorados
├── package.json                # Dependencias Node
└── docker-compose.yml          # Orquestación (opcional)
```

## 🚀 Módulos del Sistema

### 1. **Módulo 1 - Identificación** (`fondoune-portal.html`)
Verificación inicial de identidad y acceso al portal.
- Validación de cédula y correo corporativo
- Verificación en base de datos interna
- Consentimientos iniciales

### 2. **Módulo 2 - Análisis Interno** (`fondoune-dashboard-analista.html`)
Dashboard para analistas de crédito.
- Lista de solicitudes filtradas
- Análisis detallado de cada solicitud
- Scoring automático y recomendaciones IA
- Auditoría y trazabilidad completa

### 3. **Módulo 3 - Gerencia** (`fondoune-gerencia.html`)
Panel ejecutivo para jefes de crédito.
- KPIs y métricas en tiempo real
- Cartera activa y alertas
- Desempeño de analistas
- Reversiones de decisiones

### 4. **Módulo 4 - Firma y Desembolso** (`fondoune-firma-desembolso.html`)
Firma electrónica del pagaré y procesamiento de desembolso.
- Firma manuscrita o tipografía
- Pagaré electrónico con validación legal
- Confirmación de desembolso

## 📁 Siguiente Paso: Crear Carpetas Base

Ahora vamos a:
1. ✅ **Crear estructura de carpetas**
2. **Organizar módulos HTML en carpetas**
3. **Crear archivos de configuración**
4. **Iniciar estructura backend**
5. **Configurar Firebase**

## 🔧 Tecnologías

| Layer | Tecnología | Propósito |
|-------|-----------|----------|
| Frontend | HTML5 + CSS3 + Vanilla JS | Interfaz de usuario |
| Backend | Node.js + Express | API REST |
| Base de Datos | Firebase Firestore | Datos en tiempo real |
| Auth | Firebase Auth | Autenticación y biometría |
| IA | Claude API | Análisis de documentos |
| Hosting | Firebase Hosting / Vercel | Despliegue |
| Monitoreo | Firebase Analytics | Seguimiento de uso |

## 📝 Convenciones

- **Commits**: `type: description` (feat, fix, docs, style, refactor)
- **Ramas**: `feature/nombre`, `bugfix/nombre`, `hotfix/nombre`
- **Código**: camelCase en JS, kebab-case en CSS
- **Comentarios**: Español con claridad técnica

## 📞 Contacto

Para dudas sobre la arquitectura o implementación, consultar la documentación en `/docs`.
