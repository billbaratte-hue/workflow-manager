import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import {
    Bell,
    Plus,
    Search,
    SlidersHorizontal,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Mail,
    Smartphone,
    Send,
    Eye,
    Edit3,
    Copy,
    Trash2,
    Layers,
    Tag,
    Clock,
    User,
    Shield,
    ExternalLink,
    HelpCircle,
    Check,
    X,
    Sparkles,
    RefreshCw
} from 'lucide-react';

export type TriggerEventType =
    | 'on_submission'
    | 'on_stage_approved'
    | 'on_final_approval'
    | 'on_rejected'
    | 'on_complement_requested'
    | 'on_complement_submitted'
    | 'on_sla_warning'
    | 'on_request_edited'
    | 'on_cancelled'
    | 'on_key_delivered'
    | 'on_key_returned'
    | 'on_delegation_set'
    | 'on_security_alert';

export interface NotificationTemplate {
    id: string;
    name: string;
    category: string;
    description?: string;
    trigger_event: TriggerEventType;
    recipient_type: 'demandeur' | 'validator_current_stage' | 'all_validators' | 'role' | 'custom_email';
    recipient_role?: string;
    recipient_email?: string;
    subject: string;
    content: string;
    channel: 'app' | 'email' | 'both';
    urgent: boolean;
    active: boolean;
    is_system?: boolean;
    created_at?: string;
    updated_at?: string;
    linked_processes?: { id: number; name: string }[];
    usage_count?: number;
}

export const STANDARD_BUSINESS_CATEGORIES = [
    { name: "Circuit de Validation", desc: "Jalons N+1, avis techniques, approbations hiérarchiques", color: "border-blue-200 bg-blue-50 text-blue-800" },
    { name: "Dépôt & Soumission", desc: "Accusés de réception, modifications de dossier, annulations", color: "border-sky-200 bg-sky-50 text-sky-800" },
    { name: "Décisions & Refus", desc: "Accords définitifs, avis défavorables, motifs obligatoires", color: "border-purple-200 bg-purple-50 text-purple-800" },
    { name: "Compléments de Dossier", desc: "Demandes de pièces complémentaires et réponses de l'agent", color: "border-amber-200 bg-amber-50 text-amber-800" },
    { name: "Alertes SLA", desc: "Dépassements d'échéances, relances automatiques 24h/48h", color: "border-orange-200 bg-orange-50 text-orange-800" },
    { name: "Clés & Habilitations", desc: "Remise physique mécatronique, restitution, programmation", color: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    { name: "Sûreté & Sécurité", desc: "Conformité NIS 2, habilitation H0B0, alertes d'anomalie", color: "border-rose-200 bg-rose-50 text-rose-800" },
    { name: "Délégations & Rôles", desc: "Délégation d'autorité, intérim hiérarchique, suppléance", color: "border-violet-200 bg-violet-50 text-violet-800" }
];

const AVAILABLE_TAGS = [
    { tag: '{reference}', label: 'Réf. Demande', example: 'DEM-2026-0412', desc: 'Identifiant unique du dossier' },
    { tag: '{tenant_name}', label: 'Nom du Client / Tenant', example: 'Acme Corporation', desc: 'Nom de l\'instance client ou organisation' },
    { tag: '{requester_name}', label: 'Nom du Demandeur', example: 'Daniel Dupont', desc: 'Nom complet du demandeur / bénéficiaire' },
    { tag: '{status_label}', label: 'Libellé du Statut', example: 'En attente d\'approbation', desc: 'Statut courant du workflow' },
    { tag: '{utilisateur}', label: 'Demandeur (alt)', example: 'Daniel Dupont', desc: 'Nom complet du demandeur' },
    { tag: '{demandeur}', label: 'Demandeur (alt)', example: 'Daniel Dupont', desc: 'Alias pour le demandeur' },
    { tag: '{site}', label: 'Site / Établissement', example: 'Site Paris Nord', desc: 'Nom du site d\'intervention' },
    { tag: '{date}', label: 'Date', example: '16/09/2026', desc: 'Date de l\'événement' },
    { tag: '{heure}', label: 'Heure', example: '14:32', desc: 'Heure de l\'événement' },
    { tag: '{processus}', label: 'Workflow', example: 'Demande standard', desc: 'Nom du processus' },
    { tag: '{etape}', label: 'Étape courante', example: 'Validation Hiérarchique', desc: 'Libellé du jalon' },
    { tag: '{validateur}', label: 'Validateur', example: 'Marc Martin', desc: 'Nom du validateur actif' },
    { tag: '{role_validateur}', label: 'Rôle Validateur', example: 'Responsable Métier', desc: 'Rôle habilité' },
    { tag: '{motif}', label: 'Motif / Avis', example: 'Attestation de sécurité non conforme', desc: 'Commentaire ou motif de refus' },
    { tag: '{sla_heures}', label: 'Délai SLA', example: '24', desc: 'Engagement SLA en heures' },
    { tag: '{service}', label: 'Service', example: 'Exploitation', desc: 'Entité de rattachement' },
    { tag: '{lien}', label: 'Lien Portail', example: '/corbeille', desc: 'Lien direct vers le dossier' }
];

const TRIGGER_LABELS: Record<string, { label: string; color: string; desc: string }> = {
    on_submission: { label: 'À la soumission', color: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Déclenché dès le dépôt initial d\'une demande' },
    on_stage_approved: { label: 'Étape validée', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'Déclenché lors d\'un avis favorable sur une étape' },
    on_final_approval: { label: 'Validation finale', color: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Déclenché lors de l\'accord définitif du circuit' },
    on_rejected: { label: 'Refus de la demande', color: 'bg-red-100 text-red-800 border-red-200', desc: 'Déclenché en cas d\'avis défavorable motivé' },
    on_complement_requested: { label: 'Complément requis', color: 'bg-amber-100 text-amber-800 border-amber-200', desc: 'Déclenché pour demander des pièces justificatives' },
    on_complement_submitted: { label: 'Complément fourni', color: 'bg-teal-100 text-teal-800 border-teal-200', desc: 'Déclenché dès que le demandeur soumet sa réponse' },
    on_sla_warning: { label: 'Alerte retard SLA', color: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Déclenché en cas de dépassement d\'échéance' },
    on_request_edited: { label: 'Détails modifiés', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', desc: 'Déclenché lors d\'une mise à jour des données du dossier' },
    on_cancelled: { label: 'Demande annulée', color: 'bg-gray-200 text-gray-800 border-gray-300', desc: 'Déclenché si le demandeur annule son dossier' },
    on_key_delivered: { label: 'Clé remise / délivrée', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', desc: 'Déclenché à la remise physique de la clé mécatronique' },
    on_key_returned: { label: 'Clé restituée', color: 'bg-slate-100 text-slate-800 border-slate-200', desc: 'Déclenché lors de la restitution et clôture des accès' },
    on_delegation_set: { label: 'Délégation accordée', color: 'bg-violet-100 text-violet-800 border-violet-200', desc: 'Déclenché lors de la désignation d\'un suppléant' },
    on_security_alert: { label: 'Alerte Sûreté / Risque', color: 'bg-rose-100 text-rose-800 border-rose-200', desc: 'Déclenché en cas d\'incohérence, anomalie ou risque' }
};

const RECIPIENT_LABELS: Record<string, { label: string; icon: string }> = {
    demandeur: { label: 'Demandeur (Agent)', icon: 'User' },
    validator_current_stage: { label: 'Validateur étape courante', icon: 'Shield' },
    role: { label: 'Rôle Spécifique', icon: 'Shield' },
    all_validators: { label: 'Tous les validateurs', icon: 'Users' },
    custom_email: { label: 'Email externe personnalisé', icon: 'Mail' }
};

const notificationsHelpSections: HelpSection[] = [
    {
        title: "Bibliothèque Centralisée des Modèles",
        badge: "Règles & Modèles",
        description: "Configurez les modèles de messages envoyés lors des événements du circuit de validation et de la gestion des clés mécatroniques.",
        tips: [
            "Chaque modèle peut cibler l'application web, l'e-mail ou les deux canaux simultanément",
            "Définissez le niveau d'urgence pour mettre en évidence les notifications critiques",
            "Activez ou désactivez un modèle à tout moment sans le supprimer"
        ]
    },
    {
        title: "Balises Dynamiques & Fusion de Données",
        badge: "Variables",
        description: "Insérez des balises telles que {numero_demande}, {demandeur_nom}, {site_nom}, {lien_action} pour personnaliser automatiquement chaque notification.",
        tips: [
            "Les balises s'adaptent au contexte du workflow et du demandeur",
            "Utilisez le simulateur de rendu pour tester les fusions de variables en temps réel"
        ]
    },
    {
        title: "Événements Déclencheurs (Triggers)",
        badge: "Automatisation",
        description: "13 événements système surveillent le cycle de vie : soumission, validation d'étape, refus, expiration SLA, remise de clé et alertes de sûreté."
    }
];

export default function AdminNotifications() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedTrigger, setSelectedTrigger] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
    const [simulatingTemplate, setSimulatingTemplate] = useState<NotificationTemplate | null>(null);
    const [simulationTab, setSimulationTab] = useState<'app' | 'email'>('app');

    // Simulation context variables
    const [simContext, setSimContext] = useState({
        reference: 'DEM-2026-0891',
        utilisateur: 'Daniel Dupont',
        demandeur: 'Daniel Dupont',
        site: 'Paris Gare du Nord (Postes & Voies Banlieue/GL)',
        service: 'Maintenance Voie',
        processus: 'Demande de clé mécatronique standard',
        etape: 'Validation Hiérarchique (Manager N+1)',
        validateur: 'Marc Martin',
        role_validateur: 'Manager',
        motif: 'Attestation de sécurité H0B0 valide requise pour accès haute tension.',
        sla_heures: '24',
        date: new Date().toLocaleDateString('fr-FR'),
        heure: '14:20',
        titre: 'Accès Zone Traction Voie 4'
    });

    // In-app deletion confirmation state (iframe-safe)
    const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);
    const [activeInputTarget, setActiveInputTarget] = useState<'subject' | 'content'>('content');
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Fetch templates
    const loadTemplates = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/admin/notification-templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Erreur chargement modèles notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    // Unique categories
    const categories = useMemo(() => {
        const set = new Set<string>();
        templates.forEach(t => {
            if (t.category) set.add(t.category);
        });
        STANDARD_BUSINESS_CATEGORIES.forEach(c => set.add(c.name));
        return Array.from(set);
    }, [templates]);

    // Filtered templates
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
            if (selectedTrigger !== 'all' && t.trigger_event !== selectedTrigger) return false;
            if (statusFilter === 'active' && !t.active) return false;
            if (statusFilter === 'inactive' && t.active) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = t.name.toLowerCase().includes(q);
                const matchSubject = t.subject.toLowerCase().includes(q);
                const matchContent = t.content.toLowerCase().includes(q);
                const matchCategory = t.category.toLowerCase().includes(q);
                if (!matchName && !matchSubject && !matchContent && !matchCategory) return false;
            }
            return true;
        });
    }, [templates, selectedCategory, selectedTrigger, statusFilter, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        const total = templates.length;
        const active = templates.filter(t => t.active).length;
        const totalUsages = templates.reduce((acc, t) => acc + (t.usage_count || 0), 0);
        const urgentCount = templates.filter(t => t.urgent).length;
        return { total, active, totalUsages, urgentCount };
    }, [templates]);

    // Toggle active state
    const handleToggleActive = async (template: NotificationTemplate) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/admin/notification-templates/${template.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ active: !template.active })
            });
            if (res.ok) {
                setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, active: !t.active } : t));
            }
        } catch (err) {
            console.error('Erreur activation modèle:', err);
        }
    };

    // Duplicate
    const handleDuplicate = async (template: NotificationTemplate) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/admin/notification-templates/${template.id}/duplicate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(prev => [data.template, ...prev]);
            }
        } catch (err) {
            console.error('Erreur duplication modèle:', err);
        }
    };

    // Delete request trigger
    const handleDelete = (template: NotificationTemplate) => {
        setTemplateToDelete(template);
    };

    // Confirm deletion execution
    const handleConfirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        const target = templateToDelete;
        setTemplateToDelete(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/admin/notification-templates/${target.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTemplates(prev => prev.filter(t => t.id !== target.id));
            }
        } catch (err) {
            console.error('Erreur suppression modèle:', err);
        }
    };

    // Open creation modal
    const handleOpenCreate = () => {
        setEditingTemplate({
            id: '',
            name: '',
            category: 'Circuit de Validation',
            description: '',
            trigger_event: 'on_submission',
            recipient_type: 'demandeur',
            channel: 'both',
            urgent: false,
            active: true,
            subject: 'Notification : Suivi de votre demande {reference}',
            content: 'Bonjour {utilisateur},\n\nVotre demande {reference} sur le site {site} est passée à l\'étape {etape}.\n\nVous pouvez suivre son avancement sur le portail mécatronique.'
        });
        setIsEditModalOpen(true);
    };

    // Open edit modal
    const handleOpenEdit = (template: NotificationTemplate) => {
        setEditingTemplate({ ...template });
        setIsEditModalOpen(true);
    };

    // Save template
    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        try {
            const token = localStorage.getItem('token');
            if (editingTemplate.id) {
                // Update
                const res = await fetch(`/api/v1/admin/notification-templates/${editingTemplate.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(editingTemplate)
                });
                if (res.ok) {
                    const data = await res.json();
                    setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...data.template } : t));
                    setIsEditModalOpen(false);
                }
            } else {
                // Create
                const res = await fetch('/api/v1/admin/notification-templates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(editingTemplate)
                });
                if (res.ok) {
                    const data = await res.json();
                    setTemplates(prev => [data.template, ...prev]);
                    setIsEditModalOpen(false);
                }
            }
        } catch (err) {
            console.error('Erreur sauvegarde modèle:', err);
        }
    };

    // Insert tag in subject or content
    const handleInsertTag = (tag: string) => {
        if (!editingTemplate) return;
        if (activeInputTarget === 'subject') {
            setEditingTemplate(prev => prev ? ({ ...prev, subject: `${prev.subject || ''} ${tag}`.trim() }) : null);
            setTimeout(() => subjectInputRef.current?.focus(), 50);
        } else {
            setEditingTemplate(prev => prev ? ({ ...prev, content: `${prev.content || ''} ${tag}`.trim() }) : null);
            setTimeout(() => contentTextareaRef.current?.focus(), 50);
        }
    };

    // Render interpolated preview
    const interpolateText = (text: string, ctx: typeof simContext) => {
        if (!text) return '';
        let res = text;
        const replacements: Record<string, string> = {
            '{reference}': ctx.reference,
            '{utilisateur}': ctx.utilisateur,
            '{demandeur}': ctx.demandeur,
            '{site}': ctx.site,
            '{service}': ctx.service,
            '{processus}': ctx.processus,
            '{etape}': ctx.etape,
            '{validateur}': ctx.validateur,
            '{role_validateur}': ctx.role_validateur,
            '{motif}': ctx.motif,
            '{sla_heures}': ctx.sla_heures,
            '{date}': ctx.date,
            '{heure}': ctx.heure,
            '{titre}': ctx.titre,
            '{lien}': '/corbeille'
        };
        for (const [k, v] of Object.entries(replacements)) {
            res = res.split(k).join(v);
        }
        return res;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#002395] uppercase tracking-wider mb-1">
                        <Bell className="w-4 h-4 text-[#002395]" />
                        Administration Centrale
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        Modèles de Notifications & Alertes
                        <span className="text-xs font-semibold bg-blue-100 text-[#002395] px-2.5 py-0.5 rounded-full border border-blue-200">
                            Bibliothèque Réutilisable
                        </span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Gérez la bibliothèque centralisée des modèles de notifications. Ces modèles prédéfinis peuvent ensuite être associés en un clic aux différents processus et étapes du circuit mécatronique.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <PageHelpButton
                        pageTitle="Modèles de Notifications"
                        pageCategory="Administration Centrale"
                        description="Gérez la bibliothèque centralisée des modèles de notifications et configurez les déclencheurs automatiques."
                        sections={notificationsHelpSections}
                    />
                    <button
                        onClick={() => {
                            if (templates.length > 0) {
                                setSimulatingTemplate(templates[0]);
                                setIsSimulateModalOpen(true);
                            }
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-xs transition"
                        title="Simulateur d'envoi en direct"
                    >
                        <Eye className="w-4 h-4 text-[#002395]" />
                        Simulateur de Rendu
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#002395] text-white hover:bg-blue-900 shadow-xs transition"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau Modèle
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <div className="text-xs font-medium text-gray-500 flex items-center justify-between">
                        Total Modèles
                        <Bell className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Bibliothèque active</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <div className="text-xs font-medium text-gray-500 flex items-center justify-between">
                        Modèles Actifs
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.active}</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">{Math.round((stats.active / (stats.total || 1)) * 100)}% des règles actives</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <div className="text-xs font-medium text-gray-500 flex items-center justify-between">
                        Processus Connectés
                        <Layers className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-purple-700 mt-1">{stats.totalUsages}</div>
                    <div className="text-[11px] text-purple-600 mt-0.5">Associations actives</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <div className="text-xs font-medium text-gray-500 flex items-center justify-between">
                        Alertes Prioritaires
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.urgentCount}</div>
                    <div className="text-[11px] text-amber-600 mt-0.5">Signalement urgent</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    {/* Search bar */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Rechercher par libellé, objet, mot-clé ou variable ({reference}, {site})..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#002395] focus:border-transparent outline-hidden transition"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                        {/* Trigger Event Filter */}
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
                            <select
                                value={selectedTrigger}
                                onChange={(e) => setSelectedTrigger(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-[#002395] outline-hidden font-medium"
                            >
                                <option value="all">Tous les déclencheurs (13)</option>
                                <optgroup label="Cycle de Vie du Dossier">
                                    <option value="on_submission">À la soumission</option>
                                    <option value="on_request_edited">Détails modifiés</option>
                                    <option value="on_cancelled">Demande annulée</option>
                                </optgroup>
                                <optgroup label="Circuit de Validation">
                                    <option value="on_stage_approved">Étape validée</option>
                                    <option value="on_final_approval">Validation finale</option>
                                    <option value="on_rejected">Refus / Rejet</option>
                                    <option value="on_complement_requested">Complément requis</option>
                                    <option value="on_complement_submitted">Complément fourni</option>
                                </optgroup>
                                <optgroup label="Engagements & SLA">
                                    <option value="on_sla_warning">Retard SLA</option>
                                </optgroup>
                                <optgroup label="Clés Mécatroniques">
                                    <option value="on_key_delivered">Clé remise</option>
                                    <option value="on_key_returned">Clé restituée</option>
                                </optgroup>
                                <optgroup label="Sûreté & Administration">
                                    <option value="on_security_alert">Alerte Sûreté</option>
                                    <option value="on_delegation_set">Délégation accordée</option>
                                </optgroup>
                            </select>

                        {/* Status filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-[#002395] outline-hidden font-medium"
                        >
                            <option value="all">Tous statuts</option>
                            <option value="active">Actifs uniquement</option>
                            <option value="inactive">Inactifs</option>
                        </select>
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-gray-100">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                            selectedCategory === 'all'
                                ? 'bg-[#002395] text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Toutes catégories ({templates.length})
                    </button>
                    {categories.map(cat => {
                        const count = templates.filter(t => t.category === cat).length;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                    selectedCategory === cat
                                        ? 'bg-[#002395] text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <span>{cat}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    selectedCategory === cat ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notification Templates Grid */}
            {loading ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <RefreshCw className="w-8 h-8 text-[#002395] animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Chargement des modèles de notification...</p>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-xs">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-800 mb-1">Aucun modèle de notification trouvé</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                        Modifiez vos critères de recherche ou créez un nouveau modèle personnalisé pour enrichir votre bibliothèque.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#002395] text-white hover:bg-blue-900 transition"
                    >
                        <Plus className="w-4 h-4" />
                        Créer un modèle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTemplates.map(tmpl => {
                        const triggerInfo = TRIGGER_LABELS[tmpl.trigger_event] || { label: tmpl.trigger_event, color: 'bg-gray-100 text-gray-800', desc: '' };
                        const recipientInfo = RECIPIENT_LABELS[tmpl.recipient_type] || { label: tmpl.recipient_type, icon: 'User' };

                        return (
                            <div
                                key={tmpl.id}
                                className={`bg-white rounded-xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                                    tmpl.active ? 'border-gray-200 hover:border-blue-300 hover:shadow-md' : 'border-gray-200 opacity-60 bg-gray-50/50'
                                }`}
                            >
                                <div className="p-5 space-y-3.5">
                                    {/* Top Row: Title + Category + Active Toggle */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    {tmpl.category}
                                                </span>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${triggerInfo.color}`}>
                                                    {triggerInfo.label}
                                                </span>
                                                {tmpl.urgent && (
                                                    <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-base leading-snug">
                                                {tmpl.name}
                                            </h3>
                                        </div>

                                        {/* Status toggle */}
                                        <button
                                            onClick={() => handleToggleActive(tmpl)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                tmpl.active ? 'bg-[#002395]' : 'bg-gray-300'
                                            }`}
                                            title={tmpl.active ? 'Désactiver le modèle' : 'Activer le modèle'}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                    tmpl.active ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Description */}
                                    {tmpl.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {tmpl.description}
                                        </p>
                                    )}

                                    {/* Meta pills: Recipient + Channel + Usage */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-medium border border-blue-100">
                                            <User className="w-3.5 h-3.5 text-blue-700" />
                                            <span>
                                                {tmpl.recipient_type === 'role'
                                                    ? `Rôle : ${tmpl.recipient_role || 'Manager'}`
                                                    : recipientInfo.label}
                                            </span>
                                        </span>

                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                                            {tmpl.channel === 'both' ? (
                                                <>
                                                    <Smartphone className="w-3.5 h-3.5 text-gray-600" />
                                                    <Mail className="w-3.5 h-3.5 text-gray-600" />
                                                    <span>In-App & Email</span>
                                                </>
                                            ) : tmpl.channel === 'email' ? (
                                                <>
                                                    <Mail className="w-3.5 h-3.5 text-gray-600" />
                                                    <span>Email uniquement</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Smartphone className="w-3.5 h-3.5 text-gray-600" />
                                                    <span>In-App uniquement</span>
                                                </>
                                            )}
                                        </span>

                                        {tmpl.usage_count !== undefined && (
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                                                tmpl.usage_count > 0 ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                <Layers className="w-3 h-3" />
                                                <span>{tmpl.usage_count > 0 ? `Utilisé dans ${tmpl.usage_count} processus` : 'Non associé'}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Preview Box */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200/80 space-y-1 text-xs">
                                        <div className="font-semibold text-gray-800 truncate">
                                            <span className="text-gray-400 font-normal mr-1">Objet :</span>
                                            {tmpl.subject}
                                        </div>
                                        <div className="text-gray-600 font-mono text-[11px] line-clamp-2 whitespace-pre-line">
                                            {tmpl.content}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer: Actions */}
                                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => {
                                            setSimulatingTemplate(tmpl);
                                            setIsSimulateModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#002395] hover:text-blue-900 transition"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Simuler le rendu
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleDuplicate(tmpl)}
                                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded transition"
                                            title="Dupliquer ce modèle"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(tmpl)}
                                            className="p-1.5 text-gray-700 hover:text-[#002395] hover:bg-blue-50 rounded transition"
                                            title="Modifier ce modèle"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tmpl)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                            title="Supprimer ce modèle"
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

            {/* Modal Edit / Create Template */}
            {isEditModalOpen && editingTemplate && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden max-h-[80vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-[#002395] text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-800 rounded-lg">
                                    <Bell className="w-5 h-5 text-yellow-300" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">
                                        {editingTemplate.id ? 'Modifier le Modèle de Notification' : 'Nouveau Modèle de Notification'}
                                    </h2>
                                    <p className="text-xs text-blue-100">
                                        Ce modèle sera utilisable dans l'ensemble des processus d'accès mécatroniques.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-blue-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveTemplate} className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* General info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Intitulé du Modèle *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editingTemplate.name}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                        placeholder="Ex: Alerte nouvelle demande Manager N+1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] outline-hidden font-medium"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Catégorie Métier *
                                        </label>
                                        <span className="text-[11px] text-[#002395] font-semibold flex items-center gap-1">
                                            <Tag className="w-3 h-3" /> Domaine Métier
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        list="category-suggestions"
                                        value={editingTemplate.category}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                                        placeholder="Ex: Circuit de Validation, Clés & Habilitations, Alertes SLA..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] outline-hidden font-medium"
                                    />
                                    <datalist id="category-suggestions">
                                        {categories.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                    
                                    {/* Quick chips for categories */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {STANDARD_BUSINESS_CATEGORIES.map(cat => (
                                            <button
                                                type="button"
                                                key={cat.name}
                                                onClick={() => setEditingTemplate({ ...editingTemplate, category: cat.name })}
                                                className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer font-medium ${
                                                    editingTemplate.category === cat.name
                                                        ? 'bg-[#002395] text-white border-[#002395] shadow-xs'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                                }`}
                                                title={cat.desc}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Description & Rôle opérationnel
                                </label>
                                <input
                                    type="text"
                                    value={editingTemplate.description || ''}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                                    placeholder="Expliquez quand et à qui ce modèle est destiné..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] outline-hidden text-gray-600"
                                />
                            </div>

                            {/* Trigger, Recipient, Channel */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Événement Déclencheur *
                                    </label>
                                    <select
                                        value={editingTemplate.trigger_event}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, trigger_event: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    >
                                        <optgroup label="Cycle de Vie & Dépôt">
                                            <option value="on_submission">À la soumission du dossier</option>
                                            <option value="on_request_edited">Détails modifiés par un gestionnaire</option>
                                            <option value="on_cancelled">Annulation du dossier</option>
                                        </optgroup>
                                        <optgroup label="Circuit de Validation & Décisions">
                                            <option value="on_stage_approved">Étape intermédiaire validée</option>
                                            <option value="on_final_approval">Validation finale (Accord complet)</option>
                                            <option value="on_rejected">Refus / Avis défavorable motivé</option>
                                            <option value="on_complement_requested">Demande de complément requise</option>
                                            <option value="on_complement_submitted">Complément d'information fourni</option>
                                        </optgroup>
                                        <optgroup label="Engagements & SLA">
                                            <option value="on_sla_warning">Alerte retard SLA (Dépassement)</option>
                                        </optgroup>
                                        <optgroup label="Clés & Habilitations Mécatroniques">
                                            <option value="on_key_delivered">Remise physique de la clé</option>
                                            <option value="on_key_returned">Restitution de clé et clôture</option>
                                        </optgroup>
                                        <optgroup label="Sûreté & Administration">
                                            <option value="on_security_alert">Alerte Sûreté ferroviaire</option>
                                            <option value="on_delegation_set">Délégation de validation accordée</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Destinataire Principal *
                                    </label>
                                    <select
                                        value={editingTemplate.recipient_type}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, recipient_type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    >
                                        <option value="demandeur">Demandeur (Agent initiateur)</option>
                                        <option value="validator_current_stage">Validateur de l'étape courante</option>
                                        <option value="role">Rôle spécifique</option>
                                        <option value="all_validators">Tous les validateurs du circuit</option>
                                        <option value="custom_email">Email spécifique</option>
                                    </select>

                                    {editingTemplate.recipient_type === 'role' && (
                                        <input
                                            type="text"
                                            value={editingTemplate.recipient_role || ''}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, recipient_role: e.target.value })}
                                            placeholder="Ex: Manager, Sécurité Site..."
                                            className="mt-2 w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Canal & Priorité
                                    </label>
                                    <div className="space-y-2">
                                        <select
                                            value={editingTemplate.channel}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, channel: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-[#002395] outline-hidden"
                                        >
                                            <option value="both">In-App + Email</option>
                                            <option value="app">In-App uniquement</option>
                                            <option value="email">Email uniquement</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer pt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={editingTemplate.urgent}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, urgent: e.target.checked })}
                                                className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                                            />
                                            <span className="text-red-700 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Marquer comme alerte urgente
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Tag Palette (Clickable variables) */}
                            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-[#002395] flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" />
                                        Palette de Balises Dynamiques (cliquez pour insérer dans le champ actif)
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                                        <span>Cible d'insertion :</span>
                                        <label className="inline-flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="insertTarget"
                                                checked={activeInputTarget === 'subject'}
                                                onChange={() => setActiveInputTarget('subject')}
                                                className="text-[#002395]"
                                            />
                                            <span>Objet</span>
                                        </label>
                                        <label className="inline-flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="insertTarget"
                                                checked={activeInputTarget === 'content'}
                                                onChange={() => setActiveInputTarget('content')}
                                                className="text-[#002395]"
                                            />
                                            <span>Corps du message</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {AVAILABLE_TAGS.map(t => (
                                        <button
                                            key={t.tag}
                                            type="button"
                                            onClick={() => handleInsertTag(t.tag)}
                                            title={`${t.label} : ${t.desc} (Ex: ${t.example})`}
                                            className="px-2.5 py-1 bg-white hover:bg-blue-100 hover:border-blue-300 border border-blue-200 text-blue-950 font-mono text-xs rounded-md shadow-2xs transition flex items-center gap-1"
                                        >
                                            <span className="font-bold text-[#002395]">{t.tag}</span>
                                            <span className="text-[10px] text-gray-500 font-sans">({t.label})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject & Content */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Objet de la notification / Titre *
                                        </label>
                                        <span className="text-[11px] text-gray-400">Supporte les balises dynamiques</span>
                                    </div>
                                    <input
                                        ref={subjectInputRef}
                                        type="text"
                                        required
                                        onFocus={() => setActiveInputTarget('subject')}
                                        value={editingTemplate.subject}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                        placeholder="Ex: Demande {reference} VALIDÉE pour le site {site}"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#002395] outline-hidden"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Corps du message *
                                        </label>
                                        <span className="text-[11px] text-gray-400">Texte multiligne avec variables</span>
                                    </div>
                                    <textarea
                                        ref={contentTextareaRef}
                                        rows={5}
                                        required
                                        onFocus={() => setActiveInputTarget('content')}
                                        value={editingTemplate.content}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                                        placeholder="Ex: Bonjour {utilisateur}, votre dossier {reference} a été instruit..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-800 focus:ring-2 focus:ring-[#002395] outline-hidden leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Live rendering preview in modal */}
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                    <span className="flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-[#002395]" />
                                        Aperçu du Rendu en Direct (avec données simulées)
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-normal">Exemple temps réel</span>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1 text-xs">
                                    <div className="font-bold text-gray-900">
                                        {interpolateText(editingTemplate.subject, simContext)}
                                    </div>
                                    <div className="text-gray-700 whitespace-pre-line leading-relaxed font-sans text-xs">
                                        {interpolateText(editingTemplate.content, simContext)}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-sm font-semibold bg-[#002395] text-white hover:bg-blue-900 rounded-lg shadow-xs transition"
                                >
                                    {editingTemplate.id ? 'Enregistrer les modifications' : 'Créer le modèle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Simulator & Real Rendering (Email & In-App) */}
            {isSimulateModalOpen && simulatingTemplate && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden max-h-[80vh] flex flex-col my-auto animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Eye className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Simulateur de Rendu & Diffusion</h2>
                                    <p className="text-xs text-gray-300">
                                        Visualisez le rendu exact du message selon les canaux de communication configurés.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSimulateModalOpen(false)}
                                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Simulator Controls & Preview */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Model selection & Channel switch */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-xs font-bold text-gray-600">Modèle testé :</span>
                                    <select
                                        value={simulatingTemplate.id}
                                        onChange={(e) => {
                                            const found = templates.find(t => t.id === e.target.value);
                                            if (found) setSimulatingTemplate(found);
                                        }}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-[#002395] outline-hidden flex-1"
                                    >
                                        {templates.map(t => (
                                             <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Channel tabs */}
                                <div className="flex items-center bg-gray-200/80 p-1 rounded-lg">
                                    <button
                                        onClick={() => setSimulationTab('app')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                                            simulationTab === 'app' ? 'bg-white text-[#002395] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Smartphone className="w-3.5 h-3.5" />
                                        In-App Notification
                                    </button>
                                    <button
                                        onClick={() => setSimulationTab('email')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                                            simulationTab === 'email' ? 'bg-white text-[#002395] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        Email Professionnel
                                    </button>
                                </div>
                            </div>

                            {/* Test context form (accordion/compact) */}
                            <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2 text-xs">
                                <div className="font-bold text-gray-700 flex items-center justify-between">
                                    <span>Variables de test injectées :</span>
                                    <span className="text-[11px] text-gray-400 font-normal">Vous pouvez modifier ces valeurs pour tester les substitutions</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block">{"{reference}"}</label>
                                        <input
                                            type="text"
                                            value={simContext.reference}
                                            onChange={(e) => setSimContext({ ...simContext, reference: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block">{"{utilisateur}"}</label>
                                        <input
                                            type="text"
                                            value={simContext.utilisateur}
                                            onChange={(e) => setSimContext({ ...simContext, utilisateur: e.target.value, demandeur: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block">{"{site}"}</label>
                                        <input
                                            type="text"
                                            value={simContext.site}
                                            onChange={(e) => setSimContext({ ...simContext, site: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block">{"{validateur}"}</label>
                                        <input
                                            type="text"
                                            value={simContext.validateur}
                                            onChange={(e) => setSimContext({ ...simContext, validateur: e.target.value })}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* View 1: In-App Card Preview */}
                            {simulationTab === 'app' && (
                                <div className="border border-gray-200 rounded-2xl p-6 bg-gradient-to-b from-gray-100 to-gray-200/60 flex items-center justify-center">
                                    <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="px-4 py-3 bg-[#002395] text-white flex items-center justify-between text-xs font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Bell className="w-4 h-4 text-yellow-300" />
                                                Centre de Notifications
                                            </div>
                                            <span className="bg-blue-800 text-[10px] px-2 py-0.5 rounded-full">À l'instant</span>
                                        </div>

                                        <div className="p-4 space-y-2.5">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    simulatingTemplate.urgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-[#002395]'
                                                }`}>
                                                    {simulatingTemplate.urgent ? (
                                                        <AlertTriangle className="w-4 h-4" />
                                                    ) : (
                                                        <Bell className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="font-bold text-gray-900 text-sm">
                                                        {interpolateText(simulatingTemplate.subject, simContext)}
                                                    </div>
                                                    <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                                                        {interpolateText(simulatingTemplate.content, simContext)}
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2 text-[11px] text-gray-400">
                                                        <span>Réf: {simContext.reference}</span>
                                                        <span className="text-[#002395] font-semibold hover:underline cursor-pointer">
                                                            Consulter le dossier →
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View 2: Email Preview */}
                            {simulationTab === 'email' && (
                                <div className="border border-gray-200 rounded-2xl p-6 bg-gray-100 flex items-center justify-center">
                                    <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden font-sans">
                                        {/* Fake email client header */}
                                        <div className="bg-gray-800 text-gray-300 px-4 py-2.5 text-xs flex items-center justify-between border-b border-gray-700">
                                            <div>
                                                <span className="text-gray-400">De : </span>
                                                <span className="text-white font-medium">notifications-acces@entreprise.fr</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">À : </span>
                                                <span className="text-white font-medium">{simContext.utilisateur.toLowerCase().replace(/\s+/g, '.')}@entreprise.fr</span>
                                            </div>
                                        </div>

                                        {/* Email Header */}
                                        <div className="bg-[#002395] p-5 text-white flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white text-[#002395] font-black px-2.5 py-1 rounded text-sm tracking-wider">
                                                    SÉCURITÉ
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm leading-tight">Portail d'Accès</div>
                                                    <div className="text-[11px] text-blue-200">Gestion Opérationnelle & Habilitations</div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] bg-blue-800 text-yellow-300 font-semibold px-2 py-0.5 rounded">
                                                Traçabilité Sécurisée
                                            </span>
                                        </div>

                                        {/* Email Body */}
                                        <div className="p-6 space-y-4">
                                            <div className="border-b border-gray-100 pb-3">
                                                <div className="text-xs font-bold text-[#002395] uppercase tracking-wider mb-1">
                                                    {simulatingTemplate.category}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {interpolateText(simulatingTemplate.subject, simContext)}
                                                </h3>
                                            </div>

                                            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed font-normal">
                                                {interpolateText(simulatingTemplate.content, simContext)}
                                            </div>

                                            {/* CTA button */}
                                            <div className="pt-3">
                                                <div className="inline-block px-5 py-2.5 bg-[#002395] text-white font-semibold text-xs rounded-lg shadow-xs">
                                                    Accéder au Portail Opérationnel Mécatronique
                                                </div>
                                            </div>

                                            {/* Security notice */}
                                            <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
                                                <p>Ce message automatique est émis par le système de gestion des accès mécatroniques.</p>
                                                <p>Conforme aux exigences de sûreté et de traçabilité NIS 2.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
                            <button
                                onClick={() => setIsSimulateModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition"
                            >
                                Fermer le simulateur
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* In-app Deletion Modal for Templates */}
            {templateToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col my-auto overflow-hidden p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 leading-snug">
                                    Supprimer le modèle "{templateToDelete.name}" ?
                                </h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Cette notification ne sera plus disponible dans la bibliothèque d'administration ni pour les processus associés.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setTemplateToDelete(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteTemplate}
                                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer le modèle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
