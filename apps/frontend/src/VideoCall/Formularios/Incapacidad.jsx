import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import moment from 'moment';
import axios from 'axios';
import Swal from 'sweetalert2';
import { State, City } from 'country-state-city';

const Incapacidad = ({ citaData, doctorData }) => {
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [cities, setCities] = useState([]);
  const today = new Date().toISOString().split("T")[0];
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [incapacidadesPrevias, setIncapacidadesPrevias] = useState([]);
  const [mostrarIncapacidadesPrevias, setMostrarIncapacidadesPrevias] = useState(false);
  const [loadingIncapacidades, setLoadingIncapacidades] = useState(false);

  const [formData, setFormData] = useState({
    lugarExpedicion: '',
    fechaExpedicion: today,
    esProrroga: false,
    modalidadPrestacionServicio: '',
    fechaInicial: '',
    dias: '',
    fechaFinal: '',
    causaAtencion: '',
    diagnosticoPrincipal: '',
    citaId: '',
    pacienteId: '',
    doctorId: ''
  });

  // Función para cargar incapacidades previas
  const cargarIncapacidadesPrevias = async (pacienteId) => {
    if (!pacienteId) return;
    
    try {
      setLoadingIncapacidades(true);
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${baseUrl}/api/incapacidades/paciente/${pacienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setIncapacidadesPrevias(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar incapacidades previas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las incapacidades previas'
      });
    } finally {
      setLoadingIncapacidades(false);
    }
  };

  // Función para ver PDF de incapacidad
  const verPDFIncapacidad = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'PDF no disponible',
        text: 'No hay un PDF disponible para esta incapacidad'
      });
    }
  };

  // Función para importar datos de una incapacidad previa
  const importarIncapacidad = (incapacidad) => {
    setFormData(prevState => ({
      ...prevState,
      lugarExpedicion: incapacidad.lugarExpedicion || '',
      esProrroga: incapacidad.esProrroga || false,
      modalidadPrestacionServicio: incapacidad.modalidadPrestacionServicio || '',
      diagnosticoPrincipal: incapacidad.diagnosticoPrincipal || '',
      causaAtencion: incapacidad.causaAtencion || ''
    }));
    
    Swal.fire({
      icon: 'success',
      title: 'Datos importados',
      text: 'Los datos de la incapacidad han sido importados correctamente',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Obtener información de la historia clínica
  const fetchAppointmentInfo = async () => {
    try {
      setIsLoading(true);
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      if (!baseUrl) {
        console.error('URL del backend no disponible');
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${baseUrl}/api/historias-clinicas/cita/${citaData._id}`);

      setAppointmentInfo(response.data);

      if (response.data && response.data.historiaClinica) {
        const { historiaClinica } = response.data;

        if (historiaClinica.diagnosticos && historiaClinica.diagnosticos.length > 0) {
          setDiagnosticos(historiaClinica.diagnosticos);
        }

        setFormData(prevState => ({
          ...prevState,
          citaId: historiaClinica.citaId || citaData._id,
          pacienteId: historiaClinica.pacienteId?._id,
          doctorId: historiaClinica.doctorId?._id,
          modalidadPrestacionServicio: historiaClinica.profesional?.especialidad || doctorData?.especialidad || '',
        }));

        // Cargar incapacidades previas si tenemos el ID del paciente
        if (historiaClinica.pacienteId?._id) {
          cargarIncapacidadesPrevias(historiaClinica.pacienteId._id);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error al obtener la información de la cita:', error);
      setIsLoading(false);
    }
  };

  // Reemplazar la función fetchCities con esta:
  const loadColombiaCities = () => {
    // Obtener los estados de Colombia (código ISO: CO)
    const colombiaStates = State.getStatesOfCountry('CO');

    // Obtener todas las ciudades de todos los estados de Colombia
    let allCities = [];
    colombiaStates.forEach(state => {
      const stateCities = City.getCitiesOfState('CO', state.isoCode);
      allCities = [...allCities, ...stateCities];
    });

    // Formatear las ciudades para react-select
    const formattedCities = allCities.map(city => ({
      label: city.name,
      value: city.name
    }));

    // Ordenar alfabéticamente
    formattedCities.sort((a, b) => a.label.localeCompare(b.label));

    setCities(formattedCities);
  };

  // Reemplazar useEffect que llama a fetchCities
  useEffect(() => {
    if (citaData && citaData._id) {
      fetchAppointmentInfo();
    }
    loadColombiaCities(); // Cargar ciudades de Colombia
  }, [citaData]);

  useEffect(() => {
    if (formData.fechaInicial && formData.dias) {
      const fechaFinalCalculada = moment(formData.fechaInicial)
        .add(parseInt(formData.dias), "days")
        .format("YYYY-MM-DD");
      setFormData((prevData) => ({
        ...prevData,
        fechaFinal: fechaFinalCalculada,
      }));
    }
  }, [formData.fechaInicial, formData.dias]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Mostrar confirmación antes de enviar
      const confirmResult = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Por favor revisa todos los campos antes de continuar. ¿Deseas guardar esta incapacidad?',
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
        title: 'Guardando incapacidad',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = localStorage.getItem('token');

      // Verificar que todos los campos requeridos estén completos
      if (!formData.lugarExpedicion || !formData.fechaInicial || !formData.dias || !formData.diagnosticoPrincipal || !formData.causaAtencion) {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Campos incompletos',
          text: 'Por favor complete todos los campos requeridos'
        });
        return;
      }

      // Verificar que los IDs necesarios estén presentes
      if (!formData.citaId || !formData.pacienteId || !formData.doctorId) {
        console.error('IDs faltantes:', {
          citaId: formData.citaId,
          pacienteId: formData.pacienteId,
          doctorId: formData.doctorId
        });
        
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Datos incompletos',
          text: 'No se pueden obtener todos los datos necesarios para guardar la incapacidad'
        });
        return;
      }

      // Preparar los datos para enviar
      const datosAEnviar = {
        citaId: formData.citaId,
        pacienteId: formData.pacienteId,
        doctorId: formData.doctorId,
        incapacidad: {
          lugarExpedicion: formData.lugarExpedicion,
          fechaExpedicion: formData.fechaExpedicion,
          esProrroga: formData.esProrroga,
          modalidadPrestacionServicio: formData.modalidadPrestacionServicio,
          fechaInicial: formData.fechaInicial,
          dias: formData.dias,
          fechaFinal: formData.fechaFinal,
          causaAtencion: formData.causaAtencion,
          diagnosticoPrincipal: formData.diagnosticoPrincipal
        }
      };

      console.log('Enviando datos de incapacidad:', datosAEnviar);

      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const response = await axios.post(
        `${baseUrl}/api/incapacidades/verificar-y-crear`,
        datosAEnviar,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Cerrar el indicador de carga
      Swal.close();

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Incapacidad guardada',
          text: 'La incapacidad ha sido guardada exitosamente',
          confirmButtonText: 'Ver PDF',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && response.data.pdfUrl) {
            window.open(response.data.pdfUrl, '_blank');
          }
        });
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      
      // Cerrar el indicador de carga
      Swal.close();
      
      // Si el error es porque ya existe una incapacidad
      if (error.response && error.response.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Incapacidad existente',
          text: 'Ya existe una incapacidad para esta cita.',
          confirmButtonText: 'Ver incapacidad existente',
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
          text: `No se pudo guardar la incapacidad: ${error.response?.data?.message || error.message || 'Error desconocido'}`
        });
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="component-container bg-white p-6 rounded-lg shadow">
      <div className="component-header mb-6">
        <h1 className="text-2xl font-bold text-blue-700 pb-2 border-b-2 border-blue-200">Datos Incapacidad</h1>
      </div>
      <hr className="my-4" />

      {/* Botón para mostrar/ocultar incapacidades previas */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setMostrarIncapacidadesPrevias(!mostrarIncapacidadesPrevias)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200"
        >
          {mostrarIncapacidadesPrevias ? 'Ocultar Incapacidades Previas' : 'Ver Incapacidades Previas'}
        </button>
      </div>

      {/* Sección de incapacidades previas */}
      {mostrarIncapacidadesPrevias && (
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-xl font-bold text-blue-600 mb-4">Incapacidades Previas</h3>
          
          {loadingIncapacidades ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : incapacidadesPrevias.length > 0 ? (
            <div className="space-y-4">
              {incapacidadesPrevias.map((incapacidad, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Fecha: {new Date(incapacidad.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Doctor: {incapacidad.doctorId?.name} {incapacidad.doctorId?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Días: {incapacidad.dias}
                      </p>
                      <p className="text-sm text-gray-600">
                        Diagnóstico: {incapacidad.diagnosticoPrincipal}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => verPDFIncapacidad(incapacidad.pdfUrl)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Ver PDF
                      </button>
                      <button
                        onClick={() => importarIncapacidad(incapacidad)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Importar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No hay incapacidades previas</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-xl font-bold text-blue-600 mb-4">Información de la incapacidad</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Lugar de Expedición:
              </label>
              <Select
                options={cities}
                placeholder="Seleccione la ciudad de expedición"
                isSearchable
                required
                className="react-select-container"
                classNamePrefix="react-select"
                onChange={(selectedOption) => {
                  setFormData({
                    ...formData,
                    lugarExpedicion: selectedOption.value,
                  });
                }}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#D1D5DB',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#9CA3AF',
                    },
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? '#2563EB'
                      : state.isFocused
                        ? '#DBEAFE'
                        : undefined,
                    color: state.isSelected ? 'white' : '#1F2937',
                  })
                }}
              />
            </div>

            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Fecha de Expedición:
              </label>
              <input
                type="date"
                readOnly
                name="fechaExpedicion"
                value={formData.fechaExpedicion}
                onChange={handleChange}
                className="form-input w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <span className="text-gray-700 font-medium">¿Es Prórroga?</span>
                <input
                  type="checkbox"
                  name="esProrroga"
                  checked={formData.esProrroga}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>

            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Especialidad Médica:
              </label>
              <input
                type="text"
                name="modalidadPrestacionServicio"
                value={formData.modalidadPrestacionServicio}
                readOnly
                className="form-input w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
            </div>

            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Fecha Inicial:
              </label>
              <input
                type="date"
                name="fechaInicial"
                required
                value={formData.fechaInicial}
                onChange={handleChange}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Días:
              </label>
              <input
                type="number"
                name="dias"
                required
                value={formData.dias}
                onChange={handleChange}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Número de días"
              />
            </div>

            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Fecha Final:
              </label>
              <input
                type="date"
                name="fechaFinal"
                value={formData.fechaFinal}
                onChange={handleChange}
                readOnly
                className="form-input w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
            </div>

            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Diagnóstico Principal:
              </label>
              <select
                name="diagnosticoPrincipal"
                value={formData.diagnosticoPrincipal}
                onChange={handleChange}
                required
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>
                  Selecciona un diagnóstico
                </option>
                {diagnosticos.map((diagnostico) => (
                  <option key={diagnostico._id} value={`${diagnostico.codigo} - ${diagnostico.nombre}`}>
                    {diagnostico.codigo} - {diagnostico.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="form-label block text-gray-700 font-medium mb-2">
                Observación de la Incapacidad:
              </label>
              <textarea
                name="causaAtencion"
                value={formData.causaAtencion}
                onChange={handleChange}
                required
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción de la incapacidad"
                rows="4"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full button-send bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
        >
          Generar Incapacidad
        </button>
      </form>
    </div>
  );
};

export default Incapacidad;
