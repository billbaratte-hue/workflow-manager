import bcrypt from 'bcryptjs';
import { ISqliteDb, getDatabase } from '../db/database.js';

export interface UserEntity {
    id: number;
    email: string;
    password_hash: string;
    role: string;
    roles: string[];
    name: string;
    status: string;
    attributes: Record<string, any>;
    tenant_id?: string;
}

export class UserRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRowToUser(row: any): UserEntity | null {
        if (!row) return null;
        return {
            id: Number(row.id),
            email: row.email,
            password_hash: row.password_hash,
            role: row.role,
            roles: typeof row.roles === 'string' ? JSON.parse(row.roles) : (row.roles || [row.role]),
            name: row.name,
            status: row.status,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
            tenant_id: row.tenant_id || 'default'
        };
    }

    async findByEmail(email: string, tenantId?: string): Promise<UserEntity | null> {
        const db = await this.getDb();
        const trimmed = email.trim().toLowerCase();
        const query = tenantId && tenantId !== 'all'
            ? 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND (tenant_id = ? OR tenant_id IS NULL)'
            : 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
        const params = tenantId && tenantId !== 'all' ? [trimmed, tenantId] : [trimmed];
        const row = await db.get(query, ...params);
        return this.mapRowToUser(row);
    }

    async findById(id: number, tenantId?: string): Promise<UserEntity | null> {
        const db = await this.getDb();
        const query = tenantId && tenantId !== 'all'
            ? 'SELECT * FROM users WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)'
            : 'SELECT * FROM users WHERE id = ?';
        const params = tenantId && tenantId !== 'all' ? [id, tenantId] : [id];
        const row = await db.get(query, ...params);
        return this.mapRowToUser(row);
    }

    async getAll(tenantId?: string): Promise<UserEntity[]> {
        const db = await this.getDb();
        const query = tenantId && tenantId !== 'all'
            ? 'SELECT * FROM users WHERE tenant_id = ? OR tenant_id IS NULL ORDER BY id ASC'
            : 'SELECT * FROM users ORDER BY id ASC';
        const params = tenantId && tenantId !== 'all' ? [tenantId] : [];
        const rows = await db.all(query, ...params);
        return rows.map(r => this.mapRowToUser(r)!);
    }

    async create(user: {
        id?: number;
        email: string;
        password?: string;
        password_hash?: string;
        role: string;
        roles?: string[];
        name: string;
        status?: string;
        attributes?: Record<string, any>;
        tenant_id?: string;
    }): Promise<UserEntity> {
        const db = await this.getDb();
        const hash = user.password_hash || (user.password ? await bcrypt.hash(user.password, 10) : await bcrypt.hash('ChangeMe123!', 10));
        const rolesList = user.roles || [user.role];
        const status = user.status || 'Actif';
        const attrs = user.attributes || {};
        const tenantId = user.tenant_id || 'default';

        let id = user.id;
        if (!id) {
            const maxIdRow = await db.get<{ maxId: number }>('SELECT MAX(id) as maxId FROM users');
            id = (Number(maxIdRow?.maxId) || 1000) + 1;
        }

        await db.run(
            `INSERT INTO users (id, email, password_hash, role, roles, name, status, attributes, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id,
            user.email.toLowerCase().trim(),
            hash,
            user.role,
            JSON.stringify(rolesList),
            user.name.trim(),
            status,
            JSON.stringify(attrs),
            tenantId
        );

        return {
            id,
            email: user.email.toLowerCase().trim(),
            password_hash: hash,
            role: user.role,
            roles: rolesList,
            name: user.name.trim(),
            status,
            attributes: attrs,
            tenant_id: tenantId
        };
    }

    async update(id: number, updates: Partial<{
        email: string;
        password?: string;
        password_hash?: string;
        role: string;
        roles: string[];
        name: string;
        status: string;
        attributes: Record<string, any>;
    }>): Promise<UserEntity | null> {
        const current = await this.findById(id);
        if (!current) return null;

        const db = await this.getDb();
        let hash = current.password_hash;
        if (updates.password) {
            hash = await bcrypt.hash(updates.password, 10);
        } else if (updates.password_hash) {
            hash = updates.password_hash;
        }

        const email = updates.email ? updates.email.toLowerCase().trim() : current.email;
        const role = updates.role || current.role;
        const roles = updates.roles || current.roles;
        const name = updates.name !== undefined ? updates.name.trim() : current.name;
        const status = updates.status || current.status;
        const attributes = updates.attributes !== undefined ? updates.attributes : current.attributes;

        await db.run(
            `UPDATE users
             SET email = ?, password_hash = ?, role = ?, roles = ?, name = ?, status = ?, attributes = ?
             WHERE id = ?`,
            email,
            hash,
            role,
            JSON.stringify(roles),
            name,
            status,
            JSON.stringify(attributes),
            id
        );

        return {
            id,
            email,
            password_hash: hash,
            role,
            roles,
            name,
            status,
            attributes
        };
    }

    async delete(id: number): Promise<boolean> {
        const db = await this.getDb();
        const result = await db.run('DELETE FROM users WHERE id = ?', id);
        return (result.changes || 0) > 0;
    }

    async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
        if (!plainPassword || !passwordHash) return false;
        return bcrypt.compare(plainPassword, passwordHash);
    }
}

export const userRepository = new UserRepository();
