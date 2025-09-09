import React, { useEffect, useState } from 'react';
import { alertaGeneral } from '../../../utils/alertas';
import axios from 'axios';
import Swal from 'sweetalert2';
import AsyncSelect from 'react-select/async';

const ApoyoTerapeutico = ({ citaData, doctorData }) => {
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [apoyoTerapeutico, setApoyoTerapeutico] = useState({
    servicio: '',
    especialidad: '',
    motivoConsulta: '',
  });
  const [apoyosPrevios, setApoyosPrevios] = useState([]);
  const [mostrarApoyosPrevios, setMostrarApoyosPrevios] = useState(false);

  // Obtener información de la historia clínica
  const fetchAppointmentInfo = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      if (!baseUrl) {
        console.error('URL del backend no disponible');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${baseUrl}/api/historias-clinicas/cita/${citaData._id}`);
      
      setAppointmentInfo(response.data);
      
      console.log('Información de historia clínica obtenida:', response.data);
      
      if (response.data && response.data.historiaClinica) {
        const { historiaClinica } = response.data;
        
        if (historiaClinica.diagnosticos && historiaClinica.diagnosticos.length > 0) {
          setDiagnosticos(historiaClinica.diagnosticos);
        }

        // Establecer el servicio que solicita (especialidad del doctor)
        setApoyoTerapeutico(prevState => ({
          ...prevState,
          servicio: doctorData?.especialidad || 'Medicina General'
        }));

        // Obtener apoyos terapéuticos previos del paciente
        if (historiaClinica.pacienteId && historiaClinica.pacienteId._id) {
          await fetchApoyosPrevios(historiaClinica.pacienteId._id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener la información de la historia clínica:', error);
      setLoading(false);
    }
  };

  // Función para obtener apoyos terapéuticos previos
  const fetchApoyosPrevios = async (pacienteId) => {
    try {
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${baseUrl}/api/apoyo-terapeutico/paciente/${pacienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setApoyosPrevios(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener apoyos terapéuticos previos:', error);
    }
  };

  // Función para importar apoyo terapéutico previo
  const importarApoyoPrevio = (apoyoPrevio) => {
    setApoyoTerapeutico({
      servicio: apoyoPrevio.servicio,
      especialidad: apoyoPrevio.especialidad,
      motivoConsulta: apoyoPrevio.motivoConsulta
    });
    setMostrarApoyosPrevios(false);
  };

  // Función para ver PDF de apoyo terapéutico previo
  const verPDFApoyo = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'No hay PDF disponible para este apoyo terapéutico.',
        isError: true,
      });
    }
  };

  useEffect(() => {
    if (citaData && citaData._id) {
      fetchAppointmentInfo();
    }
  }, [citaData]);

  // Función para cargar opciones de CUPS
  const loadCupsOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 3) return [];
    
    try {
      console.log("Buscando CUPS con query:", inputValue);
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      
      const response = await axios.get(`${baseUrl}/api/admin/cups/search`, {
        params: { query: inputValue }
      });

      console.log("Respuesta de búsqueda CUPS:", response.data);
      
      if (response.data.success && response.data.data.length > 0) {
        return response.data.data.map(cup => ({
          value: cup.Codigo,
          label: `${cup.Codigo} - ${cup.Nombre}`,
          descripcion: cup.Descripcion
        }));
      }
      return [];
    } catch (error) {
      console.error('Error al buscar CUPS:', error);
      return [];
    }
  };

  const handleCupsChange = (selectedOption) => {
    if (selectedOption) {
      setApoyoTerapeutico(prevState => ({
        ...prevState,
        especialidad: selectedOption.label
      }));
    }
  };

  const handleMotivoConsultaChange = (e) => {
    setApoyoTerapeutico({
      ...apoyoTerapeutico,
      motivoConsulta: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!apoyoTerapeutico.especialidad) {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'El campo Servicio al que se remite, es obligatorio.',
        isWarning: true
      });
      return;
    }
    
    if (!apoyoTerapeutico.motivoConsulta) {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'El campo Motivo, es obligatorio.',
        isWarning: true
      });
      return;
    }
    
    try {
      // Mostrar confirmación antes de enviar
      const confirmResult = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Por favor revisa todos los campos antes de continuar. ¿Deseas guardar esta orden de apoyo terapéutico?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'No, revisar de nuevo'
      });

      // Si el usuario cancela, no continuar
      if (!confirmResult.isConfirmed) {
        return;
      }

      // Mostrar indicador de carga
      Swal.fire({
        title: 'Guardando apoyo terapéutico',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Verificar que los IDs necesarios estén presentes
      if (!appointmentInfo || !appointmentInfo.historiaClinica) {
        alertaGeneral({
          titulo: 'Error',
          messageHtml: 'No se pueden obtener los datos necesarios de la historia clínica.',
          isError: true,
        });
        setLoading(false);
        Swal.close();
        return;
      }
      
      // Preparar los datos para enviar
      const datosAEnviar = {
        citaId: appointmentInfo.historiaClinica.citaId || citaData._id,
        pacienteId: appointmentInfo.historiaClinica.pacienteId._id,
        doctorId: appointmentInfo.historiaClinica.doctorId._id,
        servicio: apoyoTerapeutico.servicio,
        especialidad: apoyoTerapeutico.especialidad,
        motivoConsulta: apoyoTerapeutico.motivoConsulta
      };
      
      console.log('Enviando datos de apoyo terapeutico:', datosAEnviar);
      
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const response = await axios.post(
        `${baseUrl}/api/apoyo-terapeutico/verificar-y-crear`,
        datosAEnviar,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      Swal.close();
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Apoyo terapéutico guardado!',
          text: 'La orden de apoyo terapéutico ha sido guardada exitosamente.',
          confirmButtonText: 'Ver PDF',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && response.data.pdfUrl) {
            window.open(response.data.pdfUrl, '_blank');
          }
        });
        
        // Limpiar el formulario
        setApoyoTerapeutico({
          servicio: doctorData?.especialidad || 'Medicina General',
          especialidad: '',
          motivoConsulta: '',
        });
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      setLoading(false);
      Swal.close();
      
      // Si el error es porque ya existe un apoyo terapéutico
      if (error.response && error.response.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Apoyo terapéutico existente',
          text: 'Ya existe un apoyo terapéutico para esta cita.',
          confirmButtonText: 'Ver apoyo existente',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && error.response.data.data.pdfUrl) {
            window.open(error.response.data.data.pdfUrl, '_blank');
          }
        });
      } else {
        // Otro tipo de error
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `No se pudo guardar el apoyo terapéutico: ${error.response?.data?.message || error.message || 'Error desconocido'}`
        });
      }
    }
  };

  return (
    <div className="component-container bg-white p-6 rounded-lg shadow">
      <div className="component-header mb-6">
        <h1 className="text-2xl font-bold text-blue-700 pb-2 border-b-2 border-blue-200">Orden de Apoyo Terapeutico</h1>
      </div>
      <hr className="my-4" />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección de apoyos terapéuticos previos */}
          {apoyosPrevios.length > 0 && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-700">Apoyos Terapéuticos Previos</h3>
                <button
                  type="button"
                  onClick={() => setMostrarApoyosPrevios(!mostrarApoyosPrevios)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-300"
                >
                  {mostrarApoyosPrevios ? 'Ocultar Apoyos Previos' : 'Ver Apoyos Previos'}
                </button>
              </div>

              {mostrarApoyosPrevios && (
                <div className="space-y-4">
                  {apoyosPrevios.map((apoyo, index) => (
                    <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p><strong>Fecha:</strong> {new Date(apoyo.createdAt).toLocaleDateString()}</p>
                          <p><strong>Doctor:</strong> {apoyo.doctorId?.name} {apoyo.doctorId?.lastName}</p>
                          <p><strong>Servicio:</strong> {apoyo.servicio}</p>
                          <p><strong>Especialidad:</strong> {apoyo.especialidad}</p>
                          <div className="mt-2">
                            <p className="font-semibold">Motivo:</p>
                            <p className="text-sm text-gray-600">{apoyo.motivoConsulta}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => importarApoyoPrevio(apoyo)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Importar
                          </button>
                          <button
                            type="button"
                            onClick={() => verPDFApoyo(apoyo.pdfUrl)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Ver PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Información del apoyo terapeutico</h3>

            <div className="mb-6">
              <label className="form-label block text-gray-700 font-medium mb-2">
                Servicio que solicita el apoyo terapeutico:
              </label>
              <input
                type="text"
                value={apoyoTerapeutico.servicio}
                readOnly
                className="form-input w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
            </div>

            <div className="mb-6">
              <label className="form-label block text-gray-700 font-medium mb-2">
                Servicio al que se remite:
              </label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadCupsOptions}
                onChange={handleCupsChange}
                value={apoyoTerapeutico.especialidad ? { label: apoyoTerapeutico.especialidad, value: apoyoTerapeutico.especialidad } : null}
                placeholder="Buscar especialidad o servicio"
                noOptionsMessage={() => "Escriba al menos 3 caracteres para buscar"}
                loadingMessage={() => "Cargando opciones..."}
                className="basic-single"
                classNamePrefix="select"
              />
            </div>

            <div className="mb-6">
              <label className="form-label block text-gray-700 font-medium mb-2">
                Motivo del apoyo terapeutico:
              </label>
              <textarea
                value={apoyoTerapeutico.motivoConsulta}
                onChange={handleMotivoConsultaChange}
                rows="6"
                required
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describa el motivo de la apoyo terapeutico"
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1`}
          >
            {loading ? 'Procesando...' : 'Generar Orden de Apoyo Terapeutico'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ApoyoTerapeutico;
