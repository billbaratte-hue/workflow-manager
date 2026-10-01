import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getProcesses,
    createProcess,
    updateProcess,
    deleteProcess,
    duplicateProcess,
    importProcesses,
    exportAllProcesses,
    resetProcessesToBlank,
    getCategories,
    getReferenceTables,
    getRoles,
    getStatuses,
    exportProcessPackage,
    importProcessPackage
} from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import WorkflowStageConfigurator, {
    StageConfig,
    StageRule,
    StageNotificationItem,
    AppRole
} from '../components/WorkflowStageConfigurator';
import WorkflowVisualCanvas from '../components/WorkflowVisualCanvas';
import { WorkflowTransition, CustomStatusConfig } from '../types';
import {
    GitFork,
    Plus,
    Trash2,
    Check,
    ArrowRight,
    Clock,
    Shield,
    Database,
    ChevronUp,
    ChevronDown,
    Sliders,
    Bell,
    Sparkles,
    Eye,
    Copy,
    User,
    AlertTriangle,
    Search,
    Play,
    Zap,
    Download,
    Upload,
    RefreshCw,
    FileJson,
    FolderPlus,
    X,
    FileCheck,
    Tag,
    Layers,
    Info,
    ExternalLink,
    ClipboardList,
    Workflow as WorkflowIcon,
    Network,
    Move,
    GitBranch,
    CornerDownRight,
    GripVertical,
    Package
} from 'lucide-react';

interface ProcessField {
    id: string;
    label: string;
    type: string;
    table_ref?: string;
    options?: string;
    required?: boolean;
}

const DEFAULT_PROCESS_ROLES: AppRole[] = [
    { id: 1, name: 'Administrateur', description: 'Supervision globale et sécurité RBAC' },
    { id: 2, name: 'Manager', description: 'Validation hiérarchique N+1' },
    { id: 3, name: 'Validateur Site', description: 'Contrôle technique et de sûreté ferroviaire sur site' },
    { id: 4, name: 'Demandeur', description: 'Agent terrain créateur de demandes' },
    { id: 5, name: 'Responsable Sécurité', description: 'Contrôle habilitations et sûreté' }
];

interface ProcessItem {
    id: number;
    name: string;
    code?: string;
    category_id: number;
    description: string;
    status: string;
    stages: StageConfig[];
    transitions?: WorkflowTransition[];
    fields: ProcessField[];
    linked_tables?: string[];
    metadata?: Record<string, any>;
}

export default function AdminProcessus() {
    const navigate = useNavigate();
    const [processes, setProcesses] = useState<ProcessItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
    const [availableStatuses, setAvailableStatuses] = useState<CustomStatusConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');

    // Selected process being edited
    const [selectedProcess, setSelectedProcess] = useState<ProcessItem | null>(null);
    const [activeTab, setActiveTab] = useState<'visual' | 'pipeline' | 'transitions' | 'fields' | 'tables' | 'info' | 'blueprint'>('visual');
    const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
    const [draggedPillIndex, setDraggedPillIndex] = useState<number | null>(null);

    // Form state of selected process
    const [editForm, setEditForm] = useState<{
        name: string;
        code: string;
        description: string;
        category_id: number;
        status: string;
        stages: StageConfig[];
        transitions: WorkflowTransition[];
        fields: ProcessField[];
        linked_tables: string[];
    }>({
        name: '',
        code: '',
        description: '',
        category_id: 1,
        status: 'Publié',
        stages: [],
        transitions: [],
        fields: [],
        linked_tables: []
    });

    // Create workflow modal state (Blank Canvas)
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createCode, setCreateCode] = useState('');
    const [createCategoryId, setCreateCategoryId] = useState<number>(1);
    const [createDescription, setCreateDescription] = useState('');
    const [createInitialStageName, setCreateInitialStageName] = useState('Soumission Initiale');
    const [createInitialRole, setCreateInitialRole] = useState('Demandeur');

    // Field modal
    const [showFieldModal, setShowFieldModal] = useState(false);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [fieldForm, setFieldForm] = useState<ProcessField>({
        id: '',
        label: '',
        type: 'select',
        table_ref: 'sites',
        required: true
    });

    // Blueprint import / export modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJsonText, setImportJsonText] = useState('');
    const [importStatus, setImportStatus] = useState<string | null>(null);

    // Test simulator modal
    const [showTestModal, setShowTestModal] = useState(false);
    const [testDossierResult, setTestDossierResult] = useState<any | null>(null);
    const [instantiating, setInstantiating] = useState(false);

    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const validatorEligibleRoles = useMemo(() => {
        const rolesList = Array.isArray(availableRoles) ? availableRoles : DEFAULT_PROCESS_ROLES;
        return rolesList.filter(r => {
            const lower = (r?.name || '').trim().toLowerCase();
            return lower !== 'administrateur' && lower !== 'admin' && lower !== 'administrateur système' && !lower.startsWith('admin');
        });
    }, [availableRoles]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [procRes, catRes, tablesRes, rolesRes, statRes] = await Promise.all([
                getProcesses().catch(() => ({ data: [] })),
                getCategories().catch(() => ({ data: [] })),
                getReferenceTables().catch(() => ({ data: [] })),
                getRoles().catch(() => ({ data: [] })),
                getStatuses().catch(() => ({ data: [] }))
            ]);
            const procList = Array.isArray(procRes?.data) ? procRes.data : [];
            setProcesses(procList);
            setCategories(Array.isArray(catRes?.data) ? catRes.data : []);
            setAvailableTables(Array.isArray(tablesRes?.data) ? tablesRes.data : []);

            const fetchedRoles = Array.isArray(rolesRes?.data)
                ? rolesRes.data
                : (Array.isArray(rolesRes?.data?.roles) ? rolesRes.data.roles : []);
            setAvailableRoles(fetchedRoles.length > 0 ? fetchedRoles : DEFAULT_PROCESS_ROLES);

            const fetchedStatuses = Array.isArray(statRes?.data?.statuses)
                ? statRes.data.statuses
                : (Array.isArray(statRes?.data) ? statRes.data : []);
            setAvailableStatuses(fetchedStatuses);

            if (procList.length > 0 && !selectedProcess) {
                initSelectProcess(procList[0]);
            } else if (selectedProcess) {
                const refreshed = procList.find((p: any) => p.id === selectedProcess.id);
                if (refreshed) initSelectProcess(refreshed);
            }
        } catch (err: any) {
            console.error("Erreur chargement données:", err);
            showNotification('error', "Impossible de charger les workflows depuis le serveur.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const initSelectProcess = (proc: ProcessItem) => {
        setSelectedProcess(proc);
        setSelectedStageIndex(0);

        // Normalize stages with proper defaults for rules & notifications
        const normalizedStages: StageConfig[] = (proc.stages && proc.stages.length > 0 ? proc.stages : [
            {
                id: 's1',
                order: 1,
                name: 'Soumission & Contrôle Initial',
                status_key: 'SUBMITTED',
                validator_role: 'Demandeur',
                sla_hours: 12,
                fulfillment_mode: 'AUTO_WHEN_RULES_PASS',
                rules: [
                    {
                        id: 'r_init',
                        type: 'FORM_COMPLETION',
                        title: 'Complétion du Formulaire de Demande',
                        description: 'Exige que tous les champs obligatoires soient dûment complétés',
                        enabled: true,
                        require_all_required: true
                    }
                ],
                notifications: [
                    {
                        id: 'n_init',
                        trigger: 'ON_FULFILL',
                        name: 'Accusé de Réception',
                        recipient_type: 'DEMANDEUR',
                        subject: '[Dossier {reference}] Confirmation de soumission',
                        message: 'Bonjour {demandeur},\n\nVotre demande a été prise en compte avec succès.\nElle est en cours d\'instruction par le valideur.',
                        channel: 'BOTH',
                        enabled: true
                    }
                ]
            }
        ]).map((stg, idx) => ({
            ...stg,
            order: idx + 1,
            status_key: stg.status_key || `STATUS_STEP_${idx + 1}`,
            fulfillment_mode: stg.fulfillment_mode || 'MANUAL_APPROVAL',
            rules: Array.isArray(stg.rules) ? stg.rules : [],
            notifications: Array.isArray(stg.notifications) ? stg.notifications : []
        }));

        // Load existing transitions or generate linear sequence by default if stages exist
        const loadedTransitions: WorkflowTransition[] = (Array.isArray(proc.transitions) && proc.transitions.length > 0)
            ? proc.transitions
            : (normalizedStages.length >= 2
                ? normalizedStages.slice(0, -1).map((current, i) => ({
                    id: `trans_${current.id}_${normalizedStages[i + 1].id}`,
                    from_stage_id: current.id,
                    to_stage_id: normalizedStages[i + 1].id,
                    label: i === 0 ? 'Transmettre au Validateur' : 'Approuver et Passer au Jalon Suivant',
                    trigger_type: (i === 0 ? 'AUTO' : 'APPROVAL') as any,
                    button_label: i === 0 ? 'Soumettre' : 'Approuver',
                    button_color: 'emerald' as const,
                    requires_comment: false
                }))
                : []);

        setEditForm({
            name: proc.name || '',
            code: proc.code || `WF-${String(proc.id).padStart(2, '0')}`,
            description: proc.description || '',
            category_id: proc.category_id || 1,
            status: proc.status || 'Publié',
            stages: normalizedStages,
            transitions: loadedTransitions,
            fields: Array.isArray(proc.fields) ? [...proc.fields] : [
                { id: 'site_id', label: 'Site Ferroviaire Concerne', type: 'select', table_ref: 'sites', required: true },
                { id: 'motif_acces', label: 'Motif Détaillé de l\'Intervention', type: 'text', required: true }
            ],
            linked_tables: Array.isArray(proc.linked_tables) ? [...proc.linked_tables] : ['sites', 'equipments']
        });
    };

    // Filtered processes list
    const filteredProcesses = useMemo(() => {
        return processes.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCat = selectedCategoryId === 'ALL' || p.category_id === selectedCategoryId;
            return matchesSearch && matchesCat;
        });
    }, [processes, searchTerm, selectedCategoryId]);

    // Create a new blank workflow (Zero hardcoding)
    const handleCreateWorkflow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName.trim()) {
            showNotification('error', "Veuillez renseigner un nom de workflow.");
            return;
        }

        const autoCode = createCode.trim().toUpperCase() || `WF-${Date.now().toString().slice(-4)}`;
        const initialStages: StageConfig[] = [
            {
                id: `stg_${Date.now()}_1`,
                order: 1,
                name: createInitialStageName.trim() || 'Soumission Initiale',
                status_key: 'DEMANDE_SOUMISE',
                validator_role: createInitialRole || 'Demandeur',
                sla_hours: 24,
                fulfillment_mode: 'AUTO_WHEN_RULES_PASS',
                instruction: 'L\'agent doit renseigner l\'ensemble des informations requises pour instruire le dossier.',
                rules: [
                    {
                        id: `rule_init_${Date.now()}`,
                        type: 'FORM_COMPLETION',
                        title: 'Complétion des Champs Obligatoires',
                        description: 'Exige que tous les champs obligatoires du formulaire soient saisis',
                        enabled: true,
                        require_all_required: true
                    }
                ],
                notifications: [
                    {
                        id: `notif_init_${Date.now()}`,
                        trigger: 'ON_FULFILL',
                        name: 'Notification de Confirmation',
                        recipient_type: 'DEMANDEUR',
                        subject: '[Dossier {reference}] Demande transmise avec succès',
                        message: 'Bonjour {demandeur},\n\nVotre demande {reference} a bien été enregistrée et transmise pour instruction.',
                        channel: 'BOTH',
                        enabled: true
                    }
                ]
            }
        ];

        const newPayload = {
            name: createName.trim(),
            code: autoCode,
            category_id: createCategoryId,
            description: createDescription.trim(),
            status: 'Publié',
            stages: initialStages,
            fields: [
                { id: 'site_id', label: 'Site / Établissement', type: 'select', table_ref: 'sites', required: true },
                { id: 'justification', label: 'Justification de l\'accès', type: 'text', required: true }
            ],
            linked_tables: ['sites', 'equipments']
        };

        try {
            const res = await createProcess(newPayload);
            const created = res.data?.process || res.data;
            showNotification('success', `Workflow "${created.name}" créé avec succès.`);
            setShowCreateModal(false);
            setCreateName('');
            setCreateCode('');
            setCreateDescription('');
            await loadData();
            if (created) {
                initSelectProcess(created);
            }
        } catch (err: any) {
            showNotification('error', err.response?.data?.error || "Erreur lors de la création du workflow.");
        }
    };

    // Save current workflow configuration
    const handleSaveWorkflow = async () => {
        if (!selectedProcess) return;
        setSaving(true);
        try {
            await updateProcess(selectedProcess.id, {
                name: editForm.name,
                code: editForm.code,
                description: editForm.description,
                category_id: editForm.category_id,
                status: editForm.status,
                stages: editForm.stages,
                transitions: editForm.transitions || [],
                fields: editForm.fields,
                linked_tables: editForm.linked_tables
            });
            showNotification('success', `Configuration du workflow "${editForm.name}" enregistrée.`);
            await loadData();
        } catch (err: any) {
            showNotification('error', err.response?.data?.error || "Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    // Delete workflow
    const handleDeleteWorkflow = async () => {
        if (!selectedProcess) return;
        if (!window.confirm(`Confirmez-vous la suppression du workflow "${selectedProcess.name}" ?`)) return;
        try {
            await deleteProcess(selectedProcess.id);
            showNotification('success', `Workflow "${selectedProcess.name}" supprimé.`);
            setSelectedProcess(null);
            await loadData();
        } catch (err: any) {
            showNotification('error', "Erreur lors de la suppression.");
        }
    };

    // Duplicate workflow
    const handleDuplicateWorkflow = async () => {
        if (!selectedProcess) return;
        try {
            const res = await duplicateProcess(selectedProcess.id);
            const cloned = res.data?.process || res.data;
            showNotification('success', `Workflow dupliqué : "${cloned.name}".`);
            await loadData();
            if (cloned) initSelectProcess(cloned);
        } catch (err: any) {
            showNotification('error', "Erreur lors de la duplication.");
        }
    };

    // Stage updates
    const handleUpdateStage = (updatedStage: StageConfig) => {
        const newStages = editForm.stages.map((stg, idx) => idx === selectedStageIndex ? updatedStage : stg);
        setEditForm({
            ...editForm,
            stages: newStages
        });
    };

    const handleAddStage = () => {
        const nextOrder = editForm.stages.length + 1;
        const newStage: StageConfig = {
            id: `stg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            order: nextOrder,
            name: `Étape #${nextOrder} : Contrôle & Validation`,
            status_key: `STATUT_ETAPE_${nextOrder}`,
            validator_role: validatorEligibleRoles[0]?.name || 'Manager',
            sla_hours: 24,
            fulfillment_mode: 'MANUAL_APPROVAL',
            instruction: 'Vérifier la conformité de la demande et approuver.',
            rules: [],
            notifications: [
                {
                    id: `notif_${Date.now()}`,
                    trigger: 'ON_ENTER',
                    name: `Alerte assignation Étape ${nextOrder}`,
                    recipient_type: 'CURRENT_VALIDATOR',
                    subject: `[Dossier {reference}] Validation requise : Étape #${nextOrder}`,
                    message: `Bonjour,\n\nLe dossier {reference} est arrivé à votre étape pour instruction. Merci de le traiter dans le délai imparti.`,
                    channel: 'BOTH',
                    enabled: true
                }
            ]
        };

        const newStages = [...editForm.stages, newStage];
        setEditForm({
            ...editForm,
            stages: newStages
        });
        setSelectedStageIndex(newStages.length - 1);
        showNotification('success', `Étape #${nextOrder} ajoutée au pipeline.`);
    };

    const handleDeleteStage = (index: number) => {
        if (editForm.stages.length <= 1) {
            showNotification('error', "Un workflow doit comporter au moins un statut / étape.");
            return;
        }
        const updated = editForm.stages.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, order: idx + 1 }));
        setEditForm({
            ...editForm,
            stages: updated
        });
        setSelectedStageIndex(Math.max(0, index - 1));
    };

    const handleMoveStage = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= editForm.stages.length) return;

        const newStages = [...editForm.stages];
        const temp = newStages[index];
        newStages[index] = newStages[targetIndex];
        newStages[targetIndex] = temp;

        const reordered = newStages.map((s, idx) => ({ ...s, order: idx + 1 }));
        setEditForm({
            ...editForm,
            stages: reordered
        });
        setSelectedStageIndex(targetIndex);
    };

    // Horizontal stage pill Drag and Drop reordering
    const handlePillDragStart = (e: React.DragEvent, index: number) => {
        setDraggedPillIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handlePillDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePillDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedPillIndex === null || draggedPillIndex === targetIndex) return;
        const newStages = [...editForm.stages];
        const [moved] = newStages.splice(draggedPillIndex, 1);
        newStages.splice(targetIndex, 0, moved);
        const reordered = newStages.map((s, idx) => ({ ...s, order: idx + 1 }));
        setEditForm({
            ...editForm,
            stages: reordered
        });
        setSelectedStageIndex(targetIndex);
        setDraggedPillIndex(null);
        showNotification('success', `Étape repositionnée à la position #${targetIndex + 1}.`);
    };

    const handleDeleteTransition = (transitionId: string) => {
        setEditForm({
            ...editForm,
            transitions: (editForm.transitions || []).filter(t => t.id !== transitionId)
        });
        showNotification('success', "Transition supprimée.");
    };

    // Fields Management
    const handleSaveField = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fieldForm.label.trim()) {
            showNotification('error', "Le libellé du champ est obligatoire.");
            return;
        }
        const autoId = fieldForm.id.trim() || fieldForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const updatedFields = [...editForm.fields];
        if (editingFieldIndex !== null) {
            updatedFields[editingFieldIndex] = { ...fieldForm, id: autoId };
        } else {
            updatedFields.push({ ...fieldForm, id: autoId });
        }

        setEditForm({
            ...editForm,
            fields: updatedFields
        });
        setShowFieldModal(false);
        setEditingFieldIndex(null);
        setFieldForm({ id: '', label: '', type: 'text', required: true });
    };

    const handleDeleteField = (index: number) => {
        const updated = editForm.fields.filter((_, idx) => idx !== index);
        setEditForm({
            ...editForm,
            fields: updated
        });
    };

    // Live Test Simulator: create a test dossier in the State Machine store
    const handleLaunchTestSimulator = async () => {
        if (!selectedProcess) return;
        setInstantiating(true);
        setTestDossierResult(null);
        try {
            const firstStage = editForm.stages[0];
            const testPayload = {
                request_type: editForm.code || `WF-${selectedProcess.id}`,
                title: `[Test Live] Dossier instancié pour ${editForm.name}`,
                description: `Test d'exécution des règles et notifications pour le workflow "${editForm.name}".`,
                requester_id: 1,
                requester_name: 'Admin Système',
                requester_role: 'Administrateur',
                status: firstStage?.status_key || 'DEMANDE_SOUMISE',
                workflow_code: editForm.code,
                workflow_name: editForm.name,
                stages: editForm.stages,
                items: [
                    {
                        item_type: 'CUSTOM_WORKFLOW_ITEM',
                        status: 'PENDING_VAL_PARALLEL',
                        hardware_origin: 'NEW_ORDER',
                        site_name: 'Paris Gare du Nord (Site Ferroviaire)',
                        zone_or_equipment: 'Zone Sécurisée Nord'
                    }
                ]
            };

            const response = await fetch('/api/v1/workflow/dossiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erreur lors de la création du dossier');
            }

            const data = await response.json();
            setTestDossierResult(data.dossier || data);
            showNotification('success', `Dossier de test créé avec succès dans la machine à états !`);
        } catch (err: any) {
            showNotification('error', err.message || "Impossible d'instancier le dossier de test.");
        } finally {
            setInstantiating(false);
        }
    };

    // Export JSON Blueprint (Standard)
    const handleExportBlueprint = () => {
        const blueprint = {
            name: editForm.name,
            code: editForm.code,
            description: editForm.description,
            category_id: editForm.category_id,
            status: editForm.status,
            stages: editForm.stages,
            transitions: editForm.transitions || [],
            fields: editForm.fields,
            linked_tables: editForm.linked_tables,
            exported_at: new Date().toISOString(),
            schema_version: '2.0-dynamic'
        };

        const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${(editForm.code || 'export').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('success', "Blueprint JSON téléchargé.");
    };

    // Export Full Process Package (Processus + Formulaire dynamique + Règles métier + SHA-256)
    const handleExportPackage = async () => {
        if (!selectedProcess) return;
        try {
            const res = await exportProcessPackage(selectedProcess.id);
            const pkg = res.data;
            const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `process-package-${(editForm.code || selectedProcess.name).toLowerCase().replace(/\s+/g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('success', `Package complet exporté avec succès (ID: ${pkg.manifest?.packageId || selectedProcess.id}).`);
        } catch (err: any) {
            showNotification('error', `Erreur lors de l'export du package : ${err.message}`);
        }
    };

    // Import JSON Blueprint or Complete Process Package
    const handleImportBlueprint = async () => {
        try {
            const parsed = JSON.parse(importJsonText);
            setImportStatus('Traitement de l\'importation en cours...');
            if (parsed.manifest && parsed.process) {
                // Detected Full Process Package
                const res = await importProcessPackage(parsed);
                showNotification('success', `Package complet importé : "${res.data.processName}" (${res.data.stagesCount} étapes, ${res.data.fieldsCount} champs, ${res.data.rulesCount} règles).`);
            } else {
                // Blueprint or standard process export
                await importProcesses(parsed);
                showNotification('success', "Blueprint JSON importé avec succès.");
            }
            setShowImportModal(false);
            setImportJsonText('');
            setImportStatus(null);
            await loadData();
        } catch (err: any) {
            setImportStatus(`Erreur : ${err.message || 'Format JSON invalide'}`);
        }
    };

    const selectedStage = editForm.stages[selectedStageIndex] || editForm.stages[0];

    const helpSections: HelpSection[] = [
        {
            title: "Architecture des Workflows Dynamiques (Sans Codage)",
            description: "Cette interface permet de concevoir l'intégralité des circuits de validation de bout en bout sans aucune dépendance en dur : chaque statut possède son propre configurateur d'accomplissement (Fulfill) et son gestionnaire de notifications."
        },
        {
            title: "Règles d'Accomplissement d'un Statut (Fulfill)",
            description: "Pour chaque étape, l'administrateur peut ajouter 8 types de règles métier : complétion du formulaire, vérification d'une valeur de champ (seuil, condition), contrôle de quota (par agent ou site), conformité RGPD, tag spécial d'habilitation, présence GPS terrain, ou émargement / signature."
        },
        {
            title: "Notifications Déclenchées par Statut",
            description: "Configurez directement les alertes transmises à l'entrée dans le statut, dès que celui-ci est validé / fulfill, en cas de refus ou de dépassement SLA, avec sélection des destinataires et canaux (In-App, Email)."
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                            <GitFork className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">
                                Gestionnaire de Workflows Dynamiques
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Définition intégrale des statuts, étapes de validation, règles métier et notifications sans code en dur.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to={selectedProcess ? `/admin/formulaires?processId=${selectedProcess.id}` : "/admin/formulaires"}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        title="Accéder au Concepteur de Formulaires dédié"
                    >
                        <ClipboardList className="w-4 h-4 text-emerald-600" />
                        <span>Concepteur Formulaires</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau Workflow Vierge
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Importer un Blueprint JSON déclaratif"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Importer JSON
                    </button>

                    <PageHelpButton
                        pageTitle="Aide - Workflows & Règles Métiers"
                        description="Guide d'administration et configuration des circuits de validation et règles d'accomplissement."
                        sections={helpSections}
                    />
                </div>
            </div>

            {/* Notification Banner */}
            {feedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Main Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Workflows List (Col 4) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col min-h-[600px]">
                    <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                Workflows Disponibles ({filteredProcesses.length})
                            </span>
                            <button
                                type="button"
                                onClick={() => loadData()}
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
                                placeholder="Rechercher par nom ou code..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
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

                    {/* Workflow Items */}
                    <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[680px]">
                        {filteredProcesses.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <GitFork className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 font-medium">Aucun workflow trouvé</p>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                                >
                                    + Créer un nouveau workflow
                                </button>
                            </div>
                        ) : (
                            filteredProcesses.map(proc => {
                                const isSelected = selectedProcess?.id === proc.id;
                                const stagesCount = proc.stages?.length || 0;
                                const catName = categories.find(c => c.id === proc.category_id)?.name || 'Général';

                                return (
                                    <div
                                        key={proc.id}
                                        onClick={() => initSelectProcess(proc)}
                                        className={`p-3.5 transition cursor-pointer flex flex-col gap-1.5 ${isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                                    {proc.code || `WF-${proc.id}`}
                                                </span>
                                                <h3 className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                                    {proc.name}
                                                </h3>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${proc.status === 'Publié' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                                                {proc.status}
                                            </span>
                                        </div>

                                        {proc.description && (
                                            <p className="text-[11px] text-gray-500 line-clamp-1">
                                                {proc.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                {catName}
                                            </span>
                                            <span className="font-semibold text-blue-700">
                                                {stagesCount} étape{stagesCount > 1 ? 's' : ''} / statut{stagesCount > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Workflow Workspace (Col 8) */}
                <div className="lg:col-span-8 space-y-4">
                    {selectedProcess ? (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                            {/* Workflow Header Banner */}
                            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                                            {editForm.code || `WF-${selectedProcess.id}`}
                                        </span>
                                        <h2 className="text-base font-black text-gray-900">
                                            {editForm.name}
                                        </h2>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                            {editForm.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {editForm.description || "Aucune description renseignée pour ce workflow."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        to={`/admin/processus/${selectedProcess.id}/studio`}
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                                        title="Ouvrir l'espace de modélisation dans une nouvelle page pour voir en grand"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Studio Pleine Page</span>
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => setShowTestModal(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                                        title="Tester ce workflow en direct dans la machine à états"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                        Tester le Workflow
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportPackage}
                                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                                        title="Exporter le Package Complet (Processus, Formulaire et Règles Métier avec empreinte SHA-256)"
                                    >
                                        <Package className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Export Package</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportBlueprint}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg text-xs transition cursor-pointer"
                                        title="Télécharger le Blueprint JSON standard"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDuplicateWorkflow}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg text-xs transition cursor-pointer"
                                        title="Dupliquer ce workflow"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDeleteWorkflow}
                                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg text-xs transition cursor-pointer"
                                        title="Supprimer ce workflow"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveWorkflow}
                                        disabled={saving}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
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
                                    onClick={() => setActiveTab('visual')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'visual' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <WorkflowIcon className="w-3.5 h-3.5" />
                                    Concepteur Visuel (Drag & Drop)
                                    <span className="ml-1 bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                        {editForm.stages.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('pipeline')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'pipeline' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Sliders className="w-3.5 h-3.5" />
                                    Configurateur d'Étapes & Règles
                                    <span className="ml-1 bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full">
                                        {editForm.stages.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('transitions')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'transitions' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <GitBranch className="w-3.5 h-3.5" />
                                    Matrice des Transitions
                                    <span className="ml-1 bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                        {editForm.transitions?.length || 0}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('fields')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'fields' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <FileCheck className="w-3.5 h-3.5" />
                                    Formulaire de Demande
                                    <span className="ml-1 bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full">
                                        {editForm.fields.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('tables')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'tables' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Database className="w-3.5 h-3.5" />
                                    Tables Référentielles
                                    <span className="ml-1 bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full">
                                        {editForm.linked_tables.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('info')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'info' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Info className="w-3.5 h-3.5" />
                                    Paramètres Généraux
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('blueprint')}
                                    className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'blueprint' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                >
                                    <FileJson className="w-3.5 h-3.5" />
                                    Blueprint JSON
                                </button>
                            </div>

                            {/* Tab 0: Visual Drag and Drop Workflow Canvas (PRIMARY VIEW) */}
                            {activeTab === 'visual' && (
                                <div className="p-5 space-y-4">
                                    {/* Action Banner */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                                                <WorkflowIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-2">
                                                    Concepteur Visuel Drag & Drop de Workflows
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-bold">
                                                        Zero-Code • Machine à États
                                                    </span>
                                                </h4>
                                                <p className="text-[11px] text-blue-800/80">
                                                    Glissez-déposez des statuts/étapes, repositionnez les nœuds librement sur le canevas infini, tracez des transitions interactives et configurez leurs règles de franchissement.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/admin/processus/${selectedProcess.id}/studio`}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                                title="Ouvrir l'espace de modélisation dans une nouvelle page dédiée pour voir en grand"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span>Ouvrir en Pleine Page</span>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('pipeline')}
                                                className="bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                                            >
                                                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                                                Vue Règles Détaillées
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLaunchTestSimulator}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                            >
                                                <Play className="w-3.5 h-3.5 text-indigo-200" />
                                                Tester dans le Simulateur
                                            </button>
                                        </div>
                                    </div>

                                    {/* Visual Workflow Canvas Component */}
                                    <WorkflowVisualCanvas
                                        stages={editForm.stages}
                                        transitions={editForm.transitions || []}
                                        availableRoles={validatorEligibleRoles}
                                        availableFields={editForm.fields}
                                        availableStatuses={availableStatuses}
                                        onUpdateStages={(newStages) => {
                                            setEditForm(prev => ({
                                                ...prev,
                                                stages: newStages
                                            }));
                                        }}
                                        onUpdateTransitions={(newTransitions) => {
                                            setEditForm(prev => ({
                                                ...prev,
                                                transitions: newTransitions
                                            }));
                                        }}
                                        onSelectStageForDeepConfig={(stageIndex) => {
                                            setSelectedStageIndex(stageIndex);
                                            setActiveTab('pipeline');
                                        }}
                                        onLaunchTestSimulator={handleLaunchTestSimulator}
                                        onOpenDedicatedPage={() => {
                                            navigate(`/admin/processus/${selectedProcess.id}/studio`);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Tab 1: Pipeline of Stages, Rules & Notifications */}
                            {activeTab === 'pipeline' && (
                                <div className="p-5 space-y-6">
                                    {/* Switch back to visual banner */}
                                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 text-blue-900 font-medium">
                                            <WorkflowIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                            <span>Préférez une vue graphique ? Vous pouvez concevoir l'ensemble des liaisons et étapes directement sur le canevas.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('visual')}
                                            className="bg-white hover:bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200 text-xs shrink-0 transition cursor-pointer shadow-2xs"
                                        >
                                            Ouvrir le Concepteur Visuel →
                                        </button>
                                    </div>

                                    {/* Horizontal / Sequential Pipeline Bar with Drag and Drop */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                                                    Séquence des Statuts du Workflow
                                                </div>
                                                <div className="text-[11px] text-gray-500">
                                                    Glissez-déposez les pastilles ci-dessous pour réorganiser l'ordre séquentiel.
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddStage}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Ajouter une Étape / Statut
                                            </button>
                                        </div>

                                        {/* Stages pills with drag and drop */}
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                            {editForm.stages.map((stg, idx) => {
                                                const isActive = idx === selectedStageIndex;
                                                const rulesCount = stg.rules?.filter(r => r.enabled).length || 0;
                                                const notifsCount = stg.notifications?.filter(n => n.enabled).length || 0;

                                                return (
                                                    <div
                                                        key={stg.id || idx}
                                                        draggable
                                                        onDragStart={e => handlePillDragStart(e, idx)}
                                                        onDragOver={e => handlePillDragOver(e, idx)}
                                                        onDrop={e => handlePillDrop(e, idx)}
                                                        onClick={() => setSelectedStageIndex(idx)}
                                                        className={`p-3 rounded-xl border transition cursor-grab active:cursor-grabbing shrink-0 min-w-[210px] flex flex-col gap-1.5 select-none ${isActive ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20' : 'bg-white/80 border-gray-200 hover:bg-white'} ${draggedPillIndex === idx ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <GripVertical className="w-3 h-3 text-gray-300" />
                                                                <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-900 truncate max-w-[110px]">
                                                                    {stg.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {idx > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'up'); }}
                                                                        className="text-gray-400 hover:text-gray-600 p-0.5"
                                                                        title="Déplacer vers la gauche"
                                                                    >
                                                                        <ChevronUp className="w-3 h-3 -rotate-90" />
                                                                    </button>
                                                                )}
                                                                {idx < editForm.stages.length - 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'down'); }}
                                                                        className="text-gray-400 hover:text-gray-600 p-0.5"
                                                                        title="Déplacer vers la droite"
                                                                    >
                                                                        <ChevronDown className="w-3 h-3 -rotate-90" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                                                            <span className="font-semibold text-blue-700 truncate max-w-[90px]">
                                                                {stg.validator_role}
                                                            </span>
                                                            <span className="font-mono text-gray-400">
                                                                {stg.sla_hours || 24}h SLA
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[9px] pt-0.5">
                                                            <span className={`px-1.5 py-0.2 rounded font-bold ${rulesCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500'}`}>
                                                                {rulesCount} règle{rulesCount > 1 ? 's' : ''}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded font-bold ${notifsCount > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-500'}`}>
                                                                {notifsCount} notif{notifsCount > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Bar for currently selected stage */}
                                    {selectedStage && (
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-900">
                                                    Étape sélectionnée : <strong>#{selectedStage.order} - {selectedStage.name}</strong>
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteStage(selectedStageIndex)}
                                                    className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Supprimer cette étape
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Embedded Deep Configurator Component */}
                                    {selectedStage && (
                                        <WorkflowStageConfigurator
                                            stage={selectedStage}
                                            availableRoles={validatorEligibleRoles}
                                            availableFields={editForm.fields}
                                            onUpdateStage={handleUpdateStage}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Tab: Matrix of Transitions */}
                            {activeTab === 'transitions' && (
                                <div className="p-5 space-y-6">
                                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                                                <GitBranch className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-purple-900 flex items-center gap-2">
                                                    Matrice des Transitions & Règles de Franchissement
                                                    <span className="text-[10px] px-2 py-0.5 bg-purple-200 text-purple-900 rounded-full font-bold">
                                                        {(editForm.transitions || []).length} Transition{(editForm.transitions || []).length > 1 ? 's' : ''}
                                                    </span>
                                                </h4>
                                                <p className="text-[11px] text-purple-800/80 mt-0.5">
                                                    Définissez les chemins autorisés entre statuts, les types d'actions (approbation, renvoi, rejet, automatique) et les conditions associées.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link
                                                to="/admin/statuts?tab=matrix"
                                                className="bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                                                title="Ouvrir la Grille Matricielle Bidimensionnelle Globale"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                                                <span>Grille Matricielle 2D Globale</span>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('visual')}
                                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                            >
                                                <WorkflowIcon className="w-3.5 h-3.5" />
                                                Éditer Visuellement dans le Canevas
                                            </button>
                                        </div>
                                    </div>

                                    {/* Transitions List */}
                                    {(editForm.transitions || []).length === 0 ? (
                                        <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                                                <GitBranch className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-800">Aucune transition configurée</h4>
                                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                                                Les transitions relient vos statuts pour guider les dossiers selon le modèle de machine à états finis.
                                            </p>
                                            <div className="flex items-center justify-center gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('visual')}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <WorkflowIcon className="w-4 h-4" />
                                                    Tracer sur le Concepteur Visuel
                                                </button>
                                                {editForm.stages.length >= 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const gen: WorkflowTransition[] = editForm.stages.slice(0, -1).map((current, i) => ({
                                                                id: `trans_${current.id}_${editForm.stages[i + 1].id}`,
                                                                from_stage_id: current.id,
                                                                to_stage_id: editForm.stages[i + 1].id,
                                                                label: i === 0 ? 'Transmettre au Validateur' : 'Approuver et Passer au Jalon Suivant',
                                                                trigger_type: (i === 0 ? 'AUTO' : 'APPROVAL') as any,
                                                                button_label: i === 0 ? 'Soumettre' : 'Approuver',
                                                                button_color: 'emerald' as const,
                                                                requires_comment: false
                                                            }));
                                                            setEditForm({
                                                                ...editForm,
                                                                transitions: gen
                                                            });
                                                            showNotification('success', `${gen.length} transitions séquentielles générées.`);
                                                        }}
                                                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                                                    >
                                                        Générer les transitions par défaut
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(editForm.transitions || []).map((trans, idx) => {
                                                const fromStage = editForm.stages.find(s => s.id === trans.from_stage_id);
                                                const toStage = editForm.stages.find(s => s.id === trans.to_stage_id);

                                                return (
                                                    <div
                                                        key={trans.id || idx}
                                                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold">
                                                                    #{idx + 1}
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-900">
                                                                    {trans.label || 'Transition'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTransition(trans.id)}
                                                                className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                                                                title="Supprimer la transition"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* From -> To Pipeline Flow */}
                                                        <div className="flex items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                                                            <div className="truncate">
                                                                <div className="text-[10px] text-gray-400 font-medium">De</div>
                                                                <div className="font-bold text-gray-900 truncate">
                                                                    {fromStage?.name || trans.from_stage_id}
                                                                </div>
                                                                <div className="text-[10px] font-mono text-gray-500">
                                                                    {fromStage?.status_key || ''}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center shrink-0 px-2">
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                                                    trans.trigger_type === 'APPROVAL' ? 'bg-emerald-100 text-emerald-800' :
                                                                    trans.trigger_type === 'REJECTION' ? 'bg-rose-100 text-rose-800' :
                                                                    trans.trigger_type === 'RETURN' ? 'bg-amber-100 text-amber-800' :
                                                                    trans.trigger_type === 'AUTO' ? 'bg-blue-100 text-blue-800' :
                                                                    trans.trigger_type === 'CONDITIONAL' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-slate-100 text-slate-800'
                                                                }`}>
                                                                    {trans.trigger_type}
                                                                </span>
                                                                <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5" />
                                                            </div>

                                                            <div className="truncate text-right">
                                                                <div className="text-[10px] text-gray-400 font-medium">Vers</div>
                                                                <div className="font-bold text-gray-900 truncate">
                                                                    {toStage?.name || trans.to_stage_id}
                                                                </div>
                                                                <div className="text-[10px] font-mono text-gray-500">
                                                                    {toStage?.status_key || ''}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Button Details */}
                                                        <div className="flex items-center justify-between text-xs pt-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[11px] text-gray-500">Bouton :</span>
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs ${
                                                                    trans.button_color === 'emerald' ? 'bg-emerald-600' :
                                                                    trans.button_color === 'rose' ? 'bg-rose-600' :
                                                                    trans.button_color === 'amber' ? 'bg-amber-600' :
                                                                    trans.button_color === 'indigo' ? 'bg-indigo-600' :
                                                                    trans.button_color === 'slate' ? 'bg-slate-700' :
                                                                    'bg-blue-600'
                                                                }`}>
                                                                    {trans.button_label || 'Actionner'}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                {trans.requires_comment && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                                                                        Commentaire requis
                                                                    </span>
                                                                )}
                                                                {trans.requires_attachment && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                                                                        PJ requise
                                                                    </span>
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

                            {/* Tab 2: Fields of the request form */}
                            {activeTab === 'fields' && (
                                <div className="p-5 space-y-4">
                                    {/* Architecture Decoupling Banner */}
                                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-emerald-200 text-emerald-700 shadow-2xs shrink-0">
                                                <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                                                    Architecture Découplée : Formulaires & Workflows
                                                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                                        Zero-Code
                                                    </span>
                                                </h4>
                                                <p className="text-[11px] text-emerald-700 mt-0.5">
                                                    Les champs ci-dessous alimentent les règles métier de ce workflow. Vous pouvez également concevoir et tester ce formulaire en direct dans le Concepteur dédié.
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to={selectedProcess ? `/admin/formulaires?processId=${selectedProcess.id}` : "/admin/formulaires"}
                                            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
                                        >
                                            <span>Concepteur Formulaire</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">
                                                Champs Métiers du Formulaire de Demande
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Définissez les questions et saisies requises auprès du demandeur. Ces champs sont ensuite utilisables dans les règles de validation.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingFieldIndex(null);
                                                setFieldForm({ id: '', label: '', type: 'text', required: true });
                                                setShowFieldModal(true);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Ajouter un Champ
                                        </button>
                                    </div>

                                    {editForm.fields.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <FileCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-xs text-gray-600 font-medium">Aucun champ configuré pour ce formulaire.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                            {editForm.fields.map((fld, idx) => (
                                                <div key={fld.id || idx} className="p-3.5 bg-white flex items-center justify-between hover:bg-gray-50 transition text-xs">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900">{fld.label}</span>
                                                            <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                                                {fld.id}
                                                            </span>
                                                            {fld.required && (
                                                                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                                                                    Obligatoire
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                                            <span>Type : <strong>{fld.type}</strong></span>
                                                            {fld.table_ref && <span>Table liée : <strong>{fld.table_ref}</strong></span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingFieldIndex(idx);
                                                                setFieldForm({ ...fld });
                                                                setShowFieldModal(true);
                                                            }}
                                                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition cursor-pointer"
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteField(idx)}
                                                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
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

                            {/* Tab 3: Linked Reference Tables */}
                            {activeTab === 'tables' && (
                                <div className="p-5 space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">
                                            Tables Référentielles Associées au Workflow
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Cochez les tables de référence (sites, matériels, organisations...) exploitées par ce processus.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableTables.map((tbl: any) => {
                                            const isChecked = editForm.linked_tables.includes(tbl.id);
                                            return (
                                                <label
                                                    key={tbl.id}
                                                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${isChecked ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <div>
                                                        <div className="text-xs font-bold">{tbl.name}</div>
                                                        <div className="text-[10px] font-mono text-gray-500">{tbl.id}</div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={e => {
                                                            const newTables = e.target.checked
                                                                ? [...editForm.linked_tables, tbl.id]
                                                                : editForm.linked_tables.filter(id => id !== tbl.id);
                                                            setEditForm({ ...editForm, linked_tables: newTables });
                                                        }}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: General Settings (NO "type de demande opérationnelle") */}
                            {activeTab === 'info' && (
                                <div className="p-5 space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">
                                            Paramètres Généraux du Workflow
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Identifiant, intitulé et description de la procédure opérationnelle.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Nom du Workflow *</label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Code / Identifiant Court</label>
                                            <input
                                                type="text"
                                                value={editForm.code}
                                                onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 font-mono text-gray-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Catégorie</label>
                                            <select
                                                value={editForm.category_id}
                                                onChange={e => setEditForm({ ...editForm, category_id: parseInt(e.target.value) || 1 })}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            >
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-gray-700 mb-1">Statut du Workflow</label>
                                            <select
                                                value={editForm.status}
                                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-600 outline-hidden font-semibold"
                                            >
                                                <option value="Publié">Publié (Actif pour les agents)</option>
                                                <option value="Brouillon">Brouillon (En cours d'édition)</option>
                                                <option value="Archivé">Archivé</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block font-semibold text-gray-700 mb-1">Description & Consignes d'Accès</label>
                                            <textarea
                                                rows={3}
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 5: Declarative JSON Blueprint */}
                            {activeTab === 'blueprint' && (
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">
                                                Blueprint JSON Déclaratif
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Définition complète du workflow, de ses statuts, règles d'accomplissement et notifications.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(editForm, null, 2));
                                                showNotification('success', "JSON copié dans le presse-papier.");
                                            }}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            Copier le JSON
                                        </button>
                                    </div>

                                    <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[500px]">
                                        {JSON.stringify(editForm, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
                            <GitFork className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-900">Aucun Workflow Sélectionné</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                Sélectionnez un workflow dans la liste à gauche ou créez-en un nouveau depuis un canvas blanc pour configurer ses statuts, règles et notifications.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Créer un Nouveau Workflow
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Create Workflow (Blank Canvas - Zero Hardcoding) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900">
                                        Nouveau Workflow Vierge
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Configuration dynamique sans modèle prédéfini
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-base font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateWorkflow} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nom du Workflow <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                    placeholder="ex: Attribution de Clé Mécatronique ou Accès Haute Tension"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Code Court / Identifiant
                                    </label>
                                    <input
                                        type="text"
                                        value={createCode}
                                        onChange={e => setCreateCode(e.target.value.toUpperCase())}
                                        placeholder="ex: WF-CLE-01"
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Catégorie
                                    </label>
                                    <select
                                        value={createCategoryId}
                                        onChange={e => setCreateCategoryId(Number(e.target.value))}
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Description & Finalité Métier
                                </label>
                                <textarea
                                    rows={2}
                                    value={createDescription}
                                    onChange={e => setCreateDescription(e.target.value)}
                                    placeholder="Détaillez le cadre et les critères d'application..."
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                />
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <span className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Première Étape du Workflow
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-semibold text-gray-600 mb-1">Intitulé de l'étape 1</label>
                                        <input
                                            type="text"
                                            value={createInitialStageName}
                                            onChange={e => setCreateInitialStageName(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-600 mb-1">Acteur Initial</label>
                                        <select
                                            value={createInitialRole}
                                            onChange={e => setCreateInitialRole(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                        >
                                            <option value="Demandeur">Demandeur</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Validateur Site">Validateur Site</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-3.5 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                                >
                                    Créer le Workflow
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Field Editor */}
            {showFieldModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                            <h3 className="text-sm font-bold text-gray-900">
                                {editingFieldIndex !== null ? "Modifier le Champ" : "Nouveau Champ de Formulaire"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowFieldModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveField} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Libellé du Champ *</label>
                                <input
                                    type="text"
                                    required
                                    value={fieldForm.label}
                                    onChange={e => setFieldForm({ ...fieldForm, label: e.target.value })}
                                    placeholder="ex: Numéro d'Habilitation ou Motif d'Urgence"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Identifiant Technique (ID)</label>
                                <input
                                    type="text"
                                    value={fieldForm.id}
                                    onChange={e => setFieldForm({ ...fieldForm, id: e.target.value })}
                                    placeholder="Généré automatiquement si vide"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Type de Saisie</label>
                                <select
                                    value={fieldForm.type}
                                    onChange={e => setFieldForm({ ...fieldForm, type: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                >
                                    <option value="text">Texte libre (Ligne unique)</option>
                                    <option value="textarea">Zone de texte longue</option>
                                    <option value="number">Nombre / Quantité / Seuil</option>
                                    <option value="date">Date / Calendrier</option>
                                    <option value="select">Sélection depuis une Table Référentielle</option>
                                    <option value="file">Téléversement de Document / Justificatif</option>
                                    <option value="boolean">Case à cocher (Oui / Non)</option>
                                </select>
                            </div>

                            {fieldForm.type === 'select' && (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Table de Référence Source</label>
                                    <select
                                        value={fieldForm.table_ref || ''}
                                        onChange={e => setFieldForm({ ...fieldForm, table_ref: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    >
                                        {availableTables.map((tbl: any) => (
                                            <option key={tbl.id} value={tbl.id}>{tbl.name} ({tbl.id})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={fieldForm.required ?? true}
                                        onChange={e => setFieldForm({ ...fieldForm, required: e.target.checked })}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Champ Obligatoire pour soumettre le dossier</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowFieldModal(false)}
                                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
                                >
                                    Enregistrer le Champ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Test Simulator in State Machine */}
            {showTestModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                    <Play className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900">
                                        Simulateur d'Exécution : {editForm.name}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Instanciation d'un dossier réel dans la machine à états
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setShowTestModal(false); setTestDossierResult(null); }}
                                className="text-gray-400 hover:text-gray-600 text-base font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-indigo-950 space-y-1">
                                <p className="font-bold">Circuit de validation configuré :</p>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-800">
                                    {editForm.stages.map(s => (
                                        <li key={s.id}>
                                            Étape #{s.order} : {s.name} ({s.validator_role}) - {s.rules?.length || 0} règle(s), {s.notifications?.length || 0} notif(s)
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {testDossierResult && (
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-emerald-900 space-y-2 animate-in zoom-in-95 duration-150">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        Dossier #{testDossierResult.id} instancié avec succès !
                                    </div>
                                    <p className="text-[11px] text-emerald-800">
                                        Référence : <strong>{testDossierResult.reference || `REF-${testDossierResult.id}`}</strong>
                                        <br />
                                        Statut initial : <strong>{testDossierResult.status}</strong>
                                    </p>
                                    <Link
                                        to="/workflow"
                                        className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 transition"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Ouvrir dans la Machine à États
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => { setShowTestModal(false); setTestDossierResult(null); }}
                                className="px-3.5 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                            >
                                Fermer
                            </button>
                            <button
                                type="button"
                                onClick={handleLaunchTestSimulator}
                                disabled={instantiating}
                                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5"
                            >
                                <Play className="w-3.5 h-3.5" />
                                {instantiating ? 'Création en cours...' : 'Instancier le Dossier de Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Import JSON */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                                <Upload className="w-4 h-4 text-blue-600" />
                                Importer un Blueprint Déclaratif JSON
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowImportModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-gray-600">
                                Importez un <strong>Package Complet</strong> (Processus + Formulaire dynamique + Règles Métier) ou un <strong>Blueprint JSON</strong> standard.
                            </p>

                            <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                                <span className="text-[11px] text-blue-800 font-medium">Charger un fichier .json depuis votre poste :</span>
                                <label className="cursor-pointer bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1.5">
                                    <Upload className="w-3 h-3 text-blue-600" />
                                    <span>Parcourir...</span>
                                    <input
                                        type="file"
                                        accept=".json,application/json"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (evt) => {
                                                const text = evt.target?.result as string;
                                                setImportJsonText(text);
                                            };
                                            reader.readAsText(file);
                                        }}
                                    />
                                </label>
                            </div>

                            <textarea
                                rows={8}
                                value={importJsonText}
                                onChange={e => setImportJsonText(e.target.value)}
                                placeholder="Ou collez directement le contenu JSON ici..."
                                className="w-full border border-gray-300 rounded-xl p-3 font-mono text-[11px] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-hidden"
                            />
                            {importStatus && (
                                <p className="text-xs text-blue-700 font-semibold">{importStatus}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowImportModal(false)}
                                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleImportBlueprint}
                                disabled={!importJsonText.trim()}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Importer le Workflow / Package
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
