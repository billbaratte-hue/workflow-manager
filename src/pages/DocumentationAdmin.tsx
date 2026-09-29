/**
 * @file src/pages/DocumentationAdmin.tsx
 * Documentation Management & Authoring CRUD Interface (Epic 4 - User Story 4.4).
 * Allows admins to create, edit, categorize, and publish technical manuals and procedure guides.
 */

import React, { useState } from 'react';

interface AdminDocItem {
    id: string;
    title: string;
    category: string;
    badge: string;
    status: 'PUBLIE' | 'BROUILLON' | 'ARCHIVE';
    lastUpdated: string;
    author: string;
    content: string;
}

export default function DocumentationAdmin() {
    const [docs, setDocs] = useState<AdminDocItem[]>([
        {
            id: 'doc-01',
            title: 'Procédure Générale de Demande de Clé Mécatronique F9000',
            category: 'GUIDES',
            badge: 'Guide Utilisateur',
            status: 'PUBLIE',
            lastUpdated: '15/02/2026',
            author: 'Direction Sécurité & Accès',
            content: 'Contenu officiel de la procédure de demande...'
        },
        {
            id: 'doc-02',
            title: 'Spécifications Techniques du Cahier des Charges',
            category: 'SPECIFICATIONS',
            badge: 'Cahier des Charges',
            status: 'PUBLIE',
            lastUpdated: '01/01/2026',
            author: 'Bureau d\'Ingénierie',
            content: 'Architecture des 8 processus mécatroniques...'
        },
        {
            id: 'doc-03',
            title: 'Directive NIS 2 & Traçabilité des Événements Sûreté',
            category: 'SURETE',
            badge: 'Conformité NIS 2',
            status: 'PUBLIE',
            lastUpdated: '20/01/2026',
            author: 'Pôle Cyber & Sûreté',
            content: 'Exigences de traçabilité immuable et audit...'
        }
    ]);

    const [editingDoc, setEditingDoc] = useState<AdminDocItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoc) return;

        if (isCreating) {
            setDocs(prev => [...prev, { ...editingDoc, id: `doc-${Date.now()}`, lastUpdated: new Date().toLocaleDateString('fr-FR') }]);
            setFeedback('Nouveau document créé et enregistré avec succès.');
        } else {
            setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...editingDoc, lastUpdated: new Date().toLocaleDateString('fr-FR') } : d));
            setFeedback('Document mis à jour avec succès.');
        }

        setEditingDoc(null);
        setIsCreating(false);
        setTimeout(() => setFeedback(null), 3500);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            setDocs(prev => prev.filter(d => d.id !== id));
            setFeedback('Document supprimé du référentiel.');
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleStartNew = () => {
        setEditingDoc({
            id: '',
            title: '',
            category: 'GUIDES',
            badge: 'Guide Interne',
            status: 'BROUILLON',
            lastUpdated: new Date().toLocaleDateString('fr-FR'),
            author: 'Administrateur',
            content: ''
        });
        setIsCreating(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-[#002395] uppercase tracking-widest">
                        <i className="fas fa-book"></i> Espace Administrateur
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        Gestion de la Documentation & Procédures
                    </h1>
                    <p className="text-sm text-slate-500">
                        Création, révision et publication des manuels d'exploitation et spécifications
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleStartNew}
                        className="inline-flex items-center gap-2 bg-[#002395] hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl shadow text-xs transition"
                    >
                        <i className="fas fa-plus"></i>
                        <span>Rédiger un Document</span>
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {feedback && (
                <div className="mb-6 p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 text-xs font-semibold rounded-r-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-check-circle text-emerald-600"></i>
                        <span>{feedback}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-emerald-700">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Editor Modal / Drawer */}
            {editingDoc && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {isCreating ? 'Nouveau Guide / Fiche Procédure' : 'Modifier le Document'}
                            </h3>
                            <button
                                onClick={() => { setEditingDoc(null); setIsCreating(false); }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la fiche</label>
                                <input
                                    type="text"
                                    required
                                    value={editingDoc.title}
                                    onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                                    <select
                                        value={editingDoc.category}
                                        onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none bg-white"
                                    >
                                        <option value="GUIDES">Guides Utilisateurs</option>
                                        <option value="SPECIFICATIONS">Spécifications & Processus Métier</option>
                                        <option value="SURETE">Sûreté & NIS 2</option>
                                        <option value="FAQ">FAQ & Assistance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Statut</label>
                                    <select
                                        value={editingDoc.status}
                                        onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none bg-white"
                                    >
                                        <option value="PUBLIE">Publié (En ligne)</option>
                                        <option value="BROUILLON">Brouillon interne</option>
                                        <option value="ARCHIVE">Archivé</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Contenu / Markdown</label>
                                <textarea
                                    rows={8}
                                    required
                                    value={editingDoc.content}
                                    onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    placeholder="Rédigez ici le contenu de la procédure..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setEditingDoc(null); setIsCreating(false); }}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#002395] hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow"
                                >
                                    Enregistrer & Publier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <tr>
                            <th className="py-3 px-4">Titre & Catégorie</th>
                            <th className="py-3 px-4">Auteur</th>
                            <th className="py-3 px-4">Dernière Révision</th>
                            <th className="py-3 px-4">Statut</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {docs.map(doc => (
                            <tr key={doc.id} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 text-sm">{doc.title}</div>
                                    <div className="text-xs text-slate-500">{doc.category} • {doc.badge}</div>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600">{doc.author}</td>
                                <td className="py-3 px-4 text-xs text-slate-500">{doc.lastUpdated}</td>
                                <td className="py-3 px-4">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                        doc.status === 'PUBLIE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right space-x-2">
                                    <button
                                        onClick={() => { setEditingDoc(doc); setIsCreating(false); }}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-[#002395] hover:text-white rounded text-xs font-bold transition"
                                        title="Modifier"
                                    >
                                        <i className="fas fa-pencil-alt"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold transition"
                                        title="Supprimer"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
