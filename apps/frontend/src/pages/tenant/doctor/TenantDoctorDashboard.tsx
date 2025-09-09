import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Heart,
  Stethoscope,
  Award,
  Star,
  CheckCircle,
  AlertCircle,
  Clock3,
  Video,
  Phone,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useTenantAuth } from '../../../contexts/TenantAuthContext';
import { useTenant } from '../../../contexts/TenantContext';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface Appointment {
  _id: string;
  pacienteId: {
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
  };
  fecha: string;
  hora: string;
  tipo: 'virtual' | 'presencial' | 'telefonica';
  estado: 'pendiente' | 'completada' | 'cancelada';
  motivo: string;
  prioridad: 'baja' | 'media' | 'alta';
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'patient' | 'system';
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  color: string;
}

const TenantDoctorDashboard: React.FC = () => {
  const { user } = useTenantAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Datos mockeados mejorados
  const metrics: MetricCard[] = [
    {
      title: 'Citas Hoy',
      value: 8,
      change: 12.5,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Pacientes Atendidos',
      value: 156,
      change: 8.2,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Tiempo Promedio',
      value: '24 min',
      change: -5.3,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Satisfacción',
      value: '4.8',
      change: 2.1,
      icon: Star,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    }
  ];

  const upcomingAppointments: Appointment[] = [
    {
      _id: '1',
      pacienteId: { firstName: 'María', lastName: 'González', age: 34, gender: 'Femenino' },
      fecha: '2025-09-15',
      hora: '09:00',
      tipo: 'virtual',
      estado: 'pendiente',
      motivo: 'Control de diabetes tipo 2',
      prioridad: 'alta'
    },
    {
      _id: '2',
      pacienteId: { firstName: 'Carlos', lastName: 'Rodríguez', age: 28, gender: 'Masculino' },
      fecha: '2025-09-15',
      hora: '10:30',
      tipo: 'presencial',
      estado: 'pendiente',
      motivo: 'Primera consulta - Dolor torácico',
      prioridad: 'alta'
    },
    {
      _id: '3',
      pacienteId: { firstName: 'Ana', lastName: 'López', age: 45, gender: 'Femenino' },
      fecha: '2025-09-15',
      hora: '11:15',
      tipo: 'telefonica',
      estado: 'pendiente',
      motivo: 'Seguimiento de hipertensión',
      prioridad: 'media'
    },
    {
      _id: '4',
      pacienteId: { firstName: 'Luis', lastName: 'Martínez', age: 52, gender: 'Masculino' },
      fecha: '2025-09-15',
      hora: '14:00',
      tipo: 'presencial',
      estado: 'pendiente',
      motivo: 'Revisión post-operatoria',
      prioridad: 'baja'
    }
  ];

  const recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'appointment',
      title: 'Cita completada',
      description: 'María González - Control diabetes',
      time: 'Hace 2 horas',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      id: '2',
      type: 'patient',
      title: 'Nuevo paciente registrado',
      description: 'Carlos Rodríguez - Cardiología',
      time: 'Hace 4 horas',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      id: '3',
      type: 'system',
      title: 'Recordatorio de cita',
      description: 'Ana López - Mañana 11:15',
      time: 'Hace 6 horas',
      icon: Clock3,
      color: 'text-amber-600'
    }
  ];

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baja': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoIcono = (tipo: string) => {
    switch (tipo) {
      case 'virtual': return <Video className="h-4 w-4 text-blue-500" />;
      case 'telefonica': return <Phone className="h-4 w-4 text-green-500" />;
      default: return <MapPin className="h-4 w-4 text-purple-500" />;
    }
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header con saludo personalizado */}
      <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-neutral-900">
              ¡Buenos días, Dr. {user?.firstName}! 👋
            </h1>
            <p className="text-neutral-600 text-lg mb-6">
              Aquí tienes un resumen de tu día en {tenant?.name}
            </p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-neutral-500" />
                <span className="text-neutral-700 font-medium">
                  {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-neutral-500" />
                <span className="text-neutral-700 font-medium">8 citas programadas hoy</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center">
              <Stethoscope className="h-12 w-12 text-neutral-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className={`${metric.bgColor} ${metric.borderColor} border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${metric.bgColor.replace('50', '100')} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className={`flex items-center space-x-1 text-sm ${
                  metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{Math.abs(metric.change)}%</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-1">
                {metric.value}
              </h3>
              <p className="text-neutral-600 font-medium">{metric.title}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos y estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de citas por tipo */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Distribución de Citas</h2>
            <div className="flex space-x-2">
              {['week', 'month', 'quarter'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Trimestre'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-primary-400 to-medical-500 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-16 w-16 text-white" />
              </div>
              <p className="text-neutral-500">Gráfico interactivo de citas</p>
              <p className="text-sm text-neutral-400">Virtual: 45% | Presencial: 35% | Telefónica: 20%</p>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Estadísticas Rápidas</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Citas Completadas</span>
              </div>
              <span className="text-lg font-bold text-green-700">142</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Pacientes Nuevos</span>
              </div>
              <span className="text-lg font-bold text-blue-700">23</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-purple-800">Tiempo Promedio</span>
              </div>
              <span className="text-lg font-bold text-purple-700">24m</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium text-amber-800">Satisfacción</span>
              </div>
              <span className="text-lg font-bold text-amber-700">4.8★</span>
            </div>
          </div>
        </div>
      </div>

      {/* Próximas citas y actividades recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas citas */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Próximas Citas</h2>
            <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              Ver todas →
            </button>
          </div>
          
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getTipoIcono(appointment.tipo)}
                    <div>
                      <h4 className="font-semibold text-neutral-900">
                        {appointment.pacienteId.firstName} {appointment.pacienteId.lastName}
                      </h4>
                      <p className="text-sm text-neutral-600">
                        {appointment.pacienteId.age} años • {appointment.pacienteId.gender}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(appointment.prioridad)}`}>
                    {appointment.prioridad.charAt(0).toUpperCase() + appointment.prioridad.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <Clock className="h-4 w-4" />
                      <span>{appointment.hora}</span>
                    </div>
                    <div className="text-sm text-neutral-600">
                      {appointment.motivo}
                    </div>
                  </div>
                  <button className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors">
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actividades recientes */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Actividad Reciente</h2>
            <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              Ver historial →
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
                  <div className={`p-2 ${activity.color.replace('text-', 'bg-').replace('-600', '-100')} rounded-lg`}>
                    <Icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900">{activity.title}</h4>
                    <p className="text-sm text-neutral-600">{activity.description}</p>
                    <p className="text-xs text-neutral-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-gradient-to-r from-neutral-50 to-primary-50 rounded-xl p-6 border border-neutral-200">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 group">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">Nueva Cita</span>
            </div>
          </button>
          
          <button className="p-4 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 group">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">Ver Pacientes</span>
            </div>
          </button>
          
          <button className="p-4 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 group">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">Horarios</span>
            </div>
          </button>
          
          <button className="p-4 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 group">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-colors">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">Reportes</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantDoctorDashboard;
