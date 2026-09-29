import React, { useState, useEffect } from 'react';
import {
    Table,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Columns,
    Database,
    HelpCircle,
    Info,
    Shield,
    Sparkles,
    Layers,
    ListPlus,
    ChevronDown,
    Building,
    Key,
    Train,
    Users,
    Sliders,
    Tag,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { TableColumn, CustomTable } from '../types';
import { deleteTableColumn } from '../lib/api';

interface ReferentielTypeManagerProps {
    isOpen?: boolean;
    onClose?: () => void;
    onCreated: (newTable: CustomTable) => void;
    initialTable?: CustomTable | null;
    embedded?: boolean;
}

const CATEGORIES = [
    { value: 'Organisation', label: 'Organisation & Équipes' },
    { value: 'Infrastructure', label: 'Infrastructure & Sites' },
    { value: 'Sécurité', label: 'Sécurité & Habilitations' },
    { value: 'Matériel', label: 'Matériel & Équipements' },
    { value: 'Prestataires', label: 'Prestataires & Tiers' },
    { value: 'Personnalisé', label: 'Personnalisé / Métier' }
];

const ICONS = [
    { value: 'fas fa-table', label: 'Table Standard' },
    { value: 'fas fa-building', label: 'Bâtiment / Sites' },
    { value: 'fas fa-key', label: 'Clés & Mécatronique' },
    { value: 'fas fa-train', label: 'Ferroviaire & Voies' },
    { value: 'fas fa-users', label: 'Personnels & Équipes' },
    { value: 'fas fa-shield-alt', label: 'Sécurité & Accès' },
    { value: 'fas fa-sitemap', label: 'Organigramme' },
    { value: 'fas fa-tag', label: 'Étiquette / Référence' },
    { value: 'fas fa-sliders-h', label: 'Configuration' }
];

const COLUMN_TYPES: Array<{ value: TableColumn['type']; label: string; description: string; icon: string }> = [
    { value: 'text', label: 'Texte Court', description: 'Chaîne de caractères libre', icon: 'Aa' },
    { value: 'number', label: 'Nombre / Numérique', description: 'Valeur entière ou décimale', icon: '123' },
    { value: 'select', label: 'Liste Déroulante (Choix)', description: 'Choix parmi des options prédéfinies', icon: '▼' },
    { value: 'date', label: 'Date', description: 'Date calendaire (JJ/MM/AAAA)', icon: '📅' },
    { value: 'boolean', label: 'Booléen (Oui / Non)', description: 'Case à cocher binaire', icon: '✓' },
    { value: 'email', label: 'Email', description: 'Adresse de messagerie valide', icon: '@' }
];

export default function ReferentielTypeManager({
    isOpen = true,
    onClose,
    onCreated,
    initialTable,
    embedded = false
}: ReferentielTypeManagerProps) {
    const isEditMode = !!initialTable;

    // Table general info
    const [name, setName] = useState('');
    const [idSlug, setIdSlug] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Organisation');
    const [icon, setIcon] = useState('fas fa-table');
    const [showInForms, setShowInForms] = useState(true);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [formFieldLabel, setFormFieldLabel] = useState('');
    const [formHelpText, setFormHelpText] = useState('');
    const [isRequired, setIsRequired] = useState(false);

    // Columns structure
    const [columns, setColumns] = useState<TableColumn[]>([
        { key: 'code', label: 'Code Identifiant', type: 'text', required: true, description: 'Code de référence unique' },
        { key: 'name', label: 'Libellé / Nom', type: 'text', required: true, description: 'Désignation complète' },
        { key: 'description', label: 'Description', type: 'text', required: false, description: 'Détails complémentaires' }
    ]);

    // Active column editor state
    const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
    const [colLabel, setColLabel] = useState('');
    const [colKey, setColKey] = useState('');
    const [colType, setColType] = useState<TableColumn['type']>('text');
    const [colRequired, setColRequired] = useState(false);
    const [colOptionsInput, setColOptionsInput] = useState('');
    const [colDescription, setColDescription] = useState('');
    const [showColumnForm, setShowColumnForm] = useState(false);

    // Initial rows (for sample data)
    const [sampleCode, setSampleCode] = useState('');
    const [sampleName, setSampleName] = useState('');

    // Feedback & loading
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const token = localStorage.getItem('token');

    // Populate when opened in edit or create mode
    useEffect(() => {
        if (!isOpen && !embedded) return;

        if (initialTable) {
            setName(initialTable.name || '');
            setIdSlug(initialTable.id || '');
            setDescription(initialTable.description || '');
            setCategory(initialTable.category || 'Organisation');
            setIcon(initialTable.icon || 'fas fa-table');
            setShowInForms(initialTable.show_in_forms !== false);
            setAllowMultiple(!!initialTable.allow_multiple);
            setFormFieldLabel(initialTable.form_field_label || '');
            setFormHelpText(initialTable.form_help_text || '');
            setIsRequired(!!initialTable.is_required);
            setColumns(initialTable.columns && initialTable.columns.length > 0 ? [...initialTable.columns] : [
                { key: 'code', label: 'Code Identifiant', type: 'text', required: true },
                { key: 'name', label: 'Libellé / Nom', type: 'text', required: true }
            ]);
        } else {
            // Reset for new creation
            setName('');
            setIdSlug('');
            setDescription('');
            setCategory('Organisation');
            setIcon('fas fa-table');
            setShowInForms(true);
            setAllowMultiple(false);
            setFormFieldLabel('');
            setFormHelpText('');
            setIsRequired(false);
            setColumns([
                { key: 'code', label: 'Code Identifiant', type: 'text', required: true, description: 'Code de référence unique' },
                { key: 'name', label: 'Libellé / Nom', type: 'text', required: true, description: 'Désignation complète' },
                { key: 'description', label: 'Description', type: 'text', required: false, description: 'Détails complémentaires' }
            ]);
            setSampleCode('');
            setSampleName('');
        }

        setShowColumnForm(false);
        setEditingColIndex(null);
        setErrorMsg(null);
    }, [isOpen, initialTable]);

    // Automatically generate slug from name if not manually modified
    const handleNameChange = (val: string) => {
        setName(val);
        if (!isEditMode) {
            const autoSlug = String(val || '')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9_-]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
            setIdSlug(autoSlug);
        }
    };

    // Auto generate column key from column label
    const handleColLabelChange = (val: string) => {
        setColLabel(val);
        if (editingColIndex === null) {
            const autoKey = String(val || '')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9_]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
            setColKey(autoKey);
        }
    };

    // Start adding a new column
    const handleStartAddColumn = () => {
        setEditingColIndex(null);
        setColLabel('');
        setColKey('');
        setColType('text');
        setColRequired(false);
        setColOptionsInput('');
        setColDescription('');
        setShowColumnForm(true);
    };

    // Start editing an existing column
    const handleStartEditColumn = (index: number) => {
        const col = columns[index];
        setEditingColIndex(index);
        setColLabel(col.label);
        setColKey(col.key);
        setColType(col.type);
        setColRequired(!!col.required);
        setColOptionsInput(col.options ? col.options.join(', ') : '');
        setColDescription(col.description || '');
        setShowColumnForm(true);
    };

    // Save column (add or update)
    const handleSaveColumn = () => {
        if (!colLabel.trim()) {
            setErrorMsg("Le libellé de la colonne est requis.");
            return;
        }

        const sanitizedKey = (colKey || colLabel)
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");

        if (!sanitizedKey) {
            setErrorMsg("La clé technique de la colonne est invalide.");
            return;
        }

        // Check duplicate key
        const duplicateIndex = columns.findIndex(
            (c, idx) => String(c.key || '').toLowerCase() === String(sanitizedKey || '').toLowerCase() && idx !== editingColIndex
        );
        if (duplicateIndex !== -1) {
            setErrorMsg(`Une colonne avec la clé technique '${sanitizedKey}' existe déjà.`);
            return;
        }

        const options = colType === 'select'
            ? colOptionsInput.split(',').map(s => s.trim()).filter(Boolean)
            : undefined;

        const newCol: TableColumn = {
            key: sanitizedKey,
            label: colLabel.trim(),
            type: colType,
            required: colRequired,
            options,
            description: colDescription.trim() || undefined
        };

        if (editingColIndex !== null) {
            const updated = [...columns];
            updated[editingColIndex] = newCol;
            setColumns(updated);
        } else {
            setColumns([...columns, newCol]);
        }

        setShowColumnForm(false);
        setEditingColIndex(null);
        setErrorMsg(null);
    };

    // Delete column
    const handleDeleteColumn = async (index: number) => {
        const col = columns[index];
        if (col.key === 'code' || col.key === 'name' || col.key === 'id') {
            if (!confirm(`La colonne '${col.label}' est une colonne clé usuelle. Êtes-vous certain de vouloir la supprimer ?`)) {
                return;
            }
        }
        if (isEditMode && initialTable?.id && col.key) {
            try {
                await deleteTableColumn(initialTable.id, col.key);
            } catch (err: any) {
                console.error("Erreur lors de la suppression de la colonne backend:", err);
                const msg = err.response?.data?.error || err.message || "Erreur lors de la suppression de la colonne.";
                setErrorMsg(msg);
                return;
            }
        }
        setColumns(columns.filter((_, idx) => idx !== index));
    };

    // Move column up/down
    const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === columns.length - 1)) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        const nextCols = [...columns];
        const temp = nextCols[index];
        nextCols[index] = nextCols[target];
        nextCols[target] = temp;
        setColumns(nextCols);
    };

    // Submit table creation / update
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!name.trim()) {
            setErrorMsg("Le nom du référentiel est obligatoire.");
            return;
        }

        if (columns.length === 0) {
            setErrorMsg("La structure de données doit comporter au moins une colonne.");
            return;
        }

        const slug = String(idSlug || name || '')
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");

        setSubmitting(true);

        try {
            const url = isEditMode ? `/api/v1/admin/tables/${initialTable.id}` : '/api/v1/admin/tables';
            const method = isEditMode ? 'PATCH' : 'POST';

            const payload: any = {
                id: slug,
                name: name.trim(),
                description: description.trim() || `Référentiel ${name.trim()}`,
                category,
                icon,
                show_in_forms: showInForms,
                allow_multiple: allowMultiple,
                form_field_label: formFieldLabel.trim() || name.trim(),
                form_help_text: formHelpText.trim(),
                is_required: isRequired,
                columns
            };

            // If creating and sample row provided
            if (!isEditMode && (sampleCode.trim() || sampleName.trim())) {
                payload.rows = [{
                    code: sampleCode.trim() || `${slug.toUpperCase().slice(0, 4)}-01`,
                    name: sampleName.trim() || `Exemple ${name.trim()}`
                }];
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                onCreated(data.table);
                onClose();
            } else {
                const errData = await res.json();
                setErrorMsg(errData.error || "Erreur lors de l'enregistrement en base de données.");
            }
        } catch (err: any) {
            setErrorMsg("Erreur de communication avec le serveur.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen && !embedded) return null;

    const modalOrInlineContent = (
        <div className={`bg-white rounded-2xl ${embedded ? 'w-full shadow-xs' : 'max-w-3xl w-full my-auto shadow-2xl max-h-[92vh] overflow-hidden'} border border-gray-200 flex flex-col animate-in fade-in`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-[#002395] px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                        <Database className="w-5 h-5 text-blue-200" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                                Base SQLite Dynamique
                            </span>
                            {isEditMode && (
                                <span className="text-[10px] font-mono bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-full">
                                    ID: {initialTable?.id}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-white mt-0.5">
                            {isEditMode ? `Modifier la Structure : ${initialTable?.name}` : 'Définir un Nouveau Type de Référentiel'}
                        </h2>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                        title="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Form Body with Tabs / Sections */}
            <form onSubmit={handleSubmit} className={`flex-1 ${embedded ? '' : 'overflow-y-auto'} p-6 space-y-6 text-sm`}>
                    {errorMsg && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1">{errorMsg}</div>
                            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Section 1: Informations Générales */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-xs uppercase tracking-wider">
                                <Table className="w-4 h-4 text-[#002395]" />
                                <span>1. Caractéristiques Générales</span>
                            </div>
                            <span className="text-[11px] text-gray-500">Nom & Métadonnées</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nom du Référentiel *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => handleNameChange(e.target.value)}
                                    placeholder="Ex: Centres de Maintenance, Types de Clés"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Identifiant Technique (Slug DB) *
                                </label>
                                <input
                                    type="text"
                                    value={idSlug}
                                    onChange={e => setIdSlug(e.target.value)}
                                    placeholder="ex: centres_maintenance"
                                    disabled={isEditMode}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    required
                                />
                                <span className="text-[10px] text-gray-400 mt-0.5 block">
                                    Clé unique stockée dans la table SQLite reference_tables
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Description Fonctionnelle *
                            </label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Précisez le rôle de ce référentiel, son périmètre métier et son usage..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Catégorie Métier
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Icône Représentative
                                </label>
                                <select
                                    value={icon}
                                    onChange={e => setIcon(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                >
                                    {ICONS.map(ic => (
                                        <option key={ic.value} value={ic.value}>{ic.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Structure de Données (Colonnes) */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-xs uppercase tracking-wider">
                                <Columns className="w-4 h-4 text-[#002395]" />
                                <span>2. Structure de Données (Colonnes du Référentiel)</span>
                            </div>
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                {columns.length} colonnes définies
                            </span>
                        </div>

                        <p className="text-xs text-gray-600">
                            Définissez la structure schématique des enregistrements. Chaque colonne spécifie un type de donnée stocké dynamiquement en base de données.
                        </p>

                        {/* Liste des colonnes définies */}
                        <div className="space-y-2">
                            {columns.map((col, idx) => (
                                <div
                                    key={`${col.key}-${idx}`}
                                    className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-blue-300 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-mono text-[11px] font-bold">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-gray-900">{col.label}</span>
                                                <code className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                    {col.key}
                                                </code>
                                                {col.required && (
                                                    <span className="text-[9px] font-bold uppercase bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                                        Obligatoire
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                                                <span className="font-medium text-blue-700">Type: {col.type}</span>
                                                {col.options && col.options.length > 0 && (
                                                    <span className="text-gray-400">
                                                        • Choix: [{col.options.slice(0, 3).join(', ')}{col.options.length > 3 ? '...' : ''}]
                                                    </span>
                                                )}
                                                {col.description && (
                                                    <span className="text-gray-400 italic">• {col.description}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 self-end sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveColumn(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                                            title="Monter"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveColumn(idx, 'down')}
                                            disabled={idx === columns.length - 1}
                                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                                            title="Descendre"
                                        >
                                            ▼
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStartEditColumn(idx)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Modifier cette colonne"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteColumn(idx)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Supprimer cette colonne"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bouton pour ajouter une colonne ou Formulaire d'édition de colonne */}
                        {!showColumnForm ? (
                            <button
                                type="button"
                                onClick={handleStartAddColumn}
                                className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-[#002395] hover:bg-blue-50/50 rounded-xl text-xs font-bold text-[#002395] flex items-center justify-center gap-2 transition"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Ajouter une Nouvelle Colonne à la Structure</span>
                            </button>
                        ) : (
                            <div className="bg-white border-2 border-blue-400 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                    <span className="font-bold text-xs text-[#002395] flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" />
                                        {editingColIndex !== null ? `Modifier la Colonne : ${columns[editingColIndex].label}` : 'Définition d\'une Nouvelle Colonne'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowColumnForm(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Libellé de la Colonne *
                                        </label>
                                        <input
                                            type="text"
                                            value={colLabel}
                                            onChange={e => handleColLabelChange(e.target.value)}
                                            placeholder="Ex: Statut Opérationnel, Capacité"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Clé Technique *
                                        </label>
                                        <input
                                            type="text"
                                            value={colKey}
                                            onChange={e => setColKey(e.target.value)}
                                            placeholder="ex: statut_operationnel"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Type de Données *
                                        </label>
                                        <select
                                            value={colType}
                                            onChange={e => setColType(e.target.value as TableColumn['type'])}
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                        >
                                            {COLUMN_TYPES.map(ct => (
                                                <option key={ct.value} value={ct.value}>
                                                    {ct.icon} {ct.label} - {ct.description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center pt-5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={colRequired}
                                                onChange={e => setColRequired(e.target.checked)}
                                                className="rounded text-[#002395] focus:ring-[#002395] h-4 w-4"
                                            />
                                            <span className="text-xs font-bold text-gray-700">
                                                Champ obligatoire (Requis)
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {colType === 'select' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Options prédéfinies de la liste déroulante (séparées par des virgules) *
                                        </label>
                                        <input
                                            type="text"
                                            value={colOptionsInput}
                                            onChange={e => setColOptionsInput(e.target.value)}
                                            placeholder="Ex: Actif, En maintenance, Réformé, Sous audit"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Aide / Description de la colonne
                                    </label>
                                    <input
                                        type="text"
                                        value={colDescription}
                                        onChange={e => setColDescription(e.target.value)}
                                        placeholder="Explication pour l'agent lors de la saisie..."
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowColumnForm(false)}
                                        className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveColumn}
                                        className="px-3 py-1.5 bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>{editingColIndex !== null ? 'Mettre à jour la colonne' : 'Valider la colonne'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Intégration Formulaires Portail */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-xs uppercase tracking-wider">
                                <Sliders className="w-4 h-4 text-[#002395]" />
                                <span>3. Intégration dans le Formulaire de Demande de Clés</span>
                            </div>
                            <span className="text-[11px] text-gray-500">Gouvernance Interne</span>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showInForms}
                                    onChange={e => setShowInForms(e.target.checked)}
                                    className="rounded text-[#002395] focus:ring-[#002395] h-4 w-4"
                                />
                                <span className="text-xs font-semibold text-gray-800">
                                    Proposer ce référentiel comme critère / sélection dans les demandes de clés
                                </span>
                            </label>

                            {showInForms && (
                                <div className="pl-6 space-y-3 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allowMultiple}
                                            onChange={e => setAllowMultiple(e.target.checked)}
                                            className="rounded text-[#002395] focus:ring-[#002395] h-4 w-4"
                                        />
                                        <span className="text-xs text-gray-700">
                                            Autoriser la sélection de plusieurs valeurs simultanément
                                        </span>
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-0.5">
                                                Libellé affiché dans le formulaire
                                            </label>
                                            <input
                                                type="text"
                                                value={formFieldLabel}
                                                onChange={e => setFormFieldLabel(e.target.value)}
                                                placeholder={name || 'Libellé du champ'}
                                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-0.5">
                                                Texte d'aide pour le demandeur
                                            </label>
                                            <input
                                                type="text"
                                                value={formHelpText}
                                                onChange={e => setFormHelpText(e.target.value)}
                                                placeholder="Ex: Sélectionnez les centres d'affectation..."
                                                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Exemple Initial (Optionnel pour création) */}
                    {!isEditMode && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                <div className="flex items-center gap-2 font-bold text-gray-900 text-xs uppercase tracking-wider">
                                    <ListPlus className="w-4 h-4 text-[#002395]" />
                                    <span>4. Premier Enregistrement Initial (Optionnel)</span>
                                </div>
                                <span className="text-[11px] text-gray-500">Exemple de données</span>
                            </div>

                            <p className="text-xs text-gray-600">
                                Vous pouvez initialiser directement votre table avec un premier enregistrement en base.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Code du premier enregistrement
                                    </label>
                                    <input
                                        type="text"
                                        value={sampleCode}
                                        onChange={e => setSampleCode(e.target.value)}
                                        placeholder="Ex: TECH-01"
                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Nom / Libellé de l'enregistrement
                                    </label>
                                    <input
                                        type="text"
                                        value={sampleName}
                                        onChange={e => setSampleName(e.target.value)}
                                        placeholder="Ex: Atelier Central Villeneuve"
                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer Actions */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Stockage persistant SQLite (table <code className="font-mono text-gray-700">reference_tables</code>)
                    </span>

                    <div className="flex items-center gap-2">
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition cursor-pointer"
                                disabled={submitting}
                            >
                                Annuler
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-5 py-2 bg-[#002395] hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Enregistrement en base...</span>
                                </>
                            ) : (
                                <>
                                    <Database className="w-4 h-4" />
                                    <span>{isEditMode ? 'Enregistrer les Modifications' : 'Créer & Persister le Référentiel'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
    );

    if (embedded) {
        return modalOrInlineContent;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {modalOrInlineContent}
        </div>
    );
}
