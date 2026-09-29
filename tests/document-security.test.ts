import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ISqliteDb, getDatabase } from '../server/db/database.js';
import { verifyDocumentAccess } from '../server/middleware/documentSecurity.middleware.js';
import path from 'path';

describe('User Story 3.5: Document-Level Security Middleware', () => {
    let testDb: ISqliteDb;

    beforeEach(async () => {
        testDb = await getDatabase(':memory:');
    });

    afterEach(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    it('doit bloquer les tentatives de traversée de répertoire (path traversal)', async () => {
        const req: any = {
            params: { filename: '../../../etc/passwd' },
            headers: {}
        };
        let statusCode = 0;
        let responseBody: any = null;
        const res: any = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseBody = data;
                    }
                };
            }
        };
        const next = vi.fn();

        await verifyDocumentAccess(req, res, next);

        // Expect either a 403 (traversal detected) or sanitized path within safe base
        if (statusCode !== 0) {
            expect(statusCode).toBe(403);
            expect(responseBody.error).toContain('traversée de répertoire');
            expect(next).not.toHaveBeenCalled();
        } else {
            // Path was normalized safely inside safe directory
            expect(req.safeDocumentPath).toBeDefined();
            expect(req.safeDocumentPath.startsWith(path.resolve(process.cwd(), 'uploads'))).toBe(true);
            expect(next).toHaveBeenCalled();
        }
    });

    it('doit rejeter la requête si le nom de fichier est manquant', async () => {
        const req: any = {
            params: {},
            query: {},
            headers: {}
        };
        let statusCode = 0;
        let responseBody: any = null;
        const res: any = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseBody = data;
                    }
                };
            }
        };
        const next = vi.fn();

        await verifyDocumentAccess(req, res, next);

        expect(statusCode).toBe(400);
        expect(responseBody.error).toContain('manquant');
        expect(next).not.toHaveBeenCalled();
    });

    it('doit autoriser l\'accès complet pour un profil Administrateur ou Validateur', async () => {
        const req: any = {
            params: { filename: 'justificatif_habilitation_2026.pdf' },
            headers: {},
            user: {
                id: 1,
                email: 'admin@entreprise.fr',
                role: 'Administrateur',
                privileges: ['manage_users', 'validate_requests']
            }
        };
        const res: any = {};
        const next = vi.fn();

        await verifyDocumentAccess(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.safeDocumentPath).toBeDefined();
        expect(req.safeDocumentPath).toContain('justificatif_habilitation_2026.pdf');
    });
});
