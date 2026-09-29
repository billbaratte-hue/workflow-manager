/**
 * @file src/pages/ResetPassword.tsx
 * Page de réinitialisation de mot de passe sécurisée (NIS 2 / ISO 27001).
 * Valide le jeton à usage unique, vérifie les critères de complexité et met à jour le mot de passe.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { verifyResetToken, confirmPasswordReset, getPasswordPolicy } from '../lib/api';

interface ResetPasswordProps {
    onNavigateToLogin?: () => void;
}

export default function ResetPassword({ onNavigateToLogin }: ResetPasswordProps) {
    let navigate: any = null;
    try {
        navigate = useNavigate();
    } catch {
        // Fallback for standalone tests without Router
    }

    const location = useLocation ? useLocation() : { search: window.location.search };
    const queryParams = new URLSearchParams(location.search || window.location.search);
    const token = queryParams.get('token') || '';
    const emailParam = queryParams.get('email') || '';

    const [email, setEmail] = useState<string>(emailParam);
    const [verifying, setVerifying] = useState<boolean>(true);
    const [tokenValid, setTokenValid] = useState<boolean>(false);
    const [tokenError, setTokenError] = useState<string>('');

    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    const [submitting, setSubmitting] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string>('');
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string>('');

    const [policy, setPolicy] = useState({
        password_min_length: 8,
        password_max_length: 30,
        uppercase_required: true,
        lowercase_required: true,
        special_char_required: true,
        number_required: true
    });

    // Chargement de la politique de sécurité
    useEffect(() => {
        getPasswordPolicy()
            .then(res => {
                if (res.data) {
                    setPolicy(prev => ({ ...prev, ...res.data }));
                }
            })
            .catch(() => {});
    }, []);

    // Vérification du jeton de réinitialisation
    useEffect(() => {
        if (!token || !emailParam) {
            setVerifying(false);
            setTokenValid(false);
            setTokenError("Le lien de réinitialisation est incomplet ou invalide (paramètres manquants).");
            return;
        }

        verifyResetToken(token, emailParam)
            .then(res => {
                if (res.data && res.data.valid) {
                    setTokenValid(true);
                    if (res.data.email) {
                        setEmail(res.data.email);
                    }
                } else {
                    setTokenValid(false);
                    setTokenError(res.data?.error || "Le lien de réinitialisation a expiré ou est invalide.");
                }
            })
            .catch(err => {
                setTokenValid(false);
                setTokenError(err.response?.data?.error || "Le lien de réinitialisation est invalide, a déjà été utilisé ou a expiré.");
            })
            .finally(() => {
                setVerifying(false);
            });
    }, [token, emailParam]);

    // Validation des critères de sécurité
    const hasMinLength = password.length >= (policy.password_min_length || 8);
    const hasMaxLength = password.length <= (policy.password_max_length || 30);
    const hasUppercase = !policy.uppercase_required || /[A-Z]/.test(password);
    const hasLowercase = !policy.lowercase_required || /[a-z]/.test(password);
    const hasNumber = !policy.number_required || /[0-9]/.test(password);
    const hasSpecialChar = !policy.special_char_required || /[^A-Za-z0-9]/.test(password);
    const passwordsMatch = password.length > 0 && password === confirmPassword;

    const isFormValid = hasMinLength && hasMaxLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar && passwordsMatch;

    // Calcul de la robustesse visuelle (0 à 100%)
    const calculateStrength = () => {
        if (!password) return 0;
        let score = 0;
        if (password.length >= (policy.password_min_length || 8)) score += 20;
        if (password.length >= 12) score += 10;
        if (/[A-Z]/.test(password)) score += 20;
        if (/[a-z]/.test(password)) score += 20;
        if (/[0-9]/.test(password)) score += 15;
        if (/[^A-Za-z0-9]/.test(password)) score += 15;
        return Math.min(score, 100);
    };

    const strength = calculateStrength();
    const getStrengthLabel = () => {
        if (strength === 0) return { label: 'Non renseigné', color: 'bg-slate-200 text-slate-500' };
        if (strength < 40) return { label: 'Faible', color: 'bg-red-500 text-white' };
        if (strength < 75) return { label: 'Moyen', color: 'bg-amber-500 text-white' };
        if (strength < 90) return { label: 'Fort', color: 'bg-blue-600 text-white' };
        return { label: 'Conforme NIS 2 / Robuste', color: 'bg-emerald-600 text-white' };
    };

    const strengthInfo = getStrengthLabel();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            setSubmitError("Veuillez respecter l'ensemble des critères de complexité exigés.");
            return;
        }

        setSubmitting(true);
        setSubmitError('');

        try {
            const res = await confirmPasswordReset({
                email,
                token,
                newPassword: password
            });

            setSubmitSuccess(true);
            setSuccessMessage(res.data.message || "Votre mot de passe a été mis à jour avec succès.");
        } catch (err: any) {
            setSubmitError(err.response?.data?.error || "Une erreur est survenue lors de la réinitialisation du mot de passe.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoToLogin = () => {
        if (onNavigateToLogin) {
            onNavigateToLogin();
        } else if (navigate) {
            navigate('/login');
        } else {
            window.location.href = '/login';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                {/* En-tête */}
                <div className="text-center mb-6">
                    <div className="bg-[#002395] text-white font-bold inline-block px-3 py-1 rounded text-xs mb-2 shadow-xs">
                        Portail Opérationnel
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Nouveau Mot de Passe</h1>
                    <p className="text-xs text-gray-500 mt-1">Conformité de Sécurité & Habilitations</p>
                </div>

                {/* État de vérification initial */}
                {verifying && (
                    <div className="py-12 text-center space-y-3">
                        <i className="fas fa-spinner fa-spin text-3xl text-[#002395]"></i>
                        <p className="text-xs text-slate-600">Vérification de la validité du lien de sécurité...</p>
                    </div>
                )}

                {/* Lien invalide ou expiré */}
                {!verifying && !tokenValid && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex gap-3 items-start">
                            <i className="fas fa-exclamation-triangle text-red-600 text-base mt-0.5 shrink-0"></i>
                            <div className="space-y-1">
                                <p className="font-bold text-red-900">Lien invalide ou expiré</p>
                                <p className="leading-relaxed">{tokenError}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed text-center">
                            Pour des raisons de sûreté opérationnelle (NIS 2), les liens de réinitialisation sont à usage unique et ont une durée de validité limitée dans le temps.
                        </p>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleGoToLogin}
                                className="w-full bg-[#002395] text-white py-2.5 px-4 rounded-lg font-semibold text-xs hover:bg-blue-900 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                            >
                                <i className="fas fa-arrow-left text-xs"></i>
                                <span>Demander un nouveau lien / Connexion</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Succès de réinitialisation */}
                {!verifying && tokenValid && submitSuccess && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-3 items-start">
                            <i className="fas fa-check-circle text-emerald-600 text-xl mt-0.5 shrink-0"></i>
                            <div className="space-y-1">
                                <p className="font-bold text-emerald-900 text-sm">Mot de passe réinitialisé !</p>
                                <p className="leading-relaxed">{successMessage}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed text-center">
                            Votre nouveau mot de passe est immédiatement actif sur l'ensemble de vos accès et applications associées.
                        </p>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleGoToLogin}
                                className="w-full bg-[#002395] text-white py-2.5 px-4 rounded-lg font-semibold text-xs hover:bg-blue-900 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                            >
                                <i className="fas fa-sign-in-alt text-xs"></i>
                                <span>Accéder à la page de connexion</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Formulaire de saisie du nouveau mot de passe */}
                {!verifying && tokenValid && !submitSuccess && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {submitError && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2 items-center">
                                <i className="fas fa-exclamation-circle text-red-500 shrink-0"></i>
                                <span>{submitError}</span>
                            </div>
                        )}

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Compte :</span>
                            <span className="font-bold text-slate-800 truncate max-w-[220px]" title={email}>
                                {email}
                            </span>
                        </div>

                        {/* Nouveau mot de passe */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Nouveau mot de passe
                            </label>
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
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    title={showPassword ? 'Masquer' : 'Afficher'}
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Indicateur de robustesse */}
                        {password && (
                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">Robustesse :</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${strengthInfo.color}`}>
                                        {strengthInfo.label}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            strength < 40 ? 'bg-red-500' : strength < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${strength}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Confirmation mot de passe */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Confirmer le nouveau mot de passe
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <i className="fas fa-lock text-xs"></i>
                                </span>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••••••"
                                    className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:border-[#002395] transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    title={showConfirmPassword ? 'Masquer' : 'Afficher'}
                                >
                                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Liste de conformité politique de sécurité */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                            <p className="font-bold text-slate-700 mb-1">Critères exigés par la politique de sécurité :</p>
                            <div className="grid grid-cols-1 gap-1">
                                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                    <i className={`fas ${hasMinLength ? 'fa-check text-emerald-600' : 'fa-circle text-[6px]'}`}></i>
                                    <span>Au moins {policy.password_min_length || 8} caractères</span>
                                </div>
                                {policy.uppercase_required && (
                                    <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                        <i className={`fas ${hasUppercase ? 'fa-check text-emerald-600' : 'fa-circle text-[6px]'}`}></i>
                                        <span>Au moins 1 majuscule (A-Z)</span>
                                    </div>
                                )}
                                {policy.lowercase_required && (
                                    <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                        <i className={`fas ${hasLowercase ? 'fa-check text-emerald-600' : 'fa-circle text-[6px]'}`}></i>
                                        <span>Au moins 1 minuscule (a-z)</span>
                                    </div>
                                )}
                                {policy.number_required && (
                                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                        <i className={`fas ${hasNumber ? 'fa-check text-emerald-600' : 'fa-circle text-[6px]'}`}></i>
                                        <span>Au moins 1 chiffre (0-9)</span>
                                    </div>
                                )}
                                {policy.special_char_required && (
                                    <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                        <i className={`fas ${hasSpecialChar ? 'fa-check text-emerald-600' : 'fa-circle text-[6px]'}`}></i>
                                        <span>Au moins 1 caractère spécial (!@#$...)</span>
                                    </div>
                                )}
                                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                    <i className={`fas ${passwordsMatch ? 'fa-check text-emerald-600' : 'fa-circle text-[6px]'}`}></i>
                                    <span>Les deux mots de passe correspondent</span>
                                </div>
                            </div>
                        </div>

                        {/* Bouton de soumission */}
                        <button
                            type="submit"
                            disabled={!isFormValid || submitting}
                            className="w-full bg-[#002395] text-white py-2.5 px-4 rounded-lg hover:bg-blue-900 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-sm"></i>
                                    <span>Mise à jour en cours...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-shield-alt text-sm"></i>
                                    <span>Confirmer le mot de passe</span>
                                </>
                            )}
                        </button>

                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={handleGoToLogin}
                                className="text-xs text-[#002395] hover:underline font-semibold cursor-pointer bg-transparent border-none"
                            >
                                Retour à la page de connexion
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 text-[11px] text-gray-400 text-center leading-relaxed">
                    Plateforme certifiée ISO 27001 / NIS 2 — Procédure de gestion cryptographique des identités.
                </div>
            </div>
        </div>
    );
}
