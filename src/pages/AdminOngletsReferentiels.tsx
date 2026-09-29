import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useFeatures } from '../context/FeaturesContext';
import ReferentielTypeManager from '../components/ReferentielTypeManager';
import FeatureManager from '../components/FeatureManager';
import AdminSidebarManager from '../components/AdminSidebarManager';
import SystemSettingsManager from '../components/SystemSettingsManager';
import MetadataFieldsManagerModal from '../components/MetadataFieldsManagerModal';
import { useAdminNav } from '../context/AdminNavContext';
import { CustomTable, TableMetadataField } from '../types';
import {
    getTableById,
    addTableMetadataField,
    updateTableMetadataField,
    deleteTableMetadataField
} from '../lib/api';

export interface PortalTabItem {
    id: string;
    key: string;
    label: string;
    description: string;
    icon: string;
    path: string;
    badge?: string;
    badge_color?: string;
    is_active: boolean;
    display_order: number;
    required_privilege?: string;
    is_system: boolean;
}

export interface ReferentielSummary {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    is_system: boolean;
    allow_multiple: boolean;
    show_in_forms: boolean;
    form_field_label?: string;
    form_help_text?: string;
    is_required: boolean;
    columns_count: number;
    rows_count: number;
    metadata_fields?: TableMetadataField[];
}

const BADGE_COLOR_OPTIONS = [
    { label: 'Bleu Standard', value: 'bg-blue-100 text-blue-800' },
    { label: 'Vert Succès', value: 'bg-emerald-100 text-emerald-800' },
    { label: 'Ambre / Avertissement', value: 'bg-amber-100 text-amber-800' },
    { label: 'Violet Administration', value: 'bg-purple-100 text-purple-800' },
    { label: 'Rouge Critique', value: 'bg-rose-100 text-rose-800' },
    { label: 'Gris Neutre', value: 'bg-gray-100 text-gray-700' },
];

const POPULAR_ICONS = [
    { label: 'Grille / Catalogue', value: 'fas fa-th-large' },
    { label: 'Dossier / Demandes', value: 'fas fa-folder' },
    { label: 'Boîte de réception', value: 'fas fa-inbox' },
    { label: 'Historique / Horloge', value: 'fas fa-history' },
    { label: 'Graphique / Dashboard', value: 'fas fa-chart-line' },
    { label: 'Échange / Délégations', value: 'fas fa-exchange-alt' },
    { label: 'Bouclier / Sécurité', value: 'fas fa-shield-alt' },
    { label: 'Table / Référentiel', value: 'fas fa-table' },
    { label: 'Utilisateurs', value: 'fas fa-users' },
    { label: 'Clé / Mécatronique', value: 'fas fa-key' },
    { label: 'Bâtiment / Sites', value: 'fas fa-building' },
    { label: 'Train / Ferroviaire', value: 'fas fa-train' },
    { label: 'Cloche / Notifications', value: 'fas fa-bell' },
    { label: 'Curseurs / Config', value: 'fas fa-sliders-h' },
    { label: 'Terminal / Audit', value: 'fas fa-terminal' },
];

export default function AdminOngletsReferentiels() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const initialSectionParam = searchParams.get('section');
    const validSections = ['tabs', 'sidebar_nav', 'referentiels', 'nouveau_type', 'features', 'system_settings', 'backup'] as const;

    const getResolvedSection = () => {
        if (initialSectionParam && validSections.includes(initialSectionParam as any)) {
            return initialSectionParam as 'tabs' | 'sidebar_nav' | 'referentiels' | 'nouveau_type' | 'features' | 'system_settings' | 'backup';
        }
        return 'tabs';
    };

    const { isFeatureEnabled, toggleFeature } = useFeatures();
    const { navItems, navSections, refreshNav, updateLocalItems, updateLocalSections } = useAdminNav();
    const isReferentielsEnabled = isFeatureEnabled('referentiels_management');
    const isReferentielTypesEnabled = isFeatureEnabled('referentiel_types_structure');

    const [activeSection, setActiveSection] = useState<'tabs' | 'sidebar_nav' | 'referentiels' | 'nouveau_type' | 'features' | 'system_settings' | 'backup'>(getResolvedSection);

    useEffect(() => {
        const sec = searchParams.get('section');
        if (sec && validSections.includes(sec as any)) {
            setActiveSection(sec as any);
            setTimeout(() => {
                const tabEl = document.getElementById(`tab-view-${sec}`);
                if (tabEl) {
                    tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 100);
        } else {
            // Pas de paramètre de section -> Affichage par défaut des Onglets du Portail
            setActiveSection('tabs');
            setTimeout(() => {
                const tabEl = document.getElementById('tab-view-portal-tabs');
                if (tabEl) {
                    tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 100);
        }
    }, [searchParams]);

    const handleSelectSection = (sec: 'tabs' | 'sidebar_nav' | 'referentiels' | 'nouveau_type' | 'features' | 'system_settings' | 'backup') => {
        setActiveSection(sec);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('section', sec);
            return next;
        });
        setTimeout(() => {
            const tabEl = document.getElementById(`tab-view-${sec}`);
            if (tabEl) {
                tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 50);
    };
    const [tabs, setTabs] = useState<PortalTabItem[]>([]);
    const [referentiels, setReferentiels] = useState<ReferentielSummary[]>([]);
    const [loadingTabs, setLoadingTabs] = useState(true);
    const [loadingRefs, setLoadingRefs] = useState(true);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Modal state for editing a tab
    const [editingTab, setEditingTab] = useState<PortalTabItem | null>(null);
    const [isCreatingTab, setIsCreatingTab] = useState(false);
    const [newTabForm, setNewTabForm] = useState<Partial<PortalTabItem>>({
        key: '',
        label: '',
        description: '',
        icon: 'fas fa-link',
        path: '',
        badge: '',
        badge_color: 'bg-blue-100 text-blue-800',
        is_active: true,
        display_order: 10
    });

    // Modal state for editing a referentiel
    const [editingRef, setEditingRef] = useState<ReferentielSummary | null>(null);
    const [isCreatingRef, setIsCreatingRef] = useState(false);
    const [newRefForm, setNewRefForm] = useState({
        id: '',
        name: '',
        description: '',
        category: 'Organisation',
        icon: 'fas fa-table',
        allow_multiple: false,
        show_in_forms: true,
        form_field_label: '',
        form_help_text: '',
        is_required: false
    });

    // Modal state for dynamic ReferentielTypeManager (full data structure & columns)
    const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
    const [managingStructureTable, setManagingStructureTable] = useState<CustomTable | null>(null);

    // Modal state for metadata fields management
    const [metadataModalRef, setMetadataModalRef] = useState<ReferentielSummary | null>(null);
    const [currentMetadataTable, setCurrentMetadataTable] = useState<CustomTable | null>(null);
    const [loadingMetadataTable, setLoadingMetadataTable] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        loadTabs();
        loadReferentiels();
    }, []);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 5000);
    };

    const loadTabs = async () => {
        setLoadingTabs(true);
        try {
            const res = await fetch('/api/v1/admin/portal-tabs');
            if (res.ok) {
                const data = await res.json();
                setTabs(data);
            }
        } catch (e) {
            console.error('Erreur chargement onglets:', e);
        } finally {
            setLoadingTabs(false);
        }
    };

    const loadReferentiels = async () => {
        setLoadingRefs(true);
        try {
            const res = await fetch('/api/v1/admin/tables');
            if (res.ok) {
                const data = await res.json();
                setReferentiels(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Erreur chargement référentiels:', e);
        } finally {
            setLoadingRefs(false);
        }
    };

    // Toggle active status of a tab
    const handleToggleTabActive = async (tab: PortalTabItem) => {
        const updated = { ...tab, is_active: !tab.is_active };
        try {
            const res = await fetch(`/api/v1/admin/portal-tabs/${tab.key}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ is_active: updated.is_active })
            });
            if (res.ok) {
                setTabs(tabs.map(t => t.key === tab.key ? updated : t));
                showFeedback('success', `Statut de l'onglet '${tab.label}' mis à jour.`);
                // Notify App to refresh its navigation
                window.dispatchEvent(new CustomEvent('portal_tabs_updated'));
            } else {
                showFeedback('error', "Impossible de mettre à jour le statut.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Reorder tabs (move up or down)
    const handleMoveTab = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === tabs.length - 1)) {
            return;
        }
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const newTabs = [...tabs];
        const temp = newTabs[index];
        newTabs[index] = newTabs[targetIndex];
        newTabs[targetIndex] = temp;

        // Reassign display_order
        const reordered = newTabs.map((t, idx) => ({ ...t, display_order: idx + 1 }));
        setTabs(reordered);

        try {
            const res = await fetch('/api/v1/admin/portal-tabs', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ tabs: reordered })
            });
            if (res.ok) {
                showFeedback('success', "Ordre des onglets réorganisé avec succès.");
                window.dispatchEvent(new CustomEvent('portal_tabs_updated'));
            }
        } catch (e) {
            showFeedback('error', "Erreur lors de la sauvegarde du réordonnancement.");
        }
    };

    // Save edited tab
    const handleSaveTab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTab) return;

        try {
            const res = await fetch(`/api/v1/admin/portal-tabs/${editingTab.key}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    label: editingTab.label,
                    description: editingTab.description,
                    icon: editingTab.icon,
                    path: editingTab.path,
                    badge: editingTab.badge,
                    badge_color: editingTab.badge_color,
                    is_active: editingTab.is_active,
                    required_privilege: editingTab.required_privilege || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTabs(tabs.map(t => t.key === editingTab.key ? data.tab : t));
                setEditingTab(null);
                showFeedback('success', `L'onglet '${editingTab.label}' a été mis à jour sans modification de code source.`);
                window.dispatchEvent(new CustomEvent('portal_tabs_updated'));
            } else {
                const err = await res.json();
                showFeedback('error', err.error || "Erreur de mise à jour.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Create new tab
    const handleCreateTab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTabForm.label || !newTabForm.path) {
            showFeedback('error', "Le nom et le chemin de l'onglet sont obligatoires.");
            return;
        }

        const generatedKey = newTabForm.key?.trim() || newTabForm.label.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

        try {
            const res = await fetch('/api/v1/admin/portal-tabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    ...newTabForm,
                    key: generatedKey,
                    display_order: tabs.length + 1
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTabs([...tabs, data.tab]);
                setIsCreatingTab(false);
                setNewTabForm({
                    key: '',
                    label: '',
                    description: '',
                    icon: 'fas fa-link',
                    path: '',
                    badge: '',
                    badge_color: 'bg-blue-100 text-blue-800',
                    is_active: true
                });
                showFeedback('success', `Nouvel onglet '${data.tab.label}' ajouté avec succès au portail.`);
                window.dispatchEvent(new CustomEvent('portal_tabs_updated'));
            } else {
                const err = await res.json();
                showFeedback('error', err.error || "Erreur lors de la création.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Delete custom tab
    const handleDeleteTab = async (tab: PortalTabItem) => {
        if (tab.is_system) {
            alert("Les onglets système ne peuvent pas être supprimés, mais vous pouvez les désactiver pour les masquer du portail.");
            return;
        }
        if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'onglet personnalisé '${tab.label}' ?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/v1/admin/portal-tabs/${tab.key}`, {
                method: 'DELETE',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (res.ok) {
                setTabs(tabs.filter(t => t.key !== tab.key));
                showFeedback('success', `Onglet '${tab.label}' supprimé.`);
                window.dispatchEvent(new CustomEvent('portal_tabs_updated'));
            } else {
                const err = await res.json();
                showFeedback('error', err.error || "Impossible de supprimer cet onglet.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Reset tabs to factory defaults
    const handleResetTabs = async () => {
        if (!confirm("Voulez-vous réinitialiser tous les onglets du portail à leurs noms, descriptions et ordre par défaut ?")) {
            return;
        }
        try {
            const res = await fetch('/api/v1/admin/portal-tabs/reset', {
                method: 'POST',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (res.ok) {
                const data = await res.json();
                setTabs(data.tabs);
                showFeedback('success', "Tous les onglets ont été réinitialisés aux valeurs d'origine.");
                window.dispatchEvent(new CustomEvent('portal_tabs_updated'));
            }
        } catch (e) {
            showFeedback('error', "Erreur lors de la réinitialisation.");
        }
    };

    // Save edited Referentiel
    const handleSaveReferentiel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRef) return;

        try {
            const res = await fetch(`/api/v1/admin/tables/${editingRef.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    name: editingRef.name,
                    description: editingRef.description,
                    category: editingRef.category,
                    icon: editingRef.icon,
                    allow_multiple: editingRef.allow_multiple,
                    show_in_forms: editingRef.show_in_forms,
                    form_field_label: editingRef.form_field_label,
                    form_help_text: editingRef.form_help_text,
                    is_required: editingRef.is_required
                })
            });

            if (res.ok) {
                const data = await res.json();
                setReferentiels(referentiels.map(r => r.id === editingRef.id ? { ...r, ...data.table } : r));
                setEditingRef(null);
                showFeedback('success', `Le référentiel '${editingRef.name}' a été mis à jour directement.`);
            } else {
                showFeedback('error', "Erreur lors de la mise à jour du référentiel.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Create new Referentiel
    const handleCreateReferentiel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRefForm.name) {
            showFeedback('error', "Le nom du référentiel est obligatoire.");
            return;
        }

        try {
            const res = await fetch('/api/v1/admin/tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(newRefForm)
            });

            if (res.ok) {
                const data = await res.json();
                setReferentiels([...referentiels, {
                    id: data.table.id,
                    name: data.table.name,
                    description: data.table.description,
                    icon: data.table.icon,
                    category: data.table.category,
                    is_system: false,
                    allow_multiple: data.table.allow_multiple,
                    show_in_forms: data.table.show_in_forms,
                    form_field_label: data.table.form_field_label,
                    form_help_text: data.table.form_help_text,
                    is_required: data.table.is_required,
                    columns_count: data.table.columns?.length || 3,
                    rows_count: data.table.rows?.length || 0
                }]);
                setIsCreatingRef(false);
                setNewRefForm({
                    id: '',
                    name: '',
                    description: '',
                    category: 'Organisation',
                    icon: 'fas fa-table',
                    allow_multiple: false,
                    show_in_forms: true,
                    form_field_label: '',
                    form_help_text: '',
                    is_required: false
                });
                showFeedback('success', `Nouveau référentiel '${data.table.name}' créé avec succès.`);
            } else {
                const err = await res.json();
                showFeedback('error', err.error || "Erreur création référentiel.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Open full structure and column manager for a referentiel
    const handleOpenStructureEditor = async (ref: ReferentielSummary) => {
        try {
            const res = await fetch(`/api/v1/admin/tables/${ref.id}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (res.ok) {
                const fullTable: CustomTable = await res.json();
                setManagingStructureTable(fullTable);
                setActiveSection('nouveau_type');
            } else {
                showFeedback('error', "Impossible de charger la structure de ce référentiel.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau lors du chargement de la table.");
        }
    };

    // Delete custom referentiel from database
    const handleDeleteReferentiel = async (ref: ReferentielSummary) => {
        if (ref.is_system) {
            alert("Les tables système sont protégées et ne peuvent pas être supprimées.");
            return;
        }

        if (!confirm(`Êtes-vous certain de vouloir supprimer définitivement le référentiel '${ref.name}' et toutes ses données associées en base SQLite ?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/v1/admin/tables/${ref.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });

            if (res.ok) {
                setReferentiels(referentiels.filter(r => r.id !== ref.id));
                showFeedback('success', `Le référentiel '${ref.name}' a été supprimé de la base de données.`);
            } else {
                const err = await res.json();
                showFeedback('error', err.error || "Erreur lors de la suppression.");
            }
        } catch (e) {
            showFeedback('error', "Erreur réseau.");
        }
    };

    // Open metadata fields manager modal for a referentiel
    const handleOpenMetadataFieldsManager = async (ref: ReferentielSummary) => {
        setMetadataModalRef(ref);
        setLoadingMetadataTable(true);
        try {
            const res = await getTableById(ref.id);
            setCurrentMetadataTable(res.data);
        } catch (err: any) {
            console.error("Erreur chargement détails table pour métadonnées:", err);
            showFeedback('error', "Impossible de charger les métadonnées de ce référentiel.");
        } finally {
            setLoadingMetadataTable(false);
        }
    };

    // Delete a metadata field record and update database
    const handleDeleteMetadataField = async (fieldKey: string) => {
        if (!metadataModalRef) return;
        try {
            const res = await deleteTableMetadataField(metadataModalRef.id, fieldKey);
            showFeedback('success', `Champ de métadonnée « ${fieldKey} » supprimé avec succès de la base de données.`);
            await loadReferentiels();
            if (res.data?.table) {
                setCurrentMetadataTable(res.data.table);
            } else {
                const updated = await getTableById(metadataModalRef.id);
                setCurrentMetadataTable(updated.data);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || "Erreur lors de la suppression du champ de métadonnée.";
            showFeedback('error', msg);
            throw err;
        }
    };

    // Add a metadata field record and update database
    const handleAddMetadataField = async (field: any) => {
        if (!metadataModalRef) return;
        try {
            const res = await addTableMetadataField(metadataModalRef.id, field);
            showFeedback('success', `Champ de métadonnée « ${field.label || field.key} » ajouté avec succès.`);
            await loadReferentiels();
            if (res.data?.table) {
                setCurrentMetadataTable(res.data.table);
            } else {
                const updated = await getTableById(metadataModalRef.id);
                setCurrentMetadataTable(updated.data);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || "Erreur lors de l'ajout de la métadonnée.";
            showFeedback('error', msg);
            throw err;
        }
    };

    // Update a metadata field record and update database
    const handleUpdateMetadataField = async (fieldKey: string, fieldData: any) => {
        if (!metadataModalRef) return;
        try {
            const res = await updateTableMetadataField(metadataModalRef.id, fieldKey, fieldData);
            showFeedback('success', `Champ de métadonnée « ${fieldKey} » mis à jour.`);
            await loadReferentiels();
            if (res.data?.table) {
                setCurrentMetadataTable(res.data.table);
            } else {
                const updated = await getTableById(metadataModalRef.id);
                setCurrentMetadataTable(updated.data);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || "Erreur lors de la mise à jour de la métadonnée.";
            showFeedback('error', msg);
            throw err;
        }
    };

    const getRefFaIcon = (icon?: string) => {
        if (!icon) return 'fas fa-table';
        if (icon.startsWith('fa')) return icon;
        switch (icon) {
            case 'Building2': return 'fas fa-building';
            case 'Shield': return 'fas fa-shield-alt';
            case 'Briefcase': return 'fas fa-briefcase';
            case 'MapPin': return 'fas fa-map-marker-alt';
            case 'Cpu': return 'fas fa-microchip';
            case 'Users': return 'fas fa-users';
            case 'CheckCircle': return 'fas fa-check-circle';
            case 'Clock': return 'fas fa-clock';
            case 'Compass': return 'fas fa-compass';
            default: return 'fas fa-table';
        }
    };

    // Callback when a table type and its structure are saved/created
    const handleReferentielCreatedOrUpdated = (savedTable: CustomTable) => {
        loadReferentiels();
        showFeedback(
            'success',
            `Le type de référentiel '${savedTable.name}' et sa structure (${savedTable.columns?.length || 0} colonnes) ont été enregistrés avec succès dans la base SQLite.`
        );
    };

    // Export configuration as JSON
    const handleExportConfig = () => {
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '2.0-PORTAL',
            portalTabs: Array.isArray(tabs) ? tabs : [],
            referentiels: (Array.isArray(referentiels) ? referentiels : []).map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                category: r.category,
                icon: r.icon,
                is_system: r.is_system,
                allow_multiple: r.allow_multiple,
                show_in_forms: r.show_in_forms,
                form_field_label: r.form_field_label,
                form_help_text: r.form_help_text,
                is_required: r.is_required
            }))
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `config_onglets_referentiels_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showFeedback('success', "Fichier de configuration JSON téléchargé avec succès.");
    };

    const getHeaderInfo = () => {
        switch (activeSection) {
            case 'system_settings':
                return {
                    badge: "Directive Zéro Hardcoding",
                    badgeColor: "bg-yellow-100 text-yellow-900 border border-yellow-300",
                    badgeIcon: "fas fa-sliders",
                    tag: "Configuration Système",
                    tagColor: "bg-emerald-100 text-emerald-800",
                    title: "Paramètres Système & Règles Métier Dynamiques",
                    description: "Configurez et ajustez en temps réel les constantes globales, quotas de commandes (S10), barèmes tarifaires différentiels (S9), cadences de relance (S14) et règles RGPD sans redéploiement."
                };
            case 'features':
                return {
                    badge: "Feature Flags Système",
                    badgeColor: "bg-purple-100 text-purple-900 border border-purple-300",
                    badgeIcon: "fas fa-toggle-on",
                    tag: "Architecture Modulaire",
                    tagColor: "bg-blue-100 text-blue-800",
                    title: "Activation & Désactivation des Modules Métiers",
                    description: "Basculez à chaud les fonctionnalités opérationnelles (Multi-sites, IA générative, Traçabilité NIS 2, etc.) selon les besoins du réseau ferroviaire."
                };
            case 'sidebar_nav':
                return {
                    badge: "Volet de Navigation Admin",
                    badgeColor: "bg-blue-100 text-blue-900 border border-blue-300",
                    badgeIcon: "fas fa-bars-staggered",
                    tag: "Ergonomie & Menus",
                    tagColor: "bg-indigo-100 text-indigo-800",
                    title: "Configuration du Volet de Navigation Administrateur",
                    description: "Personnalisez l'ordre, les sections, les libellés, les icônes et la visibilité de chaque entrée du menu administrateur."
                };
            case 'referentiels':
            case 'nouveau_type':
                return {
                    badge: "Référentiels Métiers",
                    badgeColor: "bg-teal-100 text-teal-900 border border-teal-300",
                    badgeIcon: "fas fa-database",
                    tag: "Données de Référence",
                    tagColor: "bg-cyan-100 text-cyan-800",
                    title: "Gestion des Référentiels & Tables Ferroviaires",
                    description: "Gérez les données de référence (Sites ferroviaires, Équipements mécatroniques, Durées d'intervention, Sous-traitants) et étendez les métadonnées."
                };
            default:
                return {
                    badge: "Onglet Spécial d'Administration",
                    badgeColor: "bg-amber-100 text-amber-900",
                    badgeIcon: "fas fa-sliders-h",
                    tag: "Zéro Modification de Code",
                    tagColor: "bg-blue-100 text-[#002395]",
                    title: "Gestion Dynamique des Onglets & Référentiels",
                    description: "Configurez directement les noms d'onglets, leurs descriptions, leurs icônes, badges et ordres d'affichage, ainsi que l'ensemble des référentiels de données sans jamais toucher au code source."
                };
        }
    };
    const headerInfo = getHeaderInfo();

    return (
        <div className="space-y-6">
            {/* Header de l'Onglet Spécial */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`${headerInfo.badgeColor} text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5`}>
                                <i className={headerInfo.badgeIcon}></i> {headerInfo.badge}
                            </span>
                            <span className={`text-xs ${headerInfo.tagColor} font-semibold px-2 py-0.5 rounded-full`}>
                                {headerInfo.tag}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                            {headerInfo.title}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                            {headerInfo.description}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            id="btn-export-config-json"
                            onClick={handleExportConfig}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 transition flex items-center gap-1.5"
                            title="Exporter la configuration complète au format JSON"
                        >
                            <i className="fas fa-file-download text-gray-600"></i>
                            <span>Exporter JSON</span>
                        </button>

                        <button
                            id="btn-reset-default-tabs"
                            onClick={handleResetTabs}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 font-semibold transition flex items-center gap-1.5"
                            title="Rétablir les libellés et descriptions d'usine"
                        >
                            <i className="fas fa-undo-alt"></i>
                            <span>Réinitialiser</span>
                        </button>
                    </div>
                </div>

                {/* Notifications feedback */}
                {feedback && (
                    <div className={`mt-4 p-3 rounded-lg text-sm flex items-center justify-between transition-all ${
                        feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-triangle text-red-600'}`}></i>
                            <span>{feedback.message}</span>
                        </div>
                        <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}

                {/* Navigation secondaire interne */}
                <div className="flex border-b border-gray-200 mt-6 -mb-2 space-x-6 text-sm font-medium overflow-x-auto whitespace-nowrap">
                    <button
                        id="tab-view-portal-tabs"
                        onClick={() => handleSelectSection('tabs')}
                        className={`pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 ${
                            activeSection === 'tabs'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <i className="fas fa-th-list"></i>
                        <span>Onglets du Portail ({tabs.length})</span>
                    </button>

                    <button
                        id="tab-view-sidebar-nav"
                        onClick={() => handleSelectSection('sidebar_nav')}
                        className={`pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 ${
                            activeSection === 'sidebar_nav'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <i className="fas fa-bars-staggered text-[#002395]"></i>
                        <span>Volet de Navigation Admin</span>
                        <span className="text-[10px] bg-blue-100 text-[#002395] px-1.5 py-0.2 rounded-full font-bold">
                            {navItems.filter(i => i.is_visible).length}/{navItems.length}
                        </span>
                    </button>

                    <button
                        id="tab-view-referentiels"
                        onClick={() => handleSelectSection('referentiels')}
                        className={`pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 ${
                            activeSection === 'referentiels'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <i className="fas fa-database"></i>
                        <span>Référentiels & Tables ({referentiels.length})</span>
                        {!isReferentielsEnabled && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold border border-amber-300">
                                Désactivé (Admin)
                            </span>
                        )}
                    </button>

                    <button
                        id="tab-view-nouveau-type"
                        onClick={() => {
                            setManagingStructureTable(null);
                            handleSelectSection('nouveau_type');
                        }}
                        className={`pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 ${
                            activeSection === 'nouveau_type'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <i className="fas fa-layer-group text-blue-700"></i>
                        <span>Définir Types de Référentiels</span>
                        {!isReferentielTypesEnabled ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold border border-amber-300">
                                Désactivé (Admin)
                            </span>
                        ) : (
                            <span className="text-[10px] bg-blue-100 text-[#002395] px-1.5 py-0.2 rounded-full font-bold">
                                Structure & DB
                            </span>
                        )}
                    </button>

                    <button
                        id="tab-view-features"
                        onClick={() => handleSelectSection('features')}
                        className={`pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 ${
                            activeSection === 'features'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <i className="fas fa-toggle-on text-purple-600"></i>
                        <span>Activation des Fonctionnalités</span>
                        <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded-full font-bold">
                            Modulaire
                        </span>
                    </button>

                    <Link
                        id="tab-view-system-settings"
                        to="/admin/parametres-systeme"
                        className="pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 border-transparent text-gray-500 hover:text-[#002395]"
                    >
                        <i className="fas fa-sliders text-indigo-600"></i>
                        <span>Paramètres Système & Règles</span>
                        <span className="text-[10px] bg-yellow-100 text-yellow-900 px-1.5 py-0.2 rounded-full font-bold border border-yellow-300">
                            Page Dédiée
                        </span>
                    </Link>

                    <button
                        id="tab-view-backup"
                        onClick={() => handleSelectSection('backup')}
                        className={`pb-3 px-1 border-b-2 font-bold transition flex items-center gap-2 flex-shrink-0 ${
                            activeSection === 'backup'
                                ? 'border-[#002395] text-[#002395]'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>Aperçu en Direct & Sauvegarde</span>
                    </button>
                </div>
            </div>

            {/* SECTION 1: GESTION DES ONGLETS DU PORTAIL */}
            {activeSection === 'tabs' && (
                <div className="space-y-4">
                    {/* Live preview banner of navigation bar */}
                    <div className="bg-blue-900 text-white rounded-xl p-4 shadow-sm border border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                                <i className="fas fa-eye text-yellow-400"></i>
                                Aperçu en temps réel de la barre de navigation du portail
                            </div>
                            <span className="text-[11px] bg-blue-800 px-2 py-0.5 rounded text-blue-200">
                                Ordre synchronisé dynamiquement
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 items-center pt-2 border-t border-blue-800/60">
                            {tabs.filter(t => t.is_active).map(tab => (
                                <div
                                    key={tab.key}
                                    className="bg-blue-800/80 hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 text-white border border-blue-600/50 shadow-xs cursor-pointer"
                                    title={tab.description}
                                >
                                    <i className={`${tab.icon} text-yellow-300 text-[11px]`}></i>
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab.badge_color || 'bg-yellow-400 text-blue-950'}`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                Liste des Onglets Configurables
                            </h2>
                            <p className="text-xs text-gray-500">
                                Modifiez le libellé, la description, l'icône, ou masquez un onglet sans toucher au code.
                            </p>
                        </div>
                        <button
                            id="btn-add-portal-tab"
                            onClick={() => setIsCreatingTab(true)}
                            className="bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition flex items-center gap-1.5"
                        >
                            <i className="fas fa-plus"></i>
                            <span>Nouvel Onglet Personnalisé</span>
                        </button>
                    </div>

                    {/* Table des onglets */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-xs">
                        <table className="min-w-full divide-y divide-gray-200 text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-center w-16">Ordre</th>
                                    <th className="px-4 py-3 text-left">Onglet & Icône</th>
                                    <th className="px-4 py-3 text-left">Description Détaillée</th>
                                    <th className="px-4 py-3 text-left">Chemin / URL</th>
                                    <th className="px-4 py-3 text-center">Badge</th>
                                    <th className="px-4 py-3 text-center">Statut</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loadingTabs ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            <i className="fas fa-spinner fa-spin mr-2"></i> Chargement des onglets...
                                        </td>
                                    </tr>
                                ) : tabs.map((tab, idx) => (
                                    <tr key={tab.key} className={`hover:bg-blue-50/40 transition ${!tab.is_active ? 'opacity-55 bg-gray-50' : ''}`}>
                                        {/* Ordre & Reordonnancement */}
                                        <td className="px-3 py-3 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleMoveTab(idx, 'up')}
                                                    disabled={idx === 0}
                                                    className="p-1 text-gray-400 hover:text-[#002395] disabled:opacity-20 transition"
                                                    title="Monter"
                                                >
                                                    <i className="fas fa-chevron-up text-xs"></i>
                                                </button>
                                                <span className="text-xs font-bold text-gray-700 w-4 text-center">
                                                    {tab.display_order}
                                                </span>
                                                <button
                                                    onClick={() => handleMoveTab(idx, 'down')}
                                                    disabled={idx === tabs.length - 1}
                                                    className="p-1 text-gray-400 hover:text-[#002395] disabled:opacity-20 transition"
                                                    title="Descendre"
                                                >
                                                    <i className="fas fa-chevron-down text-xs"></i>
                                                </button>
                                            </div>
                                        </td>

                                        {/* Onglet & Icône */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#002395] flex items-center justify-center border border-blue-100 flex-shrink-0">
                                                    <i className={`${tab.icon} text-sm`}></i>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                                        <span>{tab.label}</span>
                                                        {tab.is_system ? (
                                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                                                Système
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                                                                Personnalisé
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono">
                                                        clé: {tab.key}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Description */}
                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                                            <p className="line-clamp-2" title={tab.description}>
                                                {tab.description || <span className="text-gray-400 italic">Aucune description</span>}
                                            </p>
                                        </td>

                                        {/* Chemin */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                {tab.path}
                                            </span>
                                        </td>

                                        {/* Badge */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {tab.badge ? (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tab.badge_color || 'bg-blue-100 text-blue-800'}`}>
                                                    {tab.badge}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300">-</span>
                                            )}
                                        </td>

                                        {/* Statut Toggle */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleTabActive(tab)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 mx-auto ${
                                                    tab.is_active
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                }`}
                                                title={tab.is_active ? "Désactiver cet onglet" : "Activer cet onglet"}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${tab.is_active ? 'bg-emerald-600' : 'bg-gray-400'}`}></span>
                                                <span>{tab.is_active ? 'Actif' : 'Masqué'}</span>
                                            </button>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setEditingTab(tab)}
                                                    className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-md transition"
                                                    title="Modifier le nom, la description ou l'icône"
                                                >
                                                    <i className="fas fa-edit text-sm"></i>
                                                </button>
                                                {!tab.is_system && (
                                                    <button
                                                        onClick={() => handleDeleteTab(tab)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition"
                                                        title="Supprimer cet onglet"
                                                    >
                                                        <i className="fas fa-trash-alt text-sm"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SECTION 2: GESTION DES RÉFÉRENTIELS */}
            {activeSection === 'referentiels' && (
                !isReferentielsEnabled ? (
                    <div className="bg-white border border-dashed border-amber-300 rounded-xl p-8 text-center space-y-3 shadow-2xs">
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2 text-xl">
                            <i className="fas fa-database"></i>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">
                            Le module « Gestion des Référentiels Métier » est actuellement désactivé
                        </h3>
                        <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                            Ce module a été désactivé par l'administrateur depuis la gestion des fonctionnalités. L'accès aux référentiels et aux métadonnées associées est suspendu.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={async () => {
                                    await toggleFeature('referentiels_management', true);
                                }}
                                className="px-4 py-2 bg-[#002395] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer shadow-xs"
                            >
                                <i className="fas fa-check"></i>
                                <span>Réactiver les Référentiels</span>
                            </button>
                            <button
                                onClick={() => handleSelectSection('features')}
                                className="px-3.5 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
                            >
                                Console Modules & Fonctionnalités
                            </button>
                        </div>
                    </div>
                ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                Référentiels Métier & Tables du Système
                            </h2>
                            <p className="text-xs text-gray-500">
                                Personnalisez les noms, descriptions et catégories des référentiels sans modifier le code source.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/tables-admin"
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 transition flex items-center gap-1.5"
                            >
                                <i className="fas fa-table text-blue-700"></i>
                                <span>Éditeur de Données</span>
                            </Link>
                            <button
                                id="btn-add-referentiel"
                                onClick={() => {
                                    setManagingStructureTable(null);
                                    setActiveSection('nouveau_type');
                                }}
                                className="bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className="fas fa-plus"></i>
                                <span>Définir un Nouveau Type de Référentiel</span>
                            </button>
                        </div>
                    </div>

                    {/* Grille des référentiels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingRefs ? (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                <i className="fas fa-spinner fa-spin mr-2"></i> Chargement des référentiels...
                            </div>
                        ) : (Array.isArray(referentiels) ? referentiels : []).map(ref => (
                            <div
                                key={ref.id}
                                className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#002395] flex items-center justify-center border border-blue-100">
                                                <i className={`${getRefFaIcon(ref.icon)} text-base`}></i>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-gray-900 leading-tight">
                                                    {ref.name}
                                                </h3>
                                                <span className="text-[11px] font-mono text-gray-500">
                                                    id: {ref.id}
                                                </span>
                                            </div>
                                        </div>

                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#002395] border border-blue-100">
                                            {ref.category}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-600 mt-2 mb-4 line-clamp-3">
                                        {ref.description || "Aucune description renseignée."}
                                    </p>

                                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                                            <i className="fas fa-columns mr-1 text-gray-400"></i> {ref.columns_count} colonnes
                                        </span>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                                            <i className="fas fa-list mr-1 text-gray-400"></i> {ref.rows_count} lignes
                                        </span>
                                        {ref.show_in_forms && (
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                                                <i className="fas fa-wpforms mr-1"></i> Formulaire
                                            </span>
                                        )}
                                        {ref.is_system && (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                                                Système
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleOpenStructureEditor(ref)}
                                            className="text-xs font-bold text-[#002395] hover:text-blue-900 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1"
                                            title="Gérer la structure des données et colonnes"
                                        >
                                            <i className="fas fa-sliders-h text-blue-600"></i>
                                            <span>Structure & Schéma</span>
                                        </button>

                                        <button
                                            onClick={() => handleOpenMetadataFieldsManager(ref)}
                                            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-900 px-2.5 py-1.5 rounded-lg border border-purple-200 transition flex items-center gap-1.5"
                                            title="Gérer les champs de métadonnées et tags transverses (ajout, modification, suppression en base)"
                                        >
                                            <i className="fas fa-tags text-purple-600"></i>
                                            <span>Métadonnées</span>
                                            {Array.isArray(ref.metadata_fields) && ref.metadata_fields.length > 0 && (
                                                <span className="bg-purple-200 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                                    {ref.metadata_fields.length}
                                                </span>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setEditingRef(ref)}
                                            className="text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition flex items-center gap-1"
                                            title="Modifier les métadonnées"
                                        >
                                            <i className="fas fa-edit text-gray-500"></i>
                                            <span>Infos</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Link
                                            to={`/tables-admin`}
                                            className="text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                                            title="Éditer les enregistrements dans la table"
                                        >
                                            <span>Données</span>
                                            <i className="fas fa-chevron-right text-[10px]"></i>
                                        </Link>
                                        {!ref.is_system && (
                                            <button
                                                onClick={() => handleDeleteReferentiel(ref)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Supprimer ce référentiel personnalisé"
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )
            )}

            {/* SECTION: GESTION & DÉFINITION DES TYPES DE RÉFÉRENTIELS (STRUCTURE ET BD) */}
            {activeSection === 'nouveau_type' && (
                (!isReferentielTypesEnabled && !managingStructureTable) ? (
                    <div className="bg-white border border-dashed border-amber-300 rounded-xl p-8 text-center space-y-3 shadow-2xs">
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2 text-xl">
                            <i className="fas fa-layer-group"></i>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">
                            Le module « Types de Référentiels & Structure Dynamique » est désactivé
                        </h3>
                        <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                            La modélisation de nouveaux schémas de référentiels et l'altération de structure de base de données ont été désactivées par l'administrateur.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={async () => {
                                    await toggleFeature('referentiel_types_structure', true);
                                }}
                                className="px-4 py-2 bg-[#002395] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer shadow-xs"
                            >
                                <i className="fas fa-check"></i>
                                <span>Réactiver Types & Structure</span>
                            </button>
                            <button
                                onClick={() => handleSelectSection('features')}
                                className="px-3.5 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
                            >
                                Console Modules & Fonctionnalités
                            </button>
                        </div>
                    </div>
                ) : (
                <div className="space-y-4">
                    <ReferentielTypeManager
                        isOpen={true}
                        embedded={true}
                        onClose={() => setActiveSection('referentiels')}
                        onCreated={(savedTable) => {
                            handleReferentielCreatedOrUpdated(savedTable);
                            setActiveSection('referentiels');
                        }}
                        initialTable={managingStructureTable}
                    />
                </div>
                )
            )}

            {/* SECTION 3: APERÇU EN DIRECT & GOUVERNANCE */}
            {activeSection === 'backup' && (
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                        <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <i className="fas fa-info-circle text-[#002395]"></i>
                            Architecture Zéro-Code des Onglets & Référentiels
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
                            Ce module remplace la configuration figée en dur dans le code source par une persistance dynamique gérée en base SQLite. Chaque modification effectuée depuis cet onglet spécial prend effet immédiatement pour l'ensemble des agents et validateurs connectés.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <i className="fas fa-lock text-[#002395]"></i>
                                    Protection Système
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    Les onglets et tables système indispensables (Catalogue, Demandes, Corbeille, Sites) sont protégés contre la suppression accidentelle mais totalement éditables.
                                </p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <i className="fas fa-bolt text-amber-500"></i>
                                    Synchronisation Directe
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    La barre de navigation supérieure écoute en temps réel les changements de libellés, d'ordre et de visibilité sans nécessiter de redémarrage serveur.
                                </p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <i className="fas fa-file-export text-emerald-600"></i>
                                    Portabilité Totale
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    Exportez et importez la configuration en JSON pour basculer facilement entre environnements de recette et de production.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Dernier état enregistré : {tabs.length} onglets configurés, {referentiels.length} référentiels actifs.
                            </span>
                            <button
                                onClick={handleExportConfig}
                                className="bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <i className="fas fa-download"></i>
                                <span>Télécharger l'Archive JSON</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION: CONFIGURATION DU VOLET DE NAVIGATION ADMINISTRATEUR */}
            {/* SECTION: GESTION DU VOLET DE NAVIGATION ADMINISTRATEUR (ÉLÉMENTS & SECTIONS) */}
            {activeSection === 'sidebar_nav' && (
                <AdminSidebarManager
                    items={navItems}
                    sections={navSections}
                    onRefresh={refreshNav}
                    onLocalUpdate={updateLocalItems}
                    onLocalUpdateSections={updateLocalSections}
                />
            )}

            {/* SECTION: ACTIVATION DES FONCTIONNALITÉS (FEATURE FLAGS) */}
            {activeSection === 'features' && (
                <FeatureManager />
            )}

            {/* SECTION: PARAMÈTRES SYSTÈME & RÈGLES MÉTIER (ZERO HARDCODING) */}
            {activeSection === 'system_settings' && (
                <SystemSettingsManager />
            )}

            {/* MODAL: MODIFICATION D'UN ONGLET */}
            {editingTab && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#002395] flex items-center justify-center font-bold">
                                    <i className={editingTab.icon}></i>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900">
                                    Modifier l'Onglet : {editingTab.label}
                                </h3>
                            </div>
                            <button onClick={() => setEditingTab(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveTab} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nom affiché de l'onglet *
                                </label>
                                <input
                                    type="text"
                                    value={editingTab.label}
                                    onChange={e => setEditingTab({ ...editingTab, label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Description détaillée (Tooltip & Aide)
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingTab.description}
                                    onChange={e => setEditingTab({ ...editingTab, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    placeholder="Décrivez la finalité de cet onglet pour les utilisateurs..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Icône FontAwesome
                                    </label>
                                    <select
                                        value={editingTab.icon}
                                        onChange={e => setEditingTab({ ...editingTab, icon: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        {POPULAR_ICONS.map(ic => (
                                            <option key={ic.value} value={ic.value}>{ic.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Chemin / Route URL *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingTab.path}
                                        onChange={e => setEditingTab({ ...editingTab, path: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Badge d'étiquette (Optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={editingTab.badge || ''}
                                        onChange={e => setEditingTab({ ...editingTab, badge: e.target.value })}
                                        placeholder="Ex: SLA 24h, Nouveau"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Couleur du Badge
                                    </label>
                                    <select
                                        value={editingTab.badge_color || BADGE_COLOR_OPTIONS[0].value}
                                        onChange={e => setEditingTab({ ...editingTab, badge_color: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        {BADGE_COLOR_OPTIONS.map(bc => (
                                            <option key={bc.value} value={bc.value}>{bc.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="modal-tab-active"
                                    checked={editingTab.is_active}
                                    onChange={e => setEditingTab({ ...editingTab, is_active: e.target.checked })}
                                    className="rounded text-[#002395] focus:ring-[#002395] h-4 w-4"
                                />
                                <label htmlFor="modal-tab-active" className="text-xs font-bold text-gray-700">
                                    Onglet actif et visible sur la barre de navigation
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingTab(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#002395] text-white font-bold rounded-lg hover:bg-blue-900 transition shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="fas fa-check"></i>
                                    <span>Enregistrer les modifications</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: NOUVEL ONGLET PERSONNALISÉ */}
            {isCreatingTab && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <i className="fas fa-plus-circle text-[#002395]"></i>
                                Ajouter un Nouvel Onglet de Navigation
                            </h3>
                            <button onClick={() => setIsCreatingTab(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreateTab} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nom affiché de l'onglet *
                                </label>
                                <input
                                    type="text"
                                    value={newTabForm.label || ''}
                                    onChange={e => setNewTabForm({ ...newTabForm, label: e.target.value })}
                                    placeholder="Ex: Suivi Chantiers, Guide Sécurité"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Description détaillée
                                </label>
                                <textarea
                                    rows={2}
                                    value={newTabForm.description || ''}
                                    onChange={e => setNewTabForm({ ...newTabForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    placeholder="Explication du rôle et des données de cet onglet..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Icône
                                    </label>
                                    <select
                                        value={newTabForm.icon || 'fas fa-link'}
                                        onChange={e => setNewTabForm({ ...newTabForm, icon: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        {POPULAR_ICONS.map(ic => (
                                            <option key={ic.value} value={ic.value}>{ic.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Chemin URL (ex: /chantiers) *
                                    </label>
                                    <input
                                        type="text"
                                        value={newTabForm.path || ''}
                                        onChange={e => setNewTabForm({ ...newTabForm, path: e.target.value })}
                                        placeholder="/mon-onglet"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Badge (Optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={newTabForm.badge || ''}
                                        onChange={e => setNewTabForm({ ...newTabForm, badge: e.target.value })}
                                        placeholder="Ex: Nouveau, Beta"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Couleur du Badge
                                    </label>
                                    <select
                                        value={newTabForm.badge_color || BADGE_COLOR_OPTIONS[0].value}
                                        onChange={e => setNewTabForm({ ...newTabForm, badge_color: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        {BADGE_COLOR_OPTIONS.map(bc => (
                                            <option key={bc.value} value={bc.value}>{bc.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingTab(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#002395] text-white font-bold rounded-lg hover:bg-blue-900 transition shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Créer l'Onglet</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: MODIFICATION D'UN RÉFÉRENTIEL */}
            {editingRef && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <i className="fas fa-edit text-[#002395]"></i>
                                Modifier le Référentiel : {editingRef.name}
                            </h3>
                            <button onClick={() => setEditingRef(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveReferentiel} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nom du Référentiel *
                                </label>
                                <input
                                    type="text"
                                    value={editingRef.name}
                                    onChange={e => setEditingRef({ ...editingRef, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={editingRef.description}
                                    onChange={e => setEditingRef({ ...editingRef, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Catégorie Métier
                                    </label>
                                    <input
                                        type="text"
                                        value={editingRef.category}
                                        onChange={e => setEditingRef({ ...editingRef, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Icône
                                    </label>
                                    <select
                                        value={editingRef.icon}
                                        onChange={e => setEditingRef({ ...editingRef, icon: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        <option value="fas fa-building">Bâtiment / Sites</option>
                                        <option value="fas fa-user-shield">Rôles & Habilitations</option>
                                        <option value="fas fa-sitemap">Organisation / Services</option>
                                        <option value="fas fa-map-marked-alt">Géographie / Régions</option>
                                        <option value="fas fa-key">Équipements Mécatroniques</option>
                                        <option value="fas fa-clock">Durées & Plages</option>
                                        <option value="fas fa-table">Table Générique</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editingRef.show_in_forms}
                                        onChange={e => setEditingRef({ ...editingRef, show_in_forms: e.target.checked })}
                                        className="rounded text-[#002395] focus:ring-[#002395] h-4 w-4"
                                    />
                                    <span className="text-xs font-semibold text-gray-700">
                                        Afficher comme champ dans le formulaire de demande
                                    </span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editingRef.allow_multiple}
                                        onChange={e => setEditingRef({ ...editingRef, allow_multiple: e.target.checked })}
                                        className="rounded text-[#002395] focus:ring-[#002395] h-4 w-4"
                                    />
                                    <span className="text-xs font-semibold text-gray-700">
                                        Autoriser la sélection multiple
                                    </span>
                                </label>
                            </div>

                            <div className="pt-3 border-t border-gray-100 bg-purple-50/60 p-3 rounded-xl border border-purple-100 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                        <i className="fas fa-tags text-purple-600"></i>
                                        Champs de Métadonnées Transverses
                                    </div>
                                    <div className="text-[11px] text-purple-700 mt-0.5">
                                        Gérez, ajoutez ou supprimez les attributs et colonnes de métadonnées configurés pour ce référentiel.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const currentRef = referentiels.find(r => r.id === editingRef.id) || editingRef;
                                        handleOpenMetadataFieldsManager(currentRef);
                                    }}
                                    className="shrink-0 text-xs font-bold text-purple-800 bg-white hover:bg-purple-100 border border-purple-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                                >
                                    <i className="fas fa-sliders-h text-purple-600"></i>
                                    <span>Gérer Métadonnées</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingRef(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#002395] text-white font-bold rounded-lg hover:bg-blue-900 transition shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="fas fa-check"></i>
                                    <span>Enregistrer Référentiel</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: NOUVEAU RÉFÉRENTIEL */}
            {isCreatingRef && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <i className="fas fa-database text-[#002395]"></i>
                                Créer un Nouveau Référentiel
                            </h3>
                            <button onClick={() => setIsCreatingRef(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreateReferentiel} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nom du Référentiel *
                                </label>
                                <input
                                    type="text"
                                    value={newRefForm.name}
                                    onChange={e => setNewRefForm({ ...newRefForm, name: e.target.value })}
                                    placeholder="Ex: Centres de maintenance, Entreprises prestataires"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Description détaillée
                                </label>
                                <textarea
                                    rows={2}
                                    value={newRefForm.description}
                                    onChange={e => setNewRefForm({ ...newRefForm, description: e.target.value })}
                                    placeholder="Description du périmètre des données..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Catégorie
                                    </label>
                                    <select
                                        value={newRefForm.category}
                                        onChange={e => setNewRefForm({ ...newRefForm, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        <option value="Infrastructure">Infrastructure</option>
                                        <option value="Organisation">Organisation</option>
                                        <option value="Sécurité">Sécurité</option>
                                        <option value="Matériel">Matériel</option>
                                        <option value="Personnalisé">Personnalisé</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Icône
                                    </label>
                                    <select
                                        value={newRefForm.icon}
                                        onChange={e => setNewRefForm({ ...newRefForm, icon: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    >
                                        <option value="fas fa-table">Table Standard</option>
                                        <option value="fas fa-building">Bâtiment / Sites</option>
                                        <option value="fas fa-users">Utilisateurs</option>
                                        <option value="fas fa-train">Ferroviaire</option>
                                        <option value="fas fa-shield-alt">Sécurité</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingRef(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#002395] text-white font-bold rounded-lg hover:bg-blue-900 transition shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Créer le Référentiel</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COMPOSANT DE GESTION DES TYPES DE RÉFÉRENTIELS & STRUCTURE DE DONNÉES DYNAMIQUES */}
            <ReferentielTypeManager
                isOpen={isTypeManagerOpen}
                onClose={() => {
                    setIsTypeManagerOpen(false);
                    setManagingStructureTable(null);
                }}
                onCreated={handleReferentielCreatedOrUpdated}
                initialTable={managingStructureTable}
            />

            {/* MODAL DE GESTION SÉCURISÉE DES CHAMPS DE MÉTADONNÉES */}
            {metadataModalRef && (
                <MetadataFieldsManagerModal
                    isOpen={!!metadataModalRef}
                    onClose={() => {
                        setMetadataModalRef(null);
                        setCurrentMetadataTable(null);
                    }}
                    tableId={metadataModalRef.id}
                    tableName={metadataModalRef.name}
                    metadataFields={currentMetadataTable?.metadata_fields || metadataModalRef.metadata_fields || []}
                    onAddField={handleAddMetadataField}
                    onUpdateField={handleUpdateMetadataField}
                    onDeleteField={handleDeleteMetadataField}
                />
            )}
        </div>
    );
}
