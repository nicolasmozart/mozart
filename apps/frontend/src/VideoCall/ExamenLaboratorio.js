const mongoose = require('mongoose');

const examenLaboratorioSchema = new mongoose.Schema({
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
  
  // Diagnósticos relacionados
  diagnosticos: [{
    codigo: { type: String, required: true },
    nombre: { type: String, required: true },
    tipo: { type: String },
    relacionado: { type: String }
  }],
  
  // Lista de exámenes
  examenes: [{
    codigo: { type: String, required: true },
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true },
    observacion: { type: String }
  }],
  
  // URL del PDF generado
  pdfUrl: { 
    type: String 
  },
  
  // Campos de auditoría
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ExamenLaboratorio', examenLaboratorioSchema);