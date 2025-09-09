import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { alertaGeneral } from '../../../utils/alertas';
import Swal from 'sweetalert2';

// Modelo de datos para medicamentos
const medicamentosModel = {
  // Datos de la institución
  institucionNombre: '',
  institucionDireccion: '',
  institucionNIT: '',
  institucionTelefono: '',
  
  // IDs de relación
  citaId: '',
  pacienteId: '',
  doctorId: '',
  
  // Lista de medicamentos
  medicamentos: []
};

// Modelo para cada medicamento individual
const medicamentoItemModel = {
  denominacionComun: '',
  concentracion: '',
  unidadMedida: '',
  formaFarmaceutica: '',
  dosis: '',
  viaAdministracion: '',
  frecuencia: '',
  diasTratamiento: '',
  cantidadNumeros: '',
  cantidadLetras: '',
  indicaciones: ''
};

// Función para convertir números a letras
const numeroALetras = (numero) => {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const especiales = ['', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (numero === 0) return 'cero';
  if (numero === 1) return 'uno';
  
  if (numero < 10) return unidades[numero];
  if (numero < 20) return especiales[numero - 10];
  if (numero < 100) {
    const unidad = numero % 10;
    const decena = Math.floor(numero / 10);
    if (unidad === 0) return decenas[decena];
    if (decena === 2) return 'veinti' + unidades[unidad];
    return decenas[decena] + ' y ' + unidades[unidad];
  }
  if (numero < 1000) {
    const centena = Math.floor(numero / 100);
    const resto = numero % 100;
    if (resto === 0) {
      if (centena === 1) return 'cien';
      return centenas[centena];
    }
    return centenas[centena] + ' ' + numeroALetras(resto);
  }
  
  return 'número fuera de rango';
};

const Medicamentos = ({ doctorData, citaData }) => {
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [formData, setFormData] = useState({
    ...medicamentosModel,
    // Prellenamos los IDs si están disponibles en las props
    doctorId: doctorData?._id || '',
    citaId: citaData?._id || '',
    pacienteId: citaData?.pacienteId?._id || ''
  });
  
  const [medicamento, setMedicamento] = useState({...medicamentoItemModel});
  const [formulasPrevias, setFormulasPrevias] = useState([]);
  const [mostrarFormulasPrevias, setMostrarFormulasPrevias] = useState(false);
  const [loadingFormulas, setLoadingFormulas] = useState(false);

  // Estados para la búsqueda de medicamentos
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedicamento, setSelectedMedicamento] = useState(null);

  // Añadir estado para controlar el modo de entrada
  const [modoEntrada, setModoEntrada] = useState('busqueda'); // 'busqueda' o 'manual'

  // Nuevos estados para psiquiatría
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [recordatorios, setRecordatorios] = useState([]);
  const [esPsiquiatria, setEsPsiquiatria] = useState(false);

  useEffect(() => {
    if (citaData) {
      fetchAppointmentInfo();
      loadFormDataFromLocalStorage();
    }
  }, [citaData]);

  const handleMedicamentoChange = (e) => {
    const { name, value } = e.target;
    setMedicamento(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Función para buscar medicamentos
  const buscarMedicamentos = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Verificar qué variable de entorno está disponible
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      if (!baseUrl) {
        console.error('URL del backend no disponible');
        return;
      }

      const response = await axios.get(`${baseUrl}/api/admin/cums/search`, {
        params: { query }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error al buscar medicamentos:', error);
      alertaGeneral({
        titulo: 'Error',
        messageHtml: 'No se pudieron cargar los medicamentos. Por favor, intenta de nuevo.',
        isError: true
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Función para seleccionar un medicamento de los resultados
  const seleccionarMedicamento = (med) => {
    setSelectedMedicamento(med);
    setSearchTerm(`${med.producto}`);
    setSearchResults([]);
    
    // Actualizar el estado del medicamento con los datos seleccionados
    setMedicamento(prevState => ({
      ...prevState,
      denominacionComun: med.producto || '',
      formaFarmaceutica: med.formafarmaceutica || '',
      viaAdministracion: med.viaadministracion || '',
      unidadMedida: med.unidadmedida || ''
    }));
  };

  const handleAddMedicamento = () => {
    // Mapeo de nombres de campos para mensajes más amigables
    const nombresCampos = {
      denominacionComun: 'Nombre del medicamento',
      concentracion: 'Concentración',
      unidadMedida: 'Unidad de medida',
      formaFarmaceutica: 'Forma farmacéutica',
      dosis: 'Dosis',
      viaAdministracion: 'Vía de administración',
      frecuencia: 'Frecuencia',
      diasTratamiento: 'Días de tratamiento',
      indicaciones: 'Indicaciones'
    };
    
    // Verificar campo por campo
    for (const campo in nombresCampos) {
      if (!medicamento[campo] || medicamento[campo].trim() === '') {
        // Mostrar alerta específica para el campo faltante
        Swal.fire({
          icon: 'error',
          title: 'Campo requerido',
          text: `Por favor complete el campo: ${nombresCampos[campo]}`,
          confirmButtonText: 'Entendido'
        });
        return; // Detener la ejecución después de mostrar la primera alerta
      }
    }

    // Verificar campos específicos para psiquiatría
    if (esPsiquiatria && (!fechaInicio || !horaInicio)) {
      Swal.fire({
        icon: 'error',
        title: 'Campos requeridos',
        text: 'Para psiquiatría, debe especificar la fecha y hora de inicio del tratamiento',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Crear el objeto de medicamento con los campos adicionales para psiquiatría
    const medicamentoCompleto = {
      ...medicamento,
      ...(esPsiquiatria && {
        fechaInicio,
        horaInicio,
        recordatorios
      })
    };

    // Si todos los campos están completos, agregar el medicamento
    setFormData(prevState => ({
      ...prevState,
      medicamentos: [...prevState.medicamentos, medicamentoCompleto]
    }));

    // Limpiar el formulario de medicamento
    setMedicamento({
      denominacionComun: '',
      concentracion: '',
      unidadMedida: '',
      formaFarmaceutica: '',
      dosis: '',
      viaAdministracion: '',
      frecuencia: '',
      diasTratamiento: '',
      cantidadNumeros: '',
      cantidadLetras: '',
      indicaciones: '',
    });
    
    // Limpiar campos específicos de psiquiatría
    if (esPsiquiatria) {
      setFechaInicio('');
      setHoraInicio('');
      setRecordatorios([]);
    }
    
    setSelectedMedicamento(null);
    setSearchTerm('');
    setSearchResults([]);

    // Guardar en localStorage
    saveFormDataToLocalStorage({
      ...formData,
      medicamentos: [...formData.medicamentos, medicamentoCompleto]
    });
    
    // Mostrar mensaje de éxito
    Swal.fire({
      icon: 'success',
      title: 'Medicamento agregado',
      text: 'El medicamento ha sido agregado correctamente',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleRemoveMedicamento = (index) => {
    setFormData(prevState => ({
      ...prevState,
      medicamentos: prevState.medicamentos.filter((_, i) => i !== index),
    }));
  };

  // Función para cargar fórmulas médicas previas
  const cargarFormulasPrevias = async (pacienteId) => {
    if (!pacienteId) return;
    
    try {
      setLoadingFormulas(true);
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${baseUrl}/api/formulas-medicas/paciente/${pacienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setFormulasPrevias(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar fórmulas médicas previas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las fórmulas médicas previas'
      });
    } finally {
      setLoadingFormulas(false);
    }
  };

  // Función para ver PDF de fórmula médica
  const verPDFFormula = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'PDF no disponible',
        text: 'No hay un PDF disponible para esta fórmula médica'
      });
    }
  };

  // Función para importar medicamentos de una fórmula previa
  const importarMedicamentos = (formula) => {
    if (formula.medicamentos && formula.medicamentos.length > 0) {
      // Convertir los medicamentos al formato correcto
      const medicamentosFormateados = formula.medicamentos.map(med => ({
        denominacionComun: med.denominacionComun || '',
        concentracion: med.concentracion || '',
        unidadMedida: med.unidadMedida || '',
        formaFarmaceutica: med.formaFarmaceutica || '',
        dosis: med.dosis || '',
        viaAdministracion: med.viaAdministracion || '',
        frecuencia: med.frecuencia || '',
        diasTratamiento: med.diasTratamiento || '',
        cantidadNumeros: med.cantidadNumeros || '',
        cantidadLetras: med.cantidadLetras || '',
        indicaciones: med.indicaciones || ''
      }));

      setFormData(prevState => ({
        ...prevState,
        medicamentos: medicamentosFormateados
      }));
      
      Swal.fire({
        icon: 'success',
        title: 'Medicamentos importados',
        text: 'Los medicamentos han sido importados correctamente',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Sin medicamentos',
        text: 'Esta fórmula médica no contiene medicamentos para importar'
      });
    }
  };

  // Función para editar un medicamento
  const editarMedicamento = (index) => {
    const medicamentoAEditar = formData.medicamentos[index];
    setMedicamento(medicamentoAEditar);
    
    // Establecer el término de búsqueda para que se muestre en el campo
    setSearchTerm(medicamentoAEditar.denominacionComun);
    
    // Eliminar el medicamento de la lista
    setFormData(prevState => ({
      ...prevState,
      medicamentos: prevState.medicamentos.filter((_, i) => i !== index)
    }));

    // Mostrar mensaje informativo
    Swal.fire({
      icon: 'info',
      title: 'Editar medicamento',
      text: 'El medicamento ha sido cargado en el formulario para su edición',
      timer: 2500,
      showConfirmButton: false
    });
  };

  // Función para calcular recordatorios
  const calcularRecordatorios = (fechaInicio, horaInicio, frecuencia, diasTratamiento) => {
    if (!fechaInicio || !horaInicio || !frecuencia || !diasTratamiento) return [];

    const recordatorios = [];
    const fechaInicioObj = new Date(`${fechaInicio}T${horaInicio}`);
    const frecuenciaHoras = parseInt(frecuencia);
    const dias = parseInt(diasTratamiento);

    // Calcular cuántas tomas hay en un día (24 horas / frecuencia en horas)
    const tomasPorDia = 24 / frecuenciaHoras;
    const totalTomas = tomasPorDia * dias;

    for (let i = 0; i < totalTomas; i++) {
      const fechaRecordatorio = new Date(fechaInicioObj);
      fechaRecordatorio.setHours(fechaInicioObj.getHours() + (i * frecuenciaHoras));
      
      recordatorios.push({
        fecha: fechaRecordatorio.toLocaleDateString(),
        hora: fechaRecordatorio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    return recordatorios;
  };

  // Efecto para actualizar recordatorios cuando cambian los campos relevantes
  useEffect(() => {
    if (esPsiquiatria && fechaInicio && horaInicio && medicamento.frecuencia && medicamento.diasTratamiento) {
      const nuevosRecordatorios = calcularRecordatorios(
        fechaInicio,
        horaInicio,
        medicamento.frecuencia,
        medicamento.diasTratamiento
      );
      setRecordatorios(nuevosRecordatorios);
    }
  }, [fechaInicio, horaInicio, medicamento.frecuencia, medicamento.diasTratamiento, esPsiquiatria]);

  // Modificar fetchAppointmentInfo para verificar si es psiquiatría
  const fetchAppointmentInfo = async () => {
    try {
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
      if (!baseUrl) {
        console.error('URL del backend no disponible');
        return;
      }

      const response = await axios.get(`${baseUrl}/api/historias-clinicas/cita/${citaData._id}`);
      
      setAppointmentInfo(response.data);
      
      if (response.data && response.data.historiaClinica) {
        const { historiaClinica } = response.data;
        
        // Verificar si el doctor es psiquiatra
        const especialidad = historiaClinica.doctorId?.especialidad || doctorData?.especialidad;
        setEsPsiquiatria(especialidad === 'Psiquiatria');
        
        setFormData(prevState => ({
          ...prevState,
          citaId: historiaClinica.citaId || citaData._id,
          pacienteId: historiaClinica.pacienteId?._id,
          doctorId: historiaClinica.doctorId?._id,
          institucionNombre: historiaClinica.profesional?.nombre || '',
          institucionDireccion: '',
          institucionNIT: '',
          institucionTelefono: ''
        }));

        if (historiaClinica.pacienteId?._id) {
          cargarFormulasPrevias(historiaClinica.pacienteId._id);
        }
      }
    } catch (error) {
      console.error('Error al obtener la información de la cita:', error);
    }
  };

  useEffect(() => {
    if (appointmentInfo) {
      setFormData({
        institucionNombre: appointmentInfo.clinicName || '',
        institucionDireccion: appointmentInfo.address || '',
        institucionNIT: appointmentInfo.nit || '',
        institucionTelefono: appointmentInfo.phone || '',
        medicamentos: []
      });
    }
  }, [appointmentInfo]);

  const saveFormDataToLocalStorage = () => {
    localStorage.setItem(`formData`, JSON.stringify(formData));
  };

  const loadFormDataFromLocalStorage = () => {
    const storedData = localStorage.getItem(`formData`);
    if (storedData) {
      setFormData(JSON.parse(storedData));
    }
  };

  // Efecto para calcular automáticamente la cantidad
  useEffect(() => {
    if (medicamento.dosis && medicamento.frecuencia && medicamento.diasTratamiento) {
      try {
        // Calcular dosis por día
        const dosisPorToma = parseFloat(medicamento.dosis) || 0;
        const frecuenciaHoras = parseInt(medicamento.frecuencia) || 0;
        const diasTratamiento = parseInt(medicamento.diasTratamiento) || 0;
        
        // Calcular cuántas tomas hay en un día (24 horas / frecuencia en horas)
        const tomasPorDia = 24 / frecuenciaHoras;
        
        // Calcular cantidad total: dosis por toma × tomas por día × días de tratamiento
        const cantidadTotal = dosisPorToma * tomasPorDia * diasTratamiento;
        
        // Redondear a un número entero si es necesario
        const cantidadRedondeada = Math.round(cantidadTotal);
        
        setMedicamento(prev => ({
          ...prev,
          cantidadNumeros: cantidadRedondeada.toString(),
          cantidadLetras: numeroALetras(cantidadRedondeada)
        }));
      } catch (error) {
        console.error("Error al calcular la cantidad:", error);
      }
    }
  }, [medicamento.dosis, medicamento.frecuencia, medicamento.diasTratamiento]);

  // Efecto para cargar datos del paciente si no están disponibles
  useEffect(() => {
    const cargarDatosPaciente = async () => {
      // Si ya tenemos el ID del paciente, no necesitamos hacer nada
      if (formData.pacienteId) return;
      
      // Si tenemos el ID de la cita pero no el del paciente, lo buscamos
      if (citaData?._id && !formData.pacienteId) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/cita/${citaData._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.data && response.data.pacienteId) {
            setFormData(prev => ({
              ...prev,
              pacienteId: response.data.pacienteId._id || response.data.pacienteId,
              citaId: citaData._id,
              doctorId: doctorData?._id || ''
            }));
          }
        } catch (error) {
          console.error('Error al cargar datos del paciente:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los datos del paciente'
          });
        }
      }
    };
    
    cargarDatosPaciente();
  }, [citaData, doctorData, formData.pacienteId]);

  // Función para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validar que haya al menos un medicamento
      if (formData.medicamentos.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin medicamentos',
          text: 'Debe agregar al menos un medicamento a la prescripción'
        });
        return;
      }
      
      // Mostrar confirmación antes de enviar
      const confirmResult = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Por favor revisa todos los medicamentos antes de continuar. ¿Deseas guardar esta fórmula médica?',
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
        title: 'Guardando fórmula médica',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Preparar los datos para enviar usando los IDs obtenidos de appointmentInfo
      const datosAEnviar = {
        citaId: formData.citaId || citaData?._id,
        pacienteId: appointmentInfo.historiaClinica.pacienteId._id,
        doctorId: appointmentInfo.historiaClinica.doctorId._id,
        medicamentos: formData.medicamentos,
        diagnosticos: appointmentInfo.historiaClinica.diagnosticos.map(diag => ({
          codigo: diag.codigo,
          nombre: diag.nombre,
          tipo: diag.tipo,
          relacionado: diag.relacionado
        }))
      };
      
      // Verificar que todos los IDs necesarios estén presentes
      if (!datosAEnviar.citaId || !datosAEnviar.pacienteId || !datosAEnviar.doctorId) {
        console.error('IDs faltantes:', {
          citaId: datosAEnviar.citaId,
          pacienteId: datosAEnviar.pacienteId,
          doctorId: datosAEnviar.doctorId,
          appointmentInfo
        });
        
        Swal.fire({
          icon: 'error',
          title: 'Datos incompletos',
          text: 'No se pueden obtener todos los datos necesarios para guardar la prescripción'
        });
        return;
      }
      
      console.log('Enviando datos:', datosAEnviar);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/formulas-medicas/verificar-y-crear`,
        datosAEnviar,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Cerrar el indicador de carga
      Swal.close();
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Prescripción guardada',
          text: 'La prescripción médica ha sido guardada exitosamente',
          confirmButtonText: 'Ver PDF',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed && response.data.pdfUrl) {
            window.open(response.data.pdfUrl, '_blank');
          }
        });
        
        // Limpiar el formulario de medicamentos pero mantener los IDs
        setFormData(prevState => ({
          ...prevState,
          medicamentos: []
        }));
        setMedicamento({
          denominacionComun: '',
          concentracion: '',
          unidadMedida: '',
          formaFarmaceutica: '',
          dosis: '',
          viaAdministracion: '',
          frecuencia: '',
          diasTratamiento: '',
          cantidadNumeros: '',
          cantidadLetras: '',
          indicaciones: '',
        });
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      
      // Cerrar el indicador de carga
      Swal.close();
      
      // Si el error es porque ya existe una fórmula médica
      if (error.response && error.response.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Fórmula médica existente',
          text: 'Ya existe una fórmula médica para esta cita.',
          confirmButtonText: 'Ver fórmula existente',
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
          text: `No se pudo guardar la prescripción: ${error.message || 'Error desconocido'}`
        });
      }
    }
  };

  // Función para cambiar entre modos de entrada
  const cambiarModoEntrada = () => {
    setModoEntrada(prevMode => {
      const newMode = prevMode === 'busqueda' ? 'manual' : 'busqueda';
      
      // Limpiar estados según el nuevo modo
      if (newMode === 'manual') {
        // Al cambiar a modo manual, limpiar la búsqueda pero mantener el medicamento actual
        setSearchResults([]);
        setSearchTerm('');
        setSelectedMedicamento(null);
      } else {
        // Al cambiar a modo búsqueda, limpiar el medicamento actual
        setMedicamento(prev => ({
          ...prev,
          denominacionComun: ''
        }));
      }
      
      return newMode;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="component-container bg-white p-6 rounded-lg shadow">
        <h2 className="component-header text-2xl font-bold text-blue-700 mb-6 pb-2 border-b-2 border-blue-200">
          Fórmula Médica
        </h2>
        <hr className="my-4" />

        {/* Botón para mostrar/ocultar fórmulas previas */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setMostrarFormulasPrevias(!mostrarFormulasPrevias)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200"
          >
            {mostrarFormulasPrevias ? 'Ocultar Fórmulas Previas' : 'Ver Fórmulas Previas'}
          </button>
        </div>

        {/* Sección de fórmulas previas */}
        {mostrarFormulasPrevias && (
          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Fórmulas Médicas Previas</h3>
            
            {loadingFormulas ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              </div>
            ) : formulasPrevias.length > 0 ? (
              <div className="space-y-4">
                {formulasPrevias.map((formula, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          Fecha: {new Date(formula.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Doctor: {formula.doctorId?.name} {formula.doctorId?.lastName}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => verPDFFormula(formula.pdfUrl)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Ver PDF
                        </button>
                        <button
                          onClick={() => importarMedicamentos(formula)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Importar
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Medicamentos:</p>
                      <ul className="mt-1 space-y-1">
                        {formula.medicamentos.map((med, medIndex) => (
                          <li key={medIndex} className="text-sm text-gray-600">
                            • {med.denominacionComun} - {med.dosis} {med.unidadMedida} - {med.frecuencia}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No hay fórmulas médicas previas</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Eliminados los campos:
          - Nombre de la IPS
          - Dirección
          - NIT
          - Teléfono 
          */}

          <h3 className="text-xl font-bold text-blue-600 mt-6 mb-4">Agregar Medicamento</h3>

          {/* Selector de modo de entrada */}
          <div className="mb-4 flex items-center">
            <span className="mr-4 text-gray-700 font-medium">Modo de entrada:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                type="button"
                className={`px-4 py-2 rounded-md ${modoEntrada === 'busqueda' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700'}`}
                onClick={() => setModoEntrada('busqueda')}
              >
                Búsqueda
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md ${modoEntrada === 'manual' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700'}`}
                onClick={() => setModoEntrada('manual')}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Campo de búsqueda de medicamentos */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Denominación Común
            </label>
            {modoEntrada === 'busqueda' ? (
              <input
                type="text"
                name="denominacionComun"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  buscarMedicamentos(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar medicamento..."
              />
            ) : (
              <input
                type="text"
                name="denominacionComun"
                value={medicamento.denominacionComun}
                onChange={handleMedicamentoChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese el nombre del medicamento"
              />
            )}
            {isSearching && modoEntrada === 'busqueda' && (
              <div className="absolute right-3 top-10">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
              </div>
            )}
            {searchResults.length > 0 && modoEntrada === 'busqueda' && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((med, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    onClick={() => seleccionarMedicamento(med)}
                  >
                    <div className="font-medium">{med.producto}</div>
                    <div className="text-sm text-gray-600">
                      {med.formafarmaceutica} - {med.concentracion} {med.unidadmedida}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Concentración
              </label>
              <input
                type="text"
                name="concentracion"
                className="form-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 500, 850, etc."
                value={medicamento.concentracion}
                onChange={handleMedicamentoChange}
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Unidad de medida
              </label>
              <input
                type="text"
                name="unidadMedida"
                className="form-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: mg, ml, etc."
                value={medicamento.unidadMedida}
                onChange={handleMedicamentoChange}
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Forma farmacéutica
              </label>
              <input
                type="text"
                name="formaFarmaceutica"
                className="form-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: tableta, jarabe, etc."
                value={medicamento.formaFarmaceutica}
                onChange={handleMedicamentoChange}
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Dosis:
              </label>
              <input
                type="text"
                name="dosis"
                value={medicamento.dosis}
                onChange={handleMedicamentoChange}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Frecuencia:
              </label>
              <select
                name="frecuencia"
                value={medicamento.frecuencia}
                onChange={handleMedicamentoChange}
                className="form-select w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecciona una opción</option>
                <option value="4">Cada 4 horas</option>
                <option value="6">Cada 6 horas</option>
                <option value="8">Cada 8 horas</option>
                <option value="12">Cada 12 horas</option>
                <option value="24">Cada 24 horas (una vez al día)</option>
                <option value="48">Cada 48 horas</option>
                <option value="72">Cada 72 horas</option>
                <option value="168">Una vez a la semana</option>
              </select>
            </div>

            {/* Campos específicos para psiquiatría */}
            {esPsiquiatria && (
              <>
                <div>
                  <label className="form-label block text-gray-700 font-medium mb-2">
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="form-label block text-gray-700 font-medium mb-2">
                    Hora de Inicio:
                  </label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Visualización de recordatorios */}
                {recordatorios.length > 0 && (
                  <div className="col-span-2">
                    <label className="form-label block text-gray-700 font-medium mb-2">
                      Recordatorios de Toma:
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {recordatorios.map((recordatorio, index) => (
                            <tr key={index} className="hover:bg-gray-100">
                              <td className="px-4 py-2 text-sm">{recordatorio.fecha}</td>
                              <td className="px-4 py-2 text-sm">{recordatorio.hora}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Vía de Administración:
              </label>
              <select
                name="viaAdministracion"
                value={medicamento.viaAdministracion}
                onChange={handleMedicamentoChange}
                className="form-select w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecciona una opción</option>
                <option value="">Selecciona una opción</option>
                <option value="BUCAL">Bucal</option>
                <option value="CONJUNTIVAL">Conjuntival</option>
                <option value="DENTAL">Dental</option>
                <option value="EPIDURAL">Epidural</option>
                <option value="IMPLANTE">Implante</option>
                <option value="INFILTRATIVA - BLOQUEOS">Infiltrativa - Bloqueos</option>
                <option value="INFILTRATIVA - EPIDURAL">Infiltrativa - Epidural</option>
                <option value="INFILTRATIVA - LOCAL">Infiltrativa - Local</option>
                <option value="INFUSIÓN INTRAVENOSA">Infusión Intravenosa</option>
                <option value="INHALACION">Inhalación</option>
                <option value="INSUFLACION">Insuflación</option>
                <option value="INTRA-ARTERIAL">Intra-arterial</option>
                <option value="INTRA-ARTICULAR">Intra-articular</option>
                <option value="INTRA-CARDIAC">Intra-cardiaca</option>
                <option value="INTRACAVERNOSA">Intracavernosa</option>
                <option value="INTRACEREBROVENTRICULAR">Intracerebroventricular</option>
                <option value="INTRADERMAL">Intradermal</option>
                <option value="INTRALINFATICA">Intralinfática</option>
                <option value="INTRAMUSCULAR">Intramuscular</option>
                <option value="INTRANASAL">Intranasal</option>
                <option value="INTRAOCULAR">Intraocular</option>
                <option value="INTRAPERITONEAL">Intraperitoneal</option>
                <option value="INTRATECAL">Intratecal</option>
                <option value="INTRATRAQUEAL">Intratraqueal</option>
                <option value="INTRAUTERINA">Intrauterina</option>
                <option value="INTRAVASCULAR EN HEMODIÁLISIS">Intravascular en Hemodiálisis</option>
                <option value="INTRAVENOSA">Intravenosa</option>
                <option value="INTRAVESICAL">Intravesical</option>
                <option value="IRRIGACIÓN">Irrigación</option>
                <option value="OFTÁLMICA">Oftálmica</option>
                <option value="ORAL">Oral</option>
                <option value="OTICO AURICULAR">Ótico auricular</option>
                <option value="PARENTERAL">Parenteral</option>
                <option value="PERFUSION INTRAVENOSA">Perfusión intravenosa</option>
                <option value="PERIARTICULAR">Periarticular</option>
                <option value="PERINEURAL">Perineural</option>
                <option value="RAQUIDEA">Raquídea</option>
                <option value="RECTAL">Rectal</option>
                <option value="SUBCUTANEA">Subcutánea</option>
                <option value="SUBLINGUAL">Sublingual</option>
                <option value="TÓPICA OCULAR">Tópica ocular</option>
                <option value="TEJIDO BLANDO">Tejido blando</option>
                <option value="TOPICA (EXTERNA)">Tópica (externa)</option>
                <option value="TRANSDERMAL">Transdermal</option>
                <option value="URETRAL">Uretral</option>
                <option value="VAGINAL">Vaginal</option>
              </select>
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Días de Tratamiento:
              </label>
              <input
                type="number"
                name="diasTratamiento"
                value={medicamento.diasTratamiento}
                onChange={handleMedicamentoChange}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Cantidad (en números):
              </label>
              <input
                type="text"
                name="cantidadNumeros"
                value={medicamento.cantidadNumeros}
                onChange={handleMedicamentoChange}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Cantidad (en letras):
              </label>
              <input
                type="text"
                name="cantidadLetras"
                value={medicamento.cantidadLetras}
                onChange={handleMedicamentoChange}
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                
              />
            </div>
            
            <div>
              <label className="form-label block text-gray-700 font-medium mb-2">
                Indicaciones:
              </label>
              <textarea
                name="indicaciones"
                value={medicamento.indicaciones}
                onChange={handleMedicamentoChange}
                rows="4"
                className="form-input w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddMedicamento}
            className="button-add bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-200"
          >
            Agregar Medicamento
          </button>

          <div className="mt-8">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Lista de Medicamentos</h3>
            
            {formData.medicamentos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicamento</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concentración</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosis</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frecuencia</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vía</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.medicamentos.map((med, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{med.denominacionComun}</td>
                        <td className="py-3 px-4 text-sm">{med.concentracion} {med.unidadMedida}</td>
                        <td className="py-3 px-4 text-sm">{med.formaFarmaceutica}</td>
                        <td className="py-3 px-4 text-sm">{med.dosis}</td>
                        <td className="py-3 px-4 text-sm">
                          {med.frecuencia === '4' ? 'Cada 4 horas' :
                           med.frecuencia === '6' ? 'Cada 6 horas' :
                           med.frecuencia === '8' ? 'Cada 8 horas' :
                           med.frecuencia === '12' ? 'Cada 12 horas' :
                           med.frecuencia === '24' ? 'Cada 24 horas' :
                           med.frecuencia === '48' ? 'Cada 48 horas' :
                           med.frecuencia === '72' ? 'Cada 72 horas' :
                           med.frecuencia === '168' ? 'Una vez a la semana' :
                           med.frecuencia}
                        </td>
                        <td className="py-3 px-4 text-sm">{med.viaAdministracion}</td>
                        <td className="py-3 px-4 text-sm">{med.diasTratamiento}</td>
                        <td className="py-3 px-4 text-sm">{med.cantidadNumeros}</td>
                        
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => editarMedicamento(index)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicamento(index)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No hay medicamentos agregados</p>
            )}
          </div>

          <button
            type="submit"
            className="button-send w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg mt-8 transition duration-300 ease-in-out transform hover:-translate-y-1"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Medicamentos;
