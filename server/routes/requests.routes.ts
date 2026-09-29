import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as requestsController from '../controllers/requests.controller.js';
import { verifyToken, requirePrivilege } from '../middleware/auth.middleware.js';
import { verifyDocumentAccess, streamSecuredDocument } from '../middleware/documentSecurity.middleware.js';

const router = express.Router();

// Configure multer to retain extensions and unique names
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB max
});

// Sites list (authenticated users)
router.get('/sites', verifyToken, requestsController.getSites);

// Exports (authenticated users)
router.get('/export/excel', verifyToken, requestsController.exportExcel);
router.get('/export/pdf', verifyToken, requestsController.exportPDF);
router.get('/export', verifyToken, requestsController.exportCSV);

// User-scoped dossiers
router.get('/me', verifyToken, requestsController.getMyRequests);
router.get('/delegations', verifyToken, requestsController.getDelegations);
router.post('/delegations', verifyToken, requestsController.setDelegation);
router.get('/audit-logs', verifyToken, requirePrivilege('view_audit'), requestsController.getAuditLogs);
router.get('/decision-history', verifyToken, requestsController.getDecisionHistory);
router.get('/documents/:filename', verifyToken, verifyDocumentAccess, streamSecuredDocument);

// Dossier actions
router.post('/batch', verifyToken, requestsController.batchUpdateRequests);
router.post('/', verifyToken, upload.single('document') as any, requestsController.createRequest);
router.get('/', verifyToken, requestsController.getRequests);
router.get('/:reference/pdf', verifyToken, requestsController.exportSingleRequestPDF);
router.post('/:reference/transmit-pdf', verifyToken, requestsController.transmitSingleRequestPDF);
router.get('/:reference', verifyToken, requestsController.getRequestByRef);
router.patch('/:reference', verifyToken, requestsController.updateRequestStatus);
router.post('/:reference/complement', verifyToken, requestsController.respondToComplement);

export default router;
