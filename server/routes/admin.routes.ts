import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as tablesController from '../controllers/tables.controller.js';
import * as featuresController from '../controllers/features.controller.js';
import * as settingsController from '../controllers/settings.controller.js';
import * as opsController from '../controllers/adminOperations.controller.js';
import { verifyToken, requirePrivilege } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/categories', adminController.getCategories);
router.get('/processus', adminController.getProcesses);
router.post('/categories', verifyToken, requirePrivilege('manage_users'), adminController.createCategory);
router.patch('/categories/:id', verifyToken, requirePrivilege('manage_users'), adminController.updateCategoryStatus);
router.delete('/categories/:id', verifyToken, requirePrivilege('manage_users'), adminController.deleteCategory);
router.post('/processus', verifyToken, requirePrivilege('manage_users'), adminController.createProcess);
router.patch('/processus/:id', verifyToken, requirePrivilege('manage_users'), adminController.updateProcessStatus);
router.delete('/processus/:id', verifyToken, requirePrivilege('manage_users'), adminController.deleteProcess);
router.post('/processus/:id/duplicate', verifyToken, requirePrivilege('manage_users'), adminController.duplicateProcess);
router.post('/processus/import', verifyToken, requirePrivilege('manage_users'), adminController.importProcess);
router.get('/processus/export/all', adminController.exportAllProcesses);
router.post('/processus/reset-blank', verifyToken, requirePrivilege('manage_users'), adminController.resetProcessesToBlank);
router.post('/processus/seed-standard', verifyToken, requirePrivilege('manage_users'), adminController.seedStandardProcesses);

// Formulaires Management routes (Separation Workflow vs Formulaires)
router.get('/formulaires', adminController.getFormulaires);
router.get('/formulaires/:id', adminController.getFormulaireById);
router.post('/formulaires', verifyToken, requirePrivilege('manage_users'), adminController.createFormulaire);
router.patch('/formulaires/:id', verifyToken, requirePrivilege('manage_users'), adminController.updateFormulaire);
router.delete('/formulaires/:id', verifyToken, requirePrivilege('manage_users'), adminController.deleteFormulaire);
router.post('/formulaires/:id/duplicate', verifyToken, requirePrivilege('manage_users'), adminController.duplicateFormulaire);

// Status Management routes (Configurateur de Statuts Zero-Code & Machine à États)
router.get('/statuses', adminController.getStatuses);
router.get('/statuses/categories', adminController.getStatusCategories);
router.post('/statuses/categories', verifyToken, requirePrivilege('manage_users'), adminController.createStatusCategory);
router.patch('/statuses/categories/:code', verifyToken, requirePrivilege('manage_users'), adminController.updateStatusCategory);
router.delete('/statuses/categories/:code', verifyToken, requirePrivilege('manage_users'), adminController.deleteStatusCategory);
router.get('/statuses/metadata', adminController.getStatusMetadata);
router.patch('/statuses/metadata', verifyToken, requirePrivilege('manage_users'), adminController.updateStatusMetadata);
router.get('/statuses/:code', adminController.getStatusByCode);
router.post('/statuses', verifyToken, requirePrivilege('manage_users'), adminController.createStatus);
router.patch('/statuses/:code', verifyToken, requirePrivilege('manage_users'), adminController.updateStatus);
router.delete('/statuses/:code', verifyToken, requirePrivilege('manage_users'), adminController.deleteStatus);
router.post('/statuses/:code/duplicate', verifyToken, requirePrivilege('manage_users'), adminController.duplicateStatus);
router.post('/statuses/matrix/transitions', verifyToken, requirePrivilege('manage_users'), adminController.batchUpdateStatusTransitions);

// Business Rules Management routes (Moteur de Règles Métiers Zero-Code)
router.get('/rules', adminController.getBusinessRules);
router.post('/rules', verifyToken, requirePrivilege('manage_users'), adminController.createBusinessRule);
router.patch('/rules/:id', verifyToken, requirePrivilege('manage_users'), adminController.updateBusinessRule);
router.delete('/rules/:id', verifyToken, requirePrivilege('manage_users'), adminController.deleteBusinessRule);
router.post('/rules/:id/toggle', verifyToken, requirePrivilege('manage_users'), adminController.toggleBusinessRule);
router.post('/rules/:id/duplicate', verifyToken, requirePrivilege('manage_users'), adminController.duplicateBusinessRule);
router.post('/rules/test', verifyToken, requirePrivilege('manage_users'), adminController.testBusinessRule);

// Rule Domains routes (Configuration des Domaines & Thématiques Métiers)
router.get('/rule-domains', adminController.getRuleDomains);
router.post('/rule-domains', verifyToken, requirePrivilege('manage_users'), adminController.createRuleDomain);
router.patch('/rule-domains/:id', verifyToken, requirePrivilege('manage_users'), adminController.updateRuleDomain);
router.delete('/rule-domains/:id', verifyToken, requirePrivilege('manage_users'), adminController.deleteRuleDomain);
router.post('/rule-domains/reset', verifyToken, requirePrivilege('manage_users'), adminController.resetRuleDomains);

// Reference Tables Management routes
router.get('/tables', tablesController.getTables);
router.get('/tables/:tableId', tablesController.getTableById);
router.post('/tables', verifyToken, requirePrivilege('manage_users'), tablesController.createTable);
router.patch('/tables/:tableId', verifyToken, requirePrivilege('manage_users'), tablesController.updateTable);
router.delete('/tables/:tableId', verifyToken, requirePrivilege('manage_users'), tablesController.deleteTable);
router.post('/tables/:tableId/rows', verifyToken, requirePrivilege('manage_users'), tablesController.addTableRow);
router.patch('/tables/:tableId/rows/:rowId', verifyToken, requirePrivilege('manage_users'), tablesController.updateTableRow);
router.delete('/tables/:tableId/rows/:rowId', verifyToken, requirePrivilege('manage_users'), tablesController.deleteTableRow);
router.post('/tables/:tableId/import-csv', verifyToken, requirePrivilege('manage_users'), tablesController.importTableCsv);
router.post('/tables/:tableId/columns', verifyToken, requirePrivilege('manage_users'), tablesController.addTableColumn);
router.patch('/tables/:tableId/columns/:columnKey', verifyToken, requirePrivilege('manage_users'), tablesController.updateTableColumn);
router.delete('/tables/:tableId/columns/:columnKey', verifyToken, requirePrivilege('manage_users'), tablesController.deleteTableColumn);
router.post('/tables/:tableId/metadata-fields', verifyToken, requirePrivilege('manage_users'), tablesController.addTableMetadataField);
router.patch('/tables/:tableId/metadata-fields/:fieldKey', verifyToken, requirePrivilege('manage_users'), tablesController.updateTableMetadataField);
router.delete('/tables/:tableId/metadata-fields/:fieldKey', verifyToken, requirePrivilege('manage_users'), tablesController.deleteTableMetadataField);
router.patch('/tables/:tableId/metadata', verifyToken, requirePrivilege('manage_users'), tablesController.updateTableMetadataValues);
router.delete('/tables/:tableId/metadata/:metaKey', verifyToken, requirePrivilege('manage_users'), tablesController.deleteTableMetadataValue);

// Notification Templates Management routes
router.get('/notification-templates', adminController.getNotificationTemplates);
router.post('/notification-templates', verifyToken, requirePrivilege('manage_users'), adminController.createNotificationTemplate);
router.patch('/notification-templates/:id', verifyToken, requirePrivilege('manage_users'), adminController.updateNotificationTemplate);
router.delete('/notification-templates/:id', verifyToken, requirePrivilege('manage_users'), adminController.deleteNotificationTemplate);
router.post('/notification-templates/:id/duplicate', verifyToken, requirePrivilege('manage_users'), adminController.duplicateNotificationTemplate);

// People Filtering Configuration routes (Administration level)
router.get('/settings/people-filters', tablesController.getPeopleFilterSettings);
router.post('/settings/people-filters', verifyToken, requirePrivilege('manage_users'), tablesController.updatePeopleFilterSettings);

// Portal Tabs Management routes (Noms, descriptions, ordre et visibilité dynamique)
router.get('/portal-tabs', adminController.getPortalTabs);
router.put('/portal-tabs', verifyToken, requirePrivilege('manage_users'), adminController.batchUpdatePortalTabs);
router.post('/portal-tabs', verifyToken, requirePrivilege('manage_users'), adminController.createPortalTab);
router.patch('/portal-tabs/:key', verifyToken, requirePrivilege('manage_users'), adminController.updatePortalTab);
router.delete('/portal-tabs/:key', verifyToken, requirePrivilege('manage_users'), adminController.deletePortalTab);
router.post('/portal-tabs/reset', verifyToken, requirePrivilege('manage_users'), adminController.resetPortalTabs);

// Admin Sidebar Navigation routes (Configuration du Volet de Navigation Administrateur)
router.get('/sidebar-items', adminController.getAdminNavItems);
router.post('/sidebar-items', verifyToken, requirePrivilege('manage_users'), adminController.createAdminNavItem);
router.put('/sidebar-items', verifyToken, requirePrivilege('manage_users'), adminController.batchUpdateAdminNavItems);
router.patch('/sidebar-items/:key', verifyToken, requirePrivilege('manage_users'), adminController.updateAdminNavItem);
router.delete('/sidebar-items/:key', verifyToken, requirePrivilege('manage_users'), adminController.deleteAdminNavItem);
router.post('/sidebar-items/reset', verifyToken, requirePrivilege('manage_users'), adminController.resetAdminNavItems);

// Admin Sidebar Sections routes (Configuration des Sections de Navigation Administrateur)
router.get('/sidebar-sections', adminController.getAdminNavSections);
router.post('/sidebar-sections', verifyToken, requirePrivilege('manage_users'), adminController.createAdminNavSection);
router.put('/sidebar-sections', verifyToken, requirePrivilege('manage_users'), adminController.batchUpdateAdminNavSections);
router.patch('/sidebar-sections/:key', verifyToken, requirePrivilege('manage_users'), adminController.updateAdminNavSection);
router.delete('/sidebar-sections/:key', verifyToken, requirePrivilege('manage_users'), adminController.deleteAdminNavSection);
router.post('/sidebar-sections/reset', verifyToken, requirePrivilege('manage_users'), adminController.resetAdminNavSections);

// System Feature Toggles routes
router.get('/features', featuresController.getFeatures);
router.patch('/features/:key', verifyToken, requirePrivilege('manage_users'), featuresController.updateFeature);
router.post('/features/batch', verifyToken, requirePrivilege('manage_users'), featuresController.batchUpdateFeatures);

// System Settings routes (Zero Hardcoding Architecture & Paramétrage Dynamique)
router.get('/settings', settingsController.getSystemSettings);
router.get('/settings/:key', settingsController.getSystemSettingByKey);
router.put('/settings/:key', verifyToken, requirePrivilege('manage_users'), settingsController.updateSystemSetting);
router.patch('/settings/:key', verifyToken, requirePrivilege('manage_users'), settingsController.updateSystemSetting);
router.delete('/settings/:key', verifyToken, requirePrivilege('manage_users'), settingsController.deleteSystemSetting);

// Database Lifecycle Management routes (Epic 1 - US 1.1 & 1.2)
router.post('/db/backup', verifyToken, requirePrivilege('manage_users'), opsController.handleCreateBackup);
router.get('/db/backups', verifyToken, requirePrivilege('manage_users'), opsController.handleListBackups);
router.post('/db/restore', verifyToken, requirePrivilege('manage_users'), opsController.handleRestoreBackup);

// GDPR Data Retention routes (Epic 3 - US 3.4)
router.post('/retention/run', verifyToken, requirePrivilege('manage_users'), opsController.handleExecuteRetention);
router.get('/retention/status', verifyToken, requirePrivilege('manage_users'), opsController.handleGetRetentionStatus);

// Specialized Business Logic routes (Epic 3 - US 3.1 & 3.2)
router.post('/assignment/evaluate', verifyToken, opsController.handleEvaluateAssignment);
router.post('/rules/conditional-fields/evaluate', verifyToken, opsController.handleEvaluateConditionalFields);

// Hardware Return Contracts routes (Epic 3 - US 3.3)
router.get('/hardware/contrats-retour', verifyToken, opsController.handleGetReturnContracts);
router.post('/hardware/contrats-retour', verifyToken, opsController.handleCreateReturnContract);
router.post('/hardware/contrats-retour/:id/transition', verifyToken, opsController.handleTransitionReturnContract);
router.patch('/hardware/contrats-retour/:id/status', verifyToken, opsController.handleUpdateContractStatus);

// Automation & SLA Watchdog Daemon routes
router.get('/automation/status', verifyToken, requirePrivilege('manage_users'), opsController.handleGetAutomationStatus);
router.post('/automation/run', verifyToken, requirePrivilege('manage_users'), opsController.handleRunAutomationCycle);
router.post('/automation/siem-test', verifyToken, requirePrivilege('manage_users'), opsController.handleTestSiemWebhook);

// Process Package Export & Import routes
router.get('/processus/:id/export-package', verifyToken, requirePrivilege('manage_users'), opsController.handleExportProcessPackage);
router.post('/processus/import-package', verifyToken, requirePrivilege('manage_users'), opsController.handleImportProcessPackage);

export default router;
