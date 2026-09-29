/**
 * @file src/pages/Referentiels.tsx
 * Master Referential Tables & Lookup Data Explorer (Epic 4 - User Story 4.5).
 * Unified view of mechatronic lookup dictionaries, sites, categories, and technical referentials.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface RefTableSummary {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rowCount: number;
    columnCount: number;
    updatedAt: string;
}

export default function Referentiels() {
    const [tables, setTables] = useState<RefTableSummary[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/admin/tables')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data)) {
                    const mapped: RefTableSummary[] = data.map((tbl: any) => ({
                        id: tbl.id,
                        name: tbl.name,
                        description: tbl.description || '',
                        icon: tbl.icon || 'fas fa-table',
                        category: tbl.category || 'Général',
                        rowCount: Array.isArray(tbl.rows) ? tbl.rows.length : 0,
                        columnCount: Array.isArray(tbl.columns) ? tbl.columns.length : 0,
                        updatedAt: tbl.updated_at ? new Date(tbl.updated_at).toLocaleDateString('fr-FR') : 'Récent'
                    }));
                    setTables(mapped);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const categories = ['ALL', ...Array.from(new Set(tables.map(t => t.category)))];

    const filtered = tables.filter(t => {
        const matchCat = selectedCategory === 'ALL' || t.category === selectedCategory;
        const matchQ = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchQ;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-[#002395] uppercase tracking-widest">
                        <i className="fas fa-database"></i> Données de Référence & Métadonnées
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        Référentiels & Dictionnaires Métier
                    </h1>
                    <p className="text-sm text-slate-500">
                        Consultation et gouvernance des tables de référence mécatroniques
                    </p>
                </div>

                <Link
                    to="/tables-admin"
                    className="inline-flex items-center gap-2 bg-[#002395] hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl shadow text-xs transition"
                >
                    <i className="fas fa-edit"></i>
                    <span>Éditeur de Schémas & Tables</span>
                </Link>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-80">
                    <i className="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Rechercher un référentiel..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                selectedCategory === cat
                                    ? 'bg-[#002395] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {cat === 'ALL' ? 'Toutes les catégories' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">
                    <i className="fas fa-spinner fa-spin text-2xl text-[#002395] mb-2"></i>
                    <div className="text-sm">Chargement des référentiels...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    <i className="fas fa-folder-open text-4xl text-slate-300 mb-3"></i>
                    <h3 className="text-base font-bold text-slate-700">Aucun référentiel trouvé</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(tbl => (
                        <div
                            key={tbl.id}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 bg-blue-50 text-[#002395] rounded-xl flex items-center justify-center text-lg">
                                        <i className={tbl.icon}></i>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                        {tbl.category}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mt-2">{tbl.name}</h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tbl.description}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                <div>
                                    <span className="font-bold text-slate-800 font-mono">{tbl.rowCount}</span> lignes • <span className="font-bold text-slate-800 font-mono">{tbl.columnCount}</span> cols
                                </div>
                                <Link
                                    to={`/tables-admin?table=${tbl.id}`}
                                    className="font-semibold text-[#002395] hover:underline flex items-center gap-1"
                                >
                                    <span>Explorer</span>
                                    <i className="fas fa-arrow-right text-[10px]"></i>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
