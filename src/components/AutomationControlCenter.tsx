import React, { useState, useEffect } from 'react';
import { getAutomationStatus, runAutomationCycle, testSiemWebhook } from '../lib/api';
import {
    Activity,
    Play,
    ShieldAlert,
    Clock,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Radio,
    Send,
    BellRing,
    Layers,
    Info
} from 'lucide-react';

export default function AutomationControlCenter() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [runningCycle, setRunningCycle] = useState(false);
    const [testingWebhook, setTestingWebhook] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadStatus = async () => {
        try {
            setLoading(true);
            const res = await getAutomationStatus();
            setStatus(res.data);
        } catch (err: any) {
            console.error('Erreur chargement statut automatisation:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleRunCycle = async () => {
        try {
            setRunningCycle(true);
            setActionMessage(null);
            const res = await runAutomationCycle(false);
            setActionMessage({
                type: 'success',
                text: `Cycle exécuté avec succès : ${res.data?.stats?.checkedRequests || 0} dossiers inspectés, ${res.data?.stats?.breachedCount || 0} dépassements SLA détectés.`
            });
            await loadStatus();
        } catch (err: any) {
            setActionMessage({
                type: 'error',
                text: err.response?.data?.error || "Erreur lors de l'exécution du cycle d'automatisation."
            });
        } finally {
            setRunningCycle(false);
        }
    };

    const handleTestWebhook = async () => {
        try {
            setTestingWebhook(true);
            setActionMessage(null);
            const res = await testSiemWebhook();
            setActionMessage({
                type: res.data?.success ? 'success' : 'error',
                text: res.data?.message || 'Test webhook terminé.'
            });
            await loadStatus();
        } catch (err: any) {
            setActionMessage({
                type: 'error',
                text: err.response?.data?.error || "Erreur lors du test du webhook SIEM."
            });
        } finally {
            setTestingWebhook(false);
        }
    };

    const stats = status?.lastRunStats;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#002395] shrink-0">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-gray-900">
                                Centre d'Automatisation & Surveillance SLA / SIEM
                            </h2>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Daemon Actif (5 min)
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Supervision continue des délais de validation, alertes d'escalade et connecteurs de sécurité NIS 2.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleTestWebhook}
                        disabled={testingWebhook}
                        className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Envoyer un événement de test au webhook externe SIEM / SOC"
                    >
                        {testingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-indigo-600" />}
                        <span>Tester SIEM</span>
                    </button>
                    <button
                        onClick={handleRunCycle}
                        disabled={runningCycle}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        {runningCycle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>Exécuter le cycle</span>
                    </button>
                </div>
            </div>

            {/* Action Feedback Banner */}
            {actionMessage && (
                <div className={`p-4 border-b text-xs flex items-center gap-2 ${
                    actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'
                }`}>
                    {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
                    <span>{actionMessage.text}</span>
                </div>
            )}

            {/* Stats Dashboard Grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <div className="flex items-center justify-between text-slate-500 mb-1.5">
                        <span className="text-xs font-semibold">Dossiers sous SLA</span>
                        <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                        {loading ? '-' : stats?.checkedRequests || 0}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">Demandes actives en cours d'instruction</p>
                </div>

                <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-4">
                    <div className="flex items-center justify-between text-red-600 mb-1.5">
                        <span className="text-xs font-semibold">Dépassements SLA</span>
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-2xl font-black text-red-700">
                        {loading ? '-' : stats?.breachedCount || 0}
                    </div>
                    <p className="text-[11px] text-red-600/80 mt-1">Escalades transmises aux validateurs</p>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                    <div className="flex items-center justify-between text-amber-600 mb-1.5">
                        <span className="text-xs font-semibold">Alertes 80% SLA</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-700">
                        {loading ? '-' : stats?.warningCount || 0}
                    </div>
                    <p className="text-[11px] text-amber-600/80 mt-1">Dossiers proches de l'échéance</p>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-4">
                    <div className="flex items-center justify-between text-indigo-600 mb-1.5">
                        <span className="text-xs font-semibold">Relances Matériel</span>
                        <BellRing className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-indigo-700">
                        {loading ? '-' : stats?.contractRemindersCount || 0}
                    </div>
                    <p className="text-[11px] text-indigo-600/80 mt-1">Contrats de retour &gt; 14 jours</p>
                </div>
            </div>

            {/* Details Table */}
            {stats?.details && stats.details.length > 0 && (
                <div className="px-6 pb-6">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#002395]" />
                        Détail des dossiers sous alerte ({stats.details.length})
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                                <tr>
                                    <th className="py-2.5 px-3">Référence</th>
                                    <th className="py-2.5 px-3">Étape active</th>
                                    <th className="py-2.5 px-3">Rôle Validateur</th>
                                    <th className="py-2.5 px-3">SLA imparti</th>
                                    <th className="py-2.5 px-3">Temps écoulé</th>
                                    <th className="py-2.5 px-3">Statut Alerte</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats.details.map((d: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                                        <td className="py-2.5 px-3 font-bold text-gray-900">{d.reference}</td>
                                        <td className="py-2.5 px-3 text-gray-700">{d.stageName}</td>
                                        <td className="py-2.5 px-3">
                                            <span className="bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                                                {d.validatorRole}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-gray-600">{d.slaHours}h</td>
                                        <td className="py-2.5 px-3 font-semibold text-gray-900">{d.elapsedHours}h</td>
                                        <td className="py-2.5 px-3">
                                            {d.isBreached ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                                    <ShieldAlert className="w-3 h-3 text-red-600" />
                                                    Dépassement SLA
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                    Échéance 80%
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
