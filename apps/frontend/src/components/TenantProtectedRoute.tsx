import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { useTenant } from '../contexts/TenantContext';

interface TenantProtectedRouteProps {
  children: React.ReactNode;
}

const TenantProtectedRoute: React.FC<TenantProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, validateTenantAccess } = useTenantAuth();
  const { tenant, loading: tenantLoading } = useTenant();
  const location = useLocation();

  console.log('🔍 TenantProtectedRoute: Estado actual:', {
    user: !!user,
    isLoading,
    tenant: !!tenant,
    tenantLoading,
    userTenantDomain: user?.tenantDomain,
    currentTenant: tenant?.domain,
    currentPath: location.pathname,
    userRole: user?.role
  });

  // Mostrar loading mientras se cargan los datos
  if (isLoading || tenantLoading) {
    console.log('⏳ TenantProtectedRoute: Mostrando loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Si no hay usuario logueado, redirigir al login
  if (!user) {
    console.log('❌ TenantProtectedRoute: No hay usuario logueado, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  // Si no hay tenant detectado, mostrar error
  if (!tenant) {
    console.log('❌ TenantProtectedRoute: No hay tenant detectado');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-red-500">No se pudo detectar el tenant</p>
        </div>
      </div>
    );
  }

  // Verificación específica para la ruta de suplantación
  if (location.pathname.includes('doctor-impersonation')) {
    console.log('🎭 TenantProtectedRoute: Verificando acceso a suplantación...');
    if (user.role !== 'admin') {
      console.log('❌ TenantProtectedRoute: Usuario no es admin, acceso denegado a suplantación');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
            <p className="text-red-500">Solo los administradores pueden acceder a la suplantación de doctores</p>
          </div>
        </div>
      );
    }
    console.log('✅ TenantProtectedRoute: Usuario es admin, permitiendo acceso a suplantación');
  }

  // Validar que el usuario tenga acceso al tenant actual
  const hasAccess = validateTenantAccess();
  
  console.log('🔍 TenantProtectedRoute: Validación de acceso:', hasAccess);
  
  if (!hasAccess) {
    // La validación ya maneja la redirección automáticamente
    console.log('❌ TenantProtectedRoute: Acceso denegado');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-red-500">No tienes permisos para acceder a este tenant</p>
        </div>
      </div>
    );
  }

  console.log('✅ TenantProtectedRoute: Acceso permitido, renderizando contenido');
  return <>{children}</>;
};

export default TenantProtectedRoute;
