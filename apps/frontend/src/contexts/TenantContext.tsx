import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';

interface TenantFeatures {
  agendamiento: boolean;
  cuidadorDigital: boolean;
  telemedicina: boolean;
  reportes: boolean;
}

interface TenantSettings {
  timezone: string;
  language: string;
  primaryColor: string;
  secondaryColor: string;
}

interface AgendamientoUrls {
  presentacionUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }>;
  verificacionDatosUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }>;
  agendarEntrevistaUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }>;
  tamizajeUrls: Array<{ tipo: 'wpp' | 'llamada'; url: string; _id: string }>;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo: {
    data: string;
    contentType: string;
    filename: string;
  };
  features: TenantFeatures;
  settings: TenantSettings;
  agendamiento: AgendamientoUrls;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  detectTenant: (tenantDomain?: string) => Promise<void>;
  isFeatureActive: (feature: keyof TenantFeatures) => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();

  const detectTenant = async (tenantDomain?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Obtener el tenant desde los parámetros de la URL
      let domain = tenantDomain;
      
      if (!domain) {
        // Extraer tenant de la URL usando useParams
        domain = params.tenant;
        
        // Fallback: extraer de la URL manualmente si useParams no funciona
        if (!domain) {
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          domain = pathSegments[0];
        }
      }

      if (!domain) {
        setError('No se pudo detectar el tenant desde la URL');
        setLoading(false);
        return;
      }

      console.log(`🔍 Detectando tenant desde URL: ${domain}`);

      // Obtener información del tenant desde la API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tenant/info`, {
        headers: {
          'X-Tenant': domain
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTenant(data.tenant);
        console.log('✅ Tenant detectado:', data.tenant.name);
      } else {
        setError(data.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('Error detectando tenant:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const isFeatureActive = (feature: keyof TenantFeatures): boolean => {
    return tenant?.features[feature] || false;
  };

  useEffect(() => {
    detectTenant();
  }, [params.tenant]); // Re-ejecutar cuando cambie el tenant en la URL

  const value: TenantContextType = {
    tenant,
    loading,
    error,
    detectTenant,
    isFeatureActive
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

