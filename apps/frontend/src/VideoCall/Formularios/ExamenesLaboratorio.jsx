import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { alertaGeneral } from '../../../utils/alertas';
import axios from 'axios';
import Swal from 'sweetalert2';

const ExamenesLaboratorio = ({ citaData, doctorData }) => {
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [examenesPrevios, setExamenesPrevios] = useState([]);
  const [mostrarExamenesPrevios, setMostrarExamenesPrevios] = useState(false);

  // Obtener información de la historia clínica
  const fetchAppointmentInfo = async () => {
    try {
      setLoading(true);
      // Verificar qué variable de entorno está disponible
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      if (!baseUrl) {
        console.error('URL del backend no disponible');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${baseUrl}/api/historias-clinicas/cita/${citaData._id}`);
      
      // Guardar la respuesta completa
      setAppointmentInfo(response.data);
      
      console.log('Información de historia clínica obtenida:', response.data);
      
      // Extraer los IDs necesarios de la respuesta
      if (response.data && response.data.historiaClinica) {
        // Extraer diagnósticos de la historia clínica
        const { historiaClinica } = response.data;
        
        if (historiaClinica.diagnosticos && historiaClinica.diagnosticos.length > 0) {
          setDiagnosticos(historiaClinica.diagnosticos);
        }

        // Obtener exámenes previos del paciente
        if (historiaClinica.pacienteId && historiaClinica.pacienteId._id) {
          await fetchExamenesPrevios(historiaClinica.pacienteId._id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener la información de la historia clínica:', error);
      setLoading(false);
    }
  };

  // Función para obtener exámenes previos
  const fetchExamenesPrevios = async (pacienteId) => {
    try {
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${baseUrl}/api/examenes-laboratorio/paciente/${pacienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setExamenesPrevios(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener exámenes previos:', error);
    }
  };

  // Función para importar exámenes previos
  const importarExamenesPrevios = (examenesSeleccionados) => {
    const examenesImportados = examenesSeleccionados.map(examen => ({
      codigo: examen.codigo,
      descripcion: examen.descripcion,
      cantidad: examen.cantidad,
      observacion: examen.observacion,
      // Agregar el valor para el AsyncSelect
      cupsOption: {
        value: examen.codigo,
        label: `${examen.codigo} - ${examen.descripcion}`
      }
    }));

    setExamenes(prevExamenes => [...prevExamenes, ...examenesImportados]);
    setMostrarExamenesPrevios(false);
  };

  // Función para ver PDF de examen previo
  const verPDFExamen = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'No hay PDF disponible para este examen.',
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
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const validateExamenes = () => {
    for (const examen of examenes) {
      if (!examen.codigo || !examen.cantidad) {
        return false;
      }
    }
    return true;
  };

  const handleExamenChange = (index, field, value) => {
    setExamenes(prevExamenes => {
      const newExamenes = [...prevExamenes];
      if (index >= 0 && index < newExamenes.length) {
        newExamenes[index] = { ...newExamenes[index], [field]: value };
      } else {
        console.error('Índice inválido:', index);
      }
      return newExamenes;
    });
  };

  const handleCupsChange = (selectedOption, index) => {
    if (selectedOption) {
      handleExamenChange(index, 'codigo', selectedOption.value);
      handleExamenChange(index, 'descripcion', selectedOption.label.split(' - ')[1] || selectedOption.label);
      handleExamenChange(index, 'cupsOption', selectedOption);
    }
  };

  const addExamen = () => {
    setExamenes([...examenes, { codigo: '', descripcion: '', cantidad: '', observacion: '' }]);
  };

  const removeExamen = (index) => {
    const updatedExamenes = examenes.filter((_, i) => i !== index);
    setExamenes(updatedExamenes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (diagnosticos.length === 0) {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'Debe tener al menos un diagnóstico.',
        isWarning: true,
      });
      return;
    }

    if (examenes.length === 0) {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'Debe tener al menos un examen.',
        isError: true,
      });
      return;
    }

    if (!validateExamenes()) {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'Debe completar todos los campos de los exámenes.',
        isError: true,
      });
      return;
    }

    try {
      // Mostrar confirmación antes de enviar
      const confirmResult = await Swal.fire({
        title: '¿Estás seguro?',
        html: `
          <div class="text-left">
            <p class="mb-4">Por favor revisa todos los exámenes antes de continuar:</p>
            <div class="max-h-60 overflow-y-auto">
              ${examenes.map(examen => `
                <div class="mb-2 p-2 bg-gray-50 rounded">
                  <p class="font-semibold">${examen.descripcion}</p>
                  <p>Cantidad: ${examen.cantidad}</p>
                  ${examen.observacion ? `<p class="text-sm text-gray-600">Obs: ${examen.observacion}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'No, revisar de nuevo',
        width: '600px'
      });

      // Si el usuario cancela, no continuar
      if (!confirmResult.isConfirmed) {
        return;
      }

      // Mostrar indicador de carga
      Swal.fire({
        title: 'Guardando orden de laboratorio',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = localStorage.getItem('token');
      
      // Preparar los datos para enviar
      const datosAEnviar = {
        citaId: appointmentInfo.historiaClinica.citaId,
        pacienteId: appointmentInfo.historiaClinica.pacienteId._id,
        doctorId: appointmentInfo.historiaClinica.doctorId._id,
        diagnosticos: diagnosticos,
        examenes: examenes
      };
      
      console.log('Enviando datos:', datosAEnviar);
      
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const response = await axios.post(
        `${baseUrl}/api/examenes-laboratorio/verificar-y-crear`,
        datosAEnviar,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Cerrar el indicador de carga
      Swal.close();
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Exámenes guardados!',
          text: 'Los exámenes de laboratorio han sido guardados exitosamente.',
          confirmButtonText: 'Ver PDF',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && response.data.pdfUrl) {
            window.open(response.data.pdfUrl, '_blank');
          }
        });
        
        // Limpiar el formulario
        setExamenes([]);
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      
      // Cerrar el indicador de carga
      Swal.close();
      
      // Si el error es porque ya existe un examen de laboratorio
      if (error.response && error.response.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Orden de laboratorio existente',
          text: 'Ya existe una orden de laboratorio para esta cita.',
          confirmButtonText: 'Ver orden existente',
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
          text: `No se pudo guardar la orden de laboratorio: ${error.response?.data?.message || error.message || 'Error desconocido'}`
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-800">Exámenes de Laboratorio</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-700">Diagnósticos</h3>
          
          {diagnosticos.length > 0 ? (
            <div className="space-y-2">
              {diagnosticos.map((diag, index) => (
                <div key={index} className="p-3 bg-white rounded border border-gray-200">
                  <p><strong>Código:</strong> {diag.codigo}</p>
                  <p><strong>Diagnóstico:</strong> {diag.nombre}</p>
                  <p><strong>Tipo:</strong> {diag.tipo}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-yellow-600">No hay diagnósticos registrados en la historia clínica.</p>
          )}
        </div>

        {/* Sección de exámenes previos */}
        {examenesPrevios.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-700">Exámenes Previos</h3>
              <button
                type="button"
                onClick={() => setMostrarExamenesPrevios(!mostrarExamenesPrevios)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-300"
              >
                {mostrarExamenesPrevios ? 'Ocultar Exámenes Previos' : 'Ver Exámenes Previos'}
              </button>
            </div>

            {mostrarExamenesPrevios && (
              <div className="space-y-4">
                {examenesPrevios.map((examen, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p><strong>Fecha:</strong> {new Date(examen.createdAt).toLocaleDateString()}</p>
                        <p><strong>Doctor:</strong> {examen.doctorId?.name} {examen.doctorId?.lastName}</p>
                        <div className="mt-2">
                          <p className="font-semibold">Exámenes:</p>
                          <ul className="list-disc list-inside">
                            {examen.examenes.map((ex, idx) => (
                              <li key={idx}>
                                {ex.descripcion} - Cantidad: {ex.cantidad}
                                {ex.observacion && ` - Obs: ${ex.observacion}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => importarExamenesPrevios(examen.examenes)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Importar
                        </button>
                        <button
                          type="button"
                          onClick={() => verPDFExamen(examen.pdfUrl)}
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
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-700">Exámenes</h3>
            <button
              type="button"
              onClick={addExamen}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-300"
            >
              Agregar Examen
            </button>
          </div>
          
          {examenes.length > 0 ? (
            <div className="space-y-4">
              {examenes.map((examen, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código CUPS:
                      </label>
                      <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadCupsOptions}
                        onChange={(option) => handleCupsChange(option, index)}
                        value={examen.cupsOption}
                        placeholder="Buscar por código o nombre"
                        noOptionsMessage={() => "Escriba al menos 3 caracteres para buscar"}
                        loadingMessage={() => "Cargando opciones..."}
                        className="basic-single"
                        classNamePrefix="select"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción:
                      </label>
                      <input
                        type="text"
                        value={examen.descripcion}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad:
                      </label>
                      <input
                        type="number"
                        value={examen.cantidad}
                        onChange={(e) => handleExamenChange(index, 'cantidad', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observación:
                      </label>
                      <input
                        type="text"
                        value={examen.observacion}
                        onChange={(e) => handleExamenChange(index, 'observacion', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Observaciones adicionales"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeExamen(index)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No hay exámenes agregados.</p>
          )}
        </div>
        
        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
        >
          Generar Orden de Exámenes
        </button>
      </form>
    </div>
  );
};

export default ExamenesLaboratorio;
