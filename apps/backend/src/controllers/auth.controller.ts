import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { logAction, logError } from '../config/logger';
import { 
  generateCode, 
  generateTempToken, 
  storeTempCode, 
  verifyTempCode, 
  enviarCodigo2FA,
  getEmailFromTempToken
} from '../services/twoFactorService';

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mozart-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Log de login exitoso
    logAction('USER_LOGIN', {
      userId: user._id,
      email: user.email,
      role: user.role,
      clientId: user.clientId
    });

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        clientId: user.clientId
      }
    });

  } catch (error) {
    logError(error as Error, 'Login Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Log de logout
    const user = (req as any).user;
    if (user) {
      logAction('USER_LOGOUT', {
        userId: user.userId,
        email: user.email
      });
    }

    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    logError(error as Error, 'Logout Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Buscar usuario actualizado en la base de datos
    const currentUser = await User.findById(user.userId).select('-password');
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: currentUser
    });

  } catch (error) {
    logError(error as Error, 'Get Me Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función para login con 2FA
export const login2FA = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar código de 4 dígitos
    const code = generateCode();
    const tempToken = generateTempToken();

    // Almacenar código temporal
    storeTempCode(tempToken, user.email, code);

    // Obtener teléfono del usuario (asumiendo que está en el modelo)
    const telefono = (user as any).phone || '3001234567'; // Fallback si no hay teléfono

    // Enviar código por WhatsApp y email
    try {
      await enviarCodigo2FA(user.email, telefono, code);
      
      // Log de inicio de proceso 2FA
      logAction('USER_2FA_INITIATED', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        message: 'Código de verificación enviado',
        requiresVerification: true,
        tempToken
      });

    } catch (error) {
      logError(error as Error, '2FA Send Error');
      res.status(500).json({
        success: false,
        message: 'Error al enviar código de verificación'
      });
    }

  } catch (error) {
    logError(error as Error, 'Login 2FA Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función para verificar código 2FA
export const verify2FA = async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;

    // Validar campos requeridos
    if (!tempToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'Token temporal y código son requeridos'
      });
    }

    // Verificar código
    const verification = verifyTempCode(tempToken, code);
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ email: verification.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Generar token JWT final
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Log de login exitoso con 2FA
    logAction('USER_LOGIN_2FA_SUCCESS', {
      userId: user._id,
      email: user.email,
      role: user.role,
      clientId: user.clientId
    });

    res.json({
      success: true,
      message: 'Verificación exitosa',
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        clientId: user.clientId
      }
    });

  } catch (error) {
    logError(error as Error, 'Verify 2FA Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función para reenviar código 2FA
export const resend2FA = async (req: Request, res: Response) => {
  try {
    const { tempToken } = req.body;

    if (!tempToken) {
      return res.status(400).json({
        success: false,
        message: 'Token temporal es requerido'
      });
    }

    // Obtener email del token temporal
    const email = getEmailFromTempToken(tempToken);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Token temporal inválido o expirado'
      });
    }

    // Generar nuevo código y token
    const code = generateCode();
    const newTempToken = generateTempToken();

    // Almacenar nuevo código
    storeTempCode(newTempToken, email, code);

    // Obtener teléfono del usuario
    const user = await User.findOne({ email });
    const telefono = (user as any)?.phone || '3001234567';

    // Enviar nuevo código
    try {
      await enviarCodigo2FA(email, telefono, code);
      
      res.json({
        success: true,
        message: 'Código reenviado exitosamente',
        tempToken: newTempToken
      });

    } catch (error) {
      logError(error as Error, 'Resend 2FA Error');
      res.status(500).json({
        success: false,
        message: 'Error al reenviar código'
      });
    }

  } catch (error) {
    logError(error as Error, 'Resend 2FA Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
