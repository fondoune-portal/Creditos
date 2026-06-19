# FondoUne — Portal de Crédito Inteligente

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

## 📞 Contacto

Para dudas sobre la arquitectura o implementación, consultar la documentación en `/docs`.
