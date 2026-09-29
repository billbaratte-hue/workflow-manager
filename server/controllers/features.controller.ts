import { Request, Response } from 'express';
import { featureRepository } from '../repositories/feature.repository.js';

/**
 * GET /api/v1/features
 * Returns all system features and an easy lookup map
 */
export const getFeatures = async (req: Request, res: Response) => {
    try {
        const features = await featureRepository.getAll();
        const map = await featureRepository.getFeaturesMap();
        res.status(200).json({
            features,
            featuresMap: map
        });
    } catch (error: any) {
        console.error('getFeatures error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des fonctionnalités.' });
    }
};

/**
 * PATCH /api/v1/admin/features/:key
 * Toggles or updates a single feature
 */
export const updateFeature = async (req: any, res: Response) => {
    try {
        const { key } = req.params;
        const { is_enabled } = req.body;

        if (typeof is_enabled !== 'boolean') {
            return res.status(400).json({ error: "Le paramètre 'is_enabled' (booléen) est requis." });
        }

        const actor = req.user?.name || req.user?.email || 'Administrateur';
        const updated = await featureRepository.setEnabled(key, is_enabled, actor);

        if (!updated) {
            return res.status(404).json({ error: `Fonctionnalité '${key}' introuvable.` });
        }

        const map = await featureRepository.getFeaturesMap();
        res.status(200).json({
            message: `Fonctionnalité '${updated.name}' mise à jour avec succès.`,
            feature: updated,
            featuresMap: map
        });
    } catch (error: any) {
        console.error('updateFeature error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la fonctionnalité.' });
    }
};

/**
 * POST /api/v1/admin/features/batch
 * Updates multiple features at once
 */
export const batchUpdateFeatures = async (req: any, res: Response) => {
    try {
        const { updates } = req.body;
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: "L'objet 'updates' est requis." });
        }

        const actor = req.user?.name || req.user?.email || 'Administrateur';
        const features = await featureRepository.updateBatch(updates, actor);
        const map = await featureRepository.getFeaturesMap();

        res.status(200).json({
            message: 'Fonctionnalités mises à jour avec succès.',
            features,
            featuresMap: map
        });
    } catch (error: any) {
        console.error('batchUpdateFeatures error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour par lot des fonctionnalités.' });
    }
};
