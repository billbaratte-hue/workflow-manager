import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { ReferenceTableRepository } from '../server/repositories/reference-table.repository.js';
import { TableColumn } from '../server/db/store.js';

describe('ReferenceTableRepository & Structure Dynamique SQLite', () => {
    let testDb: ISqliteDb;
    let repo: ReferenceTableRepository;

    beforeEach(async () => {
        // In-memory test database initialized with schema
        testDb = await getDatabase(':memory:');
        repo = new ReferenceTableRepository(testDb);
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    it('doit initialiser et récupérer les référentiels de base pré-alimentés', async () => {
        const tables = await repo.getAll();
        expect(tables.length).toBeGreaterThan(0);

        const sitesTable = tables.find(t => t.id === 'sites');
        expect(sitesTable).toBeDefined();
        expect(sitesTable?.name).toContain('Sites');
        expect(sitesTable?.columns.length).toBeGreaterThan(0);
    });

    it('doit créer un nouveau type de référentiel avec sa structure de données dynamique', async () => {
        const columns: TableColumn[] = [
            { key: 'code', label: 'Code Centre', type: 'text', required: true },
            { key: 'name', label: 'Nom du Centre', type: 'text', required: true },
            { key: 'capacity', label: 'Capacité Rames', type: 'number', required: false },
            { key: 'type', label: 'Type Technicentre', type: 'select', options: ['TGV', 'TER', 'FRET'], required: true },
            { key: 'is_active', label: 'En service', type: 'boolean', required: true }
        ];

        const created = await repo.create({
            id: 'centres_maintenance',
            name: 'Centres de Maintenance & Ateliers',
            description: 'Référentiel dynamique des ateliers matériels roulants',
            category: 'Infrastructure',
            icon: 'fas fa-wrench',
            columns,
            show_in_forms: true,
            allow_multiple: true,
            rows: [
                {
                    id: 1,
                    code: 'CM-LYON-01',
                    name: 'Atelier TGV Lyon Gerland',
                    capacity: 12,
                    type: 'TGV',
                    is_active: true
                }
            ]
        });

        expect(created).toBeDefined();
        expect(created.id).toBe('centres_maintenance');
        expect(created.columns).toHaveLength(5);
        expect(created.columns.map(c => c.key)).toEqual(['code', 'name', 'capacity', 'type', 'is_active']);

        // Check SQLite retrieval
        const fetched = await repo.getById('centres_maintenance');
        expect(fetched).not.toBeNull();
        expect(fetched?.name).toBe('Centres de Maintenance & Ateliers');
        expect(fetched?.columns).toHaveLength(5);
        expect(fetched?.rows).toHaveLength(1);
        expect(fetched?.rows[0].code).toBe('CM-LYON-01');
    });

    it('doit ajouter une nouvelle colonne à la structure de données d\'un référentiel', async () => {
        // Create initial table
        await repo.create({
            id: 'lignes_ferroviaires',
            name: 'Lignes Ferroviaires',
            description: 'Lignes du réseau ferré national',
            category: 'Infrastructure',
            columns: [
                { key: 'code', label: 'Code Ligne', type: 'text', required: true },
                { key: 'name', label: 'Nom Ligne', type: 'text', required: true }
            ],
            rows: []
        });

        // Add column
        const updated = await repo.addColumn('lignes_ferroviaires', {
            key: 'electrification',
            label: 'Tension d\'Alimentation',
            type: 'select',
            options: ['1500V CC', '25000V AC', 'Non électrifiée'],
            required: false
        });

        expect(updated).not.toBeNull();
        expect(updated?.columns).toHaveLength(3);
        expect(updated?.columns.some(c => c.key === 'electrification')).toBe(true);

        const fetched = await repo.getById('lignes_ferroviaires');
        expect(fetched?.columns).toHaveLength(3);
    });

    it('doit supprimer un référentiel personnalisé mais empêcher la suppression d\'une table système', async () => {
        // Attempt deleting system table
        const deleteSystemResult = await repo.delete('sites');
        expect(deleteSystemResult).toBe(false);

        // System table still exists
        const sites = await repo.getById('sites');
        expect(sites).not.toBeNull();

        // Create custom table and delete it
        await repo.create({
            id: 'temporaire',
            name: 'Table Éphémère',
            description: 'Test suppression',
            category: 'Test',
            columns: [{ key: 'id', label: 'ID', type: 'text' }],
            rows: []
        });

        const deleteCustomResult = await repo.delete('temporaire');
        expect(deleteCustomResult).toBe(true);

        const deleted = await repo.getById('temporaire');
        expect(deleted).toBeNull();
    });
});
