import { ISqliteDb, getDatabase } from '../db/database.js';

export interface SystemSetting {
    key: string;
    value_json: string;
    category: 'quotas' | 'relances' | 'rgpd' | 'tarification' | string;
    description?: string;
    updated_by?: string | null;
    updated_at: string;
    parsed_value?: any;
}

export class SettingsRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRow(row: any): SystemSetting | null {
        if (!row) return null;
        let parsed_value = null;
        try {
            parsed_value = JSON.parse(row.value_json);
        } catch {
            parsed_value = row.value_json;
        }

        return {
            key: row.key,
            value_json: row.value_json,
            category: row.category,
            description: row.description || '',
            updated_by: row.updated_by || null,
            updated_at: row.updated_at,
            parsed_value
        };
    }

    async getAll(): Promise<SystemSetting[]> {
        const db = await this.getDb();
        const rows = await db.all('SELECT * FROM system_settings ORDER BY category ASC, key ASC');
        return rows.map(r => this.mapRow(r)!);
    }

    async getByKey<T = any>(key: string): Promise<{ setting: SystemSetting | null; value: T | null }> {
        const db = await this.getDb();
        const row = await db.get('SELECT * FROM system_settings WHERE key = ?', key);
        if (!row) return { setting: null, value: null };
        const setting = this.mapRow(row);
        return { setting, value: setting ? setting.parsed_value as T : null };
    }

    async getSettingValue<T = any>(key: string, defaultValue: T): Promise<T> {
        try {
            const { value } = await this.getByKey<T>(key);
            if (value !== null && value !== undefined) {
                return value;
            }
        } catch (e) {
            console.warn(`SettingsRepository.getSettingValue fallback for '${key}':`, e);
        }
        return defaultValue;
    }

    async setSetting(
        key: string,
        value: any,
        category?: string,
        description?: string,
        updatedBy?: string
    ): Promise<SystemSetting> {
        const db = await this.getDb();
        const valueJson = typeof value === 'string' ? value : JSON.stringify(value);
        const now = new Date().toISOString();

        const existing = await db.get('SELECT * FROM system_settings WHERE key = ?', key);
        if (existing) {
            await db.run(
                `UPDATE system_settings SET
                    value_json = ?,
                    category = COALESCE(?, category),
                    description = COALESCE(?, description),
                    updated_by = ?,
                    updated_at = ?
                 WHERE key = ?`,
                valueJson,
                category || null,
                description || null,
                updatedBy || null,
                now,
                key
            );
        } else {
            await db.run(
                `INSERT INTO system_settings (key, value_json, category, description, updated_by, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                key,
                valueJson,
                category || 'general',
                description || '',
                updatedBy || null,
                now
            );
        }

        const updated = await db.get('SELECT * FROM system_settings WHERE key = ?', key);
        return this.mapRow(updated)!;
    }

    async deleteSetting(key: string): Promise<boolean> {
        const db = await this.getDb();
        const res = await db.run('DELETE FROM system_settings WHERE key = ?', key);
        return (res.changes || 0) > 0;
    }
}

export const settingsRepository = new SettingsRepository();
