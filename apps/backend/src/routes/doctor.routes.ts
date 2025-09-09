import express from 'express';
import { TenantDoctorController } from '../controllers/tenantDoctor.controller';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = express.Router();
const tenantDoctorController = new TenantDoctorController();

// Todas las rutas requieren autenticación del tenant
router.use(authenticateTenantToken);

// Ruta de prueba
router.get('/test', tenantDoctorController.testEndpoint);

// Rutas para suplantación (solo para admins) - DEBEN IR ANTES DE LAS RUTAS CON PARÁMETROS
router.get('/impersonation/list', tenantDoctorController.getDoctorsForImpersonation);
router.post('/impersonation/end', tenantDoctorController.endImpersonation);
router.post('/impersonation/:doctorId', tenantDoctorController.generateImpersonationToken);

// Rutas para doctores
router.get('/', tenantDoctorController.getAllDoctors);
router.get('/specialty/:specialtyId', tenantDoctorController.getDoctorsBySpecialty);
router.get('/:id', tenantDoctorController.getDoctor);
router.post('/', tenantDoctorController.createDoctor);
router.put('/:id', tenantDoctorController.updateDoctor);
router.delete('/:id', tenantDoctorController.deleteDoctor);

// Rutas para disponibilidad del doctor
router.post('/disponibilidad', tenantDoctorController.saveDoctorAvailability);
router.get('/disponibilidad/:doctorId', tenantDoctorController.getDoctorAvailability);
router.post('/disponibilidad/excepcion', tenantDoctorController.addDateException);
router.delete('/disponibilidad/excepcion', tenantDoctorController.removeDateException);
router.get('/:doctorId/disponibilidad-fecha', tenantDoctorController.getDoctorAvailabilityForDate);

export default router;
