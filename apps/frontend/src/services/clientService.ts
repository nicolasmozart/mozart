import { api } from './api';

export interface ClientLogo {
  data: string; // base64
  contentType: string;
  filename: string;
}

export interface AgendamientoUrl {
  tipo: 'wpp' | 'llamada';
  url: string;
}

export interface AgendamientoUrls {
  presentacionUrls: AgendamientoUrl[];
  verificacionDatosUrls: AgendamientoUrl[];
  agendarEntrevistaUrls: AgendamientoUrl[];
  tamizajeUrls: AgendamientoUrl[];
}

export interface ClientFeatures {
  agendamiento: boolean;
  cuidadorDigital: boolean;
  telemedicina: boolean;
  reportes: boolean;
}

export interface ClientSettings {
  timezone: string;
  language: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Client {
  _id: string;
  name: string;
  domain: string;
  fullDomain: string;
  databaseUrl: string;
  databaseName: string;
  isActive: boolean;
  logo?: ClientLogo;
  agendamiento: AgendamientoUrls;
  features: ClientFeatures;
  settings: ClientSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  name: string;
  domain: string; // Campo separado para el dominio base
  fullDomain: string;
  databaseUrl?: string;
  databaseName?: string;
  logo?: ClientLogo;
  agendamiento?: Partial<AgendamientoUrls>;
  features?: Partial<ClientFeatures>;
  settings?: Partial<ClientSettings>;
  // Campos para crear usuario en la BD del cliente
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userPhone?: string;
  userPassword?: string;
  userRole?: 'admin' | 'user';
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface ClientUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: 'admin' | 'user' | 'patient';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ClientService {
  // Obtener todos los clientes
  static async getAllClients(): Promise<{ clients: Client[]; total: number }> {
    const response = await api.get('/admin/clients');
    return response.data;
  }

  // Obtener cliente por ID
  static async getClientById(id: string): Promise<{ client: Client }> {
    const response = await api.get(`/admin/clients/${id}`);
    return response.data;
  }

  // Crear nuevo cliente
  static async createClient(data: CreateClientData): Promise<{ message: string; client: Client }> {
    const response = await api.post('/admin/clients', data);
    return response.data;
  }

  // Actualizar cliente
  static async updateClient(id: string, data: UpdateClientData): Promise<{ message: string; client: Client }> {
    const response = await api.put(`/admin/clients/${id}`, data);
    return response.data;
  }

  // Actualizar logo del cliente
  static async updateClientLogo(id: string, logo: ClientLogo): Promise<{ message: string; logo: ClientLogo }> {
    const response = await api.patch(`/admin/clients/${id}/logo`, { logo });
    return response.data;
  }

  // Actualizar URLs de agendamiento
  static async updateAgendamientoUrls(id: string, agendamiento: AgendamientoUrls): Promise<{ message: string; agendamiento: AgendamientoUrls }> {
    const response = await api.patch(`/admin/clients/${id}/agendamiento`, { agendamiento });
    return response.data;
  }

  // Actualizar features del cliente
  static async updateClientFeatures(id: string, features: ClientFeatures): Promise<{ message: string; features: ClientFeatures }> {
    const response = await api.patch(`/admin/clients/${id}/features`, { features });
    return response.data;
  }

  // Activar/Desactivar cliente
  static async toggleClientStatus(id: string): Promise<{ message: string; client: { id: string; name: string; isActive: boolean } }> {
    const response = await api.patch(`/admin/clients/${id}/toggle-status`);
    return response.data;
  }

  // Eliminar cliente
  static async deleteClient(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/admin/clients/${id}`);
    return response.data;
  }

  // Obtener clientes por feature específico
  static async getClientsByFeature(feature: string): Promise<{ clients: Client[]; total: number; feature: string }> {
    const response = await api.get(`/admin/clients/feature/${feature}`);
    return response.data;
  }

  // Obtener información del cliente actual
  static async getCurrentClient(): Promise<{ client: Client }> {
    const response = await api.get('/client/current');
    return response.data;
  }

  // Obtener usuarios de la base de datos del cliente
  static async getClientUsers(clientId: string): Promise<{ users: ClientUser[]; total: number }> {
    const response = await api.get(`/admin/clients/${clientId}/users`);
    return response.data;
  }

  // Actualizar usuario en la base de datos del cliente
  static async updateClientUser(clientId: string, userId: string, userData: Partial<ClientUser>): Promise<{ message: string; user: ClientUser }> {
    const response = await api.put(`/admin/clients/${clientId}/users/${userId}`, userData);
    return response.data;
  }

  // Crear usuario en la base de datos del cliente
  static async createClientUser(clientId: string, userData: Omit<ClientUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<{ message: string; user: ClientUser }> {
    const response = await api.post(`/admin/clients/${clientId}/users`, userData);
    return response.data;
  }
}
