import { Request, Response } from 'express';
import { TenantAuthService } from '../services/tenantAuthService';
import { TenantRequest } from '../middlewares/tenantDetection';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { 
  generateCode, 
  generateTempToken, 
  storeTempCode, 
  verifyTempCode, 
  enviarCodigo2FA,
  getEmailFromTempToken,
  envioCodigoLoginTwilio
} from '../services/twoFactorService';
import axios from 'axios';

export class TenantAuthController {
  
  async login(req: TenantRequest, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!req.tenant) {
        return res.status(400).json({ 
          error: 'No se detectó el tenant' 
        });
      }
      
      // Autenticar usuario en la BD del cliente
      const authResult = await TenantAuthService.authenticateUser(
        req.tenant,
        email,
        password
      );
      
      if (!authResult.success) {
        return res.status(401).json({ 
          error: authResult.error 
        });
      }

      // Generar código de 4 dígitos
      const code = generateCode();
      const tempToken = generateTempToken();

      // Almacenar código temporal con información del tenant
      const tenantEmail = `${email}@${req.tenant.domain}`;
      storeTempCode(tempToken, tenantEmail, code);

      // Obtener teléfono del usuario (asumiendo que está en el modelo)
      const telefono = authResult.user.phone;
      
      if (!telefono) {
        return res.status(400).json({
          success: false,
          message: 'El usuario no tiene un número de teléfono registrado para 2FA'
        });
      }

      // Enviar código por WhatsApp y email
      try {
        // Formatear teléfono para WhatsApp (agregar +57 si no lo tiene)
        let formattedPhone = telefono;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+57' + formattedPhone.replace(/\D/g, '');
        }

        // Enviar por WhatsApp y email en paralelo
        await Promise.all([
          envioCodigoLoginTwilio(email, code), // Email
          axios.post('https://whatsapp.mozartai.com.co/whatsapp/auth/codigo-login', { 
            celular: formattedPhone, 
            codigo: code 
          }) // WhatsApp
        ]);
        
        res.json({
          success: true,
          message: 'Código de verificación enviado',
          requiresVerification: true,
          tempToken
        });

      } catch (error) {
        console.error('Error enviando código 2FA:', error);
        res.status(500).json({
          success: false,
          message: 'Error al enviar código de verificación'
        });
      }
      
    } catch (error) {
      console.error('Error en login del tenant:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }
  
  async getTenantInfo(req: TenantRequest, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ 
          error: 'No se detectó el tenant' 
        });
      }
      
      res.json({
        success: true,
        tenant: {
          id: req.tenant._id,
          name: req.tenant.name,
          domain: req.tenant.domain,
          logo: req.tenant.logo,
          features: req.tenant.features,
          settings: req.tenant.settings,
          agendamiento: req.tenant.agendamiento
        }
      });
      
    } catch (error) {
      console.error('Error obteniendo info del tenant:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  // Función para login con 2FA
  async login2FA(req: TenantRequest, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!req.tenant) {
        return res.status(400).json({ 
          error: 'No se detectó el tenant' 
        });
      }
      
      // Autenticar usuario en la BD del cliente
      const authResult = await TenantAuthService.authenticateUser(
        req.tenant,
        email,
        password
      );
      
      if (!authResult.success) {
        return res.status(401).json({ 
          error: authResult.error 
        });
      }

      // Generar código de 4 dígitos
      const code = generateCode();
      const tempToken = generateTempToken();

      // Almacenar código temporal con información del tenant
      const tenantEmail = `${email}@${req.tenant.domain}`;
      storeTempCode(tempToken, tenantEmail, code);

      // Obtener teléfono del usuario (asumiendo que está en el modelo)
      const telefono = authResult.user.phone;
      
      if (!telefono) {
        return res.status(400).json({
          success: false,
          message: 'El usuario no tiene un número de teléfono registrado para 2FA'
        });
      }

      // Enviar código por WhatsApp y email
      try {
        await enviarCodigo2FA(tenantEmail, telefono, code);
        
        res.json({
          success: true,
          message: 'Código de verificación enviado',
          requiresVerification: true,
          tempToken
        });

      } catch (error) {
        console.error('Error enviando código 2FA:', error);
        res.status(500).json({
          success: false,
          message: 'Error al enviar código de verificación'
        });
      }

    } catch (error) {
      console.error('Error en login 2FA del tenant:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  // Función para verificar código 2FA
  async verify2FA(req: TenantRequest, res: Response) {
    try {
      const { tempToken, code } = req.body;

      if (!req.tenant) {
        return res.status(400).json({ 
          error: 'No se detectó el tenant' 
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

      // Extraer email del tenant del email almacenado
      const tenantEmail = verification.email;
      const email = tenantEmail?.replace(`@${req.tenant.domain}`, '') || '';

      // Buscar usuario en la BD del cliente
      const authResult = await TenantAuthService.authenticateUserByEmail(
        req.tenant,
        email
      );
      
      if (!authResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Generar JWT final
      const tokenPayload = {
        userId: authResult.user._id,
        email: authResult.user.email,
        role: authResult.user.role,
        tenantId: authResult.user.tenantId,
        tenantName: authResult.user.tenantName,
        tenantDomain: req.tenant.domain,
        features: authResult.user.features
      };
      
      console.log('🔍 verify2FA - Payload del token:', tokenPayload);
      
      const token = jwt.sign(
        tokenPayload,
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Verificación exitosa',
        token,
        user: authResult.user,
        tenant: {
          id: req.tenant._id,
          name: req.tenant.name,
          domain: req.tenant.domain,
          logo: req.tenant.logo,
          features: req.tenant.features,
          agendamiento: req.tenant.agendamiento
        }
      });

    } catch (error) {
      console.error('Error verificando 2FA del tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Función para reenviar código 2FA
  async resend2FA(req: TenantRequest, res: Response) {
    try {
      const { tempToken } = req.body;

      if (!req.tenant) {
        return res.status(400).json({ 
          error: 'No se detectó el tenant' 
        });
      }

      // Obtener email del token temporal
      const tenantEmail = getEmailFromTempToken(tempToken);

      if (!tenantEmail) {
        return res.status(400).json({
          success: false,
          message: 'Token temporal inválido o expirado'
        });
      }

      // Extraer email del tenant
      const email = tenantEmail.replace(`@${req.tenant.domain}`, '');

      // Generar nuevo código y token
      const code = generateCode();
      const newTempToken = generateTempToken();

      // Almacenar nuevo código
      storeTempCode(newTempToken, tenantEmail, code);

      // Buscar usuario para obtener teléfono
      const authResult = await TenantAuthService.authenticateUserByEmail(
        req.tenant,
        email
      );
      
      const telefono = (authResult.user as any)?.phone || '3001234567';

      // Enviar nuevo código
      try {
        // Formatear teléfono para WhatsApp (agregar +57 si no lo tiene)
        let formattedPhone = telefono;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+57' + formattedPhone.replace(/\D/g, '');
        }

        // Enviar por WhatsApp y email en paralelo
        await Promise.all([
          envioCodigoLoginTwilio(email, code), // Email
          axios.post('https://whatsapp.mozartai.com.co/whatsapp/auth/codigo-login', { 
            celular: formattedPhone, 
            codigo: code 
          }) // WhatsApp
        ]);
        
        res.json({
          success: true,
          message: 'Código reenviado exitosamente',
          tempToken: newTempToken
        });

      } catch (error) {
        console.error('Error reenviando código 2FA:', error);
        res.status(500).json({
          success: false,
          message: 'Error al reenviar código'
        });
      }

    } catch (error) {
      console.error('Error reenviando 2FA del tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
