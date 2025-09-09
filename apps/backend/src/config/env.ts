import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de variables de entorno
export const config = {
  // Servidor
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Base de datos principal
  mongoURI: process.env.MONGODB_URI,
  
  // Base de datos de clientes (multi-tenant) - URL base
  clientDBBaseUrl: process.env.CLIENT_DB_BASE_URL || 'mongodb+srv://mozartcuidadordigital:ygHPZAFy@cluster0.hvmu9qg.mongodb.net',
  
  // JWT Secret para autenticación
  jwtSecret: process.env.JWT_SECRET || 'tu_jwt_secret_super_seguro_para_desarrollo',
  
  // AWS Configuración para videoconsultas
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_CHIME_S3_BUCKET_ARN: process.env.AWS_CHIME_S3_BUCKET_ARN,
  
  // Validar variables requeridas
  validate: () => {
    const required = ['MONGODB_URI'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
    }
  }
};

// Validar al importar
config.validate();
