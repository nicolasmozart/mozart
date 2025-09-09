import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logAction, logError } from '../config/logger';

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mozart-secret-key-change-in-production';

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        clientId?: string;
        tenantId?: string;
        tenantName?: string;
        features?: any;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar token JWT
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expirado'
          });
        }
        return res.status(403).json({
          success: false,
          message: 'Token inválido'
        });
      }

      // Agregar información del usuario al request
      req.user = decoded;
      
      // Log de autenticación exitosa
      logAction('TOKEN_VERIFIED', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });

      next();
    });

  } catch (error) {
    logError(error as Error, 'Authentication Middleware Error');
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar rol específico
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: permisos insuficientes'
      });
    }

    next();
  };
};

// Middleware para verificar si es superusuario
export const requireSuperUser = requireRole(['superuser']);

// Middleware para verificar si es usuario normal o superusuario
export const requireUser = requireRole(['user', 'superuser']);
