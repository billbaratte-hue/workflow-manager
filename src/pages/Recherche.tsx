/**
 * @file src/pages/Recherche.tsx
 * Dedicated Global Search Page (Epic 4 - User Story 4.3).
 * Comprehensive search across dossiers, entities, agents, hardware, and referentials.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface SearchItem {
    id: string | number;
    type: 'DEMANDE' | 'AGENT' | 'SITE' | 'MATERIEL';
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    link: string;
    date?: string;
}

export default function Recherche() {
    const [query, setQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [results, setResults] = useState<SearchItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [allRequests, setAllRequests] = useState<any[]>([]);

    useEffect(() => {
        // Fetch all requests to populate local search index
        fetch('/api/v1/requests')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data)) {
                    setAllRequests(data);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const q = query.toLowerCase().trim();

        // 1. Search in Requests
        const matchedRequests: SearchItem[] = allRequests
            .filter(r =>
                (r.reference && r.reference.toLowerCase().includes(q)) ||
                (r.title && r.title.toLowerCase().includes(q)) ||
                (r.beneficiaire_name && r.beneficiaire_name.toLowerCase().includes(q)) ||
                (r.site_name && r.site_name.toLowerCase().includes(q)) ||
                (r.equipment_type && r.equipment_type.toLowerCase().includes(q))
            )
            .map(r => ({
                id: r.reference || r.id,
                type: 'DEMANDE',
                title: `${r.reference} — ${r.title}`,
                subtitle: `${r.beneficiaire_name || 'Agent'} • ${r.site_name || 'Multi-sites'} • ${r.equipment_type || 'Matériel mécatronique'}`,
                badge: r.status,
                badgeColor: r.status.includes('Validée') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
                link: `/mes-demandes`,
                date: r.created_at
            }));

        // 2. Mock Entities & Sites Search
        const knownSites = [
            { name: 'Poste d\'Aiguillage Trappes', region: 'Île-de-France', code: 'TRP-01' },
            { name: 'Gare Saint-Lazare Voies 1-10', region: 'Île-de-France', code: 'PSL-01' },
            { name: 'Tunnel sous Fourvière', region: 'Auvergne-Rhône-Alpes', code: 'LYO-TUN-04' },
            { name: 'Atelier Central Paris-Nord', region: 'Île-de-France', code: 'PN-ATEL' }
        ];

        const matchedSites: SearchItem[] = knownSites
            .filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.region.toLowerCase().includes(q))
            .map(s => ({
                id: s.code,
                type: 'SITE',
                title: `Site : ${s.name}`,
                subtitle: `Région ${s.region} • Identifiant SIG ${s.code}`,
                badge: 'Site Ferroviaire',
                badgeColor: 'bg-purple-100 text-purple-800',
                link: `/tables-admin`
            }));

        // 3. Mock Hardware items
        const hardwareList = [
            { serial: 'MEC-2026-F9000-001', type: 'Clé F9000', location: 'Atelier Central Paris-Nord' },
            { serial: 'MEC-2026-F9000-002', type: 'Clé F9000', location: 'Atelier Lyon-Perrache' },
            { serial: 'CYL-2026-N2-044', type: 'Cylindre Électronique', location: 'Magasin Central Réseau' }
        ];

        const matchedHw: SearchItem[] = hardwareList
            .filter(h => h.serial.toLowerCase().includes(q) || h.type.toLowerCase().includes(q))
            .map(h => ({
                id: h.serial,
                type: 'MATERIEL',
                title: `Matériel : ${h.serial}`,
                subtitle: `${h.type} • Localisation : ${h.location}`,
                badge: 'Régie Mécatronique',
                badgeColor: 'bg-amber-100 text-amber-800',
                link: `/regie`
            }));

        const combined = [...matchedRequests, ...matchedSites, ...matchedHw];
        setResults(combined);
        setLoading(false);
    }, [query, allRequests]);

    const filteredResults = results.filter(r => filterType === 'ALL' || r.type === filterType);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-8">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#002395] bg-blue-50 px-3 py-1 rounded-full mb-3">
                    <i className="fas fa-search"></i> Moteur Transverse Opérationnel
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Recherche Globale du Portail
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                    Retrouvez un dossier, un numéro de série de clé, un site ferroviaire ou un agent en temps réel.
                </p>

                {/* Big Search Input */}
                <div className="mt-6 relative shadow-lg rounded-2xl overflow-hidden border border-slate-200">
                    <i className="fas fa-search absolute left-5 top-5 text-slate-400 text-lg"></i>
                    <input
                        type="text"
                        autoFocus
                        placeholder="Tapez une référence (ex: REQ-2026), un nom de site, un matricule..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-14 pr-12 py-4 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002395]"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
                {[
                    { key: 'ALL', label: 'Tous les résultats', icon: 'fas fa-globe' },
                    { key: 'DEMANDE', label: 'Dossiers & Demandes', icon: 'fas fa-folder' },
                    { key: 'SITE', label: 'Sites & Emprises', icon: 'fas fa-building' },
                    { key: 'MATERIEL', label: 'Matériel & Clés', icon: 'fas fa-key' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilterType(tab.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            filterType === tab.key
                                ? 'bg-[#002395] text-white shadow'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <i className={tab.icon}></i>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Results Section */}
            {query.trim() === '' ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 max-w-lg mx-auto">
                    <i className="fas fa-lightbulb text-4xl text-amber-400 mb-3"></i>
                    <h3 className="text-base font-bold text-slate-700">Suggestions de recherche</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Essayez de saisir <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[#002395]">REQ</span>, <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[#002395]">Trappes</span>, ou <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[#002395]">F9000</span> pour voir les résultats instantanément.
                    </p>
                </div>
            ) : loading ? (
                <div className="text-center py-12 text-slate-500">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2 text-[#002395]"></i>
                    <div className="text-sm">Recherche en cours dans la base de données...</div>
                </div>
            ) : filteredResults.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
                    <i className="fas fa-inbox text-4xl text-slate-300 mb-3"></i>
                    <h3 className="text-base font-bold text-slate-700">Aucun résultat trouvé</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Aucun dossier, équipement ou site ne correspond aux critères "{query}".
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">
                        {filteredResults.length} résultat(s) correspondant(s) trouvé(s)
                    </div>
                    {filteredResults.map(item => (
                        <div
                            key={`${item.type}_${item.id}`}
                            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-blue-50 text-[#002395] rounded-xl text-lg mt-0.5">
                                    <i className={
                                        item.type === 'DEMANDE' ? 'fas fa-file-alt' :
                                        item.type === 'SITE' ? 'fas fa-map-marked-alt' :
                                        'fas fa-microchip'
                                    }></i>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor}`}>
                                            {item.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{item.subtitle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {item.date && (
                                    <span className="text-xs text-slate-400">
                                        {new Date(item.date).toLocaleDateString('fr-FR')}
                                    </span>
                                )}
                                <Link
                                    to={item.link}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-[#002395] hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
                                >
                                    <span>Consulter</span>
                                    <i className="fas fa-chevron-right text-[10px]"></i>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
