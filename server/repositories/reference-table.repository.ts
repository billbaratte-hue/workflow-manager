import { ISqliteDb, getDatabase } from '../db/database.js';
import { CustomTable, TableColumn, TableMetadataField, referenceTablesDatabase } from '../db/store.js';

export class ReferenceTableRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRowToTable(row: any): CustomTable | null {
        if (!row) return null;
        let columns: TableColumn[] = [];
        let rows: Record<string, any>[] = [];
        let metadataFields: TableMetadataField[] = [];
        let metadata: Record<string, any> = {};

        try {
            columns = typeof row.columns === 'string' ? JSON.parse(row.columns) : (row.columns || []);
        } catch (e) {
            columns = [];
        }

        try {
            rows = typeof row.rows === 'string' ? JSON.parse(row.rows) : (row.rows || []);
        } catch (e) {
            rows = [];
        }

        try {
            metadataFields = typeof row.metadata_fields === 'string' ? JSON.parse(row.metadata_fields) : (row.metadata_fields || []);
        } catch (e) {
            metadataFields = [];
        }

        try {
            metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
        } catch (e) {
            metadata = {};
        }

        return {
            id: String(row.id),
            name: String(row.name),
            description: row.description || '',
            icon: row.icon || 'fas fa-table',
            category: row.category || 'Général',
            is_system: Number(row.is_system) === 1,
            allow_multiple: Number(row.allow_multiple) === 1,
            grouping_column: row.grouping_column || undefined,
            show_in_forms: Number(row.show_in_forms) === 1,
            form_field_label: row.form_field_label || row.name,
            form_help_text: row.form_help_text || '',
            is_required: Number(row.is_required) === 1,
            columns,
            rows,
            metadata_fields: metadataFields,
            metadata
        };
    }

    async getAll(): Promise<CustomTable[]> {
        try {
            const db = await this.getDb();
            const rows = await db.all('SELECT * FROM reference_tables ORDER BY is_system DESC, name ASC');
            if (rows && rows.length > 0) {
                return rows.map(r => this.mapRowToTable(r)!);
            }
        } catch (e) {
            console.warn('ReferenceTableRepository.getAll fallback to store:', e);
        }
        return [...referenceTablesDatabase];
    }

    async getById(id: string): Promise<CustomTable | null> {
        const slug = id.trim().toLowerCase();
        try {
            const db = await this.getDb();
            const row = await db.get('SELECT * FROM reference_tables WHERE LOWER(id) = LOWER(?)', slug);
            if (row) return this.mapRowToTable(row);
        } catch (e) {
            console.warn('ReferenceTableRepository.getById fallback to store:', e);
        }
        const memoryTable = referenceTablesDatabase.find(t => t.id.toLowerCase() === slug);
        return memoryTable || null;
    }

    async create(table: CustomTable): Promise<CustomTable> {
        const slug = table.id.trim().toLowerCase();
        const now = new Date().toISOString();

        const newTable: CustomTable = {
            id: slug,
            name: table.name.trim(),
            description: table.description ? table.description.trim() : `Table de référence ${table.name}`,
            icon: table.icon || 'fas fa-table',
            category: table.category || 'Organisation',
            is_system: !!table.is_system,
            allow_multiple: !!table.allow_multiple,
            grouping_column: table.grouping_column || undefined,
            show_in_forms: table.show_in_forms !== undefined ? !!table.show_in_forms : true,
            form_field_label: table.form_field_label ? table.form_field_label.trim() : table.name,
            form_help_text: table.form_help_text ? table.form_help_text.trim() : '',
            is_required: !!table.is_required,
            columns: Array.isArray(table.columns) ? table.columns : [],
            rows: Array.isArray(table.rows) ? table.rows : [],
            metadata_fields: Array.isArray(table.metadata_fields) ? table.metadata_fields : [],
            metadata: table.metadata || {}
        };

        try {
            const db = await this.getDb();
            await db.run(
                `INSERT INTO reference_tables (
                    id, name, description, icon, category, is_system, allow_multiple,
                    grouping_column, show_in_forms, form_field_label, form_help_text,
                    is_required, columns, rows, metadata_fields, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                newTable.id,
                newTable.name,
                newTable.description,
                newTable.icon,
                newTable.category,
                newTable.is_system ? 1 : 0,
                newTable.allow_multiple ? 1 : 0,
                newTable.grouping_column || null,
                newTable.show_in_forms ? 1 : 0,
                newTable.form_field_label,
                newTable.form_help_text,
                newTable.is_required ? 1 : 0,
                JSON.stringify(newTable.columns),
                JSON.stringify(newTable.rows),
                JSON.stringify(newTable.metadata_fields),
                JSON.stringify(newTable.metadata),
                now,
                now
            );
        } catch (e) {
            console.warn('ReferenceTableRepository.create error in SQLite:', e);
        }

        // Keep in-memory store synchronized as fallback
        const existingIdx = referenceTablesDatabase.findIndex(t => t.id === newTable.id);
        if (existingIdx >= 0) {
            referenceTablesDatabase[existingIdx] = newTable;
        } else {
            referenceTablesDatabase.push(newTable);
        }

        return newTable;
    }

    async update(id: string, updates: Partial<CustomTable>): Promise<CustomTable | null> {
        const slug = id.trim().toLowerCase();
        const existing = await this.getById(slug);
        if (!existing) return null;

        const updated: CustomTable = {
            ...existing,
            ...updates,
            id: existing.id, // Preserve ID
            is_system: existing.is_system // System status cannot be altered
        };

        const now = new Date().toISOString();

        try {
            const db = await this.getDb();
            await db.run(
                `UPDATE reference_tables SET
                    name = ?, description = ?, icon = ?, category = ?,
                    allow_multiple = ?, grouping_column = ?, show_in_forms = ?,
                    form_field_label = ?, form_help_text = ?, is_required = ?,
                    columns = ?, rows = ?, metadata_fields = ?, metadata = ?, updated_at = ?
                 WHERE LOWER(id) = LOWER(?)`,
                updated.name,
                updated.description,
                updated.icon,
                updated.category,
                updated.allow_multiple ? 1 : 0,
                updated.grouping_column || null,
                updated.show_in_forms ? 1 : 0,
                updated.form_field_label,
                updated.form_help_text,
                updated.is_required ? 1 : 0,
                JSON.stringify(updated.columns || []),
                JSON.stringify(updated.rows || []),
                JSON.stringify(updated.metadata_fields || []),
                JSON.stringify(updated.metadata || {}),
                now,
                slug
            );
        } catch (e) {
            console.warn('ReferenceTableRepository.update error in SQLite:', e);
        }

        // Synchronize in-memory fallback
        const memIdx = referenceTablesDatabase.findIndex(t => t.id.toLowerCase() === slug);
        if (memIdx >= 0) {
            referenceTablesDatabase[memIdx] = updated;
        }

        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const slug = id.trim().toLowerCase();
        const existing = await this.getById(slug);
        if (!existing || existing.is_system) {
            return false;
        }

        try {
            const db = await this.getDb();
            await db.run('DELETE FROM reference_tables WHERE LOWER(id) = LOWER(?)', slug);
        } catch (e) {
            console.warn('ReferenceTableRepository.delete error in SQLite:', e);
        }

        const memIdx = referenceTablesDatabase.findIndex(t => t.id.toLowerCase() === slug);
        if (memIdx >= 0) {
            referenceTablesDatabase.splice(memIdx, 1);
        }

        return true;
    }

    async addRow(tableId: string, rowData: Record<string, any>): Promise<any> {
        const table = await this.getById(tableId);
        if (!table) return null;

        const nextId = table.rows.length > 0
            ? Math.max(...table.rows.map(r => Number(r.id) || 0)) + 1
            : 1;

        const newRow = { id: nextId, ...rowData };
        table.rows.push(newRow);

        await this.update(tableId, { rows: table.rows });
        return newRow;
    }

    async updateRow(tableId: string, rowId: string | number, rowData: Record<string, any>): Promise<any> {
        const table = await this.getById(tableId);
        if (!table) return null;

        const rowIndex = table.rows.findIndex(r => String(r.id) === String(rowId));
        if (rowIndex === -1) return null;

        table.rows[rowIndex] = { ...table.rows[rowIndex], ...rowData, id: table.rows[rowIndex].id };
        await this.update(tableId, { rows: table.rows });
        return table.rows[rowIndex];
    }

    async deleteRow(tableId: string, rowId: string | number): Promise<boolean> {
        const table = await this.getById(tableId);
        if (!table) return false;

        const rowIndex = table.rows.findIndex(r => String(r.id) === String(rowId));
        if (rowIndex === -1) return false;

        table.rows.splice(rowIndex, 1);
        await this.update(tableId, { rows: table.rows });
        return true;
    }

    async addColumn(tableId: string, column: TableColumn): Promise<CustomTable | null> {
        const table = await this.getById(tableId);
        if (!table) return null;

        if (table.columns.some(c => c.key === column.key)) {
            throw new Error(`La colonne avec la clé '${column.key}' existe déjà.`);
        }

        table.columns.push(column);
        return this.update(tableId, { columns: table.columns });
    }

    async updateColumn(tableId: string, columnKey: string, colData: Partial<TableColumn>): Promise<CustomTable | null> {
        const table = await this.getById(tableId);
        if (!table) return null;

        const colIndex = table.columns.findIndex(c => c.key === columnKey);
        if (colIndex === -1) return null;

        table.columns[colIndex] = { ...table.columns[colIndex], ...colData };
        return this.update(tableId, { columns: table.columns });
    }

    async deleteColumn(tableId: string, columnKey: string): Promise<CustomTable | null> {
        const table = await this.getById(tableId);
        if (!table) return null;

        table.columns = table.columns.filter(c => c.key !== columnKey);
        return this.update(tableId, { columns: table.columns });
    }
}

export const referenceTableRepository = new ReferenceTableRepository();
