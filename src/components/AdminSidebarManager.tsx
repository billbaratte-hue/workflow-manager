import React, { useState, useEffect } from 'react';
import { AdminNavItem, AdminNavSection } from '../types/navigation';
import {
    updateAdminSidebarItem,
    createAdminSidebarItem,
    deleteAdminSidebarItem,
    batchUpdateAdminSidebarItems,
    resetAdminSidebarItems,
    updateAdminSidebarSection,
    createAdminSidebarSection,
    deleteAdminSidebarSection,
    batchUpdateAdminSidebarSections,
    resetAdminSidebarSections
} from '../lib/api';

interface AdminSidebarManagerProps {
    items: AdminNavItem[];
    sections: AdminNavSection[];
    onRefresh: () => Promise<void>;
    onLocalUpdate: (items: AdminNavItem[]) => void;
    onLocalUpdateSections: (sections: AdminNavSection[]) => void;
}

const AVAILABLE_ICONS = [
    { label: 'Bouclier / Sécurité', value: 'fas fa-shield-alt' },
    { label: 'Rôles & Utilisateurs', value: 'fas fa-user-shield' },
    { label: 'Utilisateurs & Attributs', value: 'fas fa-users' },
    { label: 'Workflows & Processus', value: 'fas fa-sitemap' },
    { label: 'Notifications / Cloche', value: 'fas fa-bell' },
    { label: 'Onglets / Paramètres', value: 'fas fa-sliders-h' },
    { label: 'Bouton Bascule / Toggle', value: 'fas fa-toggle-on' },
    { label: 'Base de Données / Tables', value: 'fas fa-table' },
    { label: 'Dossier / Catalogues', value: 'fas fa-folder' },
    { label: 'Dossier Plus', value: 'fas fa-folder-plus' },
    { label: 'Terminal / Syslog / Audit', value: 'fas fa-terminal' },
    { label: 'Empreinte / Conformité', value: 'fas fa-fingerprint' },
    { label: 'Rouages / Métier', value: 'fas fa-cogs' },
    { label: 'Clé / Accès', value: 'fas fa-key' },
    { label: 'Boîte / Archives', value: 'fas fa-archive' },
    { label: 'Graphique / Rapports', value: 'fas fa-chart-bar' },
    { label: 'Étoile / Favori', value: 'fas fa-star' },
    { label: 'Bâtiment / Sites', value: 'fas fa-building' },
    { label: 'Train / Ferroviaire', value: 'fas fa-train' },
    { label: 'Lien / Navigation', value: 'fas fa-link' }
];

const BADGE_COLOR_OPTIONS = [
    { label: 'Gris standard', value: 'bg-gray-100 text-gray-700' },
    { label: 'Bleu Corporate', value: 'bg-blue-100 text-[#002395]' },
    { label: 'Violet Modulaire', value: 'bg-purple-100 text-purple-900' },
    { label: 'Ambre / Avertissement', value: 'bg-amber-100 text-amber-900' },
    { label: 'Jaune Matrice', value: 'bg-yellow-400 text-blue-950' },
    { label: 'Vert Émeraude', value: 'bg-emerald-100 text-emerald-900' },
    { label: 'Rouge Alerte', value: 'bg-rose-100 text-rose-800' }
];

export default function AdminSidebarManager({
    items,
    sections,
    onRefresh,
    onLocalUpdate,
    onLocalUpdateSections
}: AdminSidebarManagerProps) {
    // Top-level sub-view: 'items' or 'sections'
    const [activeSubTab, setActiveSubTab] = useState<'items' | 'sections'>('items');

    // Toggle states for showing/hiding information and help
    const [showInfo, setShowInfo] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('portal_nav_show_info');
            return saved !== null ? saved === 'true' : true;
        } catch {
            return true;
        }
    });

    const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('portal_nav_show_technical');
            return saved !== null ? saved === 'true' : false;
        } catch {
            return false;
        }
    });

    // Save display preferences
    useEffect(() => {
        try {
            localStorage.setItem('portal_nav_show_info', String(showInfo));
        } catch {
            // ignore
        }
    }, [showInfo]);

    useEffect(() => {
        try {
            localStorage.setItem('portal_nav_show_technical', String(showTechnicalDetails));
        } catch {
            // ignore
        }
    }, [showTechnicalDetails]);

    // States for item management
    const [editingItem, setEditingItem] = useState<AdminNavItem | null>(null);
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [newItemForm, setNewItemForm] = useState<Partial<AdminNavItem>>({
        key: '',
        label: '',
        path: '',
        icon: 'fas fa-link',
        section: sections[0]?.key || 'security',
        badge: '',
        badge_color: '',
        display_order: items.length + 1,
        is_visible: true
    });
    const [filterSection, setFilterSection] = useState<string>('all');

    // States for section management
    const [editingSection, setEditingSection] = useState<AdminNavSection | null>(null);
    const [isCreatingSection, setIsCreatingSection] = useState(false);
    const [newSectionForm, setNewSectionForm] = useState<Partial<AdminNavSection>>({
        key: '',
        title: '',
        icon: 'fas fa-folder',
        badge: '',
        badge_color: '',
        display_order: sections.length + 1,
        is_visible: true
    });

    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4500);
    };

    // ==========================================
    // SECTION OPERATIONS
    // ==========================================

    const handleToggleSectionVisible = async (section: AdminNavSection) => {
        const newVisible = !section.is_visible;
        const updated = sections.map(s => s.key === section.key ? { ...s, is_visible: newVisible } : s);
        onLocalUpdateSections(updated);

        try {
            await updateAdminSidebarSection(section.key, { is_visible: newVisible });
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Visibilité de la section '${section.title}' mise à jour (${newVisible ? 'Visible' : 'Masquée'}).`);
        } catch (err: any) {
            onLocalUpdateSections(sections);
            showFeedback('error', `Erreur lors de la mise à jour de la section: ${err.message || 'Échec'}`);
        }
    };

    const handleMoveSectionOrder = async (section: AdminNavSection, direction: 'up' | 'down') => {
        const sorted = [...sections].sort((a, b) => a.display_order - b.display_order);
        const currentIndex = sorted.findIndex(s => s.key === section.key);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sorted.length) return;

        const otherSec = sorted[targetIndex];
        const newOrder = otherSec.display_order;
        const otherNewOrder = section.display_order;

        const updated = sections.map(s => {
            if (s.key === section.key) return { ...s, display_order: newOrder };
            if (s.key === otherSec.key) return { ...s, display_order: otherNewOrder };
            return s;
        });

        onLocalUpdateSections(updated);

        try {
            await batchUpdateAdminSidebarSections(updated);
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Ordre de la section '${section.title}' mis à jour.`);
        } catch (err: any) {
            onLocalUpdateSections(sections);
            showFeedback('error', `Erreur d'ordonnancement: ${err.message || 'Échec'}`);
        }
    };

    const handleSaveSectionEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSection) return;

        setSaving(true);
        try {
            await updateAdminSidebarSection(editingSection.key, {
                title: editingSection.title,
                icon: editingSection.icon,
                badge: editingSection.badge,
                badge_color: editingSection.badge_color,
                display_order: Number(editingSection.display_order)
            });

            const updated = sections.map(s => s.key === editingSection.key ? editingSection : s);
            onLocalUpdateSections(updated);
            setEditingSection(null);
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `La section '${editingSection.title}' a été modifiée avec succès.`);
        } catch (err: any) {
            showFeedback('error', `Erreur de modification de la section: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSectionForm.title || !newSectionForm.key) {
            showFeedback('error', "Le titre et la clé de la section sont obligatoires.");
            return;
        }

        const cleanKey = newSectionForm.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

        setSaving(true);
        try {
            const res = await createAdminSidebarSection({
                key: cleanKey,
                title: newSectionForm.title.trim(),
                icon: newSectionForm.icon || 'fas fa-folder',
                badge: newSectionForm.badge || '',
                badge_color: newSectionForm.badge_color || '',
                display_order: Number(newSectionForm.display_order) || (sections.length + 1),
                is_visible: true
            });

            if (res.data?.section) {
                onLocalUpdateSections([...sections, res.data.section]);
            } else {
                await onRefresh();
            }

            setIsCreatingSection(false);
            setNewSectionForm({
                key: '',
                title: '',
                icon: 'fas fa-folder',
                badge: '',
                badge_color: '',
                display_order: sections.length + 2,
                is_visible: true
            });
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Nouvelle section '${newSectionForm.title}' créée avec succès !`);
        } catch (err: any) {
            showFeedback('error', `Erreur de création de la section: ${err.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSection = async (section: AdminNavSection) => {
        if (section.is_system) {
            alert("Cette section est protégée par le système et ne peut pas être supprimée.");
            return;
        }

        const itemsInSection = items.filter(i => i.section.toLowerCase() === section.key.toLowerCase());
        if (itemsInSection.length > 0) {
            alert(`Impossible de supprimer cette section : ${itemsInSection.length} élément(s) de menu y sont actuellement rattachés. Déplacez-les ou supprimez-les d'abord.`);
            return;
        }

        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la section '${section.title}' ?`)) {
            return;
        }

        setSaving(true);
        try {
            await deleteAdminSidebarSection(section.key);
            onLocalUpdateSections(sections.filter(s => s.key !== section.key));
            if (filterSection === section.key) setFilterSection('all');
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Section '${section.title}' supprimée.`);
        } catch (err: any) {
            showFeedback('error', `Erreur lors de la suppression: ${err.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleResetSections = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser les sections de navigation aux valeurs d'usine ?")) {
            return;
        }

        setSaving(true);
        try {
            const res = await resetAdminSidebarSections();
            if (res.data?.sections) {
                onLocalUpdateSections(res.data.sections);
            } else {
                await onRefresh();
            }
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', "Les sections du volet de navigation ont été réinitialisées.");
        } catch (err: any) {
            showFeedback('error', `Erreur lors de la réinitialisation des sections: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // ITEM OPERATIONS
    // ==========================================

    const handleToggleVisible = async (item: AdminNavItem) => {
        const newVisible = !item.is_visible;
        const updatedItems = items.map(i => i.key === item.key ? { ...i, is_visible: newVisible } : i);
        onLocalUpdate(updatedItems);

        try {
            await updateAdminSidebarItem(item.key, { is_visible: newVisible });
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Visibilité de '${item.label}' mise à jour (${newVisible ? 'Visible' : 'Masqué'}).`);
        } catch (err: any) {
            onLocalUpdate(items);
            showFeedback('error', `Erreur lors de la mise à jour: ${err.message || 'Échec réseau'}`);
        }
    };

    const handleMoveOrder = async (item: AdminNavItem, direction: 'up' | 'down') => {
        const sectionItems = items
            .filter(i => i.section === item.section)
            .sort((a, b) => a.display_order - b.display_order);

        const currentIndex = sectionItems.findIndex(i => i.key === item.key);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sectionItems.length) return;

        const otherItem = sectionItems[targetIndex];
        const newOrder = otherItem.display_order;
        const otherNewOrder = item.display_order;

        const updated = items.map(i => {
            if (i.key === item.key) return { ...i, display_order: newOrder };
            if (i.key === otherItem.key) return { ...i, display_order: otherNewOrder };
            return i;
        });

        onLocalUpdate(updated);

        try {
            await batchUpdateAdminSidebarItems(updated);
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Ordre de '${item.label}' mis à jour.`);
        } catch (err: any) {
            onLocalUpdate(items);
            showFeedback('error', `Erreur de réorganisation: ${err.message || 'Échec'}`);
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        setSaving(true);
        try {
            await updateAdminSidebarItem(editingItem.key, {
                label: editingItem.label,
                path: editingItem.path,
                icon: editingItem.icon,
                section: editingItem.section,
                badge: editingItem.badge,
                badge_color: editingItem.badge_color,
                display_order: Number(editingItem.display_order)
            });

            const updated = items.map(i => i.key === editingItem.key ? editingItem : i);
            onLocalUpdate(updated);
            setEditingItem(null);
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `L'élément '${editingItem.label}' a été modifié avec succès.`);
        } catch (err: any) {
            showFeedback('error', `Erreur de sauvegarde: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemForm.key || !newItemForm.label || !newItemForm.path || !newItemForm.section) {
            showFeedback('error', "Veuillez renseigner tous les champs obligatoires (*).");
            return;
        }

        const cleanKey = newItemForm.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

        setSaving(true);
        try {
            const res = await createAdminSidebarItem({
                key: cleanKey,
                label: newItemForm.label.trim(),
                path: newItemForm.path.trim(),
                icon: newItemForm.icon || 'fas fa-link',
                section: newItemForm.section,
                badge: newItemForm.badge || '',
                badge_color: newItemForm.badge_color || '',
                display_order: Number(newItemForm.display_order) || (items.length + 1),
                is_visible: true
            });

            if (res.data?.item) {
                onLocalUpdate([...items, res.data.item]);
            } else {
                await onRefresh();
            }

            setIsCreatingItem(false);
            setNewItemForm({
                key: '',
                label: '',
                path: '',
                icon: 'fas fa-link',
                section: sections[0]?.key || 'security',
                badge: '',
                badge_color: '',
                display_order: items.length + 2,
                is_visible: true
            });
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `Nouvel élément de menu '${newItemForm.label}' ajouté avec succès !`);
        } catch (err: any) {
            showFeedback('error', `Erreur de création: ${err.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (item: AdminNavItem) => {
        if (item.is_system) {
            alert("Cet élément est protégé par le système et ne peut pas être supprimé.");
            return;
        }

        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'élément de menu '${item.label}' ?`)) {
            return;
        }

        setSaving(true);
        try {
            await deleteAdminSidebarItem(item.key);
            onLocalUpdate(items.filter(i => i.key !== item.key));
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', `L'élément de menu '${item.label}' a été supprimé.`);
        } catch (err: any) {
            showFeedback('error', `Erreur lors de la suppression: ${err.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleResetItems = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser la configuration des éléments de navigation aux valeurs d'usine ?")) {
            return;
        }

        setSaving(true);
        try {
            const res = await resetAdminSidebarItems();
            if (res.data?.items) {
                onLocalUpdate(res.data.items);
            } else {
                await onRefresh();
            }
            window.dispatchEvent(new Event('portal_admin_nav_updated'));
            showFeedback('success', "Les éléments du volet de navigation ont été réinitialisés.");
        } catch (err: any) {
            showFeedback('error', `Erreur lors de la réinitialisation: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const filteredItems = items
        .filter(item => filterSection === 'all' || item.section.toLowerCase() === filterSection.toLowerCase())
        .sort((a, b) => a.display_order - b.display_order);

    const sortedSections = [...sections].sort((a, b) => a.display_order - b.display_order);

    return (
        <div id="admin-sidebar-manager" className="space-y-4">
            {/* Header & Description */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-blue-100 text-[#002395] rounded-xl flex-shrink-0">
                            <i className="fas fa-bars-staggered text-lg"></i>
                        </span>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span>Configuration du Volet de Navigation</span>
                            </h2>
                            {showInfo && (
                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                    Configurez les <strong>Éléments de Menu</strong> et <strong>Sections</strong> : ordre, icônes, et <strong>tags / badges</strong> (ex: RBAC, Spécial, Espace, OFF).
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle show/hide informational text */}
                    <button
                        id="btn-toggle-show-info"
                        onClick={() => setShowInfo(!showInfo)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                            showInfo
                                ? 'bg-blue-50 text-[#002395] hover:bg-blue-100 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                        title={showInfo ? "Masquer les informations explicatives" : "Afficher les informations explicatives"}
                    >
                        <i className={`fas ${showInfo ? 'fa-eye-slash' : 'fa-circle-info'}`}></i>
                        <span>{showInfo ? 'Masquer infos' : 'Afficher infos'}</span>
                    </button>

                    {/* Toggle technical details in table */}
                    <button
                        id="btn-toggle-technical-details"
                        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                            showTechnicalDetails
                                ? 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                        title={showTechnicalDetails ? "Masquer les détails techniques (clés système, URLs)" : "Afficher les détails techniques (clés système, URLs)"}
                    >
                        <i className={`fas ${showTechnicalDetails ? 'fa-sliders' : 'fa-code'}`}></i>
                        <span>{showTechnicalDetails ? 'Masquer détails tech' : 'Afficher détails tech'}</span>
                    </button>

                    {activeSubTab === 'items' ? (
                        <>
                            <button
                                id="btn-add-nav-item"
                                onClick={() => setIsCreatingItem(true)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg shadow-xs transition flex items-center gap-1.5"
                            >
                                <i className="fas fa-plus"></i>
                                <span>Nouvel Élément</span>
                            </button>
                            <button
                                id="btn-reset-admin-sidebar"
                                onClick={handleResetItems}
                                disabled={saving}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1.5"
                                title="Réinitialiser les éléments aux réglages par défaut"
                            >
                                <i className="fas fa-undo"></i>
                                <span>Réinitialiser</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                id="btn-add-nav-section"
                                onClick={() => setIsCreatingSection(true)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg shadow-xs transition flex items-center gap-1.5"
                            >
                                <i className="fas fa-plus"></i>
                                <span>Nouvelle Section</span>
                            </button>
                            <button
                                id="btn-reset-admin-sections"
                                onClick={handleResetSections}
                                disabled={saving}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1.5"
                                title="Réinitialiser les sections aux réglages par défaut"
                            >
                                <i className="fas fa-undo"></i>
                                <span>Réinitialiser</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Sub-Tabs: Navigation between Items vs Sections */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 rounded-xl border shadow-2xs">
                <div className="flex gap-2">
                    <button
                        id="tab-subview-items"
                        onClick={() => setActiveSubTab('items')}
                        className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                            activeSubTab === 'items'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <i className="fas fa-list-check"></i>
                        <span>Éléments & Badges de Menu</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#002395] font-extrabold">
                            {items.filter(i => i.is_visible).length} / {items.length}
                        </span>
                    </button>

                    <button
                        id="tab-subview-sections"
                        onClick={() => setActiveSubTab('sections')}
                        className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                            activeSubTab === 'sections'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <i className="fas fa-folder-tree"></i>
                        <span>Sections & Badges (ex: RBAC)</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#002395] font-extrabold">
                            {sections.filter(s => s.is_visible).length} / {sections.length}
                        </span>
                    </button>
                </div>

                <div className="hidden sm:flex items-center text-xs text-gray-500">
                    <i className="fas fa-sync-alt mr-1.5 text-blue-500"></i>
                    <span>Synchronisation temps réel avec le volet</span>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-xs ${
                    feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* ======================================================== */}
            {/* SUB-VIEW 1: SECTIONS DE NAVIGATION                       */}
            {/* ======================================================== */}
            {activeSubTab === 'sections' && (
                <div className="space-y-4">
                    {/* Dismissible / Toggable Info Banner */}
                    {showInfo && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start justify-between gap-3 animate-in fade-in duration-150">
                            <div className="flex items-start gap-3">
                                <i className="fas fa-circle-info text-base text-[#002395] mt-0.5 flex-shrink-0"></i>
                                <div>
                                    <span className="font-bold">À propos des sections :</span> Les sections regroupent thématiquement les liens dans le volet d'administration gauche. Vous pouvez modifier leurs intitulés, leurs icônes, leurs badges d'identification, réordonner leur séquence d'affichage, en masquer certaines d'un clic ou en créer de nouvelles pour des modules métier dédiés.
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInfo(false)}
                                title="Masquer cette information"
                                className="text-blue-400 hover:text-blue-700 p-1 flex-shrink-0"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-3 text-center w-16">Ordre</th>
                                    <th className="px-4 py-3 min-w-[220px]">Section Thématique</th>
                                    {showTechnicalDetails && (
                                        <th className="px-3 py-3 font-mono min-w-[130px]">Clé Système</th>
                                    )}
                                    <th className="px-3 py-3 text-center min-w-[110px]">Badge</th>
                                    <th className="px-3 py-3 text-center min-w-[100px]">Éléments rattachés</th>
                                    <th className="px-3 py-3 text-center w-24">Visibilité</th>
                                    <th className="px-4 py-3 text-right w-28 sticky right-0 bg-gray-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {sortedSections.map((sec) => {
                                    const count = items.filter(i => i.section.toLowerCase() === sec.key.toLowerCase()).length;
                                    return (
                                        <tr key={sec.key} className={`hover:bg-blue-50/40 transition group ${!sec.is_visible ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        title="Monter la section"
                                                        onClick={() => handleMoveSectionOrder(sec, 'up')}
                                                        className="p-1 text-gray-400 hover:text-[#002395] hover:bg-blue-50 rounded transition"
                                                    >
                                                        <i className="fas fa-chevron-up text-xs"></i>
                                                    </button>
                                                    <span className="font-bold text-xs text-gray-700 w-5">{sec.display_order}</span>
                                                    <button
                                                        title="Descendre la section"
                                                        onClick={() => handleMoveSectionOrder(sec, 'down')}
                                                        className="p-1 text-gray-400 hover:text-[#002395] hover:bg-blue-50 rounded transition"
                                                    >
                                                        <i className="fas fa-chevron-down text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#002395] flex items-center justify-center flex-shrink-0">
                                                        <i className={sec.icon || 'fas fa-folder'}></i>
                                                    </span>
                                                    <div>
                                                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                                            <span>{sec.title}</span>
                                                            {sec.is_system && (
                                                                <span className="text-[10px] bg-blue-50 text-[#002395] px-1.5 py-0.2 rounded font-semibold border border-blue-200">
                                                                    Système
                                                                </span>
                                                            )}
                                                        </div>
                                                        {showTechnicalDetails && (
                                                            <div className="text-xs text-gray-400">Icône: {sec.icon}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {showTechnicalDetails && (
                                                <td className="px-3 py-3 font-mono text-xs text-gray-600">
                                                    {sec.key}
                                                </td>
                                            )}
                                            <td className="px-3 py-3 text-center">
                                                {sec.badge ? (
                                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${sec.badge_color || 'bg-gray-100 text-gray-700'}`}>
                                                        {sec.badge}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300 italic">Aucun</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                                    <i className="fas fa-link text-[10px] text-gray-400"></i>
                                                    <span>{count}</span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    id={`btn-toggle-section-${sec.key}`}
                                                    onClick={() => handleToggleSectionVisible(sec)}
                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                        sec.is_visible ? 'bg-[#002395]' : 'bg-gray-300'
                                                    }`}
                                                    title={sec.is_visible ? "Cliquez pour masquer toute la section du volet" : "Cliquez pour réafficher la section"}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                            sec.is_visible ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-blue-50/90 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        id={`btn-edit-section-${sec.key}`}
                                                        onClick={() => setEditingSection(sec)}
                                                        className="px-2.5 py-1.5 text-xs font-bold text-[#002395] hover:bg-blue-100 rounded-lg transition inline-flex items-center gap-1 whitespace-nowrap"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                        <span>Modifier</span>
                                                    </button>
                                                    {!sec.is_system && (
                                                        <button
                                                            id={`btn-delete-section-${sec.key}`}
                                                            onClick={() => handleDeleteSection(sec)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Supprimer la section"
                                                        >
                                                            <i className="fas fa-trash-alt text-xs"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SUB-VIEW 2: ÉLÉMENTS DE MENU                             */}
            {/* ======================================================== */}
            {activeSubTab === 'items' && (
                <div className="space-y-4">
                    {/* Dismissible / Toggable Info Banner */}
                    {showInfo && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start justify-between gap-3 animate-in fade-in duration-150">
                            <div className="flex items-start gap-3">
                                <i className="fas fa-circle-info text-base text-[#002395] mt-0.5 flex-shrink-0"></i>
                                <div>
                                    <span className="font-bold">À propos des éléments de menu :</span> Configurez l'arborescence des pages accessibles depuis le volet latéral. Activez ou désactivez la visibilité des liens d'un simple clic sur le bouton bascule, réorganisez leur position ou réassignez-les à une section différente.
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInfo(false)}
                                title="Masquer cette information"
                                className="text-blue-400 hover:text-blue-700 p-1 flex-shrink-0"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    {/* Filter by section tabs */}
                    <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto whitespace-nowrap">
                        <button
                            onClick={() => setFilterSection('all')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                filterSection === 'all'
                                    ? 'bg-[#002395] text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            Toutes les sections ({items.length})
                        </button>
                        {sortedSections.map(sec => {
                            const count = items.filter(i => i.section.toLowerCase() === sec.key.toLowerCase()).length;
                            return (
                                <button
                                    key={sec.key}
                                    onClick={() => setFilterSection(sec.key)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                                        filterSection === sec.key
                                            ? 'bg-[#002395] text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <i className={sec.icon}></i>
                                    <span>{sec.title} ({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Table of items with responsive horizontal scroll */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-3 text-center w-14">Ordre</th>
                                    <th className="px-4 py-3 min-w-[200px]">Élément de menu</th>
                                    <th className="px-3 py-3 min-w-[160px]">Section Thématique</th>
                                    {showTechnicalDetails && (
                                        <th className="px-3 py-3 font-mono min-w-[140px]">Chemin URL</th>
                                    )}
                                    <th className="px-3 py-3 text-center min-w-[90px]">Badge</th>
                                    <th className="px-3 py-3 text-center w-20">Visibilité</th>
                                    <th className="px-4 py-3 text-right w-28 sticky right-0 bg-gray-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredItems.map((item) => {
                                    const sec = sections.find(s => s.key.toLowerCase() === item.section.toLowerCase());
                                    return (
                                        <tr key={item.key} className={`hover:bg-blue-50/40 transition group ${!item.is_visible ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        title="Monter"
                                                        onClick={() => handleMoveOrder(item, 'up')}
                                                        className="p-1 text-gray-400 hover:text-[#002395] hover:bg-blue-50 rounded transition"
                                                    >
                                                        <i className="fas fa-chevron-up text-xs"></i>
                                                    </button>
                                                    <span className="font-bold text-xs text-gray-700 w-5">{item.display_order}</span>
                                                    <button
                                                        title="Descendre"
                                                        onClick={() => handleMoveOrder(item, 'down')}
                                                        className="p-1 text-gray-400 hover:text-[#002395] hover:bg-blue-50 rounded transition"
                                                    >
                                                        <i className="fas fa-chevron-down text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#002395] flex items-center justify-center flex-shrink-0">
                                                        <i className={item.icon || 'fas fa-link'}></i>
                                                    </span>
                                                    <div>
                                                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                                            <span>{item.label}</span>
                                                            {item.associated_feature_key && (
                                                                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-semibold border border-purple-200 whitespace-nowrap">
                                                                    Lié: {item.associated_feature_key}
                                                                </span>
                                                            )}
                                                            {item.is_system && (
                                                                <span className="text-[9px] bg-blue-50 text-[#002395] px-1 py-0.2 rounded font-semibold border border-blue-200">
                                                                    Système
                                                                </span>
                                                            )}
                                                        </div>
                                                        {showTechnicalDetails && (
                                                            <div className="text-xs text-gray-400 font-mono">clef: {item.key}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                                                    <i className={`${sec?.icon || 'fas fa-folder'} text-[11px] text-[#002395]`}></i>
                                                    <span>{sec?.title || item.section}</span>
                                                </span>
                                            </td>
                                            {showTechnicalDetails && (
                                                <td className="px-3 py-3 font-mono text-xs text-gray-600 truncate max-w-[200px]" title={item.path}>
                                                    {item.path}
                                                </td>
                                            )}
                                            <td className="px-3 py-3 text-center">
                                                {item.badge ? (
                                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${item.badge_color || 'bg-gray-100 text-gray-700'}`}>
                                                        {item.badge}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300 italic">Aucun</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    id={`btn-toggle-nav-${item.key}`}
                                                    onClick={() => handleToggleVisible(item)}
                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                                        item.is_visible ? 'bg-[#002395]' : 'bg-gray-300'
                                                    }`}
                                                    title={item.is_visible ? "Cliquez pour masquer du volet" : "Cliquez pour afficher dans le volet"}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                            item.is_visible ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-blue-50/90 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        id={`btn-edit-nav-${item.key}`}
                                                        onClick={() => setEditingItem(item)}
                                                        className="px-2.5 py-1.5 text-xs font-bold text-[#002395] hover:bg-blue-100 rounded-lg transition inline-flex items-center gap-1 whitespace-nowrap"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                        <span>Modifier</span>
                                                    </button>
                                                    {!item.is_system && (
                                                        <button
                                                            id={`btn-delete-nav-${item.key}`}
                                                            onClick={() => handleDeleteItem(item)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Supprimer l'élément"
                                                        >
                                                            <i className="fas fa-trash-alt text-xs"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: CRÉER UNE NOUVELLE SECTION                        */}
            {/* ======================================================== */}
            {isCreatingSection && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-blue-100 text-[#002395] rounded-lg">
                                    <i className="fas fa-folder-plus"></i>
                                </span>
                                <div>
                                    <h3 className="font-bold text-gray-900">Nouvelle Section de Navigation</h3>
                                    <p className="text-xs text-gray-500">Ajouter un nouveau regroupement thématique dans le volet</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreatingSection(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg p-1"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreateSection} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Titre de la section *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Pilotage Stratégique, Maintenance Ferroviaire..."
                                    value={newSectionForm.title}
                                    onChange={e => {
                                        const title = e.target.value;
                                        const autoKey = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
                                        setNewSectionForm({
                                            ...newSectionForm,
                                            title,
                                            key: newSectionForm.key || autoKey
                                        });
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Identifiant / Clé unique *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: pilotage, maintenance"
                                        value={newSectionForm.key}
                                        onChange={e => setNewSectionForm({ ...newSectionForm, key: e.target.value })}
                                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Ordre d'affichage
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={newSectionForm.display_order}
                                        onChange={e => setNewSectionForm({ ...newSectionForm, display_order: Number(e.target.value) })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Icône FontAwesome
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-[#002395] border border-gray-300">
                                        <i className={newSectionForm.icon || 'fas fa-folder'}></i>
                                    </span>
                                    <select
                                        value={newSectionForm.icon}
                                        onChange={e => setNewSectionForm({ ...newSectionForm, icon: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {AVAILABLE_ICONS.map(ic => (
                                            <option key={ic.value} value={ic.value}>{ic.label} ({ic.value})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Badge d'étiquette (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: NOUVEAU, PRO..."
                                        value={newSectionForm.badge}
                                        onChange={e => setNewSectionForm({ ...newSectionForm, badge: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Couleur du badge
                                    </label>
                                    <select
                                        value={newSectionForm.badge_color}
                                        onChange={e => setNewSectionForm({ ...newSectionForm, badge_color: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {BADGE_COLOR_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingSection(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-sm font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                    {saving && <i className="fas fa-spinner fa-spin"></i>}
                                    <span>Créer la Section</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: MODIFIER UNE SECTION EXISTANTE                    */}
            {/* ======================================================== */}
            {editingSection && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-blue-100 text-[#002395] rounded-lg">
                                    <i className="fas fa-pen-to-square"></i>
                                </span>
                                <div>
                                    <h3 className="font-bold text-gray-900">Modifier la Section</h3>
                                    <p className="text-xs text-gray-500">Clé système : {editingSection.key}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingSection(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg p-1"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveSectionEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Titre de la section *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingSection.title}
                                    onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Ordre d'affichage
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={editingSection.display_order}
                                        onChange={e => setEditingSection({ ...editingSection, display_order: Number(e.target.value) })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Badge (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: RBAC, NIS2"
                                        value={editingSection.badge || ''}
                                        onChange={e => setEditingSection({ ...editingSection, badge: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Icône FontAwesome
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-[#002395] border border-gray-300">
                                        <i className={editingSection.icon || 'fas fa-folder'}></i>
                                    </span>
                                    <select
                                        value={editingSection.icon}
                                        onChange={e => setEditingSection({ ...editingSection, icon: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {AVAILABLE_ICONS.map(ic => (
                                            <option key={ic.value} value={ic.value}>{ic.label} ({ic.value})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Couleur du badge
                                </label>
                                <select
                                    value={editingSection.badge_color || ''}
                                    onChange={e => setEditingSection({ ...editingSection, badge_color: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                >
                                    {BADGE_COLOR_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section Preview */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                    Aperçu dans l'en-tête de section
                                </span>
                                <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center justify-between">
                                    <span className="flex items-center text-xs font-bold uppercase tracking-wider text-gray-600">
                                        <i className={`${editingSection.icon || 'fas fa-folder'} mr-2 text-[#002395]`}></i>
                                        <span>{editingSection.title || 'Titre de la section'}</span>
                                    </span>
                                    {editingSection.badge && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${editingSection.badge_color || 'bg-gray-100 text-gray-700'}`}>
                                            {editingSection.badge}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingSection(null)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-sm font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                    {saving && <i className="fas fa-spinner fa-spin"></i>}
                                    <span>Enregistrer</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: CRÉER UN NOUVEL ÉLÉMENT DE MENU                   */}
            {/* ======================================================== */}
            {isCreatingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-blue-100 text-[#002395] rounded-lg">
                                    <i className="fas fa-plus"></i>
                                </span>
                                <div>
                                    <h3 className="font-bold text-gray-900">Ajouter un Élément de Menu</h3>
                                    <p className="text-xs text-gray-500">Ajouter une nouvelle entrée dans le volet d'administration</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreatingItem(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg p-1"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Libellé affiché dans le menu *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Statistiques Avancées, Matrice NIS 2..."
                                    value={newItemForm.label}
                                    onChange={e => {
                                        const label = e.target.value;
                                        const autoKey = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
                                        setNewItemForm({
                                            ...newItemForm,
                                            label,
                                            key: newItemForm.key || autoKey
                                        });
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Section de rattachement *
                                    </label>
                                    <select
                                        value={newItemForm.section}
                                        onChange={e => setNewItemForm({ ...newItemForm, section: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {sortedSections.map(s => (
                                            <option key={s.key} value={s.key}>{s.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Clé unique (système) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: stats_avances"
                                        value={newItemForm.key}
                                        onChange={e => setNewItemForm({ ...newItemForm, key: e.target.value })}
                                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Chemin URL de destination *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: /admin/stats ou /stats"
                                        value={newItemForm.path}
                                        onChange={e => setNewItemForm({ ...newItemForm, path: e.target.value })}
                                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Ordre d'affichage
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={newItemForm.display_order}
                                        onChange={e => setNewItemForm({ ...newItemForm, display_order: Number(e.target.value) })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Icône FontAwesome
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-[#002395] border border-gray-300">
                                        <i className={newItemForm.icon || 'fas fa-link'}></i>
                                    </span>
                                    <select
                                        value={newItemForm.icon}
                                        onChange={e => setNewItemForm({ ...newItemForm, icon: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {AVAILABLE_ICONS.map(ic => (
                                            <option key={ic.value} value={ic.value}>{ic.label} ({ic.value})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Badge (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: NOUVEAU, BETA"
                                        value={newItemForm.badge}
                                        onChange={e => setNewItemForm({ ...newItemForm, badge: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Couleur du badge
                                    </label>
                                    <select
                                        value={newItemForm.badge_color}
                                        onChange={e => setNewItemForm({ ...newItemForm, badge_color: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {BADGE_COLOR_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingItem(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-sm font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                    {saving && <i className="fas fa-spinner fa-spin"></i>}
                                    <span>Créer l'Élément</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: MODIFIER UN ÉLÉMENT DU VOLET EXISTANT             */}
            {/* ======================================================== */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-blue-100 text-[#002395] rounded-lg">
                                    <i className="fas fa-pen-to-square"></i>
                                </span>
                                <div>
                                    <h3 className="font-bold text-gray-900">Modifier l'élément de navigation</h3>
                                    <p className="text-xs text-gray-500">Clé système: {editingItem.key}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingItem(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg p-1"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Libellé affiché dans le volet *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingItem.label}
                                    onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Section de rattachement *
                                    </label>
                                    <select
                                        value={editingItem.section}
                                        onChange={e => setEditingItem({ ...editingItem, section: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {sortedSections.map(s => (
                                            <option key={s.key} value={s.key}>{s.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Ordre d'affichage
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={editingItem.display_order}
                                        onChange={e => setEditingItem({ ...editingItem, display_order: Number(e.target.value) })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Chemin de destination (URL) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingItem.path}
                                    onChange={e => setEditingItem({ ...editingItem, path: e.target.value })}
                                    className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Icône FontAwesome
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-[#002395] border border-gray-300">
                                        <i className={editingItem.icon || 'fas fa-link'}></i>
                                    </span>
                                    <select
                                        value={editingItem.icon}
                                        onChange={e => setEditingItem({ ...editingItem, icon: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {AVAILABLE_ICONS.map(ic => (
                                            <option key={ic.value} value={ic.value}>{ic.label} ({ic.value})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Badge (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Matrice, Spécial..."
                                        value={editingItem.badge || ''}
                                        onChange={e => setEditingItem({ ...editingItem, badge: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Couleur du badge
                                    </label>
                                    <select
                                        value={editingItem.badge_color || ''}
                                        onChange={e => setEditingItem({ ...editingItem, badge_color: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002395] focus:border-[#002395] outline-hidden"
                                    >
                                        {BADGE_COLOR_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Aperçu direct de l'élément dans le volet */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                    Aperçu dans le volet
                                </span>
                                <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-between">
                                    <span className="flex items-center text-sm font-medium text-gray-800">
                                        <i className={`${editingItem.icon || 'fas fa-link'} mr-3 w-5 text-center text-[#002395]`}></i>
                                        <span>{editingItem.label || 'Titre du menu'}</span>
                                    </span>
                                    {editingItem.badge && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${editingItem.badge_color || 'bg-gray-100 text-gray-700'}`}>
                                            {editingItem.badge}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-sm font-bold text-white bg-[#002395] hover:bg-blue-900 rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                    {saving && <i className="fas fa-spinner fa-spin"></i>}
                                    <span>Enregistrer</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
