import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  // Información Personal
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  birthDate: { type: Date },
  birthCountry: { type: String, trim: true },
  residenceCountry: { type: String, trim: true },
  gender: { type: String, enum: ['masculino', 'femenino', 'otro'], trim: true },
  
  // Identificación
  idType: { type: String, required: true, trim: true },
  idNumber: { type: String, required: true, unique: true, trim: true },
  url_documento_identidad: { type: String },
  
  // Contacto
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  
  // Ubicación
  state: { type: String, trim: true },
  municipality: { type: String, trim: true },
  address: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  
  // Información Médica
  hospital: { type: String, trim: true },
  necesitaEmergencia: { type: Boolean, default: false },
  motivoEmergencia: { type: String, default: '', trim: true },
  
  // Seguro
  hasInsurance: { type: Boolean, default: false },
  insuranceName: { type: String, trim: true },
  policyNumber: { type: String, trim: true },
  
  // Cuidador
  hasCaretaker: { type: Boolean, default: false },
  caretakerFirstName: { type: String, trim: true },
  caretakerLastName: { type: String, trim: true },
  caretakerRelationship: { type: String, trim: true },
  caretakerPhone: { type: String, trim: true },
  caretakerEmail: { type: String, trim: true, lowercase: true },
  
  // Estado y Visibilidad
  visible: { type: Boolean, default: true },
  
  // Entrevista
  Entrevista: { type: Boolean, default: true },
  horarioEntrevista: {
    type: String,
    enum: ['manana', 'tarde', 'noche', ''],
    default: ""
  },
  horaEntrevista: { type: String, default: "" },
  fechaEntrevista: { type: Date },
  
  // Verificación
  verificaciondatos: { type: Boolean, default: false },
  
  // Relaciones (referencias a colecciones de la BD del cliente)
  citas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cita' // Esta colección estará en la BD del cliente
  }]
  
}, { 
  timestamps: true,
  collection: 'patients' // Colección genérica para el cliente
});

// Índices para optimizar búsquedas en la BD del cliente
PatientSchema.index({ idNumber: 1 }, { unique: true });
PatientSchema.index({ email: 1 });
PatientSchema.index({ phone: 1 });
PatientSchema.index({ visible: 1 });

// Método para obtener el nombre completo
PatientSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Método para verificar si es mayor de edad
PatientSchema.methods.isAdult = function() {
  if (!this.birthDate) return false;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

export default mongoose.model('Patient', PatientSchema);
