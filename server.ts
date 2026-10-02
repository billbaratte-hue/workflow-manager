import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import { getDatabase } from './server/db/database.js';
import requestsRoutes from './server/routes/requests.routes.js';
import authRoutes from './server/routes/auth.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import aiRoutes from './server/routes/ai.routes.js';
import notificationsRoutes from './server/routes/notifications.routes.js';
import workflowRoutes from './server/routes/workflow.routes.js';
import blocklyRoutes from './server/routes/blockly.routes.js';
import { workflowRepository } from './server/repositories/workflow.repository.js';
import { configRepository } from './server/repositories/config.repository.js';
import { getFeatures, updateFeature, batchUpdateFeatures } from './server/controllers/features.controller.js';
import { verifyToken, requirePrivilege } from './server/middleware/auth.middleware.js';
import { verifyDocumentAccess, streamSecuredDocument } from './server/middleware/documentSecurity.middleware.js';
import { ExportPdfService } from './server/services/exportPdf.service.js';
import tenantRoutes from './server/routes/tenant.routes.js';
import { resolveTenant } from './server/middleware/tenant.middleware.js';
import { AutomationService } from './server/services/automation.service.js';

async function startServer() {
  // Initialize SQLite database
  try {
    await getDatabase();
    await workflowRepository.initializeTables();
    await configRepository.syncAllFromDb();
    console.log('✓ Base de données SQLite initialisée avec succès (portal.db)');
    
    // Start automated SLA & hardware return surveillance daemon
    AutomationService.startDaemon(5);
  } catch (dbErr) {
    console.error('Erreur initialisation SQLite:', dbErr);
  }

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(resolveTenant);

  // Uploaded documents directory ensured
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  // Enforce authentication & document access control on /uploads to prevent static bypassing
  app.use('/uploads', verifyToken, verifyDocumentAccess, streamSecuredDocument);

  // Secure Document Access (Epic 3 - US 3.5: Document-Level Security)
  app.get('/api/v1/documents/:fileName', verifyToken, verifyDocumentAccess, streamSecuredDocument);
  app.get('/api/documents/:fileName', verifyToken, verifyDocumentAccess, streamSecuredDocument);

  // Data Grid PDF Export (Epic 2 - US 2.1: Data Grid PDF Exports)
  app.post('/api/v1/export/grid-pdf', async (req, res) => {
    try {
      const { title, subtitle, orientation, columns, rows } = req.body;
      const pdfBuffer = await ExportPdfService.generateGridPdf({
        title: title || 'Rapport de Données Opérationnelles',
        subtitle: subtitle || `Extrait le ${new Date().toLocaleDateString('fr-FR')}`,
        orientation: orientation || 'landscape',
        columns: columns || [],
        rows: rows || []
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="export_${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (err: any) {
      console.error('Erreur generateGridPdf:', err);
      res.status(500).json({ error: 'Échec de la génération du rapport PDF.' });
    }
  });

  // API routes FIRST
  app.get('/api/v1/features', getFeatures);
  app.get('/api/features', getFeatures);
  app.patch('/api/v1/features/:key', verifyToken, requirePrivilege('manage_users'), updateFeature);
  app.patch('/api/features/:key', verifyToken, requirePrivilege('manage_users'), updateFeature);
  app.post('/api/v1/features/batch', verifyToken, requirePrivilege('manage_users'), batchUpdateFeatures);
  app.post('/api/features/batch', verifyToken, requirePrivilege('manage_users'), batchUpdateFeatures);

  app.use('/api/v1/tenant', tenantRoutes);
  app.use('/api/tenant', tenantRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/tenants', tenantRoutes);

  app.use('/api/v1/requests', requestsRoutes);
  app.use('/api/requests', requestsRoutes);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/ai', aiRoutes);

  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/notifications', notificationsRoutes);

  app.use('/api/v1/workflow', workflowRoutes);
  app.use('/api/workflow', workflowRoutes);

  app.use('/api/v1/blockly-workflows', blocklyRoutes);
  app.use('/api/blockly-workflows', blocklyRoutes);

  // Vite middleware for development vs static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portail Opérationnel démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
