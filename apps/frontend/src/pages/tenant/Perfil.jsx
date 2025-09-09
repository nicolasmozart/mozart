import React, { useState, useEffect } from 'react';
import DoctorSidebar from './sidebar';
import DoctorHeader from './header';
import { FaSave, FaUserMd } from 'react-icons/fa';
import axios from 'axios';
import Swal from 'sweetalert2';

const DoctorPerfil = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    especialidad: '',
    cedula: '',
    biografia: '',
    experiencia: '',
    educacion: ''
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: 'Por favor, inicie sesión nuevamente',
            confirmButtonText: 'Aceptar'
          });
          handleLogout();
          return;
        }
        
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/doctor/perfil`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setFormData({
          nombre: response.data.name || '',
          apellido: response.data.lastName || '',
          email: response.data.email || '',
          telefono: response.data.phone || '',
          especialidad: response.data.especialidad || '',
          cedula: response.data.cedula || '',
          biografia: response.data.biografia || '',
          experiencia: response.data.experiencia || '',
          educacion: response.data.educacion || ''
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar perfil:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el perfil. Por favor, intenta de nuevo más tarde.',
          confirmButtonText: 'Aceptar'
        });
        setLoading(false);
      }
    };
    
    fetchPerfil();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        Swal.fire({
          icon: 'error',
          title: 'Error de autenticación',
          text: 'Por favor, inicie sesión nuevamente',
          confirmButtonText: 'Aceptar'
        });
        handleLogout();
        return;
      }
      
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/doctor/perfil`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Swal.fire({
        icon: 'success',
        title: '¡Perfil actualizado!',
        text: 'Su perfil ha sido actualizado correctamente.',
        confirmButtonText: 'Aceptar'
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el perfil. Por favor, intenta de nuevo más tarde.',
        confirmButtonText: 'Aceptar'
      });
    }
  };

  return (
    <div className="flex h-screen">
      <DoctorSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col">
        <DoctorHeader toggleSidebar={toggleSidebar} onLogout={handleLogout} />
        <div className="p-6 bg-gray-100 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900">Mi Perfil Profesional</h1>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                  <FaUserMd className="mr-2" /> Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-blue-900 mb-4">Información Profesional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                    <input
                      type="text"
                      name="especialidad"
                      value={formData.especialidad}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula Profesional</label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                  <textarea
                    name="biografia"
                    value={formData.biografia}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  ></textarea>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experiencia</label>
                  <textarea
                    name="experiencia"
                    value={formData.experiencia}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Educación</label>
                  <textarea
                    name="educacion"
                    value={formData.educacion}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-2 border rounded focus:ring focus:ring-blue-300"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <FaSave className="mr-2" /> Guardar Cambios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorPerfil;