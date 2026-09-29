/**
 * @file src/pages/AdminSecuriteMotsDePasse.tsx
 * Panneau d'Administration : Sécurité des Accès, Politique des Mots de Passe & Gestion de la Rétention RGPD
 * 100% Configurable & Connecté au moteur de paramètres système (Directive NIS 2 / Politiques de Sûreté).
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export interface PasswordAccessSettings {
    password_min_length: number;
    password_max_length: number;
    uppercase_required: boolean;
    lowercase_required: boolean;
    special_char_required: boolean;
    number_required: boolean;
    login_attempts_limit: number;
    password_validity_days: number;
    password_recovery: boolean;
    password_recovery_link_validity_days: number;
    enforce_password_history: number;
}

export interface DataRetentionSettings {
    rejected_dossiers_retention_days: number;
    completed_dossiers_retention_days: number;
    audit_logs_retention_days: number;
    inactive_accounts_retention_days: number;
    anonymize_only: boolean;
    auto_schedule_enabled: boolean;
}

const DEFAULT_PASSWORD_POLICY: PasswordAccessSettings = {
    password_min_length: 5,
    password_max_length: 15,
    uppercase_required: true,
    lowercase_required: true,
    special_char_required: true,
    number_required: true,
    login_attempts_limit: 5,
    password_validity_days: 120,
    password_recovery: true,
    password_recovery_link_validity_days: 4,
    enforce_password_history: 1
};

const DEFAULT_RETENTION_POLICY: DataRetentionSettings = {
    rejected_dossiers_retention_days: 180,
    completed_dossiers_retention_days: 1095,
    audit_logs_retention_days: 365,
    inactive_accounts_retention_days: 730,
    anonymize_only: true,
    auto_schedule_enabled: true
};

export default function AdminSecuriteMotsDePasse() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'passwords' | 'retention'>(
        tabParam === 'retention' ? 'retention' : 'passwords'
    );
    const [passwordSettings, setPasswordSettings] = useState<PasswordAccessSettings>(DEFAULT_PASSWORD_POLICY);
    const [retentionSettings, setRetentionSettings] = useState<DataRetentionSettings>(DEFAULT_RETENTION_POLICY);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [runningRetention, setRunningRetention] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [lastRetentionReport, setLastRetentionReport] = useState<any>(null);

    // Simulateur de mot de passe interactif
    const [testPassword, setTestPassword] = useState<string>('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (tabParam === 'retention' || tabParam === 'passwords') {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: 'passwords' | 'retention') => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 6000);
    };

    // Chargement initial des configurations depuis l'API Settings
    const loadAllSettings = async () => {
        setLoading(true);
        try {
            const [settingsRes, retentionStatusRes] = await Promise.allSettled([
                fetch('/api/v1/admin/settings'),
                fetch('/api/v1/admin/retention/status', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                })
            ]);

            if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
                const allSettings = await settingsRes.value.json();
                if (Array.isArray(allSettings)) {
                    const pwdSetting = allSettings.find((s: any) => s.key === 'password_access_policy');
                    if (pwdSetting && pwdSetting.parsed_value) {
                        setPasswordSettings({ ...DEFAULT_PASSWORD_POLICY, ...pwdSetting.parsed_value });
                    }

                    const retSetting = allSettings.find((s: any) => s.key === 'data_retention_policy');
                    if (retSetting && retSetting.parsed_value) {
                        setRetentionSettings({ ...DEFAULT_RETENTION_POLICY, ...retSetting.parsed_value });
                    }
                }
            }

            if (retentionStatusRes.status === 'fulfilled' && retentionStatusRes.value.ok) {
                const statusData = await retentionStatusRes.value.json();
                if (statusData.lastReport) {
                    setLastRetentionReport(statusData.lastReport);
                }
                if (statusData.policy) {
                    setRetentionSettings(prev => ({ ...prev, ...statusData.policy }));
                }
            }
        } catch (e: any) {
            console.warn('Failed to fetch security settings, using defaults:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllSettings();
    }, []);

    // Sauvegarde de la politique des mots de passe
    const handleSavePasswordSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/v1/admin/settings/password_access_policy', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    value: passwordSettings,
                    category: 'security',
                    description: 'Politique de sécurité des mots de passe, accès et verrouillage de compte (NIS 2)'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Erreur lors de la sauvegarde');
            }

            window.dispatchEvent(new CustomEvent('portal_password_policy_updated', { detail: passwordSettings }));
            showFeedback('success', 'Politique de sécurité des mots de passe mise à jour avec succès.');
        } catch (err: any) {
            showFeedback('error', err.message || 'Impossible d\'enregistrer la politique des mots de passe.');
        } finally {
            setSaving(false);
        }
    };

    // Sauvegarde des paramètres de rétention
    const handleSaveRetentionSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/v1/admin/settings/data_retention_policy', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    value: retentionSettings,
                    category: 'rgpd',
                    description: 'Règles et durées de rétention des données personnelles et historiques (RGPD / NIS 2)'
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Erreur lors de la sauvegarde');
            }

            showFeedback('success', 'Politique de rétention et purge RGPD enregistrée avec succès.');
        } catch (err: any) {
            showFeedback('error', err.message || 'Impossible d\'enregistrer la politique de rétention.');
        } finally {
            setSaving(false);
        }
    };

    // Exécution manuelle immédiate d'un cycle de rétention
    const handleRunRetentionCycle = async () => {
        if (!window.confirm('Confirmez-vous le lancement d\'un cycle de rétention RGPD sur l\'ensemble des dossiers mécatroniques selon les délais configurés ?')) {
            return;
        }

        setRunningRetention(true);
        try {
            const res = await fetch('/api/v1/admin/retention/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    rejectedDossiersRetentionDays: retentionSettings.rejected_dossiers_retention_days,
                    completedDossiersRetentionDays: retentionSettings.completed_dossiers_retention_days,
                    anonymizeOnly: retentionSettings.anonymize_only
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Échec de l\'exécution du cycle de rétention.');
            }

            const data = await res.json();
            setLastRetentionReport(data.report);
            showFeedback('success', `Cycle de rétention exécuté : ${data.report.anonymizedCount} dossier(s) anonymisé(s), ${data.report.purgedCount} purgé(s).`);
        } catch (err: any) {
            showFeedback('error', err.message || 'Erreur lors de l\'exécution de la rétention.');
        } finally {
            setRunningRetention(false);
        }
    };

    // Vérification dynamique du mot de passe testé
    const testMinLength = testPassword.length >= passwordSettings.password_min_length;
    const testMaxLength = testPassword.length <= passwordSettings.password_max_length;
    const testUppercase = !passwordSettings.uppercase_required || /[A-Z]/.test(testPassword);
    const testLowercase = !passwordSettings.lowercase_required || /[a-z]/.test(testPassword);
    const testNumber = !passwordSettings.number_required || /[0-9]/.test(testPassword);
    const testSpecial = !passwordSettings.special_char_required || /[^A-Za-z0-9]/.test(testPassword);
    const isTestValid = testPassword.length > 0 && testMinLength && testMaxLength && testUppercase && testLowercase && testNumber && testSpecial;

    return (
        <div className="space-y-6">
            {/* Fil d'Ariane & En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Link to="/admin" className="hover:text-[#002395] transition">Espace Administrateur</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">Sécurité & Habilitations</span>
                        <span>/</span>
                        <span className="text-[#002395] font-semibold">Politique Mots de Passe & Rétention</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg bg-blue-100 text-[#002395] flex items-center justify-center text-base">
                            <i className="fas fa-key"></i>
                        </span>
                        Sécurité des Accès & Politique de Rétention
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Gouvernance centralisée des règles de complexité, verrous d'accès et cycle de vie des données (Directive NIS 2 / RGPD)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 border border-emerald-300">
                        <i className="fas fa-shield-halved"></i>
                        <span>Directive NIS 2</span>
                    </span>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1.5 border border-indigo-300">
                        <i className="fas fa-lock"></i>
                        <span>Zero-Hardcode</span>
                    </span>
                </div>
            </div>

            {/* Notification de succès ou d'erreur */}
            {feedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn ${
                    feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-triangle text-red-600'} text-base`}></i>
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Onglets de configuration */}
            <div className="flex border-b border-gray-200 gap-4">
                <button
                    data-testid="tab-passwords"
                    onClick={() => handleTabChange('passwords')}
                    className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        activeTab === 'passwords'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <i className="fas fa-shield-alt"></i>
                    <span>Politique des Mots de Passe & Accès</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#002395] font-mono">11 critères</span>
                </button>

                <button
                    data-testid="tab-retention"
                    onClick={() => handleTabChange('retention')}
                    className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        activeTab === 'retention'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <i className="fas fa-database"></i>
                    <span>Gestion de la Rétention & RGPD</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">Cycle de vie</span>
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-xs">
                    <i className="fas fa-spinner fa-spin text-2xl text-[#002395] mb-3"></i>
                    <p className="text-xs text-gray-500">Chargement des paramètres de sécurité...</p>
                </div>
            ) : (
                <>
                    {/* SECTION 1 : POLITIQUE DES MOTS DE PASSE & ACCÈS */}
                    {activeTab === 'passwords' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <form onSubmit={handleSavePasswordSettings} className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs space-y-6">
                                    <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <i className="fas fa-user-lock text-[#002395]"></i>
                                                Paramètres de Complexité & Sécurité des Comptes
                                            </h2>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Règles appliquées automatiquement lors de l'inscription d'un agent et lors des modifications de mot de passe.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Grille des 11 critères de mot de passe */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* 1. Password minimum length */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-min-len" className="text-xs font-bold text-gray-700">
                                                    Password minimum length
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: 5
                                                </span>
                                            </div>
                                            <input
                                                id="pwd-min-len"
                                                type="number"
                                                min={3}
                                                max={30}
                                                value={passwordSettings.password_min_length}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, password_min_length: parseInt(e.target.value) || 5 }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                            />
                                            <p className="text-[10px] text-gray-500">Nombre minimal de caractères imposé.</p>
                                        </div>

                                        {/* 2. Password maximum length */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-max-len" className="text-xs font-bold text-gray-700">
                                                    Password maximum length
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: 15
                                                </span>
                                            </div>
                                            <input
                                                id="pwd-max-len"
                                                type="number"
                                                min={6}
                                                max={64}
                                                value={passwordSettings.password_max_length}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, password_max_length: parseInt(e.target.value) || 15 }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                            />
                                            <p className="text-[10px] text-gray-500">Longueur maximale autorisée du mot de passe.</p>
                                        </div>

                                        {/* 3. Upper case char required */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-upper" className="text-xs font-bold text-gray-700">
                                                    Upper case char required
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: Yes
                                                </span>
                                            </div>
                                            <select
                                                id="pwd-upper"
                                                value={passwordSettings.uppercase_required ? 'Yes' : 'No'}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, uppercase_required: e.target.value === 'Yes' }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Yes">Yes (Obligatoire)</option>
                                                <option value="No">No (Facultatif)</option>
                                            </select>
                                            <p className="text-[10px] text-gray-500">Exige au moins une majuscule (A-Z).</p>
                                        </div>

                                        {/* 4. Lower case char required */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-lower" className="text-xs font-bold text-gray-700">
                                                    Lower case char required
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: Yes
                                                </span>
                                            </div>
                                            <select
                                                id="pwd-lower"
                                                value={passwordSettings.lowercase_required ? 'Yes' : 'No'}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, lowercase_required: e.target.value === 'Yes' }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Yes">Yes (Obligatoire)</option>
                                                <option value="No">No (Facultatif)</option>
                                            </select>
                                            <p className="text-[10px] text-gray-500">Exige au moins une minuscule (a-z).</p>
                                        </div>

                                        {/* 5. Special char required */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-special" className="text-xs font-bold text-gray-700">
                                                    Special char required
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: Yes
                                                </span>
                                            </div>
                                            <select
                                                id="pwd-special"
                                                value={passwordSettings.special_char_required ? 'Yes' : 'No'}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, special_char_required: e.target.value === 'Yes' }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Yes">Yes (Obligatoire)</option>
                                                <option value="No">No (Facultatif)</option>
                                            </select>
                                            <p className="text-[10px] text-gray-500">Exige au moins un caractère spécial (@, #, !, ?, etc.).</p>
                                        </div>

                                        {/* 6. Number required */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-number" className="text-xs font-bold text-gray-700">
                                                    Number required
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: Yes
                                                </span>
                                            </div>
                                            <select
                                                id="pwd-number"
                                                value={passwordSettings.number_required ? 'Yes' : 'No'}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, number_required: e.target.value === 'Yes' }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Yes">Yes (Obligatoire)</option>
                                                <option value="No">No (Facultatif)</option>
                                            </select>
                                            <p className="text-[10px] text-gray-500">Exige au moins un chiffre (0-9).</p>
                                        </div>

                                        {/* 7. Login attempts limit */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-attempts" className="text-xs font-bold text-gray-700">
                                                    Login attempts limit
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: 5
                                                </span>
                                            </div>
                                            <input
                                                id="pwd-attempts"
                                                type="number"
                                                min={1}
                                                max={20}
                                                value={passwordSettings.login_attempts_limit}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, login_attempts_limit: parseInt(e.target.value) || 5 }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            />
                                            <p className="text-[10px] text-gray-500">Nombre d'essais infructueux avant verrouillage temporaire.</p>
                                        </div>

                                        {/* 8. Password validity (days) */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-validity" className="text-xs font-bold text-gray-700">
                                                    Password validity (days)
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: 120
                                                </span>
                                            </div>
                                            <input
                                                id="pwd-validity"
                                                type="number"
                                                min={15}
                                                max={365}
                                                value={passwordSettings.password_validity_days}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, password_validity_days: parseInt(e.target.value) || 120 }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            />
                                            <p className="text-[10px] text-gray-500">Fréquence de renouvellement obligatoire du mot de passe.</p>
                                        </div>

                                        {/* 9. Password recovery */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-recovery" className="text-xs font-bold text-gray-700">
                                                    Password recovery
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: Yes
                                                </span>
                                            </div>
                                            <select
                                                id="pwd-recovery"
                                                value={passwordSettings.password_recovery ? 'Yes' : 'No'}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, password_recovery: e.target.value === 'Yes' }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Yes">Yes (Activé)</option>
                                                <option value="No">No (Désactivé)</option>
                                            </select>
                                            <p className="text-[10px] text-gray-500">Autorise la réinitialisation autonome par lien sécurisé.</p>
                                        </div>

                                        {/* 10. Password recovery link validity (days) */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-rec-link" className="text-xs font-bold text-gray-700">
                                                    Password recovery link validity (days)
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: 4
                                                </span>
                                            </div>
                                            <input
                                                id="pwd-rec-link"
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={passwordSettings.password_recovery_link_validity_days}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, password_recovery_link_validity_days: parseInt(e.target.value) || 4 }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            />
                                            <p className="text-[10px] text-gray-500">Durée de validité du jeton de réinitialisation reçu par email.</p>
                                        </div>

                                        {/* 11. Enforce Password History */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5 md:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="pwd-history" className="text-xs font-bold text-gray-700">
                                                    Enforce Password History
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-mono rounded">
                                                    Défaut: 1
                                                </span>
                                            </div>
                                            <input
                                                id="pwd-history"
                                                type="number"
                                                min={0}
                                                max={10}
                                                value={passwordSettings.enforce_password_history}
                                                onChange={e => setPasswordSettings(prev => ({ ...prev, enforce_password_history: parseInt(e.target.value) || 1 }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                            />
                                            <p className="text-[10px] text-gray-500">Interdit la réutilisation des N derniers mots de passe mémorisés.</p>
                                        </div>
                                    </div>

                                    {/* Actions formulaire */}
                                    <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPasswordSettings(DEFAULT_PASSWORD_POLICY)}
                                            className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                        >
                                            <i className="fas fa-undo mr-1.5"></i>
                                            Rétablir valeurs par défaut
                                        </button>

                                        <button
                                            type="submit"
                                            data-testid="save-password-settings"
                                            disabled={saving}
                                            className="px-5 py-2.5 bg-[#002395] hover:bg-blue-800 text-white font-bold rounded-lg text-sm transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    <span>Enregistrement...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save"></i>
                                                    <span>Enregistrer la Politique d'Accès</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Simulateur interactif de mot de passe en temps réel */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
                                    <div className="border-b border-gray-100 pb-2.5">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <i className="fas fa-flask text-indigo-600"></i>
                                            Testeur de Mot de Passe en Direct
                                        </h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Validez instantanément un mot de passe contre vos paramètres actifs ci-contre.
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="test-pwd-input" className="block text-xs font-semibold text-gray-700 mb-1">
                                            Saisir un mot de passe de test
                                        </label>
                                        <input
                                            id="test-pwd-input"
                                            type="text"
                                            value={testPassword}
                                            onChange={e => setTestPassword(e.target.value)}
                                            placeholder="Ex: Securite2026!"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                        />
                                    </div>

                                    {/* Grille des critères validés ou non */}
                                    <div className="space-y-2 text-xs">
                                        <div className={`p-2 rounded-lg flex items-center justify-between ${testMinLength ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <i className={`fas ${testMinLength ? 'fa-check' : 'fa-times'}`}></i>
                                                Longueur minimale ({passwordSettings.password_min_length} car.)
                                            </span>
                                            <span className="font-mono font-bold">{testPassword.length}/{passwordSettings.password_min_length}</span>
                                        </div>

                                        <div className={`p-2 rounded-lg flex items-center justify-between ${testMaxLength ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <i className={`fas ${testMaxLength ? 'fa-check' : 'fa-times'}`}></i>
                                                Longueur maximale ({passwordSettings.password_max_length} car.)
                                            </span>
                                            <span className="font-mono font-bold">{testPassword.length}/{passwordSettings.password_max_length}</span>
                                        </div>

                                        <div className={`p-2 rounded-lg flex items-center justify-between ${testUppercase ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <i className={`fas ${testUppercase ? 'fa-check' : 'fa-times'}`}></i>
                                                Lettre majuscule (A-Z)
                                            </span>
                                            <span className="font-bold">{passwordSettings.uppercase_required ? 'Requis' : 'Optionnel'}</span>
                                        </div>

                                        <div className={`p-2 rounded-lg flex items-center justify-between ${testLowercase ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <i className={`fas ${testLowercase ? 'fa-check' : 'fa-times'}`}></i>
                                                Lettre minuscule (a-z)
                                            </span>
                                            <span className="font-bold">{passwordSettings.lowercase_required ? 'Requis' : 'Optionnel'}</span>
                                        </div>

                                        <div className={`p-2 rounded-lg flex items-center justify-between ${testNumber ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <i className={`fas ${testNumber ? 'fa-check' : 'fa-times'}`}></i>
                                                Chiffre (0-9)
                                            </span>
                                            <span className="font-bold">{passwordSettings.number_required ? 'Requis' : 'Optionnel'}</span>
                                        </div>

                                        <div className={`p-2 rounded-lg flex items-center justify-between ${testSpecial ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            <span className="flex items-center gap-1.5">
                                                <i className={`fas ${testSpecial ? 'fa-check' : 'fa-times'}`}></i>
                                                Caractère spécial (!@#$...)
                                            </span>
                                            <span className="font-bold">{passwordSettings.special_char_required ? 'Requis' : 'Optionnel'}</span>
                                        </div>
                                    </div>

                                    {/* Résultat global du simulateur */}
                                    <div className={`p-3 rounded-xl text-center text-xs font-bold border ${
                                        testPassword.length === 0
                                            ? 'bg-gray-50 text-gray-500 border-gray-200'
                                            : isTestValid
                                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                            : 'bg-red-100 text-red-900 border-red-300'
                                    }`}>
                                        {testPassword.length === 0 ? (
                                            'Saisissez un mot de passe pour tester'
                                        ) : isTestValid ? (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <i className="fas fa-check-circle text-emerald-600"></i>
                                                Mot de passe valide et conforme !
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <i className="fas fa-times-circle text-red-600"></i>
                                                Mot de passe non conforme à la politique
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2 : GESTION DE LA RÉTENTION DES DONNÉES & RGPD */}
                    {activeTab === 'retention' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <form onSubmit={handleSaveRetentionSettings} className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs space-y-6">
                                    <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <i className="fas fa-shield-virus text-purple-700"></i>
                                                Configuration des Délais de Rétention & Purge RGPD
                                            </h2>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Définissez la durée de conservation légale des dossiers d'accès mécatroniques et l'anonymisation des données personnelles.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Dossiers rejetés */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="ret-rejected" className="text-xs font-bold text-gray-700">
                                                    Rétention dossiers refusés / annulés (jours)
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 font-mono rounded">
                                                    Défaut: 180j (6 mois)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="ret-rejected"
                                                    data-testid="retention-rejected-days"
                                                    type="number"
                                                    min={1}
                                                    max={3650}
                                                    value={retentionSettings.rejected_dossiers_retention_days}
                                                    onChange={e => setRetentionSettings(prev => ({ ...prev, rejected_dossiers_retention_days: parseInt(e.target.value) || 0 }))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                                />
                                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">jours</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-gray-400 font-semibold mr-0.5">Choisir :</span>
                                                {[
                                                    { label: '30j (1m)', days: 30 },
                                                    { label: '90j (3m)', days: 90 },
                                                    { label: '180j (6m)', days: 180 },
                                                    { label: '365j (1 an)', days: 365 }
                                                ].map(p => (
                                                    <button
                                                        key={p.days}
                                                        type="button"
                                                        onClick={() => setRetentionSettings(prev => ({ ...prev, rejected_dossiers_retention_days: p.days }))}
                                                        className={`text-[10px] px-2 py-0.5 rounded border transition font-medium cursor-pointer ${
                                                            retentionSettings.rejected_dossiers_retention_days === p.days
                                                                ? 'bg-[#002395] text-white border-[#002395] font-bold shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500">Délai avant archivage/anonymisation des demandes d'accès rejetées.</p>
                                        </div>

                                        {/* Dossiers complétés */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="ret-completed" className="text-xs font-bold text-gray-700">
                                                    Rétention dossiers clôturés / validés (jours)
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 font-mono rounded">
                                                    Défaut: 1095j (3 ans)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="ret-completed"
                                                    data-testid="retention-completed-days"
                                                    type="number"
                                                    min={1}
                                                    max={7300}
                                                    value={retentionSettings.completed_dossiers_retention_days}
                                                    onChange={e => setRetentionSettings(prev => ({ ...prev, completed_dossiers_retention_days: parseInt(e.target.value) || 0 }))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                                />
                                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">jours</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-gray-400 font-semibold mr-0.5">Choisir :</span>
                                                {[
                                                    { label: '180j (6m)', days: 180 },
                                                    { label: '365j (1 an)', days: 365 },
                                                    { label: '730j (2 ans)', days: 730 },
                                                    { label: '1095j (3 ans)', days: 1095 },
                                                    { label: '1825j (5 ans)', days: 1825 }
                                                ].map(p => (
                                                    <button
                                                        key={p.days}
                                                        type="button"
                                                        onClick={() => setRetentionSettings(prev => ({ ...prev, completed_dossiers_retention_days: p.days }))}
                                                        className={`text-[10px] px-2 py-0.5 rounded border transition font-medium cursor-pointer ${
                                                            retentionSettings.completed_dossiers_retention_days === p.days
                                                                ? 'bg-[#002395] text-white border-[#002395] font-bold shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500">Délai légal de traçabilité des interventions mécatroniques réalisées.</p>
                                        </div>

                                        {/* Logs d'audit */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="ret-audit" className="text-xs font-bold text-gray-700">
                                                    Conservation des journaux Syslog (jours)
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 font-mono rounded">
                                                    Défaut: 365j (1 an)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="ret-audit"
                                                    data-testid="retention-audit-days"
                                                    type="number"
                                                    min={1}
                                                    max={3650}
                                                    value={retentionSettings.audit_logs_retention_days}
                                                    onChange={e => setRetentionSettings(prev => ({ ...prev, audit_logs_retention_days: parseInt(e.target.value) || 0 }))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                                />
                                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">jours</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-gray-400 font-semibold mr-0.5">Choisir :</span>
                                                {[
                                                    { label: '90j (3m)', days: 90 },
                                                    { label: '180j (6m)', days: 180 },
                                                    { label: '365j (1 an)', days: 365 },
                                                    { label: '730j (2 ans)', days: 730 }
                                                ].map(p => (
                                                    <button
                                                        key={p.days}
                                                        type="button"
                                                        onClick={() => setRetentionSettings(prev => ({ ...prev, audit_logs_retention_days: p.days }))}
                                                        className={`text-[10px] px-2 py-0.5 rounded border transition font-medium cursor-pointer ${
                                                            retentionSettings.audit_logs_retention_days === p.days
                                                                ? 'bg-[#002395] text-white border-[#002395] font-bold shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500">Conservation des traces techniques pour l'audit NIS 2.</p>
                                        </div>

                                        {/* Comptes inactifs */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="ret-inactive" className="text-xs font-bold text-gray-700">
                                                    Comptes utilisateurs inactifs (jours)
                                                </label>
                                                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 font-mono rounded">
                                                    Défaut: 730j (2 ans)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="ret-inactive"
                                                    data-testid="retention-inactive-days"
                                                    type="number"
                                                    min={1}
                                                    max={3650}
                                                    value={retentionSettings.inactive_accounts_retention_days}
                                                    onChange={e => setRetentionSettings(prev => ({ ...prev, inactive_accounts_retention_days: parseInt(e.target.value) || 0 }))}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#002395]"
                                                />
                                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">jours</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-gray-400 font-semibold mr-0.5">Choisir :</span>
                                                {[
                                                    { label: '180j (6m)', days: 180 },
                                                    { label: '365j (1 an)', days: 365 },
                                                    { label: '730j (2 ans)', days: 730 },
                                                    { label: '1095j (3 ans)', days: 1095 }
                                                ].map(p => (
                                                    <button
                                                        key={p.days}
                                                        type="button"
                                                        onClick={() => setRetentionSettings(prev => ({ ...prev, inactive_accounts_retention_days: p.days }))}
                                                        className={`text-[10px] px-2 py-0.5 rounded border transition font-medium cursor-pointer ${
                                                            retentionSettings.inactive_accounts_retention_days === p.days
                                                                ? 'bg-[#002395] text-white border-[#002395] font-bold shadow-xs'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500">Délai avant désactivation automatique pour inactivité prolongée.</p>
                                        </div>

                                        {/* Mode d'action */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1.5 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-700">
                                                Mode d'application de la Rétention
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                                                <div
                                                    onClick={() => setRetentionSettings(prev => ({ ...prev, anonymize_only: true }))}
                                                    className={`p-3 rounded-lg border cursor-pointer transition ${
                                                        retentionSettings.anonymize_only ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' : 'bg-white border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                                                        <i className="fas fa-user-secret"></i>
                                                        <span>Anonymisation RGPD (Recommandé)</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-1">
                                                        Supprime les données nominatives (PII) tout en conservant les volumes statistiques et dates d'intervention.
                                                    </p>
                                                </div>

                                                <div
                                                    onClick={() => setRetentionSettings(prev => ({ ...prev, anonymize_only: false }))}
                                                    className={`p-3 rounded-lg border cursor-pointer transition ${
                                                        !retentionSettings.anonymize_only ? 'bg-red-50 border-red-400 ring-2 ring-red-200' : 'bg-white border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                                                        <i className="fas fa-trash-alt"></i>
                                                        <span>Purge Définitive</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-1">
                                                        Suppression physique irréversible de l'ensemble des enregistrements en base de données.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions formulaire */}
                                    <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setRetentionSettings(DEFAULT_RETENTION_POLICY)}
                                            className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                        >
                                            <i className="fas fa-undo mr-1.5"></i>
                                            Rétablir durées par défaut
                                        </button>

                                        <button
                                            type="submit"
                                            data-testid="save-retention-settings"
                                            disabled={saving}
                                            className="px-5 py-2.5 bg-[#002395] hover:bg-blue-800 text-white font-bold rounded-lg text-sm transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    <span>Enregistrement...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save"></i>
                                                    <span>Enregistrer la Politique de Rétention</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Section d'exécution manuelle et rapport de rétention */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
                                    <div className="border-b border-gray-100 pb-2.5">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <i className="fas fa-bolt text-amber-600"></i>
                                            Exécution du Cycle de Rétention
                                        </h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Déclenchez immédiatement le processus d'anonymisation et de conformité RGPD.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                        <div className="flex items-center justify-between text-slate-700">
                                            <span className="font-semibold">Dernier rapport d'exécution :</span>
                                            <span className="font-mono text-[10px] text-slate-500">
                                                {lastRetentionReport?.timestamp ? new Date(lastRetentionReport.timestamp).toLocaleString() : 'Jamais'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                            <div className="p-2 bg-white rounded border border-slate-200">
                                                <div className="text-slate-400">Dossiers inspectés</div>
                                                <div className="text-base font-bold text-slate-800 font-mono">
                                                    {lastRetentionReport?.inspectedCount ?? 0}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-white rounded border border-slate-200">
                                                <div className="text-slate-400">Dossiers traités</div>
                                                <div className="text-base font-bold text-purple-700 font-mono">
                                                    {(lastRetentionReport?.anonymizedCount ?? 0) + (lastRetentionReport?.purgedCount ?? 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRunRetentionCycle}
                                        disabled={runningRetention}
                                        className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {runningRetention ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i>
                                                <span>Exécution du cycle RGPD...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-play"></i>
                                                <span>Lancer un Cycle de Rétention Maintenant</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
