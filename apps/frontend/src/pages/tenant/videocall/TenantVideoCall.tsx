import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff,
  FileText,
  Stethoscope
} from 'lucide-react';
import { useTenantAuth } from '../../../contexts/TenantAuthContext';
import { useTenant } from '../../../contexts/TenantContext';
import { useAlert } from '../../../contexts/AlertContext';
import { MeetingService } from '../../../services/meetingService';
import { AppointmentService } from '../../../services/appointmentService';

// AWS Chime SDK imports
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration
} from 'amazon-chime-sdk-js';

// Interfaces
interface MeetingData {
  meetingId: string;
  externalMeetingId?: string;
  citaId?: string;
  meetingData: any;
  attendees: any[];
  status: 'created' | 'active' | 'ended' | 'expired';
  createdAt: string;
  mediaPlacement?: {
    audioHostUrl?: string;
    audioFallbackUrl?: string;
    signalingUrl?: string;
    turnControlUrl?: string;
  };
}

interface CitaData {
  _id: string;
  pacienteId: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    idNumber?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    lastName: string;
    email: string;
  };
  fecha: string;
  hora: string;
  tipo: 'Presencial' | 'Virtual' | 'Telefónica';
  estado: 'pendiente' | 'Agendada' | 'Cancelada' | 'Completada' | 'No Asistió' | 'PendienteAgendar';
  motivo?: string;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}


// Componente principal
const TenantVideoCall: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useTenantAuth();
  const { tenant } = useTenant();
  const { showAlert } = useAlert();

  // Estados principales
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [citaData, setCitaData] = useState<CitaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Referencia para evitar múltiples inicializaciones
  const initializationRef = useRef<boolean>(false);
  
  console.log('🎬 TenantVideoCall - Componente iniciado', { meetingId, user });
  
  // Estados para AWS Chime
  const [meetingSession, setMeetingSession] = useState<DefaultMeetingSession | null>(null);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [inCall, setInCall] = useState(false);
  
  // Estados de controles de video - Inicializar como activos
  const [videoEnabled] = useState(true);
  
  // Referencias para elementos de video
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Referencia para evitar procesar el mismo tile múltiples veces
  const processedTiles = useRef<Set<number>>(new Set());
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('history');
  const [activePrescriptionTab, setActivePrescriptionTab] = useState('formulas');

  // Verificar si es doctor o paciente (memoizado para evitar renders innecesarios)
  const isDoctor = useMemo(() => user?.role === 'doctor', [user?.role]);
  const isPatient = useMemo(() => user?.role === 'patient', [user?.role]);


  // Cargar información de la reunión
  useEffect(() => {
    if (!meetingId || !user || initialized || initializationRef.current) return;
    
    let isMounted = true; // Flag para evitar actualizaciones en componentes desmontados
    
    const loadMeetingData = async () => {
      console.log('🔍 TenantVideoCall - meetingId:', meetingId);
      console.log('🔍 TenantVideoCall - user:', user);
      
      if (!meetingId) {
        console.log('❌ TenantVideoCall - No meetingId provided');
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'ID de reunión no válido'
        });
        navigate(`/${tenant?.domain}/doctor/citas`);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 TenantVideoCall - Iniciando carga de meeting data...');

        // Obtener información de la reunión
        console.log('🔍 TenantVideoCall - Llamando MeetingService.getMeeting...');
        const meetingResponse = await MeetingService.getMeeting(meetingId);
        console.log('🔍 TenantVideoCall - meetingResponse:', meetingResponse);
        
        if (!meetingResponse.success || !meetingResponse.meeting) {
          console.log('❌ TenantVideoCall - Meeting no encontrado:', meetingResponse.error);
          throw new Error(meetingResponse.error || 'Reunión no encontrada');
        }

        const meetingData = meetingResponse.meeting;
        if (isMounted) setMeeting(meetingData);

        // Si la reunión tiene una cita asociada, cargar datos de la cita
        if (meetingData.citaId) {
          console.log('🔍 MeetingData.citaId:', meetingData.citaId);
          
          // Extraer el ID de la cita (puede ser un objeto o string)
          const citaId = typeof meetingData.citaId === 'string' 
            ? meetingData.citaId 
            : (meetingData.citaId as any)?._id || (meetingData.citaId as any)?.id;
          
          console.log('🔍 CitaId extraído:', citaId);
          
          if (citaId) {
            const appointmentResponse = await AppointmentService.getAppointments();
            if (appointmentResponse.success && appointmentResponse.appointments) {
              const appointment = appointmentResponse.appointments.find(
                (apt: any) => apt._id === citaId
              );
              if (appointment && isMounted) {
                console.log('📋 Cita encontrada:', appointment);
                console.log('📋 Motivo de la cita:', appointment.motivo);
                setCitaData(appointment as unknown as CitaData);
              } else {
                console.log('❌ No se encontró la cita con ID:', citaId);
              }
            } else {
              console.log('❌ Error obteniendo citas:', appointmentResponse);
            }
          } else {
            console.log('❌ No se pudo extraer el ID de la cita');
          }
        } else {
          console.log('❌ No hay citaId en meetingData');
        }

        // Unirse automáticamente a la reunión
        if (meetingData.status === 'active' || (isDoctor && meetingData.status === 'created')) {
          // Crear attendee y unirse automáticamente
          const attendeeResponse = await MeetingService.createAttendee(meetingData.meetingId, {
            externalUserId: `${user.role}-${user._id}`,
            role: user.role as 'doctor' | 'patient'
          });

          if (attendeeResponse.success) {
            // Inicializar AWS Chime
            await initializeChimeMeeting(meetingData, attendeeResponse.attendee);
            setInCall(true);
            setIsInMeeting(true);
          }
        } else if (isPatient && meetingData.status === 'created') {
          showAlert({
            type: 'warning',
            title: 'Esperando al doctor',
            message: 'El doctor aún no ha iniciado la videoconsulta. Por favor espere.'
          });
          // Para pacientes, verificar cada 10 segundos si el doctor ya inició
          const checkInterval = setInterval(async () => {
            const updatedMeeting = await MeetingService.getMeeting(meetingId);
            if (updatedMeeting.success && updatedMeeting.meeting?.status === 'active') {
              setMeeting(updatedMeeting.meeting);
              clearInterval(checkInterval);
              // Unirse automáticamente cuando el doctor inicie
              const attendeeResponse = await MeetingService.createAttendee(updatedMeeting.meeting.meetingId, {
                externalUserId: `${user.role}-${user._id}`,
                role: user.role as 'doctor' | 'patient'
              });
              if (attendeeResponse.success) {
                await initializeChimeMeeting(updatedMeeting.meeting, attendeeResponse.attendee);
                setInCall(true);
                setIsInMeeting(true);
              }
            }
          }, 10000);

          return () => clearInterval(checkInterval);
        }

      } catch (error: any) {
        console.error('Error cargando datos de reunión:', error);
        if (isMounted) {
          showAlert({
            type: 'error',
            title: 'Error',
            message: error.message || 'No se pudo cargar la información de la reunión'
          });
          navigate(`/${tenant?.domain}/doctor/citas`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    loadMeetingData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [meetingId, user, initialized]);

  // Inicializar AWS Chime Meeting
  const initializeChimeMeeting = async (meetingData: MeetingData, attendeeData: any) => {
    try {
      console.log('🎬 Inicializando AWS Chime Meeting...');
      console.log('📊 Meeting Data:', meetingData);
      console.log('👤 Attendee Data:', attendeeData);
      
      // Crear logger con menos verbosidad
      const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.WARN);
      
      // Crear device controller
      const deviceController = new DefaultDeviceController(logger);
      
      // Usar la misma lógica que el componente original
      const formattedMeetingData = {
        MeetingId: meetingData.meetingData?.MeetingId || meetingData.meetingId,
        MediaRegion: meetingData.meetingData?.MediaRegion || 'us-east-1',
        ExternalMeetingId: meetingData.meetingData?.ExternalMeetingId || meetingData.externalMeetingId,
        MediaPlacement: meetingData.meetingData?.MediaPlacement || {}
      };
      
      const formattedAttendeeData = {
        Attendee: {
          AttendeeId: attendeeData.AttendeeId,
          ExternalUserId: attendeeData.ExternalUserId,
          JoinToken: attendeeData.JoinToken
        }
      };
      
      console.log('🔧 Formatted Meeting Data:', formattedMeetingData);
      console.log('👤 Formatted Attendee Data:', formattedAttendeeData);
      
      // Validar que tenemos los datos necesarios
      if (!formattedMeetingData.MediaPlacement?.AudioHostUrl || !formattedMeetingData.MediaPlacement?.SignalingUrl) {
        throw new Error('Faltan datos de MediaPlacement del backend. Verifica que el backend esté configurado correctamente con AWS Chime.');
      }
      
      if (!formattedAttendeeData.Attendee?.AttendeeId || !formattedAttendeeData.Attendee?.JoinToken) {
        throw new Error('Faltan datos de Attendee del backend. Verifica que el backend esté creando attendees correctamente.');
      }
      
      const configuration = new MeetingSessionConfiguration(formattedMeetingData, formattedAttendeeData);
      
      // Crear sesión de reunión
      const session = new DefaultMeetingSession(configuration, logger, deviceController);
      setMeetingSession(session);
      
      // Almacenar la sesión globalmente para acceso desde otras funciones
      (window as any).currentMeetingSession = session;
      
      // Configurar observadores de audio/video
      setupAudioVideoObservers(session);
      
      // Iniciar audio y video
      await startAudioVideo(session);
      
      console.log('✅ AWS Chime Meeting inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando AWS Chime:', error);
      throw error;
    }
  };

  // Configurar observadores de audio/video
  const setupAudioVideoObservers = (session: DefaultMeetingSession) => {
    const audioVideo = session.audioVideo;
    
    // Observador de dispositivos
    audioVideo.addDeviceChangeObserver({
      audioInputsChanged: (newDevices: MediaDeviceInfo[]) => {
        console.log('🎤 Dispositivos de audio actualizados:', newDevices);
      },
      audioOutputsChanged: (newDevices: MediaDeviceInfo[]) => {
        console.log('🔊 Dispositivos de salida de audio actualizados:', newDevices);
      },
      videoInputsChanged: (newDevices: MediaDeviceInfo[]) => {
        console.log('📹 Dispositivos de video actualizados:', newDevices);
      }
    });
    
    // Observador de video tiles
    audioVideo.addObserver({
      videoTileDidUpdate: (tileState: any) => {
        console.log('📹 Video tile actualizado:', tileState);
        
        if (tileState.localTile && tileState.tileId) {
          // Verificar si ya procesamos este tile
          if (processedTiles.current.has(tileState.tileId)) {
            // Si el tile ya fue procesado pero ahora está activo, intentar vincular nuevamente
            if (tileState.active && localVideoRef.current) {
              console.log('📹 Tile ya procesado pero ahora activo, intentando vincular nuevamente:', tileState.tileId);
              try {
                audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                console.log('✅ Video local re-vinculado correctamente');
                setIsVideoOn(true);
              } catch (error) {
                console.error('❌ Error re-vinculando video local:', error);
              }
            } else {
              console.log('📹 Tile ya procesado, saltando:', tileState.tileId);
            }
            return;
          }
          
          // Marcar como procesado
          processedTiles.current.add(tileState.tileId);
          
          // Mostrar video local
          console.log('📹 Vinculando video local con tile ID:', tileState.tileId);
          
          // Intentar vincular con reintentos limitados
          let retryCount = 0;
          const maxRetries = 3;
          
          const bindLocalVideo = () => {
            if (localVideoRef.current) {
              try {
                audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                console.log('✅ Video local vinculado correctamente');
                setIsVideoOn(true);
              } catch (error) {
                console.error('❌ Error vinculando video local:', error);
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`🔄 Reintentando vinculación de video local (${retryCount}/${maxRetries})...`);
                  setTimeout(bindLocalVideo, 200);
                } else {
                  console.error('❌ Máximo de reintentos alcanzado para video local');
                  // Remover del set si falla completamente
                  processedTiles.current.delete(tileState.tileId);
                }
              }
            } else {
              if (retryCount < maxRetries) {
                retryCount++;
                console.warn(`⚠️ Referencia de video local no disponible, reintentando... (${retryCount}/${maxRetries})`);
                setTimeout(bindLocalVideo, 200);
              } else {
                console.error('❌ Máximo de reintentos alcanzado - referencia de video local no disponible');
                // Remover del set si falla completamente
                processedTiles.current.delete(tileState.tileId);
              }
            }
          };
          
          bindLocalVideo();
        } else if (tileState.boundAttendeeId && tileState.tileId) {
          // Verificar si ya procesamos este tile
          if (processedTiles.current.has(tileState.tileId)) {
            console.log('📹 Tile remoto ya procesado, saltando:', tileState.tileId);
            return;
          }
          
          // Marcar como procesado
          processedTiles.current.add(tileState.tileId);
          
          // Mostrar video remoto
          console.log('📹 Vinculando video remoto con tile ID:', tileState.tileId);
          
          let retryCount = 0;
          const maxRetries = 3;
          
          const bindRemoteVideo = () => {
            if (remoteVideoRef.current) {
              try {
                audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                console.log('✅ Video remoto vinculado correctamente');
              } catch (error) {
                console.error('❌ Error vinculando video remoto:', error);
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`🔄 Reintentando vinculación de video remoto (${retryCount}/${maxRetries})...`);
                  setTimeout(bindRemoteVideo, 200);
                } else {
                  console.error('❌ Máximo de reintentos alcanzado para video remoto');
                  // Remover del set si falla completamente
                  processedTiles.current.delete(tileState.tileId);
                }
              }
            } else {
              if (retryCount < maxRetries) {
                retryCount++;
                console.warn(`⚠️ Referencia de video remoto no disponible, reintentando... (${retryCount}/${maxRetries})`);
                setTimeout(bindRemoteVideo, 200);
              } else {
                console.error('❌ Máximo de reintentos alcanzado - referencia de video remoto no disponible');
                // Remover del set si falla completamente
                processedTiles.current.delete(tileState.tileId);
              }
            }
          };
          
          bindRemoteVideo();
        }
      },
      videoTileWasRemoved: (tileId: number) => {
        console.log('📹 Video tile removido:', tileId);
        // Limpiar el tile del set de procesados
        processedTiles.current.delete(tileId);
      },
      audioVideoDidStart: () => {
        console.log('✅ Audio/Video iniciado correctamente');
        setIsInMeeting(true);
      },
      audioVideoDidStop: (sessionStatus: any) => {
        console.log('⏹️ Audio/Video detenido:', sessionStatus);
        if (sessionStatus === 'AudioJoinedFromAnotherDevice') {
          console.log('⚠️ Audio conectado desde otro dispositivo - reconectando...');
          // Intentar reconectar después de un breve delay
          setTimeout(() => {
            if (session) {
              console.log('🔄 Intentando reconectar...');
              session.audioVideo.start();
            }
          }, 2000);
        }
      }
    });
  };

  // Solicitar permisos de medios
  const requestMediaPermissions = async () => {
    try {
      console.log('🎥 Solicitando permisos de cámara y micrófono...');
      
      // Solicitar permisos de cámara y micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('✅ Permisos de medios concedidos');
      
      // Detener el stream temporal ya que Chime manejará sus propios streams
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('❌ Error solicitando permisos de medios:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Se requieren permisos de cámara y micrófono para la videoconsulta'
      });
      return false;
    }
  };

  // Iniciar audio y video
  const startAudioVideo = async (session: DefaultMeetingSession) => {
    try {
      // Primero solicitar permisos
      const hasPermissions = await requestMediaPermissions();
      if (!hasPermissions) {
        throw new Error('Permisos de medios no concedidos');
      }
      
      const audioVideo = session.audioVideo;
      
      // Iniciar audio
      await audioVideo.start();
      console.log('🔊 Audio iniciado');
      
      // Iniciar entrada de audio con dispositivo específico
      try {
        const audioInputDevices = await audioVideo.listAudioInputDevices();
        if (audioInputDevices.length > 0) {
          await audioVideo.startAudioInput(audioInputDevices[0].deviceId);
          console.log('🎤 Entrada de audio iniciada con dispositivo:', audioInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error('❌ Error al iniciar entrada de audio:', err);
      }
      
      // Iniciar video local si está habilitado
      if (videoEnabled) {
        try {
          const videoInputDevices = await audioVideo.listVideoInputDevices();
          console.log('📹 Dispositivos de video disponibles:', videoInputDevices);
          
          if (videoInputDevices.length > 0) {
            const deviceId = videoInputDevices[0].deviceId;
            await audioVideo.startVideoInput(deviceId);
            console.log('✅ Entrada de video iniciada con dispositivo:', deviceId);
            
            // Iniciar el mosaico de video local
            await audioVideo.startLocalVideoTile();
            console.log('✅ Mosaico de video local iniciado');
            
            // Esperar un momento y luego vincular el elemento
            setTimeout(() => {
              if (localVideoRef.current) {
                try {
                  audioVideo.bindVideoElement(0, localVideoRef.current);
                  console.log('✅ Video local vinculado al elemento HTML');
                } catch (bindError) {
                  console.error('❌ Error vinculando video inicial:', bindError);
                }
              } else {
                console.warn('⚠️ Elemento de video no disponible para vinculación inicial');
              }
            }, 200);
            
            setIsVideoOn(true);
            console.log('✅ Video local iniciado completamente');
          } else {
            console.warn('⚠️ No hay dispositivos de video disponibles');
            // Si no hay dispositivos de video, actualizar estado a false
            setIsVideoOn(false);
          }
        } catch (err) {
          console.error('❌ Error al iniciar video:', err);
          // No lanzar error aquí para no interrumpir la conexión de audio
        }
      }
      
      // Asegurar que el audio no esté silenciado por defecto
      try {
        const isMuted = audioVideo.realtimeIsLocalAudioMuted();
        if (isMuted) {
          await audioVideo.realtimeUnmuteLocalAudio();
          console.log('🔊 Audio desmutado');
        }
        setIsMuted(false);
      } catch (err) {
        console.error('❌ Error al desmutar audio:', err);
      }
      
      setIsInMeeting(true);
      
    } catch (error) {
      console.error('❌ Error iniciando audio/video:', error);
      throw error;
    }
  };


  // Controlar audio
  const toggleAudio = async () => {
    if (!meetingSession) return;
    
    try {
      const audioVideo = meetingSession.audioVideo;
      if (isMuted) {
        await audioVideo.realtimeUnmuteLocalAudio();
        console.log('🔊 Audio activado');
      } else {
        await audioVideo.realtimeMuteLocalAudio();
        console.log('🔇 Audio silenciado');
      }
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error controlando audio:', error);
    }
  };

  // Controlar video
  const toggleVideo = async () => {
    if (!meetingSession) return;
    
    try {
      const audioVideo = meetingSession.audioVideo;
      
      if (isVideoOn) {
        // Si el video está activo, detenerlo
        console.log('📹 Deteniendo video local...');
        await audioVideo.stopLocalVideoTile();
        setIsVideoOn(false);
        console.log('✅ Video local detenido');
      } else {
        // Si el video está inactivo, iniciarlo
        console.log('📹 Iniciando video local...');

        // Primero configuramos el dispositivo de entrada de video
        try {
          const videoInputDevices = await audioVideo.listVideoInputDevices();
          console.log('📹 Dispositivos de video disponibles:', videoInputDevices);
          
          if (videoInputDevices.length > 0) {
            const deviceId = videoInputDevices[0].deviceId;
            await audioVideo.startVideoInput(deviceId);
            console.log('✅ Entrada de video iniciada con dispositivo:', deviceId);
          } else {
            console.warn('⚠️ No hay dispositivos de video disponibles');
            return;
          }
        } catch (err: any) {
          console.error('❌ Error al iniciar entrada de video:', err);
          showAlert({
            type: 'error',
            title: 'Error de cámara',
            message: 'Error al iniciar cámara: ' + (err.message || 'Error desconocido')
          });
          return;
        }

        // Luego iniciamos el mosaico de video local
        try {
          await audioVideo.startLocalVideoTile();
          console.log('✅ Mosaico de video local iniciado');
          
          // El video se vinculará automáticamente en el observer videoTileDidUpdate
          // Solo actualizamos el estado visual
          setIsVideoOn(true);
          console.log('✅ Video local activado completamente');
        } catch (err: any) {
          console.error('❌ Error al iniciar mosaico de video local:', err);
          
          // Intentar reiniciar el video si falla
          console.log('🔄 Intentando reiniciar video...');
          try {
            await restartVideo();
            showAlert({
              type: 'success',
              title: 'Video reiniciado',
              message: 'El video se ha reiniciado correctamente'
            });
          } catch (restartErr) {
            console.error('❌ Error al reiniciar video:', restartErr);
            showAlert({
              type: 'error',
              title: 'Error de video',
              message: 'Error al mostrar video: ' + (err.message || 'Error desconocido')
            });
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error al cambiar estado del video:', error);
      showAlert({
        type: 'error',
        title: 'Error de video',
        message: 'Error al cambiar estado del video: ' + (error.message || 'Error desconocido')
      });
    }
  };

  // Función auxiliar para reiniciar el video
  const restartVideo = async () => {
    if (!meetingSession) return;
    
    try {
      console.log('🔄 Reiniciando video...');
      const audioVideo = meetingSession.audioVideo;
      
      // Detener video actual si está activo
      if (isVideoOn) {
        await audioVideo.stopLocalVideoTile();
        console.log('✅ Video actual detenido');
      }
      
      // Esperar un momento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reiniciar video
      const videoInputDevices = await audioVideo.listVideoInputDevices();
      if (videoInputDevices.length > 0) {
        await audioVideo.startVideoInput(videoInputDevices[0].deviceId);
        await audioVideo.startLocalVideoTile();
        
        // Vincular después de un breve delay
        setTimeout(() => {
          if (localVideoRef.current) {
            audioVideo.bindVideoElement(0, localVideoRef.current);
            console.log('✅ Video reiniciado y vinculado');
          }
        }, 200);
        
        setIsVideoOn(true);
        console.log('✅ Video reiniciado correctamente');
      }
    } catch (error) {
      console.error('❌ Error reiniciando video:', error);
    }
  };

  // Finalizar reunión (solo doctor)
  const endMeeting = async () => {
    if (!meeting || !isDoctor) return;

    try {
      // Detener audio/video si está en la reunión
      if (meetingSession && isInMeeting) {
        const audioVideo = meetingSession.audioVideo;
        await audioVideo.stop();
        console.log('🔚 Audio/video detenido');
      }

      // Finalizar la reunión
      const response = await MeetingService.endMeeting(meeting.meetingId);
      if (!response.success) {
        throw new Error(response.error || 'No se pudo finalizar la reunión');
      }

      // Actualizar el estado de la cita a "Completada" si existe
      if (citaData && citaData._id) {
        try {
          const updateResponse = await AppointmentService.updateAppointment(citaData._id, {
            estado: 'Completada'
          });
          
          if (updateResponse.success) {
            console.log('✅ Estado de cita actualizado a Completada');
          } else {
            console.warn('⚠️ No se pudo actualizar el estado de la cita:', updateResponse.message);
          }
        } catch (updateError) {
          console.error('❌ Error actualizando estado de cita:', updateError);
          // No lanzar error aquí para no interrumpir el flujo principal
        }
      }

      showAlert({
        type: 'success',
        title: 'Teleconsulta finalizada',
        message: 'La teleconsulta ha sido finalizada y la cita marcada como completada'
      });
      navigate(`/${tenant?.domain}/doctor/citas`);
      
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Error al finalizar la teleconsulta'
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando teleconsulta...</h2>
          <p className="text-gray-600">Por favor espere mientras preparamos su sesión</p>
        </div>
      </div>
    );
  }

  // Estado de espera para pacientes cuando el doctor no ha iniciado
  if (!inCall && isPatient && meeting?.status === 'created') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4 text-center">
          <Video className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Teleconsulta</h1>
          <p className="text-gray-600 mb-6">
            {citaData 
              ? `Consulta con Dr. ${citaData.doctorId.name} ${citaData.doctorId.lastName}`
              : 'Esperando al doctor...'
            }
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-pulse h-3 w-3 bg-yellow-400 rounded-full mr-3"></div>
              <p className="text-yellow-800 text-sm">
                Esperando a que el doctor inicie la teleconsulta...
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/${tenant?.domain}/doctor/citas`)}
            className="w-full text-gray-600 hover:text-gray-800 py-2"
          >
            Volver a Mis Citas
          </button>
        </div>
      </div>
    );
  }

  // Estado de carga si no está en llamada y no es paciente esperando
  if (!inCall) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conectando a la teleconsulta...</h2>
          <p className="text-gray-600">Por favor espere mientras preparamos su sesión</p>
        </div>
      </div>
    );
  }

  // Vista principal de videoconsulta
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Video className="h-6 w-6 mr-3" />
          <div>
            <h1 className="font-semibold">Teleconsulta</h1>
            {citaData && (
              <p className="text-sm text-gray-300">
                {citaData.motivo || 'Cita virtual'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Controles de video */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${
                !isMuted ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {!isMuted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          </div>

          {/* Botón finalizar (solo doctor) */}
          {isDoctor && (
            <button
              onClick={endMeeting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Contenido principal con paneles redimensionables */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Panel de video */}
          <Panel 
            defaultSize={isDoctor ? 60 : 100} 
            minSize={30}
            className="relative bg-black overflow-hidden"
          >
            {/* Video remoto (paciente o doctor) */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />

            {/* Video local (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ display: isVideoOn ? 'block' : 'none' }}
              />
            </div>

            {/* Overlay de información */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
              <p className="text-sm">
                {meeting?.status === 'active' ? 'En llamada' : 'Conectando...'}
              </p>
            </div>
          </Panel>

          {/* Divisor redimensionable (solo visible si es doctor) */}
          {isDoctor && (
            <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-gray-400 transition-colors relative group">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-8 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </PanelResizeHandle>
          )}

          {/* Panel de formularios del doctor */}
          {isDoctor && (
            <Panel 
              defaultSize={40} 
              minSize={25}
              className="bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden"
            >
              {/* Tabs */}
              <div className="border-b border-gray-200 flex-shrink-0">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'history'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Historia Clínica
                  </button>
                  <button
                    onClick={() => setActiveTab('prescriptions')}
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'prescriptions'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Stethoscope className="h-4 w-4 inline mr-2" />
                    Prescripciones
                  </button>
                </nav>
              </div>

              {/* Contenido del sidebar con scroll interno */}
              <div className="flex-1 overflow-y-auto h-0">
                {activeTab === 'history' && (
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4 text-primary-800 border-b pb-2">
                      Historia Clínica
                    </h2>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">Motivo de consulta</h3>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Describa el motivo de la consulta..."
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">Síntomas actuales</h3>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Describa los síntomas que presenta el paciente..."
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">Antecedentes médicos</h3>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Historial médico relevante..."
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">Examen físico</h3>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Hallazgos del examen físico..."
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">Diagnóstico</h3>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Diagnóstico presuntivo o definitivo..."
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">Plan de tratamiento</h3>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Plan de tratamiento y recomendaciones..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'prescriptions' && (
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4 text-primary-800 border-b pb-2">
                      Prescripciones
                    </h2>
                    
                    {/* Subpestañas de prescripciones */}
                    <div className="flex flex-wrap mb-4 bg-gray-100 rounded-lg p-1">
                      <button 
                        onClick={() => setActivePrescriptionTab('formulas')}
                        className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
                          activePrescriptionTab === 'formulas' ? 'bg-primary-600 text-white' : 'bg-white'
                        }`}
                      >
                        Fórmulas Médicas
                      </button>
                      <button 
                        onClick={() => setActivePrescriptionTab('examenes')}
                        className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
                          activePrescriptionTab === 'examenes' ? 'bg-primary-600 text-white' : 'bg-white'
                        }`}
                      >
                        Exámenes de Laboratorio
                      </button>
                      <button 
                        onClick={() => setActivePrescriptionTab('incapacidad')}
                        className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
                          activePrescriptionTab === 'incapacidad' ? 'bg-primary-600 text-white' : 'bg-white'
                        }`}
                      >
                        Incapacidad
                      </button>
                      <button 
                        onClick={() => setActivePrescriptionTab('apoyo')}
                        className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
                          activePrescriptionTab === 'apoyo' ? 'bg-primary-600 text-white' : 'bg-white'
                        }`}
                      >
                        Apoyo Terapéutico
                      </button>
                      <button 
                        onClick={() => setActivePrescriptionTab('interconsulta')}
                        className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
                          activePrescriptionTab === 'interconsulta' ? 'bg-primary-600 text-white' : 'bg-white'
                        }`}
                      >
                        Interconsulta
                      </button>
                      <button 
                        onClick={() => setActivePrescriptionTab('ayudas')}
                        className={`px-3 py-2 text-sm rounded-md mr-1 mb-1 ${
                          activePrescriptionTab === 'ayudas' ? 'bg-primary-600 text-white' : 'bg-white'
                        }`}
                      >
                        Ayudas Diagnósticas
                      </button>
                    </div>
                    
                    {/* Contenido de las subpestañas */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      {activePrescriptionTab === 'formulas' && (
                        <div className="text-center py-8">
                          <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Componente de Fórmulas Médicas</p>
                          <p className="text-sm text-gray-400 mt-2">Se integrará próximamente</p>
                        </div>
                      )}
                      
                      {activePrescriptionTab === 'examenes' && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Componente de Exámenes de Laboratorio</p>
                          <p className="text-sm text-gray-400 mt-2">Se integrará próximamente</p>
                        </div>
                      )}
                      
                      {activePrescriptionTab === 'incapacidad' && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Componente de Incapacidad</p>
                          <p className="text-sm text-gray-400 mt-2">Se integrará próximamente</p>
                        </div>
                      )}
                      
                      {activePrescriptionTab === 'apoyo' && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Componente de Apoyo Terapéutico</p>
                          <p className="text-sm text-gray-400 mt-2">Se integrará próximamente</p>
                        </div>
                      )}
                      
                      {activePrescriptionTab === 'interconsulta' && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Componente de Interconsulta</p>
                          <p className="text-sm text-gray-400 mt-2">Se integrará próximamente</p>
                        </div>
                      )}
                      
                      {activePrescriptionTab === 'ayudas' && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Componente de Ayudas Diagnósticas</p>
                          <p className="text-sm text-gray-400 mt-2">Se integrará próximamente</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </PanelGroup>
      </div>
    </div>
  );
};

export default TenantVideoCall;
