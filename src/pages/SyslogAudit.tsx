import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import { useFeatures } from '../context/FeaturesContext';
import { Link } from 'react-router-dom';

const syslogHelpSections: HelpSection[] = [
    {
        title: "Audit et Conformité Sûreté",
        badge: "Sécurité SI",
        description: "Enregistrement chronologique inaltérable de chaque action administrative ou modification de droits effectuée dans le système.",
        tips: [
            "Conforme aux exigences d'audit et de traçabilité des accès de sécurité et de la directive NIS 2",
            "Consigne l'acteur, le rôle, l'action spécifique et le détail des paramètres altérés"
        ]
    }
];

export default function SyslogAudit() {
    const { isFeatureEnabled, toggleFeature } = useFeatures();
    const isSyslogEnabled = isFeatureEnabled('syslog_audit_nis2');

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReactivating, setIsReactivating] = useState(false);

    const load = () => {
        setLoading(true);
        getAuditLogs().then(res => {
            setLogs(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { 
        if (isSyslogEnabled) {
            load(); 
        } else {
            setLoading(false);
        }
    }, [isSyslogEnabled]);

    const handleReactivate = async () => {
        setIsReactivating(true);
        try {
            await toggleFeature('syslog_audit_nis2', true);
            load();
        } catch (err) {
            console.error("Erreur de réactivation:", err);
        } finally {
            setIsReactivating(false);
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Journal d'Audit & Syslog</h1>
                    <p className="text-sm text-gray-500">Traçabilité légale, actions sensibles et événements système</p>
                </div>
                <div className="flex items-center gap-2">
                    <PageHelpButton
                        pageTitle="Journal d'Audit & Syslog"
                        pageCategory="Conformité SI"
                        description="Consultez les événements de traçabilité et logs d'audit du système."
                        sections={syslogHelpSections}
                    />
                    {isSyslogEnabled && (
                        <button onClick={load} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded border flex items-center gap-1 cursor-pointer">
                            <i className="fas fa-sync-alt"></i> Actualiser
                        </button>
                    )}
                </div>
            </div>

            {!isSyslogEnabled && (
                <div className="mb-6 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                        <i className="fas fa-shield-alt text-rose-600 text-lg mt-0.5"></i>
                        <div>
                            <h3 className="text-sm font-bold">Module Syslog & Audit NIS 2 Désactivé</h3>
                            <p className="text-xs text-rose-800 mt-0.5">
                                La consultation et le flux en direct du journal d'audit de sécurité sont temporairement suspendus depuis la console des fonctionnalités.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleReactivate}
                            disabled={isReactivating}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <i className="fas fa-power-off"></i>
                            <span>{isReactivating ? 'Réactivation...' : 'Réactiver ce module'}</span>
                        </button>
                        <Link
                            to="/admin/onglets-referentiels?section=features"
                            className="text-xs text-rose-800 underline hover:text-rose-950 font-medium px-2 py-1"
                        >
                            Gérer les modules
                        </Link>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horodatage</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acteur</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cible</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 font-mono text-xs">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Chargement des logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Aucun log enregistré.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                                    <td className="px-4 py-2.5 text-blue-800 font-semibold">{log.actor} ({log.role})</td>
                                    <td className="px-4 py-2.5"><span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-semibold">{log.action}</span></td>
                                    <td className="px-4 py-2.5 text-gray-700">{log.target}</td>
                                    <td className="px-4 py-2.5 text-gray-600 truncate max-w-xs">{log.details}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
