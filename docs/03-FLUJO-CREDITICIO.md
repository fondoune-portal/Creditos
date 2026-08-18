# 📊 Flujo de Crédito Completo

## Resumen

El proceso de crédito en FondoUne consta de **5 etapas principales**:

1. **Solicitud** - Asociado solicita crédito
2. **Análisis** - Analista revisa documentos
3. **Gerencia** - Gerente aprueba
4. **Firma** - Firmar pagaré
5. **Desembolso** - Dinero acreditado

## Etapa 1: Solicitud (Módulo 1)

### Acceso
- **Rol:** Asociado
- **URL:** `/portals/solicitud.html`
- **Archivo:** `src/modules/solicitud/solicitud.js`

### Acciones

```
┌─────────────────────────────────────────┐
│ FORMULARIO DE SOLICITUD                 │
├─────────────────────────────────────────┤
│ □ Línea de crédito (select)             │
│ □ Monto solicitado                      │
│ □ Plazo (meses)                         │
│ □ Destinación                           │
│ □ Datos personales                      │
│ □ Comprobante ingresos                  │
│ □ Documentos (DNI, RUT)                 │
└─────────────────────────────────────────┘
      ↓
  VALIDACIÓN
  ├─ security-validator.js
  ├─ Monto mín/máx según línea
  ├─ Plazo válido
  ├─ Documentos completos
  └─ Datos consistentes
      ↓
  CÁLCULO
  ├─ creditos-config.js
  ├─ Tasa EA según línea y plazo
  ├─ Cuota mensual (sistema francés)
  ├─ Total a pagar
  └─ % compromiso (capacidad)
      ↓
  ALMACENAMIENTO
  └─ FondouneSession.saveCreditApp()
      ↓
  NOTIFICACIÓN
  ├─ Usuario: "Solicitud guardada"
  └─ Analista: "Nueva solicitud pendiente"
```

### Datos Guardados

```javascript
FondouneSession.getCreditApp() = {
  lineaId: 'educativo',
  monto: 2000000,
  plazo: 24,
  tasaEA: 14.91,
  cuota: 97500,
  totalPagar: 2340000,
  documentos: {
    comprobante_ingresos: File,
    dni: File,
    rut: File
  },
  estado: 'pendiente_analisis',
  fechaSolicitud: '2026-08-18T20:15:00Z',
  userId: 'user_123'
}
```

## Etapa 2: Análisis (Módulo 2)

### Acceso
- **Rol:** Analista
- **URL:** `/portals/analista.html`
- **Archivo:** `src/modules/analista/analista.js`

### Dashboard del Analista

```
┌──────────────────────────────────────────┐
│ SOLICITUDES PENDIENTES                   │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │ Asociado: Juan Pérez                 │ │
│ │ Línea: Educativo                     │ │
│ │ Monto: $2.000.000                    │ │
│ │ Estado: 🟡 Pendiente análisis        │ │
│ │ [VER DETALLES] [APROBAR] [RECHAZAR]  │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ ...más solicitudes...                │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Proceso de Análisis

```
1. REVISIÓN DE DOCUMENTOS
   ├─ Comprobante de ingresos
   ├─ DNI/Cédula
   ├─ RUT (si existe)
   └─ Documentos específicos de la línea

2. VALIDACIÓN FINANCIERA
   ├─ Capacidad de pago
   │  └─ (Cuota ÷ Ingresos netos) × 100 ≤ 35%
   ├─ Historial crediticio
   ├─ Otras deudas en el sistema
   └─ Scoring automático

3. DECISIÓN
   ├─ APROBADO ✅
   │  └─ Pasa a Gerencia
   ├─ RECHAZADO ❌
   │  └─ Devuelve a Solicitud
   └─ CONDICIONADO ⚠️
      └─ Pide información adicional

4. REGISTRO
   └─ Guarda decisión con comentarios
```

### Validación Automática

```javascript
// security-validator.js
const validar = (solicitud) => {
  // Monto
  if (solicitud.monto < linea.montoMin) {
    return { ok: false, error: 'Monto menor al mínimo' };
  }
  
  // Capacidad
  const cuota = solicitud.cuota;
  const ingresoNeto = solicitud.ingresoNeto;
  const porcentaje = (cuota / ingresoNeto) * 100;
  
  if (porcentaje > 35) {
    return { ok: false, error: 'Capacidad insuficiente' };
  }
  
  // Documentos
  if (!solicitud.documentos.comprobante_ingresos) {
    return { ok: false, error: 'Falta comprobante de ingresos' };
  }
  
  return { ok: true };
};
```

## Etapa 3: Gerencia (Módulo 3)

### Acceso
- **Rol:** Gerencia, Jefe de Crédito
- **URL:** `/portals/gerencia.html`
- **Archivo:** `src/modules/gerencia/gerencia.js`

### Panel Ejecutivo

```
┌────────────────────────────────────────┐
│ PANEL DE APROBACIONES EJECUTIVAS       │
├────────────────────────────────────────┤
│ SOLICITUDES APROBADAS POR ANALISTA     │
│                                        │
│ Resumen:                               │
│ • Pendientes: 3                        │
│ • Monto total: $8.500.000              │
│ • Tasa promedio: 14.91% E.A.           │
├────────────────────────────────────────┤
│ 1. Juan Pérez - Educativo              │
│    Monto: $2.000.000                   │
│    Análisis: ✅ APROBADO               │
│    [APROBAR] [RECHAZAR] [COMENTARIOS]  │
├────────────────────────────────────────┤
│ 2. María García - Vivienda             │
│    Monto: $35.000.000                  │
│    Análisis: ✅ APROBADO               │
│    [APROBAR] [RECHAZAR] [COMENTARIOS]  │
└────────────────────────────────────────┘
```

### Flujo de Aprobación

```
1. VER SOLICITUD
   ├─ Detalles del asociado
   ├─ Línea de crédito
   ├─ Montos y términos
   ├─ Análisis del analista
   ├─ Documentación
   └─ Recomendación final

2. REVISAR LIMITANTES
   ├─ Límite de línea del fondo
   ├─ Cupo disponible
   ├─ Concentración de riesgo
   └─ Políticas del fondo

3. TOMAR DECISIÓN
   ├─ APROBAR FINALMENTE ✅
   │  └─ Pasa a Firma
   ├─ RECHAZAR ❌
   │  └─ Cierra solicitud
   └─ MODIFICAR ⚙️
      └─ Cambia términos (monto, plazo)

4. GUARDAR DECISIÓN
   └─ FondouneSession.saveDecision()
```

## Etapa 4: Firma (Módulo 4)

### Acceso
- **Rol:** Asociado (después de aprobaciones)
- **URL:** `/portals/firma.html`
- **Archivo:** `src/modules/firma/firma.js`

### Generación de Pagaré

```
1. RECUPERAR DATOS
   └─ FondouneSession.getCreditApp()

2. GENERAR DOCUMENTO PDF
   ├─ pagare-generator.js
   ├─ Datos del asociado
   ├─ Términos del crédito
   ├─ Tasas y plazos
   ├─ Tabla de amortización
   └─ Espacio para firma

3. MOSTRAR PAGARÉ
   ├─ Vista previa en pantalla
   ├─ Botón descargar PDF
   └─ Botón para firmar digitalmente

4. FIRMA DIGITAL
   ├─ Integración con sistema de firma
   ├─ OTP de confirmación
   └─ Marca de tiempo

5. DESEMBOLSO
   ├─ Sistema calcula fecha desembolso
   ├─ Transfiere dinero a cuenta
   ├─ Genera comprobante
   └─ Notifica al usuario
```

### Estructura del Pagaré PDF

```
╔════════════════════════════════════════╗
║          PAGARÉ - FondoUne             ║
╠════════════════════════════════════════╣
║ DATOS DEL DEUDOR                       ║
║ • Nombre: Juan Pérez                   ║
║ • Cédula: 1234567890                   ║
║ • Empresa: Empresa ABC                 ║
╠════════════════════════════════════════╣
║ TÉRMINOS DEL CRÉDITO                   ║
║ • Línea: Educativo                     ║
║ • Monto: $2.000.000                    ║
║ • Plazo: 24 meses                      ║
║ • Tasa: 14.91% E.A.                    ║
║ • Cuota: $97.500                       ║
║ • Total a pagar: $2.340.000            ║
╠════════════════════════════════════════╣
║ CRONOGRAMA DE PAGOS                    ║
║ Mes 1: $97.500 (capital + intereses)   ║
║ Mes 2: $97.500                         ║
║ ... (24 cuotas)                        ║
╠════════════════════════════════════════╣
║ FIRMA Y ACEPTACIÓN                     ║
║ Firma del deudor: ___________________  ║
║ Fecha: _______________________________ ║
║ Testigos: ____________________________ ║
╚════════════════════════════════════════╝
```

## Etapa 5: Desembolso

### Proceso Automático

```
1. VALIDACIÓN FINAL
   ├─ Pagaré firmado ✅
   ├─ Documentos completos ✅
   ├─ Análisis aprobado ✅
   └─ Gerencia aprobó ✅

2. TRANSFERENCIA BANCARIA
   ├─ Obtiene cuenta del asociado
   ├─ Valida IBAN/Número cuenta
   ├─ Ejecuta transferencia
   └─ Registra en Firestore

3. CONFIRMACIÓN
   ├─ Email: "Crédito desembolsado"
   ├─ SMS: "$2.000.000 acreditado"
   └─ Portal: Estado = ACTIVO

4. AUDITORÍA
   ├─ Log en Cloud Functions
   ├─ Registro en Firestore
   ├─ Notificación al fondo
   └─ Analytics

5. CICLO DE COBRO
   ├─ Sistema genera cuota 1
   ├─ Notifica 3 días antes
   ├─ Descuenta nómina
   └─ Registra pago
```

## Estados de Solicitud

```
┌─────────────────────────────────────────┐
│ ESTADOS DEL CICLO DE VIDA               │
├─────────────────────────────────────────┤
│ 1. 🟡 Pendiente Análisis                │
│    └─ Usuario: Espera revisi√≥n         │
│                                         │
│ 2. 🟡 En Análisis                       │
│    └─ Analista: Revisa documentos       │
│                                         │
│ 3. 🔴 Rechazado (Análisis)              │
│    └─ Fin: Puede reintentar            │
│                                         │
│ 4. 🟡 Pendiente Gerencia                │
│    └─ Gerencia: Aprobación ejecutiva    │
│                                         │
│ 5. 🔴 Rechazado (Gerencia)              │
│    └─ Fin: Cierra solicitud             │
│                                         │
│ 6. 🟢 Aprobado                          │
│    └─ Pasa a Firma                      │
│                                         │
│ 7. 🟡 En Firma                          │
│    └─ Usuario: Firma pagaré             │
│                                         │
│ 8. 🟢 Listo para Desembolso             │
│    └─ Sistema: Transfiere dinero        │
│                                         │
│ 9. 🟢 ACTIVO                            │
│    └─ Fin: Crédito activo, en cobro    │
│                                         │
│ 10. 🟣 PAGADO                           │
│     └─ Fin: Todas las cuotas cobradas   │
│                                         │
│ 11. 🟣 CANCELADO                        │
│     └─ Fin: Usuario pagó anticipado    │
└─────────────────────────────────────────┘
```

## Notificaciones por Etapa

```
Solicitud:
• Asociado: "Solicitud enviada a análisis"
• Analista: "Nueva solicitud para revisar"

Análisis:
• Asociado: "Solicitud en revisión..."
• Gerencia: "Solicitud lista para aprobación"

Gerencia:
• Asociado: "Crédito aprobado ✅"
• Sistema: "Solicitud aprobada, pasa a firma"

Firma:
• Asociado: "Pagaré listo para firmar"
• Sistema: "Pagaré descargable"

Desembolso:
• Asociado: "💰 Dinero acreditado"
• Fondo: "Desembolso ejecutado"
```

## Flujo Visual Completo

```
┌──────────────────────────────────────────────────────┐
│ ASOCIADO                                             │
│ ┌─────────────────────────────────┐                 │
│ │ Llenar solicitud + subir docs   │                 │
│ └─────────────────────────────────┘                 │
│            │                                         │
│            ├─→ FondouneSession.saveCreditApp()      │
│            └─→ notification: "Enviada a análisis"   │
│                                                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ ANALISTA                                             │
│ ┌─────────────────────────────────┐                 │
│ │ Revisar docs + validar finanzas │                 │
│ └─────────────────────────────────┘                 │
│            │                                         │
│         APROBADO ✅                                  │
│            │                                         │
│            └─→ Pasa a Gerencia                      │
│                                                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ GERENCIA                                             │
│ ┌─────────────────────────────────┐                 │
│ │ Revisar análisis + aprobar      │                 │
│ └─────────────────────────────────┘                 │
│            │                                         │
│         APROBADO ✅                                  │
│            │                                         │
│            └─→ Notif: "Crédito aprobado"           │
│                                                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ ASOCIADO - FIRMA                                     │
│ ┌─────────────────────────────────┐                 │
│ │ Descargar pagaré + firmar       │                 │
│ └─────────────────────────────────┘                 │
│            │                                         │
│            ├─→ pagare-generator.js                  │
│            └─→ Firma digital + OTP                  │
│                                                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ SISTEMA - DESEMBOLSO                                 │
│ ┌─────────────────────────────────┐                 │
│ │ Validar pagaré + transferencia  │                 │
│ └─────────────────────────────────┘                 │
│            │                                         │
│            ├─→ 💰 Dinero acreditado                 │
│            ├─→ Estado: ACTIVO                       │
│            └─→ Inicia ciclo de cobro                │
│                                                      │
└──────────────────────────────────────────────────────┘
```
