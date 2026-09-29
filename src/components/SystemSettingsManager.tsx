import React, { useState, useEffect } from 'react';

export interface SystemSettingItem {
    key: string;
    value_json: string;
    category: 'quotas' | 'relances' | 'rgpd' | 'tarification' | string;
    description?: string;
    updated_by?: string | null;
    updated_at: string;
    parsed_value?: any;
}

const CATEGORY_METADATA: Record<string, { label: string; icon: string; badgeColor: string; description: string }> = {
    workflow: {
        label: 'Workflow & Règles de Routage',
        icon: 'fas fa-diagram-project',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        description: 'Matrice de routage des types de demandes, rôles habilités et règles GPS'
    },
    tarification: {
        label: 'Tarification & Devis (S9)',
        icon: 'fas fa-euro-sign',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: 'Barème unitaire du devis différentiel S9, devises et délais de caducité'
    },
    quotas: {
        label: 'Quotas & Plafonds Commandes (S10)',
        icon: 'fas fa-gauge-high',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        description: 'Seuils maximaux de commandes avant escalade obligatoire vers le Référent National'
    },
    relances: {
        label: 'Relances & Automatismes S14',
        icon: 'fas fa-bell',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        description: 'Cadence des rappels et règles de forclusion automatique en incident Perte/Vol'
    },
    rgpd: {
        label: 'Validité des Comptes & RGPD',
        icon: 'fas fa-user-shield',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
        description: 'Durée de rétention des accès, expiration des comptes et conformité'
    },
    security: {
        label: 'Sécurité & Accès Mots de Passe',
        icon: 'fas fa-key',
        badgeColor: 'bg-red-100 text-red-800 border-red-300',
        description: 'Politique de complexité des mots de passe, limites de tentatives et verrouillage'
    }
};

export default function SystemSettingsManager() {
    const [settings, setSettings] = useState<SystemSettingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editJsonValue, setEditJsonValue] = useState<string>('');
    const [editDescription, setEditDescription] = useState<string>('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const token = localStorage.getItem('token');

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 6000);
    };

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/admin/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            } else {
                showFeedback('error', 'Erreur lors du chargement des paramètres système');
            }
        } catch (e: any) {
            showFeedback('error', `Erreur réseau: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const startEditing = (setting: SystemSettingItem) => {
        setEditingKey(setting.key);
        setEditDescription(setting.description || '');
        try {
            const parsed = JSON.parse(setting.value_json);
            setEditJsonValue(JSON.stringify(parsed, null, 2));
        } catch {
            setEditJsonValue(setting.value_json);
        }
        setJsonError(null);
    };

    const cancelEditing = () => {
        setEditingKey(null);
        setEditJsonValue('');
        setEditDescription('');
        setJsonError(null);
    };

    const handleSaveSetting = async (key: string) => {
        let parsedValue: any;
        try {
            parsedValue = JSON.parse(editJsonValue);
        } catch (e: any) {
            setJsonError(`JSON syntaxique invalide: ${e.message}`);
            return;
        }

        try {
            const res = await fetch(`/api/v1/admin/settings/${key}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    value: parsedValue,
                    description: editDescription
                })
            });

            if (res.ok) {
                showFeedback('success', `Paramètre '${key}' mis à jour avec succès. Prise d'effet immédiate sur le moteur.`);
                cancelEditing();
                await loadSettings();
            } else {
                const err = await res.json();
                showFeedback('error', err.error || 'Erreur lors de la sauvegarde');
            }
        } catch (e: any) {
            showFeedback('error', `Erreur réseau: ${e.message}`);
        }
    };

    const filteredSettings = settings.filter(s => {
        const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
        const matchesSearch = searchTerm === '' ||
            s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.value_json.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const categoriesList = Array.from(new Set(settings.map(s => s.category)));

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-6 shadow-sm border border-blue-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-yellow-400 text-blue-950 text-xs font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                                Directive Zero Hardcoding
                            </span>
                            <span className="bg-blue-800/80 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-mono">
                                Table: system_settings
                            </span>
                        </div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <i className="fas fa-sliders text-yellow-400"></i>
                            Paramètres Système & Règles Métier Dynamiques
                        </h2>
                        <p className="text-sm text-blue-200 mt-1 max-w-3xl leading-relaxed">
                            Tous les seuils de quotas (S10), barèmes tarifaires différentiels (S9), cadences de relance (S14) et règles RGPD sont administrables en temps réel. Aucune constante n'est codée en dur.
                        </p>
                    </div>

                    <button
                        onClick={loadSettings}
                        disabled={loading}
                        className="self-start md:self-auto px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 border border-blue-600 transition"
                    >
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Quick KPI Cards by Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(CATEGORY_METADATA).map(([catKey, catMeta]) => {
                    const catCount = settings.filter(s => s.category === catKey).length;
                    const isSelected = selectedCategory === catKey;

                    return (
                        <div
                            key={catKey}
                            onClick={() => setSelectedCategory(isSelected ? 'ALL' : catKey)}
                            className={`p-4 rounded-xl border transition cursor-pointer select-none ${
                                isSelected
                                    ? 'bg-blue-50/80 border-[#002395] ring-2 ring-[#002395]/20 shadow-sm'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                                    <i className={catMeta.icon}></i>
                                </div>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${catMeta.badgeColor}`}>
                                    {catCount} paramètre{catCount > 1 ? 's' : ''}
                                </span>
                            </div>
                            <h3 className="text-xs font-bold text-gray-900 leading-tight">
                                {catMeta.label}
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                {catMeta.description}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Filtrer par clé, description, contenu JSON..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                    <span className="text-xs text-gray-500 font-medium">Catégorie:</span>
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                            selectedCategory === 'ALL'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Toutes ({settings.length})
                    </button>
                    {categoriesList.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize transition ${
                                selectedCategory === cat
                                    ? 'bg-[#002395] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feedback notification */}
            {feedback && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-circle text-rose-600'}`}></i>
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Settings Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-700 font-semibold text-left">
                            <tr>
                                <th className="px-4 py-3">Clé de Paramètre & Catégorie</th>
                                <th className="px-4 py-3">Description Fonctionnelle</th>
                                <th className="px-4 py-3">Valeur Configurée (JSON Schema)</th>
                                <th className="px-4 py-3">Dernière Mise à Jour</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                        <i className="fas fa-circle-notch fa-spin text-lg mb-2"></i>
                                        <div>Chargement des paramètres système...</div>
                                    </td>
                                </tr>
                            ) : filteredSettings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                        Aucun paramètre système trouvé avec les filtres actuels.
                                    </td>
                                </tr>
                            ) : (
                                filteredSettings.map(setting => {
                                    const isEditing = editingKey === setting.key;
                                    const meta = CATEGORY_METADATA[setting.category];

                                    return (
                                        <tr key={setting.key} className={isEditing ? 'bg-amber-50/40' : 'hover:bg-gray-50/60'}>
                                            <td className="px-4 py-3 align-top whitespace-nowrap">
                                                <div className="font-mono font-bold text-gray-900 flex items-center gap-1.5">
                                                    <i className="fas fa-key text-blue-600 text-[10px]"></i>
                                                    {setting.key}
                                                </div>
                                                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                                    meta?.badgeColor || 'bg-gray-100 text-gray-700 border-gray-200'
                                                }`}>
                                                    {meta?.label || setting.category}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 align-top max-w-xs">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="w-full text-xs p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Description du paramètre..."
                                                    />
                                                ) : (
                                                    <div className="text-gray-600 leading-relaxed">
                                                        {setting.description || '—'}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 align-top font-mono">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <textarea
                                                            rows={6}
                                                            value={editJsonValue}
                                                            onChange={(e) => {
                                                                setEditJsonValue(e.target.value);
                                                                setJsonError(null);
                                                            }}
                                                            className={`w-full font-mono text-xs p-2 rounded border bg-gray-900 text-emerald-400 ${
                                                                jsonError ? 'border-rose-500' : 'border-gray-700'
                                                            }`}
                                                        />
                                                        {jsonError && (
                                                            <div className="text-rose-600 text-[11px] font-sans">
                                                                {jsonError}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-500 font-sans">
                                                            Modifiez la valeur JSON. Elle sera immédiatement validée et appliquée par le backend.
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-50 p-2 rounded border border-gray-200 text-gray-800 max-h-32 overflow-y-auto text-[11px] whitespace-pre-wrap">
                                                        {JSON.stringify(setting.parsed_value, null, 2)}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 align-top whitespace-nowrap text-gray-500 text-[11px]">
                                                <div>{new Date(setting.updated_at).toLocaleDateString()} {new Date(setting.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                {setting.updated_by && (
                                                    <span className="text-gray-400">par {setting.updated_by}</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleSaveSetting(setting.key)}
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition flex items-center gap-1 shadow-sm"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                            Valider
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded text-xs transition"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditing(setting)}
                                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#002395] font-semibold rounded text-xs transition flex items-center gap-1.5 border border-blue-200 ml-auto"
                                                    >
                                                        <i className="fas fa-pen text-[10px]"></i>
                                                        Modifier
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Live Operational Directives Documentation */}
            <div className="p-4 bg-gray-100 rounded-xl border border-gray-300 text-xs text-gray-600 space-y-2">
                <div className="font-bold text-gray-800 flex items-center gap-2">
                    <i className="fas fa-info-circle text-blue-700"></i>
                    Impact Opérationnel en Temps Réel des Paramètres
                </div>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li><strong>tarification_devis_differentiel_s9</strong> : Détermine instantanément le montant total calculé lors de la création d'un dossier avec du matériel (Stock Demandeur = 45 €, Stock Tampon = 85 €, Commande Neuve = 145 € par défaut).</li>
                    <li><strong>quota_hardware_default_limit</strong> : Définit le nombre de commandes physiques autorisées par demandeur (défaut = 5) avant que le statut ne bascule automatiquement en <code>ESCALATED_NATIONAL</code> (Validation Référent National).</li>
                    <li><strong>relance_s14_config</strong> : Régit le nombre d'avis de relance avant forclusion et escalade automatique en incident Perte/Vol (statut <code>AUTO_ESCALATED_INCIDENT</code>) si le PV de réception n'est pas signé.</li>
                </ul>
            </div>
        </div>
    );
}
