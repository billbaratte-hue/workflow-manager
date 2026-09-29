import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Move,
    Plus,
    Trash2,
    Check,
    ArrowRight,
    Clock,
    Shield,
    Sliders,
    Bell,
    Sparkles,
    AlertTriangle,
    Play,
    Zap,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Layers,
    Tag,
    FileCheck,
    CheckCircle2,
    XCircle,
    HelpCircle,
    CornerDownRight,
    GripVertical,
    FileText,
    ExternalLink,
    Filter,
    Edit3,
    Compass,
    Workflow as WorkflowIcon,
    RefreshCw
} from 'lucide-react';
import { StageConfig, AppRole } from './WorkflowStageConfigurator';
import { WorkflowTransition, TransitionTriggerType, CustomStatusConfig } from '../types';

export interface WorkflowVisualCanvasProps {
    stages: StageConfig[];
    transitions: WorkflowTransition[];
    availableRoles: AppRole[];
    availableFields: { id: string; label: string; type: string }[];
    availableStatuses?: CustomStatusConfig[];
    onUpdateStages: (newStages: StageConfig[]) => void;
    onUpdateTransitions: (newTransitions: WorkflowTransition[]) => void;
    onSelectStageForDeepConfig: (stageIndex: number) => void;
    onLaunchTestSimulator?: () => void;
    isDedicatedPage?: boolean;
    onOpenDedicatedPage?: () => void;
}

// Preset stage templates for the drag-and-drop palette
interface StagePaletteTemplate {
    id: string;
    name: string;
    role: string;
    sla_hours: number;
    status_key: string;
    color: string;
    badge_bg: string;
    icon: string;
    description: string;
    rules_count: number;
    fulfillment_mode: 'MANUAL_APPROVAL' | 'AUTO_WHEN_RULES_PASS' | 'MULTI_APPROVAL';
}

const PALETTE_TEMPLATES: StagePaletteTemplate[] = [
    {
        id: 'tmpl_soumission',
        name: 'Soumission & Contrôle Initial',
        role: 'Demandeur',
        sla_hours: 12,
        status_key: 'DEMANDE_SOUMISE',
        color: 'border-blue-300 bg-blue-50/50',
        badge_bg: 'bg-blue-100 text-blue-800',
        icon: 'FileText',
        description: 'Vérification automatique des champs obligatoires et pièces requises.',
        rules_count: 1,
        fulfillment_mode: 'AUTO_WHEN_RULES_PASS'
    },
    {
        id: 'tmpl_manager',
        name: 'Validation Hiérarchique N+1',
        role: 'Manager',
        sla_hours: 24,
        status_key: 'PENDING_MANAGER',
        color: 'border-indigo-300 bg-indigo-50/50',
        badge_bg: 'bg-indigo-100 text-indigo-800',
        icon: 'Shield',
        description: 'Approbation par le supérieur hiérarchique direct du demandeur.',
        rules_count: 1,
        fulfillment_mode: 'MANUAL_APPROVAL'
    },
    {
        id: 'tmpl_site',
        name: 'Validation Technique de Site',
        role: 'Validateur Site',
        sla_hours: 48,
        status_key: 'PENDING_SITE',
        color: 'border-amber-300 bg-amber-50/50',
        badge_bg: 'bg-amber-100 text-amber-800',
        icon: 'Sliders',
        description: 'Vérification de sûreté ferroviaire sur site et analyse des risques.',
        rules_count: 2,
        fulfillment_mode: 'MANUAL_APPROVAL'
    },
    {
        id: 'tmpl_securite',
        name: 'Contrôle Sécurité & Habilitation',
        role: 'Responsable Sécurité',
        sla_hours: 48,
        status_key: 'PENDING_CROSS_VAL',
        color: 'border-rose-300 bg-rose-50/50',
        badge_bg: 'bg-rose-100 text-rose-800',
        icon: 'Shield',
        description: 'Vérification des habilitations et conformité de sécurité sans révocation active.',
        rules_count: 2,
        fulfillment_mode: 'MANUAL_APPROVAL'
    },
    {
        id: 'tmpl_logistique',
        name: 'Devis & Approvisionnement S9',
        role: 'Demandeur',
        sla_hours: 72,
        status_key: 'PENDING_QUOTE_PO',
        color: 'border-emerald-300 bg-emerald-50/50',
        badge_bg: 'bg-emerald-100 text-emerald-800',
        icon: 'Zap',
        description: 'Liaison bon de commande Chorus / SAP et devis fournisseur mécatronique.',
        rules_count: 1,
        fulfillment_mode: 'MANUAL_APPROVAL'
    },
    {
        id: 'tmpl_gps',
        name: 'Remise & Commissioning GPS',
        role: 'Demandeur',
        sla_hours: 24,
        status_key: 'COMMISSIONING_GPS',
        color: 'border-purple-300 bg-purple-50/50',
        badge_bg: 'bg-purple-100 text-purple-800',
        icon: 'Zap',
        description: 'Vérification des coordonnées GPS terrain et signature du PV de livraison.',
        rules_count: 2,
        fulfillment_mode: 'MANUAL_APPROVAL'
    },
    {
        id: 'tmpl_cloture',
        name: 'Clôture & Traçabilité NIS 2',
        role: 'Demandeur',
        sla_hours: 12,
        status_key: 'ARCHIVED_COMPLETED',
        color: 'border-teal-300 bg-teal-50/50',
        badge_bg: 'bg-teal-100 text-teal-800',
        icon: 'CheckCircle2',
        description: 'Archivage conforme avec journalisation cryptographique 10 ans.',
        rules_count: 0,
        fulfillment_mode: 'AUTO_WHEN_RULES_PASS'
    }
];

export default function WorkflowVisualCanvas({
    stages,
    transitions,
    availableRoles,
    availableFields,
    availableStatuses = [],
    onUpdateStages,
    onUpdateTransitions,
    onSelectStageForDeepConfig,
    onLaunchTestSimulator,
    isDedicatedPage = false,
    onOpenDedicatedPage
}: WorkflowVisualCanvasProps) {
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Zoom & pan
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Dragging an existing stage node on canvas
    const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Interactive connection creation state
    const [connectingFromStageId, setConnectingFromStageId] = useState<string | null>(null);
    const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });

    // Modal state for editing or creating transition
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
    const [editingTransition, setEditingTransition] = useState<WorkflowTransition | null>(null);
    const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Collapsible Palette state
    const [isPaletteOpen, setIsPaletteOpen] = useState(true);
    const [paletteTab, setPaletteTab] = useState<'templates' | 'statuses'>('templates');
    const [paletteSearch, setPaletteSearch] = useState('');

    // Initialize node positions if missing
    useEffect(() => {
        let hasMissingPositions = false;
        const updated = stages.map((stg, idx) => {
            if (!stg.position || typeof stg.position.x !== 'number' || typeof stg.position.y !== 'number') {
                hasMissingPositions = true;
                const col = idx % 3;
                const row = Math.floor(idx / 3);
                return {
                    ...stg,
                    position: {
                        x: 80 + col * 340,
                        y: 80 + row * 220
                    }
                };
            }
            return stg;
        });

        if (hasMissingPositions) {
            onUpdateStages(updated);
        }
    }, [stages.length]);

    // Calculate node coordinates helper
    const getNodePos = (stageId: string) => {
        const idx = stages.findIndex(s => s.id === stageId);
        if (idx === -1) return { x: 100, y: 100, width: 280, height: 160 };
        const stg = stages[idx];
        const x = stg.position?.x ?? (80 + (idx % 3) * 340);
        const y = stg.position?.y ?? (80 + Math.floor(idx / 3) * 220);
        return { x, y, width: 280, height: 160 };
    };

    // Auto layout (arrange nodes neatly in left-to-right rows)
    const handleAutoLayout = () => {
        const newStages = stages.map((stg, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            return {
                ...stg,
                position: {
                    x: 60 + col * 340,
                    y: 70 + row * 220
                }
            };
        });
        onUpdateStages(newStages);
    };

    // Auto-generate linear transitions if none exist
    const handleGenerateDefaultTransitions = () => {
        if (stages.length < 2) return;
        const newTransitions: WorkflowTransition[] = [];
        for (let i = 0; i < stages.length - 1; i++) {
            const current = stages[i];
            const next = stages[i + 1];
            newTransitions.push({
                id: `trans_${current.id}_${next.id}_${Date.now()}_${i}`,
                from_stage_id: current.id,
                to_stage_id: next.id,
                label: i === 0 ? 'Transmettre au Validateur' : 'Approuver et Passer au Jalon Suivant',
                trigger_type: i === 0 ? 'AUTO' : 'APPROVAL',
                button_label: i === 0 ? 'Soumettre' : 'Approuver',
                button_color: 'emerald',
                requires_comment: false
            });
        }
        onUpdateTransitions(newTransitions);
    };

    // Handle HTML5 Drag and drop from palette onto canvas
    const handlePaletteDragStart = (e: React.DragEvent, tmpl: StagePaletteTemplate) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'TEMPLATE', data: tmpl }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleStatusDragStart = (e: React.DragEvent, status: CustomStatusConfig) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'STATUS', data: status }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleCanvasDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        try {
            const parsed = JSON.parse(dataStr);
            const rect = canvasContainerRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Compute coordinates inside virtual canvas accounting for zoom and pan
            const clientX = e.clientX - rect.left - panOffset.x;
            const clientY = e.clientY - rect.top - panOffset.y;
            const dropX = Math.max(20, Math.round(clientX / zoom));
            const dropY = Math.max(20, Math.round(clientY / zoom));

            const newOrder = stages.length + 1;
            let newStage: StageConfig;

            if (parsed.type === 'STATUS') {
                const stat: CustomStatusConfig = parsed.data;
                const statusName = stat.label || stat.code || `Statut ${newOrder}`;
                const statusKey = stat.code || `STATUS_${newOrder}`;

                newStage = {
                    id: `stg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    order: newOrder,
                    name: statusName,
                    status_key: statusKey,
                    validator_role: availableRoles[0]?.name || 'Manager',
                    sla_hours: stat.sla_default_hours || 24,
                    fulfillment_mode: 'MANUAL_APPROVAL',
                    instruction: stat.description || `Traitement et validation pour l'état ${statusName}.`,
                    position: { x: dropX, y: dropY },
                    rules: [],
                    notifications: [
                        {
                            id: `n_${Date.now()}`,
                            trigger: 'ON_ENTER',
                            name: `Alerte assignation : ${statusName}`,
                            recipient_type: 'CURRENT_VALIDATOR',
                            subject: `[Dossier {reference}] Dossier à l'état ${statusName}`,
                            message: `Bonjour,\n\nLe dossier {reference} est passé à l'état ${statusName}.\nMerci de procéder à son instruction.`,
                            channel: 'BOTH',
                            enabled: true
                        }
                    ]
                };
            } else {
                const tmpl: StagePaletteTemplate = parsed.type === 'TEMPLATE' ? parsed.data : parsed;
                newStage = {
                    id: `stg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    order: newOrder,
                    name: tmpl.name,
                    status_key: tmpl.status_key,
                    validator_role: tmpl.role,
                    sla_hours: tmpl.sla_hours,
                    fulfillment_mode: tmpl.fulfillment_mode,
                    instruction: tmpl.description,
                    position: { x: dropX, y: dropY },
                    rules: [
                        {
                            id: `r_${Date.now()}`,
                            type: 'FORM_COMPLETION',
                            title: 'Complétion des champs requis',
                            description: 'Exige que tous les champs obligatoires du formulaire soient saisis',
                            enabled: true,
                            require_all_required: true
                        }
                    ],
                    notifications: [
                        {
                            id: `n_${Date.now()}`,
                            trigger: 'ON_ENTER',
                            name: `Alerte ${tmpl.name}`,
                            recipient_type: 'CURRENT_VALIDATOR',
                            subject: `[Dossier {reference}] Notification d'assignation : ${tmpl.name}`,
                            message: `Bonjour,\n\nLe dossier {reference} a atteint l'étape ${tmpl.name}.\nMerci d'effectuer le traitement requis.`,
                            channel: 'BOTH',
                            enabled: true
                        }
                    ]
                };
            }

            const updatedStages = [...stages, newStage];
            onUpdateStages(updatedStages);

            // Auto-link to last stage if desired
            if (stages.length > 0) {
                const prevStage = stages[stages.length - 1];
                const autoTrans: WorkflowTransition = {
                    id: `trans_${prevStage.id}_${newStage.id}_${Date.now()}`,
                    from_stage_id: prevStage.id,
                    to_stage_id: newStage.id,
                    label: 'Approuver',
                    trigger_type: 'APPROVAL',
                    button_label: 'Valider',
                    button_color: 'emerald'
                };
                onUpdateTransitions([...transitions, autoTrans]);
            }
        } catch (err) {
            console.error('Error dropping stage template:', err);
        }
    };

    // Node dragging handlers
    const handleNodeMouseDown = (e: React.MouseEvent, stageId: string) => {
        if (connectingFromStageId) return; // In linking mode
        e.stopPropagation();
        const stage = stages.find(s => s.id === stageId);
        if (!stage) return;

        const posX = stage.position?.x ?? 0;
        const posY = stage.position?.y ?? 0;

        setDraggingStageId(stageId);
        setDragOffset({
            x: e.clientX / zoom - posX,
            y: e.clientY / zoom - posY
        });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (rect) {
            const cX = (e.clientX - rect.left - panOffset.x) / zoom;
            const cY = (e.clientY - rect.top - panOffset.y) / zoom;
            setMouseCanvasPos({ x: cX, y: cY });
        }

        if (draggingStageId) {
            const newX = Math.max(10, Math.round(e.clientX / zoom - dragOffset.x));
            const newY = Math.max(10, Math.round(e.clientY / zoom - dragOffset.y));

            const updated = stages.map(s => {
                if (s.id === draggingStageId) {
                    return { ...s, position: { x: newX, y: newY } };
                }
                return s;
            });
            onUpdateStages(updated);
        } else if (isPanning) {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingStageId(null);
        setIsPanning(false);
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // Start panning if clicking directly on canvas background
        if (e.target === canvasContainerRef.current || (e.target as HTMLElement).tagName === 'svg') {
            if (connectingFromStageId) {
                // Cancel linking
                setConnectingFromStageId(null);
                return;
            }
            setIsPanning(true);
            setPanStart({
                x: e.clientX - panOffset.x,
                y: e.clientY - panOffset.y
            });
        }
    };

    // Linking mode: click output port of a stage
    const handleStartConnection = (stageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (connectingFromStageId === stageId) {
            setConnectingFromStageId(null);
        } else {
            setConnectingFromStageId(stageId);
        }
    };

    // Click target node while in linking mode
    const handleTargetNodeClick = (targetStageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!connectingFromStageId) return;
        if (connectingFromStageId === targetStageId) {
            setConnectingFromStageId(null);
            return;
        }

        // Open modal to configure new transition between source and target
        const fromStage = stages.find(s => s.id === connectingFromStageId);
        const toStage = stages.find(s => s.id === targetStageId);

        const newTrans: WorkflowTransition = {
            id: `trans_${connectingFromStageId}_${targetStageId}_${Date.now()}`,
            from_stage_id: connectingFromStageId,
            to_stage_id: targetStageId,
            label: `Passer à ${toStage?.name || 'Étape'}`,
            trigger_type: 'APPROVAL',
            button_label: 'Approuver & Transmettre',
            button_color: 'emerald',
            requires_comment: false
        };

        setEditingTransition(newTrans);
        setIsTransitionModalOpen(true);
        setConnectingFromStageId(null);
    };

    // Save or delete transition
    const handleSaveTransition = (t: WorkflowTransition) => {
        const existingIdx = transitions.findIndex(item => item.id === t.id);
        if (existingIdx > -1) {
            const updated = [...transitions];
            updated[existingIdx] = t;
            onUpdateTransitions(updated);
        } else {
            onUpdateTransitions([...transitions, t]);
        }
        setIsTransitionModalOpen(false);
        setEditingTransition(null);
    };

    const handleDeleteTransition = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onUpdateTransitions(transitions.filter(t => t.id !== id));
        if (selectedTransitionId === id) setSelectedTransitionId(null);
        if (editingTransition?.id === id) {
            setIsTransitionModalOpen(false);
            setEditingTransition(null);
        }
    };

    // Delete a stage from canvas
    const handleDeleteStage = (stageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (stages.length <= 1) {
            alert('Un workflow doit comporter au moins une étape.');
            return;
        }
        // Remove stage and any transitions connected to it
        const newStages = stages.filter(s => s.id !== stageId).map((s, idx) => ({ ...s, order: idx + 1 }));
        const newTransitions = transitions.filter(t => t.from_stage_id !== stageId && t.to_stage_id !== stageId);
        onUpdateStages(newStages);
        onUpdateTransitions(newTransitions);
    };

    // Duplicate a stage on canvas
    const handleDuplicateStage = (stageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const src = stages.find(s => s.id === stageId);
        if (!src) return;

        const newId = `stg_${Date.now()}_cloned`;
        const cloned: StageConfig = {
            ...JSON.parse(JSON.stringify(src)),
            id: newId,
            order: stages.length + 1,
            name: `${src.name} (Copie)`,
            position: {
                x: (src.position?.x ?? 100) + 40,
                y: (src.position?.y ?? 100) + 40
            }
        };

        onUpdateStages([...stages, cloned]);
    };

    // Render SVG path between two stages
    const renderConnectionPath = (trans: WorkflowTransition) => {
        const fromPos = getNodePos(trans.from_stage_id);
        const toPos = getNodePos(trans.to_stage_id);

        // Connection starts from right center of 'from' node
        const startX = fromPos.x + fromPos.width;
        const startY = fromPos.y + fromPos.height / 2;

        // Connection ends at left center of 'to' node
        const endX = toPos.x;
        const endY = toPos.y + toPos.height / 2;

        // Curve control points
        const dx = Math.abs(endX - startX);
        const cpOffset = Math.max(50, dx * 0.45);
        const cp1x = startX + cpOffset;
        const cp1y = startY;
        const cp2x = endX - cpOffset;
        const cp2y = endY;

        // If loopback (going backwards)
        const isBackward = endX < startX;
        let d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

        if (isBackward) {
            const detourY = Math.min(startY, endY) - 70;
            d = `M ${startX} ${startY} C ${startX + 60} ${startY}, ${startX + 60} ${detourY}, ${(startX + endX) / 2} ${detourY} C ${endX - 60} ${detourY}, ${endX - 60} ${endY}, ${endX} ${endY}`;
        }

        // Midpoint for badge placement
        const midX = (startX + endX) / 2;
        const midY = isBackward ? Math.min(startY, endY) - 60 : (startY + endY) / 2;

        // Color coding
        const isSelected = selectedTransitionId === trans.id;
        let strokeColor = '#3b82f6'; // default blue
        let badgeBg = 'bg-blue-600 text-white';

        if (trans.trigger_type === 'APPROVAL') {
            strokeColor = '#10b981'; // emerald
            badgeBg = 'bg-emerald-600 text-white';
        } else if (trans.trigger_type === 'REJECTION') {
            strokeColor = '#f43f5e'; // rose
            badgeBg = 'bg-rose-600 text-white';
        } else if (trans.trigger_type === 'RETURN') {
            strokeColor = '#f59e0b'; // amber
            badgeBg = 'bg-amber-600 text-white';
        } else if (trans.trigger_type === 'CONDITIONAL') {
            strokeColor = '#8b5cf6'; // purple
            badgeBg = 'bg-purple-600 text-white';
        } else if (trans.trigger_type === 'TIMEOUT') {
            strokeColor = '#ea580c'; // orange
            badgeBg = 'bg-orange-600 text-white';
        }

        return (
            <g key={trans.id} className="transition-all cursor-pointer">
                {/* Invisible wider hit area for easy clicking */}
                <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={20}
                    onClick={() => {
                        setSelectedTransitionId(trans.id);
                        setEditingTransition(trans);
                        setIsTransitionModalOpen(true);
                    }}
                />

                {/* Visible animated line */}
                <path
                    d={d}
                    fill="none"
                    stroke={isSelected ? '#1d4ed8' : strokeColor}
                    strokeWidth={isSelected ? 3.5 : 2.2}
                    strokeDasharray={trans.trigger_type === 'CONDITIONAL' || trans.trigger_type === 'TIMEOUT' ? '6,4' : undefined}
                    markerEnd="url(#arrowhead)"
                    className="hover:stroke-blue-700 transition"
                    onClick={() => {
                        setSelectedTransitionId(trans.id);
                        setEditingTransition(trans);
                        setIsTransitionModalOpen(true);
                    }}
                />

                {/* Transition badge label placed at midpoint */}
                <foreignObject
                    x={midX - 70}
                    y={midY - 14}
                    width={140}
                    height={32}
                    className="overflow-visible pointer-events-auto"
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransitionId(trans.id);
                            setEditingTransition(trans);
                            setIsTransitionModalOpen(true);
                        }}
                        className={`group px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs border border-white/60 flex items-center justify-between gap-1 cursor-pointer transition hover:scale-105 ${badgeBg}`}
                        title={`${trans.label} (${trans.trigger_type}) - Cliquez pour configurer`}
                    >
                        <span className="truncate max-w-[105px]">{trans.label}</span>
                        <button
                            type="button"
                            onClick={(e) => handleDeleteTransition(trans.id, e)}
                            className="text-white/80 hover:text-white p-0.5 rounded hover:bg-black/20"
                            title="Supprimer cette transition"
                        >
                            <Trash2 className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </foreignObject>
            </g>
        );
    };

    // Render interactive connecting line from source node to cursor
    const renderActiveConnectingLine = () => {
        if (!connectingFromStageId) return null;
        const fromPos = getNodePos(connectingFromStageId);
        const startX = fromPos.x + fromPos.width;
        const startY = fromPos.y + fromPos.height / 2;
        const endX = mouseCanvasPos.x;
        const endY = mouseCanvasPos.y;

        const d = `M ${startX} ${startY} L ${endX} ${endY}`;
        return (
            <g className="pointer-events-none">
                <path
                    d={d}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    strokeDasharray="4,4"
                    className="animate-pulse"
                />
                <circle cx={endX} cy={endY} r={6} fill="#2563eb" className="animate-ping" />
                <circle cx={endX} cy={endY} r={4} fill="#2563eb" />
            </g>
        );
    };

    // Filter templates and statuses based on palette search
    const filteredTemplates = useMemo(() => {
        if (!paletteSearch.trim()) return PALETTE_TEMPLATES;
        const q = paletteSearch.toLowerCase();
        return PALETTE_TEMPLATES.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.role.toLowerCase().includes(q) ||
            t.status_key.toLowerCase().includes(q)
        );
    }, [paletteSearch]);

    const filteredStatuses = useMemo(() => {
        if (!availableStatuses || availableStatuses.length === 0) return [];
        if (!paletteSearch.trim()) return availableStatuses;
        const q = paletteSearch.toLowerCase();
        return availableStatuses.filter(s =>
            (s.code || '').toLowerCase().includes(q) ||
            (s.label || '').toLowerCase().includes(q)
        );
    }, [availableStatuses, paletteSearch]);

    return (
        <div className={`relative bg-gray-50 flex flex-col ${
            isFullscreen
                ? 'fixed inset-0 z-50 rounded-none bg-white h-screen w-screen'
                : isDedicatedPage
                    ? 'h-full flex-1 rounded-none border-0 shadow-none overflow-hidden'
                    : 'border border-gray-200 rounded-2xl overflow-hidden shadow-xs min-h-[720px] h-[780px]'
        }`}>
            {/* Top Canvas Action Bar */}
            <div className="bg-white border-b border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                        className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${isPaletteOpen ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'}`}
                        title={isPaletteOpen ? "Masquer la palette latérale" : "Afficher la palette latérale"}
                    >
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>{isPaletteOpen ? 'Palette (Active)' : 'Afficher la Palette'}</span>
                    </button>
                    <div>
                        <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            Studio Visuel Drag-and-Drop & Transitions Métiers
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold">
                                {stages.length} étapes • {transitions.length} transitions
                            </span>
                        </h3>
                        <p className="text-[11px] text-gray-500">
                            Glissez des étapes depuis la palette, déplacez-les librement sur le canevas et reliez les ports pour définir les transitions.
                        </p>
                    </div>
                </div>

                {/* Toolbar controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    {connectingFromStageId && (
                        <div className="bg-amber-100 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1.5 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                            <span>Cliquez sur une étape cible pour la relier...</span>
                            <button
                                type="button"
                                onClick={() => setConnectingFromStageId(null)}
                                className="text-amber-800 hover:text-black font-bold ml-1 text-sm leading-none"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {!isDedicatedPage && onOpenDedicatedPage && (
                        <button
                            type="button"
                            onClick={onOpenDedicatedPage}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            title="Ouvrir l'espace de modélisation dans une nouvelle page pour voir en grand"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Pleine Page</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleAutoLayout}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Réaligner automatiquement les étapes en grille ordonnée"
                    >
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        Aligner
                    </button>

                    {transitions.length === 0 && stages.length >= 2 && (
                        <button
                            type="button"
                            onClick={handleGenerateDefaultTransitions}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="Créer une liaison linéaire 1 -> 2 -> 3..."
                        >
                            <Zap className="w-3.5 h-3.5 text-blue-600" />
                            Relier en Série
                        </button>
                    )}

                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5">
                        <button
                            type="button"
                            onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                            className="p-1 hover:bg-white rounded text-gray-600"
                            title="Zoom arrière"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1.5 text-gray-700 select-none">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={() => setZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                            className="p-1 hover:bg-white rounded text-gray-600"
                            title="Zoom avant"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                            className="p-1 hover:bg-white rounded text-gray-600"
                            title="Réinitialiser le zoom (100%)"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={`p-1.5 rounded-lg text-xs transition cursor-pointer border ${isFullscreen ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'}`}
                        title={isFullscreen ? "Quitter le mode plein écran" : "Passer en mode plein écran (Focus Mode)"}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Main Area: Sidebar Palette + Canvas Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Drawer Palette: Preconfigured Step Blocks & System Statuses */}
                {isPaletteOpen && (
                    <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-xs">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/70 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                    Palette des Éléments
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsPaletteOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded text-xs"
                                    title="Masquer la palette"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Search bar in palette */}
                            <input
                                type="text"
                                placeholder="Filtrer modèles / statuts..."
                                value={paletteSearch}
                                onChange={e => setPaletteSearch(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-hidden focus:ring-1 focus:ring-blue-600"
                            />

                            {/* Tabs: Pre-configured templates vs System Statuses */}
                            <div className="grid grid-cols-2 gap-1 bg-gray-200/60 p-0.5 rounded-lg text-[10px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => setPaletteTab('templates')}
                                    className={`py-1 rounded text-center transition cursor-pointer ${paletteTab === 'templates' ? 'bg-white text-blue-900 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Modèles ({filteredTemplates.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaletteTab('statuses')}
                                    className={`py-1 rounded text-center transition cursor-pointer ${paletteTab === 'statuses' ? 'bg-white text-blue-900 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Statuts ({filteredStatuses.length})
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {paletteTab === 'templates' ? (
                                filteredTemplates.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-6">Aucun modèle correspondant</p>
                                ) : (
                                    filteredTemplates.map(tmpl => (
                                        <div
                                            key={tmpl.id}
                                            draggable
                                            onDragStart={(e) => handlePaletteDragStart(e, tmpl)}
                                            className="p-2.5 rounded-xl border border-dashed border-gray-300 hover:border-blue-500 bg-white hover:bg-blue-50/40 transition cursor-grab active:cursor-grabbing flex flex-col gap-1 shadow-2xs group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <GripVertical className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                                                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-900">
                                                        {tmpl.name}
                                                    </h4>
                                                </div>
                                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-bold">
                                                    {tmpl.sla_hours}h
                                                </span>
                                            </div>

                                            <p className="text-[10px] text-gray-500 line-clamp-2">
                                                {tmpl.description}
                                            </p>

                                            <div className="flex items-center justify-between pt-1 text-[10px]">
                                                <span className="font-semibold text-blue-700">
                                                    {tmpl.role}
                                                </span>
                                                <span className="font-mono text-[9px] px-1 rounded bg-gray-100 text-gray-600">
                                                    {tmpl.status_key}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                filteredStatuses.length === 0 ? (
                                    <div className="text-center py-6 space-y-2">
                                        <p className="text-xs text-gray-400">Aucun statut disponible</p>
                                        <a
                                            href="/admin/statuts"
                                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Créer des statuts
                                        </a>
                                    </div>
                                ) : (
                                    filteredStatuses.map((st, idx) => (
                                        <div
                                            key={st.id || idx}
                                            draggable
                                            onDragStart={(e) => handleStatusDragStart(e, st)}
                                            className="p-2.5 rounded-xl border border-dashed border-gray-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition cursor-grab active:cursor-grabbing flex flex-col gap-1 shadow-2xs group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <GripVertical className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                                                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">
                                                        {st.label || st.code}
                                                    </h4>
                                                </div>
                                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                                    {st.code || 'STATUT'}
                                                </span>
                                            </div>
                                            {st.description && (
                                                <p className="text-[10px] text-gray-500 line-clamp-1">
                                                    {st.description}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )
                            )}
                        </div>

                        {/* Bottom Link to Status Configurator */}
                        <div className="p-3 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-600 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 flex items-center gap-1 text-[10px]">
                                    <HelpCircle className="w-3 h-3 text-blue-600" />
                                    Guide Visuel
                                </span>
                                <a
                                    href="/admin/statuts"
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                                    title="Ouvrir le configurateur de statuts global"
                                >
                                    Configurateur Statuts
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            </div>
                            <ul className="text-[10px] space-y-0.5 text-gray-500 list-disc list-inside">
                                <li>Glissez un bloc sur le canevas</li>
                                <li>Reliez les nœuds via le bouton <strong>+ Relier</strong></li>
                                <li>Cliquez sur une flèche pour éditer les règles</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Floating button when palette is hidden */}
                {!isPaletteOpen && (
                    <button
                        type="button"
                        onClick={() => setIsPaletteOpen(true)}
                        className="absolute left-3 top-3 z-20 bg-white/95 backdrop-blur-xs border border-gray-300 shadow-md hover:bg-blue-50 text-gray-800 hover:text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                        title="Afficher la palette latérale"
                    >
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ouvrir la Palette</span>
                    </button>
                )}

                {/* Right Area: Interactive Drag & Drop Canvas */}
                <div
                    ref={canvasContainerRef}
                    onDragOver={handleCanvasDragOver}
                    onDrop={handleCanvasDrop}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseDown={handleCanvasMouseDown}
                    className="flex-1 relative overflow-hidden bg-slate-50 select-none cursor-default"
                    style={{
                        backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
                        backgroundSize: '24px 24px'
                    }}
                >
                    {/* Inner virtual space transformed by zoom and pan */}
                    <div
                        style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                            transformOrigin: '0 0',
                            width: '3200px',
                            height: '2400px',
                            position: 'absolute',
                            left: 0,
                            top: 0
                        }}
                    >
                        {/* SVG Layer for Transitions & Connections */}
                        <svg
                            className="absolute inset-0 pointer-events-auto"
                            style={{ width: '100%', height: '100%' }}
                        >
                            <defs>
                                <marker
                                    id="arrowhead"
                                    viewBox="0 0 10 10"
                                    refX="8"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                                </marker>
                            </defs>

                            {/* Render existing transitions */}
                            {transitions.map(trans => renderConnectionPath(trans))}

                            {/* Render active dragging link */}
                            {renderActiveConnectingLine()}
                        </svg>

                        {/* HTML Nodes Layer */}
                        {stages.map((stg, idx) => {
                            const pos = getNodePos(stg.id);
                            const isDragging = draggingStageId === stg.id;
                            const isConnectSource = connectingFromStageId === stg.id;
                            const rulesCount = stg.rules?.filter(r => r.enabled).length || 0;
                            const notifsCount = stg.notifications?.filter(n => n.enabled).length || 0;
                            const matchedStatus = availableStatuses.find(s => s.code === stg.status_key);

                            return (
                                <div
                                    key={stg.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${pos.x}px`,
                                        top: `${pos.y}px`,
                                        width: `${pos.width}px`
                                    }}
                                    onMouseDown={(e) => handleNodeMouseDown(e, stg.id)}
                                    onClick={(e) => {
                                        if (connectingFromStageId && connectingFromStageId !== stg.id) {
                                            handleTargetNodeClick(stg.id, e);
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        onSelectStageForDeepConfig(idx);
                                    }}
                                    className={`bg-white rounded-2xl border transition-shadow duration-150 select-none shadow-md ${
                                        isConnectSource
                                            ? 'ring-4 ring-blue-500 border-blue-600 shadow-xl'
                                            : isDragging
                                            ? 'shadow-2xl ring-2 ring-blue-400 opacity-90 cursor-grabbing'
                                            : 'border-gray-200 hover:border-blue-400 hover:shadow-lg'
                                    } ${connectingFromStageId && connectingFromStageId !== stg.id ? 'hover:ring-4 hover:ring-emerald-400 cursor-pointer' : ''}`}
                                >
                                    {/* Left Input Port */}
                                    <div
                                        className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-600 shadow-xs flex items-center justify-center cursor-pointer hover:scale-125 transition"
                                        title="Port d'entrée : point de raccordement des transitions entrantes"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                    </div>

                                    {/* Right Output Port / Link Trigger */}
                                    <div
                                        onClick={(e) => handleStartConnection(stg.id, e)}
                                        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition shadow-sm hover:scale-125 ${
                                            isConnectSource
                                                ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-300'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                        title={isConnectSource ? "Annuler le tracé" : "Cliquer pour relier cette étape à une autre"}
                                    >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Node Card Header */}
                                    <div className="p-3 border-b border-gray-100 bg-gray-50/80 rounded-t-2xl flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </span>
                                            <h4 className="text-xs font-bold text-gray-900 truncate" title={stg.name}>
                                                {stg.name}
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => handleDuplicateStage(stg.id, e)}
                                                className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition"
                                                title="Dupliquer l'étape"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteStage(stg.id, e)}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                                                title="Supprimer l'étape"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Node Card Content */}
                                    <div className="p-3 space-y-2">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 truncate max-w-[130px]">
                                                {stg.validator_role}
                                            </span>
                                            <span className="font-mono text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                {stg.sla_hours || 24}h SLA
                                            </span>
                                        </div>

                                        {/* Status Key Badge */}
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 truncate max-w-[160px]" title={stg.status_key}>
                                                {matchedStatus ? matchedStatus.label : stg.status_key || 'AUCUN'}
                                            </span>
                                            <span className="text-[9px] text-gray-400">
                                                {stg.fulfillment_mode === 'AUTO_WHEN_RULES_PASS' ? '⚡ Auto' : '👤 Manuel'}
                                            </span>
                                        </div>

                                        {/* Rules & Notifications summary pills */}
                                        <div className="flex items-center gap-1.5 pt-1 text-[9px]">
                                            <span className={`px-1.5 py-0.2 rounded font-bold ${rulesCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                                                {rulesCount} règle{rulesCount > 1 ? 's' : ''}
                                            </span>
                                            <span className={`px-1.5 py-0.2 rounded font-bold ${notifsCount > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-500'}`}>
                                                {notifsCount} notif{notifsCount > 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Quick Action Button: Configure Rules */}
                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectStageForDeepConfig(idx);
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                            >
                                                <Sliders className="w-3 h-3" />
                                                Configurer règles & SLA
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => handleStartConnection(stg.id, e)}
                                                className="text-[10px] font-bold text-gray-600 hover:text-blue-600 flex items-center gap-0.5 bg-gray-100 hover:bg-blue-50 px-2 py-0.5 rounded transition"
                                            >
                                                <ArrowRight className="w-2.5 h-2.5" />
                                                Relier
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal: Transition Configuration (Define conditions, triggers, buttons) */}
            {isTransitionModalOpen && editingTransition && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in duration-150">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                                    <CornerDownRight className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        Configuration de la Transition Métier
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Définissez les conditions d'évolution entre deux étapes du workflow.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsTransitionModalOpen(false); setEditingTransition(null); }}
                                className="text-gray-400 hover:text-gray-600 text-lg p-1"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                            {/* Source and Target Steps */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-900 mb-1">
                                        Étape Origine (From)
                                    </label>
                                    <select
                                        value={editingTransition.from_stage_id}
                                        onChange={(e) => setEditingTransition({ ...editingTransition, from_stage_id: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 outline-hidden"
                                    >
                                        {stages.map(s => (
                                            <option key={s.id} value={s.id}>
                                                #{s.order} - {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-blue-900 mb-1">
                                        Étape Destination (To)
                                    </label>
                                    <select
                                        value={editingTransition.to_stage_id}
                                        onChange={(e) => setEditingTransition({ ...editingTransition, to_stage_id: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 outline-hidden"
                                    >
                                        {stages.map(s => (
                                            <option key={s.id} value={s.id}>
                                                #{s.order} - {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Label */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Libellé de la Transition <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingTransition.label}
                                    onChange={(e) => setEditingTransition({ ...editingTransition, label: e.target.value })}
                                    placeholder="ex: Approuver et Transmettre au Site"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            {/* Trigger Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Type de Déclenchement
                                </label>
                                <select
                                    value={editingTransition.trigger_type}
                                    onChange={(e) => setEditingTransition({ ...editingTransition, trigger_type: e.target.value as TransitionTriggerType })}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                >
                                    <option value="APPROVAL">🟢 Validation Manuelle (Approbation par le rôle de l'étape)</option>
                                    <option value="REJECTION">🔴 Refus / Rejet (Clôture négative du dossier)</option>
                                    <option value="RETURN">🟠 Demande de Complément (Renvoi à l'agent demandeur)</option>
                                    <option value="AUTO">⚡ Automatique (Dès que toutes les règles sont validées)</option>
                                    <option value="CONDITIONAL">🟣 Branchement Conditionnel (Basé sur les données du formulaire)</option>
                                    <option value="TIMEOUT">⏱️ Escalade sur Dépassement SLA</option>
                                </select>
                            </div>

                            {/* Conditional Branching Settings */}
                            {editingTransition.trigger_type === 'CONDITIONAL' && (
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                                    <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                                        <Filter className="w-3.5 h-3.5 text-purple-700" />
                                        Condition Métier sur Champ de Formulaire
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-purple-800 mb-1">Champ</label>
                                            <select
                                                value={editingTransition.condition_field || ''}
                                                onChange={(e) => setEditingTransition({ ...editingTransition, condition_field: e.target.value })}
                                                className="w-full bg-white border border-purple-200 rounded p-1.5 text-xs outline-hidden"
                                            >
                                                <option value="">Sélectionner...</option>
                                                {availableFields.map(f => (
                                                    <option key={f.id} value={f.id}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold text-purple-800 mb-1">Opérateur</label>
                                            <select
                                                value={editingTransition.condition_operator || 'EQUALS'}
                                                onChange={(e) => setEditingTransition({ ...editingTransition, condition_operator: e.target.value as any })}
                                                className="w-full bg-white border border-purple-200 rounded p-1.5 text-xs outline-hidden"
                                            >
                                                <option value="EQUALS">Égal à (=)</option>
                                                <option value="NOT_EQUALS">Différent de (≠)</option>
                                                <option value="GREATER_THAN">Supérieur à (&gt;)</option>
                                                <option value="LESS_THAN">Inférieur à (&lt;)</option>
                                                <option value="CONTAINS">Contient</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold text-purple-800 mb-1">Valeur Attendue</label>
                                            <input
                                                type="text"
                                                value={editingTransition.condition_value || ''}
                                                onChange={(e) => setEditingTransition({ ...editingTransition, condition_value: e.target.value })}
                                                placeholder="ex: 5000"
                                                className="w-full bg-white border border-purple-200 rounded p-1.5 text-xs outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Button Label & Action Style for Validators */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Intitulé du Bouton d'Action
                                    </label>
                                    <input
                                        type="text"
                                        value={editingTransition.button_label || ''}
                                        onChange={(e) => setEditingTransition({ ...editingTransition, button_label: e.target.value })}
                                        placeholder="ex: Valider et Transmettre"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Couleur du Bouton
                                    </label>
                                    <select
                                        value={editingTransition.button_color || 'emerald'}
                                        onChange={(e) => setEditingTransition({ ...editingTransition, button_color: e.target.value as any })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-hidden"
                                    >
                                        <option value="emerald">Vert Émeraude (Validation)</option>
                                        <option value="blue">Bleu Institutionnel (Neutre / Suivant)</option>
                                        <option value="rose">Rouge / Rose (Refus)</option>
                                        <option value="amber">Orange / Ambre (Complément)</option>
                                        <option value="purple">Violet (Conditionnel)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Governance requirements */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingTransition.requires_comment || false}
                                        onChange={(e) => setEditingTransition({ ...editingTransition, requires_comment: e.target.checked })}
                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    <span className="text-xs text-gray-700 font-medium">
                                        Exiger une justification écrite obligatoire de l'opérateur pour franchir cette étape
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingTransition.requires_document || false}
                                        onChange={(e) => setEditingTransition({ ...editingTransition, requires_document: e.target.checked })}
                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    <span className="text-xs text-gray-700 font-medium">
                                        Exiger le téléversement d'un procès-verbal ou document justificatif
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => handleDeleteTransition(editingTransition.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer la transition
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsTransitionModalOpen(false); setEditingTransition(null); }}
                                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaveTransition(editingTransition)}
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                                >
                                    Enregistrer la Transition
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
