import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Users, Edit } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { Client, CreateClientData, UpdateClientData, AgendamientoUrl, ClientUser } from '../services/clientService';
import { ClientService } from '../services/clientService';
import { useAlert } from '../contexts/AlertContext';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: CreateClientData | UpdateClientData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onSubmit, onCancel, isLoading = false }) => {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    domain: '', // Campo separado para el dominio base
    fullDomain: '',
    agendamiento: {
      presentacionUrls: [
        { tipo: 'wpp', url: '' },
        { tipo: 'llamada', url: '' }
      ],
      verificacionDatosUrls: [
        { tipo: 'wpp', url: '' },
        { tipo: 'llamada', url: '' }
      ],
      agendarEntrevistaUrls: [
        { tipo: 'wpp', url: '' },
        { tipo: 'llamada', url: '' }
      ],
      tamizajeUrls: [
        { tipo: 'wpp', url: '' },
        { tipo: 'llamada', url: '' }
      ]
    },
    features: {
      agendamiento: false,
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
    // Campos de usuario
    userFirstName: '',
    userLastName: '',
    userEmail: '',
    userPhone: '',
    userPassword: '',
    userRole: 'admin'
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        domain: client.domain, // Cargar el dominio base
        fullDomain: client.fullDomain,
        agendamiento: client.agendamiento,
        features: client.features,
        settings: client.settings,
        // Los campos de usuario no se cargan al editar (por seguridad)
        userFirstName: '',
        userLastName: '',
        userEmail: '',
        userPhone: '',
        userPassword: '',
        userRole: 'admin'
      });
      
      if (client.logo) {
        setLogoPreview(`data:${client.logo.contentType};base64,${client.logo.data}`);
      }

      // Cargar usuarios de la base de datos del cliente
      loadClientUsers();
    }
  }, [client]);

  const loadClientUsers = async () => {
    if (!client) return;
    
    try {
      setLoadingUsers(true);
      const response = await ClientService.getClientUsers(client._id);
      setClientUsers(response.users);
    } catch (error) {
      console.error('Error cargando usuarios del cliente:', error);
      // Si falla, no mostramos error al usuario, solo log
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => {
      const parentData = prev[parent as keyof typeof prev] as Record<string, any>;
      return {
        ...prev,
        [parent]: {
          ...parentData,
          [field]: value
        }
      };
    });
  };

  const handleUrlChange = (parent: string, field: string, tipo: 'wpp' | 'llamada', value: string) => {
    setFormData(prev => {
      const parentData = prev[parent as keyof typeof prev] as Record<string, any>;
      const urls = parentData[field] as AgendamientoUrl[];
      const newUrls = urls.map(url => 
        url.tipo === tipo ? { ...url, url: value } : url
      );
      
      return {
        ...prev,
        [parent]: {
          ...parentData,
          [field]: newUrls
        }
      };
    });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para comprimir imagen
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones (máximo 300x300)
        const maxSize = 300;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen comprimida
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con calidad 0.8 (80%)
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    let submitData = { ...formData };
    
    // Si estamos editando un cliente, no incluir campos de usuario vacíos
    if (client) {
      // Solo incluir campos de usuario si se proporcionaron valores
      if (!submitData.userFirstName?.trim()) {
        delete submitData.userFirstName;
      }
      if (!submitData.userLastName?.trim()) {
        delete submitData.userLastName;
      }
      if (!submitData.userEmail?.trim()) {
        delete submitData.userEmail;
      }
      if (!submitData.userPassword?.trim()) {
        delete submitData.userPassword;
      }
      if (!submitData.userRole) {
        delete submitData.userRole;
      }
    }
    
    // Procesar logo si se seleccionó un archivo
    if (logoFile) {
      try {
        // Comprimir imagen antes de convertir a base64
        const compressedBlob = await compressImage(logoFile);
        const base64 = await fileToBase64(compressedBlob);
        
        submitData.logo = {
          data: base64.split(',')[1], // Remover el prefijo data:image/...;base64,
          contentType: 'image/jpeg', // Siempre JPEG comprimido
          filename: logoFile.name.replace(/\.[^/.]+$/, '.jpg') // Cambiar extensión a .jpg
        };
      } catch (error) {
        console.error('Error comprimiendo imagen:', error);
        // Fallback: usar imagen original sin comprimir
        const base64 = await fileToBase64(logoFile);
        submitData.logo = {
          data: base64.split(',')[1],
          contentType: logoFile.type,
          filename: logoFile.name
        };
      }
    }
    
    onSubmit(submitData);
  };

  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Asegurar que los objetos anidados siempre existan
  const features = formData.features || {
    agendamiento: false,
    cuidadorDigital: false,
    telemedicina: false,
    reportes: false
  };

  const agendamiento = formData.agendamiento || {
    presentacionUrls: [
      { tipo: 'wpp', url: '' },
      { tipo: 'llamada', url: '' }
    ],
    verificacionDatosUrls: [
      { tipo: 'wpp', url: '' },
      { tipo: 'llamada', url: '' }
    ],
    agendarEntrevistaUrls: [
      { tipo: 'wpp', url: '' },
      { tipo: 'llamada', url: '' }
    ],
    tamizajeUrls: [
      { tipo: 'wpp', url: '' },
      { tipo: 'llamada', url: '' }
    ]
  };

  const settings = formData.settings || {
    timezone: 'America/Bogota',
    language: 'es',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af'
  };

  const getUrlByTipo = (urls: AgendamientoUrl[], tipo: 'wpp' | 'llamada') => {
    const urlObj = urls.find(url => url.tipo === tipo);
    return urlObj ? urlObj.url : '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información básica */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">Información Básica</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Cliente *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input-field w-full"
              placeholder="Ej: Hospital San José"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dominio Base *
            </label>
            <input
              type="text"
              required
              value={formData.domain || ''}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              className="input-field w-full"
              placeholder="Ej: hospitalsanjose"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo el nombre del dominio, sin subdominios ni extensión
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dominio Completo *
            </label>
            <input
              type="text"
              required
              value={formData.fullDomain}
              onChange={(e) => handleInputChange('fullDomain', e.target.value)}
              className="input-field w-full"
              placeholder="Ej: plataforma.hospitalsanjose.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL completa con subdominios y extensión
            </p>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo del Cliente
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-20 w-20 object-contain border rounded-lg"
                />
              ) : (
                <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="btn-secondary cursor-pointer inline-flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoPreview ? 'Cambiar Logo' : 'Seleccionar Logo'}
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview('');
                  }}
                  className="ml-2 text-red-600 hover:text-red-800 text-sm"
                >
                  <Trash2 className="h-4 w-4 inline mr-1" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Las imágenes se comprimirán automáticamente para optimizar el tamaño
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">Funcionalidades</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(features).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleNestedChange('features', key, e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 capitalize">
                {key === 'cuidadorDigital' ? 'Cuidador Digital' : key}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* URLs de Agendamiento */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">URLs de Agendamiento</h4>
        
        {Object.entries(agendamiento).map(([key, urls]) => (
          <div key={key} className="space-y-3 p-4 border rounded-lg bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 capitalize">
              {key === 'presentacionUrls' ? 'URLs de Presentación' :
               key === 'verificacionDatosUrls' ? 'URLs de Verificación de Datos' :
               key === 'agendarEntrevistaUrls' ? 'URLs de Agendar Entrevista' :
               'URLs de Tamizaje'}
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  URL WhatsApp
                </label>
                <input
                  type="text"
                  value={getUrlByTipo(urls, 'wpp')}
                  onChange={(e) => handleUrlChange('agendamiento', key, 'wpp', e.target.value)}
                  className="input-field w-full"
                  placeholder="Ej: whatsapp.mozartai.com o https://..."
                />
              </div>
              
              {/* Llamada */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  URL Llamada
                </label>
                <input
                  type="text"
                  value={getUrlByTipo(urls, 'llamada')}
                  onChange={(e) => handleUrlChange('agendamiento', key, 'llamada', e.target.value)}
                  className="input-field w-full"
                  placeholder="Ej: llamada.mozartai.com o https://..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuración */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">Configuración</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona Horaria
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleNestedChange('settings', 'timezone', e.target.value)}
              className="input-field w-full"
            >
              <option value="America/Bogota">Colombia (Bogotá)</option>
              <option value="America/New_York">Estados Unidos (Nueva York)</option>
              <option value="America/Los_Angeles">Estados Unidos (Los Ángeles)</option>
              <option value="Europe/Madrid">España (Madrid)</option>
              <option value="America/Mexico_City">México (Ciudad de México)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idioma
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleNestedChange('settings', 'language', e.target.value)}
              className="input-field w-full"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color Primario
            </label>
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => handleNestedChange('settings', 'primaryColor', e.target.value)}
              className="input-field w-full h-10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color Secundario
            </label>
            <input
              type="color"
              value={settings.secondaryColor}
              onChange={(e) => handleNestedChange('settings', 'secondaryColor', e.target.value)}
              className="input-field w-full h-10"
            />
          </div>
        </div>
      </div>

      {/* Usuario Administrador */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">Usuario Administrador</h4>
        
        {client ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Al editar un cliente, los campos de usuario no se cargan por seguridad. 
                Si necesitas crear un nuevo usuario, completa los campos a continuación.
              </p>
            </div>

            {/* Botón para gestionar usuarios existentes */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowUserModal(true)}
                className="btn-secondary flex items-center text-sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Gestionar Usuarios Existentes
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Este usuario se creará en la base de datos del cliente y tendrá acceso administrativo.
          </p>
        )}
        
        <div className="space-y-4">
          <h5 className="text-md font-medium text-gray-700">Crear Nuevo Usuario Administrador</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre {!client && '*'}
              </label>
              <input
                type="text"
                required={!client}
                value={formData.userFirstName || ''}
                onChange={(e) => handleInputChange('userFirstName', e.target.value)}
                className="input-field w-full"
                placeholder="Ej: Juan"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido {!client && '*'}
              </label>
              <input
                type="text"
                required={!client}
                value={formData.userLastName || ''}
                onChange={(e) => handleInputChange('userLastName', e.target.value)}
                className="input-field w-full"
                placeholder="Ej: Pérez"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email {!client && '*'}
              </label>
              <input
                type="email"
                required={!client}
                value={formData.userEmail || ''}
                onChange={(e) => handleInputChange('userEmail', e.target.value)}
                className="input-field w-full"
                placeholder="Ej: admin@cliente.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono {!client && '*'}
              </label>
              <PhoneInput
                international
                defaultCountry="CO"
                value={formData.userPhone || ''}
                onChange={(value) => handleInputChange('userPhone', value || '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!client}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña {!client && '*'}
              </label>
              <input
                type="password"
                required={!client}
                value={formData.userPassword || ''}
                onChange={(e) => handleInputChange('userPassword', e.target.value)}
                className="input-field w-full"
                placeholder={client ? "Dejar vacío para mantener la actual" : "Mínimo 8 caracteres"}
                minLength={client ? undefined : 8}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de gestión de usuarios */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedUser ? 'Editar Usuario' : 'Gestionar Usuarios'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {selectedUser ? (
                <UserEditForm
                  user={selectedUser}
                  isLoading={isEditingUser}
                  onSave={async (userData) => {
                    try {
                      // Mostrar estado de carga
                      setIsEditingUser(true);
                      
                      // Actualizar usuario
                      await ClientService.updateClientUser(client!._id, selectedUser._id, userData);
                      
                      // Recargar lista de usuarios
                      await loadClientUsers();
                      
                                             // Mostrar mensaje de éxito
                       showAlert({
                         type: 'success',
                         title: 'Usuario Actualizado',
                         message: 'El usuario se ha actualizado exitosamente'
                       });
                      
                      // Cerrar modal
                      setSelectedUser(null);
                      setShowUserModal(false);
                                         } catch (error) {
                       console.error('Error actualizando usuario:', error);
                       showAlert({
                         type: 'error',
                         title: 'Error al Actualizar',
                         message: 'No se pudo actualizar el usuario: ' + (error instanceof Error ? error.message : 'Error desconocido')
                       });
                     } finally {
                      setIsEditingUser(false);
                    }
                  }}
                  onCancel={() => {
                    setSelectedUser(null);
                    setShowUserModal(false);
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Gestión de Usuarios</h4>
                    <p className="text-gray-600">
                      Aquí puedes gestionar los usuarios de la base de datos del cliente.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {clientUsers.map((user) => (
                      <div key={user._id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-blue-100 text-blue-800' 
                                : user.role === 'patient'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'admin' ? 'Administrador' : user.role === 'patient' ? 'Paciente' : 'Usuario'}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedUser(user)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar usuario"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : (client ? 'Actualizar Cliente' : 'Crear Cliente')}
        </button>
      </div>
    </form>
  );
};

// Componente para editar usuarios
interface UserEditFormProps {
  user: ClientUser;
  isLoading: boolean;
  onSave: (userData: Partial<ClientUser>) => void;
  onCancel: () => void;
}

const UserEditForm: React.FC<UserEditFormProps> = ({ user, isLoading, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: '',
    role: user.role,
    isActive: user.isActive
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userData: Partial<ClientUser> = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      role: formData.role,
      isActive: formData.isActive
    };
    
    // Solo incluir password si se proporcionó uno nuevo
    if (formData.password.trim()) {
      userData.password = formData.password;
    }
    
    onSave(userData);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className="input-field w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className="input-field w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="input-field w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="input-field w-full"
            placeholder="Dejar vacío para mantener la actual"
            autoComplete="new-password"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' | 'patient' }))}
            className="input-field w-full"
          >
            <option value="admin">Administrador</option>
            <option value="user">Usuario</option>
            <option value="patient">Paciente</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={formData.isActive ? 'true' : 'false'}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
            className="input-field w-full"
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};

export default ClientForm;
