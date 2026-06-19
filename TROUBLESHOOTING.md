# 🔧 GUÍA DE TROUBLESHOOTING - Solución de Problemas

## 🚨 Problemas Comunes y Soluciones

---

## 1️⃣ El Menú de Navegación No Aparece

### ❌ Síntomas
- No ves la barra azul oscura en la parte superior
- Los portales se cargan pero sin menú

### ✅ Soluciones (en orden)

**1. Verificar que `navigation.js` esté en la raíz**
```bash
# Ubicación correcta:
/Creditos/navigation.js  ✅

# Ubicación INCORRECTA:
/Creditos/js/navigation.js  ❌
/Creditos/assets/navigation.js  ❌
```

**2. Verificar que esté importado en el HTML**
```html
<!-- En el <head> de TODOS los portales -->
<script src="navigation.js"></script>
<script src="session.js"></script>
```

**3. Verificar que `FondouneNav.init()` se llame correctamente**
```javascript
// ✅ CORRECTO - En el script del portal
document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('home'); // Cambiar según portal
});

// ❌ INCORRECTO - Sin esperar DOM
FondouneNav.init('home'); // Puede fallar
```

**4. Verificar la consola del navegador**
```javascript
// Abre las DevTools (F12) y mira la consola
// Deberías ver:
// ✅ FondoUne Navigation System loaded
// ✅ FondoUne Session Manager loaded
```

**5. Si aún no funciona:**
```javascript
// Abre la consola y ejecuta:
console.log(FondouneNav); // Debe mostrar un objeto

// Si no existe:
console.log(document.currentScript);  // Ver qué script se está ejecutando
```

---

## 2️⃣ Los Datos No Se Guardan Entre Portales

### ❌ Síntomas
- Guardas datos en un portal pero no aparecen en otro
- Las solicitudes se pierden al navegar

### ✅ Soluciones

**1. Verificar que `session.js` esté importado**
```html
<!-- En TODOS los HTML -->
<script src="session.js"></script>
```

**2. Usar MAYÚSCULAS en el nombre global**
```javascript
// ✅ CORRECTO
FondouneSession.setData('key', value);
FondouneSession.getData('key');

// ❌ INCORRECTO
fondouneSession.setData('key', value);  // Minúscula
session.setData('key', value);           // Nombre diferente
```

**3. Guardar en el portal correcto**
```javascript
// En fondoune-portal.html (Solicitud)
FondouneSession.saveCreditApp({
  monto: 5000000,
  plazo: 24
});

// En fondoune-firma-desembolso.html (Firma)
const app = FondouneSession.getCreditApp();
console.log(app); // Debe tener los datos
```

**4. Verificar que el navegador soporta sessionStorage**
```javascript
// En la consola:
console.log(typeof(Storage)); // Debe mostrar "object"

// Si muestra undefined, el navegador está en modo privado/incógnito
```

**5. Limpiar el sessionStorage**
```javascript
// En la consola:
sessionStorage.clear();

// Luego recarga la página y prueba nuevamente
```

---

## 3️⃣ Las Notificaciones No Se Muestran

### ❌ Síntomas
- No ves mensajes de éxito/error
- Las notificaciones encoladas no aparecen

### ✅ Soluciones

**1. Llamar `showPendingNotifs()` en el portal destino**
```javascript
// ✅ CORRECTO
document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('firma');
  FondouneSession.showPendingNotifs(); // IMPORTANTE
});

// ❌ INCORRECTO - Sin mostrar notificaciones encoladas
FondouneNav.init('firma');
```

**2. Verificar que el HTML tenga iconos de Tabler**
```html
<!-- Debe estar en el <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
```

**3. Usar el método correcto según el caso**
```javascript
// Para mostrar AHORA
FondouneSession.showNotif('Mensaje', 'success');

// Para mostrar al SIGUIENTE portal
FondouneSession.queueNotif('Mensaje', 'success');
FondouneNav.navigateTo('firma');

// En el siguiente portal
FondouneSession.showPendingNotifs();
```

**4. Tipos de notificación válidos**
```javascript
'success' // Verde - ✓
'error'   // Rojo - ✗
'warning' // Naranja - ⚠
'info'    // Azul - ℹ
```

---

## 4️⃣ El Control de Permisos No Funciona

### ❌ Síntomas
- Un usuario ve portales que no debería
- El menú muestra todas las opciones

### ✅ Soluciones

**1. Inicializar el usuario correctamente**
```javascript
// ✅ CORRECTO - En index.html o login
FondouneSession.initUser({
  id: '1045678901',
  name: 'Carlos Gil',
  email: 'carlos@une.net.co',
  role: 'asociado',  // ⭐ IMPORTANTE
  initials: 'CA'
});

// ❌ INCORRECTO - Sin role
FondouneSession.initUser({
  id: '1045678901',
  name: 'Carlos Gil'
  // role: 'asociado' ← FALTA
});
```

**2. Roles válidos**
```javascript
'asociado'  // Usuario normal - ve Solicitud, Firma
'analista'  // Revisor - ve Dashboard Analista
'gerencia'  // Ejecutivo - ve Panel Gerencial
'admin'     // Administrador - ve todo
'*'         // Cualquiera - para portales públicos
```

**3. Verificar que el rol esté guardado**
```javascript
// En la consola:
FondouneSession.getUser(); // Debe mostrar role
```

**4. Actualizar el menú después de cambiar rol**
```javascript
// Si cambias el rol dinámicamente:
FondouneSession.setData('userRole', 'gerencia');
FondouneNav.updateUserInfo(); // Actualizar menú
```

---

## 5️⃣ Error: "FondouneNav is not defined"

### ❌ Síntomas
```
Uncaught ReferenceError: FondouneNav is not defined
```

### ✅ Soluciones

**1. El script no se cargó**
```html
<!-- Verificar que esté en el HEAD -->
<head>
  <script src="navigation.js"></script> ✅
  <script src="session.js"></script>
</head>

<!-- O al final del BODY -->
<body>
  <!-- contenido -->
  <script src="navigation.js"></script> ✅
  <script src="session.js"></script>
</body>
```

**2. Ruta del archivo incorrecta**
```html
<!-- ✅ CORRECTO - Si navigation.js está en raíz -->
<script src="navigation.js"></script>

<!-- ✅ TAMBIÉN CORRECTO - Con ./ -->
<script src="./navigation.js"></script>

<!-- ❌ INCORRECTO - Ruta equivocada -->
<script src="/js/navigation.js"></script>
<script src="../navigation.js"></script>
```

**3. Ejecutar el script antes de que cargue el archivo**
```javascript
// ❌ INCORRECTO - Sin esperar a que cargue
<script>
  FondouneNav.init('home');
</script>
<script src="navigation.js"></script>

// ✅ CORRECTO - Importar primero
<script src="navigation.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    FondouneNav.init('home');
  });
</script>
```

---

## 6️⃣ Error: "Cannot read property 'init' of undefined"

### ❌ Síntomas
```
Uncaught TypeError: Cannot read property 'init' of undefined
```

### ✅ Soluciones

**1. El archivo `navigation.js` no se cargó**
- Ver solución anterior (#5)

**2. Esperar a que el DOM esté listo**
```javascript
// ❌ INCORRECTO - Muy rápido
FondouneNav.init('home');

// ✅ CORRECTO - Esperar
document.addEventListener('DOMContentLoaded', () => {
  FondouneNav.init('home');
});

// ✅ TAMBIÉN CORRECTO
window.addEventListener('load', () => {
  FondouneNav.init('home');
});
```

---

## 7️⃣ La Navegación es Lenta o no Responde

### ❌ Síntomas
- Los botones tardan en responder
- Las páginas se cargan lentamente

### ✅ Soluciones

**1. Verificar tamaño de los archivos**
```bash
# Los archivos no deben ser muy grandes
navigation.js: < 15 KB ✅
session.js:    < 10 KB ✅
HTML portales: < 70 KB ✅
```

**2. Minimizar en producción**
```html
<!-- En desarrollo: archivos completos -->
<script src="navigation.js"></script>

<!-- En producción: versiones minimizadas (si es posible) -->
<script src="navigation.min.js"></script>
```

**3. Lazy loading para imágenes pesadas**
```html
<img src="imagen.jpg" loading="lazy">
```

**4. Caché del navegador**
```html
<!-- Agregar meta tags para caché -->
<meta http-equiv="Cache-Control" content="max-age=3600">
```

---

## 8️⃣ Problemas en Mobile/Tablet

### ❌ Síntomas
- El menú se ve cortado en móvil
- Los botones son muy pequeños

### ✅ Soluciones

**1. Verificar viewport meta tag**
```html
<!-- En el <head> de TODOS los HTML -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**2. El menú es responsive por defecto**
```css
/* En mobile, el menú se ajusta automáticamente */
/* Los labels se ocultan y solo quedan los iconos */
```

**3. Probar en DevTools**
```javascript
// En Chrome/Firefox:
// 1. F12 para abrir DevTools
// 2. Presionar Ctrl+Shift+M (o ver menú)
// 3. Seleccionar dispositivo (iPhone, iPad, etc.)
// 4. Probar la navegación
```

---

## 9️⃣ Datos se pierden al actualizar la página

### ❌ Síntomas
- Refresco F5 borra todos los datos
- Los datos no persisten

### ✅ Soluciones

**1. Esto es NORMAL y por DISEÑO**
```javascript
// sessionStorage se limpia al cerrar la pestaña
// Si necesitas persistencia, cambiar a localStorage:

// ⚠️ ADVERTENCIA: No guardes datos sensibles en localStorage
localStorage.setItem('key', 'value');
```

**2. Si necesitas persistencia entre sesiones**
```javascript
// Opción 1: Usar localStorage (menos seguro)
localStorage.setItem('userPrefs', JSON.stringify(data));

// Opción 2: Usar Backend/Database (recomendado)
// Guardar en servidor cuando el usuario se loguea
```

**3. Información sensible**
```javascript
// ❌ NUNCA guardes en localStorage:
localStorage.setItem('password', '1234');        // ✗
localStorage.setItem('token', 'abc123...');     // ✗
localStorage.setItem('creditCard', '1234-5678'); // ✗

// ✅ SEGURO guardar en localStorage:
localStorage.setItem('theme', 'dark');           // ✓
localStorage.setItem('language', 'es');          // ✓
localStorage.setItem('lastVisit', '2026-05-25'); // ✓
```

---

## 🔟 Mi Navegador está en Modo Privado/Incógnito

### ❌ Síntomas
```
QuotaExceededError: sessionStorage is not available
```

### ✅ Soluciones

**1. El modo privado no permite sessionStorage**
- Desactivar modo incógnito/privado
- O usar otro navegador

**2. Agregar try-catch para robustez**
```javascript
try {
  sessionStorage.setItem('key', value);
} catch (e) {
  console.warn('sessionStorage no disponible');
  // Usar memoria en su lugar
}
```

---

## 📋 Checklist de Verificación

Usa esto para verificar que todo está bien:

```
[ ] navigation.js está en la raíz
[ ] session.js está en la raíz
[ ] Todos los HTML importan navigation.js
[ ] Todos los HTML importan session.js
[ ] FondouneNav.init() se llama en cada portal
[ ] El menú azul aparece en todos los portales
[ ] Puedo navegar entre portales
[ ] Los datos se guardan al navegar
[ ] Las notificaciones se muestran
[ ] El control de permisos funciona
[ ] Funciona en desktop
[ ] Funciona en tablet (768px)
[ ] Funciona en móvil (< 768px)
[ ] No hay errores en la consola
[ ] El navegador soporta sessionStorage
```

---

## 🆘 Si Nada de Esto Funciona

### Paso 1: Limpiar Todo
```javascript
// En la consola del navegador:
sessionStorage.clear();
location.reload();
```

### Paso 2: Verificar Archivos
```bash
# Desde terminal:
ls -la navigation.js  # Debe existir
ls -la session.js     # Debe existir
```

### Paso 3: Revisar Consola
```javascript
// F12 → Console
// Buscar errores 404 o de sintaxis
```

### Paso 4: Descargar Nuevamente
```bash
# Si los archivos están corruptos:
rm navigation.js session.js
# Descargar nuevamente del repositorio
```

### Paso 5: Contactar Soporte
- Email: support@fondoune.com
- Repository: https://github.com/fondoune-portal/Creditos/issues
- Incluir screenshot del error y navegador usado

---

## 📚 Recursos Útiles

| Herramienta | Uso |
|-------------|-----|
| **DevTools (F12)** | Debuggear errores |
| **Console** | Ver errores y logs |
| **Network** | Ver descargas de archivos |
| **Storage** | Ver sessionStorage/localStorage |
| **Responsive Design Mode (Ctrl+Shift+M)** | Probar en móvil |

---

## 🚀 Tips para Debugging Avanzado

```javascript
// Ver todo lo que se guarda en sesión
console.log(sessionStorage);

// Ver un dato específico
console.log(FondouneSession.getUser());

// Ver historia de navegación
console.log(window.history);

// Simular navegación
FondouneNav.navigateTo('firma', {test: true});

// Ver estado actual
console.log(FondouneNav.PORTALS);
```

---

## 📞 Contacto

¿Aún hay problemas? Contacta al equipo:

- **Email:** support@fondoune.com
- **Slack:** #fondoune-portal
- **Issues:** https://github.com/fondoune-portal/Creditos/issues
- **Wiki:** https://github.com/fondoune-portal/Creditos/wiki

---

## ✅ Última Verificación

Todos los pasos completados? Entonces tu sistema está **100% funcional** ✨

🎉 **¡Felicidades! Tu portal está listo para producción.**

