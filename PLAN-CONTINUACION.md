# 📋 Plan de Continuación - Reorganización FondoUne

## ✅ COMPLETADO (Fase 1)

### Configuración Base
- ✅ `firebase.json` - Configuración Firebase
- ✅ `.gitignore` - Archivos ignorados mejorados
- ✅ `.env.example` - Variables de entorno
- ✅ `package.json` - Gestor de dependencias
- ✅ `vite.config.js` - Build Vite
- ✅ `vitest.config.js` - Testing Vitest
- ✅ `.eslintrc.json` - Linting ESLint
- ✅ `.prettierrc` - Formatting Prettier

### Documentación
- ✅ `docs/00-INICIO.md` - Guía de bienvenida
- ✅ `docs/01-INSTALACION.md` - Instalación paso a paso
- ✅ `docs/02-ARQUITECTURA.md` - Arquitectura técnica
- ✅ `docs/03-FLUJO-CREDITICIO.md` - Flujo de crédito completo

---

## 📝 PRÓXIMAS TAREAS (Fase 2-4)

### Fase 2: GitHub Actions Workflows (CI/CD)

**Archivos a crear en `.github/workflows/`:**

#### `lint.yml` - Validación de código
```yaml
name: Lint & Format
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm install
      - run: npm run lint
      - run: npm run format -- --check
```

#### `test.yml` - Ejecución de tests
```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm install
      - run: npm run test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

#### `deploy.yml` - Despliegue automático
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_KEY }}
          channelId: live
          projectId: tu-proyecto-firebase
```

**Cómo crear:**
1. Ve a `.github/workflows/` en tu repo
2. Click "Add file" > "Create new file"
3. Copia el contenido YAML de cada archivo
4. Commit

---

### Fase 3: Documentación Adicional

**Archivos a crear en `docs/`:**

#### `04-API-REFERENCE.md`
Referencia de todas las funciones públicas:
- `FondouneNav.*`
- `FondouneSession.*`
- `FondouneCreditos.*`

#### `05-SEGURIDAD.md`
Políticas de seguridad y mejores prácticas

#### `06-TESTING.md`
Guía completa de testing y ejemplos

#### `07-DEPLOYMENT.md`
Pasos para desplegar en producción

#### `08-TROUBLESHOOTING.md`
Problemas comunes y soluciones

#### `09-CONTRIBUIR.md`
Guía para contribuidores

---

### Fase 4: Archivos Base en `src/`

**Estructura a crear:**

```
src/
├── core/
│   ├── logger.js          (NUEVO)
│   ├── navigation.js      (MOVER AQUÍ desde raíz)
│   ├── session.js         (MOVER AQUÍ desde raíz)
│   └── creditos-config.js (MOVER AQUÍ desde raíz)
│
├── auth/
│   ├── stytch-auth.js     (MOVER AQUÍ desde raíz)
│   └── firebase-config.js (MOVER AQUÍ desde raíz)
│
├── services/
│   ├── email-service.js       (MOVER AQUÍ desde raíz)
│   ├── sheets-connector.js    (MOVER AQUÍ desde raíz)
│   ├── solicitudes-bridge.js  (MOVER AQUÍ desde raíz)
│   └── security-validator.js  (MOVER AQUÍ desde raíz)
│
├── utils/
│   ├── helpers.js         (NUEVO)
│   ├── validators.js      (NUEVO)
│   ├── formatters.js      (NUEVO)
│   └── crypto.js          (NUEVO)
│
└── modules/
    ├── solicitud/
    │   ├── solicitud.js
    │   └── solicitud-form.js
    ├── analista/
    │   └── analista.js
    ├── gerencia/
    │   └── gerencia.js
    └── firma/
        ├── firma.js
        └── pagare-generator.js
```

---

### Fase 5: Estructura `public/`

**Reorganizar archivos HTML:**

```
public/
├── index.html                      (login principal - sin cambios)
├── login-staff.html                (login staff - sin cambios)
│
├── portals/
│   ├── solicitud.html              (modulo1-portal.html renombrado)
│   ├── analista.html               (modulo2-analista.html renombrado)
│   ├── gerencia.html               (modulo3-gerencia.html renombrado)
│   └── firma.html                  (modulo4-firma.html renombrado)
│
├── assets/
│   ├── images/
│   │   ├── logo-fondoune.png
│   │   ├── logo-icon.png
│   │   ├── favicon.ico
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── apple-touch-icon.png
│   │   └── icon-512.png
│   │
│   └── css/
│       └── base.css                (fondoune-shared.css renombrado)
│
└── prototype/                      (mantener como está)
```

---

### Fase 6: Pruebas Unitarias

**Archivos a crear en `tests/unit/`:**

#### `session.test.js`
```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FondouneSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('debe guardar datos de usuario', () => {
    FondouneSession.initUser({
      id: '123',
      name: 'Juan Pérez',
      role: 'asociado'
    });
    const user = FondouneSession.getUser();
    expect(user.name).toBe('Juan Pérez');
  });

  it('debe guardar solicitud de crédito', () => {
    FondouneSession.saveCreditApp({
      lineaId: 'educativo',
      monto: 2000000
    });
    const app = FondouneSession.getCreditApp();
    expect(app.monto).toBe(2000000);
  });
});
```

#### `creditos-config.test.js`
```javascript
import { describe, it, expect } from 'vitest';
import { FondouneCreditos } from '@/core/creditos-config.js';

describe('FondouneCreditos', () => {
  it('debe calcular tasa correcta según línea y plazo', () => {
    const tasa = FondouneCreditos.getTasaEA('educativo', 12);
    expect(tasa).toBe(13.73);
  });

  it('debe calcular cuota con sistema francés', () => {
    const cuota = FondouneCreditos.calcularCuota(1000000, 12, 13.73);
    expect(cuota).toBeGreaterThan(0);
  });

  it('debe rechazar montos menores al mínimo', () => {
    const resultado = FondouneCreditos.simularCredito('educativo', 100000, 12);
    expect(resultado).toBeNull();
  });
});
```

#### `validators.test.js`
```javascript
import { describe, it, expect } from 'vitest';
import { validateEmail, validateCedula } from '@/utils/validators.js';

describe('Validators', () => {
  it('debe validar email correctamente', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('debe validar cédula colombiana', () => {
    expect(validateCedula('12345678')).toBe(true);
    expect(validateCedula('123')).toBe(false);
  });
});
```

---

## 🎯 Resumen Tareas

| Fase | Tarea | Estado | Prioridad |
|------|-------|--------|-----------|
| 1 | Configuración base | ✅ DONE | P1 |
| 1 | Documentación inicial | ✅ DONE | P1 |
| 2 | GitHub Actions workflows | ⏳ TODO | P1 |
| 3 | Documentación completa | ⏳ TODO | P2 |
| 4 | Archivos src/ modularizados | ⏳ TODO | P1 |
| 5 | Reorganizar public/ | ⏳ TODO | P1 |
| 6 | Tests unitarios | ⏳ TODO | P2 |
| 7 | Tests integración | ⏳ TODO | P3 |
| 8 | Hacer PR a main | ⏳ TODO | P1 |

---

## 📌 Próximo Paso Recomendado

**Opción A (Recomendado):** Crear los workflows en `.github/workflows/`
- Configurar CI/CD
- Validación automática en PRs

**Opción B:** Crear documentación restante en `docs/`
- Completar guías
- Referencias API

**Opción C:** Empezar modularización en `src/`
- Crear estructura base
- Mover archivos existentes

¿Cuál prefieres que hagamos primero? 🚀
