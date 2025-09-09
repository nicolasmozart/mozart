import React, { useEffect, useState } from 'react';
import { alertaGeneral } from '../../../utils/alertas';
import axios from 'axios';
import Swal from 'sweetalert2';
import AsyncSelect from 'react-select/async';

const Interconsulta = ({ citaData, doctorData }) => {
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [interconsulta, setInterconsulta] = useState({
    servicio: '',
    especialidad: '',
    motivoConsulta: '',
  });
  const [especialidadesAgregadas, setEspecialidadesAgregadas] = useState([]);
  const [interconsultasPrevias, setInterconsultasPrevias] = useState([]);
  const [mostrarInterconsultasPrevias, setMostrarInterconsultasPrevias] = useState(false);
  const [esPsiquiatria, setEsPsiquiatria] = useState(false);
  const [especialidadCita, setEspecialidadCita] = useState('');

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
        setInterconsulta(prevState => ({
          ...prevState,
          servicio: doctorData?.especialidad || 'Medicina General'
        }));

        // Obtener interconsultas previas del paciente
        if (historiaClinica.pacienteId && historiaClinica.pacienteId._id) {
          await fetchInterconsultasPrevias(historiaClinica.pacienteId._id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener la información de la historia clínica:', error);
      setLoading(false);
    }
  };

  // Función para obtener interconsultas previas
  const fetchInterconsultasPrevias = async (pacienteId) => {
    try {
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${baseUrl}/api/interconsultas/paciente/${pacienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setInterconsultasPrevias(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener interconsultas previas:', error);
    }
  };

  // Función para importar interconsulta previa
  const importarInterconsultaPrevia = (interconsultaPrevia) => {
    const especialidadesImportadas = interconsultaPrevia.especialidades.map(esp => ({
      especialidad: esp.especialidad,
      motivoConsulta: esp.motivoConsulta
    }));

    setEspecialidadesAgregadas(especialidadesImportadas);
    setMostrarInterconsultasPrevias(false);
  };

  // Función para ver PDF de interconsulta previa
  const verPDFInterconsulta = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'No hay PDF disponible para esta interconsulta.',
        isError: true,
      });
    }
  };

  useEffect(() => {
    if (citaData && citaData._id) {
      fetchAppointmentInfo();
    }
  }, [citaData]);

  // Detectar si el doctor es psiquiatra
  useEffect(() => {
    if (doctorData && (doctorData.especialidad === 'Psiquiatria' || doctorData.especialidad === 'Psiquiatría')) {
      setEsPsiquiatria(true);
    } else {
      setEsPsiquiatria(false);
      setEspecialidadCita('');
    }
  }, [doctorData]);

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
      setInterconsulta(prevState => ({
        ...prevState,
        especialidad: selectedOption.label
      }));
    }
  };

  const handleMotivoConsultaChange = (e) => {
    setInterconsulta({
      ...interconsulta,
      motivoConsulta: e.target.value,
    });
  };

  const agregarEspecialidad = () => {
    // Validaciones
    if (esPsiquiatria && !especialidadCita) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debe seleccionar una especialidad.'
      });
      return;
    }
    if (!interconsulta.especialidad) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El campo Servicio al que se remite, es obligatorio.'
      });
      return;
    }
    if (!interconsulta.motivoConsulta) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El campo Motivo, es obligatorio.'
      });
      return;
    }
    // Verificar si ya existe esta especialidad
    const especialidadExistente = especialidadesAgregadas.find(
      esp => esp.especialidad === interconsulta.especialidad && (!esPsiquiatria || esp.especialidadCita === especialidadCita)
    );
    if (especialidadExistente) {
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'Esta especialidad ya ha sido agregada.'
      });
      return;
    }
    // Agregar la especialidad a la lista
    setEspecialidadesAgregadas([
      ...especialidadesAgregadas,
      {
        especialidad: interconsulta.especialidad,
        motivoConsulta: interconsulta.motivoConsulta,
        ...(esPsiquiatria && { especialidadCita })
      }
    ]);
    // Limpiar los campos de especialidad y motivo
    setInterconsulta({
      ...interconsulta,
      especialidad: '',
      motivoConsulta: ''
    });
    if (esPsiquiatria) setEspecialidadCita('');
  };

  const eliminarEspecialidad = (index) => {
    const nuevasEspecialidades = [...especialidadesAgregadas];
    nuevasEspecialidades.splice(index, 1);
    setEspecialidadesAgregadas(nuevasEspecialidades);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validar que haya al menos una especialidad agregada
    if (especialidadesAgregadas.length === 0) {
      // Si no hay especialidades agregadas, intentar agregar la actual
      if (interconsulta.especialidad && interconsulta.motivoConsulta && (!esPsiquiatria || especialidadCita)) {
        agregarEspecialidad();
        // Verificar nuevamente después de intentar agregar
        if (especialidadesAgregadas.length === 0) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Debe agregar al menos una especialidad.'
          });
          return;
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Debe agregar al menos una especialidad.'
        });
        return;
      }
    }
    try {
      // Mostrar confirmación antes de enviar
      const confirmResult = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Por favor revisa todos los campos antes de continuar. ¿Deseas guardar esta interconsulta?',
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
        title: 'Guardando interconsulta',
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
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pueden obtener los datos necesarios de la historia clínica.'
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
        servicio: interconsulta.servicio,
        especialidades: especialidadesAgregadas
      };
      
      console.log('Enviando datos de interconsulta:', datosAEnviar);
      
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const response = await axios.post(
        `${baseUrl}/api/interconsultas/verificar-y-crear`,
        datosAEnviar,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      Swal.close();
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Interconsulta guardada!',
          text: 'La orden de interconsulta ha sido guardada exitosamente.',
          confirmButtonText: 'Ver PDF',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && response.data.pdfUrl) {
            window.open(response.data.pdfUrl, '_blank');
          }
        });
        
        // Limpiar el formulario
        setInterconsulta({
          servicio: interconsulta.servicio,
          especialidad: '',
          motivoConsulta: ''
        });
        setEspecialidadesAgregadas([]);
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      setLoading(false);
      Swal.close();
      
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'Hubo un problema al guardar la interconsulta.',
        isError: true,
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Orden de Interconsulta</h2>
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 pb-8">
          {/* Sección de interconsultas previas */}
          {interconsultasPrevias.length > 0 && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-700">Interconsultas Previas</h3>
                <button
                  type="button"
                  onClick={() => setMostrarInterconsultasPrevias(!mostrarInterconsultasPrevias)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-300"
                >
                  {mostrarInterconsultasPrevias ? 'Ocultar Interconsultas Previas' : 'Ver Interconsultas Previas'}
                </button>
              </div>

              {mostrarInterconsultasPrevias && (
                <div className="space-y-4">
                  {interconsultasPrevias.map((interconsulta, index) => (
                    <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p><strong>Fecha:</strong> {new Date(interconsulta.createdAt).toLocaleDateString()}</p>
                          <p><strong>Doctor:</strong> {interconsulta.doctorId?.name} {interconsulta.doctorId?.lastName}</p>
                          <p><strong>Servicio:</strong> {interconsulta.servicio}</p>
                          <div className="mt-2">
                            <p className="font-semibold">Especialidades:</p>
                            <ul className="list-disc list-inside">
                              {interconsulta.especialidades.map((esp, idx) => (
                                <li key={idx}>
                                  <span className="font-medium">{esp.especialidad}</span>
                                  <p className="text-sm text-gray-600 ml-4">{esp.motivoConsulta}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => importarInterconsultaPrevia(interconsulta)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Importar
                          </button>
                          <button
                            type="button"
                            onClick={() => verPDFInterconsulta(interconsulta.pdfUrl)}
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

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Servicio que solicita:
            </label>
            <input
              type="text"
              value={interconsulta.servicio}
              readOnly
              onChange={(e) => setInterconsulta({...interconsulta, servicio: e.target.value})}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Servicio al que se remite:
            </label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadCupsOptions}
              defaultOptions={[]}
              onChange={handleCupsChange}
              placeholder="Buscar especialidad o servicio..."
              noOptionsMessage={() => "Ingrese al menos 3 caracteres para buscar"}
              loadingMessage={() => "Buscando..."}
              value={interconsulta.especialidad ? { label: interconsulta.especialidad, value: interconsulta.especialidad } : null}
              className="basic-single"
              classNamePrefix="select"
            />
          </div>

          {/* Select de especialidad solo para psiquiatría */}
          {esPsiquiatria && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Especialidad:
              </label>
              <select
                value={especialidadCita}
                onChange={e => setEspecialidadCita(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione una especialidad</option>
                <option value="Medicina General">Medicina General</option>
                <option value="Medicina Interna">Medicina Interna</option>
                <option value="Medicina Familiar">Medicina Familiar</option>
                <option value="Pediatria">Pediatría</option>
                <option value="Ginecologia">Ginecología</option>
                <option value="Psiquiatria">Psiquiatría</option>
                {/* Opciones nuevas */}
                <option value="Jefe de enfermería">Jefe de enfermería</option>
                <option value="Terapia ocupacional">Terapia ocupacional</option>
                <option value="Trabajo social">Trabajo social</option>
                <option value="Psicologia clinica">Psicología clínica</option>
                <option value="Nutricionista">Nutricionista</option>
                <option value="Psicologia familiar">Psicología familiar</option>
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Motivo:
            </label>
            <textarea
              value={interconsulta.motivoConsulta}
              onChange={handleMotivoConsultaChange}
             
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows="4"
              placeholder="Describa el motivo de la interconsulta"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <button
              type="button"
              onClick={agregarEspecialidad}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            >
              Agregar Especialidad
            </button>
          </div>
          
          {/* Lista de especialidades agregadas */}
          {especialidadesAgregadas.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Especialidades agregadas:</h3>
              <ul className="bg-gray-100 p-3 rounded">
                {especialidadesAgregadas.map((esp, index) => (
                  <li key={index} className="mb-2 p-2 border-b border-gray-300 flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{esp.especialidad}</span>
                      <p className="text-sm text-gray-600">{esp.motivoConsulta}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarEspecialidad(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              Guardar Interconsulta
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Interconsulta;
