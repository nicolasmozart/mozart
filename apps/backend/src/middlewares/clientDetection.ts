import { Request, Response, NextFunction } from 'express';
import Client from '../models/Client';
import { logClientDetection, logError } from '../config/logger';

// Extender la interfaz Request para incluir el cliente
declare global {
  namespace Express {
    interface Request {
      client?: any;
      clientDatabaseUrl?: string;
    }
  }
}

export const detectClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener el host de la request
    const host = req.get('host') || req.headers.host;
    
    if (!host) {
      return res.status(400).json({ 
        error: 'Host header no encontrado' 
      });
    }

    // Buscar el cliente por dominio
    const client = await Client.findOne({ 
      fullDomain: host,
      isActive: true 
    });

    if (!client) {
      // Log de cliente no encontrado
      logClientDetection(host, 'unknown', false, {
        reason: 'Cliente no encontrado o inactivo',
        host: host
      });
      
      return res.status(404).json({ 
        error: 'Cliente no encontrado o inactivo',
        host: host
      });
    }

    // Agregar el cliente a la request para uso posterior
    req.client = client;
    req.clientDatabaseUrl = client.databaseUrl;

    // Log para debugging y auditoría
    console.log(`🔍 Cliente detectado: ${client.name} (${client.domain})`);
    console.log(`🗄️ BD del cliente: ${client.databaseName}`);
    
    // Log estructurado para auditoría
    logClientDetection(host, client.name, true, {
      domain: client.domain,
      databaseName: client.databaseName,
      isActive: client.isActive
    });

    next();
  } catch (error) {
    console.error('❌ Error detectando cliente:', error);
    
    // Log de error estructurado
    logError(error as Error, 'Client Detection Middleware', undefined, undefined);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Middleware opcional para rutas que no requieren detección de cliente
export const optionalClientDetection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const host = req.get('host') || req.headers.host;
    
    if (host) {
      const client = await Client.findOne({ 
        fullDomain: host,
        isActive: true 
      });
      
      if (client) {
        req.client = client;
        req.clientDatabaseUrl = client.databaseUrl;
        console.log(`🔍 Cliente detectado opcionalmente: ${client.name}`);
      }
    }
    
    next();
  } catch (error) {
    // No fallar si hay error, solo continuar
    console.warn('⚠️ Advertencia en detección opcional de cliente:', error);
    next();
  }
};
