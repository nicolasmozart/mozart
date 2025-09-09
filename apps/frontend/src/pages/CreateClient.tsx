import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ClientForm from '../components/ClientForm';
import { ClientService, type CreateClientData, type UpdateClientData } from '../services/clientService';
import { useAlert } from '../contexts/AlertContext';

const CreateClient: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
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
    }
  };

  const handleSubmit = async (data: CreateClientData | UpdateClientData) => {
    setIsLoading(true);
    try {
      if (clientId) {
        // Actualizar cliente existente
        const result = await ClientService.updateClient(clientId, data);
        showAlert({
          type: 'success',
          title: 'Cliente Actualizado',
          message: 'El cliente se ha actualizado exitosamente'
        });
      } else {
        // Crear nuevo cliente
        const result = await ClientService.createClient(data as CreateClientData);
        showAlert({
          type: 'success',
          title: 'Cliente Creado',
          message: result.message
        });
        
        // Si hay información sobre la creación del usuario, mostrarla
        if ('userCreation' in result && result.userCreation) {
          const userCreation = result.userCreation as any;
          if (userCreation.success) {
            showAlert({
              type: 'success',
              title: 'Usuario Creado',
              message: userCreation.message
            });
          } else {
            showAlert({
              type: 'warning',
              title: 'Usuario No Creado',
              message: userCreation.message
            });
          }
        }
      }
      
      // Redirigir a la lista de clientes
      navigate('/clients');
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error desconocido';
      showAlert({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/clients');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver a Clientes
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <img src="/logos/logo2mozart.png" alt="MozartAi Logo" className="h-8 w-8" />
                <h1 className="text-3xl font-bold text-gray-900">
                  {clientId ? 'Editar Cliente' : 'Nuevo Cliente'} MozartAi
                </h1>
              </div>
            </div>
          </div>
          <p className="mt-2 text-gray-600">
            {clientId ? 'Modifica la información del cliente existente' : 'Crea un nuevo cliente en el sistema'}
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-8">
            <ClientForm
              client={client}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateClient;
