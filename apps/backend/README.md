# 🎵 Mozart 2.1 - API Backend

## 🏗️ **Arquitectura Multi-Tenant**

Sistema diseñado para ser desplegado en múltiples instancias AWS, donde cada cliente tiene su propia base de datos y configuración.

### **Flujo de Funcionamiento**
1. **Cliente accede** → `plataforma.cemdi.com`
2. **Sistema detecta** → Extrae `cemdi` del dominio
3. **Busca en BD principal** → Configuración del cliente
4. **Conecta a BD específica** → Del cliente
5. **Sirve aplicación** → Con configuración personalizada

## 🗄️ **Modelos de Datos**

### **User (Usuario)**
- **Roles**: `superuser` | `user`
- **Superusuarios**: Gestionan clientes en BD principal
- **Usuarios normales**: Asociados a un cliente específico

### **Client (Cliente)**
- **Dominio**: `cemdi` de `plataforma.cemdi.com`
- **BD específica**: URL de conexión única
- **URLs de servicios**: Llamadas, tamizaje, verificación
- **Configuración**: Zona horaria, idioma, características

## 🚀 **Configuración Inicial**

### **1. Variables de Entorno**
```env
# BD Principal (tu MongoDB)
MONGODB_URI=mongodb://localhost:27017/mozart_main

# Configuración del servidor
PORT=4000
NODE_ENV=development
```

### **2. Crear Superusuario**
```bash
npm run create-superuser
```
**Credenciales por defecto:**
- Email: `admin@mozart.com`
- Password: `admin123456`

### **3. Ejecutar Aplicación**
```bash
npm run dev
```

## 🔧 **Endpoints de la API**

### **Gestión de Clientes (Superusuarios)**
```
POST   /api/admin/clients          # Crear cliente
GET    /api/admin/clients          # Listar clientes
GET    /api/admin/clients/:id      # Obtener cliente
PUT    /api/admin/clients/:id      # Actualizar cliente
PATCH  /api/admin/clients/:id/toggle-status  # Activar/Desactivar
```

### **Información del Cliente**
```
GET   /api/client/current          # Cliente actual (opcional)
GET   /api/client/detect           # Detección forzada
```

### **Pacientes**
```
GET    /api/patients               # Listar pacientes
POST   /api/patients               # Crear paciente
GET    /api/patients/:id           # Obtener paciente
PUT    /api/patients/:id           # Actualizar paciente
DELETE /api/patients/:id           # Eliminar paciente
```

## 🧪 **Pruebas de Funcionamiento**

### **1. Verificar Servidor**
```bash
curl http://localhost:4000/ping
# Respuesta: {"message": "pong 🏓"}
```

### **2. Crear Cliente de Prueba**
```bash
curl -X POST http://localhost:4000/api/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CEMDI",
    "fullDomain": "plataforma.cemdi.com",
    "databaseUrl": "mongodb://localhost:27017/cemdi_db",
    "databaseName": "cemdi_db",
    "llamadaPresentacionUrl": "https://api.cemdi.com/presentacion",
    "llamadaTamizajeUrl": "https://api.cemdi.com/tamizaje",
    "verificacionDatosUrl": "https://api.cemdi.com/verificacion"
  }'
```

### **3. Detectar Cliente**
```bash
curl -H "Host: plataforma.cemdi.com" http://localhost:4000/api/client/detect
```

## 📁 **Estructura del Proyecto**

```
src/
├── config/
│   ├── database.ts        # Conexión MongoDB
│   └── env.ts            # Variables de entorno
├── models/
│   ├── User.ts           # Modelo de usuario
│   ├── Client.ts         # Modelo de cliente
│   └── index.ts          # Exportaciones
├── controllers/
│   ├── client.controller.ts  # Gestión de clientes
│   └── patient.controller.ts # Gestión de pacientes
├── routes/
│   ├── client.routes.ts      # Rutas de clientes
│   └── patient.routes.ts     # Rutas de pacientes
├── middlewares/
│   └── clientDetection.ts    # Detección automática
├── scripts/
│   └── createSuperUser.ts    # Crear superusuario
└── index.ts                   # Punto de entrada
```

## 🔒 **Seguridad y Autenticación**

- **Middleware de detección**: Identifica cliente por dominio
- **Validación de datos**: Schemas de Mongoose
- **Índices optimizados**: Para consultas eficientes
- **Separación de roles**: Superusuarios vs usuarios normales

## 📊 **Sistema de Logs Completo**

### **Características del Sistema de Logs**
- **Winston + Daily Rotate File**: Logging robusto y rotación automática
- **Separación por niveles**: Application, Error, Audit, Exceptions
- **Rotación diaria**: Archivos comprimidos automáticamente
- **Retención configurable**: 14-90 días según tipo de log
- **Logging estructurado**: JSON para fácil análisis
- **Auditoría completa**: Todas las acciones del sistema

### **Tipos de Logs**
```
logs/
├── application-YYYY-MM-DD.log    # Logs generales (14 días)
├── error-YYYY-MM-DD.log          # Errores del sistema (30 días)
├── audit-YYYY-MM-DD.log          # Auditoría de acciones (90 días)
├── exceptions-YYYY-MM-DD.log     # Excepciones no manejadas (30 días)
└── rejections-YYYY-MM-DD.log     # Promesas rechazadas (30 días)
```

### **Endpoints de Logs**
```
GET    /api/logs/info             # Información del sistema de logs
GET    /api/logs/stats            # Estadísticas de logs
POST   /api/logs/cleanup          # Limpiar logs antiguos
```

### **Logging Automático**
- **Requests HTTP**: Método, URL, status, duración, IP
- **Detección de clientes**: Éxito/fallo, dominio, BD
- **Operaciones de BD**: CREATE, READ, UPDATE, DELETE
- **Errores del sistema**: Stack trace, contexto, usuario
- **Acciones de usuarios**: Crear, actualizar, eliminar recursos

## 🚀 **Próximos Pasos**

1. **Implementar autenticación JWT**
2. **Agregar validación de permisos**
3. **Crear modelos para agendamiento**
4. **Implementar conexión dinámica a BDs de clientes**
5. **Agregar logging y monitoreo**

## 🐛 **Solución de Problemas**

### **Error de Conexión a MongoDB**
- Verificar que `MONGODB_URI` esté correcta
- Asegurar que MongoDB esté corriendo
- Verificar que el nombre de la BD no contenga caracteres especiales

### **Cliente No Detectado**
- Verificar que el dominio esté registrado en la BD
- Asegurar que el cliente esté activo
- Revisar logs del middleware de detección
