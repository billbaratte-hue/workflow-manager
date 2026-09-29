import { ISqliteDb, getDatabase } from '../db/database.js';
import { AdminNavSectionConfig, adminNavSectionsDatabase } from '../db/store.js';

export class AdminNavSectionsRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRow(row: any): AdminNavSectionConfig | null {
        if (!row) return null;
        return {
            id: String(row.id),
            key: String(row.key),
            title: String(row.title),
            icon: row.icon || 'fas fa-folder',
            badge: row.badge || '',
            badge_color: row.badge_color || '',
            display_order: Number(row.display_order) || 0,
            is_visible: Number(row.is_visible) === 1,
            is_system: Number(row.is_system) === 1
        };
    }

    async getAll(): Promise<AdminNavSectionConfig[]> {
        try {
            const db = await this.getDb();
            const rows = await db.all('SELECT * FROM admin_nav_sections ORDER BY display_order ASC, id ASC');
            if (rows && rows.length > 0) {
                return rows.map(r => this.mapRow(r)!);
            }
        } catch (e) {
            console.warn('AdminNavSectionsRepository.getAll fallback to store:', e);
        }
        return [...adminNavSectionsDatabase].sort((a, b) => a.display_order - b.display_order);
    }

    async getByKey(key: string): Promise<AdminNavSectionConfig | null> {
        try {
            const db = await this.getDb();
            const row = await db.get('SELECT * FROM admin_nav_sections WHERE LOWER(key) = LOWER(?)', key.trim());
            if (row) return this.mapRow(row);
        } catch (e) {
            console.warn('AdminNavSectionsRepository.getByKey fallback to store:', e);
        }
        const memoryItem = adminNavSectionsDatabase.find(t => t.key.toLowerCase() === key.toLowerCase().trim());
        return memoryItem || null;
    }

    async create(data: {
        key: string;
        title: string;
        icon?: string;
        badge?: string;
        badge_color?: string;
        display_order?: number;
        is_visible?: boolean;
    }): Promise<AdminNavSectionConfig> {
        const db = await this.getDb();
        const cleanKey = data.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const existing = await this.getByKey(cleanKey);
        if (existing) {
            throw new Error(`Une section avec la clé '${cleanKey}' existe déjà.`);
        }

        let order = data.display_order;
        if (order === undefined) {
            const all = await this.getAll();
            order = all.length > 0 ? Math.max(...all.map(s => s.display_order)) + 1 : 1;
        }

        const newSection: AdminNavSectionConfig = {
            id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            key: cleanKey,
            title: data.title.trim(),
            icon: data.icon?.trim() || 'fas fa-folder',
            badge: data.badge?.trim() || '',
            badge_color: data.badge_color?.trim() || '',
            display_order: order,
            is_visible: data.is_visible !== undefined ? data.is_visible : true,
            is_system: false
        };

        await db.run(
            `INSERT INTO admin_nav_sections (id, key, title, icon, badge, badge_color, display_order, is_visible, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            newSection.id,
            newSection.key,
            newSection.title,
            newSection.icon,
            newSection.badge || '',
            newSection.badge_color || '',
            newSection.display_order,
            newSection.is_visible ? 1 : 0,
            0
        );

        adminNavSectionsDatabase.push(newSection);
        return newSection;
    }

    async update(key: string, updates: Partial<AdminNavSectionConfig>): Promise<AdminNavSectionConfig | null> {
        try {
            const db = await this.getDb();
            const current = await this.getByKey(key);
            if (!current) return null;

            const updated: AdminNavSectionConfig = {
                ...current,
                ...updates,
                key: current.key // preserve key
            };

            await db.run(
                `UPDATE admin_nav_sections
                 SET title = ?, icon = ?, badge = ?, badge_color = ?, display_order = ?, is_visible = ?
                 WHERE LOWER(key) = LOWER(?)`,
                updated.title,
                updated.icon,
                updated.badge || '',
                updated.badge_color || '',
                updated.display_order,
                updated.is_visible ? 1 : 0,
                key.trim()
            );

            const memIdx = adminNavSectionsDatabase.findIndex(s => s.key.toLowerCase() === key.toLowerCase().trim());
            if (memIdx > -1) {
                adminNavSectionsDatabase[memIdx] = updated;
            }

            return updated;
        } catch (e) {
            console.error('AdminNavSectionsRepository.update error:', e);
            throw e;
        }
    }

    async batchUpdate(sections: Partial<AdminNavSectionConfig>[]): Promise<AdminNavSectionConfig[]> {
        try {
            for (const sec of sections) {
                if (sec.key) {
                    await this.update(sec.key, sec);
                }
            }
            return await this.getAll();
        } catch (e) {
            console.error('AdminNavSectionsRepository.batchUpdate error:', e);
            throw e;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const db = await this.getDb();
            const current = await this.getByKey(key);
            if (!current) return false;

            if (current.is_system) {
                throw new Error("Impossible de supprimer une section système protégée.");
            }

            // Check if any items belong to this section
            const itemsCount = await db.get<{ count: number }>(
                'SELECT COUNT(*) as count FROM admin_nav_items WHERE LOWER(section) = LOWER(?)',
                key.trim()
            );
            if (itemsCount && Number(itemsCount.count) > 0) {
                throw new Error(`Impossible de supprimer cette section : ${itemsCount.count} élément(s) de menu y sont actuellement rattachés. Déplacez-les d'abord vers une autre section.`);
            }

            await db.run('DELETE FROM admin_nav_sections WHERE LOWER(key) = LOWER(?)', key.trim());

            const memIdx = adminNavSectionsDatabase.findIndex(s => s.key.toLowerCase() === key.toLowerCase().trim());
            if (memIdx > -1) {
                adminNavSectionsDatabase.splice(memIdx, 1);
            }

            return true;
        } catch (e) {
            console.error('AdminNavSectionsRepository.delete error:', e);
            throw e;
        }
    }

    async resetToDefault(): Promise<AdminNavSectionConfig[]> {
        try {
            const db = await this.getDb();
            await db.run('DELETE FROM admin_nav_sections');
            for (const sec of adminNavSectionsDatabase) {
                await db.run(
                    `INSERT INTO admin_nav_sections (id, key, title, icon, badge, badge_color, display_order, is_visible, is_system)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    sec.id,
                    sec.key,
                    sec.title,
                    sec.icon,
                    sec.badge || '',
                    sec.badge_color || '',
                    sec.display_order,
                    sec.is_visible ? 1 : 0,
                    sec.is_system ? 1 : 0
                );
            }
            return await this.getAll();
        } catch (e) {
            console.error('AdminNavSectionsRepository.resetToDefault error:', e);
            throw e;
        }
    }
}

export const adminNavSectionsRepository = new AdminNavSectionsRepository();
