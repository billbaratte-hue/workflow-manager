import React, { useState, useMemo } from 'react';
import {
    Sliders,
    Sparkles,
    Check,
    X,
    Lock,
    Unlock,
    Eye,
    Pencil,
    Shield,
    Database,
    Filter,
    Search,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Bot,
    ChevronRight,
    Tag,
    Layers,
    Info,
    ArrowRight
} from 'lucide-react';
import { recommendRoleFieldScopeAI } from '../lib/api';

export const DATA_SCOPES = [
    { value: 'all', label: 'National (Toutes les données)', desc: 'Accès sans restriction géographique ou départementale' },
    { value: 'department', label: 'Direction / Service uniquement', desc: 'Limité aux agents du même service métier' },
    { value: 'assigned_sites', label: 'Sites attribués uniquement', desc: 'Limité aux gares et technicentres confiés' },
    { value: 'own', label: 'Données personnelles uniquement', desc: 'Uniquement les données créées par l\'utilisateur' }
];

export const REFERENCE_CATEGORIES = [
    { id: 'all', label: 'Tous les Référentiels & Tables' },
    { id: 'Opérations', label: 'Opérations & Demandes', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'Organisation', label: 'Organisation & Territoire', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'Infrastructure', label: 'Infrastructure & Sites', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { id: 'Sécurité', label: 'Sécurité & Mécatronique', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    { id: 'Matériel', label: 'Matériel & Équipements', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'Processus', label: 'Processus & Workflows', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'Paramétrage', label: 'Paramétrage Système', color: 'bg-gray-100 text-gray-800 border-gray-200' }
];

interface RoleFieldScopeEditorProps {
    draftRole: any;
    setDraftRole: (role: any) => void;
    setIsDirty: (dirty: boolean) => void;
    allTablesAndReferentiels: any[];
    refTables: any[];
}

export default function RoleFieldScopeEditor({
    draftRole,
    setDraftRole,
    setIsDirty,
    allTablesAndReferentiels,
    refTables
}: RoleFieldScopeEditorProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // AI Assistance State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<any | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiAppliedSuccess, setAiAppliedSuccess] = useState(false);

    // Filter tables by search query and category
    const filteredTables = useMemo(() => {
        return allTablesAndReferentiels.filter(tbl => {
            const matchesCategory = selectedCategory === 'all' || 
                tbl.category === selectedCategory || 
                tbl.typeCategory === selectedCategory;
            
            const q = String(searchQuery || '').toLowerCase().trim();
            const matchesQuery = !q || 
                String(tbl.name || '').toLowerCase().includes(q) ||
                String(tbl.key || tbl.id || '').toLowerCase().includes(q) ||
                (tbl.description && String(tbl.description).toLowerCase().includes(q));

            return matchesCategory && matchesQuery;
        });
    }, [allTablesAndReferentiels, selectedCategory, searchQuery]);

    // Update table data scope
    const handleUpdateTableScope = (tableKey: string, scope: string) => {
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

    // Set field mode: read, write, or hidden
    const handleSetFieldMode = (tableKey: string, fieldKey: string, mode: 'read' | 'write' | 'hidden') => {
        const currentTable = draftRole.tablePermissions?.[tableKey] || {
            see: true,
            dataScope: 'all',
            allowedFields: ['all'],
            fieldModes: {}
        };

        const currentFieldModes = { ...(currentTable.fieldModes || {}) };
        currentFieldModes[fieldKey] = mode;

        const tableObj = allTablesAndReferentiels.find(t => t.key === tableKey);
        const allFieldKeys: string[] = (tableObj?.availableFields || []).map((f: any) => f.key);

        let allowedFields: string[] = currentTable.allowedFields || ['all'];
        if (mode === 'hidden') {
            if (allowedFields.includes('all')) {
                allowedFields = allFieldKeys.filter(k => k !== fieldKey);
            } else {
                allowedFields = allowedFields.filter(k => k !== fieldKey);
            }
        } else {
            // read or write
            if (!allowedFields.includes('all') && !allowedFields.includes(fieldKey)) {
                allowedFields = [...allowedFields, fieldKey];
                if (allowedFields.length === allFieldKeys.length) {
                    allowedFields = ['all'];
                }
            }
        }

        setDraftRole({
            ...draftRole,
            tablePermissions: {
                ...draftRole.tablePermissions,
                [tableKey]: {
                    ...currentTable,
                    fieldModes: currentFieldModes,
                    allowedFields
                }
            }
        });
        setIsDirty(true);
    };

    // Quick preset for all fields of a table
    const handleSetAllFieldsMode = (tableKey: string, mode: 'read' | 'write' | 'hidden') => {
        const tableObj = allTablesAndReferentiels.find(t => t.key === tableKey);
        if (!tableObj) return;

        const currentTable = draftRole.tablePermissions?.[tableKey] || {
            see: true,
            dataScope: 'all'
        };

        const newFieldModes: Record<string, 'read' | 'write' | 'hidden'> = {};
        tableObj.availableFields.forEach((f: any) => {
            newFieldModes[f.key] = mode;
        });

        const allowedFields = mode === 'hidden' ? [] : ['all'];

        setDraftRole({
            ...draftRole,
            tablePermissions: {
                ...draftRole.tablePermissions,
                [tableKey]: {
                    ...currentTable,
                    fieldModes: newFieldModes,
                    allowedFields
                }
            }
        });
        setIsDirty(true);
    };

    // AI recommendation trigger
    const handleRequestAiRecommendation = async () => {
        setAiLoading(true);
        setAiAppliedSuccess(false);
        try {
            const res = await recommendRoleFieldScopeAI({
                roleName: draftRole.name,
                roleDesc: draftRole.description,
                tables: allTablesAndReferentiels
            });

            if (res.data?.success) {
                setAiResult(res.data);
                setShowAiModal(true);
            }
        } catch (err) {
            console.error('Erreur recommandation IA:', err);
        } finally {
            setAiLoading(false);
        }
    };

    // Apply AI recommendations to draftRole
    const handleApplyAiRecommendations = () => {
        if (!aiResult?.recommended_scopes) return;

        const updatedTablePermissions = { ...draftRole.tablePermissions };

        Object.entries(aiResult.recommended_scopes).forEach(([tableKey, scopeConfig]: [string, any]) => {
            const existing = updatedTablePermissions[tableKey] || { see: true };
            updatedTablePermissions[tableKey] = {
                ...existing,
                dataScope: scopeConfig.dataScope || existing.dataScope || 'all',
                allowedFields: scopeConfig.allowedFields || existing.allowedFields || ['all'],
                fieldModes: scopeConfig.fieldModes || existing.fieldModes || {}
            };
        });

        setDraftRole({
            ...draftRole,
            tablePermissions: updatedTablePermissions
        });
        setIsDirty(true);
        setAiAppliedSuccess(true);
        setTimeout(() => {
            setShowAiModal(false);
            setAiAppliedSuccess(false);
        }, 1500);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header / Intro with AI Assistant banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-[#002395] rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-blue-800/70 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold text-yellow-300">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        <span>Assistance IA Gemini & Cybersécurité NIS 2</span>
                    </div>
                    <h3 className="text-base font-bold">
                        Périmètre de données & Visibilité granulaire des champs
                    </h3>
                    <p className="text-xs text-blue-100/90 leading-relaxed">
                        Déterminez la portée territoriale et organisationnelle de chaque table, ainsi que les droits précis par champ (Lecture seule, Modification ou Masqué) pour le profil <strong>{draftRole.name}</strong>.
                    </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    <button
                        type="button"
                        id="btn-ai-recommend-scope"
                        onClick={handleRequestAiRecommendation}
                        disabled={aiLoading}
                        className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                        {aiLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin text-gray-900" />
                                <span>Analyse IA en cours...</span>
                            </>
                        ) : (
                            <>
                                <Bot className="w-4 h-4 text-blue-950" />
                                <span>Suggérer avec l'IA (Gemini)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Category / Type de Référentiel Filters */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                        <Filter className="w-3.5 h-3.5 text-[#002395]" />
                        <span>Filtrer par Type de Référentiel :</span>
                    </div>
                    <span className="text-[11px] text-gray-500">
                        {filteredTables.length} table(s) affichée(s)
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {REFERENCE_CATEGORIES.map(cat => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border ${
                                    isSelected
                                        ? 'bg-[#002395] text-white border-[#002395] shadow-2xs font-bold'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search Input */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher une table ou un référentiel (ex: Demandes, Sites, Normes, Clés...)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-[#002395] outline-hidden shadow-2xs"
                />
            </div>

            {/* List of Tables and Reference Tables */}
            <div className="space-y-4">
                {filteredTables.map(table => {
                    const perm = draftRole.tablePermissions?.[table.key] || {
                        dataScope: 'all',
                        allowedFields: ['all'],
                        fieldModes: {}
                    };
                    const currentScope = perm.dataScope || 'all';
                    const currentFields = perm.allowedFields || ['all'];
                    const isAllFields = currentFields.includes('all');
                    const fieldModes = perm.fieldModes || {};

                    // Badges for category
                    const categoryBadgeColor = 
                        table.category === 'Sécurité' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                        table.category === 'Organisation' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        table.category === 'Infrastructure' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                        table.category === 'Matériel' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-blue-100 text-blue-800 border-blue-200';

                    return (
                        <div
                            key={table.key}
                            id={`scope-table-${table.key}`}
                            className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden"
                        >
                            {/* Header of Table Card */}
                            <div className="bg-gray-50/80 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4 text-[#002395]" />
                                        <span className="font-bold text-gray-900 text-sm">
                                            {table.name}
                                        </span>
                                        <span className="text-[10px] text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded font-mono">
                                            {table.key}
                                        </span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${categoryBadgeColor}`}>
                                            Type : {table.category || 'Référentiel'}
                                        </span>
                                        {table.isCustomRef && (
                                            <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                                                Référentiel Dynamique
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {table.description}
                                    </p>
                                </div>

                                {/* Scope Selector and Quick Actions */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold text-gray-700">Périmètre :</label>
                                        <select
                                            value={currentScope}
                                            onChange={e => handleUpdateTableScope(table.key, e.target.value)}
                                            className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-gray-800 font-semibold focus:ring-2 focus:ring-[#002395] outline-hidden shadow-2xs"
                                        >
                                            {DATA_SCOPES.map(sc => (
                                                <option key={sc.value} value={sc.value}>
                                                    {sc.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1 border-l pl-3 border-gray-300">
                                        <button
                                            type="button"
                                            onClick={() => handleSetAllFieldsMode(table.key, 'write')}
                                            className="text-[10px] font-bold text-[#002395] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                                            title="Passer tous les champs en édition"
                                        >
                                            Tout modifier
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetAllFieldsMode(table.key, 'read')}
                                            className="text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                            title="Passer tous les champs en lecture seule"
                                        >
                                            Tout lire
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetAllFieldsMode(table.key, 'hidden')}
                                            className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded"
                                            title="Masquer tous les champs"
                                        >
                                            Tout masquer
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Fields Configuration Grid */}
                            <div className="p-4 space-y-3">
                                <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
                                    <span>Droits par Champ & Attribut :</span>
                                    <span className="text-[10px] font-normal text-gray-500">
                                        Mode par champ : <strong>Lecture</strong>, <strong>Écriture</strong> ou <strong>Masqué</strong>
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {(table.availableFields || []).map((f: any) => {
                                        const fieldKey = f.key;
                                        const fieldLabel = f.label || fieldKey;
                                        
                                        // Mode resolution: explicit mode or inferred from allowedFields
                                        let currentMode: 'read' | 'write' | 'hidden' = fieldModes[fieldKey] || 'write';
                                        if (!fieldModes[fieldKey]) {
                                            if (!isAllFields && !currentFields.includes(fieldKey)) {
                                                currentMode = 'hidden';
                                            } else {
                                                currentMode = 'write';
                                            }
                                        }

                                        return (
                                            <div
                                                key={fieldKey}
                                                className={`p-2.5 rounded-lg border flex flex-col justify-between gap-2 transition ${
                                                    currentMode === 'write' ? 'bg-emerald-50/50 border-emerald-200' :
                                                    currentMode === 'read' ? 'bg-blue-50/50 border-blue-200' :
                                                    'bg-gray-50/80 border-gray-200 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1.5 min-w-0">
                                                    <span className={`text-xs font-semibold truncate ${
                                                        currentMode === 'hidden' ? 'line-through text-gray-500' : 'text-gray-900'
                                                    }`}>
                                                        {fieldLabel}
                                                    </span>
                                                    <span className="font-mono text-[9px] text-gray-400 shrink-0">
                                                        {fieldKey}
                                                    </span>
                                                </div>

                                                {/* 3-way toggle button group */}
                                                <div className="inline-flex rounded-md shadow-2xs border border-gray-200 bg-white p-0.5 self-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetFieldMode(table.key, fieldKey, 'read')}
                                                        className={`text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition cursor-pointer ${
                                                            currentMode === 'read'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                        title="Lecture seule uniquement"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        <span>Lecture</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetFieldMode(table.key, fieldKey, 'write')}
                                                        className={`text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition cursor-pointer ${
                                                            currentMode === 'write'
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                        title="Modification autorisée"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        <span>Écriture</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetFieldMode(table.key, fieldKey, 'hidden')}
                                                        className={`text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition cursor-pointer ${
                                                            currentMode === 'hidden'
                                                                ? 'bg-rose-600 text-white'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                        title="Masquer le champ pour ce rôle"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        <span>Masqué</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AI Recommendation Modal */}
            {showAiModal && aiResult && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-900 to-[#002395] p-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                                <div>
                                    <h3 className="font-bold text-sm">
                                        Recommandation IA de Périmètre pour "{draftRole.name}"
                                    </h3>
                                    <span className="text-[10px] text-blue-200">
                                        Générée par Gemini & Règles de Cybersécurité NIS 2
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAiModal(false)}
                                className="text-blue-200 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto">
                            {/* Rationale card */}
                            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
                                <span className="font-bold block text-blue-900">
                                    Justification Stratégique :
                                </span>
                                <p className="leading-relaxed">
                                    {aiResult.rationale}
                                </p>
                            </div>

                            {/* Recommended Types of Referentiels */}
                            {aiResult.recommended_ref_types && aiResult.recommended_ref_types.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-gray-700 block">
                                        Types de Référentiels Recommandés :
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {aiResult.recommended_ref_types.map((t: string) => (
                                            <span
                                                key={t}
                                                className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-1 rounded-md text-xs flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3 text-emerald-600" />
                                                <span>{t}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Scope summary table */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-gray-700 block">
                                    Aperçu des Périmètres Proposés par Table :
                                </span>
                                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto text-xs">
                                    {Object.entries(aiResult.recommended_scopes || {}).map(([key, sc]: [string, any]) => (
                                        <div key={key} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                                            <div>
                                                <span className="font-bold text-gray-900">{key}</span>
                                                <p className="text-[11px] text-gray-500 mt-0.5">{sc.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-blue-100 text-blue-800 font-mono font-semibold px-2 py-0.5 rounded text-[10px]">
                                                    {sc.dataScope}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Safety warnings */}
                            {aiResult.safety_warnings && aiResult.safety_warnings.length > 0 && (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                                    <span className="font-bold flex items-center gap-1 text-amber-800">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        Points de Vigilance NIS 2 :
                                    </span>
                                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                                        {aiResult.safety_warnings.map((w: string, i: number) => (
                                            <li key={i}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {aiAppliedSuccess && (
                                <div className="bg-emerald-50 text-emerald-900 p-3 rounded-lg border border-emerald-200 text-xs font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Les recommandations ont été appliquées avec succès au rôle !</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowAiModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                                Fermer
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyAiRecommendations}
                                className="bg-[#002395] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-yellow-300" />
                                <span>Appliquer ces recommandations au rôle</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
