import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Smartphone, Mail } from 'lucide-react';
import { tenantTwoFactorService } from '../../services/tenantTwoFactorService';
import type { TenantVerifyCodeResponse } from '../../services/tenantTwoFactorService';
import { useTenantAuth } from '../../contexts/TenantAuthContext';

const TenantTwoFactorVerification: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [currentTempToken, setCurrentTempToken] = useState<string>('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { checkAuthStatus } = useTenantAuth();

  // Obtener datos del estado de navegación
  const { tempToken, email } = location.state || {};

  useEffect(() => {
    if (!tempToken || !email || !params.tenant) {
      navigate(`/${params.tenant}/login`);
      return;
    }
    setUserEmail(email);
    setCurrentTempToken(tempToken);
  }, [tempToken, email, params.tenant, navigate]);

  // Cooldown para reenvío
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Solo permitir un dígito
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus al siguiente input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verificar cuando se complete el código
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 4) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      const newCode = pastedData.split('');
      setCode(newCode);
      setError('');
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (verificationCode: string) => {
    if (!currentTempToken || !params.tenant) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response: TenantVerifyCodeResponse = await tenantTwoFactorService.verifyCode(
        params.tenant, 
        currentTempToken, 
        verificationCode
      );
      
      if (response.success && response.token && response.user) {
        setSuccess(true);
        
        // Guardar token y configurar headers
        localStorage.setItem('tenantToken', response.token);
        
        // Guardar información del usuario en localStorage
        const userData = {
          _id: response.user._id,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          email: response.user.email,
          role: response.user.role,
          tenantId: response.user.tenantId,
          tenantName: response.user.tenantName,
          tenantDomain: params.tenant, // Usar el tenant de la URL
          features: response.user.features
        };
        
        localStorage.setItem('tenantUser', JSON.stringify(userData));
        
        // Guardar también la información del tenant
        localStorage.setItem('tenantInfo', JSON.stringify(response.tenant));
        
        // Actualizar el estado de autenticación
        await checkAuthStatus();
        
        // Redirigir después de un breve delay para mostrar el éxito
        setTimeout(() => {
          navigate(`/${params.tenant}/dashboard`);
        }, 1500);
      } else {
        setError(response.message || 'Código inválido');
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || 'Error al verificar código');
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!currentTempToken || !params.tenant || resendCooldown > 0) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await tenantTwoFactorService.resendCode(params.tenant, currentTempToken);
      
      // Actualizar el token temporal con el nuevo
      if (response.tempToken) {
        setCurrentTempToken(response.tempToken);
      }
      
      setResendCooldown(60); // 60 segundos de cooldown
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Error al reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate(`/${params.tenant}/login`);
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Información del sistema */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-primary-800/20"></div>
        <div className="relative z-10 flex flex-col items-center justify-center text-white p-12">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8">
            <Shield className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Verificación de Seguridad</h1>
          <p className="text-xl text-white/90 text-center leading-relaxed">
            Tu cuenta está protegida con autenticación de dos factores para mayor seguridad
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/80">Código enviado por WhatsApp</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/80">Código enviado por email</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/80">Expira en 10 minutos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario de verificación */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-neutral-50">
        <div className="w-full max-w-md space-y-8">
          {/* Header del formulario */}
          <div className="text-center">
            <div className="lg:hidden mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-hero rounded-2xl mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              Verificación de Seguridad
            </h2>
            <p className="text-neutral-600 mb-4">
              Ingresa el código de 4 dígitos que enviamos a:
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-neutral-700 bg-neutral-100 rounded-lg px-4 py-2">
              <Mail className="h-4 w-4" />
              <span className="font-medium">{userEmail}</span>
            </div>
          </div>

          {/* Formulario de código */}
          <div className="space-y-6">
            <div className="flex justify-center space-x-3" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-16 h-16 text-center text-2xl font-bold border-2 border-neutral-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 bg-white"
                  disabled={isLoading || success}
                />
              ))}
            </div>

            {/* Mensajes de estado */}
            {error && (
              <div className="rounded-xl bg-alert-50 border border-alert-200 p-4 animate-fade-in">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-alert-500 mr-3" />
                  <span className="text-sm font-medium text-alert-800">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-success-50 border border-success-200 p-4 animate-fade-in">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-500 mr-3" />
                  <span className="text-sm font-medium text-success-800">
                    ¡Código verificado correctamente! Redirigiendo...
                  </span>
                </div>
              </div>
            )}

            {/* Botón de reenvío */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
                className="text-sm text-primary-600 hover:text-primary-700 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 
                    ? `Reenviar en ${resendCooldown}s` 
                    : 'Reenviar código'
                  }
                </span>
              </button>
            </div>
          </div>

          {/* Botón de regreso */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center justify-center space-x-2 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al login</span>
            </button>
          </div>

          {/* Información adicional */}
          <div className="text-center space-y-4">
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Smartphone className="h-5 w-5 text-primary-600" />
                <h3 className="text-sm font-semibold text-primary-800">
                  Código enviado por WhatsApp
                </h3>
              </div>
              <p className="text-xs text-primary-700">
                También revisa tu correo electrónico por si no recibiste el mensaje
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

export default TenantTwoFactorVerification;
