const HistoriaClinica = require('../models/HistoriaClinica');
const Paciente = require('../models/Patients');
const Doctor = require('../models/Doctor');
const Cita = require('../models/Cita');
const { crearPDFHistoriaClinica } = require('./pdfController');
const { uploadPDFFile } = require('../AWS/StorageS3');
const moment = require('moment');
const axios = require('axios');


exports.crearHistoriaClinica = async (req, res) => {
    try {
        const formData = req.body;
        
        // Parsear los diagnósticos si vienen como string JSON
        let diagnosticos = [];
        if (formData.diagnosticos && typeof formData.diagnosticos === 'string') {
            try {
                diagnosticos = JSON.parse(formData.diagnosticos);
            } catch (error) {
                console.error('Error al parsear diagnósticos:', error);
            }
        }
        
        // Información del examen médico
        // Verificar si examenMedico viene como objeto completo o como propiedades individuales
        let examenMedicoData = {};
        if (formData.examenMedico && typeof formData.examenMedico === 'object') {
            // Si viene como objeto completo, usarlo directamente
            examenMedicoData = formData.examenMedico;
        } else {
            // Si viene como propiedades individuales, construir el objeto
            examenMedicoData = {
                toraxCardioVascular: formData.toraxCardioVascular,
                abdomen: formData.abdomen,
                genitalesExtremidades: formData.genitalesExtremidades,
                neurologico: formData.neurologico,
                examenMental: formData.examenMental,
                cabezaCuello: formData.cabezaCuello,
                pielFaneras: formData.pielFaneras,
                ojoOidoNarizGarganta: formData.ojoOidoNarizGarganta,
                musculoEsqueletico: formData.musculoEsqueletico,
                otros: formData.otros
            };
        }
        
        // Crear objeto de historia clínica con datos organizados
        const historiaClinicaData = {
            // Información de la consulta
            fechaRegistro: formData.fechaRegistro ? new Date(formData.fechaRegistro) : new Date(),
            tipoActividad: formData.tipoActividad,
            acompanamientoEnConsulta: formData.acompanamientoEnConsulta,
            motivoConsulta: formData.motivoConsulta,
            motivoAtencion: formData.motivoAtencion,
            fechaCita: formData.fechaCita ? new Date(formData.fechaCita) : null,
            horaCita: formData.horaCita,
            tipoCita: formData.tipoCita,
            pagador: formData.pagador,
            
            // Información del paciente
            paciente: {
                idType: formData.idType || formData.tipoIdentificacion,
                idNumber: formData.idNumber || formData.numeroDocumento,
                primerNombre: formData.primerNombre,
                segundoNombre: formData.segundoNombre,
                primerApellido: formData.primerApellido,
                segundoApellido: formData.segundoApellido,
                fechaNacimiento: formData.dob || formData.fechaNacimiento ? new Date(formData.dob || formData.fechaNacimiento) : null,
                genero: formData.gender || formData.genero,
                grupoSanguineo: formData.grupoSanguineo,
                rh: formData.rh,
                estadoCivil: formData.estadoCivil,
                escolaridad: formData.escolaridad,
                ocupacion: formData.ocupacion,
                zonaUbicacion: formData.zona || formData.zonaUbicacion,
                direccion: formData.patientAddress || formData.direccion,
                barrio: formData.neighborhood || formData.barrio,
                departamento: formData.departamento,
                municipio: formData.municipio,
                email: formData.email,
                telefono: formData.telefono || formData.telefono1,
                celular: formData.cellNumber1,
                condicionDesplazamiento: formData.condicionDesplazamiento,
                grupoEtnico: formData.grupoEtnico,
                paisNacimiento: formData.paisNacimiento,
                paisResidencia: formData.paisResidencia,
                tipoUsuario: formData.tipoUsuario,
                tipoDeAfiliado: formData.tipoDeAfiliado,
                aseguradora: formData.aseguradora,

            },
            
            // Información del profesional
            profesional: {
                nombre: formData.profesional,
                especialidad: formData.especialidad,
            },
            examenMedico: examenMedicoData,
            // Anamnesis
            enfermedadActual: formData.enfermedadActual,
            resultadosParaclinicos: formData.resultadosParaclinicos,
            servicio: formData.servicio,
            // Antecedentes
            antecedentes: formData.antecedentes || [],
            familiares: formData.familiares,
            psicosociales: formData.psicosociales,
            
            // Ginecoobstétricos
            ginecoobstetricos: formData.ginecoobstetricos || [],
            planificacion: formData.planificacion,
            ciclos: formData.ciclos,
            
            // Revisión por sistemas
            sistemas: formData.sistemas || [],
            
            // Examen físico
            estadoDeConciencia: formData.estadoDeConciencia,
            equiposSignos: formData.equiposSignos,
            
            // Signos vitales
            signosVitales: {
                tasMming: formData.tasMming ? parseFloat(formData.tasMming) : null,
                tad: formData.tad ? parseFloat(formData.tad) : null,
                fcMin: formData.fcMin ? parseFloat(formData.fcMin) : null,
                frMin: formData.frMin ? parseFloat(formData.frMin) : null,
                temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
                pesoKg: formData.pesoKg ? parseFloat(formData.pesoKg) : null,
                tallaCm: formData.tallaCm ? parseFloat(formData.tallaCm) : null,
                imc: formData.imc ? parseFloat(formData.imc) : null
            },
            
            // Alertas y alergias
            alertas: formData.alertas,
            alergias: formData.alergias,
            
            // Diagnósticos
            diagnosticos: diagnosticos,
            
            // Plan de manejo
            analisisyplan: formData.analisisyplan,
            recomendaciones: formData.recomendaciones,
            
            pacienteId: formData.pacienteId,
            doctorId: req.body.doctorId,
            citaId: req.body.citaId
        };
        
        // Crear la historia clínica
        // Guardar la historia clínica
        const nuevaHistoriaClinica = new HistoriaClinica(historiaClinicaData);
        await nuevaHistoriaClinica.save();
        
        // Obtener información adicional para el PDF
        const paciente = await Paciente.findById(nuevaHistoriaClinica.pacienteId);
        const doctor = await Doctor.findById(nuevaHistoriaClinica.doctorId);
        
        // Generar el PDF
        const pdfBuffer = await crearPDFHistoriaClinica(nuevaHistoriaClinica, paciente, doctor);
        
        // Subir el PDF a S3
        const nombreArchivo = `historia_clinica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
        const rutaCarpeta = `patients/${paciente.idNumber}/historias-clinicas`;
        
        const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
        
        if (pdfUrl) {
            // Actualizar la historia clínica con la URL del PDF
            nuevaHistoriaClinica.pdfUrl = pdfUrl;
            await nuevaHistoriaClinica.save();
        }
        
        // Responder con la historia clínica creada y la URL del PDF
        res.status(201).json({
            success: true,
            message: 'Historia clínica creada exitosamente',
            data: nuevaHistoriaClinica,
            pdfUrl
        });
        
    } catch (error) {
        console.error('Error al crear historia clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la historia clínica',
            error: error.message
        });
    }
};

exports.obtenerHistoriaClinica = async (req, res) => {
    try {
        const historiaClinica = await HistoriaClinica.findById(req.params.id);
        
        if (!historiaClinica) {
            return res.status(404).json({
                success: false,
                message: 'Historia clínica no encontrada'
            });
        }
        
        res.status(200).json({
            success: true,
            data: historiaClinica
        });
        
    } catch (error) {
        console.error('Error al obtener historia clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la historia clínica',
            error: error.message
        });
    }
};

exports.obtenerHistoriasClinicasPaciente = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        console.log('pacienteId', pacienteId);

        const historiasClinicas = await HistoriaClinica.find({ pacienteId })
            .sort({ fechaRegistro: -1 });
        
        res.status(200).json({
            success: true,
            count: historiasClinicas.length,
            data: historiasClinicas
        });
        
    } catch (error) {
        console.error('Error al obtener historias clínicas del paciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las historias clínicas',
            error: error.message
        });
    }
};

// Obtener historia clínica por citaId
exports.getHistoriaClinicaByCitaId = async (req, res) => {
  try {
    console.log('Iniciando búsqueda de historia clínica por citaId:', req.params.citaId);
    const { citaId } = req.params;

    // Buscar la historia clínica por citaId
    const historiaClinica = await HistoriaClinica.findOne({ citaId })
      .populate('pacienteId')
      .populate('doctorId');

    if (!historiaClinica) {
      console.log('No se encontró historia clínica para la cita:', citaId);
      return res.status(404).json({
        success: false,
        message: 'No se encontró historia clínica para esta cita'
      });
    }

    // Si ya existe una URL del PDF, devolverla
    if (historiaClinica.pdfUrl) {
      console.log('Historia clínica ya tiene PDF, devolviendo URL:', historiaClinica.pdfUrl);
      return res.status(200).json({
        success: true,
        historiaClinica,
        pdfUrl: historiaClinica.pdfUrl
      });
    }

    console.log('Generando nuevo PDF para la historia clínica');
    // Si no existe el PDF, generar uno nuevo
    const paciente = historiaClinica.pacienteId;
    const doctor = historiaClinica.doctorId;

    // Generar el PDF
    const pdfBuffer = await crearPDFHistoriaClinica(historiaClinica, paciente, doctor);
    
    // Subir el PDF a S3
    const nombreArchivo = `historia_clinica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${paciente.idNumber}/historias-clinicas`;
    
    console.log('Subiendo PDF a S3:', rutaCarpeta, nombreArchivo);
    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
    
    if (pdfUrl) {
      console.log('PDF subido exitosamente, actualizando historia clínica con URL:', pdfUrl);
      // Actualizar la historia clínica con la URL del PDF
      historiaClinica.pdfUrl = pdfUrl;
      await historiaClinica.save();
      
      // Devolver la historia clínica actualizada con la URL del PDF
      return res.status(200).json({
        success: true,
        historiaClinica,
        pdfUrl
      });
    } else {
      console.log('No se pudo subir el PDF a S3, devolviendo buffer del PDF');
      // Si no se pudo subir el PDF, devolver el buffer
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=historia_clinica_${paciente.idNumber}.pdf`,
        'Content-Length': pdfBuffer.length
      });
      return res.send(pdfBuffer);
    }

  } catch (error) {
    console.error('Error al obtener historia clínica por citaId:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la historia clínica',
      error: error.message
    });
  }
};

// Nuevo controlador para verificar y crear historia clínica
exports.verificarYCrearHistoriaClinica = async (req, res) => {
    try {
        const { citaId } = req.body;
        
        if (!citaId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID de la cita'
            });
        }
        
        // Verificar si ya existe una historia clínica para esta cita
        const historiaExistente = await HistoriaClinica.findOne({ citaId });
        
        if (historiaExistente) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe una historia clínica para esta cita',
                data: {
                    historiaId: historiaExistente._id,
                    pdfUrl: historiaExistente.pdfUrl
                }
            });
        }
        
        // Si no existe, proceder a crear la historia clínica
        const formData = req.body;
        
        // Parsear los diagnósticos si vienen como string JSON
        // ... existing code ...
        // Parsear los diagnósticos si vienen como string JSON o array
        let diagnosticos = [];
        if (formData.diagnosticos) {
            if (typeof formData.diagnosticos === 'string') {
                try {
                    diagnosticos = JSON.parse(formData.diagnosticos);
                } catch (error) {
                    console.error('Error al parsear diagnósticos:', error);
                }
            } else if (Array.isArray(formData.diagnosticos)) {
                diagnosticos = formData.diagnosticos;
            }
        }
// ... existing code ...
        
        // Información del examen médico
        // Verificar si examenMedico viene como objeto completo o como propiedades individuales
        let examenMedicoData = {};
        if (formData.examenMedico && typeof formData.examenMedico === 'object') {
            // Si viene como objeto completo, usarlo directamente
            examenMedicoData = formData.examenMedico;
        } else {
            // Si viene como propiedades individuales, construir el objeto
            examenMedicoData = {
                toraxCardioVascular: formData.toraxCardioVascular,
                abdomen: formData.abdomen,
                genitalesExtremidades: formData.genitalesExtremidades,
                neurologico: formData.neurologico,
                examenMental: formData.examenMental,
                cabezaCuello: formData.cabezaCuello,
                pielFaneras: formData.pielFaneras,
                ojoOidoNarizGarganta: formData.ojoOidoNarizGarganta,
                musculoEsqueletico: formData.musculoEsqueletico,
                otros: formData.otros
            };
        }
        
        // Crear objeto de historia clínica con datos organizados
        const historiaClinicaData = {
            // Información de la consulta
            fechaRegistro: formData.fechaRegistro ? new Date(formData.fechaRegistro) : new Date(),
            tipoActividad: formData.tipoActividad,
            acompanamientoEnConsulta: formData.acompanamientoEnConsulta,
            motivoConsulta: formData.motivoConsulta,
            motivoAtencion: formData.motivoAtencion,
            fechaCita: formData.fechaCita ? new Date(formData.fechaCita) : null,
            horaCita: formData.horaCita,
            tipoCita: formData.tipoCita,
            pagador: formData.pagador,
            
            // Información del paciente
            paciente: {
                idType: formData.idType || formData.tipoIdentificacion,
                idNumber: formData.idNumber || formData.numeroDocumento,
                primerNombre: formData.primerNombre,
                segundoNombre: formData.segundoNombre,
                primerApellido: formData.primerApellido,
                segundoApellido: formData.segundoApellido,
                fechaNacimiento: formData.dob || formData.fechaNacimiento ? new Date(formData.dob || formData.fechaNacimiento) : null,
                genero: formData.gender || formData.genero,
                grupoSanguineo: formData.grupoSanguineo,
                rh: formData.rh,
                estadoCivil: formData.estadoCivil,
                escolaridad: formData.escolaridad,
                ocupacion: formData.ocupacion,
                zonaUbicacion: formData.zona || formData.zonaUbicacion,
                direccion: formData.patientAddress || formData.direccion,
                barrio: formData.neighborhood || formData.barrio,
                departamento: formData.departamento,
                municipio: formData.municipio,
                email: formData.email,
                telefono: formData.telefono || formData.telefono1,
                celular: formData.cellNumber1,
                condicionDesplazamiento: formData.condicionDesplazamiento,
                grupoEtnico: formData.grupoEtnico,
                paisNacimiento: formData.paisNacimiento,
                paisResidencia: formData.paisResidencia,
                tipoUsuario: formData.tipoUsuario,
                tipoDeAfiliado: formData.tipoDeAfiliado,
                aseguradora: formData.aseguradora,
            },
            
            // Información del profesional
            profesional: {
                nombre: formData.profesional,
                especialidad: formData.especialidad,
            },
            examenMedico: examenMedicoData,
            // Anamnesis
            enfermedadActual: formData.enfermedadActual,
            resultadosParaclinicos: formData.resultadosParaclinicos,
            servicio: formData.servicio,
            // Antecedentes
            antecedentes: formData.antecedentes || [],
            familiares: formData.familiares,
            psicosociales: formData.psicosociales,
            
            // Ginecoobstétricos
            ginecoobstetricos: formData.ginecoobstetricos || [],
            planificacion: formData.planificacion,
            ciclos: formData.ciclos,
            
            // Revisión por sistemas
            sistemas: formData.sistemas || [],
            
            // Examen físico
            estadoDeConciencia: formData.estadoDeConciencia,
            equiposSignos: formData.equiposSignos,
            
            // Signos vitales
            signosVitales: {
                tasMming: formData.tasMming ? parseFloat(formData.tasMming) : null,
                tad: formData.tad ? parseFloat(formData.tad) : null,
                fcMin: formData.fcMin ? parseFloat(formData.fcMin) : null,
                frMin: formData.frMin ? parseFloat(formData.frMin) : null,
                temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
                pesoKg: formData.pesoKg ? parseFloat(formData.pesoKg) : null,
                tallaCm: formData.tallaCm ? parseFloat(formData.tallaCm) : null,
                imc: formData.imc ? parseFloat(formData.imc) : null,
                percentilPesoTalla: formData.percentilPesoTalla,
                perimetroCefalico: formData.perimetroCefalico,
            },
            
            // Alertas y alergias
            alertas: formData.alertas,
            alergias: formData.alergias,
            
            // Diagnósticos
            diagnosticos: diagnosticos,
            
            // Plan de manejo
            analisisyplan: formData.analisisyplan,
            recomendaciones: formData.recomendaciones,
            
            pacienteId: formData.pacienteId,
            doctorId: formData.doctorId,
            citaId: formData.citaId
        };
        
        // Crear la historia clínica
        const nuevaHistoriaClinica = new HistoriaClinica(historiaClinicaData);
        await nuevaHistoriaClinica.save();
        
        // Obtener información adicional para el PDF
        const paciente = await Paciente.findById(nuevaHistoriaClinica.pacienteId);
        const doctor = await Doctor.findById(nuevaHistoriaClinica.doctorId);
        
        // Generar el PDF
        const pdfBuffer = await crearPDFHistoriaClinica(nuevaHistoriaClinica, paciente, doctor);
        
        // Subir el PDF a S3
        const nombreArchivo = `historia_clinica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
        const rutaCarpeta = `patients/${paciente.idNumber}/historias-clinicas`;
        
        const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);
        
        if (pdfUrl) {
            // Actualizar la historia clínica con la URL del PDF
            nuevaHistoriaClinica.pdfUrl = pdfUrl;
            await nuevaHistoriaClinica.save();
        }
        
        // Actualizar el estado de la cita a "completada"
        await Cita.findByIdAndUpdate(citaId, { estado: 'completada' });
        
        // Responder con la historia clínica creada y la URL del PDF
        res.status(201).json({
            success: true,
            message: 'Historia clínica creada exitosamente',
            data: nuevaHistoriaClinica,
            pdfUrl
        });
        
    } catch (error) {
        console.error('Error al verificar y crear historia clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la historia clínica',
            error: error.message
        });
    }
};