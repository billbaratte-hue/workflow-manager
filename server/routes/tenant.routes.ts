import express from 'express';
import * as tenantController from '../controllers/tenant.controller.js';
import { verifyToken, requirePrivilege } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public endpoint to fetch current tenant branding (used by login, navbar, unauthenticated pages)
router.get('/current', tenantController.getCurrentTenant);

// Authenticated tenant management endpoints
router.patch('/current', verifyToken, requirePrivilege('manage_users'), tenantController.updateCurrentTenant);
router.post('/logo', verifyToken, requirePrivilege('manage_users'), tenantController.uploadLogo);

router.get('/', verifyToken, requirePrivilege('manage_users'), tenantController.getAllTenants);
router.post('/', verifyToken, requirePrivilege('manage_users'), tenantController.createTenant);
router.delete('/:tenantId', verifyToken, requirePrivilege('manage_users'), tenantController.deleteTenant);

export default router;
