import express from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', notificationsController.getNotifications);
router.get('/alerts', notificationsController.getOperationalAlerts);
router.patch('/:id/read', notificationsController.markAsRead);
router.post('/mark-all-read', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.deleteNotification);

export default router;
