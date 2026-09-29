import React, { useState, useMemo } from 'react';
import {
    MapPin,
    Compass,
    Building2,
    Briefcase,
    Plus,
    Trash2,
    Check,
    CheckSquare,
    Square,
    Info,
    AlertCircle,
    Eye,
    Shield,
    Sliders,
    Layers,
    Sparkles,
    Database,
    ChevronRight,
    Search,
    Cpu,
    Users,
    Filter,
    Tag,
    X
} from 'lucide-react';
import {
    ReferenceVisibilityRule,
    isRequestVisible,
    isSiteVisible,
    isUserVisible,
    DEFAULT_SERVICE_DIRECTION_MAPPING
} from '../lib/visibilityFilter';

interface ReferenceVisibilityEditorProps {
    draftRole: any;
    setDraftRole: (role: any) => void;
    setIsDirty: (dirty: boolean) => void;
    referenceTables: any[];
    allRequests: any[];
    allSites: any[];
    allUsers: any[];
}

export const KNOWN_REFERENCE_TABLES = [
    {
        id: 'regions',
        name: 'Régions & Pôles Territoriaux',
        icon: MapPin,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        category: 'Organisation',
        description: 'Filtrer tout ce qui est rattaché à une ou plusieurs régions (sites, demandes d\'intervention, agents)',
        options: [
            { id: 'Île-de-France', label: 'Île-de-France', sub: 'Paris Nord, Châtillon TGV, Ligne Banlieue & Atlantique' },
            { id: 'Auvergne-Rhône-Alpes', label: 'Auvergne-Rhône-Alpes', sub: 'Lyon Part-Dieu, LGV Sud-Est, Postes Aiguillages' },
            { id: 'Grand Est', label: 'Grand Est', sub: 'Strasbourg Voie, Ligne Rhénane & Voies Frontalières' },
            { id: 'PACA', label: 'PACA', sub: 'Marseille Saint-Charles, Tunnel de la Nerthe' },
            { id: 'Nouvelle-Aquitaine', label: 'Nouvelle-Aquitaine', sub: 'Bordeaux Saint-Jean, Technicentre Aquitaine' },
            { id: 'Hauts-de-France', label: 'Hauts-de-France', sub: 'Lille Flandres, Technicentre Hellemmes' },
            { id: 'Occitanie', label: 'Occitanie', sub: 'Toulouse Matabiau, Établissement Voie Occitanie' }
        ]
    },
    {
        id: 'directions',
        name: 'Directions Métier & Pôles Centraux',
        icon: Compass,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        badgeColor: 'bg-indigo-100 text-indigo-800',
        category: 'Organisation',
        description: 'Filtrer tout ce qui est rattaché à une direction métier centrale et ses brigades affiliées',
        options: [
            { id: 'Direction Générale Infrastructure', label: 'Direction Générale Infrastructure', sub: 'Maintenance Voie, Travaux & Infralog' },
            { id: 'Direction Énergie & Traction', label: 'Direction Énergie & Traction', sub: 'Caténaires, Sous-stations & Alimentation HT' },
            { id: 'Direction des Installations de Sécurité', label: 'Direction des Installations de Sécurité', sub: 'Signalisation, Postes & Automatismes' },
            { id: 'Direction Sûreté Ferroviaire', label: 'Direction Sûreté Ferroviaire', sub: 'Sécurité Emprises, Clés Mécatroniques & Cylindres' },
            { id: 'Direction Télécoms & Systèmes', label: 'Direction Télécoms & Systèmes', sub: 'Réseaux Radio GSMR, Fibre & IoT' },
            { id: 'Direction Exploitation Réseau', label: 'Direction Exploitation Réseau', sub: 'Circulation, Gestion des Sillons & Postes' }
        ]
    },
    {
        id: 'services',
        name: 'Services Métier & Brigades',
        icon: Briefcase,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-800',
        category: 'Organisation',
        description: 'Filtrer les accès par service opérationnel spécifique (Maintenance Voie, Caténaires, etc.)',
        options: [
            { id: 'Maintenance Voie', label: 'Maintenance Voie', sub: 'Rattaché à : Dir. Générale Infrastructure' },
            { id: 'Caténaires & Traction', label: 'Caténaires & Traction', sub: 'Rattaché à : Dir. Énergie & Traction' },
            { id: 'Signalisation & Postes', label: 'Signalisation & Postes', sub: 'Rattaché à : Dir. Installations Sécurité' },
            { id: 'Télécoms & Mécatronique', label: 'Télécoms & Mécatronique', sub: 'Rattaché à : Dir. Télécoms & Systèmes' },
            { id: 'Sécurité & Patrimoine', label: 'Sécurité & Patrimoine', sub: 'Rattaché à : Dir. Sûreté Ferroviaire' },
            { id: 'Exploitation & Circulation', label: 'Exploitation & Circulation', sub: 'Rattaché à : Dir. Exploitation Réseau' }
        ]
    },
    {
        id: 'sites',
        name: 'Sites Ferroviaires & Établissements',
        icon: Building2,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        badgeColor: 'bg-blue-100 text-[#002395]',
        category: 'Infrastructure & Sécurité',
        description: 'Restreindre l\'accès à un ou plusieurs sites / technicentres ferroviaires précis',
        options: [
            { id: 'Paris Gare du Nord (Postes & Voies Banlieue/GL)', label: 'Paris Gare du Nord', sub: 'Zone Île-de-France (NIS 2)' },
            { id: 'Technicentre Châtillon TGV & Ligne Atlantique', label: 'Technicentre Châtillon TGV', sub: 'Zone Île-de-France' },
            { id: 'Gare de Lyon Part-Dieu & Ligne LGV Sud-Est', label: 'Gare de Lyon Part-Dieu', sub: 'Zone Auvergne-Rhône-Alpes (NIS 2)' },
            { id: 'Marseille Saint-Charles & Tunnel de la Nerthe', label: 'Marseille Saint-Charles', sub: 'Zone PACA' },
            { id: 'Centre Exploitation Voie Strasbourg & Ligne Rhénane', label: 'Strasbourg Voie & Rhénane', sub: 'Zone Grand Est' }
        ]
    }
];

export default function ReferenceVisibilityEditor({
    draftRole,
    setDraftRole,
    setIsDirty,
    referenceTables,
    allRequests,
    allSites,
    allUsers
}: ReferenceVisibilityEditorProps) {
    const [selectedTableToAdd, setSelectedTableToAdd] = useState<string>('regions');
    const [previewTab, setPreviewTab] = useState<'requests' | 'sites' | 'users' | 'hidden'>('requests');
    const [searchFilter, setSearchFilter] = useState('');
    const [customValueInputs, setCustomValueInputs] = useState<Record<string, string>>({});
    const [ruleOptionSearch, setRuleOptionSearch] = useState<Record<string, string>>({});

    const rules: ReferenceVisibilityRule[] = draftRole.referenceVisibilityRules || [];

    // Dynamically build available tables list from ANY table in the database + system tables
    const availableTables = useMemo(() => {
        const tableMap = new Map<string, any>();

        // 1. Seed with known system templates
        KNOWN_REFERENCE_TABLES.forEach(kt => {
            tableMap.set(kt.id, {
                ...kt,
                isSystem: true
            });
        });

        // 2. Discover and incorporate EVERY table in referenceTables (standard, catalogue, custom user tables)
        (referenceTables || []).forEach((t: any) => {
            if (!t || !t.id) return;
            const existing = tableMap.get(t.id);

            // Extract row options from the database rows of this table
            const rowOptions = (t.rows || []).map((r: any) => {
                const label = r.name || r.label || r.code || r.title || r.libelle || `Ligne #${r.id}`;
                const subParts: string[] = [];
                if (r.code && r.code !== label) subParts.push(r.code);
                if (r.region) subParts.push(`Région: ${r.region}`);
                if (r.direction) subParts.push(`Dir: ${r.direction}`);
                if (r.pole) subParts.push(r.pole);
                if (r.norme) subParts.push(r.norme);
                if (r.siret) subParts.push(`SIRET: ${r.siret}`);
                if (r.responsable) subParts.push(`Resp: ${r.responsable}`);
                if (r.criticity) subParts.push(`Criticité: ${r.criticity}`);
                if (r.type) subParts.push(`Type: ${r.type}`);

                return {
                    id: String(label),
                    label: String(label),
                    sub: subParts.join(' • ') || (r.description ? String(r.description).slice(0, 50) : undefined)
                };
            });

            // Table icon and category heuristics
            let IconComponent: any = Database;
            let cat = t.category || 'Tables Personnalisées';
            let color = 'text-blue-700 bg-blue-50 border-blue-200';
            let badgeColor = 'bg-blue-100 text-blue-800';

            if (t.id === 'regions') {
                IconComponent = MapPin;
                cat = 'Organisation';
                color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                badgeColor = 'bg-emerald-100 text-emerald-800';
            } else if (t.id === 'directions') {
                IconComponent = Compass;
                cat = 'Organisation';
                color = 'text-indigo-700 bg-indigo-50 border-indigo-200';
                badgeColor = 'bg-indigo-100 text-indigo-800';
            } else if (t.id === 'services') {
                IconComponent = Briefcase;
                cat = 'Organisation';
                color = 'text-amber-700 bg-amber-50 border-amber-200';
                badgeColor = 'bg-amber-100 text-amber-800';
            } else if (t.id === 'sites') {
                IconComponent = Building2;
                cat = 'Infrastructure & Sécurité';
                color = 'text-blue-700 bg-blue-50 border-blue-200';
                badgeColor = 'bg-blue-100 text-[#002395]';
            } else if (t.id === 'roles') {
                IconComponent = Shield;
                cat = 'Infrastructure & Sécurité';
                color = 'text-cyan-700 bg-cyan-50 border-cyan-200';
                badgeColor = 'bg-cyan-100 text-cyan-800';
            } else if (t.id === 'equipments') {
                IconComponent = Cpu;
                cat = 'Matériel & Technique';
                color = 'text-violet-700 bg-violet-50 border-violet-200';
                badgeColor = 'bg-violet-100 text-violet-800';
            } else if (t.id === 'contractors') {
                IconComponent = Users;
                cat = 'Partenaires & Tiers';
                color = 'text-teal-700 bg-teal-50 border-teal-200';
                badgeColor = 'bg-teal-100 text-teal-800';
            } else if (!t.category) {
                cat = 'Tables Personnalisées';
                color = 'text-purple-700 bg-purple-50 border-purple-200';
                badgeColor = 'bg-purple-100 text-purple-800';
            }

            if (existing) {
                const mergedOptions = [...existing.options];
                rowOptions.forEach((ro: any) => {
                    if (!mergedOptions.some(mo => String(mo.id || '').toLowerCase() === String(ro.id || '').toLowerCase())) {
                        mergedOptions.push(ro);
                    }
                });
                tableMap.set(t.id, {
                    ...existing,
                    name: t.name || existing.name,
                    description: t.description || existing.description,
                    category: existing.category || cat,
                    options: mergedOptions,
                    columns: t.columns || []
                });
            } else {
                tableMap.set(t.id, {
                    id: t.id,
                    name: t.name,
                    description: t.description || `Filtrer la visibilité selon les données de la table ${t.name}`,
                    icon: IconComponent,
                    color: color,
                    badgeColor: badgeColor,
                    category: cat,
                    options: rowOptions,
                    columns: t.columns || [],
                    isCustom: true
                });
            }
        });

        return Array.from(tableMap.values());
    }, [referenceTables]);

    // Unique categories for the dropdown groups
    const tableCategories = useMemo<string[]>(() => {
        const order = ['Organisation', 'Infrastructure & Sécurité', 'Matériel & Technique', 'Partenaires & Tiers', 'Tables Personnalisées'];
        const existingCats = Array.from(new Set<string>(availableTables.map((t: any) => String(t.category || 'Autres Tables'))));
        return order.filter(c => existingCats.includes(c)).concat(existingCats.filter(c => !order.includes(c)));
    }, [availableTables]);

    // Map sites and services for rapid relational lookup
    const sitesMap = useMemo(() => {
        const m: Record<string, any> = {};
        allSites.forEach(s => {
            if (s.id) m[s.id] = s;
            if (s.name) m[s.name] = s;
            if (s.code) m[s.code] = s;
        });
        return m;
    }, [allSites]);

    const servicesMap = useMemo(() => {
        const m: Record<string, any> = {};
        const srvTable = referenceTables.find(t => t.id === 'services');
        if (srvTable && srvTable.rows) {
            srvTable.rows.forEach((r: any) => {
                if (r.name) m[r.name] = r;
            });
        }
        return m;
    }, [referenceTables]);

    // Live calculation of filtered objects
    const visibleRequests = useMemo(() => {
        return allRequests.filter(r => isRequestVisible(r, rules, sitesMap, servicesMap));
    }, [allRequests, rules, sitesMap, servicesMap]);

    const hiddenRequests = useMemo(() => {
        return allRequests.filter(r => !isRequestVisible(r, rules, sitesMap, servicesMap));
    }, [allRequests, rules, sitesMap, servicesMap]);

    const visibleSites = useMemo(() => {
        return allSites.filter(s => isSiteVisible(s, rules));
    }, [allSites, rules]);

    const visibleUsers = useMemo(() => {
        return allUsers.filter(u => isUserVisible(u, rules, servicesMap));
    }, [allUsers, rules, servicesMap]);

    // Add a new visibility rule
    const handleAddRule = (tableId: string) => {
        const existing = rules.find(r => r.tableId === tableId);
        if (existing) {
            alert(`Une règle pour la table "${existing.tableName}" existe déjà. Vous pouvez modifier ses valeurs ci-dessous.`);
            return;
        }

        const tableDef = availableTables.find(t => t.id === tableId);
        const newRule: ReferenceVisibilityRule = {
            id: `rule-${Date.now()}`,
            tableId: tableId,
            tableName: tableDef?.name || tableId,
            field: 'name',
            operator: 'in',
            values: tableDef?.options?.[0] ? [tableDef.options[0].id] : [],
            scopeTargets: ['requests', 'sites', 'users', 'all'],
            label: `Voir tout ce qui est rattaché à la table ${tableDef?.name || tableId}`
        };

        setDraftRole({
            ...draftRole,
            referenceVisibilityRules: [...rules, newRule]
        });
        setIsDirty(true);
    };

    // Add a custom value / code to a rule
    const handleAddCustomValue = (ruleId: string) => {
        const val = (customValueInputs[ruleId] || '').trim();
        if (!val) return;
        const targetRule = rules.find(r => r.id === ruleId);
        if (!targetRule) return;
        if (targetRule.values.includes(val)) {
            setCustomValueInputs(prev => ({ ...prev, [ruleId]: '' }));
            return;
        }
        const nextRules = rules.map(r => {
            if (r.id !== ruleId) return r;
            return {
                ...r,
                values: [...r.values, val]
            };
        });
        setDraftRole({
            ...draftRole,
            referenceVisibilityRules: nextRules
        });
        setIsDirty(true);
        setCustomValueInputs(prev => ({ ...prev, [ruleId]: '' }));
    };

    // Toggle a value in a rule
    const handleToggleRuleValue = (ruleId: string, val: string) => {
        const nextRules = rules.map(rule => {
            if (rule.id !== ruleId) return rule;
            const exists = rule.values.includes(val);
            const nextValues = exists
                ? rule.values.filter(v => v !== val)
                : [...rule.values, val];
            return {
                ...rule,
                values: nextValues
            };
        });

        setDraftRole({
            ...draftRole,
            referenceVisibilityRules: nextRules
        });
        setIsDirty(true);
    };

    // Select all values for a rule
    const handleSelectAllValues = (ruleId: string, allVals: string[]) => {
        const nextRules = rules.map(rule => {
            if (rule.id !== ruleId) return rule;
            return {
                ...rule,
                values: [...allVals]
            };
        });
        setDraftRole({
            ...draftRole,
            referenceVisibilityRules: nextRules
        });
        setIsDirty(true);
    };

    // Clear all values for a rule
    const handleClearValues = (ruleId: string) => {
        const nextRules = rules.map(rule => {
            if (rule.id !== ruleId) return rule;
            return {
                ...rule,
                values: []
            };
        });
        setDraftRole({
            ...draftRole,
            referenceVisibilityRules: nextRules
        });
        setIsDirty(true);
    };

    // Delete a rule
    const handleDeleteRule = (ruleId: string) => {
        const nextRules = rules.filter(r => r.id !== ruleId);
        setDraftRole({
            ...draftRole,
            referenceVisibilityRules: nextRules
        });
        setIsDirty(true);
    };

    // Quick presets
    const handleApplyPreset = (preset: 'idf' | 'ara' | 'surete' | 'infra' | 'national') => {
        if (preset === 'national') {
            setDraftRole({
                ...draftRole,
                referenceVisibilityRules: []
            });
            setIsDirty(true);
            return;
        }

        if (preset === 'idf') {
            const rule: ReferenceVisibilityRule = {
                id: `rule-${Date.now()}`,
                tableId: 'regions',
                tableName: 'Régions & Pôles Territoriaux',
                field: 'name',
                operator: 'in',
                values: ['Île-de-France'],
                scopeTargets: ['requests', 'sites', 'users', 'all'],
                label: 'Voir tout ce qui est rattaché à la Région Île-de-France'
            };
            setDraftRole({
                ...draftRole,
                referenceVisibilityRules: [rule]
            });
            setIsDirty(true);
            return;
        }

        if (preset === 'ara') {
            const rule: ReferenceVisibilityRule = {
                id: `rule-${Date.now()}`,
                tableId: 'regions',
                tableName: 'Régions & Pôles Territoriaux',
                field: 'name',
                operator: 'in',
                values: ['Auvergne-Rhône-Alpes'],
                scopeTargets: ['requests', 'sites', 'users', 'all'],
                label: 'Voir tout ce qui est rattaché à la Région Auvergne-Rhône-Alpes'
            };
            setDraftRole({
                ...draftRole,
                referenceVisibilityRules: [rule]
            });
            setIsDirty(true);
            return;
        }

        if (preset === 'surete') {
            const rule: ReferenceVisibilityRule = {
                id: `rule-${Date.now()}`,
                tableId: 'directions',
                tableName: 'Directions Métier & Pôles Centraux',
                field: 'name',
                operator: 'in',
                values: ['Direction Sûreté Ferroviaire'],
                scopeTargets: ['requests', 'sites', 'users', 'all'],
                label: 'Voir tout ce qui est rattaché à la Direction Sûreté Ferroviaire'
            };
            setDraftRole({
                ...draftRole,
                referenceVisibilityRules: [rule]
            });
            setIsDirty(true);
            return;
        }

        if (preset === 'infra') {
            const rule: ReferenceVisibilityRule = {
                id: `rule-${Date.now()}`,
                tableId: 'directions',
                tableName: 'Directions Métier & Pôles Centraux',
                field: 'name',
                operator: 'in',
                values: ['Direction Générale Infrastructure'],
                scopeTargets: ['requests', 'sites', 'users', 'all'],
                label: 'Voir tout ce qui est rattaché à la Direction Générale Infrastructure'
            };
            setDraftRole({
                ...draftRole,
                referenceVisibilityRules: [rule]
            });
            setIsDirty(true);
            return;
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Context & Description Banner */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-4 sm:p-5 rounded-xl border border-blue-100 space-y-3.5">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#002395] text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                            <Layers className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-black text-gray-950">
                            Visibilité Liée par Table de Référence (Région, Direction, Service...)
                        </h3>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
                        Sélectionnez une table comme <strong>Région</strong> ou <strong>Direction</strong> pour configurer la visibilité : 
                        l'agent pourra automatiquement <strong>voir tout ce qui est rattaché</strong> à cette sélection 
                        (les demandes d'accès aux sites correspondants, les établissements ferroviaires, et les utilisateurs affiliés).
                    </p>
                </div>

                {/* Quick 1-click Presets */}
                <div className="pt-2.5 border-t border-blue-100/80 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1 shrink-0 mr-1">
                        Périmètres types :
                    </span>
                    <button
                        type="button"
                        id="preset-vis-idf"
                        onClick={() => handleApplyPreset('idf')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition cursor-pointer"
                        title="Restreindre la visibilité aux sites, demandes et agents de la région Île-de-France"
                    >
                        📍 Île-de-France
                    </button>
                    <button
                        type="button"
                        id="preset-vis-ara"
                        onClick={() => handleApplyPreset('ara')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition cursor-pointer"
                        title="Restreindre la visibilité à la région Auvergne-Rhône-Alpes"
                    >
                        📍 Auvergne-Rhône-Alpes
                    </button>
                    <button
                        type="button"
                        id="preset-vis-surete"
                        onClick={() => handleApplyPreset('surete')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 transition cursor-pointer"
                        title="Restreindre la visibilité à la Direction Sûreté Ferroviaire"
                    >
                        🧭 Dir. Sûreté
                    </button>
                    <button
                        type="button"
                        id="preset-vis-infra"
                        onClick={() => handleApplyPreset('infra')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 transition cursor-pointer"
                        title="Restreindre la visibilité à la Direction Générale Infrastructure"
                    >
                        🧭 Dir. Infrastructure
                    </button>
                    <button
                        type="button"
                        id="preset-vis-national"
                        onClick={() => handleApplyPreset('national')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition cursor-pointer"
                        title="Réinitialiser : Visibilité nationale sur l'ensemble du réseau"
                    >
                        🌐 National (Tout voir)
                    </button>
                </div>
            </div>

            {/* Toolbar: Choose Table & Add Rule */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 min-w-0">
                    <label htmlFor="select-ref-table-to-add" className="text-xs font-bold text-gray-700 shrink-0">
                        Choisir une table de référence :
                    </label>
                    <select
                        id="select-ref-table-to-add"
                        value={selectedTableToAdd}
                        onChange={e => setSelectedTableToAdd(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden w-full sm:max-w-md"
                    >
                        {tableCategories.map(cat => {
                            const tablesInCat = availableTables.filter(t => (t.category || 'Autres Tables') === cat);
                            if (tablesInCat.length === 0) return null;
                            return (
                                <optgroup key={cat} label={`📂 ${cat}`}>
                                    {tablesInCat.map(table => (
                                        <option key={table.id} value={table.id}>
                                            {table.name} ({table.options?.length || 0} entrées)
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>
                </div>

                <button
                    type="button"
                    id="btn-add-visibility-rule"
                    onClick={() => handleAddRule(selectedTableToAdd)}
                    className="px-4 py-2 bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition shadow-xs cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter cette règle de visibilité</span>
                </button>
            </div>

            {/* Active Rules List */}
            <div className="space-y-4">
                {rules.length === 0 ? (
                    <div className="p-8 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/70 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-[#002395] flex items-center justify-center mx-auto">
                            <Compass className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-gray-900">
                                Visibilité Nationale Intégrale (Aucun filtre de rattachement)
                            </h4>
                            <p className="text-xs text-gray-500 max-w-lg mx-auto">
                                Ce rôle a actuellement accès aux données de <strong>toutes les tables</strong> et <strong>toutes les entités</strong> du réseau national (sous réserve des droits CRUD standard).
                            </p>
                        </div>
                        <div className="pt-2 flex flex-wrap justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleAddRule('regions')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:border-[#002395] text-gray-700 hover:text-[#002395] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Restreindre par Région</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddRule('directions')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:border-[#002395] text-gray-700 hover:text-[#002395] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Restreindre par Direction</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddRule('services')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:border-[#002395] text-gray-700 hover:text-[#002395] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                                <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                                <span>Restreindre par Service</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddRule('sites')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:border-[#002395] text-gray-700 hover:text-[#002395] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Restreindre par Site</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    rules.map((rule, idx) => {
                        const tableDef = availableTables.find(t => t.id === rule.tableId);
                        const Icon = tableDef?.icon || Database;
                        const allOptions = tableDef?.options || [];
                        const allOptionIds = allOptions.map(o => o.id);
                        const isAllSelected = allOptionIds.length > 0 && allOptionIds.every(id => rule.values.includes(id));

                        // Find custom/extra values stored in rule.values that aren't in the default options
                        const knownIdsSet = new Set(allOptions.map(o => String(o.id || '').toLowerCase()));
                        const customValues = rule.values.filter(v => !knownIdsSet.has(String(v || '').toLowerCase()));

                        // Filter options if an inline search is active for this rule
                        const query = String(ruleOptionSearch[rule.id] || '').toLowerCase().trim();
                        const displayedOptions = allOptions.filter(opt =>
                            !query ||
                            String(opt.label || '').toLowerCase().includes(query) ||
                            (opt.sub && String(opt.sub).toLowerCase().includes(query))
                        );

                        return (
                            <div
                                key={rule.id}
                                id={`visibility-rule-card-${rule.tableId}`}
                                className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden transition"
                            >
                                {/* Rule Card Header */}
                                <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tableDef?.color || 'bg-gray-100 text-gray-700'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                                                    Règle #{idx + 1}
                                                </span>
                                                <span className="text-xs font-black text-gray-900">
                                                    Table : {tableDef?.name || rule.tableName}
                                                </span>
                                                {tableDef?.category && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                                        {tableDef.category}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#002395]">
                                                    {rule.values.length} valeur{rule.values.length > 1 ? 's' : ''} sélectionnée{rule.values.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {tableDef?.description || `Filtrer les entités du portail associées à cette table.`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        {allOptionIds.length > 0 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectAllValues(rule.id, allOptionIds)}
                                                    className="text-[11px] font-semibold text-[#002395] hover:underline"
                                                >
                                                    Tout cocher
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleClearValues(rule.id)}
                                                    className="text-[11px] font-semibold text-gray-600 hover:underline"
                                                >
                                                    Tout désélectionner
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            id={`btn-delete-rule-${rule.tableId}`}
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="ml-2 p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                            title="Supprimer cette règle de visibilité"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Rule Options Selector */}
                                <div className="p-5 space-y-4">
                                    {/* Inline search if table has many options */}
                                    {allOptions.length > 6 && (
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder={`Rechercher parmi les ${allOptions.length} options de ${tableDef?.name || rule.tableName}...`}
                                                value={ruleOptionSearch[rule.id] || ''}
                                                onChange={e => setRuleOptionSearch(prev => ({ ...prev, [rule.id]: e.target.value }))}
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-[#002395] outline-hidden"
                                            />
                                        </div>
                                    )}

                                    {/* Custom / User-Added values (chips) */}
                                    {customValues.length > 0 && (
                                        <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                                            <span className="text-[11px] font-bold text-indigo-900 block mb-1.5">
                                                Valeurs spécifiques / codes personnalisés :
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {customValues.map(cv => (
                                                    <span
                                                        key={cv}
                                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-100 text-indigo-900 rounded text-xs font-semibold"
                                                    >
                                                        <Tag className="w-3 h-3 text-indigo-600" />
                                                        <span>{cv}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleRuleValue(rule.id, cv)}
                                                            className="hover:text-rose-600 transition"
                                                            title="Retirer cette valeur"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {allOptions.length === 0 ? (
                                        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">Aucune ligne prédéfinie dans cette table</p>
                                                <p className="text-[11px] text-amber-800 mt-0.5">
                                                    Vous pouvez saisir directement des valeurs, identifiants ou codes ci-dessous pour activer le filtrage immédiatement.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs font-bold text-gray-700 block mb-2">
                                                Cochez les éléments de la table autorisés pour ce rôle :
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                                                {displayedOptions.map(opt => {
                                                    const isSelected = rule.values.includes(opt.id);

                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            id={`opt-toggle-${rule.tableId}-${String(opt.id || '').replace(/\s+/g, '-').toLowerCase()}`}
                                                            onClick={() => handleToggleRuleValue(rule.id, opt.id)}
                                                            className={`p-3 rounded-lg border text-left transition cursor-pointer flex items-start gap-2.5 select-none ${
                                                                isSelected
                                                                    ? 'bg-blue-50/70 border-[#002395] ring-1 ring-[#002395]/20 shadow-2xs'
                                                                    : 'bg-white border-gray-200 hover:border-gray-300 opacity-75 hover:opacity-100'
                                                            }`}
                                                        >
                                                            <div className="pt-0.5 text-[#002395]">
                                                                {isSelected ? (
                                                                    <CheckSquare className="w-4 h-4" />
                                                                ) : (
                                                                    <Square className="w-4 h-4 text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className={`text-xs font-bold block truncate ${isSelected ? 'text-[#002395]' : 'text-gray-800'}`}>
                                                                    {opt.label}
                                                                </span>
                                                                {opt.sub && (
                                                                    <span className="text-[10px] text-gray-500 block truncate mt-0.5">
                                                                        {opt.sub}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add custom value / code input */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-gray-100">
                                        <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">
                                            Ajouter une valeur spécifique ou un code :
                                        </span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                placeholder="Ex: IDF-NORD, 15864, Colas Rail..."
                                                value={customValueInputs[rule.id] || ''}
                                                onChange={e => setCustomValueInputs(prev => ({ ...prev, [rule.id]: e.target.value }))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddCustomValue(rule.id);
                                                    }
                                                }}
                                                className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md flex-1 focus:ring-1 focus:ring-[#002395] outline-hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddCustomValue(rule.id)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-[#002395] hover:text-white text-gray-800 rounded-md text-xs font-semibold flex items-center gap-1 transition shrink-0"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Ajouter</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Summary of Impact for this specific rule */}
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Info className="w-4 h-4 text-[#002395] shrink-0" />
                                            <span>
                                                {rule.values.length === 0 ? (
                                                    <span className="text-amber-700 font-semibold">
                                                        ⚠️ Aucune valeur sélectionnée : ce rôle ne verra aucune donnée rattachée à cette table !
                                                    </span>
                                                ) : isAllSelected ? (
                                                    <span>
                                                        Toutes les valeurs de la table <strong>{tableDef?.name || rule.tableName}</strong> sont autorisées.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        Ce rôle voit <strong>tout ce qui est rattaché à</strong> :{' '}
                                                        <strong className="text-[#002395]">{rule.values.join(', ')}</strong>
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        <span className="text-[10px] font-mono text-gray-400">
                                            Filtre : `{rule.tableId}.{rule.field} IN [{rule.values.length}]`
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Live Interactive Impact & Verification Simulation */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden mt-6">
                <div className="p-4 bg-gray-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Simulation en temps réel : Ce que ce rôle verra dans le portail
                        </h4>
                    </div>
                    <span className="text-[11px] text-gray-300">
                        Données filtrées dynamiquement selon les règles ci-dessus
                    </span>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 divide-x divide-gray-200 bg-gray-50/50">
                    <div className="p-4 text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">
                            Demandes Visibles
                        </span>
                        <div className="text-xl font-black text-[#002395] mt-1">
                            {visibleRequests.length} <span className="text-xs font-normal text-gray-400">/ {allRequests.length}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                            {Math.round((visibleRequests.length / (allRequests.length || 1)) * 100)}% du total
                        </span>
                    </div>

                    <div className="p-4 text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">
                            Sites Autorisés
                        </span>
                        <div className="text-xl font-black text-emerald-700 mt-1">
                            {visibleSites.length} <span className="text-xs font-normal text-gray-400">/ {allSites.length}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                            Gares & technicentres
                        </span>
                    </div>

                    <div className="p-4 text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">
                            Agents Accessibles
                        </span>
                        <div className="text-xl font-black text-indigo-700 mt-1">
                            {visibleUsers.length} <span className="text-xs font-normal text-gray-400">/ {allUsers.length}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                            Collaborateurs et brigades
                        </span>
                    </div>

                    <div className="p-4 text-center bg-rose-50/40">
                        <span className="text-[10px] uppercase font-bold text-rose-800 block">
                            Données Masquées
                        </span>
                        <div className="text-xl font-black text-rose-700 mt-1">
                            {hiddenRequests.length}
                        </div>
                        <span className="text-[10px] text-rose-600">
                            Demandes filtrées par sécurité
                        </span>
                    </div>
                </div>

                {/* Sub-tabs for the Preview */}
                <div className="flex border-b border-gray-200 bg-white px-4">
                    <button
                        type="button"
                        onClick={() => setPreviewTab('requests')}
                        className={`px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                            previewTab === 'requests'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Demandes visibles ({visibleRequests.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewTab('sites')}
                        className={`px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                            previewTab === 'sites'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Sites ferroviaires ({visibleSites.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewTab('users')}
                        className={`px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                            previewTab === 'users'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Agents Réseau ({visibleUsers.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewTab('hidden')}
                        className={`px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                            previewTab === 'hidden'
                                ? 'border-rose-600 text-rose-700'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Éléments masqués ({hiddenRequests.length})
                    </button>
                </div>

                {/* Preview Content */}
                <div className="p-4 max-h-80 overflow-y-auto">
                    {previewTab === 'requests' && (
                        visibleRequests.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500">
                                Aucune demande ne correspond aux critères de visibilité actuellement définis.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {visibleRequests.map(req => {
                                    const site = sitesMap[req.site_id] || sitesMap[req.site_name];
                                    const region = site?.region || req.region || 'Non renseigné';
                                    const service = req.beneficiaire_service || req.service || 'Maintenance';
                                    const direction = req.direction || DEFAULT_SERVICE_DIRECTION_MAPPING[service] || 'Dir. Infrastructure';

                                    return (
                                        <div
                                            key={req.id}
                                            className="p-3 bg-gray-50 hover:bg-blue-50/50 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition"
                                        >
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] font-bold text-[#002395]">
                                                        {req.reference || `REQ-${req.id}`}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-900 truncate">
                                                        {req.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                                    <span>Site : <strong className="text-gray-700">{req.site_name || 'Paris Nord'}</strong></span>
                                                    <span>•</span>
                                                    <span>Agent : {req.beneficiaire_name || 'Demandeur'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    📍 {region}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 truncate max-w-[140px]">
                                                    🧭 {direction}
                                                </span>
                                                <span className="text-[10px] bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded">
                                                    {req.status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {previewTab === 'sites' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {visibleSites.map(site => (
                                <div key={site.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">{site.name}</span>
                                        <span className="text-[10px] font-mono text-gray-500">{site.code}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        {site.region}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {previewTab === 'users' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {visibleUsers.map(u => (
                                <div key={u.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">{u.name}</span>
                                        <span className="text-[10px] text-gray-500">{u.email} • {u.role}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-semibold text-[#002395] block">{u.attributes?.service || 'Infrastructure'}</span>
                                        <span className="text-[9px] text-gray-500">{u.attributes?.region || 'IDF'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {previewTab === 'hidden' && (
                        hiddenRequests.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500">
                                Aucune demande n'est masquée. Ce rôle a accès à toutes les données.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {hiddenRequests.map(req => {
                                    const site = sitesMap[req.site_id] || sitesMap[req.site_name];
                                    const region = site?.region || req.region || 'Hors périmètre';

                                    return (
                                        <div
                                            key={req.id}
                                            className="p-3 bg-rose-50/40 rounded-lg border border-rose-200 flex items-center justify-between opacity-80"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] font-bold text-rose-800 line-through">
                                                        {req.reference || `REQ-${req.id}`}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-700 truncate">
                                                        {req.title}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 block">
                                                    Site : {req.site_name} ({region})
                                                </span>
                                            </div>
                                            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded border border-rose-300">
                                                🔒 Masqué (Hors région/direction autorisée)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
