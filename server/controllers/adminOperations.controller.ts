/**
 * @file server/controllers/adminOperations.controller.ts
 * Operations controller for DB Backup/Restore, GDPR Retention, Dynamic Assignment, and Return Contracts.
 */

import { Request, Response } from 'express';
import { createDatabaseBackup, listBackups } from '../db/backup.js';
import { restoreDatabaseFromFile } from '../db/restore.js';
import { RetentionService, DEFAULT_RETENTION_CONFIG } from '../services/retention.service.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { getDatabase } from '../db/database.js';
import { AffectationDynamiqueService } from '../services/affectationDynamique.service.js';
import { ChampsConditionnelsService } from '../services/champsConditionnels.service.js';
import { ContratRetourService, ReturnContractRecord } from '../services/contratRetour.service.js';
import { AutomationService } from '../services/automation.service.js';
import { ProcessPackageService } from '../services/processPackage.service.js';

// In-memory store for return contracts created at runtime
const activeContractsStore: ReturnContractRecord[] = [];

/**
 * Trigger an automated or manual database backup (Epic 1 - US 1.1)
 */
export async function handleCreateBackup(_req: Request, res: Response) {
    try {
        const result = await createDatabaseBackup();
        res.status(200).json({
            message: 'Sauvegarde de la base de données réalisée avec succès.',
            backup: result
        });
    } catch (err: any) {
        console.error('Erreur handleCreateBackup:', err);
        res.status(500).json({ error: err.message || 'Échec de la sauvegarde.' });
    }
}

/**
 * List all available backups
 */
export async function handleListBackups(_req: Request, res: Response) {
    try {
        const backups = await listBackups();
        res.status(200).json(backups);
    } catch (err: any) {
        console.error('Erreur handleListBackups:', err);
        res.status(500).json({ error: err.message || 'Échec de la récupération des sauvegardes.' });
    }
}

/**
 * Restore database from backup file (Epic 1 - US 1.2)
 */
export async function handleRestoreBackup(req: Request, res: Response) {
    try {
        const { backupPath, mode } = req.body;
        if (!backupPath) {
            return res.status(400).json({ error: 'Le paramètre backupPath est requis.' });
        }
        const result = await restoreDatabaseFromFile(backupPath, {
            mode: mode || 'override',
            skipChecksum: false
        });
        res.status(200).json({
            message: 'Restauration de la base de données effectuée avec succès.',
            result
        });
    } catch (err: any) {
        console.error('Erreur handleRestoreBackup:', err);
        res.status(500).json({ error: err.message || 'Échec de la restauration.' });
    }
}

/**
 * Execute GDPR data retention policy (Epic 3 - US 3.4)
 */
export async function handleExecuteRetention(req: Request, res: Response) {
    try {
        const savedPolicy = await settingsRepository.getSettingValue('data_retention_policy', {
            rejected_dossiers_retention_days: 180,
            completed_dossiers_retention_days: 1095,
            anonymize_only: true
        });

        const { rejectedDossiersRetentionDays, completedDossiersRetentionDays, anonymizeOnly } = req.body || {};
        const config = {
            rejectedDossiersRetentionDays: rejectedDossiersRetentionDays !== undefined 
                ? Number(rejectedDossiersRetentionDays) 
                : Number(savedPolicy.rejected_dossiers_retention_days ?? DEFAULT_RETENTION_CONFIG.rejectedDossiersRetentionDays),
            completedDossiersRetentionDays: completedDossiersRetentionDays !== undefined 
                ? Number(completedDossiersRetentionDays) 
                : Number(savedPolicy.completed_dossiers_retention_days ?? DEFAULT_RETENTION_CONFIG.completedDossiersRetentionDays),
            anonymizeOnly: anonymizeOnly !== undefined 
                ? !!anonymizeOnly 
                : Boolean(savedPolicy.anonymize_only ?? DEFAULT_RETENTION_CONFIG.anonymizeOnly)
        };
        const report = await RetentionService.executeRetentionCycle(config);
        res.status(200).json({
            message: 'Régularisation RGPD exécutée avec succès.',
            report
        });
    } catch (err: any) {
        console.error('Erreur handleExecuteRetention:', err);
        res.status(500).json({ error: err.message || 'Échec du cycle de rétention.' });
    }
}

/**
 * Get GDPR retention status
 */
export async function handleGetRetentionStatus(_req: Request, res: Response) {
    try {
        const policy = await settingsRepository.getSettingValue('data_retention_policy', {
            rejected_dossiers_retention_days: 180,
            completed_dossiers_retention_days: 1095,
            audit_logs_retention_days: 365,
            inactive_accounts_retention_days: 730,
            anonymize_only: true,
            auto_schedule_enabled: true
        });

        let lastAudit = null;
        try {
            const db = await getDatabase();
            lastAudit = await db.get(
                `SELECT timestamp, details FROM audit_logs WHERE action = 'EXECUTION_CYCLE_RETENTION_RGPD' ORDER BY id DESC LIMIT 1`
            );
        } catch {
            // fallback
        }

        let parsedReport = null;
        if (lastAudit?.details) {
            try {
                parsedReport = JSON.parse(lastAudit.details);
            } catch {
                parsedReport = null;
            }
        }

        res.status(200).json({
            policy,
            status: 'ACTIVE',
            lastRun: lastAudit?.timestamp || new Date().toISOString(),
            lastReport: parsedReport
        });
    } catch (err: any) {
        console.error('Erreur handleGetRetentionStatus:', err);
        res.status(500).json({ error: err.message || 'Échec de la récupération du statut de rétention.' });
    }
}

/**
 * Evaluate Dynamic Workflow Assignment (Epic 3 - US 3.1)
 */
export async function handleEvaluateAssignment(req: Request, res: Response) {
    try {
        const { request } = req.body;
        if (!request) {
            return res.status(400).json({ error: 'Données de demande manquantes.' });
        }
        const result = await AffectationDynamiqueService.resolveAssignment(request);
        res.status(200).json(result);
    } catch (err: any) {
        console.error('Erreur handleEvaluateAssignment:', err);
        res.status(500).json({ error: err.message || 'Échec de l\'évaluation d\'affectation.' });
    }
}

/**
 * Evaluate Conditional Fields Engine (Epic 3 - US 3.2)
 */
export async function handleEvaluateConditionalFields(req: Request, res: Response) {
    try {
        const { formData } = req.body;
        const result = ChampsConditionnelsService.evaluate(formData || {});
        res.status(200).json(result);
    } catch (err: any) {
        console.error('Erreur handleEvaluateConditionalFields:', err);
        res.status(500).json({ error: err.message || 'Échec du moteur de champs conditionnels.' });
    }
}

/**
 * Hardware Return Contracts API (Epic 3 - US 3.3)
 */
export async function handleGetReturnContracts(req: Request, res: Response) {
    try {
        const { agentId } = req.query;
        let list = await ContratRetourService.getAllContracts(agentId as string | undefined);
        if (list.length === 0 && activeContractsStore.length > 0) {
            list = [...activeContractsStore];
            if (agentId) {
                list = list.filter(c => String(c.beneficiaireId) === String(agentId));
            }
        }
        res.status(200).json(list);
    } catch (err: any) {
        console.error('Erreur handleGetReturnContracts:', err);
        res.status(500).json({ error: err.message || 'Échec de la récupération des contrats de retour.' });
    }
}

export async function handleCreateReturnContract(req: Request, res: Response) {
    try {
        const { beneficiaireId, beneficiaireName, items, requestId } = req.body;
        const contract = await ContratRetourService.createReturnContract(
            beneficiaireId,
            beneficiaireName,
            items || [],
            requestId
        );
        activeContractsStore.unshift(contract);
        res.status(201).json(contract);
    } catch (err: any) {
        console.error('Erreur handleCreateReturnContract:', err);
        res.status(400).json({ error: err.message || 'Échec de la création du contrat de retour.' });
    }
}

export async function handleTransitionReturnContract(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { inspectedItems, inspectorName } = req.body;
        
        let contract = await ContratRetourService.getContractById(id);
        if (!contract) {
            const index = activeContractsStore.findIndex(c => c.id === id);
            if (index !== -1) {
                contract = activeContractsStore[index];
            }
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contrat de retour introuvable.' });
        }

        const updated = await ContratRetourService.inspectAndProcessReturn(
            contract,
            inspectedItems || [],
            inspectorName || 'Régisseur Matériel'
        );

        const storeIdx = activeContractsStore.findIndex(c => c.id === id);
        if (storeIdx !== -1) {
            activeContractsStore[storeIdx] = updated;
        } else {
            activeContractsStore.unshift(updated);
        }

        res.status(200).json(updated);
    } catch (err: any) {
        console.error('Erreur handleTransitionReturnContract:', err);
        res.status(400).json({ error: err.message || 'Échec de l\'inspection du contrat de retour.' });
    }
}

export async function handleUpdateContractStatus(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { state, actor } = req.body;
        if (!state) {
            return res.status(400).json({ error: 'Nouveau statut requis.' });
        }
        const updated = await ContratRetourService.updateContractState(id, state, actor);
        if (!updated) {
            return res.status(404).json({ error: 'Contrat introuvable.' });
        }
        res.status(200).json(updated);
    } catch (err: any) {
        console.error('Erreur handleUpdateContractStatus:', err);
        res.status(400).json({ error: err.message || 'Échec du changement de statut.' });
    }
}

/**
 * Automation & SLA Watchdog Daemon status
 */
export async function handleGetAutomationStatus(_req: Request, res: Response) {
    try {
        const status = AutomationService.getStatus();
        res.status(200).json(status);
    } catch (err: any) {
        console.error('Erreur handleGetAutomationStatus:', err);
        res.status(500).json({ error: err.message || 'Impossible de récupérer le statut de l\'automatisation.' });
    }
}

/**
 * Trigger an automation & SLA surveillance cycle on-demand
 */
export async function handleRunAutomationCycle(req: Request, res: Response) {
    try {
        const dryRun = Boolean(req.body?.dryRun);
        const stats = await AutomationService.runCycle({ dryRun });
        res.status(200).json({
            message: 'Cycle d\'automatisation et de surveillance des SLA exécuté avec succès.',
            stats
        });
    } catch (err: any) {
        console.error('Erreur handleRunAutomationCycle:', err);
        res.status(500).json({ error: err.message || 'Échec de l\'exécution du cycle d\'automatisation.' });
    }
}

/**
 * Test dispatch to external SIEM / SOC webhook
 */
export async function handleTestSiemWebhook(req: Request, res: Response) {
    try {
        const testPayload = {
            eventType: 'SECURITY_AUDIT_TEST',
            severity: 'INFORMATIONAL',
            message: 'Test de connectivité Webhook SIEM / SOC depuis Workflow Manager',
            triggeredBy: (req as any).user?.name || 'Administrateur Test',
            timestamp: new Date().toISOString()
        };
        const dispatched = await AutomationService.dispatchSiemWebhook(testPayload);
        res.status(200).json({
            success: dispatched,
            message: dispatched
                ? 'Événement de test transmis avec succès au webhook SIEM.'
                : 'Aucune URL de webhook configurée (SIEM_WEBHOOK_URL ou siem_webhook_url dans les paramètres système), ou le webhook a renvoyé une erreur.'
        });
    } catch (err: any) {
        console.error('Erreur handleTestSiemWebhook:', err);
        res.status(500).json({ error: err.message || 'Erreur lors du test du webhook.' });
    }
}

/**
 * Export a complete self-contained process package (process + dynamic form + business rules)
 */
export async function handleExportProcessPackage(req: Request, res: Response) {
    try {
        const processId = Number(req.params.id);
        const userName = (req as any).user?.name || 'Admin';
        const pkg = await ProcessPackageService.exportPackage(processId, userName);
        res.setHeader('Content-Disposition', `attachment; filename="process_package_${processId}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(pkg);
    } catch (err: any) {
        console.error('Erreur handleExportProcessPackage:', err);
        res.status(404).json({ error: err.message || 'Échec de l\'export du package de processus.' });
    }
}

/**
 * Import a complete process package into the platform
 */
export async function handleImportProcessPackage(req: Request, res: Response) {
    try {
        const userName = (req as any).user?.name || 'Admin';
        const result = await ProcessPackageService.importPackage(req.body, userName);
        res.status(201).json(result);
    } catch (err: any) {
        console.error('Erreur handleImportProcessPackage:', err);
        res.status(400).json({ error: err.message || 'Échec de l\'importation du package de processus.' });
    }
}
