import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, closeDatabase, syncMemoryStoresFromDb } from '../server/db/database.js';
import { roleRepository } from '../server/repositories/role.repository.js';
import { rolesDatabase, usersDatabase } from '../server/db/store.js';
import { createRole, updateRole, deleteRole } from '../server/controllers/auth.controller.js';

describe('Role Management & Duplication Protection Tests', () => {
    let mockDb: any;

    beforeEach(async () => {
        // Use in-memory SQLite database for isolated tests
        mockDb = await getDatabase(':memory:');
        await syncMemoryStoresFromDb(mockDb);
    });

    afterEach(async () => {
        await closeDatabase();
    });

    it('rejects creating a role with an empty or whitespace name', async () => {
        let statusCode = 0;
        let responseJson: any = null;

        const req = {
            body: { name: '   ', description: 'Test' },
            user: { name: 'Admin Test', role: 'Administrateur' }
        };
        const res = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseJson = data;
                    }
                };
            }
        };

        await createRole(req, res);
        expect(statusCode).toBe(400);
        expect(responseJson.error).toContain("L'intitulé du rôle est requis");
    });

    it('rejects creating a role that duplicates an existing role name (case-insensitive)', async () => {
        let statusCode = 0;
        let responseJson: any = null;

        // "Validateur Site" is already seeded in rolesDatabase
        const req = {
            body: { name: 'validateur site', description: 'Doublon intentionnel' },
            user: { name: 'Admin Test', role: 'Administrateur' }
        };
        const res = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseJson = data;
                    }
                };
            }
        };

        await createRole(req, res);
        expect(statusCode).toBe(400);
        expect(responseJson.error).toMatch(/existe déjà/i);
    });

    it('successfully creates a new unique role and synchronizes it with SQLite', async () => {
        let statusCode = 0;
        let responseJson: any = null;

        const uniqueRoleName = `Auditeur Conformite ${Date.now()}`;
        const req = {
            body: {
                name: uniqueRoleName,
                description: 'Périmètre de contrôle et conformité NIS 2',
                privileges: ['view_dashboard', 'create_request']
            },
            user: { name: 'Admin Test', role: 'Administrateur' }
        };
        const res = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseJson = data;
                    }
                };
            }
        };

        await createRole(req, res);
        expect(statusCode).toBe(201);
        expect(responseJson.success).toBe(true);
        expect(responseJson.role.name).toBe(uniqueRoleName);

        // Verify it was persisted to SQLite
        const dbRole = await roleRepository.getByName(uniqueRoleName);
        expect(dbRole).not.toBeNull();
        expect(dbRole?.name).toBe(uniqueRoleName);

        // Verify memory store has it
        const memRole = rolesDatabase.find(r => r.name === uniqueRoleName);
        expect(memRole).toBeDefined();
    });

    it('rejects updating an existing role to a duplicate name', async () => {
        // Find existing non-admin role
        const managerRole = rolesDatabase.find(r => r.name === 'Manager');
        expect(managerRole).toBeDefined();

        let statusCode = 0;
        let responseJson: any = null;

        const req = {
            params: { id: String(managerRole!.id) },
            body: { name: 'Administrateur' }, // Duplicate with admin
            user: { name: 'Admin Test', role: 'Administrateur' }
        };
        const res = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseJson = data;
                    }
                };
            }
        };

        await updateRole(req, res);
        expect(statusCode).toBe(400);
        expect(responseJson.error).toMatch(/existe déjà/i);
    });

    it('protects Administrateur role against deletion', async () => {
        const adminRole = rolesDatabase.find(r => r.name === 'Administrateur');
        expect(adminRole).toBeDefined();

        let statusCode = 0;
        let responseJson: any = null;

        const req = {
            params: { id: String(adminRole!.id) },
            user: { name: 'Admin Test', role: 'Administrateur' }
        };
        const res = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => {
                        responseJson = data;
                    }
                };
            }
        };

        await deleteRole(req, res);
        expect(statusCode).toBe(400);
        expect(responseJson.error).toContain('protégé');
    });
});
