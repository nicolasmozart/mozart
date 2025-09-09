import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Phone,
  MapPin,
  Filter,
  Search,
  CalendarDays,
  List,
  X
} from 'lucide-react';
import { useTenantAuth } from '../../../contexts/TenantAuthContext';
import { AppointmentService } from '../../../services/appointmentService';
import type { Appointment } from '../../../services/appointmentService';
import { useAlert } from '../../../contexts/AlertContext';

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
  duracion?: number; // Agregar duracion como opcional
}

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointments: CitaWithPopulate[];
  hasMultipleAppointments: boolean;
}

const TenantDoctorCalendario: React.FC = () => {
  const { user } = useTenantAuth();
  const { showAlert } = useAlert();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Estado para las citas reales
  const [citas, setCitas] = useState<CitaWithPopulate[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar citas reales del doctor
  useEffect(() => {
    const fetchCitas = async () => {
      try {
        setLoading(true);
        
        // Obtener todas las citas
        const response = await AppointmentService.getAppointments();
        
        if (response.success && response.appointments) {
          console.log('📅 Calendario: Citas del backend:', response.appointments.length);
          
          // Filtrar citas por nombre del doctor (mismo filtro que en TenantDoctorCitas)
          const citasDelDoctor = response.appointments.filter((cita: any) => {
            const nombreCompleto = `${cita.doctorId?.name} ${cita.doctorId?.lastName}`;
            const nombreUsuario = `${user?.firstName} ${user?.lastName}`;
            return nombreCompleto === nombreUsuario;
          });

          console.log('🏥 Calendario: Citas filtradas del doctor:', citasDelDoctor.length);
          
          setCitas(citasDelDoctor as unknown as CitaWithPopulate[]);
        } else {
          console.error('Error en la respuesta de citas:', response);
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'No se pudieron cargar las citas'
          });
          setCitas([]);
        }
      } catch (error) {
        console.error('Error al cargar citas en calendario:', error);
        showAlert({
          type: 'error',
          title: 'Error de conexión',
          message: 'No se pudo conectar con el servidor'
        });
        setCitas([]);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar citas si tenemos un usuario autenticado
    if (user?._id) {
      fetchCitas();
    }
  }, [user?._id, showAlert]);


  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'PendienteAgendar':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Agendada':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'No Asistió':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoIcono = (tipo: string) => {
    switch (tipo) {
      case 'Virtual': return <Video className="h-4 w-4 text-blue-500" />;
      case 'Telefónica': return <Phone className="h-4 w-4 text-green-500" />;
      case 'Presencial': return <MapPin className="h-4 w-4 text-purple-500" />;
      default: return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'Virtual': return 'border-l-blue-500';
      case 'Telefónica': return 'border-l-green-500';
      case 'Presencial': return 'border-l-purple-500';
      default: return 'border-l-gray-500';
    }
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };


  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(2025, 8, 1 + i); // Septiembre 2025
      days.push(date.toLocaleDateString('es-ES', { weekday: 'short' }));
    }
    return days;
  };

  const generateCalendarDays = (): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: DayData[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      // Filtrar citas por fecha y aplicar filtros activos
      let appointments = citas.filter(cita => cita.fecha.split('T')[0] === dateStr);
      
      // Aplicar filtros de tipo
      if (filterType !== 'all') {
        const tipoBackend = filterType === 'virtual' ? 'Virtual' : 
                           filterType === 'presencial' ? 'Presencial' : 
                           filterType === 'telefonica' ? 'Telefónica' : filterType;
        appointments = appointments.filter(cita => cita.tipo === tipoBackend);
      }
      
      // Aplicar filtros de estado
      if (filterStatus !== 'all') {
        if (filterStatus === 'agendada') {
          appointments = appointments.filter(cita => cita.estado === 'Agendada');
        } else if (filterStatus === 'completada') {
          appointments = appointments.filter(cita => cita.estado === 'Completada');
        } else if (filterStatus === 'cancelada') {
          appointments = appointments.filter(cita => 
            cita.estado === 'Cancelada' || cita.estado === 'No Asistió'
          );
        } else {
          appointments = appointments.filter(cita => cita.estado === filterStatus);
        }
      }
      
      // Aplicar filtro de búsqueda
      if (searchTerm) {
        appointments = appointments.filter(cita => 
          cita.pacienteId.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cita.pacienteId.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cita.pacienteId.idNumber && cita.pacienteId.idNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate ? date.toDateString() === selectedDate.toDateString() : false,
        appointments,
        hasMultipleAppointments: appointments.length > 1
      });
    }
    
    return days;
  };

  const getFilteredAppointments = () => {
    let filtered = citas;
    
    if (filterType !== 'all') {
      // Mapear los tipos del filtro a los tipos del backend
      const tipoBackend = filterType === 'virtual' ? 'Virtual' : 
                         filterType === 'presencial' ? 'Presencial' : 
                         filterType === 'telefonica' ? 'Telefónica' : filterType;
      filtered = filtered.filter(cita => cita.tipo === tipoBackend);
    }
    
    if (filterStatus !== 'all') {
      // Mapear los estados del filtro a los estados del backend
      if (filterStatus === 'agendada') {
        filtered = filtered.filter(cita => cita.estado === 'Agendada');
      } else if (filterStatus === 'completada') {
        filtered = filtered.filter(cita => cita.estado === 'Completada');
      } else if (filterStatus === 'cancelada') {
        filtered = filtered.filter(cita => 
          cita.estado === 'Cancelada' || cita.estado === 'No Asistió'
        );
      } else {
        filtered = filtered.filter(cita => cita.estado === filterStatus);
      }
    }
    
    if (searchTerm) {
      filtered = filtered.filter(cita => 
        cita.pacienteId.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cita.pacienteId.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cita.pacienteId.idNumber && cita.pacienteId.idNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    let appointments = citas.filter(cita => cita.fecha.split('T')[0] === dateStr);
    
    // Aplicar los mismos filtros que en el calendario
    if (filterType !== 'all') {
      const tipoBackend = filterType === 'virtual' ? 'Virtual' : 
                         filterType === 'presencial' ? 'Presencial' : 
                         filterType === 'telefonica' ? 'Telefónica' : filterType;
      appointments = appointments.filter(cita => cita.tipo === tipoBackend);
    }
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'agendada') {
        appointments = appointments.filter(cita => cita.estado === 'Agendada');
      } else if (filterStatus === 'completada') {
        appointments = appointments.filter(cita => cita.estado === 'Completada');
      } else if (filterStatus === 'cancelada') {
        appointments = appointments.filter(cita => 
          cita.estado === 'Cancelada' || cita.estado === 'No Asistió'
        );
      } else {
        appointments = appointments.filter(cita => cita.estado === filterStatus);
      }
    }
    
    if (searchTerm) {
      appointments = appointments.filter(cita => 
        cita.pacienteId.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cita.pacienteId.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cita.pacienteId.idNumber && cita.pacienteId.idNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return appointments;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const calendarDays = generateCalendarDays();
  const filteredAppointments = getFilteredAppointments();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        <span className="ml-3 text-neutral-600">Cargando calendario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del calendario */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-neutral-900">Calendario Médico</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Hoy
              </button>
              <div className="flex items-center space-x-2 bg-neutral-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'calendar' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'agenda' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold text-neutral-900 min-w-[200px] text-center">
                {getMonthName(currentDate)}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o cédula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
                <option value="telefonica">Telefónica</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="agendada">Agendada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        /* Vista de Calendario */
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 bg-neutral-50 border-b border-neutral-200">
            {getWeekDays().map((day, index) => (
              <div key={index} className="p-4 text-center">
                <span className="text-sm font-semibold text-neutral-600 uppercase">{day}</span>
              </div>
            ))}
          </div>
          
          {/* Días del calendario */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDateClick(day.date)}
                className={`min-h-[120px] p-2 border-r border-b border-neutral-200 cursor-pointer transition-all duration-200 hover:bg-neutral-50 ${
                  !day.isCurrentMonth ? 'bg-neutral-50 text-neutral-400' : ''
                } ${
                  day.isToday ? 'bg-primary-50 border-primary-200' : ''
                } ${
                  day.isSelected ? 'bg-primary-100 border-primary-300' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    day.isToday ? 'text-primary-700' : 
                    day.isSelected ? 'text-primary-800' : 
                    'text-neutral-900'
                  }`}>
                    {day.date.getDate()}
                  </span>
                  {day.appointments.length > 0 && (
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 text-xs rounded-full flex items-center justify-center font-medium">
                      {day.appointments.length}
                    </span>
                  )}
                </div>
                
                {/* Citas del día */}
                <div className="space-y-1">
                  {day.appointments.slice(0, 2).map((cita) => (
                    <div
                      key={cita._id}
                      className={`p-2 rounded-lg text-xs border-l-4 ${getTipoColor(cita.tipo)} bg-white shadow-sm`}
                    >
                      <div className="flex items-center space-x-1 mb-1">
                        {getTipoIcono(cita.tipo)}
                        <span className="font-medium text-neutral-900 truncate">
                          {cita.pacienteId.firstName}
                        </span>
                      </div>
                      <div className="text-neutral-600 truncate">{cita.hora}</div>
                      <div className={`inline-block px-1 py-0.5 rounded text-xs font-medium ${getStatusColor(cita.estado)}`}>
                        {cita.estado}
                      </div>
                    </div>
                  ))}
                  
                  {day.appointments.length > 2 && (
                    <div className="text-xs text-neutral-500 text-center py-1">
                      +{day.appointments.length - 2} más
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Vista de Agenda */
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Agenda de Citas</h3>
          
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 text-lg">No hay citas que coincidan con los filtros</p>
              <p className="text-neutral-400">Intenta ajustar los filtros o crear una nueva cita</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((cita) => (
                <div
                  key={cita._id}
                  className={`p-4 rounded-lg border-l-4 ${getTipoColor(cita.tipo)} bg-white border border-neutral-200 hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getTipoIcono(cita.tipo)}
                        <h4 className="font-semibold text-neutral-900">
                          {cita.pacienteId.firstName} {cita.pacienteId.lastName}
                        </h4>
                        <span className="text-sm text-neutral-600">
                          {cita.pacienteId.idNumber}
                        </span>
                      </div>
                      
                      <p className="text-neutral-700 mb-2">{cita.motivo}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-neutral-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{cita.hora}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{new Date(cita.fecha).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}</span>
                        </div>
                      </div>
                      
                      {cita.notas && (
                        <div className="mt-2 p-2 bg-neutral-50 rounded text-sm text-neutral-600">
                          <span className="font-medium">Notas:</span> {cita.notas}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </div>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel lateral de detalles de fecha seleccionada */}
      {selectedDate && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-neutral-200 transform transition-transform duration-300 ease-in-out z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">
                {selectedDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {getAppointmentsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No hay citas programadas</p>
                 
                </div>
              ) : (
                getAppointmentsForDate(selectedDate).map((cita) => (
                  <div
                    key={cita._id}
                    className={`p-4 rounded-lg border-l-4 ${getTipoColor(cita.tipo)} bg-neutral-50 border border-neutral-200`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      {getTipoIcono(cita.tipo)}
                      <div>
                        <h4 className="font-semibold text-neutral-900">
                          {cita.pacienteId.firstName} {cita.pacienteId.lastName}
                        </h4>
                        <p className="text-sm text-neutral-600">{cita.hora}</p>
                      </div>
                    </div>
                    
                    <p className="text-neutral-700 mb-3">{cita.motivo}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </div>
                      
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDoctorCalendario;
