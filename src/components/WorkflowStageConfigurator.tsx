import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    Bell,
    Mail,
    Plus,
    Trash2,
    HelpCircle,
    Shield,
    Sparkles,
    FileCheck,
    Sliders,
    Tag,
    MapPin,
    MessageSquare,
    Check,
    ChevronDown,
    ChevronUp,
    Info,
    Send,
    Edit3,
    ExternalLink,
    Tags,
    DollarSign,
    Users,
    Lock,
    FileText,
    BookOpen,
    Search,
    X
} from 'lucide-react';
import { getStatuses, getReferenceTables, getFormulaires } from '../lib/api';
import { CustomStatusConfig, WorkflowTransition } from '../types';
import {
    TargetFieldDefinition,
    BASE_TARGET_FIELDS,
    extractFormFields,
    extractTableFields,
    findFieldByKey,
    FIELD_CATEGORIES
} from '../data/fieldCatalog';

export interface AppRole {
    id: number;
    name: string;
    description?: string;
    privileges?: string[];
}

export type RuleType =
    | 'FORM_COMPLETION'
    | 'FIELD_VALUE'
    | 'QUOTA_CHECK'
    | 'RGPD_CONSENT'
    | 'SPECIAL_TAG'
    | 'GPS_TERRAIN'
    | 'FEEDBACK_RECEIPT'
    | 'FINANCIAL_THRESHOLD'
    | 'DUAL_APPROVAL_4EYES'
    | 'SLA_ESCALATION'
    | 'DOCUMENT_MANDATORY'
    | 'SECURITY_HABILITATION'
    | 'CUSTOM';

export interface StageRule {
    id: string;
    type: RuleType;
    title: string;
    description?: string;
    enabled: boolean;
    require_all_required?: boolean;
    field_ids?: string[];
    field_id?: string;
    operator?: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_NOT_EMPTY';
    expected_value?: string;
    quota_limit?: number;
    quota_scope?: 'USER' | 'SITE' | 'TEAM';
    quota_period?: 'MONTH' | 'YEAR' | 'ACTIVE_SIMULTANEOUS';
    tag_name?: string;
    gps_tolerance_meters?: number;
    receipt_type?: 'SIGNATURE' | 'PV_DELIVERY' | 'SATISFACTION_SURVEY' | 'CHECKLIST';
    custom_condition_text?: string;
    financial_threshold_amount?: number;
    financial_escalation_role?: string;
    sla_max_hours?: number;
    required_document_name?: string;
    prevent_self_approval?: boolean;
}

export type StageNotifTrigger = 'ON_ENTER' | 'ON_FULFILL' | 'ON_REJECT' | 'ON_SLA_BREACH';

export interface StageNotificationItem {
    id: string;
    trigger: StageNotifTrigger;
    name?: string;
    recipient_type: 'DEMANDEUR' | 'CURRENT_VALIDATOR' | 'NEXT_VALIDATOR' | 'ALL_STAKEHOLDERS' | 'ROLE' | 'CUSTOM_EMAIL';
    recipient_role?: string;
    recipient_email?: string;
    subject: string;
    message: string;
    channel: 'IN_APP' | 'EMAIL' | 'BOTH';
    enabled: boolean;
}

export interface StageConfig {
    id: string;
    order: number;
    name: string;
    status_key?: string;
    validator_role: string;
    sla_hours?: number;
    requires_document?: boolean;
    fulfillment_mode?: 'MANUAL_APPROVAL' | 'AUTO_WHEN_RULES_PASS' | 'MULTI_APPROVAL';
    instruction?: string;
    rules?: StageRule[];
    notifications?: StageNotificationItem[];
    position?: { x: number; y: number };
    transitions?: WorkflowTransition[];
}

interface WorkflowStageConfiguratorProps {
    stage: StageConfig;
    availableRoles: AppRole[];
    availableFields: { id: string; label: string; type: string }[];
    onUpdateStage: (updatedStage: StageConfig) => void;
}

export const RULE_PRESETS: { type: RuleType; label: string; description: string; icon: any; color: string }[] = [
    {
        type: 'FORM_COMPLETION',
        label: 'Complétion du Formulaire',
        description: 'Exige que tous les champs obligatoires ou une sélection de champs soient saisis',
        icon: FileCheck,
        color: 'text-blue-700 bg-blue-50 border-blue-200'
    },
    {
        type: 'FIELD_VALUE',
        label: 'Condition sur Valeur de Champ',
        description: 'Vérifie si la valeur d\'un champ remplit une condition (ex: montant > seuil, urgence = critique)',
        icon: Sliders,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    },
    {
        type: 'QUOTA_CHECK',
        label: 'Contrôle de Quota',
        description: 'Vérifie et limite le volume de clés ou de demandes actives par agent ou par site',
        icon: Sliders,
        color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
        type: 'RGPD_CONSENT',
        label: 'Conformité RGPD & Auditabilité',
        description: 'Impose l\'acceptation de la notice de confidentialité et la traçabilité des accès nominatifs',
        icon: Shield,
        color: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    {
        type: 'SPECIAL_TAG',
        label: 'TAG Spécial / Habilitation',
        description: 'Exige la détention d\'un badge habilité, autorisation électrique (H0B0) ou sécurité renforcée',
        icon: Tag,
        color: 'text-orange-700 bg-orange-50 border-orange-200'
    },
    {
        type: 'GPS_TERRAIN',
        label: 'Contrôle Terrain & Géolocalisation GPS',
        description: 'Exige une vérification sur site avec présence physique ou coordonnées GPS conformes',
        icon: MapPin,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
        type: 'FEEDBACK_RECEIPT',
        label: 'Feedback, Émargement ou PV de Livraison',
        description: 'Exige une signature électronique, un PV de remise signé ou un questionnaire de fin',
        icon: MessageSquare,
        color: 'text-cyan-700 bg-cyan-50 border-cyan-200'
    },
    {
        type: 'FINANCIAL_THRESHOLD',
        label: 'Seuil Budgétaire & Validation DAF',
        description: 'Au-delà d\'un montant seuil, impose l\'arbitrage d\'un valideur budgétaire ou d\'un N+2',
        icon: DollarSign,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
        type: 'DUAL_APPROVAL_4EYES',
        label: 'Contrôle 4-Yeux (Non-Cumul)',
        description: 'Interdit formellement l\'auto-approbation et impose 2 validateurs distincts',
        icon: Users,
        color: 'text-rose-700 bg-rose-50 border-rose-200'
    },
    {
        type: 'SLA_ESCALATION',
        label: 'Escalade SLA & Alerte Délais',
        description: 'Déclenche une notification d\'urgence ou un transfert automatique si délai dépassé',
        icon: Clock,
        color: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    {
        type: 'DOCUMENT_MANDATORY',
        label: 'Pièce Justificative Requise',
        description: 'Bloque le passage tant qu\'un fichier justificatif n\'est pas rattaché au dossier',
        icon: FileText,
        color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
        type: 'SECURITY_HABILITATION',
        label: 'Habilitation & Conformité NIS 2',
        description: 'Exige une habilitation active (ex: B0, H0V, C2) enregistrée dans le dossier',
        icon: Lock,
        color: 'text-red-700 bg-red-50 border-red-200'
    },
    {
        type: 'CUSTOM',
        label: 'Condition Métier Personnalisée',
        description: 'Condition textuelle libre ou arbitrage spécifique défini par l\'administrateur',
        icon: Sliders,
        color: 'text-gray-700 bg-gray-50 border-gray-200'
    }
];

export default function WorkflowStageConfigurator({
    stage,
    availableRoles,
    availableFields,
    onUpdateStage
}: WorkflowStageConfiguratorProps) {
    const [showAddRuleDropdown, setShowAddRuleDropdown] = useState(false);
    const [showAddNotifModal, setShowAddNotifModal] = useState(false);
    const [newNotifTrigger, setNewNotifTrigger] = useState<StageNotifTrigger>('ON_ENTER');
    const [newNotifRecipient, setNewNotifRecipient] = useState<StageNotificationItem['recipient_type']>('CURRENT_VALIDATOR');
    const [newNotifSubject, setNewNotifSubject] = useState('');
    const [newNotifMessage, setNewNotifMessage] = useState('');
    const [newNotifChannel, setNewNotifChannel] = useState<'IN_APP' | 'EMAIL' | 'BOTH'>('BOTH');
    const [availableStatuses, setAvailableStatuses] = useState<CustomStatusConfig[]>([]);
    const [dynamicFormFields, setDynamicFormFields] = useState<TargetFieldDefinition[]>([]);
    const [dynamicTableFields, setDynamicTableFields] = useState<TargetFieldDefinition[]>([]);
    const [fieldPickerRuleId, setFieldPickerRuleId] = useState<string | null>(null);
    const [fieldPickerSearch, setFieldPickerSearch] = useState('');
    const [fieldPickerCategory, setFieldPickerCategory] = useState<string>('ALL');

    useEffect(() => {
        getStatuses()
            .then(res => setAvailableStatuses(res.data || []))
            .catch(err => console.warn('Could not load statuses for stage configurator:', err));

        Promise.all([
            getFormulaires().catch(() => ({ data: [] })),
            getReferenceTables().catch(() => ({ data: [] }))
        ]).then(([formsRes, tablesRes]) => {
            const forms = formsRes.data || [];
            const tables = tablesRes.data || [];
            setDynamicFormFields(extractFormFields(forms));
            setDynamicTableFields(extractTableFields(tables));
        });
    }, []);

    // All available field definitions from standard catalog + custom forms + reference tables
    const allCatalogFields = useMemo(() => {
        return [...BASE_TARGET_FIELDS, ...dynamicFormFields, ...dynamicTableFields];
    }, [dynamicFormFields, dynamicTableFields]);

    // Combine form-specific fields with full standard field library
    const allCombinedFields = useMemo(() => {
        const list = [...availableFields];
        const existingIds = new Set(list.map(f => f.id));
        for (const b of allCatalogFields) {
            if (!existingIds.has(b.key)) {
                list.push({
                    id: b.key,
                    label: `[${b.categoryLabel}] ${b.label}`,
                    type: b.type
                });
                existingIds.add(b.key);
            }
        }
        return list;
    }, [availableFields, allCatalogFields]);

    const rules = stage.rules || [];
    const notifications = stage.notifications || [];

    // Stage basic updates
    const handleFieldChange = (field: keyof StageConfig, val: any) => {
        onUpdateStage({
            ...stage,
            [field]: val
        });
    };

    // Add Rule
    const handleAddRule = (type: RuleType) => {
        const preset = RULE_PRESETS.find(p => p.type === type);
        const newRule: StageRule = {
            id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type,
            title: preset?.label || 'Nouvelle Règle',
            description: preset?.description || '',
            enabled: true,
            require_all_required: type === 'FORM_COMPLETION',
            field_id: availableFields[0]?.id || '',
            operator: 'EQUALS',
            expected_value: '',
            quota_limit: 3,
            quota_scope: 'USER',
            quota_period: 'ACTIVE_SIMULTANEOUS',
            tag_name: type === 'SPECIAL_TAG' || type === 'SECURITY_HABILITATION' ? 'HABILITATION_SECURITE' : '',
            gps_tolerance_meters: 50,
            receipt_type: 'SIGNATURE',
            custom_condition_text: '',
            financial_threshold_amount: 1500,
            financial_escalation_role: 'Responsable d\'équipe',
            sla_max_hours: 48,
            required_document_name: 'Devis signé ou ordre de mission',
            prevent_self_approval: true
        };

        onUpdateStage({
            ...stage,
            rules: [...rules, newRule]
        });
        setShowAddRuleDropdown(false);
    };

    const handleUpdateRule = (ruleId: string, updates: Partial<StageRule>) => {
        onUpdateStage({
            ...stage,
            rules: rules.map(r => r.id === ruleId ? { ...r, ...updates } : r)
        });
    };

    const handleDeleteRule = (ruleId: string) => {
        onUpdateStage({
            ...stage,
            rules: rules.filter(r => r.id !== ruleId)
        });
    };

    // Add Notification
    const handleCreateNotification = () => {
        const triggerLabel = newNotifTrigger === 'ON_ENTER' ? 'Activation du Statut'
            : (newNotifTrigger === 'ON_FULFILL' ? 'Statut Accompli / Validé'
            : (newNotifTrigger === 'ON_REJECT' ? 'Refus à ce Statut' : 'Alerte SLA Dépassé'));

        const defaultSubject = newNotifSubject.trim() || `[Dossier {reference}] Notification d'étape : ${stage.name}`;
        const defaultMessage = newNotifMessage.trim() || `Bonjour,\n\nLe dossier {reference} concernant {demandeur} a atteint l'étape "${stage.name}". Merci de traiter cette action.\n\nCordialement,\nSystème de Gestion des Accès`;

        const newNotif: StageNotificationItem = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            trigger: newNotifTrigger,
            name: `Notification : ${triggerLabel}`,
            recipient_type: newNotifRecipient,
            subject: defaultSubject,
            message: defaultMessage,
            channel: newNotifChannel,
            enabled: true
        };

        onUpdateStage({
            ...stage,
            notifications: [...notifications, newNotif]
        });

        setShowAddNotifModal(false);
        setNewNotifSubject('');
        setNewNotifMessage('');
    };

    const handleUpdateNotification = (notifId: string, updates: Partial<StageNotificationItem>) => {
        onUpdateStage({
            ...stage,
            notifications: notifications.map(n => n.id === notifId ? { ...n, ...updates } : n)
        });
    };

    const handleDeleteNotification = (notifId: string) => {
        onUpdateStage({
            ...stage,
            notifications: notifications.filter(n => n.id !== notifId)
        });
    };

    return (
        <div className="space-y-6">
            {/* 1. Header & Stage Definition */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                            {stage.order}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">
                            Configuration du Statut & Étape #{stage.order}
                        </h3>
                    </div>
                    <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
                        {stage.status_key || `STATUS_STEP_${stage.order}`}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Nom du Statut / Étape <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={stage.name}
                            onChange={e => handleFieldChange('name', e.target.value)}
                            placeholder="ex: Validation Hiérarchique N+1"
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white font-medium"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-700">
                                Statut Métier Associé
                            </label>
                            <Link
                                to="/admin/statuts"
                                target="_blank"
                                className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
                                title="Ouvrir le configurateur de statuts dans un nouvel onglet"
                            >
                                <Tags className="w-3 h-3 text-yellow-500" />
                                <span>Gérer</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                        </div>
                        {availableStatuses.length > 0 ? (
                            <select
                                value={stage.status_key || ''}
                                onChange={e => {
                                    const selCode = e.target.value;
                                    const found = availableStatuses.find(s => s.code === selCode);
                                    onUpdateStage({
                                        ...stage,
                                        status_key: selCode,
                                        name: found && (!stage.name || stage.name.startsWith('Étape ') || stage.name.startsWith('Stage ')) ? found.label : stage.name,
                                        sla_hours: found?.sla_default_hours ? found.sla_default_hours : stage.sla_hours
                                    });
                                }}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white font-mono"
                            >
                                <option value="">-- Sélectionner un statut système --</option>
                                {availableStatuses.map(st => (
                                    <option key={st.code} value={st.code}>
                                        {st.label} [{st.code}]
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={stage.status_key || ''}
                                onChange={e => handleFieldChange('status_key', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                placeholder="ex: PENDING_MANAGER"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-gray-50 font-mono"
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Rôle Validateur / Acteur <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={stage.validator_role}
                            onChange={e => handleFieldChange('validator_role', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                        >
                            {availableRoles.map(role => (
                                <option key={role.id} value={role.name}>
                                    {role.name}
                                </option>
                            ))}
                            <option value="Demandeur">Demandeur (Agent)</option>
                            <option value="Système Automatique">Système Automatique (Auto-Fulfill)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>Délai SLA (Heures)</span>
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="720"
                            value={stage.sla_hours || 24}
                            onChange={e => handleFieldChange('sla_hours', parseInt(e.target.value) || 24)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Mode d'Accomplissement du Statut
                        </label>
                        <select
                            value={stage.fulfillment_mode || 'MANUAL_APPROVAL'}
                            onChange={e => handleFieldChange('fulfillment_mode', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white font-medium"
                        >
                            <option value="MANUAL_APPROVAL">Validation Manuelle (par le rôle assigné)</option>
                            <option value="AUTO_WHEN_RULES_PASS">Automatique (Dès que toutes les règles ci-dessous sont satisfaites)</option>
                            <option value="MULTI_APPROVAL">Approbation Croisée (Plusieurs avis requis)</option>
                        </select>
                        <p className="text-[11px] text-gray-500 mt-1">
                            {stage.fulfillment_mode === 'AUTO_WHEN_RULES_PASS'
                                ? 'Le dossier passe immédiatement au statut suivant si les règles configurées sont validées sans intervention humaine.'
                                : 'Le validateur doit cliquer pour valider après vérification des règles.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Instructions pour le Validateur / Demandeur
                        </label>
                        <input
                            type="text"
                            value={stage.instruction || ''}
                            onChange={e => handleFieldChange('instruction', e.target.value)}
                            placeholder="ex: Vérifier l'adéquation des habilitations et la plage horaire sur site."
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Rules Configurator: When is this status fulfilled? */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-blue-700" />
                            <h3 className="text-sm font-bold text-gray-900">
                                Règles d'Accomplissement du Statut ("Quand ce statut est-il Fulfill ?")
                            </h3>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                                {rules.filter(r => r.enabled).length} règle(s) active(s)
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Définissez les conditions obligatoires à satisfaire (complétion du formulaire, valeurs, quotas, feedback, RGPD, tag spécial, GPS...) pour valider ce statut.
                        </p>
                    </div>

                    {/* Add Rule Button & Dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            to="/admin/regles-metiers"
                            target="_blank"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Ouvrir le moteur central des règles métiers"
                        >
                            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Moteur Global des Règles</span>
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </Link>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowAddRuleDropdown(!showAddRuleDropdown)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Ajouter une Règle Métier
                                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                            </button>

                        {showAddRuleDropdown && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                                    Choisir le type de règle
                                </div>
                                {RULE_PRESETS.map(preset => {
                                    const Icon = preset.icon;
                                    return (
                                        <button
                                            key={preset.type}
                                            type="button"
                                            onClick={() => handleAddRule(preset.type)}
                                            className="w-full text-left p-2 rounded-lg hover:bg-blue-50 transition flex items-start gap-2.5 cursor-pointer group"
                                        >
                                            <div className={`p-1.5 rounded-md ${preset.color} shrink-0 mt-0.5`}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-700">
                                                    {preset.label}
                                                </div>
                                                <div className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                                                    {preset.description}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* List of rules */}
                {rules.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Sliders className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs text-gray-600 font-medium">Aucune règle métier n'est attachée à ce statut.</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Ce statut dépend uniquement de l'approbation manuelle de l'acteur {stage.validator_role}.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule, idx) => {
                            const preset = RULE_PRESETS.find(p => p.type === rule.type) || RULE_PRESETS[7];
                            const Icon = preset.icon;

                            return (
                                <div
                                    key={rule.id}
                                    className={`p-4 rounded-xl border transition ${rule.enabled ? 'bg-white border-gray-200 shadow-2xs' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${preset.color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-900">
                                                        {rule.title}
                                                    </span>
                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono font-semibold">
                                                        {rule.type}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">
                                                    {preset.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.enabled}
                                                    onChange={e => handleUpdateRule(rule.id, { enabled: e.target.checked })}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span>{rule.enabled ? 'Active' : 'Désactivée'}</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition cursor-pointer"
                                                title="Supprimer cette règle"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Parameters specific to rule type */}
                                    {rule.type === 'FORM_COMPLETION' && (
                                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2 text-xs">
                                            <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.require_all_required ?? true}
                                                    onChange={e => handleUpdateRule(rule.id, { require_all_required: e.target.checked })}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Exiger que tous les champs obligatoires du formulaire soient dûment complétés</span>
                                            </label>
                                            <p className="text-[11px] text-blue-700">
                                                Le statut ne pourra être validé que si aucun champ marqué obligatoire n'est laissé vide.
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'FIELD_VALUE' && (() => {
                                        const currentFieldMeta = findFieldByKey(rule.field_id || '', allCatalogFields);
                                        return (
                                            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-2 text-xs">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-[11px] font-semibold text-gray-700">Champ Cible Testé</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFieldPickerRuleId(rule.id);
                                                                    setFieldPickerSearch('');
                                                                    setFieldPickerCategory('ALL');
                                                                }}
                                                                className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer"
                                                                title="Ouvrir la bibliothèque exhaustive des champs"
                                                            >
                                                                <BookOpen className="w-3 h-3 text-indigo-600" />
                                                                <span>Catalogue ({allCatalogFields.length})</span>
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            list={`stage-fields-list-${rule.id}`}
                                                            value={rule.field_id || ''}
                                                            onChange={e => handleUpdateRule(rule.id, { field_id: e.target.value })}
                                                            placeholder="ex: montant_total_ht ou sites.region"
                                                            className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-mono"
                                                        />
                                                        <datalist id={`stage-fields-list-${rule.id}`}>
                                                            {allCombinedFields.map(f => (
                                                                <option key={f.id} value={f.id}>{f.label}</option>
                                                            ))}
                                                        </datalist>

                                                        {currentFieldMeta && (
                                                            <div className="mt-1 p-1.5 rounded bg-indigo-100/60 border border-indigo-200 text-[10px] text-indigo-900 leading-tight">
                                                                <div className="font-semibold truncate">{currentFieldMeta.label} ({currentFieldMeta.type})</div>
                                                                <div className="text-gray-600 line-clamp-1">{currentFieldMeta.description}</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Opérateur</label>
                                                        <select
                                                            value={rule.operator || 'EQUALS'}
                                                            onChange={e => handleUpdateRule(rule.id, { operator: e.target.value as any })}
                                                            className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                                        >
                                                            <option value="EQUALS">Est égal à (=)</option>
                                                            <option value="NOT_EQUALS">Est différent de (≠)</option>
                                                            <option value="GREATER_THAN">Est supérieur à (&gt;)</option>
                                                            <option value="LESS_THAN">Est inférieur à (&lt;)</option>
                                                            <option value="CONTAINS">Contient le texte</option>
                                                            <option value="IS_NOT_EMPTY">Est non vide</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-[11px] font-semibold text-gray-700">Valeur Attendue / Seuil</label>
                                                            {currentFieldMeta?.exampleValue && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateRule(rule.id, { expected_value: currentFieldMeta.exampleValue })}
                                                                    className="text-[9px] text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                                                                >
                                                                    Ex: {currentFieldMeta.exampleValue}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={rule.expected_value || ''}
                                                            onChange={e => handleUpdateRule(rule.id, { expected_value: e.target.value })}
                                                            placeholder={currentFieldMeta ? `ex: ${currentFieldMeta.exampleValue}` : "ex: 500, OUI, CRITIQUE"}
                                                            className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {rule.type === 'QUOTA_CHECK' && (
                                        <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 space-y-2 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Limite Max Autorisée</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={rule.quota_limit || 3}
                                                        onChange={e => handleUpdateRule(rule.id, { quota_limit: parseInt(e.target.value) || 1 })}
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Périmètre du Quota</label>
                                                    <select
                                                        value={rule.quota_scope || 'USER'}
                                                        onChange={e => handleUpdateRule(rule.id, { quota_scope: e.target.value as any })}
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                                    >
                                                        <option value="USER">Par Demandeur / Agent</option>
                                                        <option value="SITE">Par Site Ferroviaire</option>
                                                        <option value="TEAM">Par Entreprise / Équipe</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Périodicité</label>
                                                    <select
                                                        value={rule.quota_period || 'ACTIVE_SIMULTANEOUS'}
                                                        onChange={e => handleUpdateRule(rule.id, { quota_period: e.target.value as any })}
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                                    >
                                                        <option value="ACTIVE_SIMULTANEOUS">Actifs simultanément</option>
                                                        <option value="MONTH">Par mois calendaire</option>
                                                        <option value="YEAR">Par an</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {rule.type === 'RGPD_CONSENT' && (
                                        <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100 text-xs text-purple-900 space-y-1">
                                            <p className="font-semibold flex items-center gap-1.5">
                                                <Shield className="w-3.5 h-3.5 text-purple-700" />
                                                Clause RGPD & Traçabilité des Accès
                                            </p>
                                            <p className="text-[11px] text-purple-800">
                                                Le demandeur doit certifier expressément la finalité légitime de l'accès et accepter la politique de rétention (journalisation 12 mois maximum).
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'SPECIAL_TAG' && (
                                        <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 space-y-2 text-xs">
                                            <label className="block text-[11px] font-semibold text-gray-700">Nom du Tag / Habilitation requise</label>
                                            <input
                                                type="text"
                                                value={rule.tag_name || ''}
                                                onChange={e => handleUpdateRule(rule.id, { tag_name: e.target.value })}
                                                placeholder="ex: HABILITATION_ELECTRIQUE_H0B0, ZONE_SECRETE_DEFENSE, ACCES_VOIES_PRINCIPALES"
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-mono"
                                            />
                                            <p className="text-[11px] text-orange-800">
                                                Le système bloquera le passage à ce statut si le demandeur ne possède pas le tag ou l'habilitation certifiée.
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'GPS_TERRAIN' && (
                                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-2 text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tolérance GPS sur site (Mètres)</label>
                                                    <input
                                                        type="number"
                                                        min="10"
                                                        max="1000"
                                                        value={rule.gps_tolerance_meters || 50}
                                                        onChange={e => handleUpdateRule(rule.id, { gps_tolerance_meters: parseInt(e.target.value) || 50 })}
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] text-emerald-800 mt-4">
                                                        Nécessite la confirmation des coordonnées de présence de l'agent sur le site ferroviaire.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {rule.type === 'FEEDBACK_RECEIPT' && (
                                        <div className="bg-cyan-50/50 p-3 rounded-lg border border-cyan-100 space-y-2 text-xs">
                                            <label className="block text-[11px] font-semibold text-gray-700">Type de Justificatif / Émargement Exigé</label>
                                            <select
                                                value={rule.receipt_type || 'SIGNATURE'}
                                                onChange={e => handleUpdateRule(rule.id, { receipt_type: e.target.value as any })}
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                            >
                                                <option value="SIGNATURE">Signature Électronique de l'Agent</option>
                                                <option value="PV_DELIVERY">PV de Remise de Matériel / Clé Signé</option>
                                                <option value="CHECKLIST">Checklist de Sécurité & Clôture d'Intervention</option>
                                                <option value="SATISFACTION_SURVEY">Questionnaire de Feedback Qualité</option>
                                            </select>
                                        </div>
                                    )}

                                    {rule.type === 'FINANCIAL_THRESHOLD' && (
                                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-2 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Seuil Budgétaire (€ HT)</label>
                                                    <input
                                                        type="number"
                                                        value={rule.financial_threshold_amount || 1500}
                                                        onChange={e => handleUpdateRule(rule.id, { financial_threshold_amount: parseFloat(e.target.value) || 0 })}
                                                        placeholder="1500"
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-bold text-emerald-800"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Rôle Supérieur Exigé en Escalade</label>
                                                    <input
                                                        type="text"
                                                        value={rule.financial_escalation_role || 'Responsable d\'équipe'}
                                                        onChange={e => handleUpdateRule(rule.id, { financial_escalation_role: e.target.value })}
                                                        placeholder="ex: Responsable d'équipe ou DAF"
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-emerald-800">
                                                Si le montant total HT de la commande dépasse ce seuil, une double validation par {rule.financial_escalation_role || 'le valideur budgétaire'} est automatiquement requise.
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'DUAL_APPROVAL_4EYES' && (
                                        <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 space-y-2 text-xs">
                                            <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.prevent_self_approval ?? true}
                                                    onChange={e => handleUpdateRule(rule.id, { prevent_self_approval: e.target.checked })}
                                                    className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                                                />
                                                <span>Interdire formellement l'auto-approbation (le demandeur ne peut pas être le valideur)</span>
                                            </label>
                                            <p className="text-[11px] text-rose-800">
                                                Garantit l'indépendance de l'arbitrage selon le principe de séparation des fonctions.
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'SLA_ESCALATION' && (
                                        <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100 space-y-2 text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1/2">
                                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Délai Max Avant Escalade (Heures)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={rule.sla_max_hours || 48}
                                                        onChange={e => handleUpdateRule(rule.id, { sla_max_hours: parseInt(e.target.value) || 24 })}
                                                        className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-bold"
                                                    />
                                                </div>
                                                <div className="w-1/2">
                                                    <p className="text-[11px] text-purple-800 mt-3">
                                                        Au-delà de {rule.sla_max_hours || 48}h d'inactivité, le système déclenche une alerte rouge et notifie le niveau hiérarchique supérieur.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {rule.type === 'DOCUMENT_MANDATORY' && (
                                        <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 space-y-2 text-xs">
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Intitulé du Document / Pièce Obligatoire</label>
                                            <input
                                                type="text"
                                                value={rule.required_document_name || ''}
                                                onChange={e => handleUpdateRule(rule.id, { required_document_name: e.target.value })}
                                                placeholder="ex: Ordre de mission, Devis signé, Attestation d'assurance"
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                            />
                                            <p className="text-[11px] text-amber-800">
                                                Le statut reste bloqué tant que le demandeur n'a pas téléversé ce document obligatoire.
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'SECURITY_HABILITATION' && (
                                        <div className="bg-red-50/50 p-3 rounded-lg border border-red-100 space-y-2 text-xs">
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Code Habilitation de Sécurité (Conformité NIS 2)</label>
                                            <input
                                                type="text"
                                                value={rule.tag_name || ''}
                                                onChange={e => handleUpdateRule(rule.id, { tag_name: e.target.value })}
                                                placeholder="ex: ELEC_B0, SECURITE_VOIES, HABILITATION_POSTE_AIGUILLAGE"
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-mono"
                                            />
                                            <p className="text-[11px] text-red-800">
                                                Contrôle d'habilitation strict requis pour autoriser la validation de cette étape de sécurité.
                                            </p>
                                        </div>
                                    )}

                                    {rule.type === 'CUSTOM' && (
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2 text-xs">
                                            <label className="block text-[11px] font-semibold text-gray-700">Critère Métier Spécifique</label>
                                            <input
                                                type="text"
                                                value={rule.custom_condition_text || ''}
                                                onChange={e => handleUpdateRule(rule.id, { custom_condition_text: e.target.value })}
                                                placeholder="ex: Vérification obligatoire par le contrôleur de gestion si coût unitaire > 200€"
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. Notifications Configurator: What notification is sent for this status? */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-purple-700" />
                            <h3 className="text-sm font-bold text-gray-900">
                                Notifications Déclenchées par ce Statut ("Quelle notification est envoyée quand...")
                            </h3>
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                                {notifications.filter(n => n.enabled).length} notification(s)
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Configurez les e-mails et alertes applicatives envoyés à l'entrée dans ce statut, à son accomplissement (Fulfill), en cas de refus ou de dépassement SLA.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAddNotifModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter une Notification
                    </button>
                </div>

                {/* List of notifications */}
                {notifications.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Bell className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs text-gray-600 font-medium">Aucune notification n'est configurée pour ce statut.</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Cliquez sur "Ajouter une Notification" pour informer automatiquement le demandeur ou le validateur.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(notif => {
                            const triggerLabel = notif.trigger === 'ON_ENTER' ? 'À l\'activation du statut'
                                : (notif.trigger === 'ON_FULFILL' ? 'Dès que le statut est Accompli (Fulfill)'
                                : (notif.trigger === 'ON_REJECT' ? 'En cas de Refus / Rejet' : 'Dépassement SLA (Relance)'));

                            const triggerBadgeClass = notif.trigger === 'ON_ENTER' ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : (notif.trigger === 'ON_FULFILL' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : (notif.trigger === 'ON_REJECT' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'));

                            return (
                                <div
                                    key={notif.id}
                                    className={`p-4 rounded-xl border transition ${notif.enabled ? 'bg-white border-gray-200 shadow-2xs' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${triggerBadgeClass}`}>
                                                {triggerLabel}
                                            </span>
                                            <span className="text-xs font-semibold text-gray-700">
                                                Destinataire : <strong>{notif.recipient_type}</strong>
                                            </span>
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                                Canal : {notif.channel}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={notif.enabled}
                                                    onChange={e => handleUpdateNotification(notif.id, { enabled: e.target.checked })}
                                                    className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                />
                                                <span>{notif.enabled ? 'Active' : 'Désactivée'}</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteNotification(notif.id)}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Editable subject and content */}
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Objet de la notification
                                            </label>
                                            <input
                                                type="text"
                                                value={notif.subject}
                                                onChange={e => handleUpdateNotification(notif.id, { subject: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Corps du message (Variables acceptées : {'{reference}'}, {'{demandeur}'}, {'{etape_nom}'}, {'{date}'})
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={notif.message}
                                                onChange={e => handleUpdateNotification(notif.id, { message: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md p-1.5 text-xs bg-white font-mono text-[11px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Add Notification */}
            {showAddNotifModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                                <Bell className="w-4 h-4 text-purple-700" />
                                Ajouter une Notification à l'Étape "{stage.name}"
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddNotifModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Déclencheur (Quand ?)</label>
                                <select
                                    value={newNotifTrigger}
                                    onChange={e => setNewNotifTrigger(e.target.value as any)}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                >
                                    <option value="ON_ENTER">À l'activation du statut (Dossier arrivant dans cet état)</option>
                                    <option value="ON_FULFILL">Dès que le statut est accompli / validé (Fulfill)</option>
                                    <option value="ON_REJECT">En cas de refus / rejet à ce statut</option>
                                    <option value="ON_SLA_BREACH">En cas de dépassement du délai SLA (Relance)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Destinataire (À qui ?)</label>
                                <select
                                    value={newNotifRecipient}
                                    onChange={e => setNewNotifRecipient(e.target.value as any)}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                >
                                    <option value="CURRENT_VALIDATOR">Validateur de ce statut ({stage.validator_role})</option>
                                    <option value="DEMANDEUR">Demandeur du dossier</option>
                                    <option value="NEXT_VALIDATOR">Validateur de l'étape suivante</option>
                                    <option value="ALL_STAKEHOLDERS">Tous les intervenants du dossier</option>
                                    <option value="ROLE">Rôle spécifique (ex: Sécurité)</option>
                                    <option value="CUSTOM_EMAIL">Email personnalisé</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Canal de Transmission</label>
                                <select
                                    value={newNotifChannel}
                                    onChange={e => setNewNotifChannel(e.target.value as any)}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                >
                                    <option value="BOTH">In-App + Email (Recommandé)</option>
                                    <option value="EMAIL">Email uniquement</option>
                                    <option value="IN_APP">In-App uniquement</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Objet de l'E-mail / Alerte</label>
                                <input
                                    type="text"
                                    value={newNotifSubject}
                                    onChange={e => setNewNotifSubject(e.target.value)}
                                    placeholder="ex: [Dossier {reference}] Action requise à l'étape {etape_nom}"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Corps du Message</label>
                                <textarea
                                    rows={3}
                                    value={newNotifMessage}
                                    onChange={e => setNewNotifMessage(e.target.value)}
                                    placeholder="Variables : {reference}, {demandeur}, {etape_nom}, {site}, {date}"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowAddNotifModal(false)}
                                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateNotification}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs"
                            >
                                Enregistrer la Notification
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CATALOGUE DES CHAMPS CIBLES TESTÉS */}
            {fieldPickerRuleId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5 text-indigo-300" />
                                <div>
                                    <h3 className="text-sm font-bold">Catalogue des Attributs & Champs Cibles</h3>
                                    <p className="text-[11px] text-indigo-200">Sélectionnez un champ à tester pour la validation d'étape</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFieldPickerRuleId(null)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search & Category Filter */}
                        <div className="p-3 bg-gray-50 border-b border-gray-200 shrink-0 space-y-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={fieldPickerSearch}
                                    onChange={e => setFieldPickerSearch(e.target.value)}
                                    placeholder="Rechercher par nom de champ, code (ex: montant, region, quota)..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-600 outline-hidden"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                                {[
                                    { id: 'ALL', label: 'Tous les champs' },
                                    { id: 'QUOTA', label: 'Quotas & Clés' },
                                    { id: 'FINANCE', label: 'Finances' },
                                    { id: 'SECURITY', label: 'Sécurité & NIS 2' },
                                    { id: 'IDENTITY', label: 'Demandeur' },
                                    { id: 'GENERAL', label: 'Général' },
                                    { id: 'CUSTOM_FORM', label: 'Formulaires' },
                                    { id: 'TABLE_REF', label: 'Tables Référence' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setFieldPickerCategory(cat.id)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                                            fieldPickerCategory === cat.id
                                                ? 'bg-indigo-700 text-white shadow-2xs'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fields List */}
                        <div className="p-4 overflow-y-auto flex-1 space-y-2">
                            {allCatalogFields
                                .filter(f => {
                                    const matchCat = fieldPickerCategory === 'ALL' || f.category === fieldPickerCategory;
                                    const term = fieldPickerSearch.trim().toLowerCase();
                                    const matchSearch = !term ||
                                        f.key.toLowerCase().includes(term) ||
                                        f.label.toLowerCase().includes(term) ||
                                        f.description.toLowerCase().includes(term);
                                    return matchCat && matchSearch;
                                })
                                .map(f => (
                                    <div
                                        key={f.key}
                                        onClick={() => {
                                            if (fieldPickerRuleId) {
                                                handleUpdateRule(fieldPickerRuleId, {
                                                    field_id: f.key,
                                                    operator: f.suggestedOperator || 'EQUALS',
                                                    expected_value: f.exampleValue || ''
                                                });
                                                setFieldPickerRuleId(null);
                                            }
                                        }}
                                        className="p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer group flex items-start justify-between gap-3"
                                    >
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-[11px] font-bold text-indigo-700">{f.key}</span>
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-semibold">{f.categoryLabel}</span>
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-mono">{f.type}</span>
                                            </div>
                                            <div className="text-xs font-bold text-gray-900">{f.label}</div>
                                            <p className="text-[11px] text-gray-500 line-clamp-1">{f.description}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-2.5 py-1 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 rounded-lg text-xs font-semibold shrink-0 transition"
                                        >
                                            Sélectionner
                                        </button>
                                    </div>
                                ))}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setFieldPickerRuleId(null)}
                                className="px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg font-semibold"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
