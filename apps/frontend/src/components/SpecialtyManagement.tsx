import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Edit, Trash2, X, Check, Loader2 } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';

interface Specialty {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const SpecialtyManagement: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSpecialties();
    
    // Escuchar el evento para abrir el formulario desde el botón del header
    const handleOpenForm = () => {
      handleNewSpecialty();
    };
    
    document.addEventListener('openNewSpecialtyForm', handleOpenForm);
    
    return () => {
      document.removeEventListener('openNewSpecialtyForm', handleOpenForm);
    };
  }, []);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/specialties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSpecialties(data.specialties);
      } else {
        setError(data.message || 'Error al cargar especialidades');
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
      setError('El nombre de la especialidad es requerido');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const url = editingSpecialty 
        ? `${import.meta.env.VITE_BACKEND_URL}/api/specialties/${editingSpecialty._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/specialties`;
      
      const method = editingSpecialty ? 'PUT' : 'POST';
      
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
        if (editingSpecialty) {
          setSpecialties(specialties.map(s => 
            s._id === editingSpecialty._id ? data.specialty : s
          ));
          showAlert({
            type: 'success',
            title: 'Especialidad Actualizada',
            message: 'La especialidad se ha actualizado exitosamente.'
          });
        } else {
          setSpecialties([...specialties, data.specialty]);
          showAlert({
            type: 'success',
            title: 'Especialidad Creada',
            message: 'La especialidad se ha creado exitosamente.'
          });
        }
        
        handleCloseForm();
        setFormData({ name: '' });
      } else {
        setError(data.message || 'Error al guardar especialidad');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (specialty: Specialty) => {
    setEditingSpecialty(specialty);
    setFormData({ name: specialty.name });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar esta especialidad? Esta acción no se puede deshacer.',
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

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/specialties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setSpecialties(specialties.filter(s => s._id !== id));
        showAlert({
          type: 'success',
          title: 'Especialidad Eliminada',
          message: 'La especialidad se ha eliminado exitosamente.'
        });
      } else {
        setError(data.message || 'Error al eliminar especialidad');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSpecialty(null);
    setFormData({ name: '' });
    setError('');
  };

  const handleNewSpecialty = () => {
    setEditingSpecialty(null);
    setFormData({ name: '' });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-3 text-neutral-600">Cargando especialidades...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          Gestión de Especialidades
        </h2>
        <p className="text-neutral-600">
          Administra las especialidades médicas de tu institución
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
                    {editingSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}
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
                      Nombre de la Especialidad
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
                      className="input-field w-full"
                      placeholder="Ej: Cardiología"
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
                          {editingSpecialty ? 'Actualizar' : 'Crear'}
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

      {/* Specialties List */}
      <div className="bg-white shadow-sm rounded-lg border border-neutral-200">
        {specialties.length === 0 ? (
          <div className="text-center py-12">
            <Stethoscope className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              No hay especialidades registradas
            </h3>
            <p className="text-neutral-500 mb-4">
              Comienza creando la primera especialidad de tu institución
            </p>
            <button
              onClick={handleNewSpecialty}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Especialidad
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Fecha de Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Última Actualización
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {specialties.map((specialty) => (
                  <tr key={specialty._id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <Stethoscope className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {specialty.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(specialty.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(specialty.updatedAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(specialty)}
                          className="text-primary-600 hover:text-primary-900 p-1 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(specialty._id)}
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

export default SpecialtyManagement;
