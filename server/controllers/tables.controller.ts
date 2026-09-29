import { referenceTablesDatabase, CustomTable, TableColumn, TableMetadataField, rolesDatabase, auditLogs, peopleFilterSettings } from '../db/store.js';
import { referenceTableRepository } from '../repositories/reference-table.repository.js';
import { featureRepository } from '../repositories/feature.repository.js';

/**
 * Récupère la liste de toutes les tables de référence (système & créées par l'administrateur)
 */
export const getTables = async (req: any, res: any) => {
    try {
        const tables = await referenceTableRepository.getAll();
        const summaries = tables.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            icon: t.icon || 'Table',
            category: t.category || 'Général',
            is_system: !!t.is_system,
            allow_multiple: !!t.allow_multiple,
            grouping_column: t.grouping_column || null,
            show_in_forms: t.show_in_forms !== false,
            form_field_label: t.form_field_label || t.name,
            form_help_text: t.form_help_text || '',
            is_required: !!t.is_required,
            columns_count: t.columns.length,
            rows_count: t.rows.length,
            columns: t.columns,
            metadata_fields: t.metadata_fields || [],
            metadata: t.metadata || {}
        }));
        res.status(200).json(summaries);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Récupère le schéma complet et les lignes d'une table spécifique
 */
export const getTableById = async (req: any, res: any) => {
    try {
        const { tableId } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }
        res.status(200).json(table);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Crée une nouvelle table personnalisée
 */
export const createTable = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('referentiel_types_structure'))) {
            return res.status(403).json({
                error: "La création de types et de structures de référentiels est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }

        const { id, name, description, icon, category, columns, rows, allow_multiple, grouping_column, show_in_forms, form_field_label, form_help_text, is_required, metadata_fields, metadata } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: "Le nom de la table est requis." });
        }

        const slug = (id || name)
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");

        const existing = await referenceTableRepository.getById(slug);
        if (existing) {
            return res.status(400).json({ error: `Une table avec l'identifiant '${slug}' existe déjà.` });
        }

        const validColumns: TableColumn[] = Array.isArray(columns) && columns.length > 0
            ? columns.map((col: any) => ({
                key: col.key || col.label.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                label: col.label || col.key,
                type: col.type || 'text',
                options: Array.isArray(col.options) ? col.options : (col.options ? col.options.split(',').map((s: string) => s.trim()) : undefined),
                table_ref: col.table_ref || undefined,
                display_field: col.display_field || undefined,
                multiple: !!col.multiple,
                required: !!col.required,
                description: col.description || ''
            }))
            : [
                { key: 'code', label: 'Code Identifiant', type: 'text', required: true },
                { key: 'name', label: 'Libellé / Nom', type: 'text', required: true },
                { key: 'description', label: 'Description', type: 'text', required: false }
            ];

        const initialRows = Array.isArray(rows) ? rows.map((r, i) => ({ id: i + 1, ...r })) : [];

        const newTableData: CustomTable = {
            id: slug,
            name: name.trim(),
            description: description ? description.trim() : `Table de référence ${name}`,
            icon: icon || 'Table',
            category: category || 'Personnalisé',
            is_system: false,
            allow_multiple: !!allow_multiple,
            grouping_column: grouping_column || undefined,
            show_in_forms: show_in_forms !== undefined ? !!show_in_forms : true,
            form_field_label: form_field_label ? form_field_label.trim() : undefined,
            form_help_text: form_help_text ? form_help_text.trim() : undefined,
            is_required: !!is_required,
            columns: validColumns,
            rows: initialRows,
            metadata_fields: Array.isArray(metadata_fields) ? metadata_fields : [],
            metadata: metadata && typeof metadata === 'object' ? metadata : {}
        };

        const newTable = await referenceTableRepository.create(newTableData);

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "CREATE_TABLE",
            target: slug,
            details: `Création de la table de référence '${name}' (${validColumns.length} colonnes)`
        });

        res.status(201).json({ message: "Table créée avec succès", table: newTable });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Modifie les métadonnées ou colonnes d'une table
 */
export const updateTable = async (req: any, res: any) => {
    try {
        const { tableId } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        // La structure des tables de référence doit toujours être modifiable
        const isAlwaysModifiable = tableId === 'categories_etablissement' || tableId === 'niveaux_securite' || !table.is_system;
        if (!isAlwaysModifiable && !(await featureRepository.isEnabled('referentiel_types_structure'))) {
            return res.status(403).json({
                error: "La modification des types et de la structure de référentiels est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }

        const { name, description, icon, category, columns, allow_multiple, grouping_column, show_in_forms, form_field_label, form_help_text, is_required, metadata_fields, metadata } = req.body;

        const updates: Partial<CustomTable> = {};
        if (name) updates.name = name.trim();
        if (description !== undefined) updates.description = description.trim();
        if (icon) updates.icon = icon;
        if (category) updates.category = category;
        if (allow_multiple !== undefined) updates.allow_multiple = !!allow_multiple;
        if (grouping_column !== undefined) updates.grouping_column = grouping_column || undefined;
        if (show_in_forms !== undefined) updates.show_in_forms = !!show_in_forms;
        if (form_field_label !== undefined) updates.form_field_label = form_field_label.trim();
        if (form_help_text !== undefined) updates.form_help_text = form_help_text.trim();
        if (is_required !== undefined) updates.is_required = !!is_required;
        if (metadata_fields !== undefined && Array.isArray(metadata_fields)) updates.metadata_fields = metadata_fields;
        if (metadata !== undefined && typeof metadata === 'object') updates.metadata = metadata;

        if (Array.isArray(columns)) {
            updates.columns = columns.map((col: any) => ({
                key: col.key || col.label.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                label: col.label || col.key,
                type: col.type || 'text',
                options: Array.isArray(col.options) ? col.options : (col.options ? col.options.split(',').map((s: string) => s.trim()) : undefined),
                table_ref: col.table_ref || undefined,
                display_field: col.display_field || undefined,
                multiple: !!col.multiple,
                required: !!col.required,
                description: col.description || ''
            }));
        }

        const updatedTable = await referenceTableRepository.update(tableId, updates);

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "UPDATE_TABLE",
            target: tableId,
            details: `Mise à jour de la structure de la table '${updatedTable?.name || table.name}'`
        });

        res.status(200).json({ message: "Table mise à jour avec succès", table: updatedTable });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime une table personnalisée
 */
export const deleteTable = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('referentiel_types_structure'))) {
            return res.status(403).json({
                error: "La suppression de tables de référentiels est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }

        const { tableId } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        if (table.is_system) {
            return res.status(403).json({ error: `La table système '${table.name}' ne peut pas être supprimée.` });
        }

        await referenceTableRepository.delete(tableId);

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "DELETE_TABLE",
            target: tableId,
            details: `Suppression de la table '${table.name}'`
        });

        res.status(200).json({ message: "Table supprimée avec succès" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Ajoute une ligne dans une table
 */
export const addTableRow = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('referentiels_management'))) {
            return res.status(403).json({
                error: "La gestion et l'ajout de données dans les référentiels est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }
        const { tableId } = req.params;
        const table = referenceTablesDatabase.find(t => t.id === tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const rowData = req.body;
        const maxId = table.rows.reduce((max, r) => Math.max(max, typeof r.id === 'number' ? r.id : 0), 0);
        const newId = maxId + 1;

        const newRow: Record<string, any> = {
            id: newId,
            ...rowData
        };

        table.rows.push(newRow);
        await referenceTableRepository.update(tableId, { rows: table.rows });

        if (tableId === 'roles') {
            rolesDatabase.push({
                id: newId,
                name: newRow.name || `Role ${newId}`,
                privileges: typeof newRow.privileges === 'string' ? newRow.privileges.split(',').map((s: string) => s.trim()) : (Array.isArray(newRow.privileges) ? newRow.privileges : ['view_dashboard'])
            });
        }

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "ADD_ROW",
            target: `${tableId}#${newId}`,
            details: `Ajout d'un enregistrement dans '${table.name}': ${newRow.name || newRow.code || newId}`
        });

        res.status(201).json({ message: "Ligne ajoutée avec succès", row: newRow });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Modifie une ligne existante dans une table
 */
export const updateTableRow = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('referentiels_management'))) {
            return res.status(403).json({
                error: "La modification des données des référentiels est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }
        const { tableId, rowId } = req.params;
        const table = referenceTablesDatabase.find(t => t.id === tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const idNum = Number(rowId);
        const row = table.rows.find(r => r.id === idNum || String(r.id) === rowId);
        if (!row) {
            return res.status(404).json({ error: `Enregistrement #${rowId} introuvable dans la table '${table.name}'.` });
        }

        Object.assign(row, req.body);
        row.id = idNum || row.id;
        await referenceTableRepository.update(tableId, { rows: table.rows });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "UPDATE_ROW",
            target: `${tableId}#${rowId}`,
            details: `Modification de l'enregistrement #${rowId} dans '${table.name}'`
        });

        res.status(200).json({ message: "Ligne modifiée avec succès", row });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime une ligne d'une table
 */
export const deleteTableRow = async (req: any, res: any) => {
    try {
        const { tableId, rowId } = req.params;
        const table = referenceTablesDatabase.find(t => t.id === tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const idNum = Number(rowId);
        const index = table.rows.findIndex(r => r.id === idNum || String(r.id) === rowId);
        if (index === -1) {
            return res.status(404).json({ error: `Enregistrement #${rowId} introuvable dans la table '${table.name}'.` });
        }

        const [removedRow] = table.rows.splice(index, 1);
        await referenceTableRepository.update(tableId, { rows: table.rows });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "DELETE_ROW",
            target: `${tableId}#${rowId}`,
            details: `Suppression de l'enregistrement #${rowId} (${removedRow.name || removedRow.code || ''}) dans '${table.name}'`
        });

        res.status(200).json({ message: "Ligne supprimée avec succès" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Ajoute une nouvelle colonne à une table
 */
export const addTableColumn = async (req: any, res: any) => {
    try {
        const { tableId } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const { label, key, type, options, table_ref, display_field, multiple, required, description } = req.body;
        if (!label && !key) {
            return res.status(400).json({ error: "Le libellé ou la clé de la colonne est requis." });
        }

        const colKey = (key || label).toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (table.columns.some(c => c.key === colKey)) {
            return res.status(400).json({ error: `Une colonne '${colKey}' existe déjà dans cette table.` });
        }

        const newCol: TableColumn = {
            key: colKey,
            label: label || colKey,
            type: type || 'text',
            options: Array.isArray(options) ? options : (options ? options.split(',').map((s: string) => s.trim()) : undefined),
            table_ref: table_ref || undefined,
            display_field: display_field || undefined,
            multiple: !!multiple,
            required: !!required,
            description: description || ''
        };

        table.columns.push(newCol);
        await referenceTableRepository.update(tableId, { columns: table.columns });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "ADD_COLUMN",
            target: `${tableId}.${colKey}`,
            details: `Ajout de la colonne '${newCol.label}' (${colKey}) dans '${table.name}'`
        });

        res.status(201).json({ message: "Colonne ajoutée avec succès", column: newCol, table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Modifie une colonne existante dans une table
 */
export const updateTableColumn = async (req: any, res: any) => {
    try {
        const { tableId, columnKey } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const colIndex = table.columns.findIndex(c => c.key === columnKey);
        if (colIndex === -1) {
            return res.status(404).json({ error: `Colonne '${columnKey}' introuvable dans la table '${table.name}'.` });
        }

        const { label, key, type, options, table_ref, display_field, multiple, required, description } = req.body;
        const targetCol = table.columns[colIndex];

        if (label) targetCol.label = label.trim();
        if (type) targetCol.type = type;
        if (options !== undefined) {
            targetCol.options = Array.isArray(options) ? options : (options ? options.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);
        }
        if (table_ref !== undefined) targetCol.table_ref = table_ref || undefined;
        if (display_field !== undefined) targetCol.display_field = display_field || undefined;
        if (multiple !== undefined) targetCol.multiple = !!multiple;
        if (required !== undefined) targetCol.required = !!required;
        if (description !== undefined) targetCol.description = description || '';

        // If key renamed, rename in rows too
        if (key && key !== columnKey) {
            const sanitizedNewKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
            if (table.columns.some((c, i) => i !== colIndex && c.key === sanitizedNewKey)) {
                return res.status(400).json({ error: `Une autre colonne avec la clé '${sanitizedNewKey}' existe déjà.` });
            }
            targetCol.key = sanitizedNewKey;
            table.rows.forEach(r => {
                if (r[columnKey] !== undefined) {
                    r[sanitizedNewKey] = r[columnKey];
                    delete r[columnKey];
                }
            });
        }

        await referenceTableRepository.update(tableId, { columns: table.columns, rows: table.rows });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "UPDATE_COLUMN",
            target: `${tableId}.${columnKey}`,
            details: `Modification de la colonne '${targetCol.label}' (${columnKey}) dans '${table.name}'`
        });

        res.status(200).json({ message: "Colonne mise à jour avec succès", column: targetCol, table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime une colonne d'une table
 */
export const deleteTableColumn = async (req: any, res: any) => {
    try {
        const { tableId, columnKey } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        if (columnKey?.toLowerCase() === 'id') {
            return res.status(403).json({ error: "La colonne identifiant '# ID' est protégée et ne peut pas être supprimée." });
        }

        const colIndex = table.columns.findIndex(c => c.key.toLowerCase() === columnKey.toLowerCase());
        if (colIndex === -1) {
            return res.status(404).json({ error: `Colonne '${columnKey}' introuvable dans la table '${table.name}'.` });
        }

        const [removedCol] = table.columns.splice(colIndex, 1);

        // Nettoyer les lignes de cette colonne
        table.rows.forEach(r => {
            delete r[removedCol.key];
            delete r[columnKey];
        });

        await referenceTableRepository.update(tableId, { columns: table.columns, rows: table.rows });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "DELETE_COLUMN",
            target: `${tableId}.${removedCol.key}`,
            details: `Suppression de la colonne '${removedCol.label}' (${removedCol.key}) dans '${table.name}'`
        });

        res.status(200).json({ message: "Colonne supprimée avec succès", table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Récupère la liste des IDs de tables de référence configurées pour filtrer l'annuaire des personnes
 */
export const getPeopleFilterSettings = async (req: any, res: any) => {
    try {
        res.status(200).json({ filter_table_ids: peopleFilterSettings });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour la liste des IDs de tables de référence configurées au niveau administration
 */
export const updatePeopleFilterSettings = async (req: any, res: any) => {
    try {
        const { filter_table_ids } = req.body;
        if (!Array.isArray(filter_table_ids)) {
            return res.status(400).json({ error: "filter_table_ids doit être un tableau d'identifiants de tables." });
        }

        peopleFilterSettings.length = 0;
        filter_table_ids.forEach((id: string) => {
            if (typeof id === 'string' && id.trim()) {
                peopleFilterSettings.push(id.trim());
            }
        });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "UPDATE_PEOPLE_FILTER_CONFIG",
            target: "people_filters",
            details: `Mise à jour des tables de filtrage de l'annuaire : [${peopleFilterSettings.join(', ')}]`
        });

        res.status(200).json({ message: "Configuration des filtres mise à jour avec succès", filter_table_ids: peopleFilterSettings });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Ajoute un champ de métadonnées personnalisé à une table
 */
export const addTableMetadataField = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('metadata_schema'))) {
            return res.status(403).json({
                error: "La gestion du schéma des champs de métadonnées est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }

        const { tableId } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const { key, label, type, options, defaultValue, description, target, required, colorScheme } = req.body;
        if (!label) {
            return res.status(400).json({ error: "Le libellé du champ de métadonnée est requis." });
        }

        const fieldKey = (key || label)
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");

        if (!table.metadata_fields) {
            table.metadata_fields = [];
        }

        if (table.metadata_fields.some(f => f.key.toLowerCase() === fieldKey.toLowerCase())) {
            return res.status(400).json({ error: `Un champ de métadonnée avec la clé '${fieldKey}' existe déjà pour cette table.` });
        }

        const newField: TableMetadataField = {
            key: fieldKey,
            label: label.trim(),
            type: type || 'tags',
            options: Array.isArray(options) ? options : (typeof options === 'string' && options ? options.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            defaultValue: defaultValue !== undefined ? defaultValue : (type === 'tags' ? [] : ''),
            description: description ? description.trim() : undefined,
            target: target || 'both',
            required: !!required,
            colorScheme: colorScheme || 'purple'
        };

        table.metadata_fields.push(newField);
        const updated = await referenceTableRepository.update(table.id, { metadata_fields: table.metadata_fields });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "ADD_METADATA_FIELD",
            target: `${table.id}.${fieldKey}`,
            details: `Ajout du champ de métadonnée personnalisé '${newField.label}' (${newField.type}) à la table '${table.name}'`
        });

        res.status(201).json({ message: "Champ de métadonnée ajouté avec succès", field: newField, table: updated || table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour un champ de métadonnées personnalisé
 */
export const updateTableMetadataField = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('metadata_schema'))) {
            return res.status(403).json({
                error: "La modification des champs de métadonnées est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }

        const { tableId, fieldKey } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        if (!table.metadata_fields || table.metadata_fields.length === 0) {
            return res.status(404).json({ error: `Aucun champ de métadonnées pour la table '${tableId}'.` });
        }

        const keyLower = (fieldKey || '').trim().toLowerCase();
        const field = table.metadata_fields.find(f => f.key.toLowerCase() === keyLower);
        if (!field) {
            return res.status(404).json({ error: `Champ de métadonnée '${fieldKey}' introuvable.` });
        }

        const { label, type, options, defaultValue, description, target, required, colorScheme } = req.body;
        if (label) field.label = label.trim();
        if (type) field.type = type;
        if (options !== undefined) {
            field.options = Array.isArray(options) ? options : (typeof options === 'string' && options ? options.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);
        }
        if (defaultValue !== undefined) field.defaultValue = defaultValue;
        if (description !== undefined) field.description = description ? description.trim() : '';
        if (target !== undefined) field.target = target;
        if (required !== undefined) field.required = !!required;
        if (colorScheme !== undefined) field.colorScheme = colorScheme;

        const updated = await referenceTableRepository.update(table.id, { metadata_fields: table.metadata_fields });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "UPDATE_METADATA_FIELD",
            target: `${table.id}.${fieldKey}`,
            details: `Modification du champ de métadonnée '${field.label}' sur la table '${table.name}'`
        });

        res.status(200).json({ message: "Champ de métadonnée mis à jour avec succès", field, table: updated || table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime un champ de métadonnées personnalisé et nettoie les valeurs associées
 */
export const deleteTableMetadataField = async (req: any, res: any) => {
    try {
        if (!(await featureRepository.isEnabled('metadata_schema'))) {
            return res.status(403).json({
                error: "La suppression des champs de métadonnées est actuellement désactivée par l'administrateur.",
                feature_disabled: true
            });
        }

        const { tableId, fieldKey } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        if (!table.metadata_fields || table.metadata_fields.length === 0) {
            return res.status(404).json({ error: `Aucun champ de métadonnées configuré sur cette table.` });
        }

        const keyLower = (fieldKey || '').trim().toLowerCase();
        const idx = table.metadata_fields.findIndex(f => f.key.toLowerCase() === keyLower);
        if (idx === -1) {
            return res.status(404).json({ error: `Champ de métadonnée '${fieldKey}' introuvable.` });
        }

        const removedField = table.metadata_fields.splice(idx, 1)[0];
        const actualKey = removedField.key;

        // Nettoyage complet des valeurs de métadonnées sur la table
        if (table.metadata) {
            delete table.metadata[actualKey];
            delete table.metadata[fieldKey];
            Object.keys(table.metadata).forEach(k => {
                if (k.toLowerCase() === keyLower) {
                    delete table.metadata[k];
                }
            });
        }

        // Nettoyage des valeurs sur toutes les lignes
        if (Array.isArray(table.rows)) {
            table.rows.forEach(r => {
                delete r[actualKey];
                delete r[fieldKey];
                Object.keys(r).forEach(k => {
                    if (k.toLowerCase() === keyLower) {
                        delete r[k];
                    }
                });
            });
        }

        const updated = await referenceTableRepository.update(table.id, {
            metadata_fields: table.metadata_fields,
            metadata: table.metadata,
            rows: table.rows
        });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "DELETE_METADATA_FIELD",
            target: `${table.id}.${fieldKey}`,
            details: `Suppression du champ de métadonnée '${removedField.label}' de la table '${table.name}'`
        });

        res.status(200).json({ message: "Champ de métadonnée supprimé avec succès", table: updated || table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Met à jour les valeurs de métadonnées au niveau de la table (ex: tags, catégorie, etc.)
 */
export const updateTableMetadataValues = async (req: any, res: any) => {
    try {
        const { tableId } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const { metadata, replace } = req.body;
        if (!metadata || typeof metadata !== 'object') {
            return res.status(400).json({ error: "L'objet metadata est invalide." });
        }

        if (replace) {
            table.metadata = { ...metadata };
        } else {
            const current = { ...(table.metadata || {}) };
            for (const [k, v] of Object.entries(metadata)) {
                if (v === null || v === undefined) {
                    delete current[k];
                } else {
                    current[k] = v;
                }
            }
            table.metadata = current;
        }

        const updated = await referenceTableRepository.update(table.id, { metadata: table.metadata });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "UPDATE_TABLE_METADATA",
            target: table.id,
            details: `Mise à jour des métadonnées personnalisées pour la table '${table.name}'`
        });

        res.status(200).json({ message: "Métadonnées de la table mises à jour avec succès", table: updated || table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Supprime une valeur de métadonnée spécifique d'une table
 */
export const deleteTableMetadataValue = async (req: any, res: any) => {
    try {
        const { tableId, metaKey } = req.params;
        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        const keyLower = (metaKey || '').trim().toLowerCase();
        if (table.metadata) {
            delete table.metadata[metaKey];
            Object.keys(table.metadata).forEach(k => {
                if (k.toLowerCase() === keyLower) {
                    delete table.metadata[k];
                }
            });
        }

        const updated = await referenceTableRepository.update(table.id, { metadata: table.metadata });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "DELETE_TABLE_METADATA_VALUE",
            target: `${table.id}.${metaKey}`,
            details: `Suppression de la valeur de métadonnée '${metaKey}' sur la table '${table.name}'`
        });

        res.status(200).json({ message: `Valeur de métadonnée '${metaKey}' supprimée.`, table: updated || table });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Importe des enregistrements en masse depuis un mapping CSV générique (Epic 2)
 */
export const importTableCsv = async (req: any, res: any) => {
    try {
        const { tableId } = req.params;
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: "Aucune donnée CSV à importer." });
        }

        const table = await referenceTableRepository.getById(tableId);
        if (!table) {
            return res.status(404).json({ error: `Table '${tableId}' introuvable.` });
        }

        let maxId = table.rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
        const newRows: Record<string, any>[] = [];

        for (const r of rows) {
            maxId++;
            const newRow = {
                id: maxId,
                ...r
            };
            table.rows.push(newRow);
            newRows.push(newRow);
        }

        await referenceTableRepository.update(tableId, { rows: table.rows });

        auditLogs.push({
            id: auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            actor: req.user?.name || "Administrateur",
            role: "Administrateur",
            action: "IMPORT_CSV_ROWS",
            target: tableId,
            details: `Importation en masse de ${newRows.length} lignes dans '${table.name}'`
        });

        res.status(200).json({
            success: true,
            imported_count: newRows.length,
            table
        });
    } catch (e: any) {
        console.error('importTableCsv error:', e);
        res.status(500).json({ error: e.message || "Erreur lors de l'import CSV." });
    }
};
