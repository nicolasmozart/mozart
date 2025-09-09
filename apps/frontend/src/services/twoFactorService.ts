import { api } from './api';

export interface TwoFactorResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  tempToken?: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
}

export const twoFactorService = {
  // Enviar código 2FA después del login inicial
  sendVerificationCode: async (email: string, password: string): Promise<TwoFactorResponse> => {
    try {
      const response = await api.post('/auth/login-2fa', { email, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al enviar código de verificación');
    }
  },

  // Verificar código 2FA
  verifyCode: async (tempToken: string, code: string): Promise<VerifyCodeResponse> => {
    try {
      const response = await api.post('/auth/verify-2fa', { 
        tempToken, 
        code 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código de verificación inválido');
    }
  },

  // Reenviar código 2FA
  resendCode: async (tempToken: string): Promise<TwoFactorResponse> => {
    try {
      const response = await api.post('/auth/resend-2fa', { tempToken });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reenviar código');
    }
  }
};
