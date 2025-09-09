import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  entityName?: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

const LogSchema: Schema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'IMPORT',
      'PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_DELETED',
      'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_CANCELLED',
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
      'SETTINGS_UPDATED', 'BACKUP_CREATED', 'SYSTEM_MAINTENANCE',
      // Nuevas acciones para hospitales
      'CREACION_HOSPITAL', 'ACTUALIZACION_HOSPITAL', 'ELIMINACION_HOSPITAL',
      // Nuevas acciones para especialidades
      'CREACION_ESPECIALIDAD', 'ACTUALIZACION_ESPECIALIDAD', 'ELIMINACION_ESPECIALIDAD',
      // Nuevas acciones para doctores
      'CREACION_DOCTOR', 'ACTUALIZACION_DOCTOR', 'ELIMINACION_DOCTOR',
      // Nuevas acciones para seguros
      'CREACION_SEGURO', 'ACTUALIZACION_SEGURO', 'ELIMINACION_SEGURO',
      // Nuevas acciones para pacientes (tenant)
      'CREACION_PACIENTE', 'ACTUALIZACION_PACIENTE', 'ELIMINACION_PACIENTE', 'RESTAURACION_PACIENTE',
      // Nuevas acciones para suplantación
      'IMPERSONATION_STARTED', 'IMPERSONATION_ENDED'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['PATIENT', 'APPOINTMENT', 'USER', 'SETTINGS', 'SYSTEM', 'AUTH', 'HOSPITAL', 'SPECIALTY', 'DOCTOR', 'INSURANCE']
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: false
  },
  entityName: {
    type: String,
    required: false
  },
  details: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
});

// Índices para optimizar consultas
LogSchema.index({ tenantId: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ action: 1, timestamp: -1 });
LogSchema.index({ entityType: 1, timestamp: -1 });

export default mongoose.model<ILog>('Log', LogSchema);
