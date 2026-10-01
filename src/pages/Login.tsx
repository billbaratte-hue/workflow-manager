import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { loginUser, requestPasswordReset, verify2FALogin } from '../lib/api';

interface LoginProps {
    onLoginSuccess: (user: any) => void;
    onNavigateToRegister?: () => void;
    onNavigateToForgotPassword?: () => void;
    initialShowForgotPassword?: boolean;
}

const PRESET_ACCOUNTS = [
    { email: 'admin@entreprise.fr', role: 'Administrateur', name: 'Admin Système', icon: 'fas fa-shield-alt', color: 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100' },
    { email: 'daniel@entreprise.fr', role: 'Demandeur', name: 'Daniel Dupont', icon: 'fas fa-user', color: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100' },
    { email: 'manager@entreprise.fr', role: 'Manager N+1', name: 'Marc Martin', icon: 'fas fa-user-tie', color: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' },
    { email: 'validateur@entreprise.fr', role: 'Validateur Site', name: 'Valérie Validateur', icon: 'fas fa-check-double', color: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' },
];

export default function Login({ onLoginSuccess, onNavigateToRegister, onNavigateToForgotPassword, initialShowForgotPassword }: LoginProps) {
    const [email, setEmail] = useState('admin@entreprise.fr');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // État Double Authentification 2FA / TOTP
    const [require2FA, setRequire2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [isBackupCodeMode, setIsBackupCodeMode] = useState(false);
    const [twoFactorUser, setTwoFactorUser] = useState<any>(null);

    // État Récupération Mot de passe oublié
    const [showForgotPassword, setShowForgotPassword] = useState(initialShowForgotPassword || false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotError, setForgotError] = useState('');

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError('');
        setForgotMessage('');
        try {
            const targetEmail = (forgotEmail || email || '').trim();
            const res = await requestPasswordReset(targetEmail);
            setForgotSuccess(true);
            setForgotMessage(res.data.message || "Si cette adresse correspond à un compte actif, un lien de réinitialisation sécurisé vous a été envoyé par email.");
        } catch (err: any) {
            setForgotError(err.response?.data?.error || "Une erreur est survenue lors de l'envoi de la demande.");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await loginUser(email, password);
            if (res.data?.require2FA) {
                setRequire2FA(true);
                setTempToken(res.data.tempToken);
                setTwoFactorUser(res.data.user);
                setTwoFactorCode('');
                return;
            }
            const fullUser = { ...res.data.user, token: res.data.token };
            localStorage.setItem('user', JSON.stringify(fullUser));
            localStorage.setItem('token', res.data.token);
            onLoginSuccess(fullUser);
        } catch (err: any) {
            console.error('Login error:', err);
            const serverMsg = err.response?.data?.error || err.message || "Erreur de connexion.";
            setError(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (presetEmail: string) => {
        setEmail(presetEmail);
        setPassword('Securite2026!');
        setError('');
        setLoading(true);
        try {
            const res = await loginUser(presetEmail, 'Securite2026!');
            if (res.data?.require2FA) {
                setRequire2FA(true);
                setTempToken(res.data.tempToken);
                setTwoFactorUser(res.data.user);
                setTwoFactorCode('');
                return;
            }
            const fullUser = { ...res.data.user, token: res.data.token };
            localStorage.setItem('user', JSON.stringify(fullUser));
            localStorage.setItem('token', res.data.token);
            onLoginSuccess(fullUser);
        } catch (err: any) {
            console.error('Quick login error:', err);
            const serverMsg = err.response?.data?.error || err.message || "Erreur de connexion.";
            setError(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await verify2FALogin(tempToken, twoFactorCode.trim());
            const fullUser = { ...res.data.user, token: res.data.token };
            localStorage.setItem('user', JSON.stringify(fullUser));
            localStorage.setItem('token', res.data.token);
            onLoginSuccess(fullUser);
        } catch (err: any) {
            console.error('2FA verification error:', err);
            const serverMsg = err.response?.data?.error || err.message || "Code de vérification invalide.";
            setError(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                {require2FA ? (
                    <div>
                        <div className="text-center mb-6">
                            <div className="bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs mb-2 shadow-xs mx-auto">
                                <i className="fas fa-shield-alt"></i>
                                <span>Double Authentification (2FA / TOTP)</span>
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Vérification de Sécurité</h1>
                            <p className="text-xs text-gray-500 mt-1">
                                Compte : <span className="font-semibold text-gray-700">{twoFactorUser?.email || email}</span>
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 text-red-700 text-xs font-medium bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                                <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                                <div className="flex-1">
                                    <div>{error}</div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handle2FASubmit} className="space-y-4">
                            {!isBackupCodeMode ? (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 text-center">
                                        Code à 6 chiffres depuis votre application d'authentification
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoFocus
                                        required
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="123456"
                                        className="block w-full py-3 text-center font-mono text-2xl font-bold tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002395] focus:border-[#002395] bg-gray-50 focus:bg-white outline-hidden"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 text-center">
                                        Code de secours à usage unique
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={9}
                                        autoFocus
                                        required
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value.toUpperCase())}
                                        placeholder="XXXX-XXXX"
                                        className="block w-full py-3 text-center font-mono text-xl font-bold tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002395] focus:border-[#002395] bg-gray-50 focus:bg-white uppercase outline-hidden"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !twoFactorCode}
                                className="w-full bg-[#002395] text-white py-2.5 px-4 rounded-lg hover:bg-blue-900 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin text-sm"></i>
                                        <span>Vérification...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check-circle text-sm"></i>
                                        <span>Valider la connexion</span>
                                    </>
                                )}
                            </button>

                            <div className="flex flex-col gap-2 pt-3 border-t border-slate-200 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsBackupCodeMode(!isBackupCodeMode);
                                        setTwoFactorCode('');
                                        setError('');
                                    }}
                                    className="text-xs text-indigo-700 hover:text-indigo-900 font-medium hover:underline cursor-pointer bg-transparent border-none p-0"
                                >
                                    {isBackupCodeMode
                                        ? "← Utiliser mon application (code à 6 chiffres)"
                                        : "Problème d'application ? Utiliser un code de secours"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequire2FA(false);
                                        setTempToken('');
                                        setTwoFactorCode('');
                                        setError('');
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 hover:underline cursor-pointer bg-transparent border-none p-0 mt-1"
                                >
                                    Annuler et revenir à la connexion
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <div className="bg-[#002395] text-white font-bold inline-block px-3 py-1 rounded text-sm mb-2 shadow-xs">
                                Portail Opérationnel
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Portail Mécatronique</h1>
                            <p className="text-xs text-gray-500 mt-1">Connexion SSO & Espace Habilités</p>
                        </div>

                        {error && (
                            <div className="mb-4 text-red-700 text-xs font-medium bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                                <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                                <div className="flex-1">
                                    <div>{error}</div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Adresse email professionnelle
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <i className="fas fa-envelope text-xs"></i>
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="collaborateur@entreprise.fr"
                                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:border-[#002395] transition"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-700">
                                Mot de passe
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setForgotEmail(email);
                                    setShowForgotPassword(true);
                                    setForgotSuccess(false);
                                    setForgotError('');
                                    setForgotMessage('');
                                    if (onNavigateToForgotPassword) {
                                        onNavigateToForgotPassword();
                                    }
                                }}
                                className="text-xs font-medium text-[#002395] hover:underline cursor-pointer bg-transparent border-none p-0"
                            >
                                Mot de passe oublié ?
                            </button>
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <i className="fas fa-lock text-xs"></i>
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••••••"
                                className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:border-[#002395] transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                title={showPassword ? 'Masquer' : 'Afficher'}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#002395] text-white py-2.5 px-4 rounded-lg hover:bg-blue-900 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin text-sm"></i>
                                <span>Connexion en cours...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt text-sm"></i>
                                <span>Se connecter</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2.5 text-center">
                        Connexion rapide en 1 clic (Profils de démonstration) :
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESET_ACCOUNTS.map(preset => (
                            <button
                                key={preset.email}
                                type="button"
                                onClick={() => handleQuickLogin(preset.email)}
                                disabled={loading}
                                className={`text-left p-2.5 rounded-lg border text-xs transition flex flex-col justify-between ${preset.color} cursor-pointer`}
                            >
                                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                                    <i className={`${preset.icon} text-[11px]`}></i>
                                    <span>{preset.role}</span>
                                </div>
                                <div className="text-[11px] opacity-80 truncate">{preset.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <span className="text-xs text-slate-500">Nouvel agent ou prestataire tiers ? </span>
                    {onNavigateToRegister ? (
                        <button
                            type="button"
                            onClick={onNavigateToRegister}
                            className="text-xs font-bold text-[#002395] hover:underline cursor-pointer bg-transparent border-none p-0 inline"
                        >
                            Créer un compte
                        </button>
                    ) : (
                        <Link to="/register" className="text-xs font-bold text-[#002395] hover:underline">
                            Créer un compte
                        </Link>
                    )}
                </div>

                <div className="mt-4 text-[11px] text-gray-400 text-center leading-relaxed">
                    Plateforme certifiée ISO 27001 / NIS 2 — Accès strictement réservé aux agents et prestataires habilités.
                </div>
                    </>
                )}
            </div>

            {/* Modal Réinitialisation Mot de passe oublié */}
            {showForgotPassword && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#002395] flex items-center justify-center font-bold">
                                    <i className="fas fa-key text-xs"></i>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Mot de passe oublié</h3>
                                    <p className="text-[11px] text-slate-500">Procédure sécurisée par email</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(false)}
                                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition cursor-pointer"
                                title="Fermer"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        {forgotSuccess ? (
                            <div className="mt-4 space-y-4">
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-3 items-start">
                                    <i className="fas fa-check-circle text-emerald-600 text-base mt-0.5 shrink-0"></i>
                                    <div className="space-y-1">
                                        <p className="font-bold text-emerald-900">Demande prise en compte</p>
                                        <p className="leading-relaxed">{forgotMessage}</p>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Vérifiez votre boîte de réception ainsi que vos courriers indésirables (spams). Le lien envoyé est à usage unique et valable 1 heure.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(false)}
                                    className="w-full bg-[#002395] text-white py-2.5 px-4 rounded-lg font-semibold text-xs hover:bg-blue-900 transition shadow-xs cursor-pointer"
                                >
                                    Retour à la connexion
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPasswordSubmit} className="mt-4 space-y-4">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Indiquez votre adresse email professionnelle. Si un compte actif y est associé, nous vous transmettrons un lien sécurisé permettant de réinitialiser votre mot de passe.
                                </p>

                                {forgotError && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2 items-center">
                                        <i className="fas fa-exclamation-circle text-red-500 shrink-0"></i>
                                        <span>{forgotError}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Adresse email professionnelle
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                            <i className="fas fa-envelope text-xs"></i>
                                        </span>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={e => setForgotEmail(e.target.value)}
                                            required
                                            placeholder="collaborateur@entreprise.fr"
                                            className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:border-[#002395] transition"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(false)}
                                        className="flex-1 py-2 px-3 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="flex-1 bg-[#002395] text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-blue-900 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                                    >
                                        {forgotLoading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin text-xs"></i>
                                                <span>Envoi...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-paper-plane text-xs"></i>
                                                <span>Envoyer le lien</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
