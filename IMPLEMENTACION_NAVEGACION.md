# 🔗 Guía de Intercomunicación entre Portales FondoUne

## 📋 Resumen

Se han creado **dos archivos JavaScript reutilizables** que permiten que tus 5 portales HTML se comuniquen de manera fluida y profesional:

1. **`navigation.js`** - Sistema centralizado de navegación
2. **`session.js`** - Gestor de sesiones y datos compartidos

---

## 🚀 Instalación Rápida

### Paso 1: Agregar los archivos JavaScript a tu proyecto

Ya están creados en la raíz:
```
Creditos/
├── navigation.js
├── session.js
└── [tus portales HTML]
```

### Paso 2: Importar los scripts en cada HTML

Agrega estas líneas al `<head>` de cada portal HTML (antes de cualquier script personalizado):

```html
<!-- En TODOS tus HTML -->
<script src="navigation.js"></script>
<script src="session.js"></script>
```

**Ejemplo en `index.html` (Inicio):**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>FondoUne — Portal de Crédito</title>
  <!-- ... otros estilos ... -->
  
  <!-- Importar sistemas de navegación -->
  <script src="navigation.js"></script>
  <script src="session.js"></script>
</head>
<body>
  <!-- Tu contenido -->
  
  <script>
    // Inicializar navegación al cargar
    document.addEventListener('DOMContentLoaded', () => {
      FondouneNav.init('home'); // 'home' = portal actual
    });
  </script>
</body>
</html>
```

---

## 💡 Uso Básico

### 1️⃣ Inicializar Navegación en cada Portal

```javascript
// En cada HTML, en el script de inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Parámetro: clave del portal actual
  FondouneNav.init('home');        // En index.html
  FondouneNav.init('solicitud');   // En fondoune-portal.html
  FondouneNav.init('analista');    // En fondoune-dashboard-analista.html
  FondouneNav.init('gerencia');    // En fondoune-gerencia.html
  FondouneNav.init('firma');       // En fondoune-firma-desembolso.html
});
```

**Resultado:** Se crea automáticamente una barra de navegación en la parte superior con botones para ir a cada portal.

### 2️⃣ Navegar entre Portales

**Opción A: Botón HTML simple**
```html
<a href="fondoune-portal.html">Ir a Solicitud</a>
```

**Opción B: Navegar con datos pasados**
```javascript
// Desde cualquier portal, navegar a otro pasando datos
FondouneNav.navigateTo('firma', {
  solicitudId: 'SOL-2025-0847',
  monto: 8000000,
  plazo: 24
});
```

### 3️⃣ Crear Botones de Navegación Dinámicos

```javascript
// Crear un botón de navegación rápida
const miBoton = FondouneNav.createButton('solicitud', {
  text: '📝 Nueva Solicitud',
  className: 'mi-boton-custom'
});

document.getElementById('contenedor').appendChild(miBoton);
```

---

## 📊 Gestor de Sesiones

### Guardar Información del Usuario

```javascript
// Cuando el usuario inicia sesión
FondouneSession.initUser({
  id: '9869309',
  name: 'Carlos Andrés Gil',
  email: 'carlos.gil@une.net.co',
  role: 'asociado', // o 'analista', 'gerencia'
  initials: 'CA'
});
```

### Recuperar Datos en Otro Portal

```javascript
// En cualquier otro portal
const usuario = FondouneSession.getUser();
console.log(usuario.name); // "Carlos Andrés Gil"
```

### Guardar Solicitud de Crédito

```javascript
// En el portal de solicitud
FondouneSession.saveCreditApp({
  monto: 8000000,
  plazo: 24,
  tipo: 'consumo',
  destino: 'gastos personales'
});

// En otro portal (ej: firma), recuperarlo
const solicitud = FondouneSession.getCreditApp();
console.log(solicitud.monto); // 8000000
```

### Pasar Datos Especiales entre Portales

```javascript
// Opción 1: Al navegar, pasar datos
FondouneNav.navigateTo('analista', {
  idSolicitud: 'SOL-2025-0847',
  usuarioId: '9869309'
});

// Opción 2: En el portal destino, recuperar
const datosNavegacion = FondouneSession.getNavData();
console.log(datosNavegacion.idSolicitud);
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Usuario completa solicitud y va a firmar

```html
<!-- En fondoune-portal.html (Portal de Crédito) -->
<button onclick="irAFirmar()">Ir a firmar pagaré →</button>

<script>
function irAFirmar() {
  // Guardar la solicitud
  FondouneSession.saveCreditApp({
    monto: document.getElementById('f-monto').value,
    plazo: document.getElementById('f-plazo').value,
    // ... otros datos
  });
  
  // Navegar al portal de firma
  FondouneNav.navigateTo('firma', {
    solicitudId: 'SOL-2025-0847',
    nuevoUsuario: false
  });
}
</script>
```

```html
<!-- En fondoune-firma-desembolso.html -->
<script>
document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('firma');
  
  // Recuperar datos de la solicitud anterior
  const solicitud = FondouneSession.getCreditApp();
  
  // Llenar el resumen del crédito
  document.getElementById('monto-aprobado').textContent = 
    '$' + solicitud.monto.toLocaleString('es-CO');
  
  document.getElementById('plazo-meses').textContent = 
    solicitud.plazo + ' meses';
});
</script>
```

### Caso 2: Analista revisa solicitud y agrega nota

```javascript
// En fondoune-dashboard-analista.html
function aprobarSolicitud(solicitudId, nota) {
  // Guardar estado
  FondouneSession.savePortalState('analista', {
    ultimaAccion: 'aprobacion',
    solicitudAprobada: solicitudId,
    nota: nota,
    hora: new Date().toISOString()
  });
  
  // Notificar
  FondouneSession.queueNotif(
    `Solicitud ${solicitudId} aprobada`,
    'success'
  );
  
  // Navegar a gerencia
  FondouneNav.navigateTo('gerencia', {
    solicitudAprobada: solicitudId
  });
}
```

### Caso 3: Mostrar notificaciones entre portales

```javascript
// En cualquier portal, al navegar
FondouneSession.queueNotif('Solicitud enviada exitosamente', 'success');
FondouneNav.navigateTo('firma');

// En el portal destino
document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('firma');
  
  // Mostrar notificaciones pendientes
  FondouneSession.showPendingNotifs();
});
```

---

## 🔑 Referencia Completa de Funciones

### Navigation.js

| Función | Parámetros | Descripción |
|---------|-----------|-------------|
| `FondouneNav.init(currentPortal)` | `string` | Inicializar menú en portal actual |
| `FondouneNav.navigateTo(portalKey, data)` | `string, object` | Navegar a otro portal con datos |
| `FondouneNav.createButton(portalKey, options)` | `string, object` | Crear botón de navegación dinámico |
| `FondouneNav.updateUserInfo()` | - | Actualizar info del usuario en menú |
| `FondouneNav.PORTALS` | - | Objeto con todos los portales configurados |

### Session.js

| Función | Parámetros | Descripción |
|---------|-----------|-------------|
| `FondouneSession.initUser(userData)` | `object` | Inicializar sesión de usuario |
| `FondouneSession.getUser()` | - | Obtener datos del usuario actual |
| `FondouneSession.setData(key, value)` | `string, any` | Guardar dato en sesión |
| `FondouneSession.getData(key, default)` | `string, any` | Obtener dato de sesión |
| `FondouneSession.saveCreditApp(data)` | `object` | Guardar solicitud de crédito |
| `FondouneSession.getCreditApp()` | - | Obtener solicitud de crédito guardada |
| `FondouneSession.queueNotif(msg, type)` | `string, string` | Encolar notificación para el próximo portal |
| `FondouneSession.showNotif(msg, type)` | `string, string` | Mostrar notificación inmediatamente |
| `FondouneSession.showPendingNotifs()` | - | Mostrar todas las notificaciones encoladas |
| `FondouneSession.clear()` | - | Limpiar toda la sesión |

---

## 📱 Portales Disponibles

```javascript
{
  home: 'index.html',           // Inicio
  solicitud: 'fondoune-portal.html',           // Nueva solicitud
  analista: 'fondoune-dashboard-analista.html', // Dashboard analista
  gerencia: 'fondoune-gerencia.html',           // Panel gerencial
  firma: 'fondoune-firma-desembolso.html'       // Firma y desembolso
}
```

---

## 🎨 Personalización

### Cambiar colores del menú

Edita en `navigation.js`, busca la sección de estilos:

```javascript
const styles = `
  <style id="fondoune-nav-styles">
    .fondoune-nav-menu {
      background: linear-gradient(135deg, #0B2545 0%, #134074 100%); /* Aquí */
      /* ... */
    }
    /* ... más estilos ... */
  </style>
`;
```

### Agregar más portales

En `navigation.js`, agrega una entrada al objeto `PORTALS`:

```javascript
const PORTALS = {
  // Portales existentes...
  
  nuevo_portal: {
    name: 'Mi Nuevo Portal',
    file: 'mi-nuevo-portal.html',
    icon: 'ti-star',
    description: 'Descripción',
    role: '*' // '*' para todos, o 'rol especifico'
  }
};
```

---

## ⚙️ Notas Técnicas

- **localStorage vs sessionStorage**: Se usa `sessionStorage` (se limpia al cerrar la pestaña)
- **Seguridad**: Los datos se guardan en el navegador, **no incluyas contraseñas o datos sensibles**
- **Tamaño límite**: ~5-10MB por dominio (suficiente para la mayoría de usos)
- **Compatibilidad**: Funciona en todos los navegadores modernos
- **Performance**: Carga < 10KB, sin dependencias externas

---

## 🧪 Ejemplo Completo de Implementación

### En `index.html`:

```html
<html>
<head>
  <script src="navigation.js"></script>
  <script src="session.js"></script>
</head>
<body>
  <h1>Bienvenido a FondoUne</h1>
  
  <button onclick="iniciarSesion()">Iniciar Sesión</button>
  
  <script>
    function iniciarSesion() {
      // Inicializar sesión
      FondouneSession.initUser({
        id: '1045678901',
        name: 'Carlos Andrés Gil',
        email: 'carlos@une.net.co',
        role: 'asociado',
        initials: 'CA'
      });
      
      // Mostrar notificación
      FondouneSession.showNotif('¡Bienvenido, Carlos!', 'success');
      
      // Inicializar navegación
      FondouneNav.init('home');
      
      // Navegar a solicitud con datos
      setTimeout(() => {
        FondouneNav.navigateTo('solicitud');
      }, 1500);
    }
  </script>
</body>
</html>
```

---

## 🆘 Solución de Problemas

**P: El menú no aparece**
- R: Verifica que `FondouneNav.init()` se llame después de que el DOM esté listo

**P: Los datos no se guardan entre portales**
- R: Usa `sessionStorage` directamente, no `localStorage` (se limpia al cerrar)

**P: Las notificaciones no se muestran**
- R: Llama a `FondouneSession.showPendingNotifs()` en el portal destino

---

## 📞 Soporte

Para preguntas o mejoras, contacta al equipo de desarrollo.

**¡Felicidades! Tus portales ahora están conectados correctamente.** 🎉
