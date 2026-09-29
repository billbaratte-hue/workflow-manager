import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategoryStatus, deleteCategory } from '../lib/api';
import { Plus, Edit2, Trash2, Power, X, Check, FolderOpen } from 'lucide-react';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';

const cataloguesHelpSections: HelpSection[] = [
    {
        title: "Structuration des Catalogues",
        badge: "Organisation",
        description: "Les catalogues regroupent les processus et accès mécatroniques par familles de métiers (ex: Signalisation, Télécoms, Sous-stations, Voie, Bâtiments).",
        tips: [
            "Associez les workflows aux catalogues pour structurer le portail de demandes des agents",
            "La suspension d'un catalogue masque temporairement ses services sans supprimer l'historique"
        ]
    },
    {
        title: "Administration & Statuts",
        badge: "Cycle de vie",
        description: "Activez ou suspendez un catalogue en un clic. Modifiez le libellé et la description à tout moment."
    }
];

export default function CataloguesAdmin() {
    const [categories, setCategories] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Editing modal state
    const [editingCategory, setEditingCategory] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editStatus, setEditStatus] = useState('Actif');
    const [saving, setSaving] = useState(false);

    // Deletion confirmation modal
    const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);

    const load = () => getCategories().then(res => setCategories(res.data));
    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await createCategory({ name, description });
        setName('');
        setDescription('');
        setShowAdd(false);
        load();
    };

    const handleStartEdit = (category: any) => {
        setEditingCategory(category);
        setEditName(category.name);
        setEditDescription(category.description || '');
        setEditStatus(category.status || 'Actif');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory || !editName.trim()) return;
        setSaving(true);
        try {
            await updateCategoryStatus(editingCategory.id, editStatus);
            // Also update name and description
            const { updateCategory } = await import('../lib/api');
            await updateCategory(editingCategory.id, {
                name: editName.trim(),
                description: editDescription.trim(),
                status: editStatus
            });
            setEditingCategory(null);
            load();
        } catch (err) {
            console.error("Erreur lors de la modification du catalogue:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await deleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
            load();
        } catch (err) {
            console.error("Erreur lors de la suppression:", err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
                        <FolderOpen className="w-6 h-6 text-[#002395]" />
                        Gestion des Catalogues
                    </h1>
                    <p className="text-sm text-gray-600">Organisation des familles de services et périmètres de sûreté</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <PageHelpButton
                        pageTitle="Gestion des Catalogues"
                        pageCategory="Organisation Métier"
                        description="Structurez les familles de services mécatroniques et organisez la visibilité des accès proposés aux agents."
                        sections={cataloguesHelpSections}
                    />
                    <button
                        id="btn-add-category"
                        onClick={() => setShowAdd(!showAdd)}
                        className="bg-[#002395] hover:bg-blue-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                        {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showAdd ? 'Fermer' : 'Ajouter un Catalogue'}
                    </button>
                </div>
            </div>

            {/* Add New Category Form */}
            {showAdd && (
                <div className="bg-white p-6 shadow-xs border border-gray-200 rounded-xl mb-6">
                    <h2 className="text-base font-bold text-gray-900 mb-4">Créer une nouvelle catégorie de service</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du catalogue *</label>
                            <input
                                id="input-new-cat-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Outillage de Voie & Signalisation"
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                            <textarea
                                id="textarea-new-cat-desc"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Description de l'usage et du cadre d'intervention..."
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                id="btn-submit-new-cat"
                                type="submit"
                                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                            >
                                Enregistrer le catalogue
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List of Categories */}
            <div className="bg-white shadow-xs border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
                {categories.map(c => (
                    <div key={c.id} id={`cat-item-${c.id}`} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                    c.status === 'Actif'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                    {c.status}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 max-w-2xl">{c.description || 'Aucune description spécifiée.'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Bouton Modifier */}
                            <button
                                id={`btn-edit-cat-${c.id}`}
                                onClick={() => handleStartEdit(c)}
                                className="inline-flex items-center gap-1 text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs"
                                title="Modifier ce catalogue"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Modifier</span>
                            </button>

                            {/* Bouton Activer / Suspendre */}
                            <button
                                id={`btn-toggle-cat-${c.id}`}
                                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs ${
                                    c.status === 'Actif'
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                onClick={() => updateCategoryStatus(c.id, c.status === 'Actif' ? 'Suspendu' : 'Actif').then(load)}
                                title={c.status === 'Actif' ? 'Suspendre' : 'Activer'}
                            >
                                <Power className="w-3.5 h-3.5" />
                                <span>{c.status === 'Actif' ? 'Suspendre' : 'Activer'}</span>
                            </button>

                            {/* Bouton Supprimer */}
                            <button
                                id={`btn-delete-cat-${c.id}`}
                                className="inline-flex items-center gap-1 text-xs bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs"
                                onClick={() => setCategoryToDelete(c)}
                                title="Supprimer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Category Modal Dialog */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Edit2 className="w-5 h-5 text-[#002395]" />
                                Modifier le Catalogue
                            </div>
                            <button
                                onClick={() => setEditingCategory(null)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du catalogue *</label>
                                    <input
                                        id="input-edit-cat-name"
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        id="textarea-edit-cat-desc"
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Statut d'activité</label>
                                    <select
                                        id="select-edit-cat-status"
                                        value={editStatus}
                                        onChange={e => setEditStatus(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    >
                                        <option value="Actif">Actif (Visible dans le catalogue)</option>
                                        <option value="Suspendu">Suspendu (Masqué aux demandeurs)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setEditingCategory(null)}
                                    disabled={saving}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    id="btn-save-edit-cat"
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer"
                                >
                                    <Check className="w-4 h-4" />
                                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* In-app Deletion Modal for Categories */}
            {categoryToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col my-auto overflow-hidden p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 leading-snug">
                                    Supprimer le catalogue "{categoryToDelete.name}" ?
                                </h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Cette catégorie ne sera plus proposée aux demandeurs. Les demandes existantes liées à ce catalogue resteront conservées dans le journal d'audit.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setCategoryToDelete(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer le catalogue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
