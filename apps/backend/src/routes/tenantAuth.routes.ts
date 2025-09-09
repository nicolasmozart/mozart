import { Router } from 'express';
import { TenantAuthController } from '../controllers/tenantAuth.controller';
import { detectTenant } from '../middlewares/tenantDetection';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';

const router = Router();
const tenantAuthController = new TenantAuthController();

// Rutas públicas (no requieren autenticación)
router.use(detectTenant);
router.post('/login', tenantAuthController.login);
router.post('/login-2fa', tenantAuthController.login2FA);
router.post('/verify-2fa', tenantAuthController.verify2FA);
router.post('/resend-2fa', tenantAuthController.resend2FA);
router.get('/info', tenantAuthController.getTenantInfo);

// Rutas protegidas (requieren autenticación)
router.use(authenticateTenantToken);

export default router;
