import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  User, 
  Stethoscope, 
  Video, 
  Phone, 
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { PatientService } from '../services/patientService';
import { DoctorAvailabilityService } from '../services/doctorAvailabilityService';
import { AppointmentService } from '../services/appointmentService';
import { SpecialtyService } from '../services/specialtyService';
import { DoctorService } from '../services/doctorService';
import type { Patient } from '../services/patientService';
import type { Specialty } from '../services/specialtyService';
import type { Doctor } from '../services/doctorService';

interface AppointmentFormData {
  pacienteId: string;
  doctorId: string;
  especialidad: string;
  fecha: string;
  hora: string;
  tipo: 'Presencial' | 'Virtual' | 'Telefónica';
  motivo: string;
  notas: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showAlert } = useAlert();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Estados para los datos del formulario
  const [formData, setFormData] = useState<AppointmentFormData>({
    pacienteId: '',
    doctorId: '',
    especialidad: '',
    fecha: '',
    hora: '',
    tipo: 'Presencial',
    motivo: '',
    notas: ''
  });

  // Estados para los datos
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [especialidades, setEspecialidades] = useState<Specialty[]>([]);
  const [fechasDisponibles, setFechasDisponibles] = useState<Array<{fechaStr: string, displayStr: string}>>([]);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);

  // Estados para selecciones
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Patient | null>(null);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState<Doctor | null>(null);
  const [pacienteBusqueda, setPacienteBusqueda] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      cargarPacientes();
      cargarEspecialidades();
    }
  }, [isOpen]);

  // Cargar pacientes
  const cargarPacientes = async () => {
    try {
      const response = await PatientService.getPatients();
      if (response.patients) {
        setPacientes(response.patients);
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    }
  };

  // Cargar especialidades
  const cargarEspecialidades = async () => {
    try {
      const response = await SpecialtyService.getSpecialties();
      if (response.success && response.specialties) {
        setEspecialidades(response.specialties);
      }
    } catch (error) {
      console.error('Error cargando especialidades:', error);
    }
  };

  // Cargar doctores por especialidad
  const cargarDoctoresPorEspecialidad = async (specialtyId: string) => {
    try {
      const response = await DoctorService.getDoctorsBySpecialty(specialtyId);
      if (response.success && response.doctors) {
        setDoctores(response.doctors);
      }
    } catch (error) {
      console.error('Error cargando doctores por especialidad:', error);
      setDoctores([]);
    }
  };

  // Filtrar doctores por especialidad
  const filtrarDoctoresPorEspecialidad = () => {
    if (!formData.especialidad) return [];
    return doctores.filter(d => d.especialidad._id === formData.especialidad);
  };

  // Cargar disponibilidad del doctor
  const cargarDisponibilidadDoctor = async (doctorId: string) => {
    try {
      setLoading(true);
      const response = await DoctorAvailabilityService.getDoctorAvailability(doctorId);
      
      if (response.success) {
        // Generar fechas disponibles para los próximos 30 días
        const fechas = [];
        const hoy = new Date();
        
        // Mapeo de nombres de días en español
        const mapeoDias: { [key: string]: string } = {
          'monday': 'lunes',
          'tuesday': 'martes', 
          'wednesday': 'miercoles',
          'thursday': 'jueves',
          'friday': 'viernes',
          'saturday': 'sabado',
          'sunday': 'domingo'
        };
        
        for (let i = 0; i < 30; i++) {
          const fecha = new Date(hoy);
          fecha.setDate(hoy.getDate() + i);
          
          // Obtener el nombre del día en inglés y mapearlo a español
          const nombreDiaIngles = fecha.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const nombreDiaEspanol = mapeoDias[nombreDiaIngles];
          
          const disponibilidadDia = response.disponibilidad.find((d: any) => d.dia === nombreDiaEspanol);
          
          if (disponibilidadDia && disponibilidadDia.activo) {
            fechas.push({
              fechaStr: fecha.toISOString().split('T')[0],
              displayStr: fecha.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            });
          }
        }
        
        setFechasDisponibles(fechas);
      }
    } catch (error) {
      console.error('Error cargando disponibilidad:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar la disponibilidad del doctor'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar horas disponibles para una fecha específica
  const cargarHorasDisponibles = async (doctorId: string, fecha: string) => {
    try {
      setLoading(true);
      const response = await DoctorAvailabilityService.getAvailabilityForDate(doctorId, fecha);
      
      if (response.success && response.disponibilidad?.horariosDisponibles) {
        const horas = response.disponibilidad.horariosDisponibles.map((h: any) => h.inicio);
        setHorasDisponibles(horas);
      }
    } catch (error) {
      console.error('Error cargando horas disponibles:', error);
      setHorasDisponibles([]);
    } finally {
      setLoading(false);
    }
  };

  // Manejadores de cambios
  const handleChange = (field: keyof AppointmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Si cambia la especialidad, resetear doctor y cargar doctores
    if (field === 'especialidad') {
      setFormData(prev => ({ ...prev, doctorId: '', fecha: '', hora: '' }));
      setDoctorSeleccionado(null);
      setFechasDisponibles([]);
      setHorasDisponibles([]);
      if (value) {
        cargarDoctoresPorEspecialidad(value);
      } else {
        setDoctores([]);
      }
    }
    
    // Si cambia el doctor, cargar disponibilidad
    if (field === 'doctorId') {
      const doctor = doctores.find(d => d._id === value);
      setDoctorSeleccionado(doctor || null);
      if (value) {
        cargarDisponibilidadDoctor(value);
      }
    }
    
    // Si cambia la fecha, cargar horas disponibles
    if (field === 'fecha' && formData.doctorId) {
      cargarHorasDisponibles(formData.doctorId, value);
    }
  };

  // Seleccionar paciente
  const handleSeleccionarPaciente = (pacienteId: string) => {
    const paciente = pacientes.find(p => p._id === pacienteId);
    setPacienteSeleccionado(paciente || null);
    setFormData(prev => ({ ...prev, pacienteId }));
  };

  // Avanzar al siguiente paso
  const avanzarPaso = () => {
    if (step === 1 && !formData.pacienteId) {
      showAlert({
        type: 'warning',
        title: 'Paciente Requerido',
        message: 'Por favor selecciona un paciente para continuar'
      });
      return;
    }
    
    if (step === 2 && !formData.doctorId) {
      showAlert({
        type: 'warning',
        title: 'Doctor Requerido',
        message: 'Por favor selecciona un doctor para continuar'
      });
      return;
    }
    
    if (step === 3 && (!formData.fecha || !formData.hora)) {
      showAlert({
        type: 'warning',
        title: 'Fecha y Hora Requeridas',
        message: 'Por favor selecciona una fecha y hora para continuar'
      });
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
    }
  };

  // Limpiar todos los campos del modal
  const limpiarModal = () => {
    setFormData({
      pacienteId: '',
      doctorId: '',
      especialidad: '',
      fecha: '',
      hora: '',
      tipo: 'Presencial',
      motivo: '',
      notas: ''
    });
    setPacienteSeleccionado(null);
    setDoctorSeleccionado(null);
    setPacienteBusqueda('');
    setDoctores([]);
    setFechasDisponibles([]);
    setHorasDisponibles([]);
    setStep(1);
  };

  // Retroceder al paso anterior
  const retrocederPaso = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  // Agendar cita
  const agendarCita = async () => {
    try {
      setLoading(true);
      
      // Crear la cita usando el servicio
      const appointmentData = {
        pacienteId: formData.pacienteId,
        doctorId: formData.doctorId,
        fecha: formData.fecha,
        hora: formData.hora,
        tipo: formData.tipo,
        motivo: `Cita ${formData.tipo.toLowerCase()} - ${pacienteSeleccionado?.firstName} ${pacienteSeleccionado?.lastName}`,
        notas: formData.notas
      };
      
      const response = await AppointmentService.createAppointment(appointmentData);
      
             if (response.success) {
         showAlert({
           type: 'success',
           title: '¡Cita Agendada!',
           message: 'La cita se ha agendado exitosamente'
         });
         
         limpiarModal();
         onSuccess();
         onClose();
       } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: response.message || 'No se pudo agendar la cita. Por favor, intenta nuevamente'
        });
      }
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo agendar la cita. Por favor, intenta nuevamente'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pacientes por búsqueda
  const pacientesFiltrados = pacientes.filter(paciente =>
    `${paciente.firstName} ${paciente.lastName}`.toLowerCase().includes(pacienteBusqueda.toLowerCase()) ||
    paciente.idNumber?.toLowerCase().includes(pacienteBusqueda.toLowerCase()) ||
    paciente.email?.toLowerCase().includes(pacienteBusqueda.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75"
        onClick={() => {
          limpiarModal();
          onClose();
        }}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-lg">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4 pt-8 flex justify-between items-center border-b relative">
          <h2 className="text-xl font-bold">Agendar Cita</h2>
                     <button
             onClick={() => {
               limpiarModal();
               onClose();
             }}
             className="absolute top-2 right-2 text-white hover:text-gray-200 p-2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-primary-700 transition-colors"
           >
             <X className="h-5 w-5" />
           </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className={`flex-1 border-t-2 ${step >= 1 ? 'border-primary-600' : 'border-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'} mx-2`}>
                <User className="h-4 w-4" />
              </div>
              <div className={`flex-1 border-t-2 ${step >= 2 ? 'border-primary-600' : 'border-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'} mx-2`}>
                <Stethoscope className="h-4 w-4" />
              </div>
              <div className={`flex-1 border-t-2 ${step >= 3 ? 'border-primary-600' : 'border-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'} mx-2`}>
                <Calendar className="h-4 w-4" />
              </div>
              <div className={`flex-1 border-t-2 ${step >= 4 ? 'border-primary-600' : 'border-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'} mx-2`}>
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className={`flex-1 border-t-2 ${step >= 4 ? 'border-primary-600' : 'border-gray-300'}`}></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <div className="text-center" style={{ marginLeft: '10px' }}>Paciente</div>
              <div className="text-center">Doctor</div>
              <div className="text-center">Fecha y Hora</div>
              <div className="text-center" style={{ marginRight: '10px' }}>Confirmar</div>
            </div>
          </div>

          {/* Paso 1: Selección de Paciente */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Selecciona un paciente</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar paciente
                </label>
                <input
                  type="text"
                  value={pacienteBusqueda}
                  onChange={(e) => setPacienteBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, cédula o email..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                {pacientesFiltrados.map((paciente) => (
                  <div
                    key={paciente._id}
                    onClick={() => handleSeleccionarPaciente(paciente._id)}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      formData.pacienteId === paciente._id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                  >
                    <div className="font-medium">
                      {paciente.firstName} {paciente.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {paciente.idNumber ? `Cédula: ${paciente.idNumber}` : 'Sin cédula'} • {paciente.email || 'Sin email'}
                    </div>
                  </div>
                ))}
              </div>

              {pacienteSeleccionado && (
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Paciente Seleccionado</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-medium">Nombre:</span> {pacienteSeleccionado.firstName} {pacienteSeleccionado.lastName}</p>
                    <p><span className="font-medium">Cédula:</span> {pacienteSeleccionado.idNumber || 'No registrada'}</p>
                    <p><span className="font-medium">Teléfono:</span> {pacienteSeleccionado.phone || 'No registrado'}</p>
                    <p><span className="font-medium">Email:</span> {pacienteSeleccionado.email || 'No registrado'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Selección de Doctor */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Selecciona especialidad y doctor</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidad
                </label>
                <select
                  value={formData.especialidad}
                  onChange={(e) => handleChange('especialidad', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecciona una especialidad</option>
                  {especialidades.map((especialidad) => (
                    <option key={especialidad._id} value={especialidad._id}>
                      {especialidad.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor
                </label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => handleChange('doctorId', e.target.value)}
                  disabled={!formData.especialidad}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                >
                  <option value="">Selecciona un doctor</option>
                  {filtrarDoctoresPorEspecialidad().map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      Dr. {doctor.name} {doctor.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {doctorSeleccionado && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Doctor Seleccionado</h4>
                  <div className="flex items-start">
                    <div className="mr-4">
                      <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="h-10 w-10 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Dr. {doctorSeleccionado.name} {doctorSeleccionado.lastName}</p>
                      <p className="text-sm text-gray-600">{doctorSeleccionado.especialidad?.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{doctorSeleccionado.biografia || "Sin descripción disponible"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Selección de Fecha y Hora */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Selecciona fecha y hora</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <select
                  value={formData.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecciona una fecha</option>
                  {fechasDisponibles.map((fecha) => (
                    <option key={fecha.fechaStr} value={fecha.fechaStr}>
                      {fecha.displayStr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora
                </label>
                {horasDisponibles.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {horasDisponibles.map((hora) => (
                      <button
                        key={hora}
                        type="button"
                        onClick={() => handleChange('hora', hora)}
                        className={`p-2 border rounded-md flex items-center justify-center transition-colors ${
                          formData.hora === hora
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Clock className="mr-1 h-4 w-4" /> {hora}
                      </button>
                    ))}
                  </div>
                ) : formData.fecha ? (
                  <p className="text-sm text-red-500">No hay horas disponibles para esta fecha</p>
                ) : (
                  <p className="text-sm text-gray-500">Selecciona una fecha para ver las horas disponibles</p>
                )}
              </div>
            </div>
          )}

          {/* Paso 4: Confirmación */}
          {step === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Confirma los detalles de la cita</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Consulta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('tipo', 'Presencial')}
                    className={`p-2 border rounded-md flex items-center justify-center transition-colors ${
                      formData.tipo === 'Presencial'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="mr-1 h-4 w-4" /> Presencial
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('tipo', 'Virtual')}
                    className={`p-2 border rounded-md flex items-center justify-center transition-colors ${
                      formData.tipo === 'Virtual'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Video className="mr-1 h-4 w-4" /> Virtual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('tipo', 'Telefónica')}
                    className={`p-2 border rounded-md flex items-center justify-center transition-colors ${
                      formData.tipo === 'Telefónica'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Phone className="mr-1 h-4 w-4" /> Telefónica
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => handleChange('notas', e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Agrega notas adicionales sobre la cita..."
                />
              </div>

              {/* Resumen de la cita */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Resumen de la Cita</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">Paciente:</span> {pacienteSeleccionado?.firstName} {pacienteSeleccionado?.lastName}</p>
                  <p><span className="font-medium">Doctor:</span> Dr. {doctorSeleccionado?.name} {doctorSeleccionado?.lastName}</p>
                                     <p><span className="font-medium">Especialidad:</span> {doctorSeleccionado?.especialidad?.name}</p>
                  <p><span className="font-medium">Fecha:</span> {formData.fecha && 
                    fechasDisponibles.find(f => f.fechaStr === formData.fecha)?.displayStr
                  }</p>
                  <p><span className="font-medium">Hora:</span> {formData.hora}</p>
                  <p><span className="font-medium">Tipo:</span> {formData.tipo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex justify-between mt-6">
                         <button
               type="button"
               onClick={step === 1 ? () => {
                 limpiarModal();
                 onClose();
               } : retrocederPaso}
               className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
             >
               {step === 1 ? 'Cancelar' : 'Atrás'}
             </button>
            
            {step < 4 ? (
              <button
                type="button"
                onClick={avanzarPaso}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={agendarCita}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Agendando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Agendar Cita
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
