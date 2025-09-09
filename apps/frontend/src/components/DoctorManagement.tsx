import React, { useState, useEffect } from 'react';
import { User, Plus, Edit, Trash2, X, Check, Loader2, Upload } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAlert } from '../contexts/AlertContext';

interface Doctor {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  especialidad: { _id: string; name: string } | string;
  cedula: string;
  hospital?: { _id: string; name: string } | string;
  url_firma?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

const DoctorManagement: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    especialidad: '',
    cedula: '',
    hospital: '',
    url_firma: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hospitals, setHospitals] = useState<Array<{_id: string, name: string}>>([]);
  const [specialties, setSpecialties] = useState<Array<{_id: string, name: string}>>([]);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [hospitalFormData, setHospitalFormData] = useState({ name: '' });
  const [submittingHospital, setSubmittingHospital] = useState(false);
  const [showSpecialtyForm, setShowSpecialtyForm] = useState(false);
  const [specialtyFormData, setSpecialtyFormData] = useState({ name: '' });
  const [submittingSpecialty, setSubmittingSpecialty] = useState(false);



  useEffect(() => {
    fetchDoctors();
    fetchHospitals();
    fetchSpecialties();
    
    // Escuchar el evento para abrir el formulario desde el botón del header
    const handleOpenForm = () => {
      handleNewDoctor();
    };
    
    document.addEventListener('openNewDoctorForm', handleOpenForm);
    
    return () => {
      document.removeEventListener('openNewDoctorForm', handleOpenForm);
    };
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        setError('No hay token de autenticación');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/doctors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        setError(data.message || 'Error al cargar doctores');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hospitals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHospitals(data.hospitals);
      }
    } catch (error) {
      console.error('Error al cargar hospitales:', error);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
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
      }
    } catch (error) {
      console.error('Error al cargar especialidades:', error);
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hospitalFormData.name.trim()) {
      return;
    }

    try {
      setSubmittingHospital(true);
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hospitals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hospitalFormData)
      });

      const data = await response.json();

      if (data.success) {
        // Agregar el nuevo hospital a la lista
        setHospitals([...hospitals, data.hospital]);
        // Seleccionar automáticamente el nuevo hospital
        setFormData({ ...formData, hospital: data.hospital._id });
        // Cerrar el modal y limpiar el formulario
        setShowHospitalForm(false);
        setHospitalFormData({ name: '' });
        // Mostrar mensaje de éxito
        showAlert({
          type: 'success',
          title: 'Hospital Creado',
          message: 'El hospital se ha creado exitosamente y ha sido seleccionado.'
        });
      }
    } catch (error) {
      console.error('Error al crear hospital:', error);
    } finally {
      setSubmittingHospital(false);
    }
  };

  const handleCloseHospitalForm = () => {
    setShowHospitalForm(false);
    setHospitalFormData({ name: '' });
    setSubmittingHospital(false);
  };

  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!specialtyFormData.name.trim()) {
      return;
    }

    try {
      setSubmittingSpecialty(true);
      const token = localStorage.getItem('tenantToken');
      
      if (!token) {
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/specialties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(specialtyFormData)
      });

      const data = await response.json();

      if (data.success) {
        // Agregar la nueva especialidad a la lista
        setSpecialties([...specialties, data.specialty]);
        // Seleccionar automáticamente la nueva especialidad
        setFormData({ ...formData, especialidad: data.specialty._id });
        // Cerrar el modal y limpiar el formulario
        setShowSpecialtyForm(false);
        setSpecialtyFormData({ name: '' });
        // Mostrar mensaje de éxito
        showAlert({
          type: 'success',
          title: 'Especialidad Creada',
          message: 'La especialidad se ha creado exitosamente y ha sido seleccionada.'
        });
      }
    } catch (error) {
      console.error('Error al crear especialidad:', error);
    } finally {
      setSubmittingSpecialty(false);
    }
  };

  const handleCloseSpecialtyForm = () => {
    setShowSpecialtyForm(false);
    setSpecialtyFormData({ name: '' });
    setSubmittingSpecialty(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      try {
        // Convertir archivo a base64
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, url_firma: base64 }));
      } catch (error) {
        console.error('Error convirtiendo archivo a base64:', error);
        setError('Error procesando el archivo de firma');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.lastName.trim() || !formData.email.trim() || 
        !formData.phone.trim() || !formData.especialidad.trim() || 
        !formData.cedula.trim()) {
      setError('Todos los campos obligatorios son requeridos');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const url = editingDoctor 
        ? `${import.meta.env.VITE_BACKEND_URL}/api/doctors/${editingDoctor._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/doctors`;
      
      const method = editingDoctor ? 'PUT' : 'POST';
      
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
        if (editingDoctor) {
          setDoctors(doctors.map(d => 
            d._id === editingDoctor._id ? data.doctor : d
          ));
          showAlert({
            type: 'success',
            title: 'Doctor Actualizado',
            message: 'El doctor se ha actualizado exitosamente.'
          });
        } else {
          setDoctors([...doctors, data.doctor]);
          showAlert({
            type: 'success',
            title: 'Doctor Creado',
            message: 'El doctor se ha creado exitosamente. Se ha generado un usuario con acceso al sistema.'
          });
        }
        
        handleCloseForm();
      } else {
        setError(data.message || 'Error al guardar doctor');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
         setFormData({
       name: doctor.name,
       lastName: doctor.lastName,
       email: doctor.email,
       phone: doctor.phone,
               especialidad: typeof doctor.especialidad === 'object' ? doctor.especialidad._id : doctor.especialidad,
       cedula: doctor.cedula,
               hospital: typeof doctor.hospital === 'object' ? doctor.hospital._id : doctor.hospital || '',
       url_firma: doctor.url_firma || ''
     });
    setShowForm(true);
    fetchHospitals(); // Cargar hospitales cuando se edite un doctor
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que quieres eliminar este doctor? Esta acción no se puede deshacer.',
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

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/doctors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setDoctors(doctors.filter(d => d._id !== id));
        showAlert({
          type: 'success',
          title: 'Doctor Eliminado',
          message: 'El doctor se ha eliminado exitosamente.'
        });
      } else {
        setError(data.message || 'Error al eliminar doctor');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDoctor(null);
    setFormData({
      name: '',
      lastName: '',
      email: '',
      phone: '',
      especialidad: '',
      cedula: '',
      hospital: '',
      url_firma: ''
    });
    setSelectedFile(null);
    setError('');
    fetchHospitals(); // Cargar hospitales cuando se cierre el formulario
    fetchSpecialties(); // Cargar especialidades cuando se cierre el formulario
  };

  const handleNewDoctor = () => {
    setEditingDoctor(null);
    setFormData({
      name: '',
      lastName: '',
      email: '',
      phone: '',
      especialidad: '',
      cedula: '',
      hospital: '',
      url_firma: ''
    });
    setSelectedFile(null);
    setShowForm(true);
    fetchHospitals(); // Cargar hospitales cuando se abra el formulario
    fetchSpecialties(); // Cargar especialidades cuando se abra el formulario
    fetchSpecialties(); // Cargar especialidades cuando se abra el formulario
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-3 text-neutral-600">Cargando doctores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          Gestión de Doctores
          </h2>
        <p className="text-neutral-600">
          Administra los doctores y especialistas de tu institución
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
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {editingDoctor ? 'Editar Doctor' : 'Nuevo Doctor'}
                  </h3>
                  <button
                    onClick={handleCloseForm}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field w-full"
                        placeholder="Ej: Juan"
                        required
                      />
                    </div>

                    {/* Apellido */}
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-2">
                        Apellido <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="input-field w-full"
                        placeholder="Ej: Pérez"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field w-full"
                        placeholder="Ej: juan.perez@email.com"
                        required
                      />
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                        Teléfono <span className="text-red-500">*</span>
                      </label>
                      <PhoneInput
                        international
                        defaultCountry="CO"
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Especialidad */}
                    <div>
                      <label htmlFor="especialidad" className="block text-sm font-medium text-neutral-700 mb-2">
                        Especialidad <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <select
                          id="especialidad"
                          value={formData.especialidad}
                          onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                          className="input-field flex-1"
                          required
                        >
                          <option value="">Seleccionar especialidad</option>
                          {specialties.map((specialty) => (
                            <option key={specialty._id} value={specialty._id}>
                              {specialty.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowSpecialtyForm(true)}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          title="Crear nueva especialidad"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Cédula */}
                    <div>
                      <label htmlFor="cedula" className="block text-sm font-medium text-neutral-700 mb-2">
                        Cédula Profesional <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="cedula"
                        value={formData.cedula}
                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                        className="input-field w-full"
                        placeholder="Ej: 12345"
                        required
                      />
                    </div>

                    {/* Hospital */}
                    <div>
                      <label htmlFor="hospital" className="block text-sm font-medium text-neutral-700 mb-2">
                        Hospital (Opcional)
                      </label>
                      <div className="flex space-x-2">
                        <select
                          id="hospital"
                          value={formData.hospital}
                          onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                          className="input-field flex-1"
                        >
                          <option value="">Seleccionar hospital</option>
                          {hospitals.map((hospital) => (
                            <option key={hospital._id} value={hospital._id}>
                              {hospital.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowHospitalForm(true)}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          title="Crear nuevo hospital"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  

                  {/* Firma Digital */}
                  <div>
                    <label htmlFor="firma" className="block text-sm font-medium text-neutral-700 mb-2">
                      Firma Digital
                    </label>
                    
                    {/* Vista previa de la firma */}
                    {formData.url_firma && (
                      <div className="mb-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-neutral-700">Vista previa:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, url_firma: '' });
                              setSelectedFile(null);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex justify-center">
                          <img
                            src={formData.url_firma}
                            alt="Firma digital"
                            className="max-w-xs max-h-32 object-contain border border-neutral-300 rounded"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        id="firma"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <label
                        htmlFor="firma"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {formData.url_firma ? 'Cambiar Firma' : 'Seleccionar Archivo'}
                      </label>
                      {selectedFile && (
                        <span className="text-sm text-neutral-600">
                          {selectedFile.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Formatos soportados: JPG, JPEG, PNG. Tamaño máximo: 5MB
                    </p>
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
                          {editingDoctor ? 'Actualizar' : 'Crear'}
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

      {/* Hospital Form Modal */}
      {showHospitalForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" onClick={handleCloseHospitalForm} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Nuevo Hospital
                  </h3>
                  <button
                    onClick={handleCloseHospitalForm}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateHospital} className="space-y-4">
                  <div>
                    <label htmlFor="hospitalName" className="block text-sm font-medium text-neutral-700 mb-2">
                      Nombre del Hospital
                    </label>
                    <input
                      type="text"
                      id="hospitalName"
                      value={hospitalFormData.name}
                      onChange={(e) => setHospitalFormData({ name: e.target.value })}
                      className="input-field w-full"
                      placeholder="Ej: Hospital General"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseHospitalForm}
                      className="btn-secondary"
                      disabled={submittingHospital}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingHospital}
                    >
                      {submittingHospital ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Hospital
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

      {/* Specialty Form Modal */}
      {showSpecialtyForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" onClick={handleCloseSpecialtyForm} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Nueva Especialidad
                  </h3>
                  <button
                    onClick={handleCloseSpecialtyForm}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateSpecialty} className="space-y-4">
                  <div>
                    <label htmlFor="specialtyName" className="block text-sm font-medium text-neutral-700 mb-2">
                      Nombre de la Especialidad
                    </label>
                    <input
                      type="text"
                      id="specialtyName"
                      value={specialtyFormData.name}
                      onChange={(e) => setSpecialtyFormData({ name: e.target.value })}
                      className="input-field w-full"
                      placeholder="Ej: Cardiología"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseSpecialtyForm}
                      className="btn-secondary"
                      disabled={submittingSpecialty}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingSpecialty}
                    >
                      {submittingSpecialty ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Especialidad
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

      {/* Doctors List */}
      <div className="bg-white shadow-sm rounded-lg border border-neutral-200">
        {doctors.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              No hay doctores registrados
            </h3>
            <p className="text-neutral-500 mb-4">
              Comienza creando el primer doctor de tu institución
            </p>
            <button
              onClick={handleNewDoctor}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Doctor
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Hospital
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {doctors.map((doctor) => (
                  <tr key={doctor._id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <User className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {doctor.name} {doctor.lastName}
                          </div>
                          <div className="text-sm text-neutral-500">
                            Cédula: {doctor.cedula}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {typeof doctor.especialidad === 'object' ? doctor.especialidad.name : doctor.especialidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">{doctor.email}</div>
                      <div className="text-sm text-neutral-500">
                        {doctor.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {typeof doctor.hospital === 'object' ? doctor.hospital.name : (hospitals.find(h => h._id === doctor.hospital)?.name || 'No asignado')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(doctor)}
                          className="text-primary-600 hover:text-primary-900 p-1 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doctor._id)}
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

export default DoctorManagement;
