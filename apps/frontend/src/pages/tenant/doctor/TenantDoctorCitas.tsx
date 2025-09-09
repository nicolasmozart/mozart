import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Search, 
  Filter, 
  Eye, 
  Video, 
  Phone,
  X,
  RefreshCw
} from 'lucide-react';
import { useTenantAuth } from '../../../contexts/TenantAuthContext';
import { useTenant } from '../../../contexts/TenantContext';
import { AppointmentService } from '../../../services/appointmentService';
import type { Appointment } from '../../../services/appointmentService';
import { useAlert } from '../../../contexts/AlertContext';
import { MeetingService } from '../../../services/meetingService';

// Interfaz para citas con datos populados del paciente y doctor
interface CitaWithPopulate extends Omit<Appointment, 'pacienteId' | 'doctorId'> {
  pacienteId: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    idNumber?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    lastName: string;
    email: string;
    especialidad: string;
  };
  meetingId?: string; // Agregar meetingId opcional
}

const TenantDoctorCitas: React.FC = () => {
  const { user } = useTenantAuth();
  const { tenant } = useTenant();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  
  const [citas, setCitas] = useState<CitaWithPopulate[]>([]);
  const [filteredCitas, setFilteredCitas] = useState<CitaWithPopulate[]>([]);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agendadas');
  const [selectedCita, setSelectedCita] = useState<CitaWithPopulate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Función para refrescar las citas
  const refreshCitas = async () => {
    try {
      setRefreshing(true);
      
      // Obtener todas las citas
      const response = await AppointmentService.getAppointments();
      
      if (response.success && response.appointments) {
        // Filtrar citas del doctor actual
        const citasDelDoctor = response.appointments.filter((cita: any) => {
          const nombreCompleto = `${cita.doctorId.name} ${cita.doctorId.lastName}`;
          const nombreUsuario = `${user?.firstName} ${user?.lastName}`;
          
          console.log('🔍 Comparando:', {
            nombreCompleto,
            nombreUsuario,
            coincide: nombreCompleto === nombreUsuario
          });
          
          return nombreCompleto === nombreUsuario;
        });

        console.log('🔄 Citas refrescadas del doctor:', citasDelDoctor.length);
        
        setCitas(citasDelDoctor as unknown as CitaWithPopulate[]);
        setFilteredCitas(citasDelDoctor as unknown as CitaWithPopulate[]);
        
        showAlert({
          type: 'success',
          title: 'Citas actualizadas',
          message: 'La lista de citas se ha actualizado correctamente'
        });
      }
    } catch (error) {
      console.error('Error al refrescar citas:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron actualizar las citas'
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchCitas = async () => {
      try {
        setLoading(true);
        
        // Obtener todas las citas
        const response = await AppointmentService.getAppointments();
        
        if (response.success && response.appointments) {
          console.log('📋 Todas las citas del backend:', response.appointments.length);
          console.log('👨‍⚕️ Usuario autenticado (User ID):', user?._id);
          console.log('👨‍⚕️ Usuario autenticado:', user?.firstName, user?.lastName);
          
          // Filtrar citas por nombre del doctor (ya que los IDs son de tablas diferentes)
          // El user._id es de la tabla User, pero cita.doctorId._id es de la tabla Doctor
          const citasDelDoctor = response.appointments.filter((cita: any) => {
            const nombreCompleto = `${cita.doctorId?.name} ${cita.doctorId?.lastName}`;
            const nombreUsuario = `${user?.firstName} ${user?.lastName}`;
            
            console.log('🔍 Comparando nombres:', {
              citaDoctor: nombreCompleto,
              usuarioAutenticado: nombreUsuario,
              coincide: nombreCompleto === nombreUsuario
            });
            
            return nombreCompleto === nombreUsuario;
          });

          console.log('🏥 Citas filtradas del doctor:', citasDelDoctor.length);
          
          setCitas(citasDelDoctor as unknown as CitaWithPopulate[]);
          setFilteredCitas(citasDelDoctor as unknown as CitaWithPopulate[]);
        } else {
          console.error('Error en la respuesta de citas:', response);
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'No se pudieron cargar las citas'
          });
          setCitas([]);
          setFilteredCitas([]);
        }
      } catch (error) {
        console.error('Error al cargar citas:', error);
        showAlert({
          type: 'error',
          title: 'Error de conexión',
          message: 'No se pudo conectar con el servidor'
        });
        setCitas([]);
        setFilteredCitas([]);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar citas si tenemos un usuario autenticado
    if (user?._id) {
    fetchCitas();
    }
  }, [user?._id, showAlert]);

  useEffect(() => {
    filtrarCitas();
  }, [filtro, busqueda, citas, activeTab]);

  const filtrarCitas = () => {
    let filtered = [...citas];
    
    // Filtro por estado según la pestaña activa (vista del doctor)
    if (activeTab === 'agendadas') {
      filtered = filtered.filter(cita => cita.estado === 'Agendada');
    } else if (activeTab === 'completadas') {
      filtered = filtered.filter(cita => cita.estado === 'Completada');
    } else if (activeTab === 'canceladas') {
      filtered = filtered.filter(cita => 
        cita.estado === 'Cancelada' || cita.estado === 'No Asistió'
      );
    }
    
    // Filtro por búsqueda
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      filtered = filtered.filter(cita => {
        const nombreCompleto = `${cita.pacienteId.firstName} ${cita.pacienteId.lastName}`.toLowerCase();
        const motivoLower = cita.motivo?.toLowerCase() || '';
        return nombreCompleto.includes(busquedaLower) || motivoLower.includes(busquedaLower);
      });
    }
    
    // Filtro adicional por tipo (convertir a formato del backend)
    if (filtro !== 'todas') {
      const tipoBackend = filtro === 'virtual' ? 'Virtual' : 
                         filtro === 'presencial' ? 'Presencial' : 
                         filtro === 'telefonica' ? 'Telefónica' : filtro;
      filtered = filtered.filter(cita => cita.tipo === tipoBackend);
    }
    
    setFilteredCitas(filtered);
  };

  const formatearFecha = (dateString: string) => {
    // Usar el parseo correcto para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearHora = (horaString: string) => {
    const [hora, minutos] = horaString.split(':').map(Number);
    const periodo = hora >= 12 ? 'PM' : 'AM';
    const hora12 = hora % 12 || 12;
    return `${hora12}:${minutos.toString().padStart(2, '0')} ${periodo}`;
  };

  const contarCitasPorEstado = (estado: string) => {
    if (estado === 'agendada') {
      return citas.filter(cita => cita.estado === 'Agendada').length;
    } else if (estado === 'completada') {
      return citas.filter(cita => cita.estado === 'Completada').length;
    } else if (estado === 'cancelada') {
      return citas.filter(cita => 
        cita.estado === 'Cancelada' || cita.estado === 'No Asistió'
      ).length;
    }
    return citas.filter(cita => cita.estado === estado).length;
  };

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'PendienteAgendar':
        return 'bg-yellow-100 text-yellow-800';
      case 'Agendada':
        return 'bg-blue-100 text-blue-800';
      case 'Completada':
        return 'bg-green-100 text-green-800';
      case 'Cancelada':
        return 'bg-red-100 text-red-800';
      case 'No Asistió':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoClass = (tipo: string) => {
    switch (tipo) {
      case 'Virtual':
        return 'bg-blue-100 text-blue-800';
      case 'Presencial':
        return 'bg-green-100 text-green-800';
      case 'Telefónica':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const verDetalleCita = (cita: CitaWithPopulate) => {
    setSelectedCita(cita);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setSelectedCita(null);
  };

  const iniciarVideollamada = async (cita: CitaWithPopulate) => {
    try {
      setCreatingMeeting(true);
      
      let meetingId = cita.meetingId;
      
      // Si no existe meetingId, crear nueva reunión
      if (!meetingId) {
        console.log('🎬 Creando nueva videollamada para cita:', cita._id);
        
        const response = await MeetingService.createMeeting({
          citaId: cita._id,
          externalMeetingId: `cita-${cita._id}-${Date.now()}`
        });
        
        if (!response.success || !response.meeting) {
          throw new Error(response.error || 'Error creando videollamada');
        }
        
        meetingId = response.meeting.meetingId;
        console.log('✅ Videollamada creada:', meetingId);
        
        // Actualizar la cita en la lista local
        setCitas(prevCitas => 
          prevCitas.map(c => 
            c._id === cita._id 
              ? { ...c, meetingId: meetingId }
              : c
          )
        );
      } else {
        console.log('🎬 Usando videollamada existente:', meetingId);
      }
      
      // Navegar directo a la videoconsulta
      const videoCallUrl = `/${tenant?.domain}/videocall/${meetingId}`;
      navigate(videoCallUrl);
      
    } catch (error: any) {
      console.error('Error iniciando videollamada:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Error interno al crear la videollamada'
      });
    } finally {
      setCreatingMeeting(false);
    }
  };

  const iniciarLlamadaTelefonica = (cita: CitaWithPopulate) => {
    // Aquí se implementaría la lógica para llamar al paciente
    console.log('Llamar a:', cita.pacienteId.phone);
    if (cita.pacienteId.phone) {
      showAlert({
        type: 'info',
        title: 'Llamada telefónica',
        message: `Llamando a ${cita.pacienteId.firstName} ${cita.pacienteId.lastName} al ${cita.pacienteId.phone}`
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                <Calendar className="inline-block mr-2 h-6 w-6 text-primary-600" />
                Gestión de Citas
              </h1>
              <p className="text-gray-600">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                📍 {tenant?.name} • Dr. {user?.firstName} {user?.lastName}
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <button
                onClick={refreshCitas}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Actualizar Citas'}
              </button>
            </div>
            
            {/* Controles de filtro */}
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-4 md:mt-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar paciente o motivo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              </div>
              <div className="relative">
                <select
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full appearance-none"
                >
                  <option value="todas">Todos los tipos</option>
                  <option value="virtual">Virtual</option>
                  <option value="presencial">Presencial</option>
                  <option value="telefonica">Telefónica</option>
                </select>
                <Filter className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Pestañas */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'agendadas'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('agendadas')}
              >
                Agendadas ({contarCitasPorEstado('agendada')})
              </button>
              <button
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'completadas'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('completadas')}
              >
                Completadas ({contarCitasPorEstado('completada')})
              </button>
              <button
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'canceladas'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('canceladas')}
              >
                Canceladas ({contarCitasPorEstado('cancelada')})
              </button>
            </div>
          </div>

          {/* Lista de citas */}
          {filteredCitas.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No hay citas que coincidan con los criterios de búsqueda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha y Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCitas.map((cita) => (
                      <tr key={cita._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {cita.pacienteId.firstName} {cita.pacienteId.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{cita.pacienteId.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatearFecha(cita.fecha)}</div>
                          <div className="text-sm text-gray-500">{formatearHora(cita.hora)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTipoClass(cita.tipo)}`}>
                            {cita.tipo.charAt(0).toUpperCase() + cita.tipo.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {cita.motivo}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoClass(cita.estado)}`}>
                            {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => verDetalleCita(cita)}
                              className="text-primary-600 hover:text-primary-900 p-1 rounded"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {cita.tipo === 'Virtual' && cita.estado === 'Agendada' && (
                              <button
                                onClick={() => iniciarVideollamada(cita)}
                                disabled={creatingMeeting}
                                className="text-success-600 hover:text-success-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title={creatingMeeting ? "Creando videollamada..." : "Iniciar videollamada"}
                              >
                                {creatingMeeting ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-success-600 border-t-transparent"></div>
                                ) : (
                                <Video className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {cita.tipo === 'Telefónica' && cita.estado === 'Agendada' && (
                              <button
                                onClick={() => iniciarLlamadaTelefonica(cita)}
                                className="text-medical-600 hover:text-medical-900 p-1 rounded"
                                title="Llamar al paciente"
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal de detalle de cita */}
        {showModal && selectedCita && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detalle de la Cita</h2>
                  <button
                    onClick={cerrarModal}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Paciente</h3>
                    <p className="text-base font-medium text-gray-900">
                      {selectedCita.pacienteId.firstName} {selectedCita.pacienteId.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedCita.pacienteId.email}</p>
                    <p className="text-sm text-gray-500">{selectedCita.pacienteId.phone}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fecha y Hora</h3>
                    <p className="text-base font-medium text-gray-900">
                      {formatearFecha(selectedCita.fecha)} - {formatearHora(selectedCita.hora)}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tipo de Cita</h3>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTipoClass(selectedCita.tipo)}`}>
                      {selectedCita.tipo.charAt(0).toUpperCase() + selectedCita.tipo.slice(1)}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoClass(selectedCita.estado)}`}>
                      {selectedCita.estado.charAt(0).toUpperCase() + selectedCita.estado.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Motivo de la Cita</h3>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedCita.motivo}
                  </p>
                </div>

                {selectedCita.notas && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Notas</h3>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedCita.notas}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  {selectedCita.tipo === 'Virtual' && selectedCita.estado === 'Agendada' && (
                    <button
                      onClick={() => iniciarVideollamada(selectedCita)}
                      disabled={creatingMeeting}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingMeeting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      ) : (
                      <Video className="mr-2 h-4 w-4" />
                      )}
                      {creatingMeeting ? 'Creando...' : 'Iniciar Videollamada'}
                    </button>
                  )}
                  
                  {selectedCita.tipo === 'Telefónica' && selectedCita.estado === 'Agendada' && (
                    <button
                      onClick={() => iniciarLlamadaTelefonica(selectedCita)}
                      className="bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 flex items-center"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Llamar Paciente
                    </button>
                  )}
                  
                  <button
                    onClick={cerrarModal}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default TenantDoctorCitas;
