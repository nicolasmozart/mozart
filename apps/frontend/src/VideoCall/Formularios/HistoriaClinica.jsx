import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import moment from 'moment'; // Cambiado de moment-timezone a moment
import { useCombobox } from 'downshift';
import Modal from 'react-modal';
import axios from 'axios';
import Select from 'react-select';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

// Estilos mejorados para el formulario
const styles = {
    formLabel: "block text-sm font-semibold text-gray-700 mb-1",
    formInput: "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150",
    formInputReadOnly: "mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-700 font-medium",
    sectionTitle: "text-lg text-indigo-700 font-bold mb-4 border-l-4 border-indigo-500 pl-3 py-1 bg-indigo-50 rounded-r-md",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 hover:shadow-md",
    buttonSecondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 hover:shadow-md",
    dataSection: "bg-white p-5 rounded-lg mb-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300",
    dateTimeInput: "mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-blue-800 font-medium"
};

const HistoriaClinicaForm = ({ doctorData, citaData }) => {
    const { register, handleSubmit, watch, setValue, formState: { errors }, getValues, reset } = useForm();
    const sigCanvas = useRef({});
    const [loadingAppointmentInfo, setLoadingAppointmentInfo] = useState(false);
    const [fechaActual, setFechaActual] = useState('');
    const [isTableVisible, setIsTableVisible] = useState(false);
    const [isTableVisible1, setIsTableVisible1] = useState(false);
    const [documentos, setDocumentos] = useState([]);
    const [resultadoInput, setResultadoInput] = useState('');
    const [fechaInput, setFechaInput] = useState('');
    const [fechaActual1, setFechaActual1] = useState('');
    const [maxLength, setMaxLength] = useState(10); // Valor inicial para 'CC'
    const [selectedOption, setSelectedOption] = useState('');
    const [imc, setImc] = useState(0);
    // Agregar definiciones para peso y talla
    const [peso, setPeso] = useState('');
    const [talla, setTalla] = useState('');
    const [diagnosticos, setDiagnosticos] = useState([]);
    const [selectedDiagnostico, setSelectedDiagnostico] = useState(null);
    const [selectedTipo, setSelectedTipo] = useState('');
    const [enfermedadesOptions, setEnfermedadesOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const formValues = watch();
    const [acompanamiento, setAcompanamiento] = useState('');
    const [equipos, setEquipos] = useState([]);
    const [mostrarFamiliares, setMostrarFamiliares] = useState(false);
    const [mostrarAlertas, setMostrarAlertas] = useState(false);
    const [mostrarAlergias, setMostrarAlergias] = useState(false);
    const [mostrarPsicosociales, setMostrarPsicosociales] = useState(false);
    const [pagador, setPagador] = useState('');
    const [tipoActividad, setTipoActividad] = useState('');
    const [alertas, setAlertas] = useState([]);
    const [alergias, setAlergias] = useState([]);
    const [resultadosParaclinicos, setResultadosParaclinicos] = useState([]);
    const [antecedentes, setAntecedentes] = useState(
        Array(8).fill().map(() => ({ personal: 'no' }))
    );

    const [sistemas, setSistemas] = useState([
        { sistema: "Órganos de los sentidos", seleccion: "no", observaciones: "" },
        { sistema: "Piel y faneras", seleccion: "no", observaciones: "" },
        { sistema: "Cardiopulmonar", seleccion: "no", observaciones: "" },
        { sistema: "Gastrointestinal", seleccion: "no", observaciones: "" },
        { sistema: "Genitourinario", seleccion: "no", observaciones: "" },
        { sistema: "Musculo esquelético", seleccion: "no", observaciones: "" },
        { sistema: "Neurológico", seleccion: "no", observaciones: "" },

    ]);
    const [appointmentInfo, setAppointmentInfo] = useState({
        idType: '',
        idNumber: '',
        dob: '',
        firstLastName: '',
        secondLastName: '',
        firstName: '',
        secondName: '',
        gender: '',
        neighborhood: '',
        email: '',
        cellNumber: '',
        notes: '',
        fullName: '',
        service: '',
        rethusNumber: '',
        nit: '',
        grupoSanguineo: '',
        rh: '',
        grupoEtnico: '',
        ocupacion: '',
        estadoCivil: '',
        escolaridad: '',
        sex: '',
        condicionDesplazamiento: '',
        zonaUbicacion: '',
        clinicName: '',
        cellNumber1: '',
        patientAddress: ''

    });

    const [datosPaciente, setDatosPaciente] = useState({
        id: '',
        nombres: '',
        apellidos: '',
        fechaNacimiento: '',
        edad: '',
        genero: '',
        numeroDocumento: '',
        telefono: '',
        email: '',
        direccion: '',
        departamento: '',
        municipio: '',
        paisNacimiento: '',
        paisResidencia: '',
        codigoPostal: '',
        tieneSeguro: false,
        nombreSeguro: '',
        numeroPoliza: '',
        tieneCuidador: false,
        nombreCuidador: '',
        apellidoCuidador: '',
        relacionCuidador: '',
        telefonoCuidador: '',
        emailCuidador: '',
    });

    const customStyles = { content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', }, };

    const [isModalAlergiasOpen, setIsModalAlergiasOpen] = useState(false);

    const [isModalAlertasOpen, setIsModalAlertasOpen] = useState(false);
    const openModalAlergias = () => setIsModalAlergiasOpen(true);
    const closeModalAlergias = () => setIsModalAlergiasOpen(false);
    const openModalAlertas = () => setIsModalAlertasOpen(true);
    const closeModalAlertas = () => setIsModalAlertasOpen(false);

    const translateMedicina = (service) => {
        return service === '325 medicina_familiar' ? 'Medicina Familiar' : 'Medicina General';
    };
    // Log de los valores del formulario en la consola
    useEffect(() => {
        console.log('Valores del formulario:', formValues);
    }, [formValues]);

    /*   useEffect(() => {
          apiClient.get(`${process.env.REACT_APP_BACKEND_URL}/api/doctor/getDocumentsAppointmentConsentimiento/${appointmentId}`)
              .then((response) => {
                  console.log("Documentos recibidos del backend:", response.data.documents);
                  setDocumentos(response.data.documents);
              })
              .catch(error => {
                  console.error("Error al obtener documentos de la cita:", error);
              });
      }, [appointmentId]); */

    const normalizeAndSplit = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(" ");
    };

    /*   const fetchEnfermedadOptions = async (query) => {
          setLoading(true);
          try {
              const normalizedQueryWords = normalizeAndSplit(query);
  
              const response = await apiClient.get(
                  `${process.env.REACT_APP_BACKEND_URL}/api/clinic/searchCie10`,
                  {
                      params: { query: normalizedQueryWords.join(" ") }, // Unir palabras normalizadas
                  }
              );
  
              const options = response.data.map((med) => ({
                  value: med.Codigo,
                  label: med.Nombre,
                  descripcion: med.Descripcion
              }));
  
  
              console.log('Fetched options:', options); // Log para verificar las opciones
              setEnfermedadesOptions(options);
              console.log('Updated enfermedadesOptions:', options);
  
          } catch (error) {
              console.error('Error al obtener las enfermedades:', error);
          } finally {
              setLoading(false);
          }
      }; */

    const handleDenominacionChange = (selectedOption) => {
        setSelectedDiagnostico(selectedOption);
        console.log('Selected option:', selectedOption);
    };
    /*  const fetchAppointmentInfo = async () => {
         try {
             const response = await apiClient.get(`${process.env.REACT_APP_BACKEND_URL}/api/clinic/appointment-info/${appointmentId}`);
 
             setAppointmentInfo(response.data);
         } catch (error) {
             console.error('Error al obtener la información de la cita:', error);
         } finally {
             setLoadingAppointmentInfo(false);
         }
     };
 
    /*  useEffect(() => {
         fetchAppointmentInfo();
     }, [appointmentId, tipoActividad]);
  */
    useEffect(() => {
        // Establecer la fecha actual
        const now = moment();
        setFechaActual(now.format('YYYY-MM-DD'));
        setFechaActual1(now.format('HH:mm'));

        // Cargar los pacientes al iniciar
        const cargarPacientes = async () => {
            setIsLoadingPacientes(true);
            try {
                console.log("Cargando pacientes desde VideoCall...");
                // Verificar qué variable de entorno está disponible
                const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;
                if (!baseUrl) {
                    console.error('URL del backend no disponible');
                    return;
                }

                const response = await axios.get(`${baseUrl}/api/admin/getPatient`);
                console.log("Pacientes cargados:", response.data);
                setPacientes(response.data);
            } catch (error) {
                console.error('Error al cargar pacientes:', error);
            } finally {
                setIsLoadingPacientes(false);
            }
        };

        cargarPacientes();

        // Actualizar campos del doctor con los datos recibidos
        if (doctorData) {
            console.log("Datos del doctor recibidos:", doctorData); // Log para depuración

            // Verificar si doctorData tiene estructura anidada (como en el ejemplo proporcionado)
            const doctorInfo = doctorData.doctorId || doctorData;

            setValue('profesional', `${doctorInfo.name || ""} ${doctorInfo.lastName || ""}`);
            setValue('especialidad', doctorInfo.especialidad || "Medicina General");
            setValue('rethusNumber', doctorInfo.rethusNumber || "");

            // Actualizar el estado appointmentInfo para mantener compatibilidad
            setAppointmentInfo(prevState => ({
                ...prevState,
                fullName: `${doctorInfo.name || ""} ${doctorInfo.lastName || ""}`,
                service: doctorInfo.especialidad || "Medicina General",
                rethusNumber: doctorInfo.rethusNumber || ""
            }));

            // Si doctorData contiene información del paciente, actualizar esos campos también
            if (doctorData.pacienteId) {
                const pacienteInfo = doctorData.pacienteId;
                // Actualizar campos del paciente si es necesario
                // ...
            }
        }

        // Actualizar campos de la cita
        if (citaData) {
            console.log("Datos de cita recibidos:", citaData); // Log para depuración
            if (citaData.motivo) {
                setValue('motivoConsulta', citaData.motivo);
                console.log("Motivo de consulta establecido:", citaData.motivo);
            }
            if (citaData.fecha) setValue('fechaCita', moment(citaData.fecha).format('YYYY-MM-DD'));
            if (citaData.hora) setValue('horaCita', citaData.hora);
            if (citaData.tipo) setValue('tipoCita', citaData.tipo);
        }
    }, [doctorData, citaData, setValue]);

    // Remover el useEffect duplicado en líneas 547-549
    // Y el useEffect duplicado en líneas 619-641

    // Actualizar el cálculo del IMC para usar watch del formulario
    const watchPeso = watch('pesoKg');
    const watchTalla = watch('tallaCm');

    useEffect(() => {
        if (watchPeso && watchTalla) {
            // Convertir peso y talla a números
            const pesoNum = parseFloat(watchPeso);
            const tallaNum = parseFloat(watchTalla) / 100; // Convertir talla a metros

            // Calcular IMC
            if (tallaNum > 0) { // Asegúrate de que la talla sea mayor que 0 para evitar divisiones por cero
                const imcCalc = pesoNum / (tallaNum * tallaNum);
                const imcFormateado = imcCalc.toFixed(2); // Establecer el IMC calculado con dos decimales
                setImc(imcFormateado);

                // Actualiza el valor en el formulario
                setValue('imc', imcFormateado);
            } else {
                setImc(0);
                setValue('imc', '0');
            }
        }
    }, [watchPeso, watchTalla, setValue]);

    const toggleTableVisibility = () => {
        setIsTableVisible(!isTableVisible);
    };
    const toggleTableVisibility1 = () => {
        setIsTableVisible1(!isTableVisible1);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault(); // Evitar que Enter envíe el formulario
        }
    };

    const onSubmit = async (data) => {
        try {
            // Mostrar confirmación antes de enviar
            const confirmResult = await Swal.fire({
                title: '¿Estás seguro?',
                text: 'Por favor revisa todos los campos antes de continuar. ¿Deseas guardar esta historia clínica?',
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
                title: 'Guardando historia clínica',
                text: 'Por favor espere...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            let fechaCita = '';
            if (citaData && citaData.fecha) {
                // Formatear la fecha como YYYY-MM-DD sin ajuste de zona horaria
                const fecha = new Date(citaData.fecha);
                fechaCita = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
            }
            
            // Obtener el ID de la clínica del localStorage
            const clinicaId = localStorage.getItem('clinicId');

            // Preparar los datos para enviar
            const historiaClinicaData = {
                ...data,
                // Asegurarse de que los diagnósticos estén en el formato correcto
                diagnosticos: data.diagnosticos,
                // Añadir IDs de referencia
                fechaCita: fechaCita,
                clinicaId: clinicaId,
                pacienteId: pacienteSeleccionado?._id,
                doctorId: doctorData?._id || appointmentInfo.doctorId,
                citaId: citaData?._id || appointmentInfo.appointmentId
            };

            // Enviar los datos al backend usando la nueva ruta
            const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || '';
            const response = await axios.post(`${baseUrl}/api/historias-clinicas/verificar-y-crear`, historiaClinicaData);

            // Cerrar el indicador de carga
            Swal.close();

            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: '¡Historia clínica guardada!',
                text: 'La historia clínica ha sido guardada exitosamente.',
                confirmButtonText: 'Ver PDF',
                showCancelButton: true,
                cancelButtonText: 'Cerrar'
            }).then((result) => {
                if (result.isConfirmed && response.data.pdfUrl) {
                    window.open(response.data.pdfUrl, '_blank');
                }
                // Opcional: redirigir a otra página después de guardar
                // navigate('/doctor/citas');
            });

        } catch (error) {
            console.error('Error al guardar la historia clínica:', error);

            // Cerrar el indicador de carga
            Swal.close();

            // Si el error es porque ya existe una historia clínica
            if (error.response && error.response.status === 409) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Historia clínica existente',
                    text: 'Ya existe una historia clínica para esta cita.',
                    confirmButtonText: 'Ver historia existente',
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
                    text: 'Hubo un problema al guardar la historia clínica. Por favor, intente nuevamente.',
                    confirmButtonText: 'Aceptar'
                });
            }
        }
    };

    /*   const {
          isOpen,
          getMenuProps,
          getInputProps,
          getItemProps,
          highlightedIndex,
          reset,
      } = useCombobox({
          items: enfermedadesOptions,
          onInputValueChange: ({ inputValue }) => {
              fetchEnfermedadOptions(inputValue); // Fetch options as user types
          },
          onSelectedItemChange: ({ selectedItem }) => {
              setSelectedDiagnostico(selectedItem);
          },
          itemToString: (item) => (item ? item.label : ''),
      }); */

    /*  useEffect(() => {
         const fetchHistorialClinico = async () => {
             try {
                 if (loadingAppointmentInfo) return;
                 const patientId = appointmentInfo.patientId; // Obtener patientId de appointmentInfo
                 console.log(patientId);
                 const response = await apiClient.get(`${process.env.REACT_APP_BACKEND_URL}/api/clinic/getAlertasAlergiasResultados/${patientId}`);
 
                 // Almacena los datos en los estados
                 setAlertas(response.data.alertas);
                 setAlergias(response.data.alergias);
                 setResultadosParaclinicos(response.data.resultadosParaclinicos);
             } catch (error) {
                 console.error('Error al obtener los datos de la historia clínica:', error);
 
             } finally {
                 setLoading(false);
             }
         }; */

    /*       fetchHistorialClinico();
      }, [appointmentInfo]); // Ejecutar cuando appointmentInfo cambie
   */
    useEffect(() => {
        const ahora = new Date();
        const year = ahora.getFullYear();
        const month = String(ahora.getMonth() + 1).padStart(2, '0'); // Mes empieza en 0
        const day = String(ahora.getDate()).padStart(2, '0');
        const hours = String(ahora.getHours()).padStart(2, '0');
        const minutes = String(ahora.getMinutes()).padStart(2, '0');

        // Formato para datetime-local: YYYY-MM-DDTHH:mm
        const fechaFormateada = `${year}-${month}-${day}T${hours}:${minutes}`;
        const fechaFormateada1 = `${year}-${month}-${day}`;
        setFechaActual(fechaFormateada);
        setFechaActual1(fechaFormateada1);
    }, []);

    const handleClearSignature = () => {
        sigCanvas.current.clear();
    };


    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date)) return ''; // Verifica que la fecha sea válida
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const handleSeleccionChange = (index, value) => {
        const nuevosSistemas = [...sistemas];
        nuevosSistemas[index] = { ...nuevosSistemas[index], seleccion: value };
        setSistemas(nuevosSistemas);
    };

    const translateGender = (gender) => {
        return gender === 'male' ? 'Masculino' : 'Femenino';
    };

    const handleDescripcionChange = (index, value) => {
        // Crear una copia del estado actual
        const nuevosSistemas = [...sistemas];

        // Verifica si 'nuevosSistemas' es un array antes de manipularlo
        if (Array.isArray(nuevosSistemas)) {
            nuevosSistemas[index].descripcion = value;
            setSistemas(nuevosSistemas);
            setValue(`sistemas.${index}.descripcion`, value); // Sincronizar con react-hook-form
        } else {
            console.error('nuevosSistemas no es un array');
        }
    };

    const handleAntecedentesChange = (e, index, tipo) => {
        const value = e.target.value;
        setAntecedentes(prevAntecedentes => {
            const newAntecedentes = [...prevAntecedentes];
            // Asegurar que el objeto existe
            if (!newAntecedentes[index]) {
                newAntecedentes[index] = {};
            }
            // Actualizar la propiedad correspondiente
            newAntecedentes[index][tipo] = value;
            return newAntecedentes;
        });
    };

    const handleCheckboxChange = (e, tipo) => {
        const { checked } = e.target;

        if (tipo === 'familiares') {
            setMostrarFamiliares(checked);
        } else if (tipo === 'psicosociales') {
            setMostrarPsicosociales(checked);
        } else if (tipo === 'alertas') {
            setMostrarAlertas(checked);
        } else if (tipo === 'alergias') {
            setMostrarAlergias(checked);
        }
    };


    const obtenerFechaActual = () => {
        const fecha = new Date();
        // Ajustar la fecha a la zona horaria local
        const timezoneOffset = fecha.getTimezoneOffset() * 60000; // Diferencia de zona horaria en milisegundos
        const fechaLocal = new Date(fecha.getTime() - timezoneOffset);
        const fechaFormateada = fechaLocal.toISOString().slice(0, 16); // Formato adecuado para datetime-local
        setFechaActual(fechaFormateada);
    };

    useEffect(() => {
        obtenerFechaActual();
    }, [appointmentInfo]);

    const onHandleClickView = (url) => {
        window.open(url, '_blank');
    };

    // Implementación de búsqueda de pacientes por identificación
    const [pacientes, setPacientes] = useState([]);
    const [isLoadingPacientes, setIsLoadingPacientes] = useState(false);
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);

    const seleccionarPaciente = (paciente) => {
        setPacienteSeleccionado(paciente);

        // Actualizar todos los campos del formulario con la información del paciente
        setValue('idType', paciente.idType);
        setValue('idNumber', paciente.idNumber);
        setValue('dob', paciente.birthDate ? moment(paciente.birthDate).format('YYYY-MM-DD') : '');

        // Corregir los campos de nombre y apellido
        setValue('primerNombre', paciente.firstName);
        setValue('segundoNombre', paciente.secondName || '');
        setValue('primerApellido', paciente.lastName);
        setValue('segundoApellido', paciente.secondLastName || '');

        // Corregir teléfono y otros campos
        setValue('gender', paciente.gender);
        setValue('neighborhood', paciente.neighborhood || '');
        setValue('email', paciente.email);
        setValue('telefono1', paciente.phone); // Usar phone en lugar de cellNumber
        setValue('patientAddress', paciente.address);
        setValue('notes', paciente.notes || '');
        setValue('fullName', `${paciente.firstName} ${paciente.lastName}`);

        // También actualizar el estado appointmentInfo para mantener compatibilidad
        setAppointmentInfo(prevState => ({
            ...prevState,
            idType: paciente.idType,
            documentNumber: paciente.idNumber,
            firstName: paciente.firstName,
            firstLastName: paciente.lastName,
            gender: paciente.gender,
            neighborhood: paciente.neighborhood || '',
            email: paciente.email,
            cellNumber: paciente.phone, // Usar phone en lugar de cellNumber
            grupoSanguineo: paciente.grupoSanguineo,
            rh: paciente.rh,
            grupoEtnico: paciente.grupoEtnico,
            ocupacion: paciente.ocupacion,
            estadoCivil: paciente.estadoCivil,
            escolaridad: paciente.escolaridad,
            sex: paciente.sex,
            condicionDesplazamiento: paciente.condicionDesplazamiento,
            zonaUbicacion: paciente.zonaUbicacion,
            patientAddress: paciente.address,
            cellNumber1: paciente.phone
        }));
    };

    const limpiarSeleccion = () => {
        setPacienteSeleccionado(null);
        setDatosPaciente({
            id: '',
            nombres: '',
            apellidos: '',
            fechaNacimiento: '',
            edad: '',
            genero: '',
            tipoDocumento: '',
            numeroDocumento: '',
            telefono: '',
            email: '',
            direccion: '',
            departamento: '',
            municipio: '',
            paisNacimiento: '',
            paisResidencia: '',
            codigoPostal: '',
            tieneSeguro: false,
            nombreSeguro: '',
            numeroPoliza: '',
            tieneCuidador: false,
            nombreCuidador: '',
            apellidoCuidador: '',
            relacionCuidador: '',
            telefonoCuidador: '',
            emailCuidador: '',
        });
        reset(); // Resetear el formulario
    };

    // Añadir componente de búsqueda de pacientes


    // ... existing code ...
    useEffect(() => {
        // Solo gestionamos doctorData y citaData, la parte de pacienteData se maneja en seleccionarPaciente

        if (doctorData) {
            // Actualizar campos del doctor con los datos recibidos
            setValue('profesional', `${doctorData.name || ""} ${doctorData.lastName || ""}`);
            setValue('especialidad', doctorData.especialidad || "Medicina General");

            // Actualizar el estado appointmentInfo para mantener compatibilidad
            setAppointmentInfo(prevState => ({
                ...prevState,
                fullName: `${doctorData.name || ""} ${doctorData.lastName || ""}`,
                service: doctorData.especialidad || "Medicina General",
            }));
        }

        if (citaData) {
            // Actualizar campos de la cita si es necesario
            if (citaData.motivo) setValue('motivoConsulta', citaData.motivo);
        }
    }, [doctorData, citaData, setValue]); // Solo estas dependencias

    // Definir las funciones manejadoras faltantes
    const handleActividadChange = (e) => {
        setTipoActividad(e.target.value);
    };

    const handlePagadorChange = (e) => {
        setPagador(e.target.value);
    };

    const handleAcompanamientoChange = (e) => {
        setAcompanamiento(e.target.value);
    };

    const handleEquiposChange = (e) => {
        setEquipos(e.target.value);
    };

    // Añade esta función que falta
    const actualizarRelacionado = (index, valor) => {
        const nuevosDiagnosticos = [...diagnosticos];
        nuevosDiagnosticos[index].relacionado = valor;
        setDiagnosticos(nuevosDiagnosticos);

        // Actualiza también el formData con todos los diagnósticos
        actualizarDiagnosticosEnFormulario(nuevosDiagnosticos);
    };

    // Función para actualizar todos los diagnósticos en el formulario
    const actualizarDiagnosticosEnFormulario = (listaDiagnosticos) => {
        // Convertir la lista de diagnósticos a formato JSON para guardarla en el formulario
        const diagnosticosJSON = JSON.stringify(listaDiagnosticos);
        setValue('diagnosticos', diagnosticosJSON);

        // También mantener el diagnóstico principal en el campo cie10 si existe
        const diagnosticoPrincipal = listaDiagnosticos.find(d => d.tipo === 'Principal');
        if (diagnosticoPrincipal) {
            setValue('cie10', `${diagnosticoPrincipal.codigo} / ${diagnosticoPrincipal.nombre}`);
        }
    };

    // Modifica la función agregarDiagnostico para actualizar el formData
    const agregarDiagnostico = () => {
        if (!selectedCie10 || !selectedTipo) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor seleccione un diagnóstico y un tipo'
            });
            return;
        }

        const nuevoDiagnostico = {
            codigo: selectedCie10.Icd10Code,
            nombre: selectedCie10.Icd10Title,
            tipo: selectedTipo,
            relacionado: ''
        };

        // Actualizar la lista de diagnósticos
        const nuevosDiagnosticos = [...diagnosticos, nuevoDiagnostico];
        setDiagnosticos(nuevosDiagnosticos);

        // Actualizar el formData con todos los diagnósticos
        actualizarDiagnosticosEnFormulario(nuevosDiagnosticos);

        // Limpiar selecciones para el siguiente diagnóstico
        setSelectedCie10(null);
        setSelectedTipo('');
        setSearchTerm('');
    };

    // Modifica también la función eliminarDiagnostico
    const eliminarDiagnostico = (index) => {
        const nuevosDiagnosticos = [...diagnosticos];
        nuevosDiagnosticos.splice(index, 1);
        setDiagnosticos(nuevosDiagnosticos);

        // Actualizar el formData con la lista actualizada
        actualizarDiagnosticosEnFormulario(nuevosDiagnosticos);
    };

    // En el componente donde manejas los datos del paciente
    useEffect(() => {
        if (pacienteSeleccionado) {
            // Establecer todos los campos disponibles del paciente
            setDatosPaciente({
                id: pacienteSeleccionado._id || '',
                nombres: pacienteSeleccionado.firstName || '',
                apellidos: pacienteSeleccionado.lastName || '',
                fechaNacimiento: pacienteSeleccionado.birthDate ? new Date(pacienteSeleccionado.birthDate).toISOString().split('T')[0] : '',
                edad: calcularEdad(pacienteSeleccionado.birthDate),
                genero: pacienteSeleccionado.gender || '',
                tipoDocumento: pacienteSeleccionado.idType || '',
                numeroDocumento: pacienteSeleccionado.idNumber || '',
                telefono: pacienteSeleccionado.phone || '',
                email: pacienteSeleccionado.email || '',
                direccion: pacienteSeleccionado.address || '',
                departamento: pacienteSeleccionado.state || '',
                municipio: pacienteSeleccionado.municipality || '',
                paisNacimiento: pacienteSeleccionado.birthCountry || '',
                paisResidencia: pacienteSeleccionado.residenceCountry || '',
                codigoPostal: pacienteSeleccionado.postalCode || '',
                tieneSeguro: pacienteSeleccionado.hasInsurance || false,
                nombreSeguro: pacienteSeleccionado.insuranceName || '',
                numeroPoliza: pacienteSeleccionado.policyNumber || '',
                tieneCuidador: pacienteSeleccionado.hasCaretaker || false,
                nombreCuidador: pacienteSeleccionado.caretakerFirstName || '',
                apellidoCuidador: pacienteSeleccionado.caretakerLastName || '',
                relacionCuidador: pacienteSeleccionado.caretakerRelationship || '',
                telefonoCuidador: pacienteSeleccionado.caretakerPhone || '',
                emailCuidador: pacienteSeleccionado.caretakerEmail || '',
            });

            // También establecer los valores en el formulario usando setValue
            setValue('nombrePaciente', `${pacienteSeleccionado.firstName || ''} ${pacienteSeleccionado.lastName || ''}`);
            setValue('fechaNacimiento', pacienteSeleccionado.birthDate ? new Date(pacienteSeleccionado.birthDate).toISOString().split('T')[0] : '');
            setValue('genero', pacienteSeleccionado.gender || '');
            setValue('tipoDocumento', pacienteSeleccionado.idType || '');
            setValue('numeroDocumento', pacienteSeleccionado.idNumber || '');
            setValue('telefono', pacienteSeleccionado.phone || '');
            setValue('direccion', pacienteSeleccionado.address || '');
            // Agregar todos los demás campos que necesites
            setValue('email', pacienteSeleccionado.email || '');
            setValue('departamento', pacienteSeleccionado.state || '');
            setValue('municipio', pacienteSeleccionado.municipality || '');
            setValue('paisNacimiento', pacienteSeleccionado.birthCountry || '');
            setValue('paisResidencia', pacienteSeleccionado.residenceCountry || '');
            setValue('codigoPostal', pacienteSeleccionado.postalCode || '');

            // Agregar los campos que mencionas que faltan
            setValue('primerApellido', pacienteSeleccionado.lastName || ''); // Campo explícito para apellido
            setValue('telefono1', pacienteSeleccionado.phone || ''); // Campo explícito para teléfono
        }
    }, [pacienteSeleccionado, setValue]);

    // Función para calcular la edad a partir de la fecha de nacimiento
    const calcularEdad = (fechaNacimiento) => {
        if (!fechaNacimiento) return '';

        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();

        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }

        return edad.toString();
    };



    // Añadir esta función con las otras funciones manejadoras
    const handleOptionChange = (e) => {
        setSelectedOption(e.target.value);
    };

    // Añade estos estados para la búsqueda de CIE10
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCie10, setSelectedCie10] = useState(null);
    const [aseguradora, setAseguradora] = useState([]);
    // Función para buscar diagnósticos CIE10
    const buscarDiagnosticos = async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Ajusta la URL según tu configuración
            const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || '';
            const response = await fetch(`${baseUrl}/api/admin/cie10/search?query=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error('Error en la búsqueda');
            }

            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error al buscar diagnósticos:', error);
        } finally {
            setIsSearching(false);
        }
    };
    const fetchAseguradora = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/getAseguradora`);
            const data = await response.json();
            const formattedInsurance = data.map((insurance) => ({
                value: insurance.name, // El valor que se usará al seleccionar
                label: insurance.name, // El texto que se mostrará en la lista
            }));
            setAseguradora(formattedInsurance);
        } catch (error) {
            Swal.fire('Error', 'Error al obtener aseguradoras', 'error');
        }
    };
    useEffect(() => {
        fetchAseguradora();
    }, []);
    // Función para seleccionar un diagnóstico
    const seleccionarDiagnostico = (diagnostico) => {
        setSelectedCie10(diagnostico);
        setSearchTerm(''); // Limpiar el término de búsqueda
        setSearchResults([]); // Limpiar resultados

        // Actualizar el campo cie10 con el código y nombre
        setValue('cie10', `${diagnostico.Icd10Code} / ${diagnostico.Icd10Title}`);
    };

    // Añade esta función auxiliar para determinar si un campo debe ser readonly
    const isFieldReadOnly = (fieldName) => {
        // Si hay un paciente seleccionado y el campo tiene valor, será readonly
        if (pacienteSeleccionado) {
            // Mapeo de campos del formulario a propiedades del paciente
            const fieldMappings = {
                'primerNombre': 'firstName',
                'segundoNombre': 'secondName',
                'primerApellido': 'lastName',
                'segundoApellido': 'secondLastName',
                'tipoIdentificacion': 'idType',
                'numeroIdentificacion': 'idNumber',
                'fechaNacimiento': 'birthDate',
                'genero': 'gender',
                'telefono1': 'phone',
                'email': 'email',
                'neighborhood': 'neighborhood',
                'grupoSanguineo': 'bloodType',
                'rh': 'rh',
                'grupoEtnico': 'ethnicGroup',
                'ocupacion': 'occupation',
                'estadoCivil': 'civilStatus',
                'escolaridad': 'educationLevel',
                'direccion': 'address',
                'departamento': 'state',
                'municipio': 'municipality',
                'paisNacimiento': 'birthCountry',
                'paisResidencia': 'residenceCountry',
                'codigoPostal': 'postalCode',
                'tieneSeguro': 'hasInsurance',
                'nombreSeguro': 'insuranceName',
                'tipoUsuario': 'tipoUsuario',
                'parentesco': 'parentesco',
                'otroParentesco': 'otroParentesco',
                'acompananteTelefono': 'acompananteTelefono',
                'acompanantePrimerNombre': 'acompananteFirstName',
                'acompananteSegundoNombre': 'acompananteSecondName',
                'acompanantePrimerApellido': 'acompananteLastName',
                'acompananteSegundoApellido': 'acompananteSecondLastName',
                'pagador': 'pagador',
                'convenio': 'convenio',
                'tipoActividad': 'tipoActividad',

                'zona': 'zona',
            };

            // Verificar si el campo tiene un valor en el paciente seleccionado
            const pacienteField = fieldMappings[fieldName];
            if (pacienteField && pacienteSeleccionado[pacienteField]) {
                return true;
            }
        }
        return false;
    };

    // Estilo para campos readonly
    const readOnlyStyle = "bg-gray-100 cursor-not-allowed ";

    // Añadir esta función para manejar la conversión de comas a puntos
    const handleDecimalInput = (e, fieldName) => {
        // Reemplazar comas por puntos
        const value = e.target.value.replace(',', '.');
        setValue(fieldName, value);
        
        // Recalcular IMC si se modifican peso o talla
        if (fieldName === 'pesoKg' || fieldName === 'tallaCm') {
            const peso = parseFloat(fieldName === 'pesoKg' ? value : getValues('pesoKg') || 0);
            const talla = parseFloat(fieldName === 'tallaCm' ? value : getValues('tallaCm') || 0);
            
            if (peso > 0 && talla > 0) {
                // Calcular IMC: peso (kg) / (altura (m))²
                const tallaMetros = talla / 100;
                const imcCalculado = (peso / (tallaMetros * tallaMetros)).toFixed(2);
                setValue('imc', imcCalculado);
            } else {
                setValue('imc', '');
            }
        }
    };

    const [historiasPrevias, setHistoriasPrevias] = useState([]);
    const [mostrarHistoriasPrevias, setMostrarHistoriasPrevias] = useState(false);
    const [historiaSeleccionada, setHistoriaSeleccionada] = useState(null);

    // Función para cargar las historias clínicas previas
    const cargarHistoriasPrevias = async () => {
        try {
            if (!pacienteSeleccionado) return;
            
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/historias-clinicas/paciente/${pacienteSeleccionado._id}`);
            if (response.data.success) {
                setHistoriasPrevias(response.data.data);
            }
        } catch (error) {
            console.error('Error al cargar historias previas:', error);
            toast.error('Error al cargar las historias clínicas previas');
        }
    };

    // Función para importar una historia clínica
    const importarHistoriaClinica = (historia) => {
        try {
            // Importar datos del paciente
            if (historia.paciente) {
                setValue('tipoIdentificacion', historia.paciente.idType);
                setValue('numeroIdentificacion', historia.paciente.idNumber);
                setValue('primerNombre', historia.paciente.primerNombre);
                setValue('segundoNombre', historia.paciente.segundoNombre);
                setValue('primerApellido', historia.paciente.primerApellido);
                setValue('segundoApellido', historia.paciente.segundoApellido);
                setValue('fechaNacimiento', historia.paciente.fechaNacimiento ? new Date(historia.paciente.fechaNacimiento).toISOString().split('T')[0] : '');
                setValue('genero', historia.paciente.genero);
                setValue('grupoSanguineo', historia.paciente.grupoSanguineo);
                setValue('rh', historia.paciente.rh);
                setValue('estadoCivil', historia.paciente.estadoCivil);
                setValue('escolaridad', historia.paciente.escolaridad);
                setValue('ocupacion', historia.paciente.ocupacion);
                setValue('zona', historia.paciente.zonaUbicacion);
                setValue('direccion', historia.paciente.direccion);
                setValue('barrio', historia.paciente.barrio);
                setValue('departamento', historia.paciente.departamento);
                setValue('municipio', historia.paciente.municipio);
                setValue('email', historia.paciente.email);
                setValue('telefono1', historia.paciente.telefono);
                setValue('celular', historia.paciente.celular);
                setValue('condicionDesplazamiento', historia.paciente.condicionDesplazamiento);
                setValue('grupoEtnico', historia.paciente.grupoEtnico);
                setValue('paisNacimiento', historia.paciente.paisNacimiento);
                setValue('paisResidencia', historia.paciente.paisResidencia);
                setValue('tipoDeAfiliado', historia.paciente.tipoDeAfiliado);
                setValue('aseguradora', historia.paciente.aseguradora);
            }

            // Importar datos de la historia clínica
            setValue('tipoActividad', historia.tipoActividad);
            setValue('acompanamientoEnConsulta', historia.acompanamientoEnConsulta);
            setValue('enfermedadActual', historia.enfermedadActual);
            setValue('resultadosParaclinicos', historia.resultadosParaclinicos);
            setValue('servicio', historia.servicio);
            
            // Importar antecedentes y actualizar estados
            if (historia.antecedentes) {
                const nuevosAntecedentes = historia.antecedentes.map(antecedente => ({
                    ...antecedente,
                    personalCheck: antecedente.personalCheck || 'no',
                    personalDescripcion: antecedente.personalDescripcion || ''
                }));
                setAntecedentes(nuevosAntecedentes);
                nuevosAntecedentes.forEach((antecedente, index) => {
                    setValue(`antecedentes.${index}.tipo`, antecedente.tipo);
                    setValue(`antecedentes.${index}.personalCheck`, antecedente.personalCheck);
                    setValue(`antecedentes.${index}.personalDescripcion`, antecedente.personalDescripcion);
                });
                // Mostrar la tabla de antecedentes si hay datos
                setIsTableVisible(true);
            }

            // Importar sistemas y actualizar estados
            if (historia.sistemas) {
                const nuevosSistemas = historia.sistemas.map(sistema => ({
                    ...sistema,
                    seleccion: sistema.seleccion || 'no'
                }));
                setSistemas(nuevosSistemas);
                nuevosSistemas.forEach((sistema, index) => {
                    setValue(`sistemas.${index}.sistema`, sistema.sistema);
                    setValue(`sistemas.${index}.seleccion`, sistema.seleccion);
                    if (sistema.seleccion === 'Sí') {
                        setValue(`sistemas.${index}.observaciones`, sistema.observaciones);
                    }
                });
                // Mostrar la tabla de sistemas si hay datos
                setIsTableVisible1(true);
            }

            // Importar signos vitales
            if (historia.signosVitales) {
                // Asegurarnos de que los valores sean números
                const signosVitales = {
                    tasMming: Number(historia.signosVitales.tasMming) || 0,
                    tad: Number(historia.signosVitales.tad) || 0,
                    fcMin: Number(historia.signosVitales.fcMin) || 0,
                    frMin: Number(historia.signosVitales.frMin) || 0,
                    temperatura: Number(historia.signosVitales.temperatura) || 0,
                    pesoKg: Number(historia.signosVitales.pesoKg) || 0,
                    tallaCm: Number(historia.signosVitales.tallaCm) || 0,
                    imc: Number(historia.signosVitales.imc) || 0
                };
                
                // Establecer los valores
                Object.entries(signosVitales).forEach(([key, value]) => {
                    setValue(`signosVitales.${key}`, value);
                });

                // Forzar la actualización de los campos de signos vitales
                setTimeout(() => {
                    const campos = ['tasMming', 'tad', 'fcMin', 'frMin', 'temperatura', 'pesoKg', 'tallaCm', 'imc'];
                    campos.forEach(campo => {
                        const input = document.querySelector(`input[name="signosVitales.${campo}"]`);
                        if (input) {
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }, 0);
            }

            // Importar examen médico
            if (historia.examenMedico) {
                setValue('examenMedico.toraxCardioVascular', historia.examenMedico.toraxCardioVascular);
                setValue('examenMedico.abdomen', historia.examenMedico.abdomen);
                setValue('examenMedico.genitalesExtremidades', historia.examenMedico.genitalesExtremidades);
                setValue('examenMedico.neurologico', historia.examenMedico.neurologico);
                setValue('examenMedico.examenMental', historia.examenMedico.examenMental);
            }

            // Importar otros campos
            setValue('familiares', historia.familiares);
            setValue('psicosociales', historia.psicosociales);
            setValue('ginecoobstetricos', historia.ginecoobstetricos || []);
            setValue('estadoDeConciencia', historia.estadoDeConciencia);
            setValue('equiposSignos', historia.equiposSignos);
            setValue('alertas', historia.alertas);
            setValue('alergias', historia.alergias);
            setValue('diagnosticos', historia.diagnosticos);
            setValue('analisisyplan', historia.analisisyplan);
            setValue('recomendaciones', historia.recomendaciones);

            // Actualizar estados locales
            setTipoActividad(historia.tipoActividad);
            setAcompanamiento(historia.acompanamientoEnConsulta);
            setDiagnosticos(historia.diagnosticos || []);
            
            // Actualizar estados de visibilidad
            setMostrarFamiliares(!!historia.familiares);
            setMostrarPsicosociales(!!historia.psicosociales);
            setMostrarAlertas(!!historia.alertas);
            setMostrarAlergias(!!historia.alergias);
            
            // Actualizar estado de equipos y forzar la actualización de la visibilidad
            if (historia.equiposSignos === 'Si') {
                setEquipos(['Si']);
                // Forzar la actualización de la visibilidad de los campos de signos vitales
                setTimeout(() => {
                    const equiposInput = document.querySelector('select[name="equiposSignos"]');
                    if (equiposInput) {
                        equiposInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, 0);
            }

            // Forzar la actualización de las descripciones de antecedentes
            setTimeout(() => {
                const antecedentes = document.querySelectorAll('select[name^="antecedentes"][name$="personalCheck"]');
                antecedentes.forEach(select => {
                    if (select.value === 'si') {
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }, 0);

            toast.success('Historia clínica importada exitosamente');
        } catch (error) {
            console.error('Error al importar historia clínica:', error);
            toast.error('Error al importar la historia clínica');
        }
    };

    // Función para abrir una historia clínica en una nueva pestaña
    const abrirHistoriaClinica = (pdfUrl) => {
        window.open(pdfUrl, '_blank');
    };

    return (
        <div className="p-4 w-full h-[84vh] bg-white overflow-auto border border-[#6e787aff] rounded-lg">
            {/* <div className="sticky top-0 ">
                <div className="flex justify-end items-center gap-x-2">
                        <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md shadow transition duration-200"
                        onClick={openModalAlergias}
                    >
                        Ver Alergias
                    </button>
                    <button
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow transition duration-200"
                        onClick={openModalAlertas}
                    >
                        Ver Alertas
                        </button>
                    </div>
            </div> */}
            {/* Modales */}
            <Modal
                isOpen={isModalAlergiasOpen}
                onRequestClose={closeModalAlergias}
                style={customStyles}
                contentLabel="Alergias"
            >
                <h2 className="text-2xl font-bold mb-4">Alergias</h2>
                <button
                    onClick={closeModalAlergias}
                    className="bg-gray-500 text-white font-semibold py-1 px-3 rounded mb-4"
                >
                    Cerrar
                </button>
                <ul className="list-disc pl-5">
                    {alergias.map((alergia, index) => (
                        <li key={index} className="text-lg">
                            {alergia}
                        </li>
                    ))}
                </ul>
            </Modal>

            <Modal
                isOpen={isModalAlertasOpen}
                onRequestClose={closeModalAlertas}
                style={customStyles}
                contentLabel="Alertas"
            >
                <h2 className="text-2xl font-bold mb-4">Alertas</h2>
                <button
                    onClick={closeModalAlertas}
                    className="bg-gray-500 text-white font-semibold py-1 px-3 rounded mb-4"
                >
                    Cerrar
                </button>
                <ul className="list-disc pl-5">
                    {alertas.map((alerta, index) => (
                        <li key={index} className="text-lg">
                            {alerta}
                        </li>
                    ))}
                </ul>
            </Modal>


            <h2 className="mt-5 text-2xl font-bold text-blue-700 text-center pb-2 border-b-2 border-blue-200">HISTORIA CLINICA MEDICINA</h2>
            <hr className="my-6" />

            {/* Tabla de Documentos Cargados */}
            {documentos && documentos.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Documentos cargados por el paciente</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg">
                            <thead className="bg-gray-200 text-center">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-sm font-medium text-gray-900 uppercase tracking-wider">Documento</th>
                                    <th scope="col" className="px-6 py-3 text-sm font-medium text-gray-900 uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-300">
                                {documentos.map((document, index) => (
                                    <tr key={index} className="divide-x divide-gray-200">
                                        <td className="px-4 py-2 text-center font-medium text-gray-500">Documento {index + 1}</td>
                                        <td className="px-4 py-2 flex justify-center">

                                            <button
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-200"
                                                onClick={() => onHandleClickView(document)}
                                            >
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <form onKeyDown={handleKeyDown} onSubmit={handleSubmit(onSubmit)}>
                {/* Pagador */}

                {/* Fecha y hora de registro */}
                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Fecha y hora de registro</label>
                    <input
                        type="datetime-local"
                        readOnly
                        value={fechaActual}
                        {...register('fechaRegistro')}
                        className={styles.dateTimeInput}
                    />
                </div>
                <div className={styles.dataSection}>
                    <h3 className="text-lg font-semibold mb-4">Selección de Paciente</h3>

                    <div className="flex flex-col mb-4">
                        <label className={styles.formLabel}>Seleccionar paciente</label>
                        <div className="relative">
                            {isLoadingPacientes ? (
                                <div className="flex items-center justify-center py-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                                    <span className="ml-2 text-gray-600">Cargando pacientes...</span>
                                </div>
                            ) : (
                                <Select
                                    value={pacienteSeleccionado ? {
                                        value: pacienteSeleccionado._id,
                                        label: `${pacienteSeleccionado.firstName} ${pacienteSeleccionado.lastName} - ${pacienteSeleccionado.idType}: ${pacienteSeleccionado.idNumber}`
                                    } : null}
                                    onChange={(selectedOption) => {
                                        if (selectedOption) {
                                            const paciente = pacientes.find(p => p._id === selectedOption.value);
                                            if (paciente) seleccionarPaciente(paciente);
                                        } else {
                                            limpiarSeleccion();
                                        }
                                    }}
                                    options={pacientes.map(paciente => ({
                                        value: paciente._id,
                                        label: `${paciente.firstName} ${paciente.lastName} - ${paciente.idType}: ${paciente.idNumber}`
                                    }))}
                                    placeholder="Buscar paciente por nombre o identificación"
                                    isClearable
                                    className="basic-single"
                                    classNamePrefix="select"
                                />
                            )}
                        </div>
                    </div>

                    {/* Paciente seleccionado */}
                    {pacienteSeleccionado && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium text-green-800">Paciente seleccionado</h4>
                                <button
                                    type="button"
                                    onClick={limpiarSeleccion}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    Limpiar selección
                                </button>
                            </div>
                            <p className="mt-1">
                                <span className="font-medium">Nombre:</span> {pacienteSeleccionado.firstName} {pacienteSeleccionado.lastName}
                            </p>
                            <p>
                                <span className="font-medium">Identificación:</span> {pacienteSeleccionado.idType}: {pacienteSeleccionado.idNumber}
                            </p>
                        </div>
                    )}
                </div>

                {/* Botones para historias clínicas previas */}
                <div className="flex gap-4 mt-4">
                    <button
                        type="button"
                        onClick={async () => {
                            console.log('Botón clickeado');
                            await cargarHistoriasPrevias();
                            setMostrarHistoriasPrevias(!mostrarHistoriasPrevias);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                    >
                        {mostrarHistoriasPrevias ? 'Ocultar Historias Previas' : 'Ver Historias Previas'}
                    </button>
                </div>

                {/* Modal de historias clínicas previas */}
                {mostrarHistoriasPrevias && (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4">Historias Clínicas Previas</h3>
                        {historiasPrevias.length > 0 ? (
                            <div className="space-y-4">
                                {historiasPrevias.map((historia) => (
                                    <div key={historia._id} className="border p-4 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">Fecha: {new Date(historia.fechaRegistro).toLocaleDateString()}</p>
                                                <p>Doctor: {historia.profesional.nombre}</p>
                                                <p>Especialidad: {historia.profesional.especialidad}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        importarHistoriaClinica(historia);
                                                    }}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                                                >
                                                    Importar
                                                </button>
                                                {historia.pdfUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            abrirHistoriaClinica(historia.pdfUrl);
                                                        }}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                                                    >
                                                        Ver PDF
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No hay historias clínicas previas registradas.</p>
                        )}
                    </div>
                )}

                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Tipo de Actividad</label>
                    <div className="relative">
                        <select
                            {...register('tipoActividad')}
                            value={tipoActividad}
                            onChange={(e) => setTipoActividad(e.target.value)}
                            className="appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        >
                            <option value="">Seleccione tipo de actividad</option>
                            <option value="Primera Vez">Primera Vez</option>
                            <option value="Control">Control</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>
                {tipoActividad === 'Primera Vez' && (
                    <>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Pagador</label>
                            <div className="relative">
                                <select
                                    {...register('pagador')}
                                    value={pagador}
                                    onChange={(e) => setPagador(e.target.value)}
                                    className="appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                >
                                    <option value="">Seleccione pagador</option>
                                    <option value="Particular">Particular</option>
                                    <option value="Convenio">Convenio</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Acompañamiento en la Consulta</label>
                    <div className="relative">
                        <select
                            {...register('acompanamientoEnConsulta')}
                            value={acompanamiento}
                            onChange={(e) => setAcompanamiento(e.target.value)}
                            className="appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        >
                            <option value="">Seleccione tipo de acompañamiento</option>
                            <option value="Solo">Solo</option>
                            <option value="Acompañado con familiar">Acompañado con familiar</option>
                            <option value="Acompañado con profesional de la salud">Acompañado con profesional de la salud</option>
                            <option value="En consulta con médico">En consulta con médico</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>


                <hr className="my-4" />

                {/* Datos del Paciente */}
                <h3 className={styles.sectionTitle}>DATOS DEL PACIENTE</h3>

              

                <div className={styles.dataSection}>
                    <div className="flex flex-col mt-4">
                        <label className={styles.formLabel}>Tipo de Identificación</label>
                        <input
                            {...register('tipoIdentificacion')}
                            type="text"
                            value={appointmentInfo.idType || "No especificado"}
                            readOnly={isFieldReadOnly('tipoIdentificacion')}
                            className={`${styles.formInput}  ${isFieldReadOnly('tipoIdentificacion') ? readOnlyStyle : ''}`}
                        />
                    </div>


                    <div className="flex flex-col mt-4">
                        <label className={styles.formLabel}>Número de Identificación</label>
                        <input
                            {...register('numeroIdentificacion')}
                            type="text"
                            value={appointmentInfo.documentNumber}
                            readOnly={isFieldReadOnly('numeroIdentificacion')}
                            className={`${styles.formInput} ${isFieldReadOnly('numeroIdentificacion') ? readOnlyStyle : ''}`}
                        />
                    </div>
                    {tipoActividad === 'Primera Vez' && (
                        <>
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Fecha de nacimiento</label>
                                <input
                                    type="date"
                                    {...register('fechaNacimiento')}
                                    defaultValue={pacienteSeleccionado?.birthDate ? moment(pacienteSeleccionado.birthDate).format('YYYY-MM-DD') : ''}
                                    readOnly={isFieldReadOnly('fechaNacimiento')}
                                    className={`${styles.formInput} ${isFieldReadOnly('fechaNacimiento') ? readOnlyStyle : ''}`}
                                />
                            </div>
                        </>
                    )}
                    {tipoActividad === 'Primera Vez' && (
                        <>
                            <div className="flex flex-col mt-4">
                                <label className={`${styles.formLabel} ${isFieldReadOnly('grupoSanguineo') ? readOnlyLabelStyle : ''}`}>Grupo sanguíneo</label>
                                <div className="relative">
                                    <select
                                        {...register('grupoSanguineo')}
                                        defaultValue={appointmentInfo.grupoSanguineo || ''}
                                        className={`appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${isFieldReadOnly('grupoSanguineo') ? readOnlyStyle : ''}`}
                                        disabled={isFieldReadOnly('grupoSanguineo')}
                                    >
                                        <option value="">Seleccione grupo sanguíneo</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="AB">AB</option>
                                        <option value="O">O</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>


                            <div className="flex flex-col mt-4">
                                <label className={`${styles.formLabel} ${isFieldReadOnly('rh') ? readOnlyLabelStyle : ''}`}>RH</label>
                                <div className="relative">
                                    <select
                                        {...register('rh')}
                                        defaultValue={appointmentInfo.rh || ''}
                                        className={`appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${isFieldReadOnly('rh') ? readOnlyStyle : ''}`}
                                        disabled={isFieldReadOnly('rh')}
                                    >
                                        <option value="">Seleccione RH</option>
                                        <option value="Positivo">Positivo</option>
                                        <option value="Negativo">Negativo</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col mt-4">
                        <label className={styles.formLabel}>Nombres *</label>
                        <input {...register('primerNombre')}
                            value={appointmentInfo.firstName}
                            readOnly={isFieldReadOnly('primerNombre')}
                            className={`${styles.formInput} ${isFieldReadOnly('primerNombre') ? readOnlyStyle : ''}`}
                        />
                    </div>



                    <div className="flex flex-col mt-4">
                        <label className={styles.formLabel}>Apellidos</label>
                        <input {...register('primerApellido')}
                            value={appointmentInfo.firstLastName}
                            readOnly={isFieldReadOnly('primerApellido')}
                            className={`${styles.formInput} ${isFieldReadOnly('primerApellido') ? readOnlyStyle : ''}`}
                        />
                    </div>



                    {/*<div className="flex flex-col mt-4">
                        <label className="form-label">Edad actual</label>
                        <input {...register('edadActual')} className="form-input" />
                    </div>*/}
                    {tipoActividad === 'Primera Vez' && (
                        <>
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Género</label>
                                <input
                                    {...register('genero')}
                                    defaultValue={translateGender(appointmentInfo.gender)}
                                    readOnly={isFieldReadOnly('genero')}
                                    className={`${styles.formInput} ${isFieldReadOnly('genero') ? readOnlyStyle : ''}`}
                                />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Sexo</label>
                                <select
                                    {...register('sex')}
                                    defaultValue={appointmentInfo.sex || ''}
                                    disabled={isFieldReadOnly('sex')}
                                    className={`appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${isFieldReadOnly('sex') ? readOnlyStyle : ''}`}
                                >
                                    <option value="">Seleccione sexo</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Intersexual">Intersexual</option>
                                    <option value="No especificado">No especificado</option>
                                </select>
                                
                            </div>


                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Estado Civil</label>
                                <select
                                    {...register('estadoCivil')}
                                    defaultValue={appointmentInfo.estadoCivil || ''}
                                    className={`${styles.formInput} ${isFieldReadOnly('estadoCivil') ? readOnlyStyle : ''}`}
                                    disabled={isFieldReadOnly('estadoCivil')}
                                >
                                    <option value="">Seleccione estado civil</option>
                                    <option value="Soltero/a">Soltero/a</option>
                                    <option value="Casado/a">Casado/a</option>
                                    <option value="Unión libre">Unión libre</option>
                                    <option value="Separado/a">Separado/a</option>
                                    <option value="Divorciado/a">Divorciado/a</option>
                                    <option value="Viudo/a">Viudo/a</option>
                                </select>
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Zona de ubicación</label>
                                <select
                                    {...register('zona')}
                                    className={`${styles.formInput} ${isFieldReadOnly('zona') ? readOnlyStyle : ''}`}
                                    disabled={isFieldReadOnly('zona')}
                                >
                                    <option value="">Seleccione una zona</option>
                                    <option value="Urbana">Urbana</option>
                                    <option value="Rural">Rural</option>
                                    <option value="Rural dispersa">Rural dispersa</option>
                                    <option value="Urbana marginal">Urbana marginal</option>
                                    <option value="Centro poblado">Centro poblado</option>
                                </select>
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Dirección</label>
                                <input
                                    {...register('direccion')}
                                    type="text"
                                    defaultValue={appointmentInfo.direccion}
                                    readOnly={isFieldReadOnly('direccion')}
                                    className={`${styles.formInput} ${isFieldReadOnly('direccion') ? readOnlyStyle : ''}`}
                                />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Barrio</label>
                                <input
                                    {...register('barrio')}
                                    defaultValue={appointmentInfo.neighborhood}
                                    className={styles.formInput}
                                />
                            </div>

                            {/*<div className="flex flex-col mt-4">
                        <label className="form-label">Localidad</label>
                        <input {...register('localidad')} className="form-input" />
                    </div>*/}

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Correo electrónico</label>
                                <input
                                    type="email"
                                    {...register('email')}
                                    defaultValue={appointmentInfo.email || ''}
                                    className={`${styles.formInput} ${isFieldReadOnly('email') ? readOnlyStyle : ''}`}
                                    readOnly={isFieldReadOnly('email')}
                                />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Teléfono 1 *</label>
                                <input {...register('telefono1')}
                                    value={appointmentInfo.cellNumber}
                                    readOnly={isFieldReadOnly('telefono1')}
                                    className={`${styles.formInput} ${isFieldReadOnly('telefono1') ? readOnlyStyle : ''}`}
                                />
                            </div>


                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Teléfono 2</label>
                                <input
                                    {...register('cellNumber1')}
                                    defaultValue={appointmentInfo.cellNumber1}
                                    readOnly={isFieldReadOnly('cellNumber1')}
                                    className={`${styles.formInput} ${isFieldReadOnly('cellNumber1') ? readOnlyStyle : ''}`}
                                />
                            </div>

                            {/* Select para Escolaridad */}
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Escolaridad</label>
                                <select
                                    {...register('escolaridad')}
                                    defaultValue={appointmentInfo.escolaridad || ''}
                                    className={`${styles.formInput} ${isFieldReadOnly('escolaridad') ? readOnlyStyle : ''}`}
                                    disabled={isFieldReadOnly('escolaridad')}
                                >
                                    <option value="">Seleccione nivel de escolaridad</option>
                                    <option value="Sin estudios">Sin estudios</option>
                                    <option value="Primaria incompleta">Primaria incompleta</option>
                                    <option value="Primaria completa">Primaria completa</option>
                                    <option value="Secundaria incompleta">Secundaria incompleta</option>
                                    <option value="Secundaria completa">Secundaria completa</option>
                                    <option value="Técnico/Tecnológico incompleto">Técnico/Tecnológico incompleto</option>
                                    <option value="Técnico/Tecnológico completo">Técnico/Tecnológico completo</option>
                                    <option value="Universitario incompleto">Universitario incompleto</option>
                                    <option value="Universitario completo">Universitario completo</option>
                                    <option value="Postgrado">Postgrado</option>
                                    <option value="Maestría">Maestría</option>
                                    <option value="Doctorado">Doctorado</option>
                                </select>
                            </div>

                            {/* Select para Ocupación */}
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Ocupación</label>
                                <select
                                    {...register('ocupacion')}
                                    defaultValue={appointmentInfo.ocupacion || ''}
                                    className={`${styles.formInput} ${isFieldReadOnly('ocupacion') ? readOnlyStyle : ''}`}
                                    disabled={isFieldReadOnly('ocupacion')}
                                >
                                    <option value="">Seleccione ocupación</option>
                                    <option value="Empleado">Empleado</option>
                                    <option value="Trabajador independiente">Trabajador independiente</option>
                                    <option value="Empresario">Empresario</option>
                                    <option value="Estudiante">Estudiante</option>
                                    <option value="Ama de casa">Ama de casa</option>
                                    <option value="Jubilado/Pensionado">Jubilado/Pensionado</option>
                                    <option value="Desempleado">Desempleado</option>
                                    <option value="Profesional de la salud">Profesional de la salud</option>
                                    <option value="Docente">Docente</option>
                                    <option value="Funcionario público">Funcionario público</option>
                                    <option value="Comerciante">Comerciante</option>
                                    <option value="Agricultor">Agricultor</option>
                                    <option value="Obrero">Obrero</option>
                                    <option value="Técnico">Técnico</option>
                                    <option value="Profesional">Profesional</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            {/* Select para Condición de Desplazamiento */}
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Condición de desplazamiento</label>
                                <select
                                    {...register('condicionDesplazamiento')}
                                    defaultValue={appointmentInfo.condicionDesplazamiento || ''}
                                    className={`${styles.formInput} ${isFieldReadOnly('condicionDesplazamiento') ? readOnlyStyle : ''}`}
                                    disabled={isFieldReadOnly('condicionDesplazamiento')}
                                >
                                    <option value="">Seleccione una condición</option>
                                    <option value="No aplica">No aplica</option>
                                    <option value="Desplazamiento forzado">Desplazamiento forzado</option>
                                    <option value="Víctima de conflicto armado">Víctima de conflicto armado</option>
                                    <option value="Migrante internacional">Migrante internacional</option>
                                    <option value="Refugiado">Refugiado</option>
                                    <option value="Solicitante de asilo">Solicitante de asilo</option>
                                    <option value="Retornado">Retornado</option>
                                    <option value="Desplazamiento por desastre natural">Desplazamiento por desastre natural</option>
                                    <option value="Desplazamiento por proyecto de desarrollo">Desplazamiento por proyecto de desarrollo</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            {/* Select para Grupo Étnico */}
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Grupo étnico</label>
                                <select
                                    {...register('grupoEtnico')}
                                    defaultValue={appointmentInfo.grupoEtnico || ''}
                                    className={`${styles.formInput} ${isFieldReadOnly('grupoEtnico') ? readOnlyStyle : ''}`}
                                    disabled={isFieldReadOnly('grupoEtnico')}
                                >
                                    <option value="">Seleccione un grupo étnico</option>
                                    <option value="Ninguno">Ninguno</option>
                                    <option value="Indígena">Indígena</option>
                                    <option value="ROM (Gitano)">ROM (Gitano)</option>
                                    <option value="Raizal">Raizal</option>
                                    <option value="Palenquero">Palenquero</option>
                                    <option value="Negro, Mulato, Afrocolombiano">Negro, Mulato, Afrocolombiano</option>
                                    <option value="Mestizo">Mestizo</option>
                                    <option value="Blanco">Blanco</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>
                                    Aseguradora
                                </label>
                                <select
                                    {...register('aseguradora')}
                                    defaultValue={appointmentInfo.aseguradora}
                                    className={styles.formInput}
                                >
                                    {aseguradora.map((insurance) => (
                                        <option key={insurance.value} value={insurance.value}>{insurance.label}</option>
                                    ))}
                                </select>
                            </div>
                            {/* <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Tipo de usuario</label>
                                <input
                                    {...register('tipoUsuario')}
                                    defaultValue={appointmentInfo.tipoUsuario}
                                    readOnly={isFieldReadOnly('tipoUsuario')}
                                    className={`${styles.formInput} ${isFieldReadOnly('tipoUsuario') ? readOnlyStyle : ''}`}
                                />
                            </div> */}
                            {pagador === 'Convenio' && (
                                <>
                                    <div className="flex flex-col mt-4">

                                        <label className={styles.formLabel}>Tipo de afiliado</label>
                                        <select {...register('tipoDeAfiliado')} className={`appearance-none w-full bg-white border border-gray-300 hover:border-indigo-500 px-4 py-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${isFieldReadOnly('rh') ? readOnlyStyle : ''}`}>
                                        <option value="">Selecciona un tipo de usuario</option>
                                        <option value="Cotizante">Cotizante</option>
                                        <option value="Beneficiario">Beneficiario</option>
                                        <option value="Adicional">Adicional</option>

                                    </select>
                                </div>
                        </>
                    )}

                    <hr className="my-4" />
                    {acompanamiento === 'Acompañado con familiar' && (
                        <>

                            <h3 className={styles.sectionTitle}>DATOS DEL ACOMPAÑANTE</h3>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Primer nombre </label>
                                <input {...register('acompanantePrimerNombre')} className={`${styles.formInput} ${isFieldReadOnly('acompanantePrimerNombre') ? readOnlyStyle : ''}`} />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Segundo nombre</label>
                                <input {...register('acompananteSegundoNombre')} className={`${styles.formInput} ${isFieldReadOnly('acompananteSegundoNombre') ? readOnlyStyle : ''}`} />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Primer apellido</label>
                                <input {...register('acompanantePrimerApellido')} className={`${styles.formInput} ${isFieldReadOnly('acompanantePrimerApellido') ? readOnlyStyle : ''}`} />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Segundo apellido</label>
                                <input {...register('acompananteSegundoApellido')} className={`${styles.formInput} ${isFieldReadOnly('acompananteSegundoApellido') ? readOnlyStyle : ''}`} />
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Parentesco</label>
                                <select
                                    {...register('parentesco')}
                                    onChange={handleOptionChange}
                                    className={`${styles.formInput} ${isFieldReadOnly('parentesco') ? readOnlyStyle : ''}`}
                                >
                                    <option value="">Selecciona un parentesco</option>
                                    <option value="Padre">Padre</option>
                                    <option value="Madre">Madre</option>
                                    <option value="Hijo/hija">Hijo/hija</option>
                                    <option value="Otro cual">Otro</option>
                                    <option value="Ninguno">Ninguno</option>
                                </select>
                                {selectedOption === "Otro cual" && (
                                    <input
                                        {...register('otroParentesco')}
                                        type="text"
                                        placeholder="Especifica cuál"
                                        className={`${styles.formInput} ${isFieldReadOnly('otroParentesco') ? readOnlyStyle : ''}`}
                                    />
                                )}
                            </div>

                            <div className="flex flex-col mt-4">
                                <label className={styles.formLabel}>Teléfono</label>
                                <input {...register('acompananteTelefono')} className={`${styles.formInput} ${isFieldReadOnly('acompananteTelefono') ? readOnlyStyle : ''}`} />
                            </div>
                        </>
                    )}
                </>
                    )}


                <hr className="my-4" />
                <div className="flex flex-col mt-4">
                    <h3 className={styles.sectionTitle}>MOTIVO QUE ORIGINA LA ATENCIÓN</h3>
                    <select {...register('motivoAtencion')} className={styles.formInput}>
                        <option value="">Selecciona un motivo</option>
                        <option value="21_Accidente de trabajo">21 - Accidente de trabajo</option>
                        <option value="22_Accidente en el hogar">22 - Accidente en el hogar</option>
                        <option value="23_Accidente de tránsito de origen común">23 - Accidente de tránsito de origen común</option>
                        <option value="24_Accidente de tránsito de origen laboral">24 - Accidente de tránsito de origen laboral</option>
                        <option value="25_Accidente en el entorno educativo">25 - Accidente en el entorno educativo</option>
                        <option value="26_Otro tipo de accidente">26 - Otro tipo de accidente</option>
                        <option value="27_Evento catastrófico de origen natural">27 - Evento catastrófico de origen natural</option>
                        <option value="28_Lesión por agresión">28 - Lesión por agresión</option>
                        <option value="29_Lesión auto infligida">29 - Lesión auto infligida</option>
                        <option value="30_Sospecha de violencia física">30 - Sospecha de violencia física</option>
                        <option value="31_Sospecha de violencia psicológica">31 - Sospecha de violencia psicológica</option>
                        <option value="32_Sospecha de violencia sexual">32 - Sospecha de violencia sexual</option>
                        <option value="33_Sospecha de negligencia y abandono">33 - Sospecha de negligencia y abandono</option>
                        <option value="34_IVE relacionado con peligro a la Salud o vida de la mujer">34 - IVE relacionado con peligro a la Salud o vida de la mujer</option>
                        <option value="35_IVE por malformación congénita incompatible con la vida">35 - IVE por malformación congénita incompatible con la vida</option>
                        <option value="36_IVE por violencia sexual, incesto o por inseminación artificial o transferencia de ovulo fecundado no consentida">
                            36 - IVE por violencia sexual, incesto o por inseminación artificial o transferencia de ovulo fecundado no consentida
                        </option>
                        <option value="37_Evento adverso en salud">37 - Evento adverso en salud</option>
                        <option value="38_Enfermedad general">38 - Enfermedad general</option>
                        <option value="39_Enfermedad laboral">39 - Enfermedad laboral</option>
                        <option value="40_Promoción y mantenimiento de la salud – intervenciones individuales">
                            40 - Promoción y mantenimiento de la salud – intervenciones individuales
                        </option>
                        <option value="41_Intervención colectiva">41 - Intervención colectiva</option>
                        <option value="42_Atención de población materno perinatal">42 - Atención de población materno perinatal</option>
                        <option value="43_Riesgo ambiental">43 - Riesgo ambiental</option>
                        <option value="44_Otros eventos Catastróficos">44 - Otros eventos Catastróficos</option>
                        <option value="45_Accidente de mina antipersonal – MAP">45 - Accidente de mina antipersonal – MAP</option>
                        <option value="46_Accidente de Artefacto Explosivo Improvisado – AEI">
                            46 - Accidente de Artefacto Explosivo Improvisado – AEI
                        </option>
                        <option value="47_Accidente de Munición Sin Explotar- MUSE">47 - Accidente de Munición Sin Explotar- MUSE</option>
                        <option value="48_Otra víctima de conflicto armado colombiano">
                            48 - Otra víctima de conflicto armado colombiano
                        </option>
                    </select>
                </div>

                <hr className="my-4" />

                {/* Servicio */}
                <h3 className={styles.sectionTitle}>SERVICIO</h3>
                {/*<div className="flex flex-col mt-4">
                        <label className="form-label">Modalidad de prestación</label>
                        <select {...register('modalidad')} className="form-input">
                            <option value="">Selecciona una modalidad</option>
                            <option value="Telemedicina: Interactiva">Telemedicina: Interactiva</option>
                            <option value="Telemedicina: No interactiva">Telemedicina: No interactiva</option>
                            <option value="Telemedicina: Telexperticia">Telemedicina: Telexperticia</option>
                        </select>
                    </div>*/}
                <div className="flex flex-col mt-4">

                    <input {...register('servicio')}
                        value={(appointmentInfo.service)}
                        readOnly
                        className={styles.formInput} />
                </div>
                {tipoActividad === 'Primera Vez' && (
                    <>
                        <hr className="my-4" />
                        <h3 className={styles.sectionTitle}>MOTIVO DE CONSULTA</h3>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Motivo de consulta</label>
                            <textarea
                                {...register('motivoConsulta')}
                                className={styles.formInput}
                                readOnly={citaData && citaData.motivo ? true : false} // Opcional: hacer de solo lectura si viene de citaData
                            />
                        </div>

                        <hr className="my-4" />
                        <h3 className={styles.sectionTitle}>ENFERMEDAD ACTUAL</h3>
                        <textarea {...register('enfermedadActual')}
                            className={styles.formInput} />
                        <hr className="my-4" />
                        <div
                            className="flex justify-between items-center cursor-pointer mb-4"
                            onClick={toggleTableVisibility}
                        >
                            <h3 className={styles.sectionTitle}>REVISION POR SISTEMAS</h3>
                            {/* Icono de flecha que cambia según la visibilidad */}
                            <span>{isTableVisible ? '⬇️' : '➡️'}</span>
                        </div>

                        {/* Tabla que se oculta o muestra dependiendo del estado */}
                        {isTableVisible && (
                            <table className="w-full border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-300 p-2">Sistema</th>
                                        <th className="border border-gray-300 p-2">Sí/No</th>
                                        <th className="border border-gray-300 p-2">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        "Órganos de los sentidos",
                                        "Piel y faneras",
                                        "Cardiopulmonar",
                                        "Gastrointestinal",
                                        "Genitourinario",
                                        "Musculo esquelético",
                                        "Neurológico",
                                    ].map((sistema, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 p-2">{sistema}</td>
                                            <td className="border border-gray-300 p-2">
                                                <select
                                                    {...register(`sistemas.${index}.seleccion`)}
                                                    className="w-full p-1 border border-gray-300 rounded-md"
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        setValue(`sistemas.${index}.seleccion`, newValue);
                                                        if (newValue === "Sí") {
                                                            setValue(`sistemas.${index}.observaciones`, "");
                                                        } else {
                                                            setValue(`sistemas.${index}.observaciones`, null);
                                                        }
                                                    }}
                                                >
                                                    <option value="no">No</option>
                                                    <option value="Sí">Sí</option>
                                                </select>
                                            </td>
                                            <td className="border border-gray-300 p-2">
                                                <input
                                                    {...register(`sistemas.${index}.sistema`)}
                                                    type="hidden"
                                                    defaultValue={sistema}
                                                />
                                                <input
                                                    {...register(`sistemas.${index}.observaciones`)}
                                                    type="text"
                                                    className="w-full p-1 border border-gray-300 rounded-md"
                                                    placeholder={sistema}
                                                    disabled={watch(`sistemas.${index}.seleccion`) !== "Sí"}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}



                        <hr className="my-4" />
                        <div
                            className="flex justify-between items-center cursor-pointer mb-4"
                            onClick={toggleTableVisibility1}
                        >
                            <h3 className={styles.sectionTitle}>ANTECEDENTES</h3>
                            {/* Icono de flecha que cambia según la visibilidad */}
                            <span>{isTableVisible1 ? '⬇️' : '➡️'}</span>
                        </div>

                        {isTableVisible1 && (
                            <table className="w-full border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-300 p-2"></th>
                                        <th className="border border-gray-300 p-2">Personal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        "Patológicos",
                                        "Farmacológicos",
                                        "Quirúrgicos",
                                        "Tóxicos",  // Nueva fila para Tóxicos
                                        "Alérgicos", // Nueva fila para Alérgicos
                                        "Hospitalarios",
                                        "Transfusionales",
                                        "Preventivos",
                                    ].map((category, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 p-2">{category}</td>
                                            <td className="border border-gray-300 p-2">
                                                <input type="hidden" {...register(`antecedentes.${index}.tipo`)} value={category} />
                                                <select
                                                    {...register(`antecedentes.${index}.personalCheck`)}
                                                    className="w-full p-1 border border-gray-300 rounded-md"
                                                    onChange={(e) => handleAntecedentesChange(e, index, 'personal')}
                                                >
                                                    <option value="no">No</option>
                                                    <option value="si">Sí</option>
                                                </select>
                                                {antecedentes[index]?.personal && antecedentes[index].personal === "si" && (
                                                    <input
                                                        {...register(`antecedentes.${index}.personalDescripcion`)}
                                                        type="text"
                                                        placeholder="Descripción"
                                                        className="w-full p-1 border border-gray-300 rounded-md mt-2"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {appointmentInfo.gender === 'femenino' && (
                            <>
                                <table className="w-full border-collapse border border-gray-300 mb-4">
                                    <thead>
                                        <tr>
                                            <th className="border font-semibold border-gray-300 p-2" colSpan={9}>Ginecoobstétricos</th>
                                        </tr>
                                        <tr>
                                            <th className="border border-gray-300 p-2">G</th>
                                            <th className="border border-gray-300 p-2">P</th>
                                            <th className="border border-gray-300 p-2">A</th>
                                            <th className="border border-gray-300 p-2">C</th>
                                            <th className="border border-gray-300 p-2">V</th>
                                            <th className="border border-gray-300 p-2">M</th>
                                            <th className="border border-gray-300 p-2">FUR</th>
                                            <th className="border border-gray-300 p-2">FUP</th>
                                            <th className="border border-gray-300 p-2">FPP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="text"
                                                    {...register("ginecoobstetricos.0.g")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="text"
                                                    {...register("ginecoobstetricos.0.p")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="text"
                                                    {...register("ginecoobstetricos.0.a")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="text"
                                                    {...register("ginecoobstetricos.0.c")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="text"
                                                    {...register("ginecoobstetricos.0.v")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="text"
                                                    {...register("ginecoobstetricos.0.m")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="date"
                                                    {...register("ginecoobstetricos.0.fur")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="date"
                                                    {...register("ginecoobstetricos.0.fup")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-1 text-xs">
                                                <input
                                                    type="date"
                                                    {...register("ginecoobstetricos.0.fpp")} // Cambia aquí
                                                    className="w-full p-1 border border-gray-300 rounded-md text-sm"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="flex flex-col mt-4">
                                    <label className={styles.formLabel}>Planificación
                                    </label>
                                    <input {...register('planificacion')} className={styles.formInput} />
                                </div>
                                <div className="flex flex-col mt-4">
                                    <label className={styles.formLabel}>Ciclos
                                    </label>
                                    <input {...register('ciclos')} className={styles.formInput} />
                                </div>
                            </>
                        )}
                        <hr className="my-4" />
                        <h3 className={styles.sectionTitle}>ANTECEDENTES FAMILIARES</h3>
                        <div className="flex items-center mb-4">
                            <label className={`${styles.formLabel} mr-2`}>¿Tiene antecedentes familiares?</label>
                            <input
                                type="checkbox"
                                onChange={(e) => handleCheckboxChange(e, 'familiares')}
                                checked={mostrarFamiliares}
                                className="mr-2"
                            />
                            <label>{mostrarFamiliares ? "No" : "Sí"}</label>
                        </div>

                        {mostrarFamiliares && (
                            <div className="flex flex-col mt-4">
                                <textarea
                                    {...register('familiares')}
                                    className={styles.formInput}
                                    placeholder="Describa los antecedentes familiares"
                                />
                            </div>
                        )}

                        <hr className="my-4" />
                        <h3 className={styles.sectionTitle}>ANTECEDENTES PSICOSOCIALES</h3>
                        <div className="flex items-center mb-4">
                            <label className={`${styles.formLabel} mr-2`}>¿Tiene antecedentes psicosociales?</label>
                            <input
                                type="checkbox"
                                onChange={(e) => handleCheckboxChange(e, 'psicosociales')}
                                checked={mostrarPsicosociales}
                                className="mr-2"
                            />
                            <label>{mostrarPsicosociales ? "No" : "Sí"}</label>
                        </div>

                        {mostrarPsicosociales && (
                            <div className="flex flex-col mt-4">
                                <textarea
                                    {...register('psicosociales')}
                                    className={styles.formInput}
                                    placeholder="Describa los antecedentes psicosociales"
                                />
                            </div>
                        )}
                    </>
                )}


                <hr className="my-4" />


                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>EXAMEN FISICO
                </h3>
                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Estado de conciencia</label>
                    <select {...register('estadoDeConciencia')} className={styles.formInput}>
                        <option value="">Selecciona un estado</option>
                        <option value="Alerta">Alerta</option>
                        <option value="Consiente">Consiente</option>
                        <option value="Orientado">Orientado</option>
                        <option value="Comatoso">Comatoso</option>
                        <option value="Somnolencia (obnubilación)">Somnolencia (obnubilación)</option>
                        <option value="Estupor">Estupor</option>
                        <option value="Delirio">Delirio</option>
                    </select>
                </div>
                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Tiene equipos para tomar signos vitales</label>
                    <select
                        {...register('equiposSignos')}
                        className={styles.formInput}
                        onChange={handleEquiposChange}
                    >
                        <option value="">Seleccione una opción</option>
                        <option value="Si">Si</option>
                        <option value="No">No</option>
                    </select>
                </div>
                {equipos === 'Si' && (
                    <>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>TAS - mming</label>
                            <input
                                type="number"
                                {...register('tasMming')}
                                className={styles.formInput}
                            />
                        </div>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>TAD</label>
                            <input
                                type="number"
                                {...register('tad')}
                                className={styles.formInput}
                            />
                        </div>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>FC/min</label>
                            <input
                                type="number"
                                {...register('fcMin')}
                                className={styles.formInput}
                            />
                        </div>


                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>FR/min

                            </label>
                            <input {...register('frMin')} className={styles.formInput} />
                        </div>
                        {/*<div className="flex flex-col mt-4">
                        <label className="form-label">Saturación
                        </label>
                        <input {...register('saturacion')} className="form-input" />
                    </div>*/}
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Temperatura
                            </label>
                            <input {...register('temperatura')} className={styles.formInput} />
                        </div>

                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Peso Kg</label>
                            <input
                                {...register('pesoKg')}
                                className={styles.formInput}
                                type="text" // Cambiado de number a text para permitir puntos y comas
                                onChange={(e) => handleDecimalInput(e, 'pesoKg')}
                            />
                        </div>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Talla cms</label>
                            <input
                                {...register('tallaCm')}
                                className={styles.formInput}
                                type="text" // Cambiado de number a text para permitir puntos y comas
                                onChange={(e) => handleDecimalInput(e, 'tallaCm')}
                            />
                        </div>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>IMC</label>
                            <input
                                {...register('imc')}
                                className={styles.formInput}
                                readOnly // Hacer que el campo sea de solo lectura
                            />
                        </div>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Percentil Peso/Talla</label>
                            <input
                                {...register('percentilPesoTalla')}
                                className={styles.formInput}
                                type="text"
                                placeholder="Ej: P75, P50-75, etc."
                            />
                        </div>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Perimetro Cefalico</label>
                            <input
                                {...register('perimetroCefalico')}
                                className={styles.formInput}
                                type="text"
                                
                            />
                        </div>
                    </>
                )}
                {(acompanamiento === 'Acompañado con familiar' || acompanamiento === 'Solo') && (
                    <>
                        <div className="flex flex-col mt-4">
                            <label className={styles.formLabel}>Inspeccion General</label>
                            <textarea
                                {...register('inspeccionGeneral')}
                                className={styles.formInput}
                            />
                        </div>
                    </>
                )}
                <hr className="my-4" />
                {acompanamiento === 'Acompañado con profesional de la salud' && (
                    <>
                        <table className="w-full border-collapse border border-gray-300 mb-4">
                            <thead>
                                <tr>
                                    <th className="border border-gray-300 p-2">Sistema</th>
                                    <th className="border border-gray-300 p-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* <tr>
                            <td className="border border-gray-300 p-2">Cabeza y cuello</td>
                            <td className="border border-gray-300 p-2">
                    <input
                        type="text"
                                    {...register("examenMedico.cabezaYCuello")}
                                    className="w-full p-1 border border-gray-300 rounded-md"
                                />
                            </td>
                        </tr>*/}
                                <tr>
                                    <td className="border border-gray-300 p-2">Tórax y cardio vascular</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.toraxCardioVascular")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Abdomen</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.abdomen")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Cabeza y cuello</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.cabezaCuello")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Genitales</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.genitales")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Extremidades</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.extremidades")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Piel y faneras</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.pielFaneras")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Neurológico</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.neurologico")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 p-2">Examen mental</td>
                                    <td className="border border-gray-300 p-2">
                                        <input
                                            type="text"
                                            {...register("examenMedico.examenMental")}
                                            className="w-full p-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                )}
                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>RESULTADOS PARACLÍNICOS

                </h3>
                <div className="mb-4">
                    {resultadosParaclinicos && resultadosParaclinicos.length > 0 ? (
                        <div className="bg-gray-100 p-4 rounded-md shadow-sm">
                            <p className="font-medium text-gray-600">Resultados paraclínicos anteriores:</p>
                            {resultadosParaclinicos.map((resultado, index) => (
                                <p key={index} className="text-gray-700">{resultado}</p>
                            ))}
                        </div>
                    ) : (
                        <p>No hay resultados paraclínicos registrados anteriormente.</p>
                    )}
                </div>
                <div className="flex flex-col mt-4">

                    <textarea {...register('resultadosParaclinicos')} className={styles.formInput} />
                </div>
                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>ALERTAS</h3>
                <div className="mb-4">
                    {alertas && alertas.length > 0 ? (
                        <div className="bg-gray-100 p-4 rounded-md shadow-sm">
                            <p className="font-medium text-gray-600">Alertas anteriores:</p>
                            {alertas.map((resultado, index) => (
                                <p key={index} className="text-gray-700">{resultado}</p>
                            ))}
                        </div>
                    ) : (
                        <p>No hay resultados registrados anteriormente.</p>
                    )}
                </div>
                <div className="flex items-center mb-4">
                    <label className={styles.formLabel} style={{ marginRight: "8px" }}>¿Tiene alertas?</label>
                    <input
                        type="checkbox"
                        onChange={(e) => handleCheckboxChange(e, 'alertas')}
                        checked={mostrarAlertas}
                        className="mr-2"
                    />
                    <span>{mostrarAlertas ? "No" : "Sí"}</span>
                </div>

                {mostrarAlertas && (
                    <div className="flex flex-col mt-4">
                        <textarea
                            {...register('alertas')}
                            className={styles.formInput}
                            placeholder="Describa las alertas"
                        />
                    </div>
                )}

                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>ALERGIAS</h3>
                <div className="mb-4">
                    {alergias && alergias.length > 0 ? (
                        <div className="bg-gray-100 p-4 rounded-md shadow-sm">
                            <p className="font-medium text-gray-600">Alergias anteriores:</p>
                            {alergias.map((resultado, index) => (
                                <p key={index} className="text-gray-700">{resultado}</p>
                            ))}
                        </div>
                    ) : (
                        <p>No hay resultados registrados anteriormente.</p>
                    )}
                </div>
                <div className="flex items-center mb-4">
                    <label className={styles.formLabel} style={{ marginRight: "8px" }}>¿Tiene alergias?</label>
                    <input
                        type="checkbox"
                        onChange={(e) => handleCheckboxChange(e, 'alergias')}
                        checked={mostrarAlergias}
                        className="mr-2"
                    />
                    <span>{mostrarAlergias ? "No" : "Sí"}</span>
                </div>

                {mostrarAlergias && (
                    <div className="flex flex-col mt-4">
                        <textarea
                            {...register('alergias')}
                            className={styles.formInput}
                            placeholder="Describa las alergias"
                        />
                    </div>
                )}
                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>ANÁLISIS Y PLAN</h3>
                <div className="flex flex-col mt-4">

                    <textarea {...register('analisisyplan')} className={styles.formInput} />
                </div>
                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>DIAGNÓSTICOS</h3>

                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>CIE-10 (Código / Nombre):</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                buscarDiagnosticos(e.target.value);
                            }}
                            className={styles.formInput}
                            placeholder="Buscar por código o nombre"
                        />
                        <input
                            type="hidden"
                            {...register('cie10')}
                        />

                        {isSearching && (
                            <div className="absolute right-3 top-3">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                            </div>
                        )}

                        {/* Resultados de búsqueda */}
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {searchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer"
                                        onClick={() => seleccionarDiagnostico(result)}
                                    >
                                        <span className="font-medium">{result.Icd10Code}</span> - {result.Icd10Title}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedCie10 && (
                        <div className="mt-2 p-2 bg-indigo-50 rounded-md">
                            <p className="text-sm font-medium">Seleccionado: {selectedCie10.Icd10Code} - {selectedCie10.Icd10Title}</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col mt-4 space-y-2">
                    <label className={styles.formLabel}>Tipo de diagnóstico</label>
                    <select
                        value={selectedTipo}
                        onChange={(e) => setSelectedTipo(e.target.value)}
                        className={styles.formInput}
                    >
                        <option value="">Selecciona un tipo</option>
                        <option value="01_Impresión diagnóstica">01 Impresión diagnóstica</option>
                        <option value="02_Confirmado nuevo">02 Confirmado nuevo</option>
                        <option value="03_Confirmado repetido">03 Confirmado repetido</option>
                    </select>
                    <button
                        type="button"
                        className={styles.button}
                        onClick={agregarDiagnostico}
                    >
                        Agregar diagnóstico
                    </button>
                </div>


                {/* Lista de diagnósticos agregados */}
                {diagnosticos.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Diagnósticos agregados:</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-max divide-y divide-gray-200 table-fixed">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Diagnóstico
                                        </th>
                                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo de diagnóstico
                                        </th>
                                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Relación
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {diagnosticos.map((diag, index) => (
                                        <tr key={index}>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-red-600 hover:text-red-900 focus:outline-none transition duration-150 ease-in-out"
                                                    onClick={() => eliminarDiagnostico(index)}
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                            <td className="px-2 py-2 whitespace-normal max-w-xs break-words">
                                                <span>{diag.codigo} - {diag.nombre}</span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-normal max-w-xs break-words">
                                                <span>{diag.tipo}</span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <select
                                                    value={diag.relacionado || ''}
                                                    onChange={(e) => actualizarRelacionado(index, e.target.value)}
                                                    className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-2 pr-8 rounded leading-tight focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="">Seleccione una opción</option>
                                                    <option value="Principal">Principal</option>
                                                    <option value="Relacionado 1">Relacionado 1</option>
                                                    <option value="Relacionado 2">Relacionado 2</option>
                                                    <option value="Relacionado 3">Relacionado 3</option>
                                                    <option value="Relacionado 4">Relacionado 4</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}



                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>RECOMENDACIONES</h3>
                <div className="flex flex-col mt-4">

                    <textarea {...register('recomendaciones')} className={styles.formInput} />
                </div>
                <hr className="my-4" />
                <h3 className={styles.sectionTitle}>DATOS DEL PROFESIONAL</h3>
                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Profesional

                    </label>
                    <input {...register('profesional')}
                        value={appointmentInfo.fullName}
                        readOnly
                        className={styles.formInput} />
                </div>
                <div className="flex flex-col mt-4">
                    <label className={styles.formLabel}>Especialidad

                    </label>
                    <input {...register('especialidad')}
                        value={(appointmentInfo.service)}
                        readOnly
                        className={styles.formInput} />
                </div>
                {/*  <div className="flex flex-col mt-4">
                        <label className={styles.formLabel}>Numero RETHUS

                        </label>
                        <input {...register('rethusNumber')}
                            value={appointmentInfo.rethusNumber}
                            readOnly
                            className={styles.formInput} />
                    </div> */}

                {/* 
                    <div className="flex flex-col mt-4">
                        <label className="form-label">Firma</label>
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{ className: 'border border-gray-300 w-full h-40' }}
                        />
                        <button
                            type="button"
                            className="mt-2 p-2 bg-gray-500 text-white rounded"
                            onClick={handleClearSignature}
                        >
                            Limpiar firma
                        </button>
                </div>
    */}
                <hr className="my-4" />

                {/* Botón para enviar */}
                <div className="flex justify-end space-x-4 mt-6">

                    <button
                        type="submit"
                        className={styles.button}
                    >
                        Guardar Historia Clínica
                    </button>
                </div>
        </div>
            </form >
        </div >
    );
};

export default HistoriaClinicaForm;
