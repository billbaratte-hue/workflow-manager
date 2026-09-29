import { ISqliteDb, getDatabase } from '../db/database.js';
import { PortalTabConfig, portalTabsDatabase } from '../db/store.js';

export class TabRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    private mapRowToTab(row: any): PortalTabConfig | null {
        if (!row) return null;
        return {
            id: String(row.id),
            key: String(row.key),
            label: String(row.label),
            description: row.description || '',
            icon: row.icon || 'fas fa-th-large',
            path: String(row.path),
            badge: row.badge || '',
            badge_color: row.badge_color || '',
            is_active: Number(row.is_active) === 1,
            display_order: Number(row.display_order) || 0,
            required_privilege: row.required_privilege || undefined,
            is_system: Number(row.is_system) === 1
        };
    }

    async getAll(): Promise<PortalTabConfig[]> {
        try {
            const db = await this.getDb();
            const rows = await db.all('SELECT * FROM portal_tabs ORDER BY display_order ASC, id ASC');
            if (rows && rows.length > 0) {
                return rows.map(r => this.mapRowToTab(r)!);
            }
        } catch (e) {
            console.warn('TabRepository.getAll fallback to store:', e);
        }
        return [...portalTabsDatabase].sort((a, b) => a.display_order - b.display_order);
    }

    async getByKey(key: string): Promise<PortalTabConfig | null> {
        try {
            const db = await this.getDb();
            const row = await db.get('SELECT * FROM portal_tabs WHERE LOWER(key) = LOWER(?)', key.trim());
            if (row) return this.mapRowToTab(row);
        } catch (e) {
            console.warn('TabRepository.getByKey fallback to store:', e);
        }
        const memoryTab = portalTabsDatabase.find(t => t.key.toLowerCase() === key.toLowerCase().trim());
        return memoryTab || null;
    }

    async update(key: string, updates: Partial<PortalTabConfig>): Promise<PortalTabConfig | null> {
        const memoryTab = portalTabsDatabase.find(t => t.key.toLowerCase() === key.toLowerCase().trim());
        if (memoryTab) {
            if (updates.label !== undefined) memoryTab.label = updates.label;
            if (updates.description !== undefined) memoryTab.description = updates.description;
            if (updates.icon !== undefined) memoryTab.icon = updates.icon;
            if (updates.path !== undefined) memoryTab.path = updates.path;
            if (updates.badge !== undefined) memoryTab.badge = updates.badge;
            if (updates.badge_color !== undefined) memoryTab.badge_color = updates.badge_color;
            if (updates.is_active !== undefined) memoryTab.is_active = updates.is_active;
            if (updates.display_order !== undefined) memoryTab.display_order = updates.display_order;
            if (updates.required_privilege !== undefined) memoryTab.required_privilege = updates.required_privilege;
        }

        try {
            const db = await this.getDb();
            const existing = await this.getByKey(key);
            if (!existing) return memoryTab || null;

            const merged = { ...existing, ...updates };
            await db.run(`
                UPDATE portal_tabs 
                SET label = ?, description = ?, icon = ?, path = ?, badge = ?, badge_color = ?, is_active = ?, display_order = ?, required_privilege = ?
                WHERE LOWER(key) = LOWER(?)
            `,
                merged.label,
                merged.description,
                merged.icon,
                merged.path,
                merged.badge || '',
                merged.badge_color || '',
                merged.is_active ? 1 : 0,
                merged.display_order,
                merged.required_privilege || null,
                key.trim()
            );
            return merged;
        } catch (e) {
            console.warn('TabRepository.update error in SQLite:', e);
            return memoryTab || null;
        }
    }

    async create(tab: Omit<PortalTabConfig, 'id'> & { id?: string }): Promise<PortalTabConfig> {
        const id = tab.id || tab.key.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const newTab: PortalTabConfig = {
            id,
            key: tab.key,
            label: tab.label,
            description: tab.description || '',
            icon: tab.icon || 'fas fa-link',
            path: tab.path.startsWith('/') ? tab.path : `/${tab.path}`,
            badge: tab.badge || '',
            badge_color: tab.badge_color || 'bg-blue-100 text-blue-800',
            is_active: tab.is_active !== undefined ? !!tab.is_active : true,
            display_order: Number(tab.display_order) || (portalTabsDatabase.length + 1),
            required_privilege: tab.required_privilege || undefined,
            is_system: !!tab.is_system
        };

        const existingIdx = portalTabsDatabase.findIndex(t => t.key.toLowerCase() === newTab.key.toLowerCase());
        if (existingIdx >= 0) {
            portalTabsDatabase[existingIdx] = newTab;
        } else {
            portalTabsDatabase.push(newTab);
        }

        try {
            const db = await this.getDb();
            await db.run(`
                INSERT INTO portal_tabs (id, key, label, description, icon, path, badge, badge_color, is_active, display_order, required_privilege, is_system)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                newTab.id,
                newTab.key,
                newTab.label,
                newTab.description,
                newTab.icon,
                newTab.path,
                newTab.badge || '',
                newTab.badge_color || '',
                newTab.is_active ? 1 : 0,
                newTab.display_order,
                newTab.required_privilege || null,
                newTab.is_system ? 1 : 0
            );
        } catch (e) {
            console.warn('TabRepository.create error in SQLite:', e);
        }

        return newTab;
    }

    async delete(key: string): Promise<boolean> {
        const idx = portalTabsDatabase.findIndex(t => t.key.toLowerCase() === key.toLowerCase().trim());
        if (idx >= 0) {
            if (portalTabsDatabase[idx].is_system) {
                throw new Error("Impossible de supprimer un onglet système de base. Vous pouvez uniquement le désactiver.");
            }
            portalTabsDatabase.splice(idx, 1);
        }

        try {
            const db = await this.getDb();
            const tab = await this.getByKey(key);
            if (tab && tab.is_system) {
                throw new Error("Impossible de supprimer un onglet système de base.");
            }
            await db.run('DELETE FROM portal_tabs WHERE LOWER(key) = LOWER(?)', key.trim());
            return true;
        } catch (e) {
            console.warn('TabRepository.delete error:', e);
            return idx >= 0;
        }
    }

    async reset(): Promise<PortalTabConfig[]> {
        portalTabsDatabase.length = 0;
        const initialTabs: PortalTabConfig[] = [
            { id: "catalogue", key: "catalogue", label: "Catalogue", description: "Parcourir les processus mécatroniques et initier des demandes d'intervention", icon: "fas fa-th-large", path: "/", badge: "Opérationnel", badge_color: "bg-blue-100 text-blue-800", is_active: true, display_order: 1, is_system: true },
            { id: "mes-demandes", key: "mes-demandes", label: "Mes Demandes", description: "Suivi en temps réel des demandes d'intervention et historique personnel", icon: "fas fa-folder", path: "/mes-demandes", badge: "", badge_color: "", is_active: true, display_order: 2, is_system: true },
            { id: "corbeille", key: "corbeille", label: "Corbeille Validateur", description: "Validation hiérarchique et technique des accès aux emprises ferroviaires", icon: "fas fa-inbox", path: "/corbeille", badge: "SLA 24h", badge_color: "bg-amber-100 text-amber-800", is_active: true, display_order: 3, required_privilege: "validate_requests", is_system: true },
            { id: "historique-decisions", key: "historique-decisions", label: "Historique des Décisions", description: "Journal d'audit des validations, refus et signatures électroniques", icon: "fas fa-history", path: "/historique-decisions", badge: "", badge_color: "", is_active: true, display_order: 4, is_system: true },
            { id: "tableau-de-bord", key: "tableau-de-bord", label: "Tableau de Bord", description: "Indicateurs d'activité, respect des SLA et volumes d'accès par site", icon: "fas fa-chart-line", path: "/tableau-de-bord", badge: "KPIs", badge_color: "bg-emerald-100 text-emerald-800", is_active: true, display_order: 5, is_system: true },
            { id: "delegation", key: "delegation", label: "Délégations", description: "Délégations temporaires de pouvoir de validation et suppléance", icon: "fas fa-exchange-alt", path: "/delegation", badge: "", badge_color: "", is_active: true, display_order: 6, required_privilege: "validate_requests", is_system: true },
            { id: "admin", key: "admin", label: "Espace Administrateur", description: "Gouvernance des workflows, tables, catalogues et droits d'accès RBAC", icon: "fas fa-shield-alt", path: "/admin", badge: "Admin", badge_color: "bg-purple-100 text-purple-800", is_active: true, display_order: 7, required_privilege: "manage_users", is_system: true }
        ];

        for (const t of initialTabs) {
            portalTabsDatabase.push(t);
        }

        try {
            const db = await this.getDb();
            await db.run('DELETE FROM portal_tabs');
            for (const t of initialTabs) {
                await db.run(`
                    INSERT INTO portal_tabs (id, key, label, description, icon, path, badge, badge_color, is_active, display_order, required_privilege, is_system)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, t.id, t.key, t.label, t.description, t.icon, t.path, t.badge || '', t.badge_color || '', t.is_active ? 1 : 0, t.display_order, t.required_privilege || null, t.is_system ? 1 : 0);
            }
        } catch (e) {
            console.warn('TabRepository.reset error:', e);
        }

        return [...portalTabsDatabase];
    }
}

export const tabRepository = new TabRepository();
