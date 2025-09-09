import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Eye, Trash2, Building2, Globe, Database, Settings, CheckCircle, Calendar, Activity, XCircle, Filter, TrendingUp, Users, Shield, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientService, type Client } from '../services/clientService';
import { useAlert } from '../contexts/AlertContext';

const ClientManagement: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  
  const { showAlert, showConfirm } = useAlert();

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await ClientService.getAllClients();
      setClients(response.clients);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      // Por ahora usamos datos de ejemplo si falla la API
      setClients([
        {
          _id: '1',
          name: 'Hospital San José',
          domain: 'hospitalsanjose',
          fullDomain: 'plataforma.hospitalsanjose.com',
          databaseUrl: 'mongodb+srv://mozartcuidadordigital:ygHPZAFy@cluster0.hvmu9qg.mongodb.net/hospitalsanjose?retryWrites=true&w=majority',
          databaseName: 'hospitalsanjose',
          isActive: true,
          logo: {
            data: '',
            contentType: 'image/png',
            filename: 'logo.png'
          },
          agendamiento: {
            presentacionUrls: [
              { tipo: 'wpp', url: 'https://api.hospitalsanjose.com/wpp-presentacion' },
              { tipo: 'llamada', url: 'https://api.hospitalsanjose.com/llamada-presentacion' }
            ],
            verificacionDatosUrls: [
              { tipo: 'wpp', url: 'https://api.hospitalsanjose.com/wpp-verificacion' },
              { tipo: 'llamada', url: 'https://api.hospitalsanjose.com/llamada-verificacion' }
            ],
            agendarEntrevistaUrls: [
              { tipo: 'wpp', url: 'https://api.hospitalsanjose.com/wpp-entrevista' },
              { tipo: 'llamada', url: 'https://api.hospitalsanjose.com/llamada-entrevista' }
            ],
            tamizajeUrls: [
              { tipo: 'wpp', url: 'https://api.hospitalsanjose.com/wpp-tamizaje' },
              { tipo: 'llamada', url: 'https://api.hospitalsanjose.com/llamada-tamizaje' }
            ]
          },
          features: {
            agendamiento: true,
            cuidadorDigital: false,
            telemedicina: false,
            reportes: false
          },
          settings: {
            timezone: 'America/Bogota',
            language: 'es',
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af'
          },
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        }
      ]);
    } finally {
      setLoadingClients(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.fullDomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = () => {
    navigate('/clients/new');
  };

  const handleEditClient = (client: Client) => {
    navigate(`/clients/edit/${client._id}`);
  };

  const handleViewClient = (client: Client) => {
    navigate(`/clients/view/${client._id}`);
  };

  const handleDeleteClient = async (clientId: string) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este cliente?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning'
    });

    if (confirmed) {
      try {
        await ClientService.deleteClient(clientId);
        setClients(prev => prev.filter(client => client._id !== clientId));
        showAlert({
          type: 'success',
          title: 'Cliente Eliminado',
          message: 'El cliente se ha eliminado exitosamente'
        });
      } catch (error: any) {
        console.error('Error eliminando cliente:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Error al eliminar el cliente';
        showAlert({
          type: 'error',
          title: 'Error',
          message: errorMessage
        });
      }
    }
  };

  const handleToggleStatus = async (clientId: string) => {
    try {
      const result = await ClientService.toggleClientStatus(clientId);
      setClients(prev => prev.map(client => 
        client._id === clientId ? { ...client, isActive: result.client.isActive } : client
      ));
      
      const statusText = result.client.isActive ? 'activado' : 'desactivado';
      showAlert({
        type: 'success',
        title: 'Estado Cambiado',
        message: `El cliente se ha ${statusText} exitosamente`
      });
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error al cambiar el estado';
      showAlert({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'agendamiento':
        return <Calendar className="h-4 w-4 text-primary-600" />;
      case 'cuidadorDigital':
        return <Activity className="h-4 w-4 text-success-600" />;
      case 'telemedicina':
        return <Settings className="h-4 w-4 text-warning-600" />;
      case 'reportes':
        return <Database className="h-4 w-4 text-info-600" />;
      default:
        return <Settings className="h-4 w-4 text-neutral-600" />;
    }
  };

  const getFeatureLabel = (feature: string) => {
    switch (feature) {
      case 'agendamiento':
        return 'Agendamiento';
      case 'cuidadorDigital':
        return 'Cuidador Digital';
      case 'telemedicina':
        return 'Telemedicina';
      case 'reportes':
        return 'Reportes';
      default:
        return feature;
    }
  };

  const getUrlByTipo = (urls: Array<{ tipo: string; url: string }>, tipo: string) => {
    const urlObj = urls.find(url => url.tipo === tipo);
    return urlObj ? urlObj.url : '';
  };

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-hero rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -inset-4 bg-primary-500/20 rounded-full animate-pulse-slow"></div>
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto"></div>
            <p className="text-primary-700 font-medium">Cargando instituciones médicas...</p>
            <p className="text-sm text-neutral-600">Configurando el sistema</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header con estadísticas */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center">
              <img src="/logos/logo2mozart.png" alt="MozartAi Logo" className="h-8 w-8 mr-3" />
              Gestión de Instituciones Médicas MozartAi
            </h1>
            <p className="text-neutral-600 text-lg">
              Administra las instituciones de salud multi-tenant del sistema
            </p>
          </div>
          <button
            onClick={handleCreateClient}
            className="btn-primary flex items-center shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Institución
          </button>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-stats card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Instituciones</p>
                <p className="text-3xl font-bold text-neutral-900">{clients.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card-stats card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Instituciones Activas</p>
                <p className="text-3xl font-bold text-success-600">{clients.filter(c => c.isActive).length}</p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card-stats card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Con Agendamiento</p>
                <p className="text-3xl font-bold text-warning-600">{clients.filter(c => c.features.agendamiento).length}</p>
              </div>
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="card-stats card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Con Telemedicina</p>
                <p className="text-3xl font-bold text-info-600">{clients.filter(c => c.features.telemedicina).length}</p>
              </div>
              <div className="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-info-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Buscar instituciones
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, dominio o URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-12"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Estado
              </label>
              <select className="input-field">
                <option value="">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Características
              </label>
              <select className="input-field">
                <option value="">Todas las características</option>
                <option value="agendamiento">Con agendamiento</option>
                <option value="telemedicina">Con telemedicina</option>
                <option value="cuidadorDigital">Con cuidador digital</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-gradient-to-r from-primary-50 to-medical-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Institución
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Dominio
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Base de Datos
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Características
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Fecha Creación
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-primary-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100">
            {filteredClients.map((client) => (
              <tr key={client._id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-3 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {client.logo && client.logo.data ? (
                        <img
                          src={`data:${client.logo.contentType};base64,${client.logo.data}`}
                          alt={`Logo de ${client.name}`}
                          className="h-10 w-10 rounded-xl object-contain border-2 border-neutral-100 shadow-sm"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-100 to-medical-100 flex items-center justify-center border-2 border-primary-200">
                          <Building2 className="h-5 w-5 text-primary-600" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-semibold text-neutral-900 max-w-32">
                        <div className="break-words leading-tight">{client.name}</div>
                      </div>
                      <div className="text-sm text-neutral-500 flex items-center">
                        <Globe className="h-3 w-3 mr-1" />
                        <span className="max-w-24 break-words leading-tight">{client.domain}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-neutral-400 mr-2" />
                    <span className="text-sm text-neutral-900 font-medium max-w-32">
                      <div className="break-words leading-tight">{client.fullDomain}</div>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center">
                    <Database className="h-4 w-4 text-neutral-400 mr-2" />
                    <span className="text-sm text-neutral-900 font-medium max-w-24">
                      <div className="break-words leading-tight">{client.databaseName}</div>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(client.features).map(([key, enabled]) => 
                      enabled && (
                        <span
                          key={key}
                          className="badge badge-primary inline-flex items-center px-2 py-1 text-xs"
                          title={getFeatureLabel(key)}
                        >
                          {getFeatureIcon(key)}
                          <span className="ml-1 hidden sm:inline">
                            {getFeatureLabel(key)}
                          </span>
                        </span>
                      )
                    )}
                  </div>
                </td>
                <td className="px-3 py-4">
                  <button
                    onClick={() => handleToggleStatus(client._id)}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                      client.isActive
                        ? 'status-active hover:bg-success-200'
                        : 'status-inactive hover:bg-neutral-200'
                    }`}
                  >
                    {client.isActive ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activa
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactiva
                      </>
                    )}
                  </button>
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 max-w-24">
                  <div className="break-words leading-tight">
                    {new Date(client.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </td>
                <td className="px-3 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => handleViewClient(client)}
                      className="btn-action btn-action-primary p-1"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditClient(client)}
                      className="btn-action btn-action-warning p-1"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client._id)}
                      className="btn-action btn-action-alert p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {/* Estado vacío */}
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-12 w-12 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              No se encontraron instituciones
            </h3>
            <p className="text-neutral-500 mb-6">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando tu primera institución médica'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateClient}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Institución
              </button>
            )}
          </div>
        )}
    </div>
  );
};

export default ClientManagement;
