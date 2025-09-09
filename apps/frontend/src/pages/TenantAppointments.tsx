import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Phone,
  Search,
  Eye,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Video,
  MapPin
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { AppointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';

type AppointmentStatus = 'all' | 'pendiente' | 'Agendada' | 'Completada' | 'Cancelada' | 'No Asistió' | 'vencidas';

interface AppointmentWithPopulate extends Omit<Appointment, 'pacienteId' | 'doctorId'> {
  duracion?: number;
  consentimientoFirmado?: boolean;
  pacienteId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    idNumber: string;
  };
  doctorId?: {
    _id: string;
    name: string;
    lastName: string;
    email: string;
    especialidad: string;
  };
}

const TenantAppointments: React.FC = () => {
  const { showAlert } = useAlert();
  const [appointments, setAppointments] = useState<AppointmentWithPopulate[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithPopulate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppointmentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPopulate | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Función para cargar las citas
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await AppointmentService.getAppointments();
      if (response.success && response.appointments) {
        setAppointments(response.appointments as unknown as AppointmentWithPopulate[]);
      }
    } catch (error) {
      console.error('Error cargando citas:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las citas'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar citas al montar el componente
  useEffect(() => {
    loadAppointments();
  }, []);

  // Filtrar citas por estado y búsqueda
  useEffect(() => {
    let filtered = appointments;

    // Filtrar por estado
    if (activeTab !== 'all') {
      if (activeTab === 'vencidas') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = appointments.filter(appointment => {
          if (!appointment.fecha) return false;
          const appointmentDate = new Date(appointment.fecha);
          appointmentDate.setHours(0, 0, 0, 0);
          return appointmentDate < today && appointment.estado !== 'Completada' && appointment.estado !== 'Cancelada';
        });
      } else {
        filtered = appointments.filter(appointment => appointment.estado === activeTab);
      }
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        `${appointment.pacienteId.firstName} ${appointment.pacienteId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.pacienteId.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.pacienteId.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.doctorId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.doctorId?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.motivo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  }, [appointments, activeTab, searchTerm]);

  // Función para obtener el icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Agendada':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'Completada':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'Cancelada':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'No Asistió':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Agendada':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completada':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'No Asistió':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener el icono del tipo de cita
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Virtual':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'Telefónica':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'Presencial':
        return <MapPin className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  // Función para formatear la fecha (con parseo correcto para evitar problemas de zona horaria)
  const formatDate = (dateString: string) => {
    // Parsear la fecha de manera explícita para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Función para formatear fecha corta
  const formatDateShort = (dateString: string) => {
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  };

  // Función para formatear la hora
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Contadores para las pestañas
  const getCounts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const vencidas = appointments.filter(appointment => {
      if (!appointment.fecha) return false;
      const appointmentDate = new Date(appointment.fecha);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate < today && appointment.estado !== 'Completada' && appointment.estado !== 'Cancelada';
    }).length;

    return {
      all: appointments.length,
      pendiente: appointments.filter(a => a.estado === 'pendiente').length,
      Agendada: appointments.filter(a => a.estado === 'Agendada').length,
      Completada: appointments.filter(a => a.estado === 'Completada').length,
      Cancelada: appointments.filter(a => a.estado === 'Cancelada').length,
      'No Asistió': appointments.filter(a => a.estado === 'No Asistió').length,
      vencidas
    };
  };

  const counts = getCounts();

  const tabs = [
    { key: 'all', label: 'Todas', count: counts.all, color: 'text-gray-600' },
    { key: 'pendiente', label: 'Pendientes', count: counts.pendiente, color: 'text-yellow-600' },
    { key: 'Agendada', label: 'Agendadas', count: counts.Agendada, color: 'text-blue-600' },
    { key: 'Completada', label: 'Completadas', count: counts.Completada, color: 'text-emerald-600' },
    { key: 'Cancelada', label: 'Canceladas', count: counts.Cancelada, color: 'text-red-600' },
    { key: 'No Asistió', label: 'No asistió', count: counts['No Asistió'], color: 'text-orange-600' },
    { key: 'vencidas', label: 'Vencidas', count: counts.vencidas, color: 'text-purple-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas Agendadas</h1>
          <p className="text-gray-600">Gestiona todas las citas médicas de tu institución</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={loadAppointments}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, doctor, motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full lg:w-80"
            />
          </div>

          {/* Información de resultados */}
          <div className="text-sm text-gray-600">
            Mostrando {filteredAppointments.length} de {appointments.length} citas
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as AppointmentStatus)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={tab.color}>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Lista de citas */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'all' 
                  ? 'No se encontraron citas en el sistema'
                  : `No hay citas en estado "${tabs.find(t => t.key === activeTab)?.label}"`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment._id} className="hover:bg-gray-50 transition-colors">
                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(appointment.estado)}`}>
                          {getStatusIcon(appointment.estado)}
                          <span className="ml-1">{appointment.estado}</span>
                        </span>
                      </td>

                      {/* Paciente */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {appointment.pacienteId.firstName} {appointment.pacienteId.lastName}
                          </div>
                          <div className="text-gray-500">
                            {appointment.pacienteId.idNumber}
                          </div>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {appointment.doctorId ? (
                            <>
                              <div className="font-medium text-gray-900">
                                Dr. {appointment.doctorId.name} {appointment.doctorId.lastName}
                              </div>
                              <div className="text-gray-500">
                                {appointment.doctorId.email}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-400 italic">Sin asignar</div>
                          )}
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.fecha ? (
                          formatDateShort(appointment.fecha)
                        ) : (
                          <span className="text-gray-400 italic">Pendiente</span>
                        )}
                      </td>

                      {/* Hora */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.hora ? (
                          formatTime(appointment.hora)
                        ) : (
                          <span className="text-gray-400 italic">Pendiente</span>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-sm">
                          {getTypeIcon(appointment.tipo)}
                          <span className="ml-1">{appointment.tipo}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de la Cita
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Estado y tipo */}
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.estado)}`}>
                  {getStatusIcon(selectedAppointment.estado)}
                  <span className="ml-2">{selectedAppointment.estado}</span>
                </span>
                <span className="inline-flex items-center text-sm text-gray-600">
                  {getTypeIcon(selectedAppointment.tipo)}
                  <span className="ml-2">{selectedAppointment.tipo}</span>
                </span>
              </div>

              {/* Información completa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información del Paciente</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Nombre completo</dt>
                      <dd className="text-gray-900">{selectedAppointment.pacienteId.firstName} {selectedAppointment.pacienteId.lastName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Número de identificación</dt>
                      <dd className="text-gray-900">{selectedAppointment.pacienteId.idNumber}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Teléfono</dt>
                      <dd className="text-gray-900">{selectedAppointment.pacienteId.phone}</dd>
                    </div>
                    {selectedAppointment.pacienteId.email && (
                      <div>
                        <dt className="font-medium text-gray-500">Email</dt>
                        <dd className="text-gray-900">{selectedAppointment.pacienteId.email}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información del Doctor</h4>
                  {selectedAppointment.doctorId ? (
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-500">Nombre completo</dt>
                        <dd className="text-gray-900">Dr. {selectedAppointment.doctorId.name} {selectedAppointment.doctorId.lastName}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500">Email</dt>
                        <dd className="text-gray-900">{selectedAppointment.doctorId.email}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-gray-400 text-sm">Sin doctor asignado</p>
                  )}
                </div>
              </div>

              {/* Fecha y hora */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Fecha y Hora</h4>
                {selectedAppointment.fecha ? (
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium text-gray-500">Fecha: </span>
                      <span className="text-gray-900">{formatDate(selectedAppointment.fecha)}</span>
                    </div>
                    {selectedAppointment.hora && (
                      <div>
                        <span className="font-medium text-gray-500">Hora: </span>
                        <span className="text-gray-900">{formatTime(selectedAppointment.hora)}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-500">Duración: </span>
                      <span className="text-gray-900">{selectedAppointment.duracion} minutos</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Fecha pendiente de asignación</p>
                )}
              </div>

              {/* Motivo y notas */}
              {selectedAppointment.motivo && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Motivo de la consulta</h4>
                  <p className="text-gray-600 text-sm">{selectedAppointment.motivo}</p>
                </div>
              )}

              {selectedAppointment.notas && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notas adicionales</h4>
                  <p className="text-gray-600 text-sm">{selectedAppointment.notas}</p>
                </div>
              )}

              {/* Información adicional */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Información adicional</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Creada: </span>
                    <span className="text-gray-900">
                      {new Date(selectedAppointment.createdAt!).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Consentimiento: </span>
                    <span className="text-gray-900">
                      {selectedAppointment.consentimientoFirmado ? 'Firmado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantAppointments;
