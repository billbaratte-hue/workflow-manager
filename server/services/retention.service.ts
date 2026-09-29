/**
 * @file server/services/retention.service.ts
 * GDPR / RGPD Data Retention & Anonymization Service (Epic 3 - User Story 3.4).
 * Periodically scans mechatronic requests, audit logs, and user records to enforce compliance.
 */

import { getDatabase } from '../db/database.js';

export interface RetentionPolicyConfig {
    rejectedDossiersRetentionDays: number; // e.g. 180 days (6 months)
    completedDossiersRetentionDays: number; // e.g. 1095 days (3 years)
    anonymizeOnly: boolean;
}

export const DEFAULT_RETENTION_CONFIG: RetentionPolicyConfig = {
    rejectedDossiersRetentionDays: 180,
    completedDossiersRetentionDays: 1095,
    anonymizeOnly: true
};

export interface RetentionExecutionReport {
    timestamp: string;
    inspectedCount: number;
    anonymizedCount: number;
    purgedCount: number;
    affectedReferences: string[];
}

export class RetentionService {
    /**
     * Executes a retention cycle, scanning for expired dossiers and sanitizing/purging them
     */
    static async executeRetentionCycle(
        config: RetentionPolicyConfig = DEFAULT_RETENTION_CONFIG,
        customDb?: any
    ): Promise<RetentionExecutionReport> {
        const db = customDb || (await getDatabase());
        const now = new Date();
        const affectedReferences: string[] = [];
        let anonymizedCount = 0;
        let purgedCount = 0;

        const allRequests: any[] = await db.all('SELECT id, reference, status, created_at, beneficiaire_name FROM requests');

        for (const req of allRequests) {
            const createdAt = new Date(req.created_at || Date.now());
            const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            const isRejected = ['Refusée', 'Annulée', 'REJECTED', 'ABANDONNEE'].includes(req.status);
            const isCompleted = ['Validée', 'Délivrée', 'CLOTUREE', 'TERMINEE'].includes(req.status);

            const isExpired =
                (isRejected && diffDays > config.rejectedDossiersRetentionDays) ||
                (isCompleted && diffDays > config.completedDossiersRetentionDays);

            if (isExpired) {
                affectedReferences.push(req.reference);

                if (config.anonymizeOnly) {
                    // Anonymize personal identifying information (PII)
                    await db.run(`
                        UPDATE requests
                        SET beneficiaire_name = 'UTILISATEUR_ANONYMISE_RGPD',
                            beneficiaire_service = 'RGPD_PURGE',
                            team_members = '[]',
                            team_name = NULL,
                            description = '[Contenu archivé et anonymisé conformément aux règles RGPD]'
                        WHERE id = ?
                    `, req.id);
                    anonymizedCount++;
                } else {
                    await db.run('DELETE FROM requests WHERE id = ?', req.id);
                    purgedCount++;
                }
            }
        }

        const report: RetentionExecutionReport = {
            timestamp: now.toISOString(),
            inspectedCount: allRequests.length,
            anonymizedCount,
            purgedCount,
            affectedReferences
        };

        // Record an audit log for RGPD compliance
        await db.run(`
            INSERT INTO audit_logs (timestamp, actor, role, action, target, details)
            VALUES (?, 'RGPD_DAEMON', 'SYSTEM', 'EXECUTION_CYCLE_RETENTION_RGPD', 'DATABASE_PURGE', ?)
        `, [
            now.toISOString(),
            JSON.stringify({
                inspectedCount: allRequests.length,
                anonymizedCount,
                purgedCount,
                sampleAffected: affectedReferences.slice(0, 10)
            })
        ]);

        console.log(`[RETENTION RGPD] Executed cycle: ${anonymizedCount} anonymized, ${purgedCount} purged.`);
        return report;
    }
}
