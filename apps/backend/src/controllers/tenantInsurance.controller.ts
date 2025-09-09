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

export class TenantInsuranceController {
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

  // Obtener todas las compañías de seguro del tenant autenticado
  async getAllInsurances(req: AuthenticatedRequest, res: Response) {
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
      const Insurance = ClientDatabaseService.getInsuranceModel(clientConnection, tenant.databaseName);

      const insurances = await Insurance.find().sort({ name: 1 });

      res.json({
        success: true,
        insurances
      });
    } catch (error) {
      console.error('Error obteniendo compañías de seguro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear una nueva compañía de seguro
  async createInsurance(req: AuthenticatedRequest, res: Response) {
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
          message: 'El nombre de la compañía de seguro es requerido'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Insurance = ClientDatabaseService.getInsuranceModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe una compañía de seguro con ese nombre
      const existingInsurance = await Insurance.findOne({ name: name.trim() });
      if (existingInsurance) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una compañía de seguro con ese nombre'
        });
      }

      const insurance = new Insurance({
        name: name.trim()
      });

      await insurance.save();

      // Crear log de creación de compañía de seguro
      await TenantInsuranceController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'CREACION_SEGURO',
        entityType: 'INSURANCE',
        entityId: insurance._id,
        entityName: insurance.name,
        details: `Compañía de seguro creada: ${insurance.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'Compañía de seguro creada exitosamente',
        insurance
      });
    } catch (error) {
      console.error('Error creando compañía de seguro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar una compañía de seguro
  async updateInsurance(req: AuthenticatedRequest, res: Response) {
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
          message: 'El nombre de la compañía de seguro es requerido'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Insurance = ClientDatabaseService.getInsuranceModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe otra compañía de seguro con ese nombre
      const existingInsurance = await Insurance.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } 
      });
      
      if (existingInsurance) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra compañía de seguro con ese nombre'
        });
      }

      const insurance = await Insurance.findByIdAndUpdate(
        id,
        { name: name.trim() },
        { new: true, runValidators: true }
      );

      if (!insurance) {
        return res.status(404).json({
          success: false,
          message: 'Compañía de seguro no encontrada'
        });
      }

      // Crear log de actualización de compañía de seguro
      await TenantInsuranceController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ACTUALIZACION_SEGURO',
        entityType: 'INSURANCE',
        entityId: id,
        entityName: insurance.name,
        details: `Compañía de seguro actualizada: ${insurance.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Compañía de seguro actualizada exitosamente',
        insurance
      });
    } catch (error) {
      console.error('Error actualizando compañía de seguro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar una compañía de seguro
  async deleteInsurance(req: AuthenticatedRequest, res: Response) {
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
      const Insurance = ClientDatabaseService.getInsuranceModel(clientConnection, tenant.databaseName);

      const insurance = await Insurance.findByIdAndDelete(id);

      if (!insurance) {
        return res.status(404).json({
          success: false,
          message: 'Compañía de seguro no encontrada'
        });
      }

      // Crear log de eliminación de compañía de seguro
      await TenantInsuranceController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ELIMINACION_SEGURO',
        entityType: 'INSURANCE',
        entityId: id,
        entityName: insurance.name,
        details: `Compañía de seguro eliminada: ${insurance.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Compañía de seguro eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando compañía de seguro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
