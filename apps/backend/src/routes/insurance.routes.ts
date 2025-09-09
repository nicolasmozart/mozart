import express from 'express';
import { TenantInsuranceController } from '../controllers/tenantInsurance.controller';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = express.Router();
const tenantInsuranceController = new TenantInsuranceController();

// Todas las rutas requieren autenticación del tenant
router.use(authenticateTenantToken);

// Rutas para compañías de seguro
router.get('/', tenantInsuranceController.getAllInsurances);
router.post('/', tenantInsuranceController.createInsurance);
router.put('/:id', tenantInsuranceController.updateInsurance);
router.delete('/:id', tenantInsuranceController.deleteInsurance);

export default router;
