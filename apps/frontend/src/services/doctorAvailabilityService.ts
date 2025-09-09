import { api } from './api';

export interface DisponibilidadDia {
  dia: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  intervalos?: Intervalo[];
}

export interface Intervalo {
  inicio: string;
  fin: string;
  disponible: boolean;
}

export interface ExcepcionFecha {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionCita?: number;
}

export interface DisponibilidadResponse {
  success: boolean;
  disponibilidad: DisponibilidadDia[];
  excepcionesFechas: any[];
  duracionCita: number;
  doctorName: string;
}

export interface DisponibilidadFechaResponse {
  success: boolean;
  disponibilidad: {
    doctorId: string;
    doctorName: string;
    fecha: string;
    diaSemana: string;
    duracionCita: number;
    horariosDisponibles: Intervalo[];
    tieneExcepcion: boolean;
    excepcion: any;
  };
}

export class DoctorAvailabilityService {
  /**
   * Guarda la disponibilidad semanal del doctor
   */
  static async saveWeeklyAvailability(
    disponibilidad: DisponibilidadDia[],
    duracionCita: number,
    userId: string
  ): Promise<DisponibilidadResponse> {
    const response = await api.post('/api/doctors/disponibilidad', {
      disponibilidad,
      duracionCita,
      userId
    });
    return response.data;
  }

  /**
   * Obtiene la disponibilidad del doctor
   */
  static async getDoctorAvailability(doctorId: string): Promise<DisponibilidadResponse> {
    const response = await api.get(`/api/doctors/disponibilidad/${doctorId}`);
    return response.data;
  }

  /**
   * Agrega una excepción de fecha
   */
  static async addDateException(
    excepcion: ExcepcionFecha,
    userId: string
  ): Promise<any> {
    const response = await api.post('/api/doctors/disponibilidad/excepcion', {
      ...excepcion,
      userId
    });
    return response.data;
  }

  /**
   * Elimina una excepción de fecha
   */
  static async removeDateException(
    excepcionId: string,
    userId: string
  ): Promise<any> {
    const response = await api.delete('/api/doctors/disponibilidad/excepcion', {
      data: { excepcionId, userId }
    });
    return response.data;
  }

  /**
   * Consulta la disponibilidad del doctor para una fecha específica
   */
  static async getAvailabilityForDate(
    doctorId: string,
    fecha: string
  ): Promise<DisponibilidadFechaResponse> {
    const response = await api.get(`/api/doctors/${doctorId}/disponibilidad-fecha`, {
      params: { fecha }
    });
    return response.data;
  }

  /**
   * Genera intervalos de tiempo para un día específico
   * (Función de utilidad para el frontend)
   */
  static generateTimeSlots(
    horaInicio: string,
    horaFin: string,
    duracionMinutos: number
  ): Intervalo[] {
    const intervalos: Intervalo[] = [];
    const [startHour, startMinute] = horaInicio.split(':').map(Number);
    const [endHour, endMinute] = horaFin.split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Calcular el siguiente intervalo
      let nextMinute = currentMinute + duracionMinutos;
      let nextHour = currentHour + Math.floor(nextMinute / 60);
      nextMinute = nextMinute % 60;
      
      const nextTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;

      // Solo agregar si no excede la hora de fin
      if (nextHour < endHour || (nextHour === endHour && nextMinute <= endMinute)) {
        intervalos.push({
          inicio: currentTime,
          fin: nextTime,
          disponible: true
        });
      }

      currentHour = nextHour;
      currentMinute = nextMinute;
    }

    return intervalos;
  }

  /**
   * Formatea la disponibilidad para mostrar en el frontend
   */
  static formatAvailabilityForDisplay(disponibilidad: DisponibilidadDia[]): DisponibilidadDia[] {
    return disponibilidad.map(dia => ({
      ...dia,
      intervalos: dia.activo ? this.generateTimeSlots(dia.horaInicio, dia.horaFin, 30) : []
    }));
  }

  /**
   * Obtiene los días de la semana en español
   */
  static getDiasSemana(): Array<{ key: string; nombre: string; color: string }> {
    return [
      { key: 'lunes', nombre: 'Lunes', color: 'bg-blue-50 border-blue-200' },
      { key: 'martes', nombre: 'Martes', color: 'bg-green-50 border-green-200' },
      { key: 'miercoles', nombre: 'Miércoles', color: 'bg-purple-50 border-purple-200' },
      { key: 'jueves', nombre: 'Jueves', color: 'bg-orange-50 border-orange-200' },
      { key: 'viernes', nombre: 'Viernes', color: 'bg-red-50 border-red-200' },
      { key: 'sabado', nombre: 'Sábado', color: 'bg-indigo-50 border-indigo-200' },
      { key: 'domingo', nombre: 'Domingo', color: 'bg-pink-50 border-pink-200' }
    ];
  }

  /**
   * Obtiene las opciones de duración de cita
   */
  static getDuracionesCita(): number[] {
    return [15, 20, 30, 45, 60];
  }
}
