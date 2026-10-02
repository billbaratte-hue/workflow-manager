/**
 * @file server/services/blocklyEngine.service.ts
 * Moteur d'évaluation et orchestrateur d'exécution de règles métier issues de Google Blockly.
 * Interprète l'Arbre Syntaxique Abstrait (AST JSON) et applique les mutations, approbations et notifications.
 */

import { getDatabase, ISqliteDb } from '../db/database.js';
import axios from 'axios';

export interface ASTExpression {
    type: 'LOGICAL' | 'COMPARISON' | 'FIELD' | 'LITERAL' | 'NOT';
    operator?: string; // AND, OR, EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, GREATER_EQUAL, LESS_EQUAL, CONTAINS, IS_EMPTY
    left?: ASTExpression;
    right?: ASTExpression;
    key?: string;
    value?: any;
}

export interface ASTAction {
    type: 'UPDATE_STATUS' | 'UPDATE_FIELD' | 'APPROVAL' | 'NOTIFICATION' | 'WEBHOOK';
    status?: string;
    field_key?: string;
    value?: any;
    role?: string;
    sla_hours?: number;
    on_approved?: ASTAction[];
    on_rejected?: ASTAction[];
    channel?: 'IN_APP' | 'EMAIL' | 'BOTH';
    recipient?: string;
    message?: string;
    url?: string;
    method?: string;
    payload?: any;
}

export interface ASTRuleNode {
    id?: string;
    type: 'CONDITION';
    condition: ASTExpression;
    then_actions: ASTAction[];
    else_actions?: ASTAction[];
}

export interface WorkflowAST {
    version: string;
    name: string;
    schema_id: string;
    trigger_type: 'ON_SUBMIT' | 'ON_STATUS_CHANGE' | 'ON_UPDATE';
    rules: ASTRuleNode[];
}

export interface StepLog {
    timestamp: string;
    type: 'EVAL_CONDITION' | 'EXEC_ACTION' | 'SKIP_ACTION' | 'INFO' | 'ERROR';
    description: string;
    details?: any;
    result?: boolean | string | any;
}

export interface SimulationResult {
    workflow_name: string;
    trigger_type: string;
    schema_id: string;
    status: 'SUCCESS' | 'CONDITION_MET' | 'CONDITION_UNMET' | 'ERROR';
    actions_to_execute: ASTAction[];
    modified_payload: Record<string, any>;
    logs: StepLog[];
    execution_time_ms: number;
}

export interface ExecutionResult {
    instance_id: string;
    workflow_id: string;
    entity_id: string;
    status: 'SUCCESS' | 'PENDING_APPROVAL' | 'FAILED' | 'CONDITION_UNMET';
    executed_actions: ASTAction[];
    logs: StepLog[];
    approval_state?: {
        pending_role: string;
        sla_hours: number;
        created_at: string;
    };
}

export class BlocklyEngineService {
    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        return await getDatabase();
    }

    /**
     * Valide la structure de l'AST JSON fourni
     */
    validateAST(ast: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (!ast || typeof ast !== 'object') {
            return { valid: false, errors: ['L\'AST fourni doit être un objet JSON valide.'] };
        }
        if (!ast.schema_id) {
            errors.push('Le champ "schema_id" est requis dans l\'AST.');
        }
        if (!ast.trigger_type) {
            errors.push('Le champ "trigger_type" est requis dans l\'AST.');
        }
        if (ast.rules !== undefined && !Array.isArray(ast.rules)) {
            errors.push('Le champ "rules" doit être un tableau.');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Résout la valeur d'une expression ou d'un champ dynamique
     */
    resolveValue(expr: ASTExpression, payload: Record<string, any>, logs: StepLog[]): any {
        if (!expr) return null;

        if (expr.type === 'LITERAL') {
            return expr.value;
        }

        if (expr.type === 'FIELD') {
            const key = expr.key || '';
            const val = payload[key];
            logs.push({
                timestamp: new Date().toISOString(),
                type: 'INFO',
                description: `Extraction champ formulaire "${key}"`,
                details: { key, resolved_value: val }
            });
            return val;
        }

        if (expr.type === 'NOT') {
            const sub = this.evaluateCondition(expr.left!, payload, logs);
            return !sub;
        }

        return this.evaluateCondition(expr, payload, logs);
    }

    /**
     * Évalue récursivement un prédicat logique ou de comparaison
     */
    evaluateCondition(expr: ASTExpression, payload: Record<string, any>, logs: StepLog[]): boolean {
        if (!expr) return false;

        const op = (expr.operator || '').toUpperCase();

        if (expr.type === 'LOGICAL') {
            if (op === 'AND' || op === 'ET') {
                const left = this.evaluateCondition(expr.left!, payload, logs);
                if (!left) {
                    logs.push({
                        timestamp: new Date().toISOString(),
                        type: 'EVAL_CONDITION',
                        description: 'Évaluation ET logique : faux dès la première opérande.',
                        result: false
                    });
                    return false;
                }
                const right = this.evaluateCondition(expr.right!, payload, logs);
                return left && right;
            }

            if (op === 'OR' || op === 'OU') {
                const left = this.evaluateCondition(expr.left!, payload, logs);
                if (left) {
                    logs.push({
                        timestamp: new Date().toISOString(),
                        type: 'EVAL_CONDITION',
                        description: 'Évaluation OU logique : vrai dès la première opérande.',
                        result: true
                    });
                    return true;
                }
                const right = this.evaluateCondition(expr.right!, payload, logs);
                return right;
            }
        }

        if (expr.type === 'COMPARISON') {
            const leftVal = this.resolveValue(expr.left!, payload, logs);
            const rightVal = this.resolveValue(expr.right!, payload, logs);

            let res = false;
            switch (op) {
                case 'EQUALS':
                case '=':
                case '==':
                    res = String(leftVal) === String(rightVal);
                    break;
                case 'NOT_EQUALS':
                case '!=':
                case '<>':
                    res = String(leftVal) !== String(rightVal);
                    break;
                case 'GREATER_THAN':
                case '>':
                    res = Number(leftVal) > Number(rightVal);
                    break;
                case 'LESS_THAN':
                case '<':
                    res = Number(leftVal) < Number(rightVal);
                    break;
                case 'GREATER_EQUAL':
                case '>=':
                    res = Number(leftVal) >= Number(rightVal);
                    break;
                case 'LESS_EQUAL':
                case '<=':
                    res = Number(leftVal) <= Number(rightVal);
                    break;
                case 'CONTAINS':
                case 'CONTIENT':
                    res = String(leftVal || '').toLowerCase().includes(String(rightVal || '').toLowerCase());
                    break;
                case 'IS_EMPTY':
                case 'EST_VIDE':
                    res = leftVal === null || leftVal === undefined || leftVal === '';
                    break;
                default:
                    res = String(leftVal) === String(rightVal);
            }

            logs.push({
                timestamp: new Date().toISOString(),
                type: 'EVAL_CONDITION',
                description: `Comparaison [${String(leftVal)}] ${op} [${String(rightVal)}]`,
                result: res
            });

            return res;
        }

        return false;
    }

    /**
     * Simule l'exécution de l'AST contre un échantillon de données sans impacter la base
     */
    async simulateWorkflow(ast: WorkflowAST, samplePayload: Record<string, any>): Promise<SimulationResult> {
        const start = Date.now();
        const logs: StepLog[] = [];
        const actionsToExecute: ASTAction[] = [];
        const modifiedPayload = { ...samplePayload };

        logs.push({
            timestamp: new Date().toISOString(),
            type: 'INFO',
            description: `Démarrage de la simulation pour le workflow "${ast.name || 'Sans Nom'}" (Déclencheur: ${ast.trigger_type})`
        });

        const validation = this.validateAST(ast);
        if (!validation.valid) {
            logs.push({
                timestamp: new Date().toISOString(),
                type: 'ERROR',
                description: 'Erreur de validation de l\'AST : ' + validation.errors.join('; ')
            });
            return {
                workflow_name: ast.name || '',
                trigger_type: ast.trigger_type || 'ON_SUBMIT',
                schema_id: ast.schema_id || '',
                status: 'ERROR',
                actions_to_execute: [],
                modified_payload: samplePayload,
                logs,
                execution_time_ms: Date.now() - start
            };
        }

        let conditionMetOverall = false;

        if (!ast.rules || ast.rules.length === 0) {
            logs.push({
                timestamp: new Date().toISOString(),
                type: 'INFO',
                description: 'Espace de travail vierge : aucune règle conditionnelle définie. Aucune action automatique à déclencher.'
            });
            return {
                workflow_name: ast.name || 'Flux sans nom',
                trigger_type: ast.trigger_type || 'ON_SUBMIT',
                schema_id: ast.schema_id || 'default_schema',
                status: 'CONDITION_UNMET',
                actions_to_execute: [],
                modified_payload: samplePayload,
                logs,
                execution_time_ms: Date.now() - start
            };
        }

        for (let i = 0; i < (ast.rules || []).length; i++) {
            const rule = ast.rules[i];
            logs.push({
                timestamp: new Date().toISOString(),
                type: 'INFO',
                description: `Évaluation de la règle #${i + 1}`
            });

            const conditionResult = this.evaluateCondition(rule.condition, modifiedPayload, logs);

            if (conditionResult) {
                conditionMetOverall = true;
                logs.push({
                    timestamp: new Date().toISOString(),
                    type: 'INFO',
                    description: `Règle #${i + 1} validée : déclenchement des actions ALORS (${(rule.then_actions || []).length} action(s))`
                });

                for (const action of rule.then_actions || []) {
                    actionsToExecute.push(action);
                    this.applyActionSimulated(action, modifiedPayload, logs);
                }
            } else {
                logs.push({
                    timestamp: new Date().toISOString(),
                    type: 'INFO',
                    description: `Règle #${i + 1} non satisfaite : déclenchement des actions SINON (${(rule.else_actions || []).length} action(s))`
                });

                for (const action of rule.else_actions || []) {
                    actionsToExecute.push(action);
                    this.applyActionSimulated(action, modifiedPayload, logs);
                }
            }
        }

        return {
            workflow_name: ast.name,
            trigger_type: ast.trigger_type,
            schema_id: ast.schema_id,
            status: conditionMetOverall ? 'CONDITION_MET' : 'CONDITION_UNMET',
            actions_to_execute: actionsToExecute,
            modified_payload: modifiedPayload,
            logs,
            execution_time_ms: Date.now() - start
        };
    }

    private applyActionSimulated(action: ASTAction, payload: Record<string, any>, logs: StepLog[]) {
        switch (action.type) {
            case 'UPDATE_STATUS':
                payload['status'] = action.status;
                logs.push({
                    timestamp: new Date().toISOString(),
                    type: 'EXEC_ACTION',
                    description: `Action Simuler Mutation Statut → "${action.status}"`,
                    details: { status: action.status }
                });
                break;
            case 'UPDATE_FIELD':
                if (action.field_key) {
                    payload[action.field_key] = action.value;
                    logs.push({
                        timestamp: new Date().toISOString(),
                        type: 'EXEC_ACTION',
                        description: `Action Simuler Mise à jour Champ "${action.field_key}" → "${action.value}"`,
                        details: { field: action.field_key, value: action.value }
                    });
                }
                break;
            case 'APPROVAL':
                logs.push({
                    timestamp: new Date().toISOString(),
                    type: 'EXEC_ACTION',
                    description: `Action Simuler Point d'Approbation : Requête au rôle "${action.role || 'Manager'}" (SLA: ${action.sla_hours || 24}h)`,
                    details: action
                });
                break;
            case 'NOTIFICATION':
                logs.push({
                    timestamp: new Date().toISOString(),
                    type: 'EXEC_ACTION',
                    description: `Action Simuler Notification (${action.channel || 'IN_APP'}) à "${action.recipient}" : "${action.message}"`,
                    details: action
                });
                break;
            case 'WEBHOOK':
                logs.push({
                    timestamp: new Date().toISOString(),
                    type: 'EXEC_ACTION',
                    description: `Action Simuler Appel Webhook [${action.method || 'POST'}] ${action.url}`,
                    details: action
                });
                break;
        }
    }

    /**
     * Exécute un workflow réel en persistant les mutations, notifications et traces en base
     */
    async executeWorkflow(
        workflowId: string,
        entityId: string,
        payload: Record<string, any>,
        context: { user_id?: number; user_name?: string; user_email?: string } = {}
    ): Promise<ExecutionResult> {
        const db = await this.getDb();
        const logs: StepLog[] = [];
        const instanceId = 'inst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        logs.push({
            timestamp: new Date().toISOString(),
            type: 'INFO',
            description: `Démarrage de l'instance de workflow ${instanceId} pour l'entité ${entityId}`
        });

        const wfRow = await db.get<any>('SELECT * FROM workflow_definitions WHERE id = ?', workflowId);
        if (!wfRow) {
            throw new Error(`Workflow definition "${workflowId}" introuvable.`);
        }

        let ast: WorkflowAST;
        try {
            ast = typeof wfRow.ast_json === 'string' ? JSON.parse(wfRow.ast_json) : wfRow.ast_json;
        } catch {
            throw new Error(`Format AST invalide pour le workflow ${workflowId}.`);
        }

        const executedActions: ASTAction[] = [];
        let finalStatus: 'SUCCESS' | 'PENDING_APPROVAL' | 'FAILED' | 'CONDITION_UNMET' = 'SUCCESS';
        let approvalState: any = null;

        for (const rule of ast.rules || []) {
            const conditionMet = this.evaluateCondition(rule.condition, payload, logs);
            const targetActions = conditionMet ? (rule.then_actions || []) : (rule.else_actions || []);

            if (!conditionMet && (!rule.else_actions || rule.else_actions.length === 0)) {
                finalStatus = 'CONDITION_UNMET';
            }

            for (const action of targetActions) {
                executedActions.push(action);
                try {
                    if (action.type === 'UPDATE_STATUS' && action.status) {
                        // Met à jour la table dynamic_entities ou requests
                        await db.run('UPDATE dynamic_entities SET status = ?, updated_at = ? WHERE id = ?', action.status, new Date().toISOString(), entityId);
                        try {
                            await db.run('UPDATE requests SET status = ? WHERE id = ? OR reference = ?', action.status, entityId, entityId);
                        } catch {}
                        logs.push({
                            timestamp: new Date().toISOString(),
                            type: 'EXEC_ACTION',
                            description: `Mutation d'état appliquée avec succès : ${action.status}`
                        });
                    } else if (action.type === 'UPDATE_FIELD' && action.field_key) {
                        payload[action.field_key] = action.value;
                        await db.run('UPDATE dynamic_entities SET payload_json = ?, updated_at = ? WHERE id = ?', JSON.stringify(payload), new Date().toISOString(), entityId);
                        logs.push({
                            timestamp: new Date().toISOString(),
                            type: 'EXEC_ACTION',
                            description: `Champ "${action.field_key}" mis à jour avec la valeur "${action.value}"`
                        });
                    } else if (action.type === 'NOTIFICATION') {
                        const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                        await db.run(
                            `INSERT INTO notifications (id, target_user_id, target_role, target_email, type, title, message, link, reference, urgent, read, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            notifId,
                            context.user_id || null,
                            action.recipient || 'Demandeur',
                            context.user_email || null,
                            'WORKFLOW_ALERT',
                            `Alerte Automatique: ${ast.name}`,
                            action.message || 'Notification déclenchée par le moteur de règles.',
                            `/requests/${entityId}`,
                            entityId,
                            1,
                            0,
                            new Date().toISOString()
                        );
                        logs.push({
                            timestamp: new Date().toISOString(),
                            type: 'EXEC_ACTION',
                            description: `Notification in-app enregistrée pour "${action.recipient}"`
                        });
                    } else if (action.type === 'APPROVAL') {
                        finalStatus = 'PENDING_APPROVAL';
                        approvalState = {
                            pending_role: action.role || 'Manager N+1',
                            sla_hours: action.sla_hours || 24,
                            created_at: new Date().toISOString()
                        };
                        logs.push({
                            timestamp: new Date().toISOString(),
                            type: 'EXEC_ACTION',
                            description: `Mise en attente d'approbation humaine par le rôle "${approvalState.pending_role}"`
                        });
                    } else if (action.type === 'WEBHOOK' && action.url) {
                        logs.push({
                            timestamp: new Date().toISOString(),
                            type: 'EXEC_ACTION',
                            description: `Envoi Webhook HTTP vers ${action.url}`
                        });
                        // Appel webhook non bloquant avec timeout de 5000ms
                        try {
                            await axios({
                                method: (action.method || 'POST') as any,
                                url: action.url,
                                data: {
                                    event: ast.trigger_type,
                                    workflow_id: workflowId,
                                    entity_id: entityId,
                                    payload
                                },
                                timeout: 5000
                            });
                            logs.push({
                                timestamp: new Date().toISOString(),
                                type: 'INFO',
                                description: `Webhook délivré avec succès à ${action.url}`
                            });
                        } catch (err: any) {
                            logs.push({
                                timestamp: new Date().toISOString(),
                                type: 'ERROR',
                                description: `Erreur appel Webhook : ${err.message}`
                            });
                        }
                    }
                } catch (actionErr: any) {
                    logs.push({
                        timestamp: new Date().toISOString(),
                        type: 'ERROR',
                        description: `Échec exécution action ${action.type}: ${actionErr.message}`
                    });
                }
            }
        }

        // Persistance de l'instance d'exécution
        await db.run(
            `INSERT INTO workflow_instances (id, workflow_id, entity_id, trigger_type, status, execution_log, approval_state, executed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            instanceId,
            workflowId,
            entityId,
            ast.trigger_type,
            finalStatus,
            JSON.stringify(logs),
            approvalState ? JSON.stringify(approvalState) : null,
            new Date().toISOString()
        );

        return {
            instance_id: instanceId,
            workflow_id: workflowId,
            entity_id: entityId,
            status: finalStatus,
            executed_actions: executedActions,
            logs,
            approval_state: approvalState
        };
    }
}

export const blocklyEngineService = new BlocklyEngineService();
