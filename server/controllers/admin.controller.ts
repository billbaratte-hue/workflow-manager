import { categoriesDatabase, processTemplates, notificationTemplatesDatabase, NotificationTemplate, formTemplatesDatabase, FormTemplate, FormFieldConfig, statusesDatabase, CustomStatusConfig, statusCategoriesDatabase, StatusCategoryConfig, statusMetadataStore, StatusMetadataConfig, businessRulesStore, BusinessRule, ruleDomainsDatabase, RuleDomainConfig, initialRuleDomains, logAction } from '../db/store.js';
import { tabRepository } from '../repositories/tab.repository.js';
import { adminNavRepository } from '../repositories/adminNav.repository.js';
import { adminNavSectionsRepository } from '../repositories/adminNavSections.repository.js';
import { configRepository } from '../repositories/config.repository.js';

export const getCategories = async (req: any, res: any) => {
    res.status(200).json(categoriesDatabase);
};

export const createCategory = async (req: any, res: any) => {
    const newCat = {
        id: categoriesDatabase.length + 1,
        name: req.body.name,
        description: req.body.description || "",
        status: "Actif"
    };
    categoriesDatabase.push(newCat);
    res.status(201).json({ message: "Catalogue créé", category: newCat });
};

export const updateCategoryStatus = async (req: any, res: any) => {
    const cat = categoriesDatabase.find(c => c.id === parseInt(req.params.id));
    if (!cat) return res.status(404).json({ error: "Catalogue introuvable." });
    if (req.body.name !== undefined) cat.name = req.body.name;
    if (req.body.description !== undefined) cat.description = req.body.description;
    if (req.body.status !== undefined) cat.status = req.body.status;
    res.status(200).json({ message: "Catalogue mis à jour", cat });
};

export const deleteCategory = async (req: any, res: any) => {
    const idx = categoriesDatabase.findIndex(c => c.id === parseInt(req.params.id));
    if (idx > -1) categoriesDatabase.splice(idx, 1);
    res.status(200).json({ message: "Catalogue supprimé" });
};

export const getProcesses = async (req: any, res: any) => {
    res.status(200).json(processTemplates);
};

export const createProcess = async (req: any, res: any) => {
    if (req.body.stages && Array.isArray(req.body.stages)) {
        for (const stg of req.body.stages) {
            const rName = (stg.validator_role || '').trim().toLowerCase();
            if (rName === 'administrateur' || rName === 'admin' || rName === 'administrateur système' || rName.startsWith('admin')) {
                return res.status(400).json({
                    error: `Le rôle "${stg.validator_role}" ne peut pas être validateur d'étape. Veuillez sélectionner un rôle opérationnel (hors Administrateur).`
                });
            }
        }
    }
    const maxId = processTemplates.reduce((max, p) => Math.max(max, p.id || 0), 0);
    const newProcess = {
        id: maxId + 1,
        ...req.body,
        code: req.body.code || `WF-${String(maxId + 1).padStart(2, '0')}`,
        status: req.body.status || "Publié"
    };
    processTemplates.push(newProcess);
    try {
        await configRepository.saveProcess(newProcess);
    } catch (e) {
        console.error('Erreur sauvegarde SQLite process:', e);
    }
    res.status(201).json({ message: 'Processus créé', process: newProcess });
};

export const updateProcessStatus = async (req: any, res: any) => {
    const proc = processTemplates.find(p => p.id === parseInt(req.params.id));
    if (!proc) return res.status(404).json({ error: "Processus introuvable." });
    if (req.body.name !== undefined) proc.name = req.body.name;
    if (req.body.code !== undefined) proc.code = req.body.code;
    if (req.body.description !== undefined) proc.description = req.body.description;
    if (req.body.category_id !== undefined) proc.category_id = parseInt(req.body.category_id);
    if (req.body.status !== undefined) proc.status = req.body.status;
    if (req.body.workflow_rules !== undefined) proc.workflow_rules = req.body.workflow_rules;
    if (req.body.request_type !== undefined) proc.request_type = req.body.request_type;
    if (req.body.has_special_tag !== undefined) proc.has_special_tag = req.body.has_special_tag;
    if (req.body.stages !== undefined && Array.isArray(req.body.stages)) {
        for (const stg of req.body.stages) {
            const rName = (stg.validator_role || '').trim().toLowerCase();
            if (rName === 'administrateur' || rName === 'admin' || rName === 'administrateur système' || rName.startsWith('admin')) {
                return res.status(400).json({
                    error: `Le rôle "${stg.validator_role}" ne peut pas être validateur d'étape. Veuillez sélectionner un rôle opérationnel (hors Administrateur).`
                });
            }
        }
        proc.stages = req.body.stages;
    }
    if (req.body.fields !== undefined && Array.isArray(req.body.fields)) proc.fields = req.body.fields;
    if (req.body.linked_tables !== undefined && Array.isArray(req.body.linked_tables)) proc.linked_tables = req.body.linked_tables;
    if (req.body.notifications !== undefined && Array.isArray(req.body.notifications)) proc.notifications = req.body.notifications;
    if (req.body.transitions !== undefined && Array.isArray(req.body.transitions)) proc.transitions = req.body.transitions;
    if (req.body.metadata !== undefined) proc.metadata = req.body.metadata;

    try {
        await configRepository.saveProcess(proc);
    } catch (e) {
        console.error('Erreur mise à jour SQLite process:', e);
    }
    res.status(200).json({ message: "Processus mis à jour", proc });
};

export const deleteProcess = async (req: any, res: any) => {
    const processId = parseInt(req.params.id);
    const idx = processTemplates.findIndex(p => p.id === processId);
    if (idx > -1) processTemplates.splice(idx, 1);
    try {
        await configRepository.deleteProcess(processId);
    } catch (e) {
        console.error('Erreur suppression SQLite process:', e);
    }
    res.status(200).json({ message: "Processus supprimé" });
};

export const duplicateProcess = async (req: any, res: any) => {
    const proc = processTemplates.find(p => p.id === parseInt(req.params.id));
    if (!proc) return res.status(404).json({ error: "Processus introuvable." });

    const maxId = processTemplates.reduce((max, p) => Math.max(max, p.id || 0), 0);
    const clonedProcess = {
        ...JSON.parse(JSON.stringify(proc)),
        id: maxId + 1,
        name: `${proc.name} (Copie)`,
        status: "Brouillon",
        metadata: {
            ...(proc.metadata || {}),
            cloned_from: proc.id,
            cloned_at: new Date().toISOString()
        }
    };

    processTemplates.push(clonedProcess);
    try {
        await configRepository.saveProcess(clonedProcess);
    } catch (e) {
        console.error('Erreur duplication SQLite process:', e);
    }
    res.status(201).json({ message: "Processus dupliqué avec succès", process: clonedProcess });
};

export const importProcess = async (req: any, res: any) => {
    try {
        const payload = req.body;
        const itemsToImport = Array.isArray(payload) ? payload : [payload];
        const imported: any[] = [];

        for (const item of itemsToImport) {
            if (!item.name) continue;
            const maxId = processTemplates.reduce((max, p) => Math.max(max, p.id || 0), 0);
            const newProcess = {
                id: maxId + 1,
                name: item.name,
                category_id: item.category_id || 1,
                description: item.description || '',
                status: item.status || "Publié",
                request_type: item.request_type || 'HABILITATION',
                has_special_tag: Boolean(item.has_special_tag),
                workflow_rules: item.workflow_rules || {
                    validation_mode: 'PARALLEL_ITEMS',
                    sla_hours: 24,
                    requires_gps: false,
                    check_quota: false,
                    requires_quote_po: false,
                    requires_gdpr: false,
                    requires_special_tag: false
                },
                stages: Array.isArray(item.stages) ? item.stages : [
                    { id: 's1', order: 1, name: 'Validation Hiérarchique', validator_role: 'Manager', sla_hours: 24, requires_document: false }
                ],
                fields: Array.isArray(item.fields) ? item.fields : [
                    { id: 'site_id', label: 'Site', type: 'select', table_ref: 'sites', required: true }
                ],
                linked_tables: Array.isArray(item.linked_tables) ? item.linked_tables : ['sites', 'equipments'],
                notifications: Array.isArray(item.notifications) ? item.notifications : [],
                metadata: item.metadata || { imported_at: new Date().toISOString() }
            };
            processTemplates.push(newProcess);
            imported.push(newProcess);
        }

        res.status(201).json({ message: `${imported.length} processus importé(s) avec succès`, imported });
    } catch (e: any) {
        res.status(400).json({ error: `Erreur lors de l'import : ${e.message}` });
    }
};

export const exportAllProcesses = async (_req: any, res: any) => {
    res.status(200).json({
        export_date: new Date().toISOString(),
        version: "2.0-zero-hardcoding",
        count: processTemplates.length,
        processes: processTemplates
    });
};

export const resetProcessesToBlank = async (_req: any, res: any) => {
    processTemplates.length = 0;
    res.status(200).json({ message: "Tous les processus ont été réinitialisés. Canvas vierge prêt pour configuration intégrale." });
};

export const seedStandardProcesses = async (_req: any, res: any) => {
    // Inject standard 8 process blueprints into editable store
    const standardBlueprints = [
        {
            name: "Processus 1 : Habilitations & Droits d'Accès Multi-Sites",
            category_id: 1,
            description: "Demande simultanée de droits d'accès techniques pour maintenance de nuit sur plusieurs sites ferroviaires avec validation parallèle par équipement/site",
            status: "Publié",
            request_type: "HABILITATION",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "PARALLEL_ITEMS",
                sla_hours: 24,
                requires_gps: false,
                check_quota: false,
                requires_quote_po: false,
                requires_gdpr: false,
                requires_special_tag: false
            },
            stages: [
                { id: "s1", order: 1, name: "Validation Hiérarchique (Manager N+1)", validator_role: "Manager", sla_hours: 24, requires_document: false },
                { id: "s2", order: 2, name: "Validation Technique & Sécurité (Site)", validator_role: "Validateur Site", sla_hours: 48, requires_document: true }
            ],
            fields: [
                { id: "site_id", label: "Site Ferroviaire d'intervention", type: "select", table_ref: "sites", required: true },
                { id: "equipment_type", label: "Type d'équipement", type: "select", table_ref: "equipments", required: true },
                { id: "intervention_duration", label: "Durée d'intervention", type: "select", options: "Ponctuelle (24h),Hebdomadaire (7 jours),Mensuelle (30 jours),Annuelle", required: true }
            ],
            linked_tables: ["sites", "equipments", "services", "regions"]
        },
        {
            name: "Processus 2 : Création de Compte & Charte RGPD",
            category_id: 1,
            description: "Ouverture de profil SI Mécatronique avec double validation croisée, signature obligatoire de la charte RGPD et enchaînement automatique de clé",
            status: "Publié",
            request_type: "USER_ACCOUNT",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "CROSS_VALIDATION",
                sla_hours: 48,
                requires_gdpr: true,
                auto_chain_key_order: true,
                requires_gps: false,
                check_quota: false,
                requires_quote_po: false,
                requires_special_tag: false
            },
            stages: [
                { id: "s1", order: 1, name: "Avis Responsable Hiérarchique", validator_role: "Manager", sla_hours: 24, requires_document: false },
                { id: "s2", order: 2, name: "Contrôle Sécurité & Attribution Identifiant", validator_role: "Responsable Sécurité", sla_hours: 24, requires_document: true }
            ],
            fields: [
                { id: "user_type", label: "Type d'utilisateur", type: "select", options: "Collaborateur Interne (Validité 3 ans),Prestataire Externe (Validité 1 an)", required: true },
                { id: "site_id", label: "Site de rattachement", type: "select", table_ref: "sites", required: true }
            ],
            linked_tables: ["sites", "services"]
        },
        {
            name: "Processus 3 : Commande de Clé & Quota S10 / Devis S9",
            category_id: 2,
            description: "Attribution d'une clé programmable avec contrôle dynamique de quota (S10) et bon de commande / devis différentiel (S9)",
            status: "Publié",
            request_type: "KEY_ORDER",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "PARALLEL_ITEMS",
                sla_hours: 48,
                check_quota: true,
                custom_quota_limit: 2,
                requires_quote_po: true,
                custom_quote_amount: 85.00,
                requires_reception_pv: true,
                requires_gps: false,
                requires_gdpr: true
            },
            stages: [
                { id: "s1", order: 1, name: "Validation Hiérarchique & Quota S10", validator_role: "Manager", sla_hours: 24, requires_document: false },
                { id: "s2", order: 2, name: "Validation Bon de Commande / Devis S9", validator_role: "Validateur Financier", sla_hours: 48, requires_document: true }
            ],
            fields: [
                { id: "site_id", label: "Site de livraison", type: "select", table_ref: "sites", required: true },
                { id: "hardware_origin", label: "Origine du matériel", type: "select", options: "Stock Fournisseur (Neuf),Stock Interne Réassigné", required: true }
            ],
            linked_tables: ["sites", "equipments"]
        },
        {
            name: "Processus 4 : Commande Cylindre & Commissioning GPS Terrain",
            category_id: 2,
            description: "Pose de cylindre haute sécurité EN 15864 avec relevé géolocalisé GPS obligatoire lors de l'installation et validation PV",
            status: "Publié",
            request_type: "CYLINDER_ORDER",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "PARALLEL_ITEMS",
                sla_hours: 72,
                requires_gps: true,
                gps_max_distance_meters: 250,
                gps_max_accuracy_meters: 50,
                requires_quote_po: true,
                custom_quote_amount: 145.00,
                requires_reception_pv: true,
                check_quota: true,
                custom_quota_limit: 5
            },
            stages: [
                { id: "s1", order: 1, name: "Validation Technique de Pose", validator_role: "Chef de Secteur", sla_hours: 48, requires_document: true },
                { id: "s2", order: 2, name: "Validation Commissioning GPS & PV", validator_role: "Validateur Site", sla_hours: 24, requires_document: true }
            ],
            fields: [
                { id: "site_id", label: "Site d'implantation", type: "select", table_ref: "sites", required: true },
                { id: "door_ref", label: "Référence Porte / Bâtiment", type: "text", required: true }
            ],
            linked_tables: ["sites"]
        },
        {
            name: "Processus 5 : Borne de Rechargement & Règle TAG Spécial",
            category_id: 2,
            description: "Borne murale de télé-actualisation avec isolation stricte par TAG Spécial, contrôle GPS et PV de réception",
            status: "Publié",
            request_type: "TERMINAL_ORDER",
            has_special_tag: true,
            workflow_rules: {
                validation_mode: "PARALLEL_ITEMS",
                sla_hours: 72,
                requires_special_tag: true,
                special_tag_label: "BORNE_MURALE",
                requires_gps: true,
                requires_quote_po: true,
                custom_quote_amount: 320.00,
                requires_reception_pv: true
            },
            stages: [
                { id: "s1", order: 1, name: "Validation Projet & TAG Spécial", validator_role: "Responsable Sécurité", sla_hours: 48, requires_document: false },
                { id: "s2", order: 2, name: "Validation Installation & GPS", validator_role: "Chef de Secteur", sla_hours: 48, requires_document: true }
            ],
            fields: [
                { id: "site_id", label: "Emplacement Site", type: "select", table_ref: "sites", required: true }
            ],
            linked_tables: ["sites"]
        },
        {
            name: "Processus 6 : Déploiement Massif & Validation Tripartite",
            category_id: 3,
            description: "Opération réseau à grande échelle avec plan d'échelonnement et validation tripartite (Manager, Validateur Local, Référent National)",
            status: "Publié",
            request_type: "MASS_DEPLOY",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "TRIPARTITE",
                sla_hours: 120,
                requires_batch_plan: true,
                requires_quote_po: true,
                custom_quote_amount: 2500.00,
                check_quota: false
            },
            stages: [
                { id: "s1", order: 1, name: "Validation Manager Local", validator_role: "Manager", sla_hours: 48, requires_document: false },
                { id: "s2", order: 2, name: "Avis Technique & Sécurité Site", validator_role: "Validateur Site", sla_hours: 48, requires_document: true },
                { id: "s3", order: 3, name: "Arbitrage National / Direction Sécurité", validator_role: "Référent National", sla_hours: 72, requires_document: true }
            ],
            fields: [
                { id: "project_name", label: "Intitulé du Chantier / Ligne", type: "text", required: true },
                { id: "batch_count", label: "Nombre de lots prévus", type: "number", required: true }
            ],
            linked_tables: ["sites", "regions"]
        },
        {
            name: "Processus 7 : Déclaration Incident & Révocation de Sécurité",
            category_id: 4,
            description: "Déclaration perte, vol ou casse avec télé-révocation immédiate et inscription sur la liste de révocation",
            status: "Publié",
            request_type: "INCIDENT",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "AUTO_FULFILL",
                sla_hours: 12,
                requires_incident_report: true,
                enable_e123_blacklist: true,
                requires_quote_po: true,
                custom_quote_amount: 120.00
            },
            stages: [
                { id: "s1", order: 1, name: "Constat & Révocation d'Urgence", validator_role: "Responsable Sécurité", sla_hours: 12, requires_document: true }
            ],
            fields: [
                { id: "serial_number", label: "Numéro de série du matériel perdu/volé", type: "text", required: true },
                { id: "incident_type", label: "Nature de l'incident", type: "select", options: "Vol avec effraction,Perte sur voie,Détérioration physique", required: true }
            ],
            linked_tables: ["sites"]
        },
        {
            name: "Processus 8 : Mouvement d'Organigramme & Réaffectation",
            category_id: 1,
            description: "Mutation d'agent ou changement de service avec clôture automatique des accès du site d'origine et transfert vers le nouveau site",
            status: "Publié",
            request_type: "ORG_CHANGE",
            has_special_tag: false,
            workflow_rules: {
                validation_mode: "CROSS_VALIDATION",
                sla_hours: 48,
                requires_org_chart_validation: true
            },
            stages: [
                { id: "s1", order: 1, name: "Validation Manager Sortant", validator_role: "Manager", sla_hours: 24, requires_document: false },
                { id: "s2", order: 2, name: "Validation Manager Entrant", validator_role: "Manager", sla_hours: 24, requires_document: false }
            ],
            fields: [
                { id: "old_site_id", label: "Site d'origine", type: "select", table_ref: "sites", required: true },
                { id: "new_site_id", label: "Nouveau site d'affectation", type: "select", table_ref: "sites", required: true }
            ],
            linked_tables: ["sites", "services"]
        }
    ];

    for (const bp of standardBlueprints) {
        const existing = processTemplates.find(p => p.name === bp.name);
        if (!existing) {
            const maxId = processTemplates.reduce((max, p) => Math.max(max, p.id || 0), 0);
            processTemplates.push({
                id: maxId + 1,
                ...bp
            } as any);
        }
    }

    res.status(200).json({ message: "Blueprints de processus initialisés avec succès dans la base des processus", count: processTemplates.length });
};

// ==========================================
// Predefined Notification Templates Endpoints
// ==========================================

export const getNotificationTemplates = async (req: any, res: any) => {
    // Calculer l'utilisation de chaque modèle par les processus
    const templatesWithStats = notificationTemplatesDatabase.map(tmpl => {
        const linkedProcesses = processTemplates
            .filter(p => p.notifications?.some(n => n.template_id === tmpl.id))
            .map(p => ({ id: p.id, name: p.name }));

        return {
            ...tmpl,
            linked_processes: linkedProcesses,
            usage_count: linkedProcesses.length
        };
    });

    res.status(200).json(templatesWithStats);
};

export const createNotificationTemplate = async (req: any, res: any) => {
    const { name, category, description, trigger_event, recipient_type, recipient_role, recipient_email, subject, content, channel, urgent, active } = req.body;

    if (!name || !trigger_event || !recipient_type || !subject || !content) {
        return res.status(400).json({ error: "Champs obligatoires manquants (nom, déclencheur, destinataire, objet, contenu)." });
    }

    const newTemplate: NotificationTemplate = {
        id: `tmpl_notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name,
        category: category || "Circuit de Validation",
        description: description || "",
        trigger_event,
        recipient_type,
        recipient_role,
        recipient_email,
        subject,
        content,
        channel: channel || "both",
        urgent: urgent ?? false,
        active: active ?? true,
        is_system: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    notificationTemplatesDatabase.unshift(newTemplate);
    res.status(201).json({ message: "Modèle de notification créé avec succès", template: newTemplate });
};

export const updateNotificationTemplate = async (req: any, res: any) => {
    const { id } = req.params;
    const tmpl = notificationTemplatesDatabase.find(t => t.id === id);

    if (!tmpl) {
        return res.status(404).json({ error: "Modèle de notification introuvable." });
    }

    if (req.body.name !== undefined) tmpl.name = req.body.name;
    if (req.body.category !== undefined) tmpl.category = req.body.category;
    if (req.body.description !== undefined) tmpl.description = req.body.description;
    if (req.body.trigger_event !== undefined) tmpl.trigger_event = req.body.trigger_event;
    if (req.body.recipient_type !== undefined) tmpl.recipient_type = req.body.recipient_type;
    if (req.body.recipient_role !== undefined) tmpl.recipient_role = req.body.recipient_role;
    if (req.body.recipient_email !== undefined) tmpl.recipient_email = req.body.recipient_email;
    if (req.body.subject !== undefined) tmpl.subject = req.body.subject;
    if (req.body.content !== undefined) tmpl.content = req.body.content;
    if (req.body.channel !== undefined) tmpl.channel = req.body.channel;
    if (req.body.urgent !== undefined) tmpl.urgent = req.body.urgent;
    if (req.body.active !== undefined) tmpl.active = req.body.active;
    tmpl.updated_at = new Date().toISOString();

    res.status(200).json({ message: "Modèle de notification mis à jour", template: tmpl });
};

export const deleteNotificationTemplate = async (req: any, res: any) => {
    const { id } = req.params;
    const idx = notificationTemplatesDatabase.findIndex(t => t.id === id);

    if (idx === -1) {
        return res.status(404).json({ error: "Modèle de notification introuvable." });
    }

    // Retirer également des processus associés
    processTemplates.forEach(p => {
        if (p.notifications) {
            p.notifications = p.notifications.filter(n => n.template_id !== id);
        }
    });

    notificationTemplatesDatabase.splice(idx, 1);
    res.status(200).json({ message: "Modèle de notification supprimé avec succès" });
};

export const duplicateNotificationTemplate = async (req: any, res: any) => {
    const { id } = req.params;
    const orig = notificationTemplatesDatabase.find(t => t.id === id);

    if (!orig) {
        return res.status(404).json({ error: "Modèle de notification introuvable." });
    }

    const cloned: NotificationTemplate = {
        ...orig,
        id: `tmpl_notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: `${orig.name} (Copie)`,
        is_system: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    notificationTemplatesDatabase.push(cloned);
    res.status(201).json({ message: "Modèle dupliqué avec succès", template: cloned });
};

/**
 * Récupère tous les onglets du portail avec leurs noms, descriptions et ordre d'affichage
 */
export const getPortalTabs = async (req: any, res: any) => {
    try {
        const tabs = await tabRepository.getAll();
        res.status(200).json(tabs);
    } catch (error: any) {
        console.error('getPortalTabs error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour un onglet spécifique (nom, description, icône, badge, ordre, statut actif)
 */
export const updatePortalTab = async (req: any, res: any) => {
    try {
        const { key } = req.params;
        const updates = req.body;
        const updated = await tabRepository.update(key, updates);
        if (!updated) {
            return res.status(404).json({ error: `Onglet '${key}' introuvable.` });
        }
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_TAB",
            key,
            `Modification de l'onglet '${updated.label}' (description / statut / ordre)`
        );
        res.status(200).json({ message: "Onglet mis à jour avec succès", tab: updated });
    } catch (error: any) {
        console.error('updatePortalTab error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour par lot la liste des onglets (réordonnancement, activation groupée)
 */
export const batchUpdatePortalTabs = async (req: any, res: any) => {
    try {
        const { tabs } = req.body;
        if (!Array.isArray(tabs)) {
            return res.status(400).json({ error: "Le champ 'tabs' doit être un tableau d'onglets." });
        }
        for (const t of tabs) {
            if (t.key) {
                await tabRepository.update(t.key, {
                    label: t.label,
                    description: t.description,
                    icon: t.icon,
                    path: t.path,
                    badge: t.badge,
                    badge_color: t.badge_color,
                    is_active: t.is_active,
                    display_order: t.display_order,
                    required_privilege: t.required_privilege
                });
            }
        }
        const refreshed = await tabRepository.getAll();
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "REORDER_TABS",
            "PORTAL_NAVIGATION",
            `Mise à jour globale et réordonnancement de ${tabs.length} onglets`
        );
        res.status(200).json({ message: "Onglets synchronisés avec succès", tabs: refreshed });
    } catch (error: any) {
        console.error('batchUpdatePortalTabs error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crée un nouvel onglet personnalisé sur le portail
 */
export const createPortalTab = async (req: any, res: any) => {
    try {
        const { key, label, description, icon, path, badge, badge_color, is_active, display_order, required_privilege } = req.body;
        if (!key || !label || !path) {
            return res.status(400).json({ error: "La clé ('key'), le libellé ('label') et le chemin ('path') sont obligatoires." });
        }
        const created = await tabRepository.create({
            key,
            label,
            description: description || '',
            icon: icon || 'fas fa-link',
            path,
            badge: badge || '',
            badge_color: badge_color || 'bg-blue-100 text-blue-800',
            is_active: is_active !== undefined ? !!is_active : true,
            display_order: Number(display_order) || 99,
            required_privilege: required_privilege || undefined,
            is_system: false
        });
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_TAB",
            created.key,
            `Création du nouvel onglet personnalisé '${created.label}' (${created.path})`
        );
        res.status(201).json({ message: "Nouvel onglet créé avec succès", tab: created });
    } catch (error: any) {
        console.error('createPortalTab error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime un onglet personnalisé (les onglets système sont protégés)
 */
export const deletePortalTab = async (req: any, res: any) => {
    try {
        const { key } = req.params;
        await tabRepository.delete(key);
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_TAB",
            key,
            `Suppression de l'onglet personnalisé '${key}'`
        );
        res.status(200).json({ message: `Onglet '${key}' supprimé avec succès.` });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Réinitialise tous les onglets aux configurations usine de base
 */
export const resetPortalTabs = async (req: any, res: any) => {
    try {
        const defaultTabs = await tabRepository.reset();
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "RESET_TABS",
            "PORTAL_NAVIGATION",
            "Réinitialisation d'usine de l'ensemble des onglets et descriptions"
        );
        res.status(200).json({ message: "Onglets réinitialisés aux valeurs standards", tabs: defaultTabs });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Récupère tous les éléments configurables du volet de navigation administrateur
 */
export const getAdminNavItems = async (req: any, res: any) => {
    try {
        const items = await adminNavRepository.getAll();
        res.status(200).json(items);
    } catch (error: any) {
        console.error('getAdminNavItems error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour un élément du volet de navigation administrateur (visibilité, libellé, icône, ordre, badge)
 */
export const updateAdminNavItem = async (req: any, res: any) => {
    try {
        const { key } = req.params;
        const updates = req.body;
        const updated = await adminNavRepository.update(key, updates);
        if (!updated) {
            return res.status(404).json({ error: `Élément de navigation '${key}' introuvable.` });
        }
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_ADMIN_NAV",
            key,
            `Modification du volet de navigation admin pour '${updated.label}' (visible: ${updated.is_visible})`
        );
        res.status(200).json({ message: "Élément du volet mis à jour avec succès", item: updated });
    } catch (error: any) {
        console.error('updateAdminNavItem error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour par lot les éléments du volet de navigation administrateur
 */
export const batchUpdateAdminNavItems = async (req: any, res: any) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Le champ 'items' doit être un tableau." });
        }
        const updatedItems = await adminNavRepository.batchUpdate(items);
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "BATCH_UPDATE_ADMIN_NAV",
            "SIDEBAR_NAVIGATION",
            `Mise à jour groupée du volet de navigation administrateur (${items.length} éléments)`
        );
        res.status(200).json({ message: "Volet de navigation administrateur mis à jour", items: updatedItems });
    } catch (error: any) {
        console.error('batchUpdateAdminNavItems error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Réinitialise le volet de navigation administrateur aux valeurs par défaut
 */
export const resetAdminNavItems = async (req: any, res: any) => {
    try {
        const defaultItems = await adminNavRepository.resetToDefault();
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "RESET_ADMIN_NAV",
            "SIDEBAR_NAVIGATION",
            "Réinitialisation d'usine du volet de navigation administrateur"
        );
        res.status(200).json({ message: "Volet de navigation administrateur réinitialisé", items: defaultItems });
    } catch (error: any) {
        console.error('resetAdminNavItems error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crée un nouvel élément de navigation administrateur
 */
export const createAdminNavItem = async (req: any, res: any) => {
    try {
        const { key, label, path, icon, section, badge, badge_color, display_order, associated_feature_key, is_visible } = req.body;
        if (!key || !label || !path || !section) {
            return res.status(400).json({ error: "Les champs 'key', 'label', 'path' et 'section' sont obligatoires." });
        }
        const newItem = await adminNavRepository.create({
            key,
            label,
            path,
            icon,
            section,
            badge,
            badge_color,
            display_order,
            associated_feature_key,
            is_visible
        });
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_ADMIN_NAV_ITEM",
            key,
            `Création d'un élément de menu dans '${section}' : '${label}'`
        );
        res.status(201).json({ message: "Élément de menu créé avec succès", item: newItem });
    } catch (error: any) {
        console.error('createAdminNavItem error:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Supprime un élément de navigation administrateur
 */
export const deleteAdminNavItem = async (req: any, res: any) => {
    try {
        const { key } = req.params;
        const success = await adminNavRepository.delete(key);
        if (!success) {
            return res.status(404).json({ error: `Élément '${key}' introuvable.` });
        }
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_ADMIN_NAV_ITEM",
            key,
            `Suppression de l'élément de menu admin '${key}'`
        );
        res.status(200).json({ message: "Élément de menu supprimé avec succès" });
    } catch (error: any) {
        console.error('deleteAdminNavItem error:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Récupère toutes les sections configurables du volet de navigation administrateur
 */
export const getAdminNavSections = async (req: any, res: any) => {
    try {
        const sections = await adminNavSectionsRepository.getAll();
        res.status(200).json(sections);
    } catch (error: any) {
        console.error('getAdminNavSections error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crée une nouvelle section dans le volet de navigation administrateur
 */
export const createAdminNavSection = async (req: any, res: any) => {
    try {
        const { key, title, icon, badge, badge_color, display_order, is_visible } = req.body;
        if (!key || !title) {
            return res.status(400).json({ error: "Les champs 'key' et 'title' sont obligatoires." });
        }
        const newSec = await adminNavSectionsRepository.create({
            key,
            title,
            icon,
            badge,
            badge_color,
            display_order,
            is_visible
        });
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_ADMIN_NAV_SECTION",
            key,
            `Création d'une nouvelle section admin : '${title}' (${key})`
        );
        res.status(201).json({ message: "Section de navigation créée avec succès", section: newSec });
    } catch (error: any) {
        console.error('createAdminNavSection error:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Met à jour une section du volet de navigation administrateur
 */
export const updateAdminNavSection = async (req: any, res: any) => {
    try {
        const { key } = req.params;
        const updates = req.body;
        const updated = await adminNavSectionsRepository.update(key, updates);
        if (!updated) {
            return res.status(404).json({ error: `Section '${key}' introuvable.` });
        }
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_ADMIN_NAV_SECTION",
            key,
            `Modification de la section '${updated.title}' (visible: ${updated.is_visible})`
        );
        res.status(200).json({ message: "Section mise à jour avec succès", section: updated });
    } catch (error: any) {
        console.error('updateAdminNavSection error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour par lot les sections du volet de navigation administrateur
 */
export const batchUpdateAdminNavSections = async (req: any, res: any) => {
    try {
        const { sections } = req.body;
        if (!Array.isArray(sections)) {
            return res.status(400).json({ error: "Le champ 'sections' doit être un tableau." });
        }
        const updated = await adminNavSectionsRepository.batchUpdate(sections);
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "BATCH_UPDATE_ADMIN_NAV_SECTIONS",
            "SECTIONS_NAVIGATION",
            `Mise à jour groupée des sections administrateur (${sections.length} sections)`
        );
        res.status(200).json({ message: "Sections de navigation mises à jour", sections: updated });
    } catch (error: any) {
        console.error('batchUpdateAdminNavSections error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime une section personnalisée du volet de navigation administrateur
 */
export const deleteAdminNavSection = async (req: any, res: any) => {
    try {
        const { key } = req.params;
        const success = await adminNavSectionsRepository.delete(key);
        if (!success) {
            return res.status(404).json({ error: `Section '${key}' introuvable.` });
        }
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_ADMIN_NAV_SECTION",
            key,
            `Suppression de la section de navigation '${key}'`
        );
        res.status(200).json({ message: "Section supprimée avec succès" });
    } catch (error: any) {
        console.error('deleteAdminNavSection error:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Réinitialise les sections du volet de navigation aux valeurs par défaut
 */
export const resetAdminNavSections = async (req: any, res: any) => {
    try {
        const defaultSections = await adminNavSectionsRepository.resetToDefault();
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "RESET_ADMIN_NAV_SECTIONS",
            "SECTIONS_NAVIGATION",
            "Réinitialisation d'usine des sections de navigation administrateur"
        );
        res.status(200).json({ message: "Sections de navigation réinitialisées aux valeurs par défaut", sections: defaultSections });
    } catch (error: any) {
        console.error('resetAdminNavSections error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Initialise la bibliothèque de formulaires à partir des processus existants si vide
 */
function initFormTemplatesIfEmpty() {
    if (formTemplatesDatabase.length === 0) {
        for (const p of processTemplates) {
            formTemplatesDatabase.push({
                id: `form_proc_${p.id}`,
                name: `Formulaire : ${p.name}`,
                code: p.code ? `FORM-${p.code}` : `FORM-${String(p.id).padStart(2, '0')}`,
                category_id: p.category_id || 1,
                description: `Formulaire de saisie dynamique associé au circuit de validation "${p.name}".`,
                status: p.status === 'Publié' ? 'Actif' : 'Brouillon',
                fields: p.fields ? JSON.parse(JSON.stringify(p.fields)) : [],
                linked_tables: p.linked_tables ? [...p.linked_tables] : [],
                linked_process_id: p.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
    }
}

/**
 * Récupère tous les formulaires dynamiques de l'application
 */
export const getFormulaires = async (req: any, res: any) => {
    try {
        initFormTemplatesIfEmpty();
        res.status(200).json(formTemplatesDatabase);
    } catch (error: any) {
        console.error('getFormulaires error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Récupère un formulaire spécifique par son ID
 */
export const getFormulaireById = async (req: any, res: any) => {
    try {
        initFormTemplatesIfEmpty();
        const { id } = req.params;
        const form = formTemplatesDatabase.find(f => f.id === id);
        if (!form) {
            return res.status(404).json({ error: `Formulaire '${id}' introuvable.` });
        }
        res.status(200).json(form);
    } catch (error: any) {
        console.error('getFormulaireById error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crée un nouveau formulaire dynamique
 */
export const createFormulaire = async (req: any, res: any) => {
    try {
        initFormTemplatesIfEmpty();
        const { name, code, category_id, description, fields, linked_tables, linked_process_id, status } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Le nom du formulaire est obligatoire." });
        }

        const newId = `form_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newForm: FormTemplate = {
            id: newId,
            name: name.trim(),
            code: code ? code.trim().toUpperCase() : `FORM-${Date.now().toString().slice(-4)}`,
            category_id: category_id ? Number(category_id) : 1,
            description: description || "",
            status: status || "Brouillon",
            fields: Array.isArray(fields) ? fields : [],
            linked_tables: Array.isArray(linked_tables) ? linked_tables : [],
            linked_process_id: linked_process_id ? Number(linked_process_id) : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        formTemplatesDatabase.push(newForm);

        // Si associé à un workflow, synchronise ses champs
        if (newForm.linked_process_id) {
            const proc = processTemplates.find(p => p.id === newForm.linked_process_id);
            if (proc) {
                proc.fields = newForm.fields;
                if (newForm.linked_tables) proc.linked_tables = newForm.linked_tables;
                try { await configRepository.saveProcess(proc); } catch {}
            }
        }

        try {
            await configRepository.saveForm(newForm);
        } catch (e) {
            console.error('Erreur sauvegarde SQLite formulaire:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_FORMULAIRE",
            newForm.id,
            `Création du formulaire '${newForm.name}' (${newForm.fields.length} champs)`
        );

        res.status(201).json({ message: "Formulaire créé avec succès", formulaire: newForm });
    } catch (error: any) {
        console.error('createFormulaire error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour un formulaire dynamique (champs, métadonnées, liaison workflow)
 */
export const updateFormulaire = async (req: any, res: any) => {
    try {
        initFormTemplatesIfEmpty();
        const { id } = req.params;
        const form = formTemplatesDatabase.find(f => f.id === id);

        if (!form) {
            return res.status(404).json({ error: `Formulaire '${id}' introuvable.` });
        }

        const { name, code, category_id, description, status, fields, linked_tables, linked_process_id } = req.body;

        if (name !== undefined) form.name = name.trim();
        if (code !== undefined) form.code = code.trim().toUpperCase();
        if (category_id !== undefined) form.category_id = Number(category_id);
        if (description !== undefined) form.description = description;
        if (status !== undefined) form.status = status;
        if (fields !== undefined && Array.isArray(fields)) form.fields = fields;
        if (linked_tables !== undefined && Array.isArray(linked_tables)) form.linked_tables = linked_tables;
        if (linked_process_id !== undefined) form.linked_process_id = linked_process_id ? Number(linked_process_id) : undefined;
        form.updated_at = new Date().toISOString();

        // Si associé à un workflow, synchronise immédiatement ses champs dans le processTemplate
        if (form.linked_process_id) {
            const proc = processTemplates.find(p => p.id === form.linked_process_id);
            if (proc) {
                proc.fields = form.fields;
                if (form.linked_tables) proc.linked_tables = form.linked_tables;
                try { await configRepository.saveProcess(proc); } catch {}
            }
        }

        try {
            await configRepository.saveForm(form);
        } catch (e) {
            console.error('Erreur mise à jour SQLite formulaire:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_FORMULAIRE",
            form.id,
            `Mise à jour du formulaire '${form.name}' (${form.fields.length} champs configurés)`
        );

        res.status(200).json({ message: "Formulaire mis à jour avec succès", formulaire: form });
    } catch (error: any) {
        console.error('updateFormulaire error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime un formulaire dynamique
 */
export const deleteFormulaire = async (req: any, res: any) => {
    try {
        initFormTemplatesIfEmpty();
        const { id } = req.params;
        const idx = formTemplatesDatabase.findIndex(f => f.id === id);

        if (idx === -1) {
            return res.status(404).json({ error: `Formulaire '${id}' introuvable.` });
        }

        const removed = formTemplatesDatabase.splice(idx, 1)[0];
        try {
            await configRepository.deleteForm(id);
        } catch (e) {
            console.error('Erreur suppression SQLite formulaire:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_FORMULAIRE",
            id,
            `Suppression du formulaire '${removed.name}'`
        );

        res.status(200).json({ message: "Formulaire supprimé avec succès" });
    } catch (error: any) {
        console.error('deleteFormulaire error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Duplique un formulaire existant
 */
export const duplicateFormulaire = async (req: any, res: any) => {
    try {
        initFormTemplatesIfEmpty();
        const { id } = req.params;
        const orig = formTemplatesDatabase.find(f => f.id === id);

        if (!orig) {
            return res.status(404).json({ error: `Formulaire source '${id}' introuvable.` });
        }

        const cloned: FormTemplate = {
            ...JSON.parse(JSON.stringify(orig)),
            id: `form_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: `${orig.name} (Copie)`,
            code: `${orig.code}_COPIE`,
            status: "Brouillon",
            linked_process_id: undefined, // déconnecté par défaut pour éviter collision
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        formTemplatesDatabase.push(cloned);
        try {
            await configRepository.saveForm(cloned);
        } catch (e) {
            console.error('Erreur duplication SQLite formulaire:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DUPLICATE_FORMULAIRE",
            cloned.id,
            `Duplication du formulaire '${orig.name}' vers '${cloned.name}'`
        );

        res.status(201).json({ message: "Formulaire dupliqué avec succès", formulaire: cloned });
    } catch (error: any) {
        console.error('duplicateFormulaire error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================================================================
 * CONFIGURATEUR DE STATUTS (ZERO-CODE STATUS CONFIGURATOR)
 * =========================================================================
 */

export const getStatuses = async (req: any, res: any) => {
    try {
        const sorted = [...statusesDatabase].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        res.status(200).json(sorted);
    } catch (error: any) {
        console.error('getStatuses error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getStatusByCode = async (req: any, res: any) => {
    try {
        const { code } = req.params;
        const status = statusesDatabase.find(s => s.code.toUpperCase() === code.toUpperCase() || s.id === code);
        if (!status) {
            return res.status(404).json({ error: `Statut introuvable : ${code}` });
        }
        res.status(200).json(status);
    } catch (error: any) {
        console.error('getStatusByCode error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createStatus = async (req: any, res: any) => {
    try {
        const {
            code,
            label,
            description,
            category,
            badge_bg,
            badge_text,
            badge_border,
            icon_name,
            is_initial,
            is_terminal,
            sla_default_hours,
            requires_comment_on_enter,
            requires_document_on_enter,
            notify_demandeur_on_enter,
            notify_validator_on_enter,
            allowed_transitions,
            associated_processes
        } = req.body;

        if (!code || !label) {
            return res.status(400).json({ error: "Le code et le libellé du statut sont obligatoires." });
        }

        const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

        if (statusesDatabase.some(s => s.code === normalizedCode)) {
            return res.status(400).json({ error: `Le code de statut '${normalizedCode}' existe déjà dans le référentiel.` });
        }

        const maxOrder = statusesDatabase.reduce((max, s) => Math.max(max, s.display_order || 0), 0);

        const newStatus: CustomStatusConfig = {
            id: normalizedCode,
            code: normalizedCode,
            label: label.trim(),
            description: description ? description.trim() : "",
            category: category || "IN_REVIEW",
            badge_bg: badge_bg || "bg-blue-50",
            badge_text: badge_text || "text-blue-700",
            badge_border: badge_border || "border-blue-200",
            icon_name: icon_name || "Clock",
            is_initial: Boolean(is_initial),
            is_terminal: Boolean(is_terminal),
            sla_default_hours: Number(sla_default_hours) || 0,
            requires_comment_on_enter: Boolean(requires_comment_on_enter),
            requires_document_on_enter: Boolean(requires_document_on_enter),
            notify_demandeur_on_enter: Boolean(notify_demandeur_on_enter),
            notify_validator_on_enter: Boolean(notify_validator_on_enter),
            allowed_transitions: Array.isArray(allowed_transitions) ? allowed_transitions : [],
            associated_processes: Array.isArray(associated_processes) ? associated_processes : ["ALL"],
            specification_tag: req.body.specification_tag ? req.body.specification_tag.trim() : undefined,
            is_system: false,
            display_order: maxOrder + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        statusesDatabase.push(newStatus);
        try {
            await configRepository.saveStatus(newStatus);
        } catch (e) {
            console.error('Erreur sauvegarde SQLite status:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_STATUS",
            normalizedCode,
            `Création du statut '${newStatus.label}' (${normalizedCode})`
        );

        res.status(201).json({ message: "Statut créé avec succès", status: newStatus });
    } catch (error: any) {
        console.error('createStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateStatus = async (req: any, res: any) => {
    try {
        const { code } = req.params;
        const normalizedCode = code.toUpperCase();
        const existing = statusesDatabase.find(s => s.code.toUpperCase() === normalizedCode || s.id === normalizedCode);

        if (!existing) {
            return res.status(404).json({ error: `Statut '${code}' introuvable.` });
        }

        // Apply updates
        if (req.body.label !== undefined) existing.label = req.body.label.trim();
        if (req.body.description !== undefined) existing.description = req.body.description.trim();
        if (req.body.category !== undefined) existing.category = req.body.category;
        if (req.body.badge_bg !== undefined) existing.badge_bg = req.body.badge_bg;
        if (req.body.badge_text !== undefined) existing.badge_text = req.body.badge_text;
        if (req.body.badge_border !== undefined) existing.badge_border = req.body.badge_border;
        if (req.body.icon_name !== undefined) existing.icon_name = req.body.icon_name;
        if (req.body.is_initial !== undefined) existing.is_initial = Boolean(req.body.is_initial);
        if (req.body.is_terminal !== undefined) existing.is_terminal = Boolean(req.body.is_terminal);
        if (req.body.sla_default_hours !== undefined) existing.sla_default_hours = Number(req.body.sla_default_hours);
        if (req.body.requires_comment_on_enter !== undefined) existing.requires_comment_on_enter = Boolean(req.body.requires_comment_on_enter);
        if (req.body.requires_document_on_enter !== undefined) existing.requires_document_on_enter = Boolean(req.body.requires_document_on_enter);
        if (req.body.notify_demandeur_on_enter !== undefined) existing.notify_demandeur_on_enter = Boolean(req.body.notify_demandeur_on_enter);
        if (req.body.notify_validator_on_enter !== undefined) existing.notify_validator_on_enter = Boolean(req.body.notify_validator_on_enter);
        if (req.body.allowed_transitions !== undefined && Array.isArray(req.body.allowed_transitions)) {
            existing.allowed_transitions = req.body.allowed_transitions;
        }
        if (req.body.associated_processes !== undefined && Array.isArray(req.body.associated_processes)) {
            existing.associated_processes = req.body.associated_processes;
        }
        if (req.body.display_order !== undefined) existing.display_order = Number(req.body.display_order);
        if (req.body.specification_tag !== undefined) existing.specification_tag = req.body.specification_tag ? req.body.specification_tag.trim() : undefined;
        if (req.body.is_system !== undefined) existing.is_system = Boolean(req.body.is_system);
        existing.updated_at = new Date().toISOString();

        try {
            await configRepository.saveStatus(existing);
        } catch (e) {
            console.error('Erreur mise à jour SQLite status:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_STATUS",
            existing.code,
            `Mise à jour du statut '${existing.label}' (${existing.code})`
        );

        res.status(200).json({ message: "Statut mis à jour", status: existing });
    } catch (error: any) {
        console.error('updateStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteStatus = async (req: any, res: any) => {
    try {
        const { code } = req.params;
        const normalizedCode = code.toUpperCase();
        const idx = statusesDatabase.findIndex(s => s.code.toUpperCase() === normalizedCode || s.id === normalizedCode);

        if (idx === -1) {
            return res.status(404).json({ error: `Statut '${code}' introuvable.` });
        }

        const target = statusesDatabase[idx];
        if (target.is_system) {
            return res.status(400).json({
                error: `Le statut système '${target.label}' (${target.code}) est un statut système protégé et ne peut pas être supprimé. Vous pouvez modifier son libellé, ses couleurs ou ses règles.`
            });
        }

        // Clean up transitions referring to this deleted status
        statusesDatabase.forEach(s => {
            if (s.allowed_transitions) {
                s.allowed_transitions = s.allowed_transitions.filter(t => t.toUpperCase() !== normalizedCode);
            }
        });

        statusesDatabase.splice(idx, 1);
        try {
            await configRepository.deleteStatus(target.id);
        } catch (e) {
            console.error('Erreur suppression SQLite status:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_STATUS",
            target.code,
            `Suppression du statut '${target.label}' (${target.code})`
        );

        res.status(200).json({ message: "Statut supprimé avec succès" });
    } catch (error: any) {
        console.error('deleteStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const duplicateStatus = async (req: any, res: any) => {
    try {
        const { code } = req.params;
        const orig = statusesDatabase.find(s => s.code.toUpperCase() === code.toUpperCase() || s.id === code);

        if (!orig) {
            return res.status(404).json({ error: `Statut source '${code}' introuvable.` });
        }

        let newCode = `${orig.code}_COPIE`;
        let counter = 1;
        while (statusesDatabase.some(s => s.code === newCode)) {
            newCode = `${orig.code}_COPIE_${counter++}`;
        }

        const maxOrder = statusesDatabase.reduce((max, s) => Math.max(max, s.display_order || 0), 0);

        const cloned: CustomStatusConfig = {
            ...JSON.parse(JSON.stringify(orig)),
            id: newCode,
            code: newCode,
            label: `${orig.label} (Copie)`,
            is_system: false,
            display_order: maxOrder + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        statusesDatabase.push(cloned);
        try {
            await configRepository.saveStatus(cloned);
        } catch (e) {
            console.error('Erreur duplication SQLite status:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DUPLICATE_STATUS",
            newCode,
            `Duplication du statut '${orig.label}' vers '${cloned.label}'`
        );

        res.status(201).json({ message: "Statut dupliqué avec succès", status: cloned });
    } catch (error: any) {
        console.error('duplicateStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const batchUpdateStatusTransitions = async (req: any, res: any) => {
    try {
        const { matrix } = req.body; // Array of { code: string, allowed_transitions: string[] }
        if (!Array.isArray(matrix)) {
            return res.status(400).json({ error: "Format de matrice invalide (tableau attendu)." });
        }

        for (const item of matrix) {
            if (!item.code || !Array.isArray(item.allowed_transitions)) continue;
            const target = statusesDatabase.find(s => s.code.toUpperCase() === item.code.toUpperCase());
            if (target) {
                target.allowed_transitions = item.allowed_transitions;
                target.updated_at = new Date().toISOString();
                try {
                    await configRepository.saveStatus(target);
                } catch {}
            }
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_STATUS_TRANSITIONS_MATRIX",
            "GLOBAL",
            `Mise à jour de la matrice de transitions de la machine à états`
        );

        res.status(200).json({ message: "Matrice de transitions mise à jour avec succès", statuses: statusesDatabase });
    } catch (error: any) {
        console.error('batchUpdateStatusTransitions error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================================================================
 * GESTION DES CATÉGORIES DE STATUTS (PHASES DYNAMIQUES)
 * =========================================================================
 */

export const getStatusCategories = async (req: any, res: any) => {
    try {
        const sorted = [...statusCategoriesDatabase].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        res.status(200).json(sorted);
    } catch (error: any) {
        console.error('getStatusCategories error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createStatusCategory = async (req: any, res: any) => {
    try {
        const { code, label, color, desc, display_order } = req.body;
        if (!code || !label) {
            return res.status(400).json({ error: "Le code et le libellé de la catégorie sont obligatoires." });
        }
        const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (statusCategoriesDatabase.some(c => c.code === normalizedCode)) {
            return res.status(400).json({ error: `La catégorie de statut '${normalizedCode}' existe déjà.` });
        }

        const maxOrder = statusCategoriesDatabase.reduce((max, c) => Math.max(max, c.display_order || 0), 0);
        const newCat: StatusCategoryConfig = {
            id: `cat_${normalizedCode.toLowerCase()}`,
            code: normalizedCode,
            label: label.trim(),
            color: color || "bg-indigo-100 text-indigo-800 border-indigo-200",
            desc: desc ? desc.trim() : "",
            display_order: display_order ? Number(display_order) : maxOrder + 1,
            is_system: false
        };

        statusCategoriesDatabase.push(newCat);
        try {
            await configRepository.saveStatusCategory(newCat);
        } catch (e) {
            console.error('Erreur sauvegarde SQLite catégorie statut:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_STATUS_CATEGORY",
            normalizedCode,
            `Création de la catégorie de statut '${newCat.label}' (${normalizedCode})`
        );

        res.status(201).json({ message: "Catégorie de statut créée avec succès", category: newCat });
    } catch (error: any) {
        console.error('createStatusCategory error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateStatusCategory = async (req: any, res: any) => {
    try {
        const { code } = req.params;
        const normalizedCode = code.toUpperCase();
        const existing = statusCategoriesDatabase.find(c => c.code.toUpperCase() === normalizedCode || c.id === code);

        if (!existing) {
            return res.status(404).json({ error: `Catégorie '${code}' introuvable.` });
        }

        if (req.body.label !== undefined) existing.label = req.body.label.trim();
        if (req.body.desc !== undefined) existing.desc = req.body.desc.trim();
        if (req.body.color !== undefined) existing.color = req.body.color;
        if (req.body.display_order !== undefined) existing.display_order = Number(req.body.display_order);

        // If code rename requested
        if (req.body.new_code && req.body.new_code !== existing.code) {
            const newNormalized = req.body.new_code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            const oldCode = existing.code;
            existing.code = newNormalized;

            // Cascade update existing statuses using this category
            statusesDatabase.forEach(s => {
                if (s.category === oldCode) {
                    s.category = newNormalized;
                    configRepository.saveStatus(s).catch(() => {});
                }
            });
        }

        try {
            await configRepository.saveStatusCategory(existing);
        } catch (e) {
            console.error('Erreur mise à jour SQLite catégorie statut:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_STATUS_CATEGORY",
            existing.code,
            `Mise à jour de la catégorie de statut '${existing.label}'`
        );

        res.status(200).json({ message: "Catégorie de statut mise à jour", category: existing });
    } catch (error: any) {
        console.error('updateStatusCategory error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteStatusCategory = async (req: any, res: any) => {
    try {
        const { code } = req.params;
        const normalizedCode = code.toUpperCase();
        const idx = statusCategoriesDatabase.findIndex(c => c.code.toUpperCase() === normalizedCode || c.id === code);

        if (idx === -1) {
            return res.status(404).json({ error: `Catégorie '${code}' introuvable.` });
        }

        const target = statusCategoriesDatabase[idx];
        const linkedCount = statusesDatabase.filter(s => s.category === target.code).length;
        if (linkedCount > 0) {
            return res.status(400).json({
                error: `Impossible de supprimer la catégorie '${target.label}' car ${linkedCount} statut(s) y sont rattachés. Veuillez d'abord réaffecter ces statuts.`
            });
        }

        statusCategoriesDatabase.splice(idx, 1);
        try {
            await configRepository.deleteStatusCategory(target.id);
        } catch (e) {
            console.error('Erreur suppression SQLite catégorie statut:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_STATUS_CATEGORY",
            target.code,
            `Suppression de la catégorie de statut '${target.label}'`
        );

        res.status(200).json({ message: "Catégorie supprimée avec succès" });
    } catch (error: any) {
        console.error('deleteStatusCategory error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================================================================
 * GESTION DES MÉTADONNÉES DU CATALOGUE DES STATUTS (SPÉCIFICATION / BADGE)
 * =========================================================================
 */

export const getStatusMetadata = async (req: any, res: any) => {
    try {
        res.status(200).json(statusMetadataStore);
    } catch (error: any) {
        console.error('getStatusMetadata error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateStatusMetadata = async (req: any, res: any) => {
    try {
        const { specification_title, specification_code, specification_description, badge_label } = req.body;

        if (specification_title !== undefined) statusMetadataStore.specification_title = specification_title ? specification_title.trim() : "";
        if (specification_code !== undefined) statusMetadataStore.specification_code = specification_code ? specification_code.trim() : "";
        if (specification_description !== undefined) statusMetadataStore.specification_description = specification_description ? specification_description.trim() : "";
        if (badge_label !== undefined) statusMetadataStore.badge_label = badge_label ? badge_label.trim() : "";

        try {
            await configRepository.saveStatusMetadata(statusMetadataStore);
        } catch (e) {
            console.error('Erreur sauvegarde SQLite métadonnées statut:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_STATUS_METADATA",
            "METADATA",
            `Mise à jour des métadonnées du catalogue de statuts (Réf: ${statusMetadataStore.specification_code || 'Désactivée / Vide'})`
        );

        res.status(200).json({ message: "Métadonnées du catalogue de statuts mises à jour avec succès", metadata: statusMetadataStore });
    } catch (error: any) {
        console.error('updateStatusMetadata error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================================================================
 * MOTEUR DE RÈGLES MÉTIERS (BUSINESS RULES ENGINE)
 * =========================================================================
 */
export const getBusinessRules = async (_req: any, res: any) => {
    try {
        res.status(200).json(businessRulesStore);
    } catch (error: any) {
        console.error('getBusinessRules error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createBusinessRule = async (req: any, res: any) => {
    try {
        const {
            code,
            title,
            description,
            category,
            trigger_event,
            target_field,
            operator,
            expected_value,
            action_type,
            action_role,
            error_message,
            is_active,
            priority,
            associated_processes
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Le titre de la règle métier est obligatoire." });
        }

        const generatedCode = (code && code.trim())
            ? code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
            : `RULE_${Date.now()}`;

        if (businessRulesStore.some(r => r.code === generatedCode)) {
            return res.status(400).json({ error: `Une règle métier avec le code '${generatedCode}' existe déjà.` });
        }

        const maxPriority = businessRulesStore.reduce((max, r) => Math.max(max, r.priority || 0), 0);

        const newRule: BusinessRule = {
            id: generatedCode,
            code: generatedCode,
            title: title.trim(),
            description: description ? description.trim() : "",
            category: category || "CUSTOM",
            trigger_event: trigger_event || "BEFORE_TRANSITION",
            target_field: target_field ? target_field.trim() : undefined,
            operator: operator || "EQUALS",
            expected_value: expected_value !== undefined ? String(expected_value) : "",
            action_type: action_type || "BLOCK_TRANSITION",
            action_role: action_role ? action_role.trim() : undefined,
            error_message: error_message ? error_message.trim() : "Condition métier non satisfaite.",
            is_active: is_active !== undefined ? Boolean(is_active) : true,
            priority: priority !== undefined ? Number(priority) : maxPriority + 1,
            associated_processes: Array.isArray(associated_processes) && associated_processes.length > 0 ? associated_processes : ["ALL"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        businessRulesStore.push(newRule);
        try {
            await configRepository.saveBusinessRule(newRule);
        } catch (e) {
            console.error('Erreur sauvegarde SQLite règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_BUSINESS_RULE",
            generatedCode,
            `Création de la règle métier '${newRule.title}' (${generatedCode})`
        );

        res.status(201).json({ message: "Règle métier créée avec succès", rule: newRule });
    } catch (error: any) {
        console.error('createBusinessRule error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateBusinessRule = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const rule = businessRulesStore.find(r => r.id === id || r.code === id);

        if (!rule) {
            return res.status(404).json({ error: `Règle métier '${id}' introuvable.` });
        }

        if (req.body.title !== undefined) rule.title = req.body.title.trim();
        if (req.body.description !== undefined) rule.description = req.body.description.trim();
        if (req.body.category !== undefined) rule.category = req.body.category;
        if (req.body.trigger_event !== undefined) rule.trigger_event = req.body.trigger_event;
        if (req.body.target_field !== undefined) rule.target_field = req.body.target_field ? req.body.target_field.trim() : undefined;
        if (req.body.operator !== undefined) rule.operator = req.body.operator;
        if (req.body.expected_value !== undefined) rule.expected_value = String(req.body.expected_value);
        if (req.body.action_type !== undefined) rule.action_type = req.body.action_type;
        if (req.body.action_role !== undefined) rule.action_role = req.body.action_role ? req.body.action_role.trim() : undefined;
        if (req.body.error_message !== undefined) rule.error_message = req.body.error_message.trim();
        if (req.body.is_active !== undefined) rule.is_active = Boolean(req.body.is_active);
        if (req.body.priority !== undefined) rule.priority = Number(req.body.priority);
        if (req.body.associated_processes !== undefined && Array.isArray(req.body.associated_processes)) {
            rule.associated_processes = req.body.associated_processes;
        }
        rule.updated_at = new Date().toISOString();

        try {
            await configRepository.saveBusinessRule(rule);
        } catch (e) {
            console.error('Erreur mise à jour SQLite règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_BUSINESS_RULE",
            rule.code,
            `Modification de la règle métier '${rule.title}' (${rule.code})`
        );

        res.status(200).json({ message: "Règle métier mise à jour avec succès", rule });
    } catch (error: any) {
        console.error('updateBusinessRule error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const toggleBusinessRule = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const rule = businessRulesStore.find(r => r.id === id || r.code === id);

        if (!rule) {
            return res.status(404).json({ error: `Règle métier '${id}' introuvable.` });
        }

        rule.is_active = !rule.is_active;
        rule.updated_at = new Date().toISOString();

        try {
            await configRepository.saveBusinessRule(rule);
        } catch (e) {
            console.error('Erreur toggle SQLite règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "TOGGLE_BUSINESS_RULE",
            rule.code,
            `Bascule de l'état de la règle métier '${rule.title}' -> ${rule.is_active ? 'Activée' : 'Désactivée'}`
        );

        res.status(200).json({ message: `Règle métier ${rule.is_active ? 'activée' : 'désactivée'}`, rule });
    } catch (error: any) {
        console.error('toggleBusinessRule error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const duplicateBusinessRule = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const source = businessRulesStore.find(r => r.id === id || r.code === id);

        if (!source) {
            return res.status(404).json({ error: `Règle source '${id}' introuvable.` });
        }

        const newCode = `${source.code}_COPY_${Date.now().toString().slice(-4)}`;
        const maxPriority = businessRulesStore.reduce((max, r) => Math.max(max, r.priority || 0), 0);

        const clonedRule: BusinessRule = {
            ...source,
            id: newCode,
            code: newCode,
            title: `${source.title} (Copie)`,
            priority: maxPriority + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        businessRulesStore.push(clonedRule);
        try {
            await configRepository.saveBusinessRule(clonedRule);
        } catch (e) {
            console.error('Erreur duplication SQLite règle:', e);
        }

        res.status(201).json({ message: "Règle métier dupliquée avec succès", rule: clonedRule });
    } catch (error: any) {
        console.error('duplicateBusinessRule error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteBusinessRule = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const index = businessRulesStore.findIndex(r => r.id === id || r.code === id);

        if (index === -1) {
            return res.status(404).json({ error: `Règle métier '${id}' introuvable.` });
        }

        const deleted = businessRulesStore.splice(index, 1)[0];
        try {
            await configRepository.deleteBusinessRule(deleted.id);
        } catch (e) {
            console.error('Erreur suppression SQLite règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_BUSINESS_RULE",
            deleted.code,
            `Suppression de la règle métier '${deleted.title}' (${deleted.code})`
        );

        res.status(200).json({ message: `Règle métier '${deleted.title}' supprimée avec succès.` });
    } catch (error: any) {
        console.error('deleteBusinessRule error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const testBusinessRule = async (req: any, res: any) => {
    try {
        const { rule, test_payload } = req.body;
        if (!rule) {
            return res.status(400).json({ error: "La règle à tester est requise." });
        }

        const payload = test_payload || {};
        const fieldValue = rule.target_field ? payload[rule.target_field] : undefined;

        let triggered = false;
        let evaluationDetail = "";

        switch (rule.operator) {
            case 'EQUALS':
                triggered = String(fieldValue) === String(rule.expected_value);
                evaluationDetail = `Comparaison '${fieldValue}' == '${rule.expected_value}'`;
                break;
            case 'NOT_EQUALS':
                triggered = String(fieldValue) !== String(rule.expected_value);
                evaluationDetail = `Comparaison '${fieldValue}' != '${rule.expected_value}'`;
                break;
            case 'GREATER_THAN':
                triggered = Number(fieldValue) > Number(rule.expected_value);
                evaluationDetail = `Comparaison numérique ${Number(fieldValue)} > ${Number(rule.expected_value)}`;
                break;
            case 'LESS_THAN':
                triggered = Number(fieldValue) < Number(rule.expected_value);
                evaluationDetail = `Comparaison numérique ${Number(fieldValue)} < ${Number(rule.expected_value)}`;
                break;
            case 'CONTAINS':
                triggered = String(fieldValue || '').toLowerCase().includes(String(rule.expected_value || '').toLowerCase());
                evaluationDetail = `'${fieldValue}' contient '${rule.expected_value}'`;
                break;
            case 'IS_EMPTY':
                triggered = fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === '';
                evaluationDetail = `Le champ est vide ou non renseigné`;
                break;
            case 'IS_NOT_EMPTY':
                triggered = fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '';
                evaluationDetail = `Le champ contient une valeur (${fieldValue})`;
                break;
            default:
                triggered = true;
                evaluationDetail = `Évaluation personnalisée`;
        }

        res.status(200).json({
            tested_rule: rule.title || rule.code,
            triggered,
            evaluationDetail,
            field_tested: rule.target_field,
            tested_value: fieldValue,
            expected_value: rule.expected_value,
            action_that_would_execute: triggered ? {
                action_type: rule.action_type,
                action_role: rule.action_role,
                error_message: rule.error_message
            } : null,
            result_summary: triggered
                ? `RÈGLE DÉCLENCHÉE : Action '${rule.action_type}' appliquée.`
                : `RÈGLE NON DÉCLENCHÉE : Condition non remplie, passage autorisé.`
        });
    } catch (error: any) {
        console.error('testBusinessRule error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================================================================
 * GESTION DYNAMIQUE DES DOMAINES DE RÈGLES MÉTIERS (RULE DOMAINS)
 * =========================================================================
 */
export const getRuleDomains = async (_req: any, res: any) => {
    try {
        const sorted = [...ruleDomainsDatabase].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        res.status(200).json(sorted);
    } catch (error: any) {
        console.error('getRuleDomains error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createRuleDomain = async (req: any, res: any) => {
    try {
        const { code, label, description, color, bgBadge, iconName, display_order } = req.body;
        if (!code || !label) {
            return res.status(400).json({ error: "Le code et le libellé du domaine sont obligatoires." });
        }
        const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (ruleDomainsDatabase.some(d => d.code === normalizedCode)) {
            return res.status(400).json({ error: `Le domaine '${normalizedCode}' existe déjà.` });
        }
        const maxOrder = ruleDomainsDatabase.reduce((max, d) => Math.max(max, d.display_order || 0), 0);
        const newDomain: RuleDomainConfig = {
            id: `dom_${normalizedCode.toLowerCase()}`,
            code: normalizedCode,
            label: label.trim(),
            description: description ? description.trim() : "",
            color: color || "text-indigo-700",
            bgBadge: bgBadge || "bg-indigo-100 text-indigo-900 border-indigo-200",
            iconName: iconName || "Tag",
            display_order: display_order ? Number(display_order) : maxOrder + 1,
            is_system: false
        };
        ruleDomainsDatabase.push(newDomain);
        try {
            await configRepository.saveRuleDomain(newDomain);
        } catch (e) {
            console.error('Erreur sauvegarde SQLite domaine règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "CREATE_RULE_DOMAIN",
            normalizedCode,
            `Création du domaine métier '${newDomain.label}' (${normalizedCode})`
        );
        res.status(201).json({ message: "Domaine créé avec succès", domain: newDomain });
    } catch (error: any) {
        console.error('createRuleDomain error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateRuleDomain = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const normalizedId = id.toUpperCase();
        const existing = ruleDomainsDatabase.find(d => d.id === id || d.code.toUpperCase() === normalizedId);
        if (!existing) {
            return res.status(404).json({ error: `Domaine '${id}' introuvable.` });
        }

        if (req.body.label !== undefined) existing.label = req.body.label.trim();
        if (req.body.description !== undefined) existing.description = req.body.description.trim();
        if (req.body.color !== undefined) existing.color = req.body.color;
        if (req.body.bgBadge !== undefined) existing.bgBadge = req.body.bgBadge;
        if (req.body.iconName !== undefined) existing.iconName = req.body.iconName;
        if (req.body.display_order !== undefined) existing.display_order = Number(req.body.display_order);

        // If code rename requested
        if (req.body.new_code && req.body.new_code.trim().toUpperCase() !== existing.code) {
            const newCode = req.body.new_code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            const oldCode = existing.code;
            existing.code = newCode;
            // Cascade update business rules using this domain
            businessRulesStore.forEach(r => {
                if (r.category === oldCode) {
                    r.category = newCode;
                    configRepository.saveBusinessRule(r).catch(() => {});
                }
            });
        }

        try {
            await configRepository.saveRuleDomain(existing);
        } catch (e) {
            console.error('Erreur mise à jour SQLite domaine règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "UPDATE_RULE_DOMAIN",
            existing.code,
            `Mise à jour du domaine métier '${existing.label}'`
        );

        res.status(200).json({ message: "Domaine mis à jour avec succès", domain: existing });
    } catch (error: any) {
        console.error('updateRuleDomain error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteRuleDomain = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const normalizedId = id.toUpperCase();
        const idx = ruleDomainsDatabase.findIndex(d => d.id === id || d.code.toUpperCase() === normalizedId);
        if (idx === -1) {
            return res.status(404).json({ error: `Domaine '${id}' introuvable.` });
        }
        const target = ruleDomainsDatabase[idx];
        const linkedRules = businessRulesStore.filter(r => r.category === target.code).length;
        if (linkedRules > 0) {
            return res.status(400).json({
                error: `Impossible de supprimer le domaine '${target.label}' car ${linkedRules} règle(s) métier(s) y sont rattachées. Veuillez d'abord réaffecter ces règles.`
            });
        }
        ruleDomainsDatabase.splice(idx, 1);
        try {
            await configRepository.deleteRuleDomain(target.id);
        } catch (e) {
            console.error('Erreur suppression SQLite domaine règle:', e);
        }

        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "DELETE_RULE_DOMAIN",
            target.code,
            `Suppression du domaine métier '${target.label}'`
        );
        res.status(200).json({ message: `Domaine '${target.label}' supprimé avec succès.` });
    } catch (error: any) {
        console.error('deleteRuleDomain error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const resetRuleDomains = async (req: any, res: any) => {
    try {
        ruleDomainsDatabase.length = 0;
        ruleDomainsDatabase.push(...initialRuleDomains.map(d => ({ ...d })));
        for (const d of ruleDomainsDatabase) {
            await configRepository.saveRuleDomain(d).catch(() => {});
        }
        logAction(
            req.user?.name || "Administrateur",
            req.user?.role || "Administrateur",
            "RESET_RULE_DOMAINS",
            "ALL",
            "Réinitialisation des domaines métiers au catalogue standard"
        );
        res.status(200).json({ message: "Domaines métiers réinitialisés avec succès", domains: ruleDomainsDatabase });
    } catch (error: any) {
        console.error('resetRuleDomains error:', error);
        res.status(500).json({ error: error.message });
    }
};


