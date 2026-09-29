/**
 * @file server/services/champsConditionnels.service.ts
 * Conditional Form Fields Rules Engine (Epic 3 - User Story 3.2).
 * Evaluates dynamic rules on form payloads to enforce contextual requirements and visibility.
 */

export interface FieldConditionRule {
    fieldKey: string;
    dependsOn: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'greater_than';
    expectedValue: any;
    action: 'require' | 'show' | 'hide' | 'disable';
    errorMessage?: string;
}

export const DEFAULT_CONDITIONAL_RULES: FieldConditionRule[] = [
    {
        fieldKey: 'gps_latitude',
        dependsOn: 'equipment_type',
        operator: 'in',
        expectedValue: ['CYLINDER_ORDER', 'Cylindre Mécatronique', 'TERMINAL_ORDER', 'Borne de Mise à Jour'],
        action: 'require',
        errorMessage: 'Les coordonnées GPS de pose sont obligatoires pour les cylindres et bornes mécatroniques.'
    },
    {
        fieldKey: 'gps_longitude',
        dependsOn: 'equipment_type',
        operator: 'in',
        expectedValue: ['CYLINDER_ORDER', 'Cylindre Mécatronique', 'TERMINAL_ORDER', 'Borne de Mise à Jour'],
        action: 'require',
        errorMessage: 'La longitude GPS est obligatoire pour la localisation des cylindres.'
    },
    {
        fieldKey: 'team_name',
        dependsOn: 'is_team_request',
        operator: 'equals',
        expectedValue: true,
        action: 'require',
        errorMessage: 'Le nom du collectif ou de l\'équipe projet est obligatoire.'
    },
    {
        fieldKey: 'team_members',
        dependsOn: 'is_team_request',
        operator: 'equals',
        expectedValue: true,
        action: 'require',
        errorMessage: 'Veuillez renseigner au moins un membre d\'équipe pour une demande collective.'
    },
    {
        fieldKey: 'selected_sites',
        dependsOn: 'scope_type',
        operator: 'equals',
        expectedValue: 'multi_site',
        action: 'require',
        errorMessage: 'Veuillez sélectionner au moins deux sites pour un périmètre multi-sites.'
    },
    {
        fieldKey: 'safety_accreditation_number',
        dependsOn: 'zone_criticite',
        operator: 'in',
        expectedValue: ['Haute Sûreté (Niveau 3)', 'Zone Dangereuse Électrifiée 25kV'],
        action: 'require',
        errorMessage: 'Le numéro d\'habilitation de sécurité électrique est obligatoire pour cette zone.'
    }
];

export interface EvaluationResult {
    isValid: boolean;
    errors: Record<string, string>;
    visibleFields: string[];
    requiredFields: string[];
}

export class ChampsConditionnelsService {
    /**
     * Evaluates a payload against a list of conditional rules
     */
    static evaluate(
        formData: Record<string, any>,
        rules: FieldConditionRule[] = DEFAULT_CONDITIONAL_RULES
    ): EvaluationResult {
        const errors: Record<string, string> = {};
        const requiredFields = new Set<string>();
        const hiddenFields = new Set<string>();

        for (const rule of rules) {
            const depValue = formData[rule.dependsOn];
            let matches = false;

            switch (rule.operator) {
                case 'equals':
                    matches = depValue === rule.expectedValue;
                    break;
                case 'not_equals':
                    matches = depValue !== rule.expectedValue;
                    break;
                case 'in':
                    matches = Array.isArray(rule.expectedValue) && rule.expectedValue.includes(depValue);
                    break;
                case 'contains':
                    matches = Array.isArray(depValue) && depValue.includes(rule.expectedValue);
                    break;
                case 'greater_than':
                    matches = Number(depValue) > Number(rule.expectedValue);
                    break;
                default:
                    matches = false;
            }

            if (matches) {
                if (rule.action === 'require') {
                    requiredFields.add(rule.fieldKey);
                    const val = formData[rule.fieldKey];
                    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                        errors[rule.fieldKey] = rule.errorMessage || `Le champ ${rule.fieldKey} est requis.`;
                    }
                } else if (rule.action === 'hide') {
                    hiddenFields.add(rule.fieldKey);
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            visibleFields: Object.keys(formData).filter(k => !hiddenFields.has(k)),
            requiredFields: Array.from(requiredFields)
        };
    }
}
