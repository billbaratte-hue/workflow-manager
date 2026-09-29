/**
 * @file server/services/affectationDynamique.service.ts
 * Dynamic Assignment Service for Mechatronic Requests (Epic 3 - User Story 3.1).
 * Automatically calculates assigned agents, validator groups, and routing paths based on business attributes.
 */

import { getDatabase } from '../db/database.js';

export interface DynamicAssignmentInput {
    processId?: number | string;
    processCode?: string;
    siteId?: number | string;
    siteName?: string;
    region?: string;
    equipmentType?: string;
    isTeamRequest?: boolean;
    durationHours?: number;
    beneficiaireService?: string;
}

export interface RoutingStage {
    index: number;
    name: string;
    assignedRole: string;
    assignedUserId?: number;
    assignedUserName?: string;
    slaHours: number;
    mandatory: boolean;
}

export interface DynamicAssignmentResult {
    ruleApplied: string;
    stages: RoutingStage[];
    initialStageIndex: number;
    targetValidatorGroup: string;
    escalationContact?: string;
}

export class AffectationDynamiqueService {
    /**
     * Calculates the dynamic assignment stages for a request based on operational workflow rules
     */
    static async resolveAssignment(input: DynamicAssignmentInput): Promise<DynamicAssignmentResult> {
        const db = await getDatabase();
        const stages: RoutingStage[] = [];

        // 1. Stage 1: Hierarchical / Team Validation
        if (input.isTeamRequest || (input.durationHours && input.durationHours > 72)) {
            stages.push({
                index: 0,
                name: 'Validation Hiérarchique (Manager d\'équipe)',
                assignedRole: 'Responsable d\'équipe',
                slaHours: 24,
                mandatory: true
            });
        }

        // 2. Stage 2: Technical / Site Validation
        let siteValidatorName: string | undefined;
        let siteValidatorId: number | undefined;

        if (input.siteId) {
            try {
                // Check if site has a dedicated validator
                const siteRecord = await db.get('SELECT rows FROM reference_tables WHERE LOWER(id) = \'sites\'');
                if (siteRecord && siteRecord.rows) {
                    const parsedSites = JSON.parse(siteRecord.rows);
                    const matched = parsedSites.find((s: any) => String(s.id) === String(input.siteId) || s.code === String(input.siteId));
                    if (matched && matched.referent) {
                        siteValidatorName = matched.referent;
                    }
                }
            } catch (e) {
                console.warn('[ROUTING] Could not query site referent:', e);
            }
        }

        stages.push({
            index: stages.length,
            name: input.siteName ? `Validation Technique & Sécurité (${input.siteName})` : 'Validation Technique Locale',
            assignedRole: 'Validateur de Site',
            assignedUserName: siteValidatorName,
            slaHours: 48,
            mandatory: true
        });

        // 3. Stage 3: Mechatronic Workshop / Régie Execution
        stages.push({
            index: stages.length,
            name: 'Délivrance & Encodage Matériel (Régie Mécatronique)',
            assignedRole: 'Gestionnaire Régie',
            slaHours: 24,
            mandatory: true
        });

        // Check for active delegations (if validator is delegated, re-route)
        try {
            const delegations = await db.all<{ delegator_email: string; substitute_email: string; substitute_name: string; is_active: number }>(
                'SELECT * FROM delegations WHERE is_active = 1'
            );
            if (delegations && siteValidatorName) {
                const delegation = delegations.find(d => d.delegator_email.toLowerCase().includes(siteValidatorName!.toLowerCase()));
                if (delegation) {
                    stages[1].assignedUserName = `${delegation.substitute_name} (Suppléant)`;
                }
            }
        } catch {
            // Table delegations might be in store or absent
        }

        return {
            ruleApplied: input.isTeamRequest ? 'RÈGLE_EQUIPE_SITE' : 'RÈGLE_STANDARD_LOCALE',
            stages,
            initialStageIndex: 0,
            targetValidatorGroup: siteValidatorName || 'Pool Validateurs Régionaux',
            escalationContact: 'Pôle Sécurité des Accès & Clés Mécatroniques'
        };
    }
}
