import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';

interface Insurance {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const InsuranceManagement: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInsurances();
    
    // Escuchar el evento para abrir el formulario desde el botón del header
    const handleOpenForm = () => {
      handleNewInsurance();
    };
    
    document.addEventListener('openNewInsuranceForm', handleOpenForm);
    
    return () => {
      document.removeEventListener('openNewInsuranceForm', handleOpenForm);
    };
  }, []);

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/insurances`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInsurances(data.insurances);
      } else {
        setError(data.message || 'Error al cargar compañías de seguro');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre de la compañía de seguro es requerido');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const url = editingInsurance 
        ? `${import.meta.env.VITE_BACKEND_URL}/api/insurances/${editingInsurance._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/insurances`;
      
      const method = editingInsurance ? 'PUT' : 'POST';
      
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        if (editingInsurance) {
          setInsurances(insurances.map(ins => 
            ins._id === editingInsurance._id ? data.insurance : ins
          ));
          showAlert({
            type: 'success',
            title: 'Compañía Actualizada',
            message: 'La compañía de seguro se ha actualizado exitosamente.'
          });
        } else {
          setInsurances([...insurances, data.insurance]);
          showAlert({
            type: 'success',
            title: 'Compañía Creada',
            message: 'La compañía de seguro se ha creado exitosamente.'
          });
        }
        
        handleCloseForm();
      } else {
        setError(data.message || 'Error al guardar compañía de seguro');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (insurance: Insurance) => {
    setEditingInsurance(insurance);
    setFormData({ name: insurance.name });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta compañía de seguro? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/insurances/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setInsurances(insurances.filter(ins => ins._id !== id));
        showAlert({
          type: 'success',
          title: 'Compañía Eliminada',
          message: 'La compañía de seguro se ha eliminado exitosamente.'
        });
      } else {
        setError(data.message || 'Error al eliminar compañía de seguro');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingInsurance(null);
    setFormData({ name: '' });
    setError('');
  };

  const handleNewInsurance = () => {
    setEditingInsurance(null);
    setFormData({ name: '' });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-3 text-neutral-600">Cargando compañías de seguro...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          Gestión de Compañías de Seguro
        </h2>
        <p className="text-neutral-600">
          Administra las compañías de seguro de tu institución
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" onClick={handleCloseForm} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {editingInsurance ? 'Editar Compañía de Seguro' : 'Nueva Compañía de Seguro'}
                  </h3>
                  <button
                    onClick={handleCloseForm}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                      Nombre de la Compañía <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
                      className="input-field w-full"
                      placeholder="Ej: Seguros Bolívar"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="btn-secondary"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {editingInsurance ? 'Actualizar' : 'Crear'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insurances List */}
      <div className="bg-white shadow-sm rounded-lg border border-neutral-200">
        {insurances.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              No hay compañías de seguro registradas
            </h3>
            <p className="text-neutral-500 mb-4">
              Comienza creando la primera compañía de seguro
            </p>
            <button
              onClick={handleNewInsurance}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Compañía de Seguro
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Compañía de Seguro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Fecha de Creación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {insurances.map((insurance) => (
                  <tr key={insurance._id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <Shield className="h-4 w-4 text-primary-600" />
                        </div>
                        <div className="text-sm font-medium text-neutral-900">
                          {insurance.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(insurance.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(insurance)}
                          className="text-primary-600 hover:text-primary-900 p-1 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(insurance._id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
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
        )}
      </div>
    </div>
  );
};

export default InsuranceManagement;
