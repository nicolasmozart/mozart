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

export class TenantSpecialtyController {
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

  // Obtener todas las especialidades del tenant autenticado
  async getAllSpecialties(req: AuthenticatedRequest, res: Response) {
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
      const Specialty = ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName);

      const specialties = await Specialty.find().sort({ name: 1 });

      res.json({
        success: true,
        specialties
      });
    } catch (error) {
      console.error('Error obteniendo especialidades:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear una nueva especialidad
  async createSpecialty(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { name } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la especialidad es requerido'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Specialty = ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe una especialidad con ese nombre
      const existingSpecialty = await Specialty.findOne({ name: name.trim() });
      if (existingSpecialty) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una especialidad con ese nombre'
        });
      }

      const specialty = new Specialty({
        name: name.trim()
      });

      await specialty.save();

      // Crear log de creación de especialidad
      await TenantSpecialtyController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'CREACION_ESPECIALIDAD',
        entityType: 'SPECIALTY',
        entityId: specialty._id,
        entityName: specialty.name,
        details: `Especialidad creada: ${specialty.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'Especialidad creada exitosamente',
        specialty
      });
    } catch (error) {
      console.error('Error creando especialidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar una especialidad
  async updateSpecialty(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.user.tenantId) {
        return res.status(400).json({ error: 'Usuario no tiene tenantId' });
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la especialidad es requerido'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Specialty = ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe otra especialidad con ese nombre
      const existingSpecialty = await Specialty.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } 
      });
      
      if (existingSpecialty) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra especialidad con ese nombre'
        });
      }

      const specialty = await Specialty.findByIdAndUpdate(
        id,
        { name: name.trim() },
        { new: true, runValidators: true }
      );

      if (!specialty) {
        return res.status(404).json({
          success: false,
          message: 'Especialidad no encontrada'
        });
      }

      // Crear log de actualización de especialidad
      await TenantSpecialtyController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ACTUALIZACION_ESPECIALIDAD',
        entityType: 'SPECIALTY',
        entityId: id,
        entityName: specialty.name,
        details: `Especialidad actualizada: ${specialty.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Especialidad actualizada exitosamente',
        specialty
      });
    } catch (error) {
      console.error('Error actualizando especialidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar una especialidad
  async deleteSpecialty(req: AuthenticatedRequest, res: Response) {
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
      const Specialty = ClientDatabaseService.getSpecialtyModel(clientConnection, tenant.databaseName);

      const specialty = await Specialty.findByIdAndDelete(id);

      if (!specialty) {
        return res.status(404).json({
          success: false,
          message: 'Especialidad no encontrada'
        });
      }

      // Crear log de eliminación de especialidad
      await TenantSpecialtyController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ELIMINACION_ESPECIALIDAD',
        entityType: 'SPECIALTY',
        entityId: id,
        entityName: specialty.name,
        details: `Especialidad eliminada: ${specialty.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Especialidad eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando especialidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
