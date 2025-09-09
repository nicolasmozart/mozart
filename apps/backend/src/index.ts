import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/database";
import { config } from "./config/env";
import { requestLogger, errorLogger } from "./middlewares/requestLogger";
import { ensureLogDirectory } from "./config/logConfig";
import patientRoutes from "./routes/patient.routes";
import clientRoutes from "./routes/client.routes";
import logsRoutes from "./routes/logs.routes";
import authRoutes from "./routes/auth.routes";
import tenantAuthRoutes from "./routes/tenantAuth.routes";
import postalCodeRoutes from "./routes/postalCode.routes";
import hospitalRoutes from "./routes/hospital.routes";
import doctorRoutes from "./routes/doctor.routes";
import specialtyRoutes from "./routes/specialty.routes";
import insuranceRoutes from "./routes/insurance.routes";
import tenantAppointmentRoutes from "./routes/tenantAppointment.routes";
import tenantMeetingRoutes from "./routes/tenantMeeting.routes";
import { detectTenant } from "./middlewares/tenantDetection";

const app = express();

// Configuración de CORS más específica
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Puerto por defecto de Vite
    'http://localhost:5175',  // Puerto que estás usando
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5175',
    'http://192.168.18.11:5175', // IP de tu red local
    // Subdominios de localhost para desarrollo multitenant
    /^https?:\/\/[a-zA-Z0-9-]+\.localhost:\d+$/,
    /^https?:\/\/[a-zA-Z0-9-]+\.localhost$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant'],
  optionsSuccessStatus: 200
};

// Configuración de Helmet más permisiva para desarrollo
const helmetOptions = {
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" as const },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
};

// Middlewares globales con límites aumentados para manejar imágenes base64
app.use(express.json({ 
  limit: '50mb' // Aumentar límite para imágenes base64
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' // Aumentar límite para formularios
}));

app.use(cors(corsOptions));
app.use(helmet(helmetOptions));
app.use(morgan("dev"));

// Middleware para manejar preflight requests de CORS
app.options('*', cors(corsOptions));

// Middleware para debuggear CORS
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  
  // Headers adicionales para CORS
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant');
  
  next();
});

// Middleware de logging personalizado (después de morgan)
app.use(requestLogger);

// Ruta de prueba
app.get("/ping", (req, res) => {
  res.json({ message: "pong 🏓" });
});

// Rutas de la API - IMPORTANTE: Las rutas específicas deben ir ANTES que las dinámicas
app.use("/auth", authRoutes); // Rutas de autenticación del superusuario
app.use("/admin", clientRoutes); // Rutas de administración de clientes
app.use("/tenant", tenantAuthRoutes); // Rutas de autenticación del tenant (legacy)
app.use("/api/patients", patientRoutes);
app.use("/api/postalCode", postalCodeRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/specialties", specialtyRoutes);
app.use("/api/insurances", insuranceRoutes);
app.use("/api/appointments", tenantAppointmentRoutes);
app.use("/api/meetings", tenantMeetingRoutes);

// Rutas específicas del superusuario que podrían confundirse con tenants
// Estas rutas ya están cubiertas por /auth, /admin, etc.

// Nueva ruta dinámica para tenants (/:tenant/*) - DEBE ir al final
app.use("/:tenant", detectTenant, (req, res, next) => {
  // Remover el segmento del tenant de la URL para que las rutas internas funcionen
  const originalUrl = req.url;
  const pathWithoutTenant = originalUrl.replace(`/${req.params.tenant}`, '');
  
  // Si la ruta es /login, redirigir a la ruta de tenant login
  if (pathWithoutTenant === '/login' || pathWithoutTenant === '') {
    req.url = '/login';
    return next();
  }
  
  // Para otras rutas, mantener la estructura pero sin el tenant
  req.url = pathWithoutTenant;
  next();
}, tenantAuthRoutes);

// Middleware de manejo de errores (debe ir después de las rutas)
app.use(errorLogger);

// Puerto desde configuración centralizada
const PORT = config.port;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Asegurar que existe el directorio de logs
    ensureLogDirectory();
    
    // Conectar a la base de datos
    await connectDB();
    
    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`🚀 API corriendo en http://localhost:${PORT}`);
      console.log(`📁 Logs disponibles en: ./logs/`);
      console.log(`📏 Límite de payload: 50MB`);
      console.log(`🏢 Sistema de tenants habilitado: /:tenant/*`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();
