import { ILog } from '../models/Log';
import Log from '../models/Log';
import { Request } from 'express';

export interface CreateLogParams {
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details: string;
  request?: Request;
}

export class LogService {
  /**
   * Crea un nuevo log
   */
  static async createLog(params: CreateLogParams): Promise<ILog> {
    const logData: any = {
      tenantId: params.tenantId,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      entityType: params.entityType,
      details: params.details
    };

    if (params.entityId) {
      logData.entityId = params.entityId;
    }

    if (params.entityName) {
      logData.entityName = params.entityName;
    }

    // Extraer información de la request si está disponible
    if (params.request) {
      logData.ipAddress = params.request.ip || 
                         params.request.connection?.remoteAddress ||
                         params.request.headers['x-forwarded-for'];
      logData.userAgent = params.request.headers['user-agent'];
    }

    const log = new Log(logData);
    return await log.save();
  }

  /**
   * Obtiene los logs de un tenant específico
   */
  static async getTenantLogs(
    tenantId: string, 
    limit: number = 50, 
    offset: number = 0,
    action?: string,
    entityType?: string
  ): Promise<{ logs: ILog[], total: number }> {
    const filter: any = { tenantId };

    if (action) {
      filter.action = action;
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .populate('userId', 'firstName lastName')
        .lean(),
      Log.countDocuments(filter)
    ]);

    return { logs, total };
  }

  /**
   * Obtiene los logs de un usuario específico
   */
  static async getUserLogs(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<{ logs: ILog[], total: number }> {
    const [logs, total] = await Promise.all([
      Log.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .populate('tenantId', 'name')
        .lean(),
      Log.countDocuments({ userId })
    ]);

    return { logs, total };
  }

  /**
   * Obtiene logs recientes para notificaciones (últimas 24 horas)
   */
  static async getRecentLogs(tenantId: string, hours: number = 24): Promise<ILog[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    return await Log.find({
      tenantId,
      timestamp: { $gte: cutoffDate }
    })
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('userId', 'firstName lastName')
    .lean();
  }

  /**
   * Obtiene estadísticas de logs por acción
   */
  static async getLogStats(tenantId: string, days: number = 7): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await Log.aggregate([
      {
        $match: {
          tenantId: new (require('mongoose').Types.ObjectId)(tenantId),
          timestamp: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }
}
