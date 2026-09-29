/**
 * @file tests/password-recovery.test.ts
 * Tests unitaires et d'intégration pour le service de récupération de mot de passe par email.
 * Conforme aux directives de sécurité NIS 2 / ISO 27001 (anti-énumération, hachage SHA-256, expiration, usage unique).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { UserRepository } from '../server/repositories/user.repository.js';
import { PasswordResetRepository } from '../server/repositories/password-reset.repository.js';
import { emailService } from '../server/services/email.service.js';

describe('Récupération de mot de passe par email (NIS 2)', () => {
    let testDb: ISqliteDb;
    let userRepo: UserRepository;
    let resetRepo: PasswordResetRepository;

    beforeEach(async () => {
        // Base de données isolée en mémoire
        testDb = await getDatabase(':memory:');
        userRepo = new UserRepository(testDb);
        resetRepo = new PasswordResetRepository(testDb);
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    it('doit générer un jeton cryptographique aléatoire et stocker uniquement son empreinte SHA-256', async () => {
        const email = 'admin@entreprise.fr';
        const result = await resetRepo.createToken(email, 60);

        expect(result).toBeDefined();
        expect(result.token).toBeDefined();
        expect(result.token.length).toBe(64); // 32 bytes hex = 64 caractères
        expect(result.expiresAt).toBeDefined();

        // Vérification directe dans la base de données SQLite
        const storedRow = await testDb.get<any>(
            'SELECT * FROM password_resets WHERE id = ?',
            result.id
        );

        expect(storedRow).toBeDefined();
        expect(storedRow.email).toBe(email);
        expect(storedRow.used).toBe(0);

        // Le jeton brut ne doit JAMAIS être stocké en clair
        expect(storedRow.token_hash).not.toBe(result.token);

        const expectedHash = crypto.createHash('sha256').update(result.token).digest('hex');
        expect(storedRow.token_hash).toBe(expectedHash);
    });

    it('doit valider avec succès un jeton correct et non expiré', async () => {
        const email = 'daniel@entreprise.fr';
        const { token } = await resetRepo.createToken(email, 60);

        const check = await resetRepo.verifyToken(email, token);
        expect(check.valid).toBe(true);
        expect(check.record).toBeDefined();
        expect(check.record?.email).toBe(email);
    });

    it('doit refuser un jeton altéré ou incorrect', async () => {
        const email = 'daniel@entreprise.fr';
        await resetRepo.createToken(email, 60);

        const check = await resetRepo.verifyToken(email, 'fake_token_1234567890abcdef');
        expect(check.valid).toBe(false);
        expect(check.reason).toContain('invalide');
    });

    it('doit refuser un jeton déjà utilisé (usage unique strict)', async () => {
        const email = 'manager@entreprise.fr';
        const { token, id } = await resetRepo.createToken(email, 60);

        // Consommation du jeton
        const consumed = await resetRepo.consumeToken(id);
        expect(consumed).toBe(true);

        // Seconde tentative de vérification
        const check = await resetRepo.verifyToken(email, token);
        expect(check.valid).toBe(false);
        expect(check.reason).toContain('déjà été utilisé');
    });

    it('doit refuser un jeton ayant dépassé sa durée de validité (expiration)', async () => {
        const email = 'validateur@entreprise.fr';
        // Création avec une durée négative pour simuler l'expiration
        const { token } = await resetRepo.createToken(email, -10);

        const check = await resetRepo.verifyToken(email, token);
        expect(check.valid).toBe(false);
        expect(check.reason).toContain('expiré');
    });

    it('doit invalider les anciens jetons lorsqu une nouvelle demande est émise pour la même adresse', async () => {
        const email = 'admin@entreprise.fr';

        const firstToken = await resetRepo.createToken(email, 60);
        const secondToken = await resetRepo.createToken(email, 60);

        // Le premier jeton doit être marqué comme utilisé/invalidé
        const checkFirst = await resetRepo.verifyToken(email, firstToken.token);
        expect(checkFirst.valid).toBe(false);

        // Le second jeton doit être valide
        const checkSecond = await resetRepo.verifyToken(email, secondToken.token);
        expect(checkSecond.valid).toBe(true);
    });

    it('doit transmettre l email transactionnel via emailService sans planter en mode SIMULATED', async () => {
        const email = 'admin@entreprise.fr';
        const { token } = await resetRepo.createToken(email, 60);
        const resetUrl = `http://localhost:3000/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        const emailResult = await emailService.sendEmail({
            to: email,
            subject: 'Réinitialisation de votre mot de passe - Portail Mécatronique',
            text: `Veuillez réinitialiser votre mot de passe via : ${resetUrl}`,
            html: `<a href="${resetUrl}">Réinitialiser mon mot de passe</a>`
        });

        expect(emailResult.success).toBe(true);
        expect(emailResult.recipientCount).toBe(1);
        expect(emailResult.mode).toBe('SIMULATED');
    });

    it('doit mettre à jour le mot de passe utilisateur en base et permettre la ré-authentification', async () => {
        const email = 'daniel@entreprise.fr';
        const user = await userRepo.findByEmail(email);
        expect(user).toBeDefined();

        // Ancien mot de passe
        const oldMatches = await userRepo.verifyPassword('Securite2026!', user!.password_hash);
        expect(oldMatches).toBe(true);

        // Simulation de réinitialisation
        const newPassword = 'NouveauMotDePasse2026!';
        const updated = await userRepo.update(user!.id, { password: newPassword });

        expect(updated).toBeDefined();

        // L'ancien mot de passe ne doit plus matcher
        const oldCheck = await userRepo.verifyPassword('Securite2026!', updated!.password_hash);
        expect(oldCheck).toBe(false);

        // Le nouveau mot de passe doit matcher
        const newCheck = await userRepo.verifyPassword(newPassword, updated!.password_hash);
        expect(newCheck).toBe(true);
    });
});
