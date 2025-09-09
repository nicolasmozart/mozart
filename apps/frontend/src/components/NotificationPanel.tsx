import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, User, Activity, FileText, Users, Settings, Database, RefreshCw, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { api } from '../services/api';

// Estilos CSS para line-clamp
const lineClampStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

interface Log {
  _id: string;
  action: string;
  entityType: string;
  entityName?: string;
  details: string;
  userName: string;
  userRole: string;
  timestamp: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, tenantId }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const { user, tenant } = useTenantAuth();
  
  console.log('🔍 NotificationPanel renderizado:', { isOpen });

  // Mapeo de acciones a íconos y colores
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PATIENT_CREATED':
      case 'CREACION_PACIENTE':
        return { icon: Users, color: 'text-success-600', bgColor: 'bg-success-50' };
      case 'PATIENT_UPDATED':
      case 'ACTUALIZACION_PACIENTE':
        return { icon: Users, color: 'text-primary-600', bgColor: 'bg-primary-50' };
      case 'PATIENT_DELETED':
      case 'ELIMINACION_PACIENTE':
        return { icon: Users, color: 'text-alert-600', bgColor: 'bg-alert-50' };
      case 'RESTAURACION_PACIENTE':
        return { icon: Users, color: 'text-info-600', bgColor: 'bg-info-50' };
      case 'APPOINTMENT_CREATED':
        return { icon: Activity, color: 'text-success-600', bgColor: 'bg-success-50' };
      case 'APPOINTMENT_UPDATED':
        return { icon: Activity, color: 'text-primary-600', bgColor: 'bg-primary-50' };
      case 'APPOINTMENT_CANCELLED':
        return { icon: Activity, color: 'text-alert-600', bgColor: 'bg-alert-50' };
      case 'USER_CREATED':
        return { icon: User, color: 'text-success-600', bgColor: 'bg-success-50' };
      case 'USER_UPDATED':
        return { icon: User, color: 'text-primary-600', bgColor: 'bg-primary-50' };
      case 'SETTINGS_UPDATED':
        return { icon: Settings, color: 'text-warning-600', bgColor: 'bg-warning-50' };
      case 'SYSTEM_MAINTENANCE':
        return { icon: Database, color: 'text-info-600', bgColor: 'bg-info-50' };
      default:
        return { icon: FileText, color: 'text-neutral-600', bgColor: 'bg-neutral-50' };
    }
  };

  // Mapeo de acciones a texto legible
  const getActionText = (action: string) => {
    switch (action) {
      case 'PATIENT_CREATED':
      case 'CREACION_PACIENTE':
        return 'Paciente creado';
      case 'PATIENT_UPDATED':
      case 'ACTUALIZACION_PACIENTE':
        return 'Paciente actualizado';
      case 'PATIENT_DELETED':
      case 'ELIMINACION_PACIENTE':
        return 'Paciente eliminado';
      case 'RESTAURACION_PACIENTE':
        return 'Paciente restaurado';
      case 'APPOINTMENT_CREATED':
        return 'Cita creada';
      case 'APPOINTMENT_UPDATED':
        return 'Cita actualizada';
      case 'APPOINTMENT_CANCELLED':
        return 'Cita cancelada';
      case 'USER_CREATED':
        return 'Usuario creado';
      case 'USER_UPDATED':
        return 'Usuario actualizado';
      case 'SETTINGS_UPDATED':
        return 'Configuración actualizada';
      case 'SYSTEM_MAINTENANCE':
        return 'Mantenimiento del sistema';
      default:
        return action.replace(/_/g, ' ').toLowerCase();
    }
  };

  useEffect(() => {
    console.log('🔍 useEffect ejecutado:', { isOpen });
    if (isOpen) {
      console.log('✅ Condiciones cumplidas, llamando fetchRecentLogs');
      fetchRecentLogs();
    } else {
      console.log('❌ Condiciones no cumplidas:', { 
        isOpen
      });
    }
  }, [isOpen]);

  const fetchRecentLogs = async () => {
    console.log('🚀 fetchRecentLogs iniciado');
    
    console.log('✅ Iniciando petición');
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Enviando petición para obtener logs recientes');
      console.log('🌐 URL:', '/api/logs/recent');
      
      const response = await api.get('/api/logs/recent', {
        params: { hours: 24 }
      });

      console.log('✅ Respuesta recibida:', response.data);
      setLogs(response.data.data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      let errorMessage = 'Error desconocido';
      
      if (err.response?.status === 404) {
        if (err.response?.data?.error?.includes('Cliente con dominio')) {
          errorMessage = `Error de configuración del tenant: ${err.response.data.error}. El sistema está buscando el dominio '${tenant.domain}' pero no lo encuentra.`;
        } else {
          errorMessage = 'Ruta de logs no encontrada. Verifica la configuración del servidor.';
        }
      } else if (err.response?.status === 401) {
        errorMessage = 'No tienes permisos para ver las notificaciones.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Error interno del servidor al obtener las notificaciones.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{lineClampStyles}</style>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
                 {/* Header */}
         <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-gradient-to-r from-primary-50 to-blue-50">
           <div className="flex items-center space-x-3">
             <div className="relative">
               <Bell className="h-7 w-7 text-primary-600" />
               {logs.length > 0 && (
                 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                   {logs.length > 9 ? '9+' : logs.length}
                 </span>
               )}
             </div>
             <div>
               <h2 className="text-xl font-bold text-neutral-900">Notificaciones</h2>
               {lastUpdated && (
                 <p className="text-sm text-neutral-600">
                   Última actualización: {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: es })}
                 </p>
               )}
             </div>
           </div>
          <div className="flex items-center space-x-2">
                          <button
                onClick={() => {
                  console.log('🔍 Estado actual:', { isOpen });
                  fetchRecentLogs();
                }}
              disabled={loading}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Actualizar notificaciones"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-alert-600 mb-4">{error}</p>
              <button
                onClick={fetchRecentLogs}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
                     ) : logs.length === 0 ? (
             <div className="p-8 text-center text-neutral-500">
               <div className="w-20 h-20 mx-auto mb-6 bg-neutral-100 rounded-full flex items-center justify-center">
                 <Bell className="h-10 w-10 text-neutral-300" />
               </div>
               <h3 className="text-lg font-semibold text-neutral-700 mb-2">No hay notificaciones</h3>
               <p className="text-sm text-neutral-500 mb-4">
                 Las notificaciones aparecerán aquí cuando haya actividad en el sistema
               </p>
               <div className="bg-neutral-50 rounded-lg p-4 text-xs text-neutral-400">
                 <p className="font-medium mb-2">Tipos de notificaciones:</p>
                 <ul className="space-y-1 text-left">
                   <li>• Creación y edición de pacientes</li>
                   <li>• Gestión de citas</li>
                   <li>• Cambios de usuarios</li>
                   <li>• Actualizaciones del sistema</li>
                 </ul>
               </div>
              
              {/* Debug info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-left">
                <p className="font-medium text-gray-700 mb-2">Debug Info:</p>
                <p>isOpen: {isOpen ? '✅' : '❌'}</p>
                <p>Estado: {loading ? '🔄 Cargando...' : error ? '❌ Error' : '✅ Listo'}</p>
                              <button
                onClick={() => {
                  console.log('🔍 Estado completo del componente:', {
                    isOpen,
                    user
                  });
                }}
                className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
              >
                Ver logs en consola
              </button>
              <button
                onClick={() => {
                  console.log('🔍 Verificando logs en BD...');
                  fetchRecentLogs();
                }}
                className="mt-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
              >
                Verificar logs en BD
              </button>
              </div>
              
              <button
                onClick={fetchRecentLogs}
                className="mt-3 inline-flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar notificaciones
              </button>
            </div>
          ) : (
                         <div className="p-3">
                        <div className="mb-3 pb-2 border-b border-neutral-200">
           <h3 className="text-base font-semibold text-neutral-900 mb-1">
             Actividad Reciente
           </h3>
           <p className="text-xs text-neutral-600">
             Mostrando {logs.length} notificación{logs.length !== 1 ? 'es' : ''} de las últimas 24 horas
           </p>
         </div>
                               <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {logs.map((log) => {
                    const { icon: Icon, color, bgColor } = getActionIcon(log.action);
                    const actionText = getActionText(log.action);
                    
                    return (
                      <div key={log._id} className="p-3 bg-white rounded-lg border border-neutral-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-neutral-900">{actionText}</h4>
                              <span className="text-xs text-neutral-500 flex items-center bg-neutral-100 px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDistanceToNow(new Date(log.timestamp), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-neutral-500">
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {log.userName}
                                </span>
                                <span className="capitalize bg-neutral-100 px-2 py-1 rounded-full">{log.userRole}</span>
                              </div>
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          )}
        </div>

                 {/* Footer */}
         <div className="p-4 border-t border-neutral-100 bg-neutral-50">
           <button
             onClick={fetchRecentLogs}
             disabled={loading}
             className="w-full px-4 py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-primary-200 hover:border-primary-300"
           >
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             <span>{loading ? 'Actualizando...' : 'Actualizar notificaciones'}</span>
           </button>
           <div className="mt-3 text-center">
             <p className="text-xs text-neutral-500 mb-1">
               Las notificaciones se actualizan automáticamente
             </p>
             <p className="text-xs text-neutral-400">
               Panel de notificaciones • Mozart AI
             </p>
           </div>
         </div>
       </div>
       
       {/* Modal de Detalles */}
       {selectedLog && (
         <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedLog(null)} />
           <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-6 border-b border-neutral-200">
               <div className="flex items-center space-x-3">
                 <div className={`w-10 h-10 ${getActionIcon(selectedLog.action).bgColor} rounded-lg flex items-center justify-center`}>
                   {(() => {
                     const IconComponent = getActionIcon(selectedLog.action).icon;
                     return <IconComponent className={`h-5 w-5 ${getActionIcon(selectedLog.action).color}`} />;
                   })()}
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-neutral-900">
                     {getActionText(selectedLog.action)}
                   </h3>
                   <p className="text-sm text-neutral-500">
                     {new Date(selectedLog.timestamp).toLocaleString('es-ES', {
                       year: 'numeric',
                       month: 'long',
                       day: 'numeric',
                       hour: '2-digit',
                       minute: '2-digit'
                     })}
                   </p>
                 </div>
               </div>
               <button
                 onClick={() => setSelectedLog(null)}
                 className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
             
             <div className="p-6">
               <div className="space-y-4">
                 <div>
                   <h4 className="text-sm font-semibold text-neutral-700 mb-2">Detalles de la Acción</h4>
                   <p className="text-base text-neutral-900 bg-neutral-50 p-4 rounded-lg border">
                     {selectedLog.details}
                   </p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <h4 className="text-sm font-semibold text-neutral-700 mb-2">Usuario Responsable</h4>
                     <div className="flex items-center space-x-2">
                       <User className="h-4 w-4 text-neutral-500" />
                       <span className="text-sm text-neutral-900">{selectedLog.userName}</span>
                     </div>
                   </div>
                   
                   <div>
                     <h4 className="text-sm font-semibold text-neutral-700 mb-2">Rol del Usuario</h4>
                     <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full capitalize">
                       {selectedLog.userRole}
                     </span>
                   </div>
                   
                   <div>
                     <h4 className="text-sm font-semibold text-neutral-700 mb-2">Tipo de Entidad</h4>
                     <span className="text-sm text-neutral-900 capitalize">
                       {selectedLog.entityType}
                     </span>
                   </div>
                   
                   <div>
                     <h4 className="text-sm font-semibold text-neutral-700 mb-2">Acción Realizada</h4>
                     <span className="text-sm text-neutral-900">
                       {selectedLog.action}
                     </span>
                   </div>
                 </div>
                 
                 {selectedLog.entityName && (
                   <div>
                     <h4 className="text-sm font-semibold text-neutral-700 mb-2">Entidad Afectada</h4>
                     <span className="text-sm text-neutral-900">
                       {selectedLog.entityName}
                     </span>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
     </>
   );
 };

export default NotificationPanel;
