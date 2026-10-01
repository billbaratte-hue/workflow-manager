/**
 * @file server/services/automation.service.ts
 * Automation, SLA Watchdog & SIEM Dispatcher Service (NIS 2 & Enterprise SLA Governance).
 * 
 * Capabilities:
 * 1. SLA Watchdog & Auto-Escalation:
 *    - Scans active requests waiting for validation (status is pending / stages in progress).
 *    - Calculates elapsed hours against stage.sla_hours (default 24h/48h).
 *    - Emits warning notification at >= 80% SLA elapsed.
 *    - Emits urgent escalation, sends email notification, and logs immutable audit record when SLA is breached (>= 100%).
 * 2. Hardware Return Contract Reminders:
 *    - Scans active return contracts (contratRetourService).
 *    - Alerts users and hardware régie for deadlines (< 48h) or overdue keys/badges.
 * 3. Outbound SIEM / SOC Webhook Dispatcher:
 *    - Sends signed HMAC-SHA256 event payloads to external security and alerting webhooks (SIEM, Slack, Teams).
 * 4. Background Daemon Lifecycle:
 *    - Configurable periodic execution daemon (every N minutes).
 *    - Manual / On-demand trigger and metrics status reporting.
 */

import crypto from 'crypto';
import {
    requestsDB,
    createNotification,
    logAction,
    RequestItem,
    ProcessStage
} from '../db/store.js';
import { emailService } from './email.service.js';
import { ContratRetourService } from './contratRetour.service.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { getDatabase } from '../db/database.js';

export interface SlaBreachResult {
    reference: string;
    stageName: string;
    validatorRole: string;
    slaHours: number;
    elapsedHours: number;
    isBreached: boolean;
    isWarning: boolean;
}

export interface AutomationCycleStats {
    timestamp: string;
    durationMs: number;
    checkedRequests: number;
    breachedCount: number;
    warningCount: number;
    contractRemindersCount: number;
    siemEventsDispatched: number;
    details: SlaBreachResult[];
}

export class AutomationService {
    private static daemonTimer: NodeJS.Timeout | null = null;
    private static isRunning: boolean = false;
    private static lastRunStats: AutomationCycleStats = {
        timestamp: new Date().toISOString(),
        durationMs: 0,
        checkedRequests: 0,
        breachedCount: 0,
        warningCount: 0,
        contractRemindersCount: 0,
        siemEventsDispatched: 0,
        details: []
    };

    /**
     * Executes a full monitoring and automation cycle
     */
    static async runCycle(options?: { now?: Date; dryRun?: boolean }): Promise<AutomationCycleStats> {
        const startTime = Date.now();
        const now = options?.now || new Date();
        const isDryRun = options?.dryRun || false;

        const slaResults: SlaBreachResult[] = [];
        let breachedCount = 0;
        let warningCount = 0;
        let contractRemindersCount = 0;
        let siemEventsDispatched = 0;

        // 1. Process SLA checks on active requests
        const activeRequests = requestsDB.filter(r => {
            const s = (r.status || '').toLowerCase();
            return !['validée', 'refusée', 'rejetée', 'archivée', 'brouillon'].includes(s);
        });

        for (const req of activeRequests) {
            const currentStage = req.stages && req.stages[req.current_stage_index || 0];
            if (!currentStage || currentStage.status !== 'pending') continue;

            const stageSlaHours = currentStage.sla_hours || 48;
            const stageStartTime = new Date(req.created_at || now.toISOString()).getTime();
            const elapsedHours = Math.max(0, (now.getTime() - stageStartTime) / (1000 * 60 * 60));

            const isBreached = elapsedHours >= stageSlaHours;
            const isWarning = !isBreached && elapsedHours >= stageSlaHours * 0.8;

            if (isBreached) {
                breachedCount++;
                slaResults.push({
                    reference: req.reference,
                    stageName: currentStage.name,
                    validatorRole: currentStage.validator_role,
                    slaHours: stageSlaHours,
                    elapsedHours: Math.round(elapsedHours * 10) / 10,
                    isBreached: true,
                    isWarning: false
                });

                if (!isDryRun && !req.sla_breached) {
                    req.sla_breached = true;
                    req.sla_breached_at = now.toISOString();

                    // Sync to DB
                    try {
                        const db = await getDatabase();
                        await db.run(
                            'UPDATE requests SET sla_breached = 1, sla_breached_at = ? WHERE reference = ?',
                            [req.sla_breached_at, req.reference]
                        );
                    } catch (e) {
                        // In-memory or optional column in unit tests
                    }

                    // A. Urgent in-app notification via SSE
                    createNotification({
                        target_role: currentStage.validator_role,
                        type: 'urgent_alert',
                        title: `[URGENT SLA DÉPASSÉ] Dossier ${req.reference}`,
                        message: `Le délai imparti de ${stageSlaHours}h pour l'étape "${currentStage.name}" sur le dossier ${req.reference} est dépassé (${Math.round(elapsedHours)}h écoulées).`,
                        link: '/corbeille',
                        reference: req.reference,
                        urgent: true
                    });

                    // B. Audit log
                    logAction(
                        "SYSTEM_AUTOMATION",
                        "Système",
                        "SLA_BREACH_ESCALATED",
                        req.reference,
                        `Dépassement de SLA détecté : ${Math.round(elapsedHours)}h écoulées pour ${stageSlaHours}h autorisées sur l'étape "${currentStage.name}"`
                    );

                    // C. Email escalation
                    if (req.demandeur_email) {
                        emailService.sendEmail({
                            to: req.demandeur_email,
                            subject: `[Notification d'Escalade] Retard de traitement sur votre dossier ${req.reference}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px;">
                                    <h2 style="color: #b91c1c;">Alerte de Dépassement de Délai (SLA)</h2>
                                    <p>Bonjour,</p>
                                    <p>Nous vous informons qu'un retard a été constaté sur le traitement de votre demande <strong>${req.reference}</strong> (<em>${req.title}</em>).</p>
                                    <p>Le délai contractuel de l'étape <strong>"${currentStage.name}"</strong> (${stageSlaHours}h) a expiré. Une alerte d'escalade a été transmise au validateur compétent (<strong>${currentStage.validator_role}</strong>).</p>
                                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                                    <p style="font-size: 11px; color: #64748b;">Workflow Manager • Supervision Automatique des Accès</p>
                                </div>
                            `
                        }).catch(e => console.warn('Email dispatch warning:', e));
                    }

                    // D. Dispatch SIEM event
                    const siemSent = await this.dispatchSiemWebhook({
                        eventType: 'SLA_BREACH_ESCALATION',
                        severity: 'HIGH',
                        reference: req.reference,
                        title: req.title,
                        stage: currentStage.name,
                        validatorRole: currentStage.validator_role,
                        elapsedHours,
                        slaHours: stageSlaHours,
                        timestamp: now.toISOString()
                    });
                    if (siemSent) siemEventsDispatched++;
                }
            } else if (isWarning) {
                warningCount++;
                slaResults.push({
                    reference: req.reference,
                    stageName: currentStage.name,
                    validatorRole: currentStage.validator_role,
                    slaHours: stageSlaHours,
                    elapsedHours: Math.round(elapsedHours * 10) / 10,
                    isBreached: false,
                    isWarning: true
                });

                if (!isDryRun && !req.sla_warning) {
                    req.sla_warning = true;
                    createNotification({
                        target_role: currentStage.validator_role,
                        type: 'deadline_warning',
                        title: `[Rappel SLA 80%] Dossier ${req.reference}`,
                        message: `Échéance imminente pour le dossier ${req.reference} (${Math.round(elapsedHours)}h / ${stageSlaHours}h). Merci de valider au plus tôt.`,
                        link: '/corbeille',
                        reference: req.reference,
                        urgent: false
                    });
                }
            }
        }

        // 2. Hardware Return Contracts Deadline Reminders
        try {
            const contracts = await ContratRetourService.getAllContracts();
            const activeContracts = contracts.filter(c => c.state === 'INITIALISE' || c.state === 'RESTITUTION_PLANIFIEE');

            for (const c of activeContracts) {
                const createdTime = new Date(c.createdAt).getTime();
                const contractAgeDays = (now.getTime() - createdTime) / (1000 * 60 * 60 * 24);

                // If return contract has been active for more than 14 days, send reminder
                if (contractAgeDays >= 14) {
                    contractRemindersCount++;
                    if (!isDryRun) {
                        createNotification({
                            target_role: 'Régie Matérielle',
                            type: contractAgeDays >= 21 ? 'urgent_alert' : 'deadline_warning',
                            title: `[Régie] Contrat de restitution ${c.id} en attente`,
                            message: `Le contrat de restitution du matériel pour ${c.beneficiaireName} est en attente de retour depuis ${Math.round(contractAgeDays)} jours.`,
                            link: '/admin/regie',
                            reference: c.id,
                            urgent: contractAgeDays >= 21
                        });

                        logAction(
                            "SYSTEM_AUTOMATION",
                            "Système",
                            "HARDWARE_RETURN_REMINDER",
                            c.id,
                            `Relance automatique pour restitution du matériel par ${c.beneficiaireName} (${Math.round(contractAgeDays)} jours écoulés)`
                        );
                    }
                }
            }
        } catch (e) {
            console.warn('ContratRetour check error:', e);
        }

        const durationMs = Date.now() - startTime;
        const stats: AutomationCycleStats = {
            timestamp: now.toISOString(),
            durationMs,
            checkedRequests: activeRequests.length,
            breachedCount,
            warningCount,
            contractRemindersCount,
            siemEventsDispatched,
            details: slaResults
        };

        this.lastRunStats = stats;
        return stats;
    }

    private static intervalMinutes: number = 5;

    /**
     * Dispatches a signed JSON webhook event to an external SIEM or Alerting system
     */
    static async dispatchSiemWebhook(eventPayload: Record<string, any>, customUrl?: string): Promise<boolean> {
        try {
            const webhookUrl = customUrl ||
                process.env.SIEM_WEBHOOK_URL ||
                process.env.WEBHOOK_URL ||
                (await settingsRepository.getSettingValue<string>('siem_webhook_url', ''));

            if (!webhookUrl || !webhookUrl.startsWith('http')) {
                return false;
            }

            const secret = process.env.WEBHOOK_SECRET || 'workflow_manager_siem_secret_2026';
            const body = JSON.stringify({
                app: 'WorkflowManager',
                source: 'AutomationService',
                environment: process.env.NODE_ENV || 'development',
                ...eventPayload
            });

            const rawSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
            const signature = `sha256=${rawSignature}`;

            // Fire and forget with 5-second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signature-SHA256': signature,
                    'X-Event-Type': eventPayload.eventType || 'SECURITY_AUDIT',
                    'X-SIEM-Source': 'Workflow-Manager-SLA-Watchdog'
                },
                body,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            return res.ok;
        } catch (err: any) {
            console.warn('SIEM Webhook dispatch warning (non-blocking):', err.message);
            return false;
        }
    }

    /**
     * Starts the periodic background automation daemon
     */
    static startDaemon(intervalMinutes: number = 5): void {
        this.intervalMinutes = intervalMinutes;
        if (this.isRunning) return;

        const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
        this.isRunning = true;
        console.log(`✓ Daemon d'automatisation des SLA & surveillance démarré (cycle toutes les ${intervalMinutes} min)`);

        this.daemonTimer = setInterval(() => {
            this.runCycle().catch(err => {
                console.error("Erreur cycle d'automatisation background:", err);
            });
        }, intervalMs);

        // Run an initial cycle after 10 seconds of server startup
        setTimeout(() => {
            this.runCycle().catch(() => {});
        }, 10000);
    }

    /**
     * Stops the background daemon
     */
    static stopDaemon(): void {
        if (this.daemonTimer) {
            clearInterval(this.daemonTimer);
            this.daemonTimer = null;
        }
        this.isRunning = false;
    }

    /**
     * Returns the daemon's current runtime status and metrics
     */
    static getStatus() {
        return {
            isRunning: this.isRunning,
            daemonActive: this.isRunning,
            intervalMinutes: this.intervalMinutes,
            lastRunStats: this.lastRunStats,
            serverTime: new Date().toISOString()
        };
    }
}
