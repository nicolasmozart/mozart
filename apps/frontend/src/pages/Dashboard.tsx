import React from 'react';
import { 
  Building2, 
  Users, 
  Activity, 
  TrendingUp, 
  Calendar, 
  Shield, 
  Heart, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const Dashboard: React.FC = () => {
  // Datos de ejemplo para el dashboard
  const stats = {
    totalClients: 24,
    activeClients: 22,
    totalUsers: 1247,
    activeFeatures: 89,
    systemUptime: '99.9%',
    lastBackup: '2 horas',
    pendingUpdates: 3,
    criticalAlerts: 0
  };

  const recentActivity = [
    {
      id: 1,
      type: 'client_created',
      message: 'Nueva institución médica registrada: Clínica San Martín',
      time: 'Hace 2 horas',
      icon: Building2,
      color: 'text-success-600',
      bgColor: 'bg-success-50'
    },
    {
      id: 2,
      type: 'feature_activated',
      message: 'Telemedicina activada en Hospital Santa María',
      time: 'Hace 4 horas',
      icon: Activity,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50'
    },
    {
      id: 3,
      type: 'system_update',
      message: 'Actualización del sistema completada exitosamente',
      time: 'Hace 6 horas',
      icon: Shield,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50'
    },
    {
      id: 4,
      type: 'backup_completed',
      message: 'Respaldo automático de bases de datos completado',
      time: 'Hace 8 horas',
      icon: Database,
      color: 'text-info-600',
      bgColor: 'bg-info-50'
    }
  ];

  const featureUsage = [
    { name: 'Agendamiento', usage: 95, color: 'bg-primary-500' },
    { name: 'Telemedicina', usage: 78, color: 'bg-success-500' },
    { name: 'Cuidador Digital', usage: 62, color: 'bg-warning-500' },
    { name: 'Reportes', usage: 89, color: 'bg-info-500' }
  ];

  const systemHealth = [
    { name: 'API Principal', status: 'healthy', uptime: '99.9%', response: '45ms' },
    { name: 'Base de Datos', status: 'healthy', uptime: '99.8%', response: '12ms' },
    { name: 'Servidor Web', status: 'healthy', uptime: '99.9%', response: '23ms' },
    { name: 'Sistema de Archivos', status: 'warning', uptime: '98.5%', response: '156ms' }
  ];

  return (
    <div className="space-y-8">
      {/* Header del Dashboard */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <img src="/logos/logo2mozart.png" alt="MozartAi Logo" className="h-24 sm:h-32 w-auto" />
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 mb-2">
              Panel de Administración MozartAi
            </h1>
            <p className="text-base sm:text-lg text-neutral-600">
              Monitoreo y gestión del sistema de salud multi-tenant
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Instituciones</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.totalClients}</p>
              <p className="text-xs text-success-600 flex items-center mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12% este mes
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Usuarios Activos</p>
              <p className="text-3xl font-bold text-success-600">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-success-600 flex items-center mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +8% esta semana
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Uptime del Sistema</p>
              <p className="text-3xl font-bold text-warning-600">{stats.systemUptime}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Último respaldo: {stats.lastBackup}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card-stats card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Alertas Críticas</p>
              <p className="text-3xl font-bold text-alert-600">{stats.criticalAlerts}</p>
              <p className="text-xs text-success-600 mt-1">
                Sistema estable
              </p>
            </div>
            <div className="w-12 h-12 bg-alert-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-alert-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Uso de características */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Uso de Características</h3>
            <BarChart3 className="h-5 w-5 text-primary-600" />
          </div>
          <div className="space-y-4">
            {featureUsage.map((feature, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">{feature.name}</span>
                  <span className="text-neutral-600">{feature.usage}%</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${feature.color}`}
                    style={{ width: `${feature.usage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado del sistema */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Estado del Sistema</h3>
            <Activity className="h-5 w-5 text-success-600" />
          </div>
          <div className="space-y-4">
            {systemHealth.map((service, index) => (
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
      </div>

      {/* Actividad reciente y métricas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actividad reciente */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">Actividad Reciente</h3>
            <Clock className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
                  <div className={`w-8 h-8 ${activity.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900">{activity.message}</p>
                    <p className="text-xs text-neutral-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="space-y-6">
          {/* Estado de la red */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-neutral-900">Estado de la Red</h4>
              <Globe className="h-5 w-5 text-primary-600" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Latencia promedio</span>
                <span className="text-sm font-medium text-neutral-900">23ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Ancho de banda</span>
                <span className="text-sm font-medium text-neutral-900">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Paquetes perdidos</span>
                <span className="text-sm font-medium text-success-600">0.01%</span>
              </div>
            </div>
          </div>

          {/* Próximas actualizaciones */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-neutral-900">Próximas Actualizaciones</h4>
              <Zap className="h-5 w-5 text-warning-600" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Sistema principal</span>
                <span className="text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded-full">En 2 días</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Base de datos</span>
                <span className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full">Completada</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">API de seguridad</span>
                <span className="text-xs bg-info-100 text-info-800 px-2 py-1 rounded-full">En 1 semana</span>
              </div>
            </div>
          </div>

          {/* Certificaciones */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-neutral-900">Certificaciones</h4>
              <Shield className="h-5 w-5 text-success-600" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <span className="text-sm text-neutral-700">ISO 27001</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <span className="text-sm text-neutral-700">HIPAA</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <span className="text-sm text-neutral-700">GDPR</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <span className="text-sm text-neutral-700">Colombia Digital</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer del dashboard */}
      <div className="card bg-gradient-to-r from-primary-50 to-medical-50 border-primary-200">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <img src="/logos/logo2mozart.png" alt="MozartAi Logo" className="h-6 w-6" />
            <span className="text-lg font-semibold text-primary-800">
              Sistema MozartAi CuidadorDigital
            </span>
          </div>
          <p className="text-sm text-primary-700">
            Plataforma integral para la gestión de instituciones médicas en Colombia
          </p>
          <div className="flex items-center justify-center space-x-6 text-xs text-primary-600">
            <span>Versión 2.1.0</span>
            <span>•</span>
            <span>Última actualización: {new Date().toLocaleDateString('es-ES')}</span>
            <span>•</span>
            <span>Soporte 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
