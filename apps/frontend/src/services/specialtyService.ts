import { api } from './api';

export interface Specialty {
  _id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialtyResponse {
  success: boolean;
  message?: string;
  specialties?: Specialty[];
  specialty?: Specialty;
}

export class SpecialtyService {
  // Obtener todas las especialidades
  static async getSpecialties(): Promise<SpecialtyResponse> {
    try {
      const response = await api.get('/api/specialties');
      return response.data;
    } catch (error: any) {
      console.error('Error getting specialties:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener las especialidades');
    }
  }

  // Obtener especialidad por ID
  static async getSpecialtyById(id: string): Promise<SpecialtyResponse> {
    try {
      const response = await api.get(`/api/specialties/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting specialty by id:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener la especialidad');
    }
  }

  // Crear nueva especialidad
  static async createSpecialty(specialtyData: { name: string; description?: string }): Promise<SpecialtyResponse> {
    try {
      const response = await api.post('/api/specialties', specialtyData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating specialty:', error);
      throw new Error(error.response?.data?.message || 'Error al crear la especialidad');
    }
  }

  // Actualizar especialidad
  static async updateSpecialty(id: string, specialtyData: { name: string; description?: string }): Promise<SpecialtyResponse> {
    try {
      const response = await api.put(`/api/specialties/${id}`, specialtyData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating specialty:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar la especialidad');
    }
  }

  // Eliminar especialidad
  static async deleteSpecialty(id: string): Promise<SpecialtyResponse> {
    try {
      const response = await api.delete(`/api/specialties/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting specialty:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar la especialidad');
    }
  }
}
