import express from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { verifyToken, requirePrivilege } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public auth endpoints
router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/password-policy', ctrl.getPasswordPolicy);

// Protected user management routes
router.get('/users', verifyToken, ctrl.getUsers);
router.post('/users', verifyToken, requirePrivilege('manage_users'), ctrl.createUser);
router.patch('/users/:id', verifyToken, requirePrivilege('manage_users'), ctrl.updateUser);
router.delete('/users/:id', verifyToken, requirePrivilege('manage_users'), ctrl.deleteUser);
router.get('/attributes-schema', verifyToken, ctrl.getUserAttributesSchema);
router.post('/attributes-schema', verifyToken, requirePrivilege('manage_users'), ctrl.addUserAttributeField);

// Protected roles management routes
router.get('/roles', verifyToken, ctrl.getRoles);
router.post('/roles', verifyToken, requirePrivilege('manage_roles'), ctrl.createRole);
router.patch('/roles/:id', verifyToken, requirePrivilege('manage_roles'), ctrl.updateRole);
router.delete('/roles/:id', verifyToken, requirePrivilege('manage_roles'), ctrl.deleteRole);

export default router;
