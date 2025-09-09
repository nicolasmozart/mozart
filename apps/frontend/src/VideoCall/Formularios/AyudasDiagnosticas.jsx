import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { alertaGeneral } from '../../../utils/alertas';
import axios from 'axios';
import Swal from 'sweetalert2';

const AyudasDiagnosticas = ({ citaData, doctorData }) => {
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

        // Obtener ayudas diagnósticas previas del paciente
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

  // Función para obtener ayudas diagnósticas previas
  const fetchExamenesPrevios = async (pacienteId) => {
    try {
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${baseUrl}/api/ayudas-diagnosticas/paciente/${pacienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setExamenesPrevios(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener ayudas diagnósticas previas:', error);
    }
  };

  // Función para importar ayudas diagnósticas previas
  const importarExamenesPrevios = (examenesSeleccionados) => {
    const examenesImportados = examenesSeleccionados.map(examen => ({
      codigo: examen.codigo,
      descripcion: examen.descripcion,
      cantidad: examen.cantidad,
      observacion: examen.observacion,
      cupsOption: {
        value: examen.codigo,
        label: `${examen.codigo} - ${examen.descripcion}`
      }
    }));

    setExamenes(prevExamenes => [...prevExamenes, ...examenesImportados]);
    setMostrarExamenesPrevios(false);
  };

  // Función para ver PDF de ayuda diagnóstica previa
  const verPDFExamen = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'No hay PDF disponible para esta ayuda diagnóstica.',
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
    setExamenes([...examenes, { codigo: '', descripcion: '', cantidad: '', observacion: '', cupsOption: null }]);
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
        text: 'Por favor revisa todos los exámenes antes de continuar. ¿Deseas guardar esta orden de ayudas diagnósticas?',
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
        title: 'Guardando ayudas diagnósticas',
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
        `${baseUrl}/api/ayudas-diagnosticas/verificar-y-crear`,
        datosAEnviar,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Cerrar el indicador de carga
      Swal.close();
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Ayudas diagnósticas generadas!',
          text: 'Las ayudas diagnósticas han sido generadas exitosamente.',
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
      console.error('Error al generar el PDF de ayudas diagnósticas:', error);
      
      // Cerrar el indicador de carga
      Swal.close();
      
      // Si el error es porque ya existen ayudas diagnósticas
      if (error.response && error.response.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Ayudas diagnósticas existentes',
          text: 'Ya existen ayudas diagnósticas para esta cita.',
          confirmButtonText: 'Ver ayudas existentes',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && error.response.data.data.pdfUrl) {
            window.open(error.response.data.data.pdfUrl, '_blank');
          }
        });
      } else {
        // Otro tipo de error
        alertaGeneral({
          titulo: 'Error',
          messageHtml: 'Hubo un problema al guardar las ayudas diagnósticas.',
          isError: true,
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-800">Ayudas Diagnosticas</h2>
      
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

        {/* Sección de ayudas diagnósticas previas */}
        {examenesPrevios.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-700">Ayudas Diagnósticas Previas</h3>
              <button
                type="button"
                onClick={() => setMostrarExamenesPrevios(!mostrarExamenesPrevios)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-300"
              >
                {mostrarExamenesPrevios ? 'Ocultar Ayudas Previas' : 'Ver Ayudas Previas'}
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
                          <p className="font-semibold">Ayudas Diagnósticas:</p>
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
            <h3 className="text-lg font-semibold text-blue-700">Ayudas Diagnósticas</h3>
            <button
              type="button"
              onClick={addExamen}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-300"
            >
              Agregar Ayuda Diagnóstica
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
            <p className="text-gray-500 italic">No hay ayudas diagnósticas agregadas.</p>
          )}
        </div>
        
        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
        >
          Generar Orden de Ayudas Diagnósticas
        </button>
      </form>
    </div>
  );
};

export default AyudasDiagnosticas;
