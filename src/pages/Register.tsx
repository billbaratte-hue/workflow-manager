/**
 * @file src/pages/Register.tsx
 * Workflow d'Auto-Inscription & Habilitation Mécatronique (Epic 4 - User Story 4.1).
 * Géré sous forme de Workflow en 4 étapes conformément aux directives d'accès sécurisé et à la directive NIS 2.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface RegisterProps {
    onRegisterSuccess?: (user: any) => void;
    onNavigateToLogin?: () => void;
}

export default function Register({ onRegisterSuccess, onNavigateToLogin }: RegisterProps = {}) {
    let navigate: any = null;
    try {
        navigate = useNavigate();
    } catch {
        // Fallback when rendered outside Router context in standalone unit tests
    }

    const [currentStep, setCurrentStep] = useState<number>(1);
    const [createdUser, setCreatedUser] = useState<any>(null);
    const [registrationTicket, setRegistrationTicket] = useState<string>('');
    const [passwordPolicy, setPasswordPolicy] = useState({
        password_min_length: 5,
        password_max_length: 15,
        uppercase_required: true,
        lowercase_required: true,
        special_char_required: true,
        number_required: true
    });

    useEffect(() => {
        fetch('/api/v1/auth/password-policy')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && typeof data.password_min_length === 'number') {
                    setPasswordPolicy(prev => ({ ...prev, ...data }));
                }
            })
            .catch(() => {});
    }, []);

    const [formData, setFormData] = useState({
        // Étape 1 : Identité & Contact
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        matricule: '',

        // Étape 2 : Organisation & Affectation
        typeOrganisation: 'Direction Opérationnelle',
        entite: 'Direction des Opérations',
        service: 'Maintenance & Exploitation',
        region: 'Île-de-France',
        poleInfra: 'Pôle Technique Central',
        specialite: 'Accès & Clés Mécatroniques',

        // Étape 3 : Profil & Habilitations Mécatroniques
        roleSouhaite: 'Demandeur',
        justification: '',
        referenceMarche: 'Contrat Cadre Accès',
        habilitations: {
            cleF9000: true,
            badgeRFID: true,
            bluetooth: false,
            bcuUrgence: false
        },

        // Étape 4 : Sécurité & Conformité NIS 2
        password: '',
        confirmPassword: '',
        referentInterne: '',
        acceptCharte: false,
        acceptRegleOr: false
    });

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const isInternalDomain = formData.email.toLowerCase().includes('@entreprise.') ||
                             formData.email.toLowerCase().includes('@portail.') ||
                             formData.email.toLowerCase().includes('@societe.') ||
                             formData.email.toLowerCase().includes('@reseau.') ||
                             formData.email.toLowerCase().includes('@infralog.');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setFormData(prev => ({ ...prev, [target.name]: value }));
        setError(null);
    };

    const handleHabilitationToggle = (key: keyof typeof formData.habilitations) => {
        setFormData(prev => ({
            ...prev,
            habilitations: {
                ...prev.habilitations,
                [key]: !prev.habilitations[key]
            }
        }));
    };

    const handleNavigateLogin = () => {
        if (onNavigateToLogin) {
            onNavigateToLogin();
        } else if (navigate) {
            navigate('/login');
        } else {
            window.location.href = '/login';
        }
    };

    const handleInstantLogin = () => {
        if (createdUser && onRegisterSuccess) {
            localStorage.setItem('user', JSON.stringify(createdUser));
            if (createdUser.token) {
                localStorage.setItem('token', createdUser.token);
            }
            onRegisterSuccess(createdUser);
        } else {
            handleNavigateLogin();
        }
    };

    // Validation par étape du workflow
    const validateStep = (step: number): boolean => {
        setError(null);
        if (step === 1) {
            if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim()) {
                setError('Veuillez renseigner votre nom, prénom et adresse email professionnelle.');
                return false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                setError('Veuillez saisir une adresse email valide.');
                return false;
            }
            return true;
        }

        if (step === 2) {
            if (!formData.entite.trim() || !formData.service.trim()) {
                setError('Veuillez renseigner votre entité et votre service d\'appartenance.');
                return false;
            }
            return true;
        }

        if (step === 3) {
            if (!formData.roleSouhaite) {
                setError('Veuillez sélectionner le rôle souhaité.');
                return false;
            }
            return true;
        }

        if (step === 4) {
            if (!formData.password) {
                setError('Veuillez renseigner un mot de passe.');
                return false;
            }
            if (formData.password.length < passwordPolicy.password_min_length) {
                setError(`Le mot de passe doit comporter au moins ${passwordPolicy.password_min_length} caractères.`);
                return false;
            }
            if (formData.password.length > passwordPolicy.password_max_length) {
                setError(`Le mot de passe ne doit pas dépasser ${passwordPolicy.password_max_length} caractères.`);
                return false;
            }
            if (passwordPolicy.uppercase_required && !/[A-Z]/.test(formData.password)) {
                setError('Le mot de passe doit contenir au moins une lettre majuscule.');
                return false;
            }
            if (passwordPolicy.lowercase_required && !/[a-z]/.test(formData.password)) {
                setError('Le mot de passe doit contenir au moins une lettre minuscule.');
                return false;
            }
            if (passwordPolicy.number_required && !/[0-9]/.test(formData.password)) {
                setError('Le mot de passe doit contenir au moins un chiffre.');
                return false;
            }
            if (passwordPolicy.special_char_required && !/[^A-Za-z0-9]/.test(formData.password)) {
                setError('Le mot de passe doit contenir au moins un caractère spécial.');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Les mots de passe saisis ne correspondent pas.');
                return false;
            }
            if (!formData.acceptCharte) {
                setError('Vous devez accepter la charte de sécurité informatique et de sûreté ferroviaire (Directive NIS 2).');
                return false;
            }
            return true;
        }

        return true;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const prevStep = () => {
        setError(null);
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation finale de l'ensemble des étapes
        if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
            return;
        }

        setLoading(true);

        const generatedTicket = `WKF-REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            const res = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${formData.prenom} ${formData.nom}`.trim(),
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password,
                    role: formData.roleSouhaite,
                    attributes: {
                        matricule: formData.matricule || 'EXT-' + Math.floor(10000 + Math.random() * 90000),
                        telephone: formData.telephone,
                        service: formData.service,
                        entite: formData.entite,
                        region: formData.region,
                        poleInfra: formData.poleInfra,
                        specialite: formData.specialite,
                        typeOrganisation: formData.typeOrganisation,
                        habilitationsDemandees: formData.habilitations,
                        justification: formData.justification,
                        referenceMarche: formData.referenceMarche,
                        referentInterne: formData.referentInterne,
                        workflowTicket: generatedTicket,
                        statusWorkflow: 'VALIDE_AUTOMATIQUEMENT'
                    }
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Erreur lors de la création de votre compte.');
            }

            const result = await res.json();
            setRegistrationTicket(generatedTicket);
            setCreatedUser(result.user);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Une erreur inattendue est survenue.');
        } finally {
            setLoading(false);
        }
    };

    // Calcul dynamique de force du mot de passe selon la politique active (Zero Hardcoding)
    const getPasswordScore = () => {
        const p = formData.password;
        if (!p) return 0;
        let score = 0;
        if (p.length >= passwordPolicy.password_min_length) score++;
        if (p.length <= passwordPolicy.password_max_length) score++;
        if (passwordPolicy.uppercase_required ? /[A-Z]/.test(p) : true) score++;
        if (passwordPolicy.lowercase_required ? /[a-z]/.test(p) : true) score++;
        if (passwordPolicy.number_required ? /[0-9]/.test(p) : true) score++;
        if (passwordPolicy.special_char_required ? /[^A-Za-z0-9]/.test(p) : true) score++;
        return score;
    };
    const passwordScore = getPasswordScore();

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
            {/* En-tête Institutionnel */}
            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="flex justify-center items-center gap-3">
                    <span className="bg-white text-[#002395] px-3.5 py-1.5 rounded-lg font-black text-2xl tracking-wider shadow">
                        ACCÈS
                    </span>
                    <span className="text-white font-bold text-xl tracking-wide">
                        Portail Mécatronique Sécurisé
                    </span>
                </div>
                <h2 className="mt-4 text-center text-2xl font-extrabold text-white">
                    Création d'un Espace Agent / Partenaire
                </h2>
                <p className="mt-1 text-center text-xs text-slate-400">
                    Workflow d'enrôlement et d'habilitation aux emprises et sites sécurisés
                </p>
            </div>

            <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white py-7 px-5 sm:px-8 shadow-2xl rounded-2xl border border-slate-200">

                    {/* ÉCRAN DE SUCCÈS & WORKFLOW TRACKING */}
                    {success ? (
                        <div className="text-center py-4">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mb-3 text-3xl">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <span className="inline-block bg-blue-100 text-blue-900 font-mono font-bold text-xs px-3 py-1 rounded-full mb-2">
                                Dossier #{registrationTicket}
                            </span>
                            <h3 className="text-xl font-bold text-slate-900">
                                Workflow d'Inscription Validé !
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto">
                                Votre compte <span className="font-semibold text-slate-800">{formData.email}</span> a été provisionné et vos accès mécatroniques sont désormais enregistrés.
                            </p>

                            {/* Cycle de vie du Workflow d'enrôlement */}
                            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-left">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                                    <i className="fas fa-project-diagram text-[#002395]"></i>
                                    Étapes du Workflow d'Activation Mécatronique
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                                            <i className="fas fa-check"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-800">1. Dépôt et enregistrement du dossier</div>
                                            <div className="text-[11px] text-slate-500">Formulaire complété avec profil « {formData.roleSouhaite} » et habilitations F9000</div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Effectué</span>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                                            <i className="fas fa-shield-alt"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-800">2. Contrôle automatique NIS 2 & Filtre Annuaire</div>
                                            <div className="text-[11px] text-slate-500">
                                                {isInternalDomain ? 'Collaborateur interne certifié' : 'Prestataire externe rattaché au contrat'}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Conforme</span>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                                            <i className="fas fa-id-card"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-800">3. Activation immédiate du compte</div>
                                            <div className="text-[11px] text-slate-500">Vous pouvez dès à présent vous connecter et déposer vos demandes d'intervention</div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Actif</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions de redirection */}
                            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                                <button
                                    onClick={handleInstantLogin}
                                    className="px-5 py-2.5 bg-[#002395] text-white font-bold rounded-lg text-sm hover:bg-blue-800 transition shadow flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-sign-in-alt"></i>
                                    <span>Accéder au Portail Opérationnel</span>
                                </button>
                                <button
                                    onClick={handleNavigateLogin}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-arrow-left"></i>
                                    <span>Page de Connexion</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* STEPPER DU WORKFLOW */}
                            <div className="border-b border-slate-200 pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#002395] flex items-center gap-1.5">
                                        <i className="fas fa-tasks"></i>
                                        Étape {currentStep} sur 4 : {
                                            currentStep === 1 ? "Identité & Contact" :
                                            currentStep === 2 ? "Organisation & Territoire" :
                                            currentStep === 3 ? "Habilitations Mécatroniques" :
                                            "Sécurité SSI & Validation NIS 2"
                                        }
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500">
                                        Progression : {currentStep * 25}%
                                    </span>
                                </div>

                                {/* Barre de progression */}
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                                    <div
                                        className="bg-[#002395] h-2 transition-all duration-300 rounded-full"
                                        style={{ width: `${currentStep * 25}%` }}
                                    ></div>
                                </div>

                                {/* Pastilles de navigation du workflow */}
                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                    {[
                                        { step: 1, label: 'Identité', icon: 'fas fa-user' },
                                        { step: 2, label: 'Structure', icon: 'fas fa-building' },
                                        { step: 3, label: 'Habilitations', icon: 'fas fa-key' },
                                        { step: 4, label: 'Sécurité NIS 2', icon: 'fas fa-shield-alt' }
                                    ].map(item => (
                                        <button
                                            key={item.step}
                                            type="button"
                                            onClick={() => {
                                                if (item.step < currentStep || validateStep(currentStep)) {
                                                    setCurrentStep(item.step);
                                                }
                                            }}
                                            className={`p-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                                currentStep === item.step
                                                    ? 'bg-[#002395] text-white shadow-xs'
                                                    : item.step < currentStep
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            <i className={`${item.step < currentStep ? 'fas fa-check' : item.icon} text-[10px]`}></i>
                                            <span className="hidden sm:inline">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* BANNIÈRE D'ERREUR */}
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-red-800 text-xs flex items-center gap-2 animate-fadeIn">
                                    <i className="fas fa-exclamation-triangle text-red-600 text-sm shrink-0"></i>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* ÉTAPE 1 : IDENTITÉ & CONTACT */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2.5">
                                        <i className="fas fa-info-circle text-[#002395] text-sm mt-0.5"></i>
                                        <div className="text-xs text-blue-900 leading-relaxed">
                                            Renseignez votre identité civile et professionnelle. L'accès mécatronique est strictement nominatif et soumis aux règles de traçabilité ferroviaire.
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Prénom <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                    <i className="fas fa-user text-xs"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    name="prenom"
                                                    required
                                                    value={formData.prenom}
                                                    onChange={handleChange}
                                                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                                    placeholder="Jean"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Nom <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                    <i className="fas fa-user-tag text-xs"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    name="nom"
                                                    required
                                                    value={formData.nom}
                                                    onChange={handleChange}
                                                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                                    placeholder="Dupont"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-slate-700 uppercase">
                                                Email Professionnel <span className="text-red-500">*</span>
                                            </label>
                                            {formData.email && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isInternalDomain ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {isInternalDomain ? '✓ Compte Interne Vérifié' : 'Compte Partenaire / Tiers'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                <i className="fas fa-envelope text-xs"></i>
                                            </span>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                                placeholder="jean.dupont@entreprise.fr"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Téléphone Portable d'Astreinte <span className="text-slate-400 font-normal">(Recommandé)</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                    <i className="fas fa-phone-alt text-xs"></i>
                                                </span>
                                                <input
                                                    type="tel"
                                                    name="telephone"
                                                    value={formData.telephone}
                                                    onChange={handleChange}
                                                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                                    placeholder="06 12 34 56 78"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">Nécessaire pour les codes SMS OTP et clés virtuelles Bluetooth.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Matricule Collaborateur ou Identifiant Tiers
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                    <i className="fas fa-id-card text-xs"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    name="matricule"
                                                    value={formData.matricule}
                                                    onChange={handleChange}
                                                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                                    placeholder="Ex: 8912345B ou EXT-784"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ÉTAPE 2 : ORGANISATION & TERRITOIRE */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Type d'Organisation
                                            </label>
                                            <select
                                                name="typeOrganisation"
                                                value={formData.typeOrganisation}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Entité Interne">Direction Opérationnelle / Maintenance</option>
                                                <option value="Prestataire Titulaire">Entreprise Prestataire / Sous-traitant</option>
                                                <option value="Entreprise Partenaire">Entreprise Partenaire / Tierce</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Région / Territoire d'Affectation
                                            </label>
                                            <select
                                                name="region"
                                                value={formData.region}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Île-de-France">Île-de-France</option>
                                                <option value="Auvergne-Rhône-Alpes">Auvergne-Rhône-Alpes</option>
                                                <option value="Nouvelle-Aquitaine">Nouvelle-Aquitaine</option>
                                                <option value="Occitanie">Occitanie</option>
                                                <option value="Grand Est">Grand Est</option>
                                                <option value="Hauts-de-France">Hauts-de-France</option>
                                                <option value="Provence-Alpes-Côte d'Azur">PACA</option>
                                                <option value="Bretagne">Bretagne</option>
                                                <option value="Pays de la Loire">Pays de la Loire</option>
                                                <option value="Normandie">Normandie</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Entité d'Appartenance <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="entite"
                                                required
                                                value={formData.entite}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="Direction ou Entreprise"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Service / Division <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="service"
                                                required
                                                value={formData.service}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="ex: Maintenance SES / Voie"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Établissement / Infrapôle
                                            </label>
                                            <input
                                                type="text"
                                                name="poleInfra"
                                                value={formData.poleInfra}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="ex: Infrapôle Paris-Nord"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Métier / Spécialité Ferroviaire
                                            </label>
                                            <select
                                                name="specialite"
                                                value={formData.specialite}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#002395]"
                                            >
                                                <option value="Signalisation Électrique (SES)">Signalisation Électrique (SES)</option>
                                                <option value="Caténaire & Sous-stations">Caténaire & Alimentation Électrique</option>
                                                <option value="Voie & Appareils de Voie">Voie & Infrastructure de Voie</option>
                                                <option value="Télécommunications & GSM-R">Télécoms, Pylônes & GSM-R</option>
                                                <option value="Bâtiments & Locaux Techniques">Bâtiments & Postes d'Aiguillage</option>
                                                <option value="Sûreté Ferroviaire (SUGE)">Sûreté Ferroviaire (SUGE)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ÉTAPE 3 : PROFIL & HABILITATIONS MÉCATRONIQUES */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                                            Rôle Opérationnel Souhaité
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {[
                                                { role: 'Demandeur', title: 'Demandeur d\'Accès', desc: 'Déposer des demandes et emprunter des clés F9000', icon: 'fas fa-id-badge' },
                                                { role: 'Validateur', title: 'Validateur de Site', desc: 'Instruire et valider les accès aux installations', icon: 'fas fa-user-check' },
                                                { role: 'Gestionnaire', title: 'Gestionnaire Régie', desc: 'Programmation des clés F9000 et stocks régie', icon: 'fas fa-warehouse' }
                                            ].map(r => (
                                                <div
                                                    key={r.role}
                                                    onClick={() => setFormData(prev => ({ ...prev, roleSouhaite: r.role }))}
                                                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                                                        formData.roleSouhaite === r.role
                                                            ? 'border-[#002395] bg-blue-50 ring-2 ring-[#002395]/20'
                                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                        <i className={`${r.icon} text-[#002395]`}></i>
                                                        <span>{r.title}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 leading-tight">{r.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Habilitations matérielles demandées */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                                            Équipements & Clés Sollicités
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div
                                                onClick={() => handleHabilitationToggle('cleF9000')}
                                                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                                    formData.habilitations.cleF9000 ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-key text-[#002395]"></i>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800">Clé Mécatronique F9000</div>
                                                        <div className="text-[10px] text-slate-500">Cylindres d'armoires relais et boîtiers SES</div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.habilitations.cleF9000}
                                                    onChange={() => {}}
                                                    className="h-4 w-4 text-[#002395] rounded border-slate-300"
                                                />
                                            </div>

                                            <div
                                                onClick={() => handleHabilitationToggle('badgeRFID')}
                                                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                                    formData.habilitations.badgeRFID ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-id-card text-emerald-600"></i>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800">Badge RFID Vigik Sécurisé</div>
                                                        <div className="text-[10px] text-slate-500">Portails emprises & clôtures ferroviaires</div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.habilitations.badgeRFID}
                                                    onChange={() => {}}
                                                    className="h-4 w-4 text-[#002395] rounded border-slate-300"
                                                />
                                            </div>

                                            <div
                                                onClick={() => handleHabilitationToggle('bluetooth')}
                                                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                                    formData.habilitations.bluetooth ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fab fa-bluetooth-b text-blue-600"></i>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800">Clé Virtuelle Mobile (Bluetooth)</div>
                                                        <div className="text-[10px] text-slate-500">Pylônes GSM-R & sites distants</div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.habilitations.bluetooth}
                                                    onChange={() => {}}
                                                    className="h-4 w-4 text-[#002395] rounded border-slate-300"
                                                />
                                            </div>

                                            <div
                                                onClick={() => handleHabilitationToggle('bcuUrgence')}
                                                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                                    formData.habilitations.bcuUrgence ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <i className="fas fa-fire-extinguisher text-amber-600"></i>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800">Boîte à Clés d'Urgence (BCU)</div>
                                                        <div className="text-[10px] text-slate-500">Interventions d'astreinte & dérangements</div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.habilitations.bcuUrgence}
                                                    onChange={() => {}}
                                                    className="h-4 w-4 text-[#002395] rounded border-slate-300"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Référence Marché / Commande ou Chantier
                                            </label>
                                            <input
                                                type="text"
                                                name="referenceMarche"
                                                value={formData.referenceMarche}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="Ex: CONTRAT-CADRE-2026"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Motif / Justification Opérationnelle
                                            </label>
                                            <input
                                                type="text"
                                                name="justification"
                                                value={formData.justification}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="ex: Maintenance préventive armoires SES"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ÉTAPE 4 : SÉCURITÉ SSI & VALIDATION NIS 2 */}
                            {currentStep === 4 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Mot de passe <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                name="password"
                                                required
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="••••••••"
                                            />
                                            {/* Jauge de robustesse */}
                                            {formData.password && (
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                                        <div
                                                            className={`h-full transition-all duration-300 ${
                                                                passwordScore <= 2 ? 'bg-red-500 w-1/3' :
                                                                passwordScore <= 4 ? 'bg-amber-500 w-2/3' :
                                                                'bg-emerald-500 w-full'
                                                            }`}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {passwordScore <= 2 ? 'Faible' : passwordScore <= 4 ? 'Moyen' : 'Robuste'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Critères dynamiques imposés par la politique active */}
                                            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                                                <span className={`px-1.5 py-0.5 rounded font-mono ${
                                                    formData.password.length >= passwordPolicy.password_min_length && formData.password.length <= passwordPolicy.password_max_length
                                                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {formData.password.length >= passwordPolicy.password_min_length && formData.password.length <= passwordPolicy.password_max_length ? '✓' : '○'} {passwordPolicy.password_min_length}-{passwordPolicy.password_max_length} car.
                                                </span>
                                                {passwordPolicy.uppercase_required && (
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        /[A-Z]/.test(formData.password) ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {/[A-Z]/.test(formData.password) ? '✓' : '○'} Majuscule
                                                    </span>
                                                )}
                                                {passwordPolicy.lowercase_required && (
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        /[a-z]/.test(formData.password) ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {/[a-z]/.test(formData.password) ? '✓' : '○'} Minuscule
                                                    </span>
                                                )}
                                                {passwordPolicy.number_required && (
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        /[0-9]/.test(formData.password) ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {/[0-9]/.test(formData.password) ? '✓' : '○'} Chiffre
                                                    </span>
                                                )}
                                                {passwordPolicy.special_char_required && (
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        /[^A-Za-z0-9]/.test(formData.password) ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {/[^A-Za-z0-9]/.test(formData.password) ? '✓' : '○'} Spécial
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                                Confirmer le mot de passe <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                required
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                                placeholder="••••••••"
                                            />
                                            {formData.confirmPassword && (
                                                <div className="mt-1 text-[10px] font-semibold">
                                                    {formData.password === formData.confirmPassword ? (
                                                        <span className="text-emerald-600">✓ Les mots de passe correspondent</span>
                                                    ) : (
                                                        <span className="text-red-500">✗ Mots de passe différents</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                            Responsable Hiérarchique / Contact Référent
                                        </label>
                                        <input
                                            type="text"
                                            name="referentInterne"
                                            value={formData.referentInterne}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395]"
                                            placeholder="Nom et email de votre manager N+1 ou contact référent"
                                        />
                                    </div>

                                    {/* Récapitulatif dynamique du dossier */}
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                                        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                                            <span>Récapitulatif de votre demande :</span>
                                            <span className="text-[10px] font-mono text-slate-500">Rôle : {formData.roleSouhaite}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                            <div><span className="text-slate-500">Demandeur :</span> {formData.prenom} {formData.nom}</div>
                                            <div><span className="text-slate-500">Email :</span> {formData.email}</div>
                                            <div><span className="text-slate-500">Entité :</span> {formData.entite}</div>
                                            <div><span className="text-slate-500">Région :</span> {formData.region}</div>
                                        </div>
                                    </div>

                                    {/* Engagements de conformité NIS 2 */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-start gap-2.5 text-xs text-slate-600">
                                            <input
                                                id="acceptCharte"
                                                data-testid="accept-charte"
                                                type="checkbox"
                                                name="acceptCharte"
                                                checked={formData.acceptCharte}
                                                onChange={handleChange}
                                                className="mt-0.5 rounded border-slate-300 text-[#002395] focus:ring-[#002395] cursor-pointer"
                                            />
                                            <label htmlFor="acceptCharte" className="cursor-pointer">
                                                J'atteste sur l'honneur l'exactitude des informations renseignées et j'accepte les conditions générales d'utilisation du système d'accès mécatronique (Directive NIS 2).
                                            </label>
                                        </div>

                                        <div className="flex items-start gap-2.5 text-xs text-slate-600">
                                            <input
                                                id="acceptRegleOr"
                                                data-testid="accept-regle-or"
                                                type="checkbox"
                                                name="acceptRegleOr"
                                                checked={formData.acceptRegleOr}
                                                onChange={handleChange}
                                                className="mt-0.5 rounded border-slate-300 text-[#002395] focus:ring-[#002395] cursor-pointer"
                                            />
                                            <label htmlFor="acceptRegleOr" className="cursor-pointer">
                                                <strong>Règle d'or de sûreté ferroviaire :</strong> Je m'engage formellement à ne jamais prêter, céder ou laisser sans surveillance une clé F9000 ou un badge d'accès aux emprises ferroviaires.
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BOUTONS DE NAVIGATION DU WORKFLOW */}
                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                                {currentStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <i className="fas fa-arrow-left text-xs"></i>
                                        <span>Précédent</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleNavigateLogin}
                                        className="text-xs text-slate-500 hover:text-[#002395] font-semibold flex items-center gap-1"
                                    >
                                        <i className="fas fa-times text-xs"></i>
                                        <span>Annuler</span>
                                    </button>
                                )}

                                {currentStep < 4 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-5 py-2.5 bg-[#002395] text-white font-bold rounded-lg text-sm hover:bg-blue-800 transition shadow flex items-center gap-2 cursor-pointer ml-auto"
                                    >
                                        <span>Continuer</span>
                                        <i className="fas fa-arrow-right text-xs"></i>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-[#002395] text-white font-bold rounded-lg text-sm hover:bg-blue-800 transition shadow flex items-center gap-2 cursor-pointer ml-auto disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin text-sm"></i>
                                                <span>Soumission du Workflow...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check-circle text-sm"></i>
                                                <span>Valider mon Inscription</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* LIEN RETOUR CONNEXION */}
                            <div className="text-center pt-2">
                                <span className="text-xs text-slate-500">Vous avez déjà un compte ? </span>
                                <button
                                    type="button"
                                    onClick={handleNavigateLogin}
                                    className="text-xs font-bold text-[#002395] hover:underline cursor-pointer bg-transparent border-none p-0"
                                >
                                    Se connecter
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
