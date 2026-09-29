import React, { useState, useEffect, useMemo } from 'react';
import { useFeatures } from '../context/FeaturesContext';
import { getRoles, createRole, updateRole, deleteRole, getReferenceTables, getRequests, getSites, getUsers } from '../lib/api';
import ReferenceVisibilityEditor from '../components/ReferenceVisibilityEditor';
import RoleFieldScopeEditor from '../components/RoleFieldScopeEditor';
import RoleSimulator from '../components/RoleSimulator';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import {
    ShieldCheck,
    Plus,
    Edit2,
    Trash2,
    X,
    Check,
    Eye,
    EyeOff,
    Pencil,
    Trash,
    PlusCircle,
    Sliders,
    Search,
    Sparkles,
    AlertCircle,
    AlertTriangle,
    Info,
    Copy,
    Save,
    RefreshCw,
    Layers,
    Lock,
    Unlock,
    LayoutGrid,
    Table as TableIcon,
    Database,
    CheckSquare,
    Square,
    MapPin,
    Compass,
    Building2,
    CheckCircle2,
    XCircle,
    Send,
    HelpCircle,
    Scale,
    Key,
    Shuffle,
    AlertOctagon
} from 'lucide-react';

export interface WorkflowActionPrivilege {
    key: string;
    label: string;
    description: string;
    category: string;
    badge: string;
}

export const AVAILABLE_WORKFLOW_ACTIONS: WorkflowActionPrivilege[] = [
    { key: 'create_request', label: 'Soumettre une demande', description: 'Initier et soumettre un nouveau dossier d\'intervention', category: 'Dépôt', badge: 'Dépôt' },
    { key: 'validate_requests', label: 'Valider / Émettre un avis favorable', description: 'Valider une étape ou un jalon du processus métier', category: 'Circuit de Validation', badge: 'Validation' },
    { key: 'reject_requests', label: 'Refuser / Avis défavorable', description: 'Rejeter une demande avec motif obligatoire', category: 'Circuit de Validation', badge: 'Refus' },
    { key: 'request_complements', label: 'Demander des pièces complémentaires', description: 'Renvoyer le dossier au demandeur pour compléments', category: 'Circuit de Validation', badge: 'Compléments' },
    { key: 'arbitrate_national', label: 'Arbitrage & Validation Nationale', description: 'Trancher les escalades et dossiers en dépassement de quota ou litige', category: 'Gouvernance', badge: 'Arbitrage' },
    { key: 'delegate_approvals', label: 'Déléguer son pouvoir de validation', description: 'Transférer temporairement ses droits de signature à un tiers', category: 'Gouvernance', badge: 'Délégation' },
    { key: 'manage_hardware', label: 'Gestion Régie & Matériel', description: 'Remise physique, programmation et restitution des clés mécatroniques', category: 'Opérations', badge: 'Régie' },
    { key: 'blacklist_hardware', label: 'Blacklistage & Révocation d\'accès', description: 'Bloquer d\'urgence un équipement égaré ou révoquer une habilitation', category: 'Sécurité', badge: 'Sécurité' },
    { key: 'manage_processes', label: 'Paramétrage des Processus & Statuts', description: 'Créer et modifier les workflows zero-code et statuts', category: 'Administration', badge: 'Processus' },
    { key: 'manage_tables', label: 'Gestion des Référentiels & Dictionnaires', description: 'Créer et administrer les tables de données dynamiques', category: 'Administration', badge: 'Référentiels' }
];

// Definitions of Portal Tabs configurable by role
export interface PortalTabConfig {
    key: string;
    label: string;
    path: string;
    description: string;
    iconClass: string;
    badge?: string;
}

export const AVAILABLE_PORTAL_TABS: PortalTabConfig[] = [
    {
        key: 'catalogue',
        label: 'Catalogue',
        path: '/',
        description: 'Parcourir les processus mécatroniques et initier des demandes',
        iconClass: 'fas fa-th-large'
    },
    {
        key: 'mes-demandes',
        label: 'Mes Demandes',
        path: '/mes-demandes',
        description: 'Suivi des demandes d\'intervention et historique personnel',
        iconClass: 'fas fa-folder'
    },
    {
        key: 'assistant-ia',
        label: 'Assistant IA',
        path: '/assistant-ia',
        description: 'Copilote d\'assistance mécatronique et conformité de sûreté (Gemini)',
        iconClass: 'fas fa-robot',
        badge: 'Gemini'
    },
    {
        key: 'corbeille',
        label: 'Corbeille Validateur',
        path: '/corbeille',
        description: 'Validation hiérarchique et technique des accès aux emprises',
        iconClass: 'fas fa-inbox',
        badge: 'Validateur'
    },
    {
        key: 'historique-decisions',
        label: 'Historique des Décisions',
        path: '/historique-decisions',
        description: 'Journal des validations, refus et signatures électroniques',
        iconClass: 'fas fa-history'
    },
    {
        key: 'tableau-de-bord',
        label: 'Tableau de Bord',
        path: '/tableau-de-bord',
        description: 'Indicateurs d\'activité, respect des SLA et volumes d\'accès',
        iconClass: 'fas fa-chart-line'
    },
    {
        key: 'delegation',
        label: 'Délégations',
        path: '/delegation',
        description: 'Transfert temporaire de pouvoir de validation',
        iconClass: 'fas fa-exchange-alt',
        badge: 'Manager'
    },
    {
        key: 'admin',
        label: 'Espace Administrateur',
        path: '/admin',
        description: 'Workflows, tables, catalogues et gouvernance RBAC',
        iconClass: 'fas fa-shield-alt',
        badge: 'Admin'
    }
];

// Definitions of Tables & Entities
export interface TableResourceConfig {
    key: string;
    name: string;
    category: string;
    description: string;
    availableFields: { key: string; label: string }[];
}

export const AVAILABLE_TABLES: TableResourceConfig[] = [
    {
        key: 'requests',
        name: 'Demandes & Interventions',
        category: 'Opérations',
        description: 'Enregistrements des demandes d\'accès mécatroniques et habilitations',
        availableFields: [
            { key: 'reference', label: 'Référence & Intitulé' },
            { key: 'beneficiaire', label: 'Identité du demandeur & brigade' },
            { key: 'site', label: 'Site ferroviaire & voies' },
            { key: 'equipment', label: 'Type d\'équipement mécatronique' },
            { key: 'dates', label: 'Période & durée requise' },
            { key: 'validation', label: 'Étapes & avis de validation' },
            { key: 'documents', label: 'Pièces jointes & habilitations' },
            { key: 'comments', label: 'Commentaires & compléments' }
        ]
    },
    {
        key: 'tables',
        name: 'Tables de Référence',
        category: 'Paramétrage',
        description: 'Sites, services, régions, équipements et référentiels',
        availableFields: [
            { key: 'metadata', label: 'Code & Libellé de référence' },
            { key: 'attributes', label: 'Champs & attributs dynamiques' },
            { key: 'validators', label: 'Validateurs associés' },
            { key: 'normes', label: 'Normes mécatroniques (EN 15864 / 16864)' }
        ]
    },
    {
        key: 'processes',
        name: 'Processus & Circuits de Validation',
        category: 'Paramétrage',
        description: 'Modèles de workflows, étapes séquentielles et règles de SLA',
        availableFields: [
            { key: 'general', label: 'Nom & Catégorie de processus' },
            { key: 'stages', label: 'Étapes de validation & rôles' },
            { key: 'sla', label: 'Délais de SLA & alertes' },
            { key: 'form_fields', label: 'Champs du formulaire' }
        ]
    },
    {
        key: 'catalogues',
        name: 'Catalogues & Services',
        category: 'Paramétrage',
        description: 'Catégories de prestations et articles du catalogue',
        availableFields: [
            { key: 'name', label: 'Nom du catalogue' },
            { key: 'status', label: 'Statut de publication' },
            { key: 'norms', label: 'Références normatives' }
        ]
    },
    {
        key: 'users',
        name: 'Comptes Utilisateurs',
        category: 'Sécurité',
        description: 'Fiches collaborateurs, affectations et rôles attribués',
        availableFields: [
            { key: 'identity', label: 'Nom & Email Professionnel' },
            { key: 'roles', label: 'Rôles & Niveaux d\'accès' },
            { key: 'department', label: 'Région & Service de rattachement' },
            { key: 'sites', label: 'Sites ferroviaires autorisés' },
            { key: 'status', label: 'Statut du compte (Actif/Suspendu)' }
        ]
    },
    {
        key: 'roles',
        name: 'Rôles & Matrice des Droits',
        category: 'Sécurité',
        description: 'Définitions des rôles et paramétrage des privilèges RBAC',
        availableFields: [
            { key: 'name', label: 'Intitulé & Description du rôle' },
            { key: 'tabs', label: 'Visibilité des onglets' },
            { key: 'permissions', label: 'Permissions CRUD des tables' },
            { key: 'scopes', label: 'Périmètres de visibilité des champs' }
        ]
    },
    {
        key: 'syslog',
        name: 'Syslog & Traçabilité NIS 2',
        category: 'Conformité',
        description: 'Journaux d\'audit infalsifiables des actions système',
        availableFields: [
            { key: 'timestamp', label: 'Horodatage certifié' },
            { key: 'actor', label: 'Identité de l\'acteur' },
            { key: 'action', label: 'Nature de l\'opération' },
            { key: 'target', label: 'Entité cible' },
            { key: 'details', label: 'Détails techniques & IP' }
        ]
    }
];

export const DATA_SCOPES = [
    { value: 'all', label: 'National (Toutes les données)', desc: 'Accès sans restriction géographique ou départementale' },
    { value: 'department', label: 'Direction / Service uniquement', desc: 'Limité aux agents du même service métier' },
    { value: 'assigned_sites', label: 'Sites attribués uniquement', desc: 'Limité aux gares et technicentres confiés' },
    { value: 'own', label: 'Données personnelles uniquement', desc: 'Uniquement les données créées par l\'utilisateur' }
];

const rolesHelpSections: HelpSection[] = [
    {
        title: "Matrice des Droits RBAC",
        badge: "Sécurité",
        description: "Configurez finement les autorisations de chaque rôle (Administrateur, Manager N+1, Validateur, Demandeur ou profils personnalisés).",
        tips: [
            "Contrôlez la visibilité des onglets du portail agent par agent",
            "Gérez les droits CRUD (Créer, Lire, Modifier, Supprimer) par table métier"
        ]
    },
    {
        title: "Périmètres Géographiques & Données",
        badge: "Gouvernance",
        description: "Restreignez ou étendez l'accès des rôles selon les sites ferroviaires, les lignes ou les zones de sûreté.",
        tips: [
            "Les rôles système fondamentaux sont protégés contre la suppression pour garantir l'intégrité de la plateforme"
        ]
    }
];

export default function Roles() {
    const { isFeatureEnabled, toggleFeature } = useFeatures();
    const isFieldScopeEnabled = isFeatureEnabled('role_field_scope');
    const isSimulationEnabled = isFeatureEnabled('role_simulation');

    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeEditorTab, setActiveEditorTab] = useState<'tabs' | 'ref_visibility' | 'tables' | 'workflow_actions' | 'fields' | 'preview'>('tabs');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    // Relational reference tables and live preview dataset
    const [refTables, setRefTables] = useState<any[]>([]);
    const [allRequests, setAllRequests] = useState<any[]>([]);
    const [allSites, setAllSites] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Form state for creating a new role modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [newRolePreset, setNewRolePreset] = useState('Demandeur');
    const [dynamicPortalTabs, setDynamicPortalTabs] = useState<PortalTabConfig[]>(AVAILABLE_PORTAL_TABS);

    // Deletion confirmation modal
    const [roleToDelete, setRoleToDelete] = useState<{ id: number; name: string } | null>(null);

    const loadRoles = async () => {
        try {
            setLoading(true);
            const [rolesRes, refTablesRes, reqsRes, sitesRes, usersRes] = await Promise.all([
                getRoles().catch(() => ({ data: [] })),
                getReferenceTables().catch(() => ({ data: [] })),
                getRequests().catch(() => ({ data: [] })),
                getSites().catch(() => ({ data: [] })),
                getUsers().catch(() => ({ data: [] }))
            ]);

            const fetchedRoles = Array.isArray(rolesRes?.data)
                ? rolesRes.data
                : (Array.isArray(rolesRes?.data?.roles) ? rolesRes.data.roles : []);
            setRoles(fetchedRoles);
            if (refTablesRes?.data) setRefTables(refTablesRes.data);
            if (reqsRes?.data) setAllRequests(reqsRes.data);
            if (sitesRes?.data) setAllSites(sitesRes.data);
            if (usersRes?.data) setAllUsers(usersRes.data);

            // Dynamically load tabs from database
            fetch('/api/v1/admin/portal-tabs')
                .then(r => r.ok ? r.json() : null)
                .then(tabsData => {
                    if (Array.isArray(tabsData) && tabsData.length > 0) {
                        setDynamicPortalTabs(tabsData.map((t: any) => ({
                            key: t.key,
                            label: t.label,
                            path: t.path,
                            description: t.description || '',
                            iconClass: t.icon || 'fas fa-th-large',
                            badge: t.badge || undefined
                        })));
                    }
                })
                .catch(() => {});

            if (rolesRes.data && rolesRes.data.length > 0) {
                // If there's an already selected role, keep it updated
                setSelectedRole((prev: any) => {
                    if (prev) {
                        const found = rolesRes.data.find((r: any) => r.id === prev.id);
                        return found || rolesRes.data[0];
                    }
                    return rolesRes.data[0];
                });
            }
        } catch (err) {
            console.error("Erreur de chargement des rôles:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    // Filter roles
    const filteredRoles = useMemo(() => {
        if (!Array.isArray(roles)) return [];
        if (!searchQuery.trim()) return roles;
        const q = searchQuery.toLowerCase();
        return roles.filter(r =>
            String(r?.name || '').toLowerCase().includes(q) ||
            (r?.description && String(r.description).toLowerCase().includes(q))
        );
    }, [roles, searchQuery]);

    // Merge core tables and dynamic reference tables into unified referential catalog
    const allTablesAndReferentiels = useMemo(() => {
        const core = AVAILABLE_TABLES.map(t => ({
            ...t,
            isCustomRef: false,
            typeCategory: t.category || 'Opérations'
        }));

        const custom = (refTables || []).map((rt: any) => ({
            key: rt.id,
            name: rt.name,
            category: rt.category || 'Organisation',
            typeCategory: rt.category || 'Organisation',
            description: rt.description || `Référentiel dynamique ${rt.name}`,
            isCustomRef: true,
            availableFields: (rt.columns || []).map((col: any) => ({
                key: col.key,
                label: col.label || col.key
            })).concat(
                (rt.metadata_fields || []).map((meta: any) => ({
                    key: `meta_${meta.key}`,
                    label: `[Méta] ${meta.label || meta.key}`
                }))
            )
        }));

        return [...core, ...custom];
    }, [refTables]);

    // Current working role state copy for the editor
    const [draftRole, setDraftRole] = useState<any | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingRoleSwitch, setPendingRoleSwitch] = useState<any | null>(null);

    useEffect(() => {
        if (selectedRole) {
            // Ensure draft has standard structure
            const portalTabs = selectedRole.portalTabs || {
                catalogue: true,
                'mes-demandes': true,
                corbeille: selectedRole.name !== 'Demandeur',
                'historique-decisions': selectedRole.name !== 'Demandeur',
                'tableau-de-bord': true,
                delegation: selectedRole.name === 'Administrateur' || selectedRole.name === 'Manager',
                admin: selectedRole.name === 'Administrateur'
            };

            const defaultPerm = (tbl: string) => {
                const isAdmin = selectedRole.name === 'Administrateur';
                const isManager = selectedRole.name === 'Manager';
                const isValidator = selectedRole.name === 'Validateur Site';
                return {
                    see: true,
                    modify: isAdmin || (tbl === 'requests' && (isManager || isValidator)),
                    delete: isAdmin,
                    create: isAdmin || (tbl === 'requests'),
                    dataScope: isAdmin ? 'all' : (isManager ? 'department' : (isValidator ? 'assigned_sites' : 'own')),
                    allowedFields: ['all']
                };
            };

            const tablePermissions = selectedRole.tablePermissions || {};
            AVAILABLE_TABLES.forEach(tbl => {
                if (!tablePermissions[tbl.key]) {
                    tablePermissions[tbl.key] = defaultPerm(tbl.key);
                }
            });

            setDraftRole({
                ...selectedRole,
                portalTabs,
                tablePermissions,
                referenceVisibilityRules: selectedRole.referenceVisibilityRules || []
            });
            setIsDirty(false);
        }
    }, [selectedRole]);

    // Toggle a portal tab visibility
    const handleToggleTab = (tabKey: string) => {
        if (!draftRole) return;
        const nextTabs = {
            ...draftRole.portalTabs,
            [tabKey]: !draftRole.portalTabs?.[tabKey]
        };
        setDraftRole({
            ...draftRole,
            portalTabs: nextTabs
        });
        setIsDirty(true);
    };

    // Update table CRUD permissions
    const handleUpdateTablePerm = (tableKey: string, op: 'see' | 'modify' | 'delete' | 'create', value: boolean) => {
        if (!draftRole) return;
        const currentTable = draftRole.tablePermissions?.[tableKey] || {
            see: true,
            modify: false,
            delete: false,
            create: false,
            dataScope: 'all',
            allowedFields: ['all']
        };

        const updatedTable = {
            ...currentTable,
            [op]: value
        };

        // If see is toggled off, modify/delete should also be restricted
        if (op === 'see' && !value) {
            updatedTable.modify = false;
            updatedTable.delete = false;
        }

        setDraftRole({
            ...draftRole,
            tablePermissions: {
                ...draftRole.tablePermissions,
                [tableKey]: updatedTable
            }
        });
        setIsDirty(true);
    };

    // Quick set table permission profile
    const handleQuickTablePerm = (tableKey: string, preset: 'all' | 'read' | 'none') => {
        if (!draftRole) return;
        const currentTable = draftRole.tablePermissions?.[tableKey] || {};
        let nextPerm = { ...currentTable };

        if (preset === 'all') {
            nextPerm = { ...nextPerm, see: true, modify: true, delete: true, create: true };
        } else if (preset === 'read') {
            nextPerm = { ...nextPerm, see: true, modify: false, delete: false, create: false };
        } else {
            nextPerm = { ...nextPerm, see: false, modify: false, delete: false, create: false };
        }

        setDraftRole({
            ...draftRole,
            tablePermissions: {
                ...draftRole.tablePermissions,
                [tableKey]: nextPerm
            }
        });
        setIsDirty(true);
    };

    // Update table data scope
    const handleUpdateTableScope = (tableKey: string, scope: string) => {
        if (!draftRole) return;
        const currentTable = draftRole.tablePermissions?.[tableKey] || {};
        setDraftRole({
            ...draftRole,
            tablePermissions: {
                ...draftRole.tablePermissions,
                [tableKey]: {
                    ...currentTable,
                    dataScope: scope
                }
            }
        });
        setIsDirty(true);
    };

    // Toggle allowed field
    const handleToggleField = (tableKey: string, fieldKey: string) => {
        if (!draftRole) return;
        const currentTable = draftRole.tablePermissions?.[tableKey] || {};
        let currentFields: string[] = currentTable.allowedFields || ['all'];

        const tableDef = allTablesAndReferentiels.find(t => t.key === tableKey) || AVAILABLE_TABLES.find(t => t.key === tableKey);
        const allFieldKeys = (tableDef?.availableFields || []).map((f: any) => f.key);

        if (currentFields.includes('all')) {
            // If it had 'all', expand all other fields and remove this one
            currentFields = allFieldKeys.filter(k => k !== fieldKey);
        } else if (currentFields.includes(fieldKey)) {
            currentFields = currentFields.filter(k => k !== fieldKey);
        } else {
            currentFields = [...currentFields, fieldKey];
            if (allFieldKeys.length > 0 && currentFields.length === allFieldKeys.length) {
                currentFields = ['all'];
            }
        }

        setDraftRole({
            ...draftRole,
            tablePermissions: {
                ...draftRole.tablePermissions,
                [tableKey]: {
                    ...currentTable,
                    allowedFields: currentFields
                }
            }
        });
        setIsDirty(true);
    };

    // Apply quick preset profile to draft role
    const handleApplyPreset = (presetName: string) => {
        if (!draftRole) return;

        let portalTabs = { ...draftRole.portalTabs };
        let tablePermissions = { ...draftRole.tablePermissions };

        if (presetName === 'admin') {
            Object.keys(portalTabs).forEach(k => portalTabs[k] = true);
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: true,
                    delete: true,
                    create: true,
                    dataScope: 'all',
                    allowedFields: ['all']
                };
            });
        } else if (presetName === 'manager') {
            portalTabs = {
                catalogue: true,
                'mes-demandes': true,
                corbeille: true,
                'historique-decisions': true,
                'tableau-de-bord': true,
                delegation: true,
                admin: false
            };
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: tbl.key === 'requests',
                    delete: false,
                    create: tbl.key === 'requests',
                    dataScope: 'department',
                    allowedFields: ['all']
                };
            });
        } else if (presetName === 'validator') {
            portalTabs = {
                catalogue: true,
                'mes-demandes': true,
                corbeille: true,
                'historique-decisions': true,
                'tableau-de-bord': true,
                delegation: true,
                admin: false
            };
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: tbl.key === 'requests',
                    delete: false,
                    create: false,
                    dataScope: 'assigned_sites',
                    allowedFields: ['all']
                };
            });
        } else if (presetName === 'auditor') {
            portalTabs = {
                catalogue: true,
                'mes-demandes': false,
                corbeille: false,
                'historique-decisions': true,
                'tableau-de-bord': true,
                delegation: false,
                admin: true
            };
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: false,
                    delete: false,
                    create: false,
                    dataScope: 'all',
                    allowedFields: ['all']
                };
            });
        } else {
            // Demandeur standard
            portalTabs = {
                catalogue: true,
                'mes-demandes': true,
                corbeille: false,
                'historique-decisions': false,
                'tableau-de-bord': true,
                delegation: false,
                admin: false
            };
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: tbl.key === 'requests' || tbl.key === 'tables' || tbl.key === 'processes' || tbl.key === 'catalogues',
                    modify: tbl.key === 'requests',
                    delete: tbl.key === 'requests',
                    create: tbl.key === 'requests',
                    dataScope: 'own',
                    allowedFields: ['all']
                };
            });
        }

        setDraftRole({
            ...draftRole,
            portalTabs,
            tablePermissions
        });
        setIsDirty(true);
    };

    // Save changes to server
    const handleSaveRole = async () => {
        if (!draftRole) return;
        setSaving(true);
        try {
            // Recompute privileges array for backwards compatibility
            const privSet = new Set<string>(draftRole.privileges || []);
            if (draftRole.portalTabs?.admin) privSet.add('manage_users');
            if (draftRole.portalTabs?.corbeille || draftRole.tablePermissions?.requests?.modify) privSet.add('validate_requests');
            if (draftRole.portalTabs?.['tableau-de-bord']) privSet.add('view_dashboard');
            if (draftRole.tablePermissions?.requests?.create) privSet.add('create_request');
            if (draftRole.tablePermissions?.tables?.modify) privSet.add('manage_processes');

            const payload = {
                name: draftRole.name,
                description: draftRole.description,
                portalTabs: draftRole.portalTabs,
                tablePermissions: draftRole.tablePermissions,
                referenceVisibilityRules: draftRole.referenceVisibilityRules || [],
                privileges: Array.from(privSet)
            };

            await updateRole(draftRole.id, payload);

            // Update current user if logged in with this role
            const savedUserStr = localStorage.getItem('user');
            if (savedUserStr) {
                try {
                    const savedUser = JSON.parse(savedUserStr);
                    if (savedUser.role === draftRole.name || (savedUser.roles && savedUser.roles.includes(draftRole.name))) {
                        savedUser.portalTabs = draftRole.portalTabs;
                        savedUser.tablePermissions = draftRole.tablePermissions;
                        savedUser.referenceVisibilityRules = draftRole.referenceVisibilityRules || [];
                        localStorage.setItem('user', JSON.stringify(savedUser));
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            }

            setSaveSuccess(true);
            setIsDirty(false);
            setTimeout(() => setSaveSuccess(false), 3000);
            loadRoles();
        } catch (err) {
            console.error("Erreur lors de la sauvegarde du rôle:", err);
            alert("Erreur lors de la sauvegarde des modifications du rôle.");
        } finally {
            setSaving(false);
        }
    };

    // Create a new role
    const handleCreateNewRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        let portalTabs: Record<string, boolean> = {
            catalogue: true,
            'mes-demandes': true,
            corbeille: false,
            'historique-decisions': false,
            'tableau-de-bord': true,
            delegation: false,
            admin: false
        };

        let tablePermissions: Record<string, any> = {};

        if (newRolePreset === 'Validateur') {
            portalTabs.corbeille = true;
            portalTabs['historique-decisions'] = true;
            portalTabs.delegation = true;
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: tbl.key === 'requests',
                    delete: false,
                    create: false,
                    dataScope: 'assigned_sites',
                    allowedFields: ['all']
                };
            });
        } else if (newRolePreset === 'Manager') {
            portalTabs.corbeille = true;
            portalTabs['historique-decisions'] = true;
            portalTabs.delegation = true;
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: tbl.key === 'requests',
                    delete: false,
                    create: true,
                    dataScope: 'department',
                    allowedFields: ['all']
                };
            });
        } else if (newRolePreset === 'Administrateur') {
            Object.keys(portalTabs).forEach(k => portalTabs[k] = true);
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: true,
                    delete: true,
                    create: true,
                    dataScope: 'all',
                    allowedFields: ['all']
                };
            });
        } else {
            AVAILABLE_TABLES.forEach(tbl => {
                tablePermissions[tbl.key] = {
                    see: true,
                    modify: tbl.key === 'requests',
                    delete: tbl.key === 'requests',
                    create: tbl.key === 'requests',
                    dataScope: 'own',
                    allowedFields: ['all']
                };
            });
        }

        try {
            const res = await createRole({
                name: newRoleName.trim(),
                description: newRoleDesc.trim(),
                portalTabs,
                tablePermissions,
                privileges: ['view_dashboard', 'create_request']
            });

            setShowCreateModal(false);
            setNewRoleName('');
            setNewRoleDesc('');
            loadRoles();
            if (res.data?.role) {
                setSelectedRole(res.data.role);
            }
        } catch (err) {
            console.error("Erreur lors de la création du rôle:", err);
            alert("Erreur lors de la création du nouveau rôle.");
        }
    };

    // Delete role
    const handleDeleteRole = (roleId: number, roleName: string) => {
        // Prevent deleting active session role or if only 1 role exists
        const savedUserStr = localStorage.getItem('user');
        if (savedUserStr) {
            try {
                const u = JSON.parse(savedUserStr);
                if (u.role === roleName) {
                    alert("Impossible de supprimer le rôle avec lequel vous êtes actuellement connecté.");
                    return;
                }
            } catch {}
        }
        if (roles.length <= 1) {
            alert("Impossible de supprimer le dernier rôle existant sur la plateforme.");
            return;
        }
        setRoleToDelete({ id: roleId, name: roleName });
    };

    const handleConfirmDeleteRole = async () => {
        if (!roleToDelete) return;
        try {
            await deleteRole(roleToDelete.id);
            setRoleToDelete(null);
            loadRoles();
        } catch (err) {
            console.error("Erreur suppression:", err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section with high-contrast badge & quick actions */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#002395] uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#002395]" />
                        <span>Sécurité & Gouvernance RBAC</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                        Rôles, Visibilités & Matrice des Droits
                    </h1>
                    <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                        Pilotez précisément la visibilité des onglets du portail, les autorisations par table (Voir, Modifier, Supprimer, Créer) et la sensibilité des champs de données.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                    <PageHelpButton
                        pageTitle="Rôles & Matrice des Droits"
                        pageCategory="Gouvernance RBAC"
                        description="Pilotez les habilitations des profils agents : onglets visibles, autorisations par table et périmètres de données."
                        sections={rolesHelpSections}
                    />
                    <button
                        id="btn-refresh-roles"
                        onClick={loadRoles}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Actualiser les données"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualiser</span>
                    </button>
                    <button
                        id="btn-new-role-modal"
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-[#002395] hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau Rôle</span>
                    </button>
                </div>
            </div>

            {/* Main two-column layout: Roles list selector on left, rich editor on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Role Selector (4 cols on lg, 3 cols on xl) */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-[#002395]" />
                                Profils Définis ({filteredRoles.length})
                            </h2>
                            <span className="text-[10px] bg-blue-50 text-[#002395] font-semibold px-2 py-0.5 rounded-full">
                                RBAC Actif
                            </span>
                        </div>

                        {/* Search input */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="input-search-roles"
                                type="text"
                                placeholder="Filtrer les rôles..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#002395] focus:outline-hidden"
                            />
                        </div>

                        {/* Role Cards List */}
                        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                            {filteredRoles.map(role => {
                                const isSelected = selectedRole?.id === role.id;
                                const isSystem = role.id <= 4;
                                const enabledTabsCount = role.portalTabs
                                    ? Object.values(role.portalTabs).filter(Boolean).length
                                    : 0;

                                return (
                                    <div
                                        key={role.id}
                                        id={`role-item-${role.id}`}
                                        onClick={() => {
                                            if (isDirty) {
                                                setPendingRoleSwitch(role);
                                                return;
                                            }
                                            setSelectedRole(role);
                                        }}
                                        className={`p-3 rounded-lg border text-left cursor-pointer transition relative group ${
                                            isSelected
                                                ? 'bg-blue-50/80 border-[#002395] ring-2 ring-[#002395]/20 shadow-xs'
                                                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-950 text-xs truncate">
                                                        {role.name}
                                                    </span>
                                                    {isSystem && (
                                                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium border border-gray-200">
                                                            Système
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                                                    {role.description || "Aucune description renseignée"}
                                                </p>
                                            </div>

                                            {roles.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRole(role.id, role.name);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                                    title={`Supprimer le rôle ${role.name}`}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Quick indicators */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px]">
                                            <span className="bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Eye className="w-2.5 h-2.5 text-[#002395]" />
                                                <span>{enabledTabsCount} onglet{enabledTabsCount > 1 ? 's' : ''}</span>
                                            </span>
                                            {role.tablePermissions?.requests && (
                                                <span className="bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                                                    {role.tablePermissions.requests.see ? 'V' : '-'}{role.tablePermissions.requests.modify ? 'M' : '-'}{role.tablePermissions.requests.delete ? 'S' : '-'}{role.tablePermissions.requests.create ? 'C' : '-'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Presets Box */}
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-yellow-300">
                            <Sparkles className="w-4 h-4" />
                            <span>Modèles Prédéfinis Standards</span>
                        </div>
                        <p className="text-[11px] text-blue-100 mb-3">
                            Appliquez rapidement un profil type sur le rôle sélectionné pour accélérer la configuration :
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={() => handleApplyPreset('admin')}
                                className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold text-left transition"
                            >
                                🛡️ Admin Total
                            </button>
                            <button
                                onClick={() => handleApplyPreset('manager')}
                                className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold text-left transition"
                            >
                                👥 Manager N+1
                            </button>
                            <button
                                onClick={() => handleApplyPreset('validator')}
                                className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold text-left transition"
                            >
                                🔍 Validateur Site
                            </button>
                            <button
                                onClick={() => handleApplyPreset('demandeur')}
                                className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold text-left transition"
                            >
                                📝 Demandeur
                            </button>
                            <button
                                onClick={() => handleApplyPreset('auditor')}
                                className="col-span-2 px-2 py-1.5 bg-white/10 hover:bg-white/20 text-yellow-200 rounded text-[11px] font-semibold text-left transition"
                            >
                                🔒 Auditeur / Conformité NIS 2 (Lecture Seule)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Editor for Selected Role (8 cols on lg, 9 cols on xl) */}
                <div className="lg:col-span-8 xl:col-span-9 min-w-0">
                    {draftRole ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                            {/* Role Editor Header */}
                            <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="input-role-title"
                                            type="text"
                                            value={draftRole.name}
                                            onChange={e => {
                                                setDraftRole({ ...draftRole, name: e.target.value });
                                                setIsDirty(true);
                                            }}
                                            className="text-lg font-black text-gray-950 bg-transparent border-b border-dashed border-gray-300 hover:border-gray-500 focus:border-[#002395] focus:bg-white px-1 py-0.5 rounded outline-hidden"
                                        />
                                        <span className="text-[10px] bg-blue-100 text-[#002395] font-bold px-2 py-0.5 rounded-full">
                                            ID #{draftRole.id}
                                        </span>
                                    </div>
                                    <input
                                        id="input-role-desc"
                                        type="text"
                                        value={draftRole.description || ''}
                                        placeholder="Ajoutez une description opérationnelle de ce rôle..."
                                        onChange={e => {
                                            setDraftRole({ ...draftRole, description: e.target.value });
                                            setIsDirty(true);
                                        }}
                                        className="text-xs text-gray-600 w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#002395] focus:bg-white px-1 py-0.5 rounded outline-hidden"
                                    />
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {isDirty && (
                                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 animate-pulse">
                                            Modifications non enregistrées
                                        </span>
                                    )}
                                    {saveSuccess && (
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            Enregistré avec succès !
                                        </span>
                                    )}
                                    <button
                                        id="btn-save-role-config"
                                        onClick={handleSaveRole}
                                        disabled={saving}
                                        className="px-4 py-2 bg-[#002395] hover:bg-blue-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Tabs inside the Editor */}
                            <div className="flex border-b border-gray-200 bg-white px-4 overflow-x-auto">
                                <button
                                    id="tab-btn-portal-visibility"
                                    onClick={() => setActiveEditorTab('tabs')}
                                    className={`px-3.5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        activeEditorTab === 'tabs'
                                            ? 'border-[#002395] text-[#002395]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    <span>1. Onglets du Portail</span>
                                </button>
                                <button
                                    id="tab-btn-ref-visibility"
                                    onClick={() => setActiveEditorTab('ref_visibility')}
                                    className={`px-3.5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        activeEditorTab === 'ref_visibility'
                                            ? 'border-[#002395] text-[#002395]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <Database className="w-3.5 h-3.5 text-blue-600" />
                                    <span>2. Visibilité par Table (Région, Direction...)</span>
                                    {draftRole?.referenceVisibilityRules && draftRole.referenceVisibilityRules.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-[#002395] rounded-full text-[10px] font-extrabold">
                                            {draftRole.referenceVisibilityRules.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    id="tab-btn-table-crud"
                                    onClick={() => setActiveEditorTab('tables')}
                                    className={`px-3.5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        activeEditorTab === 'tables'
                                            ? 'border-[#002395] text-[#002395]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <TableIcon className="w-3.5 h-3.5" />
                                    <span>3. Droits Tables (CRUD)</span>
                                </button>
                                <button
                                    id="tab-btn-workflow-actions"
                                    onClick={() => setActiveEditorTab('workflow_actions')}
                                    className={`px-3.5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        activeEditorTab === 'workflow_actions'
                                            ? 'border-[#002395] text-[#002395]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>4. Actions de Workflow</span>
                                    {draftRole?.privileges && draftRole.privileges.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                                            {draftRole.privileges.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    id="tab-btn-fields-scope"
                                    onClick={() => setActiveEditorTab('fields')}
                                    className={`px-3.5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        activeEditorTab === 'fields'
                                            ? 'border-[#002395] text-[#002395]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span>5. Périmètre & Champs</span>
                                    {!isFieldScopeEnabled && (
                                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold border border-amber-300">
                                            Désactivé (Admin)
                                        </span>
                                    )}
                                </button>
                                <button
                                    id="tab-btn-live-preview"
                                    onClick={() => setActiveEditorTab('preview')}
                                    className={`px-3.5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        activeEditorTab === 'preview'
                                            ? 'border-[#002395] text-[#002395]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>5. Simulation en direct</span>
                                    {!isSimulationEnabled && (
                                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold border border-amber-300">
                                            Désactivé (Admin)
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Tab Content 1: Portal Tabs Visibility */}
                            {activeEditorTab === 'tabs' && (
                                <div className="p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50/60 p-3 rounded-lg border border-blue-100 gap-2">
                                        <div className="flex items-center gap-2 text-xs text-blue-900">
                                            <Info className="w-4 h-4 text-[#002395] shrink-0" />
                                            <span>
                                                Activez ou désactivez les rubriques accessibles dans la barre de navigation supérieure pour les agents possédant ce rôle.
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <a
                                                href="/admin/onglets-referentiels"
                                                className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition flex items-center gap-1"
                                                title="Modifier les noms, descriptions, badges et ordre d'affichage des onglets"
                                            >
                                                <i className="fas fa-sliders-h text-[10px]"></i>
                                                <span>Gérer les Noms & Descriptions</span>
                                            </a>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                onClick={() => {
                                                    const allTrue: Record<string, boolean> = {};
                                                    dynamicPortalTabs.forEach(t => allTrue[t.key] = true);
                                                    setDraftRole({ ...draftRole, portalTabs: allTrue });
                                                    setIsDirty(true);
                                                }}
                                                className="text-[11px] font-semibold text-[#002395] hover:underline"
                                            >
                                                Tout activer
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                onClick={() => {
                                                    const allFalse: Record<string, boolean> = {};
                                                    dynamicPortalTabs.forEach(t => allFalse[t.key] = false);
                                                    allFalse.catalogue = true; // keep at least catalogue
                                                    setDraftRole({ ...draftRole, portalTabs: allFalse });
                                                    setIsDirty(true);
                                                }}
                                                className="text-[11px] font-semibold text-gray-600 hover:underline"
                                            >
                                                Minimiser
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {dynamicPortalTabs.map(tab => {
                                            const isVisible = !!draftRole.portalTabs?.[tab.key];

                                            return (
                                                <div
                                                    key={tab.key}
                                                    id={`tab-toggle-${tab.key}`}
                                                    onClick={() => handleToggleTab(tab.key)}
                                                    className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                                                        isVisible
                                                            ? 'bg-white border-[#002395]/40 shadow-xs ring-1 ring-[#002395]/10'
                                                            : 'bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-90'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                            isVisible ? 'bg-[#002395] text-white' : 'bg-gray-200 text-gray-500'
                                                        }`}>
                                                            <i className={`${tab.iconClass} text-xs`}></i>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-950 truncate">
                                                                    {tab.label}
                                                                </span>
                                                                {tab.badge && (
                                                                    <span className="text-[9px] bg-blue-100 text-[#002395] px-1.5 py-0.2 rounded font-semibold">
                                                                        {tab.badge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                                                                {tab.description}
                                                            </p>
                                                            <span className="inline-block mt-1 font-mono text-[10px] text-gray-400">
                                                                Route : {tab.path}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Toggle switch visual */}
                                                    <div className="shrink-0 pt-0.5">
                                                        <div className={`w-10 h-5.5 rounded-full transition-colors relative ${
                                                            isVisible ? 'bg-[#002395]' : 'bg-gray-300'
                                                        }`}>
                                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                                                                isVisible ? 'right-0.5' : 'left-0.5'
                                                            }`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 2: Reference-Based Visibility Rules (Région, Direction, Services...) */}
                            {activeEditorTab === 'ref_visibility' && (
                                <ReferenceVisibilityEditor
                                    draftRole={draftRole}
                                    setDraftRole={setDraftRole}
                                    setIsDirty={setIsDirty}
                                    referenceTables={refTables}
                                    allRequests={allRequests}
                                    allSites={allSites}
                                    allUsers={allUsers}
                                />
                            )}

                            {/* Tab Content 3: Table CRUD Permissions (Voir, Modifier, Supprimer, Créer) */}
                            {activeEditorTab === 'tables' && (
                                <div className="p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="text-xs text-gray-700">
                                            Définissez les droits d'action élémentaires (<strong>Voir</strong>, <strong>Modifier</strong>, <strong>Supprimer</strong>, <strong>Créer</strong>) pour chaque table et ressource métier.
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-gray-500">Actions globales :</span>
                                            <button
                                                onClick={() => {
                                                    const updated = { ...draftRole.tablePermissions };
                                                    AVAILABLE_TABLES.forEach(t => {
                                                        updated[t.key] = { ...(updated[t.key] || {}), see: true, modify: true, delete: true, create: true };
                                                    });
                                                    setDraftRole({ ...draftRole, tablePermissions: updated });
                                                    setIsDirty(true);
                                                }}
                                                className="text-[11px] font-bold text-[#002395] hover:underline"
                                            >
                                                Tout autoriser
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                onClick={() => {
                                                    const updated = { ...draftRole.tablePermissions };
                                                    AVAILABLE_TABLES.forEach(t => {
                                                        updated[t.key] = { ...(updated[t.key] || {}), see: true, modify: false, delete: false, create: false };
                                                    });
                                                    setDraftRole({ ...draftRole, tablePermissions: updated });
                                                    setIsDirty(true);
                                                }}
                                                className="text-[11px] font-bold text-gray-600 hover:underline"
                                            >
                                                Lecture seule
                                            </button>
                                        </div>
                                    </div>

                                    {/* Responsive Matrix Table */}
                                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-bold">
                                                    <th className="py-3 px-4 min-w-[200px]">Table / Ressource</th>
                                                    <th className="py-3 px-3 text-center w-24">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                            <span>Voir</span>
                                                        </div>
                                                    </th>
                                                    <th className="py-3 px-3 text-center w-24">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Pencil className="w-3.5 h-3.5 text-amber-600" />
                                                            <span>Modifier</span>
                                                        </div>
                                                    </th>
                                                    <th className="py-3 px-3 text-center w-24">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Trash className="w-3.5 h-3.5 text-rose-600" />
                                                            <span>Supprimer</span>
                                                        </div>
                                                    </th>
                                                    <th className="py-3 px-3 text-center w-24">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Créer</span>
                                                        </div>
                                                    </th>
                                                    <th className="py-3 px-4 text-right">Raccourcis</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {AVAILABLE_TABLES.map(table => {
                                                    const perm = draftRole.tablePermissions?.[table.key] || {
                                                        see: false,
                                                        modify: false,
                                                        delete: false,
                                                        create: false
                                                    };

                                                    return (
                                                        <tr key={table.key} className="hover:bg-blue-50/30 transition">
                                                            <td className="py-3.5 px-4">
                                                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                                                    <Database className="w-3.5 h-3.5 text-[#002395]" />
                                                                    <span>{table.name}</span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                                    {table.description}
                                                                </div>
                                                            </td>

                                                            {/* VOIR */}
                                                            <td className="py-3.5 px-3 text-center">
                                                                <button
                                                                    id={`toggle-see-${table.key}`}
                                                                    type="button"
                                                                    onClick={() => handleUpdateTablePerm(table.key, 'see', !perm.see)}
                                                                    className={`w-7 h-7 inline-flex items-center justify-center rounded-lg border transition cursor-pointer ${
                                                                        perm.see
                                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                                                                            : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                                    title={perm.see ? "Autorisé" : "Interdit"}
                                                                >
                                                                    {perm.see ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </td>

                                                            {/* MODIFIER */}
                                                            <td className="py-3.5 px-3 text-center">
                                                                <button
                                                                    id={`toggle-modify-${table.key}`}
                                                                    type="button"
                                                                    onClick={() => handleUpdateTablePerm(table.key, 'modify', !perm.modify)}
                                                                    className={`w-7 h-7 inline-flex items-center justify-center rounded-lg border transition cursor-pointer ${
                                                                        perm.modify
                                                                            ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
                                                                            : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                                    title={perm.modify ? "Autorisé" : "Interdit"}
                                                                >
                                                                    {perm.modify ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </td>

                                                            {/* SUPPRIMER */}
                                                            <td className="py-3.5 px-3 text-center">
                                                                <button
                                                                    id={`toggle-delete-${table.key}`}
                                                                    type="button"
                                                                    onClick={() => handleUpdateTablePerm(table.key, 'delete', !perm.delete)}
                                                                    className={`w-7 h-7 inline-flex items-center justify-center rounded-lg border transition cursor-pointer ${
                                                                        perm.delete
                                                                            ? 'bg-rose-600 border-rose-600 text-white shadow-2xs'
                                                                            : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                                    title={perm.delete ? "Autorisé" : "Interdit"}
                                                                >
                                                                    {perm.delete ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </td>

                                                            {/* CRÉER */}
                                                            <td className="py-3.5 px-3 text-center">
                                                                <button
                                                                    id={`toggle-create-${table.key}`}
                                                                    type="button"
                                                                    onClick={() => handleUpdateTablePerm(table.key, 'create', !perm.create)}
                                                                    className={`w-7 h-7 inline-flex items-center justify-center rounded-lg border transition cursor-pointer ${
                                                                        perm.create
                                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                                                            : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                                                                    }`}
                                                                    title={perm.create ? "Autorisé" : "Interdit"}
                                                                >
                                                                    {perm.create ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </td>

                                                            {/* Quick presets per table */}
                                                            <td className="py-3.5 px-4 text-right">
                                                                <div className="inline-flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuickTablePerm(table.key, 'all')}
                                                                        className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-2 py-1 rounded"
                                                                        title="Accorder tous les droits"
                                                                    >
                                                                        Tout
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuickTablePerm(table.key, 'read')}
                                                                        className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded"
                                                                        title="Lecture seule uniquement"
                                                                    >
                                                                        Lecture
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuickTablePerm(table.key, 'none')}
                                                                        className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-2 py-1 rounded"
                                                                        title="Révoquer tous les droits"
                                                                    >
                                                                        Bloquer
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 4: Workflow Actions & Privileges (Validation, Soumission, Arbitrage, Compléments...) */}
                            {activeEditorTab === 'workflow_actions' && (
                                <div className="p-6 space-y-5">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span>Matrice des Privilèges par Action de Workflow</span>
                                            </h3>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                Activez ou désactivez les droits d'action sur chaque étape du cycle de vie sans dépendre de rôles statiques ou codés en dur.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allKeys = AVAILABLE_WORKFLOW_ACTIONS.map(a => a.key);
                                                    setDraftRole({
                                                        ...draftRole,
                                                        privileges: Array.from(new Set([...(draftRole.privileges || []), ...allKeys]))
                                                    });
                                                    setIsDirty(true);
                                                }}
                                                className="text-xs font-bold text-[#002395] hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition"
                                            >
                                                Tout autoriser
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const actionKeys = new Set(AVAILABLE_WORKFLOW_ACTIONS.map(a => a.key));
                                                    const remaining = (draftRole.privileges || []).filter(p => !actionKeys.has(p));
                                                    setDraftRole({
                                                        ...draftRole,
                                                        privileges: remaining
                                                    });
                                                    setIsDirty(true);
                                                }}
                                                className="text-xs font-bold text-gray-600 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200 transition"
                                            >
                                                Tout révoquer
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {AVAILABLE_WORKFLOW_ACTIONS.map(action => {
                                            const isGranted = Boolean(draftRole.privileges?.includes(action.key));
                                            return (
                                                <div
                                                    key={action.key}
                                                    onClick={() => {
                                                        const current = new Set<string>(draftRole.privileges || []);
                                                        if (current.has(action.key)) {
                                                            current.delete(action.key);
                                                        } else {
                                                            current.add(action.key);
                                                        }
                                                        setDraftRole({
                                                            ...draftRole,
                                                            privileges: Array.from(current)
                                                        });
                                                        setIsDirty(true);
                                                    }}
                                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                                        isGranted
                                                            ? 'bg-blue-50/60 border-[#002395]/40 shadow-2xs'
                                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                                    }`}
                                                >
                                                    <div className="pt-0.5 shrink-0">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                                            isGranted
                                                                ? 'bg-[#002395] border-[#002395] text-white shadow-2xs'
                                                                : 'bg-white border-gray-300 text-transparent'
                                                        }`}>
                                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1 mb-1">
                                                            <span className="font-bold text-xs text-gray-900 truncate">
                                                                {action.label}
                                                            </span>
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                                                                {action.category}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 leading-snug">
                                                            {action.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 5: Fields & Data Scopes with AI Assistance */}
                            {activeEditorTab === 'fields' && (
                                !isFieldScopeEnabled ? (
                                    <div className="p-8 text-center bg-gray-50/80 border border-dashed border-amber-300 rounded-xl m-6">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                                            <EyeOff className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">
                                            Le module « Périmètre de champs dans les rôles » est désactivé
                                        </h3>
                                        <p className="text-xs text-gray-600 max-w-md mx-auto mb-4 leading-relaxed">
                                            Ce module a été désactivé par l'administrateur depuis la gestion des fonctionnalités. Les périmètres de champs et modes de lecture/écriture sont suspendus.
                                        </p>
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                id="btn-reactivate-role-field-scope"
                                                onClick={async () => {
                                                    await toggleFeature('role_field_scope', true);
                                                }}
                                                className="px-4 py-2 bg-[#002395] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer shadow-xs"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>Réactiver le module Périmètre de champs</span>
                                            </button>
                                            <a
                                                href="/admin/onglets-referentiels?section=features"
                                                className="px-3.5 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
                                            >
                                                Console Modules
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <RoleFieldScopeEditor
                                        draftRole={draftRole}
                                        setDraftRole={setDraftRole}
                                        setIsDirty={setIsDirty}
                                        allTablesAndReferentiels={allTablesAndReferentiels}
                                        refTables={refTables}
                                    />
                                )
                            )}

                            {/* Tab Content 5: Live Preview & Simulation with Interactive Form & AI Audit */}
                            {activeEditorTab === 'preview' && (
                                !isSimulationEnabled ? (
                                    <div className="p-8 text-center bg-gray-50/80 border border-dashed border-amber-300 rounded-xl m-6">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                                            <EyeOff className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">
                                            Le module « Simulation des Rôles en Direct » est désactivé
                                        </h3>
                                        <p className="text-xs text-gray-600 max-w-md mx-auto mb-4 leading-relaxed">
                                            La simulation interactive du portail utilisateur et des formulaires a été désactivée par l'administrateur.
                                        </p>
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                id="btn-reactivate-role-simulation"
                                                onClick={async () => {
                                                    await toggleFeature('role_simulation', true);
                                                }}
                                                className="px-4 py-2 bg-[#002395] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer shadow-xs"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>Réactiver la simulation en direct</span>
                                            </button>
                                            <a
                                                href="/admin/onglets-referentiels?section=features"
                                                className="px-3.5 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
                                            >
                                                Console Modules
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <RoleSimulator
                                        draftRole={draftRole}
                                        allTablesAndReferentiels={allTablesAndReferentiels}
                                        refTables={refTables}
                                        allRequests={allRequests}
                                        allSites={allSites}
                                        allUsers={allUsers}
                                        dynamicPortalTabs={dynamicPortalTabs}
                                    />
                                )
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500 shadow-xs">
                            <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-sm font-semibold">Veuillez sélectionner un rôle dans la liste de gauche pour configurer ses visibilités et droits.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Create New Role */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Plus className="w-5 h-5 text-[#002395]" />
                                <span>Créer un nouveau Rôle</span>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNewRole} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Intitulé du Rôle *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        placeholder="Ex: Auditeur Sûreté Ferroviaire"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Description du périmètre
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={newRoleDesc}
                                        onChange={e => setNewRoleDesc(e.target.value)}
                                        placeholder="Ex: Contrôle de conformité et audit des accès mécatroniques..."
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Modèle de départ (Preset)
                                    </label>
                                    <select
                                        value={newRolePreset}
                                        onChange={e => setNewRolePreset(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    >
                                        <option value="Demandeur">Profil Demandeur (Catalogue + Mes Demandes)</option>
                                        <option value="Validateur">Profil Validateur Site (Corbeille + Validation)</option>
                                        <option value="Manager">Profil Manager N+1 (Validation hiérarchique + Équipe)</option>
                                        <option value="Administrateur">Profil Administrateur (Accès Total)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer"
                                >
                                    Créer le rôle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* In-App Deletion Modal for Roles */}
            {roleToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col my-auto overflow-hidden p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 leading-snug">
                                    Supprimer le rôle "{roleToDelete.name}" ?
                                </h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Cette action est irréversible. Les utilisateurs associés à ce rôle perdront les habilitations spécifiques qui lui sont attachées.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setRoleToDelete(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteRole}
                                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer définitivement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom in-app Confirmation Modal for Unsaved Role Switch */}
            {pendingRoleSwitch && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[80vh] overflow-y-auto p-6 space-y-4 my-auto animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 leading-snug">
                                    Modifications non enregistrées
                                </h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Vous avez des modifications en cours sur le rôle <strong className="text-gray-900">{draftRole?.name}</strong>. Voulez-vous changer de rôle sans enregistrer ?
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setPendingRoleSwitch(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                            >
                                Rester sur ce rôle
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedRole(pendingRoleSwitch);
                                    setPendingRoleSwitch(null);
                                    setIsDirty(false);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-xs cursor-pointer"
                            >
                                Abandonner les modifications
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
