import { Request, Response, NextFunction } from 'express';
import { logRequest, logError } from '../config/logger';

// Extender Request para incluir información de timing
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      userId?: string;
      clientId?: string;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Marcar tiempo de inicio
  req.startTime = Date.now();

  // Log de inicio de request
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    headers: {
      host: req.get('host'),
      referer: req.get('referer'),
      'x-forwarded-for': req.get('x-forwarded-for'),
    },
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  };

  // Log de request entrante
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip || 'unknown IP'}`);

  // Interceptar la respuesta para logging
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - (req.startTime || 0);
    
    // Log de request completada
    logRequest(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      req.userId,
      req.clientId
    );

    // Log en consola con colores según status code
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    console.log(`${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);

    // Llamar al método original
    return originalSend.call(this, data);
  };

  // Interceptar errores
  res.on('error', (error) => {
    const duration = Date.now() - (req.startTime || 0);
    
    logError(
      error as Error,
      `Request Error: ${req.method} ${req.originalUrl}`,
      req.userId,
      req.clientId
    );

    console.error(`💥 ERROR in ${req.method} ${req.originalUrl}: ${error.message}`);
  });

  next();
};

// Middleware para logging de errores globales
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const duration = Date.now() - (req.startTime || 0);
  
  logError(
    error,
    `Global Error Handler: ${req.method} ${req.originalUrl}`,
    req.userId,
    req.clientId
  );

  console.error(`💥 GLOBAL ERROR in ${req.method} ${req.originalUrl}: ${error.message}`);
  console.error(error.stack);

  next(error);
};
