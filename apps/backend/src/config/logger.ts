import winston from 'winston';
import path from 'path';

// Colores para consola
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para consola
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Formato para archivos (JSON estructurado)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Directorio de logs
const logDir = path.join(process.cwd(), 'logs');

// Configuración de archivo simple - UN SOLO ARCHIVO PARA TODOS LOS LOGS
const fileTransport = new winston.transports.File({
  filename: path.join(logDir, 'mozart.log'),
  maxsize: 50 * 1024 * 1024, // 50MB
  maxFiles: 1, // Solo 1 archivo
  tailable: true,
  level: 'info',
});

// Configuración para errores - UN SOLO ARCHIVO
const errorFileTransport = new winston.transports.File({
  filename: path.join(logDir, 'errors.log'),
  maxsize: 20 * 1024 * 1024, // 20MB
  maxFiles: 1, // Solo 1 archivo
  tailable: true,
  level: 'error',
});

// Logger principal simplificado - UN SOLO ARCHIVO
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: fileFormat,
  transports: [
    fileTransport,
    errorFileTransport,
  ],
  // Solo manejar excepciones no capturadas - UN SOLO ARCHIVO
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 1, // Solo 1 archivo
    }),
  ],
});

// Logger para consola en desarrollo
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug',
  }));
}

// Funciones de logging simplificadas
export const logAction = (action: string, details: any, userId?: string, clientId?: string) => {
  const logData = {
    action,
    details,
    userId: userId || 'system',
    clientId: clientId || 'system',
    timestamp: new Date().toISOString(),
  };

  logger.info(`ACTION: ${action}`, logData);
};

export const logError = (error: Error, context: string, userId?: string, clientId?: string) => {
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
    userId: userId || 'system',
    clientId: clientId || 'system',
    timestamp: new Date().toISOString(),
  };

  logger.error(`ERROR in ${context}: ${error.message}`, logData);
};

export const logSecurity = (event: string, details: any, userId?: string, clientId?: string) => {
  const logData = {
    securityEvent: event,
    details,
    userId: userId || 'system',
    clientId: clientId || 'system',
    timestamp: new Date().toISOString(),
  };

  logger.warn(`SECURITY: ${event}`, logData);
};

export const logDatabase = (operation: string, collection: string, details: any, duration?: number) => {
  const logData = {
    operation,
    collection,
    details,
    duration: duration ? `${duration}ms` : 'N/A',
    timestamp: new Date().toISOString(),
  };

  logger.info(`DATABASE: ${operation} on ${collection}`, logData);
};

export const logRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string, clientId?: string) => {
  const logData = {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId: userId || 'anonymous',
    clientId: clientId || 'system',
    timestamp: new Date().toISOString(),
  };

  logger.info(`REQUEST: ${method} ${url} - ${statusCode}`, logData);
};

export const logClientDetection = (host: string, clientName: string, success: boolean, details?: any) => {
  const logData = {
    host,
    clientName,
    success,
    details,
    timestamp: new Date().toISOString(),
  };

  logger.info(`CLIENT_DETECTION: ${success ? 'SUCCESS' : 'FAILED'} for ${host}`, logData);
};

export default logger;
