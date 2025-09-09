import { api } from './api';

export interface Appointment {
  _id?: string;
  pacienteId: string;
  doctorId: string;
  fecha: string;
  hora: string;
  tipo: 'Presencial' | 'Virtual' | 'Telefónica';
  motivo: string;
  notas?: string;
  estado: 'pendiente' | 'Agendada' | 'Cancelada' | 'Completada' | 'No Asistió' | 'PendienteAgendar';
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentResponse {
  success: boolean;
  message?: string;
  appointment?: Appointment;
  appointments?: Appointment[];
}

export class AppointmentService {
  // Crear una nueva cita
  static async createAppointment(appointmentData: Omit<Appointment, '_id' | 'estado' | 'createdAt' | 'updatedAt'>): Promise<AppointmentResponse> {
    try {
      const response = await api.post('/api/appointments', appointmentData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      throw new Error(error.response?.data?.message || 'Error al crear la cita');
    }
  }

  // Obtener todas las citas
  static async getAppointments(): Promise<AppointmentResponse> {
    try {
      const response = await api.get('/api/appointments');
      return response.data;
    } catch (error: any) {
      console.error('Error getting appointments:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener las citas');
    }
  }

  // Obtener citas por paciente
  static async getAppointmentsByPatient(patientId: string): Promise<AppointmentResponse> {
    try {
      const response = await api.get(`/api/appointments/patient/${patientId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting patient appointments:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener las citas del paciente');
    }
  }

  // Obtener citas por doctor
  static async getAppointmentsByDoctor(doctorId: string): Promise<AppointmentResponse> {
    try {
      const response = await api.get(`/api/appointments/doctor/${doctorId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting doctor appointments:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener las citas del doctor');
    }
  }

  // Obtener citas por fecha
  static async getAppointmentsByDate(date: string): Promise<AppointmentResponse> {
    try {
      const response = await api.get(`/api/appointments/date/${date}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting appointments by date:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener las citas por fecha');
    }
  }

  // Actualizar una cita
  static async updateAppointment(appointmentId: string, updateData: Partial<Appointment>): Promise<AppointmentResponse> {
    try {
      const response = await api.put(`/api/appointments/${appointmentId}`, updateData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar la cita');
    }
  }

  // Cancelar una cita
  static async cancelAppointment(appointmentId: string, motivo?: string): Promise<AppointmentResponse> {
    try {
      const response = await api.put(`/api/appointments/${appointmentId}/cancel`, { motivo });
      return response.data;
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      throw new Error(error.response?.data?.message || 'Error al cancelar la cita');
    }
  }


  // Marcar cita como completada
  static async completeAppointment(appointmentId: string, notas?: string): Promise<AppointmentResponse> {
    try {
      const response = await api.put(`/api/appointments/${appointmentId}/complete`, { notas });
      return response.data;
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      throw new Error(error.response?.data?.message || 'Error al marcar la cita como completada');
    }
  }

  // Marcar cita como no asistió
  static async markNoShow(appointmentId: string, motivo?: string): Promise<AppointmentResponse> {
    try {
      const response = await api.put(`/api/appointments/${appointmentId}/no-show`, { motivo });
      return response.data;
    } catch (error: any) {
      console.error('Error marking appointment as no show:', error);
      throw new Error(error.response?.data?.message || 'Error al marcar la cita como no asistió');
    }
  }

  // Eliminar una cita
  static async deleteAppointment(appointmentId: string): Promise<AppointmentResponse> {
    try {
      const response = await api.delete(`/api/appointments/${appointmentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar la cita');
    }
  }

  // Verificar disponibilidad para una fecha y hora específica
  static async checkAvailability(doctorId: string, fecha: string, hora: string): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await api.get(`/api/appointments/check-availability`, {
        params: { doctorId, fecha, hora }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error checking availability:', error);
      throw new Error(error.response?.data?.message || 'Error al verificar disponibilidad');
    }
  }

  // Obtener estadísticas de citas
  static async getAppointmentStats(): Promise<{
    total: number;
    agendadas: number;
    confirmadas: number;
    canceladas: number;
    completadas: number;
    noAsistio: number;
  }> {
    try {
      const response = await api.get('/api/appointments/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error getting appointment stats:', error);
      throw new Error('Error al obtener estadísticas de citas');
    }
  }
}
