import { ISqliteDb, getDatabase } from '../db/database.js';
import { Role } from '../db/store.js';

export class RoleRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRowToRole(row: any): Role | null {
        if (!row) return null;
        return {
            id: Number(row.id),
            name: row.name,
            description: row.description || '',
            privileges: typeof row.privileges === 'string' ? JSON.parse(row.privileges) : (row.privileges || []),
            portalTabs: typeof row.portal_tabs === 'string' ? JSON.parse(row.portal_tabs) : (row.portal_tabs || {}),
            tablePermissions: typeof row.table_permissions === 'string' ? JSON.parse(row.table_permissions) : (row.table_permissions || {}),
            referenceVisibilityRules: typeof row.reference_visibility_rules === 'string' ? JSON.parse(row.reference_visibility_rules) : (row.reference_visibility_rules || [])
        };
    }

    async getAll(): Promise<Role[]> {
        const db = await this.getDb();
        const rows = await db.all('SELECT * FROM roles ORDER BY id ASC');
        return rows.map(r => this.mapRowToRole(r)!);
    }

    async getByName(name: string): Promise<Role | null> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM roles WHERE LOWER(name) = LOWER(?)', name.trim());
        return this.mapRowToRole(row);
    }

    async getById(id: number): Promise<Role | null> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM roles WHERE id = ?', id);
        return this.mapRowToRole(row);
    }

    async create(role: {
        id?: number;
        name: string;
        description?: string;
        privileges: string[];
        portalTabs?: Record<string, boolean>;
        tablePermissions?: Record<string, any>;
        referenceVisibilityRules?: any[];
    }): Promise<Role> {
        const db = await this.getDb();
        let id = role.id;
        if (!id) {
            const maxRow = await db.get<{ maxId: number }>('SELECT MAX(id) as maxId FROM roles');
            id = (Number(maxRow?.maxId) || 10) + 1;
        }

        await db.run(
            `INSERT INTO roles (id, name, description, privileges, portal_tabs, table_permissions, reference_visibility_rules)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            id,
            role.name.trim(),
            role.description || '',
            JSON.stringify(role.privileges || []),
            JSON.stringify(role.portalTabs || {}),
            JSON.stringify(role.tablePermissions || {}),
            JSON.stringify(role.referenceVisibilityRules || [])
        );

        return {
            id,
            name: role.name.trim(),
            description: role.description || '',
            privileges: role.privileges || [],
            portalTabs: role.portalTabs || {},
            tablePermissions: role.tablePermissions || {},
            referenceVisibilityRules: role.referenceVisibilityRules || []
        };
    }

    async update(id: number, updates: Partial<Role>): Promise<Role | null> {
        const current = await this.getById(id);
        if (!current) return null;

        const db = await this.getDb();
        const name = updates.name !== undefined ? updates.name.trim() : current.name;
        const description = updates.description !== undefined ? updates.description : current.description;
        const privileges = updates.privileges !== undefined ? updates.privileges : current.privileges;
        const portalTabs = updates.portalTabs !== undefined ? updates.portalTabs : current.portalTabs;
        const tablePermissions = updates.tablePermissions !== undefined ? updates.tablePermissions : current.tablePermissions;
        const referenceVisibilityRules = updates.referenceVisibilityRules !== undefined ? updates.referenceVisibilityRules : current.referenceVisibilityRules;

        await db.run(
            `UPDATE roles
             SET name = ?, description = ?, privileges = ?, portal_tabs = ?, table_permissions = ?, reference_visibility_rules = ?
             WHERE id = ?`,
            name,
            description,
            JSON.stringify(privileges || []),
            JSON.stringify(portalTabs || {}),
            JSON.stringify(tablePermissions || {}),
            JSON.stringify(referenceVisibilityRules || []),
            id
        );

        return {
            id,
            name,
            description,
            privileges,
            portalTabs,
            tablePermissions,
            referenceVisibilityRules
        };
    }

    async delete(id: number): Promise<boolean> {
        const db = await this.getDb();
        const result = await db.run('DELETE FROM roles WHERE id = ?', id);
        return (result.changes || 0) > 0;
    }
}

export const roleRepository = new RoleRepository();
