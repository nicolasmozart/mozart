import { Router } from 'express';
import { login, logout, getMe, login2FA, verify2FA, resend2FA } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Rutas públicas - login
router.post('/login', login);
router.post('/login-2fa', login2FA);
router.post('/verify-2fa', verify2FA);
router.post('/resend-2fa', resend2FA);

// Rutas protegidas - requieren autenticación
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

export default router;
