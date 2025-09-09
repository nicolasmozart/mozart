import { Request, Response } from 'express';
import { ClientDatabaseService } from '../services/clientDatabaseService';
import { Client } from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Extender Request para incluir información del usuario autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId?: string;
    tenantName?: string;
    features?: any;
    isImpersonation?: boolean;
    impersonatedBy?: string;
    entityId?: string;
  };
}

export class TenantDoctorController {
  // Endpoint de prueba para verificar que las rutas funcionen
  async testEndpoint(req: AuthenticatedRequest, res: Response) {
    res.json({
      success: true,
      message: 'Endpoint de doctores funcionando correctamente',
      timestamp: new Date().toISOString(),
      user: req.user ? {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        tenantId: req.user.tenantId
      } : null
    });
  }

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

  // Obtener todos los doctores del tenant autenticado
  async getAllDoctors(req: AuthenticatedRequest, res: Response) {
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
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      const doctors = await Doctor.find({ activo: true })
        .populate({
          path: 'especialidad',
          select: 'name',
          model: ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName)
        })
        .populate({
          path: 'hospital',
          select: 'name',
          model: ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName)
        })
        .sort({ name: 1, lastName: 1 });

      res.json({
        success: true,
        doctors
      });
    } catch (error) {
      console.error('Error obteniendo doctores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear un nuevo doctor
  async createDoctor(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { 
        name, 
        lastName, 
        email, 
        phone, 
        especialidad, 
        cedula, 
        hospital,
        biografia,
        experiencia,
        educacion,
        url_firma
      } = req.body;

      // Validaciones - solo los campos realmente requeridos en el modelo
      if (!name || !lastName || !email || !phone || !especialidad || !cedula) {
        return res.status(400).json({
          success: false,
          message: 'Los campos obligatorios son: nombre, apellido, email, teléfono, especialidad y cédula'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);
      const User = ClientDatabaseService.getUserModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe un doctor con ese email
      const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un doctor con ese email'
        });
      }

      // Verificar si ya existe un doctor con esa cédula
      const existingDoctorCedula = await Doctor.findOne({ cedula });
      if (existingDoctorCedula) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un doctor con esa cédula profesional'
        });
      }

      // Crear usuario en la tabla User
      const hashedPassword = await bcrypt.hash('doctor123456', 10);
      const newUser = new User({
        firstName: name,
        lastName: lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone.trim(), // Agregar teléfono para 2FA
        role: 'doctor',
        isActive: true
      });

      const savedUser = await newUser.save();

      // Crear el doctor
      const doctor = new Doctor({
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        userId: savedUser._id,
        especialidad: especialidad.trim(),
        cedula: cedula.trim(),
        hospital: hospital?.trim() || '',
        biografia: biografia?.trim() || '',
        experiencia: experiencia?.trim() || '',
        educacion: educacion?.trim() || '',
        url_firma: url_firma || '',
        activo: true
      });

      await doctor.save();

      // Crear log de creación de doctor
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'CREACION_DOCTOR',
        entityType: 'DOCTOR',
        entityId: doctor._id,
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Doctor creado: ${doctor.name} ${doctor.lastName}. Email: ${doctor.email}, Cédula: ${doctor.cedula}, Especialidad: ${doctor.especialidad}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'Doctor creado exitosamente',
        doctor
      });
    } catch (error) {
      console.error('Error creando doctor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar un doctor
  async updateDoctor(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { id } = req.params;
      const { 
        name, 
        lastName, 
        email, 
        phone, 
        especialidad, 
        cedula, 
        hospital,
        biografia,
        experiencia,
        educacion,
        url_firma
      } = req.body;

      // Validaciones - solo los campos realmente requeridos en el modelo
      if (!name || !lastName || !email || !phone || !especialidad || !cedula) {
        return res.status(400).json({
          success: false,
          message: 'Los campos obligatorios son: nombre, apellido, email, teléfono, especialidad y cédula'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe otro doctor con ese email
      const existingDoctor = await Doctor.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: id } 
      });
      
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro doctor con ese email'
        });
      }

      // Verificar si ya existe otro doctor con esa cédula
      const existingDoctorCedula = await Doctor.findOne({ 
        cedula, 
        _id: { $ne: id } 
      });
      
      if (existingDoctorCedula) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro doctor con esa cédula profesional'
        });
      }

      const doctor = await Doctor.findByIdAndUpdate(
        id,
        {
          name: name.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          especialidad: especialidad.trim(),
          cedula: cedula.trim(),
          hospital: hospital?.trim() || '',
          biografia: biografia?.trim() || '',
          experiencia: experiencia?.trim() || '',
          educacion: educacion?.trim() || '',
          url_firma: url_firma || ''
        },
        { new: true, runValidators: true }
      );

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor no encontrado'
        });
      }

      // Crear log de actualización de doctor
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ACTUALIZACION_DOCTOR',
        entityType: 'DOCTOR',
        entityId: id,
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Doctor actualizado: ${doctor.name} ${doctor.lastName}. Email: ${doctor.email}, Cédula: ${doctor.cedula}, Especialidad: ${doctor.especialidad}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Doctor actualizado exitosamente',
        doctor
      });
    } catch (error) {
      console.error('Error actualizando doctor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar un doctor (desactivar)
  async deleteDoctor(req: AuthenticatedRequest, res: Response) {
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
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);
      const User = ClientDatabaseService.getUserModel(clientConnection, tenant.databaseName);

      // Buscar el doctor
      const doctor = await Doctor.findById(id);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor no encontrado'
        });
      }

      // Desactivar el doctor
      doctor.activo = false;
      await doctor.save();

      // Desactivar el usuario asociado
      if (doctor.userId) {
        await User.findByIdAndUpdate(doctor.userId, { isActive: false });
      }

      // Crear log de eliminación de doctor
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ELIMINACION_DOCTOR',
        entityType: 'DOCTOR',
        entityId: id,
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Doctor eliminado: ${doctor.name} ${doctor.lastName}. Email: ${doctor.email}, Cédula: ${doctor.cedula}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Doctor eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando doctor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener un doctor específico
  async getDoctor(req: AuthenticatedRequest, res: Response) {
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
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      const doctor = await Doctor.findById(id)
        .populate({
          path: 'especialidad',
          select: 'name',
          model: ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName)
        })
        .populate({
          path: 'hospital',
          select: 'name',
          model: ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName)
        });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor no encontrado'
        });
      }

      res.json({
        success: true,
        doctor
      });
    } catch (error) {
      console.error('Error obteniendo doctor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener lista de doctores para suplantación (solo para admins)
  async getDoctorsForImpersonation(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🏥 === INICIANDO getDoctorsForImpersonation ===');
      console.log('👤 Usuario en request:', req.user);
      
      if (!req.user) {
        console.log('❌ No hay usuario autenticado');
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        console.log('❌ Usuario no tiene tenantId');
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      // Verificar que el usuario sea admin
      if (req.user.role !== 'admin') {
        console.log('❌ Usuario no es admin, rol:', req.user.role);
        return res.status(403).json({ error: 'Solo los administradores pueden suplantar usuarios' });
      }

      console.log('✅ Usuario validado como admin');

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        console.log('❌ Tenant no encontrado');
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      console.log('🏢 Tenant encontrado:', tenant.name);

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);
      const User = ClientDatabaseService.getUserModel(clientConnection, tenant.databaseName);

      console.log('🔌 Conectado a BD del cliente');

      // Obtener doctores activos con información básica para suplantación
      const doctors = await Doctor.find({ activo: true })
        .populate({
          path: 'especialidad',
          select: 'name',
          model: ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName)
        })
        .populate({
          path: 'hospital',
          select: 'name',
          model: ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName)
        })
        .select('name lastName email especialidad hospital activo')
        .sort({ name: 1, lastName: 1 });

      console.log('👨‍⚕️ Doctores encontrados:', doctors.length);

      // Formatear la respuesta para suplantación
      const doctorsForImpersonation = doctors.map(doctor => ({
        _id: doctor._id,
        name: `${doctor.name} ${doctor.lastName}`,
        email: doctor.email,
        specialty: doctor.especialidad?.name || 'Sin especialidad',
        hospital: doctor.hospital?.name || 'Sin hospital',
        isActive: doctor.activo
      }));

      console.log('📋 Doctores formateados:', doctorsForImpersonation);

      res.json({
        success: true,
        doctors: doctorsForImpersonation
      });
    } catch (error) {
      console.error('❌ Error obteniendo doctores para suplantación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Generar token de suplantación para un doctor específico
  async generateImpersonationToken(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🎭 === INICIANDO generateImpersonationToken ===');
      console.log('👤 Usuario en request:', req.user);
      console.log('🆔 Doctor ID solicitado:', req.params.doctorId);
      
      if (!req.user) {
        console.log('❌ No hay usuario autenticado');
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        console.log('❌ Usuario no tiene tenantId');
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      // Verificar que el usuario sea admin
      if (req.user.role !== 'admin') {
        console.log('❌ Usuario no es admin, rol:', req.user.role);
        return res.status(403).json({ error: 'Solo los administradores pueden suplantar usuarios' });
      }

      console.log('✅ Usuario validado como admin');

      const { doctorId } = req.params;
      console.log('🆔 Doctor ID a suplantar:', doctorId);

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        console.log('❌ Tenant no encontrado');
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      console.log('🏢 Tenant encontrado:', tenant.name);

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);
      const User = ClientDatabaseService.getUserModel(clientConnection, tenant.databaseName);

      console.log('🔌 Conectado a BD del cliente');

      // Buscar el doctor
      console.log('🔍 Buscando doctor con ID:', doctorId);
      const doctor = await Doctor.findById(doctorId);
      
      if (!doctor) {
        console.log('❌ Doctor no encontrado');
        return res.status(404).json({ error: 'Doctor no encontrado' });
      }

      console.log('👨‍⚕️ Doctor encontrado:', doctor.name, doctor.lastName);

      if (!doctor.activo) {
        console.log('❌ Doctor no está activo');
        return res.status(400).json({ error: 'El doctor no está activo' });
      }

      // Obtener el usuario asociado al doctor
      console.log('🔍 Buscando usuario del doctor con ID:', doctor.userId);
      const user = await User.findById(doctor.userId);
      
      if (!user) {
        console.log('❌ Usuario del doctor no encontrado');
        return res.status(404).json({ error: 'Usuario del doctor no encontrado' });
      }

      console.log('👤 Usuario del doctor encontrado:', user.email);

      // Generar token de suplantación
      console.log('🔑 Generando token de suplantación...');
      const impersonationToken = jwt.sign({
        userId: user._id,
        email: user.email,
        role: 'doctor',
        tenantId: tenant._id,
        tenantName: tenant.name,
        tenantDomain: tenant.domain,
        features: tenant.features,
        impersonatedBy: req.user.userId, // ID del admin que está suplantando
        isImpersonation: true,
        originalRole: 'admin'
      }, config.jwtSecret, { expiresIn: '1h' }); // Token de suplantación expira en 1 hora

      console.log('🔑 Token de suplantación generado');

      // Crear log de suplantación
      console.log('📝 Creando log de suplantación...');
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'IMPERSONATION_STARTED',
        entityType: 'DOCTOR',
        entityId: doctor._id.toString(),
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Admin ${req.user.email} inició suplantación del doctor ${doctor.name} ${doctor.lastName}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      console.log('📝 Log de suplantación creado');

      const responseData = {
        success: true,
        message: 'Token de suplantación generado exitosamente',
        token: impersonationToken,
        doctor: {
          _id: doctor._id,
          name: `${doctor.name} ${doctor.lastName}`,
          email: doctor.email,
          specialty: doctor.especialidad?.name || 'Sin especialidad',
          hospital: doctor.hospital?.name || 'Sin hospital'
        },
        expiresIn: '1h'
      };

      console.log('✅ Respuesta de suplantación preparada:', responseData);

      res.json(responseData);
    } catch (error) {
      console.error('❌ Error generando token de suplantación:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Finalizar suplantación
  async endImpersonation(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que sea una sesión de suplantación
      if (!req.user.isImpersonation) {
        return res.status(400).json({ error: 'No hay una sesión de suplantación activa' });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Buscar el doctor que estaba siendo suplantado
      const doctor = await Doctor.findById(req.user.entityId);
      
      if (doctor) {
        // Crear log de finalización de suplantación
        await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
          userId: req.user.impersonatedBy || 'unknown',
          userName: 'Admin (suplantación finalizada)',
          userRole: 'admin',
          action: 'IMPERSONATION_ENDED',
          entityType: 'DOCTOR',
          entityId: doctor._id.toString(),
          entityName: `${doctor.name} ${doctor.lastName}`,
          details: `Suplantación del doctor ${doctor.name} ${doctor.lastName} finalizada`,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        success: true,
        message: 'Suplantación finalizada exitosamente'
      });
    } catch (error) {
      console.error('Error finalizando suplantación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Consultar disponibilidad del doctor para una fecha específica (para agendar citas)
  async getDoctorAvailabilityForDate(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { doctorId } = req.params;
      const { fecha } = req.query;

      if (!fecha) {
        return res.status(400).json({ error: 'Fecha es requerida' });
      }

      // Obtener información del tenant
      const tenant = await Client.findById(req.user.tenantId);
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Buscar el doctor
      const doctor = await Doctor.findById(doctorId)
        .select('disponibilidad excepcionesFechas duracionCita name lastName');

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor no encontrado' });
      }

      // Obtener el día de la semana (0 = domingo, 1 = lunes, etc.)
      // Parsear la fecha de manera explícita para evitar problemas de zona horaria
      const [year, month, day] = (fecha as string).split('-').map(Number);
      const fechaConsulta = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed
      const diaSemana = fechaConsulta.getDay();
      const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const nombreDia = nombresDias[diaSemana];
      
      // Debug: verificar la fecha y el día calculado
      console.log('Fecha recibida:', fecha);
      console.log('Año:', year, 'Mes:', month, 'Día:', day);
      console.log('Fecha parseada:', fechaConsulta.toDateString());
      console.log('Fecha ISO:', fechaConsulta.toISOString());
      console.log('Día de la semana (0-6):', diaSemana);
      console.log('Nombre del día:', nombreDia);

      // Buscar disponibilidad para ese día de la semana
      const disponibilidadDia = doctor.disponibilidad.find((d: any) => d.dia === nombreDia);

      // Buscar si hay una excepción para esa fecha específica
      const excepcionFecha = doctor.excepcionesFechas.find((ex: any) => {
        const exFecha = new Date(ex.fecha);
        return exFecha.toDateString() === fechaConsulta.toDateString();
      });

      let horariosDisponibles: any[] = [];

      if (excepcionFecha) {
        // Si hay excepción, usar esa disponibilidad
        horariosDisponibles = excepcionFecha.intervalos.filter((intervalo: any) => intervalo.disponible);
      } else if (disponibilidadDia && disponibilidadDia.activo) {
        // Si no hay excepción, usar la disponibilidad semanal
        horariosDisponibles = disponibilidadDia.intervalos.filter((intervalo: any) => intervalo.disponible);
      }

      // Formatear la respuesta
      const respuesta = {
        doctorId: doctor._id,
        doctorName: `${doctor.name} ${doctor.lastName}`,
        fecha: fechaConsulta.toISOString().split('T')[0],
        diaSemana: nombreDia,
        duracionCita: doctor.duracionCita,
        horariosDisponibles: horariosDisponibles.map((intervalo: any) => ({
          inicio: intervalo.inicio,
          fin: intervalo.fin,
          disponible: intervalo.disponible
        })),
        tieneExcepcion: !!excepcionFecha,
        excepcion: excepcionFecha ? {
          horaInicio: excepcionFecha.horaInicio,
          horaFin: excepcionFecha.horaFin
        } : null
      };

      res.json({
        success: true,
        disponibilidad: respuesta
      });

    } catch (error) {
      console.error('Error consultando disponibilidad para fecha:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Guardar disponibilidad semanal del doctor
  async saveDoctorAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { disponibilidad, duracionCita, userId } = req.body;

      if (!disponibilidad || !duracionCita || !userId) {
        return res.status(400).json({
          success: false,
          message: 'disponibilidad, duracionCita y userId son requeridos'
        });
      }

      // Obtener información del tenant
      const tenant = await Client.findById(req.user.tenantId);
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Buscar el doctor por userId (referencia al usuario en la BD principal)
      const doctor = await Doctor.findOne({ userId: userId });
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor no encontrado' });
      }

      // Generar intervalos para cada día activo
      const disponibilidadConIntervalos = disponibilidad.map((dia: any) => {
        if (dia.activo) {
          const intervalos = TenantDoctorController.generateTimeSlots(dia.horaInicio, dia.horaFin, duracionCita);
          return { ...dia, intervalos };
        }
        return { ...dia, intervalos: [] };
      });

      // Actualizar el doctor
      doctor.disponibilidad = disponibilidadConIntervalos;
      doctor.duracionCita = duracionCita;
      await doctor.save();

      // Crear log de la operación
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: req.user.email,
        userRole: req.user.role,
        action: 'AVAILABILITY_UPDATED',
        entityType: 'DOCTOR',
        entityId: doctor._id.toString(),
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Disponibilidad semanal actualizada para ${doctor.name} ${doctor.lastName}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Disponibilidad guardada correctamente',
        disponibilidad: disponibilidadConIntervalos
      });

    } catch (error) {
      console.error('Error guardando disponibilidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener disponibilidad del doctor
  async getDoctorAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { doctorId } = req.params;

      // Obtener información del tenant
      const tenant = await Client.findById(req.user.tenantId);
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Buscar el doctor por doctorId (ID del documento Doctor en la BD del tenant)
      const doctor = await Doctor.findById(doctorId)
        .select('disponibilidad excepcionesFechas duracionCita name lastName');

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor no encontrado' });
      }

      res.json({
        success: true,
        disponibilidad: doctor.disponibilidad || [],
        excepcionesFechas: doctor.excepcionesFechas || [],
        duracionCita: doctor.duracionCita || 30,
        doctorName: `${doctor.name} ${doctor.lastName}`
      });

    } catch (error) {
      console.error('Error obteniendo disponibilidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agregar excepción de fecha
  async addDateException(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { fecha, horaInicio, horaFin, duracionCita, userId } = req.body;

      if (!fecha || !horaInicio || !horaFin || !duracionCita || !userId) {
        return res.status(400).json({
          success: false,
          message: 'fecha, horaInicio, horaFin, duracionCita y userId son requeridos'
        });
      }

      // Obtener información del tenant
      const tenant = await Client.findById(req.user.tenantId);
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Buscar el doctor por userId (referencia al usuario en la BD principal)
      const doctor = await Doctor.findOne({ userId: userId });
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor no encontrado' });
      }

      // Generar intervalos para la excepción
      const intervalos = TenantDoctorController.generateTimeSlots(horaInicio, horaFin, duracionCita);

      // Crear la excepción
      const excepcion = {
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        intervalos
      };

      // Agregar la excepción al doctor
      if (!doctor.excepcionesFechas) {
        doctor.excepcionesFechas = [];
      }
      doctor.excepcionesFechas.push(excepcion);
      await doctor.save();

      // Crear log de la operación
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: req.user.email,
        userRole: req.user.role,
        action: 'DATE_EXCEPTION_ADDED',
        entityType: 'DOCTOR',
        entityId: doctor._id.toString(),
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Excepción de fecha agregada para ${fecha} de ${horaInicio} a ${horaFin}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Excepción de fecha agregada correctamente',
        excepcion
      });

    } catch (error) {
      console.error('Error agregando excepción de fecha:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar excepción de fecha
  async removeDateException(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { excepcionId, userId } = req.body;

      if (!excepcionId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'excepcionId y userId son requeridos'
        });
      }

      // Obtener información del tenant
      const tenant = await Client.findById(req.user.tenantId);
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      // Buscar el doctor por userId (referencia al usuario en la BD principal)
      const doctor = await Doctor.findOne({ userId: userId });
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor no encontrado' });
      }

      // Eliminar la excepción
      if (doctor.excepcionesFechas) {
        doctor.excepcionesFechas = doctor.excepcionesFechas.filter(
          (ex: any) => ex._id.toString() !== excepcionId
        );
        await doctor.save();
      }

      // Crear log de la operación
      await TenantDoctorController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: req.user.email,
        userRole: req.user.role,
        action: 'DATE_EXCEPTION_REMOVED',
        entityType: 'DOCTOR',
        entityId: doctor._id.toString(),
        entityName: `${doctor.name} ${doctor.lastName}`,
        details: `Excepción de fecha eliminada`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Excepción de fecha eliminada correctamente'
      });

    } catch (error) {
      console.error('Error eliminando excepción de fecha:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener doctores por especialidad
  async getDoctorsBySpecialty(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { specialtyId } = req.params;

      if (!specialtyId) {
        return res.status(400).json({ error: 'ID de especialidad requerido' });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, tenant.databaseName);

      const doctors = await Doctor.find({ 
        activo: true,
        especialidad: specialtyId 
      })
        .populate({
          path: 'especialidad',
          select: 'name description',
          model: ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName)
        })
        .select('name lastName email phone biografia experiencia educacion duracionCita')
        .sort({ name: 1, lastName: 1 });

      res.json({
        success: true,
        doctors: doctors
      });

    } catch (error) {
      console.error('Error obteniendo doctores por especialidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Método privado para generar intervalos de tiempo
  public static generateTimeSlots(horaInicio: string, horaFin: string, duracionMinutos: number): Array<{inicio: string, fin: string, disponible: boolean}> {
    const slots: Array<{inicio: string, fin: string, disponible: boolean}> = [];
    const [inicioHora, inicioMinuto] = horaInicio.split(':').map(Number);
    const [finHora, finMinuto] = horaFin.split(':').map(Number);

    let currentHora = inicioHora;
    let currentMinuto = inicioMinuto;

    while (currentHora < finHora || (currentHora === finHora && currentMinuto < finMinuto)) {
      const horaActual = `${currentHora.toString().padStart(2, '0')}:${currentMinuto.toString().padStart(2, '0')}`;
      
      // Calcular la hora de fin del intervalo
      let finHora = currentHora;
      let finMinuto = currentMinuto + duracionMinutos;
      
      // Ajustar si los minutos exceden 60
      if (finMinuto >= 60) {
        finHora += Math.floor(finMinuto / 60);
        finMinuto = finMinuto % 60;
      }
      
      const horaSiguiente = `${finHora.toString().padStart(2, '0')}:${finMinuto.toString().padStart(2, '0')}`;

      slots.push({
        inicio: horaActual,
        fin: horaSiguiente,
        disponible: true
      });

      currentMinuto += duracionMinutos;
      if (currentMinuto >= 60) {
        currentHora++;
        currentMinuto = currentMinuto % 60;
      }
    }
    return slots;
  }
}
