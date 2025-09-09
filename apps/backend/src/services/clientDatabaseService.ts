import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';

interface ClientUser {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

export class ClientDatabaseService {
  private static connections = new Map<string, mongoose.Connection>();
  private static models = new Map<string, mongoose.Model<any>>();

  /**
   * Conecta a la base de datos de un cliente específico usando URL y nombre
   */
  static async connectToClientDB(databaseUrl: string, databaseName: string): Promise<mongoose.Connection> {
    const connectionKey = `${databaseUrl}_${databaseName}`;
    
    // Si ya existe una conexión, la reutilizamos
    if (this.connections.has(connectionKey)) {
      const existingConnection = this.connections.get(connectionKey)!;
      if (existingConnection.readyState === 1) { // Connected
        return existingConnection;
      }
    }

    try {
      // Crear nueva conexión
      const connection = await mongoose.createConnection(databaseUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      // Verificar que la conexión sea exitosa
      await connection.asPromise();
      
      // Guardar la conexión
      this.connections.set(connectionKey, connection);
      
      console.log(`✅ Conectado a BD del cliente: ${databaseName}`);
      return connection;
      
    } catch (error) {
      console.error(`❌ Error conectando a BD del cliente ${databaseName}:`, error);
      throw new Error(`No se pudo conectar a la base de datos del cliente: ${databaseName}`);
    }
  }

  /**
   * Conecta a la base de datos de un cliente específico usando el objeto tenant
   */
  static async connectToClientDatabase(tenant: any): Promise<mongoose.Connection> {
    if (!tenant.databaseUrl || !tenant.databaseName) {
      throw new Error('El tenant no tiene configurada la URL o nombre de la base de datos');
    }
    
    return await this.connectToClientDB(tenant.databaseUrl, tenant.databaseName);
  }

  /**
   * Obtiene o crea el modelo User para una base de datos específica
   * Usa un nombre único para evitar conflictos de modelos
   */
  static getUserModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_User`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Importar el schema del modelo User existente
    const userSchema = new mongoose.Schema({
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, trim: true, lowercase: true },
      password: { type: String, required: true },
      phone: { type: String, trim: true, sparse: true }, // Teléfono para 2FA
      role: { type: String, enum: ['admin', 'user', 'patient', 'doctor'], default: 'user' },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { collection: 'users' });

    // Middleware para hashear la contraseña antes de guardar
    userSchema.pre('save', async function(next) {
      if (!this.isModified('password')) return next();
      
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error as Error);
      }
    });

    // Método para comparar contraseñas
    userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
      try {
        return await bcrypt.compare(candidatePassword, this.password);
      } catch (error) {
        return false;
      }
    };

    // Crear el modelo con un nombre único para este cliente
    const UserModel = connection.model(`${databaseName}_User`, userSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, UserModel);
    
    return UserModel;
  }

  /**
   * Obtiene o crea el modelo Patient para una base de datos específica
   */
  static getPatientModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Patient`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Patient
    const patientSchema = new mongoose.Schema({
      birthDate: { type: Date },
      birthCountry: { type: String },
      residenceCountry: { type: String },
      state: { type: String },
      municipality: { type: String },
      address: { type: String },
      postalCode: { type: String },
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      gender: { type: String },
      idType: { type: String, required: true, trim: true },
      idNumber: { type: String, required: true, unique: true, trim: true },
      url_documento_identidad: { type: String },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true },
      hospital: { type: String, trim: true },
      necesitaEmergencia: { type: Boolean, default: false },
      motivoEmergencia: { type: String, default: '' },
      url_documento_egreso: { type: String },
      hasInsurance: { type: Boolean },
      insuranceName: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      hasCaretaker: { type: Boolean },
      caretakerFirstName: { type: String, trim: true },
      caretakerLastName: { type: String, trim: true },
      caretakerRelationship: { type: String, trim: true },
      caretakerPhone: { type: String, trim: true },
      visible: { type: Boolean, default: true },
      caretakerEmail: { type: String, trim: true },
      citas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cita'
      }],
      Entrevista: { type: Boolean, default: true },
      horarioEntrevista: {
        type: String,
        enum: ['manana', 'tarde', 'noche', ''],
        default: ""
      },
      horaEntrevista: { type: String, default: "" },
      fechaEntrevista: { type: Date },
      verificaciondatos: { type: Boolean, default: false }
    }, {
      timestamps: true,
      collection: 'patients'
    });

    // Crear índices
    patientSchema.index({ idNumber: 1 }, { unique: true });
    patientSchema.index({ email: 1 });
    patientSchema.index({ phone: 1 });
    patientSchema.index({ visible: 1 });

    // Crear el modelo con un nombre único para este cliente
    const PatientModel = connection.model(`${databaseName}_Patient`, patientSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, PatientModel);
    
    return PatientModel;
  }

  /**
   * Obtiene o crea el modelo Hospital para una base de datos específica
   */
  static getHospitalModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Hospital`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Hospital
    const hospitalSchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
    }, { 
      timestamps: true,
      collection: 'hospitals'
    });

    // Crear índices
    hospitalSchema.index({ name: 1 }, { unique: true });

    // Crear el modelo con un nombre único para este cliente
    const HospitalModel = connection.model(`${databaseName}_Hospital`, hospitalSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, HospitalModel);
    
    return HospitalModel;
  }

  /**
   * Obtiene o crea el modelo Specialty para una base de datos específica
   */
  static getSpecialtyModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Specialty`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Specialty
    const specialtySchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
    }, { 
      timestamps: true,
      collection: 'specialties'
    });

    // Crear índices
    specialtySchema.index({ name: 1 }, { unique: true });

    // Crear el modelo con un nombre único para este cliente
    const SpecialtyModel = connection.model(`${databaseName}_Specialty`, specialtySchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, SpecialtyModel);
    
    return SpecialtyModel;
  }

  /**
   * Obtiene o crea el modelo Insurance para una base de datos específica
   */
  static getInsuranceModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Insurance`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Insurance
    const insuranceSchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
    }, { 
      timestamps: true,
      collection: 'insurances'
    });

    // Crear índices
    insuranceSchema.index({ name: 1 }, { unique: true });

    // Crear el modelo con un nombre único para este cliente
    const InsuranceModel = connection.model(`${databaseName}_Insurance`, insuranceSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, InsuranceModel);
    
    return InsuranceModel;
  }

  /**
   * Obtiene o crea el modelo Doctor para una base de datos específica
   */
  static getDoctorModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Doctor`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Esquema para los intervalos de citas
    const intervaloSchema = new mongoose.Schema({
      inicio: { type: String, required: true },
      fin: { type: String, required: true },
      disponible: { type: Boolean, default: true }
    });

    // Esquema para la disponibilidad diaria
    const disponibilidadSchema = new mongoose.Schema({
      dia: { type: String, required: true },
      horaInicio: { type: String, required: true },
      horaFin: { type: String, required: true },
      activo: { type: Boolean, default: true },
      intervalos: [intervaloSchema]
    });

    // Esquema para excepciones de fechas
    const excepcionFechaSchema = new mongoose.Schema({
      fecha: { type: Date, required: true },
      horaInicio: { type: String, required: true },
      horaFin: { type: String, required: true },
      intervalos: [intervaloSchema]
    });

    // Schema del modelo Doctor
    const doctorSchema = new mongoose.Schema({
      // Datos personales
      name: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
      
      // Datos profesionales
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
      },
      especialidad: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Specialty',
        required: true 
      },
      cedula: { 
        type: String, required: true, trim: true
      },
      biografia: { 
        type: String 
      },
      experiencia: { 
        type: String 
      },
      educacion: { 
        type: String 
      },
      
      // Configuración de citas
      duracionCita: {
        type: Number,
        default: 30
      },
      hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
      },
      
      // Disponibilidad
      disponibilidad: [disponibilidadSchema],
      excepcionesFechas: [excepcionFechaSchema],
      url_firma: { 
        type: String 
      },
      // Estado
      activo: { 
        type: Boolean, 
        default: true 
      }
    }, { 
      timestamps: true,
      collection: 'doctors'
    });

    // Crear índices
    doctorSchema.index({ email: 1 }, { unique: true });
    doctorSchema.index({ cedula: 1 });
    doctorSchema.index({ activo: 1 });

    // Crear el modelo con un nombre único para este cliente
    const DoctorModel = connection.model(`${databaseName}_Doctor`, doctorSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, DoctorModel);
    
    return DoctorModel;
  }

  /**
   * Obtiene o crea el modelo Appointment para una base de datos específica
   */
  static getAppointmentModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Appointment`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Appointment (Cita)
    const appointmentSchema = new mongoose.Schema({
      pacienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${databaseName}_Patient`,
        required: true
      },
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${databaseName}_Doctor`,
        required: false
      },
      fecha: {
        type: Date,
        required: false
      },
      hora: {
        type: String,
        required: false
      },
      duracion: {
        type: Number,
        default: 20, // duración en minutos
        required: true
      },
      tipo: {
        type: String,
        enum: ['Presencial', 'Virtual', 'Telefónica'],
        required: true
      },
      motivo: {
        type: String,
        required: false
      },
      estado: {
        type: String,
        enum: ['pendiente', 'Completada', 'Cancelada', 'PendienteAgendar', 'Agendada', 'No Asistió'],
        default: 'pendiente'
      },
      notas: {
        type: String
      },
      consentimientoFirmado: {
        type: Boolean,
        default: false
      },
      meetingId: { 
        type: String,
        ref: 'Meeting',
        default: null 
      },
      especialidad: {
        type: String,
        required: false // Solo requerido para ciertas citas
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }, { 
      timestamps: true,
      collection: 'appointments'
    });

    // Índices para mejorar el rendimiento de las consultas
    appointmentSchema.index({ doctorId: 1, fecha: 1 });
    appointmentSchema.index({ pacienteId: 1, fecha: 1 });
    appointmentSchema.index({ estado: 1 });
    appointmentSchema.index({ fecha: 1 });
    appointmentSchema.index({ tipo: 1 });

    // Crear el modelo con un nombre único para este cliente
    const AppointmentModel = connection.model(`${databaseName}_Appointment`, appointmentSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, AppointmentModel);
    
    return AppointmentModel;
  }

  /**
   * Obtiene o crea el modelo Log para una base de datos específica
   */
  static getLogModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Log`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Log
    const logSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      userRole: { type: String, required: true },
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
          'IMPERSONATION_STARTED', 'IMPERSONATION_ENDED',
          // Nuevas acciones para videoconsultas
          'VIDEOCONSULTA_CREADA', 'VIDEOCONSULTA_FINALIZADA', 'VIDEOCONSULTA_ACCESO'
        ]
      },
      entityType: { 
        type: String, 
        required: true,
        enum: ['PATIENT', 'APPOINTMENT', 'USER', 'SETTINGS', 'SYSTEM', 'AUTH', 'HOSPITAL', 'SPECIALTY', 'DOCTOR', 'INSURANCE', 'MEETING']
      },
      entityId: { type: String },
      entityName: { type: String },
      details: { type: String, required: true },
      ipAddress: { type: String },
      userAgent: { type: String },
      tenantId: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }, {
      timestamps: true,
      collection: 'logs'
    });

    // Crear índices
    logSchema.index({ userId: 1 });
    logSchema.index({ action: 1 });
    logSchema.index({ entityType: 1 });
    logSchema.index({ timestamp: -1 });
    logSchema.index({ tenantId: 1 });

    // Crear el modelo con un nombre único para este cliente
    const LogModel = connection.model(`${databaseName}_Log`, logSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, LogModel);
    
    return LogModel;
  }

  /**
   * Obtiene o crea el modelo Meeting para una base de datos específica
   */
  static getMeetingModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_Meeting`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo Meeting
    const meetingSchema = new mongoose.Schema({
      meetingId: {
        type: String,
        required: true,
        unique: true
      },
      externalMeetingId: {
        type: String,
        required: false
      },
      citaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${databaseName}_Appointment`,
        required: false
      },
      meetingData: {
        type: Object,
        required: true
      },
      attendees: [{
        type: Object
      }],
      transcriptionEnabled: {
        type: Boolean,
        default: false
      },
      pipelineId: {
        type: String,
        required: false
      },
      status: {
        type: String,
        enum: ['created', 'active', 'ended', 'expired'],
        default: 'created'
      },
      grabacionUrl: {
        type: String,
        required: false
      },
      transcripcionUrl: {
        type: String,
        required: false
      },
      duracionMinutos: {
        type: Number,
        required: false
      }
    }, { 
      timestamps: true,
      collection: 'meetings'
    });

    // Índices para optimizar consultas
    meetingSchema.index({ meetingId: 1 });
    meetingSchema.index({ citaId: 1 });
    meetingSchema.index({ status: 1 });
    meetingSchema.index({ createdAt: -1 });

    // Crear el modelo con un nombre único para este cliente
    const MeetingModel = connection.model(`${databaseName}_Meeting`, meetingSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, MeetingModel);
    
    return MeetingModel;
  }

  /**
   * Obtiene o crea el modelo HistoriaClinica para una base de datos específica
   */
  static getHistoriaClinicaModel(connection: mongoose.Connection, databaseName: string): mongoose.Model<any> {
    const modelKey = `${databaseName}_HistoriaClinica`;
    
    // Si ya existe el modelo, lo reutilizamos
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Schema del modelo HistoriaClinica
    const historiaClinicaSchema = new mongoose.Schema({
      // Información de la consulta
      fechaRegistro: { type: Date, default: Date.now },
      citaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${databaseName}_Appointment`,
        required: true
      },
      pacienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${databaseName}_Patient`,
        required: true
      },
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${databaseName}_Doctor`,
        required: true
      },
      meetingId: {
        type: String,
        required: false
      },
      
      // Motivo de consulta
      motivoConsulta: { type: String, required: false },
      enfermedadActual: { type: String, required: false },
      
      // Signos vitales
      signosVitales: {
        tasMming: { type: String, required: false },
        tad: { type: String, required: false },
        fcMin: { type: String, required: false },
        frMin: { type: String, required: false },
        temperatura: { type: String, required: false },
        peso: { type: String, required: false },
        talla: { type: String, required: false },
        imc: { type: Number, required: false },
        saturacionOxigeno: { type: String, required: false }
      },
      
      // Antecedentes
      antecedentesPersonales: { type: String, required: false },
      antecedentesFamiliares: { type: String, required: false },
      antecedentesQuirurgicos: { type: String, required: false },
      antecedentesAlergicos: { type: String, required: false },
      medicamentosActuales: { type: String, required: false },
      
      // Examen físico
      examenFisico: {
        aspectoGeneral: { type: String, required: false },
        cabezaCuello: { type: String, required: false },
        toraxCardioVascular: { type: String, required: false },
        toraxPulmonar: { type: String, required: false },
        abdomen: { type: String, required: false },
        genitalesExtremidades: { type: String, required: false },
        neurologico: { type: String, required: false },
        examenMental: { type: String, required: false },
        pielFaneras: { type: String, required: false },
        ojoOidoNarizGarganta: { type: String, required: false },
        musculoEsqueletico: { type: String, required: false },
        otros: { type: String, required: false }
      },
      
      // Diagnósticos
      diagnosticos: [{
        codigo: { type: String, required: false },
        descripcion: { type: String, required: false },
        tipo: { 
          type: String, 
          enum: ['Principal', 'Relacionado', 'Complicación'],
          required: false 
        }
      }],
      
      // Plan de tratamiento
      planTratamiento: { type: String, required: false },
      ordenesLaboratorio: { type: String, required: false },
      imagenesOrdenadas: { type: String, required: false },
      interconsultas: { type: String, required: false },
      
      // Medicamentos prescritos
      medicamentosPrescritos: [{
        nombre: { type: String, required: false },
        concentracion: { type: String, required: false },
        formaFarmaceutica: { type: String, required: false },
        via: { type: String, required: false },
        dosis: { type: String, required: false },
        frecuencia: { type: String, required: false },
        duracion: { type: String, required: false },
        indicaciones: { type: String, required: false }
      }],
      
      // Seguimiento
      proximaCita: { type: Date, required: false },
      recomendaciones: { type: String, required: false },
      observaciones: { type: String, required: false },
      
      // Documentos adjuntos
      documentosAdjuntos: [{
        nombre: { type: String, required: false },
        url: { type: String, required: false },
        tipo: { type: String, required: false }
      }],
      
      // URLs de PDFs generados
      pdfHistoriaClinicaUrl: { type: String, required: false },
      pdfRecetaUrl: { type: String, required: false },
      pdfIncapacidadUrl: { type: String, required: false },
      
      // Estado del registro
      estado: {
        type: String,
        enum: ['Borrador', 'Completado', 'Firmado'],
        default: 'Borrador'
      }
    }, {
      timestamps: true,
      collection: 'historiasclinicas'
    });

    // Índices para optimizar consultas
    historiaClinicaSchema.index({ citaId: 1 });
    historiaClinicaSchema.index({ pacienteId: 1 });
    historiaClinicaSchema.index({ doctorId: 1 });
    historiaClinicaSchema.index({ meetingId: 1 });
    historiaClinicaSchema.index({ fechaRegistro: -1 });
    historiaClinicaSchema.index({ estado: 1 });

    // Crear el modelo con un nombre único para este cliente
    const HistoriaClinicaModel = connection.model(`${databaseName}_HistoriaClinica`, historiaClinicaSchema);
    
    // Guardar el modelo para reutilizarlo
    this.models.set(modelKey, HistoriaClinicaModel);
    
    return HistoriaClinicaModel;
  }

  /**
   * Crea un usuario en la base de datos del cliente
   */
  static async createUserInClientDB(
    databaseUrl: string, 
    databaseName: string, 
    userData: ClientUser
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Conectar a la BD del cliente
      const clientConnection = await this.connectToClientDB(databaseUrl, databaseName);
      
      // Obtener el modelo User reutilizable
      const User = this.getUserModel(clientConnection, databaseName);
      
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return { 
          success: false, 
          error: 'Ya existe un usuario con este email en la base de datos del cliente' 
        };
      }

      // Crear el nuevo usuario (la contraseña se hashea automáticamente en el middleware)
      const newUser = new User(userData);
      await newUser.save();

      console.log(`✅ Usuario creado en BD del cliente ${databaseName}: ${userData.email}`);
      
      return { 
        success: true, 
        userId: newUser._id.toString() 
      };

    } catch (error) {
      console.error(`❌ Error creando usuario en BD del cliente ${databaseName}:`, error);
      return { 
        success: false, 
        error: `Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      };
    }
  }

  /**
   * Cierra todas las conexiones a BDs de clientes
   */
  static async closeAllConnections(): Promise<void> {
    for (const [key, connection] of this.connections) {
      try {
        await connection.close();
        console.log(`🔌 Conexión cerrada: ${key}`);
      } catch (error) {
        console.error(`❌ Error cerrando conexión ${key}:`, error);
      }
    }
    this.connections.clear();
  }

  /**
   * Cierra una conexión específica
   */
  static async closeConnection(databaseUrl: string, databaseName: string): Promise<void> {
    const connectionKey = `${databaseUrl}_${databaseName}`;
    const connection = this.connections.get(connectionKey);
    
    if (connection) {
      try {
        await connection.close();
        this.connections.delete(connectionKey);
        console.log(`🔌 Conexión cerrada: ${connectionKey}`);
      } catch (error) {
        console.error(`❌ Error cerrando conexión ${connectionKey}:`, error);
      }
    }
  }
}
