import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Building2, Globe, Database, Settings, CheckCircle, Calendar, Activity, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientService, type Client } from '../services/clientService';
import { useAlert } from '../contexts/AlertContext';

const ViewClient: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { showAlert } = useAlert();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await ClientService.getClientById(clientId!);
      setClient(response.client);
    } catch (error) {
      console.error('Error cargando cliente:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el cliente'
      });
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/clients/edit/${clientId}`);
  };

  const handleBack = () => {
    navigate('/clients');
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'agendamiento':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'cuidadorDigital':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'telemedicina':
        return <Settings className="h-4 w-4 text-purple-600" />;
      case 'reportes':
        return <Database className="h-4 w-4 text-orange-600" />;
      default:
        return <Settings className="h-4 w-4 text-gray-600" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Cliente no encontrado</p>
          <button
            onClick={handleBack}
            className="mt-4 text-primary-600 hover:text-primary-900"
          >
            Volver a Clientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver a Clientes
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <img src="/logos/logo2mozart.png" alt="MozartAi Logo" className="h-8 w-8" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Detalles del Cliente MozartAi
                </h1>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="btn-primary flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Cliente
            </button>
          </div>
          <p className="mt-2 text-gray-600">
            Información completa del cliente {client.name}
          </p>
        </div>

        {/* Contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-primary-600" />
                Información Básica
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Nombre</label>
                  <p className="text-sm text-gray-900 font-medium">{client.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Dominio</label>
                  <p className="text-sm text-gray-900 font-medium">{client.domain}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Dominio Completo</label>
                  <p className="text-sm text-gray-900 font-medium">{client.fullDomain}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Base de Datos</label>
                  <p className="text-sm text-gray-900 font-medium">{client.databaseName}</p>
                </div>
              </div>
            </div>

            {/* Logo */}
            {client.logo && client.logo.data && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Logo</h2>
                <img
                  src={`data:${client.logo.contentType};base64,${client.logo.data}`}
                  alt={`Logo de ${client.name}`}
                  className="h-32 w-32 object-contain border rounded-lg"
                />
              </div>
            )}

            {/* URLs de Agendamiento */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                URLs de Agendamiento
              </h2>
              <div className="space-y-4">
                {Object.entries(client.agendamiento).map(([key, urls]) => (
                  <div key={key} className="p-4 border rounded-lg bg-gray-50">
                    <div className="text-sm font-medium capitalize mb-3 text-gray-700">
                      {key === 'presentacionUrls' ? 'Presentación' :
                       key === 'verificacionDatosUrls' ? 'Verificación de Datos' :
                       key === 'agendarEntrevistaUrls' ? 'Agendar Entrevista' :
                       'Tamizaje'}:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-600">WhatsApp:</span>
                        <div className="text-gray-600 break-all mt-1 p-2 bg-white rounded border">
                          {getUrlByTipo(urls, 'wpp') || 'No configurado'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-blue-600">Llamada:</span>
                        <div className="text-gray-600 break-all mt-1 p-2 bg-white rounded border">
                          {getUrlByTipo(urls, 'llamada') || 'No configurado'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estado */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado</h3>
              <div className="flex items-center">
                <button
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    client.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {client.isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activo
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Inactivo
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Funcionalidades</h3>
              <div className="space-y-2">
                {Object.entries(client.features).map(([key, enabled]) => (
                  <div
                    key={key}
                    className={`flex items-center p-2 rounded-lg ${
                      enabled
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {getFeatureIcon(key)}
                    <span className={`ml-2 text-sm ${
                      enabled ? 'text-primary-800 font-medium' : 'text-gray-500'
                    }`}>
                      {getFeatureLabel(key)}
                    </span>
                    {enabled && (
                      <CheckCircle className="h-4 w-4 ml-auto text-primary-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Configuración */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Zona horaria:</span>
                  <p className="text-gray-600">{client.settings.timezone}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Idioma:</span>
                  <p className="text-gray-600">{client.settings.language}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Color primario:</span>
                  <div className="flex items-center mt-1">
                    <div
                      className="w-6 h-6 rounded border mr-2"
                      style={{ backgroundColor: client.settings.primaryColor }}
                    ></div>
                    <span className="text-gray-600 font-mono">{client.settings.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Color secundario:</span>
                  <div className="flex items-center mt-1">
                    <div
                      className="w-6 h-6 rounded border mr-2"
                      style={{ backgroundColor: client.settings.secondaryColor }}
                    ></div>
                    <span className="text-gray-600 font-mono">{client.settings.secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Creado:</span>
                  <p className="text-gray-600">{new Date(client.createdAt).toLocaleDateString('es-ES')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Actualizado:</span>
                  <p className="text-gray-600">{new Date(client.updatedAt).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewClient;
