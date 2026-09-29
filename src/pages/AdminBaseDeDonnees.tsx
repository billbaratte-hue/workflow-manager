import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { runGdprRetention, getGdprRetentionStatus } from '../lib/api';

interface BackupItem {
    filename: string;
    filePath: string;
    size: number;
    createdAt: string;
}

export default function AdminBaseDeDonnees() {
    const [activeTab, setActiveTab] = useState<'BACKUPS' | 'RGPD'>('BACKUPS');
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);
    const [restoreMode, setRestoreMode] = useState<'override' | 'merge'>('override');
    const [confirmText, setConfirmText] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [customBackupPath, setCustomBackupPath] = useState('');

    // GDPR Retention State (US 3.4)
    const [rejectedRetentionDays, setRejectedRetentionDays] = useState<number>(180);
    const [completedRetentionDays, setCompletedRetentionDays] = useState<number>(1095);
    const [anonymizeOnly, setAnonymizeOnly] = useState<boolean>(true);
    const [retentionReport, setRetentionReport] = useState<any>(null);
    const [isRunningRetention, setIsRunningRetention] = useState<boolean>(false);

    const token = localStorage.getItem('token');

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/admin/db/backups', {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBackups(data);
            }
        } catch (err) {
            console.error('Erreur chargement sauvegardes:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRetentionStatus = async () => {
        if (!token) return;
        try {
            const res = await getGdprRetentionStatus();
            if (res.data?.policy) {
                setRejectedRetentionDays(res.data.policy.rejectedDossiersRetentionDays);
                setCompletedRetentionDays(res.data.policy.completedDossiersRetentionDays);
                setAnonymizeOnly(res.data.policy.anonymizeOnly);
            }
        } catch (err) {
            console.warn('Erreur chargement statut rétention:', err);
        }
    };

    useEffect(() => {
        fetchBackups();
        fetchRetentionStatus();
    }, []);

    const handleCreateBackup = async () => {
        setLoading(true);
        setActionStatus({ type: 'info', message: 'Génération de l\'archive de sauvegarde en cours...' });
        try {
            const res = await fetch('/api/v1/admin/db/backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const data = await res.json();
            if (res.ok) {
                setActionStatus({
                    type: 'success',
                    message: `Sauvegarde créée avec succès : ${data.backup?.metadata?.totalRecords || 0} enregistrements archivés (SHA-256 certifié).`
                });
                await fetchBackups();
            } else {
                setActionStatus({ type: 'error', message: data.error || 'Erreur lors de la création de la sauvegarde.' });
            }
        } catch (err: any) {
            setActionStatus({ type: 'error', message: err.message || 'Erreur réseau.' });
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteRestore = async () => {
        if (confirmText !== 'RESTAURER') {
            setActionStatus({ type: 'error', message: 'Veuillez saisir "RESTAURER" pour confirmer l\'opération.' });
            return;
        }

        const targetPath = selectedBackupForRestore ? selectedBackupForRestore.filePath : customBackupPath;
        if (!targetPath) {
            setActionStatus({ type: 'error', message: 'Aucun chemin de sauvegarde spécifié.' });
            return;
        }

        setIsRestoring(true);
        try {
            const res = await fetch('/api/v1/admin/db/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    backupPath: targetPath,
                    mode: restoreMode
                })
            });

            const data = await res.json();
            if (res.ok) {
                setActionStatus({
                    type: 'success',
                    message: `Restauration réussie : ${data.result?.tablesRestored?.length || 0} tables réalignées (${restoreMode}).`
                });
                setSelectedBackupForRestore(null);
                setConfirmText('');
                await fetchBackups();
            } else {
                setActionStatus({ type: 'error', message: data.error || 'Erreur lors de la restauration.' });
            }
        } catch (err: any) {
            setActionStatus({ type: 'error', message: err.message || 'Erreur critique lors de la restauration.' });
        } finally {
            setIsRestoring(false);
        }
    };

    const handleSeedStandardProcesses = async () => {
        if (!window.confirm('Voulez-vous réinitialiser et charger le catalogue officiel des processus d\'accès ?')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/v1/admin/processus/seed-standard', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (res.ok) {
                setActionStatus({ type: 'success', message: 'Catalogue des processus d\'accès réinitialisé avec succès.' });
            } else {
                setActionStatus({ type: 'error', message: 'Échec de la réinitialisation du catalogue des processus.' });
            }
        } catch (err: any) {
            setActionStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Trigger GDPR Retention Cycle (US 3.4)
    const handleRunRetention = async () => {
        setIsRunningRetention(true);
        setActionStatus({ type: 'info', message: 'Exécution du cycle de rétention & anonymisation RGPD...' });
        try {
            const res = await runGdprRetention({
                rejectedDossiersRetentionDays: Number(rejectedRetentionDays),
                completedDossiersRetentionDays: Number(completedRetentionDays),
                anonymizeOnly
            });
            if (res.data?.report) {
                setRetentionReport(res.data.report);
                setActionStatus({
                    type: 'success',
                    message: `Cycle RGPD exécuté avec succès : ${res.data.report.inspectedCount} dossiers analysés, ${res.data.report.anonymizedCount} anonymisés, ${res.data.report.purgedCount} purgés.`
                });
            }
        } catch (err: any) {
            setActionStatus({ type: 'error', message: err.response?.data?.error || err.message || 'Erreur lors du cycle RGPD.' });
        } finally {
            setIsRunningRetention(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Link to="/admin" className="hover:text-[#002395] transition">Administration</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">Système & Infrastructure</span>
                        <span>/</span>
                        <span className="text-[#002395] font-semibold">Base de Données & RGPD</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-base">
                            <i className="fas fa-database"></i>
                        </span>
                        Gestion & Sauvegardes Base de Données
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Gouvernance des Données & Conformité RGPD (US 3.4)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'BACKUPS' ? (
                        <>
                            <button
                                onClick={handleSeedStandardProcesses}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100 transition shadow-xs cursor-pointer"
                            >
                                <i className="fas fa-seedling"></i>
                                <span>Réinitialiser Processus Standards</span>
                            </button>
                            <button
                                onClick={handleCreateBackup}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#002395] text-white hover:bg-[#001a70] transition shadow-xs cursor-pointer"
                            >
                                <i className="fas fa-save"></i>
                                <span>Nouvelle Sauvegarde Immédiate</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleRunRetention}
                            disabled={isRunningRetention}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#002395] text-white hover:bg-[#001a70] transition shadow-xs cursor-pointer"
                        >
                            <i className={`fas fa-shield-alt ${isRunningRetention ? 'fa-spin' : ''}`}></i>
                            <span>{isRunningRetention ? 'Traitement RGPD...' : 'Exécuter le Cycle RGPD Immédiat'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Alert */}
            {actionStatus && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    actionStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    actionStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' :
                    'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                    <div className="flex items-center gap-3">
                        <i className={`fas ${actionStatus.type === 'success' ? 'fa-check-circle text-emerald-600' : actionStatus.type === 'error' ? 'fa-exclamation-circle text-red-600' : 'fa-info-circle text-blue-600'}`}></i>
                        <span className="text-xs font-semibold">{actionStatus.message}</span>
                    </div>
                    <button onClick={() => setActionStatus(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Tab Selector */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
                <button
                    onClick={() => setActiveTab('BACKUPS')}
                    className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                        activeTab === 'BACKUPS'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <i className="fas fa-archive"></i>
                    <span>Sauvegardes & Restauration Système (US 1.1 / 1.2)</span>
                    <span className="text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-semibold">
                        {backups.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('RGPD')}
                    className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                        activeTab === 'RGPD'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <i className="fas fa-user-shield"></i>
                    <span>Rétention des Données & Anonymisation RGPD (US 3.4)</span>
                    <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-semibold">
                        Conforme NIS 2
                    </span>
                </button>
            </div>

            {/* TAB 1: SAUVEGARDES & RESTAURATION */}
            {activeTab === 'BACKUPS' && (
                <>
                    {/* System Engine Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Moteur de Données</span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-semibold">Actif</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-server text-indigo-600"></i>
                                <span>SQLite WAL / PostgreSQL</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Journalisation Write-Ahead Logging & transactions ACID certifiées.</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Archives Existantes</span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-semibold">{backups.length} instantanés</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-archive text-blue-600"></i>
                                <span>./backups/</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Intégrité cryptographique SHA-256 avec sidecars de vérification.</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Conformité Sécurité</span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-semibold">NIS 2 / ISO 27001</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-shield-alt text-purple-600"></i>
                                <span>Restauration Sécurisée</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Traçabilité complète dans les journaux d'audit de sécurité ferroviaire.</p>
                        </div>
                    </div>

                    {/* Backups Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-history text-gray-600"></i>
                                <span>Historique des Sauvegardes & Snapshots Système</span>
                            </h2>
                            <button
                                onClick={fetchBackups}
                                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                                <span>Actualiser</span>
                            </button>
                        </div>

                        {backups.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <i className="fas fa-database text-4xl text-gray-300 mb-3"></i>
                                <p className="text-sm font-medium">Aucune sauvegarde locale disponible pour le moment.</p>
                                <p className="text-xs text-gray-400 mt-1">Cliquez sur « Nouvelle Sauvegarde Immédiate » pour créer un instantané complet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200 uppercase tracking-wider">
                                            <th className="py-3 px-4">Fichier d'Archive</th>
                                            <th className="py-3 px-4">Date de Création</th>
                                            <th className="py-3 px-4">Taille</th>
                                            <th className="py-3 px-4">Type</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-gray-700 font-medium">
                                        {backups.map((b) => (
                                            <tr key={b.filename} className="hover:bg-gray-50/80 transition">
                                                <td className="py-3 px-4 flex items-center gap-2">
                                                    <i className="fas fa-file-code text-indigo-600"></i>
                                                    <span className="font-mono text-gray-900">{b.filename}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {new Date(b.createdAt).toLocaleString('fr-FR')}
                                                </td>
                                                <td className="py-3 px-4 font-mono">
                                                    {(b.size / 1024).toFixed(1)} Ko
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800">
                                                        JSON + SHA-256
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => setSelectedBackupForRestore(b)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 font-semibold transition cursor-pointer"
                                                        title="Restaurer cette version"
                                                    >
                                                        <i className="fas fa-undo"></i>
                                                        <span>Restaurer</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TAB 2: RÉTENTION DES DONNÉES & CONFORMITÉ RGPD (US 3.4) */}
            {activeTab === 'RGPD' && (
                <div className="space-y-6">
                    {/* Policy Banner */}
                    <div className="p-5 rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 via-teal-50 to-white shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                                <i className="fas fa-shield-alt text-emerald-700 text-base"></i>
                                Politique Légale de Rétention des Données Personnelles (RGPD & Délibération CNIL)
                            </span>
                            <span className="text-xs font-mono font-bold bg-white text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                                US 3.4 RGPD DAEMON
                            </span>
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed max-w-4xl">
                            Conformément au RGPD et aux politiques de gouvernance et de sécurité des accès, les dossiers d'accès aux infrastructures et emprises
                            sont automatiquement purgés ou anonymisés dès expiration de leur durée d'utilité administrative (DUA).
                            Les identifiants personnels (noms, matricules, téléphones) sont irréversiblement écrasés tout en préservant
                            l'intégrité statistique NIS 2.
                        </p>
                    </div>

                    {/* Retention Settings & Trigger Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-sliders-h text-[#002395]"></i>
                                Paramétrage des Délais de Conservation
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                    <label className="block text-xs font-bold text-gray-800">
                                        Dossiers Refusés / Annulés (Jours) :
                                    </label>
                                    <input
                                        type="number"
                                        value={rejectedRetentionDays}
                                        onChange={(e) => setRejectedRetentionDays(Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white"
                                    />
                                    <span className="text-[10px] text-gray-500 block">
                                        Délai recommandé : <strong>180 jours (6 mois)</strong> pour contestations éventuelles.
                                    </span>
                                </div>

                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                    <label className="block text-xs font-bold text-gray-800">
                                        Dossiers Validés / Clôturés (Jours) :
                                    </label>
                                    <input
                                        type="number"
                                        value={completedRetentionDays}
                                        onChange={(e) => setCompletedRetentionDays(Number(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white"
                                    />
                                    <span className="text-[10px] text-gray-500 block">
                                        Délai légal : <strong>1095 jours (3 ans)</strong> pour traçabilité décennale NIS 2.
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                                <div>
                                    <span className="block text-xs font-bold text-gray-900">Mode d'Action : Anonymisation des PII</span>
                                    <span className="text-[11px] text-gray-500">
                                        Conserve le dossier et ses statistiques tout en anonymisant les données nominatives
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={anonymizeOnly}
                                        onChange={(e) => setAnonymizeOnly(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            <div className="pt-2 flex items-center justify-end">
                                <button
                                    onClick={handleRunRetention}
                                    disabled={isRunningRetention}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                                >
                                    <i className={`fas fa-play ${isRunningRetention ? 'fa-spin' : ''}`}></i>
                                    <span>{isRunningRetention ? 'Cycle en cours...' : 'Exécuter le Cycle de Régularisation RGPD'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-check-double text-emerald-600"></i>
                                Statut du Moteur de Rétention
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Statut du Service :</span>
                                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ACTIF (Auto)
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Chiffrement en Base :</span>
                                    <span className="font-semibold text-gray-800">AES-256 / SHA-256</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Journalisation Audit :</span>
                                    <span className="font-semibold text-gray-800">Table audit_logs immuable</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                    <span className="text-gray-500">Registre des Traitements :</span>
                                    <span className="font-semibold text-emerald-800">Conforme Article 30</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Execution Report Card */}
                    {retentionReport && (
                        <div className="bg-white rounded-xl border border-emerald-300 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-file-alt text-emerald-700"></i>
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                                        Rapport d'Exécution du Cycle RGPD
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono text-emerald-800 font-semibold">
                                    {new Date(retentionReport.timestamp).toLocaleString('fr-FR')}
                                </span>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                        <span className="text-xs text-gray-500 font-medium block">Dossiers Inspectés</span>
                                        <span className="text-2xl font-black text-gray-900 mt-1 block">
                                            {retentionReport.inspectedCount}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                                        <span className="text-xs text-blue-700 font-medium block">Anonymisations Réalisées</span>
                                        <span className="text-2xl font-black text-blue-900 mt-1 block">
                                            {retentionReport.anonymizedCount}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                                        <span className="text-xs text-purple-700 font-medium block">Purges Définitives</span>
                                        <span className="text-2xl font-black text-purple-900 mt-1 block">
                                            {retentionReport.purgedCount}
                                        </span>
                                    </div>
                                </div>

                                {retentionReport.affectedReferences && retentionReport.affectedReferences.length > 0 && (
                                    <div className="pt-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                            Références Traitées au cours de ce cycle :
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {retentionReport.affectedReferences.map((ref: string) => (
                                                <span key={ref} className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800">
                                                    {ref}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Restore Confirmation Modal */}
            <Modal
                isOpen={!!selectedBackupForRestore}
                onClose={() => { setSelectedBackupForRestore(null); setConfirmText(''); }}
                title="Restauration Sécurisée de la Base de Données"
            >
                <div className="space-y-4 text-sm text-gray-700">
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed">
                        <strong className="block font-bold mb-1">
                            <i className="fas fa-exclamation-triangle mr-1.5"></i>
                            Attention : Opération Critique d'Infrastructure
                        </strong>
                        La restauration remplace ou fusionne les tables du portail mécatronique avec l'instantané sélectionné. 
                        Toutes les sessions actives et les enregistrements non sauvegardés seront réalignés.
                    </div>

                    {selectedBackupForRestore && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1 font-mono">
                            <div><strong>Archive :</strong> {selectedBackupForRestore.filename}</div>
                            <div><strong>Date :</strong> {new Date(selectedBackupForRestore.createdAt).toLocaleString('fr-FR')}</div>
                            <div><strong>Taille :</strong> {(selectedBackupForRestore.size / 1024).toFixed(1)} Ko</div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Mode de Restauration :</label>
                        <select
                            value={restoreMode}
                            onChange={(e) => setRestoreMode(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#002395] focus:outline-hidden"
                        >
                            <option value="override">Remplacement complet des tables (Recommandé)</option>
                            <option value="merge">Fusion incrémentale (Conserve les nouveaux enregistrements)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Saisissez <span className="font-mono text-red-700">RESTAURER</span> pour confirmer :
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="RESTAURER"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono uppercase focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => { setSelectedBackupForRestore(null); setConfirmText(''); }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            disabled={confirmText !== 'RESTAURER' || isRestoring}
                            onClick={handleExecuteRestore}
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                            <i className={`fas fa-undo ${isRestoring ? 'fa-spin' : ''}`}></i>
                            <span>{isRestoring ? 'Restauration en cours...' : 'Confirmer la Restauration'}</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
