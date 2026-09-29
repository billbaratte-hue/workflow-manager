import React, { useState, useMemo } from 'react';
import {
    Table as TableIcon,
    Plus,
    Edit2,
    Edit3,
    Trash2,
    Search,
    Download,
    Sliders,
    SlidersHorizontal,
    CheckSquare,
    Eye,
    Tag,
    Tags,
    Bookmark,
    FolderTree,
    Link2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    X,
    Filter,
    Shield,
    Sparkles,
    Check,
    Upload
} from 'lucide-react';
import { CustomTable, TableColumn, TableMetadataField } from '../types';
import { useFeatures } from '../context/FeaturesContext';

interface SchemaDrivenTableProps {
    table: CustomTable;
    referencedTablesData?: Record<string, any[]>;
    onAddRow: () => void;
    onEditRow: (row: any) => void;
    onDeleteRow: (rowId: number | string) => void;
    onAddColumn: () => void;
    onManageColumns: () => void;
    onEditColumn: (column: TableColumn) => void;
    onDeleteColumn: (columnKey: string, columnLabel: string) => void;
    onEditTable: () => void;
    onDeleteTable?: (tableId: string) => void;
    onExportCsv?: () => void;
    onImportCsv?: () => void;
    onManageMetadataFields: () => void;
    onUpdateTableMetadata?: (updatedMetadata: Record<string, any>) => Promise<void>;
    onQuickToggleMultiple?: () => void;
    onQuickToggleShowInForms?: () => void;
    getTableIcon?: (iconName?: string) => React.ReactNode;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
};

export default function SchemaDrivenTable({
    table,
    referencedTablesData = {},
    onAddRow,
    onEditRow,
    onDeleteRow,
    onAddColumn,
    onManageColumns,
    onEditColumn,
    onDeleteColumn,
    onEditTable,
    onDeleteTable,
    onExportCsv,
    onImportCsv,
    onManageMetadataFields,
    onUpdateTableMetadata,
    onQuickToggleMultiple,
    onQuickToggleShowInForms,
    getTableIcon
}: SchemaDrivenTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumnKey, setSortColumnKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

    // Inline tag adding state for table-level metadata
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');

    const { isFeatureEnabled } = useFeatures();
    const isMetadataEnabled = isFeatureEnabled('metadata_schema');
    const isExportCsvEnabled = isFeatureEnabled('export_csv_advanced');

    const metadataFields = isMetadataEnabled ? (table.metadata_fields || []) : [];
    const tableMetadata = table.metadata || {};

    // Row-applicable metadata fields
    const rowMetadataFields = useMemo(() => {
        return metadataFields.filter(f => f.target === 'row' || f.target === 'both' || !f.target);
    }, [metadataFields]);

    // Table-applicable metadata fields
    const tableLevelFields = useMemo(() => {
        return metadataFields.filter(f => f.target === 'table' || f.target === 'both');
    }, [metadataFields]);

    // Gather all distinct tags across rows for quick filtering
    const allRowTags = useMemo(() => {
        const tagSet = new Set<string>();
        if (Array.isArray(table.rows)) {
            table.rows.forEach(r => {
                metadataFields.forEach(f => {
                    if (f.type === 'tags' && Array.isArray(r[f.key])) {
                        r[f.key].forEach((t: string) => {
                            if (typeof t === 'string' && t.trim()) tagSet.add(t.trim());
                        });
                    }
                });
            });
        }
        return Array.from(tagSet);
    }, [table.rows, metadataFields]);

    // Filtering & Sorting
    const filteredRows = useMemo(() => {
        let rows = [...(table.rows || [])];

        // Search text filter
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase().trim();
            rows = rows.filter(row => {
                // Check normal columns
                for (const col of table.columns) {
                    const val = row[col.key];
                    if (val !== undefined && val !== null) {
                        if (String(val).toLowerCase().includes(lower)) return true;
                    }
                }
                // Check metadata fields
                for (const meta of rowMetadataFields) {
                    const val = row[meta.key];
                    if (Array.isArray(val)) {
                        if (val.some(v => String(v).toLowerCase().includes(lower))) return true;
                    } else if (val !== undefined && val !== null) {
                        if (String(val).toLowerCase().includes(lower)) return true;
                    }
                }
                return false;
            });
        }

        // Tag filter
        if (selectedTagFilter) {
            rows = rows.filter(row => {
                return metadataFields.some(f => {
                    if (f.type === 'tags' && Array.isArray(row[f.key])) {
                        return row[f.key].includes(selectedTagFilter);
                    }
                    return false;
                });
            });
        }

        // Sort
        if (sortColumnKey) {
            rows.sort((a, b) => {
                const valA = a[sortColumnKey];
                const valB = b[sortColumnKey];
                if (valA === valB) return 0;
                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                }
                return sortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB), 'fr')
                    : String(valB).localeCompare(String(valA), 'fr');
            });
        }

        return rows;
    }, [table.rows, table.columns, rowMetadataFields, metadataFields, searchTerm, selectedTagFilter, sortColumnKey, sortDirection]);

    const handleSort = (key: string) => {
        if (sortColumnKey === key) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else {
                setSortColumnKey(null);
                setSortDirection('asc');
            }
        } else {
            setSortColumnKey(key);
            setSortDirection('asc');
        }
    };

    // Table metadata helpers
    const handleAddTableTag = async (tagFieldKey: string) => {
        if (!newTagInput.trim() || !onUpdateTableMetadata) return;
        const currentTags: string[] = Array.isArray(tableMetadata[tagFieldKey]) ? [...tableMetadata[tagFieldKey]] : [];
        const formattedTag = newTagInput.trim();
        if (!currentTags.includes(formattedTag)) {
            currentTags.push(formattedTag);
            await onUpdateTableMetadata({
                ...tableMetadata,
                [tagFieldKey]: currentTags
            });
        }
        setNewTagInput('');
        setIsAddingTag(false);
    };

    const handleRemoveTableTag = async (tagFieldKey: string, tagToRemove: string) => {
        if (!onUpdateTableMetadata) return;
        const currentTags: string[] = Array.isArray(tableMetadata[tagFieldKey]) ? [...tableMetadata[tagFieldKey]] : [];
        const updated = currentTags.filter(t => t !== tagToRemove);
        await onUpdateTableMetadata({
            ...tableMetadata,
            [tagFieldKey]: updated
        });
    };

    const handleClearTableMetaValue = async (fieldKey: string) => {
        if (!onUpdateTableMetadata) return;
        const updated = { ...tableMetadata };
        delete updated[fieldKey];
        await onUpdateTableMetadata(updated);
    };

    // Comprehensive schema-driven CSV export
    const handleExportCsvInternal = () => {
        if (onExportCsv) {
            onExportCsv();
            return;
        }

        if (!table || !Array.isArray(table.rows)) return;
        const cols = table.columns || [];
        const metaFields = (table.metadata_fields || []).filter(
            f => f.target === 'row' || f.target === 'both' || !f.target
        );

        const headers = [
            ...cols.map(c => c.label || c.key),
            ...metaFields.map(f => `[Méta] ${f.label || f.key}`)
        ];

        const escapeCsvCell = (val: any): string => {
            if (val === undefined || val === null) return '""';
            if (Array.isArray(val)) {
                return `"${val.map(v => typeof v === 'object' ? (v.label || v.name || JSON.stringify(v)) : String(v)).join(', ').replace(/"/g, '""')}"`;
            }
            if (typeof val === 'boolean') {
                return val ? '"Oui"' : '"Non"';
            }
            if (typeof val === 'object') {
                return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            }
            return `"${String(val).replace(/"/g, '""')}"`;
        };

        const rowsSource = filteredRows.length > 0 || searchTerm || selectedTagFilter ? filteredRows : table.rows;

        const csvLines = rowsSource.map(row => {
            const colValues = cols.map(col => {
                if (col.type === 'select' && col.table_ref && referencedTablesData[col.table_ref]) {
                    const refList = referencedTablesData[col.table_ref];
                    const rawVal = row[col.key];
                    if (Array.isArray(rawVal)) {
                        const resolvedLabels = rawVal.map(id => {
                            const found = refList.find((item: any) => String(item.id) === String(id) || item.name === id || item.code === id);
                            return found ? (found.name || found.label || found.code || id) : id;
                        });
                        return resolvedLabels.join(', ');
                    } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                        const found = refList.find((item: any) => String(item.id) === String(rawVal) || item.name === rawVal || item.code === rawVal);
                        return found ? (found.name || found.label || found.code || rawVal) : rawVal;
                    }
                }
                return row[col.key];
            });

            const metaValues = metaFields.map(f => row[f.key]);
            return [...colValues, ...metaValues].map(escapeCsvCell).join(';');
        });

        const headerLine = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';');
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headerLine + '\n' + csvLines.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${table.id || 'table'}_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header: Table Info & Primary Controls */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                            {getTableIcon ? getTableIcon(table.icon) : <TableIcon className="w-5 h-5 text-[#002395]" />}
                            {table.name}
                        </h2>
                        <span className="text-[11px] font-mono bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                            ID: {table.id}
                        </span>
                        {table.is_system ? (
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                                Système (Intégré)
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                Personnalisée
                            </span>
                        )}
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Catégorie: {table.category || 'Général'}
                        </span>
                        {metadataFields.length > 0 && (
                            <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Bookmark className="w-2.5 h-2.5" />
                                {metadataFields.length} métadonnée(s)
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-600">{table.description}</p>
                </div>

                {/* Table Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        id="btn-add-row"
                        onClick={onAddRow}
                        className="bg-[#002395] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter une ligne
                    </button>
                    
                    {/* Metadata Definition Modal Trigger */}
                    {isMetadataEnabled && onManageMetadataFields && (
                        <button
                            id="btn-manage-metadata"
                            onClick={onManageMetadataFields}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="Ajouter, modifier ou supprimer des métadonnées (tags, catégories) sur cette table"
                        >
                            <Bookmark className="w-3.5 h-3.5 text-purple-700" />
                            Gérer les métadonnées ({metadataFields.length})
                        </button>
                    )}

                    <button
                        id="btn-edit-table"
                        onClick={onEditTable}
                        className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Modifier le nom, la description ou les paramètres de cette table"
                    >
                        <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                        Paramètres Table
                    </button>

                    <button
                        id="btn-manage-columns"
                        onClick={onManageColumns}
                        className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Gérer, configurer ou supprimer les colonnes de cette table"
                    >
                        <Sliders className="w-3.5 h-3.5 text-gray-500" />
                        Gérer les colonnes ({table.columns.length})
                    </button>

                    <button
                        id="btn-add-col"
                        onClick={onAddColumn}
                        className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5 text-gray-500" />
                        Ajouter une colonne
                    </button>

                    {isExportCsvEnabled ? (
                        <button
                            id="btn-export-csv"
                            type="button"
                            onClick={handleExportCsvInternal}
                            className="bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 border border-gray-300 hover:border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                            title="Exporter l'ensemble des données de la table au format CSV (compatible Excel)"
                        >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Exporter en CSV</span>
                        </button>
                    ) : (
                        <button
                            id="btn-export-csv-disabled"
                            type="button"
                            disabled
                            className="bg-gray-100 text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
                            title="Le module d'exportation CSV est actuellement désactivé par l'administrateur"
                        >
                            <Download className="w-3.5 h-3.5 text-gray-400" />
                            <span>Export CSV désactivé</span>
                        </button>
                    )}

                    {onImportCsv && (
                        <button
                            id="btn-import-csv"
                            type="button"
                            onClick={onImportCsv}
                            className="bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-900 border border-gray-300 hover:border-blue-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                            title="Importer des données en masse via un fichier CSV avec mapping des colonnes"
                        >
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            <span>Importer CSV</span>
                        </button>
                    )}

                    {!table.is_system && onDeleteTable && (
                        <button
                            id="btn-delete-table"
                            onClick={() => onDeleteTable(table.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                            title="Supprimer définitivement cette table"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Live Custom Metadata Attributes & Tags Banner */}
            {isMetadataEnabled && (
                <div className="px-5 py-2.5 bg-purple-50/40 border-b border-purple-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 font-bold text-purple-950">
                            <Tag className="w-3.5 h-3.5 text-purple-700" />
                            <span>Métadonnées Définies :</span>
                        </div>

                        {metadataFields.length === 0 ? (
                            <div className="flex items-center gap-2 text-gray-500 italic text-[11px]">
                                <span>Aucun champ de métadonnées configuré.</span>
                                <button
                                    type="button"
                                    onClick={onManageMetadataFields}
                                    className="text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-1 not-italic"
                                >
                                    <Plus className="w-3 h-3" />
                                    Définir des tags ou catégories
                                </button>
                            </div>
                        ) : (
                            tableLevelFields.map(field => {
                                const val = tableMetadata[field.key];
                                const color = COLOR_MAP[field.colorScheme || 'purple'] || COLOR_MAP.purple;

                                if (field.type === 'tags') {
                                    const tagsList: string[] = Array.isArray(val) ? val : [];
                                    return (
                                        <div key={field.key} className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-semibold text-gray-600">
                                                {field.label} :
                                            </span>
                                            {tagsList.map(t => (
                                                <span
                                                    key={t}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${color.bg} ${color.text} ${color.border}`}
                                                >
                                                    #{t}
                                                    {onUpdateTableMetadata && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveTableTag(field.key, t)}
                                                            className="hover:opacity-75 cursor-pointer ml-0.5"
                                                            title={`Retirer le tag '${t}'`}
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </span>
                                            ))}

                                            {/* Inline tag adder */}
                                            {onUpdateTableMetadata && (
                                                isAddingTag ? (
                                                    <div className="inline-flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={newTagInput}
                                                            onChange={e => setNewTagInput(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddTableTag(field.key);
                                                                } else if (e.key === 'Escape') {
                                                                    setIsAddingTag(false);
                                                                }
                                                            }}
                                                            placeholder="Nouveau tag..."
                                                            autoFocus
                                                            className="px-1.5 py-0.5 border border-purple-300 rounded text-[11px] w-24 outline-hidden focus:ring-1 focus:ring-purple-600 bg-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddTableTag(field.key)}
                                                            className="text-purple-700 hover:text-purple-900 p-0.5 cursor-pointer"
                                                            title="Confirmer"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsAddingTag(false)}
                                                            className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingTag(true)}
                                                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-700 hover:text-purple-900 px-1.5 py-0.5 rounded border border-dashed border-purple-300 hover:bg-purple-100/50 cursor-pointer"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" />
                                                        Tag
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    );
                                }

                                // Category, Badge, or Text: if empty, hide tag completely
                                const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
                                if (!hasVal) return null;

                                return (
                                    <div key={field.key} className="inline-flex items-center gap-1 text-[11px]">
                                        <span className="font-semibold text-gray-600">{field.label}:</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${color.bg} ${color.text} ${color.border}`}>
                                            <span>{String(val)}</span>
                                            {onUpdateTableMetadata && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleClearTableMetaValue(field.key)}
                                                    className="text-gray-400 hover:text-red-700 p-0.5 rounded transition cursor-pointer"
                                                    title={`Supprimer la valeur de ${field.label}`}
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onManageMetadataFields}
                        className="text-purple-800 hover:text-purple-950 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer ml-auto"
                    >
                        <Sliders className="w-3 h-3" />
                        Configurer les attributs de métadonnées
                    </button>
                </div>
            )}

            {/* Configuration Toolbar Banner: Form Behavior & Multi-Selection */}
            <div className="px-5 py-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <SlidersHorizontal className="w-4 h-4 text-[#002395]" />
                        <span>Paramétrage Applicatif :</span>
                    </div>

                    {/* Quick toggle Multi-Selection */}
                    {onQuickToggleMultiple && (
                        <button
                            id="btn-quick-toggle-multiple"
                            onClick={onQuickToggleMultiple}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs border transition cursor-pointer ${table.allow_multiple ? 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                            title="Cliquer pour activer ou désactiver la sélection multiple dans les formulaires"
                        >
                            <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                            Multi-Sélection : {table.allow_multiple ? 'ACTIVÉE (Multi-choix)' : 'DÉSACTIVÉE (Sélection unique)'}
                        </button>
                    )}

                    {/* Grouping Column pill */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs border ${table.grouping_column ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        Regroupement : <strong className="font-mono">{table.grouping_column || 'Aucun'}</strong>
                    </span>

                    {/* Form visibility toggle */}
                    {onQuickToggleShowInForms && (
                        <button
                            id="btn-quick-toggle-form"
                            onClick={onQuickToggleShowInForms}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs border transition cursor-pointer ${table.show_in_forms !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                            title="Cliquer pour afficher ou masquer ce champ dans les formulaires"
                        >
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            Formulaires : {table.show_in_forms !== false ? 'Affiché' : 'Masqué'}
                        </button>
                    )}

                    {table.form_field_label && (
                        <span className="text-gray-600 hidden xl:inline">
                            Libellé formulaire : <strong>« {table.form_field_label} »</strong>
                        </span>
                    )}
                </div>

                <button
                    onClick={onEditTable}
                    className="text-[#002395] hover:text-blue-900 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer ml-auto"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modifier la configuration
                </button>
            </div>

            {/* Search, Tag Filtering, & Statistics */}
            <div className="p-3.5 bg-white border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Rechercher colonnes, tags..."
                            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Quick filter by tag pills if tags exist */}
                    {allRowTags.length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0 flex items-center gap-1">
                                <Filter className="w-3 h-3" />
                                Filtrer tag :
                            </span>
                            {selectedTagFilter && (
                                <button
                                    onClick={() => setSelectedTagFilter(null)}
                                    className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold hover:bg-gray-300 flex items-center gap-1 shrink-0"
                                >
                                    Tous
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {allRowTags.slice(0, 6).map(tag => {
                                const isSelected = selectedTagFilter === tag;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition shrink-0 cursor-pointer ${isSelected ? 'bg-[#002395] text-white border-[#002395]' : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'}`}
                                    >
                                        #{tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0 flex-wrap">
                    <div className="text-xs text-gray-500 font-medium">
                        Affichage de <span className="font-bold text-gray-900">{filteredRows.length}</span> sur <span className="font-bold text-gray-900">{table.rows?.length || 0}</span> ligne(s) • <span className="text-gray-700">{table.columns?.length || 0} colonnes</span>
                        {rowMetadataFields.length > 0 && (
                            <span> • <strong className="text-purple-700">+{rowMetadataFields.length} métadonnée(s)</strong></span>
                        )}
                    </div>
                    {isExportCsvEnabled && (
                        <button
                            type="button"
                            id="btn-quick-export-csv"
                            onClick={handleExportCsvInternal}
                            className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200 transition cursor-pointer"
                            title="Exporter les données affichées au format CSV (compatible Excel)"
                        >
                            <Download className="w-3 h-3 text-emerald-600" />
                            <span>Exporter en CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Schema-Driven Dynamic Data Grid */}
            <div className="overflow-x-auto min-h-[320px] flex-1">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-[11px]">
                            {/* ID Header */}
                            <th
                                onClick={() => handleSort('id')}
                                className="p-3 w-16 text-center cursor-pointer hover:bg-gray-200/60 transition select-none"
                            >
                                <div className="flex items-center justify-center gap-1">
                                    <span># ID</span>
                                    {sortColumnKey === 'id' ? (
                                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-700" /> : <ArrowDown className="w-3 h-3 text-blue-700" />
                                    ) : (
                                        <ArrowUpDown className="w-2.5 h-2.5 text-gray-400 opacity-50" />
                                    )}
                                </div>
                            </th>

                            {/* Standard Dynamic Columns */}
                            {table.columns.map((col: TableColumn) => (
                                <th
                                    key={col.key}
                                    className="p-3 group hover:bg-gray-200/50 transition-colors select-none"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div
                                            onClick={() => handleSort(col.key)}
                                            className="flex items-center gap-1.5 flex-wrap cursor-pointer"
                                        >
                                            <span className="font-bold">{col.label}</span>
                                            <span className="text-[10px] text-gray-400 font-mono font-normal">
                                                ({col.type})
                                            </span>
                                            {col.multiple && (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-semibold" title="Accepte plusieurs valeurs simultanées">
                                                    Multi
                                                </span>
                                            )}
                                            {col.table_ref && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium" title={`Lié à la table '${col.table_ref}'`}>
                                                    <Link2 className="w-2.5 h-2.5 text-indigo-600" />
                                                    {col.table_ref}
                                                </span>
                                            )}
                                            {col.required && <span className="text-red-500 font-bold" title="Obligatoire">*</span>}
                                            {sortColumnKey === col.key ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-700" /> : <ArrowDown className="w-3 h-3 text-blue-700" />
                                            ) : null}
                                        </div>

                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onEditColumn(col)}
                                                className="p-1 hover:bg-blue-100 text-gray-400 hover:text-blue-700 rounded transition cursor-pointer"
                                                title={`Modifier la colonne '${col.label}'`}
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            {col.key !== 'id' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteColumn(col.key, col.label)}
                                                    className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded transition cursor-pointer"
                                                    title={`Supprimer la colonne '${col.label}'`}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </th>
                            ))}

                            {/* Schema-Driven Custom Metadata Fields Columns */}
                            {rowMetadataFields.map(meta => {
                                const color = COLOR_MAP[meta.colorScheme || 'purple'] || COLOR_MAP.purple;
                                return (
                                    <th
                                        key={`meta_${meta.key}`}
                                        className="p-3 bg-purple-50/50 border-l border-purple-100 group select-none"
                                    >
                                        <div className="flex items-center justify-between gap-1.5">
                                            <div
                                                onClick={() => handleSort(meta.key)}
                                                className="flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Bookmark className="w-3 h-3 text-purple-700 shrink-0" />
                                                <span className="font-bold text-purple-950">{meta.label}</span>
                                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-normal ${color.bg} ${color.text}`}>
                                                    {meta.type}
                                                </span>
                                                {sortColumnKey === meta.key && (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-700" /> : <ArrowDown className="w-3 h-3 text-purple-700" />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={onManageMetadataFields}
                                                className="opacity-0 group-hover:opacity-100 text-purple-600 hover:text-purple-900 p-0.5 cursor-pointer"
                                                title="Gérer ce champ de métadonnées"
                                            >
                                                <Sliders className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}

                            <th className="p-3 text-right w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={table.columns.length + rowMetadataFields.length + 2}
                                    className="p-10 text-center text-gray-400 text-xs italic"
                                >
                                    <div className="space-y-2">
                                        <p>Aucun enregistrement ne correspond aux critères de recherche ou de filtre.</p>
                                        <button
                                            type="button"
                                            onClick={onAddRow}
                                            className="inline-flex items-center gap-1 text-xs text-[#002395] font-bold hover:underline cursor-pointer not-italic"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Ajouter une première ligne
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row: any, idx: number) => (
                                <tr key={row.id || idx} className="hover:bg-blue-50/40 transition">
                                    {/* ID cell */}
                                    <td className="p-3 text-center font-mono text-gray-400 font-semibold">
                                        {row.id}
                                    </td>

                                    {/* Dynamic Standard Columns */}
                                    {table.columns.map((col: TableColumn) => {
                                        const val = row[col.key];
                                        return (
                                            <td key={col.key} className="p-3 text-gray-800">
                                                {Array.isArray(val) ? (
                                                    <div className="flex flex-wrap gap-1 items-center max-w-sm">
                                                        {val.length === 0 ? (
                                                            <span className="text-gray-400 italic text-[11px]">—</span>
                                                        ) : (
                                                            val.map((item: any, i: number) => (
                                                                <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                                                    {col.table_ref && <Link2 className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                                                                    <span>{String(item)}</span>
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : col.type === 'boolean' ? (
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                                                        {val ? 'Oui' : 'Non'}
                                                    </span>
                                                ) : col.type === 'select' ? (
                                                    col.table_ref ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-indigo-50/80 text-indigo-950 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-medium" title={`Table liée: ${col.table_ref}`}>
                                                            <Link2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                                            <span className="truncate max-w-[200px]">{val || '—'}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-50 text-blue-900 border border-blue-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                                            {val || '—'}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="line-clamp-2 max-w-xs">{val !== undefined && val !== null ? String(val) : '—'}</span>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {/* Dynamic Metadata Fields Columns */}
                                    {rowMetadataFields.map(meta => {
                                        const val = row[meta.key];
                                        const color = COLOR_MAP[meta.colorScheme || 'purple'] || COLOR_MAP.purple;

                                        return (
                                            <td key={`meta_${meta.key}`} className="p-3 bg-purple-50/20 border-l border-purple-100">
                                                {meta.type === 'tags' ? (
                                                    Array.isArray(val) && val.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 items-center max-w-xs">
                                                            {val.map((tagItem: string, ti: number) => (
                                                                <span
                                                                    key={ti}
                                                                    onClick={() => setSelectedTagFilter(tagItem)}
                                                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${color.bg} ${color.text} ${color.border} cursor-pointer hover:opacity-80`}
                                                                    title="Cliquer pour filtrer par ce tag"
                                                                >
                                                                    #{tagItem}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 italic text-[11px]">—</span>
                                                    )
                                                ) : meta.type === 'badge' ? (
                                                    val ? (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${color.bg} ${color.text} ${color.border}`}>
                                                            {String(val)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 italic text-[11px]">—</span>
                                                    )
                                                ) : meta.type === 'category' ? (
                                                    val ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-200">
                                                            <FolderTree className="w-2.5 h-2.5 text-blue-600" />
                                                            {String(val)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 italic text-[11px]">—</span>
                                                    )
                                                ) : meta.type === 'boolean' ? (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                                        {val ? 'Oui' : 'Non'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-800">{val !== undefined && val !== null ? String(val) : '—'}</span>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {/* Action buttons */}
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => onEditRow(row)}
                                                className="p-1 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                                title="Modifier cette ligne"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteRow(row.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                                title="Supprimer cette ligne"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
