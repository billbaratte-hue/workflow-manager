import { Request, Response } from 'express';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { workflowEngineService } from '../services/workflow-engine.service.js';
import { settingsRepository } from '../repositories/settings.repository.js';

function getActor(req: Request) {
    const user = (req as any).user;
    if (user && user.id) {
        return {
            id: Number(user.id),
            name: String(user.name || 'Utilisateur'),
            role: String(user.role || 'Demandeur'),
            roles: Array.isArray(user.roles) ? user.roles : [user.role || 'Demandeur'],
            email: String(user.email || ''),
            attributes: user.attributes || {}
        };
    }
    return {
        id: 0,
        name: 'Inconnu',
        role: 'Inconnu',
        roles: [],
        email: '',
        attributes: {}
    };
}

export const getDossiers = async (_req: Request, res: Response) => {
    try {
        const dossiers = await workflowRepository.getAllParentRequests();
        res.status(200).json(dossiers);
    } catch (e: any) {
        console.error('getDossiers error:', e);
        res.status(500).json({ error: e.message || 'Erreur lors de la récupération des dossiers' });
    }
};

export const getDossierById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dossier = await workflowRepository.getParentRequestById(id);
        if (!dossier) {
            return res.status(404).json({ error: 'Dossier introuvable' });
        }
        const reminder = await workflowRepository.getWorkflowReminder(dossier.id);
        res.status(200).json({ ...dossier, reminder });
    } catch (e: any) {
        console.error('getDossierById error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const createDossier = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { items, ...dossierData } = req.body;

        // Differential Quote calculation S9 (Dynamically fetched from system_settings - Zero Hardcoding)
        const tariffConfig = await settingsRepository.getSettingValue<{
            user_stock_unit_price: number;
            supplier_stock_unit_price: number;
            new_order_unit_price: number;
            currency?: string;
        }>('tarification_devis_differentiel_s9', {
            user_stock_unit_price: 45.00,
            supplier_stock_unit_price: 85.00,
            new_order_unit_price: 145.00,
            currency: 'EUR'
        });

        let quoteAmount = 0;
        if (items && Array.isArray(items)) {
            for (const it of items) {
                if (it.hardware_origin === 'USER_STOCK') {
                    quoteAmount += Number(tariffConfig?.user_stock_unit_price ?? 45.00);
                } else if (it.hardware_origin === 'SUPPLIER_STOCK') {
                    quoteAmount += Number(tariffConfig?.supplier_stock_unit_price ?? 85.00);
                } else if (it.hardware_origin === 'NEW_ORDER') {
                    quoteAmount += Number(tariffConfig?.new_order_unit_price ?? 145.00);
                }
            }
        }

        const newDossier = await workflowRepository.createParentRequest({
            ...dossierData,
            quote_amount: quoteAmount > 0 ? quoteAmount : (dossierData.quote_amount || 0),
            requester_id: dossierData.requester_id || actor.id,
            requester_name: dossierData.requester_name || actor.name,
            status: dossierData.status || 'DRAFT'
        }, items || []);

        res.status(201).json(newDossier);
    } catch (e: any) {
        console.error('createDossier error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const submitDossier = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const updated = await workflowEngineService.submitDossier(id, actor);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('submitDossier error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const evaluateItem = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { decision, rejection_reason } = req.body;
        if (!['APPROVE', 'REJECT'].includes(decision)) {
            return res.status(400).json({ error: 'Décision invalide (APPROVE ou REJECT attendu)' });
        }
        const result = await workflowEngineService.evaluateItem(id, decision, actor, rejection_reason);
        res.status(200).json(result);
    } catch (e: any) {
        console.error('evaluateItem error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const crossValidate = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { decision, comment } = req.body;
        if (!['APPROVE', 'REJECT'].includes(decision)) {
            return res.status(400).json({ error: 'Décision invalide (APPROVE ou REJECT attendu)' });
        }
        const updated = await workflowEngineService.crossValidate(id, actor, decision, comment);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('crossValidate error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const nationalDecision = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { decision, comment } = req.body;
        const updated = await workflowEngineService.nationalEscalationDecision(id, actor, decision, comment);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('nationalDecision error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const acceptGDPR = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const updated = await workflowEngineService.acceptGDPR(id, actor);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('acceptGDPR error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const decideKeyChaining = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { needs_key } = req.body;
        const result = await workflowEngineService.decideKeyChaining(id, Boolean(needs_key), actor);
        res.status(200).json(result);
    } catch (e: any) {
        console.error('decideKeyChaining error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const linkPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { external_order_ref } = req.body;
        if (!external_order_ref) {
            return res.status(400).json({ error: 'Numéro de bon de commande obligatoire' });
        }
        const updated = await workflowEngineService.linkPurchaseOrder(id, external_order_ref, actor);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('linkPurchaseOrder error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const signReceptionPV = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const updated = await workflowEngineService.signReceptionPV(id, actor);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('signReceptionPV error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const triggerReminder = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const result = await workflowEngineService.triggerReminder(id, actor);
        res.status(200).json(result);
    } catch (e: any) {
        console.error('triggerReminder error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const validateGPSCommissioning = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { latitude, longitude, accuracy, installer_name } = req.body;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Coordonnées GPS obligatoires (latitude, longitude)' });
        }
        const updated = await workflowEngineService.validateGPSCommissioning(id, {
            latitude: Number(latitude),
            longitude: Number(longitude),
            accuracy: accuracy ? Number(accuracy) : 5,
            installer_name
        }, actor);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('validateGPSCommissioning error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const reportIncidentAndBlacklist = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { compromised_serial, reason } = req.body;
        if (!compromised_serial) {
            return res.status(400).json({ error: 'Numéro de série de l\'équipement compromis obligatoire' });
        }
        const result = await workflowEngineService.reportIncidentAndBlacklist(
            id,
            compromised_serial,
            reason || 'Déclaration Perte/Vol/Casse',
            actor
        );
        res.status(200).json(result);
    } catch (e: any) {
        console.error('reportIncidentAndBlacklist error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const archiveDossier = async (req: Request, res: Response) => {
    try {
        const actor = getActor(req);
        const { id } = req.params;
        const { type } = req.body;
        const updated = await workflowEngineService.archiveDossier(id, type === 'ABANDONED' ? 'ABANDONED' : 'COMPLETED', actor);
        res.status(200).json(updated);
    } catch (e: any) {
        console.error('archiveDossier error:', e);
        res.status(400).json({ error: e.message });
    }
};

export const getUserOrderQuota = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.userId);
        const quota = await workflowRepository.getUserOrderQuota(userId);
        res.status(200).json(quota);
    } catch (e: any) {
        console.error('getUserOrderQuota error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const resetUserOrderQuota = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.userId);
        const quota = await workflowRepository.resetUserOrderQuota(userId);
        res.status(200).json(quota);
    } catch (e: any) {
        console.error('resetUserOrderQuota error:', e);
        res.status(500).json({ error: e.message });
    }
};

export const getAuditLogs = async (_req: Request, res: Response) => {
    try {
        const logs = await workflowRepository.getAuditLogs(100);
        res.status(200).json(logs);
    } catch (e: any) {
        console.error('getAuditLogs error:', e);
        res.status(500).json({ error: e.message });
    }
};
