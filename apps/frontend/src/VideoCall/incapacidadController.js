const Incapacidad = require('../models/Incapacidad');
const Cita = require('../models/Cita');
const Patients = require('../models/Patients');
const mongoose = require('mongoose');
const { crearPDFIncapacidad } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');
const Doctor = require('../models/Doctor');
// Crear una nueva incapacidad
exports.crearIncapacidad = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, incapacidad } = req.body;

    // Validar que existan los IDs necesarios
    if (!citaId || !pacienteId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los IDs de cita, paciente y doctor'
      });
    }

    // Validar que los datos de incapacidad estén completos
    if (!incapacidad || !incapacidad.lugarExpedicion || !incapacidad.fechaInicial || 
        !incapacidad.dias || !incapacidad.diagnosticoPrincipal) {
      return res.status(400).json({
        success: false,
        message: 'Datos de incapacidad incompletos'
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
      Patients.findById(pacienteId),
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

    // Crear la nueva incapacidad
    const nuevaIncapacidad = new Incapacidad({
      citaId,
      pacienteId,
      doctorId,
      ...incapacidad
    });

    // Guardar la incapacidad
    await nuevaIncapacidad.save();

    // Generar PDF
    const pdfBuffer = await crearPDFIncapacidad(nuevaIncapacidad, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `incapacidad_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/incapacidades`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la incapacidad con la URL del PDF
      nuevaIncapacidad.pdfUrl = pdfUrl;
      await nuevaIncapacidad.save();
    }

    res.status(201).json({
      success: true,
      message: 'Incapacidad creada exitosamente',
      data: nuevaIncapacidad,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al crear incapacidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la incapacidad',
      error: error.message
    });
  }
};

// Obtener todas las incapacidades de un paciente
exports.obtenerIncapacidadesPorPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente no válido'
      });
    }

    const incapacidades = await Incapacidad.find({ pacienteId })
      .populate('doctorId', 'name lastName especialidad')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: incapacidades
    });
  } catch (error) {
    console.error('Error al obtener incapacidades por paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las incapacidades',
      error: error.message
    });
  }
};

// Obtener una incapacidad específica
exports.obtenerIncapacidad = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de incapacidad no válido'
      });
    }

    const incapacidad = await Incapacidad.findById(id)
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!incapacidad) {
      return res.status(404).json({
        success: false,
        message: 'Incapacidad no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: incapacidad
    });
  } catch (error) {
    console.error('Error al obtener incapacidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la incapacidad',
      error: error.message
    });
  }
};

// Obtener incapacidad por cita
exports.obtenerIncapacidadPorCita = async (req, res) => {
  try {
    const { citaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(citaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cita no válido'
      });
    }

    const incapacidad = await Incapacidad.findOne({ citaId })
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!incapacidad) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró incapacidad para esta cita'
      });
    }

    res.status(200).json({
      success: true,
      data: incapacidad
    });
  } catch (error) {
    console.error('Error al obtener incapacidad por cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la incapacidad',
      error: error.message
    });
  }
};

// Nuevo controlador para verificar y crear incapacidad
exports.verificarYCrearIncapacidad = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, incapacidad } = req.body;

    // Validar que existan los IDs necesarios
    if (!citaId || !pacienteId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los IDs de cita, paciente y doctor'
      });
    }

    // Validar que los datos de incapacidad estén completos
    if (!incapacidad || !incapacidad.lugarExpedicion || !incapacidad.fechaInicial || 
        !incapacidad.dias || !incapacidad.diagnosticoPrincipal) {
      return res.status(400).json({
        success: false,
        message: 'Datos de incapacidad incompletos'
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

    // Verificar si ya existe una incapacidad para esta cita
    const incapacidadExistente = await Incapacidad.findOne({ citaId });
    
    if (incapacidadExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una incapacidad para esta cita',
        data: {
          incapacidadId: incapacidadExistente._id,
          pdfUrl: incapacidadExistente.pdfUrl
        }
      });
    }

    // Verificar que existan la cita, el paciente y el doctor
    const [citaExiste, pacienteExiste, doctorExiste] = await Promise.all([
      Cita.findById(citaId),
      Patients.findById(pacienteId),
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

    // Crear la nueva incapacidad
    const nuevaIncapacidad = new Incapacidad({
      citaId,
      pacienteId,
      doctorId,
      ...incapacidad
    });

    // Guardar la incapacidad
    await nuevaIncapacidad.save();

    // Generar PDF
    const pdfBuffer = await crearPDFIncapacidad(nuevaIncapacidad, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `incapacidad_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/incapacidades`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la incapacidad con la URL del PDF
      nuevaIncapacidad.pdfUrl = pdfUrl;
      await nuevaIncapacidad.save();
    }

    res.status(201).json({
      success: true,
      message: 'Incapacidad creada exitosamente',
      data: nuevaIncapacidad,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al verificar y crear incapacidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la incapacidad',
      error: error.message
    });
  }
};