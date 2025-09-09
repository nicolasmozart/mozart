import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import '@fortawesome/fontawesome-free/css/all.min.css';
import MeetingContainer from './MeetingContainer';
import MeetingPanel from './MeetingPanel';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';

// Importar los formularios necesarios
import HistoriaClinicaForm from './Formularios/HistoriaClinica';
import Medicamentos from './Formularios/Medicamentos';
import Incapacidad from './Formularios/Incapacidad';
import ExamenesLaboratorio from './Formularios/ExamenesLaboratorio';
import AyudasDiagnosticas from './Formularios/AyudasDiagnosticas';
import Interconsulta from './Formularios/Interconsulta';
import ApoyoTerapeutico from './Formularios/ApoyoTerapeutico';

// Importar los componentes de react-resizable-panels (ya debe estar instalado)
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

// Componentes temporales para el sidebar
const InformacionPersonal = ({ paciente, isLoading }) => (
  <div className="p-4">
    <h2 className="text-xl font-semibold mb-4 text-indigo-800 border-b pb-2">Información Personal</h2>
    <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : paciente ? (
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Nombre completo:</span>
            <span className="text-gray-800 font-semibold">{paciente.firstName} {paciente.lastName}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Tipo de identificación:</span>
            <span className="text-gray-800 font-semibold">{paciente.idType || 'No disponible'}</span>
          </div><div className="flex flex-col">
            <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Numero de identificación:</span>
            <span className="text-gray-800 font-semibold">{paciente.idNumber || 'No disponible'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Teléfono:</span>
            <span className="text-gray-800 font-semibold">{paciente.phone || 'No disponible'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Correo electrónico:</span>
            <span className="text-gray-800 font-semibold">{paciente.email || 'No disponible'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Dirección:</span>
            <span className="text-gray-800 font-semibold">{paciente.address || 'No disponible'}</span>
          </div>
          
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">
          No se pudo cargar la información del paciente
        </p>
      )}
    </div>
  </div>
);

const HistoriaClinica = ({ doctorData, citaData }) => (
  <div className="p-4">
    <h2 className="text-xl font-semibold mb-4 text-indigo-800 border-b pb-2">Historia Clínica</h2>
    <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <HistoriaClinicaForm 
        doctorData={doctorData} 
        citaData={citaData} 
      />
    </div>
  </div>
);

const Prescripciones = ({ doctorData, citaData }) => {
  const [activeSubTab, setActiveSubTab] = useState('medicamentos');

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Prescripciones</h2>
      
      {/* Subpestañas */}
      <div className="flex flex-wrap mb-4 bg-gray-100 rounded-lg p-1">
        <button 
          onClick={() => setActiveSubTab('medicamentos')}
          className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
            activeSubTab === 'medicamentos' ? 'bg-indigo-600 text-white' : 'bg-white'
          }`}
        >
          Medicamentos
        </button>
        <button 
          onClick={() => setActiveSubTab('incapacidad')}
          className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
            activeSubTab === 'incapacidad' ? 'bg-indigo-600 text-white' : 'bg-white'
          }`}
        >
          Incapacidad
        </button>
        <button 
          onClick={() => setActiveSubTab('examenes')}
          className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
            activeSubTab === 'examenes' ? 'bg-indigo-600 text-white' : 'bg-white'
          }`}
        >
          Exámenes de Laboratorio
        </button>
        <button 
          onClick={() => setActiveSubTab('ayudas')}
          className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
            activeSubTab === 'ayudas' ? 'bg-indigo-600 text-white' : 'bg-white'
          }`}
        >
          Ayudas Diagnósticas
        </button>
        <button 
          onClick={() => setActiveSubTab('interconsulta')}
          className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
            activeSubTab === 'interconsulta' ? 'bg-indigo-600 text-white' : 'bg-white'
          }`}
        >
          Interconsulta
        </button>
        <button 
          onClick={() => setActiveSubTab('apoyo')}
          className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
            activeSubTab === 'apoyo' ? 'bg-indigo-600 text-white' : 'bg-white'
          }`}
        >
          Apoyo Terapéutico
        </button>
      </div>
      
      {/* Contenido según la subpestaña seleccionada */}
      <div className="bg-white p-4 rounded-lg shadow">
        {activeSubTab === 'medicamentos' && <Medicamentos doctorData={doctorData} citaData={citaData} />}
        {activeSubTab === 'incapacidad' && <Incapacidad doctorData={doctorData} citaData={citaData} />}
        {activeSubTab === 'examenes' && <ExamenesLaboratorio doctorData={doctorData} citaData={citaData} />}
        {activeSubTab === 'ayudas' && <AyudasDiagnosticas doctorData={doctorData} citaData={citaData} />}
        {activeSubTab === 'interconsulta' && <Interconsulta doctorData={doctorData} citaData={citaData} />}
        {activeSubTab === 'apoyo' && <ApoyoTerapeutico doctorData={doctorData} citaData={citaData} />}
      </div>
    </div>
  );
};

const VideoCall = () => {
  // Estados para la reunión
  const [meetings, setMeetings] = useState([]);
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [currentAttendeeId, setCurrentAttendeeId] = useState(null);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCita, setIsLoadingCita] = useState(false);
  const [error, setError] = useState(null);

  // Estados para la transcripción
  const [transcriptions, setTranscriptions] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Estados para controles de audio/video
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [availableDevices, setAvailableDevices] = useState({
    audioInputs: [],
    videoInputs: []
  });
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioOutputDevice, setSelectedAudioOutputDevice] = useState('');

  // Referencias para elementos de video/audio
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Estado para controlar el reinicio de audio
  const [audioReconnectAttempts, setAudioReconnectAttempts] = useState(0);
  const [lastAudioActivity, setLastAudioActivity] = useState(Date.now());
  const audioMonitorRef = useRef(null);

  // Añadir al inicio del componente, donde se definen los estados
  const [citaId, setCitaId] = useState(null);
  const [citaData, setCitaData] = useState(null);

  const [currentView, setCurrentView] = useState('videoCall'); // 'videoCall' o 'transcriptions'
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false);

  // Variable para controlar si ya estamos en proceso de unión
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);

  // Añadir estado para el tipo de usuario
  const [userType, setUserType] = useState(null);

  // Estado para el sidebar del doctor
  const [activeTab, setActiveTab] = useState('historia');

  // Añadir el hook de navegación
  const navigate = useNavigate();

  const changeAudioDevice = (id) => setSelectedAudioDevice(id);
  const changeVideoDevice = (id) => setSelectedVideoDevice(id);

  // Modificar el useEffect inicial para entrar directamente a la reunión
  useEffect(() => {
    const init = async () => {
      try {
        // Obtener el tipo de usuario de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const userTypeFromUrl = urlParams.get('userType');
        setUserType(userTypeFromUrl);
        
        // Obtener el ID de la cita y el tipo de usuario de la URL
        const urlParamsMeeting = new URLSearchParams(window.location.search);
        const meetingIdFromUrl = urlParamsMeeting.get('meetingId');
        
        // Obtener el ID de la cita de la URL
        const pathSegments = window.location.pathname.split('/');
        const citaIdFromUrl = pathSegments[pathSegments.length - 1];
        setCitaId(citaIdFromUrl);
        
        // Cargar datos de la cita
        if (citaIdFromUrl) {
          const citaData = await loadCitaData(citaIdFromUrl);
          setCitaData(citaData);
        }
        
        // Si ya tenemos un meetingId en la URL, usarlo directamente y unirse
        if (meetingIdFromUrl) {
          setCurrentMeetingId(meetingIdFromUrl);
          // Cargar dispositivos antes de unirse
          await loadAvailableDevices();
          // Unirse automáticamente a la reunión
          await joinExistingMeeting(meetingIdFromUrl);
          setIsInMeeting(true);
        } else if (citaData && citaData.meetingId) {
          // Si la cita tiene un meetingId, usarlo
          setCurrentMeetingId(citaData.meetingId);
          await loadAvailableDevices();
          await joinExistingMeeting(citaData.meetingId);
          setIsInMeeting(true);
        } else {
          // Si no hay meetingId, cargar dispositivos y reuniones
          await loadAvailableDevices();
          await loadMeetings();
        }
      } catch (error) {
        console.error('Error en la inicialización:', error);
        setError('Error al inicializar: ' + error.message);
      }
    };
    
    init();
  }, []);

  // Añadir función para cargar datos de la cita
  const loadCitaData = async (citaId) => {
    try {
      setIsLoadingCita(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/cita/${citaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error('Error al cargar datos de la cita');
      }
      
      const data = await response.json();
      
      // Depurar la estructura de la respuesta
      console.log('Respuesta del servidor:', data);
      
      // Verificar si la respuesta tiene la estructura esperada
      if (data.success === false) {
        throw new Error(data.error || 'Error al obtener datos de la cita');
      }
      
      // Comprobar si los datos vienen directamente o dentro de data
      const citaData = data.data || data;
      
      // Validar que los datos necesarios estén presentes
      if (!citaData.pacienteId) {
        throw new Error('Datos del paciente no disponibles');
      }
      
      setCitaData(citaData);
      return citaData;
    } catch (error) {
      console.error('Error al cargar datos de la cita:', error);
      
      // Mostrar mensaje de error al usuario
      Swal.fire({
        title: 'Error',
        text: `No se pudieron cargar los datos de la cita: ${error.message}`,
        icon: 'error'
      });
      
      return null;
    } finally {
      setIsLoadingCita(false);
    }
  };

  // Función para cargar dispositivos disponibles
  const loadAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      console.log('Dispositivos de audio entrada encontrados:', audioInputs);
      console.log('Dispositivos de video encontrados:', videoInputs);
      console.log('Dispositivos de audio salida encontrados:', audioOutputs);

      setAvailableDevices({
        audioInputs,
        videoInputs
      });
      setAudioOutputDevices(audioOutputs);

      // Establecer dispositivos predeterminados
      if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }

      if (audioOutputs.length > 0) {
        setSelectedAudioOutputDevice(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error al cargar dispositivos:', error);
    }
  };

  // Añadir función para cargar transcripciones
  const loadTranscriptions = async (meetingId) => {
    try {
      setIsLoadingTranscriptions(true);
      const response = await api.getTranscriptionsByMeeting(meetingId);
      if (response.success) {
        setTranscriptions(response.data);
      } else {
        console.error('Error al cargar transcripciones:', response.error);
      }
    } catch (error) {
      console.error('Error al cargar transcripciones:', error);
    } finally {
      setIsLoadingTranscriptions(false);
    }
  };

  // Función para iniciar el stream de medios con los dispositivos seleccionados
  const startMediaStream = async () => {
    try {
      if (localStream) {
        // Detener las pistas actuales
        localStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: isVideoEnabled ? (selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true) : false
      };

      console.log('Solicitando medios con constraints:', constraints);

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(newStream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      return newStream;
    } catch (error) {
      console.error('Error al iniciar stream de medios:', error);
      // Reemplazar alert por Swal
      Swal.fire({
        title: 'Error',
        text: 'Error al acceder a los dispositivos de medios: ' + error.message,
        icon: 'error'
      });
      return null;
    }
  };

  // Añadir esta función en tu componente
  const startAudio = async (session) => {
    try {
      if (!session) {
        console.error('❌ No se proporcionó sesión para iniciar audio');
        return false;
      }

      console.log('🔈 Iniciando audio para la reunión...');

      // Detener cualquier entrada de audio existente
      try {
        await session.audioVideo.stopAudioInput();
        console.log('✅ Entrada de audio previa detenida correctamente');
      } catch (err) {
        console.warn('⚠️ No había entrada de audio para detener:', err);
      }

      // Iniciar el audio con el dispositivo seleccionado
      try {
        // Listar dispositivos disponibles (para diagnóstico)
        const devices = await session.audioVideo.listAudioInputDevices();
        console.log('Dispositivos de audio disponibles:', devices);

        // Si no hay dispositivo seleccionado o no está en la lista, usar el primero disponible
        let deviceToUse = selectedAudioDevice;
        if (!deviceToUse || !devices.some(d => d.deviceId === deviceToUse)) {
          if (devices.length > 0) {
            deviceToUse = devices[0].deviceId;
            console.log('⚠️ Usando dispositivo predeterminado:', deviceToUse);
          } else {
            console.error('❌ No hay dispositivos de audio disponibles');
            return false;
          }
        }

        // Iniciar el audio con el dispositivo seleccionado
        const inputStream = await session.audioVideo.startAudioInput(deviceToUse);
        console.log('✅ Audio iniciado con dispositivo:', deviceToUse);

        // Verificar que la stream tiene pistas de audio
        if (inputStream && inputStream.getAudioTracks().length > 0) {
          console.log('✅ Prueba de audio: pistas de audio detectadas:', inputStream.getAudioTracks().length);
        } else {
          console.warn('⚠️ Prueba de audio: no se detectaron pistas de audio activas');
        }

        // Verificar explícitamente que el audio no esté silenciado por defecto
        const isMuted = session.audioVideo.realtimeIsLocalAudioMuted();
        console.log('🎤 Estado inicial del micrófono:', isMuted ? 'Silenciado' : 'Activo');

        // Si está silenciado, intentar activarlo
        if (isMuted) {
          const unmuted = await session.audioVideo.realtimeUnmuteLocalAudio();
          console.log('Resultado de activar micrófono:', unmuted ? '✅ Éxito' : '❌ Fallo');
          setIsMuted(!unmuted);
        } else {
          setIsMuted(false);
        }

        return true;
      } catch (error) {
        console.error('❌ Error al iniciar audio:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al iniciar audio: ' + error.message,
          icon: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error crítico al iniciar audio:', error);
      return false;
    }
  };

  const toggleMute = async () => {
    try {
      console.log('🎤 Intentando cambiar estado del micrófono...');

      // Verificar que tenemos una sesión activa
      if (!window.currentMeetingSession) {
        console.error('❌ No hay una sesión de reunión activa para silenciar/activar');
        Swal.fire({
          title: 'Error',
          text: 'No hay una sesión de reunión activa',
          icon: 'error'
        });
        return;
      }

      const audioVideo = window.currentMeetingSession.audioVideo;

      // Obtener el estado actual del micrófono directamente del SDK
      // Esto es más confiable que usar el estado de React
      const currentMuteState = audioVideo.realtimeIsLocalAudioMuted();
      console.log(`🎤 Estado actual del micrófono según SDK: ${currentMuteState ? 'Silenciado' : 'Activo'}`);
      console.log(`🎤 Estado actual del micrófono según React: ${isMuted ? 'Silenciado' : 'Activo'}`);

      // Sincronizar el estado de React con el estado real del SDK si hay discrepancia
      if (currentMuteState !== isMuted) {
        console.warn('⚠️ Discrepancia detectada entre estado React y SDK, sincronizando...');
        setIsMuted(currentMuteState);
      }

      let success = false;

      if (currentMuteState) {
        // Si está silenciado, activar
        try {
          success = await audioVideo.realtimeUnmuteLocalAudio();
          console.log('Resultado de realtimeUnmuteLocalAudio:', success);
        } catch (err) {
          console.error('Error en realtimeUnmuteLocalAudio:', err);
          success = false;
        }
      } else {
        // Si está activo, silenciar
        try {
          success = await audioVideo.realtimeMuteLocalAudio();
          console.log('Resultado de realtimeMuteLocalAudio:', success);
        } catch (err) {
          console.error('Error en realtimeMuteLocalAudio:', err);
          success = false;
        }
      }

      // Verificar el resultado y actualizar el estado
      if (success) {
        console.log('✅ Cambio de estado del micrófono exitoso');
        setIsMuted(!currentMuteState);
        return;
      }

      // Si la API de Chime falló, intentar con el MediaStream
      if (localStream) {
        try {
          const audioTracks = localStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
              track.enabled = currentMuteState; // Si estaba silenciado, activamos
              console.log(`✅ Pista de audio ${track.label} ${currentMuteState ? 'activada' : 'silenciada'}`);
            });
            
            setIsMuted(!currentMuteState);
            
            // Intentar sincronizar con Chime
            if (!currentMuteState) {
              audioVideo.realtimeMuteLocalAudio().catch(() => {});
            } else {
              audioVideo.realtimeUnmuteLocalAudio().catch(() => {});
            }
            
            return;
          }
        } catch (err) {
          console.error('Error al manipular MediaStream:', err);
        }
      }

      // Si todo falla, sugerir reiniciar el audio
      console.error('❌ No se pudo cambiar el estado del micrófono');
      Swal.fire({
        title: 'Problema con el micrófono',
        text: 'No se pudo cambiar el estado del micrófono. ¿Deseas reiniciar el audio?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, reiniciar audio',
        cancelButtonText: 'Mutear'
      }).then((result) => {
        if (result.isConfirmed) {
          restartAudio();
        }
      });

    } catch (error) {
      console.error('❌ Error al cambiar estado del micrófono:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cambiar estado del micrófono: ' + error.message,
        icon: 'error'
      });
    }
  };

  const toggleVideo = async () => {
    try {
      // Verificar que tenemos una sesión activa
      if (!window.currentMeetingSession) {
        console.error('❌ No hay una sesión de reunión activa para control de video');
        return;
      }

      const audioVideo = window.currentMeetingSession.audioVideo;

      if (isVideoEnabled) {
        // Si el video está activo, detenerlo
        console.log('🎥 Deteniendo video local...');
        await audioVideo.stopLocalVideoTile();
        setIsVideoEnabled(false);
        console.log('✅ Video local detenido');
      } else {
        // Si el video está inactivo, iniciarlo
        console.log('🎥 Iniciando video local...');

        // Primero configuramos el dispositivo de entrada de video
        try {
          await audioVideo.startVideoInput(selectedVideoDevice);
          console.log('✅ Entrada de video iniciada con dispositivo:', selectedVideoDevice);
        } catch (err) {
          console.error('❌ Error al iniciar entrada de video:', err);
          alert('Error al iniciar cámara: ' + err.message);
          return;
        }

        // Luego iniciamos el mosaico de video local
        try {
          await audioVideo.startLocalVideoTile();
          setIsVideoEnabled(true);
          console.log('✅ Video local iniciado');
        } catch (err) {
          console.error('❌ Error al iniciar mosaico de video local:', err);
          alert('Error al mostrar video: ' + err.message);
        }
      }
    } catch (error) {
      console.error('❌ Error al cambiar estado del video:', error);
      alert('Error al cambiar estado del video: ' + error.message);
    }
  };

  // Cargar reuniones
  const loadMeetings = async () => {
    try {
      setIsLoadingMeetings(true);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/meetings`);
      const data = await response.json();
      if (data.success) {
        setMeetings(data.data);
      } else {
        console.error('Error al cargar reuniones:', data.error);
      }
    } catch (error) {
      console.error('Error al cargar reuniones:', error);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleEndMeeting = async () => {
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Finalizando consulta',
        text: 'Obteniendo resumen de documentos...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Obtener el resumen de documentos de la cita
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const citaId = citaData?._id;
      
      if (!citaId) {
        throw new Error('No se pudo obtener el ID de la cita');
      }
      
      const response = await axios.get(`${baseUrl}/api/documentos/cita/${citaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Preparar el contenido HTML para mostrar los documentos
      const documentos = response.data.data;
      let documentosHtml = '<div class="text-left">';
      
      // Función para crear un enlace o mostrar "No generado"
      const crearEnlace = (url, nombre) => {
        if (url) {
          return `<div class="mb-2"><span class="font-semibold">${nombre}:</span> <a href="${url}" target="_blank" class="text-blue-600 hover:underline">Ver documento</a></div>`;
        } else {
          return `<div class="mb-2"><span class="font-semibold">${nombre}:</span> <span class="text-gray-500">No generado</span></div>`;
        }
      };
      
      documentosHtml += crearEnlace(documentos.historiaClinica, 'Historia Clínica');
      documentosHtml += crearEnlace(documentos.formulaMedica, 'Fórmula Médica');
      documentosHtml += crearEnlace(documentos.examenLaboratorio, 'Exámenes de Laboratorio');
      documentosHtml += crearEnlace(documentos.incapacidad, 'Incapacidad');
      documentosHtml += crearEnlace(documentos.ayudasDiagnosticas, 'Ayudas Diagnósticas');
      documentosHtml += crearEnlace(documentos.interconsulta, 'Interconsulta');
      documentosHtml += crearEnlace(documentos.apoyoTerapeutico, 'Apoyo Terapéutico');
      
      documentosHtml += '</div>';
      
      // Mostrar el resumen de documentos
      const result = await Swal.fire({
        title: 'Resumen de la consulta',
        html: `
          <p class="mb-4">Verifique que todos los documentos necesarios hayan sido generados:</p>
          ${documentosHtml}
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Finalizar consulta',
        cancelButtonText: 'Volver a la consulta'
      });
      
      // Si el usuario confirma, finalizar la reunión
      if (result.isConfirmed) {
        setIsEndingMeeting(true);
        
        // Finalizar la reunión y enviar el resumen de documentos
        if (currentMeetingId) {
          try {
            // Usar fetch con método DELETE y enviar el resumen en el cuerpo
            const response = await fetch(`${baseUrl}/api/meetings/${currentMeetingId}`, {
              method: 'DELETE',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                citaId,
                resumenDocumentos: documentos
              })
            });
            
            console.log('Reunión finalizada correctamente');
            
            // Mostrar mensaje de éxito
            await Swal.fire({
              title: '¡Consulta finalizada!',
              text: 'La consulta ha sido finalizada correctamente. Se ha enviado el resumen correctamente.',
              icon: 'success',
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false
            });
            
          } catch (error) {
            console.error('Error al finalizar la reunión en el servidor:', error);
            
            // Mostrar mensaje de advertencia pero continuar
            await Swal.fire({
              title: 'Advertencia',
              text: 'La consulta ha finalizado pero hubo un problema al enviar el resumen.',
              icon: 'warning',
              confirmButtonText: 'Continuar'
            });
          }
        }
        
        setIsInMeeting(false);
        setCurrentMeetingId(null);
        setCurrentAttendeeId(null);
        setIsEndingMeeting(false);
        
        // Navegar a la página de inicio o donde corresponda
        navigate('/doctor/citas');
      }
    } catch (error) {
      console.error('Error al finalizar la reunión:', error);
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al finalizar la consulta. Por favor, inténtelo de nuevo.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      setIsEndingMeeting(false);
    }
  };

  // Función para crear una nueva reunión
  const createMeeting = async () => {
    try {
      console.log('Creando nueva reunión...');
      const data = await api.createMeeting({
        externalMeetingId: `Meeting-${Date.now()}`
      });

      console.log('Respuesta de creación de reunión:', data);

      if (!data.success) {
        throw new Error(data.error || 'Error al crear reunión');
      }

      // Ajustar para usar el formato de respuesta correcto del backend
      const meetingData = data.data.Meeting;
      setCurrentMeetingId(meetingData.MeetingId);

      // Crear un asistente para esta reunión
      await createAttendee(meetingData.MeetingId);

      // Recargar la lista de reuniones
      loadMeetings();
    } catch (error) {
      console.error('Error al crear reunión:', error);
      alert('Error al crear reunión: ' + error.message);
    }
  };

  // Función para crear un asistente
  const createAttendee = async (meetingId) => {
    try {
      console.log('Creando asistente para la reunión:', meetingId);
      const data = await api.createAttendee(meetingId, {
        externalUserId: `User-${Date.now()}`
      });

      console.log('Respuesta de creación de asistente:', data);

      if (!data.success) {
        throw new Error(data.error || 'Error al crear asistente');
      }

      // Ajustar para usar el formato de respuesta correcto del backend
      const attendeeData = data.data.Attendee;
      console.log('Estableciendo currentAttendeeId a:', attendeeData.AttendeeId);

      // Actualizar el estado del ID del asistente
      setCurrentAttendeeId(attendeeData.AttendeeId);

      // Iniciar la reunión con los datos del asistente
      await joinMeeting(meetingId, attendeeData);
    } catch (error) {
      console.error('Error al crear asistente:', error);
      alert('Error al crear asistente: ' + error.message);
    }
  };

  const joinExistingMeeting = async (meetingId) => {
    // Si ya estamos en proceso de unión, no hacer nada
    if (isJoiningMeeting) {
      console.log('Ya estamos en proceso de unión a una reunión');
      return;
    }
    
    setIsJoiningMeeting(true);
    
    try {
      setIsLoading(true);
      console.log('Uniéndose a reunión existente:', meetingId);

      // Primero, obtener los detalles de la reunión
      const meetingResponse = await api.getMeeting(meetingId);
      console.log('Respuesta completa de la API getMeeting:', meetingResponse);

      if (!meetingResponse.success) {
        throw new Error(meetingResponse.error || 'Error al obtener datos de la reunión');
      }

      // Extraer los datos de la reunión
      const meetingData = meetingResponse.data;
      console.log('Datos de reunión extraídos:', meetingData);

      // Verificar si la reunión está activa
      if (meetingData.status !== 'active' && meetingData.status !== 'created') {
        throw new Error('La reunión no está activa');
      }

      // Crear un asistente para esta reunión
      const attendeeResponse = await api.createAttendee(meetingId, {
        externalUserId: `User-${Date.now()}`,
        userId: localStorage.getItem('userId') || Date.now().toString(),
        name: localStorage.getItem('userName') || 'Usuario'
      });

      if (!attendeeResponse.success) {
        throw new Error(attendeeResponse.error || 'Error al crear asistente');
      }

      const attendeeData = attendeeResponse.data.Attendee;
      setCurrentAttendeeId(attendeeData.AttendeeId);
      
      // Unirse a la reunión con los datos obtenidos
      await joinMeeting(meetingId, attendeeData, meetingData);
      
    } catch (error) {
      console.error('Error al unirse a la reunión:', error);
      setError('Error al unirse a la reunión: ' + error.message);
      alert('Error al unirse a la reunión: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsJoiningMeeting(false);
    }
  };

  const joinMeeting = async (meetingId, attendeeData, meetingData = null) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Uniendo a la reunión:', meetingId, 'con datos de asistente:', attendeeData);

      // Obtener detalles de la reunión si no se proporcionaron
      let meetingDetails = meetingData;
      if (!meetingDetails) {
        try {
          const meetingResponse = await api.getMeeting(meetingId);
          console.log('Respuesta de detalles de reunión:', meetingResponse);

          if (meetingResponse.success) {
            meetingDetails = meetingResponse.data;
          } else {
            throw new Error('Error al obtener detalles de la reunión');
          }
        } catch (error) {
          console.error('Error al obtener detalles de la reunión:', error);
          throw new Error('No se pudo unir a la reunión: ' + error.message);
        }
      }

      // Registrar detalles de la reunión para depuración
      console.log('Usando detalles de reunión:', meetingDetails);

      // Iniciar stream de medios local
      const stream = await startMediaStream();

      // Configurar reunión de Chime
      const { chime } = await setupChimeMeeting(meetingDetails, attendeeData);
      
      // IMPORTANTE: Esperar explícitamente a que el audio se inicialice correctamente
      const audioInitialized = await startAudio(window.currentMeetingSession);
      if (!audioInitialized) {
        console.warn('⚠️ El audio no se inicializó correctamente, intentando reiniciar...');
        // Intentar reiniciar el audio automáticamente
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa
        await restartAudio();
      }

      // Establecer estado para indicar que estamos en una reunión
      setIsInMeeting(true);
      console.log('Unido exitosamente a la reunión');

    } catch (error) {
      console.error('Error al unirse a la reunión:', error);
      setError('Error al unirse a la reunión: ' + error.message);
      Swal.fire({
        title: 'Error',
        text: 'Error al unirse a la reunión: ' + error.message,
        icon: 'error'
      });
      setIsInMeeting(false);
    } finally {
      setIsLoading(false);
    }
  };

  const leaveMeeting = async () => {
    // Usar SweetAlert2 en lugar de window.confirm
    const result = await Swal.fire({
      title: '¿Salir de la reunión?',
      text: 'La reunión continuará para los demás participantes.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        if (window.currentMeetingSession) {
          window.currentMeetingSession.audioVideo.stop();
          window.currentMeetingSession = null;
        }

        setIsInMeeting(false);
        setCurrentMeetingId(null);
        setCurrentAttendeeId(null);
        
        // Mostrar mensaje de éxito
        await Swal.fire({
          title: 'Has salido de la reunión',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        // Redirigir según el tipo de usuario
        if (userType === 'doctor') {
          navigate('/doctor/citas');
        } else if (userType === 'patient') {
          navigate('/patient/tablero-control');
        }

        return true;
      } catch (error) {
        console.error('Error al salir de la reunión:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo salir de la reunión correctamente.',
          icon: 'error'
        });
        return false;
      }
    }
    return false;
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      // Detener transcripción
      console.log('🔄 Deteniendo transcripción...');
      if (recognition) {
        recognition.stop();
        setRecognition(null);
      }
      setIsTranscribing(false);
      console.log('✅ Transcripción detenida');
      return;
    }

    // Verificar que el navegador soporta reconocimiento de voz
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz');
      console.error('❌ Navegador no soporta reconocimiento de voz');
      return;
    }

    // Verificar que estamos en una reunión
    if (!currentAttendeeId) {
      alert('Debes estar en una reunión para iniciar la transcripción');
      console.error('❌ No hay un ID de asistente para la transcripción');
      return;
    }

    // Crear instancia de reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    // Configurar reconocimiento
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'es-ES'; // Idioma español

    // Manejar resultados
    recognitionInstance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isPartial = !event.results[i].isFinal;

        // Añadir nueva transcripción o actualizar la última si es parcial
        const newTranscription = {
          text: transcript,
          attendeeId: currentAttendeeId,
          timestamp: new Date(),
          isPartial
        };

        setTranscriptions(prev => {
          // Si la última transcripción es parcial y esta también, reemplazarla
          if (prev.length > 0 && prev[prev.length - 1].isPartial && isPartial) {
            return [...prev.slice(0, -1), newTranscription];
          } else {
            return [...prev, newTranscription];
          }
        });
      }
    };

    // Manejar errores
    recognitionInstance.onerror = (event) => {
      console.error('Error en reconocimiento de voz:', event.error);
      if (event.error === 'no-speech') {
        // Reiniciar si no se detecta voz
        recognitionInstance.stop();
        setTimeout(() => {
          if (isTranscribing) {
            recognitionInstance.start();
          }
        }, 500);
      } else {
        alert('Error en el reconocimiento de voz: ' + event.error);
        setIsTranscribing(false);
      }
    };

    // Manejar fin de reconocimiento
    recognitionInstance.onend = () => {
      // Reiniciar si todavía estamos transcribiendo
      if (isTranscribing) {
        recognitionInstance.start();
      }
    };

    // Iniciar reconocimiento
    recognitionInstance.start();
    setRecognition(recognitionInstance);
    setIsTranscribing(true);
    console.log('✅ Transcripción iniciada');
  };

  // Función para guardar la transcripción
  const saveTranscription = async () => {
    if (!currentMeetingId || transcriptions.length === 0) {
      alert('No hay transcripcion para guardar');
      return;
    }

    setIsSavingTranscription(true);

    try {
      // Filtrar solo las transcripciones finales (no parciales)
      const finalTranscriptions = transcriptions.filter(t => !t.isPartial);

      // Primero, iniciar una nueva transcripción en el backend
      const startResponse = await api.createTranscription({
        meetingId: currentMeetingId,
        language: 'es-ES'
      });

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Error al iniciar la transcripción en el servidor');
      }

      const transcriptionId = startResponse.data._id;

      // Guardar cada segmento individualmente
      for (const item of finalTranscriptions) {
        const segment = {
          text: item.text,
          speakerId: item.attendeeId || 'Desconocido',
          timestamp: new Date(item.timestamp).toISOString(),
          isPartial: false
        };

        const saveResponse = await api.saveSegment(transcriptionId, segment, item.attendeeId);

        if (!saveResponse.success) {
          throw new Error(saveResponse.error || 'Error al guardar segmento de transcripción');
        }
      }

      alert('Transcripción guardada correctamente');
    } catch (error) {
      console.error('Error al guardar transcripción:', error);
      alert('Error al guardar transcripción: ' + error.message);
    } finally {
      setIsSavingTranscription(false);
    }
  };

  // Renderizado de la parte de selección de reunión
  const renderMeetingSelection = () => {
    return (
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-6">Selecciona o crea una reunión</h2>

        <button
          onClick={createMeeting}
          className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg mb-6 flex items-center justify-center w-full max-w-md"
        >
          <i className="fas fa-plus-circle mr-2"></i>
          Crear nueva reunión
        </button>

        {isLoadingMeetings ? (
          <div className="text-center py-5">
            Cargando reuniones...
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center p-5 bg-gray-100 rounded-lg w-full max-w-md">
            No hay reuniones disponibles.
          </div>
        ) : (
          <MeetingContainer
            meetings={meetings}
            joinExistingMeeting={joinExistingMeeting}
            endMeeting={handleEndMeeting}
            refreshMeetings={loadMeetings}
          />
        )}
      </div>
    );
  };

  const restartAudio = async () => {
    try {
      console.log('🔄 Intentando reiniciar el audio...');

      // Detener cualquier intento previo de reinicio para evitar conflictos
      if (audioMonitorRef.current) {
        clearInterval(audioMonitorRef.current);
      }

      // Reiniciar contador de intentos
      setAudioReconnectAttempts(prev => prev + 1);

      // Si no hay sesión, no podemos hacer nada
      if (!window.currentMeetingSession) {
        console.error('❌ No hay sesión de reunión activa para reiniciar el audio');
        return;
      }

      const session = window.currentMeetingSession;

      // 1. Desconectar el elemento de audio actual
      try {
        await session.audioVideo.unbindAudioElement();
        console.log('✅ Elemento de audio desvinculado correctamente');
      } catch (err) {
        console.error('❌ Error al desvincular elemento de audio:', err);
      }

      // 2. Detener entrada de audio actual
      try {
        const audioInputs = await session.audioVideo.listAudioInputDevices();
        if (audioInputs.length > 0) {
          await session.audioVideo.stopAudioInput();
          console.log('✅ Entrada de audio detenida');
        }
      } catch (err) {
        console.error('❌ Error al detener entrada de audio:', err);
      }

      // 3. Pequeña pausa para permitir que los recursos se liberen
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Obtener y reiniciar elemento de audio
      const audioElement = document.getElementById('meeting-audio');
      if (!audioElement) {
        const newAudioElement = document.createElement('audio');
        newAudioElement.id = 'meeting-audio';
        newAudioElement.autoplay = true;
        newAudioElement.controls = true;
        newAudioElement.style.display = 'block';
        newAudioElement.style.margin = '10px 0';
        newAudioElement.volume = 1.0;
        document.body.appendChild(newAudioElement);
        console.log('✅ Creado nuevo elemento de audio');
      } else {
        // Reiniciar el elemento existente
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.volume = 1.0;
        console.log('✅ Reiniciado elemento de audio existente');
      }

      // 5. Reiniciar entrada de audio con el dispositivo seleccionado
      try {
        await session.audioVideo.startAudioInput(selectedAudioDevice);
        console.log('✅ Reiniciada entrada de audio con dispositivo:', selectedAudioDevice);
      } catch (err) {
        console.error('❌ Error al reiniciar entrada de audio:', err);
        // Intentar con el dispositivo predeterminado si falla
        try {
          await session.audioVideo.startAudioInput();
          console.log('✅ Reiniciada entrada de audio con dispositivo predeterminado');
        } catch (innerErr) {
          console.error('❌❌ Error crítico al reiniciar audio:', innerErr);
        }
      }

      // 6. Volver a vincular el elemento de audio
      try {
        await session.audioVideo.bindAudioElement(
          document.getElementById('meeting-audio')
        );
        console.log('✅ Elemento de audio vinculado nuevamente');

        // Make sure the volume is up
        audioElement.volume = 1.0;
      } catch (err) {
        console.error('Failed to bind audio element:', err);
      }

      // 7. Configurar el dispositivo de salida de audio
      if (selectedAudioOutputDevice) {
        try {
          await session.audioVideo.chooseAudioOutput(selectedAudioOutputDevice);
          console.log('✅ Dispositivo de salida configurado:', selectedAudioOutputDevice);

          // También configurar directamente en el elemento de audio si es compatible
          const audioEl = document.getElementById('meeting-audio');
          if (audioEl && typeof audioEl.setSinkId === 'function') {
            await audioEl.setSinkId(selectedAudioOutputDevice);
          }
        } catch (err) {
          console.error('❌ Error al configurar dispositivo de salida:', err);
        }
      }

      // 8. Desmutar explícitamente el audio local
      try {
        await session.audioVideo.realtimeUnmuteLocalAudio();
        setIsMuted(false);
        console.log('✅ Audio local desmutado');
      } catch (err) {
        console.error('❌ Error al desmutar audio local:', err);
      }

      // 9. Iniciar monitoreo de audio para detectar problemas futuros
      startAudioMonitoring();

      console.log('🎉 Reinicio de audio completado');

      // Notificar al usuario
      alert('Audio reiniciado. Por favor, verifica si puedes escuchar ahora.');

    } catch (error) {
      console.error('Error fatal al reiniciar audio:', error);
      alert('Error al reiniciar audio: ' + error.message);
    }
  };

  const startAudioMonitoring = () => {
    // Detener monitor existente si hay
    if (audioMonitorRef.current) {
      clearInterval(audioMonitorRef.current);
    }

    // Configurar nuevo monitor
    const session = window.currentMeetingSession;
    if (!session) return;

    // Registrar un observador de volumen para detectar actividad
    session.audioVideo.realtimeSubscribeToVolumeIndicator(
      (attendeeId, volume, muted, signalStrength) => {
        if (volume > 0.05) { // Solo registramos actividad significativa
          setLastAudioActivity(Date.now());
          console.log(`🎤 Actividad de audio detectada: ${attendeeId}, volumen: ${volume.toFixed(2)}`);
        }
      }
    );

    // Comprobar periódicamente si hay actividad de audio
    audioMonitorRef.current = setInterval(() => {
      const inactiveTime = Date.now() - lastAudioActivity;

      // Si no ha habido actividad por más de 30 segundos, hacer prueba
      if (inactiveTime > 30000) {
        console.log(`⚠️ Sin actividad de audio por ${Math.floor(inactiveTime / 1000)} segundos`);

        // Hacer una prueba de conectividad si no ha habido actividad
        if (session && session.audioVideo) {
          // Verificar conexión con el servidor de señalización
          const connectionState = session.audioVideo.getRemoteVideoSources().length;
          console.log('🔍 Estado de conexión: hay', connectionState, 'fuentes de video remotas');

          // Si hay problemas después de 2 minutos sin actividad, sugerir reinicio
          if (inactiveTime > 120000) {
            console.log('⚠️ Tiempo prolongado sin audio, puede necesitar reinicio');
          }
        }
      }
    }, 10000); // Comprobar cada 10 segundos
  };

  const setupChimeMeeting = async (meetingData, attendeeData) => {
    try {
      // Log raw meeting and attendee data
      console.log('Setting up Chime meeting with raw data:', {
        meetingData: JSON.stringify(meetingData, null, 2),
        attendeeData: JSON.stringify(attendeeData, null, 2)
      });

      // Import Chime SDK
      const { ConsoleLogger, DefaultDeviceController, DefaultMeetingSession, LogLevel, MeetingSessionConfiguration } =
        await import('amazon-chime-sdk-js');

      // Function to deeply search for a property in an object
      const findProperty = (obj, propNames) => {
        if (!obj || typeof obj !== 'object') return null;

        // Check current level
        for (const name of propNames) {
          if (obj[name] !== undefined) return obj[name];
        }

        // Search in nested objects
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            const result = findProperty(obj[key], propNames);
            if (result !== null) return result;
          }
        }

        return null;
      };

      // Create more flexible data extraction functions
      const buildMeetingConfig = () => {
        const meetingId = findProperty(meetingData, ['MeetingId', 'meetingId', 'meeting_id', 'id']);

        // Find MediaPlacement or related data
        const mediaPlacement = findProperty(meetingData, ['MediaPlacement', 'mediaPlacement', 'media_placement']);

        // If we don't have mediaPlacement, try to find URLs directly in the meeting data
        const audioHostUrl = findProperty(
          mediaPlacement || meetingData,
          ['AudioHostUrl', 'audioHostUrl', 'audio_host_url']
        );

        const audioFallbackUrl = findProperty(
          mediaPlacement || meetingData,
          ['AudioFallbackUrl', 'audioFallbackUrl', 'audio_fallback_url']
        );

        const signalingUrl = findProperty(
          mediaPlacement || meetingData,
          ['SignalingUrl', 'signalingUrl', 'signaling_url']
        );

        const turnControlUrl = findProperty(
          mediaPlacement || meetingData,
          ['TurnControlUrl', 'turnControlUrl', 'turn_control_url']
        );

        console.log('Extracted meeting properties:', {
          meetingId,
          audioHostUrl,
          audioFallbackUrl,
          signalingUrl,
          turnControlUrl
        });

        // Validate minimum required fields
        if (!meetingId) {
          throw new Error('ID de reunión no disponible en los datos');
        }

        if (!signalingUrl) {
          throw new Error('URL de señalización no disponible');
        }

        // Construct meeting configuration
        return {
          Meeting: {
            MeetingId: meetingId,
            MediaPlacement: {
              AudioHostUrl: audioHostUrl || '',
              AudioFallbackUrl: audioFallbackUrl || '',
              SignalingUrl: signalingUrl,
              TurnControlUrl: turnControlUrl || ''
            }
          }
        };
      };

      const buildAttendeeConfig = () => {
        // Try to extract attendee data from possible structures
        const attendeeId = findProperty(attendeeData, ['AttendeeId', 'attendeeId', 'attendee_id', 'id']);
        const joinToken = findProperty(attendeeData, ['JoinToken', 'joinToken', 'join_token', 'token']);

        console.log('Extracted attendee properties:', {
          attendeeId,
          joinToken
        });

        // Validate minimum required fields
        if (!attendeeId || !joinToken) {
          throw new Error('Datos de asistente incompletos (falta ID o token)');
        }

        // Construct attendee configuration
        return {
          Attendee: {
            AttendeeId: attendeeId,
            JoinToken: joinToken
          }
        };
      };

      // Build configurations
      const formattedMeetingData = buildMeetingConfig();
      const formattedAttendeeData = buildAttendeeConfig();

      console.log('Formatted meeting data for Chime:', JSON.stringify(formattedMeetingData, null, 2));
      console.log('Formatted attendee data for Chime:', JSON.stringify(formattedAttendeeData, null, 2));

      // Continue with creating the meeting session
      const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
      const deviceController = new DefaultDeviceController(logger);

      // Create meeting configuration
      const configuration = new MeetingSessionConfiguration(
        formattedMeetingData,
        formattedAttendeeData
      );

      // Create the meeting session
      const meetingSession = new DefaultMeetingSession(
        configuration,
        logger,
        deviceController
      );

      // Store the local user's attendee ID for reference
      const localAttendeeId = formattedAttendeeData.Attendee.AttendeeId;
      console.log('Local attendee ID:', localAttendeeId);

      // Set up observers with better differentiation between local and remote
      meetingSession.audioVideo.addObserver({
        // Video tile observer with proper local/remote separation
        videoTileDidUpdate: tileState => {
          console.log('Mosaico de video actualizado:', tileState);

          // Si es un mosaico local (tu propio video)
          if (tileState.localTile) {
            meetingSession.audioVideo.bindVideoElement(
              tileState.tileId,
              localVideoRef.current
            );
            console.log('Video local vinculado al elemento HTML');
          }
          // Si es un mosaico remoto (video de otro participante)
          else if (!tileState.isContent) {
            meetingSession.audioVideo.bindVideoElement(
              tileState.tileId,
              remoteVideoRef.current
            );
            console.log('Video remoto vinculado al elemento HTML');
          }
        }
      });

      // Request necessary permissions
      await meetingSession.audioVideo.setDeviceLabelTrigger(async () => {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      });

      // Start the audio-video connection
      await meetingSession.audioVideo.start();
      console.log('Meeting audioVideo started');

      // Initialize audio input with explicit device selection
      const audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
      console.log('Available audio input devices:', audioInputDevices);

      if (audioInputDevices.length > 0) {
        // Try to use the selected audio device if available
        const deviceId = selectedAudioDevice || audioInputDevices[0].deviceId;
        try {
          await meetingSession.audioVideo.startAudioInput(deviceId);
          console.log('Started audio input with device ID:', deviceId);
        } catch (err) {
          console.error('Failed to start audio with selected device, trying default:', err);
          await meetingSession.audioVideo.startAudioInput(audioInputDevices[0].deviceId);
        }
      } else {
        console.error('No audio input devices available');
      }

      // Initialize audio output with explicit device selection
      const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
      console.log('Available audio output devices:', audioOutputDevices);

      if (audioOutputDevices.length > 0) {
        try {
          await meetingSession.audioVideo.chooseAudioOutput(selectedAudioOutputDevice);
          console.log('Selected audio output device:', selectedAudioOutputDevice);
        } catch (err) {
          console.error('Failed to select audio output device:', err);
        }
      }

      // Ensure we have an audio element and bind it
      let audioElement = document.getElementById('meeting-audio') || document.createElement('audio');
      audioElement.id = 'meeting-audio';
      audioElement.autoplay = true;
      audioElement.volume = 1.0;

      // Ocultar el elemento de audio pero mantenerlo funcional
      audioElement.style.display = 'none';
      audioElement.className = 'hidden fixed bottom-2 right-2 z-50';

      if (!document.getElementById('meeting-audio')) {
        document.body.appendChild(audioElement);
      }

      try {
        await meetingSession.audioVideo.bindAudioElement(audioElement);
        console.log('✅ Audio vinculado correctamente al elemento');
      } catch (err) {
        console.error('❌ Error al vincular audio:', err);
        // Intentar nuevamente después de una pausa
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await meetingSession.audioVideo.bindAudioElement(audioElement);
          console.log('✅ Audio vinculado correctamente en segundo intento');
        } catch (innerErr) {
          console.error('❌❌ Error crítico al vincular audio:', innerErr);
        }
      }

      // Start local video
      if (isVideoEnabled) {
        try {
          // Start local video tile with the device we selected
          const videoInputDevices = await meetingSession.audioVideo.listVideoInputDevices();
          console.log('Available video devices:', videoInputDevices);

          if (videoInputDevices.length > 0) {
            // Try to use selected device or default to first available
            const deviceId = selectedVideoDevice || videoInputDevices[0].deviceId;
            await meetingSession.audioVideo.startVideoInput(deviceId);
            console.log('Started video input with device ID:', deviceId);
          }

          // Start local video tile
          await meetingSession.audioVideo.startLocalVideoTile();
          console.log('Started local video tile');
        } catch (err) {
          console.error('Failed to start local video:', err);
        }
      }

      await startAudio(meetingSession);

      // Almacena la sesión globalmente para acceder desde otras funciones
      window.currentMeetingSession = meetingSession;

      // Iniciar monitoreo de audio después de configurar todo
      startAudioMonitoring();

      return {
        meetingSession,
        chime: meetingSession.audioVideo
      };
    } catch (error) {
      console.error('Error setting up Chime meeting:', error);
      throw error;
    }
  };

  // Prueba de micrófono
  const testMic = async (session) => {
    if (!session) return;

    const inputStream = await session.audioVideo.startAudioInput(selectedAudioDevice);
    if (inputStream && inputStream.getAudioTracks().length > 0) {
      console.log("✅ Micrófono detectado y transmitiendo audio");
    } else {
      console.error("❌ No se detectó ningún micrófono o el audio no se está transmitiendo");
    }
  };

  // Cambiar dispositivo de salida de audio
  const changeAudioOutputDevice = async (deviceId) => {
    try {
      console.log('🔊 Cambiando dispositivo de salida de audio a:', deviceId);
      setSelectedAudioOutputDevice(deviceId);

      // Si hay una sesión de reunión activa, cambiar el dispositivo de salida
      if (window.currentMeetingSession) {
        const audioVideo = window.currentMeetingSession.audioVideo;

        // Cambiar el dispositivo en el SDK de Chime
        await audioVideo.chooseAudioOutput(deviceId);
        console.log('✅ Dispositivo de salida de audio cambiado en SDK');

        // También actualizar el elemento de audio para el audio de la reunión
        if (typeof HTMLMediaElement.prototype.setSinkId !== 'undefined') {
          const audioElement = document.getElementById('meeting-audio');
          if (audioElement) {
            await audioElement.setSinkId(deviceId);
            console.log('✅ Elemento de audio configurado para usar dispositivo:', deviceId);
          }
        } else {
          console.warn('⚠️ La API setSinkId no está disponible en este navegador');
        }

        // Reemplazar alert por Swal
        Swal.fire({
          title: 'Éxito',
          text: 'Dispositivo de salida de audio cambiado correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('❌ Error al cambiar dispositivo de salida de audio:', error);
      // Reemplazar alert por Swal
      Swal.fire({
        title: 'Error',
        text: 'Error al cambiar altavoz/auriculares: ' + error.message,
        icon: 'error'
      });
    }
  };

  // Efecto para asegurar que el audio se escuche
  useEffect(() => {
    if (isInMeeting) {
      // Hacer el elemento de audio visible durante las pruebas
      const audioEl = document.getElementById('meeting-audio');
      if (audioEl) {
        audioEl.classList.add('block');
        audioEl.volume = 1.0;
        console.log('🔊 Elemento de audio hecho visible para depuración');
      }
    }
  }, [isInMeeting]);

  // Limpiar el monitor de audio al salir
  useEffect(() => {
    return () => {
      if (audioMonitorRef.current) {
        clearInterval(audioMonitorRef.current);
      }
    };
  }, []);

  // Añadir un efecto para ocultar el panel de audio
  useEffect(() => {
    // Ocultar el elemento de audio que aparece en la parte inferior
    const hideAudioElement = () => {
      const audioEl = document.getElementById('meeting-audio');
      if (audioEl) {
        // En lugar de eliminarlo, lo ocultamos con CSS
        audioEl.style.display = 'none';
        // También podemos usar classList para añadir una clase que lo oculte
        audioEl.classList.add('hidden');
        console.log('🔊 Elemento de audio ocultado');
      }
    };

    // Ejecutar inmediatamente
    hideAudioElement();

    // También configurar un intervalo para asegurarnos de que siga oculto
    const intervalId = setInterval(hideAudioElement, 1000);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId);
  }, [isInMeeting]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header con pestañas */}
      <header className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold mr-4">
            {citaData ? `Consulta: ${citaData.motivo}` : 'Videollamada'}
          </h1>
          {/* Comentamos la sección de pestañas para el doctor
          {userType === 'doctor' && (
            <div>
              <button 
                onClick={() => setCurrentView('videoCall')}
                className={`text-white border-none px-4 py-2 mr-2 cursor-pointer rounded ${
                  currentView === 'videoCall' ? 'bg-indigo-800' : 'bg-transparent'
                }`}
              >
                Video Llamada
              </button>
              <button 
                onClick={() => {
                  setCurrentView('transcriptions');
                  if (currentMeetingId) {
                    loadTranscriptions(currentMeetingId);
                  }
                }}
                className={`text-white border-none px-4 py-2 cursor-pointer rounded ${
                  currentView === 'transcriptions' ? 'bg-indigo-800' : 'bg-transparent'
                }`}
              >
                Transcripciones
              </button>
            </div>
          )}
          */}
        </div>
        {/* Solo mostrar el botón "Finalizar Llamada" para doctores */}
        {isInMeeting && userType === 'doctor' && (
          <button
            onClick={handleEndMeeting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Finalizar Llamada
          </button>
        )}
      </header>

      {/* Contenido principal con PanelGroup */}
      <div className="flex-1 overflow-hidden">
        {error && <div className="bg-red-100 text-red-700 p-4 m-4 rounded">{error}</div>}
        
        {isInMeeting ? (
          <PanelGroup 
            direction="horizontal" 
            className="h-full"
          >
            {/* Panel de videollamada */}
            <Panel 
              defaultSize={50}
              minSize={30}
              className="h-full"
            >
              <div className="h-full p-4 overflow-auto">
                <MeetingPanel
                  currentMeetingId={currentMeetingId}
                  localVideoRef={localVideoRef}
                  remoteVideoRef={remoteVideoRef}
                  toggleMute={toggleMute}
                  toggleVideo={toggleVideo}
                  leaveMeeting={leaveMeeting}
                  restartAudio={restartAudio}
                  isMuted={isMuted}
                  isVideoEnabled={isVideoEnabled}
                  selectedAudioDevice={selectedAudioDevice}
                  selectedVideoDevice={selectedVideoDevice}
                  selectedAudioOutputDevice={selectedAudioOutputDevice}
                  changeAudioDevice={changeAudioDevice}
                  changeVideoDevice={changeVideoDevice}
                  changeAudioOutputDevice={changeAudioOutputDevice}
                  availableDevices={availableDevices}
                  audioOutputDevices={audioOutputDevices}
                  userType={userType}
                />
              </div>
            </Panel>
            
            {/* Divisor (solo visible si es doctor) */}
            {userType === 'doctor' && (
              <PanelResizeHandle 
                className="w-3 relative hover:w-5 focus:w-5 transition-all duration-200"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-3 bg-gray-200 hover:bg-indigo-100 rounded-full flex items-center justify-center cursor-col-resize">
                    <div className="h-12 w-1 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              </PanelResizeHandle>
            )}
            
            {/* Panel lateral para el doctor */}
            {userType === 'doctor' && (
              <Panel 
                defaultSize={50} 
                minSize={30}
                className="h-full overflow-auto"
              >
                <div className="h-full bg-gray-50 border-l border-gray-200 flex flex-col">
                  {/* Tabs de navegación */}
                  <div className="flex border-b">
                   {/*  <button
                      className={`px-4 py-3 font-medium text-sm flex items-center transition-all duration-200 ${
                        activeTab === 'info' 
                          ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50' 
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      onClick={() => setActiveTab('info')}
                    >
                      <i className="fas fa-user-circle mr-2"></i> Información Personal
                    </button> */}
                    <button
                      className={`px-4 py-3 font-medium text-sm flex items-center transition-all duration-200 ${
                        activeTab === 'historia' 
                          ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50' 
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      onClick={() => setActiveTab('historia')}
                    >
                      <i className="fas fa-file-medical-alt mr-2"></i> Historia Clínica
                    </button>
                    <button
                      className={`px-4 py-3 font-medium text-sm flex items-center transition-all duration-200 ${
                        activeTab === 'prescripciones' 
                          ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50' 
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      onClick={() => setActiveTab('prescripciones')}
                    >
                      <i className="fas fa-prescription mr-2"></i> Prescripciones
                    </button>
                  </div>
                  
                  {/* Contenido del tab activo */}
                  <div className="flex-1 overflow-y-auto">
                    {activeTab === 'info' && <InformacionPersonal paciente={citaData?.pacienteId} isLoading={isLoadingCita} />}
                    {activeTab === 'historia' && <HistoriaClinica 
                      doctorData={citaData?.doctorId} 
                      citaData={citaData} 
                    />}
                    {activeTab === 'prescripciones' && <Prescripciones doctorData={citaData?.doctorId} citaData={citaData} />}
                  </div>
                </div>
              </Panel>
            )}
          </PanelGroup>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xl mb-4">Cargando reunión...</p>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;