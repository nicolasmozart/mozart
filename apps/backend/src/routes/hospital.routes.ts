import express from 'express';
import { TenantHospitalController } from '../controllers/tenantHospital.controller';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = express.Router();
const tenantHospitalController = new TenantHospitalController();

// Todas las rutas requieren autenticación del tenant
router.use(authenticateTenantToken);

// Rutas para hospitales
router.get('/', tenantHospitalController.getAllHospitals);
router.post('/', tenantHospitalController.createHospital);
router.put('/:id', tenantHospitalController.updateHospital);
router.delete('/:id', tenantHospitalController.deleteHospital);

export default router;
