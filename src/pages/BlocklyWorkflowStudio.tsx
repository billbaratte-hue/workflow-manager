/**
 * @file src/pages/BlocklyWorkflowStudio.tsx
 * Studio de Workflow Graphique No-Code / Low-Code basé sur Google Blockly.
 * Permet aux administrateurs de modéliser, tester et compiler des règles d'automatisation métier.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Blockly from 'blockly';
import axios from 'axios';
import {
    initCustomWorkflowBlocks,
    WORKFLOW_TOOLBOX,
    BLOCK_COLORS
} from '../lib/blocklyCustomBlocks';
import {
    compileWorkspaceToAST,
    workspaceToXml,
    xmlToWorkspace
} from '../lib/blocklyAstCompiler';
import {
    Save,
    Play,
    FileJson,
    Trash2,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Sliders,
    Layers,
    Code2,
    Copy,
    Check,
    X,
    Maximize2,
    Eye,
    Plus,
    FolderKanban
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SchemaField {
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
}

interface FormSchema {
    id: string;
    name: string;
    code?: string;
    description?: string;
    fields: SchemaField[];
}

interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    schema_id: string;
    trigger_type: 'ON_SUBMIT' | 'ON_STATUS_CHANGE' | 'ON_UPDATE';
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    xml_state?: string;
    ast_json?: string;
    version?: number;
    updated_at?: string;
}

export default function BlocklyWorkflowStudio() {
    const blocklyDivRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    // Données des formulaires et workflows
    const [schemas, setSchemas] = useState<FormSchema[]>([]);
    const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('new');

    // Métadonnées du flux actif
    const [workflowName, setWorkflowName] = useState<string>('Nouveau Contrôle Métier');
    const [workflowDesc, setWorkflowDesc] = useState<string>('');
    const [selectedSchemaId, setSelectedSchemaId] = useState<string>('schema_intervention_cle');
    const [triggerType, setTriggerType] = useState<'ON_SUBMIT' | 'ON_STATUS_CHANGE' | 'ON_UPDATE'>('ON_SUBMIT');
    const [workflowStatus, setWorkflowStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');

    // États d'interface
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Modale AST JSON
    const [showAstModal, setShowAstModal] = useState<boolean>(false);
    const [astJsonContent, setAstJsonContent] = useState<string>('');
    const [copiedAst, setCopiedAst] = useState<boolean>(false);

    // Modale Simulateur
    const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
    const [samplePayloadText, setSamplePayloadText] = useState<string>('{}');
    const [simulating, setSimulating] = useState<boolean>(false);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [simulationError, setSimulationError] = useState<string | null>(null);

    // Initialisation des blocs personnalisés une seule fois
    useEffect(() => {
        initCustomWorkflowBlocks();
    }, []);

    // Chargement initial des schémas et des flux
    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [schemasRes, workflowsRes] = await Promise.all([
                axios.get('/api/v1/blockly-workflows/schemas'),
                axios.get('/api/v1/blockly-workflows')
            ]);

            const loadedSchemas: FormSchema[] = schemasRes.data?.data || [];
            setSchemas(loadedSchemas);

            const loadedWorkflows: WorkflowDefinition[] = workflowsRes.data?.data || [];
            setWorkflows(loadedWorkflows);

            if (loadedSchemas.length > 0) {
                const firstSchema = loadedSchemas[0];
                setSelectedSchemaId(firstSchema.id);
                updateBlocklyContext(firstSchema);
            }

            if (loadedWorkflows.length > 0) {
                // Charge le premier flux par défaut s'il existe
                loadWorkflowIntoState(loadedWorkflows[0], loadedSchemas);
            }
        } catch (err: any) {
            console.error('Erreur chargement données Blockly:', err);
            setFeedback({ type: 'error', message: 'Échec de connexion au serveur de workflows.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Met à jour les options de champs disponibles pour Blockly
    const updateBlocklyContext = (schema: FormSchema) => {
        if (typeof window === 'undefined') return;
        const fieldTuples: [string, string][] = (schema.fields || []).map(f => [
            `${f.label} (${f.key})`,
            f.key
        ]);

        window.AntigravityWorkflowContext = {
            getAvailableFields: () => (fieldTuples.length > 0 ? fieldTuples : [["Aucun champ défini", ""]]),
            getAvailableRoles: () => [
                ["Manager N+1", "Manager N+1"],
                ["Validateur Site", "Validateur Site"],
                ["Responsable Sécurité", "Responsable Sécurité"],
                ["Pôle RH", "Pôle RH"],
                ["Direction Métier", "Direction Métier"]
            ],
            getAvailableStatuses: () => [
                ["VALIDE_AUTOMATIQUEMENT", "VALIDE_AUTOMATIQUEMENT"],
                ["EN_ATTENTE_MANAGER", "EN_ATTENTE_MANAGER"],
                ["VALIDE_MANAGER", "VALIDE_MANAGER"],
                ["APPROUVE", "APPROUVE"],
                ["REFUSE", "REFUSE"],
                ["EN_COURS_TRAITEMENT", "EN_COURS_TRAITEMENT"]
            ]
        };
    };

    // Injection du workspace Blockly
    useEffect(() => {
        if (!blocklyDivRef.current || workspaceRef.current) return;

        const ws = Blockly.inject(blocklyDivRef.current, {
            toolbox: WORKFLOW_TOOLBOX as any,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#cbd5e1',
                snap: true
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 2.5,
                minScale: 0.4,
                scaleSpeed: 1.15
            },
            trashcan: true,
            sounds: false,
            renderer: 'zelos'
        });

        workspaceRef.current = ws;

        // Redimensionnement automatique
        const handleResize = () => {
            Blockly.svgResize(ws);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            ws.dispose();
            workspaceRef.current = null;
        };
    }, [loading]);

    // Charge un workflow existant
    const loadWorkflowIntoState = (wf: WorkflowDefinition, currentSchemas: FormSchema[]) => {
        setSelectedWorkflowId(wf.id);
        setWorkflowName(wf.name);
        setWorkflowDesc(wf.description || '');
        setSelectedSchemaId(wf.schema_id);
        setTriggerType(wf.trigger_type || 'ON_SUBMIT');
        setWorkflowStatus(wf.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE');

        const activeSchema = currentSchemas.find(s => s.id === wf.schema_id);
        if (activeSchema) {
            updateBlocklyContext(activeSchema);
        }

        if (workspaceRef.current && wf.xml_state) {
            xmlToWorkspace(wf.xml_state, workspaceRef.current);
        }
    };

    // Gestion du changement de formulaire cible
    const handleSchemaChange = (newSchemaId: string) => {
        setSelectedSchemaId(newSchemaId);
        const targetSchema = schemas.find(s => s.id === newSchemaId);
        if (targetSchema) {
            updateBlocklyContext(targetSchema);
            // Rafraîchir les blocs du workspace pour prendre en compte les nouveaux champs
            if (workspaceRef.current) {
                const xml = workspaceToXml(workspaceRef.current);
                xmlToWorkspace(xml, workspaceRef.current);
            }
        }
    };

    // Créer un nouveau flux vierge
    const handleNewWorkflow = () => {
        setSelectedWorkflowId('new');
        setWorkflowName('Nouvelle Règle d\'Automatisation');
        setWorkflowDesc('');
        setTriggerType('ON_SUBMIT');
        setWorkflowStatus('ACTIVE');
        if (workspaceRef.current) {
            workspaceRef.current.clear();
        }
    };

    // Sauvegarder le flux
    const handleSave = async () => {
        if (!workspaceRef.current) return;
        setSaving(true);
        setFeedback(null);

        try {
            const xmlState = workspaceToXml(workspaceRef.current);
            const ast = compileWorkspaceToAST(workspaceRef.current, {
                name: workflowName,
                schema_id: selectedSchemaId,
                trigger_type: triggerType
            });

            const payload = {
                name: workflowName,
                description: workflowDesc,
                schema_id: selectedSchemaId,
                trigger_type: triggerType,
                status: workflowStatus,
                xml_state: xmlState,
                ast_json: ast
            };

            if (selectedWorkflowId === 'new') {
                const res = await axios.post('/api/v1/blockly-workflows', payload);
                setFeedback({ type: 'success', message: 'Workflow enregistré avec succès.' });
                setSelectedWorkflowId(res.data.id);
            } else {
                await axios.put(`/api/v1/blockly-workflows/${selectedWorkflowId}`, payload);
                setFeedback({ type: 'success', message: 'Workflow mis à jour avec succès.' });
            }

            // Rafraîchir la liste des workflows
            const updatedListRes = await axios.get('/api/v1/blockly-workflows');
            setWorkflows(updatedListRes.data?.data || []);
        } catch (err: any) {
            console.error('Erreur sauvegarde workflow:', err);
            setFeedback({
                type: 'error',
                message: err.response?.data?.error || 'Erreur lors de la sauvegarde du workflow.'
            });
        } finally {
            setSaving(false);
        }
    };

    // Ouvrir la modale AST JSON
    const handleViewAst = () => {
        if (!workspaceRef.current) return;
        const ast = compileWorkspaceToAST(workspaceRef.current, {
            name: workflowName,
            schema_id: selectedSchemaId,
            trigger_type: triggerType
        });
        setAstJsonContent(JSON.stringify(ast, null, 2));
        setCopiedAst(false);
        setShowAstModal(true);
    };

    // Ouvrir la modale du Simulateur
    const handleOpenSimulator = () => {
        if (!workspaceRef.current) return;
        const targetSchema = schemas.find(s => s.id === selectedSchemaId);

        // Construit un payload d'exemple pertinent
        const sample: Record<string, any> = {
            id: 'DEM-2026-TEST',
            status: 'INITIAL'
        };

        if (targetSchema) {
            targetSchema.fields.forEach(f => {
                if (f.type === 'number') sample[f.key] = 10;
                else if (f.type === 'boolean') sample[f.key] = true;
                else if (f.type === 'select' && f.options && f.options.length > 0) sample[f.key] = f.options[0];
                else sample[f.key] = `Valeur test ${f.label}`;
            });
        }

        setSamplePayloadText(JSON.stringify(sample, null, 2));
        setSimulationResult(null);
        setSimulationError(null);
        setShowSimulateModal(true);
    };

    // Exécuter la simulation
    const handleRunSimulation = async () => {
        if (!workspaceRef.current) return;
        setSimulating(true);
        setSimulationError(null);

        try {
            const ast = compileWorkspaceToAST(workspaceRef.current, {
                name: workflowName,
                schema_id: selectedSchemaId,
                trigger_type: triggerType
            });

            let parsedPayload = {};
            try {
                parsedPayload = JSON.parse(samplePayloadText);
            } catch {
                setSimulationError('Le payload JSON de test est malformé. Veuillez vérifier la syntaxe JSON.');
                setSimulating(false);
                return;
            }

            const res = await axios.post('/api/v1/blockly-workflows/simulate', {
                ast,
                sample_payload: parsedPayload
            });

            setSimulationResult(res.data.simulation);
        } catch (err: any) {
            console.error('Erreur simulation:', err);
            setSimulationError('Échec de la simulation : ' + (err.response?.data?.error || err.message));
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50">
            {/* Barre Supérieure de Configuration */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 shadow-xs z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Retour à l'administration"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                    Studio de Workflow Blockly
                                </h1>
                                <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded text-xs border border-indigo-200">
                                    No-Code / Low-Code
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Moteur d'automatisation des règles métier & flux conditionnels
                            </p>
                        </div>
                    </div>

                    {/* Sélection du flux existant ou nouveau */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-slate-400" />
                            <select
                                value={selectedWorkflowId}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === 'new') {
                                        handleNewWorkflow();
                                    } else {
                                        const wf = workflows.find(w => w.id === val);
                                        if (wf) loadWorkflowIntoState(wf, schemas);
                                    }
                                }}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white shadow-2xs focus:ring-2 focus:ring-[#002395] focus:outline-hidden"
                            >
                                <option value="new">+ Créer un nouveau flux</option>
                                {workflows.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.name} ({w.trigger_type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenSimulator}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
                        >
                            <Play className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Simuler & Tester</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleViewAst}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition cursor-pointer shadow-2xs"
                        >
                            <Code2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Voir l'AST JSON</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#002395] hover:bg-blue-900 transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? 'Enregistrement...' : 'Sauvegarder'}</span>
                        </button>
                    </div>
                </div>

                {/* Formulaire de configuration des propriétés du flux */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                            Nom du flux <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={workflowName}
                            onChange={e => setWorkflowName(e.target.value)}
                            placeholder="Ex : Validation Accès Haute Tension"
                            className="w-full border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#002395] focus:outline-hidden"
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                            Formulaire cible <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedSchemaId}
                            onChange={e => handleSchemaChange(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#002395] focus:outline-hidden bg-white"
                        >
                            {schemas.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.code || s.id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                            Événement déclencheur
                        </label>
                        <select
                            value={triggerType}
                            onChange={e => setTriggerType(e.target.value as any)}
                            className="w-full border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#002395] focus:outline-hidden bg-white"
                        >
                            <option value="ON_SUBMIT">ON_SUBMIT (Soumission du formulaire)</option>
                            <option value="ON_STATUS_CHANGE">ON_STATUS_CHANGE (Changement d'état)</option>
                            <option value="ON_UPDATE">ON_UPDATE (Modification de champ)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                            État du flux
                        </label>
                        <select
                            value={workflowStatus}
                            onChange={e => setWorkflowStatus(e.target.value as any)}
                            className="w-full border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#002395] focus:outline-hidden bg-white"
                        >
                            <option value="ACTIVE">Actif (En production)</option>
                            <option value="DRAFT">Brouillon (Désactivé)</option>
                        </select>
                    </div>
                </div>

                {feedback && (
                    <div className={`mt-2 p-2 rounded-md text-xs flex items-center gap-2 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {feedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{feedback.message}</span>
                    </div>
                )}
            </div>

            {/* Espace de Modélisation Blockly */}
            <div className="flex-1 relative w-full h-full">
                <div
                    ref={blocklyDivRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ minHeight: '500px' }}
                />
            </div>

            {/* MODALE VISUALISATION AST JSON */}
            {showAstModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                                    <Code2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Arbre Syntaxique Abstrait (AST JSON)
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Représentation compilée exécutée par le Rule Engine backend
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAstModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto my-4 bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 leading-relaxed">
                            <pre>{astJsonContent}</pre>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(astJsonContent);
                                    setCopiedAst(true);
                                    setTimeout(() => setCopiedAst(false), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                                {copiedAst ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedAst ? 'Copié dans le presse-papier' : 'Copier le JSON'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAstModal(false)}
                                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition cursor-pointer"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE SIMULATEUR DE RÈGLES */}
            {showSimulateModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                                    <Play className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Simulateur d'Évaluation en Direct
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Testez le comportement de vos règles Blockly contre un jeu de données sans impacter la base
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSimulateModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 overflow-auto">
                            {/* Colonne Gauche: Payload d'entrée */}
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-slate-700 mb-1 flex justify-between items-center">
                                    <span>Jeu de données d'entrée (JSON)</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Modifiable librement</span>
                                </label>
                                <textarea
                                    value={samplePayloadText}
                                    onChange={e => setSamplePayloadText(e.target.value)}
                                    rows={14}
                                    className="w-full flex-1 p-3 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                                />
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={handleRunSimulation}
                                        disabled={simulating}
                                        className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                                    >
                                        <Play className="w-4 h-4" />
                                        <span>{simulating ? 'Évaluation en cours...' : 'Lancer la simulation'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Colonne Droite: Résultats de l'évaluation */}
                            <div className="flex flex-col overflow-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-800 mb-2">
                                    Résultat & Trace d'Exécution
                                </h4>

                                {simulationError && (
                                    <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span>{simulationError}</span>
                                    </div>
                                )}

                                {simulationResult ? (
                                    <div className="space-y-3 text-xs">
                                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                                            <div>
                                                <span className="text-[11px] text-slate-500">Statut Évaluation : </span>
                                                <span className={`font-bold ml-1 ${
                                                    simulationResult.status === 'CONDITION_MET'
                                                        ? 'text-emerald-700'
                                                        : 'text-amber-700'
                                                }`}>
                                                    {simulationResult.status === 'CONDITION_MET'
                                                        ? 'Conditions Satisfaites (ALORS)'
                                                        : 'Conditions Non Satisfaites (SINON)'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                                {simulationResult.execution_time_ms} ms
                                            </span>
                                        </div>

                                        {/* Actions à exécuter */}
                                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                                            <span className="text-[11px] font-bold text-slate-700 block mb-1">
                                                Actions Déclenchées ({simulationResult.actions_to_execute?.length || 0}) :
                                            </span>
                                            {simulationResult.actions_to_execute?.length === 0 ? (
                                                <span className="text-slate-400 italic text-[11px]">Aucune action déclenchée</span>
                                            ) : (
                                                <ul className="space-y-1">
                                                    {simulationResult.actions_to_execute.map((act: any, idx: number) => (
                                                        <li key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                                            <span className="font-semibold">{act.type} :</span>
                                                            <span>{act.status || act.message || act.role || act.url || JSON.stringify(act)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        {/* Logs pas à pas */}
                                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                                            <span className="text-[11px] font-bold text-slate-700 block mb-1">
                                                Journal Pas-à-Pas (Execution Trace) :
                                            </span>
                                            <div className="space-y-1 max-h-48 overflow-auto font-mono text-[10px]">
                                                {simulationResult.logs?.map((l: any, idx: number) => (
                                                    <div key={idx} className="p-1 rounded bg-slate-50 border border-slate-100 flex items-start justify-between">
                                                        <span>{l.description}</span>
                                                        {l.result !== undefined && (
                                                            <span className={`font-bold ml-2 ${
                                                                l.result === true ? 'text-emerald-600' : l.result === false ? 'text-red-500' : 'text-slate-600'
                                                            }`}>
                                                                [{String(l.result)}]
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs italic">
                                        <Play className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
                                        <span>Cliquez sur "Lancer la simulation" pour tester le flux</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowSimulateModal(false)}
                                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition cursor-pointer"
                            >
                                Fermer le simulateur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
