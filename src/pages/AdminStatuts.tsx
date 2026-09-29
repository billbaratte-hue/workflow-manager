import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Tags,
    Plus,
    Search,
    Filter,
    Edit3,
    Trash2,
    Copy,
    Check,
    X,
    Clock,
    AlertTriangle,
    Shield,
    CheckCircle2,
    XCircle,
    FileText,
    Send,
    Layers,
    Shuffle,
    Lock,
    Key,
    Receipt,
    CheckSquare,
    Truck,
    MapPin,
    AlertOctagon,
    AlertCircle,
    Archive,
    MinusCircle,
    Slash,
    ArrowRight,
    RefreshCw,
    Download,
    Upload,
    Sparkles,
    Play,
    Eye,
    Sliders,
    Workflow,
    Bell,
    HelpCircle,
    ExternalLink,
    Settings,
    FolderKanban
} from 'lucide-react';
import {
    getStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
    duplicateStatus,
    batchUpdateStatusTransitions,
    getProcesses,
    getStatusCategories,
    createStatusCategory,
    updateStatusCategory,
    deleteStatusCategory,
    getStatusMetadata,
    updateStatusMetadata
} from '../lib/api';
import { CustomStatusConfig, StatusCategory, StatusCategoryConfig, StatusMetadataConfig } from '../types';
import { PageHelpButton, HelpSection } from '../components/PageHelpModal';

// Help modal documentation for the Status Configurator
const STATUS_HELP_SECTIONS: HelpSection[] = [
    {
        title: "Architecture Zero-Code : Configurateur de Statuts",
        description: "Le Configurateur de Statuts centralise l'ensemble des états opérationnels applicables aux dossiers et interventions mécatroniques.",
        badge: "Gouvernance",
        tips: [
            "Chaque statut dispose d'un identifiant machine unique (ex: PENDING_MANAGER), d'un libellé clair et d'une charte graphique.",
            "Module découplé permettant d'ajouter de nouveaux statuts sans redéploiement et de les lier directement aux étapes de Workflows."
        ]
    },
    {
        title: "Phases et Catégories de Cycle de Vie",
        description: "Chaque statut appartient à l'une des 7 catégories canoniques du cycle de vie des accès et équipements.",
        badge: "7 Catégories",
        tips: [
            "INITIAL : Démarrage du dossier, brouillon agent ou soumission officielle horodatée.",
            "IN_REVIEW : Jalons de validation hiérarchique, technique, multi-sites ou croisée.",
            "EXECUTION : Traitement logistique, devis/bon de commande, expédition et pose GPS.",
            "TERMINAL_SUCCESS : Accord définitif, service fait, accès opérationnel programmé.",
            "TERMINAL_REJECT : Refus motivé avec consigne d'opposition.",
            "EXCEPTION : Incident de perte/vol, arbitrage national ou inscription en Liste Noire.",
            "ARCHIVED : Clôture conforme aux exigences de traçabilité (archivage sécurisé)."
        ]
    },
    {
        title: "Matrice des Transitions & Gouvernance Machine à États",
        description: "Définissez explicitement la liste des statuts cibles autorisés pour chaque état du système.",
        badge: "Gouvernance",
        tips: [
            "L'onglet 'Matrice des Transitions' offre une vue tabulaire bidimensionnelle pour activer ou interdire les sauts d'états.",
            "Garantit la stricte conformité des circuits d'approbation et empêche les contournements de validation."
        ]
    },
    {
        title: "Bac à Sable & Simulateur de Changement d'État",
        description: "Testez en conditions réelles les transitions configurées avant leur mise en production.",
        badge: "Bac à Sable",
        tips: [
            "Vérifiez la validité d'un saut d'état et testez les exigences (justification obligatoire, pièces jointes).",
            "Prévisualisez le rendu du badge visuel et la conformité des délais de traitement SLA."
        ]
    }
];

// Color presets for status badges
const BADGE_COLOR_PRESETS = [
    { label: "Bleu Neutre (Instruction)", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { label: "Bleu Foncé (Clé/Décision)", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    { label: "Ambre (Validation Site/SLA)", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { label: "Émeraude (Validé / Actif)", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { label: "Rose (Refus / Motif)", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    { label: "Rouge Alerte (Arbitrage S10)", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    { label: "Rouge Critique (Incident S14)", bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
    { label: "Violet (Validation Croisée)", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { label: "Indigo (Charte RGPD)", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    { label: "Jaune / Ocre (Bon de Commande)", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-300" },
    { label: "Teal (Commande Associée)", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    { label: "Cyan (Expédié / Transit)", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
    { label: "Orange (Pose GPS Chantier)", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    { label: "Gris Neutre (Brouillon)", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
    { label: "Gris Foncé (Archivé)", bg: "bg-gray-200", text: "text-gray-800", border: "border-gray-300" },
    { label: "Noir / Zinc (Liste Noire)", bg: "bg-zinc-900", text: "text-zinc-100", border: "border-zinc-700" },
];

// Available icons
const AVAILABLE_ICONS = [
    { name: "Clock", label: "Horloge", icon: Clock },
    { name: "Send", label: "Envoi / Soumis", icon: Send },
    { name: "FileText", label: "Document", icon: FileText },
    { name: "Shield", label: "Sécurité", icon: Shield },
    { name: "Layers", label: "Multi-sites", icon: Layers },
    { name: "Shuffle", label: "Validation Croisée", icon: Shuffle },
    { name: "Lock", label: "Verrou / RGPD", icon: Lock },
    { name: "Key", label: "Clé Mécatronique", icon: Key },
    { name: "Receipt", label: "Facture / Devis", icon: Receipt },
    { name: "CheckSquare", label: "Commande", icon: CheckSquare },
    { name: "Truck", label: "Livraison / Transit", icon: Truck },
    { name: "MapPin", label: "GPS / Pose", icon: MapPin },
    { name: "CheckCircle2", label: "Succès / Validé", icon: CheckCircle2 },
    { name: "Check", label: "Approuvé", icon: Check },
    { name: "XCircle", label: "Refusé", icon: XCircle },
    { name: "X", label: "Croix Refus", icon: X },
    { name: "AlertTriangle", label: "Alerte / Arbitrage", icon: AlertTriangle },
    { name: "AlertOctagon", label: "Urgence Perte", icon: AlertOctagon },
    { name: "AlertCircle", label: "Incident", icon: AlertCircle },
    { name: "Slash", label: "Interdiction / Liste Noire", icon: Slash },
    { name: "Archive", label: "Archivé", icon: Archive },
    { name: "MinusCircle", label: "Abandonné", icon: MinusCircle },
];

const DEFAULT_CATEGORY_META: Record<string, { label: string; color: string; desc: string }> = {
    INITIAL: { label: "Phase Initiale", color: "bg-blue-100 text-blue-800 border-blue-200", desc: "Dépôt, brouillon et initialisation du dossier" },
    IN_REVIEW: { label: "Instruction & Validations", color: "bg-amber-100 text-amber-800 border-amber-200", desc: "Circuits d'approbation hiérarchique et technique" },
    EXECUTION: { label: "Traitement & Logistique", color: "bg-teal-100 text-teal-800 border-teal-200", desc: "Devis, commande, expédition postale et relevé GPS" },
    TERMINAL_SUCCESS: { label: "Accord & Service Fait", color: "bg-emerald-100 text-emerald-800 border-emerald-200", desc: "Validation complète, droits programmés" },
    TERMINAL_REJECT: { label: "Refus Déclaré", color: "bg-rose-100 text-rose-800 border-rose-200", desc: "Opposition motivée par un validateur" },
    EXCEPTION: { label: "Incidents & Escalades", color: "bg-red-100 text-red-800 border-red-200", desc: "Arbitrage, incident perte/vol ou révocation d'accès" },
    ARCHIVED: { label: "Archivage & Historique", color: "bg-gray-100 text-gray-800 border-gray-200", desc: "Clôture conforme aux exigences de traçabilité sécurisée" }
};

export default function AdminStatuts() {
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const initialTab = (tabParam === 'matrix' || tabParam === 'sandbox' || tabParam === 'categories') ? tabParam : 'catalog';

    const [statuses, setStatuses] = useState<CustomStatusConfig[]>([]);
    const [categories, setCategories] = useState<StatusCategoryConfig[]>([]);
    const [metadata, setMetadata] = useState<StatusMetadataConfig>({
        specification_title: "Architecture Zero-Code des Statuts",
        specification_code: "",
        specification_description: "Référentiel des états opérationnels et machine à états",
        badge_label: ""
    });
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'catalog' | 'matrix' | 'sandbox' | 'categories'>(initialTab);

    // Update activeTab if query param changes
    useEffect(() => {
        if (tabParam === 'matrix' || tabParam === 'sandbox' || tabParam === 'categories' || tabParam === 'catalog') {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    // Category modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<StatusCategoryConfig> | null>(null);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

    // Metadata modal state
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
    const [editingMetadata, setEditingMetadata] = useState<StatusMetadataConfig>({
        specification_title: "",
        specification_code: "",
        specification_description: "",
        badge_label: ""
    });
    const [metadataFormError, setMetadataFormError] = useState<string | null>(null);

    // Modal state for creating / editing
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Partial<CustomStatusConfig> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Sandbox state
    const [sandboxCurrentCode, setSandboxCurrentCode] = useState<string>('SUBMITTED');
    const [sandboxHistory, setSandboxHistory] = useState<string[]>(['DRAFT', 'SUBMITTED']);
    const [sandboxComment, setSandboxComment] = useState('');

    // Matrix batch changes
    const [matrixDirty, setMatrixDirty] = useState(false);
    const [matrixDraft, setMatrixDraft] = useState<Record<string, string[]>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statusRes, catRes, metaRes, procRes] = await Promise.all([
                getStatuses(),
                getStatusCategories().catch(() => ({ data: [] })),
                getStatusMetadata().catch(() => ({ data: null })),
                getProcesses().catch(() => ({ data: [] }))
            ]);
            setStatuses(statusRes.data || []);
            setCategories(catRes.data || []);
            if (metaRes.data) {
                setMetadata(metaRes.data);
            }
            setProcesses(procRes.data || []);

            // Initialize matrix draft
            const draft: Record<string, string[]> = {};
            (statusRes.data || []).forEach((s: CustomStatusConfig) => {
                draft[s.code] = [...(s.allowed_transitions || [])];
            });
            setMatrixDraft(draft);
        } catch (err: any) {
            console.error('Error loading statuses:', err);
        } finally {
            setLoading(false);
        }
    };

    // Build dynamic category metadata map
    const categoryMetaMap = useMemo(() => {
        const map: Record<string, { label: string; color: string; desc: string }> = { ...DEFAULT_CATEGORY_META };
        categories.forEach(cat => {
            map[cat.code] = {
                label: cat.label,
                color: cat.color || "bg-indigo-100 text-indigo-800 border-indigo-200",
                desc: cat.desc || ""
            };
        });
        return map;
    }, [categories]);

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 4000);
    };

    // Filtered statuses
    const filteredStatuses = useMemo(() => {
        return statuses.filter(s => {
            const matchSearch =
                s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
            return matchSearch && matchCategory;
        });
    }, [statuses, searchTerm, selectedCategory]);

    // Helpers to render Icon
    const renderIcon = (iconName: string, className: string = "w-4 h-4") => {
        const item = AVAILABLE_ICONS.find(i => i.name === iconName);
        const IconComponent = item ? item.icon : Clock;
        return <IconComponent className={className} />;
    };

    // Open create modal
    const handleOpenCreate = () => {
        setIsCreating(true);
        setEditingStatus({
            code: "",
            label: "",
            description: "",
            category: "IN_REVIEW",
            badge_bg: "bg-blue-50",
            badge_text: "text-blue-700",
            badge_border: "border-blue-200",
            icon_name: "Clock",
            is_initial: false,
            is_terminal: false,
            sla_default_hours: 24,
            requires_comment_on_enter: false,
            requires_document_on_enter: false,
            notify_demandeur_on_enter: false,
            notify_validator_on_enter: true,
            allowed_transitions: [],
            associated_processes: ["ALL"]
        });
        setFormError(null);
        setIsEditModalOpen(true);
    };

    // Open edit modal
    const handleOpenEdit = (status: CustomStatusConfig) => {
        setIsCreating(false);
        setEditingStatus({ ...status });
        setFormError(null);
        setIsEditModalOpen(true);
    };

    // Handle Save Status
    const handleSaveStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStatus) return;

        if (!editingStatus.code || !editingStatus.label) {
            setFormError("Le code unique et le libellé sont obligatoires.");
            return;
        }

        try {
            if (isCreating) {
                const res = await createStatus(editingStatus);
                showSuccess(`Statut '${res.data.status.label}' créé avec succès.`);
            } else {
                const res = await updateStatus(editingStatus.code!, editingStatus);
                showSuccess(`Statut '${res.data.status.label}' mis à jour.`);
            }
            setIsEditModalOpen(false);
            loadData();
        } catch (err: any) {
            setFormError(err.response?.data?.error || err.message || "Erreur lors de l'enregistrement.");
        }
    };

    // Handle Delete Status
    const handleDeleteStatus = async (status: CustomStatusConfig) => {
        if (status.is_system) {
            alert(`Le statut '${status.label}' (${status.code}) est un statut système protégé. Il ne peut pas être supprimé.`);
            return;
        }

        if (!window.confirm(`Confirmez-vous la suppression du statut '${status.label}' (${status.code}) ? Cette action nettoiera également les transitions associées.`)) {
            return;
        }

        try {
            await deleteStatus(status.code);
            showSuccess(`Statut '${status.label}' supprimé.`);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la suppression.");
        }
    };

    // Handle Duplicate Status
    const handleDuplicateStatus = async (status: CustomStatusConfig) => {
        try {
            const res = await duplicateStatus(status.code);
            showSuccess(`Statut dupliqué : '${res.data.status.label}' (${res.data.status.code}).`);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la duplication.");
        }
    };

    // Matrix: toggle transition
    const handleToggleTransitionInMatrix = (fromCode: string, toCode: string) => {
        const currentList = matrixDraft[fromCode] || [];
        let updatedList: string[];
        if (currentList.includes(toCode)) {
            updatedList = currentList.filter(c => c !== toCode);
        } else {
            updatedList = [...currentList, toCode];
        }

        setMatrixDraft(prev => ({
            ...prev,
            [fromCode]: updatedList
        }));
        setMatrixDirty(true);
    };

    // Save matrix batch
    const handleSaveMatrix = async () => {
        try {
            const payload: Array<{ code: string; allowed_transitions: string[] }> = Object.entries(matrixDraft).map(([code, transitions]) => ({
                code,
                allowed_transitions: (transitions as string[]) || []
            }));
            await batchUpdateStatusTransitions(payload);
            showSuccess("Matrice de transitions enregistrée avec succès.");
            setMatrixDirty(false);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la sauvegarde de la matrice.");
        }
    };

    // Export all statuses as JSON
    const handleExportJSON = () => {
        const jsonStr = JSON.stringify(statuses, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statuses-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showSuccess("Fichier JSON des statuts téléchargé.");
    };

    // Import statuses JSON
    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                if (!Array.isArray(parsed)) {
                    throw new Error("Le fichier doit contenir un tableau de statuts.");
                }
                // Import or update each status
                let importedCount = 0;
                for (const item of parsed) {
                    if (!item.code || !item.label) continue;
                    const exists = statuses.some(s => s.code === item.code);
                    if (exists) {
                        await updateStatus(item.code, item);
                    } else {
                        await createStatus(item);
                    }
                    importedCount++;
                }
                showSuccess(`${importedCount} statuts importés / synchronisés avec succès.`);
                loadData();
            } catch (err: any) {
                alert(`Erreur d'import JSON : ${err.message}`);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Category Management Handlers
    const handleOpenCreateCategory = () => {
        setIsCreatingCategory(true);
        setEditingCategory({
            code: "",
            label: "",
            color: "bg-indigo-100 text-indigo-800 border-indigo-200",
            desc: "",
            display_order: categories.length + 1
        });
        setCategoryFormError(null);
        setIsCategoryModalOpen(true);
    };

    const handleOpenEditCategory = (cat: StatusCategoryConfig) => {
        setIsCreatingCategory(false);
        setEditingCategory({ ...cat });
        setCategoryFormError(null);
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        if (!editingCategory.code || !editingCategory.label) {
            setCategoryFormError("Le code et le libellé sont obligatoires.");
            return;
        }

        try {
            if (isCreatingCategory) {
                await createStatusCategory(editingCategory);
                showSuccess(`Catégorie '${editingCategory.label}' créée avec succès.`);
            } else {
                await updateStatusCategory(editingCategory.code!, editingCategory);
                showSuccess(`Catégorie '${editingCategory.label}' mise à jour.`);
            }
            setIsCategoryModalOpen(false);
            loadData();
        } catch (err: any) {
            setCategoryFormError(err.response?.data?.error || err.message || "Erreur lors de l'enregistrement de la catégorie.");
        }
    };

    const handleDeleteCategory = async (cat: StatusCategoryConfig) => {
        const linkedCount = statuses.filter(s => s.category === cat.code).length;
        if (linkedCount > 0) {
            alert(`Impossible de supprimer la catégorie '${cat.label}' car ${linkedCount} statut(s) y sont rattachés. Réaffectez d'abord ces statuts à une autre phase.`);
            return;
        }

        if (!window.confirm(`Confirmez-vous la suppression de la catégorie '${cat.label}' (${cat.code}) ?`)) {
            return;
        }

        try {
            await deleteStatusCategory(cat.code);
            showSuccess(`Catégorie '${cat.label}' supprimée.`);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la suppression de la catégorie.");
        }
    };

    // Metadata Handlers
    const handleOpenEditMetadata = () => {
        setEditingMetadata({
            specification_title: metadata.specification_title || "",
            specification_code: metadata.specification_code || "",
            specification_description: metadata.specification_description || "",
            badge_label: metadata.badge_label || ""
        });
        setMetadataFormError(null);
        setIsMetadataModalOpen(true);
    };

    const handleSaveMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await updateStatusMetadata(editingMetadata);
            setMetadata(res.data.metadata || editingMetadata);
            showSuccess("Métadonnées du catalogue mises à jour avec succès.");
            setIsMetadataModalOpen(false);
        } catch (err: any) {
            setMetadataFormError(err.response?.data?.error || err.message || "Erreur lors de la mise à jour des métadonnées.");
        }
    };

    const handleClearMetadata = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser la mention de spécification ? Les badges et bandeaux afficheront alors un titre neutre.")) {
            return;
        }
        try {
            const emptyMeta = {
                specification_title: "Catalogue et Machine à États",
                specification_code: "",
                specification_description: "Référentiel personnalisé des états opérationnels et des transitions autorisées.",
                badge_label: ""
            };
            const res = await updateStatusMetadata(emptyMeta);
            setMetadata(res.data.metadata || emptyMeta);
            showSuccess("Mention de métadonnées supprimée.");
            setIsMetadataModalOpen(false);
        } catch (err: any) {
            alert(err.response?.data?.error || "Erreur lors de la suppression de la métadonnée.");
        }
    };

    // Sandbox current status object
    const sandboxStatusObj = statuses.find(s => s.code === sandboxCurrentCode) || statuses[0];
    const sandboxAllowedNext = sandboxStatusObj?.allowed_transitions || [];

    const handleSandboxTransition = (nextCode: string) => {
        const target = statuses.find(s => s.code === nextCode);
        if (!target) return;

        if (target.requires_comment_on_enter && !sandboxComment.trim()) {
            alert(`Attention : Le statut '${target.label}' exige une justification ou un motif obligatoire.`);
            return;
        }

        setSandboxCurrentCode(nextCode);
        setSandboxHistory(prev => [...prev, nextCode]);
        setSandboxComment('');
    };

    const handleResetSandbox = () => {
        setSandboxCurrentCode('SUBMITTED');
        setSandboxHistory(['DRAFT', 'SUBMITTED']);
        setSandboxComment('');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Bannière d'Architecture Découplée */}
            <div className="bg-gradient-to-r from-blue-900 via-[#002395] to-indigo-900 rounded-2xl p-6 text-white shadow-lg border border-blue-800/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            {((metadata.specification_title && metadata.specification_title.trim() !== '') || (metadata.specification_code && metadata.specification_code.trim() !== '')) && (
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200 border border-white/10 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                    {metadata.specification_title || ''}
                                    {metadata.specification_title && metadata.specification_code && metadata.specification_code.trim() !== '' ? ` • ${metadata.specification_code}` : (metadata.specification_code || '')}
                                </span>
                            )}
                            {metadata.badge_label && metadata.badge_label.trim() !== '' && (
                                <span className="px-2.5 py-0.5 bg-yellow-400/20 text-yellow-300 text-xs rounded-full font-mono border border-yellow-400/30 font-semibold">
                                    {metadata.badge_label}
                                </span>
                            )}
                            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-200 text-xs rounded-full font-mono border border-indigo-400/30">
                                {statuses.length} Statuts Configurés
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Tags className="w-8 h-8 text-yellow-400" />
                            Configurateur de Statuts & Machine à États
                        </h1>
                        <p className="text-sm text-blue-100/90 max-w-3xl leading-relaxed">
                            {metadata.specification_description || "Gouvernance centralisée des états opérationnels, codes canoniques, styles visuels des badges, délais SLA, règles de notification et matrice stricte des transitions autorisées."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <PageHelpButton
                            pageTitle="Guide du Configurateur de Statuts & Machine à États"
                            pageCategory={metadata.badge_label || metadata.specification_code || "Référentiel"}
                            description="Gouvernance centralisée des états opérationnels, codes canoniques, styles visuels des badges, délais SLA, règles de notification et matrice stricte des transitions autorisées."
                            sections={STATUS_HELP_SECTIONS}
                        />
                        <button
                            id="btn-edit-metadata"
                            onClick={handleOpenEditMetadata}
                            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-md border border-white/20 transition flex items-center gap-2"
                            title="Modifier ou supprimer les métadonnées (titre, code de spécification...)"
                        >
                            <Settings className="w-4 h-4 text-blue-200" />
                            Métadonnées
                        </button>
                        <button
                            id="btn-export-status"
                            onClick={handleExportJSON}
                            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-md border border-white/20 transition flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Exporter
                        </button>
                        <label className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-md border border-white/20 transition cursor-pointer flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Importer
                            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                        </label>
                        <button
                            id="btn-new-status"
                            onClick={handleOpenCreate}
                            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nouveau Statut
                        </button>
                    </div>
                </div>

                {/* Liens transversaux vers les autres piliers de l'architecture découplée */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-blue-200/80 flex items-center gap-2">
                        <Workflow className="w-4 h-4 text-yellow-400" />
                        <span className="font-semibold text-white">Écosystème Découplé :</span>
                        <span>Combinez vos statuts avec vos processus et formulaires dynamiques.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/admin/processus"
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium flex items-center gap-1.5"
                        >
                            <Workflow className="w-3.5 h-3.5 text-blue-300" />
                            Gestion Workflows
                        </Link>
                        <Link
                            to="/admin/formulaires"
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium flex items-center gap-1.5"
                        >
                            <FileText className="w-3.5 h-3.5 text-emerald-300" />
                            Concepteur Formulaires
                        </Link>
                        <Link
                            to="/notifications-admin"
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium flex items-center gap-1.5"
                        >
                            <Bell className="w-3.5 h-3.5 text-yellow-300" />
                            Modèles Notifications
                        </Link>
                    </div>
                </div>
            </div>

            {/* Notification de succès */}
            {actionSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2.5 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>{actionSuccess}</span>
                    </div>
                    <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Barre de navigation par onglets principaux */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-3">
                <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
                    <button
                        id="tab-status-catalog"
                        onClick={() => setActiveTab('catalog')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                            activeTab === 'catalog'
                                ? 'bg-white text-[#002395] shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Tags className="w-4 h-4" />
                        Catalogue des Statuts ({statuses.length})
                    </button>
                    <button
                        id="tab-status-matrix"
                        onClick={() => setActiveTab('matrix')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                            activeTab === 'matrix'
                                ? 'bg-white text-[#002395] shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Shuffle className="w-4 h-4" />
                        Matrice Bidimensionnelle des Transitions {matrixDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </button>
                    <button
                        id="tab-status-sandbox"
                        onClick={() => setActiveTab('sandbox')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                            activeTab === 'sandbox'
                                ? 'bg-white text-[#002395] shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Play className="w-4 h-4 text-emerald-600" />
                        Simulateur / Bac à Sable
                    </button>
                    <button
                        id="tab-status-categories"
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                            activeTab === 'categories'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <FolderKanban className="w-4 h-4 text-indigo-600" />
                        Définir les Catégories de Statuts ({categories.length})
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Initial ({statuses.filter(s => s.is_initial).length})
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Terminal ({statuses.filter(s => s.is_terminal).length})
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> En Cours ({statuses.filter(s => !s.is_initial && !s.is_terminal).length})
                    </span>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VUE 1 : CATALOGUE DES STATUTS */}
            {/* ========================================================================= */}
            {activeTab === 'catalog' && (
                <div className="space-y-5">
                    {/* Filtres et recherche */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                id="input-search-status"
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Rechercher par libellé, code unique (ex: PENDING_MANAGER) ou description..."
                                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-hidden"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 shrink-0">
                                <Filter className="w-3.5 h-3.5" /> Phase :
                            </span>
                            <button
                                onClick={() => setSelectedCategory('ALL')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    selectedCategory === 'ALL'
                                        ? 'bg-[#002395] text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Toutes ({statuses.length})
                            </button>
                            {Object.keys(categoryMetaMap).map(catKey => {
                                const meta = categoryMetaMap[catKey];
                                const count = statuses.filter(s => s.category === catKey).length;
                                return (
                                    <button
                                        key={catKey}
                                        onClick={() => setSelectedCategory(catKey)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                            selectedCategory === catKey
                                                ? 'bg-[#002395] text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {meta.label} ({count})
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setActiveTab('categories')}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer ml-auto shrink-0"
                                title="Définir et gérer la liste des catégories de statuts"
                            >
                                <FolderKanban className="w-3.5 h-3.5" />
                                Définir les Catégories ({categories.length})
                            </button>
                        </div>
                    </div>

                    {/* Grille des statuts */}
                    {loading ? (
                        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-600">Chargement du référentiel des statuts...</p>
                        </div>
                    ) : filteredStatuses.length === 0 ? (
                        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center space-y-3">
                            <Tags className="w-12 h-12 text-gray-300 mx-auto" />
                            <h3 className="text-base font-bold text-gray-800">Aucun statut trouvé</h3>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                                Aucun statut ne correspond à votre filtre "{searchTerm || selectedCategory}". Modifiez vos critères ou créez un nouveau statut.
                            </p>
                            <button
                                onClick={handleOpenCreate}
                                className="px-4 py-2 bg-[#002395] text-white rounded-lg text-xs font-semibold hover:bg-blue-900 transition inline-flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" /> Créer un statut
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredStatuses.map(status => {
                                const catMeta = categoryMetaMap[status.category] || { label: status.category, color: "bg-gray-100 text-gray-800 border-gray-200", desc: "" };
                                const transitionsCount = status.allowed_transitions?.length || 0;

                                return (
                                    <div
                                        key={status.code}
                                        className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition p-5 flex flex-col justify-between space-y-4 relative group"
                                    >
                                        {/* Top card header */}
                                        <div className="space-y-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                {/* Badge d'aperçu en direct */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${status.badge_bg} ${status.badge_text} ${status.badge_border || 'border-transparent'}`}>
                                                        {renderIcon(status.icon_name, "w-3.5 h-3.5")}
                                                        {status.label}
                                                    </span>

                                                    {status.specification_tag && status.specification_tag.trim() !== '' && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700 border border-gray-200" title={`Spécification : ${status.specification_tag}`}>
                                                            {status.specification_tag}
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="text-[11px] font-mono text-gray-400 group-hover:text-blue-600 transition shrink-0">
                                                    #{status.display_order}
                                                </span>
                                            </div>

                                            {/* Code unique machine */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                                                    {status.code}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${catMeta.color}`}>
                                                    {catMeta.label}
                                                </span>
                                            </div>

                                            {/* Description opérationnelle */}
                                            <p className="text-xs text-gray-600 line-clamp-2 min-h-[32px]">
                                                {status.description || "Aucune description renseignée."}
                                            </p>
                                        </div>

                                        {/* Badges règles et gouvernance */}
                                        <div className="pt-3 border-t border-gray-100 space-y-2 text-[11px]">
                                            <div className="grid grid-cols-2 gap-2 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span>SLA : <strong className="text-gray-800">{status.sla_default_hours ? `${status.sla_default_hours}h` : 'Non défini'}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Shuffle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span>Transitions : <strong className="text-gray-800">{transitionsCount} cible{transitionsCount > 1 ? 's' : ''}</strong></span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {status.is_initial && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        État Initial
                                                    </span>
                                                )}
                                                {status.is_terminal && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        État Terminal
                                                    </span>
                                                )}
                                                {status.requires_comment_on_enter && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200" title="Motif obligatoire">
                                                        Justif. Requise
                                                    </span>
                                                )}
                                                {status.notify_demandeur_on_enter && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200" title="Alerte demandeur">
                                                        Notif. Demandeur
                                                    </span>
                                                )}
                                                {status.notify_validator_on_enter && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200" title="Alerte validateur">
                                                        Notif. Validateur
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => {
                                                    setSandboxCurrentCode(status.code);
                                                    setActiveTab('sandbox');
                                                }}
                                                className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 transition"
                                                title="Tester ce statut dans le bac à sable"
                                            >
                                                <Play className="w-3.5 h-3.5 text-emerald-600" />
                                                Tester
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDuplicateStatus(status)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Dupliquer ce statut"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(status)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Modifier les paramètres"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                {!status.is_system && (
                                                    <button
                                                        onClick={() => handleDeleteStatus(status)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Supprimer ce statut personnalisé"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
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
            {/* VUE 2 : MATRICE DES TRANSITIONS (MACHINE À ÉTATS 2D) */}
            {/* ========================================================================= */}
            {activeTab === 'matrix' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                                    Machine à États Finis (FSM)
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 font-bold">
                                    {statuses.length} × {statuses.length} Combinaisons
                                </span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mt-1">
                                <Shuffle className="w-5 h-5 text-[#002395]" />
                                Matrice Bidimensionnelle des Transitions Autorisées
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Grille interactive croisant les statuts d'origine (lignes) et de destination (colonnes). Activez ou interdisez les sauts d'états d'un simple clic pour garantir la conformité des circuits d'approbation et éviter les contournements d'étapes.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {matrixDirty && (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5 animate-pulse">
                                    <AlertCircle className="w-3.5 h-3.5" /> Modifications non enregistrées
                                </span>
                            )}
                            <button
                                onClick={handleSaveMatrix}
                                disabled={!matrixDirty}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs ${
                                    matrixDirty
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-500/20'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title="Enregistrement par lot (batch update) avec détection automatique des modifications non enregistrées"
                            >
                                <Check className="w-4 h-4" />
                                Enregistrer par lot (Batch Update)
                            </button>
                        </div>
                    </div>

                    {/* Table matricielle défilable */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[600px]">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-20 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 font-bold text-gray-700 bg-gray-100 min-w-[200px] sticky left-0 z-30 border-r border-gray-200">
                                        Source &darr; / Cible &rarr;
                                    </th>
                                    {statuses.map(target => (
                                        <th key={target.code} className="p-2.5 font-bold text-gray-700 text-center min-w-[120px] max-w-[150px] border-r border-gray-200">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-full ${target.badge_bg} ${target.badge_text}`}>
                                                    {target.label}
                                                </span>
                                                <span className="text-[9px] font-mono text-gray-400">{target.code}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 font-sans">
                                {statuses.map((source, rIdx) => {
                                    const allowedList = matrixDraft[source.code] || [];

                                    return (
                                        <tr key={source.code} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                                            {/* Header de ligne sticky */}
                                            <td className="p-3 font-semibold text-gray-800 bg-gray-50 sticky left-0 z-10 border-r border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${source.is_terminal ? 'bg-emerald-500' : source.is_initial ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                                    <span className="font-bold text-gray-900">{source.label}</span>
                                                </div>
                                                <div className="text-[10px] font-mono text-gray-400 pl-4">{source.code}</div>
                                            </td>

                                            {/* Cellules d'intersection */}
                                            {statuses.map(target => {
                                                const isSelf = source.code === target.code;
                                                const isAllowed = allowedList.includes(target.code);

                                                if (source.is_terminal) {
                                                    return (
                                                        <td key={target.code} className="p-2 text-center bg-gray-100/50 border-r border-gray-200 text-gray-400 text-[10px]" title="Statut terminal : aucune sortie autorisée">
                                                            -
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td
                                                        key={target.code}
                                                        onClick={() => !isSelf && handleToggleTransitionInMatrix(source.code, target.code)}
                                                        className={`p-2 text-center border-r border-gray-200 transition cursor-pointer select-none ${
                                                            isSelf
                                                                ? 'bg-gray-100 cursor-not-allowed'
                                                                : isAllowed
                                                                ? 'bg-blue-50 hover:bg-blue-100 font-bold text-blue-700'
                                                                : 'hover:bg-gray-100 text-gray-300'
                                                        }`}
                                                        title={isSelf ? "Transition vers soi-même non autorisée" : `${source.code} -> ${target.code}`}
                                                    >
                                                        {isSelf ? (
                                                            <span className="text-gray-300 text-[10px]">•</span>
                                                        ) : isAllowed ? (
                                                            <div className="w-5 h-5 mx-auto rounded-md bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 mx-auto rounded-md border border-gray-200 text-transparent hover:text-gray-400 hover:border-gray-400 flex items-center justify-center">
                                                                <Plus className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VUE 3 : BAC À SABLE / SIMULATEUR DE MACHINE À ÉTATS */}
            {/* ========================================================================= */}
            {activeTab === 'sandbox' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne gauche : État courant & prochaines transitions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-5">
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <Play className="w-5 h-5 text-emerald-600" />
                                        Simulateur de Cycle de Vie de Demande
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Sélectionnez un état de départ, saisissez un motif si requis et déclenchez les transitions autorisées.
                                    </p>
                                </div>
                                <button
                                    onClick={handleResetSandbox}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Réinitialiser
                                </button>
                            </div>

                            {/* État Actuel */}
                            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white rounded-xl p-5 border border-blue-200/80 space-y-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                                    Statut Actuel de la Demande
                                </span>

                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border shadow-xs ${sandboxStatusObj?.badge_bg} ${sandboxStatusObj?.badge_text} ${sandboxStatusObj?.badge_border || 'border-transparent'}`}>
                                        {renderIcon(sandboxStatusObj?.icon_name || 'Clock', "w-4 h-4")}
                                        {sandboxStatusObj?.label}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                                        {sandboxStatusObj?.code}
                                    </span>
                                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white border border-gray-200 text-gray-700">
                                        SLA : {sandboxStatusObj?.sla_default_hours ? `${sandboxStatusObj?.sla_default_hours}h` : 'Aucun'}
                                    </span>
                                </div>

                                <p className="text-xs text-gray-600">
                                    {sandboxStatusObj?.description}
                                </p>
                            </div>

                            {/* Formulaire de transition */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-gray-700 flex items-center gap-1.5">
                                    <ArrowRight className="w-4 h-4 text-blue-600" />
                                    Transitions Directes Autorisées ({sandboxAllowedNext.length})
                                </h4>

                                {sandboxAllowedNext.length === 0 ? (
                                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                                        <p className="text-xs font-bold text-emerald-900">Statut Terminal Atteint</p>
                                        <p className="text-[11px] text-emerald-700">Le dossier est clos, archivé ou résolu. Aucune transition sortante autorisée.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Champ motif si le statut cible le réclame */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Motif opérationnel ou commentaire d'arbitrage
                                            </label>
                                            <input
                                                type="text"
                                                value={sandboxComment}
                                                onChange={e => setSandboxComment(e.target.value)}
                                                placeholder="ex: Avis favorable suite à vérification de l'habilitation C18 H0B0..."
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            {sandboxAllowedNext.map(targetCode => {
                                                const targetObj = statuses.find(s => s.code === targetCode);
                                                if (!targetObj) return null;

                                                return (
                                                    <button
                                                        key={targetCode}
                                                        onClick={() => handleSandboxTransition(targetCode)}
                                                        className="p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/40 transition text-left space-y-2 group shadow-2xs"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${targetObj.badge_bg} ${targetObj.badge_text}`}>
                                                                {renderIcon(targetObj.icon_name, "w-3 h-3")}
                                                                {targetObj.label}
                                                            </span>
                                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                                                        </div>

                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                            <span className="font-mono font-semibold">{targetObj.code}</span>
                                                            {targetObj.requires_comment_on_enter && (
                                                                <span className="text-amber-700 font-bold">• Motif requis</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Historique du parcours dans le simulateur */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
                            <h4 className="text-xs font-bold uppercase text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                Historique du Circuit Parcouru (Horodatage Simulation)
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                                {sandboxHistory.map((hCode, idx) => {
                                    const hObj = statuses.find(s => s.code === hCode);
                                    const isLast = idx === sandboxHistory.length - 1;

                                    return (
                                        <React.Fragment key={`${hCode}-${idx}`}>
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                isLast
                                                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}>
                                                {hObj?.label || hCode}
                                            </span>
                                            {!isLast && <ArrowRight className="w-3.5 h-3.5 text-gray-400" />}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Colonne droite : Prévisualisation Multi-Écrans */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
                            <h4 className="text-xs font-bold uppercase text-gray-700 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-[#002395]" />
                                Rendu Visuel Multi-Écrans
                            </h4>
                            <p className="text-xs text-gray-500">
                                Aperçu direct du badge configuré dans les différents contextes utilisateurs :
                            </p>

                            {/* Contexte 1 : Ligne de Corbeille Validateur */}
                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Corbeille Validateur (Tableau)
                                </span>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="font-bold text-gray-900">REQ-2026-1042</div>
                                        <div className="text-gray-500 text-[11px]">Accès Emprise Châtillon</div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sandboxStatusObj?.badge_bg} ${sandboxStatusObj?.badge_text} ${sandboxStatusObj?.badge_border || 'border-transparent'}`}>
                                        {renderIcon(sandboxStatusObj?.icon_name || 'Clock', "w-3 h-3")}
                                        {sandboxStatusObj?.label}
                                    </span>
                                </div>
                            </div>

                            {/* Contexte 2 : Carte Mes Demandes */}
                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Portail "Mes Demandes" (Agent Demandeur)
                                </span>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-950">Attribution Clé Électronique</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sandboxStatusObj?.badge_bg} ${sandboxStatusObj?.badge_text}`}>
                                            {renderIcon(sandboxStatusObj?.icon_name || 'Clock', "w-3 h-3")}
                                            {sandboxStatusObj?.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Dossier déposé le 21/09/2026 à 08:30</p>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full w-2/3" />
                                    </div>
                                </div>
                            </div>

                            {/* Contexte 3 : Entête Modal Détail */}
                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    En-tête Fiche Dossier Parent-Enfant
                                </span>
                                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 rounded-lg flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold">Dossier REQ-2026-1042</div>
                                        <div className="text-[10px] text-blue-200">Gare de Lyon • Emprise Voie 2</div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sandboxStatusObj?.badge_bg} ${sandboxStatusObj?.badge_text}`}>
                                        {renderIcon(sandboxStatusObj?.icon_name || 'Clock', "w-3 h-3")}
                                        {sandboxStatusObj?.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VUE 4 : GESTION DES CATÉGORIES & PHASES */}
            {/* ========================================================================= */}
            {activeTab === 'categories' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FolderKanban className="w-5 h-5 text-indigo-600" />
                                Référentiel des Phases & Catégories de Statuts
                            </h2>
                            <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
                                Personnalisez les phases de regroupement des statuts (Instruction, Validation, Réalisation, Clôture...). Chaque catégorie structure les filtres, badges visuels et l'organisation du cycle de vie des dossiers.
                            </p>
                        </div>
                        <button
                            id="btn-new-category"
                            onClick={handleOpenCreateCategory}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 shrink-0 self-start md:self-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Nouvelle Catégorie
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(cat => {
                            const linkedStatuses = statuses.filter(s => s.category === cat.code);
                            return (
                                <div
                                    key={cat.code}
                                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cat.color}`}>
                                                {cat.label}
                                            </span>
                                            <span className="text-[11px] font-mono text-gray-400">
                                                Ordre #{cat.display_order}
                                            </span>
                                        </div>

                                        <div>
                                            <div className="text-xs font-mono font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md inline-block border border-gray-200 mb-1.5">
                                                {cat.code}
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed min-h-[36px]">
                                                {cat.desc || "Aucune description détaillée."}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-medium">
                                                {linkedStatuses.length} statut{linkedStatuses.length > 1 ? 's' : ''} associé{linkedStatuses.length > 1 ? 's' : ''}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {linkedStatuses.slice(0, 3).map(s => (
                                                    <span key={s.code} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">
                                                        {s.code.substring(0, 4)}...
                                                    </span>
                                                ))}
                                                {linkedStatuses.length > 3 && (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        +{linkedStatuses.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <button
                                            onClick={() => {
                                                setSelectedCategory(cat.code);
                                                setActiveTab('catalog');
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
                                        >
                                            Voir statuts →
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenEditCategory(cat)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                title="Modifier la catégorie"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Supprimer la catégorie"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL CRÉATION / ÉDITION DE STATUT */}
            {/* ========================================================================= */}
            {isEditModalOpen && editingStatus && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
                        {/* Header modal */}
                        <div className="bg-gradient-to-r from-blue-950 via-[#002395] to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Tags className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <h3 className="text-lg font-bold">
                                        {isCreating ? "Créer un Nouveau Statut Opérationnel" : `Modifier le Statut : ${editingStatus.label}`}
                                    </h3>
                                    <p className="text-xs text-blue-200">
                                        Configuration dynamique des statuts & machine à états
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Formulaire */}
                        <form onSubmit={handleSaveStatus} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Section 1 : Identifiants & Définition */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-1 border-b border-gray-100 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-blue-600" />
                                    1. Identification Métier & Phase
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Code Unique (Machine à États) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editingStatus.code || ''}
                                            disabled={!isCreating}
                                            onChange={e => setEditingStatus({ ...editingStatus, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                                            placeholder="ex: PENDING_SAFETY_AUDIT"
                                            className={`w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono outline-hidden ${
                                                isCreating ? 'focus:ring-2 focus:ring-blue-600 bg-white' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                            }`}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Majuscules, chiffres et underscores uniquement.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Libellé Affiché (Français) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editingStatus.label || ''}
                                            onChange={e => setEditingStatus({ ...editingStatus, label: e.target.value })}
                                            placeholder="ex: Audit Sûreté & Habilitation Requis"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-gray-700">
                                                Phase / Catégorie du Cycle de Vie <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditModalOpen(false);
                                                    setActiveTab('categories');
                                                }}
                                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                                            >
                                                + Définir les catégories
                                            </button>
                                        </div>
                                        <select
                                            value={editingStatus.category || 'IN_REVIEW'}
                                            onChange={e => setEditingStatus({ ...editingStatus, category: e.target.value as StatusCategory })}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                        >
                                            {Object.keys(categoryMetaMap).map(catKey => (
                                                <option key={catKey} value={catKey}>
                                                    {categoryMetaMap[catKey].label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Ordre d'Affichage / Séquence
                                        </label>
                                        <input
                                            type="number"
                                            value={editingStatus.display_order || 1}
                                            onChange={e => setEditingStatus({ ...editingStatus, display_order: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Description Opérationnelle
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={editingStatus.description || ''}
                                            onChange={e => setEditingStatus({ ...editingStatus, description: e.target.value })}
                                            placeholder="Décrivez les conditions de passage et l'impact opérationnel de ce statut..."
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Tag / Référence de Spécification
                                        </label>
                                        <input
                                            type="text"
                                            value={editingStatus.specification_tag || ''}
                                            onChange={e => setEditingStatus({ ...editingStatus, specification_tag: e.target.value })}
                                            placeholder="Laisser vide pour ne pas afficher de tag de norme"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Laissez vide : aucun tag ne sera affiché pour ce statut.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2 : Charte Graphique & Badge */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-1 border-b border-gray-100 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-yellow-500" />
                                    2. Style Visuel & Rendu du Badge
                                </h4>

                                {/* Aperçu interactif en direct */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Aperçu en Temps Réel :</span>
                                        <div className="mt-1">
                                            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xs ${editingStatus.badge_bg} ${editingStatus.badge_text} ${editingStatus.badge_border || 'border-transparent'}`}>
                                                {renderIcon(editingStatus.icon_name || 'Clock', "w-4 h-4")}
                                                {editingStatus.label || "Libellé du Statut"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right text-[11px] text-gray-400 font-mono">
                                        {editingStatus.badge_bg} • {editingStatus.badge_text}
                                    </div>
                                </div>

                                {/* Palette de couleurs prédéfinies */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Thème de Couleur Prédéfini
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {BADGE_COLOR_PRESETS.map((preset, pIdx) => {
                                            const isSelected = editingStatus.badge_bg === preset.bg && editingStatus.badge_text === preset.text;
                                            return (
                                                <button
                                                    key={pIdx}
                                                    type="button"
                                                    onClick={() => setEditingStatus({
                                                        ...editingStatus,
                                                        badge_bg: preset.bg,
                                                        badge_text: preset.text,
                                                        badge_border: preset.border
                                                    })}
                                                    className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition ${
                                                        isSelected
                                                            ? 'ring-2 ring-blue-600 border-blue-600 font-bold bg-blue-50/50'
                                                            : 'border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${preset.bg} ${preset.text}`}>
                                                        Aa
                                                    </span>
                                                    <span className="text-[11px] truncate text-gray-700 ml-2">{preset.label.split(' ')[0]}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Sélecteur d'icône */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Icône Représentative
                                    </label>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                        {AVAILABLE_ICONS.map(i => {
                                            const IconComp = i.icon;
                                            const isSelected = editingStatus.icon_name === i.name;
                                            return (
                                                <button
                                                    key={i.name}
                                                    type="button"
                                                    onClick={() => setEditingStatus({ ...editingStatus, icon_name: i.name })}
                                                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition ${
                                                        isSelected
                                                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-2xs ring-2 ring-blue-400'
                                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                    }`}
                                                    title={i.label}
                                                >
                                                    <IconComp className="w-4 h-4" />
                                                    <span className="text-[9px] truncate max-w-full">{i.label.split(' ')[0]}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3 : Gouvernance & Délais SLA */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-1 border-b border-gray-100 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-emerald-600" />
                                    3. Gouvernance, SLA & Notifications
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                                            <span>Délai SLA par défaut (Heures)</span>
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        </label>
                                        <input
                                            type="number"
                                            value={editingStatus.sla_default_hours || 0}
                                            onChange={e => setEditingStatus({ ...editingStatus, sla_default_hours: parseInt(e.target.value) || 0 })}
                                            placeholder="ex: 24 pour 24 heures"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">0 = Aucun délai SLA contraignant.</p>
                                    </div>

                                    {/* Toggles */}
                                    <div className="space-y-2 pt-1">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(editingStatus.is_initial)}
                                                onChange={e => setEditingStatus({ ...editingStatus, is_initial: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded-sm"
                                            />
                                            <span>Peut être l'état initial d'une demande</span>
                                        </label>

                                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(editingStatus.is_terminal)}
                                                onChange={e => setEditingStatus({ ...editingStatus, is_terminal: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded-sm"
                                            />
                                            <span>Statut terminal (Dossier clos / aucune sortie)</span>
                                        </label>

                                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(editingStatus.requires_comment_on_enter)}
                                                onChange={e => setEditingStatus({ ...editingStatus, requires_comment_on_enter: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded-sm"
                                            />
                                            <span>Motif / Justification obligatoire lors du passage</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(editingStatus.notify_demandeur_on_enter)}
                                            onChange={e => setEditingStatus({ ...editingStatus, notify_demandeur_on_enter: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded-sm"
                                        />
                                        <span>Notifier automatiquement l'agent demandeur</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(editingStatus.notify_validator_on_enter)}
                                            onChange={e => setEditingStatus({ ...editingStatus, notify_validator_on_enter: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded-sm"
                                        />
                                        <span>Notifier les validateurs / managers désignés</span>
                                    </label>
                                </div>
                            </div>

                            {/* Section 4 : Transitions Cibles Autorisées */}
                            {!editingStatus.is_terminal && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-1 border-b border-gray-100 flex items-center gap-2">
                                        <Shuffle className="w-4 h-4 text-purple-600" />
                                        4. Transitions Cibles Autorisées depuis ce Statut
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Cochez les statuts vers lesquels un dossier se trouvant dans cet état a le droit d'évoluer.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50">
                                        {statuses
                                            .filter(s => s.code !== editingStatus.code)
                                            .map(target => {
                                                const currentAllowed = editingStatus.allowed_transitions || [];
                                                const isChecked = currentAllowed.includes(target.code);

                                                return (
                                                    <label
                                                        key={target.code}
                                                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition select-none ${
                                                            isChecked
                                                                ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900 shadow-2xs'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setEditingStatus({
                                                                        ...editingStatus,
                                                                        allowed_transitions: [...currentAllowed, target.code]
                                                                    });
                                                                } else {
                                                                    setEditingStatus({
                                                                        ...editingStatus,
                                                                        allowed_transitions: currentAllowed.filter(c => c !== target.code)
                                                                    });
                                                                }
                                                            }}
                                                            className="w-3.5 h-3.5 text-blue-600 rounded-sm"
                                                        />
                                                        <span className="truncate">{target.label}</span>
                                                    </label>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Boutons modal */}
                            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold transition shadow-md flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    {isCreating ? "Créer le Statut" : "Enregistrer les Modifications"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL CRÉATION / ÉDITION DE CATÉGORIE / PHASE */}
            {/* ========================================================================= */}
            {isCategoryModalOpen && editingCategory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
                        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FolderKanban className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <h3 className="text-base font-bold">
                                        {isCreatingCategory ? "Ajouter une Phase / Catégorie" : `Modifier : ${editingCategory.label}`}
                                    </h3>
                                    <p className="text-xs text-indigo-200">
                                        Structuration des regroupements du cycle de vie
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            {categoryFormError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{categoryFormError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Code Machine Unique (Clé) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingCategory.code || ''}
                                    disabled={!isCreatingCategory}
                                    onChange={e => setEditingCategory({ ...editingCategory, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                                    placeholder="ex: IN_TESTING"
                                    className={`w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono outline-hidden ${
                                        isCreatingCategory ? 'focus:ring-2 focus:ring-indigo-600 bg-white' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    }`}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Majuscules et underscores uniquement.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Libellé Affiché (Nom de la phase) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingCategory.label || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory, label: e.target.value })}
                                    placeholder="ex: Phase d'Essais & Recette"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-600 outline-hidden bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Ordre d'Affichage
                                    </label>
                                    <input
                                        type="number"
                                        value={editingCategory.display_order || 1}
                                        onChange={e => setEditingCategory({ ...editingCategory, display_order: parseInt(e.target.value) || 1 })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-600 outline-hidden bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Palette de Couleurs
                                    </label>
                                    <select
                                        value={editingCategory.color || "bg-indigo-100 text-indigo-800 border-indigo-200"}
                                        onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-600 outline-hidden bg-white"
                                    >
                                        <option value="bg-gray-100 text-gray-800 border-gray-200">Gris Neutre</option>
                                        <option value="bg-blue-100 text-blue-800 border-blue-200">Bleu Océan</option>
                                        <option value="bg-indigo-100 text-indigo-800 border-indigo-200">Indigo Métier</option>
                                        <option value="bg-purple-100 text-purple-800 border-purple-200">Violet Stratégique</option>
                                        <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Vert Succès</option>
                                        <option value="bg-amber-100 text-amber-800 border-amber-200">Ambre Vigilance</option>
                                        <option value="bg-red-100 text-red-800 border-red-200">Rouge Alerte</option>
                                        <option value="bg-pink-100 text-pink-800 border-pink-200">Rose Vif</option>
                                        <option value="bg-teal-100 text-teal-800 border-teal-200">Teal Lagon</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Description Fonctionnelle
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingCategory.desc || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory, desc: e.target.value })}
                                    placeholder="Décrivez l'objectif ou le périmètre de cette phase du workflow..."
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-600 outline-hidden bg-white"
                                />
                            </div>

                            {/* Aperçu du badge */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-medium">Aperçu du badge :</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${editingCategory.color}`}>
                                    {editingCategory.label || "Libellé de la catégorie"}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    {isCreatingCategory ? "Créer la Catégorie" : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL GESTION DES MÉTADONNÉES DU CATALOGUE / BRANDING */}
            {/* ========================================================================= */}
            {isMetadataModalOpen && editingMetadata && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-8">
                        <div className="bg-gradient-to-r from-blue-950 via-[#002395] to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <h3 className="text-base font-bold">
                                        Métadonnées & Référentiel du Catalogue
                                    </h3>
                                    <p className="text-xs text-blue-200">
                                        Personnalisez ou supprimez les mentions de norme ou référentiel
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMetadataModalOpen(false)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMetadata} className="p-6 space-y-4">
                            {metadataFormError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{metadataFormError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Titre Général de la Spécification
                                </label>
                                <input
                                    type="text"
                                    value={editingMetadata.specification_title || ''}
                                    onChange={e => setEditingMetadata({ ...editingMetadata, specification_title: e.target.value })}
                                    placeholder="ex: Architecture Standard des Accès"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Affiché en haut du bandeau du catalogue de statuts.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Code Spécification
                                    </label>
                                    <input
                                        type="text"
                                        value={editingMetadata.specification_code || ''}
                                        onChange={e => setEditingMetadata({ ...editingMetadata, specification_code: e.target.value })}
                                        placeholder="ex: REF-SEC-2026"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Badge Court (Pill)
                                    </label>
                                    <input
                                        type="text"
                                        value={editingMetadata.badge_label || ''}
                                        onChange={e => setEditingMetadata({ ...editingMetadata, badge_label: e.target.value })}
                                        placeholder="ex: Standard"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400">
                                Pour supprimer toute référence de norme, videz simplement ces champs ou cliquez sur "Supprimer la mention".
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Description / Sous-titre
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingMetadata.specification_description || ''}
                                    onChange={e => setEditingMetadata({ ...editingMetadata, specification_description: e.target.value })}
                                    placeholder="Description du rôle de la machine à états et des statuts..."
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleClearMetadata}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                                >
                                    Effacer tout / Laisser vide (Aucun badge)
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsMetadataModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 rounded-xl bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                                    >
                                        <Check className="w-4 h-4" />
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
