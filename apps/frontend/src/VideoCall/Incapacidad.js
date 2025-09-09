const mongoose = require('mongoose');

const incapacidadSchema = new mongoose.Schema({
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
  
  // Datos de la incapacidad
  lugarExpedicion: { 
    type: String, 
    required: true 
  },
  fechaExpedicion: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  esProrroga: { 
    type: Boolean, 
    default: false 
  },
  modalidadPrestacionServicio: { 
    type: String, 
    required: true 
  },
  fechaInicial: { 
    type: Date, 
    required: true 
  },
  dias: { 
    type: Number, 
    required: true 
  },
  fechaFinal: { 
    type: Date, 
    required: true 
  },
  causaAtencion: { 
    type: String, 
    required: true 
  },
  diagnosticoPrincipal: { 
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

module.exports = mongoose.model('Incapacidad', incapacidadSchema);