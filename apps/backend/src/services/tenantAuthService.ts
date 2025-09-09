import { ClientDatabaseService } from './clientDatabaseService';
import Client from '../models/Client';

export class TenantAuthService {
  
  static async authenticateUser(
    tenant: any,
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDB(
        tenant.databaseUrl,
        tenant.databaseName
      );
      
      // Obtener modelo User del cliente
      const UserModel = ClientDatabaseService.getUserModel(
        clientConnection,
        tenant.databaseName
      );
      
      // Buscar usuario por email
      const user = await UserModel.findOne({ email });
      if (!user) {
        return { 
          success: false, 
          error: 'Usuario no encontrado' 
        };
      }
      
      // Verificar contraseña (asumiendo que usas bcrypt)
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return { 
          success: false, 
          error: 'Contraseña incorrecta' 
        };
      }
      
      // Verificar que el usuario esté activo
      if (!user.isActive) {
        return { 
          success: false, 
          error: 'Usuario inactivo' 
        };
      }
      
      return { 
        success: true, 
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone, // Incluir el teléfono para 2FA
          role: user.role,
          tenantId: tenant._id,
          tenantName: tenant.name,
          features: tenant.features
        }
      };
      
    } catch (error) {
      console.error('Error en autenticación del tenant:', error);
      return { 
        success: false, 
        error: 'Error interno del servidor' 
      };
    }
  }

  static async authenticateUserByEmail(
    tenant: any,
    email: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Conectar a la BD del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDB(
        tenant.databaseUrl,
        tenant.databaseName
      );
      
      // Obtener modelo User del cliente
      const UserModel = ClientDatabaseService.getUserModel(
        clientConnection,
        tenant.databaseName
      );
      
      // Buscar usuario por email
      const user = await UserModel.findOne({ email });
      if (!user) {
        return { 
          success: false, 
          error: 'Usuario no encontrado' 
        };
      }
      
      // Verificar que el usuario esté activo
      if (!user.isActive) {
        return { 
          success: false, 
          error: 'Usuario inactivo' 
        };
      }
      
      console.log('🔍 authenticateUserByEmail - Tenant recibido:', {
        _id: tenant._id,
        name: tenant.name,
        domain: tenant.domain
      });
      
      const userData = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone, // Incluir el teléfono para 2FA
        role: user.role,
        tenantId: tenant._id,
        tenantName: tenant.name,
        features: tenant.features
      };
      
      console.log('🔍 authenticateUserByEmail - Usuario retornado:', userData);
      
      return { 
        success: true, 
        user: userData
      };
      
    } catch (error) {
      console.error('Error obteniendo usuario del tenant:', error);
      return { 
        success: false, 
        error: 'Error interno del servidor' 
      };
    }
  }
}
