import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Save, 
  Plus,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { useTenantAuth } from '../../../contexts/TenantAuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { DoctorAvailabilityService } from '../../../services/doctorAvailabilityService';
import type { DisponibilidadDia } from '../../../services/doctorAvailabilityService';

interface HorarioDia {
  activo: boolean;
  horaInicio: string;
  horaFin: string;
  duracionCita: number;
}

interface ExcepcionFechaLocal {
  _id: string;
  fecha: string;
  tipo: 'disponible' | 'no_disponible';
  horaInicio?: string;
  horaFin?: string;
  motivo: string;
}

const TenantDoctorDisponibilidad: React.FC = () => {
  const { user } = useTenantAuth();
  const { showAlert, showConfirm } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [horarios, setHorarios] = useState<Record<string, HorarioDia>>({
    lunes: { activo: true, horaInicio: '08:00', horaFin: '17:00', duracionCita: 30 },
    martes: { activo: true, horaInicio: '08:00', horaFin: '17:00', duracionCita: 30 },
    miercoles: { activo: true, horaInicio: '08:00', horaFin: '17:00', duracionCita: 30 },
    jueves: { activo: true, horaInicio: '08:00', horaFin: '17:00', duracionCita: 30 },
    viernes: { activo: true, horaInicio: '08:00', horaFin: '17:00', duracionCita: 30 },
    sabado: { activo: false, horaInicio: '09:00', horaFin: '13:00', duracionCita: 30 },
    domingo: { activo: false, horaInicio: '09:00', horaFin: '13:00', duracionCita: 30 }
  });

  const [excepciones, setExcepciones] = useState<ExcepcionFechaLocal[]>([]);
  const [nuevaExcepcion, setNuevaExcepcion] = useState<Partial<ExcepcionFechaLocal>>({
    fecha: '',
    tipo: 'disponible',
    horaInicio: '09:00',
    horaFin: '17:00',
    motivo: ''
  });

  const diasSemana = DoctorAvailabilityService.getDiasSemana();
  const duracionesCita = DoctorAvailabilityService.getDuracionesCita();

  useEffect(() => {
    if (user?._id) {
      cargarDisponibilidad();
    }
  }, [user?._id]);

  const cargarDisponibilidad = async () => {
    try {
      setLoading(true);
      const response = await DoctorAvailabilityService.getDoctorAvailability(user!._id);
      
      if (response.success) {
        // Convertir la disponibilidad del backend al formato local
        const horariosActualizados: Record<string, HorarioDia> = { ...horarios };
        
        response.disponibilidad.forEach((dia: any) => {
          if (horariosActualizados[dia.dia]) {
            horariosActualizados[dia.dia] = {
              activo: dia.activo,
              horaInicio: dia.horaInicio,
              horaFin: dia.horaFin,
              duracionCita: response.duracionCita
            };
          }
        });

        // Actualizar la duración de cita en todos los días
        Object.keys(horariosActualizados).forEach(dia => {
          horariosActualizados[dia].duracionCita = response.duracionCita;
        });

        setHorarios(horariosActualizados);
        
        // Convertir excepciones del backend al formato local
        const excepcionesConvertidas = response.excepcionesFechas.map((ex: any) => ({
          _id: ex._id || Date.now().toString(),
          fecha: new Date(ex.fecha).toISOString().split('T')[0],
          tipo: 'disponible' as const,
          horaInicio: ex.horaInicio,
          horaFin: ex.horaFin,
          motivo: 'Excepción configurada'
        }));
        
        setExcepciones(excepcionesConvertidas);
      }
    } catch (error: any) {
      console.error('Error cargando disponibilidad:', error);
      
      // Mostrar alerta de error solo si no es el primer cargado
      if (!loading) {
        showAlert({
          type: 'error',
          title: 'Error al Cargar Disponibilidad',
          message: 'No se pudo cargar tu disponibilidad actual. Los cambios se guardarán correctamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (dia: string) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo }
    }));
  };

  const actualizarHorario = (dia: string, campo: keyof HorarioDia, valor: string | number | boolean) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  };

  const agregarExcepcion = () => {
    if (!nuevaExcepcion.fecha || !nuevaExcepcion.motivo) {
      showAlert({
        type: 'warning',
        title: 'Campos Requeridos',
        message: 'Por favor, completa la fecha y el motivo de la excepción.'
      });
      return;
    }

    // Verificar que la fecha no sea en el pasado
    const fechaExcepcion = new Date(nuevaExcepcion.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaExcepcion < hoy) {
      showAlert({
        type: 'warning',
        title: 'Fecha Inválida',
        message: 'No puedes agregar excepciones para fechas pasadas.'
      });
      return;
    }

    // Verificar que no exista ya una excepción para esa fecha
    const existeExcepcion = excepciones.some(ex => ex.fecha === nuevaExcepcion.fecha);
    if (existeExcepcion) {
      showAlert({
        type: 'warning',
        title: 'Excepción Duplicada',
        message: 'Ya existe una excepción para esta fecha. Modifica la existente o elige otra fecha.'
      });
      return;
    }

    const excepcion: ExcepcionFechaLocal = {
      _id: Date.now().toString(),
      fecha: nuevaExcepcion.fecha,
      tipo: nuevaExcepcion.tipo!,
      horaInicio: nuevaExcepcion.horaInicio,
      horaFin: nuevaExcepcion.horaFin,
      motivo: nuevaExcepcion.motivo
    };

    setExcepciones(prev => [...prev, excepcion]);
    setNuevaExcepcion({
      fecha: '',
      tipo: 'disponible',
      horaInicio: '09:00',
      horaFin: '17:00',
      motivo: ''
    });

    showAlert({
      type: 'success',
      title: 'Excepción Agregada',
      message: 'La excepción se ha agregado correctamente. Recuerda guardar los cambios para que se apliquen.'
    });
  };

  const eliminarExcepcion = async (id: string) => {
    const excepcion = excepciones.find(ex => ex._id === id);
    if (!excepcion) return;

    const confirmado = await showConfirm({
      title: 'Eliminar Excepción',
      message: `¿Estás seguro de que quieres eliminar la excepción del ${new Date(excepcion.fecha).toLocaleDateString()}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmado) {
      setExcepciones(prev => prev.filter(ex => ex._id !== id));
      showAlert({
        type: 'success',
        title: 'Excepción Eliminada',
        message: 'La excepción se ha eliminado correctamente. Recuerda guardar los cambios para que se apliquen.'
      });
    }
  };

  const guardarHorarios = async () => {
    if (!user?._id) return;
    
    setSaving(true);
    try {
      // Convertir horarios locales al formato del backend
      const disponibilidadBackend: DisponibilidadDia[] = diasSemana.map(({ key }) => {
        const horario = horarios[key];
        return {
          dia: key,
          horaInicio: horario.horaInicio,
          horaFin: horario.horaFin,
          activo: horario.activo
        };
      });

      // Obtener la duración de cita del primer día activo
      const duracionCita = Object.values(horarios).find(h => h.activo)?.duracionCita || 30;

      // Guardar en el backend
      const response = await DoctorAvailabilityService.saveWeeklyAvailability(
        disponibilidadBackend,
        duracionCita,
        user._id
      );

      if (response.success) {
        // Mostrar alerta de éxito
        showAlert({
          type: 'success',
          title: '¡Disponibilidad Guardada!',
          message: 'Tu horario de disponibilidad se ha guardado correctamente. Los pacientes podrán agendar citas en los horarios configurados.'
        });
        
        // Recargar la disponibilidad para asegurar sincronización
        await cargarDisponibilidad();
      } else {
        // Mostrar alerta de error si la respuesta no es exitosa
        showAlert({
          type: 'error',
          title: 'Error al Guardar',
          message: 'No se pudo guardar la disponibilidad. Por favor, intenta nuevamente.'
        });
      }
    } catch (error: any) {
      console.error('❌ Error guardando horarios:', error);
      
      // Mostrar alerta de error
      showAlert({
        type: 'error',
        title: 'Error de Conexión',
        message: error.response?.data?.message || error.message || 'Ocurrió un error al guardar la disponibilidad. Verifica tu conexión e intenta nuevamente.'
      });
    } finally {
      setSaving(false);
    }
  };

  const calcularHorasDisponibles = (dia: string) => {
    const horario = horarios[dia];
    if (!horario.activo) return 0;
    
    const [horaInicio, minInicio] = horario.horaInicio.split(':').map(Number);
    const [horaFin, minFin] = horario.horaFin.split(':').map(Number);
    
    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFin = horaFin * 60 + minFin;
    const duracionMinutos = minutosFin - minutosInicio;
    
    return Math.floor(duracionMinutos / horario.duracionCita);
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            <Clock className="inline-block mr-2 h-6 w-6 text-primary-600" />
            Mi Disponibilidad
          </h1>
          <p className="text-neutral-600">
            Gestiona tus horarios de consulta y excepciones de fechas
          </p>
        </div>
        
        <button
          onClick={guardarHorarios}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>

      {/* Horarios Semanales */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Horarios Semanales
        </h2>
        
        <div className="space-y-4">
          {diasSemana.map(({ key, nombre, color }) => {
            const horario = horarios[key];
            const horasDisponibles = calcularHorasDisponibles(key);
            
            return (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 transition-all ${
                  horario.activo ? color : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={horario.activo}
                        onChange={() => toggleDia(key)}
                        className="w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500"
                      />
                      <span className={`font-medium ${horario.activo ? 'text-neutral-900' : 'text-neutral-500'}`}>
                        {nombre}
                      </span>
                    </label>
                    
                    {horario.activo && (
                      <span className="text-sm text-neutral-600">
                        {horasDisponibles} citas disponibles
                      </span>
                    )}
                  </div>
                </div>

                {horario.activo && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Hora de inicio
                      </label>
                      <input
                        type="time"
                        value={horario.horaInicio}
                        onChange={(e) => actualizarHorario(key, 'horaInicio', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Hora de fin
                      </label>
                      <input
                        type="time"
                        value={horario.horaFin}
                        onChange={(e) => actualizarHorario(key, 'horaFin', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Duración de cita (min)
                      </label>
                      <select
                        value={horario.duracionCita}
                        onChange={(e) => actualizarHorario(key, 'duracionCita', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {duracionesCita.map(duracion => (
                          <option key={duracion} value={duracion}>
                            {duracion} min
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Excepciones de Fechas */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Excepciones de Fechas
        </h2>
        
        {/* Formulario para nueva excepción */}
        <div className="bg-neutral-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-neutral-900 mb-3">Agregar Nueva Excepción</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={nuevaExcepcion.fecha}
                onChange={(e) => setNuevaExcepcion(prev => ({ ...prev, fecha: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tipo
              </label>
              <select
                value={nuevaExcepcion.tipo}
                onChange={(e) => setNuevaExcepcion(prev => ({ ...prev, tipo: e.target.value as 'disponible' | 'no_disponible' }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="disponible">Disponible</option>
                <option value="no_disponible">No Disponible</option>
              </select>
            </div>
            
            {nuevaExcepcion.tipo === 'disponible' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Hora inicio
                  </label>
                  <input
                    type="time"
                    value={nuevaExcepcion.horaInicio}
                    onChange={(e) => setNuevaExcepcion(prev => ({ ...prev, horaInicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={nuevaExcepcion.horaFin}
                    onChange={(e) => setNuevaExcepcion(prev => ({ ...prev, horaFin: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Motivo
            </label>
            <input
              type="text"
              value={nuevaExcepcion.motivo}
              onChange={(e) => setNuevaExcepcion(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ej: Vacaciones, Conferencia, etc."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <button
            onClick={agregarExcepcion}
            disabled={!nuevaExcepcion.fecha || !nuevaExcepcion.motivo}
            className="mt-4 bg-success-600 text-white px-4 py-2 rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Excepción</span>
          </button>
        </div>

        {/* Lista de excepciones */}
        <div className="space-y-3">
          {excepciones.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No hay excepciones configuradas</p>
            </div>
          ) : (
            excepciones.map((excepcion) => (
              <div
                key={excepcion._id}
                className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                  excepcion.tipo === 'disponible' 
                    ? 'bg-success-50 border-success-200' 
                    : 'bg-alert-50 border-alert-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    excepcion.tipo === 'disponible' 
                      ? 'bg-success-100 text-success-600' 
                      : 'bg-alert-100 text-alert-600'
                  }`}>
                    {excepcion.tipo === 'disponible' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-neutral-900">
                      {new Date(excepcion.fecha).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {excepcion.tipo === 'disponible' 
                        ? `Disponible de ${excepcion.horaInicio} a ${excepcion.horaFin}`
                        : 'No disponible'
                      }
                    </p>
                    <p className="text-xs text-neutral-500">{excepcion.motivo}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => eliminarExcepcion(excepcion._id)}
                  className="p-2 text-neutral-400 hover:text-alert-600 hover:bg-alert-100 rounded-lg transition-colors"
                  title="Eliminar excepción"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resumen de Horarios */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Resumen de Disponibilidad
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-primary-50 rounded-lg border border-primary-200">
            <Clock className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary-700">
              {diasSemana.filter(dia => horarios[dia.key].activo).length}
            </p>
            <p className="text-sm text-primary-600">Días activos por semana</p>
          </div>
          
          <div className="text-center p-4 bg-success-50 rounded-lg border border-success-200">
            <Calendar className="h-8 w-8 text-success-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-success-700">
              {excepciones.filter(ex => ex.tipo === 'disponible').length}
            </p>
            <p className="text-sm text-success-600">Excepciones disponibles</p>
          </div>
          
          <div className="text-center p-4 bg-warning-50 rounded-lg border border-warning-200">
            <AlertCircle className="h-8 w-8 text-warning-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-warning-700">
              {excepciones.filter(ex => ex.tipo === 'no_disponible').length}
            </p>
            <p className="text-sm text-warning-600">Días no disponibles</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDoctorDisponibilidad;
