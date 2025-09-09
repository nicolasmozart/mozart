import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User';

// Cargar variables de entorno
dotenv.config();

const createSuperUser = async () => {
  try {
    // Conectar a la BD principal
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definida');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un superusuario
    const existingSuperUser = await User.findOne({ role: 'superuser' });
    
    if (existingSuperUser) {
      console.log('⚠️ Ya existe un superusuario en el sistema');
      console.log(`Email: ${existingSuperUser.email}`);
      process.exit(0);
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123456', saltRounds);

    // Crear superusuario
    const superUser = new User({
      email: 'admin@mozart.com',
      password: hashedPassword, // Contraseña hasheada
      firstName: 'Super',
      lastName: 'Administrador',
      role: 'superuser',
      isActive: true
    });

    await superUser.save();

    console.log('✅ Superusuario creado exitosamente');
    console.log(`Email: ${superUser.email}`);
    console.log(`Password: admin123456`);
    console.log('⚠️ IMPORTANTE: Cambiar la contraseña en producción');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creando superusuario:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  createSuperUser();
}

export default createSuperUser;
