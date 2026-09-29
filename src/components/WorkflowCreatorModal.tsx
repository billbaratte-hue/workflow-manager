import React, { useState, useEffect } from 'react';
import {
    X,
    Plus,
    Trash2,
    Sliders,
    Sparkles,
    Shield,
    MapPin,
    FileCheck,
    AlertTriangle,
    CreditCard,
    Users,
    ChevronRight,
    Layers,
    Save
} from 'lucide-react';
import { RequestType, ItemType, HardwareOrigin, WorkflowRulesConfig, ParentRequest } from '../types';
import { WORKFLOW_TEMPLATES, CUSTOM_BLANK_TEMPLATE, WorkflowTemplate, WorkflowTemplateItem } from '../data/workflowTemplates';

interface WorkflowCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (createdDossier: ParentRequest) => void;
    initialTemplate?: WorkflowTemplate | null;
    availableTemplates?: WorkflowTemplate[];
}

export const WorkflowCreatorModal: React.FC<WorkflowCreatorModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialTemplate,
    availableTemplates
}) => {
    const templatesList = availableTemplates && availableTemplates.length > 0 ? availableTemplates : WORKFLOW_TEMPLATES;
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplate?.id || templatesList[0]?.id || CUSTOM_BLANK_TEMPLATE.id);
    const [activeSection, setActiveSection] = useState<'params' | 'validation' | 'terrain' | 'quotas' | 'items'>('params');

    // General Parameters
    const [requestType, setRequestType] = useState<RequestType>('HABILITATION');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [siteName, setSiteName] = useState('Site Central Paris');
    const [requesterName, setRequesterName] = useState('Daniel Dupont');
    const [requesterEmail, setRequesterEmail] = useState('demandeur@entreprise.fr');
    const [requesterId, setRequesterId] = useState<number>(1042);
    const [hasSpecialTag, setHasSpecialTag] = useState(false);

    // Rules
    const [rules, setRules] = useState<WorkflowRulesConfig>({
        validation_mode: 'PARALLEL_ITEMS',
        allowed_manager_roles: ['Manager', 'Responsable d\'équipe', 'Chef de Projet'],
        allowed_validator_roles: ['Validateur', 'Validateur de Site', 'Responsable Sécurité'],
        allowed_national_roles: ['Référent National', 'Administrateur National'],
        requires_gps: false,
        gps_max_distance_meters: 250,
        gps_max_accuracy_meters: 50,
        requires_reception_pv: false,
        requires_gdpr: false,
        auto_chain_key_order: false,
        check_quota: false,
        custom_quota_limit: 2,
        max_reminder_bounces: 3,
        auto_incident_on_timeout: true,
        requires_quote_po: false,
        custom_quote_amount: 85.00,
        custom_quote_currency: 'EUR',
        enable_e123_blacklist: false,
        auto_exclusion_rule: false
    });

    // Request Items
    const [items, setItems] = useState<WorkflowTemplateItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load template data when template selection changes
    const applyTemplate = (tpl: WorkflowTemplate) => {
        setSelectedTemplateId(tpl.id);
        setRequestType(tpl.request_type);
        setTitle(tpl.default_title);
        setDescription(tpl.default_description);
        setSiteName(tpl.default_site_name);
        setHasSpecialTag(tpl.has_special_tag);
        setRules({ ...tpl.rules });
        setItems(tpl.default_items.map(it => ({ ...it })));
    };

    useEffect(() => {
        if (isOpen) {
            const target = initialTemplate || WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplateId) || WORKFLOW_TEMPLATES[0];
            applyTemplate(target);
        }
    }, [isOpen, initialTemplate]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        const defaultItemType: ItemType = requestType === 'KEY_ORDER' ? 'KEY'
            : requestType === 'CYLINDER_ORDER' ? 'CYLINDER'
            : requestType === 'TERMINAL_ORDER' ? 'TERMINAL'
            : requestType === 'USER_ACCOUNT' ? 'USER_CREATION'
            : 'ACCESS_RIGHT';

        setItems(prev => [
            ...prev,
            {
                item_type: defaultItemType,
                label: `Nouvel élément #${prev.length + 1}`,
                target_site_name: siteName,
                designated_validator_name: 'Valérie Validateur',
                hardware_origin: 'NEW_ORDER'
            }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleUpdateItem = (index: number, updates: Partial<WorkflowTemplateItem>) => {
        setItems(prev => prev.map((it, idx) => idx === index ? { ...it, ...updates } : it));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const payload = {
                request_type: requestType,
                title,
                description,
                site_name: siteName,
                requester_name: requesterName,
                requester_email: requesterEmail,
                requester_id: requesterId,
                has_special_tag: hasSpecialTag,
                quote_amount: rules.requires_quote_po ? (rules.custom_quote_amount || 85.00) : 0,
                quote_currency: rules.custom_quote_currency || 'EUR',
                workflow_rules: rules,
                metadata: {
                    source_template_id: selectedTemplateId,
                    created_via: 'GENERIC_WORKFLOW_CREATOR'
                },
                items: items.map(it => ({
                    item_type: it.item_type,
                    label: it.label,
                    target_site_name: it.target_site_name || siteName,
                    designated_validator_name: it.designated_validator_name || 'Valérie Validateur',
                    hardware_origin: it.hardware_origin || 'NEW_ORDER',
                    hardware_serial_number: it.hardware_serial_number || null,
                    status: 'DRAFT'
                }))
            };

            const res = await fetch('/api/v1/workflow/dossiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors de la création du workflow');
            }

            const created = await res.json();
            onSuccess(created);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Une erreur inattendue est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Créateur de Workflow & Règles Métier</h2>
                            <p className="text-xs text-slate-500">Génération générique avec paramètres, circuits de validation et règles système embarqués</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Template Selector Bar */}
                <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap mr-1">
                        Modèle de référence :
                    </span>
                    {templatesList.map(tpl => (
                        <button
                            key={tpl.id}
                            type="button"
                            onClick={() => applyTemplate(tpl)}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-all whitespace-nowrap ${
                                selectedTemplateId === tpl.id
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-blue-100/60 border border-slate-200'
                            }`}
                        >
                            {tpl.code ? tpl.code : `P${tpl.process_number}`} : {tpl.short_title || tpl.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => applyTemplate(CUSTOM_BLANK_TEMPLATE)}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-all whitespace-nowrap ${
                            selectedTemplateId === CUSTOM_BLANK_TEMPLATE.id
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                        }`}
                    >
                        <Sliders className="w-3 h-3 inline mr-1" />
                        Sur mesure
                    </button>
                </div>

                {/* Navigation Sections */}
                <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setActiveSection('params')}
                        className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeSection === 'params' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        1. Paramètres Généraux
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('validation')}
                        className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeSection === 'validation' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        2. Circuits & Validation
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('terrain')}
                        className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeSection === 'terrain' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        3. GPS & PV Réception
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('quotas')}
                        className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeSection === 'quotas' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        4. Quotas, RGPD & Finances
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('items')}
                        className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeSection === 'items' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        5. Éléments Unitaires ({items.length})
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* SECTION 1: PARAMETRES GENERAUX */}
                    {activeSection === 'params' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Type de Requête (RequestType)
                                    </label>
                                    <select
                                        value={requestType}
                                        onChange={e => setRequestType(e.target.value as RequestType)}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="HABILITATION">Processus 1: HABILITATION (Droits d'accès)</option>
                                        <option value="USER_ACCOUNT">Processus 2: USER_ACCOUNT (Création de compte)</option>
                                        <option value="KEY_ORDER">Processus 3: KEY_ORDER (Commande de clé)</option>
                                        <option value="CYLINDER_ORDER">Processus 4: CYLINDER_ORDER (Cylindre / Cadenas)</option>
                                        <option value="TERMINAL_ORDER">Processus 5: TERMINAL_ORDER (Borne de recharge)</option>
                                        <option value="MASS_DEPLOY">Processus 6: MASS_DEPLOY (Déploiement massif S29)</option>
                                        <option value="INCIDENT">Processus 7: INCIDENT (Perte / Vol / Révocation)</option>
                                        <option value="ORG_CHANGE">Processus 8: ORG_CHANGE (Structure organisationnelle)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Site Principal
                                    </label>
                                    <input
                                        type="text"
                                        value={siteName}
                                        onChange={e => setSiteName(e.target.value)}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        placeholder="ex: Paris Gare du Nord"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Titre du Dossier de Workflow
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    placeholder="Intitulé officiel de la demande"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Description & Justification Métier
                                </label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    placeholder="Contexte opérationnel..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Nom Demandeur
                                    </label>
                                    <input
                                        type="text"
                                        value={requesterName}
                                        onChange={e => setRequesterName(e.target.value)}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Email Demandeur
                                    </label>
                                    <input
                                        type="email"
                                        value={requesterEmail}
                                        onChange={e => setRequesterEmail(e.target.value)}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        ID Demandeur
                                    </label>
                                    <input
                                        type="number"
                                        value={requesterId}
                                        onChange={e => setRequesterId(Number(e.target.value))}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 p-3 bg-amber-50/60 border border-amber-200 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasSpecialTag}
                                        onChange={e => setHasSpecialTag(e.target.checked)}
                                        className="w-4 h-4 text-amber-600 rounded-sm border-slate-300 focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-amber-900 block">Exiger un TAG Spécial (Restriction Sécurité)</span>
                                        <span className="text-[11px] text-amber-700">Dossier réservé aux profils accrédités ou équipements critiques (ex: Processus 5 borne ou Processus 8 réorganisation).</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: VALIDATION CIRCUITS */}
                    {activeSection === 'validation' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Mode de Validation du Circuit Système
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        {
                                            id: 'PARALLEL_ITEMS',
                                            title: 'Validation Unitaire Asynchrone (Multi-Sites)',
                                            desc: 'Chaque item du dossier est validé individuellement par son propre validateur de site local.'
                                        },
                                        {
                                            id: 'CROSS_VALIDATION',
                                            title: 'Validation Croisée (N+1 & Sécurité)',
                                            desc: 'Double signature requise : Manager N+1 et Validateur Sécurité de Site.'
                                        },
                                        {
                                            id: 'TRIPARTITE',
                                            title: 'Validation Tripartite (N+1, Local, National)',
                                            desc: 'Exige l\'approbation consécutive du Manager, du Validateur Local et du Référent National.'
                                        },
                                        {
                                            id: 'AUTO_FULFILL',
                                            title: 'Approbation Automatique Immédiate',
                                            desc: 'Approbation instantanée dès la soumission (pour réorganisations et profils exemptés).'
                                        }
                                    ].map(mode => (
                                        <label
                                            key={mode.id}
                                            className={`p-3.5 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                                                rules.validation_mode === mode.id
                                                    ? 'border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <span className="text-xs font-bold text-slate-800">{mode.title}</span>
                                                <input
                                                    type="radio"
                                                    name="validation_mode"
                                                    value={mode.id}
                                                    checked={rules.validation_mode === mode.id}
                                                    onChange={() => setRules(r => ({ ...r, validation_mode: mode.id as any }))}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-2">{mode.desc}</p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-700">Rôles Habilités pour ce Workflow</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">
                                            Rôles d'approbation Manager (séparés par virgule)
                                        </label>
                                        <input
                                            type="text"
                                            value={rules.allowed_manager_roles?.join(', ') || ''}
                                            onChange={e => setRules(r => ({ ...r, allowed_manager_roles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                            placeholder="Manager, Responsable d'équipe..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">
                                            Rôles d'approbation Validateur de Site
                                        </label>
                                        <input
                                            type="text"
                                            value={rules.allowed_validator_roles?.join(', ') || ''}
                                            onChange={e => setRules(r => ({ ...r, allowed_validator_roles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                                            placeholder="Validateur, Responsable Sécurité..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: GPS & TERRAIN */}
                    {activeSection === 'terrain' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="p-4 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rules.requires_gps || false}
                                        onChange={e => setRules(r => ({ ...r, requires_gps: e.target.checked }))}
                                        className="w-4 h-4 text-cyan-600 rounded-sm focus:ring-cyan-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-cyan-900 block">Exiger un Relevé GPS de Pose (Commissioning Terrain)</span>
                                        <span className="text-[11px] text-cyan-700">Le technicien doit enregistrer ses coordonnées GPS lors de l'installation physique.</span>
                                    </div>
                                </label>

                                {rules.requires_gps && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-cyan-200">
                                        <div>
                                            <label className="block text-xs font-semibold text-cyan-900 mb-1">
                                                Précision GPS Maximale Requise (mètres)
                                            </label>
                                            <input
                                                type="number"
                                                value={rules.gps_max_accuracy_meters || 50}
                                                onChange={e => setRules(r => ({ ...r, gps_max_accuracy_meters: Number(e.target.value) }))}
                                                className="w-full text-xs px-3 py-2 border border-cyan-300 rounded-lg bg-white"
                                            />
                                            <p className="text-[10px] text-cyan-600 mt-1">Rejet automatique si l'incertitude satellite dépasse ce seuil (ex: 50m).</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-cyan-900 mb-1">
                                                Rayon Maximal par rapport au Site (mètres)
                                            </label>
                                            <input
                                                type="number"
                                                value={rules.gps_max_distance_meters || 250}
                                                onChange={e => setRules(r => ({ ...r, gps_max_distance_meters: Number(e.target.value) }))}
                                                className="w-full text-xs px-3 py-2 border border-cyan-300 rounded-lg bg-white"
                                            />
                                            <p className="text-[10px] text-cyan-600 mt-1">Distance maximale autorisée de l'intervenant par rapport au centre du site.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rules.requires_reception_pv || false}
                                        onChange={e => setRules(r => ({ ...r, requires_reception_pv: e.target.checked }))}
                                        className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-indigo-900 block">Signature Obligatoire du Procès-Verbal (PV) de Réception</span>
                                        <span className="text-[11px] text-indigo-700">Le matériel transite par l'état EXPEDIE et ne devient ACTIF qu'après signature de l'accusé de réception.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: QUOTAS, RGPD & FINANCES */}
                    {activeSection === 'quotas' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            {/* Quota S10 */}
                            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rules.check_quota || false}
                                        onChange={e => setRules(r => ({ ...r, check_quota: e.target.checked }))}
                                        className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-amber-900 block">Contrôle de Quota S10 de Commandes</span>
                                        <span className="text-[11px] text-amber-700">Escalade automatiquement en Arbitrage National si le demandeur dépasse son quota annuel.</span>
                                    </div>
                                </label>

                                {rules.check_quota && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-amber-200">
                                        <div>
                                            <label className="block text-xs font-semibold text-amber-900 mb-1">
                                                Limite de Commandes Autorisées (Seuil Quota)
                                            </label>
                                            <input
                                                type="number"
                                                value={rules.custom_quota_limit || 2}
                                                onChange={e => setRules(r => ({ ...r, custom_quota_limit: Number(e.target.value) }))}
                                                className="w-full text-xs px-3 py-2 border border-amber-300 rounded-lg bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-amber-900 mb-1">
                                                Nombre de Relances S14 avant Incident Perte/Vol
                                            </label>
                                            <input
                                                type="number"
                                                value={rules.max_reminder_bounces || 3}
                                                onChange={e => setRules(r => ({ ...r, max_reminder_bounces: Number(e.target.value) }))}
                                                className="w-full text-xs px-3 py-2 border border-amber-300 rounded-lg bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RGPD & Chaining */}
                            <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rules.requires_gdpr || false}
                                        onChange={e => setRules(r => ({ ...r, requires_gdpr: e.target.checked }))}
                                        className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-teal-900 block">Exiger la Charte RGPD</span>
                                        <span className="text-[11px] text-teal-700">Le demandeur doit accepter électroniquement la transmission de données personnelles avant activation.</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input
                                        type="checkbox"
                                        checked={rules.auto_chain_key_order || false}
                                        onChange={e => setRules(r => ({ ...r, auto_chain_key_order: e.target.checked }))}
                                        className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-teal-900 block">Chaînage Conditionnel de Clé Mécatronique</span>
                                        <span className="text-[11px] text-teal-700">Proposer automatiquement la création d'une commande de clé dès la clôture de ce compte.</span>
                                    </div>
                                </label>
                            </div>

                            {/* PO & Devis S9 */}
                            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rules.requires_quote_po || false}
                                        onChange={e => setRules(r => ({ ...r, requires_quote_po: e.target.checked }))}
                                        className="w-4 h-4 text-rose-600 rounded-sm focus:ring-rose-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-rose-900 block">Exiger un Devis Différentiel S9 & Bon de Commande (PO)</span>
                                        <span className="text-[11px] text-rose-700">Bloque l'expédition jusqu'à la saisie et validation de la référence de commande externe.</span>
                                    </div>
                                </label>

                                {rules.requires_quote_po && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-rose-200">
                                        <div>
                                            <label className="block text-xs font-semibold text-rose-900 mb-1">
                                                Montant du Devis Différentiel (EUR)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={rules.custom_quote_amount || 85.00}
                                                onChange={e => setRules(r => ({ ...r, custom_quote_amount: Number(e.target.value) }))}
                                                className="w-full text-xs px-3 py-2 border border-rose-300 rounded-lg bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: ITEMS */}
                    {activeSection === 'items' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800">Éléments Unitaires du Dossier</h4>
                                    <p className="text-[11px] text-slate-500">Chaque élément représente un matériel, un cylindre ou un droit d'accès soumis au circuit.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Ajouter un élément
                                </button>
                            </div>

                            <div className="space-y-2">
                                {items.length === 0 ? (
                                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                        Aucun élément unitaire dans ce dossier. Cliquez sur "Ajouter un élément" pour en créer un.
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                                            <span className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-700 font-bold rounded-full text-xs flex-shrink-0">
                                                {idx + 1}
                                            </span>

                                            <div className="w-32 flex-shrink-0">
                                                <select
                                                    value={item.item_type}
                                                    onChange={e => handleUpdateItem(idx, { item_type: e.target.value as ItemType })}
                                                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                                                >
                                                    <option value="ACCESS_RIGHT">Droit d'accès</option>
                                                    <option value="KEY">Clé mécatronique</option>
                                                    <option value="CYLINDER">Cylindre</option>
                                                    <option value="PADLOCK">Cadenas</option>
                                                    <option value="TERMINAL">Borne</option>
                                                    <option value="USER_CREATION">Compte SI</option>
                                                </select>
                                            </div>

                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={item.label}
                                                    onChange={e => handleUpdateItem(idx, { label: e.target.value })}
                                                    placeholder="Libellé de l'élément..."
                                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                                                />
                                            </div>

                                            <div className="w-36 flex-shrink-0">
                                                <input
                                                    type="text"
                                                    value={item.target_site_name || ''}
                                                    onChange={e => handleUpdateItem(idx, { target_site_name: e.target.value })}
                                                    placeholder="Site cible..."
                                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                                                />
                                            </div>

                                            <div className="w-32 flex-shrink-0">
                                                <select
                                                    value={item.hardware_origin || 'NEW_ORDER'}
                                                    onChange={e => handleUpdateItem(idx, { hardware_origin: e.target.value as HardwareOrigin })}
                                                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                                                >
                                                    <option value="NEW_ORDER">Commande neuve</option>
                                                    <option value="SUPPLIER_STOCK">Stock S9</option>
                                                    <option value="USER_STOCK">Stock interne</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            <span>Règles de validation & tolérances système directement embarquées dans l'instance</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Génération en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Créer le Workflow avec ses Règles Embarquées</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
