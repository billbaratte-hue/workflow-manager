import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce authentication on all AI routes
router.use(verifyToken);

router.get('/status', aiController.getAiStatus);
router.post('/analyze-request', aiController.analyzeRequest);
router.post('/assist-description', aiController.assistDescription);
router.post('/recommend-role-field-scope', aiController.recommendRoleFieldScope);
router.post('/audit-role-simulation', aiController.auditRoleSimulation);
router.post('/chat', aiController.chat);
router.post('/suggest-workflow', aiController.suggestWorkflow);

export default router;
