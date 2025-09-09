import mongoose, { Document, Schema } from 'mongoose';
import { config } from '../config/env';

export interface IClient extends Document {
  name: string;
  domain: string; // ej: 'hospitalubate' de 'plataforma.hospitalubate.com'
  fullDomain: string; // ej: 'plataforma.hospitalubate.com'
  databaseUrl: string; // URL de conexión a su BD específica
  databaseName: string; // Nombre de su BD
  isActive: boolean;
  
  // Logo del cliente
  logo: {
    data: string; // base64
    contentType: string; // image/jpeg, image/png, etc.
    filename: string;
  };
  
  // URLs de servicios - cada tipo puede tener WhatsApp o llamada
  agendamiento: {
    presentacionUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string }>;
    verificacionDatosUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string }>;
    agendarEntrevistaUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string }>;
    tamizajeUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string }>;
  };
  
  // Features habilitados como booleanos
  features: {
    agendamiento: boolean;
    cuidadorDigital: boolean;
    telemedicina: boolean;
    reportes: boolean;
  };
  
  // Configuración adicional
  settings: {
    timezone: string;
    language: string;
    primaryColor: string;
    secondaryColor: string;
  };
  
  // Metadatos
  createdBy?: mongoose.Types.ObjectId; // Superusuario que lo creó
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true, // Ahora es requerido, no se genera automáticamente
    trim: true
  },
  fullDomain: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  databaseUrl: {
    type: String,
    required: false, // Se generará automáticamente
    trim: true
  },
  databaseName: {
    type: String,
    required: false, // Se generará automáticamente
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Logo del cliente
  logo: {
    data: {
      type: String,
      required: false
    },
    contentType: {
      type: String,
      required: false
    },
    filename: {
      type: String,
      required: false
    }
  },
  
  // URLs de servicios - cada tipo puede tener WhatsApp o llamada (opcionales)
  agendamiento: {
    presentacionUrls: [{
      tipo: {
        type: String,
        enum: ['wpp', 'llamada'],
        required: true
      },
      url: {
        type: String,
        trim: true,
        required: false // URL opcional
      }
    }],
    verificacionDatosUrls: [{
      tipo: {
        type: String,
        enum: ['wpp', 'llamada'],
        required: true
      },
      url: {
        type: String,
        trim: true,
        required: false // URL opcional
      }
    }],
    agendarEntrevistaUrls: [{
      tipo: {
        type: String,
        enum: ['wpp', 'llamada'],
        required: true
      },
      url: {
        type: String,
        trim: true,
        required: false // URL opcional
      }
    }],
    tamizajeUrls: [{
      tipo: {
        type: String,
        enum: ['wpp', 'llamada'],
        required: true
      },
      url: {
        type: String,
        trim: true,
        required: false // URL opcional
      }
    }]
  },
  
  // Features habilitados como booleanos
  features: {
    agendamiento: {
      type: Boolean,
      default: false
    },
    cuidadorDigital: {
      type: Boolean,
      default: false
    },
    telemedicina: {
      type: Boolean,
      default: false
    },
    reportes: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuración adicional
  settings: {
    timezone: {
      type: String,
      default: 'America/Bogota'
    },
    language: {
      type: String,
      default: 'es'
    },
    primaryColor: {
      type: String,
      default: '#2563eb'
    },
    secondaryColor: {
      type: String,
      default: '#1e40af'
    }
  },
  
  // Metadatos
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
clientSchema.index({ domain: 1 });
clientSchema.index({ fullDomain: 1 });
clientSchema.index({ isActive: 1 });
clientSchema.index({ createdBy: 1 });
clientSchema.index({ 'features.agendamiento': 1 });

// Validación personalizada para el dominio
clientSchema.pre('save', function(next) {
  // Generar databaseUrl si no se proporciona
  if (!this.databaseUrl && this.domain) {
    this.databaseUrl = `${config.clientDBBaseUrl}/${this.domain}?retryWrites=true&w=majority`;
  }
  
  // Generar databaseName si no se proporciona
  if (!this.databaseName && this.domain) {
    this.databaseName = this.domain;
  }
  
  next();
});

export default mongoose.model<IClient>('Client', clientSchema);

