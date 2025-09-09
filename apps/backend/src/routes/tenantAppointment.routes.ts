import { Router } from 'express';
import { TenantAppointmentController } from '../controllers/tenantAppointment.controller';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = Router();

// Aplicar autenticación de tenant a todas las rutas
router.use(authenticateTenantToken);

// Rutas para gestión de citas
router.get('/', TenantAppointmentController.getAppointments);
router.post('/', TenantAppointmentController.createAppointment);
router.get('/patient/:patientId', TenantAppointmentController.getAppointmentsByPatient);
router.get('/doctor/:doctorId', TenantAppointmentController.getAppointmentsByDoctor);
router.get('/date/:date', TenantAppointmentController.getAppointmentsByDate);
router.get('/stats', TenantAppointmentController.getAppointmentStats);
router.get('/check-availability', TenantAppointmentController.checkAvailability);

// Rutas específicas para manipulación de citas individuales
router.put('/:appointmentId', TenantAppointmentController.updateAppointment);
router.put('/:appointmentId/cancel', TenantAppointmentController.cancelAppointment);
router.put('/:appointmentId/complete', TenantAppointmentController.completeAppointment);
router.put('/:appointmentId/no-show', TenantAppointmentController.markNoShow);
router.delete('/:appointmentId', TenantAppointmentController.deleteAppointment);

export default router;
