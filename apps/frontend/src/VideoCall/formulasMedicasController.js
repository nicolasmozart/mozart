// controllers/formulaMedicaController.js
const FormulaMedica = require('../models/FormulasMedicas');
const Cita = require('../models/Cita');
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');
const Paciente = require('../models/Patients');
const { crearPDFFormulaMedica } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');

// Crear una nueva fórmula médica
exports.crearFormulaMedica = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, medicamentos } = req.body;

    // Validar datos requeridos
    if (!citaId || !pacienteId || !doctorId || !medicamentos || !medicamentos.length) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para crear la fórmula médica'
      });
    }

    // Crear la fórmula médica
    const formulaMedicaData = {
      citaId,
      pacienteId,
      doctorId,
      medicamentos
    };

    // Guardar la fórmula médica
    const nuevaFormulaMedica = new FormulaMedica(formulaMedicaData);
    await nuevaFormulaMedica.save();

    // Obtener información adicional para el PDF
    const paciente = await Paciente.findById(pacienteId);
    const doctor = await Doctor.findById(doctorId);
    const cita = await Cita.findById(citaId);

    if (!paciente || !doctor || !cita) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró información del paciente, doctor o cita'
      });
    }

    // Generar el PDF
    const pdfBuffer = await crearPDFFormulaMedica(nuevaFormulaMedica, paciente, doctor, cita);
    
    // Subir el PDF a S3
    const nombreArchivo = `formula_medica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${paciente.idNumber}/formulas-medicas`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la fórmula médica con la URL del PDF
      nuevaFormulaMedica.pdfUrl = pdfUrl;
      await nuevaFormulaMedica.save();
    }
    
    // Responder con la fórmula médica creada y la URL del PDF
    res.status(201).json({
      success: true,
      message: 'Fórmula médica creada exitosamente',
      data: nuevaFormulaMedica,
      pdfUrl
    });

  } catch (error) {
    console.error('Error al crear fórmula médica:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la fórmula médica',
      error: error.message
    });
  }
};

// Obtener todas las fórmulas médicas de un paciente
exports.obtenerFormulasMedicasPorPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de paciente no válido'
      });
    }

    const formulasMedicas = await FormulaMedica.find({ pacienteId })
      .populate('doctorId', 'name lastName especialidad')
      .populate('citaId', 'fecha hora')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: formulasMedicas.length,
      data: formulasMedicas
    });
  } catch (error) {
    console.error('Error al obtener fórmulas médicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las fórmulas médicas',
      error: error.message
    });
  }
};

// Obtener una fórmula médica específica
exports.obtenerFormulaMedica = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de fórmula médica no válido'
      });
    }

    const formulaMedica = await FormulaMedica.findById(id)
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber')
      .populate('citaId', 'fecha hora');

    if (!formulaMedica) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula médica no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: formulaMedica
    });
  } catch (error) {
    console.error('Error al obtener fórmula médica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la fórmula médica',
      error: error.message
    });
  }
};

// Obtener fórmulas médicas por cita
exports.obtenerFormulaMedicaPorCita = async (req, res) => {
  try {
    const { citaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(citaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cita no válido'
      });
    }

    const formulaMedica = await FormulaMedica.findOne({ citaId })
      .populate('doctorId', 'name lastName especialidad')
      .populate('pacienteId', 'firstName lastName idNumber');

    if (!formulaMedica) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró fórmula médica para esta cita'
      });
    }

    res.status(200).json({
      success: true,
      data: formulaMedica
    });
  } catch (error) {
    console.error('Error al obtener fórmula médica por cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la fórmula médica',
      error: error.message
    });
  }
};

exports.getFormulaMedicaByCitaId = async (req, res) => {
  try {
    console.log('Iniciando búsqueda de fórmula médica por citaId:', req.params.citaId);
    const { citaId } = req.params;

    // Buscar la fórmula médica por citaId
    const formulaMedica = await FormulaMedica.findOne({ citaId })
      .populate('pacienteId')
      .populate('doctorId')
      .populate('citaId');

    if (!formulaMedica) {
      console.log('No se encontró fórmula médica para la cita:', citaId);
      return res.status(404).json({
        success: false,
        message: 'No se encontró fórmula médica para esta cita'
      });
    }

    // Si ya existe una URL del PDF, devolverla
    if (formulaMedica.pdfUrl) {
      console.log('Fórmula médica ya tiene PDF, devolviendo URL:', formulaMedica.pdfUrl);
      return res.status(200).json({
        success: true,
        formulaMedica,
        pdfUrl: formulaMedica.pdfUrl
      });
    }

    console.log('Generando nuevo PDF para la fórmula médica');
    // Si no existe el PDF, generar uno nuevo
    const paciente = formulaMedica.pacienteId;
    const doctor = formulaMedica.doctorId;
    const cita = formulaMedica.citaId;

    // Generar el PDF
    const pdfBuffer = await crearPDFFormulaMedica(formulaMedica, paciente, doctor, cita);
    
    // Subir el PDF a S3
    const nombreArchivo = `formula_medica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${paciente.idNumber}/formulas-medicas`;
    
    console.log('Subiendo PDF a S3:', rutaCarpeta, nombreArchivo);
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      console.log('PDF subido exitosamente, actualizando fórmula médica con URL:', pdfUrl);
      // Actualizar la fórmula médica con la URL del PDF
      formulaMedica.pdfUrl = pdfUrl;
      await formulaMedica.save();
      
      // Devolver la fórmula médica actualizada con la URL del PDF
      return res.status(200).json({
        success: true,
        formulaMedica,
        pdfUrl
      });
    } else {
      console.log('No se pudo subir el PDF a S3, devolviendo buffer del PDF');
      // Si no se pudo subir el PDF, devolver el buffer
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=formula_medica_${paciente.idNumber}.pdf`,
        'Content-Length': pdfBuffer.length
      });
      return res.send(pdfBuffer);
    }

  } catch (error) {
    console.error('Error al obtener fórmula médica por citaId:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la fórmula médica',
      error: error.message
    });
  }
};

// Nuevo controlador para verificar y crear fórmula médica
exports.verificarYCrearFormulaMedica = async (req, res) => {
  try {
    const { citaId, pacienteId, doctorId, medicamentos, diagnosticos } = req.body;

    // Validar datos requeridos
    if (!citaId || !pacienteId || !doctorId || !medicamentos || !medicamentos.length) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para crear la fórmula médica'
      });
    }

    // Verificar si ya existe una fórmula médica para esta cita
    const formulaExistente = await FormulaMedica.findOne({ citaId });
    
    if (formulaExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una fórmula médica para esta cita',
        data: {
          formulaId: formulaExistente._id,
          pdfUrl: formulaExistente.pdfUrl
        }
      });
    }

    // Crear la fórmula médica
    const formulaMedicaData = {
      citaId,
      pacienteId,
      doctorId,
      medicamentos,
      diagnosticos // Agregamos los diagnósticos aquí
    };

    // Guardar la fórmula médica
    const nuevaFormulaMedica = new FormulaMedica(formulaMedicaData);
    await nuevaFormulaMedica.save();

    // Obtener información adicional para el PDF
    const paciente = await Paciente.findById(pacienteId);
    const doctor = await Doctor.findById(doctorId);
    const cita = await Cita.findById(citaId);

    if (!paciente || !doctor || !cita) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró información del paciente, doctor o cita'
      });
    }

    // Generar el PDF
    const pdfBuffer = await crearPDFFormulaMedica(nuevaFormulaMedica, paciente, doctor, cita);
    
    // Subir el PDF a S3
    const nombreArchivo = `formula_medica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${paciente.idNumber}/formulas-medicas`;
    
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      // Actualizar la fórmula médica con la URL del PDF
      nuevaFormulaMedica.pdfUrl = pdfUrl;
      await nuevaFormulaMedica.save();
    }
    
    // Responder con la fórmula médica creada y la URL del PDF
    res.status(201).json({
      success: true,
      message: 'Fórmula médica creada exitosamente',
      data: nuevaFormulaMedica,
      pdfUrl
    });

  } catch (error) {
    console.error('Error al verificar y crear fórmula médica:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la fórmula médica',
      error: error.message
    });
  }
};