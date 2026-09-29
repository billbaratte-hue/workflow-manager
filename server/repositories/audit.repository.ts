import { ISqliteDb, getDatabase } from '../db/database.js';
import { AuditLog } from '../db/store.js';

export class AuditRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    async log(entry: {
        actor: string;
        role: string;
        action: string;
        target: string;
        details?: string;
        timestamp?: string;
    }): Promise<AuditLog> {
        const db = await this.getDb();
        const timestamp = entry.timestamp || new Date().toISOString();
        const details = entry.details || '';

        const result = await db.run(
            `INSERT INTO audit_logs (timestamp, actor, role, action, target, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            timestamp,
            entry.actor,
            entry.role,
            entry.action,
            entry.target,
            details
        );

        return {
            id: result.lastID || 1,
            timestamp,
            actor: entry.actor,
            role: entry.role,
            action: entry.action,
            target: entry.target,
            details
        };
    }

    async getAll(limit = 100): Promise<AuditLog[]> {
        const db = await this.getDb();
        const rows = await db.all(
            'SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?',
            limit
        );
        return rows.map(r => ({
            id: Number(r.id),
            timestamp: r.timestamp,
            actor: r.actor,
            role: r.role,
            action: r.action,
            target: r.target,
            details: r.details
        }));
    }
}

export const auditRepository = new AuditRepository();
