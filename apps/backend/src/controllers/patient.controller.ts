import { Request, Response } from 'express';
import { TenantRequest } from '../middlewares/tenantDetection';
import { ClientDatabaseService } from '../services/clientDatabaseService';
import { LogService } from '../services/logService';

export class PatientController {
  // Obtener todos los pacientes del cliente
  async getAllPatients(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);

      const query: any = { visible: true };

      // Búsqueda por nombre, email, teléfono o identificación
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { idNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const patients = await Patient.find(query)
        .sort(sortOptions)
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))
        .select('-__v');

      const total = await Patient.countDocuments(query);

      res.json({
        patients,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        total
      });
    } catch (error) {
      console.error('Error obteniendo pacientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener un paciente específico
  async getPatient(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      const { id } = req.params;

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);

      const patient = await Patient.findOne({
        _id: id,
        visible: true
      }).select('-__v');

      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json(patient);
    } catch (error) {
      console.error('Error obteniendo paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear un nuevo paciente
  async createPatient(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      const patientData = req.body;

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);
      const User = ClientDatabaseService.getUserModel(clientConnection, req.tenant.databaseName);

      // Verificar si ya existe un paciente con el mismo número de identificación
      const existingPatient = await Patient.findOne({
        idNumber: patientData.idNumber
      });

      if (existingPatient) {
        return res.status(400).json({ 
          error: 'Ya existe un paciente con este número de identificación' 
        });
      }

      // Crear el paciente directamente en la BD del cliente
      const newPatient = new Patient(patientData);
      await newPatient.save();

      // Registrar log de creación del paciente
      try {
        await LogService.createLog({
          tenantId: req.tenant._id.toString(),
          userId: req.user?.userId || 'system',
          userName: req.user ? req.user.email : 'Sistema',
          userRole: req.user?.role || 'system',
          action: 'PATIENT_CREATED',
          entityType: 'PATIENT',
          entityId: newPatient._id.toString(),
          entityName: `${patientData.firstName} ${patientData.lastName}`,
          details: `Paciente ${patientData.firstName} ${patientData.lastName} creado exitosamente`,
          request: req
        });
      } catch (logError) {
        console.error('Error logging patient creation:', logError);
        // No fallar la operación principal por un error de logging
      }

      // Crear automáticamente un usuario para el paciente
      try {
        console.log('🔄 Iniciando creación automática de usuario para paciente...');
        console.log('📋 Datos del paciente:', {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          email: patientData.email,
          idNumber: patientData.idNumber
        });
        
        // Determinar el username: primero correo, si no tiene entonces cédula
        const username = patientData.email || patientData.idNumber;
        console.log('👤 Username determinado:', username);
        
        // Verificar si ya existe un usuario con ese email o cédula
        console.log('🔍 Verificando si existe usuario...');
        const existingUser = await User.findOne({
          $or: [
            { email: username },
            { email: patientData.idNumber }
          ]
        });

        if (!existingUser) {
          console.log('✅ No existe usuario, procediendo a crear...');
          
          // Crear el usuario con password por defecto
          const newUser = new User({
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            email: username,
            password: 'paciente123456', // Password por defecto
            role: 'patient', // Role específico para pacientes
            isActive: true
          });

          console.log('👤 Usuario a crear:', {
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role
          });

          await newUser.save();
          console.log(`✅ Usuario creado exitosamente para paciente: ${patientData.firstName} ${patientData.lastName} con role: patient`);
          console.log('🆔 ID del usuario creado:', newUser._id);
        } else {
          console.log(`ℹ️ Usuario ya existe para paciente: ${patientData.firstName} ${patientData.lastName}`);
          console.log('👤 Usuario existente:', existingUser.email);
        }
      } catch (userError: any) {
        // Si falla la creación del usuario, solo loguear el error pero no fallar la creación del paciente
        console.error('⚠️ Error creando usuario automático para paciente:', userError);
        console.error('Detalles del error:', {
          patientId: newPatient._id,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          error: userError,
          errorMessage: userError.message,
          errorStack: userError.stack
        });
      }

      res.status(201).json({
        message: 'Paciente creado exitosamente',
        patient: newPatient
      });
    } catch (error: any) {
      console.error('Error creando paciente:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'El número de identificación ya existe' 
        });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar un paciente
  async updatePatient(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);

      // Verificar si el paciente existe
      const existingPatient = await Patient.findOne({
        _id: id,
        visible: true
      });

      if (!existingPatient) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      // Si se está cambiando el número de identificación, verificar que no exista
      if (updateData.idNumber && updateData.idNumber !== existingPatient.idNumber) {
        const duplicatePatient = await Patient.findOne({
          idNumber: updateData.idNumber,
          _id: { $ne: id }
        });

        if (duplicatePatient) {
          return res.status(400).json({ 
            error: 'Ya existe otro paciente con este número de identificación' 
          });
        }
      }

      const updatedPatient = await Patient.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-__v');

      // Registrar log de actualización del paciente
      try {
        await LogService.createLog({
          tenantId: req.tenant._id.toString(),
          userId: req.user?.userId || 'system',
          userName: req.user ? req.user.email : 'Sistema',
          userRole: req.user?.role || 'system',
          action: 'PATIENT_UPDATED',
          entityType: 'PATIENT',
          entityId: updatedPatient._id.toString(),
          entityName: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
          details: `Paciente ${updatedPatient.firstName} ${updatedPatient.lastName} actualizado exitosamente`,
          request: req
        });
      } catch (logError) {
        console.error('Error logging patient update:', logError);
        // No fallar la operación principal por un error de logging
      }

      res.json({
        message: 'Paciente actualizado exitosamente',
        patient: updatedPatient
      });
    } catch (error: any) {
      console.error('Error actualizando paciente:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'El número de identificación ya existe' 
        });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar un paciente (soft delete)
  async deletePatient(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      const { id } = req.params;

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);

      const patient = await Patient.findOne({
        _id: id,
        visible: true
      });

      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      // Soft delete - marcar como no visible
      await Patient.findByIdAndUpdate(id, { 
        visible: false,
        updatedAt: new Date()
      });

      // Registrar log de eliminación del paciente
      try {
        await LogService.createLog({
          tenantId: req.tenant._id.toString(),
          userId: req.user?.userId || 'system',
          userName: req.user ? req.user.email : 'Sistema',
          userRole: req.user?.role || 'system',
          action: 'PATIENT_DELETED',
          entityType: 'PATIENT',
          entityId: patient._id.toString(),
          entityName: `${patient.firstName} ${patient.lastName}`,
          details: `Paciente ${patient.firstName} ${patient.lastName} eliminado exitosamente`,
          request: req
        });
      } catch (logError) {
        console.error('Error logging patient deletion:', logError);
        // No fallar la operación principal por un error de logging
      }

      res.json({ message: 'Paciente eliminado exitosamente' });
    } catch (error) {
      console.error('Error eliminando paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Restaurar un paciente eliminado
  async restorePatient(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      const { id } = req.params;

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);

      const patient = await Patient.findOne({
        _id: id,
        visible: false
      });

      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      await Patient.findByIdAndUpdate(id, { 
        visible: true,
        updatedAt: new Date()
      });

      res.json({ message: 'Paciente restaurado exitosamente' });
    } catch (error) {
      console.error('Error restaurando paciente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener estadísticas de pacientes
  async getPatientStats(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'No se detectó el tenant' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(req.tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, req.tenant.databaseName);

      const stats = await Patient.aggregate([
        { $match: { visible: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            conSeguro: { $sum: { $cond: ['$hasInsurance', 1, 0] } },
            conCuidador: { $sum: { $cond: ['$hasCaretaker', 1, 0] } },
            emergencias: { $sum: { $cond: ['$necesitaEmergencia', 1, 0] } },
            verificados: { $sum: { $cond: ['$verificaciondatos', 1, 0] } }
          }
        }
      ]);

      const genderStats = await Patient.aggregate([
        { $match: { visible: true } },
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        stats: stats[0] || {
          total: 0,
          conSeguro: 0,
          conCuidador: 0,
          emergencias: 0,
          verificados: 0
        },
        genderStats
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
