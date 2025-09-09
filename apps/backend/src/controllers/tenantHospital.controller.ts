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

export class TenantHospitalController {
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

  // Obtener todos los hospitales del tenant autenticado
  async getAllHospitals(req: AuthenticatedRequest, res: Response) {
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
      const Hospital = ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName);

      const hospitals = await Hospital.find().sort({ name: 1 });

      res.json({
        success: true,
        hospitals
      });
    } catch (error) {
      console.error('Error obteniendo hospitales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear un nuevo hospital
  async createHospital(req: AuthenticatedRequest, res: Response) {
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
          message: 'El nombre del hospital es requerido'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Hospital = ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe un hospital con ese nombre
      const existingHospital = await Hospital.findOne({ name: name.trim() });
      if (existingHospital) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un hospital con ese nombre'
        });
      }

      const hospital = new Hospital({
        name: name.trim()
      });

      await hospital.save();

      // Crear log de creación de hospital
      await TenantHospitalController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'CREACION_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: hospital._id.toString(),
        entityName: hospital.name,
        details: `Hospital creado: ${hospital.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'Hospital creado exitosamente',
        hospital
      });
    } catch (error) {
      console.error('Error creando hospital:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar un hospital
  async updateHospital(req: AuthenticatedRequest, res: Response) {
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
          message: 'El nombre del hospital es requerido'
        });
      }

      // Obtener información del tenant desde la base de datos principal
      const tenant = await Client.findById(req.user.tenantId);
      
      if (!tenant) {
        return res.status(400).json({ error: 'Tenant no encontrado' });
      }

      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(tenant);
      const Hospital = ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName);

      // Verificar si ya existe otro hospital con ese nombre
      const existingHospital = await Hospital.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } 
      });
      
      if (existingHospital) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro hospital con ese nombre'
        });
      }

      const hospital = await Hospital.findByIdAndUpdate(
        id,
        { name: name.trim() },
        { new: true, runValidators: true }
      );

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital no encontrado'
        });
      }

      // Crear log de actualización de hospital
      await TenantHospitalController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ACTUALIZACION_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: id,
        entityName: hospital.name,
        details: `Hospital actualizado: ${hospital.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Hospital actualizado exitosamente',
        hospital
      });
    } catch (error) {
      console.error('Error actualizando hospital:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar un hospital
  async deleteHospital(req: AuthenticatedRequest, res: Response) {
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
      const Hospital = ClientDatabaseService.getHospitalModel(clientConnection, tenant.databaseName);

      const hospital = await Hospital.findByIdAndDelete(id);

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital no encontrado'
        });
      }

      // Crear log de eliminación de hospital
      await TenantHospitalController.createClientLog(clientConnection, tenant.databaseName, {
        userId: req.user.userId,
        userName: `${req.user.email}`,
        userRole: req.user.role,
        action: 'ELIMINACION_HOSPITAL',
        entityType: 'HOSPITAL',
        entityId: id,
        entityName: hospital.name,
        details: `Hospital eliminado: ${hospital.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Hospital eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando hospital:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
