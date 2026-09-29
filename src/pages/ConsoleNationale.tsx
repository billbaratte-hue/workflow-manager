/**
 * @file src/pages/ConsoleNationale.tsx
 * National Supervision Console & Macro Operations Center (Epic 4 - User Story 4.2).
 * Macro-level monitoring across all geographic regions, SLA compliance, and national escalations.
 */

import React, { useState } from 'react';

export default function ConsoleNationale() {
    const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
    const [timeWindow, setTimeWindow] = useState<string>('30d');
    const [emergencyLockdownActive, setEmergencyLockdownActive] = useState<boolean>(false);

    const regionalStats = [
        { name: 'Île-de-France', code: 'IDF', activeKeys: 1420, activeSites: 84, pendingValidations: 12, slaCompliance: 98.4, alertLevel: 'NORMAL' },
        { name: 'Auvergne-Rhône-Alpes', code: 'AURA', activeKeys: 890, activeSites: 62, pendingValidations: 5, slaCompliance: 99.1, alertLevel: 'NORMAL' },
        { name: 'Nouvelle-Aquitaine', code: 'NAQ', activeKeys: 540, activeSites: 41, pendingValidations: 3, slaCompliance: 96.8, alertLevel: 'ATTENTION' },
        { name: 'Occitanie', code: 'OCC', activeKeys: 610, activeSites: 47, pendingValidations: 4, slaCompliance: 97.5, alertLevel: 'NORMAL' },
        { name: 'Grand Est', code: 'GES', activeKeys: 720, activeSites: 53, pendingValidations: 8, slaCompliance: 95.2, alertLevel: 'ATTENTION' },
        { name: 'PACA', code: 'PAC', activeKeys: 680, activeSites: 49, pendingValidations: 6, slaCompliance: 98.0, alertLevel: 'NORMAL' }
    ];

    const criticalIncidents = [
        { id: 'INC-2026-081', site: 'Gare Saint-Lazare (Voies Groupe V)', type: 'Perte Clé F9000', severity: 'CRITIQUE', status: 'RÉVOQUÉE', time: 'Il y a 32 min' },
        { id: 'INC-2026-079', site: 'Tunnel sous Fourvière (Lyon)', type: 'Accès Hors Plage Horaire', severity: 'ALERTE', status: 'ENQUÊTE SÛRETÉ', time: 'Il y a 2h' },
        { id: 'INC-2026-077', site: 'Poste Aiguillage Trappes', type: 'Borne Hors Ligne (SLA 4h)', severity: 'AVERTISSEMENT', status: 'TECHNICIEN EN ROUTE', time: 'Il y a 3h' }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* National Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-[#002395] uppercase tracking-widest">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Supervision Centrale • Réseau Multi-Sites
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        Console Nationale des Accès Mécatroniques
                    </h1>
                    <p className="text-sm text-slate-500">
                        Observabilité en temps réel, arbitrage inter-régional et gouvernance de sûreté des accès
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2 text-slate-700 shadow-sm"
                    >
                        <option value="24h">Dernières 24 heures</option>
                        <option value="7d">7 derniers jours</option>
                        <option value="30d">30 derniers jours (Mois)</option>
                        <option value="ytd">Année 2026 complète</option>
                    </select>

                    <button
                        onClick={() => setEmergencyLockdownActive(!emergencyLockdownActive)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow ${
                            emergencyLockdownActive
                                ? 'bg-red-600 text-white hover:bg-red-700 animate-bounce'
                                : 'bg-slate-800 text-white hover:bg-red-900'
                        }`}
                        title="Verrouillage d'urgence national de révocation de certificats"
                    >
                        <i className="fas fa-lock"></i>
                        <span>{emergencyLockdownActive ? 'VERROUILLAGE SÛRETÉ ACTIF' : 'Mesures Sûreté Urgence'}</span>
                    </button>
                </div>
            </div>

            {/* Emergency Banner if toggled */}
            {emergencyLockdownActive && (
                <div className="mb-8 p-4 bg-red-600 text-white rounded-xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-radiation text-2xl"></i>
                        <div>
                            <h3 className="font-bold text-sm uppercase tracking-wide">Procédure Sûreté Nationale Activée</h3>
                            <p className="text-xs text-red-100">
                                Révocation automatique immédiate des certificats de clés temporaires sur tous les terminaux connectés.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setEmergencyLockdownActive(false)}
                        className="px-3 py-1 bg-white text-red-700 font-bold text-xs rounded hover:bg-red-50"
                    >
                        Désactiver
                    </button>
                </div>
            )}

            {/* National KPI Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Parc Clés Actives</span>
                        <i className="fas fa-key text-blue-600 text-lg"></i>
                    </div>
                    <div className="text-3xl font-black text-slate-900">4 860</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-1">
                        <i className="fas fa-arrow-up mr-1"></i> +4.2% ce mois-ci
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Respect SLA National</span>
                        <i className="fas fa-tachometer-alt text-emerald-600 text-lg"></i>
                    </div>
                    <div className="text-3xl font-black text-emerald-600">97.8%</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                        Objectif contractuel : &gt; 95%
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sites Équipés F9000</span>
                        <i className="fas fa-building text-purple-600 text-lg"></i>
                    </div>
                    <div className="text-3xl font-black text-slate-900">336</div>
                    <div className="text-xs text-purple-600 font-semibold mt-1">
                        100% connectés au registre
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Arbitrages Nationaux</span>
                        <i className="fas fa-gavel text-amber-600 text-lg"></i>
                    </div>
                    <div className="text-3xl font-black text-amber-600">38</div>
                    <div className="text-xs text-amber-600 font-semibold mt-1">
                        Dossiers multi-zones en attente
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2 Cols: Regional Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-900">
                            Performances & Volumes par Région Ferroviaire
                        </h2>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-semibold">
                            6 Directions Territoriales
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <th className="pb-3">Région</th>
                                    <th className="pb-3 text-right">Clés Actives</th>
                                    <th className="pb-3 text-right">Sites</th>
                                    <th className="pb-3 text-right">En Attente</th>
                                    <th className="pb-3 text-right">SLA Validations</th>
                                    <th className="pb-3 text-center">État</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {regionalStats.map((reg) => (
                                    <tr key={reg.code} className="hover:bg-slate-50 transition">
                                        <td className="py-3.5 font-bold text-slate-800 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#002395]"></span>
                                            {reg.name} ({reg.code})
                                        </td>
                                        <td className="py-3.5 text-right font-mono text-slate-700">{reg.activeKeys}</td>
                                        <td className="py-3.5 text-right font-mono text-slate-700">{reg.activeSites}</td>
                                        <td className="py-3.5 text-right font-bold text-amber-600">{reg.pendingValidations}</td>
                                        <td className="py-3.5 text-right font-mono font-bold text-emerald-600">
                                            {reg.slaCompliance}%
                                        </td>
                                        <td className="py-3.5 text-center">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                reg.alertLevel === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {reg.alertLevel}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 1 Col: Live Security & Audit Feed */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-base font-bold text-slate-900">
                            Événements de Sécurité Récents
                        </h2>
                        <i className="fas fa-shield-alt text-[#002395]"></i>
                    </div>

                    <div className="space-y-4">
                        {criticalIncidents.map(inc => (
                            <div key={inc.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50/50 transition">
                                <div className="flex justify-between items-start">
                                    <span className="font-mono text-xs font-bold text-slate-700">{inc.id}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                                        {inc.severity}
                                    </span>
                                </div>
                                <div className="text-xs font-bold text-slate-800 mt-1">{inc.type}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{inc.site}</div>
                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                                    <span>{inc.time}</span>
                                    <span className="font-semibold text-[#002395]">{inc.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200">
                        <a
                            href="/admin/syslog"
                            className="block text-center text-xs font-bold text-[#002395] hover:underline"
                        >
                            Accéder au Journal d'Audit NIS 2 Complet →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
