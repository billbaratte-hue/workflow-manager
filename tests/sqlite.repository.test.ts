import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { UserRepository } from '../server/repositories/user.repository.js';
import { RequestRepository } from '../server/repositories/request.repository.js';
import { AuditRepository } from '../server/repositories/audit.repository.js';
import { TabRepository } from '../server/repositories/tab.repository.js';

describe('SQLite Repositories & Persistance', () => {
    let testDb: ISqliteDb;
    let userRepo: UserRepository;
    let reqRepo: RequestRepository;
    let auditRepo: AuditRepository;
    let tabRepo: TabRepository;

    beforeEach(async () => {
        testDb = await getDatabase(':memory:');
        userRepo = new UserRepository(testDb);
        reqRepo = new RequestRepository(testDb);
        auditRepo = new AuditRepository(testDb);
        tabRepo = new TabRepository(testDb);
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    it('doit initialiser et lire les utilisateurs pré-configurés', async () => {
        const users = await userRepo.getAll();
        expect(users.length).toBeGreaterThan(0);

        const admin = await userRepo.findByEmail('admin@entreprise.fr');
        expect(admin).toBeDefined();
        expect(admin?.role).toBe('Administrateur');
        expect(admin?.password_hash).toBeTruthy();
    });

    it('doit créer, mettre à jour et supprimer un utilisateur avec hash de mot de passe', async () => {
        const created = await userRepo.create({
            email: 'test.agent@entreprise.fr',
            password: 'secretPassword123',
            role: 'Demandeur',
            name: 'Agent Test',
            attributes: { region: 'Grand Est', service: 'Voie' }
        });

        expect(created.id).toBeDefined();
        expect(created.email).toBe('test.agent@entreprise.fr');

        // Check password verification
        const isMatch = await userRepo.verifyPassword('secretPassword123', created.password_hash);
        expect(isMatch).toBe(true);
        const isWrong = await userRepo.verifyPassword('wrongPassword', created.password_hash);
        expect(isWrong).toBe(false);

        // Update user
        const updated = await userRepo.update(created.id, {
            name: 'Agent Test Modifié',
            role: 'Manager'
        });
        expect(updated?.name).toBe('Agent Test Modifié');
        expect(updated?.role).toBe('Manager');

        // Delete user
        const deleted = await userRepo.delete(created.id);
        expect(deleted).toBe(true);

        const notFound = await userRepo.findById(created.id);
        expect(notFound).toBeNull();
    });

    it('doit générer des références de demande uniques et séquentielles', async () => {
        const ref1 = await reqRepo.generateNextReference();
        expect(ref1).toMatch(/^DEM-\d{4}-\d{3}$/);

        const req = await reqRepo.create({
            reference: ref1,
            title: 'Test demande 1',
            description: 'Description 1',
            beneficiaire_id: 1042,
            stages: []
        });
        expect(req.reference).toBe(ref1);

        const ref2 = await reqRepo.generateNextReference();
        expect(ref2).not.toBe(ref1);
    });

    it('doit persister les logs d’audit avec horodatage et détails', async () => {
        const log = await auditRepo.log({
            actor: 'Système Test',
            role: 'Audit',
            action: 'TEST_PERSISTANCE_SQLITE',
            target: 'TableRequests',
            details: 'Vérification de la conformité d’écriture'
        });

        expect(log.id).toBeDefined();
        expect(log.timestamp).toBeDefined();

        const allLogs = await auditRepo.getAll(10);
        expect(allLogs.some(l => l.action === 'TEST_PERSISTANCE_SQLITE')).toBe(true);
    });

    it('doit charger, mettre à jour et réinitialiser les onglets configurables depuis SQLite', async () => {
        const tabs = await tabRepo.getAll();
        expect(tabs.length).toBeGreaterThanOrEqual(7);

        const catalogueTab = tabs.find(t => t.key === 'catalogue');
        expect(catalogueTab).toBeDefined();
        expect(catalogueTab?.label).toBe('Catalogue');

        // Update a tab label and description (UI-driven, no code change)
        const updated = await tabRepo.update('catalogue', {
            label: 'Catalogue Opérationnel Modifié',
            description: 'Nouvelle description opérationnelle'
        });
        expect(updated?.label).toBe('Catalogue Opérationnel Modifié');
        expect(updated?.description).toBe('Nouvelle description opérationnelle');

        const reloaded = await tabRepo.getByKey('catalogue');
        expect(reloaded?.label).toBe('Catalogue Opérationnel Modifié');

        // Create a custom tab
        const createdTab = await tabRepo.create({
            id: 'nouveau-service',
            key: 'nouveau-service',
            label: 'Nouveau Service',
            description: 'Espace dédié aux nouveaux processus',
            icon: 'fas fa-rocket',
            path: '/nouveau-service',
            badge: 'New',
            badge_color: 'bg-green-100 text-green-800',
            is_active: true,
            display_order: 10,
            is_system: false
        });
        expect(createdTab.key).toBe('nouveau-service');

        const tabsWithNew = await tabRepo.getAll();
        expect(tabsWithNew.some(t => t.key === 'nouveau-service')).toBe(true);

        // Reset to system defaults
        const resetTabs = await tabRepo.reset();
        expect(resetTabs.length).toBeGreaterThanOrEqual(7);
        const resetCatalogue = resetTabs.find(t => t.key === 'catalogue');
        expect(resetCatalogue?.label).toBe('Catalogue');
    });
});
