import React, { useState } from 'react';
import {
    Tag,
    Tags,
    FolderTree,
    Palette,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    AlertCircle,
    Sparkles,
    Sliders,
    Layers,
    Bookmark,
    Hash,
    HelpCircle,
    Info,
    Shield,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import Modal from './Modal';
import { TableMetadataField, MetadataFieldType } from '../types';

interface MetadataFieldsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: string;
    tableName: string;
    metadataFields: TableMetadataField[];
    onAddField: (field: Omit<TableMetadataField, 'key'> & { key?: string }) => Promise<void>;
    onUpdateField: (key: string, field: Partial<TableMetadataField>) => Promise<void>;
    onDeleteField: (key: string) => Promise<void>;
}

const COLOR_SCHEMES: Array<{ id: TableMetadataField['colorScheme']; label: string; bg: string; text: string; border: string }> = [
    { id: 'purple', label: 'Violet', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    { id: 'blue', label: 'Bleu', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    { id: 'emerald', label: 'Émeraude', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    { id: 'amber', label: 'Ambre / Jaune', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    { id: 'rose', label: 'Rose / Rouge', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
    { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    { id: 'gray', label: 'Ardoise / Gris', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
];

const PRESETS = [
    {
        title: 'Tags & Étiquettes Métier',
        description: 'Mots-clés multiples (ex: Prioritaire, LGV, Audit 2026, NIS2)',
        key: 'tags',
        label: 'Étiquettes / Tags',
        type: 'tags' as MetadataFieldType,
        target: 'both' as const,
        colorScheme: 'purple' as const,
        options: ['Prioritaire', 'Audit 2026', 'Zone Sensible', 'LGV', 'Conforme NIS2']
    },
    {
        title: 'Catégorie Métier & Domaine',
        description: 'Classification par sous-domaine fonctionnel ou métier',
        key: 'category',
        label: 'Catégorie Métier',
        type: 'category' as MetadataFieldType,
        target: 'both' as const,
        colorScheme: 'blue' as const,
        options: ['Gares Voyageurs', 'Technicentre', 'Poste d\'Aiguillage', 'Sous-Station', 'Plateforme Fret']
    },
    {
        title: 'Niveau de Sensibilité / Sécurité',
        description: 'Badge de niveau de criticité ou conformité réglementaire',
        key: 'security_level',
        label: 'Niveau de Sécurité',
        type: 'badge' as MetadataFieldType,
        target: 'both' as const,
        colorScheme: 'amber' as const,
        options: ['Niveau 1 - Standard', 'Niveau 2 - Restreint', 'Niveau 3 - Vital Réseau']
    }
];

export default function MetadataFieldsManagerModal({
    isOpen,
    onClose,
    tableId,
    tableName,
    metadataFields = [],
    onAddField,
    onUpdateField,
    onDeleteField
}: MetadataFieldsManagerModalProps) {
    const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
    const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
    const [fieldPendingDelete, setFieldPendingDelete] = useState<{ key: string; label: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form state
    const [formKey, setFormKey] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formType, setFormType] = useState<MetadataFieldType>('tags');
    const [formTarget, setFormTarget] = useState<'table' | 'row' | 'both'>('both');
    const [formOptionsInput, setFormOptionsInput] = useState('');
    const [formColorScheme, setFormColorScheme] = useState<TableMetadataField['colorScheme']>('purple');
    const [formDescription, setFormDescription] = useState('');
    const [formRequired, setFormRequired] = useState(false);

    const resetForm = () => {
        setFormKey('');
        setFormLabel('');
        setFormType('tags');
        setFormTarget('both');
        setFormOptionsInput('');
        setFormColorScheme('purple');
        setFormDescription('');
        setFormRequired(false);
        setErrorMsg(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setViewMode('add');
    };

    const handleApplyPreset = (preset: typeof PRESETS[0]) => {
        setFormKey(preset.key);
        setFormLabel(preset.label);
        setFormType(preset.type);
        setFormTarget(preset.target);
        setFormColorScheme(preset.colorScheme);
        setFormOptionsInput(preset.options.join(', '));
        setFormDescription(preset.description);
        setViewMode('add');
    };

    const handleOpenEdit = (field: TableMetadataField) => {
        setEditingFieldKey(field.key);
        setFormKey(field.key);
        setFormLabel(field.label);
        setFormType(field.type);
        setFormTarget(field.target || 'both');
        setFormOptionsInput(field.options ? field.options.join(', ') : '');
        setFormColorScheme(field.colorScheme || 'purple');
        setFormDescription(field.description || '');
        setFormRequired(!!field.required);
        setErrorMsg(null);
        setViewMode('edit');
    };

    const handleSaveField = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!formLabel.trim()) {
            setErrorMsg('Le libellé du champ de métadonnée est requis.');
            return;
        }

        const options = formOptionsInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        setSubmitting(true);
        try {
            if (viewMode === 'add') {
                await onAddField({
                    key: formKey.trim() || undefined,
                    label: formLabel.trim(),
                    type: formType,
                    target: formTarget,
                    options: options.length > 0 ? options : undefined,
                    colorScheme: formColorScheme,
                    description: formDescription.trim() || undefined,
                    required: formRequired
                });
            } else if (viewMode === 'edit' && editingFieldKey) {
                await onUpdateField(editingFieldKey, {
                    label: formLabel.trim(),
                    type: formType,
                    target: formTarget,
                    options: options.length > 0 ? options : undefined,
                    colorScheme: formColorScheme,
                    description: formDescription.trim() || undefined,
                    required: formRequired
                });
            }
            setViewMode('list');
            resetForm();
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || err.message || 'Erreur lors de l\'enregistrement.');
        } finally {
            setSubmitting(false);
        }
    };

    const executeDeleteField = async (key: string) => {
        setSubmitting(true);
        setErrorMsg(null);
        try {
            await onDeleteField(key);
            setFieldPendingDelete(null);
            if (editingFieldKey === key) {
                setViewMode('list');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || err.message || 'Erreur lors de la suppression.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (key: string, label: string) => {
        setFieldPendingDelete({ key, label });
    };

    const getColorConfig = (scheme?: TableMetadataField['colorScheme']) => {
        return COLOR_SCHEMES.find(c => c.id === scheme) || COLOR_SCHEMES[0];
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                resetForm();
                setViewMode('list');
                onClose();
            }}
            title={
                <div>
                    <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-[#002395]" />
                        Schéma des Métadonnées : {tableName}
                    </h3>
                    <p className="text-xs text-gray-500 font-normal mt-0.5">
                        Définissez les attributs transverses (tags, catégories, labels, niveaux) rattachés à la table ou à ses lignes.
                    </p>
                </div>
            }
            maxWidth="3xl"
        >
            <div className="p-6 space-y-6">
                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Subheader / Tabs Navigation */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setFieldPendingDelete(null);
                                setViewMode('list');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${viewMode === 'list' ? 'bg-[#002395] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Champs Configurés ({metadataFields.length})
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'add' ? 'bg-[#002395] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Nouveau Champ
                        </button>
                    </div>

                    <span className="text-[11px] text-gray-500 font-mono">
                        Table: <strong className="text-gray-900">{tableId}</strong>
                    </span>
                </div>

                {/* Inline Confirmation Card for Deletion */}
                {fieldPendingDelete && (
                    <div id="modal-confirm-delete-metadata" className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-red-950">
                                    Confirmer la suppression du champ de métadonnée
                                </h4>
                                <p className="text-xs text-red-800 mt-1">
                                    Êtes-vous sûr de vouloir supprimer le champ <strong>« {fieldPendingDelete.label} »</strong> (clé: <code>{fieldPendingDelete.key}</code>) ?
                                    <br />
                                    Cette opération est irréversible et supprimera également toutes les valeurs associées à cette métadonnée sur la table et dans chaque enregistrement.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-red-200">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setFieldPendingDelete(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => executeDeleteField(fieldPendingDelete.key)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                {submitting ? 'Suppression en cours...' : 'Oui, supprimer définitivement'}
                            </button>
                        </div>
                    </div>
                )}

                {/* View: List of defined metadata fields */}
                {viewMode === 'list' && (
                    <div className="space-y-5">
                        {metadataFields.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/60 space-y-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#002395] flex items-center justify-center mx-auto">
                                    <Tag className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-gray-900">Aucun champ de métadonnées défini</h4>
                                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                                        Ajoutez des étiquettes (tags), des catégories ou des indicateurs personnalisés pour structurer et classifier ce référentiel.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleOpenAdd}
                                        className="bg-[#002395] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Créer un premier champ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {metadataFields.map(field => {
                                    const color = getColorConfig(field.colorScheme);
                                    return (
                                        <div
                                            key={field.key}
                                            className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${color.bg} ${color.text} ${color.border} inline-flex items-center gap-1.5`}>
                                                        {field.type === 'tags' ? <Tags className="w-3.5 h-3.5" /> : field.type === 'category' ? <FolderTree className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
                                                        {field.label}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        key: {field.key}
                                                    </span>
                                                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                                        Type: <strong>{field.type}</strong>
                                                    </span>
                                                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                                                        Portée: {field.target === 'table' ? 'Table seule' : field.target === 'row' ? 'Lignes seules' : 'Table & Lignes'}
                                                    </span>
                                                    {field.required && (
                                                        <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-semibold border border-red-200">
                                                            Obligatoire
                                                        </span>
                                                    )}
                                                </div>

                                                {field.description && (
                                                    <p className="text-xs text-gray-600 pt-0.5">{field.description}</p>
                                                )}

                                                {field.options && field.options.length > 0 && (
                                                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Options prédéfinies :</span>
                                                        {field.options.map((opt, i) => (
                                                            <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                                                                {opt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(field)}
                                                    className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition border border-gray-200 cursor-pointer"
                                                    title="Modifier la définition du champ"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={submitting}
                                                    onClick={() => handleDelete(field.key, field.label)}
                                                    className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-gray-200 cursor-pointer disabled:opacity-50"
                                                    title="Supprimer ce champ de métadonnées"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Quick Presets Section */}
                        <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                Modèles Rapides Prédéfinis (1-clic)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {PRESETS.map((preset, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xs transition bg-gradient-to-br from-white to-gray-50/50 flex flex-col justify-between space-y-2"
                                    >
                                        <div>
                                            <div className="font-semibold text-xs text-gray-900">{preset.title}</div>
                                            <div className="text-[11px] text-gray-500 mt-1 leading-snug">{preset.description}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleApplyPreset(preset)}
                                            className="w-full text-center py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#002395] rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Utiliser ce modèle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* View: Add or Edit Form */}
                {(viewMode === 'add' || viewMode === 'edit') && (
                    <form onSubmit={handleSaveField} className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <h4 className="text-sm font-bold text-gray-950 flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-[#002395]" />
                                {viewMode === 'add' ? 'Définir un nouveau champ de métadonnée' : `Modifier le champ « ${formLabel} »`}
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setViewMode('list');
                                }}
                                className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                            >
                                Retour à la liste
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Label */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Libellé du Champ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formLabel}
                                    onChange={e => {
                                        setFormLabel(e.target.value);
                                        if (viewMode === 'add' && !formKey) {
                                            const autoKey = e.target.value
                                                .toLowerCase()
                                                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                                .replace(/[^a-z0-9_]/g, '_')
                                                .replace(/_+/g, '_');
                                            setFormKey(autoKey);
                                        }
                                    }}
                                    placeholder="Ex: Étiquettes Métier, Pôle d'Expertise, Sensibilité..."
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                            </div>

                            {/* Key Identifier */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Clé Technique Unique (Slug) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formKey}
                                    onChange={e => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                    placeholder="Ex: tags, pole_expertise, security_level"
                                    disabled={viewMode === 'edit'}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 outline-hidden disabled:bg-gray-100 disabled:text-gray-500"
                                />
                                <p className="text-[10px] text-gray-500">Utilisée dans le stockage JSON (lettres minuscules, chiffres, underscores).</p>
                            </div>

                            {/* Metadata Type */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Type de Métadonnée <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formType}
                                    onChange={e => setFormType(e.target.value as MetadataFieldType)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    <option value="tags">Étiquettes multiples (Tags / Mots-clés)</option>
                                    <option value="category">Catégorie / Domaine hiérarchique</option>
                                    <option value="select">Liste déroulante unitaire (Select)</option>
                                    <option value="badge">Badge d'état coloré (Status / Niveau)</option>
                                    <option value="text">Texte libre / Commentaire</option>
                                    <option value="boolean">Interrupteur Oui / Non (Booléen)</option>
                                    <option value="number">Nombre / Valeur numérique</option>
                                </select>
                            </div>

                            {/* Target Scope */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Portée d'Application <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formTarget}
                                    onChange={e => setFormTarget(e.target.value as 'table' | 'row' | 'both')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden bg-white"
                                >
                                    <option value="both">Table & Lignes (Les Deux)</option>
                                    <option value="table">Table uniquement (Propriété globale)</option>
                                    <option value="row">Lignes uniquement (Enregistrements individuels)</option>
                                </select>
                                <p className="text-[10px] text-gray-500">
                                    Détermine si ce champ s'affiche sur la table globale, sur chaque ligne ou les deux.
                                </p>
                            </div>
                        </div>

                        {/* Options for tags, category, select, badge */}
                        {(formType === 'tags' || formType === 'category' || formType === 'select' || formType === 'badge') && (
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Options & Valeurs suggérées (séparées par des virgules)
                                </label>
                                <input
                                    type="text"
                                    value={formOptionsInput}
                                    onChange={e => setFormOptionsInput(e.target.value)}
                                    placeholder="Ex: Prioritaire, LGV, Audit 2026, NIS2, Zone Sensible"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                                />
                                <p className="text-[10px] text-gray-500">
                                    Ces valeurs apparaîtront en suggestions rapides ou listes de choix dans les formulaires.
                                </p>
                            </div>
                        )}

                        {/* Color Theme Selector */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                <Palette className="w-3.5 h-3.5 text-gray-600" />
                                Thème Visuel du Badge / Tag
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {COLOR_SCHEMES.map(scheme => (
                                    <button
                                        key={scheme.id}
                                        type="button"
                                        onClick={() => setFormColorScheme(scheme.id)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${scheme.bg} ${scheme.text} ${formColorScheme === scheme.id ? 'ring-2 ring-blue-600 ring-offset-1 font-extrabold shadow-xs' : 'opacity-80 hover:opacity-100'}`}
                                    >
                                        {formColorScheme === scheme.id && <Check className="w-3 h-3" />}
                                        {scheme.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description / Help text */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-700">
                                Description ou consigne pour les administrateurs (Optionnel)
                            </label>
                            <input
                                type="text"
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                placeholder="Ex: Classification obligatoire pour le suivi de l'audit sûreté ferroviaire"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
                            />
                        </div>

                        {/* Required toggle */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="meta-required-toggle"
                                checked={formRequired}
                                onChange={e => setFormRequired(e.target.checked)}
                                className="w-4 h-4 text-[#002395] rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="meta-required-toggle" className="text-xs font-medium text-gray-800 cursor-pointer">
                                Champ requis / obligatoire lors de la saisie d'un enregistrement
                            </label>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setViewMode('list');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2 bg-[#002395] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {viewMode === 'add' ? 'Créer le champ de métadonnée' : 'Enregistrer les modifications'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}
