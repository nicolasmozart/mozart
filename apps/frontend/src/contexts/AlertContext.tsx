import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: AlertOptions) => Promise<boolean>;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert debe ser usado dentro de un AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showAlert = (options: AlertOptions) => {
    setAlert(options);
    setIsVisible(true);
  };

  const showConfirm = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmOptions: AlertOptions = {
        ...options,
        type: 'confirm',
        onConfirm: () => {
          hideAlert();
          resolve(true);
        },
        onCancel: () => {
          hideAlert();
          resolve(false);
        },
      };
      showAlert(confirmOptions);
    });
  };

  const hideAlert = () => {
    setIsVisible(false);
    setTimeout(() => setAlert(null), 200); // Delay para la animación
  };

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'confirm':
        return <AlertCircle className="h-6 w-6 text-blue-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'confirm':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getButtonStyles = (type: AlertType, isPrimary: boolean = false) => {
    if (type === 'confirm') {
      if (isPrimary) {
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      }
      return 'bg-gray-300 hover:bg-gray-400 text-gray-700';
    }

    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      
      {/* Overlay de fondo */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200"
          onClick={alert?.type === 'confirm' ? undefined : hideAlert}
        />
      )}
      
      {/* Modal de alerta */}
      {alert && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <div className={`relative w-full max-w-md mx-auto bg-white rounded-lg shadow-xl border ${getAlertStyles(alert.type || 'info')}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {getIcon(alert.type || 'info')}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {alert.title || (alert.type === 'confirm' ? 'Confirmar Acción' : 'Alerta')}
                  </h3>
                </div>
              </div>
              {alert.type !== 'confirm' && (
                <button
                  onClick={hideAlert}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Contenido */}
            <div className="p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{alert.message}</p>
            </div>
            
            {/* Botones */}
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              {alert.type === 'confirm' ? (
                <>
                  <button
                    onClick={alert.onCancel}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${getButtonStyles(alert.type, false)}`}
                  >
                    {alert.cancelText || 'Cancelar'}
                  </button>
                  <button
                    onClick={alert.onConfirm}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${getButtonStyles(alert.type, true)}`}
                  >
                    {alert.confirmText || 'Confirmar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={hideAlert}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${getButtonStyles(alert.type || 'info')}`}
                >
                  Aceptar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
