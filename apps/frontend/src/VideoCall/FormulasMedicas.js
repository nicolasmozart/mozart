const mongoose = require('mongoose');

const formulaMedicaSchema = new mongoose.Schema({

  // IDs de relación
  citaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cita',
    required: true 
  },
  pacienteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient',
    required: true 
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor',
    required: true 
  },
  pdfUrl: String,
  
  // Lista de medicamentos
  medicamentos: [{
    denominacionComun: { type: String, required: true },
    concentracion: { type: String, required: true },
    unidadMedida: { type: String, required: true },
    formaFarmaceutica: { type: String, required: true },
    dosis: { type: String, required: true },
    viaAdministracion: { type: String, required: true },
    frecuencia: { type: String, required: true },
    diasTratamiento: { type: String, required: true },
    cantidadNumeros: { type: String },
    cantidadLetras: { type: String },
    indicaciones: { type: String, required: true },
    // Campos específicos para psiquiatría
    fechaInicio: { type: String },
    horaInicio: { type: String },
    recordatorios: [{
      fecha: { type: String },
      hora: { type: String }
    }]
  }],
  diagnosticos: [{
    codigo: { type: String, required: true },
    nombre: { type: String, required: true },
    tipo: { type: String },
    relacionado: { type: String }
  }],
  // Campos de auditoría
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FormulaMedica', formulaMedicaSchema); 