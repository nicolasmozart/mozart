import { Response } from 'express';
import { ClientDatabaseService } from '../services/clientDatabaseService';
import { chimeClient, chimeMediaClient, videoCallConfig } from '../config/awsConfig';
import { 
  CreateMeetingCommand, 
  CreateAttendeeCommand, 
  DeleteMeetingCommand, 
  GetMeetingCommand 
} from '@aws-sdk/client-chime-sdk-meetings';
import { 
  CreateMediaCapturePipelineCommand, 
  DeleteMediaCapturePipelineCommand 
} from '@aws-sdk/client-chime-sdk-media-pipelines';
import { TenantRequest } from '../middlewares/tenantDetection';

/**
 * Debug: Verificar configuración de AWS
 */
export const debugAWSConfig = async (req: TenantRequest, res: Response) => {
  try {
    const config = {
      region: process.env.AWS_REGION || 'us-east-1',
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasS3Bucket: !!process.env.AWS_CHIME_S3_BUCKET_ARN,
      videoCallConfig: videoCallConfig
    };

    console.log('🔍 AWS Config Debug:', config);

    res.json({
      success: true,
      config: config
    });
  } catch (error: any) {
    console.error('❌ Error verificando configuración AWS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Crear una nueva reunión de videoconsulta
 */
export const createMeeting = async (req: TenantRequest, res: Response) => {
  try {
    const { externalMeetingId, citaId } = req.body;
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant no detectado'
      });
    }

    const { databaseUrl, databaseName } = req.tenant;

    // Conectar a la base de datos del tenant
    const clientConnection = await ClientDatabaseService.connectToClientDB(databaseUrl, databaseName);
    const Meeting = ClientDatabaseService.getMeetingModel(clientConnection, databaseName);
    const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, databaseName);

    // Verificar si la cita existe y es válida
    if (citaId) {
      const cita = await Appointment.findById(citaId);
      if (!cita) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        });
      }

      // Verificar que la cita sea virtual
      if (cita.tipo !== 'Virtual') {
        return res.status(400).json({
          success: false,
          error: 'Solo se pueden crear videoconsultas para citas virtuales'
        });
      }
    }

    // Crear la reunión en AWS Chime
    const createMeetingCommand = new CreateMeetingCommand({
      ClientRequestToken: Date.now().toString(),
      MediaRegion: videoCallConfig.defaultRegion,
      ExternalMeetingId: externalMeetingId || `Meeting-${databaseName}-${Date.now()}`
    });

    const meetingResponse = await chimeClient.send(createMeetingCommand);

    // Crear objeto para guardar en BD del tenant
    const meeting = new Meeting({
      meetingId: meetingResponse.Meeting!.MeetingId,
      externalMeetingId: meetingResponse.Meeting!.ExternalMeetingId,
      citaId: citaId || null,
      meetingData: meetingResponse.Meeting,
      transcriptionEnabled: videoCallConfig.autoStartTranscription
    });

    // Iniciar grabación automática si está configurado
    let pipelineId = null;
    if (videoCallConfig.autoStartRecording && videoCallConfig.s3BucketArn) {
      try {
        const mediaPipelineCommand = new CreateMediaCapturePipelineCommand({
          SourceType: 'ChimeSdkMeeting',
          SourceArn: meetingResponse.Meeting!.MeetingArn,
          SinkType: 'S3Bucket',
          SinkArn: videoCallConfig.s3BucketArn
        });

        const pipelineResponse = await chimeMediaClient.send(mediaPipelineCommand);
        pipelineId = pipelineResponse.MediaCapturePipeline?.MediaPipelineId;
        meeting.pipelineId = pipelineId;

        console.log(`📹 Grabación iniciada para meeting ${meeting.meetingId}: ${pipelineId}`);
      } catch (pipelineError) {
        console.error('⚠️ Error iniciando grabación (continuando sin grabación):', pipelineError);
      }
    }

    // Guardar en BD del tenant
    await meeting.save();

    // Actualizar la cita con el meetingId si existe
    if (citaId) {
      await Appointment.findByIdAndUpdate(citaId, {
        meetingId: meeting.meetingId,
        estado: 'Agendada'
      });
    }

    console.log(`✅ Videoconsulta creada: ${meeting.meetingId} ${citaId ? `para cita ${citaId}` : 'independiente'}`);

    res.status(201).json({
      success: true,
      message: 'Reunión creada exitosamente',
      meeting: {
        meetingId: meeting.meetingId,
        externalMeetingId: meeting.externalMeetingId,
        meetingData: meeting.meetingData,
        citaId: meeting.citaId,
        status: meeting.status,
        transcriptionEnabled: meeting.transcriptionEnabled,
        recordingEnabled: !!pipelineId
      }
    });

  } catch (error: any) {
    console.error('❌ Error creando reunión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Crear un attendee para una reunión existente
 */
export const createAttendee = async (req: TenantRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const { externalUserId, role } = req.body;
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant no detectado'
      });
    }

    const { databaseUrl, databaseName } = req.tenant;

    // Conectar a la base de datos del tenant
    const clientConnection = await ClientDatabaseService.connectToClientDB(databaseUrl, databaseName);
    const Meeting = ClientDatabaseService.getMeetingModel(clientConnection, databaseName);

    // Verificar que la reunión existe
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    if (meeting.status === 'ended' || meeting.status === 'expired') {
      return res.status(400).json({
        success: false,
        error: 'La reunión ya ha finalizado'
      });
    }

    // Crear attendee en AWS Chime
    const createAttendeeCommand = new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: externalUserId || `User-${Date.now()}`
    });

    const attendeeResponse = await chimeClient.send(createAttendeeCommand);

    // Agregar attendee a la reunión en BD
    const attendeeData = {
      ...attendeeResponse.Attendee,
      role: role || 'participant',
      joinedAt: new Date()
    };

    meeting.attendees.push(attendeeData);
    
    // Actualizar estado si es el primer attendee
    if (meeting.status === 'created') {
      meeting.status = 'active';
    }
    
    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Attendee creado exitosamente',
      attendee: attendeeResponse.Attendee,
      meeting: {
        meetingId: meeting.meetingId,
        status: meeting.status
      }
    });

  } catch (error: any) {
    console.error('❌ Error creando attendee:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener información de una reunión
 */
export const getMeeting = async (req: TenantRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant no detectado'
      });
    }

    const { databaseUrl, databaseName } = req.tenant;

    // Conectar a la base de datos del tenant
    const clientConnection = await ClientDatabaseService.connectToClientDB(databaseUrl, databaseName);
    const Meeting = ClientDatabaseService.getMeetingModel(clientConnection, databaseName);

    // Buscar reunión en BD del tenant
    const meeting = await Meeting.findOne({ meetingId }).populate('citaId');
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    res.json({
      success: true,
      meeting: {
        meetingId: meeting.meetingId,
        externalMeetingId: meeting.externalMeetingId,
        citaId: meeting.citaId,
        meetingData: meeting.meetingData,
        attendees: meeting.attendees,
        status: meeting.status,
        transcriptionEnabled: meeting.transcriptionEnabled,
        pipelineId: meeting.pipelineId,
        grabacionUrl: meeting.grabacionUrl,
        duracionMinutos: meeting.duracionMinutos,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo reunión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Finalizar una reunión
 */
export const endMeeting = async (req: TenantRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant no detectado'
      });
    }

    const { databaseUrl, databaseName } = req.tenant;

    // Conectar a la base de datos del tenant
    const clientConnection = await ClientDatabaseService.connectToClientDB(databaseUrl, databaseName);
    const Meeting = ClientDatabaseService.getMeetingModel(clientConnection, databaseName);

    // Buscar reunión en BD del tenant
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    if (meeting.status === 'ended') {
      return res.status(400).json({
        success: false,
        error: 'La reunión ya ha sido finalizada'
      });
    }

    // Finalizar reunión en AWS Chime
    try {
      const deleteMeetingCommand = new DeleteMeetingCommand({
        MeetingId: meetingId
      });
      await chimeClient.send(deleteMeetingCommand);
    } catch (awsError) {
      console.warn('⚠️ Error finalizando reunión en AWS (puede que ya esté finalizada):', awsError);
    }

    // Finalizar grabación si existe
    if (meeting.pipelineId) {
      try {
        const deletePipelineCommand = new DeleteMediaCapturePipelineCommand({
          MediaPipelineId: meeting.pipelineId
        });
        await chimeMediaClient.send(deletePipelineCommand);
        console.log(`📹 Grabación finalizada: ${meeting.pipelineId}`);
      } catch (pipelineError) {
        console.warn('⚠️ Error finalizando grabación:', pipelineError);
      }
    }

    // Calcular duración
    const duracionMs = Date.now() - meeting.createdAt.getTime();
    const duracionMinutos = Math.round(duracionMs / (1000 * 60));

    // Actualizar estado en BD del tenant
    meeting.status = 'ended';
    meeting.duracionMinutos = duracionMinutos;
    await meeting.save();

    console.log(`✅ Videoconsulta finalizada: ${meeting.meetingId}. Duración: ${duracionMinutos} minutos`);

    res.json({
      success: true,
      message: 'Reunión finalizada exitosamente',
      meeting: {
        meetingId: meeting.meetingId,
        status: meeting.status,
        duracionMinutos: meeting.duracionMinutos
      }
    });

  } catch (error: any) {
    console.error('❌ Error finalizando reunión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Listar todas las reuniones del tenant
 */
export const listMeetings = async (req: TenantRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, citaId } = req.query;
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant no detectado'
      });
    }

    const { databaseUrl, databaseName } = req.tenant;

    // Conectar a la base de datos del tenant
    const clientConnection = await ClientDatabaseService.connectToClientDB(databaseUrl, databaseName);
    const Meeting = ClientDatabaseService.getMeetingModel(clientConnection, databaseName);
    const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, databaseName);

    // Construir filtros
    const filters: any = {};
    if (status) filters.status = status;
    if (citaId) filters.citaId = citaId;

    // Paginar resultados
    const skip = (Number(page) - 1) * Number(limit);
    const meetings = await Meeting.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Meeting.countDocuments(filters);

    res.json({
      success: true,
      meetings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalMeetings: total,
        hasNextPage: skip + meetings.length < total,
        hasPrevPage: Number(page) > 1
      }
    });

  } catch (error: any) {
    console.error('❌ Error listando reuniones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};
