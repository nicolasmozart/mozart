import React, { useState, useEffect } from 'react';
import { useAlert } from '../contexts/AlertContext';
import { useTenantAuth } from '../contexts/TenantAuthContext';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialty: string;
  hospital: string;
  isActive: boolean;
}

const DoctorImpersonation: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const { updateUser } = useTenantAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    console.log('🎬 DoctorImpersonation: Componente montado, iniciando fetch...');
    fetchDoctorsForImpersonation();
  }, []);

  const fetchDoctorsForImpersonation = async () => {
    try {
      setLoading(true);
      console.log('🔍 Iniciando fetchDoctorsForImpersonation...');
      
      const token = localStorage.getItem('tenantToken');
      console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
      
      if (!token) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'No hay token de autenticación'
        });
        return;
      }

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/doctors/impersonation/list`;
      console.log('🌐 URL de la petición:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📋 Datos recibidos:', data);
      
      if (data.success) {
        console.log('✅ Doctores cargados exitosamente:', data.doctors);
        setDoctors(data.doctors);
      } else {
        console.error('❌ Error en la respuesta:', data);
        showAlert({
          type: 'error',
          title: 'Error',
          message: data.message || 'Error al cargar doctores para suplantación'
        });
      }
    } catch (error) {
      console.error('💥 Error de conexión:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error de conexión al cargar doctores'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonateDoctor = async (doctor: Doctor) => {
    try {
      console.log('🎭 Iniciando suplantación del doctor:', doctor);
      
      const token = localStorage.getItem('tenantToken');
      console.log('🔑 Token para suplantación:', token ? 'Sí' : 'No');
      
      if (!token) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'No hay token de autenticación'
        });
        return;
      }

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/doctors/impersonation/${doctor._id}`;
      console.log('🌐 URL de suplantación:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Respuesta de suplantación:', response.status, response.statusText);

      const data = await response.json();
      console.log('📋 Datos de suplantación:', data);

      if (data.success) {
        console.log('✅ Suplantación exitosa, guardando tokens...');
        
        // Guardar el token de suplantación
        localStorage.setItem('impersonationToken', data.token);
        localStorage.setItem('originalToken', token);
        localStorage.setItem('impersonatedDoctor', JSON.stringify(data.doctor));
        
        // Decodificar el token para obtener la información del usuario suplantado
        const tokenData = JSON.parse(atob(data.token.split('.')[1]));
        const tenantDomain = tokenData.tenantDomain || 'prueba';
        
        // Crear el objeto de usuario suplantado
        const impersonatedUser = {
          _id: tokenData.userId,
          firstName: data.doctor.name.split(' ')[0],
          lastName: data.doctor.name.split(' ').slice(1).join(' '),
          email: tokenData.email,
          role: tokenData.role,
          tenantId: tokenData.tenantId,
          tenantName: tokenData.tenantName,
          tenantDomain: tokenData.tenantDomain,
          features: tokenData.features,
          isImpersonation: true,
          impersonatedBy: tokenData.impersonatedBy,
          originalRole: tokenData.originalRole
        };
        
        // Actualizar el tenantUser en localStorage con la información del doctor
        localStorage.setItem('tenantUser', JSON.stringify(impersonatedUser));
        
        // Actualizar el tenantToken para que use el token de suplantación
        localStorage.setItem('tenantToken', data.token);
        
        // Actualizar el contexto inmediatamente
        console.log('🎭 DoctorImpersonation: Llamando updateUser con:', impersonatedUser);
        updateUser(impersonatedUser);
        console.log('🎭 DoctorImpersonation: updateUser completado');
        
        setIsImpersonating(true);
        setSelectedDoctor(data.doctor);
        
        showAlert({
          type: 'success',
          title: 'Suplantación Iniciada',
          message: `Ahora estás viendo el sistema como ${data.doctor.name}`
        });

        console.log('🔄 Redirigiendo al dashboard del doctor...');
        // Redirigir al dashboard del doctor usando el tenantDomain del token
        window.location.href = `/${tenantDomain}/doctor/dashboard`;
      } else {
        console.error('❌ Error en suplantación:', data);
        showAlert({
          type: 'error',
          title: 'Error',
          message: data.message || 'Error al iniciar suplantación'
        });
      }
    } catch (error) {
      console.error('💥 Error de conexión en suplantación:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error de conexión al iniciar suplantación'
      });
    }
  };

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
        
        setIsImpersonating(false);
        setSelectedDoctor(null);
        
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

  const confirmImpersonation = async (doctor: Doctor) => {
    console.log('🎭 Confirmando suplantación del doctor:', doctor);
    console.log('🔧 Llamando a showConfirm...');
    
    try {
      const confirmed = await showConfirm({
        title: 'Confirmar Suplantación',
        message: `¿Estás seguro de que quieres suplantar al doctor ${doctor.name}?`,
        confirmText: 'Sí, suplantar',
        cancelText: 'Cancelar'
      });
      
      console.log('🔧 Resultado de showConfirm:', confirmed);
      
      if (confirmed) {
        console.log('✅ Confirmación aceptada, ejecutando suplantación...');
        await handleImpersonateDoctor(doctor);
      } else {
        console.log('❌ Confirmación cancelada');
      }
    } catch (error) {
      console.error('💥 Error en confirmImpersonation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Suplantación de Doctores
        </h2>
        {isImpersonating && (
          <button
            onClick={handleEndImpersonation}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Finalizar Suplantación
          </button>
        )}
      </div>

      {isImpersonating && selectedDoctor && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Modo Suplantación Activo
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Actualmente suplantando: <strong>{selectedDoctor.name}</strong></p>
                <p>Especialidad: {selectedDoctor.specialty}</p>
                <p>Hospital: {selectedDoctor.hospital}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <div key={doctor._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">{doctor.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                doctor.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {doctor.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Email:</strong> {doctor.email}</p>
              <p><strong>Especialidad:</strong> {doctor.specialty}</p>
              <p><strong>Hospital:</strong> {doctor.hospital}</p>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => confirmImpersonation(doctor)}
                disabled={!doctor.isActive || isImpersonating}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  !doctor.isActive || isImpersonating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isImpersonating ? 'Suplantación Activa' : 'Suplantar Doctor'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {doctors.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay doctores disponibles</h3>
            <p className="text-gray-500 mb-4">
              No se encontraron doctores activos para suplantación. Asegúrate de que existan doctores creados y activos en el sistema.
            </p>
            <button
              onClick={fetchDoctorsForImpersonation}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recargar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorImpersonation;
