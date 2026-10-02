import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    getProcesses,
    updateProcess,
    getCategories,
    getReferenceTables,
    getRoles,
    getStatuses,
    duplicateProcess
} from '../lib/api';
import WorkflowVisualCanvas from '../components/WorkflowVisualCanvas';
import WorkflowStageConfigurator, { StageConfig, AppRole } from '../components/WorkflowStageConfigurator';
import { WorkflowTransition, CustomStatusConfig } from '../types';
import {
    ArrowLeft,
    Workflow as WorkflowIcon,
    Play,
    Download,
    Check,
    ExternalLink,
    RefreshCw,
    Layers,
    GitBranch,
    Sliders,
    AlertTriangle,
    Save,
    Maximize2,
    Minimize2,
    CheckCircle2,
    ChevronDown,
    FileJson,
    X,
    Settings
} from 'lucide-react';
import axios from 'axios';

export interface ProcessField {
    id: string;
    label: string;
    type: string;
    table_ref?: string;
    options?: string;
    required?: boolean;
}

export interface ProcessItem {
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

const DEFAULT_PROCESS_ROLES: AppRole[] = [
    { id: 1, name: 'Demandeur', description: 'Agent initiateur de la demande' },
    { id: 2, name: 'Manager', description: 'Supérieur hiérarchique direct N+1' },
    { id: 3, name: 'Validateur Site', description: 'Responsable opérationnel du site' },
    { id: 4, name: 'Responsable Sécurité', description: 'Direction Sûreté & Habilitations' },
    { id: 5, name: 'Pôle RH', description: 'Ressources Humaines' },
    { id: 6, name: 'Direction Métier', description: 'Direction nationale' }
];

export default function AdminWorkflowStudio() {
    const { processId } = useParams<{ processId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [processes, setProcesses] = useState<ProcessItem[]>([]);
    const [currentProcess, setCurrentProcess] = useState<ProcessItem | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [availableRoles, setAvailableRoles] = useState<AppRole[]>(DEFAULT_PROCESS_ROLES);
    const [availableStatuses, setAvailableStatuses] = useState<CustomStatusConfig[]>([]);

    // Editable workflow state
    const [stages, setStages] = useState<StageConfig[]>([]);
    const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
    const [processName, setProcessName] = useState('');
    const [processCode, setProcessCode] = useState('');
    const [processStatus, setProcessStatus] = useState('Publié');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // Stage configurator drawer state (for deep editing rules/SLA)
    const [configuredStageIndex, setConfiguredStageIndex] = useState<number | null>(null);

    // Test simulator modal state
    const [showTestModal, setShowTestModal] = useState(false);
    const [instantiating, setInstantiating] = useState(false);
    const [testDossierResult, setTestDossierResult] = useState<any | null>(null);

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

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [procRes, catRes, tablesRes, rolesRes, statRes] = await Promise.all([
                getProcesses().catch(() => ({ data: [] })),
                getCategories().catch(() => ({ data: [] })),
                getReferenceTables().catch(() => ({ data: [] })),
                getRoles().catch(() => ({ data: [] })),
                getStatuses().catch(() => ({ data: [] }))
            ]);

            const procList: ProcessItem[] = Array.isArray(procRes?.data) ? procRes.data : [];
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

            // Select the target process
            let target: ProcessItem | undefined;
            if (processId) {
                target = procList.find(p => String(p.id) === String(processId) || p.code === processId);
            }
            if (!target && procList.length > 0) {
                target = procList[0];
            }

            if (target) {
                initTargetProcess(target);
            }
        } catch (err: any) {
            console.error("Erreur chargement Studio Workflow:", err);
            showNotification('error', "Impossible de charger les données du workflow.");
        } finally {
            setLoading(false);
        }
    }, [processId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const initTargetProcess = (proc: ProcessItem) => {
        setCurrentProcess(proc);
        setProcessName(proc.name);
        setProcessCode(proc.code || `WF-${proc.id}`);
        setProcessStatus(proc.status || 'Publié');

        // Normalize stages
        const normalizedStages: StageConfig[] = (proc.stages && proc.stages.length > 0)
            ? proc.stages.map((stg, idx) => ({
                id: stg.id || `stg_${Date.now()}_${idx}`,
                order: stg.order || idx + 1,
                name: stg.name || `Étape ${idx + 1}`,
                status_key: stg.status_key || 'DEMANDE_SOUMISE',
                validator_role: stg.validator_role || 'Demandeur',
                sla_hours: stg.sla_hours || 24,
                fulfillment_mode: stg.fulfillment_mode || 'MANUAL_APPROVAL',
                instruction: stg.instruction || '',
                position: stg.position || { x: 80 + (idx % 3) * 360, y: 100 + Math.floor(idx / 3) * 240 },
                rules: Array.isArray(stg.rules) ? stg.rules : [],
                notifications: Array.isArray(stg.notifications) ? stg.notifications : []
            }))
            : [
                {
                    id: 's1',
                    order: 1,
                    name: 'Soumission & Contrôle Initial',
                    status_key: 'DEMANDE_SOUMISE',
                    validator_role: 'Demandeur',
                    sla_hours: 12,
                    fulfillment_mode: 'AUTO_WHEN_RULES_PASS',
                    position: { x: 100, y: 120 },
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
                            trigger: 'ON_ENTER',
                            name: 'Accusé de Réception Demandeur',
                            recipient_type: 'DEMANDEUR',
                            subject: '[Dossier {reference}] Demande transmise avec succès',
                            message: 'Bonjour {demandeur},\n\nVotre demande a été enregistrée et transmise.',
                            channel: 'BOTH',
                            enabled: true
                        }
                    ]
                }
            ];

        setStages(normalizedStages);
        setTransitions(Array.isArray(proc.transitions) ? proc.transitions : []);
        setIsDirty(false);
    };

    // Save changes to backend
    const handleSave = async () => {
        if (!currentProcess) return;
        setSaving(true);
        try {
            await updateProcess(currentProcess.id, {
                name: processName.trim() || currentProcess.name,
                code: processCode.trim() || currentProcess.code,
                status: processStatus,
                stages: stages,
                transitions: transitions,
                fields: currentProcess.fields || [],
                linked_tables: currentProcess.linked_tables || []
            });

            setIsDirty(false);
            showNotification('success', `Workflow "${processName}" enregistré avec succès.`);
        } catch (err: any) {
            console.error("Erreur enregistrement workflow:", err);
            showNotification('error', err.response?.data?.error || "Erreur lors de la sauvegarde du workflow.");
        } finally {
            setSaving(false);
        }
    };

    // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    // Handle stage updates from canvas
    const handleUpdateStages = (newStages: StageConfig[]) => {
        setStages(newStages);
        setIsDirty(true);
    };

    // Handle single stage update from embedded configurator
    const handleUpdateSingleStage = (updatedStage: StageConfig) => {
        if (configuredStageIndex === null) return;
        const updated = [...stages];
        updated[configuredStageIndex] = updatedStage;
        setStages(updated);
        setIsDirty(true);
    };

    // Handle transition updates from canvas
    const handleUpdateTransitions = (newTransitions: WorkflowTransition[]) => {
        setTransitions(newTransitions);
        setIsDirty(true);
    };

    // Switch active workflow via dropdown
    const handleSelectProcess = (procId: number) => {
        if (isDirty) {
            if (!window.confirm("Des modifications non enregistrées existent sur ce workflow. Continuer sans enregistrer ?")) {
                return;
            }
        }
        const found = processes.find(p => p.id === procId);
        if (found) {
            initTargetProcess(found);
            navigate(`/admin/processus/${found.id}/studio`, { replace: true });
        }
    };

    // Export JSON Blueprint
    const handleExportBlueprint = () => {
        if (!currentProcess) return;
        const blueprint = {
            schema_version: '2.0.0',
            exported_at: new Date().toISOString(),
            workflow: {
                id: currentProcess.id,
                code: processCode,
                name: processName,
                status: processStatus,
                category_id: currentProcess.category_id,
                description: currentProcess.description,
                stages: stages,
                transitions: transitions,
                fields: currentProcess.fields,
                linked_tables: currentProcess.linked_tables
            }
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprint, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `blueprint_${(processCode || 'workflow').toLowerCase()}_${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showNotification('success', "Blueprint JSON téléchargé.");
    };

    // Live Test Simulator
    const handleLaunchTestSimulator = async () => {
        if (!currentProcess) return;
        setInstantiating(true);
        setTestDossierResult(null);
        try {
            const firstStage = stages[0];
            const testPayload = {
                request_type: processCode || `WF-${currentProcess.id}`,
                title: `[Studio Live Test] Dossier instancié pour ${processName}`,
                description: `Test d'exécution interactif depuis le Studio Pleine Page pour "${processName}".`,
                requester_id: 1,
                requester_name: 'Admin Système',
                requester_role: 'Administrateur',
                status: firstStage?.status_key || 'DEMANDE_SOUMISE',
                workflow_code: processCode,
                form_data: {
                    site_id: 'SITE-001',
                    justification: 'Vérification du franchissement des règles configurées en studio grand format.'
                }
            };

            const res = await axios.post('/api/v1/requests', testPayload, {
                headers: {
                    'x-user-role': encodeURIComponent('Administrateur'),
                    'x-user-email': 'admin@entreprise.fr'
                }
            });

            setTestDossierResult(res.data?.request || res.data);
            setShowTestModal(true);
            showNotification('success', "Dossier de test instancié dans la machine à états !");
        } catch (err: any) {
            console.error("Erreur instanciation test:", err);
            showNotification('error', "Impossible d'instancier le dossier de test.");
        } finally {
            setInstantiating(false);
        }
    };

    const categoryName = useMemo(() => {
        if (!currentProcess) return 'Général';
        return categories.find(c => c.id === currentProcess.category_id)?.name || 'Général';
    }, [currentProcess, categories]);

    if (loading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-bold">Chargement du Studio de Modélisation...</p>
            </div>
        );
    }

    if (!currentProcess) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center space-y-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Workflow introuvable</h2>
                <p className="text-xs text-gray-500 max-w-md">
                    Le workflow demandé n'a pas pu être chargé ou a été supprimé.
                </p>
                <Link
                    to="/admin/processus"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à l'administration des workflows
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-white overflow-hidden select-none">
            {/* Top Studio Header Bar (Full width, dense, highly operational) */}
            <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between gap-3 shrink-0 z-30 shadow-2xs">
                {/* Left: Back Link & Workflow Identity */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => {
                            if (isDirty) {
                                if (!window.confirm("Vous avez des modifications non enregistrées. Quitter quand même ?")) {
                                    return;
                                }
                            }
                            navigate('/admin/processus');
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                        title="Retourner à la gestion des workflows"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                        <span className="hidden sm:inline">Quitter le Studio</span>
                    </button>

                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Workflow Selector Dropdown */}
                    <div className="relative group shrink-0">
                        <select
                            value={currentProcess.id}
                            onChange={(e) => handleSelectProcess(Number(e.target.value))}
                            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-1 px-2.5 text-xs font-bold text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer max-w-[200px] truncate"
                            title="Changer de workflow dans le Studio"
                        >
                            {processes.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.code || `WF-${p.id}`})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Active Workflow Title and Code */}
                    <div className="flex items-center gap-2 min-w-0 truncate">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md border border-blue-200 shrink-0">
                            {processCode}
                        </span>

                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={processName}
                                onChange={e => { setProcessName(e.target.value); setIsDirty(true); }}
                                onBlur={() => setIsEditingTitle(false)}
                                onKeyDown={e => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                                autoFocus
                                className="text-sm font-black text-gray-900 border border-blue-400 rounded px-2 py-0.5 outline-hidden focus:ring-1 focus:ring-blue-600 max-w-xs"
                            />
                        ) : (
                            <h1
                                onClick={() => setIsEditingTitle(true)}
                                className="text-sm font-black text-gray-900 truncate hover:text-blue-700 cursor-pointer flex items-center gap-1.5"
                                title="Cliquez pour renommer le workflow"
                            >
                                <span className="truncate">{processName}</span>
                            </h1>
                        )}

                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hidden lg:inline-block">
                            {processStatus}
                        </span>

                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium hidden xl:inline-block">
                            {categoryName}
                        </span>
                    </div>
                </div>

                {/* Center / Right: Live Counters & Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Metrics Badges */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                        <span className="flex items-center gap-1 text-blue-700">
                            <Layers className="w-3.5 h-3.5" />
                            {stages.length} étapes
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 text-purple-700">
                            <GitBranch className="w-3.5 h-3.5" />
                            {transitions.length} transitions
                        </span>
                    </div>

                    {/* Dirty State Indicator */}
                    {isDirty ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Non enregistré
                        </span>
                    ) : (
                        <span className="text-[11px] font-semibold text-gray-500 hidden md:flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            À jour
                        </span>
                    )}

                    {/* Export Blueprint */}
                    <button
                        type="button"
                        onClick={handleExportBlueprint}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg text-xs transition cursor-pointer"
                        title="Télécharger le Blueprint JSON"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Blockly Visual Studio Link */}
                    <Link
                        to="/admin/blockly-workflows"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        title="Ouvrir le Studio Visuel Google Blockly"
                    >
                        <WorkflowIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden lg:inline">Règles Blockly</span>
                    </Link>

                    {/* Live Test Simulator Button */}
                    <button
                        type="button"
                        onClick={handleLaunchTestSimulator}
                        disabled={instantiating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Tester ce workflow en direct dans la machine à états"
                    >
                        <Play className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tester le Workflow</span>
                    </button>

                    {/* Direct Save Button */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer ${isDirty ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        title="Enregistrer toutes les modifications (Ctrl+S)"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Enregistrement...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Enregistrer</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Notification Toast */}
            {feedback && (
                <div className={`fixed top-16 right-4 z-50 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 duration-200 ${feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Main Interactive Studio Area (Occupies 100% of remaining screen height and full width) */}
            <main className="flex-1 w-full overflow-hidden relative flex flex-col">
                <WorkflowVisualCanvas
                    stages={stages}
                    transitions={transitions}
                    availableRoles={validatorEligibleRoles}
                    availableFields={currentProcess.fields || []}
                    availableStatuses={availableStatuses}
                    onUpdateStages={handleUpdateStages}
                    onUpdateTransitions={handleUpdateTransitions}
                    onSelectStageForDeepConfig={(stageIndex) => {
                        setConfiguredStageIndex(stageIndex);
                    }}
                    onLaunchTestSimulator={handleLaunchTestSimulator}
                    isDedicatedPage={true}
                />
            </main>

            {/* Slide-over Drawer / Modal: Deep Stage Configurator (Rules, SLAs, Notifications) */}
            {configuredStageIndex !== null && stages[configuredStageIndex] && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-end p-0 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-[#002395] text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <Settings className="w-5 h-5 text-yellow-300" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/30 text-blue-200">
                                            Étape #{configuredStageIndex + 1}
                                        </span>
                                        <h3 className="text-sm font-bold truncate max-w-md">
                                            {stages[configuredStageIndex].name}
                                        </h3>
                                    </div>
                                    <p className="text-[11px] text-blue-200 mt-0.5">
                                        Configurateur approfondi : Règles métier d'accomplissement (Fulfill), Rôle validateur & Notifications
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfiguredStageIndex(null)}
                                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                                title="Fermer le configurateur"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <WorkflowStageConfigurator
                                stage={stages[configuredStageIndex]}
                                availableRoles={validatorEligibleRoles}
                                availableFields={currentProcess.fields || []}
                                onUpdateStage={handleUpdateSingleStage}
                            />
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                            <span className="text-xs text-gray-500">
                                Les modifications sont répercutées en temps réel sur le workflow.
                            </span>
                            <button
                                type="button"
                                onClick={() => setConfiguredStageIndex(null)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Check className="w-4 h-4" />
                                Terminé
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Test Simulation Result Modal */}
            {showTestModal && testDossierResult && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                    <Play className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900">
                                        Simulateur d'Exécution : {processName}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Dossier réel instancié dans la machine à états opérationnelle
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

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                                <Check className="w-4 h-4 text-emerald-600" />
                                Dossier #{testDossierResult.id} prêt pour test opérationnel !
                            </div>
                            <p className="text-[11px] text-emerald-800">
                                Référence : <strong>{testDossierResult.reference || `REF-${testDossierResult.id}`}</strong>
                                <br />
                                Statut initial : <strong>{testDossierResult.status}</strong>
                            </p>
                            <div className="pt-2 flex items-center gap-2">
                                <Link
                                    to="/workflows"
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 transition"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Ouvrir dans la Machine à États (Nouvel Onglet)
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => { setShowTestModal(false); setTestDossierResult(null); }}
                                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
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
