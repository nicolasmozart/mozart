import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función para obtener el tenant desde la URL
const getTenantFromUrl = (): string | null => {
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // Excluir rutas del superusuario
  const superuserRoutes = ['login', 'dashboard', 'clients', 'verify-2fa'];
  
  if (!firstSegment || superuserRoutes.includes(firstSegment)) {
    return null;
  }
  
  return firstSegment;
};

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo manejar errores 401 si no es un intento de login o verificación 2FA
    if (error.response?.status === 401 && 
        !error.config?.url?.includes('/auth/login') && 
        !error.config?.url?.includes('/auth/verify-2fa') &&
        !error.config?.url?.includes('/auth/resend-2fa') &&
        !error.config?.url?.includes('/tenant/login')) {
      
      // Determinar si es un error de tenant o superusuario
      const tenant = getTenantFromUrl();
      
      if (tenant) {
        // Es un tenant - redirigir al login del tenant
        localStorage.removeItem('tenantToken');
        window.location.href = `/${tenant}/login`;
      } else {
        // Es superusuario - redirigir al login del superusuario
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Interceptor para agregar token y tenant a todas las requests
api.interceptors.request.use(
  (config) => {
    // Agregar tenant desde la URL
    const tenant = getTenantFromUrl();
    if (tenant) {
      config.headers['X-Tenant'] = tenant;
    }
    
    // Primero intentar con authToken (para superadmin)
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      return config;
    }
    
    // Si no hay authToken, intentar con tenantToken
    const tenantToken = localStorage.getItem('tenantToken');
    if (tenantToken) {
      config.headers.Authorization = `Bearer ${tenantToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
