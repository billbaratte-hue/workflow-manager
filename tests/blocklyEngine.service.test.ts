import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlocklyEngineService, WorkflowAST } from '../server/services/blocklyEngine.service.js';
import { SqliteWrapper, ISqliteDb } from '../server/db/database.js';

describe('BlocklyEngineService & Visual Rule Engine', () => {
    let db: ISqliteDb;
    let engine: BlocklyEngineService;

    beforeEach(async () => {
        db = new SqliteWrapper(':memory:');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS schema_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT,
                description TEXT,
                fields TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dynamic_entities (
                id TEXT PRIMARY KEY,
                schema_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                payload_json TEXT NOT NULL,
                initiator_id INTEGER,
                initiator_name TEXT,
                initiator_email TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS workflow_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                schema_id TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                xml_state TEXT,
                ast_json TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS workflow_instances (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                status TEXT NOT NULL,
                execution_log TEXT,
                approval_state TEXT,
                executed_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                target_user_id INTEGER,
                target_role TEXT,
                target_email TEXT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                reference TEXT,
                urgent INTEGER DEFAULT 0,
                read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
        `);

        engine = new BlocklyEngineService(db);
    });

    afterEach(async () => {
        await db.close();
    });

    it('valide la structure d\'un AST JSON conforme', () => {
        const validAst: WorkflowAST = {
            version: "1.0",
            name: "Test Validation",
            schema_id: "schema_intervention_cle",
            trigger_type: "ON_SUBMIT",
            rules: [
                {
                    id: "rule_1",
                    type: "CONDITION",
                    condition: {
                        type: "COMPARISON",
                        operator: "GREATER_THAN",
                        left: { type: "FIELD", key: "duree_heures" },
                        right: { type: "LITERAL", value: 4 }
                    },
                    then_actions: [
                        { type: "UPDATE_STATUS", status: "EN_ATTENTE_MANAGER" }
                    ],
                    else_actions: [
                        { type: "UPDATE_STATUS", status: "VALIDE_AUTOMATIQUEMENT" }
                    ]
                }
            ]
        };

        const res = engine.validateAST(validAst);
        expect(res.valid).toBe(true);
        expect(res.errors.length).toBe(0);
    });

    it('rejette un AST invalide avec des erreurs explicites', () => {
        const invalidAst: any = {
            name: "Manque schema_id et trigger"
        };

        const res = engine.validateAST(invalidAst);
        expect(res.valid).toBe(false);
        expect(res.errors).toContain('Le champ "schema_id" est requis dans l\'AST.');
        expect(res.errors).toContain('Le champ "trigger_type" est requis dans l\'AST.');
    });

    it('évalue correctement les prédicats de comparaison et les opérateurs logiques', () => {
        const logs: any[] = [];
        const payload = {
            duree_heures: 6,
            zone_acces: "TGBT",
            urgence: false
        };

        // Condition 1 : duree_heures > 4 (Vrai)
        const cond1 = {
            type: "COMPARISON" as const,
            operator: ">",
            left: { type: "FIELD" as const, key: "duree_heures" },
            right: { type: "LITERAL" as const, value: 4 }
        };
        expect(engine.evaluateCondition(cond1, payload, logs)).toBe(true);

        // Condition 2 : zone_acces == "Voies" (Faux)
        const cond2 = {
            type: "COMPARISON" as const,
            operator: "EQUALS",
            left: { type: "FIELD" as const, key: "zone_acces" },
            right: { type: "LITERAL" as const, value: "Voies" }
        };
        expect(engine.evaluateCondition(cond2, payload, logs)).toBe(false);

        // Condition 3 : cond1 OU cond2 (Vrai)
        const condOr = {
            type: "LOGICAL" as const,
            operator: "OR",
            left: cond1,
            right: cond2
        };
        expect(engine.evaluateCondition(condOr, payload, logs)).toBe(true);

        // Condition 4 : cond1 ET cond2 (Faux)
        const condAnd = {
            type: "LOGICAL" as const,
            operator: "AND",
            left: cond1,
            right: cond2
        };
        expect(engine.evaluateCondition(condAnd, payload, logs)).toBe(false);
    });

    it('simule l\'exécution d\'un flux et produit une trace d\'exécution détaillée', async () => {
        const testAst: WorkflowAST = {
            version: "1.0",
            name: "Filtrage Habilitation et Durée",
            schema_id: "schema_intervention_cle",
            trigger_type: "ON_SUBMIT",
            rules: [
                {
                    id: "r1",
                    type: "CONDITION",
                    condition: {
                        type: "COMPARISON",
                        operator: ">",
                        left: { type: "FIELD", key: "duree_heures" },
                        right: { type: "LITERAL", value: 8 }
                    },
                    then_actions: [
                        { type: "UPDATE_STATUS", status: "VALIDATION_DIRECTEUR" },
                        { type: "NOTIFICATION", channel: "IN_APP", recipient: "Direction Métier", message: "Intervention longue durée." }
                    ],
                    else_actions: [
                        { type: "UPDATE_STATUS", status: "VALIDE_AUTOMATIQUEMENT" }
                    ]
                }
            ]
        };

        // Cas 1: Durée = 12h -> Branche ALORS
        const sim1 = await engine.simulateWorkflow(testAst, { duree_heures: 12 });
        expect(sim1.status).toBe('CONDITION_MET');
        expect(sim1.actions_to_execute.length).toBe(2);
        expect(sim1.actions_to_execute[0].status).toBe('VALIDATION_DIRECTEUR');
        expect(sim1.modified_payload.status).toBe('VALIDATION_DIRECTEUR');
        expect(sim1.logs.length).toBeGreaterThan(0);

        // Cas 2: Durée = 3h -> Branche SINON
        const sim2 = await engine.simulateWorkflow(testAst, { duree_heures: 3 });
        expect(sim2.status).toBe('CONDITION_UNMET');
        expect(sim2.actions_to_execute.length).toBe(1);
        expect(sim2.actions_to_execute[0].status).toBe('VALIDE_AUTOMATIQUEMENT');
        expect(sim2.modified_payload.status).toBe('VALIDE_AUTOMATIQUEMENT');
    });

    it('exécute un workflow réel et persiste les mutations et traces dans la base de données', async () => {
        const now = new Date().toISOString();
        const ast: WorkflowAST = {
            version: "1.0",
            name: "Workflow Production",
            schema_id: "schema_intervention_cle",
            trigger_type: "ON_SUBMIT",
            rules: [
                {
                    id: "r1",
                    type: "CONDITION",
                    condition: {
                        type: "COMPARISON",
                        operator: "EQUALS",
                        left: { type: "FIELD", key: "zone_acces" },
                        right: { type: "LITERAL", value: "TGBT" }
                    },
                    then_actions: [
                        {
                            type: "APPROVAL",
                            role: "Manager N+1",
                            sla_hours: 48
                        },
                        {
                            type: "UPDATE_STATUS",
                            status: "EN_ATTENTE_MANAGER"
                        },
                        {
                            type: "NOTIFICATION",
                            channel: "IN_APP",
                            recipient: "Demandeur",
                            message: "Votre demande nécessite l'accord du Manager."
                        }
                    ]
                }
            ]
        };

        await db.run(
            `INSERT INTO workflow_definitions (id, name, description, schema_id, trigger_type, status, xml_state, ast_json, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            'wf_test_01', 'Workflow Test', 'Desc', 'schema_intervention_cle', 'ON_SUBMIT', 'ACTIVE', '', JSON.stringify(ast), now, now
        );

        await db.run(
            `INSERT INTO dynamic_entities (id, schema_id, status, payload_json, initiator_id, initiator_name, initiator_email, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, 'Daniel Dupont', 'daniel@entreprise.fr', ?, ?)`,
            'ENT-001', 'schema_intervention_cle', 'DRAFT', JSON.stringify({ zone_acces: 'TGBT', duree: 2 }), now, now
        );

        const execResult = await engine.executeWorkflow('wf_test_01', 'ENT-001', { zone_acces: 'TGBT' });

        expect(execResult.status).toBe('PENDING_APPROVAL');
        expect(execResult.approval_state?.pending_role).toBe('Manager N+1');
        expect(execResult.approval_state?.sla_hours).toBe(48);

        // Vérifier la mutation dans dynamic_entities
        const updatedEntity = await db.get<any>('SELECT * FROM dynamic_entities WHERE id = ?', 'ENT-001');
        expect(updatedEntity.status).toBe('EN_ATTENTE_MANAGER');

        // Vérifier l'instance enregistrée
        const instance = await db.get<any>('SELECT * FROM workflow_instances WHERE workflow_id = ?', 'wf_test_01');
        expect(instance).toBeDefined();
        expect(instance.status).toBe('PENDING_APPROVAL');

        // Vérifier la notification créée
        const notif = await db.get<any>('SELECT * FROM notifications WHERE reference = ?', 'ENT-001');
        expect(notif).toBeDefined();
        expect(notif.message).toContain("Votre demande nécessite l'accord du Manager.");
    });
});
