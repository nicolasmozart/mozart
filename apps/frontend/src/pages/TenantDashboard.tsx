import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Heart, 
  Shield, 
  Clock, 
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Database,
  Globe,
  Zap,
  Bell,
  UserCheck,
  UserX,
  CalendarDays,
  Info
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { useParams } from 'react-router-dom';

const TenantDashboard: React.FC = () => {
  const { tenant, loading, error } = useTenant();
  const { user } = useTenantAuth();
  const params = useParams();

  useEffect(() => {
    console.log('🔍 TenantDashboard - Parámetros de URL:', params);
    console.log('🔍 TenantDashboard - Tenant detectado:', tenant);
    console.log('🔍 TenantDashboard - URL actual:', window.location.pathname);
    console.log('🔍 TenantDashboard - Usuario actual:', user);
    console.log('🔍 TenantDashboard - ¿Es suplantación?:', user?.isImpersonation);
  }, [tenant, params, user]);

  const [tenantInfo, setTenantInfo] = useState<any>(null);

  useEffect(() => {
    const tenant = localStorage.getItem('tenantInfo');
    
    if (tenant) {
      setTenantInfo(JSON.parse(tenant));
    }
  }, []);

  // Datos de ejemplo para el dashboard del tenant
  const stats = {
    totalPatients: 1247,
    activePatients: 1189,
    appointmentsToday: 23,
    pendingAppointments: 8,
    totalDoctors: 45,
    availableDoctors: 38,
    systemUptime: '99.9%',
    lastBackup: '1 hora'
  };

  const recentAppointments = [
    {
      id: 1,
      patientName: 'María González',
      doctorName: 'Dr. Carlos Rodríguez',
      time: '09:00',
      type: 'Consulta General',
      status: 'confirmed'
    },
    {
      id: 2,
      patientName: 'Juan Pérez',
      doctorName: 'Dra. Ana Martínez',
      time: '10:30',
      type: 'Control',
      status: 'pending'
    },
    {
      id: 3,
      patientName: 'Carmen López',
      doctorName: 'Dr. Luis García',
      time: '11:15',
      type: 'Especialista',
      status: 'confirmed'
    },
    {
      id: 4,
      patientName: 'Roberto Silva',
      doctorName: 'Dra. Patricia Ruiz',
      time: '14:00',
      type: 'Urgencia',
      status: 'urgent'
    }
  ];

  const systemMetrics = [
    { name: 'Base de Datos', status: 'healthy', uptime: '99.9%', response: '12ms' },
    { name: 'API Principal', status: 'healthy', uptime: '99.8%', response: '45ms' },
    { name: 'Sistema de Archivos', status: 'healthy', uptime: '99.7%', response: '23ms' },
    { name: 'Servidor Web', status: 'healthy', uptime: '99.9%', response: '18ms' }
  ];

  const quickActions = [
    { name: 'Nuevo Paciente', icon: Users, color: 'bg-primary-500', href: '/tenant/patients/new' },
    { name: 'Agendar Cita', icon: Calendar, color: 'bg-success-500', href: '/tenant/scheduling/new' },
    { name: 'Ver Reportes', icon: BarChart3, color: 'bg-warning-500', href: '/tenant/reports' },
    { name: 'Configuración', icon: Shield, color: 'bg-info-500', href: '/tenant/settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">No se detectó el tenant</h1>
          <p className="text-yellow-500">Verifica que estés accediendo desde la URL correcta</p>
        </div>
      </div>
    );
  }

  if (!tenantInfo || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-hero rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -inset-4 bg-primary-500/20 rounded-full animate-pulse-slow"></div>
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto"></div>
            <p className="text-primary-700 font-medium">Cargando institución...</p>
            <p className="text-sm text-neutral-600">Configurando tu dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header del Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          {tenantInfo.logo && tenantInfo.logo.data ? (
            <img
              src={`data:${tenantInfo.logo.contentType};base64,${tenantInfo.logo.data}`}
              alt={`Logo de ${tenantInfo.name}`}
              className="w-16 h-16 rounded-2xl object-contain border-2 border-neutral-100 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {tenantInfo.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center">
              {tenantInfo.name}
            </h1>
            <p className="text-neutral-600 text-lg">
              Panel de control médico - Bienvenido, {user.firstName}
            </p>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success-50 rounded-lg border border-success-200">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-success-700">Sistema Operativo</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200">
            <Activity className="h-3 w-3 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">Uptime: {stats.systemUptime}</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-2 bg-warning-50 rounded-lg border border-warning-200">
            <Clock className="h-3 w-3 text-warning-600" />
            <span className="text-sm font-medium text-warning-700">Último respaldo: {stats.lastBackup}</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Pacientes</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.totalPatients.toLocaleString()}</p>
              <p className="text-xs text-success-600 flex items-center mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +5% este mes
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Citas Hoy</p>
              <p className="text-3xl font-bold text-success-600">{stats.appointmentsToday}</p>
              <p className="text-xs text-warning-600 mt-1">
                {stats.pendingAppointments} pendientes
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Médicos Activos</p>
              <p className="text-3xl font-bold text-warning-600">{stats.availableDoctors}</p>
              <p className="text-xs text-neutral-500 mt-1">
                de {stats.totalDoctors} total
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Pacientes Activos</p>
              <p className="text-3xl font-bold text-info-600">{stats.activePatients.toLocaleString()}</p>
              <p className="text-xs text-success-600 mt-1">
                {Math.round((stats.activePatients / stats.totalPatients) * 100)}% del total
              </p>
            </div>
            <div className="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
              <Heart className="h-6 w-6 text-info-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas y próximas citas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Acciones rápidas */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Acciones Rápidas</h3>
            <Zap className="h-5 w-5 text-primary-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="p-4 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-all duration-200 hover:shadow-md text-left"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-neutral-900">{action.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Próximas citas */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Próximas Citas</h3>
            <CalendarDays className="h-5 w-5 text-primary-600" />
          </div>
          <div className="space-y-3">
            {recentAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    appointment.status === 'confirmed' ? 'bg-success-500' :
                    appointment.status === 'pending' ? 'bg-warning-500' :
                    'bg-alert-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-neutral-900">{appointment.patientName}</p>
                    <p className="text-sm text-neutral-600">{appointment.doctorName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-neutral-900">{appointment.time}</div>
                  <div className="text-xs text-neutral-500">{appointment.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estado del sistema y métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Estado del sistema */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Estado del Sistema</h3>
            <Shield className="h-5 w-5 text-success-600" />
          </div>
          <div className="space-y-4">
            {systemMetrics.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'healthy' ? 'bg-success-500' : 'bg-warning-500'
                  }`}></div>
                  <span className="font-medium text-neutral-700">{service.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-neutral-900">{service.uptime}</div>
                  <div className="text-xs text-neutral-500">{service.response}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Características activas */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Características Activas</h3>
            <Activity className="h-5 w-5 text-primary-600" />
          </div>
          <div className="space-y-4">
            {Object.entries(tenantInfo.features).map(([feature, enabled]) => (
              <div key={feature} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {enabled ? (
                    <CheckCircle className="h-5 w-5 text-success-600" />
                  ) : (
                    <UserX className="h-5 w-5 text-neutral-400" />
                  )}
                  <span className="font-medium text-neutral-700">
                    {feature === 'agendamiento' ? 'Agendamiento' : 
                     feature === 'cuidadorDigital' ? 'Cuidador Digital' :
                     feature === 'telemedicina' ? 'Telemedicina' :
                     feature === 'reportes' ? 'Reportes' : feature}
                  </span>
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  enabled 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notificaciones y alertas */}
      <div className="card bg-gradient-to-r from-primary-50 to-medical-50 border-primary-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-800 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notificaciones del Sistema
          </h3>
          <span className="text-sm text-primary-600">3 nuevas</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-success-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary-800">Respaldo automático completado</p>
              <p className="text-xs text-primary-600">Hace 1 hora</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-warning-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary-800">Actualización de seguridad disponible</p>
              <p className="text-xs text-primary-600">Hace 3 horas</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
            <Info className="h-4 w-4 text-info-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary-800">Nuevo paciente registrado</p>
              <p className="text-xs text-primary-600">Hace 5 horas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer del dashboard */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-6 text-sm text-neutral-500">
          <span>Versión 2.1.0</span>
          <span>•</span>
          <span>Última actualización: {new Date().toLocaleDateString('es-ES')}</span>
          <span>•</span>
          <span>Soporte técnico disponible</span>
        </div>
        <p className="text-xs text-neutral-400">
          © 2025 {tenantInfo.name}. Plataforma MozartAi CuidadorDigital.
        </p>
      </div>
    </div>
  );
};

export default TenantDashboard;
