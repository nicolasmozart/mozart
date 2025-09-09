import { Request, Response } from 'express';
import { ClientDatabaseService } from '../services/clientDatabaseService';
import { Client } from '../models';

// Extender Request para incluir información del usuario autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId?: string;
    tenantName?: string;
    features?: any;
  };
}

export class TenantPatientController {
  // Método estático para crear logs en la base de datos del cliente
  private static async createClientLog(
    clientConnection: any,
    databaseName: string,
    logData: {
      userId: string;
      userName: string;
      userRole: string;
      action: string;
      entityType: string;
      entityId?: string;
      entityName?: string;
      details: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    try {
      // Obtener o crear el modelo Log para la base de datos del cliente
      const Log = ClientDatabaseService.getLogModel(clientConnection, databaseName);
      
      const log = new Log({
        ...logData,
        timestamp: new Date(),
        tenantId: databaseName
      });
      
      await log.save();
      console.log(`📝 Log creado en BD del cliente ${databaseName}: ${logData.action}`);
    } catch (error) {
      console.error(`❌ Error creando log en BD del cliente ${databaseName}:`, error);
      // No fallar la operación principal por un error en el logging
    }
  }

  // Obtener todos los pacientes del tenant autenticado
  async getAllPatients(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🏥 getAllPatients - Usuario:', req.user);
      console.log('🏥 getAllPatients - URL:', req.url);
      
      if (!req.user) {
        console.log('❌ getAllPatients - No hay usuario en el request');
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        console.log('❌ getAllPatients - Usuario sin tenantId:', req.user);
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);

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
      console.error('Error obteniendo pacientes del tenant:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener un paciente específico del tenant
  async getPatient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { id } = req.params;

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);

      const patient = await Patient.findOne({
        _id: id,
        visible: true
      }).select('-__v');

      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      res.json(patient);
    } catch (error) {
      console.error('Error obteniendo paciente del tenant:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear un nuevo paciente en la BD del tenant
  async createPatient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const patientData = req.body;

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);
      const User = ClientDatabaseService.getUserModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe un paciente con el mismo número de identificación
      const existingPatient = await Patient.findOne({
        idNumber: patientData.idNumber
      });

      if (existingPatient) {
        return res.status(400).json({ 
          error: 'Ya existe un paciente con este número de identificación' 
        });
      }

      // Crear el paciente en la BD del tenant
      const newPatient = new Patient(patientData);
      await newPatient.save();

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
            phone: patientData.phone || '', // Agregar teléfono para 2FA
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

      // Crear log de creación de paciente
      await TenantPatientController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'CREACION_PACIENTE',
        entityType: 'PATIENT',
        entityId: newPatient._id,
        entityName: `${patientData.firstName} ${patientData.lastName}`,
        details: `Paciente creado: ${patientData.firstName} ${patientData.lastName}. Cédula: ${patientData.idNumber}, Teléfono: ${patientData.phone}, Email: ${patientData.email || 'No especificado'}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Paciente creado exitosamente',
        patient: newPatient
      });
    } catch (error: any) {
      console.error('Error creando paciente en tenant:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'El número de identificación ya existe' 
        });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar un paciente del tenant
  async updatePatient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Debug: ver qué campos se están enviando
      console.log('🔍 Campos enviados para actualizar:', Object.keys(updateData));
      console.log('📋 Datos de actualización:', updateData);

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);

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

      // Crear un objeto con solo los campos que se van a actualizar
      const fieldsToUpdate: any = {};
      const changedFields: string[] = [];
      const changeDetails: string[] = [];

      // Lista de campos que NO queremos registrar en los logs (campos técnicos)
      const excludedFields = [
        '_id', 'createdAt', 'updatedAt', '__v', 'citas', 'Entrevista', 
        'horarioEntrevista', 'horaEntrevista', 'fechaEntrevista', 'verificaciondatos'
      ];

      // Solo procesar los campos que se enviaron en el request (no todos los campos del paciente)
      Object.keys(updateData).forEach(key => {
        // Solo procesar campos que no están en la lista de exclusión
        if (!excludedFields.includes(key) && updateData[key] !== undefined) {
          const oldValue = existingPatient[key];
          const newValue = updateData[key];
          
          // Función auxiliar para normalizar valores y detectar cambios reales
          const normalizeValue = (value: any) => {
            if (value === '' || value === undefined || value === null) return null;
            if (typeof value === 'string') return value.trim() || null;
            // Para fechas, normalizar a formato ISO para comparación
            if (value instanceof Date) return value.toISOString().split('T')[0];
            if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) return value;
            return value;
          };
          
          const oldValueNormalized = normalizeValue(oldValue);
          const newValueNormalized = normalizeValue(newValue);
          
          // Solo registrar si realmente hay un cambio significativo
          if (newValueNormalized !== oldValueNormalized) {
            // Verificar que el cambio sea realmente significativo (no solo espacios en blanco)
            const isSignificantChange = 
              (oldValueNormalized === null && newValueNormalized !== null) ||
              (oldValueNormalized !== null && newValueNormalized === null) ||
              (oldValueNormalized !== null && newValueNormalized !== null && 
               String(oldValueNormalized).trim() !== String(newValueNormalized).trim());
            
            if (isSignificantChange) {
              fieldsToUpdate[key] = newValue;
              changedFields.push(key);
              
              // Crear descripción detallada del cambio solo para campos que realmente cambiaron
              // Solo mostrar el cambio si es significativo y no es solo un cambio de formato
              if (oldValueNormalized === null && newValueNormalized !== null) {
                changeDetails.push(`${key}: "sin valor" → "${newValue}"`);
              } else if (oldValueNormalized !== null && newValueNormalized === null) {
                changeDetails.push(`${key}: "${oldValue}" → "sin valor"`);
              } else if (oldValueNormalized !== null && newValueNormalized !== null) {
                // Evitar mostrar cambios que son solo de formato (ej: espacios en blanco)
                const oldStr = String(oldValueNormalized).trim();
                const newStr = String(newValueNormalized).trim();
                if (oldStr !== newStr) {
                  changeDetails.push(`${key}: "${oldValue}" → "${newValue}"`);
                }
              }
            }
          }
        }
      });

      // Si no hay campos para actualizar, retornar error
      if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ 
          error: 'No hay campos para actualizar' 
        });
      }

      // Agregar timestamp de actualización
      fieldsToUpdate.updatedAt = new Date();

      const updatedPatient = await Patient.findByIdAndUpdate(
        id,
        fieldsToUpdate,
        { new: true, runValidators: true }
      ).select('-__v');

      // Crear log de actualización de paciente con detalles específicos
      await TenantPatientController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ACTUALIZACION_PACIENTE',
        entityType: 'PATIENT',
        entityId: id,
        entityName: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
        details: `Paciente actualizado: ${updatedPatient.firstName} ${updatedPatient.lastName}. ${changedFields.length > 0 ? `Campo${changedFields.length > 1 ? 's' : ''} modificado${changedFields.length > 1 ? 's' : ''}: ${changedFields.join(', ')}. ${changeDetails.length > 0 ? `Detalles: ${changeDetails.join('; ')}` : ''}` : 'Sin cambios detectados'}`.trim(),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Paciente actualizado exitosamente',
        patient: updatedPatient,
        changes: {
          fieldsChanged: changedFields,
          changeDetails: changeDetails
        }
      });
    } catch (error: any) {
      console.error('Error actualizando paciente del tenant:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'El número de identificación ya existe' 
        });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar un paciente del tenant (soft delete)
  async deletePatient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { id } = req.params;

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);

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

      // Crear log de eliminación de paciente
      await TenantPatientController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ELIMINACION_PACIENTE',
        entityType: 'PATIENT',
        entityId: id,
        entityName: `${patient.firstName} ${patient.lastName}`,
        details: `Paciente eliminado: ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Paciente eliminado exitosamente' });
    } catch (error) {
      console.error('Error eliminando paciente del tenant:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Restaurar un paciente eliminado del tenant
  async restorePatient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { id } = req.params;

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);

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

      // Crear log de restauración de paciente
      await TenantPatientController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'RESTAURACION_PACIENTE',
        entityType: 'PATIENT',
        entityId: id,
        entityName: `${patient.firstName} ${patient.lastName}`,
        details: `Paciente restaurado: ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({ message: 'Paciente restaurado exitosamente' });
    } catch (error) {
      console.error('Error restaurando paciente del tenant:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener estadísticas de pacientes del tenant
  async getPatientStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, tenant.databaseName);

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
      console.error('Error obteniendo estadísticas del tenant:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
