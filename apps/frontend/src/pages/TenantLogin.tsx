import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { useAlert } from '../contexts/AlertContext';
import { Eye, EyeOff, LogIn, Building2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

const TenantLogin: React.FC = () => {
  const { tenant, loading, error } = useTenant();
  const { login, clearOtherTenantData } = useTenantAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenant) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se detectó el tenant'
      });
      return;
    }

    console.log('🔍 Iniciando login para tenant:', tenant.domain);

    setIsLoading(true);

    try {
      // Usar el método login del contexto en lugar de fetch directo
      const response = await login(formData.email, formData.password);

      if (response.requiresVerification && response.tempToken) {
        // Redirigir a la página de verificación 2FA
        navigate(`/${tenant.domain}/verify-2fa`, {
          state: {
            tempToken: response.tempToken,
            email: formData.email
          }
        });
      } else {
        // Login directo (sin 2FA)
        console.log('✅ Login exitoso, redirigiendo...');

        showAlert({
          type: 'success',
          title: 'Login Exitoso',
          message: `Bienvenido a ${tenant.name}`
        });

        // Redirigir según el rol del usuario usando la ruta dinámica
        const tenantPath = `/${tenant.domain}`;
        // Obtener el usuario del localStorage para determinar el rol
        const userData = localStorage.getItem('tenantUser');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('👤 Usuario logueado:', user);
          if (user.role === 'doctor') {
            console.log('🏥 Redirigiendo a dashboard de doctor:', `${tenantPath}/doctor/dashboard`);
            navigate(`${tenantPath}/doctor/dashboard`);
          } else {
            console.log('🏢 Redirigiendo a dashboard de admin:', `${tenantPath}/dashboard`);
            navigate(`${tenantPath}/dashboard`);
          }
        } else {
          // Fallback: redirigir al dashboard por defecto
          console.log('🔄 Fallback: redirigiendo a dashboard por defecto:', `${tenantPath}/dashboard`);
          navigate(`${tenantPath}/dashboard`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      showAlert({
        type: 'error',
        title: 'Error de Login',
        message: error.message || 'Error de conexión'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-medical-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-hero rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -inset-4 bg-primary-500/20 rounded-full animate-pulse-slow"></div>
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto"></div>
            <p className="text-primary-700 font-medium">Detectando institución médica...</p>
            <p className="text-sm text-neutral-600">Configurando tu entorno de trabajo</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-alert-50 to-red-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="w-24 h-24 bg-alert-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-12 w-12 text-alert-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-alert-800">Error de Conexión</h1>
            <p className="text-alert-700 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-alert"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warning-50 to-yellow-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="w-24 h-24 bg-warning-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-12 w-12 text-warning-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-warning-800">Institución No Detectada</h1>
            <p className="text-warning-700 leading-relaxed">
              No se pudo identificar la institución médica. Verifica que estés accediendo desde el dominio correcto.
            </p>
          </div>
          <div className="p-4 bg-warning-100 rounded-xl border border-warning-200">
            <p className="text-sm text-warning-800">
              <strong>Dominio esperado:</strong> {window.location.hostname}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-100">
      {/* Panel izquierdo - Información del tenant */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 items-center justify-center px-12">
        <div className="text-center text-white max-w-md">
          {/* Logo */}
          {tenant.logo?.data ? (
            <img
              src={`data:${tenant.logo.contentType};base64,${tenant.logo.data}`}
              alt={`Logo de ${tenant.name}`}
              className="w-28 h-28 rounded-full mx-auto mb-6 shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl font-bold text-white">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Nombre del hospital */}
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">
            {tenant.name}
          </h1>

          {/* Descripción */}
          <p className="text-lg text-white/80 mb-10 leading-relaxed">
            Plataforma de gestión médica integral
          </p>

          {/* Powered by */}
          <div className="inline-flex items-center gap-2 text-sm text-white/70 bg-white/10 px-5 py-2 rounded-full">
            <Zap className="h-4 w-4" />
            <span>Powered by Mozart</span>
          </div>
        </div>
      </div>

      {/* Panel derecho - Login */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="lg:hidden mb-4">
              {tenant.logo?.data ? (
                <img
                  src={`data:${tenant.logo.contentType};base64,${tenant.logo.data}`}
                  alt={`Logo de ${tenant.name}`}
                  className="w-20 h-20 rounded-full mx-auto mb-2 object-contain"
                />
              ) : (
                <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-3xl font-bold text-white">
                    {tenant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-neutral-800">
                {tenant.name}
              </h2>
            </div>

            <h2 className="text-2xl font-bold text-neutral-900 mb-1">
              Bienvenido
            </h2>
            <p className="text-sm text-neutral-600">
              Accede a tu cuenta médica
            </p>
          </div>

          {/* Formulario */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="tu@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Características */}
          <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
            <h3 className="text-sm font-semibold text-primary-800 mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Características Disponibles
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(tenant.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${enabled ? 'bg-success-500' : 'bg-neutral-300'}`}></span>
                  <span className={`capitalize ${enabled ? 'text-success-700' : 'text-neutral-500'}`}>
                    {feature === 'agendamiento' ? 'Agendamiento' :
                      feature === 'cuidadorDigital' ? 'Cuidador Digital' :
                        feature === 'telemedicina' ? 'Telemedicina' :
                          feature === 'reportes' ? 'Reportes' : feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-neutral-400">
              © 2025 {tenant.name}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );


};

export default TenantLogin;
