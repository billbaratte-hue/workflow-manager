/**
 * @file server/routes/blockly.routes.ts
 * Routes d'API REST pour la gestion et l'orchestration des flux Google Blockly.
 * Fournit les points de terminaison pour la création, simulation et exécution des règles métier.
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { blocklyEngineService, WorkflowAST } from '../services/blocklyEngine.service.js';

const router = Router();

// GET /api/v1/blockly-workflows/schemas - Liste des schémas disponibles et leurs métadonnées
router.get('/schemas', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        const rows = await db.all('SELECT * FROM schema_definitions ORDER BY name ASC');
        const formatted = rows.map((r: any) => ({
            ...r,
            fields: typeof r.fields === 'string' ? JSON.parse(r.fields || '[]') : r.fields
        }));
        res.json({ success: true, data: formatted });
    } catch (err: any) {
        console.error('Erreur chargement schemas:', err);
        res.status(500).json({ error: 'Erreur lors du chargement des schémas de formulaires.' });
    }
});

// GET /api/v1/blockly-workflows - Liste des définitions de flux
router.get('/', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        const { schema_id, trigger_type, status } = req.query;

        let sql = 'SELECT * FROM workflow_definitions WHERE 1=1';
        const params: any[] = [];

        if (schema_id) {
            sql += ' AND schema_id = ?';
            params.push(schema_id);
        }
        if (trigger_type) {
            sql += ' AND trigger_type = ?';
            params.push(trigger_type);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY updated_at DESC';

        const rows = await db.all(sql, ...params);
        const formatted = rows.map((r: any) => ({
            ...r,
            ast: typeof r.ast_json === 'string' ? JSON.parse(r.ast_json || '{}') : r.ast_json
        }));

        res.json({ success: true, data: formatted });
    } catch (err: any) {
        console.error('Erreur listing workflows:', err);
        res.status(500).json({ error: 'Erreur lors du chargement des flux de travail.' });
    }
});

// GET /api/v1/blockly-workflows/instances - Historique des exécutions
router.get('/instances', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        const limit = Number(req.query.limit || 50);
        const rows = await db.all(
            `SELECT i.*, w.name as workflow_name
             FROM workflow_instances i
             LEFT JOIN workflow_definitions w ON i.workflow_id = w.id
             ORDER BY i.executed_at DESC LIMIT ?`,
            limit
        );

        const formatted = rows.map((r: any) => ({
            ...r,
            execution_log: typeof r.execution_log === 'string' ? JSON.parse(r.execution_log || '[]') : r.execution_log,
            approval_state: r.approval_state ? (typeof r.approval_state === 'string' ? JSON.parse(r.approval_state) : r.approval_state) : null
        }));

        res.json({ success: true, data: formatted });
    } catch (err: any) {
        console.error('Erreur listing instances:', err);
        res.status(500).json({ error: 'Erreur lors du chargement de l\'historique d\'exécution.' });
    }
});

// GET /api/v1/blockly-workflows/:id - Détail d'une définition
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        const row = await db.get('SELECT * FROM workflow_definitions WHERE id = ?', req.params.id);
        if (!row) {
            return res.status(404).json({ error: 'Workflow introuvable.' });
        }

        const formatted = {
            ...row,
            ast: typeof row.ast_json === 'string' ? JSON.parse(row.ast_json || '{}') : row.ast_json
        };

        res.json({ success: true, data: formatted });
    } catch (err: any) {
        console.error('Erreur récupération workflow:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération du workflow.' });
    }
});

// POST /api/v1/blockly-workflows - Créer un flux
router.post('/', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        const { name, description, schema_id, trigger_type, status, xml_state, ast_json } = req.body;

        if (!name || !schema_id || !trigger_type) {
            return res.status(400).json({ error: 'Nom, formulaire cible (schema_id) et déclencheur requis.' });
        }

        let parsedAst = ast_json;
        if (typeof parsedAst === 'string') {
            try {
                parsedAst = JSON.parse(ast_json);
            } catch {
                return res.status(400).json({ error: 'Format AST JSON invalide.' });
            }
        }

        const validation = blocklyEngineService.validateAST(parsedAst);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Validation de l\'AST échouée', details: validation.errors });
        }

        const id = 'wf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO workflow_definitions (id, name, description, schema_id, trigger_type, status, xml_state, ast_json, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            id,
            name,
            description || '',
            schema_id,
            trigger_type,
            status || 'ACTIVE',
            xml_state || '',
            typeof ast_json === 'string' ? ast_json : JSON.stringify(ast_json),
            now,
            now
        );

        res.status(201).json({ success: true, id, message: 'Workflow créé avec succès.' });
    } catch (err: any) {
        console.error('Erreur création workflow:', err);
        res.status(500).json({ error: 'Erreur lors de la création du workflow.' });
    }
});

// PUT /api/v1/blockly-workflows/:id - Mettre à jour un flux
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        const { id } = req.params;
        const { name, description, schema_id, trigger_type, status, xml_state, ast_json } = req.body;

        const existing = await db.get('SELECT * FROM workflow_definitions WHERE id = ?', id);
        if (!existing) {
            return res.status(404).json({ error: 'Workflow introuvable.' });
        }

        let parsedAst = ast_json;
        if (typeof parsedAst === 'string') {
            try {
                parsedAst = JSON.parse(ast_json);
            } catch {
                return res.status(400).json({ error: 'Format AST JSON invalide.' });
            }
        }

        const validation = blocklyEngineService.validateAST(parsedAst);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Validation de l\'AST échouée', details: validation.errors });
        }

        const now = new Date().toISOString();
        const nextVersion = (existing.version || 1) + 1;

        await db.run(
            `UPDATE workflow_definitions
             SET name = ?, description = ?, schema_id = ?, trigger_type = ?, status = ?, xml_state = ?, ast_json = ?, version = ?, updated_at = ?
             WHERE id = ?`,
            name || existing.name,
            description !== undefined ? description : existing.description,
            schema_id || existing.schema_id,
            trigger_type || existing.trigger_type,
            status || existing.status,
            xml_state !== undefined ? xml_state : existing.xml_state,
            typeof ast_json === 'string' ? ast_json : JSON.stringify(ast_json),
            nextVersion,
            now,
            id
        );

        res.json({ success: true, message: 'Workflow mis à jour avec succès.', version: nextVersion });
    } catch (err: any) {
        console.error('Erreur mise à jour workflow:', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du workflow.' });
    }
});

// DELETE /api/v1/blockly-workflows/:id - Supprimer un flux
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const db = await getDatabase();
        await db.run('DELETE FROM workflow_definitions WHERE id = ?', req.params.id);
        res.json({ success: true, message: 'Workflow supprimé.' });
    } catch (err: any) {
        console.error('Erreur suppression workflow:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du workflow.' });
    }
});

// POST /api/v1/blockly-workflows/simulate - Simuler l'exécution
router.post('/simulate', async (req: Request, res: Response) => {
    try {
        const { ast, sample_payload } = req.body;
        if (!ast) {
            return res.status(400).json({ error: 'AST requis pour la simulation.' });
        }

        const parsedAst: WorkflowAST = typeof ast === 'string' ? JSON.parse(ast) : ast;
        const payload = sample_payload || {};

        const simulation = await blocklyEngineService.simulateWorkflow(parsedAst, payload);
        res.json({ success: true, simulation });
    } catch (err: any) {
        console.error('Erreur simulation:', err);
        res.status(500).json({ error: 'Erreur lors de la simulation : ' + err.message });
    }
});

// POST /api/v1/blockly-workflows/evaluate - Évaluer en direct pour une entité
router.post('/evaluate', async (req: Request, res: Response) => {
    try {
        const { workflow_id, entity_id, payload, context } = req.body;
        if (!workflow_id || !entity_id) {
            return res.status(400).json({ error: 'workflow_id et entity_id requis.' });
        }

        const result = await blocklyEngineService.executeWorkflow(
            workflow_id,
            entity_id,
            payload || {},
            context || {}
        );

        res.json({ success: true, result });
    } catch (err: any) {
        console.error('Erreur évaluation en direct:', err);
        res.status(500).json({ error: 'Erreur exécution workflow : ' + err.message });
    }
});

export default router;
