import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { UserRepository } from '../server/repositories/user.repository.js';
import { RoleRepository } from '../server/repositories/role.repository.js';
import { AuditRepository } from '../server/repositories/audit.repository.js';
import { AuthService } from '../server/services/auth.service.js';

describe('AuthService & Authentification SQLite', () => {
    let testDb: ISqliteDb;
    let userRepo: UserRepository;
    let roleRepo: RoleRepository;
    let auditRepo: AuditRepository;
    let authService: AuthService;

    const TEST_JWT_SECRET = 'test_secret_audit_2026';

    beforeEach(async () => {
        // Isolated in-memory SQLite instance for fast, reliable unit tests
        testDb = await getDatabase(':memory:');
        userRepo = new UserRepository(testDb);
        roleRepo = new RoleRepository(testDb);
        auditRepo = new AuditRepository(testDb);
        authService = new AuthService(userRepo, roleRepo, auditRepo, TEST_JWT_SECRET);
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    it('doit connecter un utilisateur valide avec email et mot de passe corrects', async () => {
        const session = await authService.authenticate('admin@entreprise.fr', 'Securite2026!');

        expect(session).toBeDefined();
        expect(session.token).toBeTruthy();
        expect(session.user).toBeDefined();
        expect(session.user.email).toBe('admin@entreprise.fr');
        expect(session.user.role).toBe('Administrateur');
        expect(session.user.privileges).toContain('manage_users');
        expect(session.user.privileges).toContain('validate_requests');
        expect(session.user.portalTabs.admin).toBe(true);

        // Verify JWT token payload
        const decoded = authService.verifyToken(session.token);
        expect(decoded.email).toBe('admin@entreprise.fr');
        expect(decoded.id).toBe(session.user.id);
        expect(decoded.privileges).toContain('manage_users');
    });

    it('doit rejeter la connexion si le mot de passe est incorrect', async () => {
        await expect(
            authService.authenticate('admin@entreprise.fr', 'mauvais_mot_de_passe')
        ).rejects.toThrow('Identifiants incorrects');

        // Verify audit log recorded failed attempt
        const logs = await auditRepo.getAll(5);
        const failLog = logs.find(l => l.action === 'AUTH_FAILED');
        expect(failLog).toBeDefined();
    });

    it('doit rejeter la connexion pour une adresse email inexistante', async () => {
        await expect(
            authService.authenticate('intrus@externe.com', 'Securite2026!')
        ).rejects.toThrow('Identifiants incorrects');

        const logs = await auditRepo.getAll(5);
        const failLog = logs.find(l => l.actor === 'intrus@externe.com');
        expect(failLog).toBeDefined();
    });

    it('doit refuser l’accès si le compte utilisateur est inactif', async () => {
        // Create an inactive user
        const inactiveUser = await userRepo.create({
            email: 'desactive@entreprise.fr',
            password: 'password123',
            role: 'Demandeur',
            name: 'Agent Désactivé',
            status: 'Inactif'
        });

        expect(inactiveUser.status).toBe('Inactif');

        await expect(
            authService.authenticate('desactive@entreprise.fr', 'password123')
        ).rejects.toThrow('Compte désactivé');
    });

    it('doit agréger correctement les privilèges pour les utilisateurs multi-rôles', async () => {
        // manager@entreprise.fr has roles ["Manager", "Demandeur"]
        const session = await authService.authenticate('manager@entreprise.fr', 'Securite2026!');

        expect(session.user.roles).toContain('Manager');
        expect(session.user.privileges).toContain('validate_requests');
        expect(session.user.privileges).toContain('create_request');
        expect(session.user.portalTabs.corbeille).toBe(true);
        expect(session.user.portalTabs['mes-demandes']).toBe(true);
    });

    it('doit attribuer les permissions de base pour un demandeur simple', async () => {
        const session = await authService.authenticate('daniel@entreprise.fr', 'Securite2026!');

        expect(session.user.role).toBe('Demandeur');
        expect(session.user.privileges).toContain('create_request');
        expect(session.user.privileges).toContain('view_own_requests');
        expect(session.user.portalTabs.admin).toBe(false);
    });

    it('doit enregistrer un journal d’audit lors d’une connexion réussie', async () => {
        await authService.authenticate('daniel@entreprise.fr', 'Securite2026!');

        const logs = await auditRepo.getAll(5);
        const successLog = logs.find(l => l.action === 'AUTH_LOGIN_SUCCESS');
        expect(successLog).toBeDefined();
        expect(successLog?.actor).toBe('Daniel Dupont');
    });
});
