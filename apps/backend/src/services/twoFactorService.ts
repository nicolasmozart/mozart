import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { logAction, logError } from '../config/logger';

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Almacenamiento temporal de códigos (en producción usar Redis)
const tempCodes = new Map<string, { code: string; email: string; expires: number; attempts: number }>();

// Función para generar código de 4 dígitos
export const generateCode = (): string => {
  return crypto.randomInt(1000, 9999).toString();
};

// Función para limpiar códigos expirados
export const cleanupExpiredCodes = () => {
  const now = Date.now();
  for (const [key, value] of tempCodes.entries()) {
    if (value.expires < now) {
      tempCodes.delete(key);
    }
  }
};

// Función para enviar código por email usando Twilio
export const envioCodigoLoginTwilio = async (email: string, codigo: string): Promise<{ message: string }> => {
  const templatePath = path.join(__dirname, '../templates/twilioCodeLoginVerification.html');
  
  return new Promise((resolve, reject) => {
    fs.readFile(templatePath, 'utf8', (err, data) => {
      if (err) {
        console.log("Error al leer el template login", err);
        reject({ message: "Error al enviar correo" });
        return;
      }

      // Reemplazar variables en el template
      const htmlContent = data
        .replace("{{codigo}}", codigo)
        .replace("{{tipoCorreo}}", "inicio de sesión")
        .replace(/{{tipoCodigo}}/g, "inicio de sesión");

      const msg = {
        to: email,
        from: 'info@mozartai.com.co',
        subject: 'Código de autenticación para iniciar sesión',
        html: htmlContent,
      };

      sgMail
        .send(msg)
        .then((response) => {
          console.log("Correo enviado");
          resolve({ message: "Correo enviado" });
        })
        .catch((error) => {
          console.log(error);
          reject({ message: "Error al enviar correo" });
        });
    });
  });
};

// Función para enviar código por WhatsApp
export const envioCodigoWhatsApp = async (telefono: string, codigo: string): Promise<{ message: string }> => {
  try {
    // Formatear número de teléfono (asumiendo formato colombiano)
    const formattedPhone = telefono.startsWith('+57') ? telefono : `+57${telefono}`;
    
    const response = await axios.post('https://whatsapp.mozartai.com.co/whatsapp/auth/codigo-login', {
      celular: formattedPhone,
      codigo: codigo
    });
    
    return { message: "Código enviado por WhatsApp" };
  } catch (error) {
    console.error("Error enviando WhatsApp:", error);
    throw { message: "Error al enviar WhatsApp" };
  }
};

// Función principal para enviar código 2FA
export const enviarCodigo2FA = async (email: string, telefono: string, codigo: string): Promise<{ success: boolean; message: string }> => {
  const results = [];
  let hasError = false;
  
  try {
    // Intentar enviar por WhatsApp
    try {
      await envioCodigoWhatsApp(telefono, codigo);
      results.push("WhatsApp: ✓");
    } catch (error) {
      console.error("Error enviando WhatsApp:", error);
      results.push("WhatsApp: ✗");
      hasError = true;
    }
    
    // Intentar enviar por email
    try {
      await envioCodigoLoginTwilio(email, codigo);
      results.push("Email: ✓");
    } catch (error) {
      console.error("Error enviando email:", error);
      results.push("Email: ✗");
      hasError = true;
    }
    
    // Si al menos uno funcionó, considerarlo exitoso
    if (results.some(r => r.includes("✓"))) {
      return { 
        success: true, 
        message: `Código enviado: ${results.join(", ")}` 
      };
    } else {
      throw new Error("No se pudo enviar el código por ningún canal");
    }
    
  } catch (error) {
    console.error("Error enviando código 2FA:", error);
    throw error;
  }
};

// Función para almacenar código temporal
export const storeTempCode = (tempToken: string, email: string, code: string): void => {
  const expires = Date.now() + (10 * 60 * 1000); // 10 minutos
  tempCodes.set(tempToken, {
    code,
    email,
    expires,
    attempts: 0
  });
  
  // Limpiar códigos expirados
  cleanupExpiredCodes();
};

// Función para verificar código
export const verifyTempCode = (tempToken: string, code: string): { success: boolean; email?: string; message: string } => {
  const tempCodeData = tempCodes.get(tempToken);
  
  if (!tempCodeData) {
    return { success: false, message: "Código no encontrado o expirado" };
  }
  
  if (tempCodeData.expires < Date.now()) {
    tempCodes.delete(tempToken);
    return { success: false, message: "Código expirado" };
  }
  
  if (tempCodeData.attempts >= 3) {
    tempCodes.delete(tempToken);
    return { success: false, message: "Demasiados intentos fallidos" };
  }
  
  if (tempCodeData.code !== code) {
    tempCodeData.attempts++;
    return { success: false, message: "Código incorrecto" };
  }
  
  // Código correcto
  const email = tempCodeData.email;
  tempCodes.delete(tempToken);
  
  return { success: true, email, message: "Código verificado correctamente" };
};

// Función para generar token temporal
export const generateTempToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Función para obtener email del token temporal
export const getEmailFromTempToken = (tempToken: string): string | null => {
  const tempCodeData = tempCodes.get(tempToken);
  return tempCodeData ? tempCodeData.email : null;
};
