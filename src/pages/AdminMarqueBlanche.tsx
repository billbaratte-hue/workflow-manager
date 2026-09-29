import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant, TenantInfo } from '../context/TenantContext';
import {
    Palette,
    Upload,
    Check,
    AlertCircle,
    Building2,
    Plus,
    RefreshCw,
    Eye,
    Sparkles,
    Shield,
    Layers,
    Sliders
} from 'lucide-react';

const COLOR_PRESETS = [
    {
        name: 'Bleu Entreprise',
        primary: '#1e3a8a',
        secondary: '#0f172a',
        accent: '#f59e0b',
        preview: 'bg-blue-900'
    },
    {
        name: 'Émeraude & Forêt',
        primary: '#065f46',
        secondary: '#064e3b',
        accent: '#10b981',
        preview: 'bg-emerald-900'
    },
    {
        name: 'Indigo & Nuit',
        primary: '#3730a3',
        secondary: '#1e1b4b',
        accent: '#818cf8',
        preview: 'bg-indigo-900'
    },
    {
        name: 'Ardoise & Carmin',
        primary: '#334155',
        secondary: '#0f172a',
        accent: '#e11d48',
        preview: 'bg-slate-800'
    },
    {
        name: 'Bordeaux & Or',
        primary: '#881337',
        secondary: '#4c0519',
        accent: '#fbbf24',
        preview: 'bg-rose-950'
    },
    {
        name: 'Teal Moderne',
        primary: '#115e59',
        secondary: '#134e4a',
        accent: '#14b8a6',
        preview: 'bg-teal-900'
    }
];

export default function AdminMarqueBlanche() {
    const { tenant, allTenants, updateBranding, uploadLogo, switchTenant, createTenant } = useTenant();

    // Form state for branding
    const [name, setName] = useState(tenant.name || '');
    const [description, setDescription] = useState(tenant.description || '');
    const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
    const [primaryColor, setPrimaryColor] = useState(tenant.primary_color || '#1e3a8a');
    const [secondaryColor, setSecondaryColor] = useState(tenant.secondary_color || '#0f172a');
    const [accentColor, setAccentColor] = useState(tenant.accent_color || '#f59e0b');

    // Tenant Creation Modal State
    const [showNewTenantModal, setShowNewTenantModal] = useState(false);
    const [newTenantId, setNewTenantId] = useState('');
    const [newTenantName, setNewTenantName] = useState('');
    const [newTenantCode, setNewTenantCode] = useState('');
    const [newTenantColor, setNewTenantColor] = useState('#1e3a8a');

    // UI Feedback
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSaveBranding = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFeedback(null);

        const ok = await updateBranding({
            name: name.trim(),
            description: description.trim(),
            logo_url: logoUrl.trim(),
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor
        });

        setSaving(false);
        if (ok) {
            setFeedback({ type: 'success', message: 'Paramètres de marque blanche et variables CSS enregistrés avec succès.' });
            setTimeout(() => setFeedback(null), 4000);
        } else {
            setFeedback({ type: 'error', message: 'Erreur lors de la sauvegarde des modifications.' });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setFeedback({ type: 'error', message: 'Le logo ne doit pas dépasser 2 Mo.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            setLogoUrl(dataUrl);
            await uploadLogo(dataUrl);
            setFeedback({ type: 'success', message: 'Logo téléversé et appliqué immédiatement.' });
            setTimeout(() => setFeedback(null), 4000);
        };
        reader.readAsDataURL(file);
    };

    const handlePresetApply = (preset: typeof COLOR_PRESETS[0]) => {
        setPrimaryColor(preset.primary);
        setSecondaryColor(preset.secondary);
        setAccentColor(preset.accent);
    };

    const handleCreateTenantSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTenantId || !newTenantName) return;

        const res = await createTenant({
            id: newTenantId.toLowerCase().trim(),
            name: newTenantName.trim(),
            code: (newTenantCode || newTenantId).toUpperCase().trim(),
            primary_color: newTenantColor
        });

        if (res) {
            setShowNewTenantModal(false);
            setNewTenantId('');
            setNewTenantName('');
            setNewTenantCode('');
            setFeedback({ type: 'success', message: `Nouvelle instance '${res.name}' créée avec succès.` });
        } else {
            setFeedback({ type: 'error', message: 'Échec de la création de la nouvelle instance client.' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Link to="/admin" className="hover:text-blue-700 transition">Espace Administrateur</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">Architecture</span>
                        <span>/</span>
                        <span className="text-blue-700 font-semibold">Marque Blanche & Multi-Tenant</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-base">
                            <Palette className="w-5 h-5" />
                        </span>
                        Marque Blanche & Multi-Tenant (Epic 1)
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Déployez la plateforme aux couleurs de n'importe quelle entreprise cliente sans toucher au code source.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNewTenantModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouvelle Instance Client</span>
                    </button>
                    <Link
                        to="/admin/parametres-systeme"
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                        <Sliders className="w-4 h-4" />
                        <span>Paramètres Système</span>
                    </Link>
                </div>
            </div>

            {/* Notification Feedback */}
            {feedback && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-red-50 text-red-900 border-red-200'
                }`}>
                    {feedback.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Multi-Tenant Switcher Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400 border border-white/10">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Instance Client Active (tenant_id)</span>
                        </div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>{tenant.name}</span>
                            <span className="text-xs font-mono bg-indigo-800/80 px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-200">
                                {tenant.id}
                            </span>
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-300 font-medium whitespace-nowrap">Changer d'instance :</label>
                    <select
                        value={tenant.id}
                        onChange={(e) => switchTenant(e.target.value)}
                        className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                        {allTenants.map(t => (
                            <option key={t.id} value={t.id} className="text-gray-900 bg-white">
                                {t.name} ({t.id})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Formulaire de Configuration */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        <span>Personnalisation Visuelle & Identité</span>
                    </h3>

                    <form onSubmit={handleSaveBranding} className="space-y-5">
                        {/* Instance Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Nom de l'Instance / Entreprise <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ex: Airbus Opérations, Veolia Services, Alstom Rail..."
                                required
                                className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                Ce nom s'affiche dans la barre de navigation, les en-têtes et les notifications système.
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Description ou Slogan
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="ex: Plateforme Sécurisée d'Opérations et Gestion des Habilitations"
                                className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Logo Upload & URL */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Logo de l'Entreprise
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <input
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="URL directe de l'image (https://... ou data:image/...)"
                                    className="flex-1 text-sm px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer transition">
                                    <Upload className="w-4 h-4 text-gray-500" />
                                    <span>Téléverser</span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/svg+xml"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Presets de Couleurs */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Palettes Prédéfinies
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => handlePresetApply(preset)}
                                        className="p-2 border border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-xs transition text-left flex items-center gap-2.5 group cursor-pointer"
                                    >
                                        <div className="flex items-center -space-x-1">
                                            <span className="w-5 h-5 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.primary }} />
                                            <span className="w-5 h-5 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.secondary }} />
                                            <span className="w-5 h-5 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.accent }} />
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate">
                                            {preset.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Pickers */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            {/* Primary */}
                            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Couleur Primaire
                                </label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-9 h-9 rounded-lg border border-gray-300 p-0.5 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-full text-xs font-mono uppercase px-2 py-1.5 border border-gray-300 rounded-md bg-white"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">Barre de navigation principale</span>
                            </div>

                            {/* Secondary */}
                            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Couleur Secondaire
                                </label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="w-9 h-9 rounded-lg border border-gray-300 p-0.5 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="w-full text-xs font-mono uppercase px-2 py-1.5 border border-gray-300 rounded-md bg-white"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">Sous-menus & en-têtes</span>
                            </div>

                            {/* Accent */}
                            <div className="p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Couleur d'Accent
                                </label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                        className="w-9 h-9 rounded-lg border border-gray-300 p-0.5 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                        className="w-full text-xs font-mono uppercase px-2 py-1.5 border border-gray-300 rounded-md bg-white"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">Boutons d'action & badges</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                <span>Enregistrer & Appliquer à la Plateforme</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Prévisualisation en direct */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-indigo-600" />
                                <span>Aperçu en Direct (Live Preview)</span>
                            </h3>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                                CSS Variables
                            </span>
                        </div>

                        {/* Simulated Navbar */}
                        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                            {/* Primary Bar */}
                            <div
                                className="px-4 py-3 text-white flex items-center justify-between"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <div className="flex items-center gap-3">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="h-7 max-w-[120px] object-contain bg-white/20 p-1 rounded" />
                                    ) : (
                                        <div className="bg-white text-gray-900 font-bold px-2 py-0.5 rounded text-xs shadow-xs flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-indigo-600" />
                                            <span>{name || "Nom Entreprise"}</span>
                                        </div>
                                    )}
                                    <span className="text-xs font-semibold opacity-90 hidden sm:inline">Portail</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded text-gray-950"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        Badge
                                    </span>
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                        AD
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Bar */}
                            <div
                                className="px-4 py-2 text-white/90 text-xs flex items-center gap-4"
                                style={{ backgroundColor: secondaryColor }}
                            >
                                <span className="font-bold underline" style={{ color: accentColor }}>Catalogue</span>
                                <span>Mes Demandes</span>
                                <span>Administration</span>
                            </div>

                            {/* Content Body Preview */}
                            <div className="p-4 bg-gray-50 space-y-3">
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                                    <h4 className="text-xs font-bold text-gray-800">Dossier #DEM-2026-001</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Demande d'accès et habilitations sur site</p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400">Statut : En cours</span>
                                        <button
                                            type="button"
                                            className="px-2.5 py-1 rounded text-[11px] font-bold text-gray-900 shadow-2xs cursor-default"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            Consulter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Variables CSS générées */}
                        <div className="bg-gray-900 text-gray-200 p-3.5 rounded-xl font-mono text-[11px] space-y-1">
                            <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans font-bold">
                                Variables CSS Actives :
                            </div>
                            <div>:root &#123;</div>
                            <div className="pl-4 text-blue-300">--brand-primary: <span className="text-white font-bold">{primaryColor}</span>;</div>
                            <div className="pl-4 text-blue-300">--brand-secondary: <span className="text-white font-bold">{secondaryColor}</span>;</div>
                            <div className="pl-4 text-blue-300">--brand-accent: <span className="text-white font-bold">{accentColor}</span>;</div>
                            <div>&#125;</div>
                        </div>
                    </div>

                    {/* Security & Multi-Tenant Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
                        <div className="font-bold flex items-center gap-2 text-blue-950">
                            <Shield className="w-4 h-4 text-blue-700" />
                            <span>Garantie d'Isolation des Données (Critique)</span>
                        </div>
                        <p className="text-blue-800 leading-relaxed">
                            Toutes les tables et requêtes API filtrent automatiquement sur le champ <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-950">tenant_id</code>. Aucun mélange de données n'est possible entre différentes instances clientes partageant l'infrastructure.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Création d'Instance Client */}
            {showNewTenantModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200">
                        <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Créer une Nouvelle Instance Client</span>
                            </h3>
                            <button
                                onClick={() => setShowNewTenantModal(false)}
                                className="text-gray-300 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateTenantSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Identifiant Unique (tenant_id) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTenantId}
                                    onChange={(e) => setNewTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                    placeholder="ex: airbus, veolia, alstom..."
                                    required
                                    className="w-full text-xs font-mono px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <span className="text-[10px] text-gray-400">Lettres minuscules, chiffres et tirets uniquement</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nom de l'Entreprise <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTenantName}
                                    onChange={(e) => setNewTenantName(e.target.value)}
                                    placeholder="ex: Airbus Operations SAS"
                                    required
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Code Trigramme
                                </label>
                                <input
                                    type="text"
                                    value={newTenantCode}
                                    onChange={(e) => setNewTenantCode(e.target.value.toUpperCase())}
                                    placeholder="ex: AIR, VEO, ALS"
                                    maxLength={8}
                                    className="w-full text-xs font-mono uppercase px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Couleur Principale
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={newTenantColor}
                                        onChange={(e) => setNewTenantColor(e.target.value)}
                                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={newTenantColor}
                                        onChange={(e) => setNewTenantColor(e.target.value)}
                                        className="w-full text-xs font-mono uppercase px-2 py-1.5 border border-gray-300 rounded"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewTenantModal(false)}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
                                >
                                    Créer l'Instance
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
