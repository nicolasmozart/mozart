const ApoyoTerapeutico = require('../models/ApoyoTerapeutico');
const Patient = require('../models/Patients');
const Doctor = require('../models/Doctor');
const Cita = require('../models/Cita');
const mongoose = require('mongoose');
const { crearPDFApoyoTerapeutico } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');

// Crear una nueva interconsulta
exports.crearApoyoTerapeutico = async (req, res) => {
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
    const nuevaApoyoTerapeutico = new ApoyoTerapeutico({
      citaId,
      pacienteId,
      doctorId,
      servicio,
      especialidad,
      motivoConsulta
    });

    // Guardar la interconsulta
    await nuevaApoyoTerapeutico.save();

    // Generar PDF
    const pdfBuffer = await crearPDFApoyoTerapeutico(nuevaApoyoTerapeutico, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `apoyo_terapeutico_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/apoyo-terapeutico`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la interconsulta con la URL del PDF
      nuevaApoyoTerapeutico.pdfUrl = pdfUrl;
      await nuevaApoyoTerapeutico.save();
    }

    res.status(201).json({
      success: true,
      message: 'Apoyo terapeutico creado exitosamente',
      data: nuevaApoyoTerapeutico,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al crear apoyo terapeutico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el apoyo terapeutico',
      error: error.message
    });
  }
};

// Obtener apoyo terapeutico por paciente
exports.obtenerApoyoTerapeuticoPorPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente no válido'
      });
    }

    const apoyoTerapeuticos = await ApoyoTerapeutico.find({ pacienteId })
      .populate('doctorId', 'name lastName especialidad')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: apoyoTerapeuticos
    });
  } catch (error) {
    console.error('Error al obtener apoyo terapeutico por paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los apoyo terapeuticos',
      error: error.message
    });
  }
};

// Obtener una apoyo terapeutico específica
exports.obtenerApoyoTerapeutico = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de apoyo terapeutico no válido'
      });
    }

    const apoyoTerapeutico = await ApoyoTerapeutico.findById(id)
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!apoyoTerapeutico) {
      return res.status(404).json({
        success: false,
        message: 'Apoyo terapeutico no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: apoyoTerapeutico
    });
  } catch (error) {
    console.error('Error al obtener apoyo terapeutico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el apoyo terapeutico',
      error: error.message
    });
  }
};

// Obtener apoyo terapeutico por cita
exports.obtenerApoyoTerapeuticoPorCita = async (req, res) => {
  try {
    const { citaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(citaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cita no válido'
      });
    }

    const apoyoTerapeutico = await ApoyoTerapeutico.findOne({ citaId })
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!apoyoTerapeutico) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró apoyo terapeutico para esta cita'
      });
    }

    res.status(200).json({
      success: true,
      data: apoyoTerapeutico
    });
  } catch (error) {
    console.error('Error al obtener apoyo terapeutico por cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el apoyo terapeutico',
      error: error.message
    });
  }
};

// Nuevo controlador para verificar y crear apoyo terapéutico
exports.verificarYCrearApoyoTerapeutico = async (req, res) => {
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

    // Verificar si ya existe un apoyo terapéutico para esta cita
    const apoyoExistente = await ApoyoTerapeutico.findOne({ citaId });
    
    if (apoyoExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un apoyo terapéutico para esta cita',
        data: {
          apoyoId: apoyoExistente._id,
          pdfUrl: apoyoExistente.pdfUrl
        }
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

    // Crear el nuevo apoyo terapéutico
    const nuevoApoyoTerapeutico = new ApoyoTerapeutico({
      citaId,
      pacienteId,
      doctorId,
      servicio,
      especialidad,
      motivoConsulta
    });

    // Guardar el apoyo terapéutico
    await nuevoApoyoTerapeutico.save();

    // Generar PDF
    const pdfBuffer = await crearPDFApoyoTerapeutico(nuevoApoyoTerapeutico, pacienteExiste, doctorExiste);
    
    // Subir PDF a S3
    const nombreArchivo = `apoyo_terapeutico_${pacienteExiste.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${pacienteExiste.idNumber}/apoyo-terapeutico`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar el apoyo terapéutico con la URL del PDF
      nuevoApoyoTerapeutico.pdfUrl = pdfUrl;
      await nuevoApoyoTerapeutico.save();
    }

    res.status(201).json({
      success: true,
      message: 'Apoyo terapéutico creado exitosamente',
      data: nuevoApoyoTerapeutico,
      pdfUrl
    });
  } catch (error) {
    console.error('Error al verificar y crear apoyo terapéutico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el apoyo terapéutico',
      error: error.message
    });
  }
};