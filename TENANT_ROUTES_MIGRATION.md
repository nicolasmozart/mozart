# Sistema de Tenants con Rutas Dinámicas

## Cambios Implementados

### 🎯 Objetivo
Cambiar de un sistema basado en subdominios (ej: `prueba.localhost`) a un sistema basado en rutas (ej: `localhost:5173/prueba/tenant/login`) donde el primer segmento de la ruta identifique el tenant.

### 🔧 Cambios Realizados

#### Frontend (React)

1. **App.tsx**
   - Modificado el enrutamiento para usar rutas dinámicas `/:tenant`
   - Creado componente `TenantRoute` para manejar rutas de tenant
   - Actualizadas todas las rutas de tenant para usar el parámetro dinámico

2. **TenantContext.tsx**
   - Agregado `useParams` para capturar el tenant desde la URL
   - Modificada la función `detectTenant` para extraer el tenant de los parámetros de ruta
   - Agregado fallback para extraer manualmente el tenant de la URL si `useParams` no funciona
   - Actualizado el `useEffect` para re-ejecutar cuando cambie el tenant en la URL

3. **api.ts**
   - Agregada función `getTenantFromUrl()` para extraer el tenant desde la URL
   - Modificado el interceptor de requests para incluir automáticamente el header `X-Tenant`
   - El tenant se extrae de la primera parte de la ruta de la URL

4. **TenantLogin.tsx**
   - Actualizada la redirección post-login para usar rutas dinámicas
   - Ahora redirige a `/${tenant.domain}/dashboard` en lugar de `/tenant/dashboard`

5. **TenantLayout.tsx**
   - Actualizada la función `handleLogout` para usar rutas dinámicas
   - Modificadas todas las rutas de navegación para incluir el dominio del tenant
   - Agregada verificación de null para el tenant

6. **TenantDashboard.tsx**
   - Agregados logs de debug para verificar la detección del tenant
   - Agregada información de debug en la interfaz

#### Backend (Node.js/Express)

1. **tenantDetection.ts**
   - Agregada detección del tenant desde la primera parte de la ruta
   - Reordenadas las prioridades de detección:
     1. Header `X-Tenant` (prioridad más alta)
     2. Subdominio local
     3. Query parameter
     4. Primera parte de la ruta (nuevo método)
   - Agregada validación para evitar conflictos con rutas del superadmin

2. **index.ts**
   - Agregada nueva ruta dinámica `/:tenant` que captura el tenant desde la URL
   - Configurado middleware para remover el segmento del tenant de la URL interna
   - Mantenida compatibilidad con rutas legacy `/tenant`

### 🚀 Cómo Funciona

#### Antes (Subdominios)
```
prueba.localhost:5173/tenant/login
cemdi.localhost:5173/tenant/dashboard
```

#### Ahora (Rutas Dinámicas)
```
localhost:5173/prueba/tenant/login
localhost:5173/cemdi/tenant/dashboard
localhost:5173/cemdi/dashboard
```

### 🔍 Detección del Tenant

El sistema ahora detecta el tenant en el siguiente orden de prioridad:

1. **Header `X-Tenant`**: Enviado automáticamente por el interceptor de axios
2. **Subdominio**: Para compatibilidad con el sistema anterior
3. **Query parameter**: `?tenant=nombre`
4. **Primera parte de la ruta**: Extraído de `window.location.pathname.split('/')[1]`

### 📝 Ejemplos de Uso

#### URLs de Acceso
- `localhost:5173/prueba` → Redirige a login del tenant "prueba"
- `localhost:5173/cemdi/login` → Login del tenant "cemdi"
- `localhost:5173/hospital/dashboard` → Dashboard del tenant "hospital"

#### Navegación Interna
- `/${tenant.domain}/dashboard` → Dashboard del tenant
- `/${tenant.domain}/patients` → Gestión de pacientes
- `/${tenant.domain}/doctor/dashboard` → Dashboard de doctor

### 🔧 Configuración

#### Variables de Entorno
```env
VITE_BACKEND_URL=http://localhost:4000
```

#### Base de Datos
El sistema busca tenants en la colección `clients` con:
- `domain`: Coincide con el primer segmento de la URL
- `isActive: true`

### 🧪 Testing

Para probar el sistema:

1. **Crear un tenant de prueba en la base de datos:**
```javascript
{
  name: "Hospital de Prueba",
  domain: "prueba",
  isActive: true,
  features: {
    agendamiento: true,
    cuidadorDigital: false,
    telemedicina: true,
    reportes: false
  }
}
```

2. **Acceder a la aplicación:**
   - `localhost:5173/prueba` → Debería mostrar el login del tenant
   - `localhost:5173/prueba/dashboard` → Debería mostrar el dashboard

3. **Verificar en la consola del navegador:**
   - Logs de detección del tenant
   - Headers `X-Tenant` en las peticiones al backend

### 🔄 Compatibilidad

- ✅ Mantiene compatibilidad con el sistema de subdominios
- ✅ Mantiene compatibilidad con query parameters
- ✅ Mantiene compatibilidad con headers personalizados
- ✅ Rutas legacy `/tenant` siguen funcionando

### 🚨 Consideraciones de Seguridad

1. **Validación de Acceso**: El sistema valida que el usuario solo pueda acceder a su propio tenant
2. **Token JWT**: Incluye información del tenant para validación en el backend
3. **Middleware de Autenticación**: Verifica que el tenant del token coincida con el tenant de la URL
4. **Redirección Automática**: Al detectar acceso no autorizado, redirige al login del tenant correcto
5. **Logs de Seguridad**: Registra intentos de acceso no autorizado
6. **Limpieza de Sesión**: Limpia automáticamente la sesión al detectar violaciones de seguridad

### 🔒 Protección contra Acceso Cruzado

El sistema implementa múltiples capas de seguridad:

#### Frontend
- Validación en `TenantAuthContext` que verifica el tenant de la URL
- Componente `TenantProtectedRoute` que protege todas las rutas de tenant
- Redirección automática al detectar acceso no autorizado

#### Backend
- Middleware `authenticateTenantToken` que valida el token JWT
- Verificación de que el `tenantDomain` del token coincida con el tenant de la URL
- Rechazo inmediato de peticiones con tokens de otros tenants

#### Ejemplo de Protección
```
Usuario logueado en: localhost:5173/prueba/dashboard
Intento de acceso a: localhost:5173/clinica/dashboard
Resultado: ❌ Acceso denegado + redirección a /clinica/login
```
