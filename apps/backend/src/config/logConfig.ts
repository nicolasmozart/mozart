import path from 'path';
import fs from 'fs';

// Configuración del directorio de logs
export const logConfig = {
  // Directorio base para logs
  baseDir: path.join(process.cwd(), 'logs'),
  
  // Configuración de rotación
  rotation: {
    maxSize: '50m', // Aumentado para un solo archivo
    maxFiles: '1', // Solo 1 archivo
    zippedArchive: true,
  },
  
  // Niveles de log por entorno
  levels: {
    development: 'debug',
    production: 'info',
    test: 'error',
  },
  
  // Configuración de archivos específicos - UN SOLO ARCHIVO
  files: {
    main: 'mozart.log',      // Logs principales
    errors: 'errors.log',    // Solo errores
    exceptions: 'exceptions.log'  // Excepciones no capturadas
  },
  
  // Configuración de auditoría
  audit: {
    enabled: true,
    retention: '30d',  // Aumentado a 30 días para un solo archivo
    sensitiveFields: ['password', 'token', 'secret', 'key'],
  },
  
  // Configuración de seguridad
  security: {
    maskIPs: false, // Cambiar a true en producción
    maskUserAgents: false, // Cambiar a true en producción
    logSensitiveData: false, // Nunca true en producción
  },
};

// Crear directorio de logs si no existe
export const ensureLogDirectory = () => {
  if (!fs.existsSync(logConfig.baseDir)) {
    fs.mkdirSync(logConfig.baseDir, { recursive: true });
    console.log(`📁 Directorio de logs creado: ${logConfig.baseDir}`);
  }
};

// Función para limpiar logs antiguos (se puede ejecutar como cron job)
export const cleanupOldLogs = () => {
  const logDir = logConfig.baseDir;
  
  if (!fs.existsSync(logDir)) {
    return;
  }
  
  const files = fs.readdirSync(logDir);
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
  
  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Log antiguo eliminado: ${file}`);
    }
  });
};

// Función para obtener estadísticas de logs
export const getLogStats = () => {
  const logDir = logConfig.baseDir;
  
  if (!fs.existsSync(logDir)) {
    return { totalFiles: 0, totalSize: 0, files: [] };
  }
  
  const files = fs.readdirSync(logDir);
  let totalSize = 0;
  const fileStats: Array<{name: string, size: number, modified: Date}> = [];
  
  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    totalSize += stats.size;
    fileStats.push({
      name: file,
      size: stats.size,
      modified: stats.mtime,
    });
  });
  
  return {
    totalFiles: files.length,
    totalSize: totalSize,
    files: fileStats.sort((a, b) => b.modified.getTime() - a.modified.getTime()),
  };
};
