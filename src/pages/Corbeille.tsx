import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRequests, updateRequestStatus, batchUpdateRequests, analyzeRequestAI, getDocumentDownloadUrl, editRequest, getSites, getExportPdfUrl, getExportExcelUrl, getRequestPdfUrl, downloadRequestPDF, downloadAllRequestsPDF } from '../lib/api';
import { isRequestVisible, ReferenceVisibilityRule } from '../lib/visibilityFilter';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import { useFeatures } from '../context/FeaturesContext';
import {
    CheckCircle2,
    XCircle,
    HelpCircle,
    Sparkles,
    FileText,
    Download,
    MapPin,
    Cpu,
    Clock,
    RefreshCw,
    Shield,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Edit2,
    X,
    Check,
    CheckSquare,
    Square,
    Users,
    Layers,
    Compass,
    Loader2,
    AlertCircle
} from 'lucide-react';

const corbeilleHelpSections: HelpSection[] = [
    {
        title: "Circuit d'Approbation Mécatronique",
        badge: "Validation",
        description: "Examinez les dossiers d'accès aux emprises ferroviaires soumis par les brigades et agents terrain.",
        tips: [
            "Valider : Approuve l'étape en cours et transfère la demande à l'étape suivante",
            "Complément : Retourne la demande à l'agent avec une consigne précise",
            "Refuser : Clôture définitivement le dossier avec justification réglementaire"
        ]
    },
    {
        title: "Actions Groupées (Par Lot)",
        badge: "Productivité",
        description: "Cochez plusieurs demandes dans la liste pour appliquer une validation ou un refus collectif avec un motif unique."
    }
];

export default function Corbeille() {
    const { isFeatureEnabled } = useFeatures();
    const location = useLocation();
    const navigate = useNavigate();
    const filterRef = new URLSearchParams(location.search).get('ref');

    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // UX-01: Sélection multiple et validation par lot
    const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
    const [batchActionModal, setBatchActionModal] = useState<{
        isOpen: boolean;
        action: 'approved' | 'rejected';
    }>({ isOpen: false, action: 'approved' });
    const [batchMotif, setBatchMotif] = useState('');
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchError, setBatchError] = useState('');
    const [batchSuccessMessage, setBatchSuccessMessage] = useState('');

    // Action modal states
    const [activeAction, setActiveAction] = useState<{
        type: 'refuse' | 'complement' | 'validate';
        reference: string;
    } | null>(null);
    const [actionMotif, setActionMotif] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    // AI Analysis states
    const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
    const [expandedAI, setExpandedAI] = useState<Record<string, boolean>>({});

    // Sites and Edit request states
    const [sites, setSites] = useState<any[]>([]);
    const [editingRequest, setEditingRequest] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editEquipment, setEditEquipment] = useState('');
    const [editSite, setEditSite] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    // PDF Export states
    const [downloadingPdfRef, setDownloadingPdfRef] = useState<string | null>(null);
    const [downloadingAllPdf, setDownloadingAllPdf] = useState(false);
    const [pdfToast, setPdfToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleDownloadSinglePdf = async (reference: string) => {
        setDownloadingPdfRef(reference);
        setPdfToast(null);
        try {
            await downloadRequestPDF(reference);
            setPdfToast({ type: 'success', message: `Fiche d'autorisation ${reference} téléchargée avec succès en PDF.` });
            setTimeout(() => setPdfToast(null), 4000);
        } catch (err: any) {
            console.error("Erreur téléchargement PDF:", err);
            setPdfToast({ type: 'error', message: err.message || "Erreur lors de la génération du fichier PDF." });
            setTimeout(() => setPdfToast(null), 6000);
        } finally {
            setDownloadingPdfRef(null);
        }
    };

    const handleDownloadAllPdf = async () => {
        setDownloadingAllPdf(true);
        setPdfToast(null);
        try {
            await downloadAllRequestsPDF();
            setPdfToast({ type: 'success', message: "Registre officiel des demandes exporté avec succès en PDF." });
            setTimeout(() => setPdfToast(null), 4000);
        } catch (err: any) {
            console.error("Erreur téléchargement export PDF:", err);
            setPdfToast({ type: 'error', message: err.message || "Erreur lors de l'exportation du registre PDF." });
            setTimeout(() => setPdfToast(null), 6000);
        } finally {
            setDownloadingAllPdf(false);
        }
    };

    const load = () => {
        setLoading(true);
        Promise.all([getRequests(), getSites()])
            .then(([reqRes, siteRes]) => {
                setRequests(reqRes.data);
                setSites(siteRes.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur chargement:", err);
                setLoading(false);
            });
    };

    const handleStartEdit = (req: any) => {
        setEditingRequest(req);
        setEditTitle(req.title);
        setEditDescription(req.description || '');
        setEditEquipment(req.equipment_type || '');
        setEditSite(req.site_name || '');
        setEditError('');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRequest || !editTitle.trim()) {
            setEditError('Le titre de la demande est requis.');
            return;
        }

        setSavingEdit(true);
        setEditError('');
        try {
            await editRequest(editingRequest.reference, {
                title: editTitle.trim(),
                description: editDescription.trim(),
                equipment_type: editEquipment.trim(),
                site_name: editSite.trim()
            });
            setEditingRequest(null);
            load();
        } catch (err: any) {
            console.error("Erreur mise à jour demande:", err);
            setEditError(err.response?.data?.error || "Erreur lors de l'enregistrement.");
        } finally {
            setSavingEdit(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleTriggerAI = async (req: any) => {
        setAiLoading(prev => ({ ...prev, [req.reference]: true }));
        try {
            const res = await analyzeRequestAI({
                reference: req.reference,
                title: req.title,
                description: req.description,
                site_name: req.site_name,
                equipment_type: req.equipment_type
            });

            if (res.data?.analysis) {
                setRequests(prev => prev.map(r => {
                    if (r.reference === req.reference) {
                        return { ...r, ai_analysis: res.data.analysis };
                    }
                    return r;
                }));
                setExpandedAI(prev => ({ ...prev, [req.reference]: true }));
            }
        } catch (err) {
            console.error("Erreur analyse IA:", err);
        } finally {
            setAiLoading(prev => ({ ...prev, [req.reference]: false }));
        }
    };

    const handleConfirmAction = async () => {
        if (!activeAction) return;
        const { type, reference } = activeAction;

        if ((type === 'refuse' || type === 'complement') && !actionMotif.trim()) {
            setActionError('Veuillez préciser le motif ou la question.');
            return;
        }

        setActionLoading(true);
        setActionError('');

        try {
            const userStr = localStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;

            let actionParam = 'approved';
            if (type === 'refuse') actionParam = 'rejected';
            if (type === 'complement') actionParam = 'complement_requested';

            await updateRequestStatus(reference, {
                action: actionParam,
                motif: actionMotif,
                user_id: currentUser?.id,
                user_name: currentUser?.name || 'Validateur',
                user_role: currentUser?.role || 'Validateur'
            });

            setActiveAction(null);
            setActionMotif('');
            load();
        } catch (err: any) {
            console.error("Erreur action:", err);
            setActionError(err.response?.data?.error || "Une erreur est survenue.");
        } finally {
            setActionLoading(false);
        }
    };

    // UX-01: Gestion de la sélection multiple
    const toggleSelectAll = (actionableRequests: any[]) => {
        const actionableRefs = actionableRequests.map(r => r.reference);
        const allSelected = actionableRefs.length > 0 && actionableRefs.every(ref => selectedRefs.includes(ref));
        
        if (allSelected) {
            setSelectedRefs(prev => prev.filter(ref => !actionableRefs.includes(ref)));
        } else {
            setSelectedRefs(prev => Array.from(new Set([...prev, ...actionableRefs])));
        }
    };

    const toggleSelectRequest = (reference: string) => {
        setSelectedRefs(prev => 
            prev.includes(reference) 
                ? prev.filter(r => r !== reference)
                : [...prev, reference]
        );
    };

    const handleOpenBatchModal = (action: 'approved' | 'rejected') => {
        if (selectedRefs.length === 0) return;
        setBatchActionModal({ isOpen: true, action });
        setBatchMotif(action === 'approved' ? 'Validation groupée conforme (UX-01)' : '');
        setBatchError('');
    };

    const handleConfirmBatchAction = async () => {
        if (selectedRefs.length === 0) return;
        if (batchActionModal.action === 'rejected' && !batchMotif.trim()) {
            setBatchError('Un motif est obligatoire pour un refus par lot.');
            return;
        }

        setBatchLoading(true);
        setBatchError('');
        try {
            const userStr = localStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;

            const res = await batchUpdateRequests({
                references: selectedRefs,
                action: batchActionModal.action,
                motif: batchMotif.trim() || undefined,
                user_id: currentUser?.id,
                user_name: currentUser?.name || 'Validateur',
                user_role: currentUser?.role || 'Validateur'
            });

            setBatchActionModal({ isOpen: false, action: 'approved' });
            setSelectedRefs([]);
            setBatchSuccessMessage(res.data.message || `${selectedRefs.length} demandes traitées par lot.`);
            setTimeout(() => setBatchSuccessMessage(''), 5000);
            load();
        } catch (err: any) {
            console.error("Erreur batchUpdateRequests:", err);
            setBatchError(err.response?.data?.error || "Erreur lors de la validation par lot.");
        } finally {
            setBatchLoading(false);
        }
    };

    const userStr = localStorage.getItem('user');
    const currentUser = useMemo(() => {
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }, [userStr]);

    const visibilityRules: ReferenceVisibilityRule[] = useMemo(() => {
        return currentUser?.referenceVisibilityRules || [];
    }, [currentUser]);

    const sitesMap = useMemo(() => {
        const m: Record<string, any> = {};
        sites.forEach(s => {
            if (s.id) m[s.id] = s;
            if (s.name) m[s.name] = s;
            if (s.code) m[s.code] = s;
        });
        return m;
    }, [sites]);

    const visibleRequests = useMemo(() => {
        if (!visibilityRules || visibilityRules.length === 0) return requests;
        return requests.filter(r => isRequestVisible(r, visibilityRules, sitesMap));
    }, [requests, visibilityRules, sitesMap]);

    const filteredRequests = useMemo(() => {
        if (filterRef) {
            return visibleRequests.filter(r => r.reference === filterRef || String(r.id) === filterRef);
        }
        return visibleRequests.filter(r => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'pending') return r.status.startsWith('En attente');
            if (filterStatus === 'complement') return r.status === 'Complément requis';
            if (filterStatus === 'finished') return r.status === 'Validée' || r.status === 'Refusée';
            return true;
        });
    }, [filterRef, visibleRequests, filterStatus]);

    const getRiskBadgeColor = (risk?: string) => {
        switch (risk) {
            case 'Critique': return 'bg-red-100 text-red-800 border-red-200';
            case 'Élevé': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Modéré': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Faible': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
                        Corbeille des Validations
                    </h1>
                    <p className="text-sm text-gray-600">
                        Circuit multi-niveaux (Manager N+1, Sécurité Site, Référentiels EN 15864 / EN 16864)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        id="btn-export-excel-corbeille"
                        href={getExportExcelUrl()}
                        download="demandes_acces.xls"
                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                    >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Excel
                    </a>
                    <button
                        id="btn-export-pdf-corbeille"
                        onClick={handleDownloadAllPdf}
                        disabled={downloadingAllPdf}
                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Télécharger l'ensemble des demandes en format PDF"
                    >
                        {downloadingAllPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{downloadingAllPdf ? 'Export...' : 'PDF'}</span>
                    </button>
                    <PageHelpButton
                        pageTitle="Corbeille des Validations"
                        pageCategory="Circuit de Décision"
                        description="Examinez et validez les accès aux emprises sensibles selon le workflow multi-étapes."
                        sections={corbeilleHelpSections}
                    />
                    <button
                        id="btn-refresh-corbeille"
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Notification Toast for PDF / Actions */}
            {pdfToast && (
                <div className={`mb-4 px-4 py-3 rounded-lg border text-sm flex items-center justify-between shadow-2xs ${
                    pdfToast.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    <div className="flex items-center gap-2">
                        {pdfToast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span className="font-medium">{pdfToast.message}</span>
                    </div>
                    <button onClick={() => setPdfToast(null)} className="text-gray-400 hover:text-gray-600 ml-4 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Filter banner if opened from global search */}
            {filterRef && (
                <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-blue-900">Demande ciblée depuis la recherche :</span>
                        <span className="font-mono font-bold bg-white text-[#002395] px-2 py-0.5 rounded border border-blue-300">
                            {filterRef}
                        </span>
                        {visibleRequests.filter(r => r.reference === filterRef || String(r.id) === filterRef).length === 0 && (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                Cette demande n'est pas accessible dans votre corbeille de validation ou vous n'avez pas les droits de visibilité requis.
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/corbeille')}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
                    >
                        Afficher tous les dossiers
                    </button>
                </div>
            )}

            {/* Active Reference-Based Visibility Banner */}
            {visibilityRules && visibilityRules.length > 0 && (
                <div className="mb-5 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-[#002395]" />
                            Périmètre de visibilité actif ({currentUser?.role}) :
                        </span>
                        {visibilityRules.map(rule => (
                            <span
                                key={rule.id}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#002395] border border-blue-200 shadow-2xs"
                            >
                                <span className="text-gray-500 font-normal">{rule.tableName} :</span>
                                <span>{rule.values.join(', ')}</span>
                            </span>
                        ))}
                    </div>
                    <div className="text-[11px] font-medium text-gray-600 shrink-0">
                        <strong>{visibleRequests.length}</strong> sur {requests.length} demande(s) affichée(s)
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        filterStatus === 'all'
                            ? 'bg-[#002395] text-white'
                            : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
                    }`}
                >
                    Toutes ({visibleRequests.length})
                </button>
                <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        filterStatus === 'pending'
                            ? 'bg-[#002395] text-white'
                            : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
                    }`}
                >
                    En attente d'avis ({visibleRequests.filter(r => r.status.startsWith('En attente')).length})
                </button>
                <button
                    onClick={() => setFilterStatus('complement')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        filterStatus === 'complement'
                            ? 'bg-[#002395] text-white'
                            : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
                    }`}
                >
                    Complément requis ({visibleRequests.filter(r => r.status === 'Complément requis').length})
                </button>
                <button
                    onClick={() => setFilterStatus('finished')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        filterStatus === 'finished'
                            ? 'bg-[#002395] text-white'
                            : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
                    }`}
                >
                    Clôturées ({visibleRequests.filter(r => r.status === 'Validée' || r.status === 'Refusée').length})
                </button>
            </div>

            {/* Feedback Alert for Batch Actions */}
            {batchSuccessMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{batchSuccessMessage}</span>
                    </div>
                    <button onClick={() => setBatchSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* UX-01: Toolbar de validation par lot (Bulk Action Bar) */}
            {filteredRequests.some(r => r.status.startsWith('En attente') || r.status === 'Complément requis') && (
                <div className="mb-4 p-3.5 bg-linear-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <button
                            id="btn-toggle-select-all"
                            onClick={() => {
                                const actionable = filteredRequests.filter(r => r.status.startsWith('En attente') || r.status === 'Complément requis');
                                toggleSelectAll(actionable);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 hover:text-[#002395] transition cursor-pointer"
                        >
                            {(() => {
                                const actionable = filteredRequests.filter(r => r.status.startsWith('En attente') || r.status === 'Complément requis');
                                const actionableRefs = actionable.map(r => r.reference);
                                const isAll = actionableRefs.length > 0 && actionableRefs.every(ref => selectedRefs.includes(ref));
                                return isAll ? (
                                    <CheckSquare className="w-4 h-4 text-[#002395]" />
                                ) : (
                                    <Square className="w-4 h-4 text-gray-400" />
                                );
                            })()}
                            <span>Tout sélectionner ({filteredRequests.filter(r => r.status.startsWith('En attente') || r.status === 'Complément requis').length} éligibles)</span>
                        </button>

                        <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>

                        <div className="text-xs text-gray-600 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-700" />
                            <span>
                                <strong>{selectedRefs.length}</strong> dossier(s) sélectionné(s)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            id="btn-batch-approve"
                            disabled={selectedRefs.length === 0}
                            onClick={() => handleOpenBatchModal('approved')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                                selectedRefs.length > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Valider par lot ({selectedRefs.length})
                        </button>

                        <button
                            id="btn-batch-reject"
                            disabled={selectedRefs.length === 0}
                            onClick={() => handleOpenBatchModal('rejected')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                                selectedRefs.length > 0
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            Refuser par lot
                        </button>

                        {selectedRefs.length > 0 && (
                            <button
                                onClick={() => setSelectedRefs([])}
                                className="text-xs text-gray-500 hover:text-gray-700 underline px-1"
                            >
                                Désélectionner
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* List of Requests */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
                        Chargement des dossiers d'accès...
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
                        Aucun dossier ne correspond à ce filtre.
                    </div>
                ) : (
                    filteredRequests.map(req => {
                        const isPending = req.status.startsWith('En attente');
                        const isComplement = req.status === 'Complément requis';
                        const isActionable = isPending || isComplement;
                        const isSelected = selectedRefs.includes(req.reference);
                        const currentStage = req.stages?.[req.current_stage_index || 0];

                        return (
                            <div
                                key={req.id || req.reference}
                                id={`request-card-${req.reference}`}
                                className={`bg-white rounded-xl border p-5 shadow-xs transition ${
                                    isSelected ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        {/* Checkbox de sélection pour validation par lot */}
                                        {isActionable ? (
                                            <button
                                                type="button"
                                                id={`checkbox-select-${req.reference}`}
                                                onClick={() => toggleSelectRequest(req.reference)}
                                                className="mt-1 text-gray-400 hover:text-[#002395] transition cursor-pointer shrink-0"
                                                title={isSelected ? "Désélectionner cette demande" : "Sélectionner pour action groupée"}
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-[#002395]" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-300 hover:text-gray-500" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-5 shrink-0"></div>
                                        )}

                                        <div className="space-y-2 flex-1">
                                            {/* Reference, badges, site */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-[#002395] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                    {req.reference}
                                                </span>
                                                
                                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                                    req.status === 'Validée' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                    req.status === 'Refusée' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                    req.status === 'Complément requis' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                    'bg-blue-100 text-blue-800 border-blue-200'
                                                }`}>
                                                    {req.status}
                                                </span>

                                                {/* Badge Demande Groupée Équipe (UX-02) */}
                                                {req.is_team_request && (
                                                    <span className="text-xs text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold border border-blue-300">
                                                        <Users className="w-3 h-3 text-blue-700" />
                                                        Demande d'Équipe ({req.team_members?.length || 1} agents)
                                                    </span>
                                                )}

                                                {/* UX-03: Badge multi-sites ou multi-régions */}
                                                {req.is_multi_site && (
                                                    <span className="text-xs text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold border border-emerald-300">
                                                        <Compass className="w-3 h-3 text-emerald-700" />
                                                        {req.scope_type === 'multi_regions'
                                                            ? `Multi-Régions (${req.selected_regions?.length || 'Plusieurs'})`
                                                            : `Multi-Sites (${req.selected_sites?.length || req.selected_site_ids?.length || 'Plusieurs'})`}
                                                    </span>
                                                )}

                                                {req.site_name && (
                                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1 border border-gray-200">
                                                        <MapPin className="w-3 h-3 text-gray-500" />
                                                        {req.site_name}
                                                    </span>
                                                )}

                                                {req.equipment_type && (
                                                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200">
                                                        <Cpu className="w-3 h-3" />
                                                        {req.equipment_type}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title and Description */}
                                            <h3 className="font-semibold text-gray-950 text-base">
                                                {req.title}
                                            </h3>
                                            {req.description && (
                                                <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                                                    {req.description}
                                                </p>
                                            )}

                                            {/* UX-03: Détails Périmètre Multi-Sites / Multi-Régions */}
                                            {req.is_multi_site && (
                                                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs space-y-2">
                                                    <div className="flex items-center justify-between text-emerald-950 font-semibold">
                                                        <span className="flex items-center gap-1.5">
                                                            <Compass className="w-3.5 h-3.5 text-emerald-700" />
                                                            {req.scope_type === 'multi_regions' ? 'Périmètre Régional Étendu' : 'Périmètre Multi-Sites'}
                                                        </span>
                                                        <span className="text-[11px] text-emerald-700 font-normal">
                                                            {req.scope_type === 'multi_regions'
                                                                ? `${req.selected_regions?.length || 0} région(s) couverte(s)`
                                                                : `${req.selected_sites?.length || req.selected_site_ids?.length || 0} site(s) ferroviaire(s)`}
                                                        </span>
                                                    </div>

                                                    {req.scope_type === 'multi_regions' && req.selected_regions && req.selected_regions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                            {req.selected_regions.map((reg: string, rIdx: number) => (
                                                                <span key={rIdx} className="bg-white text-emerald-900 px-2.5 py-1 rounded border border-emerald-200 text-[11px] font-medium">
                                                                    {reg}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {req.scope_type === 'multi_sites' && req.selected_sites && req.selected_sites.length > 0 && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                                            {req.selected_sites.map((st: any, sIdx: number) => (
                                                                <div key={sIdx} className="bg-white px-2.5 py-1.5 rounded border border-emerald-200 flex items-center justify-between text-[11px]">
                                                                    <span className="font-medium text-gray-900 truncate mr-2">{st.name}</span>
                                                                    <span className="text-emerald-700 font-mono text-[10px] shrink-0">{st.code} ({st.region})</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Détails Équipe si demande groupée (UX-02) */}
                                            {req.is_team_request && req.team_members && req.team_members.length > 0 && (
                                                <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs space-y-2">
                                                    <div className="flex items-center justify-between text-blue-950 font-semibold">
                                                        <span className="flex items-center gap-1.5">
                                                            <Users className="w-3.5 h-3.5 text-blue-700" />
                                                            {req.team_name ? req.team_name : 'Composition de l\'équipe'} {req.team_company ? `(${req.team_company})` : ''}
                                                        </span>
                                                        <span className="text-[11px] text-blue-700 font-normal">
                                                            {req.team_members.length} habilitation(s) couverte(s)
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                                        {req.team_members.map((m: any, mIdx: number) => (
                                                            <div key={mIdx} className="bg-white px-2.5 py-1.5 rounded border border-blue-100 flex items-center justify-between text-[11px]">
                                                                <span className="font-medium text-gray-900">{m.name || `Agent ${mIdx+1}`}</span>
                                                                <span className="text-gray-500 font-mono">{m.role_or_qualification || 'Habilité'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Requester & Metadata */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                                                <span>Demandeur : <strong className="text-gray-700">{req.beneficiaire_name || `Agent #${req.beneficiaire_id}`}</strong> ({req.beneficiaire_service || 'Maintenance Voie'})</span>
                                                <span>•</span>
                                                <span>Créé le : {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                {currentStage && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-blue-700 font-medium">
                                                            Étape active : {currentStage.name} ({currentStage.validator_name || currentStage.validator_role})
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                        {/* Document Joint (Étape B) */}
                                        {req.document && (
                                            <div className="pt-2">
                                                <a
                                                    href={getDocumentDownloadUrl(req.document)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    <span>Pièce Justificative : {req.document_original_name || req.document}</span>
                                                    <Download className="w-3.5 h-3.5 ml-1" />
                                                </a>
                                            </div>
                                        )}

                                            {/* Complément Requis Note */}
                                            {req.complement_request && (
                                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                                                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                                                        <HelpCircle className="w-4 h-4 text-amber-600" />
                                                        Complément demandé par {req.complement_request.requested_by} :
                                                    </div>
                                                    <p className="italic">"{req.complement_request.message}"</p>
                                                    {req.complement_request.response && (
                                                        <div className="mt-2 pt-2 border-t border-amber-200/60">
                                                            <strong className="text-amber-950">Réponse de l'agent :</strong> {req.complement_request.response}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 pt-2 lg:pt-0">
                                        {/* Bouton Analyse IA (Étape D) */}
                                        {isFeatureEnabled('ai_demandes') && (
                                            <button
                                                id={`btn-ai-analyze-${req.reference}`}
                                                onClick={() => handleTriggerAI(req)}
                                                disabled={aiLoading[req.reference]}
                                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                            >
                                                <Sparkles className={`w-3.5 h-3.5 text-purple-600 ${aiLoading[req.reference] ? 'animate-spin' : ''}`} />
                                                {aiLoading[req.reference] ? 'Analyse en cours...' : req.ai_analysis ? 'Réévaluer avec l\'IA' : 'Analyse IA Sécurité'}
                                            </button>
                                        )}

                                        {(isPending || isComplement) && (
                                            <>
                                                <button
                                                    id={`btn-validate-${req.reference}`}
                                                    onClick={() => {
                                                        setActiveAction({ type: 'validate', reference: req.reference });
                                                        setActionMotif('Validation accordée - Étape conforme');
                                                    }}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Valider l'Étape
                                                </button>

                                                <button
                                                    id={`btn-complement-${req.reference}`}
                                                    onClick={() => {
                                                        setActiveAction({ type: 'complement', reference: req.reference });
                                                        setActionMotif('');
                                                    }}
                                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                                                >
                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                    Demander Complément
                                                </button>

                                                <button
                                                    id={`btn-refuse-${req.reference}`}
                                                    onClick={() => {
                                                        setActiveAction({ type: 'refuse', reference: req.reference });
                                                        setActionMotif('');
                                                    }}
                                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Refuser
                                                </button>
                                            </>
                                        )}

                                        {/* Bouton Télécharger Fiche PDF */}
                                        <button
                                            id={`btn-pdf-corbeille-req-${req.reference}`}
                                            type="button"
                                            onClick={() => handleDownloadSinglePdf(req.reference)}
                                            disabled={downloadingPdfRef === req.reference}
                                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-60"
                                            title="Télécharger l'autorisation d'accès mécatronique en format PDF officiel"
                                        >
                                            {downloadingPdfRef === req.reference ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                            ) : (
                                                <FileText className="w-3.5 h-3.5 text-rose-600" />
                                            )}
                                            {downloadingPdfRef === req.reference ? 'Création...' : 'Fiche PDF'}
                                        </button>

                                        {/* Bouton Modifier la demande */}
                                        <button
                                            id={`btn-edit-corbeille-req-${req.reference}`}
                                            onClick={() => handleStartEdit(req)}
                                            className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                                            title="Modifier les détails de la demande"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Modifier
                                        </button>
                                    </div>
                                </div>

                                {/* Stages Visual Stepper */}
                                {req.stages && req.stages.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                            Progression du circuit séquentiel :
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {req.stages.map((stg: any, sIdx: number) => {
                                                const isDone = stg.status === 'approved';
                                                const isCurrent = (req.current_stage_index || 0) === sIdx && req.status !== 'Validée' && req.status !== 'Refusée';
                                                const isRejected = stg.status === 'rejected' || (req.status === 'Refusée' && (req.current_stage_index || 0) === sIdx);

                                                return (
                                                    <div
                                                        key={stg.id || sIdx}
                                                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                                            isDone ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' :
                                                            isRejected ? 'bg-rose-50/70 border-rose-200 text-rose-950' :
                                                            isCurrent ? 'bg-blue-50 border-blue-300 text-blue-950 ring-1 ring-blue-300' :
                                                            'bg-gray-50 border-gray-200 text-gray-500'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                                isDone ? 'bg-emerald-600 text-white' :
                                                                isRejected ? 'bg-rose-600 text-white' :
                                                                isCurrent ? 'bg-[#002395] text-white' :
                                                                'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {sIdx + 1}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold">{stg.name}</div>
                                                                <div className="text-[10px] opacity-80">{stg.validator_name || stg.validator_role}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-semibold uppercase">
                                                            {isDone ? 'Approuvée' : isRejected ? 'Rejetée' : isCurrent ? 'En attente' : 'Suivante'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* AI Analysis Panel (Étape D) */}
                                {req.ai_analysis && isFeatureEnabled('ai_demandes') && (
                                    <div className="mt-4 pt-3 border-t border-purple-100">
                                        <div
                                            onClick={() => setExpandedAI(prev => ({ ...prev, [req.reference]: !prev[req.reference] }))}
                                            className="flex items-center justify-between cursor-pointer p-2.5 bg-purple-50/60 hover:bg-purple-50 rounded-lg border border-purple-200 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-purple-700" />
                                                <span className="text-xs font-bold text-purple-950">
                                                    Analyse de Sécurité & Conformité IA (Gemini)
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskBadgeColor(req.ai_analysis.risk_level)}`}>
                                                    Risque : {req.ai_analysis.risk_level}
                                                </span>
                                                <span className="text-[11px] text-purple-800 font-medium hidden sm:inline">
                                                    • {req.ai_analysis.urgency}
                                                </span>
                                            </div>
                                            <button className="text-purple-700">
                                                {expandedAI[req.reference] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {expandedAI[req.reference] && (
                                            <div className="p-4 mt-2 bg-white rounded-lg border border-purple-200 text-xs space-y-3 shadow-2xs">
                                                <div className="flex items-start gap-2 text-purple-900">
                                                    <Shield className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                                                    <div>
                                                        <strong>Contrôle réglementaire :</strong> {req.ai_analysis.compliance_check}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="font-semibold text-gray-900 mb-1.5">Points de vigilance identifiés :</div>
                                                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                                        {req.ai_analysis.key_points?.map((pt: string, idx: number) => (
                                                            <li key={idx}>{pt}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="p-2.5 bg-purple-50/80 rounded border border-purple-200 text-purple-950">
                                                    <strong>Recommandation pour la décision :</strong> {req.ai_analysis.recommendation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Action Dialog Modal (Validation, Complément, Refus) */}
            {activeAction && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2">
                                {activeAction.type === 'validate' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                {activeAction.type === 'complement' && <HelpCircle className="w-5 h-5 text-amber-600" />}
                                {activeAction.type === 'refuse' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
                                <h3 className="text-base font-bold text-gray-900">
                                    {activeAction.type === 'validate' && 'Confirmer la validation de l\'étape'}
                                    {activeAction.type === 'complement' && 'Demande de complément d\'information'}
                                    {activeAction.type === 'refuse' && 'Refus de la demande d\'accès'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setActiveAction(null)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Dossier : <strong className="text-gray-900">{activeAction.reference}</strong>
                                {activeAction.type === 'validate' && ' — Cette décision fera progresser la demande vers l\'étape suivante ou finalisera l\'autorisation mécatronique.'}
                                {activeAction.type === 'complement' && ' — Le demandeur recevra une notification et pourra compléter sa demande directement.'}
                                {activeAction.type === 'refuse' && ' — Un motif explicite est requis selon les règles d\'audit et de sécurité.'}
                            </p>

                            {actionError && (
                                <div className="p-2.5 bg-rose-50 text-rose-900 text-xs rounded-lg border border-rose-200 font-medium">
                                    {actionError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    {activeAction.type === 'validate' ? 'Commentaire d\'approbation (facultatif)' : 'Motif / Précisions demandées *'}
                                </label>
                                <textarea
                                    id="textarea-action-motif"
                                    rows={3}
                                    value={actionMotif}
                                    onChange={e => setActionMotif(e.target.value)}
                                    placeholder={
                                        activeAction.type === 'validate' ? 'Ex: Dossier technique conforme aux règles du site.' :
                                        activeAction.type === 'complement' ? 'Ex: Veuillez fournir la copie de votre attestation H0B0 en cours de validité.' :
                                        'Ex: Absence d\'ordre de mission valide pour ce secteur ferroviaire.'
                                    }
                                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setActiveAction(null)}
                                disabled={actionLoading}
                                className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                id="btn-confirm-action-submit"
                                type="button"
                                onClick={handleConfirmAction}
                                disabled={actionLoading}
                                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-2xs cursor-pointer ${
                                    activeAction.type === 'validate' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    activeAction.type === 'complement' ? 'bg-amber-600 hover:bg-amber-700' :
                                    'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {actionLoading ? 'Enregistrement...' : 'Confirmer la décision'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Request Modal Dialog */}
            {editingRequest && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Edit2 className="w-5 h-5 text-[#002395]" />
                                Modifier la demande ({editingRequest.reference})
                            </div>
                            <button
                                onClick={() => setEditingRequest(null)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {editError && (
                            <div className="mx-6 mt-4 p-2.5 bg-rose-50 text-rose-900 text-xs rounded-lg border border-rose-200 font-medium">
                                {editError}
                            </div>
                        )}

                        <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Titre de la demande *</label>
                                    <input
                                        id="input-corbeille-edit-title"
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Site d'intervention</label>
                                    <select
                                        id="select-corbeille-edit-site"
                                        value={editSite}
                                        onChange={e => setEditSite(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    >
                                        <option value="">Sélectionnez un site...</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={s.name}>{s.name} ({s.region})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Type d'équipement mécatronique</label>
                                    <input
                                        id="input-corbeille-edit-equipment"
                                        type="text"
                                        value={editEquipment}
                                        onChange={e => setEditEquipment(e.target.value)}
                                        placeholder="Ex: Clé électronique CLIQ, Badge NFC, Cadenas consigné"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Description et justifications opérationnelles</label>
                                    <textarea
                                        id="textarea-corbeille-edit-desc"
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setEditingRequest(null)}
                                    disabled={savingEdit}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    id="btn-save-corbeille-edit"
                                    type="submit"
                                    disabled={savingEdit}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer"
                                >
                                    <Check className="w-4 h-4" />
                                    {savingEdit ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* UX-01: Modal de validation ou refus par lot */}
            {batchActionModal.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2">
                                {batchActionModal.action === 'approved' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-rose-600" />
                                )}
                                <h3 className="text-base font-bold text-gray-900">
                                    {batchActionModal.action === 'approved'
                                        ? `Valider par lot (${selectedRefs.length} demande${selectedRefs.length > 1 ? 's' : ''})`
                                        : `Refuser par lot (${selectedRefs.length} demande${selectedRefs.length > 1 ? 's' : ''})`
                                    }
                                </h3>
                            </div>
                            <button
                                onClick={() => setBatchActionModal({ isOpen: false, action: 'approved' })}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                            <p className="text-xs text-gray-600">
                                Cette action sera appliquée simultanément aux dossiers suivants :
                            </p>

                            <div className="max-h-28 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-1.5">
                                {selectedRefs.map(ref => (
                                    <span key={ref} className="font-mono text-[11px] font-semibold text-[#002395] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {ref}
                                    </span>
                                ))}
                            </div>

                            {batchError && (
                                <div className="p-2.5 bg-rose-50 text-rose-900 text-xs rounded-lg border border-rose-200 font-medium">
                                    {batchError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    {batchActionModal.action === 'approved'
                                        ? 'Commentaire de validation groupée (facultatif)'
                                        : 'Motif de refus groupé *'
                                    }
                                </label>
                                <textarea
                                    id="textarea-batch-motif"
                                    rows={3}
                                    value={batchMotif}
                                    onChange={e => setBatchMotif(e.target.value)}
                                    placeholder={
                                        batchActionModal.action === 'approved'
                                            ? 'Ex: Validé lors du point d\'ordonnancement hebdomadaire.'
                                            : 'Ex: Justificatifs de sécurité non conformes aux consignes locales.'
                                    }
                                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setBatchActionModal({ isOpen: false, action: 'approved' })}
                                disabled={batchLoading}
                                className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                id="btn-confirm-batch-submit"
                                type="button"
                                onClick={handleConfirmBatchAction}
                                disabled={batchLoading}
                                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-2xs cursor-pointer ${
                                    batchActionModal.action === 'approved'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {batchLoading ? 'Traitement par lot...' : 'Confirmer le traitement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
