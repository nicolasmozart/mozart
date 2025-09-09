import React from 'react';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { useAlert } from '../contexts/AlertContext';

const ImpersonationBanner: React.FC = () => {
  const { user, updateUser } = useTenantAuth();
  const { showAlert } = useAlert();

  // Solo mostrar si es una sesión de suplantación
  if (!user?.isImpersonation) {
    return null;
  }

  const handleEndImpersonation = async () => {
    try {
      const impersonationToken = localStorage.getItem('impersonationToken');
      
      if (!impersonationToken) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'No hay sesión de suplantación activa'
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/doctors/impersonation/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${impersonationToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Restaurar el token original
        const originalToken = localStorage.getItem('originalToken');
        if (originalToken) {
          localStorage.setItem('tenantToken', originalToken);
          
          // Decodificar el token original para restaurar la información del usuario
          const originalTokenData = JSON.parse(atob(originalToken.split('.')[1]));
          
          // Crear el objeto de usuario original
          const originalUser = {
            _id: originalTokenData.userId,
            firstName: originalTokenData.firstName || 'Admin',
            lastName: originalTokenData.lastName || '',
            email: originalTokenData.email,
            role: originalTokenData.role,
            tenantId: originalTokenData.tenantId,
            tenantName: originalTokenData.tenantName,
            tenantDomain: originalTokenData.tenantDomain,
            features: originalTokenData.features,
            isImpersonation: false,
            impersonatedBy: undefined,
            originalRole: undefined
          };
          
          // Restaurar el tenantUser original
          localStorage.setItem('tenantUser', JSON.stringify(originalUser));
          
          // Actualizar el contexto inmediatamente
          updateUser(originalUser);
        }
        
        // Limpiar datos de suplantación
        localStorage.removeItem('impersonationToken');
        localStorage.removeItem('originalToken');
        localStorage.removeItem('impersonatedDoctor');
        
        showAlert({
          type: 'success',
          title: 'Suplantación Finalizada',
          message: 'Has vuelto a tu sesión de administrador'
        });

        // Redirigir al dashboard de admin
        const originalTokenData = JSON.parse(atob(originalToken!.split('.')[1]));
        const tenantDomain = originalTokenData.tenantDomain || 'prueba';
        window.location.href = `/${tenantDomain}/dashboard`;
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: data.message || 'Error al finalizar suplantación'
        });
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error de conexión al finalizar suplantación'
      });
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-yellow-800">
              <span className="font-bold">Modo Suplantación Activo</span>
            </p>
            <p className="text-sm text-yellow-700">
              Estás viendo el sistema como: <span className="font-semibold">{user.email}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Suplantación
          </span>
          <button
            onClick={handleEndImpersonation}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
          >
            Salir de Suplantación
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
