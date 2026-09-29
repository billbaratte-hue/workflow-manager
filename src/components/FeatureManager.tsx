import React, { useState } from 'react';
import { useFeatures } from '../context/FeaturesContext';
import {
    Sparkles,
    Tag,
    Layers,
    Shield,
    FileSpreadsheet,
    Users,
    Check,
    AlertCircle,
    Info,
    RefreshCw,
    Sliders,
    Power,
    Cpu,
    Database,
    Zap,
    Eye,
    EyeOff
} from 'lucide-react';

export default function FeatureManager() {
    const { features, loading, toggleFeature, refreshFeatures } = useFeatures();
    const [togglingKey, setTogglingKey] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleToggle = async (key: string, currentStatus: boolean, label: string) => {
        setTogglingKey(key);
        setFeedback(null);
        try {
            await toggleFeature(key, !currentStatus);
            setFeedback({
                type: 'success',
                message: `La fonctionnalité « ${label} » a été ${!currentStatus ? 'activée' : 'désactivée'} avec succès.`
            });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err.response?.data?.error || err.message || `Impossible de modifier la fonctionnalité « ${label} ».`
            });
        } finally {
            setTogglingKey(null);
        }
    };

    const getFeatureIcon = (key: string) => {
        switch (key) {
            case 'metadata_schema':
                return <Tag className="w-5 h-5 text-purple-600" />;
            case 'ai_demandes':
                return <Sparkles className="w-5 h-5 text-amber-500" />;
            case 'role_field_scope':
                return <Sliders className="w-5 h-5 text-indigo-600" />;
            case 'role_simulation':
                return <Eye className="w-5 h-5 text-cyan-600" />;
            case 'referentiels_management':
                return <Database className="w-5 h-5 text-blue-600" />;
            case 'referentiel_types_structure':
                return <Layers className="w-5 h-5 text-teal-600" />;
            case 'export_csv_advanced':
                return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
            case 'delegation_approval':
                return <Users className="w-5 h-5 text-blue-600" />;
            case 'syslog_audit_nis2':
                return <Shield className="w-5 h-5 text-rose-600" />;
            default:
                return <Sliders className="w-5 h-5 text-gray-600" />;
        }
    };

    const filteredFeatures = features.filter(f => {
        const label = String(f.label || f.name || f.key || '').toLowerCase();
        const desc = String(f.description || '').toLowerCase();
        const key = String(f.key || '').toLowerCase();
        const cat = String(f.category || '').toLowerCase();
        const query = String(searchTerm || '').toLowerCase();
        return label.includes(query) || desc.includes(query) || key.includes(query) || cat.includes(query);
    });

    // Specific highlight targets requested by user
    const aiFeature = features.find(f => f.key === 'ai_demandes');
    const roleFieldScopeFeature = features.find(f => f.key === 'role_field_scope');
    const roleSimulationFeature = features.find(f => f.key === 'role_simulation');
    const referentielsFeature = features.find(f => f.key === 'referentiels_management');
    const referentielTypesFeature = features.find(f => f.key === 'referentiel_types_structure');
    const metadataFeature = features.find(f => f.key === 'metadata_schema');

    return (
        <div className="space-y-6">
            {/* Header & Description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                <div>
                    <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-[#002395]" />
                        Gestion des Fonctionnalités & Options Modulaires
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                        Activez ou désactivez dynamiquement les modules de la plateforme (Schéma des métadonnées, Assistance IA pour les demandes, Exports, etc.) sans redémarrage du serveur.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refreshFeatures()}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        title="Rafraîchir les statuts"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Rafraîchir
                    </button>
                </div>
            </div>

            {/* Feedback Alerts */}
            {feedback && (
                <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition animate-fadeIn ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    )}
                    <span className="font-medium">{feedback.message}</span>
                </div>
            )}

            {/* Top Quick Focus Cards for Requested Features */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Power className="w-4 h-4 text-[#002395]" />
                        <span>Modules Principaux de Gouvernance (Contrôle Direct Admin)</span>
                    </h3>
                    <span className="text-[11px] text-gray-500">
                        Activation instantanée sans redémarrage
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        {
                            feat: aiFeature,
                            icon: <Sparkles className="w-6 h-6 text-amber-600" />,
                            activeBg: 'bg-amber-50/50 border-amber-200',
                            iconBg: 'bg-amber-100 text-amber-700',
                            toggleBg: 'bg-amber-600',
                            badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                            shortcut: '/catalogue',
                            shortcutLabel: 'Formulaires Demandes'
                        },
                        {
                            feat: roleFieldScopeFeature,
                            icon: <Sliders className="w-6 h-6 text-indigo-600" />,
                            activeBg: 'bg-indigo-50/50 border-indigo-200',
                            iconBg: 'bg-indigo-100 text-indigo-700',
                            toggleBg: 'bg-indigo-600',
                            badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                            shortcut: '/roles',
                            shortcutLabel: 'Éditeur de Rôles'
                        },
                        {
                            feat: roleSimulationFeature,
                            icon: <Eye className="w-6 h-6 text-cyan-600" />,
                            activeBg: 'bg-cyan-50/50 border-cyan-200',
                            iconBg: 'bg-cyan-100 text-cyan-700',
                            toggleBg: 'bg-cyan-600',
                            badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                            shortcut: '/roles',
                            shortcutLabel: 'Simulation Rôles'
                        },
                        {
                            feat: referentielsFeature,
                            icon: <Database className="w-6 h-6 text-blue-600" />,
                            activeBg: 'bg-blue-50/50 border-blue-200',
                            iconBg: 'bg-blue-100 text-blue-700',
                            toggleBg: 'bg-blue-600',
                            badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                            shortcut: '/admin/onglets-referentiels?section=referentiels',
                            shortcutLabel: 'Gérer Référentiels'
                        },
                        {
                            feat: referentielTypesFeature,
                            icon: <Layers className="w-6 h-6 text-teal-600" />,
                            activeBg: 'bg-teal-50/50 border-teal-200',
                            iconBg: 'bg-teal-100 text-teal-700',
                            toggleBg: 'bg-teal-600',
                            badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
                            shortcut: '/admin/onglets-referentiels?section=nouveau_type',
                            shortcutLabel: 'Structure & Colonnes'
                        },
                        {
                            feat: metadataFeature,
                            icon: <Tag className="w-6 h-6 text-purple-600" />,
                            activeBg: 'bg-purple-50/50 border-purple-200',
                            iconBg: 'bg-purple-100 text-purple-700',
                            toggleBg: 'bg-purple-600',
                            badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
                            shortcut: '/admin/onglets-referentiels?section=referentiels',
                            shortcutLabel: 'Métadonnées Lignes'
                        }
                    ].map(card => {
                        if (!card.feat) return null;
                        const f = card.feat;
                        const isEnabled = f.is_enabled;

                        return (
                            <div
                                key={f.key}
                                id={`feature-card-${f.key}`}
                                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                                    isEnabled
                                        ? `${card.activeBg} shadow-xs`
                                        : 'bg-gray-50/80 border-gray-200 opacity-90'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`p-2 rounded-lg ${isEnabled ? card.iconBg : 'bg-gray-200 text-gray-500'}`}>
                                                {card.icon}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-950 leading-tight">
                                                    {f.label || f.name || f.key}
                                                </h4>
                                                <span className={`inline-block mt-0.5 text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${
                                                    isEnabled ? card.badgeColor : 'bg-gray-200 text-gray-600 border-gray-300'
                                                }`}>
                                                    {isEnabled ? 'ACTIF' : 'DÉSACTIVÉ'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Toggle button */}
                                        <button
                                            id={`toggle-feature-${f.key}`}
                                            type="button"
                                            disabled={togglingKey === f.key}
                                            onClick={() => handleToggle(f.key, isEnabled, f.label || f.name || f.key)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                isEnabled ? card.toggleBg : 'bg-gray-300'
                                            } ${togglingKey === f.key ? 'opacity-50 cursor-wait' : ''}`}
                                            role="switch"
                                            aria-checked={isEnabled}
                                            title={isEnabled ? `Désactiver ${f.label || f.name || f.key}` : `Activer ${f.label || f.name || f.key}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <p className="text-[11px] text-gray-600 line-clamp-3 mb-3">
                                        {f.description}
                                    </p>
                                </div>

                                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-500">
                                    <span className="font-mono text-gray-400 truncate max-w-[140px]">
                                        {f.key}
                                    </span>
                                    <a
                                        href={card.shortcut}
                                        className="font-bold text-[#002395] hover:underline flex items-center gap-1"
                                    >
                                        <span>{card.shortcutLabel}</span>
                                        <i className="fas fa-arrow-right text-[8px]"></i>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Complete Features List with Search and Categories */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#002395]" />
                        <h4 className="text-sm font-bold text-gray-900">
                            Toutes les fonctionnalités modulaires ({features.length})
                        </h4>
                    </div>

                    <div className="w-full sm:w-64">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Filtrer une option..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#002395]"
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {filteredFeatures.map(feat => {
                        const isToggling = togglingKey === feat.key;
                        return (
                            <div
                                key={feat.key}
                                className={`p-4 hover:bg-gray-50/80 transition flex items-center justify-between gap-4 ${
                                    !feat.is_enabled ? 'bg-gray-50/30' : ''
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-gray-100 shrink-0 mt-0.5">
                                        {getFeatureIcon(feat.key)}
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-gray-900">
                                                {feat.label || feat.name || feat.key}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {feat.key}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                {feat.category}
                                            </span>
                                            {feat.requires_restart && (
                                                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                                    Redémarrage
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 line-clamp-2">
                                            {feat.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                        feat.is_enabled
                                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                            : 'text-gray-500 bg-gray-100 border border-gray-200'
                                    }`}>
                                        {feat.is_enabled ? 'Activé' : 'Désactivé'}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={isToggling}
                                        onClick={() => handleToggle(feat.key, feat.is_enabled, feat.label || feat.name || feat.key)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                            feat.is_enabled ? 'bg-[#002395]' : 'bg-gray-300'
                                        } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                                        role="switch"
                                        aria-checked={feat.is_enabled}
                                        title={feat.is_enabled ? `Désactiver ${feat.label || feat.name || feat.key}` : `Activer ${feat.label || feat.name || feat.key}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                feat.is_enabled ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Note d'information */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs text-blue-900">
                <Info className="w-4 h-4 text-[#002395] shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-semibold">Fonctionnement en temps réel :</p>
                    <p className="text-blue-800">
                        La désactivation d'une fonctionnalité (ex: <em>Schéma des métadonnées</em> ou <em>IA pour les demandes</em>) masque immédiatement les boutons, bannières et formulaires correspondants sur l'ensemble du portail, et bloque également les routes d'API associées côté serveur pour garantir une sécurité stricte.
                    </p>
                </div>
            </div>
        </div>
    );
}
