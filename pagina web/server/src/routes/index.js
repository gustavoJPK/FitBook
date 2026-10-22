import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { asyncHandler as h } from '../utils/AppError.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';
import { ClassController } from '../controllers/classController.js';
import { BookingController, AdminController } from '../controllers/bookingController.js';

const router = Router();
const admin = [authenticate, requireRole('admin')];

// Limita intentos de login/registro para mitigar fuerza bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Autenticación
router.post('/auth/register', authLimiter, h(AuthController.register));
router.post('/auth/login', authLimiter, h(AuthController.login));
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', authenticate, AuthController.me);
router.put('/auth/me', authenticate, h(AuthController.updateMe));

// Clases (entidad principal)
router.get('/classes', optionalAuth, h(ClassController.list));
router.get('/classes/:id', optionalAuth, h(ClassController.get));
router.post('/classes', ...admin, h(ClassController.create));
router.put('/classes/:id', ...admin, h(ClassController.update));
router.delete('/classes/:id', ...admin, h(ClassController.remove));
router.get('/classes/:id/attendees', ...admin, h(ClassController.attendees));

// Reservas (módulo interactivo)
router.get('/bookings/me', authenticate, h(BookingController.mine));
router.post('/bookings', authenticate, h(BookingController.create));
router.patch('/bookings/:id/cancel', authenticate, h(BookingController.cancel));

// Administración
router.get('/admin/stats', ...admin, h(AdminController.stats));
router.get('/admin/users', ...admin, h(AdminController.listUsers));
router.patch('/admin/users/:id/role', ...admin, h(AdminController.changeRole));
router.delete('/admin/users/:id', ...admin, h(AdminController.removeUser));

export default router;
