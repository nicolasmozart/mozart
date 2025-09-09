const Meeting = require('../models/Meeting');
const { chimeClient, chimeMediaClient } = require('../config/awsConfig');
const { CreateMeetingCommand, CreateAttendeeCommand, DeleteMeetingCommand, GetMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');
const meetingService = require('../services/meetingService');
const Cita = require('../models/Cita');
const { enviarResumenConsultaRicaurte, enviarResumenConsultaNimaima, enviarResumenConsultaFlorian, enviarResumenConsultaOlivares, enviarResumenConsultaJunin } = require('../config/twilio');
const { CreateMediaCapturePipelineCommand, DeleteMediaCapturePipelineCommand } = require('@aws-sdk/client-chime-sdk-media-pipelines');

// Crear una nueva reunión
// Crear una nueva reunión
exports.createMeeting = async (req, res) => {
  try {
    const { externalMeetingId, citaId } = req.body;

    // Verificar si la cita existe
    if (citaId) {
      const cita = await Cita.findById(citaId);
      if (!cita) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        });
      }
    }

    // Crear la reunión
    const createMeetingCommand = new CreateMeetingCommand({
      ClientRequestToken: Date.now().toString(),
      MediaRegion: process.env.AWS_REGION || 'us-east-1',
      ExternalMeetingId: externalMeetingId || `Meeting-${Date.now()}`
    });

    const meetingResponse = await chimeClient.send(createMeetingCommand);

    // Crear objeto para guardar
    const meeting = new Meeting({
      meetingId: meetingResponse.Meeting.MeetingId,
      externalMeetingId: meetingResponse.Meeting.ExternalMeetingId,
      meetingData: meetingResponse.Meeting
    });

    // Iniciar grabación automática usando Media Pipeline
    try {
      const mediaPipelineCommand = new CreateMediaCapturePipelineCommand({
        SourceType: 'ChimeSdkMeeting',
        SourceArn: meetingResponse.Meeting.MeetingArn,
        SinkType: 'S3Bucket',
        SinkArn: process.env.AWS_CHIME_S3_BUCKET_ARN
      });

      const pipelineResponse = await chimeMediaClient.send(mediaPipelineCommand);
      console.log('Grabación iniciada automáticamente:', pipelineResponse);

      // Guardar pipelineId
      meeting.pipelineId = pipelineResponse.MediaCapturePipeline.MediaPipelineId;

    } catch (pipelineError) {
      console.error('Error al iniciar la grabación automática:', pipelineError);
    }

    await meeting.save();

    // Actualizar la cita si fue proporcionada
    if (citaId) {
      await Cita.findByIdAndUpdate(citaId, {
        meetingId: meetingResponse.Meeting.MeetingId
      });
    }

    res.status(201).json({
      success: true,
      data: meetingResponse
    });

  } catch (error) {
    console.error('Error al crear reunión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear reunión',
      details: error.message
    });
  }
};



// Obtener una reunión específica
exports.getMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('Error al obtener reunión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener reunión',
      details: error.message
    });
  }
};

// Función para verificar si una reunión existe en AWS Chime
async function checkMeetingStatus(meetingId) {
  try {
    const getMeetingCommand = new GetMeetingCommand({
      MeetingId: meetingId
    });
    await chimeClient.send(getMeetingCommand);
    return { exists: true, status: 'active' };
  } catch (error) {
    if (error.name === 'NotFoundException') {
      return { exists: false, status: 'expired' };
    }
    throw error; // Otros errores se propagan
  }
}

// Crear un asistente para una reunión
exports.createAttendee = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { externalUserId, userId, name } = req.body;

    // Verificar si la reunión existe en nuestra base de datos
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada en la base de datos'
      });
    }

    // Verificar estado en AWS Chime
    const meetingStatus = await checkMeetingStatus(meetingId);

    // Actualizar estado en nuestra base de datos
    if (meeting.status !== meetingStatus.status) {
      meeting.status = meetingStatus.status;
      await meeting.save();
    }

    // Si la reunión no existe en AWS, informar al usuario
    if (!meetingStatus.exists) {
      return res.status(400).json({
        success: false,
        error: 'La reunión ha expirado en AWS Chime',
        meetingStatus: meetingStatus.status
      });
    }

    // Continuamos con la creación del asistente
    try {
      const createAttendeeCommand = new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: `${userId || Date.now()}-${name || 'attendee'}`,
      });

      const attendeeResponse = await chimeClient.send(createAttendeeCommand);

      meeting.attendees.push(attendeeResponse.Attendee);
      await meeting.save();

      res.status(201).json({
        success: true,
        data: attendeeResponse
      });
    } catch (awsError) {
      throw awsError;
    }
  } catch (error) {
    console.error('Error al crear asistente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear asistente',
      details: error.message
    });
  }
};

// Nueva función para finalizar una reunión en AWS Chime
exports.endMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const resumenDocumentos = req.body;
    console.log(`Intentando finalizar reunión con ID: ${meetingId}`);
    console.log('Datos de resumen recibidos:', JSON.stringify(resumenDocumentos));

    // Verificar si la reunión existe en nuestra base de datos
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      console.log(`Reunión ${meetingId} no encontrada en la base de datos`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada en la base de datos'
      });
    }

    try {
      // Log del intento de eliminación en AWS
      console.log(`Intentando eliminar reunión ${meetingId} en AWS Chime`);

      if (meeting.pipelineId) {
        try {
          const deletePipelineCommand = new DeleteMediaCapturePipelineCommand({
            MediaPipelineId: meeting.pipelineId
          });
      
          await chimeMediaClient.send(deletePipelineCommand);
          console.log(`Grabación detenida correctamente (pipelineId: ${meeting.pipelineId})`);
        } catch (pipelineError) {
          console.error('Error al detener la grabación:', pipelineError);
        }
      }
      
      // Eliminar la reunión en AWS Chime
      const deleteMeetingCommand = new DeleteMeetingCommand({
        MeetingId: meetingId
      });

      await chimeClient.send(deleteMeetingCommand);
      console.log(`Reunión ${meetingId} eliminada correctamente en AWS Chime`);

      // Actualizar el estado en la base de datos
      meeting.status = 'ended';
      await meeting.save();

      // Buscar y actualizar la cita asociada a este meetingId, haciendo populate al pacienteId
      const cita = await Cita.findOne({ meetingId }).populate('pacienteId');
      if (cita) {
        cita.estado = 'completada';
        await cita.save();
        console.log(`Cita asociada a la reunión ${meetingId} marcada como completada`);

        // Si tenemos resumenDocumentos con URLs, enviar correo con el resumen según el hospital
        if (resumenDocumentos && Object.keys(resumenDocumentos).length > 0) {
          console.log(`Intentando enviar resumen para la cita ${cita._id}`);
          try {
            // Determinar qué función de envío usar según el hospital del paciente
            if (cita.pacienteId && cita.pacienteId.hospital) {
              if (cita.pacienteId.hospital === 'Ricaurte') {
                console.log('Enviando resumen para hospital Ricaurte');
                const resultado = await enviarResumenConsultaRicaurte(cita._id, resumenDocumentos);
                console.log(`Resultado del envío de correo Ricaurte:`, resultado);
              } else if (cita.pacienteId.hospital === 'Nimaima') {
                console.log('Enviando resumen para hospital Nimaima');
                const resultado = await enviarResumenConsultaNimaima(cita._id, resumenDocumentos);
                console.log(`Resultado del envío de correo Nimaima:`, resultado);
              } else if (cita.pacienteId.hospital === 'Florian') {
                console.log('Enviando resumen para hospital Florian');
                const resultado = await enviarResumenConsultaFlorian(cita._id, resumenDocumentos);
                console.log(`Resultado del envío de correo Florian:`, resultado);
              } else if (cita.pacienteId.hospital === 'Olivares') {
                console.log('Enviando resumen para hospital Olivares');
                const resultado = await enviarResumenConsultaOlivares(cita._id, resumenDocumentos);
                console.log(`Resultado del envío de correo Olivares:`, resultado);
              } else if (cita.pacienteId.hospital === 'Junin') {
                console.log('Enviando resumen para hospital Junín');
                const resultado = await enviarResumenConsultaJunin(cita._id, resumenDocumentos);
                console.log(`Resultado del envío de correo Junín:`, resultado);
              } else {
                console.log(`Hospital no reconocido: ${cita.pacienteId.hospital}, no se enviará correo`);
              }
            } else {
              console.log('No se pudo determinar el hospital del paciente, no se enviará correo');
            }
          } catch (emailError) {
            console.error('Error al enviar correo con resumen:', emailError);
          }
        } else {
          console.log('No se recibieron datos de resumen válidos');
        }
      } else {
        console.log(`No se encontró cita asociada a la reunión ${meetingId}`);
      }

      res.status(200).json({
        success: true,
        message: 'Reunión finalizada correctamente',
        meetingId,
        citaActualizada: cita ? true : false,
        resumenEnviado: resumenDocumentos && Object.keys(resumenDocumentos).length > 0
      });
    } catch (awsError) {
      console.error(`Error de AWS al eliminar reunión ${meetingId}:`, awsError);

      // Si la reunión ya no existe en AWS, actualizamos su estado igualmente
      if (awsError.name === 'NotFoundException') {
        meeting.status = 'expired';
        await meeting.save();

        // Buscar y actualizar la cita asociada a este meetingId, haciendo populate al pacienteId
        const cita = await Cita.findOne({ meetingId }).populate('pacienteId');
        if (cita) {
          cita.estado = 'completada';
          await cita.save();
          console.log(`Cita asociada a la reunión ${meetingId} marcada como completada`);

          // Si tenemos resumenDocumentos con URLs, enviar correo con el resumen según el hospital
          if (resumenDocumentos && Object.keys(resumenDocumentos).length > 0) {
            console.log(`Intentando enviar resumen para la cita ${cita._id}`);
            try {
              // Determinar qué función de envío usar según el hospital del paciente
              if (cita.pacienteId && cita.pacienteId.hospital) {
                if (cita.pacienteId.hospital === 'Ricaurte') {
                  console.log('Enviando resumen para hospital Ricaurte');
                  const resultado = await enviarResumenConsultaRicaurte(cita._id.toString(), resumenDocumentos);
                  console.log(`Resultado del envío de correo Ricaurte:`, resultado);
                } else if (cita.pacienteId.hospital === 'Nimaima') {
                  console.log('Enviando resumen para hospital Nimaima');
                  const resultado = await enviarResumenConsultaNimaima(cita._id.toString(), resumenDocumentos);
                  console.log(`Resultado del envío de correo Nimaima:`, resultado);
                } else if (cita.pacienteId.hospital === 'Florian') {
                  console.log('Enviando resumen para hospital Florian');
                  const resultado = await enviarResumenConsultaFlorian(cita._id.toString(), resumenDocumentos);
                  console.log(`Resultado del envío de correo Florian:`, resultado);
                } else if (cita.pacienteId.hospital === 'Olivares') {
                  console.log('Enviando resumen para hospital Olivares');
                  const resultado = await enviarResumenConsultaOlivares(cita._id.toString(), resumenDocumentos);
                  console.log(`Resultado del envío de correo Olivares:`, resultado);
                } else if (cita.pacienteId.hospital === 'Junin') {
                  console.log('Enviando resumen para hospital Junín');
                  const resultado = await enviarResumenConsultaJunin(cita._id.toString(), resumenDocumentos);
                  console.log(`Resultado del envío de correo Junín:`, resultado);
                } else {
                  console.log(`Hospital no reconocido: ${cita.pacienteId.hospital}, no se enviará correo`);
                }
              } else {
                console.log('No se pudo determinar el hospital del paciente, no se enviará correo');
              }
            } catch (emailError) {
              console.error('Error al enviar correo con resumen:', emailError);
            }
          } else {
            console.log('No se recibieron datos de resumen válidos');
          }
        } else {
          console.log(`No se encontró cita asociada a la reunión ${meetingId}`);
        }

        return res.status(200).json({
          success: true,
          message: 'La reunión ya había finalizado en AWS Chime',
          meetingId,
          citaActualizada: cita ? true : false,
          resumenEnviado: resumenDocumentos && Object.keys(resumenDocumentos).length > 0
        });
      }

      throw awsError;
    }
  } catch (error) {
    console.error('Error al finalizar reunión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al finalizar reunión',
      details: error.message
    });
  }
};

// Función periódica para sincronizar estados (opcional)
exports.syncMeetingsStatus = async () => {
  try {
    const activeMeetings = await Meeting.find({
      status: { $in: ['active', 'created'] }
    });

    for (const meeting of activeMeetings) {
      const statusInfo = await checkMeetingStatus(meeting.meetingId);

      if (meeting.status !== statusInfo.status) {
        meeting.status = statusInfo.status;
        await meeting.save();
        console.log(`Estado de reunión ${meeting.meetingId} actualizado a: ${statusInfo.status}`);
      }
    }

    return { success: true, processed: activeMeetings.length };
  } catch (error) {
    console.error('Error al sincronizar reuniones:', error);
    return { success: false, error: error.message };
  }
};

// Listar todas las reuniones
exports.listMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    console.error('Error al listar reuniones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar reuniones',
      details: error.message
    });
  }
};

// Eliminar una reunión
exports.deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const result = await meetingService.deleteMeeting(meetingId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error al eliminar reunión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar reunión',
      details: error.message
    });
  }
};

// Limpiar reuniones expiradas
exports.cleanupExpiredMeetings = async () => {
  try {
    // MongoDB se encargará automáticamente de eliminar documentos expirados
    // gracias al índice TTL que configuramos en el esquema (expires: 86400)
    console.log('Limpieza de reuniones expiradas ejecutada');
  } catch (error) {
    console.error('Error al limpiar reuniones expiradas:', error);
  }
};

// Función para obtener todas las reuniones
exports.getMeetings = async (req, res) => {
  try {
    // Obtener reuniones ordenadas por fecha de creación descendente
    const meetings = await Meeting.find()
      .sort({ createdAt: -1 });

    // Verificar si hay reuniones que necesitan actualización de estado
    const meetingsToUpdate = meetings.filter(meeting =>
      ['created', 'active'].includes(meeting.status)
    );

    // Actualizar estado de reuniones activas/creadas en paralelo
    if (meetingsToUpdate.length > 0) {
      await Promise.all(meetingsToUpdate.map(async (meeting) => {
        try {
          const statusInfo = await checkMeetingStatus(meeting.meetingId);
          if (meeting.status !== statusInfo.status) {
            meeting.status = statusInfo.status;
            await meeting.save();
          }
        } catch (error) {
          console.error(`Error al verificar estado de reunión ${meeting.meetingId}:`, error);
        }
      }));

      // Volver a obtener las reuniones con estados actualizados
      const updatedMeetings = await Meeting.find().sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: updatedMeetings.length,
        data: updatedMeetings
      });
    }

    // Si no hay reuniones que actualizar, devolver las reuniones originales
    res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    console.error('Error al obtener reuniones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las reuniones'
    });
  }
}; 