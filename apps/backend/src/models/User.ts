import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string; // Teléfono para 2FA
  role: 'superuser' | 'user' | 'patient';
  isActive: boolean;
  clientId?: mongoose.Types.ObjectId; // Solo para usuarios normales
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    sparse: true // Permite valores únicos pero no requiere que exista
  },
  role: {
    type: String,
    enum: ['superuser', 'user', 'patient'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: function() {
      return this.role === 'user';
    }
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ clientId: 1 });

export default mongoose.model<IUser>('User', userSchema);
