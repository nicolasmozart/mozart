import { api } from './api';

export interface Doctor {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  userId?: string;
  especialidad: {
    _id: string;
    name: string;
    description?: string;
  };
  cedula: string;
  biografia?: string;
  experiencia?: string;
  educacion?: string;
  duracionCita: number;
  hospital?: {
    _id: string;
    name: string;
  };
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorResponse {
  success: boolean;
  message?: string;
  doctors?: Doctor[];
  doctor?: Doctor;
}

export class DoctorService {
  // Obtener todos los doctores
  static async getDoctors(): Promise<DoctorResponse> {
    try {
      const response = await api.get('/api/doctors');
      return response.data;
    } catch (error: any) {
      console.error('Error getting doctors:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener los doctores');
    }
  }

  // Obtener doctores por especialidad
  static async getDoctorsBySpecialty(specialtyId: string): Promise<DoctorResponse> {
    try {
      const response = await api.get(`/api/doctors/specialty/${specialtyId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting doctors by specialty:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener los doctores por especialidad');
    }
  }

  // Obtener doctor por ID
  static async getDoctorById(id: string): Promise<DoctorResponse> {
    try {
      const response = await api.get(`/api/doctors/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting doctor by id:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener el doctor');
    }
  }

  // Crear nuevo doctor
  static async createDoctor(doctorData: any): Promise<DoctorResponse> {
    try {
      const response = await api.post('/api/doctors', doctorData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating doctor:', error);
      throw new Error(error.response?.data?.message || 'Error al crear el doctor');
    }
  }

  // Actualizar doctor
  static async updateDoctor(id: string, doctorData: any): Promise<DoctorResponse> {
    try {
      const response = await api.put(`/api/doctors/${id}`, doctorData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating doctor:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar el doctor');
    }
  }

  // Eliminar doctor
  static async deleteDoctor(id: string): Promise<DoctorResponse> {
    try {
      const response = await api.delete(`/api/doctors/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting doctor:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar el doctor');
    }
  }

  // Obtener doctores activos
  static async getActiveDoctors(): Promise<DoctorResponse> {
    try {
      const response = await api.get('/api/doctors/active');
      return response.data;
    } catch (error: any) {
      console.error('Error getting active doctors:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener los doctores activos');
    }
  }
}
