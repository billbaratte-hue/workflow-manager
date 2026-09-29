import { ISqliteDb, getDatabase } from '../db/database.js';

export interface Tenant {
    id: string;
    name: string;
    code: string;
    logo_url?: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    description?: string;
    created_at: string;
    updated_at?: string;
}

export class TenantRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRow(row: any): Tenant | null {
        if (!row) return null;
        return {
            id: String(row.id),
            name: String(row.name),
            code: String(row.code),
            logo_url: row.logo_url || '',
            primary_color: row.primary_color || '#1e3a8a',
            secondary_color: row.secondary_color || '#0f172a',
            accent_color: row.accent_color || '#f59e0b',
            description: row.description || '',
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || undefined
        };
    }

    async getAll(): Promise<Tenant[]> {
        const db = await this.getDb();
        const rows = await db.all('SELECT * FROM tenants ORDER BY created_at ASC');
        return rows.map(r => this.mapRow(r)!);
    }

    async getById(id: string): Promise<Tenant | null> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM tenants WHERE LOWER(id) = LOWER(?)', id.trim());
        return this.mapRow(row);
    }

    async getByCode(code: string): Promise<Tenant | null> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM tenants WHERE LOWER(code) = LOWER(?)', code.trim());
        return this.mapRow(row);
    }

    async create(tenant: Omit<Tenant, 'created_at'>): Promise<Tenant> {
        const db = await this.getDb();
        const now = new Date().toISOString();
        const id = tenant.id.toLowerCase().trim();
        const code = tenant.code.toUpperCase().trim();

        await db.run(
            `INSERT INTO tenants (id, name, code, logo_url, primary_color, secondary_color, accent_color, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id,
            tenant.name.trim(),
            code,
            tenant.logo_url || '',
            tenant.primary_color || '#1e3a8a',
            tenant.secondary_color || '#0f172a',
            tenant.accent_color || '#f59e0b',
            tenant.description || '',
            now,
            now
        );

        return {
            id,
            name: tenant.name.trim(),
            code,
            logo_url: tenant.logo_url || '',
            primary_color: tenant.primary_color || '#1e3a8a',
            secondary_color: tenant.secondary_color || '#0f172a',
            accent_color: tenant.accent_color || '#f59e0b',
            description: tenant.description || '',
            created_at: now,
            updated_at: now
        };
    }

    async update(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
        const db = await this.getDb();
        const current = await this.getById(id);
        if (!current) return null;

        const merged: Tenant = {
            ...current,
            ...updates,
            updated_at: new Date().toISOString()
        };

        await db.run(
            `UPDATE tenants
             SET name = ?, code = ?, logo_url = ?, primary_color = ?, secondary_color = ?, accent_color = ?, description = ?, updated_at = ?
             WHERE LOWER(id) = LOWER(?)`,
            merged.name,
            merged.code,
            merged.logo_url || '',
            merged.primary_color,
            merged.secondary_color,
            merged.accent_color,
            merged.description || '',
            merged.updated_at,
            id.trim()
        );

        return merged;
    }

    async delete(id: string): Promise<boolean> {
        if (id.toLowerCase() === 'default') {
            throw new Error("Le tenant par défaut 'default' ne peut pas être supprimé.");
        }
        const db = await this.getDb();
        const res = await db.run('DELETE FROM tenants WHERE LOWER(id) = LOWER(?)', id.trim());
        return res.changes > 0;
    }
}

export const tenantRepository = new TenantRepository();
