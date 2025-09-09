import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from './TenantContext';

export interface TenantUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantDomain: string; // Agregar el dominio del tenant
  features: any;
  isImpersonation?: boolean;
  impersonatedBy?: string;
  originalRole?: string;
}

interface TenantAuthContextType {
  user: TenantUser | null;
  tenant: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requiresVerification?: boolean; tempToken?: string }>;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  setTenant: (tenant: any) => void;
  validateTenantAccess: () => boolean;
  clearOtherTenantData: () => void;
  updateUser: (userData: TenantUser) => void;
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

export const useTenantAuth = () => {
  const context = useContext(TenantAuthContext);
  if (context === undefined) {
    throw new Error('useTenantAuth must be used within a TenantAuthProvider');
  }
  return context;
};

interface TenantAuthProviderProps {
  children: ReactNode;
}

export const TenantAuthProvider: React.FC<TenantAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<TenantUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant(); // Obtener el tenant del TenantContext

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la aplicación
    const token = localStorage.getItem('tenantToken');
    const impersonationToken = localStorage.getItem('impersonationToken');
    
    if (impersonationToken) {
      // Si hay token de suplantación, usarlo
      localStorage.setItem('tenantToken', impersonationToken);
    }
    
    if (token || impersonationToken) {
      checkAuthStatus();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Validar acceso al tenant cuando cambie la URL
  useEffect(() => {
    if (user && params.tenant) {
      validateTenantAccess();
    }
  }, [params.tenant, user]);

  // Limpiar datos de usuario cuando cambie el tenant
  useEffect(() => {
    if (tenant && user) {
      // Si el tenant cambió, limpiar los datos del usuario anterior
      if (user.tenantDomain !== tenant.domain) {
        console.log('🔄 Tenant cambiado, limpiando datos de usuario anterior:', {
          userTenant: user.tenantDomain,
          currentTenant: tenant.domain
        });
        logout();
      }
    }
  }, [tenant?.domain]);

  const validateTenantAccess = (): boolean => {
    if (!user || !params.tenant) {
      return false;
    }

    // Verificar que el tenant de la URL coincida con el tenant del usuario logueado
    if (user.tenantDomain !== params.tenant) {
      console.warn(`🚨 Acceso denegado: Usuario logueado en ${user.tenantDomain} intentando acceder a ${params.tenant}`);
      
      // Limpiar sesión y redirigir al login del tenant correcto
      logout();
      navigate(`/${params.tenant}/login`);
      
      return false;
    }

    return true;
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('tenantToken');
      const tenantUser = localStorage.getItem('tenantUser');
      const tenantInfo = localStorage.getItem('tenantInfo');
      
      if (!token || !tenantUser) {
        setIsLoading(false);
        return;
      }

      // Usar la información del usuario guardada en localStorage
      const currentUser: TenantUser = JSON.parse(tenantUser);
      
      // Verificar que el usuario pertenezca al tenant actual
      if (tenant && currentUser.tenantDomain !== tenant.domain) {
        console.log('🔄 Usuario de otro tenant detectado, limpiando sesión:', {
          userTenant: currentUser.tenantDomain,
          currentTenant: tenant.domain
        });
        logout();
        setIsLoading(false);
        return;
      }
      
      // Verificar que el token sea válido (opcional: hacer una llamada al backend)
      // Por ahora solo verificamos que exista
      setUser(currentUser);
      
      // Si no hay tenant en el contexto pero hay tenantInfo en localStorage, usarlo
      if (!tenant && tenantInfo) {
        console.log('🔍 Usando tenantInfo del localStorage');
        const storedTenant = JSON.parse(tenantInfo);
        // Aquí podrías actualizar el tenant en el contexto si fuera necesario
      }
    } catch (error) {
      console.error('Error verificando autenticación del tenant:', error);
      localStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      if (!tenant) {
        throw new Error('No se detectó el tenant');
      }

      console.log('🔍 TenantAuthContext: Iniciando login para tenant:', tenant.domain);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/${tenant.domain}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': tenant.domain
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el login');
      }

      const data = await response.json();
      
      if (data.success) {
        if (data.requiresVerification && data.tempToken) {
          // Retornar información para 2FA
          return {
            requiresVerification: true,
            tempToken: data.tempToken
          };
        } else {
          // Login directo (sin 2FA)
          console.log('✅ TenantAuthContext: Login exitoso, guardando datos...');
          
          // Guardar token y información del usuario
          localStorage.setItem('tenantToken', data.token);
          
          // Guardar información del usuario en localStorage incluyendo el dominio del tenant
          const userData = {
            _id: data.user._id,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            email: data.user.email,
            role: data.user.role,
            tenantId: data.user.tenantId,
            tenantName: data.user.tenantName,
            tenantDomain: tenant.domain, // Agregar el dominio del tenant
            features: data.user.features
          };
          
          console.log('👤 TenantAuthContext: Datos del usuario:', userData);
          
          localStorage.setItem('tenantUser', JSON.stringify(userData));
          
          // Guardar también la información del tenant
          localStorage.setItem('tenantInfo', JSON.stringify(data.tenant));
          
          setUser(userData);
          
          console.log('✅ TenantAuthContext: Usuario guardado en estado y localStorage');
        }
      } else {
        throw new Error(data.error || 'Error en el login');
      }
    } catch (error: any) {
      console.error('❌ TenantAuthContext: Error en login:', error);
      throw new Error(error.message || 'Error en el login');
    }
  };

  const logout = () => {
    // Limpiar tokens
    localStorage.removeItem('tenantToken');
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('originalToken');
    localStorage.removeItem('impersonatedDoctor');
    
    // Limpiar estado del usuario
    setUser(null);
    
    // Redirigir al login del tenant actual
    if (params.tenant) {
      navigate(`/${params.tenant}/login`);
    } else {
      navigate('/login');
    }
  };

  // Función para limpiar datos de otros tenants
  const clearOtherTenantData = () => {
    console.log('🧹 Limpiando todo el localStorage...');
    localStorage.clear();
    setUser(null);
  };

  const setTenant = (newTenant: any) => {
    // Esta función ya no es necesaria ya que obtenemos el tenant del TenantContext
    console.warn('setTenant is deprecated, tenant is now obtained from TenantContext');
  };

  const updateUser = (userData: TenantUser) => {
    console.log('🔄 TenantAuthContext: Actualizando usuario:', userData);
    console.log('🔄 TenantAuthContext: Usuario anterior:', user);
    console.log('🔄 TenantAuthContext: ¿Es suplantación?:', userData.isImpersonation);
    setUser(userData);
    localStorage.setItem('tenantUser', JSON.stringify(userData));
    console.log('🔄 TenantAuthContext: Usuario actualizado en estado y localStorage');
  };

  const value: TenantAuthContextType = {
    user,
    tenant,
    isLoading,
    login,
    logout,
    checkAuthStatus,
    setTenant,
    validateTenantAccess,
    clearOtherTenantData,
    updateUser
  };

  return (
    <TenantAuthContext.Provider value={value}>
      {children}
    </TenantAuthContext.Provider>
  );
};
