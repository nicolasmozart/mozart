# Prueba de Seguridad - Acceso entre Tenants

## 🧪 Escenario de Prueba

### Objetivo
Verificar que un usuario logueado en un tenant no pueda acceder a otro tenant cambiando la URL.

### Pasos para Probar

1. **Crear dos tenants de prueba en la base de datos:**

```javascript
// Tenant "prueba"
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

// Tenant "clinica"
{
  name: "Clínica de Prueba",
  domain: "clinica",
  isActive: true,
  features: {
    agendamiento: true,
    cuidadorDigital: true,
    telemedicina: false,
    reportes: true
  }
}
```

2. **Crear usuarios para cada tenant:**

```javascript
// Usuario para tenant "prueba"
{
  email: "admin@prueba.com",
  password: "password123",
  firstName: "Admin",
  lastName: "Prueba",
  role: "admin",
  tenantId: "ID_DEL_TENANT_PRUEBA"
}

// Usuario para tenant "clinica"
{
  email: "admin@clinica.com",
  password: "password123",
  firstName: "Admin",
  lastName: "Clinica",
  role: "admin",
  tenantId: "ID_DEL_TENANT_CLINICA"
}
```

### 🔒 Pruebas de Seguridad

#### Prueba 1: Acceso Normal
1. Acceder a `http://localhost:5173/prueba`
2. Hacer login con `admin@prueba.com`
3. ✅ Debería acceder al dashboard de "prueba"

#### Prueba 2: Intento de Acceso Cruzado
1. Estar logueado en `http://localhost:5173/prueba/dashboard`
2. Cambiar manualmente la URL a `http://localhost:5173/clinica/dashboard`
3. ❌ Debería mostrar "Acceso Denegado" y redirigir a `/clinica/login`

#### Prueba 3: Token Manipulado
1. Abrir DevTools → Application → Local Storage
2. Copiar el `tenantToken` del tenant "prueba"
3. Acceder a `http://localhost:5173/clinica/dashboard`
4. Intentar usar el token de "prueba" en las peticiones
5. ❌ El backend debería rechazar el token

### 🔍 Verificaciones en Consola

#### Frontend (Navegador)
```javascript
// Debería aparecer en la consola cuando se intenta acceder a otro tenant:
🚨 Acceso denegado: Usuario logueado en prueba intentando acceder a clinica
```

#### Backend (Terminal)
```javascript
// Debería aparecer en los logs del servidor:
🚨 Acceso denegado: Token para tenant prueba intentando acceder a clinica
```

### 📋 Checklist de Seguridad

- [ ] Usuario logueado en tenant A no puede acceder a tenant B
- [ ] Cambio manual de URL redirige al login correcto
- [ ] Token JWT incluye información del tenant
- [ ] Backend valida que el token coincida con el tenant de la URL
- [ ] Sesión se limpia automáticamente al detectar acceso no autorizado
- [ ] Logs de seguridad se generan correctamente

### 🚨 Comportamiento Esperado

1. **Acceso Autorizado**: ✅ Usuario accede a su propio tenant
2. **Acceso No Autorizado**: ❌ Redirección automática al login
3. **Token Inválido**: ❌ Rechazo inmediato con mensaje de error
4. **Logs de Seguridad**: 📝 Registro de intentos de acceso no autorizado

### 🔧 Configuración Adicional

Para mayor seguridad, también se puede:

1. **Agregar rate limiting** para prevenir ataques de fuerza bruta
2. **Implementar auditoría** de accesos y cambios
3. **Agregar notificaciones** de accesos sospechosos
4. **Configurar CORS** más restrictivo por tenant
5. **Implementar 2FA** para usuarios administrativos
