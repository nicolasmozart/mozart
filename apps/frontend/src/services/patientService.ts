import { api } from './api';

export interface Patient {
  _id: string;
  // Información Personal
  firstName: string;
  lastName: string;
  birthDate?: string;
  birthCountry?: string;
  residenceCountry?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  
  // Identificación
  idType: string;
  idNumber: string;
  url_documento_identidad?: string;
  
  // Contacto
  phone: string;
  email?: string;
  
  // Ubicación
  state?: string;
  municipality?: string;
  address?: string;
  postalCode?: string;
  
  // Información Médica
  hospital?: string;
  necesitaEmergencia: boolean;
  motivoEmergencia?: string;
  url_documento_egreso?: string;
  
  // Seguro
  hasInsurance: boolean;
  insuranceName?: string;
  policyNumber?: string;
  
  // Cuidador
  hasCaretaker: boolean;
  caretakerFirstName?: string;
  caretakerLastName?: string;
  caretakerRelationship?: string;
  caretakerPhone?: string;
  caretakerEmail?: string;
  
  // Estado y Visibilidad
  visible: boolean;
  
  // Verificación
  verificaciondatos: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientData {
  firstName: string;
  lastName: string;
  birthDate?: string;
  birthCountry?: string;
  residenceCountry?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  idType: string;
  idNumber: string;
  documento_identidad?: File;
  phone: string;
  email?: string;
  state?: string;
  municipality?: string;
  address?: string;
  postalCode?: string;
  hospital?: string;
  necesitaEmergencia?: boolean;
  motivoEmergencia?: string;
  documento_egreso?: File;
  hasInsurance?: boolean;
  insuranceName?: string;
  policyNumber?: string;
  hasCaretaker?: boolean;
  caretakerFirstName?: string;
  caretakerLastName?: string;
  caretakerRelationship?: string;
  caretakerPhone?: string;
  caretakerEmail?: string;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {}

export interface PatientListResponse {
  patients: Patient[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface PatientStats {
  stats: {
    total: number;
    conSeguro: number;
    conCuidador: number;
    emergencias: number;
    verificados: number;
  };
  genderStats: Array<{
    _id: string;
    count: number;
  }>;
}

export class PatientService {
  // Obtener lista de pacientes con paginación y búsqueda
  static async getPatients(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PatientListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await api.get(`/api/patients?${searchParams.toString()}`);
    return response.data;
  }

  // Obtener un paciente específico
  static async getPatient(id: string): Promise<Patient> {
    const response = await api.get(`/api/patients/${id}`);
    return response.data;
  }

  // Crear un nuevo paciente
  static async createPatient(data: CreatePatientData): Promise<{ message: string; patient: Patient }> {
    const response = await api.post('/api/patients', data);
    return response.data;
  }

  // Actualizar un paciente existente
  static async updatePatient(id: string, data: UpdatePatientData): Promise<{ message: string; patient: Patient }> {
    const response = await api.put(`/api/patients/${id}`, data);
    return response.data;
  }

  // Eliminar un paciente (soft delete)
  static async deletePatient(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/patients/${id}`);
    return response.data;
  }

  // Restaurar un paciente eliminado
  static async restorePatient(id: string): Promise<{ message: string }> {
    const response = await api.patch(`/api/patients/${id}/restore`);
    return response.data;
  }

  // Obtener estadísticas de pacientes
  static async getPatientStats(): Promise<PatientStats> {
    const response = await api.get('/api/patients/stats');
    return response.data;
  }

  // Método helper para obtener el nombre completo
  static getFullName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`;
  }

  // Método helper para verificar si es mayor de edad
  static isAdult(patient: Patient): boolean {
    if (!patient.birthDate) return false;
    const today = new Date();
    const birthDate = new Date(patient.birthDate);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }

  // Método helper para formatear el teléfono
  static formatPhone(phone: string): string {
    // Formato básico para teléfonos colombianos
    if (phone.startsWith('+57')) {
      return phone.replace('+57', '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    return phone;
  }

  // Método helper para obtener el estado de verificación
  static getVerificationStatus(patient: Patient): { text: string; color: string } {
    if (patient.verificaciondatos) {
      return { text: 'Verificado', color: 'text-green-600' };
    }
    return { text: 'Pendiente', color: 'text-yellow-600' };
  }

  // Método helper para obtener el estado de emergencia
  static getEmergencyStatus(patient: Patient): { text: string; color: string } {
    if (patient.necesitaEmergencia) {
      return { text: 'Emergencia', color: 'text-red-600' };
    }
    return { text: 'Normal', color: 'text-green-600' };
  }
}
