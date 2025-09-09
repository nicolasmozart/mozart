import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: any;
}

// Función para consolidar todos los logs en un solo archivo
const consolidateLogs = async () => {
  if (!fs.existsSync(logDir)) {
    console.log('📁 No existe directorio de logs');
    return;
  }

  const files = fs.readdirSync(logDir);
  const logFiles = files.filter(file => file.endsWith('.log'));
  
  if (logFiles.length === 0) {
    console.log('📝 No hay archivos de log para consolidar');
    return;
  }

  console.log(`📝 Consolidando ${logFiles.length} archivos de log...`);

  const allLogs: LogEntry[] = [];

  // Leer todos los archivos de log
  for (const file of logFiles) {
    const filePath = path.join(logDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          allLogs.push(logEntry);
        } catch (e) {
          // Si no es JSON válido, crear una entrada básica
          allLogs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Log entry from ${file}: ${line}`,
            source: file
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error leyendo archivo ${file}:`, error);
    }
  }

  // Ordenar logs por timestamp
  allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Crear archivo consolidado
  const consolidatedPath = path.join(logDir, 'mozart-consolidated.log');
  const consolidatedContent = allLogs.map(log => JSON.stringify(log)).join('\n');
  
  fs.writeFileSync(consolidatedPath, consolidatedContent);
  console.log(`✅ Logs consolidados en: ${consolidatedPath}`);

  // Crear archivo de errores consolidado
  const errorLogs = allLogs.filter(log => log.level === 'error');
  if (errorLogs.length > 0) {
    const errorsPath = path.join(logDir, 'errors-consolidated.log');
    const errorsContent = errorLogs.map(log => JSON.stringify(log)).join('\n');
    fs.writeFileSync(errorsPath, errorsContent);
    console.log(`✅ Errores consolidados en: ${errorsPath}`);
  }

  // Crear archivo de excepciones consolidado
  const exceptionLogs = allLogs.filter(log => 
    log.level === 'error' && 
    (log.message?.includes('exception') || log.message?.includes('uncaught'))
  );
  if (exceptionLogs.length > 0) {
    const exceptionsPath = path.join(logDir, 'exceptions-consolidated.log');
    const exceptionsContent = exceptionLogs.map(log => JSON.stringify(log)).join('\n');
    fs.writeFileSync(exceptionsPath, exceptionsContent);
    console.log(`✅ Excepciones consolidadas en: ${exceptionsPath}`);
  }

  // Eliminar archivos antiguos
  console.log('🗑️ Eliminando archivos de log antiguos...');
  for (const file of logFiles) {
    if (!file.includes('consolidated')) {
      const filePath = path.join(logDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Eliminado: ${file}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${file}:`, error);
      }
    }
  }

  console.log('🎉 Consolidación de logs completada');
};

// Función para limpiar logs antiguos
const cleanupOldLogs = () => {
  if (!fs.existsSync(logDir)) {
    return;
  }

  const files = fs.readdirSync(logDir);
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días

  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Log antiguo eliminado: ${file}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${file}:`, error);
      }
    }
  });
};

// Ejecutar consolidación
if (require.main === module) {
  consolidateLogs()
    .then(() => {
      cleanupOldLogs();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en consolidación:', error);
      process.exit(1);
    });
}

export { consolidateLogs, cleanupOldLogs };
