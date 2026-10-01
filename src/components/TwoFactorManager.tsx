import React, { useState, useEffect } from 'react';
import { setup2FA, enable2FA, disable2FA } from '../lib/api';

export default function TwoFactorManager() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Setup state
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [setupData, setSetupData] = useState<{
        secret: string;
        otpauthUrl: string;
        qrCodeDataUrl: string;
        backupCodes: string[];
    } | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [step, setStep] = useState<'qr' | 'codes' | 'confirm'>('qr');
    const [backupCopied, setBackupCopied] = useState(false);

    // Disable state
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                setCurrentUser(JSON.parse(stored));
            } catch {}
        }
    }, []);

    const is2FAEnabled = Boolean(currentUser?.attributes?.two_factor_enabled);

    const showMessage = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 6000);
    };

    const handleStartSetup = async () => {
        setLoading(true);
        setFeedback(null);
        try {
            const res = await setup2FA();
            setSetupData(res.data);
            setStep('qr');
            setVerificationCode('');
            setBackupCopied(false);
            setShowSetupModal(true);
        } catch (err: any) {
            showMessage('error', err.response?.data?.error || "Impossible d'initialiser la configuration 2FA.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!setupData) return;
        setLoading(true);
        try {
            const res = await enable2FA({
                secret: setupData.secret,
                code: verificationCode.trim(),
                backupCodes: setupData.backupCodes
            });
            const updatedUser = { ...currentUser, attributes: res.data.user.attributes };
            setCurrentUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setShowSetupModal(false);
            showMessage('success', "Authentification à deux facteurs (2FA / TOTP) activée avec succès !");
        } catch (err: any) {
            showMessage('error', err.response?.data?.error || "Code de vérification invalide.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await disable2FA(disablePassword);
            const updatedUser = { ...currentUser, attributes: res.data.user.attributes };
            setCurrentUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setShowDisableModal(false);
            setDisablePassword('');
            showMessage('success', "Authentification à deux facteurs désactivée.");
        } catch (err: any) {
            showMessage('error', err.response?.data?.error || "Mot de passe incorrect.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyBackupCodes = () => {
        if (!setupData?.backupCodes) return;
        navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
        setBackupCopied(true);
        setTimeout(() => setBackupCopied(false), 3000);
    };

    return (
        <div className="space-y-6">
            {feedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                    <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-triangle text-red-600'}`}></i>
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Overview & Security Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                            <i className="fas fa-shield-alt"></i>
                            <span>Directive NIS 2 & Sécurité des Identités</span>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mt-1">
                            Double Authentification (2FA / TOTP)
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
                            Protège l'accès à votre compte en exigeant un code à usage unique généré par une application d'authentification (Google Authenticator, Microsoft Authenticator, Bitwarden) en plus de votre mot de passe.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            is2FAEnabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${is2FAEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            <span>{is2FAEnabled ? '2FA Activé' : '2FA Non Configuré'}</span>
                        </span>

                        {is2FAEnabled ? (
                            <button
                                type="button"
                                onClick={() => setShowDisableModal(true)}
                                className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                            >
                                <i className="fas fa-power-off text-xs"></i>
                                <span>Désactiver le 2FA</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStartSetup}
                                disabled={loading}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#002395] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <i className="fas fa-qrcode text-xs"></i>
                                <span>Activer le 2FA maintenant</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Features & Best Practices */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-mobile-screen"></i>
                        </div>
                        <h3 className="text-xs font-bold text-gray-900">Standard RFC 6238 (TOTP)</h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            Fonctionne avec n'importe quelle application authenticator standard (Google, Microsoft, FreeOTP, Apple Passwords). Aucun SMS non sécurisé requis.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-key"></i>
                        </div>
                        <h3 className="text-xs font-bold text-gray-900">8 Codes de Secours Uniques</h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            En cas de perte ou changement de smartphone, chaque code de secours permet une connexion unique d'urgence sans intervention support.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
                            <i className="fas fa-user-shield"></i>
                        </div>
                        <h3 className="text-xs font-bold text-gray-900">Recommandation NIS 2</h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            Obligatoire pour les profils à privilèges élevés (Administrateurs, Régisseurs Matériels, Responsables de Sûreté et Coordinateurs).
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal: Setup 2FA Wizard */}
            {showSetupModal && setupData && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                                <i className="fas fa-qrcode text-[#002395]"></i>
                                <span>Configuration de l'Authentification à Deux Facteurs</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSetupModal(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step Navigation Pills */}
                        <div className="flex items-center justify-center gap-2 border-b border-gray-100 pb-3 text-xs font-semibold">
                            <span className={`px-3 py-1 rounded-full ${step === 'qr' ? 'bg-[#002395] text-white' : 'bg-gray-100 text-gray-600'}`}>
                                1. Scanner le QR Code
                            </span>
                            <span>→</span>
                            <span className={`px-3 py-1 rounded-full ${step === 'codes' ? 'bg-[#002395] text-white' : 'bg-gray-100 text-gray-600'}`}>
                                2. Codes de Secours
                            </span>
                            <span>→</span>
                            <span className={`px-3 py-1 rounded-full ${step === 'confirm' ? 'bg-[#002395] text-white' : 'bg-gray-100 text-gray-600'}`}>
                                3. Confirmer
                            </span>
                        </div>

                        {/* Step 1: QR Code & Secret */}
                        {step === 'qr' && (
                            <div className="space-y-4 text-center">
                                <p className="text-xs text-gray-600">
                                    Ouvrez votre application d'authentification (Google Authenticator, Microsoft Authenticator) et scannez le QR code ci-dessous :
                                </p>

                                <div className="flex justify-center p-3 bg-white border border-gray-200 rounded-xl shadow-inner max-w-[200px] mx-auto">
                                    <img
                                        src={setupData.qrCodeDataUrl}
                                        alt="QR Code TOTP"
                                        className="w-44 h-44 object-contain rounded"
                                    />
                                </div>

                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">Clé secrète manuelle :</div>
                                    <div className="font-mono text-xs font-bold text-[#002395] select-all break-all">
                                        {setupData.secret}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep('codes')}
                                        className="px-4 py-2 text-xs font-bold text-white bg-[#002395] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>Étape suivante : Sauvegarder les codes</span>
                                        <i className="fas fa-arrow-right text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Backup Codes */}
                        {step === 'codes' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <span>Conservez précieusement ces codes !</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                        Chaque code ne peut être utilisé qu'une seule fois. Si vous perdez votre appareil, ils constitueront votre unique moyen d'accès.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    {setupData.backupCodes.map((code, idx) => (
                                        <div key={idx} className="font-mono text-xs font-bold text-gray-800 bg-white p-2 rounded border border-gray-200 text-center tracking-wider">
                                            {code}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyBackupCodes}
                                        className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                                    >
                                        <i className={`fas ${backupCopied ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                                        <span>{backupCopied ? 'Copié !' : 'Copier les 8 codes'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep('confirm')}
                                        className="px-4 py-2 text-xs font-bold text-white bg-[#002395] hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>Étape suivante : Vérification</span>
                                        <i className="fas fa-arrow-right text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Verification & Confirmation */}
                        {step === 'confirm' && (
                            <form onSubmit={handleConfirmEnable} className="space-y-4">
                                <p className="text-xs text-gray-600">
                                    Saisissez le code à 6 chiffres affiché en ce moment sur votre application d'authentification pour finaliser l'activation :
                                </p>

                                <div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoFocus
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="123456"
                                        className="w-full text-center font-mono text-2xl font-bold tracking-widest border border-gray-300 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setStep('codes')}
                                        className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                                    >
                                        Retour
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || verificationCode.length !== 6}
                                        className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <i className="fas fa-check text-xs"></i>
                                        <span>{loading ? 'Vérification...' : 'Activer définitivement le 2FA'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Disable 2FA */}
            {showDisableModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                                <i className="fas fa-lock text-red-600"></i>
                                <span>Confirmer la désactivation du 2FA</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDisableModal(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-gray-600">
                            Pour des raisons de sécurité, veuillez renseigner votre mot de passe actuel afin de confirmer la désactivation du second facteur :
                        </p>

                        <form onSubmit={handleConfirmDisable} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    required
                                    autoFocus
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    placeholder="Votre mot de passe actuel"
                                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600 outline-hidden"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowDisableModal(false)}
                                    className="px-3.5 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !disablePassword}
                                    className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? 'Désactivation...' : 'Désactiver le 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
