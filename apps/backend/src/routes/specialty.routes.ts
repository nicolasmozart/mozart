import express from 'express';
import { TenantSpecialtyController } from '../controllers/tenantSpecialty.controller';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = express.Router();
const tenantSpecialtyController = new TenantSpecialtyController();

// Todas las rutas requieren autenticación del tenant
router.use(authenticateTenantToken);

// Rutas para especialidades
router.get('/', tenantSpecialtyController.getAllSpecialties);
router.post('/', tenantSpecialtyController.createSpecialty);
router.put('/:id', tenantSpecialtyController.updateSpecialty);
router.delete('/:id', tenantSpecialtyController.deleteSpecialty);

export default router;
