import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Eye, Trash2, Phone, MessageCircle, Calendar, PhoneCall, FileText, TrendingUp, MoreHorizontal, Key, ChevronDown } from 'lucide-react';
import { PatientService } from '../services/patientService';
import type { Patient } from '../services/patientService';
import { useAlert } from '../contexts/AlertContext';
import { useTenant } from '../contexts/TenantContext';
import AppointmentModal from '../components/AppointmentModal';

const TenantPatients: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const { tenant } = useTenant();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPatients, setDeletingPatients] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: string }>({});
  const [patientStats, setPatientStats] = useState<{ total: number; eliminados: number }>({ total: 0, eliminados: 0 });
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // Función para verificar si una columna debe mostrarse
  const shouldShowColumn = (columnType: 'presentacion' | 'verificacion' | 'agendarEntrevista' | 'tamizaje') => {
    if (!tenant?.agendamiento) return false;
    
    // Obtener las URLs del tipo específico
    let urls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }> = [];
    
    switch (columnType) {
      case 'presentacion':
        urls = tenant.agendamiento.presentacionUrls;
        break;
      case 'verificacion':
        urls = tenant.agendamiento.verificacionDatosUrls;
        break;
      case 'agendarEntrevista':
        urls = tenant.agendamiento.agendarEntrevistaUrls;
        break;
      case 'tamizaje':
        urls = tenant.agendamiento.tamizajeUrls;
        break;
      default:
        return false;
    }
    
    // Solo mostrar la columna si hay al menos una URL con contenido real
    return urls.some(url => url.url && url.url.trim() !== '');
  };

  // Función para obtener las URLs de un tipo específico
  const getUrlsForType = (columnType: 'presentacion' | 'verificacion' | 'agendarEntrevista' | 'tamizaje') => {
    if (!tenant?.agendamiento) return [];
    
    let urls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }> = [];
    
    switch (columnType) {
      case 'presentacion':
        urls = tenant.agendamiento.presentacionUrls;
        break;
      case 'verificacion':
        urls = tenant.agendamiento.verificacionDatosUrls;
        break;
      case 'agendarEntrevista':
        urls = tenant.agendamiento.agendarEntrevistaUrls;
        break;
      case 'tamizaje':
        urls = tenant.agendamiento.tamizajeUrls;
        break;
      default:
        return [];
    }
    
    // Solo devolver URLs que tengan contenido real
    return urls.filter(url => url.url && url.url.trim() !== '');
  };

  // Función para manejar el envío a una URL específica
  const handleSendToUrl = (url: string, tipo: string) => {
    if (url && url.trim() !== '') {
      window.open(url, '_blank');
    } else {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'URL no configurada para este tipo de comunicación'
      });
    }
  };

  // Función para manejar dropdowns
  const toggleDropdown = (patientId: string, columnType: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [patientId]: prev[patientId] === columnType ? '' : columnType
    }));
  };

  // Componente para botones inteligentes
  const SmartActionButton = ({ 
    patientId, 
    columnType, 
    urls, 
    label 
  }: { 
    patientId: string; 
    columnType: string; 
    urls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }>; 
    label: string; 
  }) => {
    const isOpen = openDropdowns[patientId] === columnType;
    const hasMultipleOptions = urls.length > 1;
    const hasSingleOption = urls.length === 1;

    if (urls.length === 0) {
      return null; // No mostrar nada si no hay URLs
    }

    if (hasSingleOption) {
      const url = urls[0];
      return (
        <button
          onClick={() => handleSendToUrl(url.url, url.tipo)}
          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
        >
          {url.tipo === 'wpp' ? (
            <MessageCircle className="h-3 w-3 mr-1" />
          ) : (
            <Phone className="h-3 w-3 mr-1" />
          )}
          {url.tipo === 'wpp' ? 'WhatsApp' : 'Llamada'}
        </button>
      );
    }

    if (hasMultipleOptions) {
      return (
        <div className="relative">
          <button
            onClick={() => toggleDropdown(patientId, columnType)}
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
          >
            Enviar
            <ChevronDown className="h-3 w-3 ml-1" />
          </button>
          
          {isOpen && (
            <div className="absolute z-10 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200">
              {urls.map((url) => (
                <button
                  key={url._id}
                  onClick={() => {
                    handleSendToUrl(url.url, url.tipo);
                    toggleDropdown(patientId, columnType);
                  }}
                  className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                >
                  {url.tipo === 'wpp' ? '📱 WhatsApp' : '📞 Llamada'}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await PatientService.getPatients();
      setPatients(response.patients);
      
      // Cargar estadísticas de pacientes
      try {
        const stats = await PatientService.getPatientStats();
        setPatientStats({
          total: stats.stats.total,
          eliminados: stats.stats.total - response.patients.length
        });
      } catch (statsError) {
        console.warn('No se pudieron cargar las estadísticas:', statsError);
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar los pacientes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este paciente? Esta acción no se puede deshacer, pero el paciente se puede restaurar más tarde.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning'
    });

    if (confirmed) {
      try {
        // Marcar el paciente como siendo eliminado
        setDeletingPatients(prev => new Set(prev).add(patientId));
        
        await PatientService.deletePatient(patientId);
        
        // Actualizar la lista local
        setPatients(prev => prev.filter(p => p._id !== patientId));
        showAlert({
          type: 'success',
          title: 'Paciente Eliminado',
          message: `El paciente ha sido eliminado exitosamente. Solo los pacientes activos son visibles en la lista. (${patients.length - 1} pacientes activos restantes)`
        });
      } catch (error) {
        console.error('Error eliminando paciente:', error);
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Error al eliminar el paciente. Por favor, inténtalo de nuevo.'
        });
      } finally {
        // Remover el paciente del estado de eliminación
        setDeletingPatients(prev => {
          const newSet = new Set(prev);
          newSet.delete(patientId);
          return newSet;
        });
      }
    }
  };

  const handleEditPatient = (patientId: string) => {
    navigate(`/tenant/patients/edit/${patientId}`);
  };

  const handleViewPatient = (patientId: string) => {
    navigate(`/tenant/patients/view/${patientId}`);
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    if (activeTab === 'emergencia') {
      return patient.necesitaEmergencia && fullName.includes(searchLower);
    }
    
    return fullName.includes(searchLower) || 
           patient.idNumber.includes(searchLower) || 
           patient.email?.includes(searchLower) ||
           patient.phone.includes(searchLower);
  });

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Completado' : 'Pendiente';
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header del Tenant */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Pacientes
          </h1>
        </div>
        <p className="text-gray-600">
          Administra la información de tus pacientes. Los pacientes eliminados se ocultan de la vista pero se pueden restaurar más tarde.
        </p>
        {patientStats.eliminados > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">📊 Estadísticas:</span> {patientStats.total} pacientes totales, 
              {patientStats.eliminados} pacientes eliminados (ocultos de la vista)
            </p>
          </div>
        )}
      </div>

      {/* Header con tabs */}
      <div className="mb-6">
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="todos">Todos los Pacientes</option>
            <option value="emergencia">Emergencia</option>
          </select>
        </div>
        <div className="hidden sm:block">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('todos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'todos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Todos los Pacientes
            </button>
            <button
              onClick={() => setActiveTab('emergencia')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'emergencia'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Emergencia
            </button>
          </nav>
        </div>
      </div>

      {/* Barra de búsqueda y botón crear */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar pacientes por nombre, identificación, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPatients}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualizar lista de pacientes"
          >
            <div className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}>
              {loading ? (
                <div className="rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </div>
          </button>
          <button
            onClick={() => navigate('/tenant/patients/create')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Paciente
          </button>
          <button
            onClick={() => setIsAppointmentModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Agendar Cita
          </button>
        </div>
      </div>

      {/* Tabla de pacientes */}
      <div className="bg-white shadow sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              {shouldShowColumn('presentacion') && (
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Presentación
                </th>
              )}
              {shouldShowColumn('verificacion') && (
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verificación
                </th>
              )}
              {shouldShowColumn('agendarEntrevista') && (
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agendar
                </th>
              )}
              {shouldShowColumn('tamizaje') && (
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tamizaje
                </th>
              )}
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Llamar
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Historia
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seguimiento
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <tr key={patient._id} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-sm font-medium text-gray-900 max-w-32">
                  <div className="break-words leading-tight">
                    {PatientService.getFullName(patient)}
                  </div>
                </td>
                <td className="px-2 py-2 text-sm text-gray-500 max-w-24">
                  <div className="break-words leading-tight">
                    {patient.idNumber}
                  </div>
                </td>
                <td className="px-2 py-2 text-sm text-gray-500 max-w-24">
                  <div className="break-words leading-tight">
                    {PatientService.formatPhone(patient.phone)}
                  </div>
                </td>
                <td className="px-2 py-2 text-sm text-gray-500 max-w-32">
                  <div className="break-words leading-tight">{patient.email || '-'}</div>
                </td>
                {shouldShowColumn('presentacion') && (
                  <td className="px-2 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <SmartActionButton
                        patientId={patient._id}
                        columnType="presentacion"
                        urls={getUrlsForType('presentacion')}
                        label="Presentación"
                      />
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.verificaciondatos)}`}>
                        {getStatusText(patient.verificaciondatos)}
                      </span>
                    </div>
                  </td>
                )}
                {shouldShowColumn('verificacion') && (
                  <td className="px-2 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <SmartActionButton
                        patientId={patient._id}
                        columnType="verificacion"
                        urls={getUrlsForType('verificacion')}
                        label="Verificación"
                      />
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.verificaciondatos)}`}>
                        {getStatusText(patient.verificaciondatos)}
                      </span>
                    </div>
                  </td>
                )}
                {shouldShowColumn('agendarEntrevista') && (
                  <td className="px-2 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <SmartActionButton
                        patientId={patient._id}
                        columnType="agendarEntrevista"
                        urls={getUrlsForType('agendarEntrevista')}
                        label="Agendar"
                      />
                    </div>
                  </td>
                )}
                {shouldShowColumn('tamizaje') && (
                  <td className="px-2 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <SmartActionButton
                        patientId={patient._id}
                        columnType="tamizaje"
                        urls={getUrlsForType('tamizaje')}
                        label="Tamizaje"
                      />
                    </div>
                  </td>
                )}
                <td className="px-2 py-2 text-center">
                  <PhoneCall className="h-4 w-4 text-blue-600 mx-auto" />
                </td>
                <td className="px-2 py-2 text-center">
                  <FileText className="h-4 w-4 text-blue-600 mx-auto" />
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col items-center space-y-1">
                    <button className="inline-flex items-center px-1.5 py-0.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Seg
                    </button>
                    <div className="text-xs text-gray-500 text-center">
                      <div>C: 0 | E: 0</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => handleEditPatient(patient._id)}
                      className="text-indigo-600 hover:text-indigo-900 p-1"
                      title="Editar Perfil"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => console.log('Cambiar contraseña', patient._id)}
                      className="text-yellow-600 hover:text-yellow-900 p-1"
                      title="Cambiar Contraseña"
                    >
                      <Key className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeletePatient(patient._id)}
                      disabled={deletingPatients.has(patient._id)}
                      className={`p-1 ${
                        deletingPatients.has(patient._id)
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-900'
                      }`}
                      title={deletingPatients.has(patient._id) ? 'Eliminando...' : 'Eliminar Paciente'}
                    >
                      {deletingPatients.has(patient._id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mensaje cuando no hay pacientes */}
      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {searchTerm ? 'No se encontraron pacientes que coincidan con la búsqueda.' : 'No hay pacientes registrados.'}
          </div>
          {!searchTerm && (
            <button
              onClick={() => navigate('/tenant/patients/create')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear el primer paciente
            </button>
          )}
        </div>
      )}

      {/* Modal de Agendar Cita */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSuccess={() => {
          setIsAppointmentModalOpen(false);
          // Aquí podrías recargar la lista de pacientes o hacer alguna otra acción
          showAlert({
            type: 'success',
            title: 'Cita Agendada',
            message: 'La cita se ha agendado exitosamente'
          });
        }}
      />
    </div>
  );
};

export default TenantPatients;
