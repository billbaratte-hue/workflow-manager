import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    ClipboardList,
    Plus,
    Trash2,
    Edit,
    Copy,
    Check,
    AlertTriangle,
    Search,
    RefreshCw,
    Eye,
    Play,
    Download,
    Upload,
    ArrowUp,
    ArrowDown,
    Database,
    Link as LinkIcon,
    FileText,
    CheckSquare,
    Calendar,
    Hash,
    FileUp,
    MapPin,
    ShieldCheck,
    Mail,
    Phone,
    HelpCircle,
    X,
    ChevronRight,
    Sparkles,
    Tag,
    AlignLeft,
    GitFork,
    Layers,
    Star,
    ExternalLink
} from 'lucide-react';
import {
    getFormulaires,
    createFormulaire,
    updateFormulaire,
    deleteFormulaire,
    duplicateFormulaire,
    getProcesses,
    getCategories,
    getReferenceTables
} from '../lib/api';
import { formPersistenceService } from '../services/formPersistenceService';
import { PageHelpButton, HelpSection } from '../components/PageHelpModal';

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'table_ref' | 'checkbox' | 'radio' | 'file' | 'email' | 'tel' | 'gps' | 'tag';
    table_ref?: string;
    options?: string;
    required?: boolean;
    placeholder?: string;
    help_text?: string;
    default_value?: any;
    col_span?: 4 | 6 | 12;
}

export interface FormTemplateItem {
    id: string;
    name: string;
    code: string;
    category_id: number;
    description: string;
    status: string;
    fields: FormField[];
    linked_tables?: string[];
    linked_process_id?: number;
    created_at?: string;
    updated_at?: string;
}

export default function AdminFormulaires() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [formulaires, setFormulaires] = useState<FormTemplateItem[]>([]);
    const [processes, setProcesses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');

    // Selected form being edited
    const [selectedForm, setSelectedForm] = useState<FormTemplateItem | null>(null);
    const [activeTab, setActiveTab] = useState<'fields' | 'preview' | 'workflow' | 'blueprint'>('fields');
    const [activeFormId, setActiveFormId] = useState<string | null>(formPersistenceService.getActiveFormId());

    // Form edit state
    const [editForm, setEditForm] = useState<{
        name: string;
        code: string;
        description: string;
        category_id: number;
        status: string;
        fields: FormField[];
        linked_tables: string[];
        linked_process_id?: number;
    }>({
        name: '',
        code: '',
        description: '',
        category_id: 1,
        status: 'Brouillon',
        fields: [],
        linked_tables: []
    });

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createCode, setCreateCode] = useState('');
    const [createCategoryId, setCreateCategoryId] = useState<number>(1);
    const [createDescription, setCreateDescription] = useState('');
    const [createLinkedProcessId, setCreateLinkedProcessId] = useState<number | undefined>(undefined);

    // Field modal
    const [showFieldModal, setShowFieldModal] = useState(false);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [fieldFormData, setFieldFormData] = useState<FormField>({
        id: '',
        label: '',
        type: 'text',
        required: true,
        col_span: 12
    });

    // Sandbox preview testing state
    const [sandboxValues, setSandboxValues] = useState<Record<string, any>>({});
    const [sandboxErrors, setSandboxErrors] = useState<Record<string, string>>({});
    const [sandboxValidated, setSandboxValidated] = useState(false);

    // Import modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJsonText, setImportJsonText] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // Notifications & Saving
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Initial load
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [formsList, procsRes, catsRes, tablesRes] = await Promise.all([
                formPersistenceService.getFormulaires(),
                getProcesses(),
                getCategories(),
                getReferenceTables()
            ]);

            const procsList: any[] = procsRes.data || [];
            const catsList: any[] = catsRes.data || [];
            const tablesList: any[] = tablesRes.data || [];

            setFormulaires(formsList);
            setProcesses(procsList);
            setCategories(catsList);
            setAvailableTables(tablesList);
            setActiveFormId(formPersistenceService.getActiveFormId());

            // Handle query param selection if provided
            const requestedProcessId = searchParams.get('processId');
            const requestedFormId = searchParams.get('formId');

            let targetForm: FormTemplateItem | null = null;
            if (requestedFormId) {
                targetForm = formsList.find(f => f.id === requestedFormId) || null;
            } else if (requestedProcessId) {
                targetForm = formsList.find(f => f.linked_process_id === Number(requestedProcessId)) || null;
            }

            if (!targetForm && formsList.length > 0) {
                const currentActive = formPersistenceService.getActiveFormId();
                targetForm = formsList.find(f => f.id === currentActive) || formsList[0];
            }

            if (targetForm) {
                selectFormItem(targetForm);
            }
        } catch (err: any) {
            console.error('Erreur chargement données formulaires:', err);
            setFeedback({ type: 'error', message: "Impossible de charger les formulaires." });
        } finally {
            setLoading(false);
        }
    };

    const selectFormItem = (form: FormTemplateItem) => {
        setSelectedForm(form);
        setEditForm({
            name: form.name,
            code: form.code,
            description: form.description || '',
            category_id: form.category_id || 1,
            status: form.status || 'Brouillon',
            fields: form.fields ? JSON.parse(JSON.stringify(form.fields)) : [],
            linked_tables: form.linked_tables ? [...form.linked_tables] : [],
            linked_process_id: form.linked_process_id
        });
        setSandboxValues({});
        setSandboxErrors({});
        setSandboxValidated(false);
    };

    // Filter forms list
    const filteredFormulaires = formulaires.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCat = selectedCategoryId === 'ALL' || f.category_id === selectedCategoryId;
        return matchesSearch && matchesCat;
    });

    // Activer un formulaire pour Nouvelle Demande
    const handleSetActiveForNouvelleDemande = (formId: string) => {
        formPersistenceService.setActiveFormId(formId);
        setActiveFormId(formId);
        setFeedback({
            type: 'success',
            message: "⭐ Ce formulaire est désormais actif par défaut pour toutes les 'Nouvelles Demandes' !"
        });
        setTimeout(() => setFeedback(null), 4000);
    };

    // Save Form
    const handleSaveForm = async () => {
        if (!selectedForm) return;
        setSaving(true);
        setFeedback(null);

        try {
            // Deduce linked tables from fields
            const extractedTables = editForm.fields
                .filter(fld => fld.type === 'table_ref' && fld.table_ref)
                .map(fld => fld.table_ref as string);
            const mergedTables = Array.from(new Set([...editForm.linked_tables, ...extractedTables]));

            const payload: FormTemplateItem = {
                id: selectedForm.id,
                name: editForm.name,
                code: editForm.code,
                description: editForm.description,
                category_id: editForm.category_id,
                status: editForm.status,
                fields: editForm.fields,
                linked_tables: mergedTables,
                linked_process_id: editForm.linked_process_id,
                created_at: selectedForm.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const updated = await formPersistenceService.saveFormulaire(payload);

            setFormulaires(prev => prev.map(f => f.id === updated.id ? updated : f));
            setSelectedForm(updated);

            // Si c'est le formulaire actif ou si aucun n'est sélectionné
            if (updated.status === 'Actif' && (!activeFormId || activeFormId === updated.id)) {
                formPersistenceService.setActiveFormId(updated.id);
                setActiveFormId(updated.id);
            }

            setFeedback({
                type: 'success',
                message: "Formulaire enregistré dans le stockage persistant & synchronisé pour Nouvelle Demande !"
            });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            console.error('Erreur sauvegarde formulaire:', err);
            setFeedback({ type: 'error', message: err.message || "Erreur lors de l'enregistrement du formulaire." });
        } finally {
            setSaving(false);
        }
    };

    // Create New Form
    const handleCreateForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName.trim()) return;

        try {
            const payload: Partial<FormTemplateItem> = {
                name: createName.trim(),
                code: createCode.trim() || `FORM-${Date.now().toString().slice(-4)}`,
                category_id: createCategoryId,
                description: createDescription.trim(),
                linked_process_id: createLinkedProcessId ? Number(createLinkedProcessId) : undefined,
                status: 'Actif',
                fields: [
                    { id: 'site_id', label: 'Site Ferroviaire concerné', type: 'table_ref', table_ref: 'sites', required: true, col_span: 6 },
                    { id: 'equipment_type', label: 'Matériel / Équipement requis', type: 'table_ref', table_ref: 'equipments', required: true, col_span: 6 },
                    { id: 'titre_mission', label: 'Intitulé de la mission', type: 'text', required: true, placeholder: 'Ex: Contrôle aiguillage gare', col_span: 12 },
                    { id: 'motif_demande', label: 'Motif détaillé de la demande', type: 'textarea', required: true, col_span: 12 }
                ],
                linked_tables: ['sites', 'equipments']
            };

            const newForm = await formPersistenceService.createFormulaire(payload);

            setFormulaires(prev => [newForm, ...prev]);
            selectFormItem(newForm);
            formPersistenceService.setActiveFormId(newForm.id);
            setActiveFormId(newForm.id);
            setShowCreateModal(false);
            setCreateName('');
            setCreateCode('');
            setCreateDescription('');
            setCreateLinkedProcessId(undefined);

            setFeedback({
                type: 'success',
                message: `Formulaire "${newForm.name}" créé, persisté et activé pour Nouvelle Demande.`
            });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            console.error('Erreur création formulaire:', err);
            setFeedback({ type: 'error', message: err.message || "Erreur lors de la création du formulaire." });
        }
    };

    // Duplicate Form
    const handleDuplicateForm = async () => {
        if (!selectedForm) return;
        try {
            const duplicated = await formPersistenceService.duplicateFormulaire(selectedForm.id);
            setFormulaires(prev => [duplicated, ...prev]);
            selectFormItem(duplicated);
            setFeedback({ type: 'success', message: `Formulaire dupliqué sous le nom "${duplicated.name}".` });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            setFeedback({ type: 'error', message: "Erreur lors de la duplication du formulaire." });
        }
    };

    // Delete Form
    const handleDeleteForm = async () => {
        if (!selectedForm) return;
        const confirmDel = window.confirm(`Voulez-vous vraiment supprimer le formulaire "${selectedForm.name}" ?`);
        if (!confirmDel) return;

        try {
            await formPersistenceService.deleteFormulaire(selectedForm.id);
            const rem = formulaires.filter(f => f.id !== selectedForm.id);
            setFormulaires(rem);
            if (rem.length > 0) {
                selectFormItem(rem[0]);
            } else {
                setSelectedForm(null);
            }
            setActiveFormId(formPersistenceService.getActiveFormId());
            setFeedback({ type: 'success', message: "Formulaire supprimé." });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: any) {
            setFeedback({ type: 'error', message: "Erreur lors de la suppression." });
        }
    };

    // Field management
    const openAddFieldModal = () => {
        setEditingFieldIndex(null);
        setFieldFormData({
            id: `champ_${Date.now().toString().slice(-4)}`,
            label: '',
            type: 'text',
            required: true,
            col_span: 12
        });
        setShowFieldModal(true);
    };

    const openEditFieldModal = (index: number) => {
        setEditingFieldIndex(index);
        setFieldFormData({ ...editForm.fields[index] });
        setShowFieldModal(true);
    };

    const handleSaveField = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fieldFormData.label.trim()) return;

        const cleanId = (fieldFormData.id.trim() || fieldFormData.label.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
        const newField: FormField = {
            ...fieldFormData,
            id: cleanId,
            col_span: fieldFormData.col_span || 12
        };

        const updatedFields = [...editForm.fields];
        if (editingFieldIndex !== null) {
            updatedFields[editingFieldIndex] = newField;
        } else {
            updatedFields.push(newField);
        }

        setEditForm(prev => ({ ...prev, fields: updatedFields }));
        setShowFieldModal(false);
    };

    const handleDeleteField = (index: number) => {
        const updatedFields = editForm.fields.filter((_, i) => i !== index);
        setEditForm(prev => ({ ...prev, fields: updatedFields }));
    };

    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= editForm.fields.length) return;

        const updated = [...editForm.fields];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        setEditForm(prev => ({ ...prev, fields: updated }));
    };

    const handleDuplicateField = (index: number) => {
        const source = editForm.fields[index];
        const cloned: FormField = {
            ...JSON.parse(JSON.stringify(source)),
            id: `${source.id}_copie`,
            label: `${source.label} (Copie)`
        };
        const updated = [...editForm.fields];
        updated.splice(index + 1, 0, cloned);
        setEditForm(prev => ({ ...prev, fields: updated }));
    };

    // Sandbox Validation Test
    const handleTestValidation = () => {
        const errors: Record<string, string> = {};
        for (const fld of editForm.fields) {
            if (fld.required) {
                const val = sandboxValues[fld.id];
                if (val === undefined || val === null || val === '' || (fld.type === 'checkbox' && !val)) {
                    errors[fld.id] = `Le champ "${fld.label}" est obligatoire.`;
                }
            }
        }
        setSandboxErrors(errors);
        setSandboxValidated(true);
    };

    // Export Blueprint
    const handleExportBlueprint = () => {
        if (!selectedForm) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            schema_version: "2.0_FORM",
            form: selectedForm,
            exported_at: new Date().toISOString()
        }, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `formulaire_${selectedForm.code || selectedForm.id}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    // Import Blueprint
    const handleApplyImportJson = () => {
        setImportError(null);
        try {
            const parsed = JSON.parse(importJsonText);
            const source = parsed.form || parsed;

            if (!source.name || !Array.isArray(source.fields)) {
                throw new Error("Structure JSON invalide : 'name' et 'fields' sont requis.");
            }

            setEditForm(prev => ({
                ...prev,
                name: source.name,
                code: source.code || prev.code,
                description: source.description || prev.description,
                fields: source.fields,
                linked_tables: source.linked_tables || prev.linked_tables
            }));

            setShowImportModal(false);
            setImportJsonText('');
            setFeedback({ type: 'success', message: "Schéma de formulaire importé avec succès dans l'éditeur !" });
            setTimeout(() => setFeedback(null), 4000);
        } catch (e: any) {
            setImportError(`Erreur d'import : ${e.message}`);
        }
    };

    // Help sections for Form Designer
    const helpSections: HelpSection[] = [
        {
            title: "Séparation Métier : Formulaires vs Workflows",
            description: "Le Concepteur de Formulaires gère la structure de saisie (quelles données et justificatifs sont demandés aux agents). Le Circuit de Validation (Workflow) gère le cheminement des approbations et les notifications. Chaque formulaire peut être lié à un Workflow spécifique."
        },
        {
            title: "Typologie des Champs Dynamiques",
            description: "13 types de contrôles sont disponibles : Texte court, Paragraphe multiligne, Nombre, Sélecteur de Table Référentielle (sites, services, équipements), Liste personnalisée, Date/Heure, Case à cocher, Fichier PDF, Habilitation, Email, Téléphone et Coordonnées GPS."
        },
        {
            title: "Test de Saisie & Bac à Sable Interactif",
            description: "L'onglet 'Prévisualisation & Test' vous permet d'expérimenter la saisie réelle telle que l'agent la verra sur le portail, de tester la validation des champs obligatoires et d'inspecter l'objet JSON produit."
        },
        {
            title: "Liaison aux Tables Référentielles",
            description: "Les champs de type 'Table Référentielle' se connectent automatiquement aux listes vivantes gérées dans 'Tables de Référence' (ex: annuaire des sites mécatroniques, services d'aiguillage, etc.)."
        }
    ];

    const getFieldTypeIcon = (type: FormField['type']) => {
        switch (type) {
            case 'text': return <AlignLeft className="w-4 h-4 text-blue-600" />;
            case 'textarea': return <FileText className="w-4 h-4 text-indigo-600" />;
            case 'number': return <Hash className="w-4 h-4 text-emerald-600" />;
            case 'date':
            case 'datetime': return <Calendar className="w-4 h-4 text-amber-600" />;
            case 'select': return <CheckSquare className="w-4 h-4 text-purple-600" />;
            case 'table_ref': return <Database className="w-4 h-4 text-cyan-600" />;
            case 'checkbox': return <CheckSquare className="w-4 h-4 text-teal-600" />;
            case 'radio': return <CheckSquare className="w-4 h-4 text-blue-500" />;
            case 'file': return <FileUp className="w-4 h-4 text-rose-600" />;
            case 'email': return <Mail className="w-4 h-4 text-sky-600" />;
            case 'tel': return <Phone className="w-4 h-4 text-green-600" />;
            case 'gps': return <MapPin className="w-4 h-4 text-red-600" />;
            case 'tag': return <Tag className="w-4 h-4 text-amber-600" />;
            default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    const getFieldTypeLabel = (type: FormField['type']) => {
        switch (type) {
            case 'text': return 'Texte court';
            case 'textarea': return 'Zone multiligne';
            case 'number': return 'Nombre / Valeur';
            case 'date': return 'Date';
            case 'datetime': return 'Date & Heure';
            case 'select': return 'Liste déroulante';
            case 'table_ref': return 'Table Référentielle';
            case 'checkbox': return 'Case à cocher';
            case 'radio': return 'Choix unique';
            case 'file': return 'Fichier / Justificatif';
            case 'email': return 'Adresse e-mail';
            case 'tel': return 'Téléphone';
            case 'gps': return 'Localisation GPS';
            case 'tag': return 'Habilitation requise';
            default: return type;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                        Chargement du Concepteur de Formulaires...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>Administration</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>Paramétrage Métier</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="font-semibold text-emerald-700">Concepteur de Formulaires</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                Concepteur de Formulaires & Saisie Dynamique
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                    Zero-Code Forms
                                </span>
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Conception des formulaires de demande, typage des données, liaison aux tables référentielles et test interactif.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Direct Shortcut to Workflows */}
                    <Link
                        to={selectedForm?.linked_process_id ? `/admin?processId=${selectedForm.linked_process_id}` : "/admin"}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Basculer vers l'éditeur de Workflows"
                    >
                        <GitFork className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gestion Workflows</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importer JSON</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau Formulaire</span>
                    </button>

                    <PageHelpButton
                        pageTitle="Aide - Concepteur de Formulaires"
                        description="Guide de création et configuration des formulaires de saisie dynamiques."
                        sections={helpSections}
                    />
                </div>
            </div>

            {/* Notification Feedback */}
            {feedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Main Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Formulaires List (Col 4) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col min-h-[600px]">
                    <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                                Formulaires Définis ({filteredFormulaires.length})
                            </span>
                            <button
                                type="button"
                                onClick={() => loadAllData()}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition"
                                title="Actualiser la liste"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Rechercher par libellé ou code..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-hidden"
                            />
                        </div>

                        {/* Category filter */}
                        <select
                            value={selectedCategoryId}
                            onChange={e => setSelectedCategoryId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                            className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs text-gray-700 outline-hidden"
                        >
                            <option value="ALL">Toutes les catégories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Form Items List */}
                    <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[680px]">
                        {filteredFormulaires.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 font-medium">Aucun formulaire trouvé</p>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
                                >
                                    + Créer un nouveau formulaire
                                </button>
                            </div>
                        ) : (
                            filteredFormulaires.map(form => {
                                const isSelected = selectedForm?.id === form.id;
                                const fieldsCount = form.fields?.length || 0;
                                const catName = categories.find(c => c.id === form.category_id)?.name || 'Général';
                                const linkedProc = processes.find(p => p.id === form.linked_process_id);

                                return (
                                    <div
                                        key={form.id}
                                        onClick={() => selectFormItem(form)}
                                        className={`p-3.5 transition cursor-pointer flex flex-col gap-1.5 ${isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                                    {form.code || form.id}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${form.status === 'Actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {form.status || 'Brouillon'}
                                                </span>
                                                {form.id === activeFormId && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                                        Actif Demandes
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1 shrink-0">
                                                <CheckSquare className="w-3 h-3 text-emerald-600" />
                                                {fieldsCount} champ{fieldsCount > 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <p className="text-xs font-bold text-gray-900 line-clamp-1">
                                            {form.name}
                                        </p>

                                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                                            <span className="truncate max-w-[140px] text-gray-500">
                                                {catName}
                                            </span>
                                            {linkedProc ? (
                                                <span className="text-blue-600 font-medium truncate max-w-[120px] flex items-center gap-1">
                                                    <GitFork className="w-2.5 h-2.5" />
                                                    {linkedProc.code || `WF-${linkedProc.id}`}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">Autonome</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Form Canvas & Inspector (Col 8) */}
                <div className="lg:col-span-8">
                    {selectedForm ? (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                            {/* Form Header */}
                            <div className="p-5 border-b border-gray-100 bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                                            {editForm.code || selectedForm.id}
                                        </span>
                                        <h2 className="text-base font-black text-gray-900">
                                            {editForm.name}
                                        </h2>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                            {editForm.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {editForm.description || "Aucune description renseignée pour ce formulaire."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                    {/* Définir comme formulaire actif pour Nouvelle Demande */}
                                    {activeFormId === selectedForm.id ? (
                                        <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600 shrink-0" />
                                            <span>Actif (Nouvelle Demande)</span>
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSetActiveForNouvelleDemande(selectedForm.id)}
                                            className="bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 hover:border-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                            title="Définir ce modèle comme formulaire actif pour les nouvelles demandes"
                                        >
                                            <Star className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Utiliser dans Nouvelle Demande</span>
                                        </button>
                                    )}

                                    <a
                                        href={`/?formId=${encodeURIComponent(selectedForm.id)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                        title="Ouvrir ce formulaire dans la création de Nouvelle Demande"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Tester dans Nouvelle Demande</span>
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                        title="Prévisualiser la saisie"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Tester la saisie
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportBlueprint}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg text-xs transition cursor-pointer"
                                        title="Télécharger le schéma JSON"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDuplicateForm}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg text-xs transition cursor-pointer"
                                        title="Dupliquer ce formulaire"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDeleteForm}
                                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg text-xs transition cursor-pointer"
                                        title="Supprimer ce formulaire"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveForm}
                                        disabled={saving}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex border-b border-gray-100 bg-white px-5 overflow-x-auto text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('fields')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'fields' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Concepteur de Champs
                                    <span className="ml-1 bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                        {editForm.fields.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('preview')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'preview' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Prévisualisation & Test Saisie
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('workflow')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'workflow' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <GitFork className="w-3.5 h-3.5" />
                                    Liaison Workflow
                                    {editForm.linked_process_id && (
                                        <span className="ml-1 bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                            Actif
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('blueprint')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'blueprint' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Schéma JSON
                                </button>
                            </div>

                            {/* Tab Contents */}
                            <div className="p-6">
                                {/* TAB 1: FIELDS BUILDER */}
                                {activeTab === 'fields' && (
                                    <div className="space-y-6">
                                        {/* General metadata quick edits */}
                                        <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <label className="block font-bold text-gray-700 mb-1">Nom du formulaire</label>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-gray-700 mb-1">Code technique</label>
                                                <input
                                                    type="text"
                                                    value={editForm.code}
                                                    onChange={e => setEditForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-gray-700 mb-1">Statut de publication</label>
                                                <select
                                                    value={editForm.status}
                                                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                                                >
                                                    <option value="Actif">Actif (En ligne)</option>
                                                    <option value="Brouillon">Brouillon</option>
                                                    <option value="Archivé">Archivé</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                    Champs du Formulaire ({editForm.fields.length})
                                                </span>
                                                <span className="text-[11px] text-gray-500">
                                                    (Glissez ou réordonnez pour définir la séquence de saisie)
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={openAddFieldModal}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Ajouter un champ
                                            </button>
                                        </div>

                                        {/* Fields List */}
                                        {editForm.fields.length === 0 ? (
                                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                <ClipboardList className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-gray-700">Aucun champ configuré</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Cliquez sur "Ajouter un champ" pour commencer à concevoir votre formulaire.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={openAddFieldModal}
                                                    className="mt-3 inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Ajouter le premier champ
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {editForm.fields.map((field, idx) => (
                                                    <div
                                                        key={`${field.id}_${idx}`}
                                                        className="p-3.5 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition flex items-center justify-between gap-3 shadow-2xs group"
                                                    >
                                                        {/* Reorder arrows */}
                                                        <div className="flex flex-col gap-0.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveField(idx, 'up')}
                                                                disabled={idx === 0}
                                                                className="text-gray-400 hover:text-emerald-700 disabled:opacity-20 p-0.5"
                                                                title="Monter ce champ"
                                                            >
                                                                <ArrowUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveField(idx, 'down')}
                                                                disabled={idx === editForm.fields.length - 1}
                                                                className="text-gray-400 hover:text-emerald-700 disabled:opacity-20 p-0.5"
                                                                title="Descendre ce champ"
                                                            >
                                                                <ArrowDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Type icon */}
                                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 shrink-0">
                                                            {getFieldTypeIcon(field.type)}
                                                        </div>

                                                        {/* Field Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-bold text-gray-900">
                                                                    {field.label}
                                                                </span>
                                                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                                                    id: {field.id}
                                                                </span>
                                                                {field.required ? (
                                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                                                        Obligatoire
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                                                        Facultatif
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                                                                <span>Type: <strong className="text-gray-700">{getFieldTypeLabel(field.type)}</strong></span>
                                                                {field.type === 'table_ref' && field.table_ref && (
                                                                    <span className="text-cyan-700 flex items-center gap-1 font-semibold">
                                                                        <Database className="w-3 h-3" />
                                                                        Table: {field.table_ref}
                                                                    </span>
                                                                )}
                                                                <span>Largeur: <strong className="text-gray-700">{field.col_span === 4 ? '1/3' : field.col_span === 6 ? '1/2' : 'Plein'}</strong></span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditFieldModal(idx)}
                                                                className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                                                title="Modifier ce champ"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDuplicateField(idx)}
                                                                className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                                                title="Dupliquer ce champ"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteField(idx)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                title="Supprimer ce champ"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: INTERACTIVE LIVE SANDBOX PREVIEW */}
                                {activeTab === 'preview' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-3">
                                            <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <h4 className="font-bold text-emerald-900">Bac à Sable & Test de Saisie en Direct</h4>
                                                <p className="text-emerald-700 mt-0.5">
                                                    Ce rendu reflète fidèlement l'expérience de l'agent lors du dépôt sur le portail. Testez la saisie des champs et vérifiez les validations obligatoires.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Rendered Form */}
                                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                {editForm.fields.map(field => {
                                                    const colSpanClass = field.col_span === 4
                                                        ? 'md:col-span-4'
                                                        : field.col_span === 6
                                                            ? 'md:col-span-6'
                                                            : 'md:col-span-12';

                                                    const errorMsg = sandboxErrors[field.id];

                                                    return (
                                                        <div key={field.id} className={`${colSpanClass} space-y-1.5`}>
                                                            <label className="block text-xs font-bold text-gray-800 flex items-center justify-between">
                                                                <span>
                                                                    {field.label}
                                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-gray-400 font-normal">
                                                                    {field.id}
                                                                </span>
                                                            </label>

                                                            {/* Input by type */}
                                                            {field.type === 'textarea' ? (
                                                                <textarea
                                                                    rows={3}
                                                                    placeholder={field.placeholder || "Saisissez votre commentaire..."}
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                />
                                                            ) : field.type === 'number' ? (
                                                                <input
                                                                    type="number"
                                                                    placeholder={field.placeholder || "0"}
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                />
                                                            ) : field.type === 'date' ? (
                                                                <input
                                                                    type="date"
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                />
                                                            ) : field.type === 'datetime' ? (
                                                                <input
                                                                    type="datetime-local"
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                />
                                                            ) : field.type === 'table_ref' ? (
                                                                <select
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                >
                                                                    <option value="">Sélectionner dans la table "{field.table_ref || 'référence'}"...</option>
                                                                    <option value="1">Site Mécatronique Paris-Austerlitz</option>
                                                                    <option value="2">Sous-station Haute Tension Lyon-Part-Dieu</option>
                                                                    <option value="3">Poste Aiguillage Marseille-Saint-Charles</option>
                                                                </select>
                                                            ) : field.type === 'select' ? (
                                                                <select
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                >
                                                                    <option value="">Sélectionner une option...</option>
                                                                    {(field.options || 'Option A,Option B,Option C').split(',').map((opt, oIdx) => (
                                                                        <option key={oIdx} value={opt.trim()}>{opt.trim()}</option>
                                                                    ))}
                                                                </select>
                                                            ) : field.type === 'checkbox' ? (
                                                                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!sandboxValues[field.id]}
                                                                        onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.checked }))}
                                                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                                                    />
                                                                    <span className="text-xs text-gray-700">{field.help_text || "Je confirme l'exactitude de ces informations."}</span>
                                                                </label>
                                                            ) : field.type === 'file' ? (
                                                                <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center bg-white hover:bg-gray-50 cursor-pointer">
                                                                    <FileUp className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                                                    <p className="text-xs font-semibold text-gray-700">Déposer le justificatif PDF ou cliquer pour parcourir</p>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">Taille maximale : 10 Mo</p>
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
                                                                    placeholder={field.placeholder || `Saisir ${field.label.toLowerCase()}...`}
                                                                    value={sandboxValues[field.id] || ''}
                                                                    onChange={e => setSandboxValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className={`w-full p-2.5 bg-white border rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 ${errorMsg ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                                                />
                                                            )}

                                                            {field.help_text && field.type !== 'checkbox' && (
                                                                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                                                    <HelpCircle className="w-3 h-3 text-gray-400 shrink-0" />
                                                                    {field.help_text}
                                                                </p>
                                                            )}

                                                            {errorMsg && (
                                                                <p className="text-[11px] text-red-600 font-medium">
                                                                    {errorMsg}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Validation Actions */}
                                            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSandboxValues({});
                                                        setSandboxErrors({});
                                                        setSandboxValidated(false);
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                                                >
                                                    Réinitialiser le test
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleTestValidation}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Tester la validation de saisie
                                                </button>
                                            </div>

                                            {sandboxValidated && (
                                                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${Object.keys(sandboxErrors).length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                    {Object.keys(sandboxErrors).length === 0 ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-emerald-700" />
                                                            Validation réussie ! Tous les champs obligatoires sont dûment renseignés.
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertTriangle className="w-4 h-4 text-red-700" />
                                                            Échec de validation : {Object.keys(sandboxErrors).length} champ(s) obligatoire(s) non rempli(s).
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Payload preview */}
                                        <div className="p-4 bg-gray-900 text-gray-200 rounded-xl text-xs font-mono">
                                            <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-2">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase">Données générées (JSON Payload)</span>
                                                <span className="text-[10px] text-emerald-400">Temps réel</span>
                                            </div>
                                            <pre className="overflow-x-auto max-h-40 text-[11px]">
                                                {JSON.stringify(sandboxValues, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: WORKFLOW ASSOCIATION */}
                                {activeTab === 'workflow' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 flex items-start gap-3">
                                            <GitFork className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <h4 className="font-bold text-blue-900">Liaison au Circuit de Validation (Workflow)</h4>
                                                <p className="text-blue-700 mt-0.5">
                                                    Associez ce formulaire à un Workflow d'instruction. Dès qu'un agent déposera cette demande, le circuit de validation désigné traitera le dossier.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-800 mb-1">
                                                    Workflow d'instruction associé
                                                </label>
                                                <select
                                                    value={editForm.linked_process_id || ''}
                                                    onChange={e => setEditForm(prev => ({
                                                        ...prev,
                                                        linked_process_id: e.target.value ? Number(e.target.value) : undefined
                                                    }))}
                                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-600"
                                                >
                                                    <option value="">-- Aucun (Formulaire Autonome Réutilisable) --</option>
                                                    {processes.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.code ? `[${p.code}] ` : ''}{p.name} ({p.stages?.length || 0} étapes de validation)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {editForm.linked_process_id && (
                                                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-gray-900">
                                                            Aperçu du Workflow Lié
                                                        </span>
                                                        <Link
                                                            to={`/admin?processId=${editForm.linked_process_id}`}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                        >
                                                            Ouvrir le Workflow dans l'Éditeur
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>

                                                    {(() => {
                                                        const p = processes.find(proc => proc.id === editForm.linked_process_id);
                                                        if (!p) return <p className="text-xs text-gray-500">Détails introuvables.</p>;
                                                        return (
                                                            <div className="space-y-2 text-xs">
                                                                <p className="text-gray-600">{p.description}</p>
                                                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                                                        {p.stages?.length || 0} jalons de validation
                                                                    </span>
                                                                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                                                        SLA : {p.workflow_rules?.sla_hours || 48}h
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: JSON SCHEMA BLUEPRINT */}
                                {activeTab === 'blueprint' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Définition Schéma JSON (Blueprint)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleExportBlueprint}
                                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Exporter le JSON
                                            </button>
                                        </div>

                                        <pre className="p-4 bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[500px]">
                                            {JSON.stringify({
                                                id: selectedForm.id,
                                                name: editForm.name,
                                                code: editForm.code,
                                                category_id: editForm.category_id,
                                                description: editForm.description,
                                                status: editForm.status,
                                                fields: editForm.fields,
                                                linked_tables: editForm.linked_tables,
                                                linked_process_id: editForm.linked_process_id
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
                            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-gray-800">Aucun formulaire sélectionné</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Choisissez un formulaire dans le panneau de gauche ou créez-en un nouveau.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                            >
                                + Créer un formulaire
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: ADD / EDIT FIELD */}
            {showFieldModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {editingFieldIndex !== null ? "Modifier le champ" : "Nouveau champ de saisie"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFieldModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveField} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Libellé affiché à l'agent *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Site d'intervention, Motif de la demande..."
                                    value={fieldFormData.label}
                                    onChange={e => setFieldFormData(prev => ({ ...prev, label: e.target.value }))}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Identifiant technique (id / clé JSON) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: site_id, motif_demande"
                                        value={fieldFormData.id}
                                        onChange={e => setFieldFormData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-hidden focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Type de contrôle *
                                    </label>
                                    <select
                                        value={fieldFormData.type}
                                        onChange={e => setFieldFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600 font-semibold"
                                    >
                                        <option value="text">Texte court (input text)</option>
                                        <option value="textarea">Zone de texte multiligne</option>
                                        <option value="number">Nombre numérique</option>
                                        <option value="table_ref">Sélecteur de Table Référentielle</option>
                                        <option value="select">Liste déroulante manuelle</option>
                                        <option value="checkbox">Case à cocher (engagement/accord)</option>
                                        <option value="radio">Choix unique (boutons radio)</option>
                                        <option value="date">Date seule</option>
                                        <option value="datetime">Date et Heure</option>
                                        <option value="file">Téléversement de pièce jointe (PDF)</option>
                                        <option value="email">Adresse e-mail</option>
                                        <option value="tel">Numéro de téléphone</option>
                                        <option value="gps">Coordonnées géographiques & GPS</option>
                                        <option value="tag">Habilitation requise / Tag spécial</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reference Table Selection if table_ref */}
                            {fieldFormData.type === 'table_ref' && (
                                <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-200">
                                    <label className="block font-bold text-cyan-900 mb-1 flex items-center gap-1.5">
                                        <Database className="w-3.5 h-3.5 text-cyan-700" />
                                        Table de Référence connectée *
                                    </label>
                                    <select
                                        value={fieldFormData.table_ref || ''}
                                        onChange={e => setFieldFormData(prev => ({ ...prev, table_ref: e.target.value }))}
                                        className="w-full p-2 bg-white border border-cyan-300 rounded-lg text-xs"
                                    >
                                        <option value="">Sélectionner une table...</option>
                                        {availableTables.map(t => (
                                            <option key={t.id || t.key} value={t.id || t.key}>
                                                {t.name || t.label} ({t.id || t.key})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-cyan-800 mt-1">
                                        Ce champ proposera automatiquement les valeurs dynamiques de la table sélectionnée.
                                    </p>
                                </div>
                            )}

                            {/* Options if manual select */}
                            {(fieldFormData.type === 'select' || fieldFormData.type === 'radio') && (
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Options de choix (séparées par des virgules)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Option 1, Option 2, Option 3"
                                        value={fieldFormData.options || ''}
                                        onChange={e => setFieldFormData(prev => ({ ...prev, options: e.target.value }))}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Placeholder (Indication de saisie)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Précisez le poste..."
                                        value={fieldFormData.placeholder || ''}
                                        onChange={e => setFieldFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Largeur dans la grille
                                    </label>
                                    <select
                                        value={fieldFormData.col_span || 12}
                                        onChange={e => setFieldFormData(prev => ({ ...prev, col_span: Number(e.target.value) as any }))}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
                                    >
                                        <option value={12}>Pleine largeur (100% - col 12)</option>
                                        <option value={6}>Moitié de largeur (50% - col 6)</option>
                                        <option value={4}>Un tiers de largeur (33% - col 4)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Texte d'aide / Info-bulle (Tooltip)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Indiquez le site conformément à votre ordre de mission"
                                    value={fieldFormData.help_text || ''}
                                    onChange={e => setFieldFormData(prev => ({ ...prev, help_text: e.target.value }))}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
                                />
                            </div>

                            {/* Required toggle */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-gray-900 block">Champ Obligatoire</span>
                                    <span className="text-[11px] text-gray-500">L'agent ne pourra pas soumettre la demande si ce champ est vide.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={!!fieldFormData.required}
                                    onChange={e => setFieldFormData(prev => ({ ...prev, required: e.target.checked }))}
                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFieldModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs"
                                >
                                    Valider le champ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE FORM */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900">Nouveau Formulaire de Saisie</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateForm} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nom du formulaire *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Demande d'Accès aux Emprises Ferroviaires"
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Code technique</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: FORM-EMPRISE"
                                        value={createCode}
                                        onChange={e => setCreateCode(e.target.value.toUpperCase())}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-hidden focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Catégorie de rattachement</label>
                                    <select
                                        value={createCategoryId}
                                        onChange={e => setCreateCategoryId(Number(e.target.value))}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-emerald-600"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Description / Objectif</label>
                                <textarea
                                    rows={2}
                                    placeholder="Précisez la finalité de ce formulaire..."
                                    value={createDescription}
                                    onChange={e => setCreateDescription(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Associer immédiatement à un Workflow (Optionnel)</label>
                                <select
                                    value={createLinkedProcessId || ''}
                                    onChange={e => setCreateLinkedProcessId(e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
                                >
                                    <option value="">-- Aucun (Créer comme formulaire autonome) --</option>
                                    {processes.map(p => (
                                        <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs"
                                >
                                    Créer le formulaire
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: IMPORT JSON BLUEPRINT */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900">Importer un Schéma de Formulaire JSON</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowImportModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-gray-600">
                                Collez ci-dessous le schéma JSON d'un formulaire pour l'importer dans l'éditeur en cours.
                            </p>
                            <textarea
                                rows={10}
                                placeholder='{\n  "name": "Formulaire Demande...",\n  "fields": [...]\n}'
                                value={importJsonText}
                                onChange={e => setImportJsonText(e.target.value)}
                                className="w-full p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-600"
                            />

                            {importError && (
                                <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-lg border border-red-200">
                                    {importError}
                                </p>
                            )}

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyImportJson}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs"
                                >
                                    Appliquer le schéma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
