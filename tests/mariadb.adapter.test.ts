import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MariaDbWrapper } from '../server/db/mariadb.js';
import { getDatabase, closeDatabase, SqliteWrapper } from '../server/db/database.js';

describe('MariaDB / Multi-Engine Database Adapter', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(async () => {
        process.env = originalEnv;
        await closeDatabase();
    });

    it('doit implémenter correctement l interface ISqliteDb sur MariaDbWrapper', () => {
        const wrapper = new MariaDbWrapper({
            host: '127.0.0.1',
            port: 3306,
            database: 'test_db'
        });

        expect(typeof wrapper.exec).toBe('function');
        expect(typeof wrapper.get).toBe('function');
        expect(typeof wrapper.all).toBe('function');
        expect(typeof wrapper.run).toBe('function');
        expect(typeof wrapper.close).toBe('function');
        expect(typeof wrapper.initializeSchema).toBe('function');

        wrapper.close().catch(() => {});
    });

    it('doit instancier SqliteWrapper par défaut lorsque DB_ENGINE n est pas défini', async () => {
        delete process.env.DB_ENGINE;
        delete process.env.DB_TYPE;

        const db = await getDatabase(':memory:');
        expect(db).toBeInstanceOf(SqliteWrapper);
        await db.close();
    });
});
