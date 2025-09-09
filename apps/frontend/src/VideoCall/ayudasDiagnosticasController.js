const AyudasDiagnosticas = require('../models/AyudasDiagnosticas');
const Cita = require('../models/Cita');
const Patients = require('../models/Patients');
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');
const { crearPDFAyudasDiagnosticas } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');

// Crear un nuevo examen de laboratorio
exports.crearAyudasDiagnosticas = async (req, res) => {
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
    const nuevaAyudasDiagnosticas = new AyudasDiagnosticas({
      citaId,
      pacienteId,
      doctorId,
      diagnosticos: diagnosticos || [],
      examenes
    });

    // Guardar el examen de laboratorio
    await nuevaAyudasDiagnosticas.save();

    // Generar PDF
    const pdfBuffer = await crearPDFAyudasDiagnosticas(nuevaAyudasDiagnosticas, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `ayudas_diagnosticas_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/ayudas-diagnosticas`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar el examen de laboratorio con la URL del PDF
      nuevaAyudasDiagnosticas.pdfUrl = pdfUrl;
      await nuevaAyudasDiagnosticas.save();
    }

    res.status(201).json({
      success: true,
      message: 'Ayudas diagnosticas creado exitosamente',
      data: nuevaAyudasDiagnosticas,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al crear ayudas diagnosticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el ayudas diagnosticas',
      error: error.message
    });
  }
};

// Obtener todos los exámenes de laboratorio de un paciente
exports.obtenerAyudasDiagnosticasPorPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente no válido'
      });
    }

    const ayudasDiagnosticas = await AyudasDiagnosticas.find({ pacienteId })
      .populate('doctorId', 'name lastName especialidad')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: ayudasDiagnosticas
    });
  } catch (error) {
        console.error('Error al obtener ayudas diagnosticas por paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los ayudas diagnosticas',
      error: error.message
    });
  }
};

// Obtener un examen de laboratorio específico
exports.obtenerAyudasDiagnosticas = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de ayudas diagnosticas no válido'
      });
    }

    const ayudasDiagnosticas = await AyudasDiagnosticas.findById(id)
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!ayudasDiagnosticas) {
      return res.status(404).json({
        success: false,
        message: 'Ayudas diagnosticas no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: ayudasDiagnosticas
    });
  } catch (error) {
    console.error('Error al obtener ayudas diagnosticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el ayudas diagnosticas',
      error: error.message
    });
  }
};

// Obtener examen de laboratorio por cita
exports.obtenerAyudasDiagnosticasPorCita = async (req, res) => {
    try {
      const { citaId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(citaId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }
  
      const ayudasDiagnosticas = await AyudasDiagnosticas.findOne({ citaId })
        .populate('doctorId', 'name lastName especialidad')
        .populate('pacienteId', 'firstName lastName idNumber');
  
      if (!ayudasDiagnosticas) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró ayudas diagnosticas para esta cita'
        });
      }
  
      res.status(200).json({
        success: true,
        data: ayudasDiagnosticas
      });
    } catch (error) {
      console.error('Error al obtener ayudas diagnosticas por cita:', error);
      res.status(500).json({
        success: false,
            message: 'Error al obtener el ayudas diagnosticas',
        error: error.message
      });
    }
  };

  // Nuevo controlador para verificar y crear ayudas diagnósticas
exports.verificarYCrearAyudasDiagnosticas = async (req, res) => {
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

    // Verificar si ya existen ayudas diagnósticas para esta cita
    const ayudasExistentes = await AyudasDiagnosticas.findOne({ citaId });
    
    if (ayudasExistentes) {
      return res.status(409).json({
        success: false,
        message: 'Ya existen ayudas diagnósticas para esta cita',
        data: {
          ayudasId: ayudasExistentes._id,
          pdfUrl: ayudasExistentes.pdfUrl
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

    // Crear las nuevas ayudas diagnósticas
    const nuevaAyudasDiagnosticas = new AyudasDiagnosticas({
      citaId,
      pacienteId,
      doctorId,
      diagnosticos: diagnosticos || [],
      examenes
    });

    // Guardar las ayudas diagnósticas
    await nuevaAyudasDiagnosticas.save();

    // Generar PDF
    const pdfBuffer = await crearPDFAyudasDiagnosticas(nuevaAyudasDiagnosticas, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `ayudas_diagnosticas_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/ayudas-diagnosticas`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar las ayudas diagnósticas con la URL del PDF
      nuevaAyudasDiagnosticas.pdfUrl = pdfUrl;
      await nuevaAyudasDiagnosticas.save();
    }

    res.status(201).json({
      success: true,
      message: 'Ayudas diagnósticas creadas exitosamente',
      data: nuevaAyudasDiagnosticas,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al verificar y crear ayudas diagnósticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar las ayudas diagnósticas',
      error: error.message
    });
  }
};