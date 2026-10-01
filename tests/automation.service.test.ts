import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutomationService } from '../server/services/automation.service.js';
import { ProcessPackageService } from '../server/services/processPackage.service.js';
import {
    requestsDB,
    processTemplates,
    formTemplatesDatabase,
    businessRulesStore,
    ProcessTemplate
} from '../server/db/store.js';

describe('AutomationService & SLA Watchdog Daemon (NIS 2 & Enterprise SLA Governance)', () => {
    beforeEach(() => {
        AutomationService.stopDaemon();
    });

    afterEach(() => {
        AutomationService.stopDaemon();
    });

    it('devrait détecter les dossiers en dépassement de SLA (>= 100%)', async () => {
        // Prepare a request that was created 50 hours ago with a 24h SLA
        const oldTimestamp = new Date(Date.now() - 50 * 3600 * 1000).toISOString();
        const testReq: any = {
            id: 9991,
            reference: 'REQ-SLA-TEST-01',
            title: 'Demande urgente avec SLA dépassé',
            description: 'Test SLA',
            status: 'En attente validation Manager',
            current_stage_index: 0,
            beneficiaire_id: 101,
            created_at: oldTimestamp,
            stages: [
                {
                    id: 'stg_1',
                    order: 1,
                    name: 'Validation Hiérarchique',
                    validator_role: 'Manager',
                    status: 'pending',
                    sla_hours: 24
                }
            ]
        };

        requestsDB.push(testReq);

        const stats = await AutomationService.runCycle({ dryRun: false });
        expect(stats.breachedCount).toBeGreaterThanOrEqual(1);

        const foundDetail = stats.details.find(d => d.reference === 'REQ-SLA-TEST-01');
        expect(foundDetail).toBeDefined();
        expect(foundDetail?.isBreached).toBe(true);
        expect(foundDetail?.elapsedHours).toBeGreaterThanOrEqual(49);
        expect(testReq.sla_breached).toBe(true);

        // Cleanup
        const idx = requestsDB.findIndex(r => r.reference === 'REQ-SLA-TEST-01');
        if (idx !== -1) requestsDB.splice(idx, 1);
    });

    it('devrait émettre un avertissement SLA à 80% du délai sans marquer breached', async () => {
        // Request created 20 hours ago with a 24h SLA (20 / 24 = 83.3% >= 80% warning threshold)
        const warningTimestamp = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
        const testReq: any = {
            id: 9992,
            reference: 'REQ-SLA-WARN-01',
            title: 'Demande à 80% du SLA',
            description: 'Test warning',
            status: 'En attente validation Manager',
            current_stage_index: 0,
            beneficiaire_id: 102,
            created_at: warningTimestamp,
            stages: [
                {
                    id: 'stg_1',
                    order: 1,
                    name: 'Validation Sécurité',
                    validator_role: 'Responsable Sécurité',
                    status: 'pending',
                    sla_hours: 24
                }
            ]
        };

        requestsDB.push(testReq);

        const stats = await AutomationService.runCycle({ dryRun: false });
        const foundDetail = stats.details.find(d => d.reference === 'REQ-SLA-WARN-01');
        expect(foundDetail).toBeDefined();
        expect(foundDetail?.isWarning).toBe(true);
        expect(foundDetail?.isBreached).toBe(false);
        expect(testReq.sla_warning).toBe(true);
        expect(testReq.sla_breached).toBeFalsy();

        // Cleanup
        const idx = requestsDB.findIndex(r => r.reference === 'REQ-SLA-WARN-01');
        if (idx !== -1) requestsDB.splice(idx, 1);
    });

    it('devrait démarrer et arrêter le daemon en arrière-plan', () => {
        expect(AutomationService.getStatus().daemonActive).toBe(false);

        AutomationService.startDaemon(10);
        expect(AutomationService.getStatus().daemonActive).toBe(true);
        expect(AutomationService.getStatus().intervalMinutes).toBe(10);

        AutomationService.stopDaemon();
        expect(AutomationService.getStatus().daemonActive).toBe(false);
    });

    it('devrait signer les payloads SIEM avec HMAC-SHA256', async () => {
        const payload = {
            eventType: 'TEST_SIEM_AUDIT',
            severity: 'INFO',
            timestamp: new Date().toISOString()
        };

        const globalFetch = global.fetch;
        let interceptedHeaders: any = null;

        // Mock external fetch for test
        global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
            interceptedHeaders = init.headers;
            return { ok: true, status: 200, json: async () => ({ status: 'received' }) } as any;
        });

        const dispatched = await AutomationService.dispatchSiemWebhook(payload, 'https://siem.enterprise.lan/webhook');
        expect(dispatched).toBe(true);
        expect(interceptedHeaders).toBeDefined();
        expect(interceptedHeaders['X-Signature-SHA256']).toMatch(/^sha256=[a-f0-9]{64}$/);
        expect(interceptedHeaders['X-SIEM-Source']).toBe('Workflow-Manager-SLA-Watchdog');

        global.fetch = globalFetch;
    });
});

describe('ProcessPackageService (Export & Import Portable Process Packages)', () => {
    it('devrait exporter un package complet avec manifest et empreinte SHA-256', async () => {
        // Setup a test process with form and rules
        const testProc: ProcessTemplate = {
            id: 8881,
            name: 'Processus Test Export Package',
            code: 'WF_TEST_PKG',
            category_id: 1,
            description: 'Workflow de test pour le package complet',
            status: 'Publié',
            stages: [
                {
                    id: 'stg_1',
                    order: 1,
                    name: 'Validation N+1',
                    validator_role: 'Manager',
                    sla_hours: 24
                }
            ],
            fields: []
        };
        processTemplates.push(testProc);

        // Add a linked form
        formTemplatesDatabase.push({
            id: 'form_test_8881',
            name: 'Formulaire Test 8881',
            code: 'WF_TEST_PKG',
            category_id: 1,
            description: 'Formulaire lié',
            status: 'Publié',
            linked_process_id: 8881,
            fields: [
                {
                    id: 'fld_1',
                    label: 'Motif de demande',
                    type: 'text',
                    required: true
                }
            ]
        });

        // Add a linked business rule
        businessRulesStore.push({
            id: 'rule_test_8881',
            code: 'RULE_PKG_8881',
            title: 'Règle Quota Test',
            description: 'Vérification quota',
            category: 'QUOTA',
            trigger_event: 'ON_SUBMIT',
            operator: 'EQUALS',
            action_type: 'BLOCK_TRANSITION',
            error_message: 'Quota dépassé',
            is_active: true,
            priority: 1,
            associated_processes: ['WF_TEST_PKG', '8881'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        const pkg = await ProcessPackageService.exportPackage(8881, 'TestAdmin');

        expect(pkg).toBeDefined();
        expect(pkg.manifest.packageId).toMatch(/^PKG_8881_/);
        expect(pkg.manifest.checksum).toHaveLength(64);
        expect(pkg.process.name).toBe('Processus Test Export Package');
        expect(pkg.formTemplate).toBeDefined();
        expect(pkg.formTemplate?.fields).toHaveLength(1);
        expect(pkg.businessRules).toHaveLength(1);

        // Test import of this package
        const importResult = await ProcessPackageService.importPackage(pkg, 'Auditor');
        expect(importResult.success).toBe(true);
        expect(importResult.processId).toBeGreaterThan(8881);
        expect(importResult.fieldsCount).toBe(1);
        expect(importResult.rulesCount).toBe(1);

        // Verify the newly created process exists in store
        const importedProc = processTemplates.find(p => p.id === importResult.processId);
        expect(importedProc).toBeDefined();
        expect(importedProc?.stages).toHaveLength(1);

        // Cleanup
        const pIdx = processTemplates.findIndex(p => p.id === 8881);
        if (pIdx !== -1) processTemplates.splice(pIdx, 1);
        const impIdx = processTemplates.findIndex(p => p.id === importResult.processId);
        if (impIdx !== -1) processTemplates.splice(impIdx, 1);
    });
});
