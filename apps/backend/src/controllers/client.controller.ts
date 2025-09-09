import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client';
import { logAction, logDatabase, logError } from '../config/logger';
import { ClientDatabaseService } from '../services/clientDatabaseService';

// Extender la interfaz Request para incluir userId y clientId
interface AuthenticatedRequest extends Request {
  userId?: string;
  clientId?: string;
}

export class ClientController {
  // Crear nuevo cliente
  static async createClient(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        name,
        domain,
        fullDomain,
        databaseUrl,
        databaseName,
        logo,
        agendamiento,
        features,
        settings,
        // Datos del usuario a crear en la BD del cliente
        userFirstName,
        userLastName,
        userEmail,
        userPhone,
        userPassword,
        userRole = 'admin'
      } = req.body;

      // Validaciones básicas
      if (!name || !domain || !fullDomain) {
        return res.status(400).json({
          error: 'Campos requeridos faltantes',
          required: ['name', 'domain', 'fullDomain']
        });
      }

      // Verificar que el dominio no exista
      const existingClient = await Client.findOne({
        $or: [
          { fullDomain: fullDomain.toLowerCase() },
          { domain: domain.toLowerCase() }
        ]
      });

      if (existingClient) {
        return res.status(409).json({
          error: 'Ya existe un cliente con este dominio',
          existingClient: existingClient.name
        });
      }

      // Crear el cliente con la nueva estructura
      const newClient = new Client({
        name,
        domain: domain.toLowerCase(), // Usar el campo domain directamente
        fullDomain: fullDomain.toLowerCase(),
        databaseUrl,
        databaseName,
        logo: logo || {},
        agendamiento: agendamiento || {
          presentacionUrls: [
            { tipo: 'wpp', url: '' },
            { tipo: 'llamada', url: '' }
          ],
          verificacionDatosUrls: [
            { tipo: 'wpp', url: '' },
            { tipo: 'llamada', url: '' }
          ],
          agendarEntrevistaUrls: [
            { tipo: 'wpp', url: '' },
            { tipo: 'llamada', url: '' }
          ],
          tamizajeUrls: [
            { tipo: 'wpp', url: '' },
            { tipo: 'llamada', url: '' }
          ]
        },
        features: features || {
          agendamiento: false,
          cuidadorDigital: false,
          telemedicina: false,
          reportes: false
        },
        settings: settings || {},
        createdBy: new mongoose.Types.ObjectId() // Temporal hasta implementar autenticación
      });

      const startTime = Date.now();
      await newClient.save();
      const duration = Date.now() - startTime;

      // Log de acción exitosa
      logAction('CLIENT_CREATED', {
        clientId: newClient._id,
        name: newClient.name,
        domain: newClient.domain,
        fullDomain: newClient.fullDomain,
        databaseName: newClient.databaseName
      }, req.userId, req.clientId);

      // Log de operación de BD
      logDatabase('CREATE', 'clients', {
        clientId: newClient._id,
        name: newClient.name
      }, duration);

      // Crear usuario en la BD del cliente si se proporcionaron los datos
      let userCreationResult = null;
      if (userFirstName && userLastName && userEmail && userPassword) {
        try {
          console.log(`🔄 Intentando crear usuario en BD del cliente: ${newClient.databaseName}`);
          
          userCreationResult = await ClientDatabaseService.createUserInClientDB(
            newClient.databaseUrl,
            newClient.databaseName,
            {
              firstName: userFirstName,
              lastName: userLastName,
              email: userEmail,
              phone: userPhone || '', // Agregar teléfono para 2FA
              password: userPassword, // TODO: Hashear la contraseña
              role: userRole as 'admin' | 'user',
              isActive: true
            }
          );

          if (userCreationResult.success) {
            console.log(`✅ Usuario creado exitosamente en BD del cliente: ${userEmail}`);
            logAction('USER_CREATED_IN_CLIENT_DB', {
              clientId: newClient._id,
              clientName: newClient.name,
              userId: userCreationResult.userId,
              userEmail: userEmail
            }, req.userId, req.clientId);
          } else {
            console.warn(`⚠️ No se pudo crear usuario en BD del cliente: ${userCreationResult.error}`);
            logError(new Error(userCreationResult.error || 'Error desconocido'), 'User Creation in Client DB', req.userId, req.clientId);
          }
        } catch (error) {
          console.error(`❌ Error creando usuario en BD del cliente:`, error);
          logError(error as Error, 'User Creation in Client DB', req.userId, req.clientId);
        }
      }

      res.status(201).json({
        message: 'Cliente creado exitosamente',
        client: {
          id: newClient._id,
          name: newClient.name,
          domain: newClient.domain,
          fullDomain: newClient.fullDomain,
          databaseName: newClient.databaseName,
          isActive: newClient.isActive,
          features: newClient.features
        },
        userCreation: userCreationResult ? {
          success: userCreationResult.success,
          message: userCreationResult.success 
            ? 'Usuario creado exitosamente en la base de datos del cliente'
            : userCreationResult.error
        } : null
      });

    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      
      // Log de error estructurado
      logError(error as Error, 'Client Creation', req.userId, req.clientId);
      
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener todos los clientes (solo superusuarios)
  static async getAllClients(req: Request, res: Response) {
    try {
      const clients = await Client.find({})
        .select('-databaseUrl') // No exponer URLs sensibles
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      res.json({
        clients,
        total: clients.length
      });

    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener cliente por ID
  static async getClientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const client = await Client.findById(id)
        .select('-databaseUrl')
        .populate('createdBy', 'firstName lastName email');

      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      res.json({ client });

    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar cliente
  static async updateClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // No permitir cambiar el dominio una vez creado
      delete updateData.domain;
      delete updateData.fullDomain;

      const client = await Client.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-databaseUrl');

      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      res.json({
        message: 'Cliente actualizado exitosamente',
        client
      });

    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar logo del cliente
  static async updateClientLogo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { logo } = req.body;

      if (!logo || !logo.data || !logo.contentType) {
        return res.status(400).json({
          error: 'Logo requerido con data y contentType'
        });
      }

      const client = await Client.findByIdAndUpdate(
        id,
        { logo },
        { new: true, runValidators: true }
      ).select('-databaseUrl');

      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      res.json({
        message: 'Logo del cliente actualizado exitosamente',
        logo: client.logo
      });

    } catch (error) {
      console.error('❌ Error actualizando logo del cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar URLs de agendamiento
  static async updateAgendamientoUrls(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { agendamiento } = req.body;

      if (!agendamiento) {
        return res.status(400).json({
          error: 'Datos de agendamiento requeridos'
        });
      }

      const client = await Client.findByIdAndUpdate(
        id,
        { agendamiento },
        { new: true, runValidators: true }
      ).select('-databaseUrl');

      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      res.json({
        message: 'URLs de agendamiento actualizadas exitosamente',
        agendamiento: client.agendamiento
      });

    } catch (error) {
      console.error('❌ Error actualizando URLs de agendamiento:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar features del cliente
  static async updateClientFeatures(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { features } = req.body;

      if (!features) {
        return res.status(400).json({
          error: 'Features requeridos'
        });
      }

      const client = await Client.findByIdAndUpdate(
        id,
        { features },
        { new: true, runValidators: true }
      ).select('-databaseUrl');

      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      res.json({
        message: 'Features del cliente actualizados exitosamente',
        features: client.features
      });

    } catch (error) {
      console.error('❌ Error actualizando features del cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Activar/Desactivar cliente
  static async toggleClientStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const client = await Client.findById(id);
      
      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      client.isActive = !client.isActive;
      await client.save();

      res.json({
        message: `Cliente ${client.isActive ? 'activado' : 'desactivado'} exitosamente`,
        client: {
          id: client._id,
          name: client.name,
          isActive: client.isActive
        }
      });

    } catch (error) {
      console.error('❌ Error cambiando estado del cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener información del cliente actual (para cualquier usuario)
  static async getCurrentClient(req: Request, res: Response) {
    try {
      if (!req.client) {
        return res.status(404).json({
          error: 'Cliente no detectado'
        });
      }

      // Solo enviar información no sensible
      const clientInfo = {
        id: req.client._id,
        name: req.client.name,
        domain: req.client.domain,
        fullDomain: req.client.fullDomain,
        logo: req.client.logo,
        features: req.client.features,
        agendamiento: req.client.agendamiento,
        settings: req.client.settings
      };

      res.json({ client: clientInfo });

    } catch (error) {
      console.error('❌ Error obteniendo cliente actual:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener clientes por feature específico
  static async getClientsByFeature(req: Request, res: Response) {
    try {
      const { feature } = req.params;
      
      if (!['agendamiento', 'cuidadorDigital', 'telemedicina', 'reportes'].includes(feature)) {
        return res.status(400).json({
          error: 'Feature no válido'
        });
      }

      const clients = await Client.find({
        [`features.${feature}`]: true,
        isActive: true
      })
      .select('name domain fullDomain logo features')
      .sort({ name: 1 });

      res.json({
        clients,
        total: clients.length,
        feature
      });

    } catch (error) {
      console.error('❌ Error obteniendo clientes por feature:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener usuarios de la base de datos del cliente
  static async getClientUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Obtener el cliente para acceder a su base de datos
      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      if (!client.databaseUrl || !client.databaseName) {
        return res.status(400).json({
          error: 'Cliente no tiene base de datos configurada'
        });
      }

      // Conectar a la base de datos del cliente y obtener usuarios
      const connection = await ClientDatabaseService.connectToClientDB(
        client.databaseUrl,
        client.databaseName
      );

      // Obtener el modelo User reutilizable
      const User = ClientDatabaseService.getUserModel(connection, client.databaseName);
      
      // Obtener todos los usuarios
      const users = await User.find({}).select('-password').sort({ createdAt: -1 });

      res.json({
        users: users.map(user => ({
          _id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        })),
        total: users.length
      });

    } catch (error) {
      console.error('❌ Error obteniendo usuarios del cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Crear usuario en la base de datos del cliente
  static async createClientUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, password, role = 'user' } = req.body;

      // Validaciones
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          error: 'Campos requeridos faltantes',
          required: ['firstName', 'lastName', 'email', 'password']
        });
      }

      // Obtener el cliente
      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      if (!client.databaseUrl || !client.databaseName) {
        return res.status(400).json({
          error: 'Cliente no tiene base de datos configurada'
        });
      }

      // Crear usuario en la BD del cliente
      const result = await ClientDatabaseService.createUserInClientDB(
        client.databaseUrl,
        client.databaseName,
        {
          firstName,
          lastName,
          email,
          password, // TODO: Hashear la contraseña
          role: role as 'admin' | 'user',
          isActive: true
        }
      );

      if (result.success) {
        res.status(201).json({
          message: 'Usuario creado exitosamente',
          user: {
            _id: result.userId,
            firstName,
            lastName,
            email,
            role,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          error: result.error || 'Error creando usuario'
        });
      }

    } catch (error) {
      console.error('❌ Error creando usuario del cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar usuario en la base de datos del cliente
  static async updateClientUser(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const updateData = req.body;

      // Obtener el cliente
      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      if (!client.databaseUrl || !client.databaseName) {
        return res.status(400).json({
          error: 'Cliente no tiene base de datos configurada'
        });
      }

      // Conectar a la base de datos del cliente
      const connection = await ClientDatabaseService.connectToClientDB(
        client.databaseUrl,
        client.databaseName
      );

      // Obtener el modelo User reutilizable
      const User = ClientDatabaseService.getUserModel(connection, client.databaseName);
      
      // Preparar datos de actualización
      const updateFields: any = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        email: updateData.email,
        role: updateData.role,
        isActive: updateData.isActive,
        updatedAt: new Date()
      };

      // Solo incluir password si se proporcionó uno nuevo
      if (updateData.password && updateData.password.trim()) {
        updateFields.password = updateData.password; // TODO: Hashear la contraseña
      }

      // Actualizar usuario
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        message: 'Usuario actualizado exitosamente',
        user: {
          _id: updatedUser._id.toString(),
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando usuario del cliente:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
}
