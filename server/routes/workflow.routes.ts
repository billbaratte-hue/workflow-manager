import { Router } from 'express';
import {
    getDossiers,
    getDossierById,
    createDossier,
    submitDossier,
    evaluateItem,
    crossValidate,
    nationalDecision,
    acceptGDPR,
    decideKeyChaining,
    linkPurchaseOrder,
    signReceptionPV,
    triggerReminder,
    validateGPSCommissioning,
    reportIncidentAndBlacklist,
    archiveDossier,
    getUserOrderQuota,
    resetUserOrderQuota,
    getAuditLogs
} from '../controllers/workflow.controller.js';
import { verifyToken, requirePrivilege } from '../middleware/auth.middleware.js';

const router = Router();

// Enforce authentication across all workflow routes
router.use(verifyToken);

// Dossiers parent requests
router.get('/dossiers', getDossiers);
router.get('/dossiers/:id', getDossierById);
router.post('/dossiers', createDossier);

// Lifecycle Transitions
router.post('/dossiers/:id/submit', submitDossier);
router.post('/items/:id/evaluate', evaluateItem);
router.post('/dossiers/:id/cross-validate', crossValidate);
router.post('/dossiers/:id/national-decision', nationalDecision);
router.post('/dossiers/:id/accept-gdpr', acceptGDPR);
router.post('/dossiers/:id/decide-key', decideKeyChaining);
router.post('/dossiers/:id/link-po', linkPurchaseOrder);
router.post('/dossiers/:id/sign-pv', signReceptionPV);
router.post('/dossiers/:id/trigger-reminder', triggerReminder);
router.post('/dossiers/:id/validate-gps', validateGPSCommissioning);
router.post('/dossiers/:id/blacklist', requirePrivilege('validate_requests'), reportIncidentAndBlacklist);
router.post('/dossiers/:id/archive', requirePrivilege('validate_requests'), archiveDossier);

// Quotas & Audit
router.get('/quotas/:userId', getUserOrderQuota);
router.post('/quotas/:userId/reset', requirePrivilege('manage_users'), resetUserOrderQuota);
router.get('/audit-logs', requirePrivilege('view_audit'), getAuditLogs);

export default router;
