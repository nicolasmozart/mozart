import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Building2, Shield, Heart, Activity, Zap } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      
      if (response.requiresVerification && response.tempToken) {
        // Redirigir a la página de verificación 2FA
        navigate('/verify-2fa', {
          state: {
            tempToken: response.tempToken,
            email: email
          }
        });
      } else {
        // Login directo (sin 2FA)
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error en el inicio de sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Información del sistema */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        {/* Patrón de fondo médico */}
        
        
       
      </div>

      {/* Panel derecho - Formulario de login */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-neutral-50">
        <div className="w-full max-w-md space-y-8">
          {/* Header del formulario */}
          <div className="text-center">
            <div className="lg:hidden mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-hero rounded-2xl mb-4">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                MozartAi Admin
              </h2>
            </div>
            
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-neutral-600">
              Accede a tu panel de administración
            </p>
          </div>

          {/* Formulario */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Campo Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pr-4"
                    placeholder="admin@ejemplo.com"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Campo Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="rounded-xl bg-alert-50 border border-alert-200 p-4 animate-fade-in">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-alert-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-alert-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de submit */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Iniciar sesión
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Información adicional */}
          <div className="text-center space-y-4">
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
              <h3 className="text-sm font-semibold text-primary-800 mb-2">
                🏥 Sistema Certificado
              </h3>
              <p className="text-xs text-primary-700">
                Cumple con los estándares de salud digital colombianos
              </p>
            </div>
            
            <p className="text-xs text-neutral-500">
              © 2025 MozartAi CuidadorDigital. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
