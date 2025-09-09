import { api } from './api';

export interface TenantTwoFactorResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  tempToken?: string;
}

export interface TenantVerifyCodeResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
  tenant?: any;
}

export const tenantTwoFactorService = {
  // Verificar código 2FA para tenant
  verifyCode: async (tenantDomain: string, tempToken: string, code: string): Promise<TenantVerifyCodeResponse> => {
    try {
      const response = await api.post(`/${tenantDomain}/verify-2fa`, { 
        tempToken, 
        code 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código de verificación inválido');
    }
  },

  // Reenviar código 2FA para tenant
  resendCode: async (tenantDomain: string, tempToken: string): Promise<TenantTwoFactorResponse> => {
    try {
      const response = await api.post(`/${tenantDomain}/resend-2fa`, { tempToken });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reenviar código');
    }
  }
};
