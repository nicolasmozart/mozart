# Mozart 2.1 - Sistema Multi-Tenant

Sistema de administración multi-tenant para la gestión de clientes en el sector de la salud, construido con arquitectura moderna y tecnologías de vanguardia.

## 🏗️ Arquitectura del Sistema

```
Mozart2.1/
├── apps/
│   ├── api/           # Backend API (Node.js + Express + MongoDB)
│   └── web/           # Frontend Admin (React + Vite + TypeScript)
├── packages/           # Paquetes compartidos
│   ├── core-auth/     # Autenticación centralizada
│   └── core-db/       # Configuración de base de datos
└── infra/             # Infraestructura y deployment
```

## 🚀 Características Principales

### 🔐 Autenticación y Autorización
- Sistema de autenticación JWT
- Roles de usuario (superusuario, usuario normal)
- Rutas protegidas por nivel de acceso

### 🏢 Gestión Multi-Tenant
- Configuración independiente por cliente
- Bases de datos separadas por tenant
- Dominios personalizados por cliente
- Configuración de características por cliente

### 📊 Panel de Administración
- Dashboard con estadísticas del sistema
- Gestión completa de clientes (CRUD)
- Interfaz responsive y moderna
- Sistema de navegación intuitivo

### 🔌 API REST
- Endpoints para gestión de clientes
- Sistema de logs centralizado
- Middleware de detección de cliente
- Validación de datos robusta

## 🛠️ Stack Tecnológico

### Backend (API)
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de Datos**: MongoDB con Mongoose
- **Autenticación**: JWT
- **Logging**: Winston
- **Seguridad**: Helmet, CORS

### Frontend (Web)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 4.x
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM 6.x
- **State Management**: React Query 4.x
- **HTTP Client**: Axios

## 📋 Prerrequisitos

- **Node.js**: 18+ (compatible con Vite 4.x)
- **npm**: 8+
- **MongoDB**: 5+ (local o remoto)
- **Git**: Para clonar el repositorio

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd Mozart2.1
```

### 2. Instalar Dependencias
```bash
# Instalar dependencias de todos los paquetes
npm run install:all
```

### 3. Configurar Variables de Entorno

#### Backend (apps/api/.env)
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/mozart
JWT_SECRET=tu_jwt_secret_super_seguro
```

#### Frontend (apps/web/.env.local)
```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Mozart Admin
VITE_APP_VERSION=2.1.0
```

### 4. Configurar Base de Datos
```bash
# Asegúrate de que MongoDB esté ejecutándose
# Crear superusuario inicial
cd apps/api
npm run create-superuser
```

### 5. Ejecutar el Sistema

#### Desarrollo (ambos servicios)
```bash
# Desde la raíz del monorepo
npm run dev
```

#### Solo Backend
```bash
npm run dev:api
```

#### Solo Frontend
```bash
npm run dev:web
```

## 🌐 Acceso al Sistema

- **Frontend Admin**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Documentación API**: http://localhost:4000/api-docs (cuando esté implementada)

## 📱 Uso del Sistema

### 1. Inicio de Sesión
- Accede a http://localhost:5173
- Usa las credenciales del superusuario creado
- El sistema redirigirá al dashboard

### 2. Dashboard
- Vista general del sistema
- Estadísticas de clientes y usuarios
- Acciones rápidas para superusuarios

### 3. Gestión de Clientes (Solo Superusuarios)
- Crear nuevos clientes multi-tenant
- Configurar dominios y bases de datos
- Gestionar características por cliente
- Activar/desactivar clientes

### 4. Navegación
- Sidebar responsive con navegación principal
- Menú hamburguesa para dispositivos móviles
- Breadcrumbs y navegación contextual

## 🔧 Desarrollo

### Estructura de Comandos
```bash
# Desarrollo
npm run dev              # Ambos servicios
npm run dev:api          # Solo API
npm run dev:web          # Solo Web

# Build
npm run build            # Build completo
npm run build:api        # Build API
npm run build:web        # Build Web

# Producción
npm run start:api        # Iniciar API en producción
```

### Convenciones de Código
- **TypeScript**: Uso estricto habilitado
- **ESLint**: Configuración estándar
- **Prettier**: Formato automático
- **Tailwind**: Clases utilitarias
- **React**: Hooks y componentes funcionales

### Estructura de Archivos
```
src/
├── components/          # Componentes reutilizables
├── contexts/            # Contextos de React
├── pages/               # Páginas de la aplicación
├── services/            # Servicios y APIs
├── types/               # Tipos TypeScript
└── utils/               # Utilidades y helpers
```

## 🧪 Testing

```bash
# Verificar tipos TypeScript
npm run type-check

# Linting
npm run lint

# Build de prueba
npm run build
```

## 🚀 Deployment

### Backend
```bash
cd apps/api
npm run build
npm start
```

### Frontend
```bash
cd apps/web
npm run build
# Servir archivos estáticos desde dist/
```

## 🔒 Seguridad

- **JWT**: Tokens de autenticación seguros
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configuración de origen cruzado
- **Validación**: Validación de entrada robusta
- **Logging**: Auditoría de acciones del sistema

## 📊 Monitoreo y Logs

- **Winston**: Sistema de logging estructurado
- **Rotación**: Logs rotativos por fecha
- **Niveles**: Diferentes niveles de log (error, warn, info, debug)
- **Formato**: Logs en formato JSON para fácil parsing

## 🤝 Contribución

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Guías de Contribución
- Sigue las convenciones de código existentes
- Mantén la consistencia en el estilo
- Documenta nuevas funcionalidades
- Incluye tests cuando sea apropiado

## 📝 Changelog

### v2.1.0
- ✨ Sistema multi-tenant completo
- 🔐 Autenticación JWT
- 🎨 Panel de administración moderno
- 📱 Interfaz responsive
- 🗄️ Gestión de clientes
- 🔌 API REST robusta
- 🔧 Compatibilidad con Node.js 18+

## 📄 Licencia

Este proyecto está bajo la licencia ISC. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

- **Issues**: Usa GitHub Issues para reportar bugs
- **Discusiones**: GitHub Discussions para preguntas generales
- **Documentación**: README y comentarios en el código

## 🙏 Agradecimientos

- Equipo de desarrollo Mozart
- Comunidad de código abierto
- Contribuidores y revisores

---

**Mozart 2.1** - Transformando la gestión de la salud, un cliente a la vez.
