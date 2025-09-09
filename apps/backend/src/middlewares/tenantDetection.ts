import { Request, Response, NextFunction } from 'express';
import Client from '../models/Client';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TenantRequest extends Request {
  tenant?: any;
  tenantDomain?: string;
}

export const detectTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Detectar dominio del request
    const host = req.get('host') || '';
    const referer = req.get('referer') || '';
    const path = req.path || '';
    
    console.log(`🔍 Detectando tenant - Host: ${host}, Referer: ${referer}, Path: ${path}`);
    
    let tenantDomain = '';
    
    // Opción 1: Header personalizado (prioridad más alta)
    if (req.headers['x-tenant']) {
      tenantDomain = req.headers['x-tenant'] as string;
      console.log(`🔍 Tenant detectado desde header X-Tenant: ${tenantDomain}`);
    }
    
    // Opción 2: Subdominio local (con o sin puerto)
    if (!tenantDomain && host.includes('localhost')) {
      const hostWithoutPort = host.split(':')[0]; // Remover puerto si existe
      const subdomain = hostWithoutPort.split('.')[0];
      console.log(`🔍 Subdominio detectado: ${subdomain} (de host: ${hostWithoutPort})`);
      if (subdomain !== 'localhost') {
        tenantDomain = subdomain;
      }
    }
    
    // Opción 3: Query parameter
    if (!tenantDomain && req.query.tenant) {
      tenantDomain = req.query.tenant as string;
      console.log(`🔍 Tenant detectado desde query parameter: ${tenantDomain}`);
    }
    
    // Opción 4: Primera parte de la ruta (nuevo método)
    if (!tenantDomain && path) {
      const pathSegments = path.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        // Verificar que no sea una ruta del superadmin
        const firstSegment = pathSegments[0];
        const superadminRoutes = ['login', 'dashboard', 'clients', 'api', 'auth', 'admin', 'tenant', 'ping'];
        
        if (!superadminRoutes.includes(firstSegment)) {
          tenantDomain = firstSegment;
          console.log(`🔍 Tenant detectado desde ruta: ${tenantDomain}`);
        }
      }
    }
    
    if (!tenantDomain) {
      return res.status(400).json({ 
        error: 'No se pudo detectar el tenant' 
      });
    }
    
    console.log(`🔍 Buscando cliente con dominio: '${tenantDomain}'`);
    
    // Buscar cliente en BD principal
    const client = await Client.findOne({ 
      domain: tenantDomain,
      isActive: true 
    });
    
    if (!client) {
      console.log(`❌ Cliente no encontrado para dominio: '${tenantDomain}'`);
      return res.status(404).json({ 
        error: `Cliente con dominio '${tenantDomain}' no encontrado` 
      });
    }
    
    // Agregar información del tenant al request
    req.tenant = client;
    req.tenantDomain = tenantDomain;
    
    console.log(`✅ Tenant detectado: ${client.name} (${tenantDomain})`);
    
    next();
    
  } catch (error) {
    console.error('Error detectando tenant:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};
