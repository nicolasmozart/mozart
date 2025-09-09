import { api } from './api';

export interface Meeting {
  meetingId: string;
  externalMeetingId?: string;
  citaId?: string;
  meetingData: any;
  attendees: any[];
  status: 'created' | 'active' | 'ended' | 'expired';
  transcriptionEnabled: boolean;
  pipelineId?: string;
  grabacionUrl?: string;
  transcripcionUrl?: string;
  duracionMinutos?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  externalMeetingId?: string;
  citaId?: string;
}

export interface CreateAttendeeRequest {
  externalUserId?: string;
  role?: 'doctor' | 'patient' | 'participant';
}

export interface MeetingResponse {
  success: boolean;
  message?: string;
  meeting?: Meeting;
  error?: string;
}

export interface AttendeeResponse {
  success: boolean;
  message?: string;
  attendee?: any;
  meeting?: {
    meetingId: string;
    status: string;
  };
  error?: string;
}

export interface MeetingListResponse {
  success: boolean;
  meetings?: Meeting[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalMeetings: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: string;
}

export class MeetingService {
  /**
   * Crear una nueva reunión de videoconsulta
   */
  static async createMeeting(data: CreateMeetingRequest): Promise<MeetingResponse> {
    try {
      const response = await api.post('/api/meetings', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creando reunión:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error creando reunión'
      };
    }
  }

  /**
   * Crear un attendee para una reunión
   */
  static async createAttendee(meetingId: string, data: CreateAttendeeRequest): Promise<AttendeeResponse> {
    try {
      const response = await api.post(`/api/meetings/${meetingId}/attendees`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error creando attendee:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error uniéndose a la reunión'
      };
    }
  }

  /**
   * Obtener información de una reunión
   */
  static async getMeeting(meetingId: string): Promise<MeetingResponse> {
    try {
      const response = await api.get(`/api/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo reunión:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error obteniendo información de la reunión'
      };
    }
  }

  /**
   * Finalizar una reunión
   */
  static async endMeeting(meetingId: string): Promise<MeetingResponse> {
    try {
      const response = await api.delete(`/api/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error finalizando reunión:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error finalizando reunión'
      };
    }
  }

  /**
   * Listar reuniones con filtros
   */
  static async listMeetings(params?: {
    page?: number;
    limit?: number;
    status?: string;
    citaId?: string;
  }): Promise<MeetingListResponse> {
    try {
      const response = await api.get('/api/meetings', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error listando reuniones:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error obteniendo lista de reuniones'
      };
    }
  }

  /**
   * Verificar si una cita tiene una reunión activa
   */
  static async getMeetingByCitaId(citaId: string): Promise<MeetingResponse> {
    try {
      const response = await this.listMeetings({ citaId, limit: 1 });
      if (response.success && response.meetings && response.meetings.length > 0) {
        return {
          success: true,
          meeting: response.meetings[0]
        };
      }
      return {
        success: false,
        error: 'No se encontró reunión para esta cita'
      };
    } catch (error: any) {
      console.error('Error buscando reunión por cita:', error);
      return {
        success: false,
        error: error.message || 'Error buscando reunión'
      };
    }
  }
}

export default MeetingService;
