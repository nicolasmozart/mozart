import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { TenantAuthProvider } from './contexts/TenantAuthContext';
import { AlertProvider } from './contexts/AlertContext';
import TenantProtectedRoute from './components/TenantProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientManagement from './pages/ClientManagement';
import CreateClient from './pages/CreateClient';
import ViewClient from './pages/ViewClient';
import Layout from './components/Layout';
import TenantLogin from './pages/TenantLogin';
import TenantDashboard from './pages/TenantDashboard';
import TenantLayout from './components/TenantLayout';
import TenantPatients from './pages/TenantPatients';
import CreatePatient from './pages/CreatePatient';
import EditPatient from './pages/EditPatient';
import Personalization from './pages/Personalization';
import TenantDoctorDashboard from './pages/tenant/doctor/TenantDoctorDashboard';
import TenantDoctorCitas from './pages/tenant/doctor/TenantDoctorCitas';
import TenantDoctorCalendario from './pages/tenant/doctor/TenantDoctorCalendario';
import TenantDoctorDisponibilidad from './pages/tenant/doctor/TenantDoctorDisponibilidad';
import TenantDoctorPerfil from './pages/tenant/doctor/TenantDoctorPerfil';
import TenantVideoCall from './pages/tenant/videocall/TenantVideoCall';
import DoctorImpersonationPage from './pages/tenant/DoctorImpersonationPage';
import TenantAppointments from './pages/TenantAppointments';
import TwoFactorVerification from './pages/TwoFactorVerification';
import TenantTwoFactorVerification from './pages/tenant/TenantTwoFactorVerification';

console.log('🎭 Componente App cargando...')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

console.log('🔧 QueryClient configurado')

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Componente para rutas solo de superusuario
const SuperUserRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (user?.role !== 'superuser') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Componente para rutas de tenant que extrae el tenant de la URL
const TenantRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Rutas del Superusuario */}
              <Route path="/login" element={<Login />} />
              <Route path="/verify-2fa" element={<TwoFactorVerification />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route
                  path="clients"
                  element={
                    <SuperUserRoute>
                      <ClientManagement />
                    </SuperUserRoute>
                  }
                />
                <Route
                  path="clients/new"
                  element={
                    <SuperUserRoute>
                      <CreateClient />
                    </SuperUserRoute>
                  }
                />
                <Route
                  path="clients/edit/:clientId"
                  element={
                    <SuperUserRoute>
                      <CreateClient />
                    </SuperUserRoute>
                  }
                />
                <Route
                  path="clients/view/:clientId"
                  element={
                    <SuperUserRoute>
                      <ViewClient />
                    </SuperUserRoute>
                  }
                />
              </Route>

              {/* Rutas del Tenant (Cliente) - Ahora con tenant dinámico */}
              <Route
                path="/:tenant"
                element={
                  <TenantRoute>
                    <TenantAuthProvider>
                      <TenantLogin />
                    </TenantAuthProvider>
                  </TenantRoute>
                }
              />
              <Route
                path="/:tenant/login"
                element={
                  <TenantRoute>
                    <TenantAuthProvider>
                      <TenantLogin />
                    </TenantAuthProvider>
                  </TenantRoute>
                }
              />
              <Route
                path="/:tenant/verify-2fa"
                element={
                  <TenantRoute>
                    <TenantAuthProvider>
                      <TenantTwoFactorVerification />
                    </TenantAuthProvider>
                  </TenantRoute>
                }
              />
              
              {/* Rutas del Tenant con Layout (incluye doctores) */}
              <Route
                path="/:tenant"
                element={
                  <TenantRoute>
                    <TenantAuthProvider>
                      <TenantProtectedRoute>
                        <TenantLayout />
                      </TenantProtectedRoute>
                    </TenantAuthProvider>
                  </TenantRoute>
                }
              >
                {/* Rutas para administradores del tenant */}
                <Route path="dashboard" element={<TenantDashboard />} />
                <Route path="patients" element={<TenantPatients />} />
                <Route path="patients/create" element={<CreatePatient />} />
                <Route path="patients/edit/:id" element={<EditPatient />} />
                <Route path="personalization" element={<Personalization />} />
                <Route path="appointments" element={<TenantAppointments />} />
                <Route path="doctor-impersonation" element={<DoctorImpersonationPage />} />
                
                {/* Rutas para doctores del tenant */}
                <Route path="doctor/dashboard" element={<TenantDoctorDashboard />} />
                <Route path="doctor/citas" element={<TenantDoctorCitas />} />
                <Route path="doctor/calendario" element={<TenantDoctorCalendario />} />
                <Route path="doctor/disponibilidad" element={<TenantDoctorDisponibilidad />} />
                <Route path="doctor/perfil" element={<TenantDoctorPerfil />} />
              </Route>
              
              {/* Ruta de videoconsulta (accesible para doctores y pacientes) - Con tenant dinámico */}
              <Route 
                path=":tenant/videocall/:meetingId" 
                element={
                  <TenantRoute>
                    <TenantAuthProvider>
                      <TenantVideoCall />
                    </TenantAuthProvider>
                  </TenantRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
        </AlertProvider>
    </QueryClientProvider>
  );
}

export default App;
