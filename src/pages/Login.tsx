import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { loginUser } from '../lib/api';

interface LoginProps {
    onLoginSuccess: (user: any) => void;
    onNavigateToRegister?: () => void;
}

const PRESET_ACCOUNTS = [
    { email: 'admin@entreprise.fr', role: 'Administrateur', name: 'Admin Système', icon: 'fas fa-shield-alt', color: 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100' },
    { email: 'daniel@entreprise.fr', role: 'Demandeur', name: 'Daniel Dupont', icon: 'fas fa-user', color: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100' },
    { email: 'manager@entreprise.fr', role: 'Manager N+1', name: 'Marc Martin', icon: 'fas fa-user-tie', color: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' },
    { email: 'validateur@entreprise.fr', role: 'Validateur Site', name: 'Valérie Validateur', icon: 'fas fa-check-double', color: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' },
];

export default function Login({ onLoginSuccess, onNavigateToRegister }: LoginProps) {
    const [email, setEmail] = useState('admin@entreprise.fr');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await loginUser(email, password);
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

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
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
            </div>
        </div>
    );
}
