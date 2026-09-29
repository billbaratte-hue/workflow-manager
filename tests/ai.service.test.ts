/**
 * @file tests/ai.service.test.ts
 * Vitest Unit & Integration Tests for AiService, Controller and Routes.
 * Validates Gemini 3.8 Flash integration, Sovereign Heuristic Fallback,
 * EN 15864 / EN 16864 compliance, NIS 2 SoD audits, and Copilot Chat.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { AiService } from '../server/services/ai.service.js';
import { featureRepository } from '../server/repositories/feature.repository.js';

describe('Generative AI Service (AiService & Gemini / Sovereign Engine)', () => {
    beforeEach(async () => {
        try {
            await featureRepository.setEnabled('ai_demandes', true);
        } catch {}
    });

    describe('1. Statut du Moteur IA', () => {
        it('doit renvoyer le statut du service avec le modèle gemini-3.8-flash ou souverain', async () => {
            const status = await AiService.getStatus();
            expect(status).toBeDefined();
            expect(status.feature_enabled).toBe(true);
            expect(status.available).toBe(true);
            expect(['gemini', 'sovereign_heuristic']).toContain(status.provider);
            expect(['gemini-3.8-flash', 'sovereign-heuristic-v1']).toContain(status.model);
        });
    });

    describe('2. Analyse de Risque & Conformité Mécatronique (analyzeRequest)', () => {
        it('doit évaluer une demande standard avec niveau de risque faible ou modéré et conformité EN 15864', async () => {
            const result = await AiService.analyzeRequest({
                title: 'Contrôle périodique serrures Poste 2',
                description: 'Vérification semestrielle des cylindres mécatroniques en gare de Lyon.',
                site_name: 'Paris Gare de Lyon',
                equipment_type: 'Clé Mécatronique EN 15864'
            });

            expect(result).toBeDefined();
            expect(['Faible', 'Modéré', 'Élevé']).toContain(result.risk_level);
            expect(result.compliance_check).toMatch(/EN 15864|EN 16864|NIS 2/i);
            expect(result.key_points.length).toBeGreaterThan(0);
            expect(result.recommendation).toBeDefined();
            expect(result.analyzed_at).toBeDefined();
        });

        it('doit détecter un risque élevé lors d\'interventions haute tension ou caténaire de nuit', async () => {
            const result = await AiService.analyzeRequest({
                title: 'Intervention urgente nuit sous-station haute tension',
                description: 'Rétablissement alimentation caténaire 25kV suite à incident voie 1.',
                site_name: 'Sous-station Trappes',
                equipment_type: 'Clé Mécatronique EN 15864'
            });

            expect(result.risk_level).toBe('Élevé');
            expect(result.urgency).toMatch(/urgence|urgente|nuit/i);
            expect(result.recommendation).toMatch(/réserves|habilitation|électrique|24h/i);
        });
    });

    describe('3. Rédaction Assistée de Justification (assistDescription)', () => {
        it('doit enrichir un brouillon court avec les références aux normes et consignes de sécurité', async () => {
            const result = await AiService.assistDescription({
                draftText: 'Maintenance aiguillages',
                equipment_type: 'Clé Mécatronique EN 15864',
                site_name: 'Gare Montparnasse'
            });

            expect(result).toBeDefined();
            expect(result.suggested_text).toMatch(/Maintenance aiguillages|Gare Montparnasse/i);
            expect(result.suggested_text).toMatch(/EN 15864|EN 16864/i);
            expect(result.suggested_text).toMatch(/sécurité ferroviaire|registre d'accès/i);
        });
    });

    describe('4. Recommandation de Périmètre RBAC (recommendRoleFieldScope)', () => {
        it('doit recommander le principe du moindre privilège (PoLP) pour un rôle Demandeur', async () => {
            const tables = [
                { key: 'requests', availableFields: ['reference', 'beneficiaire', 'validation', 'comments'] },
                { key: 'syslog', availableFields: ['timestamp', 'actor', 'action'] },
                { key: 'users', availableFields: ['name', 'role', 'password'] }
            ];

            const rec = await AiService.recommendRoleFieldScope({
                roleName: 'Demandeur Prestataire',
                roleDesc: 'Technicien sous-traitant intervenant sur les voies',
                tables
            });

            expect(rec).toBeDefined();
            expect(rec.rationale).toBeDefined();
            expect(rec.recommended_scopes.requests).toBeDefined();
            expect(rec.recommended_scopes.requests.dataScope).toBe('own');
            expect(rec.safety_warnings.length).toBeGreaterThan(0);
        });
    });

    describe('5. Audit de Rôle & Séparation des Fonctions (auditRoleSimulation)', () => {
        it('doit détecter un conflit SoD lorsqu\'un rôle cumule administration et corbeille de validation', async () => {
            const conflictingRole = {
                id: 'custom_conflict',
                name: 'Super Validateur Admin',
                portalTabs: { admin: true, corbeille: true },
                tablePermissions: {
                    requests: { create: true, modify: true },
                    syslog: { read: true, delete: true }, // Infraction NIS 2
                    users: { modify: true }
                }
            };

            const audit = await AiService.auditRoleSimulation({
                role: conflictingRole,
                tables: [{ key: 'requests' }, { key: 'syslog' }, { key: 'users' }]
            });

            expect(audit).toBeDefined();
            expect(audit.compliance_score).toBeLessThan(80);
            expect(audit.sod_status).toBe('Attention requise');
            expect(audit.issues.some(i => i.includes('SoD') || i.includes('séparation'))).toBe(true);
            expect(audit.issues.some(i => i.includes('Syslog') || i.includes('NIS 2'))).toBe(true);
        });
    });

    describe('6. Copilote Conversationnel & FAQ Métier (chat)', () => {
        it('doit répondre précisément sur la norme EN 15864', async () => {
            const chatResult = await AiService.chat({
                message: 'Quelles sont les obligations de la norme EN 15864 ?'
            });

            expect(chatResult).toBeDefined();
            expect(chatResult.reply).toMatch(/15864/i);
            expect(chatResult.reply).toMatch(/mécatronique|clé|accès|sécurité/i);
            expect(chatResult.suggestions?.length).toBeGreaterThan(0);
        });

        it('doit expliquer la procédure E123 pour perte ou vol de matériel', async () => {
            const chatResult = await AiService.chat({
                message: 'Comment déclarer une clé perdue selon la procédure E123 ?'
            });

            expect(chatResult.reply).toMatch(/E123|liste noire|remplacement|stock/i);
        });
    });

    describe('7. Générateur de Workflow (suggestWorkflow)', () => {
        it('doit modéliser les étapes et rôles d\'un circuit de validation personnalisé', async () => {
            const workflow = await AiService.suggestWorkflow({
                description: 'Circuit d\'urgence pour intervention de nuit avec habilitation caténaire'
            });

            expect(workflow).toBeDefined();
            expect(workflow.workflow_name).toBeDefined();
            expect(workflow.stages.length).toBeGreaterThanOrEqual(2);
            expect(workflow.stages[0].assignedRole).toBeDefined();
            expect(workflow.stages[0].slaHours).toBeGreaterThan(0);
            expect(workflow.rules.length).toBeGreaterThan(0);
        });
    });

    afterAll(async () => {
        try {
            await featureRepository.setEnabled('ai_demandes', false);
        } catch {}
    });
});
