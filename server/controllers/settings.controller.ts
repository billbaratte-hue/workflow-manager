import { Request, Response } from 'express';
import { settingsRepository } from '../repositories/settings.repository.js';
import { logAction } from '../db/store.js';

export const getSystemSettings = async (_req: Request, res: Response) => {
    try {
        const settings = await settingsRepository.getAll();
        res.status(200).json(settings);
    } catch (e: any) {
        console.error('getSystemSettings error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const getSystemSettingByKey = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const result = await settingsRepository.getByKey(key);
        if (!result.setting) {
            return res.status(404).json({ error: `Paramètre '${key}' introuvable` });
        }
        res.status(200).json(result.setting);
    } catch (e: any) {
        console.error('getSystemSettingByKey error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const updateSystemSetting = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { value, category, description } = req.body;
        const user = (req as any).user || { name: 'Administrateur', role: 'Administrateur' };

        if (value === undefined) {
            return res.status(400).json({ error: "Le champ 'value' est obligatoire (JSON ou objet)" });
        }

        const updated = await settingsRepository.setSetting(
            key,
            value,
            category,
            description,
            user.name || user.email || 'Admin'
        );

        logAction(
            user.name || 'Administrateur',
            user.role || 'Administrateur',
            'UPDATE_SYSTEM_SETTING',
            key,
            `Mise à jour du paramètre système global '${key}'`
        );

        res.status(200).json(updated);
    } catch (e: any) {
        console.error('updateSystemSetting error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const deleteSystemSetting = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const user = (req as any).user || { name: 'Administrateur', role: 'Administrateur' };

        const deleted = await settingsRepository.deleteSetting(key);
        if (!deleted) {
            return res.status(404).json({ error: `Paramètre '${key}' introuvable` });
        }

        logAction(
            user.name || 'Administrateur',
            user.role || 'Administrateur',
            'DELETE_SYSTEM_SETTING',
            key,
            `Suppression du paramètre système global '${key}'`
        );

        res.status(200).json({ message: `Paramètre '${key}' supprimé avec succès` });
    } catch (e: any) {
        console.error('deleteSystemSetting error:', e);
        res.status(500).json({ error: e.message });
    }
};
