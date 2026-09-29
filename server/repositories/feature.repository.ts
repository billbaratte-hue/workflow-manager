import { ISqliteDb, getDatabase } from '../db/database.js';
import { logAction } from '../db/store.js';

export interface SystemFeatureItem {
    key: string;
    name: string;
    description: string;
    category: string;
    is_enabled: boolean;
    icon?: string;
    updated_at?: string;
}

export const DEFAULT_FEATURES: SystemFeatureItem[] = [
    {
        key: 'ai_demandes',
        name: "Assistance IA & Analyse Prédictive (Gemini)",
        description: "Active l'ensemble des modules d'intelligence artificielle : aide à la rédaction de demandes, analyse et aide à la décision pour les validateurs, recommandation automatique de périmètres et audit de conformité de sécurité des rôles.",
        category: 'Intelligence Artificielle & Automatisation',
        is_enabled: false,
        icon: 'fas fa-robot'
    },
    {
        key: 'role_field_scope',
        name: 'Périmètre Granulaire de Champs dans les Rôles',
        description: "Permet de restreindre et d'assigner les périmètres territoriaux/organisationnels (National, Région, Secteur, Équipe) et le filtrage des champs visibles par table et référentiel dans la gestion des rôles.",
        category: 'Rôles & Habilitations',
        is_enabled: true,
        icon: 'fas fa-eye-slash'
    },
    {
        key: 'role_simulation',
        name: "Simulation & Rendu d'Interface des Rôles",
        description: "Active le simulateur en temps réel de la barre de navigation et des fiches pour tester la visibilité des champs et auditer les permissions accordées à un rôle.",
        category: 'Rôles & Habilitations',
        is_enabled: true,
        icon: 'fas fa-vial'
    },
    {
        key: 'referentiels_management',
        name: 'Gestion des Référentiels Métier & Tables',
        description: "Permet la consultation, création, modification, import/export CSV et la gestion des données au sein des tables de référence de la plateforme.",
        category: 'Référentiels & Données',
        is_enabled: true,
        icon: 'fas fa-database'
    },
    {
        key: 'referentiel_types_structure',
        name: 'Définition des Types de Référentiels (Structure & DB)',
        description: "Active le concepteur de schémas de données : typage des colonnes (texte, entier, date, sélecteur, clé étrangère), contraintes d'intégrité et gestion des métadonnées.",
        category: 'Référentiels & Données',
        is_enabled: true,
        icon: 'fas fa-layer-group'
    },
    {
        key: 'metadata_schema',
        name: 'Schéma des Métadonnées & Attributs Transverses',
        description: 'Permet de configurer des tags, catégories hiérarchiques et badges de criticité transverses sur les tables de référence et leurs enregistrements.',
        category: 'Référentiels & Données',
        is_enabled: true,
        icon: 'fas fa-tags'
    },
    {
        key: 'export_csv_advanced',
        name: 'Export CSV & Rapports Structurés',
        description: 'Active les boutons d\'exportation CSV normalisés pour les référentiels de données et la liste des demandes.',
        category: 'Outils & Données',
        is_enabled: true,
        icon: 'fas fa-file-csv'
    },
    {
        key: 'delegation_approval',
        name: 'Délégations de Pouvoir de Validation',
        description: 'Permet aux validateurs d\'assigner des suppléants temporaires pour traiter les demandes pendant leurs congés ou indisponibilités.',
        category: 'Workflow & Sécurité',
        is_enabled: true,
        icon: 'fas fa-exchange-alt'
    },
    {
        key: 'syslog_audit_nis2',
        name: 'Traçabilité Syslog & Audit NIS 2',
        description: 'Active la journalisation et l\'interface d\'audit de sécurité des opérations sensibles conformément aux exigences NIS 2.',
        category: 'Sécurité & Conformité',
        is_enabled: true,
        icon: 'fas fa-shield-alt'
    }
];

export class FeatureRepository {
    private db: ISqliteDb | null = null;
    private inMemoryFeatures: Map<string, SystemFeatureItem> = new Map();

    constructor(db?: ISqliteDb) {
        if (db) this.db = db;
        DEFAULT_FEATURES.forEach(f => this.inMemoryFeatures.set(f.key, { ...f }));
    }

    private async getDb(): Promise<ISqliteDb> {
        if (!this.db) {
            this.db = await getDatabase();
        }
        return this.db;
    }

    async getAll(): Promise<SystemFeatureItem[]> {
        try {
            const db = await this.getDb();
            const rows = await db.all<any>('SELECT * FROM system_features ORDER BY category ASC, key ASC');
            if (rows && rows.length > 0) {
                return rows.map(r => ({
                    key: r.key,
                    name: r.name,
                    description: r.description,
                    category: r.category,
                    is_enabled: Boolean(r.is_enabled),
                    icon: r.icon,
                    updated_at: r.updated_at
                }));
            }
        } catch (e) {
            console.warn('FeatureRepository.getAll error, fallback to memory:', e);
        }
        return Array.from(this.inMemoryFeatures.values());
    }

    async getFeaturesMap(): Promise<Record<string, boolean>> {
        const features = await this.getAll();
        const map: Record<string, boolean> = {};
        for (const f of features) {
            map[f.key] = f.is_enabled;
        }
        return map;
    }

    async isEnabled(key: string): Promise<boolean> {
        try {
            const db = await this.getDb();
            const row = await db.get<any>('SELECT is_enabled FROM system_features WHERE key = ?', key);
            if (row !== undefined) {
                return Boolean(row.is_enabled);
            }
        } catch (e) {
            console.warn('FeatureRepository.isEnabled error:', e);
        }
        const mem = this.inMemoryFeatures.get(key);
        return mem ? mem.is_enabled : true;
    }

    async setEnabled(key: string, isEnabled: boolean, actor: string = 'Administrateur'): Promise<SystemFeatureItem | null> {
        const now = new Date().toISOString();
        const lowerKey = String(key || '').toLowerCase();

        // Update in-memory entry if present
        for (const [k, v] of this.inMemoryFeatures.entries()) {
            if (k.toLowerCase() === lowerKey) {
                v.is_enabled = isEnabled;
                v.updated_at = now;
            }
        }

        try {
            const db = await this.getDb();
            const existing = await db.get<any>('SELECT * FROM system_features WHERE LOWER(key) = ?', lowerKey);
            
            if (existing) {
                await db.run(
                    'UPDATE system_features SET is_enabled = ?, updated_at = ? WHERE LOWER(key) = ?',
                    isEnabled ? 1 : 0,
                    now,
                    lowerKey
                );
                try {
                    logAction(
                        actor,
                        'Administrateur',
                        'TOGGLE_FEATURE',
                        existing.key,
                        `Fonctionnalité '${existing.name}' ${isEnabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`
                    );
                } catch (logErr) {
                    console.warn('logAction error:', logErr);
                }
                return {
                    key: existing.key,
                    name: existing.name,
                    description: existing.description,
                    category: existing.category,
                    is_enabled: isEnabled,
                    icon: existing.icon,
                    updated_at: now
                };
            } else {
                // If not found in DB, search in memory or fallback
                let memItem: SystemFeatureItem | undefined;
                for (const [k, v] of this.inMemoryFeatures.entries()) {
                    if (k.toLowerCase() === lowerKey) {
                        memItem = v;
                        break;
                    }
                }
                const finalKey = memItem ? memItem.key : key;
                const name = memItem ? memItem.name : key;
                const description = memItem ? memItem.description : '';
                const category = memItem ? memItem.category : 'Général';
                const icon = memItem ? memItem.icon : 'fas fa-cog';

                await db.run(
                    'INSERT INTO system_features (key, name, description, category, is_enabled, icon, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    finalKey,
                    name,
                    description,
                    category,
                    isEnabled ? 1 : 0,
                    icon,
                    now
                );
                return {
                    key: finalKey,
                    name,
                    description,
                    category,
                    is_enabled: isEnabled,
                    icon,
                    updated_at: now
                };
            }
        } catch (e) {
            console.warn('FeatureRepository.setEnabled error:', e);
        }

        for (const [k, v] of this.inMemoryFeatures.entries()) {
            if (k.toLowerCase() === lowerKey) {
                return { ...v };
            }
        }
        return null;
    }

    async updateBatch(updates: Record<string, boolean>, actor: string = 'Administrateur'): Promise<SystemFeatureItem[]> {
        for (const [key, enabled] of Object.entries(updates)) {
            await this.setEnabled(key, Boolean(enabled), actor);
        }
        return this.getAll();
    }
}

export const featureRepository = new FeatureRepository();
