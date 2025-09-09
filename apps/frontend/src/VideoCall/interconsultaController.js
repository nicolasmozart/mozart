const Interconsulta = require('../models/Interconsulta');
const Patient = require('../models/Patients');
const Doctor = require('../models/Doctor');
const Cita = require('../models/Cita');
const mongoose = require('mongoose');
const { crearPDFInterconsulta } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');
const axios = require('axios');
const SeguimientoLog = require('../models/SeguimientoLogs');

// Crear una nueva interconsulta
exports.crearInterconsulta = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, servicio, especialidad, motivoConsulta } = req.body;

    // Validar que existan los campos necesarios
    if (!citaId || !pacienteId || !doctorId || !servicio || !especialidad || !motivoConsulta) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    // Verificar que los IDs sean válidos
    if (!mongoose.Types.ObjectId.isValid(citaId) || 
        !mongoose.Types.ObjectId.isValid(pacienteId) || 
        !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Uno o más IDs no son válidos'
      });
    }

    // Verificar que existan la cita, el paciente y el doctor
    const [citaExiste, pacienteExiste, doctorExiste] = await Promise.all([
      Cita.findById(citaId),
      Patient.findById(pacienteId),
      Doctor.findById(doctorId)
    ]);

    if (!citaExiste) {
      return res.status(404).json({
        success: false,
        message: 'La cita no existe'
      });
    }

    if (!pacienteExiste) {
      return res.status(404).json({
        success: false,
        message: 'El paciente no existe'
      });
    }

    if (!doctorExiste) {
      return res.status(404).json({
        success: false,
        message: 'El doctor no existe'
      });
    }

    // Crear la nueva interconsulta
    const nuevaInterconsulta = new Interconsulta({
      citaId,
      pacienteId,
      doctorId,
      servicio,
      especialidad,
      motivoConsulta
    });

    // Guardar la interconsulta
    await nuevaInterconsulta.save();

    // Generar PDF
    const pdfBuffer = await crearPDFInterconsulta(nuevaInterconsulta, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `interconsulta_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/interconsultas`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la interconsulta con la URL del PDF
      nuevaInterconsulta.pdfUrl = pdfUrl;
      await nuevaInterconsulta.save();
    }

    res.status(201).json({
      success: true,
      message: 'Interconsulta creada exitosamente',
      data: nuevaInterconsulta,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al crear interconsulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la interconsulta',
      error: error.message
    });
  }
};

// Obtener interconsultas por paciente
exports.obtenerInterconsultasPorPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente no válido'
      });
    }

    const interconsultas = await Interconsulta.find({ pacienteId })
      .populate('doctorId', 'name lastName especialidad')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: interconsultas
    });
  } catch (error) {
    console.error('Error al obtener interconsultas por paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las interconsultas',
      error: error.message
    });
  }
};

// Obtener una interconsulta específica
exports.obtenerInterconsulta = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de interconsulta no válido'
      });
    }

    const interconsulta = await Interconsulta.findById(id)
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!interconsulta) {
      return res.status(404).json({
        success: false,
        message: 'Interconsulta no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: interconsulta
    });
  } catch (error) {
    console.error('Error al obtener interconsulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la interconsulta',
      error: error.message
    });
  }
};

// Obtener interconsulta por cita
exports.obtenerInterconsultaPorCita = async (req, res) => {
  try {
    const { citaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(citaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cita no válido'
      });
    }

    const interconsulta = await Interconsulta.findOne({ citaId })
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!interconsulta) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró interconsulta para esta cita'
      });
    }

    res.status(200).json({
      success: true,
      data: interconsulta
    });
  } catch (error) {
    console.error('Error al obtener interconsulta por cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la interconsulta',
      error: error.message
    });
  }
};

// Nuevo controlador para verificar y crear interconsulta
exports.verificarYCrearInterconsulta = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, servicio, especialidades } = req.body;

    // Validar que existan los campos necesarios
    if (!citaId || !pacienteId || !doctorId || !servicio || !especialidades || especialidades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }
    console.log(citaId, pacienteId, doctorId, servicio, especialidades);

    // Verificar que los IDs sean válidos
    if (!mongoose.Types.ObjectId.isValid(citaId) || 
        !mongoose.Types.ObjectId.isValid(pacienteId) || 
        !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Uno o más IDs no son válidos'
      });
    }

    // Verificar que existan la cita, el paciente y el doctor
    const [citaExiste, pacienteExiste, doctorExiste] = await Promise.all([
      Cita.findById(citaId),
      Patient.findById(pacienteId),
      Doctor.findById(doctorId)
    ]);

    if (!citaExiste) {
      return res.status(404).json({
        success: false,
        message: 'La cita no existe'
      });
    }

    if (!pacienteExiste) {
      return res.status(404).json({
        success: false,
        message: 'El paciente no existe'
      });
    }

    if (!doctorExiste) {
      return res.status(404).json({
        success: false,
        message: 'El doctor no existe'
      });
    }
    const interconsultaExistente = await Interconsulta.findOne({ citaId });
    
    if (interconsultaExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una interconsulta para esta cita',
        data: {
          interconsultaId: interconsultaExistente._id,
          pdfUrl: interconsultaExistente.pdfUrl
        }
      });
    }
    // Crear la nueva interconsulta
    const nuevaInterconsulta = new Interconsulta({
      citaId,
      pacienteId,
      doctorId,
      servicio,
      especialidades
    });

    // Guardar la interconsulta
    await nuevaInterconsulta.save();

    // Generar PDF
    const pdfBuffer = await crearPDFInterconsulta(nuevaInterconsulta, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `interconsulta_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/interconsultas`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la interconsulta con la URL del PDF
      nuevaInterconsulta.pdfUrl = pdfUrl;
      await nuevaInterconsulta.save();
    }

    // Crear una cita por cada especialidad
    const citasCreadas = await Promise.all(
      especialidades.map(async (esp) => {
        const nuevaCita = new Cita({
          pacienteId,
          especialidad: esp.especialidadCita,
          estado: 'PendienteAgendar',
          tipo: 'Virtual'
        });
        await nuevaCita.save();
        return {
          citaId: nuevaCita._id,
          especialidad: esp.especialidadCita
        };
      })
    );

    // Enviar notificaciones de WhatsApp para cada cita creada
    const telefono = pacienteExiste.phone;
    const resultsWhatsapp = await Promise.all(
      citasCreadas.map(async (cita) => {
        let especialidad = cita.especialidad;
        try {
          const payloadWhatsapp = {
            telefono,
            especialidad: cita.especialidad,
            citaId: cita.citaId.toString()
          };
          const response = await axios.post(
            'https://whatsapp.mozartai.com.co/whatsapp/saludmental/enviar-template-cita-especifica',
            payloadWhatsapp,
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          // Agregar seguimiento al paciente
          await SeguimientoLog.findOneAndUpdate(
            { patient: pacienteId },
            {
              $push: {
                seguimientos: {
                  fecha: new Date(),
                  usuario: 'Sistema',
                  mensaje: `Se envió agendamiento de cita para ${especialidad}`
                }
              }
            },
            { upsert: true, new: true }
          );
          return {
            citaId: cita.citaId,
            especialidad: cita.especialidad,
            whatsappStatus: 'success',
            response: response.data
          };
        } catch (error) {
          // También registrar el intento fallido en el seguimiento
          await SeguimientoLog.findOneAndUpdate(
            { patient: pacienteId },
            {
              $push: {
                seguimientos: {
                  fecha: new Date(),
                  usuario: 'Sistema',
                  mensaje: `Error al enviar agendamiento de cita para ${especialidad}: ${error.message}`
                }
              }
            },
            { upsert: true, new: true }
          );
          console.error(`Error enviando WhatsApp para cita ${cita.citaId}:`, error.message);
          return {
            citaId: cita.citaId,
            especialidad: cita.especialidad,
            whatsappStatus: 'error',
            error: error.message
          };
        }
      })
    );

    console.log('Resultados de envío de WhatsApp:', resultsWhatsapp);

    res.status(201).json({
      success: true,
      message: 'Interconsulta creada exitosamente',
      data: nuevaInterconsulta,
      pdfUrl,
      whatsapp: resultsWhatsapp
    });
  } catch (error) {
    console.error('Error al verificar y crear interconsulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la interconsulta',
      error: error.message
    });
  }
};