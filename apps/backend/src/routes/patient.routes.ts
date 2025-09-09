import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { TenantPatientController } from '../controllers/tenantPatient.controller';
import { detectTenant } from '../middlewares/tenantDetection';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = Router();
const patientController = new PatientController();
const tenantPatientController = new TenantPatientController();

// Rutas para superadmin (detectan tenant)
router.get('/admin', detectTenant, patientController.getAllPatients);
router.get('/admin/stats', detectTenant, patientController.getPatientStats);
router.get('/admin/:id', detectTenant, patientController.getPatient);
router.post('/admin', detectTenant, patientController.createPatient);
router.put('/admin/:id', detectTenant, patientController.updatePatient);
router.delete('/admin/:id', detectTenant, patientController.deletePatient);
router.patch('/admin/:id/restore', detectTenant, patientController.restorePatient);

// Rutas para tenant (usan BD directa y requieren autenticación)
router.get('/', authenticateTenantToken, tenantPatientController.getAllPatients);
router.get('/stats', authenticateTenantToken, tenantPatientController.getPatientStats);
router.get('/:id', authenticateTenantToken, tenantPatientController.getPatient);
router.post('/', authenticateTenantToken, tenantPatientController.createPatient);
router.put('/:id', authenticateTenantToken, tenantPatientController.updatePatient);
router.delete('/:id', authenticateTenantToken, tenantPatientController.deletePatient);
router.patch('/:id/restore', authenticateTenantToken, tenantPatientController.restorePatient);

export default router;
