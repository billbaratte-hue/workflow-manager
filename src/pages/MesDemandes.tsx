import React, { useState, useEffect } from 'react';
import { getMyRequests, respondToComplement, editRequest, getSites, getExportExcelUrl, getExportPdfUrl, getRequestPdfUrl, getDocumentDownloadUrl, downloadRequestPDF, downloadAllRequestsPDF } from '../lib/api';
import {
    FileText,
    Download,
    HelpCircle,
    Send,
    MapPin,
    Cpu,
    Clock,
    RefreshCw,
    X,
    Plus,
    Edit2,
    Check,
    Users,
    Compass,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';

const mesDemandesHelpSections: HelpSection[] = [
    {
        title: "Suivi des Demandes Personnelles",
        badge: "Portail Agent",
        description: "Visualisez l'état d'avancement de vos demandes d'accès mécatroniques (badges, clés CLIQ, cadenas consignés).",
        tips: [
            "Consultez les étapes du circuit et les validations obtenues en temps réel",
            "Téléchargez vos justificatifs ou vos récapitulatifs en format Excel et PDF"
        ]
    },
    {
        title: "Modification d'un Dossier",
        badge: "Édition",
        description: "Vous pouvez modifier les informations d'une demande tant qu'elle est en attente ou si un complément d'information a été réclamé par le validateur."
    }
];

export default function MesDemandes() {
    const location = useLocation();
    const navigate = useNavigate();
    const filterRef = new URLSearchParams(location.search).get('ref');

    const [requests, setRequests] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Complement response dialog
    const [answeringRef, setAnsweringRef] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [submittingResponse, setSubmittingResponse] = useState(false);
    const [responseError, setResponseError] = useState('');

    // Edit request modal
    const [editingRequest, setEditingRequest] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editEquipment, setEditEquipment] = useState('');
    const [editSite, setEditSite] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    // PDF Download state
    const [downloadingPdfRef, setDownloadingPdfRef] = useState<string | null>(null);
    const [downloadingAllPdf, setDownloadingAllPdf] = useState(false);
    const [pdfToast, setPdfToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleDownloadSinglePdf = async (reference: string) => {
        setDownloadingPdfRef(reference);
        setPdfToast(null);
        try {
            await downloadRequestPDF(reference);
            setPdfToast({ type: 'success', message: `Fiche d'autorisation PDF pour ${reference} téléchargée avec succès.` });
            setTimeout(() => setPdfToast(null), 4000);
        } catch (err: any) {
            console.error("Erreur téléchargement PDF:", err);
            setPdfToast({ type: 'error', message: err.message || "Impossible de générer le fichier PDF." });
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
            setPdfToast({ type: 'success', message: "Registre global des demandes téléchargé en format PDF." });
            setTimeout(() => setPdfToast(null), 4000);
        } catch (err: any) {
            console.error("Erreur téléchargement export PDF:", err);
            setPdfToast({ type: 'error', message: err.message || "Erreur lors de l'exportation du PDF." });
            setTimeout(() => setPdfToast(null), 6000);
        } finally {
            setDownloadingAllPdf(false);
        }
    };

    const load = () => {
        setLoading(true);
        Promise.all([getMyRequests(), getSites()])
            .then(([reqRes, siteRes]) => {
                setRequests(reqRes.data);
                setSites(siteRes.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur chargement mes demandes:", err);
                setLoading(false);
            });
    };

    useEffect(() => { load(); }, []);

    const handleSendResponse = async (reference: string) => {
        if (!responseText.trim()) {
            setResponseError('Veuillez saisir votre réponse.');
            return;
        }

        setSubmittingResponse(true);
        setResponseError('');
        try {
            await respondToComplement(reference, responseText);
            setAnsweringRef(null);
            setResponseText('');
            load();
        } catch (err: any) {
            console.error("Erreur réponse complément:", err);
            setResponseError(err.response?.data?.error || "Erreur lors de l'envoi de la réponse.");
        } finally {
            setSubmittingResponse(false);
        }
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

    const getStatusBadge = (status: string) => {
        if (status === 'Validée') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (status === 'Refusée') return 'bg-rose-100 text-rose-800 border-rose-200';
        if (status === 'Brouillon') return 'bg-gray-100 text-gray-800 border-gray-200';
        if (status === 'Complément requis') return 'bg-amber-100 text-amber-800 border-amber-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-950">Mes Demandes d'Accès</h1>
                    <p className="text-sm text-gray-600">
                        Suivi en temps réel de vos demandes mécatroniques et habilitations ferroviaires
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PageHelpButton
                        pageTitle="Mes Demandes"
                        pageCategory="Portail Agent"
                        description="Suivez l'état de validation de vos demandes d'accès et gérez les compléments d'informations demandés."
                        sections={mesDemandesHelpSections}
                    />
                    <Link
                        id="btn-new-request-link"
                        to="/"
                        className="bg-[#002395] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nouvelle Demande
                    </Link>
                    <a
                        id="btn-export-excel"
                        href={getExportExcelUrl()}
                        download="demandes_acces.xls"
                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                    >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Excel
                    </a>
                    <button
                        id="btn-export-pdf"
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
                    <button
                        id="btn-refresh-mes-demandes"
                        onClick={load}
                        className="bg-white border border-gray-300 text-gray-700 p-1.5 rounded-lg hover:bg-gray-50 text-xs cursor-pointer"
                        title="Actualiser"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
                <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-blue-900">Demande ciblée depuis la recherche :</span>
                        <span className="font-mono font-bold bg-white text-[#002395] px-2 py-0.5 rounded border border-blue-300">
                            {filterRef}
                        </span>
                        {requests.filter(r => r.reference === filterRef || String(r.id) === filterRef).length === 0 && (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                Cette demande n'est pas dans votre historique personnel (créée par un autre agent).
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/mes-demandes')}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
                    >
                        Afficher toutes mes demandes
                    </button>
                </div>
            )}

            {/* List of Requests */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
                        Chargement de vos demandes...
                    </div>
                ) : (filterRef ? requests.filter(r => r.reference === filterRef || String(r.id) === filterRef) : requests).length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-gray-200 space-y-3">
                        <p className="text-sm text-gray-500">
                            {filterRef
                                ? `Aucune demande correspondant à la référence « ${filterRef} » trouvée dans votre espace.`
                                : "Vous n'avez pas encore de demande enregistrée."}
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#002395] px-4 py-2 rounded-lg hover:bg-blue-900 transition"
                        >
                            Créer une première demande dans le catalogue
                        </Link>
                    </div>
                ) : (
                    (Array.isArray(requests) ? (filterRef ? requests.filter(r => r.reference === filterRef || String(r.id) === filterRef) : requests) : []).map(req => {
                        const isComplement = req.status === 'Complément requis';
                        const canEdit = req.status.startsWith('En attente') || req.status === 'Brouillon' || req.status === 'Complément requis';

                        return (
                            <div
                                key={req.id || req.reference}
                                id={`my-request-card-${req.reference}`}
                                className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-gray-300 transition"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-[#002395] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                {req.reference}
                                            </span>
                                            
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadge(req.status)}`}>
                                                {req.status}
                                            </span>

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

                                            {/* UX-02: Badge demande groupée */}
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
                                        </div>

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

                                        {/* UX-02: Détails Équipe */}
                                        {req.is_team_request && req.team_members && req.team_members.length > 0 && (
                                            <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs space-y-2">
                                                <div className="flex items-center justify-between text-blue-950 font-semibold">
                                                    <span className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-blue-700" />
                                                        {req.team_name ? req.team_name : 'Membres de l\'équipe'} {req.team_company ? `(${req.team_company})` : ''}
                                                    </span>
                                                    <span className="text-[11px] text-blue-700 font-normal">
                                                        {req.team_members.length} agent(s) habilité(s)
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

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                Soumise le {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Pièce Justificative attachée (Étape B) */}
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

                                        {/* Complément Requis Alert Banner */}
                                        {isComplement && req.complement_request && (
                                            <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                                                        <HelpCircle className="w-4 h-4 text-amber-600" />
                                                        Le validateur ({req.complement_request.requested_by}) demande des précisions :
                                                    </div>
                                                    <button
                                                        onClick={() => setAnsweringRef(req.reference)}
                                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Send className="w-3 h-3" />
                                                        Répondre
                                                    </button>
                                                </div>
                                                <p className="text-amber-950 italic">
                                                    "{req.complement_request.message}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons (Fiche PDF + Modifier ma demande) */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            id={`btn-pdf-my-req-${req.reference}`}
                                            type="button"
                                            onClick={() => handleDownloadSinglePdf(req.reference)}
                                            disabled={downloadingPdfRef === req.reference}
                                            className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs disabled:opacity-60"
                                            title="Télécharger l'autorisation d'accès mécatronique officielle en PDF"
                                        >
                                            {downloadingPdfRef === req.reference ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                            ) : (
                                                <FileText className="w-3.5 h-3.5 text-rose-600" />
                                            )}
                                            <span>{downloadingPdfRef === req.reference ? 'Création...' : 'Fiche PDF'}</span>
                                        </button>
                                        {canEdit && (
                                            <button
                                                id={`btn-edit-my-req-${req.reference}`}
                                                onClick={() => handleStartEdit(req)}
                                                className="inline-flex items-center gap-1 text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs"
                                                title="Modifier les détails de la demande"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                <span>Modifier</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Modal / Inline Answer Box for Complement */}
                                {answeringRef === req.reference && (
                                    <div className="mt-4 p-4 bg-gray-50 border border-amber-300 rounded-lg space-y-3 animate-fade-in">
                                        <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
                                            <span>Votre réponse pour le validateur :</span>
                                            <button
                                                onClick={() => setAnsweringRef(null)}
                                                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {responseError && (
                                            <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded border border-rose-200">
                                                {responseError}
                                            </div>
                                        )}

                                        <textarea
                                            rows={3}
                                            value={responseText}
                                            onChange={e => setResponseText(e.target.value)}
                                            placeholder="Ex: Habilitation H0B0 renouvelée le 10/01/2026, attestation jointe par email..."
                                            className="w-full text-xs bg-white border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                        />

                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAnsweringRef(null)}
                                                className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="button"
                                                disabled={submittingResponse}
                                                onClick={() => handleSendResponse(req.reference)}
                                                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                {submittingResponse ? 'Transmission...' : 'Envoyer mon complément'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Progress Stepper */}
                                {req.stages && req.stages.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {req.stages.map((stg: any, sIdx: number) => {
                                                const isDone = stg.status === 'approved';
                                                const isCurrent = (req.current_stage_index || 0) === sIdx && req.status !== 'Validée' && req.status !== 'Refusée';
                                                
                                                return (
                                                    <span
                                                        key={stg.id || sIdx}
                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 ${
                                                            isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' :
                                                            isCurrent ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold ring-1 ring-blue-300' :
                                                            'bg-gray-50 text-gray-500 border-gray-200'
                                                        }`}
                                                    >
                                                        <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold bg-current text-white">
                                                            {sIdx + 1}
                                                        </span>
                                                        {stg.name} : {isDone ? 'Validé' : isCurrent ? 'En cours d\'avis' : 'À venir'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

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
                                        id="input-edit-req-title"
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Site ferroviaire d'intervention</label>
                                    <select
                                        id="select-edit-req-site"
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
                                        id="input-edit-req-equipment"
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
                                        id="textarea-edit-req-desc"
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
                                    id="btn-save-edit-req"
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
        </div>
    );
}
