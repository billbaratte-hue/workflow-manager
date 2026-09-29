import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as routingService from '../services/routing.service.js';
import * as notificationService from '../services/notification.service.js';
import { ArticlePdfService } from '../services/articlePdf.service.js';
import { TransmissionPdfService } from '../services/transmissionPdf.service.js';
import { requestRepository } from '../repositories/request.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { featureRepository } from '../repositories/feature.repository.js';
import { referenceTableRepository } from '../repositories/reference-table.repository.js';
import { configRepository } from '../repositories/config.repository.js';
import { getDatabase } from '../db/database.js';
import {
    requestsDB,
    decisionHistory,
    recordDecision,
    auditLogs,
    delegationMap,
    logAction,
    portalSitesDatabase,
    usersDatabase,
    RequestItem,
    ProcessStage,
    processTemplates,
    formTemplatesDatabase,
    statusesDatabase,
    businessRulesStore,
    BusinessRule
} from '../db/store.js';

async function persistDecisionHistory(item: { reference: string; title?: string; decision: string; author: string; motif?: string; date: string }) {
    try {
        const db = await getDatabase();
        await db.run(
            'INSERT INTO decision_history (reference, title, decision, author, motif, date) VALUES (?, ?, ?, ?, ?, ?)',
            item.reference, item.title || '', item.decision, item.author, item.motif || '', item.date
        );
    } catch (e) {
        console.warn('Persisting decision history warning:', e);
    }
}

export function evaluateBusinessRule(rule: BusinessRule, payload: Record<string, any>): boolean {
    const targetField = rule.target_field;
    if (!targetField) return false;
    const val = payload[targetField];

    switch (rule.operator) {
        case 'EQUALS':
            return String(val) === String(rule.expected_value);
        case 'NOT_EQUALS':
            return String(val) !== String(rule.expected_value);
        case 'GREATER_THAN':
            return Number(val) > Number(rule.expected_value);
        case 'LESS_THAN':
            return Number(val) < Number(rule.expected_value);
        case 'CONTAINS':
            return String(val || '').toLowerCase().includes(String(rule.expected_value || '').toLowerCase());
        case 'IS_EMPTY':
            return val === undefined || val === null || String(val).trim() === '';
        case 'IS_NOT_EMPTY':
            return val !== undefined && val !== null && String(val).trim() !== '';
        default:
            return false;
    }
}

export function normalizeStatusToCode(st: string): string {
    const s = (st || '').trim().toLowerCase();
    if (s.includes('brouillon') || s === 'draft') return 'DRAFT';
    if (s.includes('manager') || s === 'pending_manager') return 'PENDING_MANAGER';
    if (s.includes('site') || s === 'pending_site') return 'PENDING_SITE';
    if (s.includes('complément') || s.includes('complement')) return 'PENDING_COMPLEMENT';
    if (s.includes('valid') || s.includes('approuv') || s === 'item_approved' || s === 'active_fulfilled') return 'ITEM_APPROVED';
    if (s.includes('refus') || s.includes('rejet') || s === 'item_rejected' || s === 'archived_rejected') return 'ITEM_REJECTED';

    const found = statusesDatabase.find(sd => sd.code.toLowerCase() === s || sd.label.toLowerCase() === s);
    return found ? found.code : st.toUpperCase();
}

export function validateStatusTransition(currentStatus: string, targetStatus: string, actorRoles: string[]): { allowed: boolean; error?: string } {
    const isSuperAdmin = actorRoles.some(r => r.toLowerCase() === 'administrateur' || r.toLowerCase() === 'admin');
    if (isSuperAdmin) {
        return { allowed: true };
    }

    const currentCode = normalizeStatusToCode(currentStatus);
    const targetCode = normalizeStatusToCode(targetStatus);

    if (currentCode === targetCode) {
        return { allowed: true };
    }

    const currentDef = statusesDatabase.find(s => s.code.toUpperCase() === currentCode || s.label.toLowerCase() === currentStatus.toLowerCase());
    if (!currentDef || !currentDef.allowed_transitions || currentDef.allowed_transitions.length === 0) {
        return { allowed: true };
    }

    const allowedCodes = currentDef.allowed_transitions.map(t => t.toUpperCase());
    
    // Direct match on code
    if (allowedCodes.includes(targetCode)) {
        return { allowed: true };
    }

    // Equivalent aliases
    if (targetCode === 'ITEM_APPROVED' && (allowedCodes.includes('ACTIVE_FULFILLED') || allowedCodes.includes('ARCHIVED_COMPLETED') || allowedCodes.includes('ITEM_APPROVED'))) {
        return { allowed: true };
    }
    if (targetCode === 'ITEM_REJECTED' && (allowedCodes.includes('ARCHIVED_REJECTED') || allowedCodes.includes('ITEM_REJECTED'))) {
        return { allowed: true };
    }
    if (targetCode === 'PENDING_COMPLEMENT') {
        return { allowed: true };
    }

    return {
        allowed: false,
        error: `Transition de statut non autorisée par la matrice des statuts (De: '${currentStatus}' Vers: '${targetStatus}'). Transitions permises : ${currentDef.allowed_transitions.join(', ')}.`
    };
}

export const getSites = async (_req: any, res: any) => {
    try {
        const sitesTable = await referenceTableRepository.getById('sites');
        if (sitesTable && Array.isArray(sitesTable.rows) && sitesTable.rows.length > 0) {
            const parsedRows = sitesTable.rows.map((row: any) => {
                let normes = row.normes_applicables;
                if (typeof normes === 'string') {
                    normes = normes.split(',').map((s: string) => s.trim()).filter(Boolean);
                } else if (!Array.isArray(normes)) {
                    normes = ["EN 15864", "EN 16864", "NIS 2"];
                }
                return {
                    ...row,
                    normes_applicables: normes
                };
            });
            return res.status(200).json(parsedRows);
        }
    } catch (e) {
        console.warn('getSites fallback to in-memory store:', e);
    }
    res.status(200).json(portalSitesDatabase);
};

export const getDocument = async (req: any, res: any) => {
    try {
        const { filename } = req.params;
        const safeFilename = path.basename(filename);
        const filePath = path.join(process.cwd(), 'uploads', safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Fichier justificatif introuvable.' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('getDocument error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du fichier.' });
    }
};

export const createRequest = async (req: any, res: any) => {
    try {
        const {
            titre,
            description,
            beneficiaire_id,
            site_id,
            equipment_type,
            intervention_duration,
            circuit_validation,
            process_id,
            form_id,
            form_data,
            is_draft,
            is_team_request,
            team_name,
            team_company,
            team_members,
            is_multi_site,
            scope_type,
            selected_site_ids,
            selected_regions
        } = req.body;

        const isDraft = is_draft === 'true' || is_draft === true;
        const isTeamReq = is_team_request === 'true' || is_team_request === true;
        const siteIdNum = site_id ? parseInt(site_id) : 1;
        let parsedTeamMembers: any[] = [];
        if (team_members) {
            try {
                parsedTeamMembers = typeof team_members === 'string' ? JSON.parse(team_members) : team_members;
            } catch (e) {
                console.warn("Could not parse team_members JSON:", e);
            }
        }

        // Multi-sites / Multi-regions scope handling
        const isMultiSiteScope = is_multi_site === 'true' || is_multi_site === true;
        const resolvedScopeType = (scope_type as 'single_site' | 'multi_sites' | 'multi_regions') || (isMultiSiteScope ? 'multi_sites' : 'single_site');

        let parsedSiteIds: number[] = [];
        if (selected_site_ids) {
            try {
                parsedSiteIds = typeof selected_site_ids === 'string' ? JSON.parse(selected_site_ids) : selected_site_ids;
            } catch (e) {
                console.warn("Could not parse selected_site_ids JSON:", e);
            }
        }

        let parsedRegions: string[] = [];
        if (selected_regions) {
            try {
                parsedRegions = typeof selected_regions === 'string' ? JSON.parse(selected_regions) : selected_regions;
            } catch (e) {
                console.warn("Could not parse selected_regions JSON:", e);
            }
        }

        let parsedFormData: Record<string, any> = {};
        if (form_data) {
            try {
                parsedFormData = typeof form_data === 'string' ? JSON.parse(form_data) : form_data;
            } catch (e) {
                console.warn("Could not parse form_data JSON:", e);
            }
        }

        const randomId = Math.floor(1000 + Math.random() * 9000);
        const reference = `REQ-2026-${randomId}`;

        // Requester (demandeur) identity from authenticated session
        const demandeurId = req.user?.id ? Number(req.user.id) : 1042;
        const demandeurUser = req.user || usersDatabase.find(u => u.id === demandeurId) || {
            id: demandeurId,
            name: "Daniel Dupont",
            email: "daniel@entreprise.fr",
            attributes: { service: "Maintenance Voie" }
        };

        // Beneficiary identity (can be same as demandeur or third-party agent)
        const beneficiaireIdNum = beneficiaire_id ? parseInt(beneficiaire_id) : demandeurId;
        const beneficiaireUser = usersDatabase.find(u => u.id === beneficiaireIdNum) || demandeurUser;
        const requester = beneficiaireUser;

        const site = portalSitesDatabase.find(s => s.id === siteIdNum) || portalSitesDatabase[0];

        // Process template lookup (DB or in-memory)
        let resolvedProcessTemplate: any = null;
        if (process_id) {
            resolvedProcessTemplate = processTemplates.find(p => p.id === Number(process_id));
        }
        if (!resolvedProcessTemplate) {
            resolvedProcessTemplate = processTemplates[0];
        }

        // Format multi-sites list if scope is extended
        let selectedSitesObjs: { id: number; name: string; region: string }[] = [];
        if (isMultiSiteScope) {
            if (resolvedScopeType === 'multi_regions' && parsedRegions.length > 0) {
                selectedSitesObjs = portalSitesDatabase.filter(s => parsedRegions.includes(s.region)).map(s => ({
                    id: s.id,
                    name: s.name,
                    region: s.region
                }));
            } else if (parsedSiteIds.length > 0) {
                selectedSitesObjs = portalSitesDatabase.filter(s => parsedSiteIds.includes(s.id)).map(s => ({
                    id: s.id,
                    name: s.name,
                    region: s.region
                }));
            }
        }

        let computedSiteName = site.name;
        if (isMultiSiteScope) {
            if (resolvedScopeType === 'multi_regions' && parsedRegions.length > 0) {
                computedSiteName = `Périmètre Régional (${parsedRegions.length} région${parsedRegions.length > 1 ? 's' : ''} : ${parsedRegions.join(', ')})`;
            } else if (selectedSitesObjs.length > 1) {
                const shortNames = selectedSitesObjs.map(s => s.name.split('(')[0].trim());
                computedSiteName = `Multi-sites (${selectedSitesObjs.length}) : ${shortNames.slice(0, 2).join(', ')}${selectedSitesObjs.length > 2 ? '...' : ''}`;
            }
        }

        // Active Business Rules check on submission (ON_SUBMIT)
        const activeSubmitRules = businessRulesStore.filter(r => r.is_active && r.trigger_event === 'ON_SUBMIT' && (r.associated_processes?.includes('ALL') || (resolvedProcessTemplate?.code && r.associated_processes?.includes(resolvedProcessTemplate.code))));
        const activeKeysCount = requestsDB.filter(r => r.beneficiaire_id === beneficiaireIdNum && r.status !== 'Refusée' && r.status !== 'Brouillon').length;
        
        const submitPayload = {
            ...parsedFormData,
            hardware_active_count: activeKeysCount,
            beneficiaire_id: beneficiaireIdNum,
            site_id: siteIdNum,
            equipment_type: equipment_type || 'Clé Mécatronique EN 15864',
            titre: titre || '',
            description: description || ''
        };

        for (const rule of activeSubmitRules) {
            if (evaluateBusinessRule(rule, submitPayload)) {
                if (rule.action_type === 'BLOCK_TRANSITION') {
                    return res.status(400).json({ error: `Règle métier [${rule.code}] : ${rule.error_message}` });
                }
            }
        }

        // Resolve stages dynamically from process template if configured, otherwise fallback to routingService
        let resolvedStages: ProcessStage[] = [];
        if (resolvedProcessTemplate && resolvedProcessTemplate.stages && resolvedProcessTemplate.stages.length > 0) {
            resolvedStages = resolvedProcessTemplate.stages.map((stg: any, idx: number) => {
                const roleLower = (stg.validator_role || '').toLowerCase();
                let assignedValidator: any = null;
                if (roleLower.includes('manager')) {
                    assignedValidator = usersDatabase.find(u => (u.roles || [u.role]).some(r => r.toLowerCase().includes('manager')) && u.attributes?.service === requester.attributes?.service)
                        || usersDatabase.find(u => (u.roles || [u.role]).some(r => r.toLowerCase().includes('manager')));
                } else if (roleLower.includes('site') || roleLower.includes('sécurité') || roleLower.includes('securite')) {
                    assignedValidator = usersDatabase.find(u => u.id === site.validator_id)
                        || usersDatabase.find(u => (u.roles || [u.role]).some(r => r.toLowerCase().includes('validateur site')));
                } else {
                    assignedValidator = usersDatabase.find(u => (u.roles || [u.role]).some(r => r.toLowerCase() === roleLower));
                }

                return {
                    id: stg.id || `stage_${idx + 1}`,
                    order: stg.order || (idx + 1),
                    name: stg.name,
                    validator_role: stg.validator_role,
                    validator_id: assignedValidator ? assignedValidator.id : (stg.validator_id || site.validator_id || 305),
                    validator_name: assignedValidator ? assignedValidator.name : (stg.validator_name || site.validator_name || `Validateur ${stg.validator_role}`),
                    status: 'pending',
                    sla_hours: stg.sla_hours || 48,
                    requires_document: !!stg.requires_document
                };
            });
        } else {
            const resolvedCircuit = await routingService.resolveApprovers(
                beneficiaireIdNum,
                siteIdNum,
                circuit_validation || 'hierarchique_standard'
            );
            resolvedStages = resolvedCircuit.stages;
        }

        // Determine initial status
        let initialStatus = 'Brouillon';
        if (!isDraft) {
            if (resolvedStages.length > 0) {
                const firstStage = resolvedStages[0];
                initialStatus = firstStage.validator_role === 'Validateur Site'
                    ? 'En attente validation Site'
                    : `En attente validation ${firstStage.validator_role}`;
            } else {
                initialStatus = 'En attente validation';
            }
        }

        const newRequest: RequestItem = {
            id: randomId,
            reference,
            title: titre || (resolvedProcessTemplate ? `${resolvedProcessTemplate.name} - ${site.name}` : 'Demande d\'accès mécatronique'),
            description: description || '',
            status: initialStatus,
            current_stage_index: 0,
            stages: resolvedStages,
            demandeur_id: demandeurId,
            demandeur_name: demandeurUser.name,
            demandeur_email: demandeurUser.email,
            beneficiaire_id: beneficiaireIdNum,
            beneficiaire_name: requester.name,
            beneficiaire_service: requester.attributes?.service || demandeurUser.attributes?.service || 'Maintenance Voie',
            site_id: site.id,
            site_name: computedSiteName,
            equipment_type: equipment_type || 'Clé Mécatronique EN 15864',
            intervention_duration: intervention_duration || 'Ponctuelle (24h)',
            is_team_request: isTeamReq,
            team_name: team_name || undefined,
            team_company: team_company || undefined,
            team_members: parsedTeamMembers.length > 0 ? parsedTeamMembers : undefined,
            is_multi_site: isMultiSiteScope,
            scope_type: resolvedScopeType,
            selected_site_ids: parsedSiteIds.length > 0 ? parsedSiteIds : (isMultiSiteScope && selectedSitesObjs.length > 0 ? selectedSitesObjs.map(s => s.id) : undefined),
            selected_sites: selectedSitesObjs.length > 0 ? selectedSitesObjs : undefined,
            selected_regions: parsedRegions.length > 0 ? parsedRegions : undefined,
            created_at: new Date().toISOString(),
            process_id: resolvedProcessTemplate ? resolvedProcessTemplate.id : undefined,
            process_name: resolvedProcessTemplate ? resolvedProcessTemplate.name : undefined,
            process_code: resolvedProcessTemplate ? (resolvedProcessTemplate.code || `PROC-${resolvedProcessTemplate.id}`) : undefined,
            form_id: form_id || (formTemplatesDatabase.find(f => f.linked_process_id === resolvedProcessTemplate?.id)?.id) || undefined,
            form_data: parsedFormData,
            document: req.file ? req.file.filename : null,
            document_original_name: req.file ? req.file.originalname : null,
            document_size: req.file ? req.file.size : null,
            document_mimetype: req.file ? req.file.mimetype : null,
            complement_request: null,
            ai_analysis: null
        };

        requestsDB.push(newRequest);

        try {
            await requestRepository.create({
                reference: newRequest.reference,
                title: newRequest.title,
                description: newRequest.description,
                status: newRequest.status,
                stages: newRequest.stages,
                demandeur_id: newRequest.demandeur_id,
                demandeur_name: newRequest.demandeur_name,
                demandeur_email: newRequest.demandeur_email,
                beneficiaire_id: newRequest.beneficiaire_id,
                beneficiaire_name: newRequest.beneficiaire_name,
                beneficiaire_service: newRequest.beneficiaire_service,
                site_id: newRequest.site_id,
                site_name: newRequest.site_name,
                equipment_type: newRequest.equipment_type,
                intervention_duration: newRequest.intervention_duration,
                is_team_request: newRequest.is_team_request,
                team_name: newRequest.team_name,
                team_company: newRequest.team_company,
                team_members: newRequest.team_members,
                is_multi_site: newRequest.is_multi_site,
                scope_type: newRequest.scope_type,
                selected_site_ids: newRequest.selected_site_ids,
                selected_sites: newRequest.selected_sites,
                selected_regions: newRequest.selected_regions,
                process_id: newRequest.process_id,
                process_name: newRequest.process_name,
                process_code: newRequest.process_code,
                form_id: newRequest.form_id,
                form_data: newRequest.form_data,
                document: newRequest.document,
                document_original_name: newRequest.document_original_name,
                document_size: newRequest.document_size,
                document_mimetype: newRequest.document_mimetype
            });
        } catch (dbSaveErr) {
            console.error('Erreur sauvegarde SQLite de la demande:', dbSaveErr);
        }

        if (isDraft) {
            logAction(
                requester.name,
                "Demandeur",
                "SAVE_DRAFT",
                reference,
                `Sauvegarde du brouillon ${titre || reference}`
            );
            res.status(201).json({
                reference,
                status: newRequest.status,
                message: 'Brouillon enregistré avec succès',
                request: newRequest
            });
        } else {
            logAction(
                requester.name,
                "Demandeur",
                "CREATE_REQUEST",
                reference,
                `Création de la demande d'accès [${resolvedProcessTemplate?.name || 'Processus'}] sur le site ${site.name}`
            );
            notificationService.notifyRequestCreated(newRequest);
            res.status(201).json({
                reference,
                status: newRequest.status,
                message: `Demande ${reference} transmise avec succès au circuit de validation.`,
                request: newRequest
            });
        }
    } catch (error) {
        console.error("createRequest error:", error);
        res.status(500).json({ error: 'Erreur lors de la création de la demande.' });
    }
};

export const getRequests = async (req: any, res: any) => {
    try {
        const user = req.user;
        const isPrivileged = user?.role === 'Administrateur' ||
            (user?.privileges && (user.privileges.includes('validate_requests') || user.privileges.includes('manage_users') || user.privileges.includes('view_all_requests')));

        let items: any[] = [];
        const dbItems = await requestRepository.getAll();
        if (dbItems && dbItems.length > 0) {
            items = dbItems;
        } else {
            items = [...requestsDB].reverse();
        }

        if (!isPrivileged && user?.id) {
            items = items.filter(r => r.demandeur_id === user.id || r.beneficiaire_id === user.id);
        }

        res.status(200).json(items);
    } catch (err) {
        console.error('getRequests error:', err);
        res.status(200).json([...requestsDB].reverse());
    }
};

export const getRequestByRef = async (req: any, res: any) => {
    try {
        const { reference } = req.params;
        const dbItem = await requestRepository.getByReference(reference);
        if (dbItem) {
            return res.status(200).json(dbItem);
        }
        const reqObj = requestsDB.find(r => r.reference === reference || String(r.id) === String(reference));
        if (!reqObj) return res.status(404).json({ error: 'Demande introuvable.' });
        res.status(200).json(reqObj);
    } catch (err) {
        console.error('getRequestByRef error:', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
};

export const getMyRequests = async (req: any, res: any) => {
    try {
        const userId = req.user?.id || 1042;
        if (userId === 1) {
            const allItems = await requestRepository.getAll();
            return res.status(200).json(allItems);
        }
        const userItems = await requestRepository.getByBeneficiaire(userId);
        if (userItems && userItems.length > 0) {
            return res.status(200).json(userItems);
        }
        res.status(200).json(requestsDB.filter(r => r.beneficiaire_id === userId || userId === 1).reverse());
    } catch (err) {
        console.error('getMyRequests error:', err);
        res.status(200).json(requestsDB.filter(r => r.beneficiaire_id === 1042).reverse());
    }
};

/**
 * Traitement des décisions du circuit de validation
 * Actions supportées :
 * - 'approved': Validation de l'étape active, progression vers l'étape suivante ou validation définitive
 * - 'rejected': Refus de la demande avec motif obligatoire
 * - 'complement_requested': Demande de compléments d'informations ou de pièces justificatives
 */
export const updateRequestStatus = async (req: any, res: any) => {
    try {
        const { reference } = req.params;
        const { action, status, user_id, user_name, user_role, motif } = req.body;

        const reqObj = requestsDB.find(r => r.reference === reference || String(r.id) === String(reference));
        if (!reqObj) return res.status(404).json({ error: 'Demande introuvable.' });

        const prevStatus = reqObj.status;

        // Secure actor resolution from authenticated user (fallback to body only if req.user absent)
        const actor = req.user || (user_id ? usersDatabase.find(u => u.id === Number(user_id)) : null);
        const actorId = actor?.id ? Number(actor.id) : (user_id ? Number(user_id) : 0);
        const actorName = actor?.name || user_name || (actorId ? `Utilisateur #${actorId}` : "Validateur");
        const actorRole = actor?.role || user_role || "Validateur";
        const actorRoles: string[] = actor?.roles || (actorRole ? [actorRole] : ["Validateur"]);
        const isSuperAdmin = actorRoles.some(r => r.toLowerCase() === 'administrateur' || r.toLowerCase() === 'admin');

        // Support direct edit of request details (title, description, equipment_type, site_name)
        if (action === 'edit' || req.body.edit_details) {
            if (req.body.title !== undefined) reqObj.title = req.body.title;
            if (req.body.description !== undefined) reqObj.description = req.body.description;
            if (req.body.equipment_type !== undefined) reqObj.equipment_type = req.body.equipment_type;
            if (req.body.site_name !== undefined) {
                reqObj.site_name = req.body.site_name;
                const siteObj = portalSitesDatabase.find(s => s.name === req.body.site_name);
                if (siteObj) reqObj.site_id = siteObj.id;
            }
            logAction(actorName, actorRole, "EDIT_REQUEST", reqObj.reference, `Modification des détails de la demande`);
            notificationService.notifyRequestEdited(reqObj, actorName);
            return res.status(200).json({ message: "Demande mise à jour", request: reqObj });
        }

        // NIS 2 Principle: 4-eyes check (Self-approval strictly forbidden)
        // Strictly prevent either the demandeur (who filed the request) or the beneficiaire (who receives the access) from approving
        const isSelfApproval = (reqObj.demandeur_id && actorId === reqObj.demandeur_id) ||
                               (reqObj.beneficiaire_id && actorId === reqObj.beneficiaire_id);
        if ((action === 'approved' || status === 'Validée' || status === 'Approuvée') && actorId && isSelfApproval) {
            return res.status(403).json({
                error: "Conformité NIS 2 (Contrôle 4-yeux) : L'auto-approbation est strictement interdite. Ni l'agent demandeur ni le bénéficiaire ne peuvent statuer sur leur propre dossier."
            });
        }

        // Role & Stage Permission Check + Scoping by Site / Référentiel
        const currentStageIdx = reqObj.current_stage_index ?? 0;
        const currentStage = reqObj.stages ? reqObj.stages[currentStageIdx] : null;

        if (currentStage && !isSuperAdmin) {
            const hasDelegation = currentStage.validator_id && (delegationMap as any)[currentStage.validator_id] === actorId;
            const isAssigned = currentStage.validator_id ? currentStage.validator_id === actorId : false;
            const roleMatches = actorRoles.some(r => r.toLowerCase() === currentStage.validator_role.toLowerCase());

            if (!hasDelegation && !isAssigned && !roleMatches) {
                return res.status(403).json({
                    error: `Habilitation insuffisante : l'étape active '${currentStage.name}' requiert le rôle '${currentStage.validator_role}'. Vos rôles actuels: ${actorRoles.join(', ')}.`
                });
            }

            // Scoping by Site / Référentiel check
            if (!hasDelegation && !isAssigned) {
                const stageRoleLower = currentStage.validator_role.toLowerCase();
                if (stageRoleLower.includes('site') || stageRoleLower.includes('validat') || stageRoleLower.includes('manager')) {
                    const actorSite = actor?.attributes?.site || '';
                    const actorRegion = actor?.attributes?.region || '';
                    const dossierSiteName = reqObj.site_name || '';
                    const siteObj = portalSitesDatabase.find(s => s.id === reqObj.site_id || s.name === dossierSiteName);

                    const siteMatches = actorSite && dossierSiteName && (
                        actorSite.toLowerCase().includes(dossierSiteName.toLowerCase()) ||
                        dossierSiteName.toLowerCase().includes(actorSite.toLowerCase())
                    );
                    const regionMatches = actorRegion && siteObj?.region && (
                        actorRegion.toLowerCase() === siteObj.region.toLowerCase()
                    );
                    const isSiteAssigned = siteObj && siteObj.validator_id === actorId;

                    if (!siteMatches && !regionMatches && !isSiteAssigned) {
                        return res.status(403).json({
                            error: `Périmètre non autorisé : Vous n'êtes pas habilité sur le site '${dossierSiteName}' ou le référentiel de cette demande. Votre rattachement : ${actorSite || actorRegion || 'Non spécifié'}.`
                        });
                    }
                }
            }
        }

        // Determine target status
        let targetStatus = reqObj.status;
        if (action === 'approved' || status === 'Validée' || status === 'Approuvée') {
            if (reqObj.stages && currentStageIdx + 1 < reqObj.stages.length) {
                const nextStage = reqObj.stages[currentStageIdx + 1];
                targetStatus = nextStage.validator_role === 'Validateur Site'
                    ? 'En attente validation Site'
                    : `En attente validation ${nextStage.validator_role}`;
            } else {
                targetStatus = 'Validée';
            }
        } else if (action === 'rejected' || status === 'Refusée') {
            targetStatus = 'Refusée';
        } else if (action === 'complement_requested' || status === 'Complément requis') {
            targetStatus = 'Complément requis';
        } else if (status) {
            targetStatus = status;
        }

        // Enforce Status Grid Matrix
        if (targetStatus !== prevStatus) {
            const transitionCheck = validateStatusTransition(prevStatus, targetStatus, actorRoles);
            if (!transitionCheck.allowed) {
                return res.status(400).json({ error: transitionCheck.error });
            }
        }

        // Evaluate BEFORE_TRANSITION Business Rules
        const activeRules = businessRulesStore.filter(r => r.is_active && (r.associated_processes?.includes('ALL') || (reqObj.process_code && r.associated_processes?.includes(reqObj.process_code))));
        const transitionPayload = {
            ...reqObj,
            ...(reqObj.form_data || {}),
            validator_id: actorId,
            validator_name: actorName,
            validator_role: actorRole,
            target_status: targetStatus,
            action
        };

        for (const rule of activeRules) {
            if (rule.trigger_event === 'BEFORE_TRANSITION' || rule.trigger_event === 'ON_STAGE_ENTER') {
                if (evaluateBusinessRule(rule, transitionPayload)) {
                    if (rule.action_type === 'BLOCK_TRANSITION') {
                        return res.status(400).json({
                            error: `Règle métier bloquante [${rule.code}] : ${rule.error_message}`
                        });
                    }
                }
            }
        }

        if (action === 'approved' || status === 'Validée' || status === 'Approuvée') {
            if (reqObj.stages && reqObj.stages[currentStageIdx]) {
                reqObj.stages[currentStageIdx].status = 'approved';
                reqObj.stages[currentStageIdx].validated_at = new Date().toISOString();
                reqObj.stages[currentStageIdx].validator_name = actorName;
                reqObj.stages[currentStageIdx].comment = motif || "Validation accordée";
            }

            // Vérifier s'il reste une étape suivante
            if (reqObj.stages && currentStageIdx + 1 < reqObj.stages.length) {
                reqObj.current_stage_index = currentStageIdx + 1;
                const nextStage = reqObj.stages[reqObj.current_stage_index];
                nextStage.status = 'pending';
                reqObj.status = nextStage.validator_role === 'Validateur Site'
                    ? 'En attente validation Site'
                    : `En attente validation ${nextStage.validator_role}`;
            } else {
                reqObj.status = 'Validée';
                reqObj.current_stage_index = reqObj.stages ? reqObj.stages.length : 1;
            }

            recordDecision({
                reference: reqObj.reference,
                title: reqObj.title,
                decision: reqObj.status === 'Validée' ? 'Validée (Finale)' : `Étape validée -> ${reqObj.status}`,
                author: `${actorName} (${actorRole})`,
                date: new Date().toISOString(),
                motif: motif || "Étape approuvée"
            });

            logAction(
                actorName,
                actorRole,
                "VALIDATE_STAGE",
                reqObj.reference,
                `Validation accordée. Nouveau statut: '${reqObj.status}'`
            );

        } else if (action === 'rejected' || status === 'Refusée') {
            if (!motif || motif.trim() === '') {
                return res.status(400).json({ error: 'Un motif est strictement obligatoire en cas de refus.' });
            }

            if (reqObj.stages && reqObj.stages[currentStageIdx]) {
                reqObj.stages[currentStageIdx].status = 'rejected';
                reqObj.stages[currentStageIdx].validated_at = new Date().toISOString();
                reqObj.stages[currentStageIdx].validator_name = actorName;
                reqObj.stages[currentStageIdx].comment = motif;
            }

            reqObj.status = 'Refusée';

            recordDecision({
                reference: reqObj.reference,
                title: reqObj.title,
                decision: 'Refusée',
                author: `${actorName} (${actorRole})`,
                date: new Date().toISOString(),
                motif
            });

            logAction(
                actorName,
                actorRole,
                "REJECT_REQUEST",
                reqObj.reference,
                `Refus prononcé pour le motif : ${motif}`
            );

        } else if (action === 'complement_requested' || status === 'Complément requis') {
            if (!motif || motif.trim() === '') {
                return res.status(400).json({ error: 'Veuillez préciser la question ou la pièce justificative attendue.' });
            }

            reqObj.status = 'Complément requis';
            reqObj.complement_request = {
                requested_by: `${actorName} (${actorRole})`,
                requested_at: new Date().toISOString(),
                message: motif
            };

            if (reqObj.stages && reqObj.stages[currentStageIdx]) {
                reqObj.stages[currentStageIdx].status = 'complement_requested';
                reqObj.stages[currentStageIdx].comment = motif;
            }

            recordDecision({
                reference: reqObj.reference,
                title: reqObj.title,
                decision: 'Complément requis',
                author: `${actorName} (${actorRole})`,
                date: new Date().toISOString(),
                motif
            });

            logAction(
                actorName,
                actorRole,
                "REQUEST_COMPLEMENT",
                reqObj.reference,
                `Demande d'information complémentaire : ${motif}`
            );
        } else {
            // Changement de statut direct
            reqObj.status = status || prevStatus;
            recordDecision({
                reference: reqObj.reference,
                title: reqObj.title,
                decision: reqObj.status,
                author: actorName,
                date: new Date().toISOString(),
                motif: motif || ''
            });
            logAction(actorName, actorRole, "UPDATE_STATUS", reqObj.reference, `Passage à '${reqObj.status}'`);
        }

        try {
            await requestRepository.update(reqObj.reference, {
                title: reqObj.title,
                description: reqObj.description,
                status: reqObj.status,
                current_stage_index: reqObj.current_stage_index,
                stages: reqObj.stages,
                site_id: reqObj.site_id,
                site_name: reqObj.site_name,
                equipment_type: reqObj.equipment_type,
                intervention_duration: reqObj.intervention_duration,
                complement_request: reqObj.complement_request,
                ai_analysis: reqObj.ai_analysis,
                process_id: reqObj.process_id,
                process_name: reqObj.process_name,
                process_code: reqObj.process_code,
                form_id: reqObj.form_id,
                form_data: reqObj.form_data
            });
        } catch (dbUpdateErr) {
            console.error('Erreur mise à jour SQLite:', dbUpdateErr);
        }

        notificationService.notifyStatusChange(reqObj, prevStatus, reqObj.status, motif, actorName);
        res.status(200).json(reqObj);
    } catch (error) {
        console.error("updateRequestStatus error:", error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du statut.' });
    }
};

/**
 * Réponse du demandeur à une demande de complément
 */
export const respondToComplement = async (req: any, res: any) => {
    try {
        const { reference } = req.params;
        const { response_text } = req.body;

        const reqObj = requestsDB.find(r => r.reference === reference);
        if (!reqObj) return res.status(404).json({ error: 'Demande introuvable.' });

        if (!response_text || response_text.trim() === '') {
            return res.status(400).json({ error: 'Le texte de réponse est requis.' });
        }

        if (reqObj.complement_request) {
            reqObj.complement_request.response = response_text;
            reqObj.complement_request.responded_at = new Date().toISOString();
        }

        // Reprise du circuit à l'étape en cours
        const stageIdx = reqObj.current_stage_index || 0;
        if (reqObj.stages && reqObj.stages[stageIdx]) {
            reqObj.stages[stageIdx].status = 'pending';
            reqObj.status = reqObj.stages[stageIdx].validator_role === 'Validateur Site'
                ? 'En attente validation Site'
                : 'En attente validation Manager';
        } else {
            reqObj.status = 'En attente validation Manager';
        }

        recordDecision({
            reference: reqObj.reference,
            title: reqObj.title,
            decision: 'Complément fourni',
            author: reqObj.beneficiaire_name || 'Demandeur',
            date: new Date().toISOString(),
            motif: response_text
        });

        logAction(
            reqObj.beneficiaire_name || 'Demandeur',
            'Demandeur',
            'SUBMIT_COMPLEMENT',
            reqObj.reference,
            `Réponse au complément : ${response_text}`
        );

        notificationService.notifyComplementProvided(reqObj, response_text);

        res.status(200).json(reqObj);
    } catch (error) {
        console.error("respondToComplement error:", error);
        res.status(500).json({ error: 'Erreur lors de la soumission du complément.' });
    }
};

export const exportCSV = async (_req: any, res: any) => {
    if (!(await featureRepository.isEnabled('export_csv_advanced'))) {
        return res.status(403).json({
            error: "L'exportation CSV est actuellement désactivée par l'administrateur système.",
            feature_disabled: true
        });
    }
    let csv = 'ID,Reference,Titre,Statut,Site,Equipement,Beneficiaire,Date\n';
    requestsDB.forEach(r => {
        csv += `${r.id},"${r.reference}","${r.title}","${r.status}","${r.site_name || ''}","${r.equipment_type || ''}",${r.beneficiaire_id},"${r.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="demandes_acces.csv"');
    res.send(csv);
};

export const setDelegation = async (req: any, res: any) => {
    if (!(await featureRepository.isEnabled('delegation_approval'))) {
        return res.status(403).json({
            error: "Le module de délégation de pouvoir est actuellement désactivé par l'administrateur.",
            feature_disabled: true
        });
    }
    const { delegator_id, delegate_id } = req.body;
    (delegationMap as any)[delegator_id] = delegate_id;
    try {
        const db = await getDatabase();
        await db.run(
            'INSERT OR REPLACE INTO delegations (delegator_id, delegate_id, created_at) VALUES (?, ?, ?)',
            Number(delegator_id), Number(delegate_id), new Date().toISOString()
        );
    } catch (e) {
        console.warn('Persisting delegation to SQLite warning:', e);
    }
    logAction("Manager", "Délégation", "SET_DELEGATION", `User ${delegator_id}`, `Délégation accordée à l'utilisateur ${delegate_id}`);
    notificationService.notifyDelegationSet(delegator_id, delegate_id);
    res.status(200).json({ message: "Délégation enregistrée avec succès", delegations: delegationMap });
};

export const getDelegations = async (_req: any, res: any) => {
    if (!(await featureRepository.isEnabled('delegation_approval'))) {
        return res.status(403).json({
            error: "Le module de délégation de pouvoir est actuellement désactivé par l'administrateur.",
            feature_disabled: true
        });
    }
    res.status(200).json(delegationMap);
};

export const getAuditLogs = async (_req: any, res: any) => {
    if (!(await featureRepository.isEnabled('syslog_audit_nis2'))) {
        return res.status(403).json({
            error: "La consultation du journal Syslog & Audit NIS 2 est actuellement désactivée par l'administrateur.",
            feature_disabled: true
        });
    }
    res.status(200).json([...auditLogs].reverse());
};

export const getDecisionHistory = async (_req: any, res: any) => {
    res.status(200).json([...decisionHistory].reverse());
};

export const exportExcel = async (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="demandes_acces.xls"');
    res.send('<html><head><meta charset="utf-8"/></head><body><table border="1"><tr><th>ID</th><th>Référence</th><th>Titre</th><th>Site</th><th>Équipement</th><th>Statut</th><th>Date</th></tr>' +
        requestsDB.map(r => `<tr><td>${r.id}</td><td>${r.reference}</td><td>${r.title}</td><td>${r.site_name || '-'}</td><td>${r.equipment_type || '-'}</td><td>${r.status}</td><td>${r.created_at}</td></tr>`).join('') +
        '</table></body></html>');
};

export const exportPDF = async (_req: any, res: any) => {
    try {
        let items: any[] = [];
        try {
            items = await requestRepository.getAll();
        } catch (dbErr) {
            console.warn("Could not load from requestRepository, falling back to requestsDB", dbErr);
        }
        if (!items || items.length === 0) {
            items = requestsDB;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Top banner
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 20, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PORTAIL OPÉRATIONNEL & HABILITATIONS', 14, 11);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Gestion Sécurisée des Accès Mécatroniques — Directive NIS 2', 14, 16);

        // Subtitle & Metadata
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text("REGISTRE OFFICIEL DES DEMANDES D'ACCÈS MÉCATRONIQUES (EN 15864 / EN 16864)", 14, 28);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const exportDateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
        doc.text(`Émis le : ${exportDateStr}  |  Total dossiers : ${items.length}  |  Classification : Confidentiel Interne`, 14, 34);

        // Prepare table rows
        const tableRows = items.map((r: any) => {
            let dateStr = '-';
            try {
                if (r.created_at) {
                    const dt = new Date(r.created_at);
                    if (!isNaN(dt.getTime())) {
                        dateStr = dt.toLocaleDateString('fr-FR');
                    }
                }
            } catch {}

            let parsedStages = r.stages;
            if (typeof parsedStages === 'string') {
                try { parsedStages = JSON.parse(parsedStages); } catch {}
            }
            if (!Array.isArray(parsedStages)) parsedStages = [];

            let selectedSites = r.selected_site_ids;
            if (typeof selectedSites === 'string') {
                try { selectedSites = JSON.parse(selectedSites); } catch {}
            }

            const benef = r.is_team_request ? `[Équipe] ${r.team_name || ''} (${r.team_company || 'Interne'})` : (r.beneficiaire_name || 'Collaborateur');
            const siteStr = r.is_multi_site ? `Multi-sites (${Array.isArray(selectedSites) ? selectedSites.length : 1})` : (r.site_name || '-');
            const equipmentStr = r.equipment_type || '-';
            const stageStr = parsedStages[r.current_stage_index ?? 0]?.name || '-';
            return [
                r.reference || `REQ-${r.id}`,
                dateStr,
                r.title || 'Sans titre',
                benef,
                siteStr,
                equipmentStr,
                stageStr,
                r.status || 'En attente'
            ];
        });

        autoTable(doc, {
            startY: 38,
            head: [['Réf.', 'Date', 'Objet / Titre', 'Demandeur', 'Site Cible', 'Équipement', 'Étape', 'Statut']],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [30, 41, 59],
                cellPadding: 2.5
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 26 },
                1: { cellWidth: 20 },
                2: { cellWidth: 50 },
                3: { cellWidth: 38 },
                4: { cellWidth: 46 },
                5: { cellWidth: 38 },
                6: { cellWidth: 42 },
                7: { fontStyle: 'bold', cellWidth: 24 }
            },
            didDrawPage: () => {
                const pageNum = doc.internal.pages.length - 1;
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Page ${pageNum} - Registre Mécatronique certifié`, 14, pageHeight - 8);
                doc.text("Conforme aux normes européennes EN 15864 (serrures mécatroniques) et EN 16864 (cylindres)", pageWidth - 14, pageHeight - 8, { align: 'right' });
            }
        });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="demandes.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(pdfBuffer);
    } catch (err) {
        console.error("Erreur génération PDF:", err);
        res.status(500).json({ error: "Erreur lors de la génération du fichier PDF." });
    }
};

export const exportSingleRequestPDF = async (req: any, res: any) => {
    try {
        const { reference } = req.params;
        const cleanRef = (reference || '').trim();

        // 1. Try finding in SQLite repository first
        let reqObj: any = null;
        try {
            reqObj = await requestRepository.getByReference(cleanRef);
        } catch (dbErr) {
            console.warn("Could not query requestRepository:", dbErr);
        }

        // 2. Try finding in in-memory requestsDB (case-insensitive)
        if (!reqObj) {
            reqObj = requestsDB.find(r => 
                (r.reference && r.reference.trim().toUpperCase() === cleanRef.toUpperCase()) ||
                String(r.id) === String(cleanRef)
            );
        }

        // 3. Fallback: try by ID if reference is numeric or contains ID
        if (!reqObj) {
            const numericId = parseInt(cleanRef.replace(/\D/g, ''), 10);
            if (!isNaN(numericId)) {
                reqObj = requestsDB.find(r => r.id === numericId);
                if (!reqObj) {
                    try {
                        reqObj = await requestRepository.getById(numericId);
                    } catch {}
                }
            }
        }

        if (!reqObj) {
            console.warn(`[PDF Export] Demande introuvable pour la référence: "${cleanRef}"`);
            return res.status(404).json({ error: `Demande introuvable pour la référence "${cleanRef}".` });
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Top Header Banner
        doc.setFillColor(0, 35, 149); // Corporate Blue #002395
        doc.rect(0, 0, pageWidth, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('PORTAIL OPÉRATIONNEL', 14, 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("Direction des Infrastructures & Sûreté d'Accès Mécatronique", 14, 18);
        doc.text('NORME EN 15864 / EN 16864', pageWidth - 14, 15, { align: 'right' });

        // 2. Title & Status Banner
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text("BON D'AUTORISATION D'ACCÈS MÉCATRONIQUE", 14, 34);

        // Reference Box with status color
        const isApproved = reqObj.status === 'Validée';
        const isRejected = reqObj.status === 'Refusée';
        const isDraft = Boolean((reqObj as any).is_draft) || reqObj.status === 'Brouillon';

        let statusBg = [219, 234, 254]; // Blue (En cours)
        let statusText = [30, 64, 175];
        if (isApproved) {
            statusBg = [209, 250, 229]; // Green
            statusText = [6, 95, 70];
        } else if (isRejected) {
            statusBg = [254, 226, 226]; // Red
            statusText = [153, 27, 27];
        } else if (isDraft) {
            statusBg = [241, 245, 249];
            statusText = [71, 85, 105];
        }

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, 38, 182, 18, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(`RÉFÉRENCE : ${reqObj.reference || `REQ-${reqObj.id}`}`, 20, 47);
        doc.setFont('helvetica', 'normal');
        let creationDateStr = new Date().toLocaleDateString('fr-FR');
        try {
            if (reqObj.created_at) {
                const dt = new Date(reqObj.created_at);
                if (!isNaN(dt.getTime())) {
                    creationDateStr = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            }
        } catch {}
        doc.text(`Créée le : ${creationDateStr}`, 20, 52);

        // Status Badge
        const statusLabel = String(reqObj.status || 'EN COURS').toUpperCase();
        doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
        doc.roundedRect(132, 42, 58, 10, 2, 2, 'F');
        doc.setTextColor(statusText[0], statusText[1], statusText[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`STATUT : ${statusLabel}`, 161, 48.5, { align: 'center' });

        let currentY = 62;

        // 3. Section: Informations Générales & Demandeur
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('1. INFORMATIONS DEMANDEUR & BÉNÉFICIAIRE', 17, currentY + 5);
        currentY += 10;

        let parsedTeamMembers = reqObj.team_members;
        if (typeof parsedTeamMembers === 'string') {
            try { parsedTeamMembers = JSON.parse(parsedTeamMembers); } catch {}
        }
        const teamMembersStr = Array.isArray(parsedTeamMembers)
            ? parsedTeamMembers.map((m: any) => typeof m === 'object' ? `${m.name || ''} (${m.role || 'Opérateur'})` : String(m)).join(', ')
            : String(parsedTeamMembers || '');

        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            head: [],
            body: [
                ['Type de demande :', reqObj.is_team_request ? 'Collective (Équipe d\'intervention)' : 'Individuelle'],
                ['Demandeur / Titulaire :', reqObj.is_team_request ? `${reqObj.team_name || 'Équipe'} (${reqObj.team_company || 'Prestataire'})` : (reqObj.beneficiaire_name || 'Agent Terrain')],
                ['Service / Direction :', reqObj.beneficiaire_service || 'Maintenance & Exploitation'],
                ...(reqObj.is_team_request && teamMembersStr ? [['Membres de l\'équipe :', teamMembersStr]] : [])
            ],
            theme: 'plain',
            styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [30, 41, 59] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, textColor: [71, 85, 105] }, 1: { cellWidth: 137 } }
        });
        currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 25;

        // 4. Section: Objet de l'intervention et sites
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('2. CARACTÉRISTIQUES DE L\'ACCÈS MÉCATRONIQUE', 17, currentY + 5);
        currentY += 10;

        let selectedSiteIds = reqObj.selected_site_ids;
        if (typeof selectedSiteIds === 'string') {
            try { selectedSiteIds = JSON.parse(selectedSiteIds); } catch {}
        }
        const siteCount = Array.isArray(selectedSiteIds) ? selectedSiteIds.length : 1;
        const sitesDisplay = reqObj.is_multi_site
            ? `Multi-sites (${siteCount} sites sélectionnés)`
            : (reqObj.site_name || 'Site Technique non spécifié');

        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            head: [],
            body: [
                ['Titre de la demande :', reqObj.title || '-'],
                ['Description de l\'objet :', reqObj.description || 'Intervention programmée sur installations ferroviaires'],
                ['Site(s) ferroviaire(s) :', sitesDisplay],
                ['Équipement mécatronique :', reqObj.equipment_type || 'Clé programmable EN 15864'],
                ['Durée autorisée :', reqObj.intervention_duration || 'Durée du chantier standard']
            ],
            theme: 'plain',
            styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [30, 41, 59] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, textColor: [71, 85, 105] }, 1: { cellWidth: 137 } }
        });
        currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : currentY + 30;

        // 5. Section: Circuit d'approbation et visas
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('3. CIRCUIT D\'APPROBATION & TRAÇABILITÉ DES VALIDATIONS', 17, currentY + 5);
        currentY += 10;

        let parsedStages = reqObj.stages;
        if (typeof parsedStages === 'string') {
            try { parsedStages = JSON.parse(parsedStages); } catch {}
        }
        if (!Array.isArray(parsedStages)) parsedStages = [];

        const stageRows = parsedStages.map((st: any, idx: number) => {
            let dateStr = '-';
            try {
                if (st.validated_at) {
                    const dt = new Date(st.validated_at);
                    if (!isNaN(dt.getTime())) dateStr = dt.toLocaleString('fr-FR');
                }
            } catch {}

            const stageDecision = st.status === 'approved' ? 'VALIDÉE' : st.status === 'rejected' ? 'REFUSÉE' : st.status === 'complement' ? 'COMPLÉMENT' : 'EN ATTENTE';
            return [
                `Étape ${idx + 1} : ${st.name || 'Validation'}`,
                st.validator_name || `Rôle ${st.validator_role || 'Validateur'}`,
                stageDecision,
                dateStr,
                st.comment || '-'
            ];
        });

        if (stageRows.length === 0) {
            stageRows.push(['Circuit standard', 'Validation Hiérarchique & Site', 'En attente', '-', '-']);
        }

        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            head: [['Étape', 'Validateur Référent', 'Décision', 'Horodatage', 'Commentaires / Avis']],
            body: stageRows,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 46 },
                1: { cellWidth: 36 },
                2: { fontStyle: 'bold', cellWidth: 22 },
                3: { cellWidth: 32 },
                4: { cellWidth: 46 }
            }
        });
        currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : currentY + 30;

        // 6. Consignes de sécurité et cadre réglementaire
        doc.setFillColor(254, 252, 232); // Amber light
        doc.setDrawColor(254, 240, 138);
        doc.roundedRect(14, currentY, 182, 22, 2, 2, 'FD');
        doc.setTextColor(133, 77, 14);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CONSIGNES IMPÉRATIVES DE SÉCURITÉ FERROVIAIRE :', 18, currentY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('- Les accès aux emprises ferroviaires et sous-stations sont régis par les normes EN 15864 et EN 16864.', 18, currentY + 10);
        doc.text('- Habilitation H0B0 / B1V obligatoire pour tout franchissement de zone de traction électrique.', 18, currentY + 14);
        doc.text('- Ce document doit être présenté lors de tout contrôle inopiné par les agents de sûreté SUGE ou de site.', 18, currentY + 18);
        currentY += 26;

        // 7. Electronic Signature Stamp
        doc.setDrawColor(130, 0, 55);
        doc.setLineWidth(0.5);
        doc.roundedRect(120, currentY, 76, 20, 2, 2);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('VISA ÉLECTRONIQUE DE SÉCURITÉ', 158, currentY + 5, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Certifié conforme - Clé d'audit : ${reqObj.reference || reqObj.id}-${Date.now().toString(36).toUpperCase()}`, 158, currentY + 10, { align: 'center' });
        doc.text(`Émis le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 158, currentY + 15, { align: 'center' });

        // Footer
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Document officiel d\'autorisation d\'accès mécatronique - Tous droits réservés', 14, pageHeight - 8);
        doc.text('Page 1/1', pageWidth - 14, pageHeight - 8, { align: 'right' });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="autorisation_acces_${reqObj.reference || reqObj.id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(pdfBuffer);
    } catch (err) {
        console.error("Erreur génération PDF fiche:", err);
        res.status(500).json({ error: "Erreur lors de la génération de l'attestation PDF." });
    }
};

/**
 * Secure PDF Transmission Endpoint (Epic 2 - US 2.3)
 */
export const transmitSingleRequestPDF = async (req: any, res: any) => {
    try {
        const { reference } = req.params;
        const { recipients, actorName } = req.body;
        const reqObj = requestsDB.find(r => r.reference === reference || String(r.id) === String(reference));
        if (!reqObj) {
            return res.status(404).json({ error: "Demande introuvable pour transmission PDF." });
        }

        const pdfBuffer = await ArticlePdfService.generateDossierPdf({
            id: reqObj.id,
            reference: reqObj.reference,
            title: reqObj.title,
            description: reqObj.description || '',
            status: reqObj.status,
            created_at: reqObj.created_at || new Date().toISOString(),
            beneficiaire_name: (reqObj as any).requester_name || (reqObj as any).beneficiaire_name || 'Collaborateur',
            site_name: reqObj.site_name,
            equipment_type: reqObj.equipment_type,
            stages: reqObj.stages,
            form_data: (reqObj as any).form_data
        });

        const txResult = await TransmissionPdfService.transmitPdf({
            pdfBuffer,
            fileName: `dossier_${reqObj.reference}.pdf`,
            documentType: 'BORDEREAU_TRANSMISSION',
            referenceId: reqObj.reference,
            recipients: recipients || [{ email: (reqObj as any).requester_email || 'agent@entreprise.fr', name: (reqObj as any).requester_name || 'Agent' }],
            actorName: actorName || req.user?.name || 'Système'
        });

        res.status(200).json({
            message: `Bordereau PDF sécurisé et transmis avec succès (Réf: ${txResult.transmissionId})`,
            transmission: txResult
        });
    } catch (err: any) {
        console.error("Erreur transmitSingleRequestPDF:", err);
        res.status(500).json({ error: "Erreur lors de la transmission sécurisée du bordereau PDF." });
    }
};

/**
 * UX-01: Validation ou décision par lot (Bulk Approval / Rejection)
 */
export const batchUpdateRequests = async (req: any, res: any) => {
    try {
        const { references, action, motif, user_id, user_name, user_role } = req.body;

        if (!Array.isArray(references) || references.length === 0) {
            return res.status(400).json({ error: "Aucune demande sélectionnée pour le traitement par lot." });
        }

        if (action === 'rejected' && (!motif || motif.trim() === '')) {
            return res.status(400).json({ error: "Un motif global est strictement requis pour un refus par lot." });
        }

        const actor = req.user || (user_id ? usersDatabase.find(u => u.id === Number(user_id)) : null);
        const actorId = actor?.id ? Number(actor.id) : (user_id ? Number(user_id) : 0);
        const actorName = actor?.name || user_name || (actorId ? `Utilisateur #${actorId}` : "Validateur");
        const actorRole = actor?.role || user_role || "Validateur";
        const actorRoles: string[] = actor?.roles || (actorRole ? [actorRole] : ["Validateur"]);
        const isSuperAdmin = actorRoles.some(r => r.toLowerCase() === 'administrateur' || r.toLowerCase() === 'admin');

        const processed: string[] = [];
        const errors: { reference: string; error: string }[] = [];

        for (const ref of references) {
            const reqObj = requestsDB.find(r => r.reference === ref || String(r.id) === String(ref));
            if (!reqObj) {
                errors.push({ reference: ref, error: "Demande introuvable" });
                continue;
            }

            // NIS 2 4-Eyes Check: Cannot approve own request (neither demandeur nor beneficiaire)
            const isSelfApproval = (reqObj.demandeur_id && actorId === reqObj.demandeur_id) ||
                                   (reqObj.beneficiaire_id && actorId === reqObj.beneficiaire_id);
            if (action === 'approved' && actorId && isSelfApproval) {
                errors.push({ reference: ref, error: "Auto-approbation strictement interdite (Contrôle 4-yeux NIS 2)" });
                continue;
            }

            const currentStageIdx = reqObj.current_stage_index ?? 0;
            const currentStage = reqObj.stages ? reqObj.stages[currentStageIdx] : null;

            // Role check and Site scoping if not SuperAdmin
            if (currentStage && !isSuperAdmin) {
                const hasDelegation = currentStage.validator_id && (delegationMap as any)[currentStage.validator_id] === actorId;
                const isAssigned = currentStage.validator_id ? currentStage.validator_id === actorId : false;
                const roleMatches = actorRoles.some(r => r.toLowerCase() === currentStage.validator_role.toLowerCase());

                if (!hasDelegation && !isAssigned && !roleMatches) {
                    errors.push({ reference: ref, error: `Habilitation insuffisante pour l'étape '${currentStage.name}' (requis: ${currentStage.validator_role})` });
                    continue;
                }

                // Site Scoping check
                if (!hasDelegation && !isAssigned) {
                    const stageRoleLower = currentStage.validator_role.toLowerCase();
                    if (stageRoleLower.includes('site') || stageRoleLower.includes('validat') || stageRoleLower.includes('manager')) {
                        const actorSite = actor?.attributes?.site || '';
                        const actorRegion = actor?.attributes?.region || '';
                        const dossierSiteName = reqObj.site_name || '';
                        const siteObj = portalSitesDatabase.find(s => s.id === reqObj.site_id || s.name === dossierSiteName);

                        const siteMatches = actorSite && dossierSiteName && (
                            actorSite.toLowerCase().includes(dossierSiteName.toLowerCase()) ||
                            dossierSiteName.toLowerCase().includes(actorSite.toLowerCase())
                        );
                        const regionMatches = actorRegion && siteObj?.region && (
                            actorRegion.toLowerCase() === siteObj.region.toLowerCase()
                        );
                        const isSiteAssigned = siteObj && siteObj.validator_id === actorId;

                        if (!siteMatches && !regionMatches && !isSiteAssigned) {
                            errors.push({ reference: ref, error: `Périmètre non autorisé pour le site '${dossierSiteName}'` });
                            continue;
                        }
                    }
                }
            }

            const prevStatus = reqObj.status;
            let targetStatus = prevStatus;

            if (action === 'approved') {
                if (reqObj.stages && currentStageIdx + 1 < reqObj.stages.length) {
                    const nextStage = reqObj.stages[currentStageIdx + 1];
                    targetStatus = nextStage.validator_role === 'Validateur Site'
                        ? 'En attente validation Site'
                        : `En attente validation ${nextStage.validator_role}`;
                } else {
                    targetStatus = 'Validée';
                }
            } else if (action === 'rejected') {
                targetStatus = 'Refusée';
            }

            // Status Grid Validation
            const transitionCheck = validateStatusTransition(prevStatus, targetStatus, actorRoles);
            if (!transitionCheck.allowed) {
                errors.push({ reference: ref, error: transitionCheck.error || "Transition de statut interdite" });
                continue;
            }

            if (action === 'approved') {
                if (reqObj.stages && reqObj.stages[currentStageIdx]) {
                    reqObj.stages[currentStageIdx].status = 'approved';
                    reqObj.stages[currentStageIdx].validated_at = new Date().toISOString();
                    reqObj.stages[currentStageIdx].validator_name = actorName;
                    reqObj.stages[currentStageIdx].comment = motif || "Validation par lot (Bulk Approval)";
                }

                if (reqObj.stages && currentStageIdx + 1 < reqObj.stages.length) {
                    reqObj.current_stage_index = currentStageIdx + 1;
                    const nextStage = reqObj.stages[reqObj.current_stage_index];
                    nextStage.status = 'pending';
                    reqObj.status = nextStage.validator_role === 'Validateur Site'
                        ? 'En attente validation Site'
                        : `En attente validation ${nextStage.validator_role}`;
                } else {
                    reqObj.status = 'Validée';
                    reqObj.current_stage_index = reqObj.stages ? reqObj.stages.length : 1;
                }

                recordDecision({
                    reference: reqObj.reference,
                    title: reqObj.title,
                    decision: reqObj.status === 'Validée' ? 'Validée par lot (Finale)' : `Étape validée par lot -> ${reqObj.status}`,
                    author: `${actorName} (${actorRole})`,
                    date: new Date().toISOString(),
                    motif: motif || "Validation par lot"
                });

                logAction(
                    actorName,
                    actorRole,
                    "BATCH_APPROVE",
                    reqObj.reference,
                    `Validation par lot. Nouveau statut: '${reqObj.status}'`
                );

                notificationService.notifyStatusChange(reqObj, prevStatus, reqObj.status, motif, actorName);
                processed.push(reqObj.reference);

            } else if (action === 'rejected') {
                if (reqObj.stages && reqObj.stages[currentStageIdx]) {
                    reqObj.stages[currentStageIdx].status = 'rejected';
                    reqObj.stages[currentStageIdx].validated_at = new Date().toISOString();
                    reqObj.stages[currentStageIdx].validator_name = actorName;
                    reqObj.stages[currentStageIdx].comment = motif;
                }

                reqObj.status = 'Refusée';

                recordDecision({
                    reference: reqObj.reference,
                    title: reqObj.title,
                    decision: 'Refusée (par lot)',
                    author: `${actorName} (${actorRole})`,
                    date: new Date().toISOString(),
                    motif
                });

                logAction(
                    actorName,
                    actorRole,
                    "BATCH_REJECT",
                    reqObj.reference,
                    `Refus par lot avec motif: ${motif}`
                );

                notificationService.notifyStatusChange(reqObj, prevStatus, reqObj.status, motif, actorName);
                processed.push(reqObj.reference);
            }

            try {
                await requestRepository.update(reqObj.reference, {
                    status: reqObj.status,
                    current_stage_index: reqObj.current_stage_index,
                    stages: reqObj.stages
                });
            } catch (dbErr) {
                console.warn(`Could not sync ${reqObj.reference} to SQLite:`, dbErr);
            }
        }

        res.status(200).json({
            message: `${processed.length} demande(s) traitée(s) avec succès par lot.`,
            processed_count: processed.length,
            processed,
            errors
        });
    } catch (error) {
        console.error("batchUpdateRequests error:", error);
        res.status(500).json({ error: "Erreur lors du traitement par lot des demandes." });
    }
};
