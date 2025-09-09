import { Router } from 'express';
import { authenticateTenantToken } from '../middlewares/tenantAuth.middleware';
import { detectTenant } from '../middlewares/tenantDetection';
import {
  createMeeting,
  createAttendee,
  getMeeting,
  endMeeting,
  listMeetings,
  debugAWSConfig
} from '../controllers/tenantMeeting.controller';

const router = Router();

// Middleware para detectar tenant y autenticar
router.use(detectTenant);
router.use(authenticateTenantToken);

/**
 * @route POST /api/tenant/meetings
 * @desc Crear una nueva reunión de videoconsulta
 * @access Tenant (Doctor/Admin)
 * @body { externalMeetingId?: string, citaId?: string }
 */
router.post('/', createMeeting);

/**
 * @route POST /api/tenant/meetings/:meetingId/attendees
 * @desc Crear un attendee para una reunión
 * @access Tenant (Doctor/Patient/Admin)
 * @params { meetingId: string }
 * @body { externalUserId?: string, role?: string }
 */
router.post('/:meetingId/attendees', createAttendee);

/**
 * @route GET /api/tenant/meetings/:meetingId
 * @desc Obtener información de una reunión específica
 * @access Tenant (Doctor/Patient/Admin)
 * @params { meetingId: string }
 */
router.get('/:meetingId', getMeeting);

/**
 * @route DELETE /api/tenant/meetings/:meetingId
 * @desc Finalizar una reunión
 * @access Tenant (Doctor/Admin)
 * @params { meetingId: string }
 */
router.delete('/:meetingId', endMeeting);

/**
 * @route GET /api/tenant/meetings
 * @desc Listar todas las reuniones del tenant
 * @access Tenant (Doctor/Admin)
 * @query { page?: number, limit?: number, status?: string, citaId?: string }
 */
router.get('/', listMeetings);

/**
 * @route GET /api/tenant/meetings/debug/aws-config
 * @desc Debug: Verificar configuración de AWS
 * @access Tenant (Doctor/Admin)
 */
router.get('/debug/aws-config', debugAWSConfig);

export default router;
