const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const historiaClinicaSchema = new Schema({
    // Información de la consulta
    fechaRegistro: { type: Date, required: true, default: Date.now },
    tipoActividad: { type: String, enum: ['Primera Vez', 'Control'], required: true },
    acompanamientoEnConsulta: String,
    motivoConsulta: String,
    motivoAtencion: String,

    fechaCita: Date,
    horaCita: String,
    tipoCita: { type: String, enum: ['Presencial', 'Virtual'] },
    pagador: String,
    
    // Información del paciente
    paciente: {
        idType: String,
        idNumber: { type: String, required: true },
        primerNombre: { type: String, required: true },
        segundoNombre: String,
        primerApellido: { type: String, required: true },
        segundoApellido: String,
        fechaNacimiento: Date,
        genero: String,
        grupoSanguineo: String,
        rh: String,
        estadoCivil: String,
        escolaridad: String,
        ocupacion: String,
        zonaUbicacion: String,
        direccion: String,
        barrio: String,
        departamento: String,
        municipio: String,
        email: String,
        telefono: String,
        celular: String,
        condicionDesplazamiento: String,
        grupoEtnico: String,
        paisNacimiento: String,
        paisResidencia: String,
        tipoUsuario: String,
        tipoDeAfiliado: String,
        aseguradora: String


    },
    
    // Información del profesional
    profesional: {
        nombre: { type: String, required: true },
        especialidad: { type: String, required: true },
    },
    
    // Anamnesis
    enfermedadActual: String,
    resultadosParaclinicos: String,
    servicio: String,
    // Antecedentes
    antecedentes: [{
        tipo: String,
        personalCheck: String,
        personalDescripcion: String
    }],
    familiares: String,
    psicosociales: String,
    
    // Ginecoobstétricos (solo para pacientes femeninos)
    ginecoobstetricos: [{
        g: String, // Gestaciones
        p: String, // Partos
        a: String, // Abortos
        c: String, // Cesáreas
        v: String, // Vivos
        m: String, // Muertos
        fur: Date, // Fecha última regla
        fup: Date, // Fecha último parto
        fpp: Date  // Fecha probable de parto
    }],
    planificacion: String,
    ciclos: String,
    
    // Revisión por sistemas
    sistemas: [{
        sistema: String,
        seleccion: String,
        observaciones: String
    }],
    
    // Examen físico
    estadoDeConciencia: String,
    equiposSignos: String,
    
    // Signos vitales
    signosVitales: {
        tasMming: Number, // Tensión arterial sistólica
        tad: Number,      // Tensión arterial diastólica
        fcMin: Number,    // Frecuencia cardíaca
        frMin: Number,    // Frecuencia respiratoria
        temperatura: Number,
        pesoKg: Number,
        tallaCm: Number,
        imc: Number,
        perimetroCefalico: String,
        percentilPesoTalla: String,
        
    },
    
    // Examen médico detallado
    examenMedico: {
        toraxCardioVascular: String,
        abdomen: String,
        genitales: String,
        extremidades: String,
        pielFaneras: String,
        cabezaCuello: String,
        neurologico: String,
        examenMental: String,
    },
    
    // Alertas y alergias
    alertas: String,
    alergias: String,
    
    // Diagnósticos
    diagnosticos: [{
        codigo: String,
        nombre: String,
        tipo: String,
        relacionado: String
    }],
    
    // Plan de manejo
    analisisyplan: String,
    recomendaciones: String,
    pdfUrl: String,
    // Campos de control
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    citaId: { type: Schema.Types.ObjectId, ref: 'Cita' },
    pacienteId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

historiaClinicaSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('HistoriaClinica', historiaClinicaSchema);