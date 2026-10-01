import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SystemSettingsManager from '../components/SystemSettingsManager';
import AutomationControlCenter from '../components/AutomationControlCenter';

export default function AdminParametresSysteme() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'settings';
    const [activeTab, setActiveTab] = useState<'settings' | 'automation'>(
        currentTab === 'automation' ? 'automation' : 'settings'
    );

    const handleTabChange = (tab: 'settings' | 'automation') => {
        setActiveTab(tab);
        if (tab === 'automation') {
            setSearchParams({ tab: 'automation' });
        } else {
            setSearchParams({});
        }
    };

    return (
        <div className="space-y-6">
            {/* Navigation & Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Link to="/admin" className="hover:text-[#002395] transition">Espace Administrateur</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">Paramétrage Métier</span>
                        <span>/</span>
                        <span className="text-[#002395] font-semibold">Paramètres Système & Règles</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center text-base">
                            <i className="fas fa-sliders"></i>
                        </span>
                        Paramètres Système & Règles Métier
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/admin/marque-blanche"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-300 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition shadow-xs"
                    >
                        <i className="fas fa-palette text-indigo-600"></i>
                        <span>Marque Blanche & Multi-Tenant</span>
                    </Link>
                    <Link
                        to="/admin/securite-mots-de-passe"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-800 bg-red-50 hover:bg-red-100 transition shadow-xs"
                    >
                        <i className="fas fa-key text-red-600"></i>
                        <span>Sécurité Mots de Passe & Accès</span>
                    </Link>
                    <Link
                        to="/admin/securite-mots-de-passe?tab=retention"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100 transition shadow-xs"
                    >
                        <i className="fas fa-database text-purple-600"></i>
                        <span>Gestion Rétention & RGPD</span>
                    </Link>
                    <a
                        href="/DevOps_Documentation_Pack.zip"
                        download="DevOps_Documentation_Pack.zip"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-[#002395] bg-blue-50 hover:bg-blue-100 transition shadow-xs"
                        title="Download full DevOps documentation suite (.docx Word documents + Runbooks in a ZIP archive)"
                    >
                        <i className="fas fa-file-word text-[#002395]"></i>
                        <span>DevOps Docs Pack (.ZIP)</span>
                    </a>
                    <Link
                        to="/admin/regles-metiers"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition"
                    >
                        <i className="fas fa-cogs"></i>
                        <span>Moteur Règles Métier</span>
                    </Link>
                    <Link
                        to="/admin/onglets-referentiels"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                        <i className="fas fa-sliders-h text-amber-700"></i>
                        <span>Onglets & Référentiels</span>
                    </Link>
                </div>
            </div>

            {/* Sub-Tabs: Settings vs Automation Watchdog */}
            <div className="flex items-center gap-3 border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => handleTabChange('settings')}
                    className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        activeTab === 'settings'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <i className="fas fa-sliders text-xs"></i>
                    <span>Paramètres & Seuils Système</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('automation')}
                    className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        activeTab === 'automation'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <i className="fas fa-robot text-xs"></i>
                    <span>Daemon d'Automatisation & SLA Watchdog</span>
                    <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Actif 5 min
                    </span>
                </button>
            </div>

            {/* Embedded Tab Views */}
            {activeTab === 'settings' ? (
                <SystemSettingsManager />
            ) : (
                <AutomationControlCenter />
            )}
        </div>
    );
}
