import { ISqliteDb, getDatabase } from '../db/database.js';
import { AdminNavItemConfig, adminNavDatabase } from '../db/store.js';

export class AdminNavRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRow(row: any): AdminNavItemConfig | null {
        if (!row) return null;
        return {
            id: String(row.id),
            key: String(row.key),
            label: String(row.label),
            path: String(row.path),
            icon: row.icon || 'fas fa-link',
            section: row.section as 'security' | 'business' | 'compliance',
            badge: row.badge || '',
            badge_color: row.badge_color || '',
            is_visible: Number(row.is_visible) === 1,
            display_order: Number(row.display_order) || 0,
            associated_feature_key: row.associated_feature_key || undefined,
            is_system: Number(row.is_system) === 1
        };
    }

    async getAll(): Promise<AdminNavItemConfig[]> {
        try {
            const db = await this.getDb();
            const rows = await db.all('SELECT * FROM admin_nav_items ORDER BY display_order ASC, id ASC');
            if (rows && rows.length > 0) {
                const mapped = rows.map(r => this.mapRow(r)!);
                for (const defItem of adminNavDatabase) {
                    if (defItem.is_system && !mapped.some(m => m.key.toLowerCase() === defItem.key.toLowerCase())) {
                        try {
                            await db.run(
                                `INSERT INTO admin_nav_items (id, key, label, path, icon, section, badge, badge_color, is_visible, display_order, associated_feature_key, is_system)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                defItem.id,
                                defItem.key,
                                defItem.label,
                                defItem.path,
                                defItem.icon,
                                defItem.section,
                                defItem.badge || '',
                                defItem.badge_color || '',
                                defItem.is_visible ? 1 : 0,
                                defItem.display_order,
                                defItem.associated_feature_key || null,
                                1
                            );
                            mapped.push(defItem);
                        } catch (err) {
                            // ignore duplicate
                        }
                    }
                }
                return mapped.sort((a, b) => a.display_order - b.display_order);
            }
        } catch (e) {
            console.warn('AdminNavRepository.getAll fallback to store:', e);
        }
        return [...adminNavDatabase].sort((a, b) => a.display_order - b.display_order);
    }

    async getByKey(key: string): Promise<AdminNavItemConfig | null> {
        try {
            const db = await this.getDb();
            const row = await db.get('SELECT * FROM admin_nav_items WHERE LOWER(key) = LOWER(?)', key.trim());
            if (row) return this.mapRow(row);
        } catch (e) {
            console.warn('AdminNavRepository.getByKey fallback to store:', e);
        }
        const memoryItem = adminNavDatabase.find(t => t.key.toLowerCase() === key.toLowerCase().trim());
        return memoryItem || null;
    }

    async update(key: string, updates: Partial<AdminNavItemConfig>): Promise<AdminNavItemConfig | null> {
        try {
            const db = await this.getDb();
            const current = await this.getByKey(key);
            if (!current) return null;

            const updated: AdminNavItemConfig = {
                ...current,
                ...updates,
                key: current.key // preserve key
            };

            await db.run(
                `UPDATE admin_nav_items
                 SET label = ?, path = ?, icon = ?, section = ?, badge = ?, badge_color = ?,
                     is_visible = ?, display_order = ?, associated_feature_key = ?
                 WHERE LOWER(key) = LOWER(?)`,
                updated.label,
                updated.path,
                updated.icon,
                updated.section,
                updated.badge || '',
                updated.badge_color || '',
                updated.is_visible ? 1 : 0,
                updated.display_order,
                updated.associated_feature_key || null,
                key.trim()
            );

            // Update in-memory fallback
            const memIdx = adminNavDatabase.findIndex(t => t.key.toLowerCase() === key.toLowerCase().trim());
            if (memIdx > -1) {
                adminNavDatabase[memIdx] = updated;
            }

            return updated;
        } catch (e) {
            console.error('AdminNavRepository.update error:', e);
            throw e;
        }
    }

    async batchUpdate(items: Partial<AdminNavItemConfig>[]): Promise<AdminNavItemConfig[]> {
        try {
            const db = await this.getDb();
            for (const item of items) {
                if (item.key) {
                    await this.update(item.key, item);
                }
            }
            return await this.getAll();
        } catch (e) {
            console.error('AdminNavRepository.batchUpdate error:', e);
            throw e;
        }
    }

    async create(data: {
        key: string;
        label: string;
        path: string;
        icon?: string;
        section: string;
        badge?: string;
        badge_color?: string;
        display_order?: number;
        associated_feature_key?: string;
        is_visible?: boolean;
    }): Promise<AdminNavItemConfig> {
        const db = await this.getDb();
        const cleanKey = data.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const existing = await this.getByKey(cleanKey);
        if (existing) {
            throw new Error(`Un élément de navigation avec la clé '${cleanKey}' existe déjà.`);
        }

        let order = data.display_order;
        if (order === undefined) {
            const all = await this.getAll();
            order = all.length > 0 ? Math.max(...all.map(s => s.display_order)) + 1 : 1;
        }

        const newItem: AdminNavItemConfig = {
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            key: cleanKey,
            label: data.label.trim(),
            path: data.path.trim(),
            icon: data.icon?.trim() || 'fas fa-link',
            section: data.section.trim(),
            badge: data.badge?.trim() || '',
            badge_color: data.badge_color?.trim() || '',
            display_order: order,
            associated_feature_key: data.associated_feature_key?.trim() || undefined,
            is_visible: data.is_visible !== undefined ? data.is_visible : true,
            is_system: false
        };

        await db.run(
            `INSERT INTO admin_nav_items (id, key, label, path, icon, section, badge, badge_color, is_visible, display_order, associated_feature_key, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            newItem.id,
            newItem.key,
            newItem.label,
            newItem.path,
            newItem.icon,
            newItem.section,
            newItem.badge || '',
            newItem.badge_color || '',
            newItem.is_visible ? 1 : 0,
            newItem.display_order,
            newItem.associated_feature_key || null,
            0
        );

        adminNavDatabase.push(newItem);
        return newItem;
    }

    async delete(key: string): Promise<boolean> {
        const db = await this.getDb();
        const current = await this.getByKey(key);
        if (!current) return false;
        if (current.is_system) {
            throw new Error("Impossible de supprimer un élément système par défaut.");
        }

        await db.run('DELETE FROM admin_nav_items WHERE LOWER(key) = LOWER(?)', key.trim());

        const memIdx = adminNavDatabase.findIndex(t => t.key.toLowerCase() === key.toLowerCase().trim());
        if (memIdx > -1) {
            adminNavDatabase.splice(memIdx, 1);
        }
        return true;
    }

    async resetToDefault(): Promise<AdminNavItemConfig[]> {
        try {
            const db = await this.getDb();
            await db.run('DELETE FROM admin_nav_items');
            for (const item of adminNavDatabase) {
                await db.run(
                    `INSERT INTO admin_nav_items (id, key, label, path, icon, section, badge, badge_color, is_visible, display_order, associated_feature_key, is_system)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    item.id,
                    item.key,
                    item.label,
                    item.path,
                    item.icon,
                    item.section,
                    item.badge || '',
                    item.badge_color || '',
                    item.is_visible ? 1 : 0,
                    item.display_order,
                    item.associated_feature_key || null,
                    item.is_system ? 1 : 0
                );
            }
            return await this.getAll();
        } catch (e) {
            console.error('AdminNavRepository.resetToDefault error:', e);
            throw e;
        }
    }
}

export const adminNavRepository = new AdminNavRepository();
