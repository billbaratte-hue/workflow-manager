import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ParentRequest,
    RequestItem,
    ParentRequestStatus,
    RequestItemStatus,
    RequestType,
    HardwareOrigin,
    UserOrderQuota,
    PortalAuditLog,
    WorkflowRulesConfig
} from '../types';
import { WorkflowCreatorModal } from '../components/WorkflowCreatorModal';
import { WorkflowRulesViewer } from '../components/WorkflowRulesViewer';
import {
    WORKFLOW_TEMPLATES,
    CUSTOM_BLANK_TEMPLATE,
    WorkflowTemplate,
    getTemplateByProcessNum
} from '../data/workflowTemplates';

export default function WorkflowStateMachine() {
    const [dossiers, setDossiers] = useState<ParentRequest[]>([]);
    const [auditLogs, setAuditLogs] = useState<PortalAuditLog[]>([]);
    const [quota, setQuota] = useState<UserOrderQuota | null>(null);
    const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
    const [dbProcesses, setDbProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'dossiers' | 'flowchart' | 'process_generator' | 'quotas' | 'audit'>('dossiers');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
    const [expandedDossierId, setExpandedDossierId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Generic Workflow Creator Modal State
    const [isWorkflowCreatorOpen, setIsWorkflowCreatorOpen] = useState<boolean>(false);
    const [creatorTemplateToEdit, setCreatorTemplateToEdit] = useState<WorkflowTemplate | null>(null);

    // Modal dialog state
    const [activeModal, setActiveModal] = useState<{
        type: 'REJECT_ITEM' | 'PO_LINK' | 'GPS_MODAL' | 'BLACKLIST_MODAL' | 'KEY_DECISION' | null;
        targetId?: string;
        data?: any;
    }>({ type: null });

    const [modalInput1, setModalInput1] = useState<string>('');
    const [modalInput2, setModalInput2] = useState<string>('');

    const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 6000);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [dRes, aRes, qRes, sRes, pRes] = await Promise.all([
                fetch('/api/v1/workflow/dossiers'),
                fetch('/api/v1/workflow/audit-logs'),
                fetch('/api/v1/workflow/quotas/1042'), // Daniel Dupont's quota
                fetch('/api/v1/admin/settings'),
                fetch('/api/v1/admin/processus')
            ]);

            if (dRes.ok) setDossiers(await dRes.json());
            if (aRes.ok) setAuditLogs(await aRes.json());
            if (qRes.ok) setQuota(await qRes.json());
            if (sRes.ok) {
                const settingsList = await sRes.json();
                const settingsMap: Record<string, any> = {};
                for (const item of settingsList) {
                    settingsMap[item.key] = item.parsed_value;
                }
                setSystemSettings(settingsMap);
            }
            if (pRes.ok) {
                const procList = await pRes.json();
                setDbProcesses(Array.isArray(procList) ? procList : []);
            }
        } catch (e: any) {
            notify(`Erreur de chargement: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const liveWorkflowTemplates = useMemo<WorkflowTemplate[]>(() => {
        if (dbProcesses && dbProcesses.length > 0) {
            return dbProcesses.map((p: any) => {
                const reqType = (p.request_type || 'HABILITATION') as RequestType;
                const defaultItemType = reqType === 'KEY_ORDER' ? 'KEY'
                    : reqType === 'CYLINDER_ORDER' ? 'CYLINDER'
                    : reqType === 'TERMINAL_ORDER' ? 'TERMINAL'
                    : reqType === 'USER_ACCOUNT' ? 'USER_CREATION'
                    : reqType === 'MASS_DEPLOY' ? 'MASS_BATCH'
                    : reqType === 'INCIDENT' ? 'INCIDENT_DECLARATION'
                    : reqType === 'ORG_CHANGE' ? 'ORG_TRANSFER'
                    : 'ACCESS_RIGHT';

                const catName = p.category_id === 1 ? 'Accès & Profils'
                    : p.category_id === 2 ? 'Équipements & Matériel'
                    : p.category_id === 3 ? 'Opérations Réseau'
                    : 'Sécurité & Incidents';

                return {
                    id: `proc-${p.id}`,
                    process_number: p.id,
                    code: `WF-${String(p.id).padStart(2, '0')}`,
                    name: p.name,
                    short_title: p.name,
                    category: catName as any,
                    request_type: reqType,
                    default_title: p.name,
                    default_description: p.description || 'Workflow dynamique configuré par l\'administrateur',
                    default_site_name: 'Paris Gare du Nord',
                    has_special_tag: Boolean(p.has_special_tag),
                    rules: p.workflow_rules || {
                        validation_mode: 'PARALLEL_ITEMS',
                        sla_hours: 24,
                        requires_gps: false,
                        check_quota: false,
                        requires_quote_po: false,
                        requires_gdpr: false
                    },
                    default_items: [
                        {
                            item_type: defaultItemType,
                            label: p.name,
                            target_site_name: 'Paris Gare du Nord',
                            designated_validator_name: p.stages?.[0]?.validator_role || 'Manager'
                        }
                    ]
                };
            });
        }
        return WORKFLOW_TEMPLATES;
    }, [dbProcesses]);

    useEffect(() => {
        loadData();
    }, []);

    // Workflow actions
    const handleSubmitDossier = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/submit`, { method: 'POST' });
            if (!res.ok) throw new Error((await res.json()).error);
            notify('Dossier soumis avec succès. Évaluation du quota S10 effectuée.');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleEvaluateItem = async (itemId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/items/${itemId}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, rejection_reason: reason })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            notify(decision === 'APPROVE' ? 'Accès unitaire validé pour le site désigné (Asynchrone)' : 'Accès unitaire refusé');
            setActiveModal({ type: null });
            setModalInput1('');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleCrossValidate = async (id: string, decision: 'APPROVE' | 'REJECT') => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/cross-validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            notify('Validation conjointe Manager + Validateur enregistrée');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleNationalDecision = async (id: string, decision: 'APPROVE' | 'REJECT') => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/national-decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            notify(decision === 'APPROVE' ? 'Arbitrage Référent National validé : dossier débloqué' : 'Dossier rejeté par le Référent National');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleAcceptGDPR = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/accept-gdpr`, { method: 'POST' });
            if (!res.ok) throw new Error((await res.json()).error);
            notify('Charte de transmission des données personnelles (RGPD) acceptée.');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleDecideKey = async (id: string, needsKey: boolean) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/decide-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ needs_key: needsKey })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            const data = await res.json();
            if (needsKey && data.chainedKeyDossier) {
                notify(`Nouvelle demande de clé chaînée créée avec succès : ${data.chainedKeyDossier.request_number}`);
            } else {
                notify('Compte clôturé avec succès sans demande de clé.');
            }
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleLinkPO = async (id: string, poNumber: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/link-po`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ external_order_ref: poNumber })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            notify(`Bon de commande ${poNumber} associé. Statut mis à jour : DISPATCHED_IN_TRANSIT.`);
            setActiveModal({ type: null });
            setModalInput1('');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleSignPV = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/sign-pv`, { method: 'POST' });
            if (!res.ok) throw new Error((await res.json()).error);
            notify('Procès-verbal de réception signé électroniquement.');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleTriggerReminder = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/trigger-reminder`, { method: 'POST' });
            if (!res.ok) throw new Error((await res.json()).error);
            const data = await res.json();
            if (data.dossier.status === 'AUTO_ESCALATED_INCIDENT') {
                notify('ALERTE S14 : Seuil de 3 relances atteint sans accusé de réception. Escalade automatique en incident Perte/Vol.', 'error');
            } else {
                notify(`Relance S14 transmise au destinataire (Relance #${data.reminder.reminder_count}/3).`);
            }
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleValidateGPS = async (id: string, lat: string, lon: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/validate-gps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lon), installer_name: 'Technicien d\'Installation' })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            notify('Coordonnées GPS de pose validées. Équipement mis en service actif (ACTIVE_FULFILLED).');
            setActiveModal({ type: null });
            setModalInput1('');
            setModalInput2('');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleBlacklist = async (id: string, serial: string, reason: string) => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/blacklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ compromised_serial: serial, reason })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            const data = await res.json();
            notify(`Clé #${serial} révoquée et inscrite en Liste Noire. Alerte de sécurité émise. Demande de remplacement créée : ${data.replacementDossier.request_number}`);
            setActiveModal({ type: null });
            setModalInput1('');
            setModalInput2('');
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleArchive = async (id: string, type: 'COMPLETED' | 'ABANDONED') => {
        try {
            const res = await fetch(`/api/v1/workflow/dossiers/${id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            notify(`Dossier archivé (${type === 'COMPLETED' ? 'Clôture normale' : 'Abandonné'}).`);
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    // Generic Process Creator from Template (Zero-Hardcoding)
    const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
        try {
            const payload = {
                request_type: template.request_type,
                title: template.default_title,
                description: template.default_description,
                site_name: template.default_site_name,
                requester_name: 'Daniel Dupont',
                requester_email: 'demandeur@entreprise.fr',
                requester_id: 1042,
                has_special_tag: template.has_special_tag,
                quote_amount: template.rules.requires_quote_po ? (template.rules.custom_quote_amount || 85.00) : 0,
                quote_currency: template.rules.custom_quote_currency || 'EUR',
                workflow_rules: template.rules,
                metadata: {
                    source_template_id: template.id,
                    ...template.metadata
                },
                items: template.default_items.map(item => ({
                    item_type: item.item_type,
                    label: item.label,
                    target_site_name: item.target_site_name || template.default_site_name,
                    designated_validator_name: item.designated_validator_name || 'Valérie Validateur',
                    hardware_origin: item.hardware_origin || 'NEW_ORDER',
                    hardware_serial_number: item.hardware_serial_number || null,
                    status: 'DRAFT'
                }))
            };

            const res = await fetch('/api/v1/workflow/dossiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error);
            const created = await res.json();
            notify(`Workflow "${template.short_title}" instancié (${created.request_number}) avec ses règles système embarquées.`);
            setActiveTab('dossiers');
            setExpandedDossierId(created.id);
            loadData();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const handleCreateProcessInstance = async (processNum: number) => {
        const tpl = getTemplateByProcessNum(processNum);
        if (tpl) {
            await handleCreateFromTemplate(tpl);
        } else {
            notify(`Modèle introuvable pour le Processus ${processNum}`, 'error');
        }
    };

    const getStatusBadge = (status: ParentRequestStatus | RequestItemStatus) => {
        const styles: Record<string, { bg: string; text: string; label: string }> = {
            DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon' },
            SUBMITTED: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Soumis' },
            ESCALATED_NATIONAL: { bg: 'bg-red-50', text: 'text-red-700', label: 'Arbitrage National (S10)' },
            PENDING_VAL_PARALLEL: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Validation Parallèle Sites' },
            ITEM_APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Accès Site Validé' },
            ITEM_REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Accès Site Refusé' },
            PENDING_CROSS_VAL: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Validation Croisée' },
            PENDING_GDPR: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Charte RGPD Requise' },
            PENDING_KEY_DECISION: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Décision Attribution Clé' },
            PENDING_QUOTE_PO: { bg: 'bg-yellow-50', text: 'text-yellow-800', label: 'Attente Bon de Commande (S9)' },
            ORDER_LINKED: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Commande Associée' },
            DISPATCHED_IN_TRANSIT: { bg: 'bg-cyan-50', text: 'text-cyan-700', label: 'Expédié / En Transit' },
            AUTO_ESCALATED_INCIDENT: { bg: 'bg-red-100', text: 'text-red-800', label: 'Incident Perte/Vol Auto (S14)' },
            COMMISSIONING_GPS: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Pose & Relevé GPS Requis' },
            ACTIVE_FULFILLED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Actif / Service Fait' },
            INCIDENT_REPORTED: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Incident Signalé' },
            BLACKLIST_RESTRICTED: { bg: 'bg-zinc-900', text: 'text-zinc-100', label: 'Liste Noire & Révocation' },
            ARCHIVED_COMPLETED: { bg: 'bg-gray-200', text: 'text-gray-800', label: 'Archivé (Clôturé)' },
            ARCHIVED_REJECTED: { bg: 'bg-red-200', text: 'text-red-900', label: 'Archivé (Refusé)' },
            ARCHIVED_ABANDONED: { bg: 'bg-gray-300', text: 'text-gray-900', label: 'Archivé (Abandonné)' }
        };

        const config = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border border-black/5`}>
                {config.label}
            </span>
        );
    };

    const filteredDossiers = dossiers.filter(d => {
        if (selectedStatusFilter !== 'ALL' && d.status !== selectedStatusFilter) return false;
        if (selectedTypeFilter !== 'ALL' && d.request_type !== selectedTypeFilter) return false;
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Banner */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-600 text-white text-xs uppercase px-2.5 py-0.5 rounded font-bold tracking-wider">
                                Gouvernance Multi-Sites
                            </span>
                            <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded font-semibold">
                                Cahier des Charges Opérationnel
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-semibold">
                                Architecture Parent-Enfant
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Machine à États & Gouvernance des Processus Mécatroniques
                        </h1>
                        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                            Gestion asynchrone des droits d'accès par site sans blocage de dossier global, double validation croisée,
                            devis différentiel, compteurs de quotas, relances automatiques et révocation de sécurité.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-2xs"
                        >
                            <i className="fas fa-sync-alt mr-2 text-gray-400"></i> Actualiser
                        </button>
                        <button
                            onClick={() => {
                                setCreatorTemplateToEdit(null);
                                setIsWorkflowCreatorOpen(true);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-xs transition"
                        >
                            <i className="fas fa-plus-circle mr-2"></i> Créer un Workflow & Règles Embarquées
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-gray-200 mt-6 space-x-6 text-sm">
                    <button
                        onClick={() => setActiveTab('dossiers')}
                        className={`pb-3 font-semibold transition border-b-2 ${activeTab === 'dossiers' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-layer-group mr-2"></i> Dossiers & Éléments Unitaires ({dossiers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('flowchart')}
                        className={`pb-3 font-semibold transition border-b-2 ${activeTab === 'flowchart' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-project-diagram mr-2"></i> Diagramme de la Machine à États
                    </button>
                    <button
                        onClick={() => setActiveTab('process_generator')}
                        className={`pb-3 font-semibold transition border-b-2 ${activeTab === 'process_generator' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-magic mr-2"></i> Générateur des 8 Processus Métier
                    </button>
                    <button
                        onClick={() => setActiveTab('quotas')}
                        className={`pb-3 font-semibold transition border-b-2 ${activeTab === 'quotas' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-calculator mr-2"></i> Simulateur Quotas & Devis S9/S10
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`pb-3 font-semibold transition border-b-2 ${activeTab === 'audit' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-history mr-2"></i> Registre d'Audit des Événements ({auditLogs.length})
                    </button>
                </div>
            </div>

            {/* Notification message */}
            {notification && (
                <div className={`p-4 mb-6 rounded-lg text-sm flex items-center justify-between ${
                    notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    notification.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                    'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <i className={`fas ${notification.type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                        <span>{notification.message}</span>
                    </div>
                    <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* TAB 1: Dossiers & RequestItems (Parent-Child Table) */}
            {activeTab === 'dossiers' && (
                <div className="space-y-6">
                    {/* Filters bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Filtrer par Statut :</label>
                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                                className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-red-500 focus:border-red-500"
                            >
                                <option value="ALL">Tous les statuts ({dossiers.length})</option>
                                <option value="DRAFT">Brouillon</option>
                                <option value="ESCALATED_NATIONAL">Arbitrage National (S10)</option>
                                <option value="PENDING_VAL_PARALLEL">Validation Parallèle Sites</option>
                                <option value="PENDING_CROSS_VAL">Validation Croisée</option>
                                <option value="PENDING_GDPR">Charte RGPD</option>
                                <option value="PENDING_KEY_DECISION">Attribution Clé</option>
                                <option value="PENDING_QUOTE_PO">Attente Bon de Commande (S9)</option>
                                <option value="DISPATCHED_IN_TRANSIT">Expédié / En Transit</option>
                                <option value="COMMISSIONING_GPS">Pose & Relevé GPS</option>
                                <option value="ACTIVE_FULFILLED">Actif / Service Fait</option>
                                <option value="BLACKLIST_RESTRICTED">Liste Noire & Révocation</option>
                                <option value="ARCHIVED_COMPLETED">Archivé (Clôturé)</option>
                            </select>

                            <label className="text-xs font-semibold text-gray-500 uppercase ml-2">Type :</label>
                            <select
                                value={selectedTypeFilter}
                                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                                className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-red-500 focus:border-red-500"
                            >
                                <option value="ALL">Tous les processus</option>
                                <option value="HABILITATION">P1: Habilitation & Droits d'accès</option>
                                <option value="USER_ACCOUNT">P2: Création de compte</option>
                                <option value="KEY_ORDER">P3: Commande de Clé</option>
                                <option value="CYLINDER_ORDER">P4: Cylindre & Cadenas</option>
                                <option value="TERMINAL_ORDER">P5: Boîtier de rechargement</option>
                                <option value="MASS_DEPLOY">P6: Déploiement Massif</option>
                                <option value="INCIDENT">P7: Incident / Vol / Remplacement</option>
                                <option value="ORG_CHANGE">P8: Structure Organisationnelle</option>
                            </select>
                        </div>

                        <div className="text-xs text-gray-500">
                            Affichage de <strong>{filteredDossiers.length}</strong> dossier(s)
                        </div>
                    </div>

                    {/* Dossiers List */}
                    {loading ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <i className="fas fa-spinner fa-spin text-2xl text-red-600 mb-2"></i>
                            <p className="text-sm text-gray-500">Chargement des dossiers et éléments unitaires...</p>
                        </div>
                    ) : filteredDossiers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <i className="fas fa-folder-open text-3xl text-gray-300 mb-2"></i>
                            <p className="text-base font-semibold text-gray-700">Aucun dossier trouvé pour ces critères</p>
                            <p className="text-sm text-gray-500 mt-1">Utilisez l'onglet "Générateur des 8 Processus Métier" pour en créer rapidement.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredDossiers.map(dossier => {
                                const isExpanded = expandedDossierId === dossier.id;
                                const items = dossier.items || [];
                                const approvedCount = items.filter(i => i.status === 'ITEM_APPROVED').length;

                                return (
                                    <div
                                        key={dossier.id}
                                        className={`bg-white rounded-xl border transition shadow-xs ${
                                            isExpanded ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Parent Request Row */}
                                        <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <button
                                                    onClick={() => setExpandedDossierId(isExpanded ? null : dossier.id)}
                                                    className="mt-1 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition shrink-0"
                                                    title="Afficher/masquer les éléments unitaires (RequestItems)"
                                                >
                                                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-xs`}></i>
                                                </button>

                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                                            {dossier.request_number}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                            {dossier.request_type}
                                                        </span>
                                                        {getStatusBadge(dossier.status)}
                                                        {dossier.quota_exceeded && (
                                                            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                                                <i className="fas fa-exclamation-triangle mr-1"></i> Quota Dépassé (S10)
                                                            </span>
                                                        )}
                                                        {dossier.has_special_tag && (
                                                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                                                <i className="fas fa-tag mr-1"></i> TAG Spécial
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-base font-bold text-gray-900 leading-snug">
                                                        {dossier.title}
                                                    </h3>

                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                        {dossier.description || 'Aucune description'}
                                                    </p>

                                                    <div className="mt-2">
                                                        <WorkflowRulesViewer dossier={dossier} compact={true} />
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                                                        <span><i className="fas fa-user mr-1 text-gray-400"></i> Demandeur: <strong>{dossier.requester_name}</strong></span>
                                                        <span><i className="fas fa-map-marker-alt mr-1 text-gray-400"></i> Site: <strong>{dossier.site_name || 'Multi-sites'}</strong></span>
                                                        {dossier.quote_amount !== undefined && dossier.quote_amount > 0 && (
                                                            <span><i className="fas fa-file-invoice-dollar mr-1 text-emerald-500"></i> Devis: <strong>{dossier.quote_amount.toFixed(2)} {dossier.quote_currency}</strong></span>
                                                        )}
                                                        {dossier.external_order_ref && (
                                                            <span><i className="fas fa-receipt mr-1 text-blue-500"></i> Commande: <strong>{dossier.external_order_ref}</strong></span>
                                                        )}
                                                        <span><i className="fas fa-layer-group mr-1 text-purple-500"></i> Éléments unitaires: <strong>{approvedCount}/{items.length} validés</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action buttons contextual to Parent status */}
                                            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 shrink-0">
                                                {/* DRAFT -> Submit */}
                                                {dossier.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => handleSubmitDossier(dossier.id)}
                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                    >
                                                        <i className="fas fa-paper-plane mr-1.5"></i> Soumettre (Éval Quota S10)
                                                    </button>
                                                )}

                                                {/* ESCALATED_NATIONAL -> National validation */}
                                                {dossier.status === 'ESCALATED_NATIONAL' && (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleNationalDecision(dossier.id, 'APPROVE')}
                                                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                        >
                                                            <i className="fas fa-check-double mr-1"></i> Autoriser (National)
                                                        </button>
                                                        <button
                                                            onClick={() => handleNationalDecision(dossier.id, 'REJECT')}
                                                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                        >
                                                            <i className="fas fa-times mr-1"></i> Rejeter
                                                        </button>
                                                    </div>
                                                )}

                                                {/* PENDING_CROSS_VAL -> Manager & Validator */}
                                                {dossier.status === 'PENDING_CROSS_VAL' && (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleCrossValidate(dossier.id, 'APPROVE')}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                        >
                                                            <i className="fas fa-signature mr-1.5"></i> Double Validation Croisée
                                                        </button>
                                                        <button
                                                            onClick={() => handleCrossValidate(dossier.id, 'REJECT')}
                                                            className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition"
                                                        >
                                                            Refuser
                                                        </button>
                                                    </div>
                                                )}

                                                {/* PENDING_GDPR -> Accept charter */}
                                                {dossier.status === 'PENDING_GDPR' && (
                                                    <button
                                                        onClick={() => handleAcceptGDPR(dossier.id)}
                                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                    >
                                                        <i className="fas fa-user-shield mr-1.5"></i> Signer Charte RGPD
                                                    </button>
                                                )}

                                                {/* PENDING_KEY_DECISION -> Needs key? */}
                                                {dossier.status === 'PENDING_KEY_DECISION' && (
                                                    <div className="flex items-center gap-1.5 bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                                                        <span className="text-xs text-blue-900 font-semibold mr-1">Besoin d'une clé ?</span>
                                                        <button
                                                            onClick={() => handleDecideKey(dossier.id, true)}
                                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition"
                                                        >
                                                            OUI (Enchaîner)
                                                        </button>
                                                        <button
                                                            onClick={() => handleDecideKey(dossier.id, false)}
                                                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition"
                                                        >
                                                            NON (Clôturer)
                                                        </button>
                                                    </div>
                                                )}

                                                {/* PENDING_QUOTE_PO -> Link Purchase Order */}
                                                {dossier.status === 'PENDING_QUOTE_PO' && (
                                                    <button
                                                        onClick={() => {
                                                            setActiveModal({ type: 'PO_LINK', targetId: dossier.id });
                                                            setModalInput1(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
                                                        }}
                                                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                    >
                                                        <i className="fas fa-file-signature mr-1.5"></i> Lier Bon de Commande (S9)
                                                    </button>
                                                )}

                                                {/* DISPATCHED_IN_TRANSIT -> Sign PV or Reminder */}
                                                {dossier.status === 'DISPATCHED_IN_TRANSIT' && (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleSignPV(dossier.id)}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                        >
                                                            <i className="fas fa-check mr-1.5"></i> Signer PV Réception
                                                        </button>
                                                        <button
                                                            onClick={() => handleTriggerReminder(dossier.id)}
                                                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition"
                                                            title="Émettre relance S14"
                                                        >
                                                            <i className="fas fa-bell mr-1"></i> Relance S14
                                                        </button>
                                                    </div>
                                                )}

                                                {/* COMMISSIONING_GPS -> GPS Pose */}
                                                {dossier.status === 'COMMISSIONING_GPS' && (
                                                    <button
                                                        onClick={() => {
                                                            setActiveModal({ type: 'GPS_MODAL', targetId: dossier.id });
                                                            setModalInput1('48.8566');
                                                            setModalInput2('2.3522');
                                                        }}
                                                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                    >
                                                        <i className="fas fa-map-marked-alt mr-1.5"></i> Relevé GPS Installation
                                                    </button>
                                                )}

                                                {/* ACTIVE_FULFILLED -> Report Incident / Blacklist or Archive */}
                                                {dossier.status === 'ACTIVE_FULFILLED' && (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                const serial = items[0]?.hardware_serial_number || 'KEY-SEC-2026';
                                                                setActiveModal({ type: 'BLACKLIST_MODAL', targetId: dossier.id, data: { serial } });
                                                                setModalInput1(serial);
                                                                setModalInput2('Perte constatée lors de tournée');
                                                            }}
                                                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                                            title="Mise en Liste Noire Sécurité"
                                                        >
                                                            <i className="fas fa-ban mr-1 text-red-400"></i> Vol / Liste Noire
                                                        </button>
                                                        <button
                                                            onClick={() => handleArchive(dossier.id, 'COMPLETED')}
                                                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                                                        >
                                                            Clôturer
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Child Items Table (RequestItems) */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50/70 p-4 sm:p-5 rounded-b-xl">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                                        <i className="fas fa-sitemap text-red-500"></i> Éléments unitaires de la demande ({items.length})
                                                        <span className="text-[11px] font-normal text-gray-500 lowercase">
                                                            (cycle de validation unitaire asynchrone sans blocage du dossier global)
                                                        </span>
                                                    </h4>
                                                </div>

                                                <div className="mb-4">
                                                    <WorkflowRulesViewer dossier={dossier} compact={false} />
                                                </div>

                                                {items.length === 0 ? (
                                                    <p className="text-xs text-gray-500 italic">Aucun élément unitaire associé.</p>
                                                ) : (
                                                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                            <thead className="bg-gray-50 text-gray-600 font-semibold text-left">
                                                                <tr>
                                                                    <th className="px-4 py-2.5">Élément / Objet</th>
                                                                    <th className="px-4 py-2.5">Site d'accès / Cible</th>
                                                                    <th className="px-4 py-2.5">Validateur Assigné</th>
                                                                    <th className="px-4 py-2.5">Origine & Matériel</th>
                                                                    <th className="px-4 py-2.5">Statut Élément</th>
                                                                    <th className="px-4 py-2.5 text-right">Action Unitaire</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {items.map(item => (
                                                                    <tr key={item.id} className="hover:bg-gray-50/50">
                                                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                                                            <div className="flex items-center gap-2">
                                                                                <i className={`fas ${
                                                                                    item.item_type === 'KEY' ? 'fa-key text-amber-500' :
                                                                                    item.item_type === 'CYLINDER' ? 'fa-lock text-blue-500' :
                                                                                    item.item_type === 'TERMINAL' ? 'fa-desktop text-purple-500' :
                                                                                    'fa-id-badge text-emerald-500'
                                                                                }`}></i>
                                                                                <span>{item.label}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-700">
                                                                            {item.target_site_name || 'Non spécifié'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-600">
                                                                            {item.designated_validator_name || 'Validateur de Site Référent'}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            {item.hardware_origin ? (
                                                                                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                                                                    {item.hardware_origin === 'USER_STOCK' ? 'Stock Client (45€)' :
                                                                                     item.hardware_origin === 'SUPPLIER_STOCK' ? 'Stock Tampon (85€)' :
                                                                                     'Neuf Usine (145€)'}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-400">Droit logique</span>
                                                                            )}
                                                                            {item.hardware_serial_number && (
                                                                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                                                    N° {item.hardware_serial_number}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            {getStatusBadge(item.status)}
                                                                            {item.approved_at && (
                                                                                <div className="text-[10px] text-emerald-600 mt-0.5">
                                                                                    Validé le {new Date(item.approved_at).toLocaleDateString()}
                                                                                </div>
                                                                            )}
                                                                            {item.rejection_reason && (
                                                                                <div className="text-[10px] text-rose-600 mt-0.5">
                                                                                    Refus: {item.rejection_reason}
                                                                                </div>
                                                                            )}
                                                                            {item.gps_coordinates && (
                                                                                <div className="text-[10px] text-blue-600 mt-0.5">
                                                                                    GPS: {item.gps_coordinates.latitude}, {item.gps_coordinates.longitude}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            {item.status === 'PENDING_VAL_PARALLEL' ? (
                                                                                <div className="inline-flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleEvaluateItem(item.id, 'APPROVE')}
                                                                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition"
                                                                                        title="Valider l'accès pour ce site"
                                                                                    >
                                                                                        <i className="fas fa-check mr-1"></i> Valider
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setActiveModal({ type: 'REJECT_ITEM', targetId: item.id });
                                                                                            setModalInput1('Zone non concernée par l\'habilitation');
                                                                                        }}
                                                                                        className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[11px] font-bold transition"
                                                                                        title="Refuser cet accès unitaire"
                                                                                    >
                                                                                        <i className="fas fa-times"></i>
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-gray-400 text-[11px]">Arbitré</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: State Machine Diagram Flowchart */}
            {activeTab === 'flowchart' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                    <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                            Machine à États des Workflows — Spécification & Transitions
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Cycle complet du dossier de la soumission initiale jusqu'au commissioning GPS et à l'archivage sécurisé.
                        </p>
                    </div>

                    {/* Flowchart Visual Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
                        {/* Node 1 */}
                        <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-700">[ DRAFT ]</span>
                                <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-[10px]">
                                    {dossiers.filter(d => d.status === 'DRAFT').length}
                                </span>
                            </div>
                            <p className="text-gray-500 text-[11px]">Création locale par le demandeur ou import modèle de commande.</p>
                            <div className="pt-2 border-t border-gray-200 text-blue-600 font-bold flex items-center justify-between">
                                <span>Action: Soumission</span>
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Node 2 */}
                        <div className="border-2 border-blue-400 rounded-xl p-4 bg-blue-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-900">[ SUBMITTED / EVAL_QUOTA ]</span>
                                <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">
                                    S10
                                </span>
                            </div>
                            <p className="text-blue-800 text-[11px]">Évaluation automatique du compteur de commandes utilisateur (&le; 5).</p>
                            <div className="pt-2 border-t border-blue-200 text-gray-700 flex items-center justify-between text-[11px]">
                                <span className="text-emerald-700 font-bold">Quota OK &rarr; Parallèle</span>
                                <span className="text-rose-700 font-bold">&gt;5 &rarr; National</span>
                            </div>
                        </div>

                        {/* Node 3 */}
                        <div className="border-2 border-amber-400 rounded-xl p-4 bg-amber-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-900">[ PENDING_VAL_PARALLEL ]</span>
                                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">
                                    {dossiers.filter(d => d.status === 'PENDING_VAL_PARALLEL').length}
                                </span>
                            </div>
                            <p className="text-amber-800 text-[11px]">Validation asynchrone par site. Dès qu'un item est validé, débloque la suite.</p>
                            <div className="pt-2 border-t border-amber-200 text-purple-700 font-bold flex items-center justify-between">
                                <span>&ge; 1 item validé &rarr;</span>
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Node 4 */}
                        <div className="border-2 border-purple-400 rounded-xl p-4 bg-purple-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-900">[ PENDING_CROSS_VAL ]</span>
                                <span className="bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full text-[10px]">
                                    Double Val.
                                </span>
                            </div>
                            <p className="text-purple-800 text-[11px]">Validation Croisée : Signature conjointe obligatoire Manager N+1 + Validateur technique.</p>
                            <div className="pt-2 border-t border-purple-200 text-teal-700 font-bold flex items-center justify-between">
                                <span>Double approbation &rarr;</span>
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Node 5 */}
                        <div className="border-2 border-yellow-400 rounded-xl p-4 bg-yellow-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-yellow-900">[ PENDING_QUOTE_PO ]</span>
                                <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full text-[10px]">
                                    S9
                                </span>
                            </div>
                            <p className="text-yellow-800 text-[11px]">Devis différentiel (Stock demandeur 45€ / Stock tampon 85€ / Neuf 145€).</p>
                            <div className="pt-2 border-t border-yellow-200 text-cyan-700 font-bold flex items-center justify-between">
                                <span>Liaison N° Commande &rarr;</span>
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Node 6 */}
                        <div className="border-2 border-cyan-400 rounded-xl p-4 bg-cyan-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-cyan-900">[ DISPATCHED_IN_TRANSIT ]</span>
                                <span className="bg-cyan-200 text-cyan-900 px-2 py-0.5 rounded-full text-[10px]">
                                    S14
                                </span>
                            </div>
                            <p className="text-cyan-800 text-[11px]">Expédition équipement. Relances automatiques. Si 3 relances infructueuses &rarr; Incident.</p>
                            <div className="pt-2 border-t border-cyan-200 text-orange-700 font-bold flex items-center justify-between">
                                <span>Signature PV &rarr;</span>
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Node 7 */}
                        <div className="border-2 border-orange-400 rounded-xl p-4 bg-orange-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-orange-900">[ COMMISSIONING_GPS ]</span>
                                <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full text-[10px]">
                                    GPS
                                </span>
                            </div>
                            <p className="text-orange-800 text-[11px]">Relevé de coordonnées GPS d'installation (obligatoire Cylindres & Boîtiers).</p>
                            <div className="pt-2 border-t border-orange-200 text-emerald-700 font-bold flex items-center justify-between">
                                <span>GPS Validé &rarr;</span>
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Node 8 */}
                        <div className="border-2 border-emerald-400 rounded-xl p-4 bg-emerald-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-900">[ ACTIVE_FULFILLED ]</span>
                                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[10px]">
                                    Service Fait
                                </span>
                            </div>
                            <p className="text-emerald-800 text-[11px]">Droits d'accès actifs dans le système mécatronique EN 15864 / NIS 2.</p>
                            <div className="pt-2 border-t border-emerald-200 text-gray-700 font-bold flex items-center justify-between">
                                <span>Clôture ou Incident &rarr;</span>
                                <i className="fas fa-shield-alt"></i>
                            </div>
                        </div>
                    </div>

                    {/* Edge cases & Special Branches */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs">
                            <span className="font-bold text-red-900 block mb-1">
                                <i className="fas fa-exclamation-triangle mr-1"></i> Branche S10 : Dépassement de Quota
                            </span>
                            <p className="text-red-800">
                                Si un utilisateur passe plus de 5 commandes dans la période, la demande bascule en <code>ESCALATED_NATIONAL</code> nécessitant l'arbitrage préalable du Référent National / Administrateur Central.
                            </p>
                        </div>

                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-xs">
                            <span className="font-bold text-indigo-900 block mb-1">
                                <i className="fas fa-link mr-1"></i> Branche Processus 2 : RGPD & Clé Chaînée
                            </span>
                            <p className="text-indigo-800">
                                Après validation du compte, la charte RGPD est présentée. Puis l'utilisateur choisit d'attribuer une clé, ce qui clone le dossier vers une nouvelle commande de clé unitaire.
                            </p>
                        </div>

                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-100">
                            <span className="font-bold text-white block mb-1">
                                <i className="fas fa-ban mr-1 text-red-400"></i> Règle de Sécurité : Révocation & Exclusion Mutuelle
                            </span>
                            <p className="text-zinc-300">
                                Seul un profil Administrateur / Sécurité peut déclencher la mise en liste de révocation. L'alerte est diffusée et la réactivation simultanée ancienne/nouvelle clé est interdite.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Générateur de Processus & Catalogue de Modèles Paramétrables (Zero-Hardcoding) */}
            {activeTab === 'process_generator' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded">Architecture Zéro Hardcoding</span>
                                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded">Règles & Paramètres Découplés</span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Catalogue des Processus Métier & Générateur de Règles
                                </h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Chaque processus possède ses règles métier intégrées (validation, GPS, devis, quotas). Vous pouvez instancier directement ou personnaliser les paramètres avant création.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/admin/processus"
                                    className="inline-flex items-center px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0"
                                >
                                    <i className="fas fa-cogs mr-2"></i> Studio Admin des Workflows
                                </Link>
                                <button
                                    onClick={() => {
                                        setCreatorTemplateToEdit(CUSTOM_BLANK_TEMPLATE);
                                        setIsWorkflowCreatorOpen(true);
                                    }}
                                    className="inline-flex items-center px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0"
                                >
                                    <i className="fas fa-magic mr-2 text-yellow-400"></i> Nouveau Workflow Sur Mesure
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {liveWorkflowTemplates.map((tpl) => (
                                <div
                                    key={tpl.id}
                                    className="p-5 rounded-xl border border-gray-200 hover:border-red-400 transition bg-white flex flex-col justify-between shadow-2xs group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-200/50">
                                                {tpl.code}
                                            </span>
                                            <span className="text-[10px] font-medium text-gray-400">
                                                {tpl.category}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-red-600 transition">
                                            {tpl.short_title}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                            {tpl.default_description}
                                        </p>

                                        {/* Embedded Rules Pill Preview */}
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
                                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                                                <i className="fas fa-shield-alt mr-1 text-gray-400"></i>
                                                {tpl.rules.validation_mode === 'PARALLEL_ITEMS' && 'Validation Parallèle'}
                                                {tpl.rules.validation_mode === 'CROSS_VALIDATION' && 'Double val. croisée'}
                                                {tpl.rules.validation_mode === 'TRIPARTITE' && 'Tripartite (Manager/Val/Nat)'}
                                                {tpl.rules.validation_mode === 'AUTO_FULFILL' && 'Auto-validation'}
                                            </span>
                                            {tpl.rules.requires_gps && (
                                                <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded font-semibold border border-orange-200">
                                                    <i className="fas fa-crosshairs mr-1"></i> GPS Requis
                                                </span>
                                            )}
                                            {tpl.rules.check_quota && (
                                                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold border border-amber-200">
                                                    <i className="fas fa-tachometer-alt mr-1"></i> Quota S10
                                                </span>
                                            )}
                                            {tpl.rules.requires_quote_po && (
                                                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold border border-emerald-200">
                                                    <i className="fas fa-file-invoice-dollar mr-1"></i> Devis S9
                                                </span>
                                            )}
                                            {tpl.rules.requires_gdpr && (
                                                <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold border border-indigo-200">
                                                    <i className="fas fa-user-shield mr-1"></i> RGPD
                                                </span>
                                            )}
                                            {tpl.rules.requires_special_tag && (
                                                <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-semibold border border-purple-200">
                                                    <i className="fas fa-tag mr-1"></i> TAG Spécial
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                                        <button
                                            onClick={() => handleCreateFromTemplate(tpl)}
                                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                            title="Instancier immédiatement avec les règles par défaut"
                                        >
                                            <i className="fas fa-bolt text-yellow-300"></i>
                                            Instancier
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCreatorTemplateToEdit(tpl);
                                                setIsWorkflowCreatorOpen(true);
                                            }}
                                            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                            title="Personnaliser les règles et les éléments avant création"
                                        >
                                            <i className="fas fa-sliders-h text-gray-500"></i>
                                            Ajuster
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Blank Custom Card */}
                            <div className="p-5 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-400 transition bg-gray-50/50 flex flex-col justify-between shadow-2xs">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-zinc-800 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                            Zéro-Hardcoding
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm">
                                        Workflow Personnalisé de Zéro
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Configurez librement le type de demande, vos propres circuits de validation, seuils, quotas, contrôles GPS et éléments unitaires.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setCreatorTemplateToEdit(CUSTOM_BLANK_TEMPLATE);
                                        setIsWorkflowCreatorOpen(true);
                                    }}
                                    className="mt-4 w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                                >
                                    <i className="fas fa-plus"></i> Créer Nouveau Workflow
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: Simulateur Quotas S10 & Devis Différentiel S9 */}
            {activeTab === 'quotas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Quota S10 Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-chart-pie text-red-500"></i> Compteur de Commandes Utilisateur (S10)
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="bg-red-50 text-red-700 text-xs px-2.5 py-0.5 rounded font-bold">Règle S10</span>
                                <span className="bg-yellow-50 text-yellow-800 text-[11px] px-2 py-0.5 rounded border border-yellow-200 font-semibold">
                                    <i className="fas fa-sliders text-[9px] mr-1"></i>Configurable
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Chaque demandeur possède un quota limité à <strong>{quota?.quota_limit || 5} commandes</strong> (défini par la clé dynamique <code>quota_hardware_default_limit</code>).
                            Tout dépassement bloque la soumission directe et déclenche une escalade obligatoire vers le Référent National.
                        </p>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-700">Utilisateur test : <strong>{quota?.user_name || 'Daniel Dupont'}</strong></span>
                                <span className={`font-bold ${((quota?.order_count || 0) >= (quota?.quota_limit || 5)) ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {quota?.order_count || 0} / {quota?.quota_limit || 5} commandes
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full ${
                                        ((quota?.order_count || 0) >= (quota?.quota_limit || 5)) ? 'bg-red-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${Math.min(100, ((quota?.order_count || 0) / (quota?.quota_limit || 5)) * 100)}%` }}
                                ></div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={async () => {
                                        await fetch('/api/v1/workflow/quotas/1042/reset', { method: 'POST' });
                                        notify('Compteur de commandes réinitialisé à 0.');
                                        loadData();
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Réinitialiser quota
                                </button>

                                <button
                                    onClick={async () => {
                                        // create a quick order to increment
                                        await handleCreateProcessInstance(3);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                                >
                                    + Ajouter une commande
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Devis Différentiel S9 Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-tags text-emerald-500"></i> Grille du Devis Différentiel (S9)
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded font-bold">Règle S9</span>
                                <span className="bg-yellow-50 text-yellow-800 text-[11px] px-2 py-0.5 rounded border border-yellow-200 font-semibold">
                                    <i className="fas fa-sliders text-[9px] mr-1"></i>Configurable
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            La facturation s'adapte automatiquement selon l'origine de l'équipement déclarée dans l'élément unitaire (tarifs administrables dans les <em>Paramètres Système</em>) :
                        </p>

                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-xs">
                            <div className="p-3 bg-gray-50 flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-gray-900 block">Stock Demandeur (USER_STOCK)</span>
                                    <span className="text-gray-500 text-[11px]">Équipement déjà possédé, contrôle d'intégrité</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                    {(systemSettings['tarification_devis_differentiel_s9']?.user_stock_unit_price ?? systemSettings['tarification_devis_differentiel_s9']?.stock_demandeur ?? 45).toFixed(2)} € (Appareillage seul)
                                </span>
                            </div>

                            <div className="p-3 bg-white flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-gray-900 block">Stock Tampon (SUPPLIER_STOCK)</span>
                                    <span className="text-gray-500 text-[11px]">Prélèvement stock régional pré-positionné</span>
                                </div>
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                    {(systemSettings['tarification_devis_differentiel_s9']?.supplier_stock_unit_price ?? systemSettings['tarification_devis_differentiel_s9']?.stock_tampon ?? 85).toFixed(2)} € (Appareillage + Envoi)
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-gray-900 block">Commande Neuve Fournisseur (NEW_ORDER)</span>
                                    <span className="text-gray-500 text-[11px]">Fabrication industrielle sur-mesure</span>
                                </div>
                                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                                    {(systemSettings['tarification_devis_differentiel_s9']?.new_order_unit_price ?? systemSettings['tarification_devis_differentiel_s9']?.commande_neuve ?? 145).toFixed(2)} € (Fabrication + Livr.)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Workflow Routing Rules Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-diagram-project text-indigo-500"></i> Routage & Rôles Dynamiques
                            </h3>
                            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded font-bold">Zero-Hardcoding</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Règles d'aiguillage pilotées par les clés <code>workflow_routing_rules</code> et <code>workflow_role_privileges</code> :
                        </p>
                        <div className="space-y-2 text-xs">
                            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium text-gray-700">Demandes Matériel soumises au Quota :</span>
                                <span className="font-mono text-indigo-700 font-bold">
                                    {(systemSettings['workflow_routing_rules']?.hardware_request_types || ['KEY_ORDER', 'CYLINDER_ORDER', 'TERMINAL_ORDER', 'MASS_DEPLOY']).join(', ')}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium text-gray-700">Relevé GPS Obligatoire au Commissioning :</span>
                                <span className="font-mono text-purple-700 font-bold">
                                    {(systemSettings['workflow_routing_rules']?.gps_required_types || ['CYLINDER_ORDER', 'TERMINAL_ORDER']).join(', ')}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium text-gray-700">Tolérance Précision GPS Smartphone :</span>
                                <span className="font-mono text-emerald-700 font-bold">
                                    ≤ {systemSettings['gps_commissioning_rules']?.max_accuracy_meters ?? 50} mètres
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Incident & Blacklist Rules Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-shield-halved text-rose-500"></i> Remplacement Liste Noire
                            </h3>
                            <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-0.5 rounded font-bold">Incident S7</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Paramètres appliqués automatiquement lors de la compromission d'une clé (clé <code>incident_blacklist_rules</code>) :
                        </p>
                        <div className="space-y-2 text-xs">
                            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium text-gray-700">Origine matériel du remplacement :</span>
                                <span className="font-mono text-gray-900 font-bold">
                                    {systemSettings['incident_blacklist_rules']?.replacement_default_origin || 'SUPPLIER_STOCK'}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium text-gray-700">Règle d'exclusion mutuelle :</span>
                                <span className="font-bold text-emerald-700">
                                    {systemSettings['incident_blacklist_rules']?.auto_exclusion_rule !== false ? 'ACTIVÉE PAR DÉFAUT' : 'DÉSACTIVÉE'}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                <span className="font-medium text-gray-700">Forfait de remplacement calculé :</span>
                                <span className="font-mono font-bold text-rose-700">
                                    {(systemSettings['tarification_devis_differentiel_s9']?.supplier_stock_unit_price ?? systemSettings['incident_blacklist_rules']?.replacement_quote_fixed_amount ?? 85).toFixed(2)} €
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: Audit Log & Événements */}
            {activeTab === 'audit' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Journal d'Audit & Traçabilité Immuable
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Enregistrement cryptographique et horodaté de toutes les transitions de la machine à états.
                            </p>
                        </div>
                        <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-mono font-bold">
                            {auditLogs.length} événements
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-semibold text-left">
                                <tr>
                                    <th className="px-4 py-2.5">Date & Heure</th>
                                    <th className="px-4 py-2.5">Entité Cible</th>
                                    <th className="px-4 py-2.5">Action & Événement</th>
                                    <th className="px-4 py-2.5">Opérateur / Acteur</th>
                                    <th className="px-4 py-2.5">Détails de l'Événement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                                {auditLogs.slice(0, 50).map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                                {log.entity_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`font-bold text-[11px] ${
                                                log.action.includes('REJECT') ? 'text-red-700' :
                                                log.action.includes('APPROVE') ? 'text-emerald-700' :
                                                log.action.includes('ALERT') ? 'text-rose-700' :
                                                'text-blue-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-800 font-sans">
                                            {log.performed_by_name}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 font-sans text-[11px] max-w-xs truncate">
                                            {JSON.stringify(log.details)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {activeModal.type && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
                        {activeModal.type === 'REJECT_ITEM' && (
                            <>
                                <h3 className="text-base font-bold text-gray-900">Motif du Refus de l'Accès Unitaire</h3>
                                <p className="text-xs text-gray-500">
                                    Indiquez la raison motivée pour laquelle cet accès unitaire est refusé sur le site désigné :
                                </p>
                                <textarea
                                    value={modalInput1}
                                    onChange={(e) => setModalInput1(e.target.value)}
                                    rows={3}
                                    className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setActiveModal({ type: null })}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => handleEvaluateItem(activeModal.targetId!, 'REJECT', modalInput1)}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                                    >
                                        Confirmer le Refus
                                    </button>
                                </div>
                            </>
                        )}

                        {activeModal.type === 'PO_LINK' && (
                            <>
                                <h3 className="text-base font-bold text-gray-900">Association du Bon de Commande (S9)</h3>
                                <p className="text-xs text-gray-500">
                                    Saisissez la référence du bon de commande pour validation et expédition :
                                </p>
                                <input
                                    type="text"
                                    value={modalInput1}
                                    onChange={(e) => setModalInput1(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                                    placeholder="ex: PO-2026-9021"
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setActiveModal({ type: null })}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => handleLinkPO(activeModal.targetId!, modalInput1)}
                                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-semibold"
                                    >
                                        Associer et Expédier
                                    </button>
                                </div>
                            </>
                        )}

                        {activeModal.type === 'GPS_MODAL' && (
                            <>
                                <h3 className="text-base font-bold text-gray-900">Relevé GPS de Pose & Commissioning</h3>
                                <p className="text-xs text-gray-500">
                                    L'installateur doit certifier les coordonnées GPS exactes du cylindre ou boîtier :
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-1">Latitude</label>
                                        <input
                                            type="text"
                                            value={modalInput1}
                                            onChange={(e) => setModalInput1(e.target.value)}
                                            className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-1">Longitude</label>
                                        <input
                                            type="text"
                                            value={modalInput2}
                                            onChange={(e) => setModalInput2(e.target.value)}
                                            className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setActiveModal({ type: null })}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => handleValidateGPS(activeModal.targetId!, modalInput1, modalInput2)}
                                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold"
                                    >
                                        Valider la Mise en Service
                                    </button>
                                </div>
                            </>
                        )}

                        {activeModal.type === 'BLACKLIST_MODAL' && (
                            <>
                                <h3 className="text-base font-bold text-gray-900 text-red-600 flex items-center gap-2">
                                    <i className="fas fa-ban"></i> Révocation & Mise en Liste Noire Sécurité
                                </h3>
                                <p className="text-xs text-gray-600">
                                    Attention : Cette opération déclenche une alerte au Référent National / Administrateur, désactive définitivement la clé et crée une demande de remplacement avec règle d'exclusion mutuelle.
                                </p>
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 block mb-1">N° de Série Compromis</label>
                                    <input
                                        type="text"
                                        value={modalInput1}
                                        onChange={(e) => setModalInput1(e.target.value)}
                                        className="w-full text-sm p-2 border border-gray-300 rounded-lg font-mono bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 block mb-1">Motif de l'Incident</label>
                                    <textarea
                                        value={modalInput2}
                                        onChange={(e) => setModalInput2(e.target.value)}
                                        rows={2}
                                        className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                                        placeholder="Circonstances de la perte / vol"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setActiveModal({ type: null })}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => handleBlacklist(activeModal.targetId!, modalInput1, modalInput2)}
                                        className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-semibold"
                                    >
                                        Confirmer Mise en Liste Noire
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Generic Workflow Creator Modal (Zero-Hardcoding) */}
            <WorkflowCreatorModal
                isOpen={isWorkflowCreatorOpen}
                onClose={() => setIsWorkflowCreatorOpen(false)}
                initialTemplate={creatorTemplateToEdit}
                availableTemplates={liveWorkflowTemplates}
                onSuccess={(created) => {
                    notify(`Nouveau workflow généré avec succès (${created.request_number}) avec ses règles système embarquées.`);
                    setActiveTab('dossiers');
                    setExpandedDossierId(created.id);
                    loadData();
                }}
            />
        </div>
    );
}
