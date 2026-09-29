import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield,
    Zap,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    Copy,
    Edit3,
    Play,
    ToggleLeft,
    ToggleRight,
    FileText,
    Check,
    X,
    Filter,
    Clock,
    ArrowRight,
    Lock,
    Scale,
    Sparkles,
    RefreshCw,
    FolderKanban,
    AlertOctagon,
    Compass,
    DollarSign,
    Users,
    Key,
    MapPin,
    Layers,
    Database,
    Package,
    BookOpen,
    Info,
    ExternalLink,
    Tag
} from 'lucide-react';
import {
    getBusinessRules,
    createBusinessRule,
    updateBusinessRule,
    deleteBusinessRule,
    toggleBusinessRule,
    duplicateBusinessRule,
    testBusinessRule,
    getFormulaires,
    getReferenceTables,
    getRuleDomains,
    createRuleDomain,
    updateRuleDomain,
    deleteRuleDomain,
    resetRuleDomains
} from '../lib/api';
import { BusinessRule, RuleDomainConfig } from '../types';
import { PageHelpButton, HelpSection } from '../components/PageHelpModal';
import {
    TargetFieldDefinition,
    FieldCategoryKey,
    FIELD_CATEGORIES,
    BASE_TARGET_FIELDS,
    extractFormFields,
    extractTableFields,
    findFieldByKey
} from '../data/fieldCatalog';

const DOMAIN_COLOR_PRESETS = [
    { id: 'amber', label: 'Ambre / Jaune', color: 'text-amber-700', bgBadge: 'bg-amber-100 text-amber-900 border-amber-200' },
    { id: 'emerald', label: 'Émeraude / Vert', color: 'text-emerald-700', bgBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    { id: 'rose', label: 'Rose / Rouge vif', color: 'text-rose-700', bgBadge: 'bg-rose-100 text-rose-900 border-rose-200' },
    { id: 'red', label: 'Rouge Sécurité', color: 'text-red-700', bgBadge: 'bg-red-100 text-red-900 border-red-200' },
    { id: 'blue', label: 'Bleu Institutionnel', color: 'text-blue-700', bgBadge: 'bg-blue-100 text-blue-900 border-blue-200' },
    { id: 'cyan', label: 'Cyan / Azur', color: 'text-cyan-700', bgBadge: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
    { id: 'teal', label: 'Sarcelle / Canard', color: 'text-teal-700', bgBadge: 'bg-teal-100 text-teal-900 border-teal-200' },
    { id: 'purple', label: 'Violet / Pourpre', color: 'text-purple-700', bgBadge: 'bg-purple-100 text-purple-900 border-purple-200' },
    { id: 'indigo', label: 'Indigo / Nuit', color: 'text-indigo-700', bgBadge: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
    { id: 'orange', label: 'Orange / Ocre', color: 'text-orange-700', bgBadge: 'bg-orange-100 text-orange-900 border-orange-200' },
    { id: 'pink', label: 'Rose Fuchsia', color: 'text-pink-700', bgBadge: 'bg-pink-100 text-pink-900 border-pink-200' },
    { id: 'slate', label: 'Ardoise / Neutre', color: 'text-slate-700', bgBadge: 'bg-slate-100 text-slate-800 border-slate-200' }
];

const DOMAIN_ICON_OPTIONS = [
    { name: 'Key', label: 'Clé / Matériel', icon: Key },
    { name: 'DollarSign', label: 'Finance / Budget', icon: DollarSign },
    { name: 'Shield', label: 'Sécurité / NIS 2', icon: Shield },
    { name: 'Users', label: 'Utilisateurs / RH', icon: Users },
    { name: 'MapPin', label: 'Terrain / GPS', icon: MapPin },
    { name: 'Clock', label: 'Délais / Horloge', icon: Clock },
    { name: 'Package', label: 'Colis / Logistique', icon: Package },
    { name: 'Compass', label: 'Navigation / Circuit', icon: Compass },
    { name: 'Zap', label: 'Éclair / Automatisation', icon: Zap },
    { name: 'CheckCircle2', label: 'Validation / Succès', icon: CheckCircle2 },
    { name: 'FileText', label: 'Document / Données', icon: FileText },
    { name: 'Scale', label: 'Balance / Quota', icon: Scale },
    { name: 'Lock', label: 'Cadenas / Protection', icon: Lock },
    { name: 'Database', label: 'Base de données', icon: Database },
    { name: 'Layers', label: 'Multi-niveaux', icon: Layers },
    { name: 'SlidersHorizontal', label: 'Configuration', icon: SlidersHorizontal },
    { name: 'Tag', label: 'Étiquette / Thématique', icon: Tag }
];

function getDomainIconComponent(iconName?: string) {
    const found = DOMAIN_ICON_OPTIONS.find(o => o.name === iconName);
    return found ? found.icon : FolderKanban;
}

const REGLE_HELP_SECTIONS: HelpSection[] = [
    {
        title: "Moteur de Règles Métiers Zero-Code",
        description: "Ce configurateur permet aux administrateurs de définir, modifier et tester l'ensemble des règles de gestion, contrôles d'accès et politiques opérationnelles du système.",
        badge: "Administration",
        tips: [
            "Les règles métiers s'exécutent lors de la soumission, du passage d'étape ou lors du calcul des délais SLA.",
            "Elles peuvent bloquer une action, exiger un validateur supérieur (principe 4-yeux), déclencher une alerte ou automatiser une clôture."
        ]
    },
    {
        title: "Catégories et Typologies de Règles",
        description: "Les règles sont segmentées par domaine fonctionnel pour une traçabilité optimale.",
        badge: "Typologies",
        tips: [
            "QUOTA : Plafonnement matériel, volume de clés simultanées par agent.",
            "FINANCE : Seuils budgétaires, validations directes ou N+2 requises.",
            "SECURITY : Double validation (4-yeux), conformité RGPD et dates de fin de contrat.",
            "GPS : Tolérance de précision terrain et relevés géographiques.",
            "SLA : Délais d'instruction et escalades hiérarchiques."
        ]
    }
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; badge: string }> = {
    QUOTA: { label: "Quotas & Volumes", icon: Scale, color: "text-amber-700 bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800" },
    SECURITY: { label: "Sécurité & NIS 2", icon: Shield, color: "text-rose-700 bg-rose-50 border-rose-200", badge: "bg-rose-100 text-rose-800" },
    FINANCE: { label: "Seuils Financiers", icon: DollarSign, color: "text-emerald-700 bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
    GPS: { label: "Terrain & GPS", icon: Compass, color: "text-blue-700 bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-800" },
    SLA: { label: "Délais & Escalades SLA", icon: Clock, color: "text-purple-700 bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-800" },
    WORKFLOW: { label: "Transitions Workflow", icon: Zap, color: "text-indigo-700 bg-indigo-50 border-indigo-200", badge: "bg-indigo-100 text-indigo-800" },
    VALIDATION: { label: "Approbations & Rôles", icon: Users, color: "text-cyan-700 bg-cyan-50 border-cyan-200", badge: "bg-cyan-100 text-cyan-800" },
    CUSTOM: { label: "Personnalisée", icon: SlidersHorizontal, color: "text-gray-700 bg-gray-50 border-gray-200", badge: "bg-gray-100 text-gray-800" }
};

const TRIGGER_LABELS: Record<string, string> = {
    ON_SUBMIT: "À la soumission du dossier",
    BEFORE_TRANSITION: "Avant changement de statut",
    ON_STAGE_ENTER: "À l'entrée dans l'étape",
    ON_SLA_BREACH: "Sur dépassement délai SLA",
    ON_FIELD_CHANGE: "Sur modification de valeur"
};

const OPERATOR_LABELS: Record<string, string> = {
    EQUALS: "Égal à (=)",
    NOT_EQUALS: "Différent de (≠)",
    GREATER_THAN: "Supérieur à (>)",
    LESS_THAN: "Inférieur à (<)",
    CONTAINS: "Contient",
    IS_EMPTY: "Est vide / non renseigné",
    IS_NOT_EMPTY: "Contient une valeur",
    CUSTOM: "Expression personnalisée"
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    BLOCK_TRANSITION: { label: "Bloquer la transition", color: "bg-red-100 text-red-800 border-red-200" },
    REQUIRE_ADDITIONAL_ROLE: { label: "Exiger rôle supérieur (Escalade)", color: "bg-amber-100 text-amber-800 border-amber-200" },
    TRIGGER_ALERT: { label: "Déclencher une alerte", color: "bg-orange-100 text-orange-800 border-orange-200" },
    AUTO_FULFILL: { label: "Validation automatique", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    REQUIRE_JUSTIFICATIF: { label: "Justificatif obligatoire", color: "bg-blue-100 text-blue-800 border-blue-200" },
    CUSTOM: { label: "Action spécifique", color: "bg-gray-100 text-gray-800 border-gray-200" }
};

export const AdminReglesMetier: React.FC = () => {
    // Navigation onglet principal : règles ou domaines
    const [activeTab, setActiveTab] = useState<'rules' | 'domains'>('rules');

    const [rules, setRules] = useState<BusinessRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Rule Domains state (Domaines & Thématiques Métiers)
    const [domains, setDomains] = useState<RuleDomainConfig[]>([]);
    const [domainLoading, setDomainLoading] = useState(false);
    const [domainSearch, setDomainSearch] = useState('');
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
    const [editingDomain, setEditingDomain] = useState<Partial<RuleDomainConfig> | null>(null);
    const [isCreatingDomain, setIsCreatingDomain] = useState(false);
    const [domainFormError, setDomainFormError] = useState<string | null>(null);

    // Catalog of target fields (Base fields + dynamic form fields)
    const [dynamicFormFields, setDynamicFormFields] = useState<TargetFieldDefinition[]>([]);
    const [allAvailableFields, setAllAvailableFields] = useState<TargetFieldDefinition[]>(BASE_TARGET_FIELDS);

    // Modal state for Create / Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Partial<BusinessRule> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Field Picker Modal state
    const [isFieldPickerOpen, setIsFieldPickerOpen] = useState(false);
    const [fieldPickerCategory, setFieldPickerCategory] = useState<FieldCategoryKey>('ALL');
    const [fieldPickerSearch, setFieldPickerSearch] = useState('');

    // Simulator Modal state
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [ruleToTest, setRuleToTest] = useState<BusinessRule | null>(null);
    const [testFieldValue, setTestFieldValue] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    const [testLoading, setTestLoading] = useState(false);

    const showNotification = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 4000);
    };

    const loadRules = async () => {
        setLoading(true);
        try {
            const res = await getBusinessRules();
            setRules(res.data || []);
        } catch (error) {
            console.error("Erreur de chargement des règles métiers:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadDomains = async () => {
        setDomainLoading(true);
        try {
            const res = await getRuleDomains();
            setDomains(res.data || []);
        } catch (error) {
            console.error("Erreur de chargement des domaines:", error);
        } finally {
            setDomainLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
        loadDomains();
        Promise.all([
            getFormulaires().catch(err => {
                console.warn("Could not load dynamic formulaires:", err);
                return { data: [] };
            }),
            getReferenceTables().catch(err => {
                console.warn("Could not load reference tables:", err);
                return { data: [] };
            })
        ]).then(([formsRes, tablesRes]) => {
            const forms = formsRes.data || [];
            const tables = tablesRes.data || [];
            const formFields = extractFormFields(forms);
            const tableFields = extractTableFields(tables);
            setDynamicFormFields([...formFields, ...tableFields]);
            setAllAvailableFields([...BASE_TARGET_FIELDS, ...formFields, ...tableFields]);
        });
    }, []);

    // Metadata lookup for rule domains
    const getDomainMeta = (catKey?: string) => {
        if (!catKey) return { label: "Non catégorisé", icon: FolderKanban, color: "text-gray-700 bg-gray-50 border-gray-200", badge: "bg-gray-100 text-gray-800", description: "" };
        const found = domains.find(d => d.code === catKey);
        if (found) {
            return {
                label: found.label,
                icon: getDomainIconComponent(found.iconName),
                color: `${found.color} bg-white border-gray-200`,
                badge: found.bgBadge || "bg-indigo-100 text-indigo-900 border-indigo-200",
                description: found.description
            };
        }
        const fallback = CATEGORY_CONFIG[catKey];
        if (fallback) return { ...fallback, description: "" };
        return {
            label: catKey,
            icon: FolderKanban,
            color: "text-gray-700 bg-gray-50 border-gray-200",
            badge: "bg-gray-100 text-gray-800",
            description: ""
        };
    };

    // Category options for the Field Picker modal (derived dynamically from configured domains)
    const pickerCategoryOptions = useMemo(() => {
        const list: { id: string; label: string; count: number }[] = [
            { id: 'ALL', label: 'Tous les domaines', count: allAvailableFields.length }
        ];
        domains.forEach(d => {
            const count = allAvailableFields.filter(f => f.category === d.code).length;
            list.push({ id: d.code, label: d.label, count });
        });
        const formCount = allAvailableFields.filter(f => f.category === 'CUSTOM_FORM').length;
        if (formCount > 0 && !domains.some(d => d.code === 'CUSTOM_FORM')) {
            list.push({ id: 'CUSTOM_FORM', label: 'Formulaires Dynamiques', count: formCount });
        }
        const tableCount = allAvailableFields.filter(f => f.category === 'TABLE_REF').length;
        if (tableCount > 0 && !domains.some(d => d.code === 'TABLE_REF')) {
            list.push({ id: 'TABLE_REF', label: 'Tables de Référence', count: tableCount });
        }
        return list;
    }, [domains, allAvailableFields]);

    // Filtered fields in the picker modal
    const filteredPickerFields = useMemo(() => {
        return allAvailableFields.filter(f => {
            const matchesCat = fieldPickerCategory === 'ALL' || f.category === fieldPickerCategory;
            const term = fieldPickerSearch.trim().toLowerCase();
            const matchesSearch = !term ||
                f.key.toLowerCase().includes(term) ||
                f.label.toLowerCase().includes(term) ||
                f.description.toLowerCase().includes(term) ||
                f.categoryLabel.toLowerCase().includes(term) ||
                (f.formOrigin && f.formOrigin.toLowerCase().includes(term));
            return matchesCat && matchesSearch;
        });
    }, [allAvailableFields, fieldPickerCategory, fieldPickerSearch]);

    // Filtered domains in the domain manager
    const filteredDomains = useMemo(() => {
        const term = domainSearch.trim().toLowerCase();
        if (!term) return domains;
        return domains.filter(d =>
            d.code.toLowerCase().includes(term) ||
            d.label.toLowerCase().includes(term) ||
            (d.description && d.description.toLowerCase().includes(term))
        );
    }, [domains, domainSearch]);

    // Metadata for the currently edited rule's target_field
    const currentTargetFieldMeta = useMemo(() => {
        if (!editingRule?.target_field) return undefined;
        return findFieldByKey(editingRule.target_field, allAvailableFields);
    }, [editingRule?.target_field, allAvailableFields]);

    // Metadata for simulator
    const currentTestFieldMeta = useMemo(() => {
        if (!ruleToTest?.target_field) return undefined;
        return findFieldByKey(ruleToTest.target_field, allAvailableFields);
    }, [ruleToTest?.target_field, allAvailableFields]);

    const handleSelectFieldFromPicker = (field: TargetFieldDefinition) => {
        if (!editingRule) return;
        setEditingRule({
            ...editingRule,
            target_field: field.key,
            operator: (editingRule.operator && editingRule.operator !== 'EQUALS') ? editingRule.operator : (field.suggestedOperator || 'EQUALS'),
            expected_value: (editingRule.expected_value === undefined || editingRule.expected_value === '') ? field.exampleValue : editingRule.expected_value
        });
        setIsFieldPickerOpen(false);
    };

    // Filter rules
    const filteredRules = rules.filter(r => {
        const matchesSearch =
            r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.target_field && r.target_field.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
        const matchesStatus =
            statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && r.is_active) ||
            (statusFilter === 'INACTIVE' && !r.is_active);

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Handle Create Open
    const handleOpenCreate = () => {
        setIsCreating(true);
        setEditingRule({
            code: `RULE_${Date.now().toString().slice(-6)}`,
            title: '',
            description: '',
            category: 'WORKFLOW',
            trigger_event: 'BEFORE_TRANSITION',
            target_field: 'montant_total_ht',
            operator: 'GREATER_THAN',
            expected_value: '',
            action_type: 'BLOCK_TRANSITION',
            action_role: '',
            error_message: 'Condition non respectée. L\'action est bloquée.',
            is_active: true,
            priority: (rules.length > 0 ? Math.max(...rules.map(r => r.priority || 0)) : 0) + 1,
            associated_processes: ['ALL']
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    // Handle Edit Open
    const handleOpenEdit = (rule: BusinessRule) => {
        setIsCreating(false);
        setEditingRule({ ...rule });
        setFormError(null);
        setIsModalOpen(true);
    };

    // Handle Save (Create or Update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRule?.title?.trim()) {
            setFormError("Le titre de la règle est obligatoire.");
            return;
        }

        try {
            if (isCreating) {
                const res = await createBusinessRule(editingRule);
                setRules(prev => [...prev, res.data.rule]);
                showNotification(`Règle métier '${res.data.rule.title}' créée avec succès.`);
            } else {
                const res = await updateBusinessRule(editingRule.id || editingRule.code!, editingRule);
                setRules(prev => prev.map(r => r.id === res.data.rule.id ? res.data.rule : r));
                showNotification(`Règle métier '${res.data.rule.title}' mise à jour.`);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            setFormError(err.response?.data?.error || err.message || "Erreur lors de l'enregistrement de la règle.");
        }
    };

    // Handle Toggle Active
    const handleToggle = async (rule: BusinessRule) => {
        try {
            const res = await toggleBusinessRule(rule.id);
            setRules(prev => prev.map(r => r.id === rule.id ? res.data.rule : r));
            showNotification(`Règle '${rule.title}' ${res.data.rule.is_active ? 'activée' : 'désactivée'}.`);
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors du basculement d'état.");
        }
    };

    // Handle Duplicate
    const handleDuplicate = async (rule: BusinessRule) => {
        try {
            const res = await duplicateBusinessRule(rule.id);
            setRules(prev => [...prev, res.data.rule]);
            showNotification(`Règle dupliquée avec succès : ${res.data.rule.title}`);
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la duplication.");
        }
    };

    // Handle Delete
    const handleDelete = async (rule: BusinessRule) => {
        if (!window.confirm(`Êtes-vous certain de vouloir supprimer définitivement la règle métier "${rule.title}" (${rule.code}) ?`)) {
            return;
        }
        try {
            await deleteBusinessRule(rule.id);
            setRules(prev => prev.filter(r => r.id !== rule.id));
            showNotification(`Règle '${rule.title}' supprimée.`);
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la suppression.");
        }
    };

    // Handle Open Simulator
    const handleOpenTest = (rule: BusinessRule) => {
        setRuleToTest(rule);
        setTestFieldValue(rule.expected_value || '100');
        setTestResult(null);
        setIsTestModalOpen(true);
    };

    // Execute Simulator Test
    const handleExecuteTest = async () => {
        if (!ruleToTest) return;
        setTestLoading(true);
        try {
            const payload: any = {};
            if (ruleToTest.target_field) {
                payload[ruleToTest.target_field] = testFieldValue;
            }
            const res = await testBusinessRule(ruleToTest, payload);
            setTestResult(res.data);
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de l'évaluation de la règle.");
        } finally {
            setTestLoading(false);
        }
    };

    // ==========================================
    // GESTION DES DOMAINES MÉTIERS
    // ==========================================
    const handleOpenCreateDomain = () => {
        setIsCreatingDomain(true);
        const maxOrder = domains.reduce((max, d) => Math.max(max, d.display_order || 0), 0);
        setEditingDomain({
            code: `DOMAINE_${Date.now().toString().slice(-4)}`,
            label: '',
            description: '',
            color: 'text-indigo-700',
            bgBadge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
            iconName: 'Tag',
            display_order: maxOrder + 1,
            is_system: false
        });
        setDomainFormError(null);
        setIsDomainModalOpen(true);
    };

    const handleOpenEditDomain = (dom: RuleDomainConfig) => {
        setIsCreatingDomain(false);
        setEditingDomain({ ...dom });
        setDomainFormError(null);
        setIsDomainModalOpen(true);
    };

    const handleSaveDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDomain?.label?.trim()) {
            setDomainFormError("Le libellé du domaine est obligatoire.");
            return;
        }
        if (!editingDomain?.code?.trim()) {
            setDomainFormError("Le code technique du domaine est obligatoire.");
            return;
        }

        try {
            if (isCreatingDomain) {
                const res = await createRuleDomain(editingDomain);
                setDomains(prev => [...prev, res.data.domain].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
                showNotification(`Domaine métier '${res.data.domain.label}' créé avec succès.`);
            } else {
                const res = await updateRuleDomain(editingDomain.id || editingDomain.code!, editingDomain);
                setDomains(prev => prev.map(d => d.id === res.data.domain.id ? res.data.domain : d).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
                // Also reload rules to capture any cascade rename
                loadRules();
                showNotification(`Domaine métier '${res.data.domain.label}' mis à jour.`);
            }
            setIsDomainModalOpen(false);
        } catch (err: any) {
            setDomainFormError(err.response?.data?.error || err.message || "Erreur lors de l'enregistrement du domaine.");
        }
    };

    const handleDeleteDomain = async (dom: RuleDomainConfig) => {
        const linkedRulesCount = rules.filter(r => r.category === dom.code).length;
        if (linkedRulesCount > 0) {
            alert(`Impossible de supprimer le domaine "${dom.label}" (${dom.code}) car ${linkedRulesCount} règle(s) métier(s) y sont rattachées. Veuillez d'abord réaffecter ces règles.`);
            return;
        }
        if (!window.confirm(`Êtes-vous certain de vouloir supprimer définitivement le domaine métier "${dom.label}" (${dom.code}) ?`)) {
            return;
        }
        try {
            await deleteRuleDomain(dom.id || dom.code);
            setDomains(prev => prev.filter(d => d.id !== dom.id && d.code !== dom.code));
            showNotification(`Domaine '${dom.label}' supprimé avec succès.`);
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la suppression du domaine.");
        }
    };

    const handleResetDomains = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser l'ensemble des domaines métiers aux valeurs standards du système ? Toutes les personnalisations seront restaurées.")) {
            return;
        }
        try {
            const res = await resetRuleDomains();
            setDomains(res.data.domains || []);
            showNotification("Domaines métiers réinitialisés avec succès aux standards du système.");
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la réinitialisation.");
        }
    };

    const activeCount = rules.filter(r => r.is_active).length;

    return (
        <div className="space-y-6 pb-12">
            {/* Bannière Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-[#004d40] to-teal-900 rounded-2xl p-6 text-white shadow-lg border border-emerald-800/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-200 border border-white/10 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                Moteur Décisionnel Zero-Code
                            </span>
                            <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-300 text-xs rounded-full font-mono border border-emerald-400/30 font-semibold">
                                {activeCount} / {rules.length} Règles Actives
                            </span>
                            <span className="px-2.5 py-0.5 bg-white/10 text-white text-xs rounded-full font-mono">
                                Espace Administrateur
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <SlidersHorizontal className="w-8 h-8 text-yellow-400" />
                            Gestion des Règles Métiers
                        </h1>
                        <p className="text-sm text-emerald-100/90 max-w-3xl leading-relaxed">
                            Définissez et configurez les conditions logiques, plafonds de quotas, seuils budgétaires, règles de double validation 4-yeux et politiques d'escalade qui régissent automatiquement l'instruction de vos processus.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <PageHelpButton
                            pageTitle="Gestion des Règles Métiers"
                            pageCategory="Moteur Décisionnel"
                            description="Guide d'administration du moteur de règles métiers zéro-code pour les flux et processus opérationnels."
                            sections={REGLE_HELP_SECTIONS}
                        />
                        {activeTab === 'rules' ? (
                            <>
                                <button
                                    onClick={() => setActiveTab('domains')}
                                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition border border-white/20 flex items-center gap-2 cursor-pointer"
                                    title="Gérer les catégories et domaines de règles métiers"
                                >
                                    <FolderKanban className="w-4 h-4 text-emerald-300" />
                                    <span>Domaines ({domains.length})</span>
                                </button>
                                <button
                                    id="btn-new-business-rule"
                                    onClick={handleOpenCreate}
                                    className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4 stroke-[3]" />
                                    <span>Nouvelle Règle Métier</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setActiveTab('rules')}
                                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition border border-white/20 flex items-center gap-2 cursor-pointer"
                                    title="Retourner à la liste des règles métiers"
                                >
                                    <SlidersHorizontal className="w-4 h-4 text-emerald-300" />
                                    <span>Règles ({rules.length})</span>
                                </button>
                                <button
                                    id="btn-new-domain-header"
                                    onClick={handleOpenCreateDomain}
                                    className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4 stroke-[3]" />
                                    <span>Nouveau Domaine Métier</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification de succès */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-950">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Onglets de navigation principale */}
            <div className="flex items-center gap-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        activeTab === 'rules'
                            ? 'border-emerald-600 text-emerald-800'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Règles Métiers Actives ({rules.length})</span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-semibold">
                        {activeCount} actives
                    </span>
                </button>
                <button
                    id="tab-rule-domains"
                    onClick={() => setActiveTab('domains')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        activeTab === 'domains'
                            ? 'border-emerald-600 text-emerald-800'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <FolderKanban className="w-4 h-4" />
                    <span>Domaines & Thématiques Métiers ({domains.length})</span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* ONGLET 1 : CATALOGUE DES RÈGLES MÉTIERS */}
            {/* ========================================================================= */}
            {activeTab === 'rules' && (
                <div className="space-y-6">
                    {/* Barre de Filtres & Recherche */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Recherche */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par titre, code, champ (ex: montant_total_ht)..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-gray-50/50 focus:bg-white transition"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Filtre État */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Statut :</span>
                                <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs">
                                    <button
                                        onClick={() => setStatusFilter('ALL')}
                                        className={`px-3 py-1 rounded-lg font-medium transition ${statusFilter === 'ALL' ? 'bg-white shadow-2xs font-bold text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Tous ({rules.length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('ACTIVE')}
                                        className={`px-3 py-1 rounded-lg font-medium transition ${statusFilter === 'ACTIVE' ? 'bg-white shadow-2xs font-bold text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Actives ({rules.filter(r => r.is_active).length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('INACTIVE')}
                                        className={`px-3 py-1 rounded-lg font-medium transition ${statusFilter === 'INACTIVE' ? 'bg-white shadow-2xs font-bold text-gray-700' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Inactives ({rules.filter(r => !r.is_active).length})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filtre par Domaine Métier */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-2 flex items-center gap-1">
                                <Filter className="w-3 h-3" /> Domaine :
                            </span>
                            <button
                                onClick={() => setSelectedCategory('ALL')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    selectedCategory === 'ALL'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Tous les domaines ({rules.length})
                            </button>
                            {(domains.length > 0 ? domains : Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ code: k, label: v.label, iconName: '', color: '', bgBadge: '', id: k, description: '', display_order: 0 }))).map(domItem => {
                                const count = rules.filter(r => r.category === domItem.code).length;
                                const isSel = selectedCategory === domItem.code;
                                const meta = getDomainMeta(domItem.code);
                                const DomIcon = meta.icon;
                                return (
                                    <button
                                        key={domItem.code}
                                        onClick={() => setSelectedCategory(domItem.code)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                                            isSel
                                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <DomIcon className="w-3 h-3" />
                                        <span>{domItem.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSel ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setActiveTab('domains')}
                                className="ml-auto px-2.5 py-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                title="Configurer et gérer les domaines de règles métiers"
                            >
                                <FolderKanban className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Gérer les Domaines ({domains.length})</span>
                            </button>
                        </div>
                    </div>

                    {/* Liste des Règles Métiers */}
                    {loading ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs flex flex-col items-center justify-center space-y-3">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                            <p className="text-xs font-medium">Chargement des règles métiers...</p>
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs space-y-3">
                            <SlidersHorizontal className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-semibold text-gray-700">Aucune règle métier ne correspond à vos filtres.</p>
                            <p className="text-xs text-gray-400">Modifiez vos critères de recherche ou créez une nouvelle règle métier.</p>
                            <button
                                onClick={handleOpenCreate}
                                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Créer une règle métier
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredRules.map(rule => {
                                const catMeta = getDomainMeta(rule.category);
                                const CatIcon = catMeta.icon;
                                const actionMeta = ACTION_LABELS[rule.action_type] || ACTION_LABELS.CUSTOM;

                        return (
                            <div
                                key={rule.id}
                                className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                                    rule.is_active ? 'border-gray-200 hover:border-emerald-500 hover:shadow-md' : 'border-gray-200 bg-gray-50/50 opacity-75'
                                }`}
                            >
                                <div className="p-5 space-y-4">
                                    {/* Top Bar Card */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${catMeta.color}`}>
                                                <CatIcon className="w-3 h-3" />
                                                {catMeta.label}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                {rule.code}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-400">
                                                Prio #{rule.priority}
                                            </span>
                                        </div>

                                        {/* Switch Active */}
                                        <button
                                            onClick={() => handleToggle(rule)}
                                            className={`p-1 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                                                rule.is_active
                                                    ? 'text-emerald-700 hover:bg-emerald-50'
                                                    : 'text-gray-400 hover:bg-gray-200'
                                            }`}
                                            title={rule.is_active ? "Désactiver la règle" : "Activer la règle"}
                                        >
                                            {rule.is_active ? (
                                                <>
                                                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                                                    <span className="hidden sm:inline">Active</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                                    <span className="hidden sm:inline">Inactive</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Titre & Description */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 leading-snug">
                                            {rule.title}
                                        </h3>
                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                            {rule.description || "Aucune description détaillée."}
                                        </p>
                                    </div>

                                    {/* Formule Logique Visuelle (Quand ... Alors ...) */}
                                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                                        <div className="flex items-start gap-2">
                                            <span className="font-bold text-gray-500 shrink-0 w-12 text-[10px] uppercase tracking-wider pt-0.5">
                                                Quand :
                                            </span>
                                            <div className="font-mono text-gray-800 flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-indigo-700 font-semibold">
                                                    {rule.target_field || "condition_libre"}
                                                </span>
                                                <span className="text-gray-400 font-sans text-[11px]">
                                                    {OPERATOR_LABELS[rule.operator] || rule.operator}
                                                </span>
                                                {rule.expected_value !== undefined && rule.expected_value !== '' && (
                                                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-emerald-700 font-bold">
                                                        "{rule.expected_value}"
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400 font-sans italic ml-1">
                                                    ({TRIGGER_LABELS[rule.trigger_event] || rule.trigger_event})
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2 pt-1 border-t border-gray-200/60">
                                            <span className="font-bold text-gray-500 shrink-0 w-12 text-[10px] uppercase tracking-wider pt-0.5">
                                                Alors :
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${actionMeta.color}`}>
                                                    {actionMeta.label}
                                                </span>
                                                {rule.action_role && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                                        Rôle : {rule.action_role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {rule.error_message && (
                                            <div className="text-[11px] text-red-600 bg-red-50/60 p-1.5 rounded border border-red-100 flex items-start gap-1.5 mt-1">
                                                <AlertOctagon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                                                <span>Message : {rule.error_message}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Processus associés */}
                                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                        <span className="font-medium text-gray-500">Portée :</span>
                                        {rule.associated_processes.includes("ALL") ? (
                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-200">
                                                Tous les processus
                                            </span>
                                        ) : (
                                            rule.associated_processes.map(p => (
                                                <span key={p} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                                    {p}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => handleOpenTest(rule)}
                                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                                        title="Lancer le simulateur de test interactif sur cette règle"
                                    >
                                        <Play className="w-3.5 h-3.5 text-emerald-600" />
                                        Tester la règle
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleDuplicate(rule)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                            title="Dupliquer cette règle métier"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(rule)}
                                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                            title="Modifier la règle"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                            title="Supprimer la règle"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* ONGLET 2 : RÉFÉRENTIEL DES DOMAINES & THÉMATIQUES MÉTIERS */}
            {/* ========================================================================= */}
            {activeTab === 'domains' && (
                <div className="space-y-6">
                    {/* Description et barre d'actions Domaines */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <FolderKanban className="w-5 h-5 text-emerald-700" />
                                Référentiel des Domaines Métiers ({domains.length})
                            </h2>
                            <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                                Configurez les thématiques fonctionnelles (Quotas, Finances, NIS 2, Logistique, SLA...).
                                Ces domaines alimentent directement les filtres des règles, l'organisation du catalogue de champs cibles et les politiques de gouvernance.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                type="button"
                                onClick={handleResetDomains}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-gray-200"
                                title="Rétablir les domaines initiaux standards"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Réinitialiser aux standards</span>
                            </button>
                            <button
                                type="button"
                                id="btn-new-domain"
                                onClick={handleOpenCreateDomain}
                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                                <span>Nouveau Domaine Métier</span>
                            </button>
                        </div>
                    </div>

                    {/* Recherche de Domaines */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Rechercher un domaine par code, libellé, description..."
                                value={domainSearch}
                                onChange={e => setDomainSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-gray-50/50 focus:bg-white transition"
                            />
                            {domainSearch && (
                                <button
                                    onClick={() => setDomainSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="text-xs text-gray-500 font-medium">
                            <span className="font-bold text-gray-900">{filteredDomains.length}</span> domaine(s) configuré(s)
                        </div>
                    </div>

                    {/* Grille des Cartes Domaines */}
                    {domainLoading ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs flex flex-col items-center justify-center space-y-3">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                            <p className="text-xs font-medium">Chargement des domaines métiers...</p>
                        </div>
                    ) : filteredDomains.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs space-y-3">
                            <FolderKanban className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-semibold text-gray-700">Aucun domaine métier ne correspond à votre recherche.</p>
                            <button
                                onClick={handleOpenCreateDomain}
                                className="mt-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Créer un domaine
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDomains.map(dom => {
                                const DomIcon = getDomainIconComponent(dom.iconName);
                                const linkedRules = rules.filter(r => r.category === dom.code);
                                const activeLinkedRules = linkedRules.filter(r => r.is_active);
                                const linkedFields = allAvailableFields.filter(f => f.category === dom.code);

                                return (
                                    <div
                                        key={dom.id || dom.code}
                                        className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                                    >
                                        <div className="space-y-3">
                                            {/* En-tête de carte */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${dom.bgBadge || 'bg-gray-100 text-gray-800'}`}>
                                                        <DomIcon className="w-3.5 h-3.5" />
                                                        <span>{dom.code}</span>
                                                    </span>
                                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                        #{dom.display_order}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {dom.is_system && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                            Standard
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Titre & Description */}
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                                                    {dom.label}
                                                </h3>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                                                    {dom.description || "Aucune description renseignée pour ce domaine métier."}
                                                </p>
                                            </div>

                                            {/* Statistiques rattachées */}
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Règles associées</div>
                                                    <div className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                                                        <span>{linkedRules.length}</span>
                                                        <span className="text-[10px] font-normal text-emerald-700">({activeLinkedRules.length} actives)</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Champs du catalogue</div>
                                                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                                                        {linkedFields.length} champ(s)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory(dom.code);
                                                    setActiveTab('rules');
                                                }}
                                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                                                title="Voir les règles métiers appartenant à ce domaine"
                                            >
                                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                                <span>Voir les règles ({linkedRules.length})</span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditDomain(dom)}
                                                    className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                                    title="Modifier la configuration du domaine métier"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDomain(dom)}
                                                    disabled={linkedRules.length > 0}
                                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                                        linkedRules.length > 0
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                    title={linkedRules.length > 0 ? "Impossible de supprimer : des règles sont rattachées" : "Supprimer ce domaine"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL CRÉATION / MODIFICATION DE RÈGLE MÉTIER */}
            {/* ========================================================================= */}
            {isModalOpen && editingRule && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
                        {/* Header Modal */}
                        <div className="bg-gradient-to-r from-emerald-950 via-[#004d40] to-teal-900 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <SlidersHorizontal className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <h3 className="text-base font-bold">
                                        {isCreating ? "Créer une Nouvelle Règle Métier" : `Modifier la Règle : ${editingRule.title}`}
                                    </h3>
                                    <p className="text-xs text-emerald-200">
                                        Configuration dynamique des conditions, déclencheurs et actions de gouvernance
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Formulaire */}
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Titre & Code */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Titre Explicite de la Règle *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editingRule.title || ''}
                                        onChange={e => setEditingRule({ ...editingRule, title: e.target.value })}
                                        placeholder="ex: Plafond Quota Matériel > 2 clés physiques"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Code Technique Unique *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editingRule.code || ''}
                                        onChange={e => setEditingRule({ ...editingRule, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                                        placeholder="RULE_QUOTA_S10"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 outline-hidden bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Catégorie & Événement Déclencheur */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-gray-700">
                                            Domaine / Catégorie Métier
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setActiveTab('domains');
                                            }}
                                            className="text-[10px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                        >
                                            <FolderKanban className="w-3 h-3" />
                                            <span>Gérer les domaines</span>
                                        </button>
                                    </div>
                                    <select
                                        value={editingRule.category || (domains[0]?.code || 'WORKFLOW')}
                                        onChange={e => setEditingRule({ ...editingRule, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white cursor-pointer font-medium"
                                    >
                                        {domains.length > 0 ? (
                                            domains.map(d => (
                                                <option key={d.code} value={d.code}>
                                                    [{d.code}] {d.label}
                                                </option>
                                            ))
                                        ) : (
                                            Object.entries(CATEGORY_CONFIG).map(([k, c]) => (
                                                <option key={k} value={k}>{c.label}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Événement Déclencheur (Trigger)
                                    </label>
                                    <select
                                        value={editingRule.trigger_event || 'BEFORE_TRANSITION'}
                                        onChange={e => setEditingRule({ ...editingRule, trigger_event: e.target.value as any })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white cursor-pointer"
                                    >
                                        {Object.entries(TRIGGER_LABELS).map(([k, lbl]) => (
                                            <option key={k} value={k}>{lbl}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Description Métier */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Description & Contexte d'Application
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingRule.description || ''}
                                    onChange={e => setEditingRule({ ...editingRule, description: e.target.value })}
                                    placeholder="Expliquez la logique métier, la norme réglementaire ou la directive associée..."
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                />
                            </div>

                            {/* Section Condition Logique */}
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 space-y-3">
                                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-emerald-700" />
                                    Condition Logique Évaluée
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Champ Cible */}
                                    <div className="md:col-span-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-[11px] font-semibold text-gray-700">
                                                Champ Cible Testé
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setIsFieldPickerOpen(true)}
                                                className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                                title="Ouvrir la bibliothèque exhaustive des champs"
                                            >
                                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                                <span>Catalogue ({allAvailableFields.length})</span>
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                list="suggested-fields-list"
                                                value={editingRule.target_field || ''}
                                                onChange={e => setEditingRule({ ...editingRule, target_field: e.target.value })}
                                                placeholder="ex: montant_total_ht"
                                                className="w-full border border-gray-300 rounded-lg p-2 pr-18 text-xs font-mono focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsFieldPickerOpen(true)}
                                                className="absolute right-1 top-1 bottom-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                                                title="Choisir parmi la liste exhaustive des champs"
                                            >
                                                <BookOpen className="w-3 h-3 text-emerald-600" />
                                                <span>Choisir</span>
                                            </button>
                                        </div>
                                        <datalist id="suggested-fields-list">
                                            {allAvailableFields.map(f => (
                                                <option key={f.key} value={f.key}>
                                                    [{f.categoryLabel}] {f.label} ({f.type})
                                                </option>
                                            ))}
                                        </datalist>

                                        {/* Badge de prévisualisation du champ sélectionné */}
                                        {currentTargetFieldMeta ? (
                                            <div className="mt-1.5 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-2">
                                                <span className="font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800 shrink-0">
                                                    {currentTargetFieldMeta.categoryLabel}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-emerald-900 truncate">
                                                        {currentTargetFieldMeta.label}
                                                    </div>
                                                    <p className="text-[10px] text-emerald-800 line-clamp-2 leading-tight mt-0.5">
                                                        {currentTargetFieldMeta.description}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-500 bg-white/90 px-1 py-0.5 rounded border border-emerald-200 shrink-0">
                                                    {currentTargetFieldMeta.type}
                                                </span>
                                            </div>
                                        ) : editingRule.target_field ? (
                                            <div className="mt-1 text-[10px] text-gray-500 italic flex items-center gap-1">
                                                <Info className="w-3 h-3 text-gray-400" />
                                                <span>Champ personnalisé libre (non répertorié au catalogue standard).</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Opérateur */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Opérateur de Comparaison
                                        </label>
                                        <select
                                            value={editingRule.operator || 'EQUALS'}
                                            onChange={e => setEditingRule({ ...editingRule, operator: e.target.value as any })}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white cursor-pointer"
                                        >
                                            {Object.entries(OPERATOR_LABELS).map(([k, lbl]) => (
                                                <option key={k} value={k}>{lbl}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Valeur Attendue */}
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Valeur Seuil / Cible
                                        </label>
                                        <input
                                            type="text"
                                            value={editingRule.expected_value !== undefined ? editingRule.expected_value : ''}
                                            onChange={e => setEditingRule({ ...editingRule, expected_value: e.target.value })}
                                            placeholder="ex: 1500 ou requester_id"
                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section Action Déclenchée */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    Action & Conséquence en Cas de Match
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Type d'Action
                                        </label>
                                        <select
                                            value={editingRule.action_type || 'BLOCK_TRANSITION'}
                                            onChange={e => setEditingRule({ ...editingRule, action_type: e.target.value as any })}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white cursor-pointer"
                                        >
                                            {Object.entries(ACTION_LABELS).map(([k, a]) => (
                                                <option key={k} value={k}>{a.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Rôle Cible Requis (Si applicable)
                                        </label>
                                        <input
                                            type="text"
                                            value={editingRule.action_role || ''}
                                            onChange={e => setEditingRule({ ...editingRule, action_role: e.target.value })}
                                            placeholder="ex: Administrateur National, DAF, N+2"
                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                        Message d'Avertissement / Erreur Affiché
                                    </label>
                                    <input
                                        type="text"
                                        value={editingRule.error_message || ''}
                                        onChange={e => setEditingRule({ ...editingRule, error_message: e.target.value })}
                                        placeholder="ex: Dépassement de plafond. Validation financière obligatoire."
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white text-red-700 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Priorité & Statut Actif */}
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Priorité d'Évaluation (1 = Priorité Haute)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={editingRule.priority || 1}
                                        onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 1 })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <input
                                        type="checkbox"
                                        id="modal-rule-is-active"
                                        checked={editingRule.is_active ?? true}
                                        onChange={e => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <label htmlFor="modal-rule-is-active" className="text-xs font-bold text-gray-800 cursor-pointer">
                                        Règle active immédiatement
                                    </label>
                                </div>
                            </div>

                            {/* Boutons Footer */}
                            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
                                >
                                    {isCreating ? "Créer la Règle Métier" : "Enregistrer les Modifications"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL SIMULATEUR & TESTEUR DE RÈGLE */}
            {/* ========================================================================= */}
            {isTestModalOpen && ruleToTest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
                        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Play className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <h3 className="text-sm font-bold">
                                        Simulateur d'Évaluation de Règle
                                    </h3>
                                    <p className="text-[11px] text-gray-300">
                                        Testez en temps réel le comportement de votre règle métier
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTestModalOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                                <span className="text-[10px] font-mono text-gray-400">{ruleToTest.code}</span>
                                <h4 className="text-xs font-bold text-gray-900">{ruleToTest.title}</h4>
                                <p className="text-[11px] text-gray-600">
                                    Condition : <span className="font-mono text-indigo-700">{ruleToTest.target_field}</span> {OPERATOR_LABELS[ruleToTest.operator]} <span className="font-mono text-emerald-700">"{ruleToTest.expected_value}"</span>
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Valeur de Test pour <span className="font-mono text-indigo-700">{ruleToTest.target_field || 'valeur'}</span>
                                    </label>
                                    {currentTestFieldMeta?.exampleValue && (
                                        <button
                                            type="button"
                                            onClick={() => setTestFieldValue(currentTestFieldMeta.exampleValue)}
                                            className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                                        >
                                            Insérer valeur d'exemple ({currentTestFieldMeta.exampleValue})
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={testFieldValue}
                                    onChange={e => setTestFieldValue(e.target.value)}
                                    placeholder={currentTestFieldMeta ? `ex: ${currentTestFieldMeta.exampleValue}` : "Saisissez une valeur de test..."}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                />
                                {currentTestFieldMeta && (
                                    <div className="mt-1 text-[11px] text-gray-500 flex items-center justify-between">
                                        <span>Type attendu : <strong className="font-mono text-gray-700">{currentTestFieldMeta.type}</strong></span>
                                        <span>{currentTestFieldMeta.label}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleExecuteTest}
                                disabled={testLoading}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                {testLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Évaluer la condition maintenant
                            </button>

                            {/* Résultat du test */}
                            {testResult && (
                                <div className={`p-4 rounded-xl border space-y-2 animate-fadeIn ${
                                    testResult.triggered
                                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                                        : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {testResult.triggered ? (
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="font-bold text-xs">
                                            {testResult.triggered ? "RÈGLE DÉCLENCHÉE" : "PASSAGE AUTORISÉ (RÈGLE NON DÉCLENCHÉE)"}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-700 font-mono">
                                        {testResult.evaluationDetail}
                                    </p>

                                    {testResult.action_that_would_execute && (
                                        <div className="pt-2 border-t border-amber-200 text-xs space-y-1">
                                            <div className="font-semibold text-amber-900">
                                                Action exécutée : <span className="font-mono">{testResult.action_that_would_execute.action_type}</span>
                                            </div>
                                            {testResult.action_that_would_execute.error_message && (
                                                <div className="text-red-700 text-[11px]">
                                                    Message bloquant : {testResult.action_that_would_execute.error_message}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => setIsTestModalOpen(false)}
                                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                                >
                                    Fermer le simulateur
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3 : Bibliothèque Exhaustive des Champs Cibles */}
            {isFieldPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-[#002395] text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
                                    <BookOpen className="w-5 h-5 text-emerald-300" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold">
                                            Bibliothèque des Champs Évaluables
                                        </h3>
                                        <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                                            {allAvailableFields.length} champs disponibles
                                        </span>
                                    </div>
                                    <p className="text-xs text-emerald-100/80 mt-0.5">
                                        Sélectionnez un attribut système, ferroviaire ou de formulaire pour alimenter la règle métier
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFieldPickerOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Category Filter Bar */}
                        <div className="p-4 bg-gray-50 border-b border-gray-200 shrink-0 space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={fieldPickerSearch}
                                    onChange={e => setFieldPickerSearch(e.target.value)}
                                    placeholder="Rechercher par nom de champ, clé technique (ex: montant, gps, hardware), description..."
                                    className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden shadow-2xs"
                                />
                                {fieldPickerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setFieldPickerSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                                {pickerCategoryOptions.map(cat => {
                                    const isSelected = fieldPickerCategory === cat.id;

                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFieldPickerCategory(cat.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                                isSelected
                                                    ? 'bg-emerald-700 text-white shadow-xs'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <span>{cat.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Fields List / Grid */}
                        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
                            <div className="text-[11px] text-gray-500 font-semibold mb-2 flex items-center justify-between">
                                <span>{filteredPickerFields.length} champ(s) trouvé(s)</span>
                                <span className="text-[10px] text-gray-400 italic">
                                    💡 Vous pouvez aussi taper n'importe quel nom de champ personnalisé libre dans le formulaire
                                </span>
                            </div>

                            {filteredPickerFields.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-600 font-semibold">Aucun champ ne correspond à votre recherche "{fieldPickerSearch}".</p>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Essayez un autre mot-clé ou réinitialisez le filtre de catégorie.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {filteredPickerFields.map(f => {
                                        const isSelectedInRule = editingRule?.target_field === f.key;

                                        return (
                                            <div
                                                key={f.key}
                                                className={`p-3 rounded-xl border text-xs transition flex flex-col justify-between ${
                                                    isSelectedInRule
                                                        ? 'bg-emerald-50/60 border-emerald-400 shadow-2xs'
                                                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50/80'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                                            {f.key}
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                                                {f.categoryLabel}
                                                            </span>
                                                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                                                {f.type}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-bold text-gray-900 text-xs mt-1">
                                                        {f.label}
                                                    </h4>
                                                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                                                        {f.description}
                                                    </p>

                                                    {f.formOrigin && (
                                                        <div className="mt-1 text-[10px] text-pink-700 font-medium">
                                                            Origine : {f.formOrigin}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-2.5 mt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                                    <div className="text-[10px] text-gray-400 font-mono truncate">
                                                        Ex: <span className="text-gray-700 font-semibold">{f.exampleValue}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectFieldFromPicker(f)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                                                            isSelectedInRule
                                                                ? 'bg-emerald-600 text-white shadow-2xs'
                                                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        }`}
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>{isSelectedInRule ? 'Actuellement sélectionné' : 'Insérer ce champ'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 shrink-0">
                            <div>
                                Vous pouvez également renseigner une expression personnalisée directement dans le champ texte.
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFieldPickerOpen(false)}
                                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition cursor-pointer"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 4 : CRÉATION / MODIFICATION D'UN DOMAINE MÉTIER */}
            {/* ========================================================================= */}
            {isDomainModalOpen && editingDomain && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
                                    <FolderKanban className="w-5 h-5 text-emerald-300" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold">
                                        {isCreatingDomain ? "Nouveau Domaine Métier" : `Modifier le Domaine : ${editingDomain.label || editingDomain.code}`}
                                    </h3>
                                    <p className="text-xs text-emerald-100/80 mt-0.5">
                                        Paramétrez les métadonnées, codes, icônes et styles d'affichage de cette thématique métier.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDomainModalOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Formulaire */}
                        <form onSubmit={handleSaveDomain} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {domainFormError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span>{domainFormError}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Libellé du Domaine Métier *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editingDomain.label || ''}
                                        onChange={e => setEditingDomain({ ...editingDomain, label: e.target.value })}
                                        placeholder="ex: Sécurité & Contrôle d'Accès"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Code Technique Unique (Identifiant) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editingDomain.code || ''}
                                        onChange={e => setEditingDomain({ ...editingDomain, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                                        placeholder="ex: SECURITY, QUOTA, ACCES..."
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 outline-hidden bg-gray-50"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        En majuscules, utilisé pour filtrer les règles et catégoriser les champs cibles.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Description & Périmètre Fonctionnel
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingDomain.description || ''}
                                    onChange={e => setEditingDomain({ ...editingDomain, description: e.target.value })}
                                    placeholder="Précisez la nature des règles et des contrôles rattachés à ce domaine (ex: habilitations, plafonds, SLA...)"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                />
                            </div>

                            {/* Sélecteur d'icône */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                    Icône Représentative
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                    {DOMAIN_ICON_OPTIONS.map(opt => {
                                        const IconComponent = opt.icon;
                                        const isSelected = (editingDomain.iconName || 'Tag') === opt.name;
                                        return (
                                            <button
                                                key={opt.name}
                                                type="button"
                                                onClick={() => setEditingDomain({ ...editingDomain, iconName: opt.name })}
                                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                                                    isSelected
                                                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                                title={opt.label}
                                            >
                                                <IconComponent className="w-4 h-4" />
                                                <span className="text-[9px] truncate w-full">{opt.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sélecteur de Style Visuel / Badge Couleur */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                    Palette Visuelle du Badge
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {DOMAIN_COLOR_PRESETS.map(preset => {
                                        const isSelected = editingDomain.bgBadge === preset.bgBadge;
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => setEditingDomain({
                                                    ...editingDomain,
                                                    color: preset.color,
                                                    bgBadge: preset.bgBadge
                                                })}
                                                className={`p-2 rounded-xl border flex items-center gap-2 transition cursor-pointer text-left ${
                                                    isSelected
                                                        ? 'ring-2 ring-emerald-600 border-emerald-600 bg-white shadow-xs'
                                                        : 'border-gray-200 bg-gray-50/50 hover:bg-white'
                                                }`}
                                            >
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${preset.bgBadge}`}>
                                                    Badge
                                                </span>
                                                <span className="text-[11px] font-medium text-gray-700 truncate">
                                                    {preset.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Ordre d'affichage
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={editingDomain.display_order ?? 1}
                                        onChange={e => setEditingDomain({ ...editingDomain, display_order: Number(e.target.value) })}
                                        className="w-32 border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white"
                                    />
                                </div>

                                {/* Aperçu du badge en direct */}
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                        Aperçu en direct :
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const PreviewIcon = getDomainIconComponent(editingDomain.iconName);
                                            return (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${editingDomain.bgBadge || 'bg-gray-100 text-gray-800'}`}>
                                                    <PreviewIcon className="w-3.5 h-3.5" />
                                                    <span>{editingDomain.label || editingDomain.code || 'Mon Domaine'}</span>
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDomainModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Enregistrer le Domaine</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReglesMetier;
