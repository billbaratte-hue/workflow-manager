/**
 * @file tests/twoFactor.service.test.ts
 * Tests unitaires et de conformité cryptographique pour la Double Authentification 2FA / TOTP (RFC 6238 / RFC 4648 / NIS 2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TwoFactorService } from '../server/services/twoFactor.service.js';
import { getDatabase, ISqliteDb } from '../server/db/database.js';
import { UserRepository } from '../server/repositories/user.repository.js';
import { AuthService } from '../server/services/auth.service.js';
import bcrypt from 'bcryptjs';

describe('TwoFactorService (RFC 6238 & RFC 4648 Cryptographic Engine)', () => {
    describe('RFC 4648 Base32 Encoding / Decoding', () => {
        it('devrait encoder et décoder des chaînes avec exactitude selon RFC 4648', () => {
            const testCases = [
                { raw: '', base32: '' },
                { raw: 'f', base32: 'MY======' },
                { raw: 'fo', base32: 'MZXQ====' },
                { raw: 'foo', base32: 'MZXW6===' },
                { raw: 'foob', base32: 'MZXW6YQ=' },
                { raw: 'foobar', base32: 'MZXW6YTBOI======' }
            ];

            for (const tc of testCases) {
                const encoded = TwoFactorService.encodeBase32(Buffer.from(tc.raw, 'utf-8'));
                expect(encoded).toBe(tc.base32);

                const decoded = TwoFactorService.decodeBase32(tc.base32);
                expect(decoded.toString('utf-8')).toBe(tc.raw);
            }
        });

        it('devrait gérer la casse insensible et ignorer les espaces ou tirets', () => {
            const raw = 'foobar';
            const clean = TwoFactorService.decodeBase32('mzxw6ytboi======').toString('utf-8');
            expect(clean).toBe(raw);

            const withSpaces = TwoFactorService.decodeBase32('MZXW 6YTB OI== ====').toString('utf-8');
            expect(withSpaces).toBe(raw);
        });
    });

    describe('RFC 6238 Appendix B Standard Test Vectors', () => {
        // RFC 6238 Appendix B test secret for SHA1 is the ASCII string "12345678901234567890" (20 bytes)
        const rfcSecretAscii = '12345678901234567890';
        const rfcSecretBase32 = TwoFactorService.encodeBase32(Buffer.from(rfcSecretAscii, 'ascii'));

        it('devrait produire les codes TOTP stricts de l\'annexe B RFC 6238 pour SHA1 (6 digits)', () => {
            // T = 59s -> step 1 -> expected "287082"
            const code59 = TwoFactorService.generateTOTP(rfcSecretBase32, {
                timestampMs: 59 * 1000,
                stepSeconds: 30,
                digits: 6
            });
            expect(code59).toBe('287082');

            // T = 1111111109s -> step 37037036 -> expected "081804"
            const code1 = TwoFactorService.generateTOTP(rfcSecretBase32, {
                timestampMs: 1111111109 * 1000,
                stepSeconds: 30,
                digits: 6
            });
            expect(code1).toBe('081804');

            // T = 1111111111s -> step 37037037 -> expected "050471" (from 14050471)
            const code2 = TwoFactorService.generateTOTP(rfcSecretBase32, {
                timestampMs: 1111111111 * 1000,
                stepSeconds: 30,
                digits: 6
            });
            expect(code2).toBe('050471');

            // T = 2000000000s -> step 66666666 -> expected "279037" (from RFC 6238 Table 1 SHA1: 90279037)
            const code3 = TwoFactorService.generateTOTP(rfcSecretBase32, {
                timestampMs: 2000000000 * 1000,
                stepSeconds: 30,
                digits: 6
            });
            expect(code3).toBe('279037');
        });
    });

    describe('TOTP Verification avec Tolérance d\'Horloge (Clock Drift)', () => {
        const secret = TwoFactorService.generateSecret();

        it('devrait valider le code de l\'instant présent T0', () => {
            const now = Date.now();
            const currentCode = TwoFactorService.generateTOTP(secret, { timestampMs: now });
            const isValid = TwoFactorService.verifyTOTP(secret, currentCode, { timestampMs: now });
            expect(isValid).toBe(true);
        });

        it('devrait valider le code du pas précédent T - 30s (window = 1)', () => {
            const now = Date.now();
            const pastCode = TwoFactorService.generateTOTP(secret, { timestampMs: now - 30 * 1000 });
            const isValid = TwoFactorService.verifyTOTP(secret, pastCode, { timestampMs: now, windowSteps: 1 });
            expect(isValid).toBe(true);
        });

        it('devrait valider le code du pas suivant T + 30s (window = 1)', () => {
            const now = Date.now();
            const futureCode = TwoFactorService.generateTOTP(secret, { timestampMs: now + 30 * 1000 });
            const isValid = TwoFactorService.verifyTOTP(secret, futureCode, { timestampMs: now, windowSteps: 1 });
            expect(isValid).toBe(true);
        });

        it('devrait rejeter un code trop ancien T - 90s', () => {
            const now = Date.now();
            const expiredCode = TwoFactorService.generateTOTP(secret, { timestampMs: now - 90 * 1000 });
            const isValid = TwoFactorService.verifyTOTP(secret, expiredCode, { timestampMs: now, windowSteps: 1 });
            expect(isValid).toBe(false);
        });

        it('devrait rejeter un code mal formé ou erroné', () => {
            expect(TwoFactorService.verifyTOTP(secret, '0000000')).toBe(false);
            expect(TwoFactorService.verifyTOTP(secret, 'ABCDEF')).toBe(false);
            expect(TwoFactorService.verifyTOTP(secret, '')).toBe(false);
        });
    });

    describe('Codes de Secours à Usage Unique (Emergency Backup Codes)', () => {
        it('devrait générer 8 codes de secours uniques au format XXXX-XXXX', () => {
            const codes = TwoFactorService.generateBackupCodes(8);
            expect(codes).toHaveLength(8);

            const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
            for (const code of codes) {
                expect(code).toMatch(formatRegex);
            }

            // Unicité des codes générés
            const unique = new Set(codes);
            expect(unique.size).toBe(8);
        });

        it('devrait hacher et valider un code de secours en le consommant', () => {
            const plainCodes = TwoFactorService.generateBackupCodes(4);
            const hashedCodes = plainCodes.map(c => TwoFactorService.hashBackupCode(c));

            const targetCode = plainCodes[1]; // Pick second code
            const result = TwoFactorService.verifyAndConsumeBackupCode(targetCode, hashedCodes);

            expect(result.valid).toBe(true);
            expect(result.remainingHashedCodes).toHaveLength(3);
            expect(result.remainingHashedCodes).not.toContain(TwoFactorService.hashBackupCode(targetCode));

            // Tentative de réutilisation du même code (doit échouer)
            const reuseAttempt = TwoFactorService.verifyAndConsumeBackupCode(targetCode, result.remainingHashedCodes);
            expect(reuseAttempt.valid).toBe(false);
            expect(reuseAttempt.remainingHashedCodes).toHaveLength(3);
        });

        it('devrait accepter les codes de secours sans le tiret ou en minuscules', () => {
            const plainCodes = ['ABCD-EFGH'];
            const hashedCodes = plainCodes.map(c => TwoFactorService.hashBackupCode(c));

            // Lowercase without hyphen
            const result = TwoFactorService.verifyAndConsumeBackupCode('abcdefgh', hashedCodes);
            expect(result.valid).toBe(true);
            expect(result.remainingHashedCodes).toHaveLength(0);
        });
    });

    describe('Intégration du flux d\'authentification 2FA (AuthService)', () => {
        let testDb: ISqliteDb;
        let userRepo: UserRepository;
        let testAuthService: AuthService;

        beforeEach(async () => {
            testDb = await getDatabase(':memory:');
            userRepo = new UserRepository(testDb);
            testAuthService = new AuthService(userRepo);
        });

        afterEach(async () => {
            if (testDb) {
                await testDb.close();
            }
        });

        it('devrait demander le 2FA si l\'utilisateur a activé two_factor_enabled', async () => {
            const secret = TwoFactorService.generateSecret();
            const passwordHash = await bcrypt.hash('Securite2026!', 10);

            const user = await userRepo.create({
                email: 'agent2fa@entreprise.fr',
                name: 'Agent 2FA',
                password_hash: passwordHash,
                role: 'Demandeur',
                status: 'Actif',
                attributes: {
                    two_factor_enabled: true,
                    two_factor_secret: secret,
                    two_factor_backup_codes: []
                }
            });

            // Standard login attempt
            const loginResult: any = await testAuthService.authenticate('agent2fa@entreprise.fr', 'Securite2026!');
            expect(loginResult.require2FA).toBe(true);
            expect(loginResult.tempToken).toBeDefined();
            expect(loginResult.user.id).toBe(user.id);
            expect(loginResult.token).toBeUndefined(); // No final auth token yet

            // Complete with valid TOTP code
            const validCode = TwoFactorService.generateTOTP(secret);
            const verified = await testAuthService.verify2FA(loginResult.tempToken, validCode);

            expect(verified.token).toBeDefined();
            expect(verified.user.email).toBe('agent2fa@entreprise.fr');
        });

        it('devrait valider la connexion avec un code de secours et le consommer en base', async () => {
            const secret = TwoFactorService.generateSecret();
            const backupCodes = ['SAFE-CODE', 'BACK-UP01'];
            const hashedBackupCodes = backupCodes.map(c => TwoFactorService.hashBackupCode(c));
            const passwordHash = await bcrypt.hash('Securite2026!', 10);

            const user = await userRepo.create({
                email: 'backupuser@entreprise.fr',
                name: 'Backup User',
                password_hash: passwordHash,
                role: 'Demandeur',
                status: 'Actif',
                attributes: {
                    two_factor_enabled: true,
                    two_factor_secret: secret,
                    two_factor_backup_codes: hashedBackupCodes
                }
            });

            const loginResult: any = await testAuthService.authenticate('backupuser@entreprise.fr', 'Securite2026!');
            expect(loginResult.require2FA).toBe(true);

            // Use first backup code
            const verified = await testAuthService.verify2FA(loginResult.tempToken, 'SAFE-CODE');
            expect(verified.token).toBeDefined();

            // Verify in database that 'SAFE-CODE' was consumed and removed
            const updatedUser = await userRepo.findById(user.id);
            expect(updatedUser?.attributes.two_factor_backup_codes).toHaveLength(1);
            expect(updatedUser?.attributes.two_factor_backup_codes).toContain(TwoFactorService.hashBackupCode('BACK-UP01'));
            expect(updatedUser?.attributes.two_factor_backup_codes).not.toContain(TwoFactorService.hashBackupCode('SAFE-CODE'));
        });

        it('devrait rejeter un mauvais code 2FA', async () => {
            const secret = TwoFactorService.generateSecret();
            const passwordHash = await bcrypt.hash('Securite2026!', 10);

            await userRepo.create({
                email: 'wrong2fa@entreprise.fr',
                name: 'Wrong 2FA',
                password_hash: passwordHash,
                role: 'Demandeur',
                status: 'Actif',
                attributes: {
                    two_factor_enabled: true,
                    two_factor_secret: secret,
                    two_factor_backup_codes: []
                }
            });

            const loginResult: any = await testAuthService.authenticate('wrong2fa@entreprise.fr', 'Securite2026!');

            await expect(testAuthService.verify2FA(loginResult.tempToken, '999999')).rejects.toThrow(
                /Code 2FA invalide ou expiré/
            );
        });
    });
});
