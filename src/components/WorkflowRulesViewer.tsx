import React from 'react';
import { WorkflowRulesConfig, ParentRequest } from '../types';
import { Shield, MapPin, FileCheck, AlertTriangle, CreditCard, Users, Settings, CheckCircle2, Sliders } from 'lucide-react';

interface WorkflowRulesViewerProps {
    dossier: ParentRequest;
    onEditRules?: (dossier: ParentRequest) => void;
    compact?: boolean;
}

export const WorkflowRulesViewer: React.FC<WorkflowRulesViewerProps> = ({
    dossier,
    onEditRules,
    compact = false
}) => {
    const rules: WorkflowRulesConfig = dossier.workflow_rules || {};

    const validationModeLabels: Record<string, { label: string; desc: string; color: string }> = {
        PARALLEL_ITEMS: {
            label: 'Validation Unitaire Asynchrone',
            desc: 'Chaque équipement/accès est validé indépendamment par le validateur de son site.',
            color: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        CROSS_VALIDATION: {
            label: 'Validation Croisée (N+1 & Sécurité)',
            desc: 'Requiert la double approbation conjointe du Manager N+1 et du Validateur Sécurité.',
            color: 'bg-purple-50 text-purple-700 border-purple-200'
        },
        TRIPARTITE: {
            label: 'Validation Tripartite (N+1, Local, National)',
            desc: 'Accord du Manager, du Validateur Local et de l\'Arbitrage National.',
            color: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        AUTO_FULFILL: {
            label: 'Approbation Automatique Immédiate',
            desc: 'Dossier approuvé sans circuit de validation manuel après soumission.',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }
    };

    const currentMode = validationModeLabels[rules.validation_mode || 'PARALLEL_ITEMS'] || validationModeLabels.PARALLEL_ITEMS;

    if (compact) {
        return (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${currentMode.color}`}>
                    <Sliders className="w-3 h-3" />
                    {currentMode.label}
                </span>

                {rules.requires_gps && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                        <MapPin className="w-3 h-3" />
                        GPS ≤ {rules.gps_max_accuracy_meters || 50}m
                    </span>
                )}

                {rules.requires_reception_pv && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                        <FileCheck className="w-3 h-3" />
                        PV Signature
                    </span>
                )}

                {rules.check_quota && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Quota S10 (Max {rules.custom_quota_limit ?? 2})
                    </span>
                )}

                {rules.requires_gdpr && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                        <Shield className="w-3 h-3" />
                        Charte RGPD
                    </span>
                )}

                {rules.requires_quote_po && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                        <CreditCard className="w-3 h-3" />
                        PO / Devis S9 ({rules.custom_quote_amount ? `${rules.custom_quote_amount}€` : 'Standard'})
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                        <Settings className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">Règles Métier & Paramètres Système Embarqués</h4>
                        <p className="text-xs text-slate-500">Configuration active du workflow ({dossier.request_number}) — Modèle Zero-Hardcoding</p>
                    </div>
                </div>

                {onEditRules && (
                    <button
                        type="button"
                        onClick={() => onEditRules(dossier)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        Ajuster les règles
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Mode de Validation */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Circuit de Validation
                    </div>
                    <div className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold ${currentMode.color}`}>
                        {currentMode.label}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{currentMode.desc}</p>
                    {rules.allowed_manager_roles && rules.allowed_manager_roles.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-600">
                            <span className="font-medium">Rôles Manager :</span> {rules.allowed_manager_roles.join(', ')}
                        </div>
                    )}
                </div>

                {/* Terrain, GPS & Commissioning */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                        Terrain & Commissioning
                    </div>
                    <ul className="space-y-1 mt-1 text-[11px] text-slate-600">
                        <li className="flex items-center gap-1.5">
                            {rules.requires_gps ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                            ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block flex-shrink-0" />
                            )}
                            <span>Relevé GPS pose : {rules.requires_gps ? `Requis (≤ ${rules.gps_max_accuracy_meters || 50}m)` : 'Non exigé'}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                            {rules.requires_reception_pv ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                            ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block flex-shrink-0" />
                            )}
                            <span>Procès-Verbal (PV) : {rules.requires_reception_pv ? 'Signature requise' : 'Optionnel'}</span>
                        </li>
                    </ul>
                </div>

                {/* Quotas & Sécurité */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold mb-1">
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        Quotas, RGPD & Finances
                    </div>
                    <ul className="space-y-1 mt-1 text-[11px] text-slate-600">
                        <li className="flex items-center gap-1.5">
                            {rules.check_quota ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block flex-shrink-0" />
                            )}
                            <span>Contrôle Quota S10 : {rules.check_quota ? `Actif (Seuil: ${rules.custom_quota_limit ?? 2})` : 'Désactivé'}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                            {rules.requires_gdpr ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                            ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block flex-shrink-0" />
                            )}
                            <span>Charte RGPD : {rules.requires_gdpr ? 'Signature préalable requise' : 'Non requise'}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                            {rules.requires_quote_po ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block flex-shrink-0" />
                            )}
                            <span>Bon commande / Devis S9 : {rules.requires_quote_po ? `${rules.custom_quote_amount || 85}€` : 'Sans devis'}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
