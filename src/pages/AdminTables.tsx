import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    getReferenceTables,
    getTableById,
    createReferenceTable,
    updateReferenceTable,
    deleteReferenceTable,
    addTableRow,
    updateTableRow,
    deleteTableRow,
    addTableColumn,
    updateTableColumn,
    deleteTableColumn,
    addTableMetadataField,
    updateTableMetadataField,
    deleteTableMetadataField,
    updateTableMetadataValues
} from '../lib/api';
import {
    Database,
    Plus,
    Edit2,
    Edit3,
    Settings,
    Trash2,
    Search,
    Download,
    X,
    Check,
    AlertCircle,
    AlertTriangle,
    Building2,
    Shield,
    Briefcase,
    MapPin,
    Cpu,
    Users,
    CheckCircle,
    Layers,
    Table as TableIcon,
    Filter,
    Link2,
    ExternalLink,
    HelpCircle,
    Info,
    ArrowRight,
    GitFork,
    Sliders,
    SlidersHorizontal,
    CheckSquare,
    Eye,
    EyeOff,
    Clock,
    Sparkles,
    Tag,
    Tags,
    Bookmark,
    FolderTree
} from 'lucide-react';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import SchemaDrivenTable from '../components/SchemaDrivenTable';
import MetadataFieldsManagerModal from '../components/MetadataFieldsManagerModal';
import { TableMetadataField } from '../types';
import { useFeatures } from '../context/FeaturesContext';

const tablesHelpSections: HelpSection[] = [
    {
        title: "Liaisons Relationnelles & Référentiels Illimités",
        badge: "Architecture Données",
        description: "Créez autant de tables que souhaité (sites, rôles, services, régions, types d'équipements, prestataires...). Vous pouvez lier n'importe quelle colonne de type liste déroulante à une autre table de référence, et réutiliser ces tables dans les formulaires et étapes de validation de vos processus.",
        tips: [
            "Liez une colonne à une autre table via 'Source de données (Référence croisée)'",
            "Les valeurs sont automatiquement synchronisées dans tous les formulaires consommateurs",
            "Aucune limite sur le nombre de référentiels personnalisés"
        ]
    },
    {
        title: "Comportement dans les Formulaires & Multi-Sélection",
        badge: "Paramétrage Métier",
        description: "Configurez finement comment chaque table se comporte lorsqu'elle est utilisée dans les formulaires de demande (ex: Nouvelle Demande d'Accès).",
        tips: [
            "Autoriser la sélection multiple : Permet de choisir plusieurs items (ex: multi-sites ou multi-équipements)",
            "Colonne de regroupement : Regroupe les options par catégorie ou région dans les listes déroulantes",
            "Libellé & Aide personnalisés : Affichez des consignes spécifiques pour vos utilisateurs demandeurs"
        ]
    },
    {
        title: "Gestion des Colonnes & Types de Données",
        badge: "Schéma Dynamique",
        description: "Personnalisez la structure de vos tables avec des colonnes de type Texte, Nombre, Sélection liée, Booléen ou Email.",
        tips: [
            "Définissez des champs obligatoires pour garantir l'intégrité des données ferroviaires",
            "Ajoutez, renommez ou supprimez des colonnes à tout moment sans perte de données"
        ]
    },
    {
        title: "Import / Export & Sauvegarde Sécurisée",
        badge: "Interopérabilité",
        description: "Exportez les données de n'importe quel référentiel au format CSV ou JSON pour vos rapports, sauvegardes externes ou réimportations rapides."
    },
    {
        title: "Métadonnées & Classification Personnalisée",
        badge: "Gouvernance & Tags",
        description: "Enrichissez vos référentiels de données avec des champs de métadonnées transverses (tags, étiquettes métier, catégories, niveaux de sensibilité, badges...).",
        tips: [
            "Définissez des tags métier (ex: LGV, Conforme NIS2, Audit 2026) applicables à la table ou à chaque ligne",
            "Filtrez instantanément les lignes par tag ou par catégorie depuis la barre d'outils",
            "Les métadonnées s'intègrent automatiquement dans les formulaires d'ajout et de modification"
        ]
    }
];

interface ColumnDef {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean' | 'email';
    options?: string[];
    table_ref?: string;
    display_field?: string;
    multiple?: boolean;
    required?: boolean;
    description?: string;
}

interface TableSummary {
    id: string;
    name: string;
    description: string;
    icon?: string;
    category?: string;
    is_system?: boolean;
    allow_multiple?: boolean;
    grouping_column?: string;
    show_in_forms?: boolean;
    form_field_label?: string;
    form_help_text?: string;
    is_required?: boolean;
    columns_count: number;
    rows_count: number;
    columns: ColumnDef[];
}

export default function AdminTables() {
    const { isFeatureEnabled } = useFeatures();
    const [tables, setTables] = useState<TableSummary[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string>('sites');
    const [currentTable, setCurrentTable] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Referenced tables data cache for dynamic dropdowns (e.g. sites, roles, services, etc.)
    const [referencedTablesData, setReferencedTablesData] = useState<Record<string, any[]>>({});

    // Modals
    const [showCreateTableModal, setShowCreateTableModal] = useState(false);
    const [showEditTableModal, setShowEditTableModal] = useState(false);
    const [showAddRowModal, setShowAddRowModal] = useState(false);
    const [showEditRowModal, setShowEditRowModal] = useState(false);
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [showManageColumnsModal, setShowManageColumnsModal] = useState(false);
    const [showEditColumnModal, setShowEditColumnModal] = useState(false);
    const [showManageMetadataModal, setShowManageMetadataModal] = useState(false);
    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [editingColumn, setEditingColumn] = useState<ColumnDef | null>(null);
    const [rowFormData, setRowFormData] = useState<Record<string, any>>({});

    // Edit Table Metadata Form
    const [editTableName, setEditTableName] = useState('');
    const [editTableDesc, setEditTableDesc] = useState('');
    const [editTableCategory, setEditTableCategory] = useState('Organisation');
    const [editTableIcon, setEditTableIcon] = useState('TableIcon');
    const [editTableAllowMultiple, setEditTableAllowMultiple] = useState(false);
    const [editTableGroupingCol, setEditTableGroupingCol] = useState('');
    const [editTableShowInForms, setEditTableShowInForms] = useState(true);
    const [editTableFormFieldLabel, setEditTableFormFieldLabel] = useState('');
    const [editTableFormHelpText, setEditTableFormHelpText] = useState('');
    const [editTableIsRequired, setEditTableIsRequired] = useState(false);
    const [editTableMetadata, setEditTableMetadata] = useState<Record<string, any>>({});

    // New Table Form
    const [newTableName, setNewTableName] = useState('');
    const [newTableDesc, setNewTableDesc] = useState('');
    const [newTableCategory, setNewTableCategory] = useState('Organisation');
    const [newTableAllowMultiple, setNewTableAllowMultiple] = useState(false);
    const [newTableGroupingCol, setNewTableGroupingCol] = useState('');
    const [newTableShowInForms, setNewTableShowInForms] = useState(true);
    const [newTableFormFieldLabel, setNewTableFormFieldLabel] = useState('');
    const [newTableFormHelpText, setNewTableFormHelpText] = useState('');
    const [newTableIsRequired, setNewTableIsRequired] = useState(false);
    const [newTableColumns, setNewTableColumns] = useState<Array<{
        label: string;
        key: string;
        type: string;
        source_type: 'table' | 'custom';
        table_ref: string;
        options: string;
        multiple?: boolean;
        required: boolean;
    }>>([
        { label: 'Code Identifiant', key: 'code', type: 'text', source_type: 'custom', table_ref: '', options: '', multiple: false, required: true },
        { label: 'Libellé / Désignation', key: 'name', type: 'text', source_type: 'custom', table_ref: '', options: '', multiple: false, required: true },
        { label: 'Description', key: 'description', type: 'text', source_type: 'custom', table_ref: '', options: '', multiple: false, required: false }
    ]);

    // New Column Form
    const [newColLabel, setNewColLabel] = useState('');
    const [newColType, setNewColType] = useState<string>('text');
    const [newColSourceType, setNewColSourceType] = useState<'table' | 'custom'>('table');
    const [newColTableRef, setNewColTableRef] = useState<string>('sites');
    const [newColOptions, setNewColOptions] = useState('');
    const [newColMultiple, setNewColMultiple] = useState(false);
    const [newColRequired, setNewColRequired] = useState(false);

    // Edit Column Form
    const [editColLabel, setEditColLabel] = useState('');
    const [editColType, setEditColType] = useState('text');
    const [editColSourceType, setEditColSourceType] = useState<'table' | 'custom'>('table');
    const [editColTableRef, setEditColTableRef] = useState('sites');
    const [editColOptions, setEditColOptions] = useState('');
    const [editColMultiple, setEditColMultiple] = useState(false);
    const [editColRequired, setEditColRequired] = useState(false);
    const [editColDescription, setEditColDescription] = useState('');

    // In-app deletion confirmation modal (replaces window.confirm blocked in iframes)
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'column' | 'row' | 'table';
        title: string;
        message: string;
        colKey?: string;
        colLabel?: string;
        rowId?: number | string;
        tableId?: string;
    }>({
        isOpen: false,
        type: 'column',
        title: '',
        message: ''
    });

    // Status message
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    // Helper to load referenced table rows
    const fetchReferencedTable = async (refTableId: string) => {
        if (!refTableId || referencedTablesData[refTableId]) return;
        try {
            const res = await getTableById(refTableId);
            if (res.data?.rows) {
                setReferencedTablesData(prev => ({ ...prev, [refTableId]: res.data.rows }));
            }
        } catch (e) {
            console.warn(`Impossible de précharger la table liée '${refTableId}'`);
        }
    };

    // Load tables list
    const loadTablesList = async (preferredId?: string) => {
        try {
            const res = await getReferenceTables();
            setTables(res.data);
            const targetId = preferredId || selectedTableId || (res.data.length > 0 ? res.data[0].id : 'sites');
            setSelectedTableId(targetId);
            loadTableDetails(targetId);
        } catch (err: any) {
            console.error("Erreur chargement tables:", err);
            showFeedback('error', "Impossible de charger la liste des tables.");
        }
    };

    // Load table details & rows
    const loadTableDetails = async (tableId: string) => {
        setLoading(true);
        try {
            const res = await getTableById(tableId);
            setCurrentTable(res.data);
            setSelectedTableId(tableId);

            // Fetch any referenced tables for columns that link to another table
            if (res.data?.columns) {
                for (const col of res.data.columns) {
                    if (col.table_ref) {
                        fetchReferencedTable(col.table_ref);
                    }
                }
            }
        } catch (err: any) {
            console.error("Erreur chargement détails table:", err);
            showFeedback('error', `Impossible de charger la table '${tableId}'.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTablesList();
    }, []);

    // Filter rows based on search
    const filteredRows = currentTable?.rows ? currentTable.rows.filter((row: any) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return Object.values(row).some(v => String(v).toLowerCase().includes(q));
    }) : [];

    // Categories list for grouping
    const categories = Array.from(new Set(tables.map(t => t.category || 'Général')));
    const filteredTables = selectedCategory === 'all' 
        ? tables 
        : tables.filter(t => (t.category || 'Général') === selectedCategory);

    const getTableIcon = (iconName?: string) => {
        switch (iconName) {
            case 'Building2': return <Building2 className="w-4 h-4 text-blue-600" />;
            case 'Shield': return <Shield className="w-4 h-4 text-emerald-600" />;
            case 'Briefcase': return <Briefcase className="w-4 h-4 text-amber-600" />;
            case 'MapPin': return <MapPin className="w-4 h-4 text-red-600" />;
            case 'Cpu': return <Cpu className="w-4 h-4 text-purple-600" />;
            case 'Users': return <Users className="w-4 h-4 text-indigo-600" />;
            case 'CheckCircle': return <CheckCircle className="w-4 h-4 text-teal-600" />;
            default: return <TableIcon className="w-4 h-4 text-[#002395]" />;
        }
    };

    // Handler: Create Table
    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTableName.trim()) return;

        try {
            const formattedColumns = newTableColumns.map(c => ({
                label: c.label.trim(),
                key: (c.key || c.label).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                type: c.type,
                table_ref: c.type === 'select' && c.source_type === 'table' ? c.table_ref : undefined,
                options: c.type === 'select' && c.source_type === 'custom' && c.options ? c.options.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                multiple: !!c.multiple,
                required: c.required
            }));

            const res = await createReferenceTable({
                name: newTableName.trim(),
                description: newTableDesc.trim(),
                category: newTableCategory,
                allow_multiple: newTableAllowMultiple,
                grouping_column: newTableGroupingCol || undefined,
                show_in_forms: newTableShowInForms,
                form_field_label: newTableFormFieldLabel.trim() || undefined,
                form_help_text: newTableFormHelpText.trim() || undefined,
                is_required: newTableIsRequired,
                columns: formattedColumns,
                rows: []
            });

            showFeedback('success', `Table '${newTableName}' créée avec succès.`);
            setShowCreateTableModal(false);
            setNewTableName('');
            setNewTableDesc('');
            setNewTableAllowMultiple(false);
            setNewTableGroupingCol('');
            setNewTableShowInForms(true);
            setNewTableFormFieldLabel('');
            setNewTableFormHelpText('');
            setNewTableIsRequired(false);
            setNewTableColumns([
                { label: 'Code Identifiant', key: 'code', type: 'text', source_type: 'custom', table_ref: '', options: '', required: true },
                { label: 'Libellé / Désignation', key: 'name', type: 'text', source_type: 'custom', table_ref: '', options: '', required: true },
                { label: 'Description', key: 'description', type: 'text', source_type: 'custom', table_ref: '', options: '', required: false }
            ]);
            loadTablesList(res.data.table.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la création de la table.");
        }
    };

    // Handler: Delete Table
    const handleDeleteTable = (tableId: string) => {
        setDeleteModal({
            isOpen: true,
            type: 'table',
            title: `Supprimer la table "${currentTable?.name || tableId}" ?`,
            message: `Attention : cette opération supprimera définitivement la table de référence ainsi que l'ensemble de ses colonnes et enregistrements.`,
            tableId
        });
    };

    // Open Add Row Modal
    const handleOpenAddRow = async () => {
        const initial: Record<string, any> = {};
        for (const col of currentTable.columns) {
            if (col.multiple) {
                initial[col.key] = [];
            } else if (col.type === 'boolean') {
                initial[col.key] = false;
            } else if (col.type === 'select' && col.table_ref) {
                await fetchReferencedTable(col.table_ref);
                initial[col.key] = '';
            } else if (col.type === 'select' && col.options && col.options.length > 0) {
                initial[col.key] = col.options[0];
            } else {
                initial[col.key] = '';
            }
        }
        // Initialize custom metadata fields for rows
        if (currentTable.metadata_fields) {
            for (const meta of currentTable.metadata_fields) {
                if (meta.target === 'row' || meta.target === 'both' || !meta.target) {
                    if (meta.type === 'tags') {
                        initial[meta.key] = meta.defaultValue || [];
                    } else if (meta.type === 'boolean') {
                        initial[meta.key] = meta.defaultValue || false;
                    } else {
                        initial[meta.key] = meta.defaultValue || '';
                    }
                }
            }
        }
        setRowFormData(initial);
        setShowAddRowModal(true);
    };

    // Submit Add Row
    const handleSaveNewRow = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addTableRow(selectedTableId, rowFormData);
            showFeedback('success', "Nouvel enregistrement ajouté avec succès.");
            setShowAddRowModal(false);
            loadTableDetails(selectedTableId);
            loadTablesList(selectedTableId);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de l'ajout.");
        }
    };

    // Open Edit Row Modal
    const handleOpenEditRow = async (row: any) => {
        setEditingRow(row);
        const initial = { ...row };
        for (const col of currentTable.columns) {
            if (col.multiple) {
                if (Array.isArray(row[col.key])) {
                    initial[col.key] = [...row[col.key]];
                } else if (typeof row[col.key] === 'string' && row[col.key]) {
                    initial[col.key] = row[col.key].includes(',') ? row[col.key].split(',').map((s: string) => s.trim()) : [row[col.key]];
                } else {
                    initial[col.key] = [];
                }
            }
            if (col.type === 'select' && col.table_ref) {
                await fetchReferencedTable(col.table_ref);
            }
        }
        // Initialize custom metadata fields for rows
        if (currentTable.metadata_fields) {
            for (const meta of currentTable.metadata_fields) {
                if (meta.target === 'row' || meta.target === 'both' || !meta.target) {
                    if (meta.type === 'tags') {
                        initial[meta.key] = Array.isArray(row[meta.key]) ? [...row[meta.key]] : (row[meta.key] ? [row[meta.key]] : []);
                    } else {
                        initial[meta.key] = row[meta.key] !== undefined ? row[meta.key] : '';
                    }
                }
            }
        }
        setRowFormData(initial);
        setShowEditRowModal(true);
    };

    // Submit Edit Row
    const handleSaveEditRow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRow) return;
        try {
            await updateTableRow(selectedTableId, editingRow.id, rowFormData);
            showFeedback('success', `Enregistrement #${editingRow.id} mis à jour.`);
            setShowEditRowModal(false);
            setEditingRow(null);
            loadTableDetails(selectedTableId);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la modification.");
        }
    };

    // Delete Row
    const handleDeleteRow = (rowId: number | string) => {
        setDeleteModal({
            isOpen: true,
            type: 'row',
            title: `Supprimer l'enregistrement #${rowId} ?`,
            message: `Êtes-vous sûr de vouloir supprimer définitivement cet enregistrement de la table '${currentTable?.name || ''}' ?`,
            rowId
        });
    };

    // Metadata Handlers
    const handleAddMetadataField = async (fieldData: Omit<TableMetadataField, 'key'> & { key?: string }) => {
        if (!currentTable) return;
        try {
            await addTableMetadataField(currentTable.id, fieldData);
            showFeedback('success', `Champ de métadonnée « ${fieldData.label} » ajouté avec succès.`);
            await loadTableDetails(currentTable.id);
            await loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de l'ajout de la métadonnée.");
            throw err;
        }
    };

    const handleUpdateMetadataField = async (fieldKey: string, fieldData: Partial<TableMetadataField>) => {
        if (!currentTable) return;
        try {
            await updateTableMetadataField(currentTable.id, fieldKey, fieldData);
            showFeedback('success', `Champ de métadonnée « ${fieldKey} » mis à jour.`);
            await loadTableDetails(currentTable.id);
            await loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la modification de la métadonnée.");
            throw err;
        }
    };

    const handleDeleteMetadataField = async (fieldKey: string) => {
        if (!currentTable) return;
        try {
            await deleteTableMetadataField(currentTable.id, fieldKey);
            showFeedback('success', `Champ de métadonnée « ${fieldKey} » supprimé.`);
            await loadTableDetails(currentTable.id);
            await loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la suppression de la métadonnée.");
            throw err;
        }
    };

    const handleUpdateTableMetadataValues = async (updatedMetadata: Record<string, any>) => {
        if (!currentTable) return;
        try {
            await updateTableMetadataValues(currentTable.id, updatedMetadata, true);
            showFeedback('success', 'Métadonnées de la table mises à jour.');
            await loadTableDetails(currentTable.id);
            await loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la mise à jour des métadonnées.");
            throw err;
        }
    };

    // Open Edit Table Modal
    const handleOpenEditTable = () => {
        if (!currentTable) return;
        setEditTableName(currentTable.name);
        setEditTableDesc(currentTable.description || '');
        setEditTableCategory(currentTable.category || 'Organisation');
        setEditTableIcon(currentTable.icon || 'TableIcon');
        setEditTableAllowMultiple(!!currentTable.allow_multiple);
        setEditTableGroupingCol(currentTable.grouping_column || '');
        setEditTableShowInForms(currentTable.show_in_forms !== false);
        setEditTableFormFieldLabel(currentTable.form_field_label || currentTable.name);
        setEditTableFormHelpText(currentTable.form_help_text || '');
        setEditTableIsRequired(!!currentTable.is_required);
        setEditTableMetadata(currentTable.metadata || {});
        setShowEditTableModal(true);
    };

    // Quick toggle for allow_multiple directly from overview
    const handleQuickToggleMultiple = async () => {
        if (!currentTable) return;
        const newAllowMultiple = !currentTable.allow_multiple;
        try {
            await updateReferenceTable(currentTable.id, {
                allow_multiple: newAllowMultiple
            });
            showFeedback('success', `Sélection multiple ${newAllowMultiple ? 'activée' : 'désactivée'} pour la table '${currentTable.name}'.`);
            loadTableDetails(currentTable.id);
            loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors du changement du mode de sélection.");
        }
    };

    // Quick toggle for show_in_forms
    const handleQuickToggleShowInForms = async () => {
        if (!currentTable) return;
        const newShow = currentTable.show_in_forms === false ? true : false;
        try {
            await updateReferenceTable(currentTable.id, {
                show_in_forms: newShow
            });
            showFeedback('success', `Visibilité dans les formulaires ${newShow ? 'activée' : 'masquée'} pour '${currentTable.name}'.`);
            loadTableDetails(currentTable.id);
            loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la mise à jour de la visibilité.");
        }
    };

    // Submit Add Column
    const handleSaveNewColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newColLabel.trim()) return;
        try {
            await addTableColumn(selectedTableId, {
                label: newColLabel.trim(),
                type: newColType,
                table_ref: newColType === 'select' && newColSourceType === 'table' ? newColTableRef : undefined,
                options: newColType === 'select' && newColSourceType === 'custom' && newColOptions ? newColOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                multiple: newColMultiple,
                required: newColRequired
            });
            showFeedback('success', `Colonne '${newColLabel}' ajoutée avec succès.`);
            setShowAddColumnModal(false);
            setNewColLabel('');
            setNewColOptions('');
            setNewColMultiple(false);
            setNewColRequired(false);
            if (newColType === 'select' && newColSourceType === 'table' && newColTableRef) {
                await fetchReferencedTable(newColTableRef);
            }
            loadTableDetails(selectedTableId);
            loadTablesList(selectedTableId);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de l'ajout de la colonne.");
        }
    };

    // Submit Edit Table
    const handleSaveEditTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTable || !editTableName.trim()) return;
        try {
            await updateReferenceTable(currentTable.id, {
                name: editTableName.trim(),
                description: editTableDesc.trim(),
                category: editTableCategory,
                icon: editTableIcon,
                allow_multiple: editTableAllowMultiple,
                grouping_column: editTableGroupingCol || null,
                show_in_forms: editTableShowInForms,
                form_field_label: editTableFormFieldLabel.trim() || undefined,
                form_help_text: editTableFormHelpText.trim() || undefined,
                is_required: editTableIsRequired,
                metadata: editTableMetadata
            });
            showFeedback('success', `Paramètres de la table '${editTableName}' mis à jour avec succès.`);
            setShowEditTableModal(false);
            loadTableDetails(currentTable.id);
            loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la modification de la table.");
        }
    };

    // Open Edit Column Modal
    const handleOpenEditColumn = (col: ColumnDef) => {
        setEditingColumn(col);
        setEditColLabel(col.label);
        setEditColType(col.type);
        setEditColSourceType(col.table_ref ? 'table' : 'custom');
        setEditColTableRef(col.table_ref || 'sites');
        setEditColOptions(Array.isArray(col.options) ? col.options.join(', ') : (col.options || ''));
        setEditColMultiple(!!col.multiple);
        setEditColRequired(!!col.required);
        setEditColDescription(col.description || '');
        setShowEditColumnModal(true);
    };

    // Submit Edit Column
    const handleSaveEditColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingColumn || !currentTable || !editColLabel.trim()) return;
        try {
            await updateTableColumn(currentTable.id, editingColumn.key, {
                label: editColLabel.trim(),
                type: editColType,
                table_ref: editColType === 'select' && editColSourceType === 'table' ? editColTableRef : undefined,
                options: editColType === 'select' && editColSourceType === 'custom' && editColOptions ? editColOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                multiple: editColMultiple,
                required: editColRequired,
                description: editColDescription.trim()
            });
            showFeedback('success', `Colonne '${editColLabel}' modifiée avec succès.`);
            setShowEditColumnModal(false);
            setEditingColumn(null);
            if (editColType === 'select' && editColSourceType === 'table' && editColTableRef) {
                await fetchReferencedTable(editColTableRef);
            }
            loadTableDetails(currentTable.id);
            loadTablesList(currentTable.id);
        } catch (err: any) {
            showFeedback('error', err.response?.data?.error || "Erreur lors de la modification de la colonne.");
        }
    };

    // Delete Column
    const handleDeleteColumn = (colKey: string, colLabel: string) => {
        if (!currentTable) return;
        if (colKey === 'id' || colKey?.toLowerCase() === 'id') {
            showFeedback('error', "La colonne '# ID' est le discriminant unique de la table et ne peut pas être supprimée.");
            return;
        }
        setDeleteModal({
            isOpen: true,
            type: 'column',
            title: `Supprimer la colonne "${colLabel}" ?`,
            message: `Confirmez-vous la suppression définitive de la colonne '${colLabel}' (${colKey}) dans la table '${currentTable.name}' ? Les valeurs associées à cette colonne ne seront plus affichées.`,
            colKey,
            colLabel
        });
    };

    // Execute deletion upon confirmation in in-app modal
    const handleConfirmDeleteAction = async () => {
        const { type, colKey, colLabel, rowId, tableId } = deleteModal;
        setDeleteModal(prev => ({ ...prev, isOpen: false }));

        if (type === 'column' && currentTable && colKey) {
            try {
                await deleteTableColumn(currentTable.id, colKey);
                showFeedback('success', `Colonne '${colLabel || colKey}' supprimée avec succès.`);
                await loadTableDetails(currentTable.id);
                await loadTablesList(currentTable.id);
            } catch (err: any) {
                showFeedback('error', err.response?.data?.error || "Erreur lors de la suppression de la colonne.");
            }
        } else if (type === 'row' && rowId !== undefined) {
            try {
                await deleteTableRow(selectedTableId, rowId);
                showFeedback('success', "Enregistrement supprimé avec succès.");
                await loadTableDetails(selectedTableId);
                await loadTablesList(selectedTableId);
            } catch (err: any) {
                showFeedback('error', err.response?.data?.error || "Erreur lors de la suppression.");
            }
        } else if (type === 'table' && tableId) {
            try {
                await deleteReferenceTable(tableId);
                showFeedback('success', "Table supprimée avec succès.");
                await loadTablesList('sites');
            } catch (err: any) {
                showFeedback('error', err.response?.data?.error || "Impossible de supprimer la table.");
            }
        }
    };

    // Export Table as CSV
    const handleExportCsv = () => {
        if (!currentTable || !currentTable.rows) return;
        const cols = currentTable.columns || [];
        const metaFields = (currentTable.metadata_fields || []).filter(
            (f: any) => f.target === 'row' || f.target === 'both' || !f.target
        );

        const headers = [
            ...cols.map((c: ColumnDef) => `"${c.label || c.key}"`),
            ...metaFields.map((f: any) => `"[Méta] ${f.label || f.key}"`)
        ].join(';');

        const rows = (Array.isArray(currentTable.rows) ? currentTable.rows : []).map((r: any) => {
            const colVals = cols.map((c: ColumnDef) => {
                let val = r[c.key];
                if (c.type === 'select' && c.table_ref && referencedTablesData[c.table_ref]) {
                    const refList = referencedTablesData[c.table_ref];
                    if (Array.isArray(val)) {
                        val = val.map(id => {
                            const found = refList.find((item: any) => String(item.id) === String(id) || item.name === id);
                            return found ? (found.name || found.label || id) : id;
                        }).join(', ');
                    } else if (val !== undefined && val !== null && val !== '') {
                        const found = refList.find((item: any) => String(item.id) === String(val) || item.name === val);
                        if (found) val = found.name || found.label || val;
                    }
                }
                if (Array.isArray(val)) val = val.join(', ');
                if (typeof val === 'boolean') val = val ? 'Oui' : 'Non';
                return `"${(val !== undefined && val !== null) ? String(val).replace(/"/g, '""') : ''}"`;
            });

            const metaVals = metaFields.map((f: any) => {
                let mVal = r[f.key];
                if (Array.isArray(mVal)) mVal = mVal.join(', ');
                if (typeof mVal === 'boolean') mVal = mVal ? 'Oui' : 'Non';
                return `"${(mVal !== undefined && mVal !== null) ? String(mVal).replace(/"/g, '""') : ''}"`;
            });

            return [...colVals, ...metaVals].join(';');
        }).join('\n');

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + '\n' + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${currentTable.id}_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showFeedback('success', `Export CSV de la table '${currentTable.name}' téléchargé avec succès (${currentTable.rows.length} lignes).`);
    };

    return (
        <div className="space-y-6">
            {/* Notification Banner */}
            {feedback && (
                <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
                    <div className="flex items-center gap-2 font-medium">
                        {feedback.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                        {feedback.message}
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-2xs">
                <div>
                    <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
                        <Database className="w-6 h-6 text-[#002395]" />
                        Tables de Référence & Données Métier
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Configurez les référentiels de données (sites, rôles, services, régions, équipements...) et créez vos tables sur mesure utilisables dans tous les processus et formulaires.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <PageHelpButton
                        pageTitle="Tables de Référence & Référentiels"
                        pageCategory="Paramétrage Système"
                        description="Gérez l'ensemble des référentiels de données métier et leurs liaisons relationnelles avec les formulaires et les workflows d'accès mécatroniques."
                        sections={tablesHelpSections}
                    />
                    <Link
                        to="/admin/processus"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Ouvrir le configurateur de workflows et d'étapes de validation"
                    >
                        <GitFork className="w-4 h-4 text-blue-700" />
                        Gérer les Workflows & Validation
                    </Link>
                    <button
                        id="btn-create-table"
                        onClick={() => setShowCreateTableModal(true)}
                        className="bg-[#002395] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle Table
                    </button>
                </div>
            </div>

            {/* Main Content: Tables Sidebar + Active Table Data View */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Column: Tables Directory */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            Référentiels ({tables.length})
                        </span>
                        <span className="text-[11px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                            Actifs
                        </span>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition cursor-pointer ${selectedCategory === 'all' ? 'bg-[#002395] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Toutes
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition cursor-pointer ${selectedCategory === cat ? 'bg-[#002395] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Tables Nav List */}
                    <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                        {filteredTables.map(t => {
                            const isSelected = t.id === selectedTableId;
                            return (
                                <button
                                    key={t.id}
                                    id={`tab-table-${t.id}`}
                                    onClick={() => loadTableDetails(t.id)}
                                    className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between group cursor-pointer ${isSelected ? 'bg-blue-50/90 text-[#002395] border border-blue-200 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="shrink-0">{getTableIcon(t.icon)}</div>
                                        <div className="truncate">
                                            <div className="truncate text-gray-900 font-semibold flex items-center gap-1.5">
                                                <span>{t.name}</span>
                                                {t.allow_multiple && (
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200 shrink-0">
                                                        Multi
                                                    </span>
                                                )}
                                                {t.grouping_column && (
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0">
                                                        {t.grouping_column}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono truncate">{t.id}</div>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-semibold ${isSelected ? 'bg-blue-200/60 text-blue-900' : 'bg-gray-100 text-gray-500'}`}>
                                        {t.rows_count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Table Viewer & Management */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 text-sm">
                            Chargement des données de la table...
                        </div>
                    ) : currentTable ? (
                        <SchemaDrivenTable
                            table={currentTable}
                            referencedTablesData={referencedTablesData}
                            onAddRow={handleOpenAddRow}
                            onEditRow={handleOpenEditRow}
                            onDeleteRow={handleDeleteRow}
                            onAddColumn={() => setShowAddColumnModal(true)}
                            onManageColumns={() => setShowManageColumnsModal(true)}
                            onEditColumn={handleOpenEditColumn}
                            onDeleteColumn={handleDeleteColumn}
                            onEditTable={handleOpenEditTable}
                            onDeleteTable={handleDeleteTable}
                            onExportCsv={handleExportCsv}
                            onManageMetadataFields={() => setShowManageMetadataModal(true)}
                            onUpdateTableMetadata={handleUpdateTableMetadataValues}
                            onQuickToggleMultiple={handleQuickToggleMultiple}
                            onQuickToggleShowInForms={handleQuickToggleShowInForms}
                            getTableIcon={getTableIcon}
                        />
                    ) : (
                        <div className="p-12 text-center text-gray-400">
                            Sélectionnez une table dans la liste à gauche.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Metadata Fields Manager */}
            {currentTable && isFeatureEnabled('metadata_schema') && (
                <MetadataFieldsManagerModal
                    isOpen={showManageMetadataModal}
                    onClose={() => setShowManageMetadataModal(false)}
                    tableId={currentTable.id}
                    tableName={currentTable.name}
                    metadataFields={currentTable.metadata_fields || []}
                    onAddField={handleAddMetadataField}
                    onUpdateField={handleUpdateMetadataField}
                    onDeleteField={handleDeleteMetadataField}
                />
            )}

            {/* Modal: Create New Table */}
            {showCreateTableModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Database className="w-5 h-5 text-[#002395]" />
                                Créer une Nouvelle Table de Référence
                            </div>
                            <button onClick={() => setShowCreateTableModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTable} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la table *</label>
                                    <input
                                        type="text"
                                        value={newTableName}
                                        onChange={e => setNewTableName(e.target.value)}
                                        placeholder="Ex: Prestataires Agréés"
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Catégorie</label>
                                    <select
                                        value={newTableCategory}
                                        onChange={e => setNewTableCategory(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    >
                                        <option value="Organisation">Organisation</option>
                                        <option value="Infrastructure">Infrastructure</option>
                                        <option value="Matériel">Matériel & Équipements</option>
                                        <option value="Sécurité">Sécurité & Habilitations</option>
                                        <option value="Partenaires">Partenaires & Sous-traitants</option>
                                        <option value="Exploitation">Exploitation Ferroviaire</option>
                                        <option value="Personnalisé">Autre Référentiel</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newTableDesc}
                                    onChange={e => setNewTableDesc(e.target.value)}
                                    placeholder="Rôle de ce référentiel de données, utilisation dans les formulaires..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            {/* Columns Definition */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800">Colonnes de la table ({newTableColumns.length})</span>
                                    <button
                                        type="button"
                                        onClick={() => setNewTableColumns([...newTableColumns, { label: `Champ ${newTableColumns.length + 1}`, key: `champ_${newTableColumns.length + 1}`, type: 'text', options: '', required: false }])}
                                        className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Ajouter une colonne
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {newTableColumns.map((col, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 text-xs">
                                            <input
                                                type="text"
                                                value={col.label}
                                                onChange={e => {
                                                    const updated = [...newTableColumns];
                                                    updated[idx].label = e.target.value;
                                                    updated[idx].key = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                                                    setNewTableColumns(updated);
                                                }}
                                                placeholder="Libellé"
                                                className="flex-1 border border-gray-300 rounded p-1.5 text-xs bg-white"
                                                required
                                            />
                                            <select
                                                value={col.type}
                                                onChange={e => {
                                                    const updated = [...newTableColumns];
                                                    updated[idx].type = e.target.value;
                                                    if (e.target.value === 'select' && !updated[idx].table_ref) {
                                                        updated[idx].table_ref = tables[0]?.id || 'sites';
                                                    }
                                                    setNewTableColumns(updated);
                                                }}
                                                className="border border-gray-300 rounded p-1.5 text-xs bg-white w-28"
                                            >
                                                <option value="text">Texte</option>
                                                <option value="number">Nombre</option>
                                                <option value="select">Sélection</option>
                                                <option value="boolean">Booléen</option>
                                                <option value="email">Email</option>
                                            </select>
                                            {col.type === 'select' && (
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        value={col.source_type}
                                                        onChange={e => {
                                                            const updated = [...newTableColumns];
                                                            updated[idx].source_type = e.target.value as 'table' | 'custom';
                                                            if (!updated[idx].table_ref) updated[idx].table_ref = tables[0]?.id || 'sites';
                                                            setNewTableColumns(updated);
                                                        }}
                                                        className="border border-gray-300 rounded p-1.5 text-xs bg-white w-24"
                                                    >
                                                        <option value="table">Table liée</option>
                                                        <option value="custom">Manuel</option>
                                                    </select>
                                                    {col.source_type === 'table' ? (
                                                        <select
                                                            value={col.table_ref || 'sites'}
                                                            onChange={e => {
                                                                const updated = [...newTableColumns];
                                                                updated[idx].table_ref = e.target.value;
                                                                setNewTableColumns(updated);
                                                            }}
                                                            className="border border-blue-300 rounded p-1.5 text-xs bg-blue-50/50 w-32 font-medium"
                                                        >
                                                            {tables.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={col.options}
                                                            onChange={e => {
                                                                const updated = [...newTableColumns];
                                                                updated[idx].options = e.target.value;
                                                                setNewTableColumns(updated);
                                                            }}
                                                            placeholder="Opt1,Opt2,Opt3"
                                                            className="w-32 border border-gray-300 rounded p-1.5 text-xs bg-white"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            <label className="flex items-center gap-1 text-[11px] text-gray-600 shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={col.required}
                                                    onChange={e => {
                                                        const updated = [...newTableColumns];
                                                        updated[idx].required = e.target.checked;
                                                        setNewTableColumns(updated);
                                                    }}
                                                />
                                                Requis
                                            </label>
                                            <label className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0 cursor-pointer" title="Autoriser la sélection de plusieurs valeurs simultanées">
                                                <input
                                                    type="checkbox"
                                                    checked={!!col.multiple}
                                                    onChange={e => {
                                                        const updated = [...newTableColumns];
                                                        updated[idx].multiple = e.target.checked;
                                                        setNewTableColumns(updated);
                                                    }}
                                                    className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                                                />
                                                Multi-valeurs
                                            </label>
                                            {newTableColumns.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTableColumns(newTableColumns.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Comportement Formulaires & Multi-Sélection */}
                            <div className="pt-3 border-t border-gray-100 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                                    <SlidersHorizontal className="w-4 h-4 text-[#002395]" />
                                    Paramètres Formulaire & Multi-Sélection
                                </div>

                                <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/60 flex items-center justify-between gap-3">
                                    <div>
                                        <label htmlFor="cb-newtable-allow-multiple" className="text-xs font-bold text-purple-950 flex items-center gap-1.5 cursor-pointer">
                                            <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                                            Autoriser la sélection multiple (Multi-Choix)
                                        </label>
                                        <p className="text-[11px] text-purple-800/80 mt-0.5">
                                            Permet de sélectionner plusieurs entrées à la fois dans les formulaires de demande.
                                        </p>
                                    </div>
                                    <input
                                        id="cb-newtable-allow-multiple"
                                        type="checkbox"
                                        checked={newTableAllowMultiple}
                                        onChange={e => setNewTableAllowMultiple(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={newTableShowInForms}
                                            onChange={e => setNewTableShowInForms(e.target.checked)}
                                            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Afficher dans formulaires</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={newTableIsRequired}
                                            onChange={e => setNewTableIsRequired(e.target.checked)}
                                            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Champ obligatoire</span>
                                    </label>
                                </div>
                            </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateTableModal(false)}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    Créer la Table
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Row / Edit Row */}
            {(showAddRowModal || showEditRowModal) && currentTable && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                {showAddRowModal ? <Plus className="w-5 h-5 text-[#002395]" /> : <Edit2 className="w-5 h-5 text-[#002395]" />}
                                {showAddRowModal ? `Ajouter un enregistrement dans '${currentTable.name}'` : `Modifier l'enregistrement #${editingRow?.id}`}
                            </div>
                            <button
                                onClick={() => { setShowAddRowModal(false); setShowEditRowModal(false); }}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={showAddRowModal ? handleSaveNewRow : handleSaveEditRow} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-3.5 min-h-0">
                            {currentTable.columns.map((col: ColumnDef) => (
                                <div key={col.key}>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                                        <span>
                                            {col.label} {col.required && <span className="text-red-500">*</span>}
                                        </span>
                                        {col.table_ref && (
                                            <span className="text-[10px] text-indigo-600 font-normal flex items-center gap-1">
                                                <Link2 className="w-3 h-3" />
                                                Source: {tables.find(t => t.id === col.table_ref)?.name || col.table_ref}
                                            </span>
                                        )}
                                    </label>
                                    {col.multiple ? (
                                        (() => {
                                            const availableOptions = col.table_ref
                                                ? (referencedTablesData[col.table_ref] || []).map((refRow: any) => {
                                                    const val = refRow.name || refRow.code || String(refRow.id);
                                                    const display = refRow.name
                                                        ? (refRow.code && refRow.code !== refRow.name ? `${refRow.name} (${refRow.code})` : refRow.name)
                                                        : (refRow.code || `ID #${refRow.id}`);
                                                    return { val, display };
                                                })
                                                : (col.options || []).map((opt: string) => ({ val: opt, display: opt }));

                                            const currentArr: string[] = Array.isArray(rowFormData[col.key])
                                                ? rowFormData[col.key]
                                                : (rowFormData[col.key] ? [String(rowFormData[col.key])] : []);

                                            return (
                                                <div className="space-y-2 bg-purple-50/40 p-3 rounded-lg border border-purple-200">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-semibold text-purple-900 flex items-center gap-1">
                                                            <Sliders className="w-3.5 h-3.5 text-purple-600" />
                                                            Sélection multiple ({currentArr.length} sélectionné{currentArr.length > 1 ? 's' : ''})
                                                        </span>
                                                        {currentArr.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setRowFormData({ ...rowFormData, [col.key]: [] })}
                                                                className="text-[11px] text-purple-700 hover:text-purple-950 font-medium underline cursor-pointer"
                                                            >
                                                                Tout désélectionner
                                                            </button>
                                                        )}
                                                    </div>

                                                    {currentArr.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded border border-purple-200/70">
                                                            {currentArr.map((selectedVal: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full text-[11px] font-medium border border-purple-300">
                                                                    <span>{selectedVal}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = currentArr.filter((v: string) => v !== selectedVal);
                                                                            setRowFormData({ ...rowFormData, [col.key]: updated });
                                                                        }}
                                                                        className="hover:text-red-700 p-0.5 cursor-pointer"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {availableOptions.length > 0 ? (
                                                        <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded border border-purple-200/70">
                                                            {availableOptions.map((opt) => {
                                                                const isChecked = currentArr.includes(opt.val);
                                                                return (
                                                                    <label key={opt.val} className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition ${isChecked ? 'bg-purple-100/70 text-purple-950 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={e => {
                                                                                if (e.target.checked) {
                                                                                    setRowFormData({ ...rowFormData, [col.key]: [...currentArr, opt.val] });
                                                                                } else {
                                                                                    setRowFormData({ ...rowFormData, [col.key]: currentArr.filter(v => v !== opt.val) });
                                                                                }
                                                                            }}
                                                                            className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                                                                        />
                                                                        <span>{opt.display}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={currentArr.join(', ')}
                                                            onChange={e => {
                                                                const splitted = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                                setRowFormData({ ...rowFormData, [col.key]: splitted });
                                                            }}
                                                            placeholder="Entrez plusieurs valeurs séparées par des virgules..."
                                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : col.type === 'select' ? (
                                        col.table_ref ? (
                                            <select
                                                value={rowFormData[col.key] || ''}
                                                onChange={e => setRowFormData({ ...rowFormData, [col.key]: e.target.value })}
                                                required={col.required}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            >
                                                <option value="">-- Sélectionner dans {tables.find(t => t.id === col.table_ref)?.name || col.table_ref} --</option>
                                                {(referencedTablesData[col.table_ref] || []).map((refRow: any) => {
                                                    const val = refRow.name || refRow.code || String(refRow.id);
                                                    const display = refRow.name
                                                        ? (refRow.code && refRow.code !== refRow.name ? `${refRow.name} (${refRow.code})` : refRow.name)
                                                        : (refRow.code || `ID #${refRow.id}`);
                                                    return (
                                                        <option key={refRow.id} value={val}>
                                                            {display}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        ) : col.options ? (
                                            <select
                                                value={rowFormData[col.key] || ''}
                                                onChange={e => setRowFormData({ ...rowFormData, [col.key]: e.target.value })}
                                                required={col.required}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            >
                                                <option value="">Sélectionner une option...</option>
                                                {col.options.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={rowFormData[col.key] !== undefined ? rowFormData[col.key] : ''}
                                                onChange={e => setRowFormData({ ...rowFormData, [col.key]: e.target.value })}
                                                required={col.required}
                                                placeholder={`Saisir ${col.label.toLowerCase()}...`}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            />
                                        )
                                    ) : col.type === 'boolean' ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="checkbox"
                                                id={`cb-${col.key}`}
                                                checked={!!rowFormData[col.key]}
                                                onChange={e => setRowFormData({ ...rowFormData, [col.key]: e.target.checked })}
                                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <label htmlFor={`cb-${col.key}`} className="text-xs text-gray-700 font-medium cursor-pointer">
                                                Activer / Validé
                                            </label>
                                        </div>
                                    ) : (
                                        <input
                                            type={col.type === 'number' ? 'number' : col.type === 'email' ? 'email' : 'text'}
                                            value={rowFormData[col.key] !== undefined ? rowFormData[col.key] : ''}
                                            onChange={e => setRowFormData({ ...rowFormData, [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value })}
                                            required={col.required}
                                            placeholder={`Saisir ${col.label.toLowerCase()}...`}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Custom Row-Level Metadata Fields */}
                            {currentTable.metadata_fields && currentTable.metadata_fields.filter(f => f.target === 'row' || f.target === 'both' || !f.target).length > 0 && (
                                <div className="col-span-full mt-2 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag className="w-4 h-4 text-[#002395]" />
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                            Métadonnées & Classifications Personnalisées
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {currentTable.metadata_fields
                                            .filter(f => f.target === 'row' || f.target === 'both' || !f.target)
                                            .map(meta => (
                                                <div key={meta.key} className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                                                        <span>{meta.label}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">({meta.type})</span>
                                                    </label>
                                                    {meta.type === 'tags' ? (
                                                        <div>
                                                            <input
                                                                type="text"
                                                                value={Array.isArray(rowFormData[meta.key]) ? rowFormData[meta.key].join(', ') : (rowFormData[meta.key] || '')}
                                                                onChange={e => {
                                                                    const tags = e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean);
                                                                    setRowFormData({ ...rowFormData, [meta.key]: tags });
                                                                }}
                                                                placeholder="Tags séparés par virgules (ex: VIP, Critique)..."
                                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                                            />
                                                            {Array.isArray(rowFormData[meta.key]) && rowFormData[meta.key].length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                    {rowFormData[meta.key].map((tag: string, i: number) => (
                                                                        <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                                                            #{tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : meta.type === 'select' || meta.type === 'category' ? (
                                                        meta.options && meta.options.length > 0 ? (
                                                            <select
                                                                value={rowFormData[meta.key] || ''}
                                                                onChange={e => setRowFormData({ ...rowFormData, [meta.key]: e.target.value })}
                                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                                            >
                                                                <option value="">-- Choisir une option --</option>
                                                                {meta.options.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={rowFormData[meta.key] || ''}
                                                                onChange={e => setRowFormData({ ...rowFormData, [meta.key]: e.target.value })}
                                                                placeholder={`Valeur pour ${meta.label.toLowerCase()}...`}
                                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                                            />
                                                        )
                                                    ) : meta.type === 'boolean' ? (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <input
                                                                type="checkbox"
                                                                id={`meta-${meta.key}`}
                                                                checked={!!rowFormData[meta.key]}
                                                                onChange={e => setRowFormData({ ...rowFormData, [meta.key]: e.target.checked })}
                                                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                            />
                                                            <label htmlFor={`meta-${meta.key}`} className="text-xs text-gray-700 cursor-pointer">
                                                                Activer cette métadonnée
                                                            </label>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type={meta.type === 'number' ? 'number' : 'text'}
                                                            value={rowFormData[meta.key] !== undefined ? rowFormData[meta.key] : ''}
                                                            onChange={e => setRowFormData({ ...rowFormData, [meta.key]: meta.type === 'number' ? Number(e.target.value) : e.target.value })}
                                                            placeholder={`Saisir ${String(meta.label || meta.key || '').toLowerCase()}...`}
                                                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                                        />
                                                    )}
                                                    {meta.description && (
                                                        <p className="text-[10px] text-gray-500">{meta.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddRowModal(false); setShowEditRowModal(false); }}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    {showAddRowModal ? 'Ajouter la Ligne' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Column */}
            {showAddColumnModal && currentTable && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Plus className="w-5 h-5 text-[#002395]" />
                                Ajouter une Colonne dans '{currentTable.name}'
                            </div>
                            <button onClick={() => setShowAddColumnModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNewColumn} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-3.5 min-h-0">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Libellé de la colonne *</label>
                                <input
                                    type="text"
                                    value={newColLabel}
                                    onChange={e => setNewColLabel(e.target.value)}
                                    placeholder="Ex: Responsable d'astreinte"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Type de donnée</label>
                                <select
                                    value={newColType}
                                    onChange={e => setNewColType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    <option value="text">Texte libre</option>
                                    <option value="number">Nombre</option>
                                    <option value="select">Liste de sélection</option>
                                    <option value="boolean">Booléen (Oui/Non)</option>
                                    <option value="email">Email</option>
                                </select>
                            </div>

                            {newColType === 'select' && (
                                <div className="space-y-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source des données de sélection</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNewColSourceType('table')}
                                                className={`p-2 rounded-lg border text-left text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${newColSourceType === 'table' ? 'bg-[#002395] text-white border-[#002395] shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <Link2 className="w-3.5 h-3.5" />
                                                <span>Table de référence</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewColSourceType('custom')}
                                                className={`p-2 rounded-lg border text-left text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${newColSourceType === 'custom' ? 'bg-[#002395] text-white border-[#002395] shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <Sliders className="w-3.5 h-3.5" />
                                                <span>Options manuelles</span>
                                            </button>
                                        </div>
                                    </div>

                                    {newColSourceType === 'table' ? (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Sélectionner la table liée *</label>
                                            <select
                                                value={newColTableRef}
                                                onChange={e => setNewColTableRef(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            >
                                                {tables.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} ({t.id}) — {t.rows_count} lignes
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                                                <Link2 className="w-3 h-3 text-blue-600" />
                                                Les valeurs de cette colonne seront alimentées dynamiquement par cette table.
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Options (séparées par une virgule)</label>
                                            <input
                                                type="text"
                                                value={newColOptions}
                                                onChange={e => setNewColOptions(e.target.value)}
                                                placeholder="Option 1, Option 2, Option 3"
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="cb-col-req"
                                        checked={newColRequired}
                                        onChange={e => setNewColRequired(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <label htmlFor="cb-col-req" className="text-xs text-gray-700 font-medium cursor-pointer">
                                        Champ obligatoire lors de la saisie
                                    </label>
                                </div>

                                <div className="flex items-start gap-2 bg-purple-50/60 p-2.5 rounded-lg border border-purple-200/80">
                                    <input
                                        type="checkbox"
                                        id="cb-col-multiple"
                                        checked={newColMultiple}
                                        onChange={e => setNewColMultiple(e.target.checked)}
                                        className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 mt-0.5"
                                    />
                                    <label htmlFor="cb-col-multiple" className="text-xs text-purple-950 font-medium cursor-pointer">
                                        <span className="font-bold text-purple-900 block">Autoriser les valeurs multiples (Multi-valeurs)</span>
                                        <span className="text-[11px] text-purple-700 block mt-0.5">
                                            Permet d'assigner plusieurs choix à un même enregistrement (ex: plusieurs rôles, plusieurs habilitations, plusieurs sites).
                                        </span>
                                    </label>
                                </div>
                            </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setShowAddColumnModal(false)}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    Ajouter la Colonne
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Table Metadata */}
            {showEditTableModal && currentTable && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Edit3 className="w-5 h-5 text-[#002395]" />
                                Modifier la table '{currentTable.name}'
                            </div>
                            <button onClick={() => setShowEditTableModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditTable} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-3.5 min-h-0">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la table *</label>
                                <input
                                    type="text"
                                    value={editTableName}
                                    onChange={e => setEditTableName(e.target.value)}
                                    placeholder="Ex: Habilitations et Certifications"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={editTableDesc}
                                    onChange={e => setEditTableDesc(e.target.value)}
                                    placeholder="Description du rôle et de l'usage de ce référentiel..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Catégorie</label>
                                    <select
                                        value={editTableCategory}
                                        onChange={e => setEditTableCategory(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    >
                                        <option value="Organisation">Organisation</option>
                                        <option value="Matériel">Matériel</option>
                                        <option value="Sécurité">Sécurité</option>
                                        <option value="Géographie">Géographie</option>
                                        <option value="Processus">Processus</option>
                                        <option value="Général">Général</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Icône représentative</label>
                                    <select
                                        value={editTableIcon}
                                        onChange={e => setEditTableIcon(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    >
                                        <option value="TableIcon">Table par défaut</option>
                                        <option value="Building2">Bâtiment / Site</option>
                                        <option value="Shield">Bouclier / Sécurité</option>
                                        <option value="Briefcase">Mallette / Service</option>
                                        <option value="MapPin">Localisation / Région</option>
                                        <option value="Cpu">Composant / Matériel</option>
                                        <option value="Users">Utilisateurs / Rôles</option>
                                        <option value="CheckCircle">Validation / Statut</option>
                                        <option value="Layers">Couches / Niveaux</option>
                                        <option value="GitFork">Processus / Flux</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section: Comportement dans les Formulaires & Multi-Sélection */}
                            <div className="pt-3 border-t border-gray-100 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                                    <SlidersHorizontal className="w-4 h-4 text-[#002395]" />
                                    Comportement dans les Formulaires & Multi-Sélection
                                </div>

                                {/* Multi-Selection toggle */}
                                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/60 flex items-start justify-between gap-3">
                                    <div>
                                        <label htmlFor="cb-table-allow-multiple" className="text-xs font-bold text-purple-950 flex items-center gap-1.5 cursor-pointer">
                                            <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                                            Autoriser la sélection multiple (Multi-Choix)
                                        </label>
                                        <p className="text-[11px] text-purple-800/80 mt-0.5">
                                            Permet aux demandeurs de sélectionner plusieurs entrées à la fois dans les demandes d'accès (ex: plusieurs sites, plusieurs équipements).
                                        </p>
                                    </div>
                                    <input
                                        id="cb-table-allow-multiple"
                                        type="checkbox"
                                        checked={editTableAllowMultiple}
                                        onChange={e => setEditTableAllowMultiple(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5 cursor-pointer"
                                    />
                                </div>

                                {/* Grouping Column dropdown */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Colonne de regroupement hiérarchique (Facultatif)
                                    </label>
                                    <select
                                        value={editTableGroupingCol}
                                        onChange={e => setEditTableGroupingCol(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                    >
                                        <option value="">-- Aucun regroupement (Liste simple) --</option>
                                        {currentTable.columns?.map((c: ColumnDef) => (
                                            <option key={c.key} value={c.key}>
                                                {c.label} ({c.key}) [{c.type}]
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Ex: choisir « region » pour regrouper visuellement les sites par région dans le menu déroulant.
                                    </p>
                                </div>

                                {/* Show in forms & Is required toggles */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={editTableShowInForms}
                                            onChange={e => setEditTableShowInForms(e.target.checked)}
                                            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Afficher dans formulaires</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={editTableIsRequired}
                                            onChange={e => setEditTableIsRequired(e.target.checked)}
                                            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Champ obligatoire</span>
                                    </label>
                                </div>

                                {/* Custom Form Field Label & Help Text */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Libellé affiché dans le formulaire (Optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={editTableFormFieldLabel}
                                        onChange={e => setEditTableFormFieldLabel(e.target.value)}
                                        placeholder={`Par défaut : ${editTableName || currentTable.name}`}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Texte d'aide / Consigne pour le demandeur (Optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        value={editTableFormHelpText}
                                        onChange={e => setEditTableFormHelpText(e.target.value)}
                                        placeholder="Ex: Sélectionnez les zones d'intervention requises pour vos travaux..."
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                    />
                                </div>
                            </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setShowEditTableModal(false)}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Manage Columns */}
            {showManageColumnsModal && currentTable && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div>
                                <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                    <Sliders className="w-5 h-5 text-[#002395]" />
                                    Gestion des Colonnes — {currentTable.name}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Structure des attributs de la table ({currentTable.columns.length} colonnes actives)
                                </p>
                            </div>
                            <button onClick={() => setShowManageColumnsModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200/80 shrink-0">
                            <p className="text-xs text-gray-600">
                                Modifiez les libellés, types, relations ou supprimez les colonnes selon vos besoins métier.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowManageColumnsModal(false);
                                    setShowAddColumnModal(true);
                                }}
                                className="bg-[#002395] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Nouvelle colonne
                            </button>
                        </div>

                        {/* List of Columns */}
                        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                            {/* ID Column (Fixed) */}
                            <div className="p-3 bg-gray-100/70 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-md bg-gray-200 text-gray-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                        #
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs text-gray-900">ID (Identifiant unique)</span>
                                            <span className="text-[10px] font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                                id
                                            </span>
                                            <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                                Clé primaire
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Incrément unique automatique généré par le système.
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-medium text-gray-400 italic">
                                    Système (Verrouillé)
                                </span>
                            </div>

                            {/* Dynamic columns */}
                            {currentTable.columns.map((col: ColumnDef) => (
                                <div key={col.key} className="p-3 bg-white hover:bg-blue-50/20 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-xs text-gray-950">{col.label}</span>
                                            <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                                                {col.key}
                                            </span>
                                            <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-medium">
                                                {col.type}
                                            </span>
                                            {col.multiple && (
                                                <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-semibold">
                                                    Multi-valeurs
                                                </span>
                                            )}
                                            {col.table_ref && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">
                                                    <Link2 className="w-2.5 h-2.5 text-indigo-600" />
                                                    Source: {col.table_ref}
                                                </span>
                                            )}
                                            {col.required && (
                                                <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-semibold">
                                                    Obligatoire
                                                </span>
                                            )}
                                        </div>
                                        {col.description && (
                                            <p className="text-[11px] text-gray-500">{col.description}</p>
                                        )}
                                        {col.options && col.options.length > 0 && !col.table_ref && (
                                            <p className="text-[11px] text-gray-400">
                                                Options: {col.options.join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditColumn(col)}
                                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Modifier
                                        </button>
                                        {col.key !== 'id' && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteColumn(col.key, col.label)}
                                                className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition flex items-center gap-1 cursor-pointer"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Supprimer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setShowManageColumnsModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Edit Column */}
            {showEditColumnModal && editingColumn && currentTable && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80">
                            <div className="flex items-center gap-2 font-bold text-gray-950 text-base">
                                <Edit2 className="w-5 h-5 text-[#002395]" />
                                Modifier la colonne '{editingColumn.label}'
                            </div>
                            <button onClick={() => { setShowEditColumnModal(false); setEditingColumn(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditColumn} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto flex-1 space-y-3 min-h-0">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Libellé de la colonne *</label>
                                <input
                                    type="text"
                                    value={editColLabel}
                                    onChange={e => setEditColLabel(e.target.value)}
                                    placeholder="Ex: Responsable d'astreinte"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Clé technique (champ)</label>
                                <input
                                    type="text"
                                    value={editingColumn.key}
                                    disabled
                                    className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-lg p-2 text-xs font-mono cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Type de donnée</label>
                                <select
                                    value={editColType}
                                    onChange={e => setEditColType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    <option value="text">Texte libre</option>
                                    <option value="number">Nombre</option>
                                    <option value="select">Liste de sélection</option>
                                    <option value="boolean">Booléen (Oui/Non)</option>
                                    <option value="email">Email</option>
                                </select>
                            </div>

                            {editColType === 'select' && (
                                <div className="space-y-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source des données de sélection</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEditColSourceType('table')}
                                                className={`p-2 rounded-lg border text-left text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${editColSourceType === 'table' ? 'bg-[#002395] text-white border-[#002395] shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <Link2 className="w-3.5 h-3.5" />
                                                <span>Table de référence</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditColSourceType('custom')}
                                                className={`p-2 rounded-lg border text-left text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition ${editColSourceType === 'custom' ? 'bg-[#002395] text-white border-[#002395] shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <Sliders className="w-3.5 h-3.5" />
                                                <span>Options manuelles</span>
                                            </button>
                                        </div>
                                    </div>

                                    {editColSourceType === 'table' ? (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Table source liée *</label>
                                            <select
                                                value={editColTableRef}
                                                onChange={e => setEditColTableRef(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            >
                                                {tables.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} ({t.id}) — {t.rows_count} lignes
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Options (séparées par une virgule)</label>
                                            <input
                                                type="text"
                                                value={editColOptions}
                                                onChange={e => setEditColOptions(e.target.value)}
                                                placeholder="Option 1, Option 2, Option 3"
                                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Aide</label>
                                <input
                                    type="text"
                                    value={editColDescription}
                                    onChange={e => setEditColDescription(e.target.value)}
                                    placeholder="Explication ou directive de saisie..."
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="cb-edit-col-req"
                                        checked={editColRequired}
                                        onChange={e => setEditColRequired(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <label htmlFor="cb-edit-col-req" className="text-xs text-gray-700 font-medium cursor-pointer">
                                        Champ obligatoire lors de la saisie
                                    </label>
                                </div>

                                <div className="flex items-start gap-2 bg-purple-50/60 p-2.5 rounded-lg border border-purple-200/80">
                                    <input
                                        type="checkbox"
                                        id="cb-edit-col-multiple"
                                        checked={editColMultiple}
                                        onChange={e => setEditColMultiple(e.target.checked)}
                                        className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 mt-0.5"
                                    />
                                    <label htmlFor="cb-edit-col-multiple" className="text-xs text-purple-950 font-medium cursor-pointer">
                                        <span className="font-bold text-purple-900 block">Autoriser les valeurs multiples (Multi-valeurs)</span>
                                        <span className="text-[11px] text-purple-700 block mt-0.5">
                                            Permet d'assigner plusieurs choix à un même enregistrement.
                                        </span>
                                    </label>
                                </div>
                            </div>
                            </div>

                            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditColumnModal(false); setEditingColumn(null); }}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    Enregistrer la Colonne
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* In-app Deletion Confirmation Modal (Safe against iframe window.confirm blocking) */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl border border-gray-100 space-y-4 my-auto">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 leading-snug">
                                    {deleteModal.title}
                                </h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {deleteModal.message}
                                </p>
                            </div>
                        </div>

                        {deleteModal.type === 'column' && (
                            <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    Impact opérationnel
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    La colonne <strong>{deleteModal.colLabel}</strong> (clé : <code className="font-mono text-[10px] bg-amber-100/70 px-1 py-0.5 rounded">{deleteModal.colKey}</code>) sera retirée du schéma de la table et des formulaires associés.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteAction}
                                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Confirmer la suppression
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
