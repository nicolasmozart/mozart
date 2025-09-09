import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { TenantRequest } from './tenantDetection';

export interface AuthenticatedTenantRequest extends TenantRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId?: string;
    tenantName?: string;
    tenantDomain?: string;
    features?: any;
    isImpersonation?: boolean;
    impersonatedBy?: string;
    originalRole?: string;
  };
}

export const authenticateTenantToken = async (req: AuthenticatedTenantRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No hay token de autorización en el header');
      return res.status(401).json({ 
        error: 'Token de autenticación requerido' 
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer ' del token
    
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    console.log('🔍 Token decodificado:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      tenantDomain: decoded.tenantDomain,
      url: req.url
    });
    
    // Verificar que el token contenga información del tenant
    if (!decoded.tenantDomain) {
      return res.status(401).json({ 
        error: 'Token inválido: falta información del tenant' 
      });
    }

    // Verificar que el tenant del token coincida con el tenant de la URL
    if (req.tenant && decoded.tenantDomain !== req.tenant.domain) {
      console.warn(`🚨 Acceso denegado: Token para tenant ${decoded.tenantDomain} intentando acceder a ${req.tenant.domain}`);
      return res.status(403).json({ 
        error: 'Acceso denegado: No tienes permisos para acceder a este tenant' 
      });
    }

    // Agregar información del usuario al request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      tenantName: decoded.tenantName,
      tenantDomain: decoded.tenantDomain,
      features: decoded.features,
      isImpersonation: decoded.isImpersonation || false,
      impersonatedBy: decoded.impersonatedBy,
      originalRole: decoded.originalRole
    };

    next();
    
  } catch (error) {
    console.error('Error autenticando token del tenant:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Middleware para verificar rol específico del tenant
export const requireTenantRole = (roles: string[]) => {
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

// Middleware para verificar si es administrador del tenant
export const requireTenantAdmin = requireTenantRole(['admin', 'superuser']);

// Middleware para verificar si es usuario del tenant
export const requireTenantUser = requireTenantRole(['user', 'admin', 'superuser']);
