import express from 'express';
import { LogService } from '../services/logService';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';
import { detectTenant } from '../middlewares/tenantDetection';
import { ClientDatabaseService } from '../services/clientDatabaseService';
import Client from '../models/Client';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateTenantToken);

/**
 * GET /logs/tenant - Obtener logs del tenant actual
 */
router.get('/tenant', async (req: any, res) => {
  try {
    // Usar la información del tenant del JWT en lugar de detectTenant
    const { tenantId } = req.user;
    const { limit = 50, offset = 0, action, entityType } = req.query;

    console.log('🔍 Obteniendo logs del tenant:', tenantId);

    const result = await LogService.getTenantLogs(
      tenantId,
      parseInt(limit as string),
      parseInt(offset as string),
      action as string,
      entityType as string
    );

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error getting tenant logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los logs del tenant'
    });
  }
});

/**
 * GET /logs/recent - Obtener logs recientes para notificaciones
 */
router.get('/recent', async (req:any, res) => {
  try {
    const { hours = 24 } = req.query;
    const { tenantId } = req.user;

    console.log('🔍 Obteniendo logs recientes para tenant:', tenantId);
    console.log('🔍 Usuario actual:', req.user);

    // Obtener información del cliente para conectar a su BD
    const client = await Client.findById(tenantId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    console.log('🔍 Conectando a BD del cliente:', client.databaseName);

    // Conectar a la BD del cliente y obtener el modelo Log
    const clientConnection = await ClientDatabaseService.connectToClientDB(
      client.databaseUrl,
      client.databaseName
    );
    
    const LogModel = ClientDatabaseService.getLogModel(clientConnection, client.databaseName);

    // Buscar logs en la BD del cliente
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - parseInt(hours as string));

    const logs = await LogModel.find({
      timestamp: { $gte: cutoffDate }
    })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

    console.log('🔍 Logs encontrados:', logs.length);
    console.log('🔍 Primeros logs:', logs.slice(0, 3));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error getting recent logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los logs recientes'
    });
  }
});

/**
 * GET /logs/stats - Obtener estadísticas de logs
 */
router.get('/stats', async (req: any, res) => {
  try {
    // Usar la información del tenant del JWT en lugar de detectTenant
    const { tenantId } = req.user;
    const { days = 7 } = req.query;

    console.log('🔍 Obteniendo estadísticas de logs para tenant:', tenantId);

    const stats = await LogService.getLogStats(
      tenantId,
      parseInt(days as string)
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas de logs'
    });
  }
});

/**
 * GET /logs/user/:userId - Obtener logs de un usuario específico
 */
router.get('/user/:userId', async (req: any, res) => {
  try {
    // Usar la información del tenant del JWT en lugar de detectTenant
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    console.log('🔍 Obteniendo logs del usuario:', userId);

    const result = await LogService.getUserLogs(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error getting user logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los logs del usuario'
    });
  }
});

export default router;
