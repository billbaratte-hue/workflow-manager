import React, { useState, useMemo } from 'react';
import { useFeatures } from '../context/FeaturesContext';
import {
    Eye,
    Shield,
    ShieldAlert,
    CheckCircle2,
    AlertTriangle,
    X,
    Lock,
    Unlock,
    Pencil,
    Sliders,
    Sparkles,
    Bot,
    RefreshCw,
    Database,
    Table as TableIcon,
    Layers,
    Building2,
    MapPin,
    FileText,
    Key,
    UserCheck,
    Cpu,
    ArrowRight,
    Check
} from 'lucide-react';
import { auditRoleSimulationAI } from '../lib/api';

interface RoleSimulatorProps {
    draftRole: any;
    allTablesAndReferentiels: any[];
    refTables: any[];
    allRequests: any[];
    allSites: any[];
    allUsers: any[];
    dynamicPortalTabs: any[];
    onApplyRemediation?: (updates: any) => void;
}

export default function RoleSimulator({
    draftRole,
    allTablesAndReferentiels,
    refTables,
    allRequests,
    allSites,
    allUsers,
    dynamicPortalTabs,
    onApplyRemediation
}: RoleSimulatorProps) {
    const [subTab, setSubTab] = useState<'nav' | 'form' | 'referentiels' | 'audit'>('form');
    const [selectedRefCategory, setSelectedRefCategory] = useState<string>('Infrastructure');
    const [selectedRefTableKey, setSelectedRefTableKey] = useState<string>('sites');

    const { isFeatureEnabled, toggleFeature } = useFeatures();
    const isAiEnabled = isFeatureEnabled('ai_demandes');

    // AI Audit state
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditData, setAuditData] = useState<any | null>(null);

    // Compute request permissions and field modes for table "requests"
    const reqPerm = draftRole?.tablePermissions?.requests || {
        see: true,
        modify: false,
        create: true,
        dataScope: 'own',
        allowedFields: ['all'],
        fieldModes: {}
    };

    const isAllReqFields = (reqPerm.allowedFields || ['all']).includes('all');
    const reqFieldModes: Record<string, 'read' | 'write' | 'hidden'> = reqPerm.fieldModes || {};

    const getFieldDisplayState = (fieldKey: string, defaultMode: 'read' | 'write' = 'write') => {
        // If explicit mode in fieldModes
        if (reqFieldModes[fieldKey]) {
            return reqFieldModes[fieldKey];
        }
        // If not in allowedFields and not all
        if (!isAllReqFields && !(reqPerm.allowedFields || []).includes(fieldKey)) {
            return 'hidden';
        }
        return defaultMode;
    };

    // Filter reference tables by chosen category
    const categoryRefTables = useMemo(() => {
        return allTablesAndReferentiels.filter(t => 
            t.category === selectedRefCategory || t.typeCategory === selectedRefCategory
        );
    }, [allTablesAndReferentiels, selectedRefCategory]);

    // Active simulated ref table
    const currentSimulatedTable = useMemo(() => {
        const found = categoryRefTables.find(t => t.key === selectedRefTableKey);
        return found || categoryRefTables[0] || allTablesAndReferentiels[0];
    }, [categoryRefTables, selectedRefTableKey, allTablesAndReferentiels]);

    // Simulated data for reference table
    const simulatedRefRecords = useMemo(() => {
        if (!currentSimulatedTable) return [];
        const tableKey = currentSimulatedTable.key;

        if (tableKey === 'sites') {
            // Apply geographic rules from referenceVisibilityRules if any
            const rules = draftRole?.referenceVisibilityRules || [];
            let list = allSites && allSites.length > 0 ? allSites.slice(0, 5) : [
                { id: '1', code: 'PAR-ND', name: 'Gare de Paris-Nord', region: 'Île-de-France', service: 'Infra Nord', zone_securite: 'Zone A - Haute Sécurité' },
                { id: '2', code: 'LYO-PR', name: 'Lyon Part-Dieu', region: 'Auvergne-Rhône-Alpes', service: 'Infra SE', zone_securite: 'Zone B' },
                { id: '3', code: 'MAR-ST', name: 'Marseille Saint-Charles', region: 'Provence-Alpes-Côte d\'Azur', service: 'Infra Méditerranée', zone_securite: 'Zone A - Haute Sécurité' },
                { id: '4', code: 'LIL-FL', name: 'Lille Flandres', region: 'Hauts-de-France', service: 'Infra Nord', zone_securite: 'Zone C' }
            ];

            if (rules.length > 0) {
                const allowedRegions = rules.map((r: any) => r.region || r.value).filter(Boolean);
                if (allowedRegions.length > 0) {
                    list = list.filter((s: any) => allowedRegions.includes(s.region));
                }
            }
            return list;
        }

        // Generic mock data for other tables or dynamic tables
        return [
            { id: 'REF-001', code: 'NORM-15864', libelle: 'Cylindre électronique mécatronique EN 15864', niveau_securite: 'Critique', statut: 'Actif' },
            { id: 'REF-002', code: 'NORM-16864', libelle: 'Serrure multipoints connectée EN 16864', niveau_securite: 'Élevé', statut: 'Actif' },
            { id: 'REF-003', code: 'ACC-ZONE-HT', libelle: 'Accès Sous-Station Haute Tension 25kV', niveau_securite: 'Défense', statut: 'Actif' }
        ];
    }, [currentSimulatedTable, allSites, draftRole?.referenceVisibilityRules]);

    // Run AI Security Audit
    const handleRunAiAudit = async () => {
        if (!isAiEnabled) return;
        setAuditLoading(true);
        try {
            const res = await auditRoleSimulationAI({
                role: draftRole,
                tables: allTablesAndReferentiels,
                referenceTables: refTables
            });

            if (res.data?.audit) {
                setAuditData(res.data.audit);
            }
        } catch (err) {
            console.error('Erreur audit simulation IA:', err);
        } finally {
            setAuditLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header info */}
            <div className="bg-gradient-to-r from-gray-900 via-blue-950 to-[#002395] rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 bg-blue-800/60 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold text-cyan-300">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Simulateur en Temps Réel du Profil Agent</span>
                    </div>
                    <h3 className="text-base font-bold">
                        Simulation d'Expérience & Audit pour "{draftRole.name}"
                    </h3>
                    <p className="text-xs text-blue-100/80">
                        Vérifiez immédiatement comment un utilisateur verra le portail, saisira une demande mécatronique et consultera les référentiels avec cette configuration.
                    </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRunAiAudit}
                        disabled={auditLoading}
                        className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                        {auditLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Audit IA en cours...</span>
                            </>
                        ) : (
                            <>
                                <Bot className="w-4 h-4 text-gray-950" />
                                <span>Lancer l'Audit de Sécurité IA</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Sub-tabs selector */}
            <div className="flex border-b border-gray-200 gap-2">
                <button
                    type="button"
                    onClick={() => setSubTab('form')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                        subTab === 'form'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Simulateur Formulaire Demande</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('referentiels')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                        subTab === 'referentiels'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Database className="w-4 h-4" />
                    <span>Simulateur Référentiels par Type</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('nav')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                        subTab === 'nav'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Barre Navigation & Onglets</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setSubTab('audit');
                        if (isAiEnabled && !auditData && !auditLoading) handleRunAiAudit();
                    }}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                        subTab === 'audit'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Shield className="w-4 h-4" />
                    <span>Audit IA Cybersécurité & NIS 2</span>
                    {!isAiEnabled ? (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-amber-300">
                            Désactivé (Admin)
                        </span>
                    ) : auditData ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {auditData.compliance_grade || 'A'}
                        </span>
                    ) : null}
                </button>
            </div>

            {/* SUBTAB 1: Form simulation */}
            {subTab === 'form' && (
                <div className="space-y-4">
                    <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                        <Sliders className="w-4 h-4 text-[#002395] shrink-0 mt-0.5" />
                        <div>
                            <strong>Rendu interactif du formulaire de demande :</strong> Les champs ci-dessous reflètent en direct la politique de visibilité configurée pour la table <code>requests</code>. Les champs autorisés en écriture sont interactifs, ceux en lecture seule sont verrouillés, et les champs masqués sont protégés.
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">
                                    Demande d'Intervention Mécatronique (Aperçu Utilisateur)
                                </h4>
                                <span className="text-xs text-gray-500">
                                    Simulé pour un utilisateur ayant le rôle <strong>{draftRole.name}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-600">Périmètre appliqué :</span>
                                <span className="bg-blue-100 text-[#002395] font-bold text-xs px-2.5 py-1 rounded-md">
                                    {reqPerm.dataScope === 'all' ? 'National' :
                                     reqPerm.dataScope === 'department' ? 'Direction / Service' :
                                     reqPerm.dataScope === 'assigned_sites' ? 'Sites attribués' : 'Données personnelles'}
                                </span>
                            </div>
                        </div>

                        {/* Interactive Form Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Référence */}
                            {getFieldDisplayState('reference') !== 'hidden' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label>Référence Demande</label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('reference') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('reference') === 'write' ? 'Écriture' : 'Lecture seule'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        readOnly={getFieldDisplayState('reference') === 'read'}
                                        defaultValue="DEM-2026-9042"
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                            getFieldDisplayState('reference') === 'read' ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs text-gray-400">
                                    <span>Référence Demande</span>
                                    <span className="font-mono text-[10px] bg-gray-200 px-2 py-0.5 rounded">•••••••• (Champ masqué)</span>
                                </div>
                            )}

                            {/* Bénéficiaire */}
                            {getFieldDisplayState('beneficiaire') !== 'hidden' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label>Bénéficiaire / Agent Terrain</label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('beneficiaire') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('beneficiaire') === 'write' ? 'Écriture' : 'Lecture seule'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        readOnly={getFieldDisplayState('beneficiaire') === 'read'}
                                        defaultValue="Dupont Jean-Marc (Technicien Signalisation)"
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                            getFieldDisplayState('beneficiaire') === 'read' ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs text-gray-400">
                                    <span>Bénéficiaire</span>
                                    <span className="font-mono text-[10px] bg-gray-200 px-2 py-0.5 rounded">•••••••• (Donnée masquée)</span>
                                </div>
                            )}

                            {/* Site ferroviaire */}
                            {getFieldDisplayState('site') !== 'hidden' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label>Site Ferroviaire / Gare</label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('site') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('site') === 'write' ? 'Écriture' : 'Lecture seule'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        readOnly={getFieldDisplayState('site') === 'read'}
                                        defaultValue="Technicentre Châtillon TGV - Sous-station HT"
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                            getFieldDisplayState('site') === 'read' ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs text-gray-400">
                                    <span>Site ferroviaire</span>
                                    <span className="font-mono text-[10px] bg-gray-200 px-2 py-0.5 rounded">•••••••• (Champ masqué)</span>
                                </div>
                            )}

                            {/* Équipement mécatronique */}
                            {getFieldDisplayState('equipment') !== 'hidden' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label>Équipement / Clé Mécatronique EN 15864</label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('equipment') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('equipment') === 'write' ? 'Écriture' : 'Lecture seule'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        readOnly={getFieldDisplayState('equipment') === 'read'}
                                        defaultValue="Clé Électronique Reconfigurable Haute Sûreté"
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                            getFieldDisplayState('equipment') === 'read' ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs text-gray-400">
                                    <span>Équipement mécatronique</span>
                                    <span className="font-mono text-[10px] bg-gray-200 px-2 py-0.5 rounded">•••••••• (Champ masqué)</span>
                                </div>
                            )}

                            {/* Période / Dates */}
                            {getFieldDisplayState('dates') !== 'hidden' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label>Créneau d'Intervention Requis</label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('dates') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('dates') === 'write' ? 'Écriture' : 'Lecture seule'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        readOnly={getFieldDisplayState('dates') === 'read'}
                                        defaultValue="Du 18/09/2026 06:00 au 19/09/2026 18:00 (36h)"
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                            getFieldDisplayState('dates') === 'read' ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs text-gray-400">
                                    <span>Dates d'intervention</span>
                                    <span className="font-mono text-[10px] bg-gray-200 px-2 py-0.5 rounded">•••••••• (Champ masqué)</span>
                                </div>
                            )}

                            {/* Documents & Habilitations */}
                            {getFieldDisplayState('documents') !== 'hidden' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label>Pièces Jointes & Certificats de Sécurité</label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('documents') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('documents') === 'write' ? 'Écriture' : 'Lecture seule'}
                                        </span>
                                    </div>
                                    <div className="p-2 border rounded-lg text-xs flex items-center justify-between bg-gray-50 border-gray-200">
                                        <span className="text-gray-700 font-medium">Habilitation_Electrique_H0B0_2026.pdf</span>
                                        <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded">1.4 Mo</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs text-gray-400">
                                    <span>Documents & Habilitations</span>
                                    <span className="font-mono text-[10px] bg-gray-200 px-2 py-0.5 rounded">•••••••• (Confidentiel / Masqué)</span>
                                </div>
                            )}

                            {/* Avis de Validation & Signature (Sensitive field) */}
                            {getFieldDisplayState('validation') !== 'hidden' ? (
                                <div className="space-y-1 md:col-span-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <label className="flex items-center gap-1.5 text-blue-900 font-bold">
                                            <Shield className="w-3.5 h-3.5 text-[#002395]" />
                                            Avis de Validation & Décision Sécurité
                                        </label>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                            getFieldDisplayState('validation') === 'write' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {getFieldDisplayState('validation') === 'write' ? 'Écriture (Validation autorisée)' : 'Lecture seule (Décision consultable)'}
                                        </span>
                                    </div>
                                    <textarea
                                        rows={2}
                                        readOnly={getFieldDisplayState('validation') === 'read'}
                                        defaultValue="Avis favorable validé sous réserve du respect strict de la procédure de consigne C-15864."
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                            getFieldDisplayState('validation') === 'read' ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-rose-50 border border-dashed border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800 md:col-span-2">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                                        Circuit de Validation Confidentiel
                                    </span>
                                    <span className="font-mono text-[10px] bg-rose-200 px-2 py-0.5 rounded text-rose-900">
                                        Protégé contre la consultation pour ce profil
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SUBTAB 2: Reference Tables simulation */}
            {subTab === 'referentiels' && (
                <div className="space-y-4">
                    {/* Category Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 block">
                            Sélectionnez un Type de Référentiel à simuler :
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['Infrastructure', 'Organisation', 'Sécurité', 'Matériel', 'Processus'].map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                        setSelectedRefCategory(cat);
                                        const matching = allTablesAndReferentiels.find(t => t.category === cat || t.typeCategory === cat);
                                        if (matching) setSelectedRefTableKey(matching.key);
                                    }}
                                    className={`text-xs px-3.5 py-1.5 rounded-lg font-bold border transition cursor-pointer ${
                                        selectedRefCategory === cat
                                            ? 'bg-[#002395] text-white border-[#002395]'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Selector under this category */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-[#002395]" />
                                <span className="text-xs font-bold text-gray-900">
                                    Référentiel actif :
                                </span>
                                <select
                                    value={selectedRefTableKey}
                                    onChange={e => setSelectedRefTableKey(e.target.value)}
                                    className="text-xs font-bold bg-gray-50 border border-gray-300 rounded-md px-2.5 py-1 text-gray-800"
                                >
                                    {categoryRefTables.map(t => (
                                        <option key={t.key} value={t.key}>
                                            {t.name} ({t.key})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* CRUD Permissions for this table */}
                            {(() => {
                                const currentPerm = draftRole?.tablePermissions?.[currentSimulatedTable.key] || {
                                    see: true, modify: false, delete: false, create: false
                                };
                                return (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className={`px-2 py-0.5 rounded font-bold ${currentPerm.see ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>
                                            {currentPerm.see ? '✓ Voir' : '✗ Voir'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded font-bold ${currentPerm.create ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'}`}>
                                            {currentPerm.create ? '✓ Créer' : '✗ Créer'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded font-bold ${currentPerm.modify ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-400'}`}>
                                            {currentPerm.modify ? '✓ Modifier' : '✗ Modifier'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded font-bold ${currentPerm.delete ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-400'}`}>
                                            {currentPerm.delete ? '✓ Supprimer' : '✗ Supprimer'}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Simulated Records Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b text-gray-600 font-bold">
                                        {Object.keys(simulatedRefRecords[0] || {}).map(col => {
                                            const isColHidden = !(currentSimulatedTable.availableFields || []).some((f: any) => f.key === col) && 
                                                draftRole?.tablePermissions?.[currentSimulatedTable.key]?.allowedFields && 
                                                !draftRole.tablePermissions[currentSimulatedTable.key].allowedFields.includes('all') &&
                                                !draftRole.tablePermissions[currentSimulatedTable.key].allowedFields.includes(col);

                                            return (
                                                <th key={col} className="p-2.5">
                                                    <div className="flex items-center gap-1">
                                                        <span>{col}</span>
                                                        {isColHidden && <Lock className="w-3 h-3 text-rose-500" />}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        <th className="p-2.5 text-right">Actions profil</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {simulatedRefRecords.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/70">
                                            {Object.entries(row).map(([k, v]: [string, any]) => (
                                                <td key={k} className="p-2.5 text-gray-800 font-medium">
                                                    {String(v)}
                                                </td>
                                            ))}
                                            <td className="p-2.5 text-right">
                                                <div className="inline-flex gap-1 justify-end">
                                                    <span className="p-1 text-gray-400 bg-gray-100 rounded text-[10px]" title="Consultation">
                                                        👁️
                                                    </span>
                                                    {draftRole?.tablePermissions?.[currentSimulatedTable.key]?.modify && (
                                                        <span className="p-1 text-amber-700 bg-amber-100 rounded text-[10px]" title="Édition autorisée">
                                                            ✏️
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Territorial filter notification */}
                        {draftRole?.referenceVisibilityRules?.length > 0 && (
                            <div className="text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                    Filtrage territorial actif pour ce rôle : {draftRole.referenceVisibilityRules.length} règle(s) appliquée(s). Seuls les sites autorisés apparaissent.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SUBTAB 3: Navigation Bar & Tabs Preview */}
            {subTab === 'nav' && (
                <div className="space-y-4">
                    <div className="bg-gray-900 text-white rounded-xl p-4 shadow-sm space-y-3">
                        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold block">
                            Aperçu Réel de la Barre de Navigation (Portail Opérationnel) :
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-2 bg-gray-800/80 p-2.5 rounded-lg border border-gray-700">
                            {dynamicPortalTabs.map(tab => {
                                const isVisible = !!draftRole?.portalTabs?.[tab.key];
                                return (
                                    <div
                                        key={tab.key}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition ${
                                            isVisible
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-gray-800 text-gray-500 line-through opacity-40'
                                        }`}
                                    >
                                        <i className={tab.iconClass || 'fas fa-circle'} />
                                        <span>{tab.label}</span>
                                        {isVisible ? (
                                            <span className="text-[9px] bg-blue-700 px-1.5 py-0.2 rounded font-mono">Actif</span>
                                        ) : (
                                            <span className="text-[9px] bg-gray-700 text-gray-400 px-1 rounded">Masqué</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* SUBTAB 4: AI Cyber & NIS 2 Audit */}
            {subTab === 'audit' && (
                <div className="space-y-4">
                    {!isAiEnabled ? (
                        <div className="bg-white rounded-xl border border-dashed border-amber-300 p-8 text-center space-y-3 shadow-2xs">
                            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">
                                L'Assistance IA (Gemini) est actuellement désactivée
                            </h4>
                            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                                Le module d'audit de cybersécurité NIS 2 par IA a été désactivé par l'administrateur depuis la gestion des fonctionnalités. Vous pouvez l'activer d'un clic pour lancer l'audit.
                            </p>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await toggleFeature('ai_demandes', true);
                                        setTimeout(() => handleRunAiAudit(), 200);
                                    }}
                                    className="px-4 py-2 bg-[#002395] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer shadow-xs"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Activer l'IA maintenant</span>
                                </button>
                                <a
                                    href="/admin/onglets-referentiels?section=features"
                                    className="px-3.5 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
                                >
                                    Console Modules & Fonctionnalités
                                </a>
                            </div>
                        </div>
                    ) : auditLoading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3 shadow-2xs">
                            <RefreshCw className="w-8 h-8 text-[#002395] animate-spin mx-auto" />
                            <h4 className="text-sm font-bold text-gray-900">
                                Analyse approfondie des privilèges et conformité NIS 2...
                            </h4>
                            <p className="text-xs text-gray-500">
                                L'intelligence artificielle Gemini audite les séparations de tâches (SoD) et les périmètres de champs.
                            </p>
                        </div>
                    ) : null}

                    {!auditLoading && auditData && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden space-y-6 p-6">
                            {/* Score Card */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 p-5 rounded-xl border border-blue-200">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                                        Indice de Conformité & Sécurité NIS 2 :
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-extrabold text-[#002395]">
                                            {auditData.compliance_score} / 100
                                        </span>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                                            auditData.compliance_grade === 'A+' || auditData.compliance_grade === 'A' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                            auditData.compliance_grade === 'B' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                            'bg-amber-100 text-amber-800 border-amber-300'
                                        }`}>
                                            Grade {auditData.compliance_grade} ({auditData.risk_level} risque)
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-600 block">Ségrégation des Fonctions (SoD) :</span>
                                    <span className="font-bold text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 inline-block mt-1">
                                        {auditData.sod_status}
                                    </span>
                                </div>
                            </div>

                            {/* Strengths and issues */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths */}
                                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
                                    <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        Points Forts de la Configuration
                                    </h5>
                                    <ul className="text-xs text-emerald-950 space-y-1.5 pl-2">
                                        {(auditData.strengths || []).map((s: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <span className="text-emerald-600 font-bold">•</span>
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Issues */}
                                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
                                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        Points d'Attention & Risques Détectés
                                    </h5>
                                    <ul className="text-xs text-amber-950 space-y-1.5 pl-2">
                                        {(auditData.issues || []).map((issue: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <span className="text-amber-600 font-bold">•</span>
                                                <span>{issue}</span>
                                            </li>
                                        ))}
                                        {(!auditData.issues || auditData.issues.length === 0) && (
                                            <li className="text-gray-500 italic">Aucune vulnérabilité critique détectée.</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Recommendations */}
                            {auditData.recommendations && auditData.recommendations.length > 0 && (
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
                                    <h5 className="text-xs font-bold text-[#002395] flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-[#002395]" />
                                        Actions d'Optimisation Conseillées par l'IA
                                    </h5>
                                    <ul className="text-xs text-gray-800 space-y-1.5 pl-2">
                                        {auditData.recommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <ArrowRight className="w-3.5 h-3.5 text-[#002395] shrink-0 mt-0.5" />
                                                <span>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
