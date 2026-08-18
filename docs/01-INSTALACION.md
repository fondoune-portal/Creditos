# 📦 Guía de Instalación

## Requisitos Previos

- **Node.js** 18.0.0 o superior
- **npm** 9.0.0 o superior (o yarn)
- **Git** instalado
- **Cuenta Firebase** con proyecto activo
- **Token Stytch** para autenticación

## Paso 1: Clonar el Repositorio

```bash
# Clonar con HTTPS
git clone https://github.com/fondoune-portal/Creditos.git

# O con SSH
git clone git@github.com:fondoune-portal/Creditos.git

cd Creditos
```

## Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias (root + functions)
npm run setup

# O manualmente:
npm install
cd functions && npm install && cd ..
```

## Paso 3: Configurar Variables de Entorno

### Crear archivo .env

```bash
cp .env.example .env
```

### Completar las variables

Edita `.env` con tus credenciales:

```bash
# Firebase
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id

# Stytch
VITE_STYTCH_PUBLIC_TOKEN=tu_stytch_token

# Google Sheets (opcional)
VITE_GOOGLE_SHEETS_API_KEY=tu_sheets_key

# Entorno
VITE_ENVIRONMENT=development
VITE_API_BASE_URL=http://localhost:5000
VITE_LOG_LEVEL=debug
```

## Paso 4: Configurar Firebase

### A. Crear proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea nuevo proyecto o usa uno existente
3. Habilita:
   - ✅ Authentication (Email/Password + Custom Token)
   - ✅ Firestore Database
   - ✅ Cloud Functions
   - ✅ Cloud Storage
   - ✅ Hosting

### B. Descargar credenciales

1. Proyecto → Configuración → Descargar JSON privado
2. Guardar en `functions/serviceAccountKey.json` (NO compartir)

### C. Configurar Firebase CLI

```bash
# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Autenticarse
firebase login

# Configurar proyecto
firebase init
```

## Paso 5: Configurar Stytch

1. Ve a [Stytch Dashboard](https://dashboard.stytch.com)
2. Crea aplicación o usa existente
3. Copia el **Public Token**
4. Pega en `.env` como `VITE_STYTCH_PUBLIC_TOKEN`

## Paso 6: Ejecutar en Desarrollo

```bash
# Terminal 1: Frontend
npm run dev

# Se abrirá en http://localhost:5173
```

## Paso 7: Verificar Instalación

✅ Verificar que:

- [ ] Frontend carga en `http://localhost:5173`
- [ ] Página de login se muestra
- [ ] Console no tiene errores
- [ ] FireBase se conecta correctamente
- [ ] Stytch UI funciona

## Build para Producción

```bash
# Build
npm run build

# Output en /dist

# Deploy a Firebase
npm run deploy:hosting
```

## Troubleshooting

### Error: "Cannot find module 'vite'"
```bash
npm install
```

### Error: "Firebase no está disponible"
- Verificar que `firebase-config.js` está cargado
- Verificar variables `.env`

### Error: "Stytch token inválido"
- Verificar `VITE_STYTCH_PUBLIC_TOKEN` en `.env`
- Verificar que está en Stytch Dashboard

### Puerto 5173 ya en uso
```bash
npm run dev -- --port 3000
```

## Scripts Disponibles

```bash
npm run dev              # Desarrollo con Vite
npm run build            # Build producción
npm run preview          # Preview build localmente
npm run lint             # Validar código con ESLint
npm run format           # Formatear con Prettier
npm run test             # Ejecutar tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Ver cobertura
npm run deploy           # Deploy completo
npm run deploy:hosting   # Solo hosting
npm run deploy:functions # Solo Cloud Functions
```

## Próximos Pasos

1. Leer [02-ARQUITECTURA.md](02-ARQUITECTURA.md)
2. Explorar estructura en `public/` y `src/`
3. Ejecutar tests: `npm test`
4. Ver [03-FLUJO-CREDITICIO.md](03-FLUJO-CREDITICIO.md) para entender el flujo
