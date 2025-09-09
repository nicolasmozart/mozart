import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  BarChart3,
  Calendar,
  Heart,
  Zap
} from 'lucide-react';
import { useState } from 'react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSidebarToggle = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, description: 'Vista general del sistema' },
    ...(user?.role === 'superuser' ? [
      { name: 'Gestión de Clientes', href: '/clients', icon: Building2, description: 'Administrar instituciones médicas' }
    ] : []),
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sidebar para móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-80 flex-col bg-white shadow-2xl">
          <div className="flex h-20 items-center justify-between px-6 border-b border-neutral-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-neutral-900">MozartAi CuidadorDigital</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-neutral-500">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar para desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-80'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-neutral-100 shadow-lg">
          {/* Header del sidebar */}
          <div className="flex items-center h-20 px-6 border-b border-neutral-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h1 className={`text-xl font-bold text-neutral-900 transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0' : 'opacity-100'
              }`}>
                MozartAi CuidadorDigital
              </h1>
            </div>
            <button
              onClick={handleSidebarToggle}
              className={`ml-auto p-2 rounded-lg hover:bg-neutral-100 transition-all duration-300 ${
                sidebarCollapsed ? 'ml-0' : 'ml-auto'
              }`}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 text-neutral-600" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-neutral-600" />
              )}
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  } ${
                    sidebarCollapsed ? 'justify-center' : 'justify-start'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <Icon className={`h-5 w-5 transition-all duration-300 ${
                    sidebarCollapsed ? 'mx-auto' : 'mr-3'
                  }`} />
                  <div className={`transition-all duration-300 overflow-hidden ${
                    sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                  }`}>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-neutral-500">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-neutral-100">
            <div className={`transition-all duration-300 ${
              sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            }`}>
              <div className="p-3 bg-gradient-to-r from-primary-50 to-medical-50 rounded-xl border border-primary-100">
                <div className="flex items-center space-x-2 text-xs text-primary-700">
                  <Shield className="h-3 w-3" />
                  <span className="font-medium">Sistema Certificado</span>
                </div>
                <p className="text-xs text-primary-600 mt-1">
                  Estándares de salud digital
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className={`transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-80'
      }`}>
        {/* Header principal */}
        <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm px-6 shadow-sm">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-neutral-700 lg:hidden hover:bg-neutral-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Botón para colapsar/expandir sidebar en desktop */}
          <button
            type="button"
            className="hidden lg:flex -m-2.5 p-2.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            onClick={handleSidebarToggle}
            title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Indicadores del sistema */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-success-50 rounded-lg border border-success-200">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-success-700">Sistema Activo</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200">
                  <Activity className="h-3 w-3 text-primary-600" />
                  <span className="text-xs font-medium text-primary-700">Operativo</span>
                </div>
              </div>

                             {/* Perfil del usuario */}
               <div className="flex items-center gap-x-3">
                 <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-md">
                   <Users className="h-5 w-5 text-black" />
                 </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-neutral-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-neutral-500 capitalize flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.role === 'superuser' ? 'Administrador' : user?.role}
                  </p>
                </div>
              </div>

              {/* Botón de logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-x-2 text-sm text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:block font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido de la página */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
