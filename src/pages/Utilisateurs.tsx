import React, { useState, useEffect, useMemo } from 'react';
import {
    getUsers,
    createUser,
    updateUser,
    getRoles,
    getTables,
    getTableById,
    getPeopleFilterSettings,
    updatePeopleFilterSettings
} from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import {
    Users as UsersIcon,
    Plus,
    Edit2,
    X,
    Check,
    Mail,
    Building2,
    ShieldCheck,
    Filter,
    SlidersHorizontal,
    Settings2,
    RefreshCw,
    MapPin,
    Tag,
    Info,
    CheckSquare,
    Square,
    Link2,
    Layers,
    ExternalLink
} from 'lucide-react';

export interface UserRoleOption {
    id: string;
    label: string;
    desc?: string;
}

const DEFAULT_FALLBACK_ROLES: UserRoleOption[] = [
    { id: 'Demandeur', label: 'Demandeur', desc: 'Agent terrain créateur de demandes' },
    { id: 'Manager', label: 'Manager (N+1)', desc: 'Validation hiérarchique' },
    { id: 'Validateur Site', label: 'Validateur Site', desc: 'Sûreté physique & technique' },
    { id: 'Administrateur', label: 'Administrateur', desc: 'Supervision et configuration globale' }
];

const utilisateursHelpSections: HelpSection[] = [
    {
        title: "Gestion Multi-Rôles (RBAC)",
        badge: "Habilitations",
        description: "Attribuez un ou plusieurs rôles d'accès à chaque collaborateur (Demandeur, Manager N+1, Validateur Site, Administrateur).",
        tips: [
            "Un utilisateur peut cumuler plusieurs casquettes selon ses missions",
            "Les validateurs de chaque étape du circuit sont automatiquement filtrés selon ces rôles"
        ]
    },
    {
        title: "Filtres Dynamiques d'Administration",
        badge: "Navigation Métier",
        description: "Activez n'importe quelle Table de Référence (Sites, Équipes, Pôles, Entités) pour filtrer instantanément l'annuaire.",
        tips: [
            "Cliquez sur 'Filtres d'administration' pour choisir quelles tables afficher comme sélecteurs",
            "Recherchez par nom, e-mail ou critère métier combiné"
        ]
    },
    {
        title: "Données Personnalisées & Rattachements",
        badge: "Profil Agent",
        description: "Associez les utilisateurs à leur site principal, leur organisation, leur matricule et leurs métadonnées de sûreté."
    }
];

export default function Utilisateurs() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [allTables, setAllTables] = useState<any[]>([]);
    const [tablesDataMap, setTablesDataMap] = useState<Record<string, any[]>>({});
    const [configuredFilterTableIds, setConfiguredFilterTableIds] = useState<string[]>(['roles', 'services', 'regions', 'sites']);
    const [showFilterConfigModal, setShowFilterConfigModal] = useState(false);
    const [tempFilterConfig, setTempFilterConfig] = useState<string[]>([]);
    const [savingConfig, setSavingConfig] = useState(false);

    // Active filters
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');

    // Roles state (dynamically fetched from backend)
    const [availableRoles, setAvailableRoles] = useState<UserRoleOption[]>(DEFAULT_FALLBACK_ROLES);

    // Create User Form State
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['Demandeur']);
    const [region, setRegion] = useState('Île-de-France');
    const [service, setService] = useState('Maintenance Voie');
    const [selectedSites, setSelectedSites] = useState<string[]>(['Paris Gare du Nord (Postes & Voies Banlieue/GL)']);

    // Editing user state
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRoles, setEditRoles] = useState<string[]>(['Demandeur']);
    const [editStatus, setEditStatus] = useState('Actif');
    const [editRegion, setEditRegion] = useState('');
    const [editService, setEditService] = useState('');
    const [editSites, setEditSites] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // Toast/Feedback
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    // Initial Load
    const loadAll = async () => {
        setLoading(true);
        try {
            const [rolesRes, usersRes, tablesRes, filterSettingsRes] = await Promise.all([
                getRoles().catch(() => ({ data: [] })),
                getUsers(),
                getTables(),
                getPeopleFilterSettings().catch(() => ({ data: { filter_table_ids: ['roles', 'services', 'regions', 'sites'] } }))
            ]);

            // Construct dynamic roles list from database + fallbacks
            const fetchedRoles: UserRoleOption[] = [];
            if (Array.isArray(rolesRes.data) && rolesRes.data.length > 0) {
                rolesRes.data.forEach((r: any) => {
                    fetchedRoles.push({
                        id: r.name,
                        label: r.name,
                        desc: r.description || 'Rôle personnalisé'
                    });
                });
            }

            // Ensure baseline standard roles are present if not in database
            DEFAULT_FALLBACK_ROLES.forEach(defRole => {
                if (!fetchedRoles.some(r => r.id.toLowerCase() === defRole.id.toLowerCase())) {
                    fetchedRoles.push(defRole);
                }
            });

            setAvailableRoles(fetchedRoles);
            setUsers(usersRes.data || []);
            setAllTables(tablesRes.data || []);

            const configured = filterSettingsRes.data?.filter_table_ids || ['roles', 'services', 'regions', 'sites'];
            setConfiguredFilterTableIds(configured);
            setTempFilterConfig(configured);

            // Fetch row data for all configured reference tables to feed filter options
            const dataMap: Record<string, any[]> = {};
            for (const tableId of configured) {
                if (tableId === 'roles') {
                    dataMap['roles'] = fetchedRoles.map(r => ({ id: r.id, name: r.label }));
                } else {
                    try {
                        const tableDetail = await getTableById(tableId);
                        dataMap[tableId] = tableDetail.data.rows || [];
                    } catch (e) {
                        console.warn(`Could not load data for filter table ${tableId}:`, e);
                    }
                }
            }
            setTablesDataMap(dataMap);
        } catch (err: any) {
            console.error("Error loading people directory data:", err);
            showFeedback('error', "Erreur lors du chargement de l'annuaire.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    // Save administrative filter configuration
    const handleSaveFilterConfig = async () => {
        setSavingConfig(true);
        try {
            await updatePeopleFilterSettings(tempFilterConfig);
            setConfiguredFilterTableIds([...tempFilterConfig]);
            showFeedback('success', "Configuration des tables de filtrage mise à jour.");
            setShowFilterConfigModal(false);

            // Fetch any newly added table rows
            const updatedMap = { ...tablesDataMap };
            for (const tableId of tempFilterConfig) {
                if (!updatedMap[tableId]) {
                    if (tableId === 'roles') {
                        updatedMap['roles'] = availableRoles.map(r => ({ id: r.id, name: r.label }));
                    } else {
                        try {
                            const res = await getTableById(tableId);
                            updatedMap[tableId] = res.data.rows || [];
                        } catch (e) {
                            console.warn(e);
                        }
                    }
                }
            }
            setTablesDataMap(updatedMap);
        } catch (err: any) {
            showFeedback('error', "Erreur lors de la sauvegarde de la configuration.");
        } finally {
            setSavingConfig(false);
        }
    };

    // Filter toggle
    const handleFilterChange = (filterKey: string, value: string) => {
        setActiveFilters(prev => {
            const next = { ...prev };
            if (!value) {
                delete next[filterKey];
            } else {
                next[filterKey] = value;
            }
            return next;
        });
    };

    const clearAllFilters = () => {
        setActiveFilters({});
        setSearchQuery('');
    };

    // User Creation
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;
        if (selectedRoles.length === 0) {
            showFeedback('error', "Veuillez sélectionner au moins un rôle.");
            return;
        }

        try {
            await createUser({
                name: name.trim(),
                email: email.trim(),
                roles: selectedRoles,
                role: selectedRoles[0],
                attributes: {
                    region,
                    service,
                    site: selectedSites.length === 1 ? selectedSites[0] : selectedSites
                }
            });
            setName('');
            setEmail('');
            setSelectedRoles(['Demandeur']);
            setSelectedSites(['Paris Gare du Nord (Postes & Voies Banlieue/GL)']);
            setShowCreate(false);
            showFeedback('success', `Utilisateur '${name}' créé avec succès.`);
            const res = await getUsers();
            setUsers(res.data);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la création.");
        }
    };

    // Start Editing
    const handleStartEdit = (user: any) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        const rolesList = Array.isArray(user.roles) && user.roles.length > 0
            ? user.roles
            : (user.role ? [user.role] : ['Demandeur']);
        setEditRoles(rolesList);
        setEditStatus(user.status || 'Actif');
        setEditRegion(user.attributes?.region || 'Île-de-France');
        setEditService(user.attributes?.service || 'Maintenance Voie');

        const sitesVal = user.attributes?.site;
        if (Array.isArray(sitesVal)) {
            setEditSites(sitesVal);
        } else if (typeof sitesVal === 'string' && sitesVal) {
            setEditSites([sitesVal]);
        } else {
            setEditSites([]);
        }
    };

    // Save Edit
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser || !editName.trim() || !editEmail.trim()) return;
        if (editRoles.length === 0) {
            showFeedback('error', "L'utilisateur doit posséder au moins un rôle.");
            return;
        }

        setSaving(true);
        try {
            await updateUser(editingUser.id, {
                name: editName.trim(),
                email: editEmail.trim(),
                roles: editRoles,
                role: editRoles[0],
                status: editStatus,
                attributes: {
                    ...editingUser.attributes,
                    region: editRegion,
                    service: editService,
                    site: editSites.length === 1 ? editSites[0] : editSites
                }
            });
            showFeedback('success', `Modifications enregistrées pour '${editName}'.`);
            setEditingUser(null);
            const res = await getUsers();
            setUsers(res.data);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la modification.");
        } finally {
            setSaving(false);
        }
    };

    // Filter computation
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Text search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = user.name?.toLowerCase().includes(q);
                const matchEmail = user.email?.toLowerCase().includes(q);
                const matchService = user.attributes?.service?.toLowerCase().includes(q);
                const matchRegion = user.attributes?.region?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchService && !matchRegion) {
                    return false;
                }
            }

            // Administrative table-based filters
            for (const [filterKey, val] of Object.entries(activeFilters)) {
                const filterVal = String(val);
                if (!filterVal) continue;

                if (filterKey === 'roles') {
                    const userRoles: string[] = Array.isArray(user.roles) && user.roles.length > 0
                        ? user.roles
                        : (user.role ? [user.role] : []);
                    if (!userRoles.includes(filterVal)) {
                        return false;
                    }
                } else if (filterKey === 'services') {
                    const userVal = user.attributes?.service;
                    if (Array.isArray(userVal)) {
                        if (!userVal.includes(filterVal)) return false;
                    } else if (userVal !== filterVal) {
                        return false;
                    }
                } else if (filterKey === 'regions') {
                    const userVal = user.attributes?.region;
                    if (Array.isArray(userVal)) {
                        if (!userVal.includes(filterVal)) return false;
                    } else if (userVal !== filterVal) {
                        return false;
                    }
                } else if (filterKey === 'sites') {
                    const userVal = user.attributes?.site;
                    if (Array.isArray(userVal)) {
                        if (!userVal.includes(filterVal)) return false;
                    } else if (userVal !== filterVal) {
                        return false;
                    }
                } else {
                    // Custom attribute matching
                    const userVal = user.attributes?.[filterKey];
                    if (Array.isArray(userVal)) {
                        if (!userVal.includes(filterVal)) return false;
                    } else if (userVal !== filterVal) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [users, searchQuery, activeFilters]);

    // Active filters count
    const activeFilterCount = Object.keys(activeFilters).length + (searchQuery ? 1 : 0);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-[#002395] rounded-xl border border-blue-100">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-950 flex items-center gap-2">
                                Annuaire des Utilisateurs & Habilitations
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold border border-purple-200">
                                    Multi-rôles & Filtres dynamiques
                                </span>
                            </h1>
                            <p className="text-xs text-gray-500">
                                Gestion multi-rôles (cumul de profils), filtrage paramétrable par tables de référence
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <PageHelpButton
                        pageTitle="Annuaire & Habilitations"
                        pageCategory="Gestion des Accès"
                        description="Gérez les profils agents, leurs habilitations multi-rôles et configurez les filtres d'annuaire basés sur les référentiels du portail."
                        sections={utilisateursHelpSections}
                    />
                    {/* Bouton Configuration des Filtres (Niveau Administration) */}
                    <button
                        id="btn-config-people-filters"
                        onClick={() => {
                            setTempFilterConfig([...configuredFilterTableIds]);
                            setShowFilterConfigModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition cursor-pointer"
                        title="Configurer les tables de référence servant de filtres"
                    >
                        <Settings2 className="w-4 h-4 text-gray-600" />
                        <span>Filtres d'administration ({configuredFilterTableIds.length})</span>
                    </button>

                    {/* Bouton Nouvel Utilisateur */}
                    <button
                        id="btn-add-user"
                        onClick={() => setShowCreate(!showCreate)}
                        className="bg-[#002395] hover:bg-blue-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                        {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>{showCreate ? 'Fermer' : 'Nouvel Utilisateur'}</span>
                    </button>
                </div>
            </div>

            {/* Feedback notification */}
            {feedback && (
                <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between animate-fade-in ${
                    feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
                }`}>
                    <span>{feedback.message}</span>
                    <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Explicative Banner on Multi-value & Table-based filtering */}
            <div className="bg-linear-to-r from-blue-50/70 to-purple-50/70 border border-blue-200/60 rounded-xl p-4 flex items-start gap-3 text-xs text-gray-700">
                <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <span className="font-bold text-gray-900 block">
                        Gestion multi-valeurs & filtrage selon les tables d'administration :
                    </span>
                    <p className="text-gray-600 leading-relaxed">
                        • <strong className="text-purple-900">Multi-rôles simultanés :</strong> Un agent peut désormais cumuler plusieurs rôles (ex: <em>Manager</em> et <em>Demandeur</em>, ou <em>Validateur</em> et <em>Manager</em>). Les privilèges de sécurité sont automatiquement agrégés.<br />
                        • <strong className="text-blue-900">Filtrage configuré au niveau administration :</strong> Les filtres ci-dessous proviennent des tables de référence sélectionnées (Rôles, Services, Régions, Sites). Vous pouvez personnaliser ces tables sources via le bouton <em>Filtres d'administration</em>.
                    </p>
                </div>
            </div>

            {/* Filter Bar Configured by Administration */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-[#002395]" />
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            Filtres dynamiques (définis par l'administration)
                        </span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#002395] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 cursor-pointer transition"
                        >
                            <X className="w-3.5 h-3.5" />
                            Réinitialiser tous les filtres
                        </button>
                    )}
                </div>

                {/* Filter Selectors Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Global text search */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Recherche rapide
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Nom, email, mot-clé..."
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                        />
                    </div>

                    {/* Render filter controls for each table selected at administration level */}
                    {configuredFilterTableIds.map(tableId => {
                        const tableMeta = allTables.find(t => t.id === tableId) || {
                            id: tableId,
                            name: tableId === 'roles' ? 'Rôles & Habilitations' :
                                  tableId === 'services' ? 'Services' :
                                  tableId === 'regions' ? 'Régions' :
                                  tableId === 'sites' ? 'Sites Ferroviaires' : tableId
                        };

                        const rows = tablesDataMap[tableId] || [];

                        return (
                            <div key={tableId}>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center justify-between">
                                    <span className="truncate">{tableMeta.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">({rows.length})</span>
                                </label>
                                <select
                                    value={activeFilters[tableId] || ''}
                                    onChange={e => handleFilterChange(tableId, e.target.value)}
                                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden transition ${
                                        activeFilters[tableId]
                                            ? 'border-blue-600 bg-blue-50/50 text-blue-950 font-semibold'
                                            : 'border-gray-300 bg-white text-gray-700'
                                    }`}
                                >
                                    <option value="">-- Tous ({tableMeta.name}) --</option>
                                    {rows.map((r: any, idx: number) => {
                                        const val = r.name || r.code || r.id;
                                        const label = r.name || r.code || `Option #${r.id || idx}`;
                                        return (
                                            <option key={r.id || idx} value={val}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        );
                    })}
                </div>

                {/* Filter statistics & badges */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span>Affichage de <strong className="text-gray-900 font-bold">{filteredUsers.length}</strong> agent{filteredUsers.length > 1 ? 's' : ''} sur <strong className="text-gray-900 font-bold">{users.length}</strong></span>
                        {Object.entries(activeFilters).map(([k, val]) => {
                            const tableName = allTables.find(t => t.id === k)?.name || k;
                            return (
                                <span key={k} className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-[11px] font-medium">
                                    <span>{tableName}: <strong>{val}</strong></span>
                                    <button
                                        onClick={() => handleFilterChange(k, '')}
                                        className="hover:text-red-700 p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                    <button
                        onClick={loadAll}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Actualiser l'annuaire
                    </button>
                </div>
            </div>

            {/* Create User Form */}
            {showCreate && (
                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-xl animate-fade-in space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-[#002395]" />
                            Ajouter un nouvel agent (avec multi-rôles & multi-valeurs)
                        </h2>
                        <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom complet *</label>
                                <input
                                    id="input-new-user-name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Alexandre Dubois"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Professionnel *</label>
                                <input
                                    id="input-new-user-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="alexandre.dubois@entreprise.fr"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>
                        </div>

                        {/* Multi-Roles Selection */}
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                                    <span>Rôles RBAC attribués (Sélection multiple possible) *</span>
                                </label>
                                <span className="text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                                    {selectedRoles.length} rôle{selectedRoles.length > 1 ? 's' : ''} sélectionné{selectedRoles.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-purple-800">
                                <span>L'agent bénéficiera de l'ensemble cumulé des privilèges associés à chacun des rôles cochés ci-dessous :</span>
                                <a
                                    href="/roles"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold underline text-[11px] shrink-0 ml-2"
                                >
                                    <span>Gérer les rôles</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                                {availableRoles.map(r => {
                                    const isSelected = selectedRoles.includes(r.id);
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    if (selectedRoles.length > 1) {
                                                        setSelectedRoles(selectedRoles.filter(role => role !== r.id));
                                                    } else {
                                                        showFeedback('error', "Au moins un rôle doit rester sélectionné.");
                                                    }
                                                } else {
                                                    setSelectedRoles([...selectedRoles, r.id]);
                                                }
                                            }}
                                            className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-purple-100/90 border-purple-400 text-purple-950 shadow-xs'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-xs">{r.label}</span>
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-purple-700" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 leading-tight">{r.desc}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reference Tables Attributes (Region, Service, Sites) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Région Territoriale (Table 'regions')
                                </label>
                                <select
                                    value={region}
                                    onChange={e => setRegion(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    {(tablesDataMap['regions'] || [
                                        { name: 'Île-de-France' },
                                        { name: 'Auvergne-Rhône-Alpes' },
                                        { name: 'Nouvelle-Aquitaine' },
                                        { name: 'Hauts-de-France' }
                                    ]).map((reg: any, i: number) => (
                                        <option key={i} value={reg.name || reg.code}>{reg.name || reg.code}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Direction / Service (Table 'services')
                                </label>
                                <select
                                    value={service}
                                    onChange={e => setService(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    {(tablesDataMap['services'] || [
                                        { name: 'Maintenance Voie' },
                                        { name: 'Caténaires & Traction' },
                                        { name: 'Sécurité & Patrimoine' },
                                        { name: 'Télécoms & Mécatronique' }
                                    ]).map((srv: any, i: number) => (
                                        <option key={i} value={srv.name || srv.code}>{srv.name || srv.code}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Site ferroviaire d'affectation
                                </label>
                                <select
                                    value={selectedSites[0] || ''}
                                    onChange={e => setSelectedSites([e.target.value])}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    {(tablesDataMap['sites'] || [
                                        { name: 'Paris Gare du Nord (Postes & Voies Banlieue/GL)' },
                                        { name: 'Technicentre Châtillon TGV & Ligne Atlantique' },
                                        { name: 'Gare de Lyon Part-Dieu & Ligne LGV Sud-Est' }
                                    ]).map((st: any, i: number) => (
                                        <option key={i} value={st.name || st.code}>{st.name || st.code}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                id="btn-submit-new-user"
                                type="submit"
                                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                            >
                                <Check className="w-4 h-4" />
                                Enregistrer l'utilisateur
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List of Users with Multi-roles and Attributes */}
            <div className="bg-white shadow-xs border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 space-y-2">
                        <UsersIcon className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="font-semibold text-sm">Aucun utilisateur ne correspond aux critères de recherche.</p>
                        <p className="text-xs text-gray-400">Essayez de modifier ou réinitialiser vos filtres administratifs.</p>
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-blue-700 hover:underline font-semibold mt-2 inline-block cursor-pointer"
                        >
                            Réinitialiser les filtres
                        </button>
                    </div>
                ) : (
                    filteredUsers.map(u => {
                        const userRoles: string[] = Array.isArray(u.roles) && u.roles.length > 0
                            ? u.roles
                            : (u.role ? [u.role] : ['Demandeur']);

                        return (
                            <div
                                key={u.id}
                                id={`user-row-${u.id}`}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-900 text-sm">{u.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                            u.status === 'Inactif' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                            {u.status || 'Actif'}
                                        </span>
                                        {userRoles.length > 1 && (
                                            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold border border-purple-300">
                                                {userRoles.length} rôles cumulés
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-gray-400" />
                                            {u.email}
                                        </span>
                                        <span>•</span>
                                        <span className="font-mono text-gray-400">ID #{u.id}</span>
                                    </div>

                                    {u.attributes && (
                                        <div className="text-xs text-gray-600 flex items-center gap-3 pt-0.5 flex-wrap">
                                            {u.attributes.region && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3 h-3 text-blue-600" />
                                                    <strong>Région :</strong> {u.attributes.region}
                                                </span>
                                            )}
                                            {u.attributes.service && (
                                                <span className="flex items-center gap-1">
                                                    <Tag className="w-3 h-3 text-indigo-600" />
                                                    <strong>Service :</strong> {u.attributes.service}
                                                </span>
                                            )}
                                            {u.attributes.site && (
                                                <span className="flex items-center gap-1 text-gray-700">
                                                    <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                                    <strong>Site :</strong>
                                                    {Array.isArray(u.attributes.site)
                                                        ? u.attributes.site.join(', ')
                                                        : u.attributes.site}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                                    {/* Multi-roles badges display */}
                                    <div className="flex flex-wrap gap-1 items-center max-w-xs justify-start sm:justify-end">
                                        {userRoles.map((r, i) => (
                                            <span
                                                key={i}
                                                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                                    r === 'Administrateur' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                                    r === 'Manager' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                    r === 'Validateur Site' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                    r === 'Demandeur' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                                    'bg-indigo-100 text-indigo-800 border-indigo-300'
                                                }`}
                                            >
                                                {r}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Bouton Modifier */}
                                    <button
                                        id={`btn-edit-user-${u.id}`}
                                        onClick={() => handleStartEdit(u)}
                                        className="inline-flex items-center gap-1 text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs self-start sm:self-center"
                                        title="Modifier cet utilisateur et ses rôles"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Modifier</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Edit User Modal Dialog (Supports Multi-Roles and Multi-Values) */}
            {editingUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Edit2 className="w-5 h-5 text-[#002395]" />
                                <span>Modifier l'Utilisateur : {editingUser.name}</span>
                            </div>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom complet *</label>
                                <input
                                    id="input-edit-user-name"
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Professionnel *</label>
                                <input
                                    id="input-edit-user-email"
                                    type="email"
                                    value={editEmail}
                                    onChange={e => setEditEmail(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            {/* Multi-Roles Selector in Edit Modal */}
                            <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-purple-700" />
                                        <span>Rôles RBAC (Plusieurs rôles possibles simultanément) *</span>
                                    </label>
                                    <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                                        {editRoles.length} sélectionné{editRoles.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-purple-800">
                                    <span>Cochez ou décochez les rôles attribués à cet utilisateur :</span>
                                    <a
                                        href="/roles"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold underline text-[11px] shrink-0 ml-2"
                                    >
                                        <span>Gérer les rôles</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-60 overflow-y-auto pr-1">
                                    {availableRoles.map(r => {
                                        const isSelected = editRoles.includes(r.id);
                                        return (
                                            <div
                                                key={r.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        if (editRoles.length > 1) {
                                                            setEditRoles(editRoles.filter(role => role !== r.id));
                                                        } else {
                                                            showFeedback('error', "L'utilisateur doit posséder au moins un rôle.");
                                                        }
                                                    } else {
                                                        setEditRoles([...editRoles, r.id]);
                                                    }
                                                }}
                                                className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-purple-100/90 border-purple-400 text-purple-950 font-semibold'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex flex-col pr-2">
                                                    <span className="text-xs font-semibold">{r.label}</span>
                                                    {r.desc && <span className="text-[10px] text-gray-400 line-clamp-1">{r.desc}</span>}
                                                </div>
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-purple-700 shrink-0" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-gray-400 shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Statut du compte</label>
                                    <select
                                        id="select-edit-user-status"
                                        value={editStatus}
                                        onChange={e => setEditStatus(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    >
                                        <option value="Actif">Actif</option>
                                        <option value="Inactif">Inactif / Suspendu</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Région ferroviaire</label>
                                    <input
                                        type="text"
                                        value={editRegion}
                                        onChange={e => setEditRegion(e.target.value)}
                                        placeholder="Ex: Île-de-France"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Direction / Service</label>
                                    <input
                                        type="text"
                                        value={editService}
                                        onChange={e => setEditService(e.target.value)}
                                        placeholder="Ex: Maintenance Voie"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Site(s) d'intervention
                                    </label>
                                    <input
                                        type="text"
                                        value={editSites.join(', ')}
                                        onChange={e => {
                                            const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                            setEditSites(parts);
                                        }}
                                        placeholder="Sites séparés par des virgules..."
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>
                            </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    disabled={saving}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    id="btn-save-edit-user"
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer"
                                >
                                    <Check className="w-4 h-4" />
                                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Administration Level Filter Configuration */}
            {showFilterConfigModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Settings2 className="w-5 h-5 text-[#002395]" />
                                <span>Configuration des Filtres d'Administration</span>
                            </div>
                            <button
                                onClick={() => setShowFilterConfigModal(false)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                            <div className="space-y-1 text-xs text-gray-600">
                                <p>
                                    Sélectionnez les tables de référence qui doivent être activées comme critères de filtrage dans l'annuaire des personnes.
                                </p>
                                <p className="text-[11px] text-gray-500 italic">
                                    Cette configuration s'applique pour tous les gestionnaires et valideurs.
                                </p>
                            </div>

                            {/* List of tables to toggle */}
                            <div className="space-y-2">
                            {/* Roles (Built-in) */}
                            <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                                tempFilterConfig.includes('roles')
                                    ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-semibold'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={tempFilterConfig.includes('roles')}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setTempFilterConfig([...tempFilterConfig, 'roles']);
                                            } else {
                                                setTempFilterConfig(tempFilterConfig.filter(id => id !== 'roles'));
                                            }
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <div>
                                        <span className="block text-xs font-bold">Rôles & Habilitations RBAC (roles)</span>
                                        <span className="block text-[11px] text-gray-500 font-normal">
                                            Filtrer par rôle (Demandeur, Manager, Validateur Site, Administrateur)
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">Système</span>
                            </label>

                            {/* Reference tables */}
                            {allTables.map(t => {
                                const isChecked = tempFilterConfig.includes(t.id);
                                return (
                                    <label
                                        key={t.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                                            isChecked
                                                ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-semibold'
                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setTempFilterConfig([...tempFilterConfig, t.id]);
                                                    } else {
                                                        setTempFilterConfig(tempFilterConfig.filter(id => id !== t.id));
                                                    }
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <div>
                                                <span className="block text-xs font-bold">{t.name} ({t.id})</span>
                                                <span className="block text-[11px] text-gray-500 font-normal">
                                                    {t.description || `${t.rows_count || 0} enregistrements`}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            {t.rows_count || 0} lignes
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setShowFilterConfigModal(false)}
                                className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveFilterConfig}
                                disabled={savingConfig}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer"
                            >
                                <Check className="w-4 h-4" />
                                {savingConfig ? 'Enregistrement...' : 'Valider la configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
