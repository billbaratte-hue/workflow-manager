/**
 * @file src/pages/Entites.tsx
 * Organizational Entities & Direction Hierarchy Management (Epic 4 - User Story 4.5).
 * Governance of Organizational Directions, Operational Hubs, Maintenance Teams, and Partner Companies.
 */

import React, { useState } from 'react';

interface EntityRecord {
    id: string;
    code: string;
    name: string;
    parentEntity?: string;
    type: 'DIRECTION' | 'INFRAPOLE' | 'EQUIPE' | 'PRESTATAIRE_TIERS';
    responsable: string;
    region: string;
    effectif: number;
    statut: 'ACTIF' | 'SUSPENDU';
}

export default function Entites() {
    const [entities, setEntities] = useState<EntityRecord[]>([
        { id: '1', code: 'DIR-NAT', name: 'Direction Générale des Infrastructures', type: 'DIRECTION', responsable: 'Directeur Général', region: 'National', effectif: 42000, statut: 'ACTIF' },
        { id: '1b', code: 'DIR-OPS', name: 'Direction Générale des Opérations', parentEntity: 'Direction Générale des Infrastructures', type: 'DIRECTION', responsable: 'Directeur Général', region: 'National', effectif: 42000, statut: 'ACTIF' },
        { id: '2', code: 'INFRA-IDF-OUEST', name: 'Infrapôle Paris Ouest & Normandie', parentEntity: 'Direction Générale des Infrastructures', type: 'INFRAPOLE', responsable: 'Marc Vasseur', region: 'Île-de-France', effectif: 1250, statut: 'ACTIF' },
        { id: '2b', code: 'POLE-IDF-OUEST', name: 'Pôle Opérationnel Ouest', parentEntity: 'Direction Générale des Opérations', type: 'INFRAPOLE', responsable: 'Marc Vasseur', region: 'Île-de-France', effectif: 1250, statut: 'ACTIF' },
        { id: '3', code: 'EQ-SES-TRAPPES', name: 'Équipe SES (Signalisation Électrique) Trappes', parentEntity: 'Infrapôle Paris Ouest & Normandie', type: 'EQUIPE', responsable: 'Valérie Gomez', region: 'Île-de-France', effectif: 28, statut: 'ACTIF' },
        { id: '4', code: 'INFRA-RHONE', name: 'Infrapôle Auvergne-Rhône-Alpes', parentEntity: 'Direction Générale des Infrastructures', type: 'INFRAPOLE', responsable: 'Alain Roussel', region: 'Auvergne-Rhône-Alpes', effectif: 980, statut: 'ACTIF' },
        { id: '5', code: 'EXT-ALSTOM', name: 'Alstom Transport Signalling (Sous-traitant)', type: 'PRESTATAIRE_TIERS', responsable: 'Laurent Petit', region: 'National', effectif: 140, statut: 'ACTIF' }
    ]);

    const [filterType, setFilterType] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [newEntity, setNewEntity] = useState<Partial<EntityRecord>>({
        type: 'EQUIPE',
        region: 'Île-de-France',
        statut: 'ACTIF',
        effectif: 10
    });

    const handleCreateEntity = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntity.code || !newEntity.name || !newEntity.responsable) return;

        const record: EntityRecord = {
            id: String(Date.now()),
            code: newEntity.code.toUpperCase(),
            name: newEntity.name,
            parentEntity: newEntity.parentEntity,
            type: newEntity.type as any || 'EQUIPE',
            responsable: newEntity.responsable,
            region: newEntity.region || 'Île-de-France',
            effectif: Number(newEntity.effectif) || 1,
            statut: newEntity.statut as any || 'ACTIF'
        };

        setEntities(prev => [record, ...prev]);
        setModalOpen(false);
        setNewEntity({ type: 'EQUIPE', region: 'Île-de-France', statut: 'ACTIF', effectif: 10 });
    };

    const filtered = entities.filter(ent => {
        const matchesType = filterType === 'ALL' || ent.type === filterType;
        const matchesSearch = ent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              ent.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              ent.responsable.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-[#002395] uppercase tracking-widest">
                        <i className="fas fa-sitemap"></i> Organisation Interne & Tiers
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        Gestion des Entités & Directions
                    </h1>
                    <p className="text-sm text-slate-500">
                        Hiérarchie structurelle, infrapôles régionaux, équipes techniques et prestataires habilités
                    </p>
                </div>

                <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-[#002395] hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl shadow text-xs transition"
                >
                    <i className="fas fa-plus"></i>
                    <span>Ajouter une Entité</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-80">
                    <i className="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Rechercher entité, infrapôle, responsable..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {[
                        { key: 'ALL', label: 'Toutes' },
                        { key: 'DIRECTION', label: 'Directions' },
                        { key: 'INFRAPOLE', label: 'Infrapôles' },
                        { key: 'EQUIPE', label: 'Équipes Métier' },
                        { key: 'PRESTATAIRE_TIERS', label: 'Prestataires' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilterType(tab.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                filterType === tab.key
                                    ? 'bg-[#002395] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Entities Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <tr>
                            <th className="py-3 px-4">Code & Désignation</th>
                            <th className="py-3 px-4">Typologie</th>
                            <th className="py-3 px-4">Région</th>
                            <th className="py-3 px-4">Responsable</th>
                            <th className="py-3 px-4">Effectif</th>
                            <th className="py-3 px-4">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(ent => (
                            <tr key={ent.id} className="hover:bg-slate-50 transition">
                                <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-[#002395] bg-blue-50 px-2 py-0.5 rounded">
                                            {ent.code}
                                        </span>
                                        <span className="font-bold text-slate-900 text-sm">{ent.name}</span>
                                    </div>
                                    {ent.parentEntity && (
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            Rattaché à : {ent.parentEntity}
                                        </div>
                                    )}
                                </td>
                                <td className="py-3.5 px-4">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                        ent.type === 'DIRECTION' ? 'bg-purple-100 text-purple-800' :
                                        ent.type === 'INFRAPOLE' ? 'bg-blue-100 text-blue-800' :
                                        ent.type === 'EQUIPE' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-amber-100 text-amber-800'
                                    }`}>
                                        {ent.type}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-slate-600">{ent.region}</td>
                                <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{ent.responsable}</td>
                                <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{ent.effectif} agents</td>
                                <td className="py-3.5 px-4">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                        {ent.statut}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Ajouter une Nouvelle Entité</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreateEntity} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Code Structure (ex: INFRA-04)</label>
                                <input
                                    type="text"
                                    required
                                    value={newEntity.code || ''}
                                    onChange={(e) => setNewEntity({ ...newEntity, code: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nom / Désignation</label>
                                <input
                                    type="text"
                                    required
                                    value={newEntity.name || ''}
                                    onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Type d'entité</label>
                                    <select
                                        value={newEntity.type}
                                        onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none bg-white"
                                    >
                                        <option value="DIRECTION">Direction</option>
                                        <option value="INFRAPOLE">Infrapôle</option>
                                        <option value="EQUIPE">Équipe Métier</option>
                                        <option value="PRESTATAIRE_TIERS">Prestataire Tiers</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Région</label>
                                    <input
                                        type="text"
                                        value={newEntity.region || ''}
                                        onChange={(e) => setNewEntity({ ...newEntity, region: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Responsable / Dirigeant</label>
                                <input
                                    type="text"
                                    required
                                    value={newEntity.responsable || ''}
                                    onChange={(e) => setNewEntity({ ...newEntity, responsable: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#002395] hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow"
                                >
                                    Créer l'Entité
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
