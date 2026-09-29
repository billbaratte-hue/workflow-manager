import { Request, Response } from 'express';
import { tenantRepository } from '../repositories/tenant.repository.js';
import { logAction } from '../db/store.js';

export const getCurrentTenant = async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId || 'default';
        let tenant = await tenantRepository.getById(tenantId);
        
        if (!tenant) {
            // Fallback to default tenant if requested tenant doesn't exist yet
            tenant = await tenantRepository.getById('default');
        }

        if (!tenant) {
            tenant = {
                id: 'default',
                name: 'Portail Collaboratif Entreprise',
                code: 'DEFAULT',
                logo_url: '',
                primary_color: '#1e3a8a',
                secondary_color: '#0f172a',
                accent_color: '#f59e0b',
                description: 'Plateforme Marque Blanche',
                created_at: new Date().toISOString()
            };
        }

        res.status(200).json({
            success: true,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                code: tenant.code,
                logo_url: tenant.logo_url || '',
                primary_color: tenant.primary_color,
                secondary_color: tenant.secondary_color,
                accent_color: tenant.accent_color,
                description: tenant.description || '',
                css_variables: {
                    '--brand-primary': tenant.primary_color,
                    '--brand-secondary': tenant.secondary_color,
                    '--brand-accent': tenant.accent_color
                }
            }
        });
    } catch (e: any) {
        console.error('getCurrentTenant error:', e);
        res.status(500).json({ error: e.message || 'Erreur récupération tenant.' });
    }
};

export const updateCurrentTenant = async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId || 'default';
        const { name, logo_url, primary_color, secondary_color, accent_color, description } = req.body;

        let existing = await tenantRepository.getById(tenantId);
        if (!existing) {
            existing = await tenantRepository.create({
                id: tenantId,
                name: name || 'Portail Collaboratif Entreprise',
                code: tenantId.toUpperCase(),
                logo_url: logo_url || '',
                primary_color: primary_color || '#1e3a8a',
                secondary_color: secondary_color || '#0f172a',
                accent_color: accent_color || '#f59e0b',
                description: description || ''
            });
        }

        const updated = await tenantRepository.update(tenantId, {
            name: name !== undefined ? String(name).trim() : existing.name,
            logo_url: logo_url !== undefined ? String(logo_url) : existing.logo_url,
            primary_color: primary_color || existing.primary_color,
            secondary_color: secondary_color || existing.secondary_color,
            accent_color: accent_color || existing.accent_color,
            description: description !== undefined ? String(description) : existing.description
        });

        const actor = req.user?.name || 'Administrateur';
        const role = req.user?.role || 'Administrateur';
        logAction(actor, role, 'UPDATE_TENANT_BRANDING', tenantId, `Mise à jour de la marque blanche : ${updated?.name}`);

        res.status(200).json({
            success: true,
            tenant: updated,
            css_variables: {
                '--brand-primary': updated?.primary_color,
                '--brand-secondary': updated?.secondary_color,
                '--brand-accent': updated?.accent_color
            }
        });
    } catch (e: any) {
        console.error('updateCurrentTenant error:', e);
        res.status(500).json({ error: e.message || 'Erreur mise à jour tenant.' });
    }
};

export const uploadLogo = async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId || 'default';
        const { logo_data, logo_url } = req.body;

        const effectiveUrl = logo_data || logo_url;
        if (!effectiveUrl) {
            return res.status(400).json({ error: 'Données de logo ou URL requises.' });
        }

        const updated = await tenantRepository.update(tenantId, { logo_url: effectiveUrl });
        res.status(200).json({ success: true, logo_url: updated?.logo_url });
    } catch (e: any) {
        console.error('uploadLogo error:', e);
        res.status(500).json({ error: e.message || 'Erreur upload logo.' });
    }
};

export const getAllTenants = async (_req: any, res: Response) => {
    try {
        const tenants = await tenantRepository.getAll();
        res.status(200).json(tenants);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Erreur liste tenants.' });
    }
};

export const createTenant = async (req: any, res: Response) => {
    try {
        const { id, name, code, logo_url, primary_color, secondary_color, accent_color, description } = req.body;
        if (!id || !name) {
            return res.status(400).json({ error: 'ID et Nom du tenant obligatoires.' });
        }

        const cleanId = String(id).toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const cleanCode = String(code || cleanId).toUpperCase();

        const existing = await tenantRepository.getById(cleanId);
        if (existing) {
            return res.status(400).json({ error: `Le tenant avec l'ID '${cleanId}' existe déjà.` });
        }

        const created = await tenantRepository.create({
            id: cleanId,
            name: String(name).trim(),
            code: cleanCode,
            logo_url: logo_url || '',
            primary_color: primary_color || '#1e3a8a',
            secondary_color: secondary_color || '#0f172a',
            accent_color: accent_color || '#f59e0b',
            description: description || ''
        });

        logAction(req.user?.name || 'Admin', req.user?.role || 'Admin', 'CREATE_TENANT', cleanId, `Création du tenant ${created.name}`);
        res.status(201).json({ success: true, tenant: created });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Erreur création tenant.' });
    }
};

export const deleteTenant = async (req: any, res: Response) => {
    try {
        const { tenantId } = req.params;
        const deleted = await tenantRepository.delete(tenantId);
        if (!deleted) {
            return res.status(404).json({ error: 'Tenant introuvable.' });
        }
        res.status(200).json({ success: true, message: `Tenant '${tenantId}' supprimé.` });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Erreur suppression tenant.' });
    }
};
