const mongoose = require('mongoose');

const apoyoTerapeuticoSchema = new mongoose.Schema({
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
  
  // Datos de la interconsulta
  servicio: { 
    type: String, 
    required: true 
  },
  especialidad: { 
    type: String, 
    required: true 
  },
  motivoConsulta: { 
    type: String, 
    required: true 
  },
  
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

module.exports = mongoose.model('ApoyoTerapeutico', apoyoTerapeuticoSchema);