# Mozart Admin - Panel de Administración Multi-Tenant

Panel de administración web para el sistema Mozart 2.1, construido con React + Vite y TypeScript.

## 🚀 Características

- **Autenticación segura** con JWT tokens
- **Panel de superusuario** para gestión de clientes multi-tenant
- **Dashboard interactivo** con estadísticas del sistema
- **Gestión completa de clientes** (CRUD)
- **Interfaz responsive** optimizada para móvil y desktop
- **Sistema de rutas protegidas** basado en roles
- **Integración con API REST** del backend

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 4.x (compatible con Node.js 18+)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM 6.x
- **State Management**: React Query 4.x
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Forms**: Tailwind CSS Forms

## 📋 Prerrequisitos

- Node.js 18+ (compatible con Vite 4.x)
- npm o yarn
- Backend Mozart API ejecutándose en `http://localhost:4000`

## 🚀 Instalación

1. **Clonar el repositorio** (si no lo has hecho ya):
```bash
cd apps/web
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
Crea un archivo `.env.local` en la raíz del proyecto:
```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Mozart Admin
VITE_APP_VERSION=2.1.0
```

4. **Ejecutar en modo desarrollo**:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   └── Layout.tsx      # Layout principal con navegación
├── contexts/            # Contextos de React
│   └── AuthContext.tsx # Contexto de autenticación
├── pages/               # Páginas de la aplicación
│   ├── Login.tsx       # Página de inicio de sesión
│   ├── Dashboard.tsx   # Dashboard principal
│   └── ClientManagement.tsx # Gestión de clientes
├── services/            # Servicios y APIs
│   └── api.ts          # Cliente HTTP con Axios
├── App.tsx              # Componente raíz con rutas
└── main.tsx            # Punto de entrada
```

## 🔐 Autenticación

El sistema utiliza JWT tokens para la autenticación:

- **Login**: `/login` - Formulario de inicio de sesión
- **Rutas protegidas**: Requieren autenticación válida
- **Rutas de superusuario**: Solo accesibles para usuarios con rol `superuser`
- **Logout**: Cierra sesión y redirige al login

## 👥 Roles de Usuario

### Superusuario
- Acceso completo al sistema
- Gestión de clientes multi-tenant
- Crear, editar y eliminar clientes
- Configurar dominios y bases de datos

### Usuario Normal
- Acceso limitado al dashboard
- Vista de información general
- Sin acceso a gestión de clientes

## 🎨 Personalización

### Colores
Los colores principales se pueden personalizar en `tailwind.config.js`:

```js
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    // ... más variantes
  }
}
```

### Componentes
Los estilos de componentes están definidos en `src/index.css` usando las clases de Tailwind.

## 📱 Responsive Design

La aplicación está optimizada para:
- **Desktop**: Sidebar fijo con navegación completa
- **Tablet**: Sidebar colapsable
- **Móvil**: Navegación hamburguesa con overlay

## 🚀 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linting del código
npm run type-check   # Verificación de tipos TypeScript
```

## 🔧 Configuración de Desarrollo

### Hot Reload
Vite proporciona hot reload automático para cambios en el código.

### TypeScript
- Configuración estricta habilitada
- Verificación de tipos en tiempo de compilación
- IntelliSense completo en editores compatibles

### Tailwind CSS
- Configuración personalizada en `tailwind.config.js`
- Componentes CSS personalizados en `src/index.css`
- Plugin de formularios incluido

## 📊 Estado de la Aplicación

- **React Query 4.x**: Para manejo de estado del servidor
- **Context API**: Para estado global de autenticación
- **Estado local**: Para formularios y modales

## 🔌 Integración con Backend

La aplicación se conecta al backend Mozart a través de:

- **Base URL**: Configurable via `VITE_API_URL` (puerto 4000)
- **Autenticación**: Headers JWT automáticos
- **Interceptores**: Manejo automático de errores 401
- **Endpoints principales**:
  - `POST /auth/login` - Inicio de sesión
  - `GET /auth/me` - Verificar autenticación
  - `GET /clients` - Listar clientes
  - `POST /clients` - Crear cliente
  - `PUT /clients/:id` - Actualizar cliente
  - `DELETE /clients/:id` - Eliminar cliente

## 🚨 Solución de Problemas

### Error de CORS
Asegúrate de que el backend tenga CORS configurado correctamente para el puerto 4000.

### Error de Conexión
Verifica que la API esté ejecutándose en el puerto 4000 y la URL sea correcta.

### Problemas de Build
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Compatibilidad con Node.js
Este proyecto usa Vite 4.x que es compatible con Node.js 18+. Si tienes problemas, asegúrate de usar la versión correcta.

## 🤝 Contribución

1. Sigue las convenciones de código existentes
2. Usa TypeScript para todo el código nuevo
3. Mantén la consistencia con Tailwind CSS
4. Prueba en diferentes tamaños de pantalla

## 📄 Licencia

Este proyecto es parte de Mozart 2.1 y está bajo la misma licencia.

## 🆘 Soporte

Para soporte técnico o preguntas sobre el frontend, contacta al equipo de desarrollo de Mozart.
