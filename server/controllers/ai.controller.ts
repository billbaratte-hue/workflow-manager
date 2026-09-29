/**
 * @file server/controllers/ai.controller.ts
 * Generative AI Controller for Mechatronic Portal.
 * Connects API routes to AiService, powered by Gemini 3.8 Flash and Sovereign Fallback Engine.
 */

import { Request, Response } from 'express';
import { AiService } from '../services/ai.service.js';
import { featureRepository } from '../repositories/feature.repository.js';

/**
 * GET /api/v1/ai/status
 * Returns health, active engine (Gemini vs Sovereign), and model details.
 */
export const getAiStatus = async (req: Request, res: Response) => {
    try {
        const status = await AiService.getStatus();
        res.status(200).json({ success: true, ...status });
    } catch (error: any) {
        console.error('getAiStatus error:', error);
        res.status(500).json({ error: 'Erreur récupération statut IA.' });
    }
};

/**
 * POST /api/v1/ai/analyze-request
 * Analyzes mechatronic access request risk, mechatronic norms compliance (EN 15864 / EN 16864),
 * urgency, and validator recommendations.
 */
export const analyzeRequest = async (req: Request, res: Response) => {
    try {
        const isAiEnabled = await featureRepository.isEnabled('ai_demandes');
        if (!isAiEnabled) {
            return res.status(403).json({
                disabled: true,
                error: "La fonctionnalité 'IA pour les demandes' est actuellement désactivée dans les paramètres administrateur."
            });
        }

        const { reference, title, description, site_name, equipment_type } = req.body;
        const analysisResult = await AiService.analyzeRequest({
            reference,
            title: title || '',
            description: description || '',
            site_name: site_name || '',
            equipment_type: equipment_type || ''
        });

        res.status(200).json({
            success: true,
            analysis: analysisResult
        });
    } catch (error: any) {
        console.error('analyzeRequest error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'analyse IA.' });
    }
};

/**
 * POST /api/v1/ai/assist-description
 * Generates and enriches technical justification for mechatronic access requests.
 */
export const assistDescription = async (req: Request, res: Response) => {
    try {
        const isAiEnabled = await featureRepository.isEnabled('ai_demandes');
        if (!isAiEnabled) {
            return res.status(403).json({
                disabled: true,
                error: "La fonctionnalité 'IA pour les demandes' est actuellement désactivée dans les paramètres administrateur."
            });
        }

        const { draftText, equipment_type, site_name } = req.body;
        const result = await AiService.assistDescription({
            draftText: draftText || '',
            equipment_type,
            site_name
        });

        res.status(200).json({
            success: true,
            suggested_text: result.suggested_text,
            provider: result.provider,
            model: result.model
        });
    } catch (error: any) {
        console.error('assistDescription error:', error);
        res.status(500).json({ error: 'Erreur assistance IA.' });
    }
};

/**
 * POST /api/v1/ai/recommend-role-field-scope
 * Suggests optimal data scopes, field visibility, and reference table permissions for a given role.
 */
export const recommendRoleFieldScope = async (req: Request, res: Response) => {
    try {
        const isAiEnabled = await featureRepository.isEnabled('ai_demandes');
        if (!isAiEnabled) {
            return res.status(403).json({
                disabled: true,
                error: "L'assistance IA est actuellement désactivée dans les paramètres administrateur."
            });
        }

        const { roleName, roleDesc, tables } = req.body;
        if (!roleName) {
            return res.status(400).json({ error: "Le nom du rôle est requis." });
        }

        const safeTables = Array.isArray(tables) ? tables : [];
        const result = await AiService.recommendRoleFieldScope({
            roleName,
            roleDesc,
            tables: safeTables
        });

        res.status(200).json({
            success: true,
            source: result.provider,
            ...result
        });
    } catch (error: any) {
        console.error('recommendRoleFieldScope error:', error);
        res.status(500).json({ error: 'Erreur lors de la recommandation de périmètre par IA.' });
    }
};

/**
 * POST /api/v1/ai/audit-role-simulation
 * Performs an in-depth security, NIS 2 compliance, and SoD audit for a role during simulation.
 */
export const auditRoleSimulation = async (req: Request, res: Response) => {
    try {
        const { role, tables, referenceTables } = req.body;
        if (!role) {
            return res.status(400).json({ error: "Les paramètres du rôle sont requis." });
        }

        const auditResult = await AiService.auditRoleSimulation({
            role,
            tables: Array.isArray(tables) ? tables : [],
            referenceTables: Array.isArray(referenceTables) ? referenceTables : []
        });

        res.status(200).json({
            success: true,
            source: auditResult.provider,
            audit: auditResult
        });
    } catch (error: any) {
        console.error('auditRoleSimulation error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'audit de simulation par IA.' });
    }
};

/**
 * POST /api/v1/ai/chat
 * Interactive Generative AI Copilot for mechatronic access and railway safety.
 */
export const chat = async (req: Request, res: Response) => {
    try {
        const isAiEnabled = await featureRepository.isEnabled('ai_demandes');
        if (!isAiEnabled) {
            return res.status(403).json({
                disabled: true,
                error: "L'assistant IA est actuellement désactivé dans les paramètres administrateur."
            });
        }

        const { message, history } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: "Le message est requis." });
        }

        const userContext = (req as any).user;
        const result = await AiService.chat({
            message: message.trim(),
            history: Array.isArray(history) ? history : [],
            userContext
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('chat error:', error);
        res.status(500).json({ error: 'Erreur lors du traitement de la requête IA Copilot.' });
    }
};

/**
 * POST /api/v1/ai/suggest-workflow
 * Generates mechatronic workflow configuration from natural language.
 */
export const suggestWorkflow = async (req: Request, res: Response) => {
    try {
        const isAiEnabled = await featureRepository.isEnabled('ai_demandes');
        if (!isAiEnabled) {
            return res.status(403).json({
                disabled: true,
                error: "L'assistant IA est actuellement désactivé."
            });
        }

        const { description, constraints } = req.body;
        if (!description || typeof description !== 'string') {
            return res.status(400).json({ error: "La description du workflow est requise." });
        }

        const result = await AiService.suggestWorkflow({
            description: description.trim(),
            constraints
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('suggestWorkflow error:', error);
        res.status(500).json({ error: 'Erreur génération de workflow par IA.' });
    }
};
