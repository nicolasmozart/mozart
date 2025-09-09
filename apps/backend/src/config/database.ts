import mongoose from 'mongoose';
import { config } from './env';
import { logAction, logError, logDatabase } from './logger';

const connectDB = async (): Promise<void> => {
  try {
    const startTime = Date.now();
    await mongoose.connect(config.mongoURI!);
    const duration = Date.now() - startTime;
    
    console.log('✅ Conectado a MongoDB exitosamente');
    
    // Log de conexión exitosa
    logAction('DATABASE_CONNECTED', {
      uri: config.mongoURI!.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Ocultar credenciales
      duration: `${duration}ms`
    });
    
    // Log de operación de BD
    logDatabase('CONNECT', 'mongodb', {
      status: 'success',
      duration: duration
    });
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    
    // Log de error de conexión
    logError(error as Error, 'Database Connection');
    
    process.exit(1);
  }
};

// Eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose conectado a MongoDB');
  
  // Log de evento de conexión
  logAction('MONGOOSE_CONNECTED', {
    connectionId: mongoose.connection.id,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  });
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión de Mongoose:', err);
  
  // Log de error de conexión
  logError(err, 'Mongoose Connection Error');
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose desconectado de MongoDB');
  
  // Log de desconexión
  logAction('MONGOOSE_DISCONNECTED', {
    reason: 'Connection lost or closed'
  });
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada por terminación de la aplicación');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error);
    process.exit(1);
  }
});

export default connectDB;
