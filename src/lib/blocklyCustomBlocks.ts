/**
 * @file src/lib/blocklyCustomBlocks.ts
 * Enregistrement des blocs personnalisés Google Blockly pour le Moteur de Workflow.
 * Implémente les 7 catégories de blocs métier avec typage, couleurs normalisées et injection dynamique des champs.
 */

import * as Blockly from 'blockly';

declare global {
    interface Window {
        AntigravityWorkflowContext?: {
            getAvailableFields: () => [string, string][];
            getAvailableRoles?: () => [string, string][];
            getAvailableStatuses?: () => [string, string][];
        };
    }
}

// Couleurs conformes aux spécifications (Hues Blockly)
export const BLOCK_COLORS = {
    FORM_DATA: 30,    // Brun
    LOGIC: 210,       // Bleu
    VALUES: 120,      // Vert
    MUTATIONS: 35,    // Orange
    APPROVALS: 270,   // Violet
    NOTIFICATIONS: 330, // Rose
    INTEGRATIONS: 180 // Cyan
};

let blocksInitialized = false;

export function initCustomWorkflowBlocks() {
    if (blocksInitialized) return;

    // 1. BLOCS DONNÉES FORMULAIRE (Brun / 30)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "field_dynamic_value",
            "message0": "Champ formulaire %1",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "FIELD_KEY",
                    "options": function() {
                        if (typeof window !== 'undefined' && window.AntigravityWorkflowContext?.getAvailableFields) {
                            const fields = window.AntigravityWorkflowContext.getAvailableFields();
                            if (fields && fields.length > 0) return fields;
                        }
                        return [["Sélectionner un champ...", ""]];
                    }
                }
            ],
            "output": null,
            "colour": BLOCK_COLORS.FORM_DATA,
            "tooltip": "Extrait la valeur d'un champ issu du formulaire actif.",
            "helpUrl": ""
        },
        {
            "type": "field_entity_id",
            "message0": "Identifiant de la fiche (ID)",
            "output": "String",
            "colour": BLOCK_COLORS.FORM_DATA,
            "tooltip": "Référence unique de la demande ou de l'entité en cours d'évaluation."
        },
        {
            "type": "field_entity_status",
            "message0": "Statut actuel de la fiche",
            "output": "String",
            "colour": BLOCK_COLORS.FORM_DATA,
            "tooltip": "Statut opérationnel actuel de la fiche."
        }
    ]);

    // 2. BLOCS LOGIQUE & RÈGLES (Bleu / 210)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "rule_if_then_else",
            "message0": "Si %1 alors %2 sinon %3",
            "args0": [
                {
                    "type": "input_value",
                    "name": "CONDITION",
                    "check": "Boolean"
                },
                {
                    "type": "input_statement",
                    "name": "THEN_ACTIONS"
                },
                {
                    "type": "input_statement",
                    "name": "ELSE_ACTIONS"
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": BLOCK_COLORS.LOGIC,
            "tooltip": "Exécute les actions ALORS si la condition est vraie, sinon les actions SINON."
        },
        {
            "type": "rule_comparison",
            "message0": "%1 %2 %3",
            "args0": [
                {
                    "type": "input_value",
                    "name": "LEFT"
                },
                {
                    "type": "field_dropdown",
                    "name": "OPERATOR",
                    "options": [
                        ["=", "EQUALS"],
                        ["≠", "NOT_EQUALS"],
                        [">", "GREATER_THAN"],
                        ["<", "LESS_THAN"],
                        ["≥", "GREATER_EQUAL"],
                        ["≤", "LESS_EQUAL"],
                        ["contient", "CONTAINS"],
                        ["est vide", "IS_EMPTY"]
                    ]
                },
                {
                    "type": "input_value",
                    "name": "RIGHT"
                }
            ],
            "output": "Boolean",
            "colour": BLOCK_COLORS.LOGIC,
            "tooltip": "Compare deux valeurs."
        },
        {
            "type": "rule_logic_op",
            "message0": "%1 %2 %3",
            "args0": [
                {
                    "type": "input_value",
                    "name": "A",
                    "check": "Boolean"
                },
                {
                    "type": "field_dropdown",
                    "name": "OP",
                    "options": [
                        ["ET", "AND"],
                        ["OU", "OR"]
                    ]
                },
                {
                    "type": "input_value",
                    "name": "B",
                    "check": "Boolean"
                }
            ],
            "output": "Boolean",
            "colour": BLOCK_COLORS.LOGIC,
            "tooltip": "Opération logique ET / OU entre deux conditions."
        },
        {
            "type": "rule_not",
            "message0": "NON %1",
            "args0": [
                {
                    "type": "input_value",
                    "name": "CONDITION",
                    "check": "Boolean"
                }
            ],
            "output": "Boolean",
            "colour": BLOCK_COLORS.LOGIC,
            "tooltip": "Inverse le résultat booléen d'une condition."
        }
    ]);

    // 3. BLOCS VALEURS CONSTANTES (Vert / 120)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "val_text",
            "message0": "Texte %1",
            "args0": [
                {
                    "type": "field_input",
                    "name": "TEXT_VALUE",
                    "text": ""
                }
            ],
            "output": "String",
            "colour": BLOCK_COLORS.VALUES,
            "tooltip": "Chaîne de caractères constante."
        },
        {
            "type": "val_number",
            "message0": "Nombre %1",
            "args0": [
                {
                    "type": "field_number",
                    "name": "NUM_VALUE",
                    "value": 0
                }
            ],
            "output": "Number",
            "colour": BLOCK_COLORS.VALUES,
            "tooltip": "Valeur numérique constante."
        },
        {
            "type": "val_boolean",
            "message0": "%1",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "BOOL_VALUE",
                    "options": [
                        ["VRAI", "TRUE"],
                        ["FAUX", "FALSE"]
                    ]
                }
            ],
            "output": "Boolean",
            "colour": BLOCK_COLORS.VALUES,
            "tooltip": "Constante booléenne VRAI ou FAUX."
        },
        {
            "type": "val_status",
            "message0": "Statut %1",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "STATUS_CODE",
                    "options": function() {
                        if (typeof window !== 'undefined' && window.AntigravityWorkflowContext?.getAvailableStatuses) {
                            const statuses = window.AntigravityWorkflowContext.getAvailableStatuses();
                            if (statuses && statuses.length > 0) return statuses;
                        }
                        return [
                            ["BROUILLON", "BROUILLON"],
                            ["EN_ATTENTE_MANAGER", "EN_ATTENTE_MANAGER"],
                            ["VALIDE_MANAGER", "VALIDE_MANAGER"],
                            ["VALIDE_AUTOMATIQUEMENT", "VALIDE_AUTOMATIQUEMENT"],
                            ["APPROUVE", "APPROUVE"],
                            ["REFUSE", "REFUSE"],
                            ["CLOS", "CLOS"]
                        ];
                    }
                }
            ],
            "output": "String",
            "colour": BLOCK_COLORS.VALUES,
            "tooltip": "Sélection d'un statut métier standard du portail."
        }
    ]);

    // 4. BLOCS MISES À JOUR (Orange / 35)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "action_update_status",
            "message0": "Changer le statut vers %1",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "TARGET_STATUS",
                    "options": function() {
                        if (typeof window !== 'undefined' && window.AntigravityWorkflowContext?.getAvailableStatuses) {
                            const statuses = window.AntigravityWorkflowContext.getAvailableStatuses();
                            if (statuses && statuses.length > 0) return statuses;
                        }
                        return [
                            ["VALIDE_AUTOMATIQUEMENT", "VALIDE_AUTOMATIQUEMENT"],
                            ["EN_ATTENTE_MANAGER", "EN_ATTENTE_MANAGER"],
                            ["VALIDE_MANAGER", "VALIDE_MANAGER"],
                            ["APPROUVE", "APPROUVE"],
                            ["REFUSE", "REFUSE"],
                            ["EN_COURS_TRAITEMENT", "EN_COURS_TRAITEMENT"]
                        ];
                    }
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": BLOCK_COLORS.MUTATIONS,
            "tooltip": "Met à jour immédiatement le statut de l'entité évaluée."
        },
        {
            "type": "action_update_field",
            "message0": "Modifier le champ %1 avec la valeur %2",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "FIELD_KEY",
                    "options": function() {
                        if (typeof window !== 'undefined' && window.AntigravityWorkflowContext?.getAvailableFields) {
                            const fields = window.AntigravityWorkflowContext.getAvailableFields();
                            if (fields && fields.length > 0) return fields;
                        }
                        return [["Sélectionner un champ...", ""]];
                    }
                },
                {
                    "type": "input_value",
                    "name": "NEW_VALUE"
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": BLOCK_COLORS.MUTATIONS,
            "tooltip": "Affecte une nouvelle valeur à un champ du payload de l'entité."
        }
    ]);

    // 5. BLOCS APPROBATIONS (Violet / 270)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "action_request_approval",
            "message0": "Exiger l'approbation du rôle %1 (Délai SLA: %2 h) %3 Si Approuvé : %4 Si Rejeté : %5",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "APPROVER_ROLE",
                    "options": function() {
                        if (typeof window !== 'undefined' && window.AntigravityWorkflowContext?.getAvailableRoles) {
                            const roles = window.AntigravityWorkflowContext.getAvailableRoles();
                            if (roles && roles.length > 0) return roles;
                        }
                        return [
                            ["Manager N+1", "Manager N+1"],
                            ["Validateur Site", "Validateur Site"],
                            ["Responsable Sécurité", "Responsable Sécurité"],
                            ["Pôle RH", "Pôle RH"],
                            ["Direction Métier", "Direction Métier"]
                        ];
                    }
                },
                {
                    "type": "field_number",
                    "name": "SLA_HOURS",
                    "value": 24,
                    "min": 1,
                    "max": 720
                },
                {
                    "type": "input_dummy"
                },
                {
                    "type": "input_statement",
                    "name": "ON_APPROVED"
                },
                {
                    "type": "input_statement",
                    "name": "ON_REJECTED"
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": BLOCK_COLORS.APPROVALS,
            "tooltip": "Crée un point d'arrêt humain dans le workflow nécessitant la décision d'un acteur habilité."
        }
    ]);

    // 6. BLOCS NOTIFICATIONS (Rose / 330)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "action_send_notification",
            "message0": "Notifier canal %1 destinataire %2 message %3",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "CHANNEL",
                    "options": [
                        ["In-App (Portail)", "IN_APP"],
                        ["Courriel (Email)", "EMAIL"],
                        ["Les deux (In-App + Email)", "BOTH"]
                    ]
                },
                {
                    "type": "field_dropdown",
                    "name": "RECIPIENT",
                    "options": function() {
                        return [
                            ["Demandeur / Initiateur", "Demandeur"],
                            ["Manager N+1", "Manager N+1"],
                            ["Validateur Site", "Validateur Site"],
                            ["Responsable Sécurité", "Responsable Sécurité"],
                            ["Administrateur Système", "Administrateur"]
                        ];
                    }
                },
                {
                    "type": "field_input",
                    "name": "MESSAGE_TEXT",
                    "text": "Une mise à jour requiert votre attention."
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": BLOCK_COLORS.NOTIFICATIONS,
            "tooltip": "Transmet une notification d'alerte en temps réel sur le portail ou par email."
        }
    ]);

    // 7. BLOCS INTÉGRATIONS API (Cyan / 180)
    Blockly.common.defineBlocksWithJsonArray([
        {
            "type": "action_call_webhook",
            "message0": "Webhook HTTP %1 URL %2",
            "args0": [
                {
                    "type": "field_dropdown",
                    "name": "METHOD",
                    "options": [
                        ["POST", "POST"],
                        ["PUT", "PUT"],
                        ["GET", "GET"]
                    ]
                },
                {
                    "type": "field_input",
                    "name": "URL",
                    "text": "https://api.entreprise.lan/webhooks/workflow"
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": BLOCK_COLORS.INTEGRATIONS,
            "tooltip": "Appelle un webhook externe REST sécurisé avec le payload de l'entité."
        }
    ]);

    blocksInitialized = true;
}

/**
 * Boîte à outils (Toolbox XML / JSON) organisée selon les 7 catégories de la spécification
 */
export const WORKFLOW_TOOLBOX = {
    kind: "categoryToolbox",
    contents: [
        {
            kind: "category",
            name: "Données Formulaire",
            colour: String(BLOCK_COLORS.FORM_DATA),
            contents: [
                { kind: "block", type: "field_dynamic_value" },
                { kind: "block", type: "field_entity_id" },
                { kind: "block", type: "field_entity_status" }
            ]
        },
        {
            kind: "category",
            name: "Logique & Règles",
            colour: String(BLOCK_COLORS.LOGIC),
            contents: [
                { kind: "block", type: "rule_if_then_else" },
                { kind: "block", type: "rule_comparison" },
                { kind: "block", type: "rule_logic_op" },
                { kind: "block", type: "rule_not" }
            ]
        },
        {
            kind: "category",
            name: "Valeurs",
            colour: String(BLOCK_COLORS.VALUES),
            contents: [
                { kind: "block", type: "val_text" },
                { kind: "block", type: "val_number" },
                { kind: "block", type: "val_boolean" },
                { kind: "block", type: "val_status" }
            ]
        },
        {
            kind: "category",
            name: "Mises à Jour",
            colour: String(BLOCK_COLORS.MUTATIONS),
            contents: [
                { kind: "block", type: "action_update_status" },
                { kind: "block", type: "action_update_field" }
            ]
        },
        {
            kind: "category",
            name: "Approbations",
            colour: String(BLOCK_COLORS.APPROVALS),
            contents: [
                { kind: "block", type: "action_request_approval" }
            ]
        },
        {
            kind: "category",
            name: "Notifications",
            colour: String(BLOCK_COLORS.NOTIFICATIONS),
            contents: [
                { kind: "block", type: "action_send_notification" }
            ]
        },
        {
            kind: "category",
            name: "Intégrations API",
            colour: String(BLOCK_COLORS.INTEGRATIONS),
            contents: [
                { kind: "block", type: "action_call_webhook" }
            ]
        }
    ]
};
