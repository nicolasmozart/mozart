const ExamenLaboratorio = require('../models/ExamenLaboratorio');
const Cita = require('../models/Cita');
const Patients = require('../models/Patients');
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');
const { crearPDFExamenLaboratorio } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');

// Crear un nuevo examen de laboratorio
exports.crearExamenLaboratorio = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, diagnosticos, examenes } = req.body;

    // Validar que existan los IDs necesarios
    if (!citaId || !pacienteId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los IDs de cita, paciente y doctor'
      });
    }

    // Validar que los datos de exámenes estén completos
    if (!examenes || examenes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un examen'
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

    // Crear el nuevo examen de laboratorio
    const nuevoExamenLaboratorio = new ExamenLaboratorio({
      citaId,
      pacienteId,
      doctorId,
      diagnosticos: diagnosticos || [],
      examenes
    });

    // Guardar el examen de laboratorio
    await nuevoExamenLaboratorio.save();

    // Generar PDF
    const pdfBuffer = await crearPDFExamenLaboratorio(nuevoExamenLaboratorio, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `examen_laboratorio_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/examenes-laboratorio`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar el examen de laboratorio con la URL del PDF
      nuevoExamenLaboratorio.pdfUrl = pdfUrl;
      await nuevoExamenLaboratorio.save();
    }

    res.status(201).json({
      success: true,
      message: 'Examen de laboratorio creado exitosamente',
      data: nuevoExamenLaboratorio,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al crear examen de laboratorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el examen de laboratorio',
      error: error.message
    });
  }
};

// Obtener todos los exámenes de laboratorio de un paciente
exports.obtenerExamenesLaboratorioPorPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente no válido'
      });
    }

    const examenes = await ExamenLaboratorio.find({ pacienteId })
      .populate('doctorId', 'name lastName especialidad')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: examenes
    });
  } catch (error) {
    console.error('Error al obtener exámenes de laboratorio por paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los exámenes de laboratorio',
      error: error.message
    });
  }
};

// Obtener un examen de laboratorio específico
exports.obtenerExamenLaboratorio = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de examen de laboratorio no válido'
      });
    }

    const examen = await ExamenLaboratorio.findById(id)
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!examen) {
      return res.status(404).json({
        success: false,
        message: 'Examen de laboratorio no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: examen
    });
  } catch (error) {
    console.error('Error al obtener examen de laboratorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el examen de laboratorio',
      error: error.message
    });
  }
};

// Obtener examen de laboratorio por cita
exports.obtenerExamenLaboratorioPorCita = async (req, res) => {
    try {
      const { citaId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(citaId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }
  
      const examen = await ExamenLaboratorio.findOne({ citaId })
        .populate('doctorId', 'name lastName especialidad')
        .populate('pacienteId', 'firstName lastName idNumber');
  
      if (!examen) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró examen de laboratorio para esta cita'
        });
      }
  
      res.status(200).json({
        success: true,
        data: examen
      });
    } catch (error) {
      console.error('Error al obtener examen de laboratorio por cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el examen de laboratorio',
        error: error.message
      });
    }
  };

  // Nuevo controlador para verificar y crear examen de laboratorio
exports.verificarYCrearExamenLaboratorio = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, diagnosticos, examenes } = req.body;

    // Validar que existan los IDs necesarios
    if (!citaId || !pacienteId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los IDs de cita, paciente y doctor'
      });
    }

    // Validar que los datos de exámenes estén completos
    if (!examenes || examenes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un examen'
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

    // Verificar si ya existe un examen de laboratorio para esta cita
    const examenExistente = await ExamenLaboratorio.findOne({ citaId });
    
    if (examenExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un examen de laboratorio para esta cita',
        data: {
          examenId: examenExistente._id,
          pdfUrl: examenExistente.pdfUrl
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

    // Crear el nuevo examen de laboratorio
    const nuevoExamenLaboratorio = new ExamenLaboratorio({
      citaId,
      pacienteId,
      doctorId,
      diagnosticos: diagnosticos || [],
      examenes
    });

    // Guardar el examen de laboratorio
    await nuevoExamenLaboratorio.save();

    // Generar PDF
    const pdfBuffer = await crearPDFExamenLaboratorio(nuevoExamenLaboratorio, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `examen_laboratorio_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/examenes-laboratorio`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar el examen de laboratorio con la URL del PDF
      nuevoExamenLaboratorio.pdfUrl = pdfUrl;
      await nuevoExamenLaboratorio.save();
    }

    res.status(201).json({
      success: true,
      message: 'Examen de laboratorio creado exitosamente',
      data: nuevoExamenLaboratorio,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al verificar y crear examen de laboratorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el examen de laboratorio',
      error: error.message
    });
  }
};