import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    X,
    MapPin,
    User,
    Users,
    Cpu,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ExternalLink,
    FileText,
    ArrowRight,
    Sparkles,
    Shield,
    Download,
    CornerDownLeft,
    Compass,
    Loader2
} from 'lucide-react';
import { getRequests, getDocumentDownloadUrl, getRequestPdfUrl, downloadRequestPDF } from '../lib/api';
import Modal from './Modal';

interface GlobalSearchProps {
    user?: any;
    className?: string;
}

type SearchCategory = 'all' | 'id' | 'requester' | 'site';

export default function GlobalSearch({ user, className = '' }: GlobalSearchProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const handleDownloadPdf = async (ref: string) => {
        setDownloadingPdf(true);
        setPdfError(null);
        try {
            await downloadRequestPDF(ref);
        } catch (err: any) {
            console.error('Erreur téléchargement PDF:', err);
            setPdfError(err.message || 'Impossible de télécharger la fiche PDF.');
        } finally {
            setDownloadingPdf(false);
        }
    };
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch requests when search is activated or focused
    const loadRequests = async () => {
        if (hasLoaded && requests.length > 0) return;
        setLoading(true);
        try {
            const res = await getRequests();
            setRequests(res.data || []);
            setHasLoaded(true);
        } catch (err) {
            console.error('Erreur de chargement des demandes pour la recherche globale:', err);
        } finally {
            setLoading(false);
        }
    };

    // Keyboard shortcut (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
                loadRequests();
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, hasLoaded, requests.length]);

    // Handle clicks outside container to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter and score requests based on search query and category
    const filteredRequests = useMemo(() => {
        const cleanStr = (s: string) =>
            (s || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();

        const q = cleanStr(query);

        if (!q) {
            // When query is empty, show the 6 most recent requests
            return requests.slice(0, 6);
        }

        const terms = q.split(/\s+/).filter(Boolean);

        return requests.filter(req => {
            const idStr = String(req.id || '');
            const refStr = cleanStr(req.reference);
            const titleStr = cleanStr(req.title);
            const requesterStr = cleanStr(req.beneficiaire_name);
            const serviceStr = cleanStr(req.beneficiaire_service);
            const teamNameStr = cleanStr(req.team_name);
            const siteStr = cleanStr(req.site_name);
            const equipStr = cleanStr(req.equipment_type);
            const statusStr = cleanStr(req.status);

            const multiSitesStr = cleanStr(
                (req.selected_sites || []).map((s: any) => `${s.name} ${s.region}`).join(' ')
            );
            const teamMembersStr = cleanStr(
                (req.team_members || []).map((m: any) => `${m.name} ${m.company}`).join(' ')
            );

            // Category specific matching
            if (selectedCategory === 'id') {
                return terms.every(term => idStr.includes(term) || refStr.includes(term));
            }

            if (selectedCategory === 'requester') {
                return terms.every(term =>
                    requesterStr.includes(term) ||
                    serviceStr.includes(term) ||
                    teamNameStr.includes(term) ||
                    teamMembersStr.includes(term)
                );
            }

            if (selectedCategory === 'site') {
                return terms.every(term => siteStr.includes(term) || multiSitesStr.includes(term));
            }

            // 'all' category: match across all key fields
            return terms.every(term =>
                idStr.includes(term) ||
                refStr.includes(term) ||
                titleStr.includes(term) ||
                requesterStr.includes(term) ||
                serviceStr.includes(term) ||
                siteStr.includes(term) ||
                multiSitesStr.includes(term) ||
                equipStr.includes(term) ||
                statusStr.includes(term) ||
                teamNameStr.includes(term) ||
                teamMembersStr.includes(term)
            );
        });
    }, [requests, query, selectedCategory]);

    // Reset selected index when filtered list changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredRequests]);

    // Scroll active item into view
    useEffect(() => {
        if (listRef.current && filteredRequests.length > 0) {
            const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, filteredRequests]);

    // Keyboard navigation in results
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown') {
                setIsOpen(true);
                loadRequests();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredRequests.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredRequests.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredRequests[selectedIndex]) {
                handleSelectRequest(filteredRequests[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelectRequest = (req: any) => {
        setSelectedRequest(req);
        setIsOpen(false);
    };

    const navigateToOperationalPage = (target: 'mes-demandes' | 'corbeille', ref: string) => {
        setSelectedRequest(null);
        navigate(`/${target}?ref=${encodeURIComponent(ref)}`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Validée':
                return {
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                };
            case 'Refusée':
                return {
                    bg: 'bg-rose-50 text-rose-700 border-rose-200',
                    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />
                };
            case 'Complément requis':
                return {
                    bg: 'bg-blue-50 text-blue-700 border-blue-200',
                    icon: <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                };
            case 'Brouillon':
                return {
                    bg: 'bg-gray-100 text-gray-700 border-gray-200',
                    icon: <Clock className="w-3.5 h-3.5 text-gray-500" />
                };
            default:
                // En attente...
                return {
                    bg: 'bg-amber-50 text-amber-800 border-amber-200',
                    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />
                };
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Search Input Bar */}
            <div
                id="global-search-container"
                className={`relative flex items-center transition-all duration-200 rounded-lg ${
                    isOpen
                        ? 'bg-white text-gray-900 shadow-md ring-2 ring-white/50'
                        : 'bg-blue-900/60 hover:bg-blue-900/80 text-white border border-blue-400/30'
                }`}
            >
                <Search
                    className={`w-4 h-4 ml-3 shrink-0 transition-colors ${
                        isOpen ? 'text-blue-800' : 'text-blue-200'
                    }`}
                />
                <input
                    ref={inputRef}
                    id="global-search-input"
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        loadRequests();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Rechercher (N° ID, demandeur, site)..."
                    className={`w-full py-1.5 pl-2.5 pr-16 text-xs outline-hidden placeholder:text-blue-200/70 ${
                        isOpen ? 'placeholder:text-gray-400 text-gray-900' : 'text-white'
                    }`}
                />

                <div className="absolute right-2 flex items-center gap-1">
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            className={`p-0.5 rounded hover:bg-gray-200/50 transition cursor-pointer ${
                                isOpen ? 'text-gray-400 hover:text-gray-700' : 'text-blue-200 hover:text-white'
                            }`}
                            title="Effacer la recherche"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <kbd
                        onClick={() => {
                            inputRef.current?.focus();
                            setIsOpen(true);
                            loadRequests();
                        }}
                        className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer transition select-none ${
                            isOpen
                                ? 'bg-gray-100 text-gray-500 border border-gray-200'
                                : 'bg-blue-950/40 text-blue-200 border border-blue-400/20'
                        }`}
                        title="Raccourci clavier pour rechercher"
                    >
                        ⌘K
                    </kbd>
                </div>
            </div>

            {/* Dropdown Results Box */}
            {isOpen && (
                <div
                    id="global-search-dropdown"
                    className="absolute top-full left-0 right-0 sm:-right-24 md:-right-36 mt-2 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in duration-100"
                    style={{ minWidth: '320px', maxWidth: '580px' }}
                >
                    {/* Filter Tabs & Header */}
                    <div className="px-3.5 py-2.5 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-gray-500 mr-1">Filtrer par :</span>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('all')}
                                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
                                    selectedCategory === 'all'
                                        ? 'bg-[#002395] text-white shadow-2xs font-semibold'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                Tous ({query ? filteredRequests.length : requests.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('id')}
                                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
                                    selectedCategory === 'id'
                                        ? 'bg-[#002395] text-white shadow-2xs font-semibold'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                N° / ID
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('requester')}
                                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
                                    selectedCategory === 'requester'
                                        ? 'bg-[#002395] text-white shadow-2xs font-semibold'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                Demandeur
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('site')}
                                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition cursor-pointer ${
                                    selectedCategory === 'site'
                                        ? 'bg-[#002395] text-white shadow-2xs font-semibold'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                Site
                            </button>
                        </div>

                        {loading && (
                            <span className="text-[11px] text-blue-700 animate-pulse font-medium">
                                Chargement...
                            </span>
                        )}
                    </div>

                    {/* Results List */}
                    <div ref={listRef} className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
                        {loading && requests.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-500">
                                Recherche des demandes dans le portail...
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-gray-700">
                                    Aucune demande ne correspond à « {query} »
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
                                    Vérifiez l'identifiant (ex: 001), le nom de l'agent ou le site d'intervention.
                                </p>
                            </div>
                        ) : (
                            <>
                                {!query && (
                                    <div className="px-3.5 py-1.5 bg-blue-50/50 text-[11px] font-semibold text-blue-900 border-b border-blue-100 flex items-center justify-between">
                                        <span>Dernières demandes enregistrées</span>
                                        <span className="text-[10px] font-normal text-blue-700">
                                            Saisissez un mot pour filtrer
                                        </span>
                                    </div>
                                )}
                                {filteredRequests.map((req, idx) => {
                                    const badge = getStatusBadge(req.status);
                                    const isSelected = idx === selectedIndex;

                                    return (
                                        <div
                                            key={req.id || req.reference}
                                            onClick={() => handleSelectRequest(req)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 ${
                                                isSelected ? 'bg-blue-50/80 border-l-4 border-l-[#002395]' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            {/* Row Header: Reference & Status */}
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs bg-gray-100 text-blue-950 px-2 py-0.5 rounded border border-gray-200">
                                                        {req.reference || `ID #${req.id}`}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                                                    >
                                                        {badge.icon}
                                                        <span>{req.status}</span>
                                                    </span>
                                                    {req.is_team_request && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium">
                                                            <Users className="w-3 h-3" />
                                                            Équipe ({req.team_members?.length || 0})
                                                        </span>
                                                    )}
                                                    {req.is_multi_site && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-medium">
                                                            <Compass className="w-3 h-3" />
                                                            Multi-sites ({req.selected_sites?.length || 0})
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {req.created_at ? new Date(req.created_at).toLocaleDateString('fr-FR') : 'Récent'}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                                                {req.title}
                                            </h4>

                                            {/* Metadata subline: Requester, Site, Equipment */}
                                            <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-600">
                                                <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                                    <User className="w-3 h-3 text-blue-700 shrink-0" />
                                                    {req.beneficiaire_name || 'Agent'}
                                                    {req.beneficiaire_service && (
                                                        <span className="text-gray-400">({req.beneficiaire_service})</span>
                                                    )}
                                                </span>

                                                <span className="inline-flex items-center gap-1 text-gray-700">
                                                    <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                                                    <span className="truncate max-w-[180px]">
                                                        {req.site_name || (req.selected_sites && req.selected_sites[0]?.name) || 'Site non spécifié'}
                                                    </span>
                                                </span>

                                                {req.equipment_type && (
                                                    <span className="inline-flex items-center gap-1 text-gray-500 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                                                        <Cpu className="w-2.5 h-2.5 text-gray-600" />
                                                        {req.equipment_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* Footer / Shortcuts Help */}
                    <div className="px-3.5 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                        <div className="flex items-center gap-3">
                            <span>
                                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded font-mono text-[9px] shadow-2xs">↑</kbd>{' '}
                                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded font-mono text-[9px] shadow-2xs">↓</kbd>{' '}
                                naviguer
                            </span>
                            <span>
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono text-[9px] shadow-2xs">Entrée</kbd>{' '}
                                consulter
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                            {filteredRequests.length} résultat{filteredRequests.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Request Detail Modal */}
            {selectedRequest && (
                <Modal
                    isOpen={!!selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    maxWidth="2xl"
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-sm bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                                {selectedRequest.reference || `#${selectedRequest.id}`}
                            </span>
                            <span className="text-gray-900 font-bold truncate max-w-md">
                                {selectedRequest.title}
                            </span>
                        </div>
                    }
                    subtitle={
                        <span>
                            Créée le{' '}
                            {selectedRequest.created_at
                                ? new Date(selectedRequest.created_at).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                  })
                                : 'Récemment'}
                        </span>
                    }
                    footer={
                        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">
                                Référence unique : <strong className="font-mono">{selectedRequest.reference}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => navigateToOperationalPage('mes-demandes', selectedRequest.reference)}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                                >
                                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                                    <span>Mes Demandes</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateToOperationalPage('corbeille', selectedRequest.reference)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>Corbeille Validateur</span>
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-5 text-xs text-gray-700">
                        {/* Status banner */}
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                            <div>
                                <span className="text-[11px] text-gray-500 block">Statut opérationnel du dossier</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                            getStatusBadge(selectedRequest.status).bg
                                        }`}
                                    >
                                        {getStatusBadge(selectedRequest.status).icon}
                                        <span>{selectedRequest.status}</span>
                                    </span>
                                </div>
                            </div>

                            {selectedRequest.equipment_type && (
                                <div className="text-right">
                                    <span className="text-[11px] text-gray-500 block">Matériel mécatronique</span>
                                    <span className="font-semibold text-gray-900 flex items-center gap-1 justify-end">
                                        <Cpu className="w-3.5 h-3.5 text-blue-700" />
                                        {selectedRequest.equipment_type}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Demandeur & Équipe Section */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
                                <User className="w-4 h-4 text-[#002395]" />
                                Demandeur & Affectation
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-gray-500 block">Agent demandeur :</span>
                                    <strong className="text-gray-900 font-semibold">
                                        {selectedRequest.beneficiaire_name || 'Non spécifié'}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Service / Unité :</span>
                                    <strong className="text-gray-900">
                                        {selectedRequest.beneficiaire_service || 'Maintenance Voie'}
                                    </strong>
                                </div>
                                {selectedRequest.intervention_duration && (
                                    <div>
                                        <span className="text-gray-500 block">Durée prévisionnelle :</span>
                                        <span className="font-medium text-gray-800">
                                            {selectedRequest.intervention_duration}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Team request members */}
                            {selectedRequest.is_team_request && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5 font-semibold text-purple-900 mb-2">
                                        <Users className="w-3.5 h-3.5 text-purple-700" />
                                        <span>
                                            Équipe : {selectedRequest.team_name || 'Intervention'} (
                                            {selectedRequest.team_company || 'Interne'})
                                        </span>
                                    </div>
                                    {selectedRequest.team_members && selectedRequest.team_members.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                            {selectedRequest.team_members.map((m: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="p-2 bg-purple-50/50 border border-purple-100 rounded-lg text-[11px]"
                                                >
                                                    <div className="font-bold text-purple-950">{m.name}</div>
                                                    <div className="text-purple-700 text-[10px]">
                                                        {m.role_or_qualification} {m.company ? `• ${m.company}` : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sites & Périmètre */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                            <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-600" />
                                Emprises & Sites Ferroviaires
                            </h4>
                            <div className="text-xs">
                                <div className="flex items-center gap-2 font-semibold text-gray-900">
                                    <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                                    <span>
                                        {selectedRequest.site_name || 'Site principal'}
                                    </span>
                                </div>
                                {selectedRequest.selected_sites && selectedRequest.selected_sites.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedRequest.selected_sites.map((s: any, idx: number) => (
                                            <span
                                                key={idx}
                                                className="bg-red-50 text-red-900 border border-red-200 px-2 py-0.5 rounded text-[11px] font-medium"
                                            >
                                                📍 {s.name} ({s.region})
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {selectedRequest.description && (
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5">
                                <span className="text-xs font-bold text-gray-900 block">
                                    Description des travaux & justification :
                                </span>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {selectedRequest.description}
                                </p>
                            </div>
                        )}

                        {/* Circuit de Validation (Stages) */}
                        {selectedRequest.stages && selectedRequest.stages.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-[#002395]" />
                                    Circuit d'Approbation & Étapes
                                </h4>
                                <div className="space-y-2">
                                    {selectedRequest.stages.map((stage: any, index: number) => {
                                        const isStageApproved = stage.status === 'approved';
                                        const isStageRejected = stage.status === 'rejected';
                                        const isStageComplement = stage.status === 'complement_requested';
                                        const isCurrent = index === selectedRequest.current_stage_index;

                                        return (
                                            <div
                                                key={stage.id || index}
                                                className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                                                    isStageApproved
                                                        ? 'bg-emerald-50/70 border-emerald-200'
                                                        : isStageRejected
                                                        ? 'bg-rose-50/70 border-rose-200'
                                                        : isStageComplement
                                                        ? 'bg-blue-50/70 border-blue-200'
                                                        : isCurrent
                                                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                                                        : 'bg-gray-50 border-gray-200 text-gray-400'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                                            isStageApproved
                                                                ? 'bg-emerald-600 text-white'
                                                                : isStageRejected
                                                                ? 'bg-rose-600 text-white'
                                                                : isStageComplement
                                                                ? 'bg-blue-600 text-white'
                                                                : isCurrent
                                                                ? 'bg-amber-500 text-white'
                                                                : 'bg-gray-200 text-gray-500'
                                                        }`}
                                                    >
                                                        {isStageApproved ? '✓' : index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 text-xs">
                                                            {stage.name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            Rôle : {stage.validator_role}{' '}
                                                            {stage.validator_name ? `• ${stage.validator_name}` : ''}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right sm:text-right">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            isStageApproved
                                                                ? 'text-emerald-800 bg-emerald-100'
                                                                : isStageRejected
                                                                ? 'text-rose-800 bg-rose-100'
                                                                : isStageComplement
                                                                ? 'text-blue-800 bg-blue-100'
                                                                : isCurrent
                                                                ? 'text-amber-800 bg-amber-100'
                                                                : 'text-gray-500 bg-gray-100'
                                                        }`}
                                                    >
                                                        {isStageApproved
                                                            ? 'Validé'
                                                            : isStageRejected
                                                            ? 'Refusé'
                                                            : isStageComplement
                                                            ? 'Complément requis'
                                                            : isCurrent
                                                            ? 'En cours'
                                                            : 'À venir'}
                                                    </span>
                                                    {stage.validated_at && (
                                                        <span className="block text-[10px] text-gray-400 mt-0.5">
                                                            {new Date(stage.validated_at).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Document Justificatif */}
                        {selectedRequest.document && (
                            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-700" />
                                    <div>
                                        <div className="font-semibold text-gray-900 text-xs">
                                            Justificatif d'intervention joint
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {selectedRequest.document_original_name || 'Document officiel'}
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href={getDocumentDownloadUrl(selectedRequest.document)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#002395] border border-blue-200 rounded-lg font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Télécharger</span>
                                </a>
                            </div>
                        )}
                        {/* Actions : Télécharger Fiche PDF officielle */}
                        {pdfError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                                {pdfError}
                            </div>
                        )}
                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => handleDownloadPdf(selectedRequest.reference || selectedRequest.id)}
                                disabled={downloadingPdf}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-60"
                            >
                                {downloadingPdf ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                ) : (
                                    <FileText className="w-4 h-4 text-rose-600" />
                                )}
                                <span>{downloadingPdf ? 'Génération du PDF...' : 'Télécharger l\'autorisation d\'accès (PDF)'}</span>
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
