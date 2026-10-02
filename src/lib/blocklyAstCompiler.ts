/**
 * @file src/lib/blocklyAstCompiler.ts
 * Compilateur d'Arbre Syntaxique Abstrait (AST JSON) et sérialiseur XML pour Google Blockly.
 * Transforme les blocs du workspace en une structure AST exploitable par le Rule Engine backend.
 */

import * as Blockly from 'blockly';
import { ASTExpression, ASTAction, ASTRuleNode, WorkflowAST } from '../../server/services/blocklyEngine.service';

export function compileExpression(block: Blockly.Block | null): ASTExpression | null {
    if (!block) return null;

    switch (block.type) {
        case 'field_dynamic_value':
            return {
                type: 'FIELD',
                key: block.getFieldValue('FIELD_KEY') || ''
            };

        case 'field_entity_id':
            return {
                type: 'FIELD',
                key: 'id'
            };

        case 'field_entity_status':
            return {
                type: 'FIELD',
                key: 'status'
            };

        case 'val_text':
            return {
                type: 'LITERAL',
                value: block.getFieldValue('TEXT_VALUE') || ''
            };

        case 'val_number':
            return {
                type: 'LITERAL',
                value: Number(block.getFieldValue('NUM_VALUE') || 0)
            };

        case 'val_boolean':
            return {
                type: 'LITERAL',
                value: block.getFieldValue('BOOL_VALUE') === 'TRUE'
            };

        case 'val_status':
            return {
                type: 'LITERAL',
                value: block.getFieldValue('STATUS_CODE') || ''
            };

        case 'rule_comparison': {
            const leftBlock = block.getInputTargetBlock('LEFT');
            const rightBlock = block.getInputTargetBlock('RIGHT');
            const op = block.getFieldValue('OPERATOR') || 'EQUALS';
            return {
                type: 'COMPARISON',
                operator: op,
                left: compileExpression(leftBlock) || { type: 'LITERAL', value: '' },
                right: compileExpression(rightBlock) || { type: 'LITERAL', value: '' }
            };
        }

        case 'rule_logic_op': {
            const aBlock = block.getInputTargetBlock('A');
            const bBlock = block.getInputTargetBlock('B');
            const op = block.getFieldValue('OP') || 'AND';
            return {
                type: 'LOGICAL',
                operator: op,
                left: compileExpression(aBlock) || { type: 'LITERAL', value: false },
                right: compileExpression(bBlock) || { type: 'LITERAL', value: false }
            };
        }

        case 'rule_not': {
            const condBlock = block.getInputTargetBlock('CONDITION');
            return {
                type: 'NOT',
                left: compileExpression(condBlock) || { type: 'LITERAL', value: false }
            };
        }

        default:
            return {
                type: 'LITERAL',
                value: block.toString()
            };
    }
}

export function compileAction(block: Blockly.Block): ASTAction | null {
    if (!block) return null;

    switch (block.type) {
        case 'action_update_status':
            return {
                type: 'UPDATE_STATUS',
                status: block.getFieldValue('TARGET_STATUS') || 'VALIDE_AUTOMATIQUEMENT'
            };

        case 'action_update_field': {
            const valBlock = block.getInputTargetBlock('NEW_VALUE');
            const expr = compileExpression(valBlock);
            return {
                type: 'UPDATE_FIELD',
                field_key: block.getFieldValue('FIELD_KEY') || '',
                value: expr ? (expr.type === 'LITERAL' ? expr.value : expr) : ''
            };
        }

        case 'action_request_approval': {
            const approvedBlock = block.getInputTargetBlock('ON_APPROVED');
            const rejectedBlock = block.getInputTargetBlock('ON_REJECTED');
            return {
                type: 'APPROVAL',
                role: block.getFieldValue('APPROVER_ROLE') || 'Manager N+1',
                sla_hours: Number(block.getFieldValue('SLA_HOURS') || 24),
                on_approved: compileActionChain(approvedBlock),
                on_rejected: compileActionChain(rejectedBlock)
            };
        }

        case 'action_send_notification':
            return {
                type: 'NOTIFICATION',
                channel: (block.getFieldValue('CHANNEL') || 'IN_APP') as any,
                recipient: block.getFieldValue('RECIPIENT') || 'Demandeur',
                message: block.getFieldValue('MESSAGE_TEXT') || ''
            };

        case 'action_call_webhook':
            return {
                type: 'WEBHOOK',
                method: block.getFieldValue('METHOD') || 'POST',
                url: block.getFieldValue('URL') || ''
            };

        default:
            return null;
    }
}

export function compileActionChain(startBlock: Blockly.Block | null): ASTAction[] {
    const actions: ASTAction[] = [];
    let current: Blockly.Block | null = startBlock;

    while (current) {
        const action = compileAction(current);
        if (action) {
            actions.push(action);
        }
        current = current.getNextBlock();
    }

    return actions;
}

/**
 * Compiles a full workspace into the proprietary AST JSON structure
 */
export function compileWorkspaceToAST(
    workspace: Blockly.Workspace,
    metadata: { name: string; schema_id: string; trigger_type: 'ON_SUBMIT' | 'ON_STATUS_CHANGE' | 'ON_UPDATE' }
): WorkflowAST {
    const topBlocks = workspace.getTopBlocks(true);
    const rules: ASTRuleNode[] = [];

    for (const block of topBlocks) {
        if (block.type === 'rule_if_then_else') {
            let currentBlock: Blockly.Block | null = block;
            while (currentBlock) {
                if (currentBlock.type === 'rule_if_then_else') {
                    const condBlock = currentBlock.getInputTargetBlock('CONDITION');
                    const condition = compileExpression(condBlock) || {
                        type: 'LITERAL',
                        value: true
                    };

                    const thenStart = currentBlock.getInputTargetBlock('THEN_ACTIONS');
                    const elseStart = currentBlock.getInputTargetBlock('ELSE_ACTIONS');

                    rules.push({
                        id: 'rule_' + (rules.length + 1),
                        type: 'CONDITION',
                        condition,
                        then_actions: compileActionChain(thenStart),
                        else_actions: compileActionChain(elseStart)
                    });
                }
                currentBlock = currentBlock.getNextBlock();
            }
        }
    }

    return {
        version: "1.0",
        name: metadata.name || "Nouveau Flux Blockly",
        schema_id: metadata.schema_id || "",
        trigger_type: metadata.trigger_type || "ON_SUBMIT",
        rules
    };
}

/**
 * Sérialise l'espace de travail Blockly en chaîne XML
 */
export function workspaceToXml(workspace: Blockly.Workspace): string {
    const dom = Blockly.Xml.workspaceToDom(workspace);
    return Blockly.Xml.domToText(dom);
}

/**
 * Restaure l'espace de travail Blockly à partir d'une chaîne XML
 */
export function xmlToWorkspace(xmlText: string, workspace: Blockly.Workspace): void {
    workspace.clear();
    if (!xmlText || xmlText.trim() === '') return;
    try {
        const dom = Blockly.utils.xml.textToDom(xmlText);
        Blockly.Xml.domToWorkspace(dom, workspace);
    } catch (err) {
        console.warn('Impossible de charger le XML dans Blockly:', err);
    }
}
