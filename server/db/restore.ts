/**
 * @file server/db/restore.ts
 * Database Restoration Utility for Mechatronic Portal (Epic 1 - User Story 1.2).
 * Reads a backup JSON archive, validates its SHA-256 checksum, and restores tables safely.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase, ISqliteDb } from './database.js';

export interface RestoreOptions {
    mode?: 'override' | 'merge';
    skipChecksum?: boolean;
}

export interface RestoreResult {
    success: boolean;
    restoredTables: Record<string, number>;
    totalRestored: number;
    sourceTimestamp: string;
    checksumVerified: boolean;
}

/**
 * Restores the database from a verified backup JSON file
 */
export async function restoreDatabaseFromFile(
    backupFilePath: string,
    options: RestoreOptions = { mode: 'override', skipChecksum: false },
    db?: ISqliteDb
): Promise<RestoreResult> {
    if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found at path: ${backupFilePath}`);
    }

    const fileContent = fs.readFileSync(backupFilePath, 'utf-8');
    const parsed = JSON.parse(fileContent);

    if (!parsed.metadata || !parsed.data) {
        throw new Error('Invalid backup archive format: missing metadata or data block.');
    }

    // Verify SHA-256 Checksum if present
    let checksumVerified = false;
    if (!options.skipChecksum && parsed.metadata.checksumSha256) {
        const expectedChecksum = parsed.metadata.checksumSha256;
        const payloadToHash = {
            metadata: {
                version: parsed.metadata.version,
                timestamp: parsed.metadata.timestamp,
                contract: parsed.metadata.contract,
                driver: parsed.metadata.driver,
                tables: parsed.metadata.tables,
                totalRecords: parsed.metadata.totalRecords
            },
            data: parsed.data
        };
        const computed = crypto.createHash('sha256').update(JSON.stringify(payloadToHash, null, 2)).digest('hex');
        if (computed !== expectedChecksum) {
            console.warn(`[RESTORE WARNING] Checksum mismatch: expected ${expectedChecksum}, computed ${computed}`);
        } else {
            checksumVerified = true;
        }
    }

    const activeDb = db || (await getDatabase());
    const restoredTables: Record<string, number> = {};
    let totalRestored = 0;

    await activeDb.exec('BEGIN TRANSACTION;');

    try {
        for (const [tableName, rows] of Object.entries(parsed.data as Record<string, any[]>)) {
            if (!Array.isArray(rows) || rows.length === 0) {
                restoredTables[tableName] = 0;
                continue;
            }

            if (options.mode === 'override') {
                try {
                    await activeDb.exec(`DELETE FROM ${tableName};`);
                } catch (e) {
                    console.warn(`[RESTORE] Could not clear table ${tableName}:`, (e as any)?.message);
                }
            }

            let insertedForTable = 0;
            for (const row of rows) {
                const keys = Object.keys(row);
                if (keys.length === 0) continue;

                const columns = keys.join(', ');
                const placeholders = keys.map(() => '?').join(', ');
                const values = keys.map(k => {
                    const v = row[k];
                    if (typeof v === 'object' && v !== null) {
                        return JSON.stringify(v);
                    }
                    return v;
                });

                const sql = options.mode === 'override'
                    ? `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`
                    : `INSERT OR IGNORE INTO ${tableName} (${columns}) VALUES (${placeholders})`;

                await activeDb.run(sql, ...values);
                insertedForTable++;
            }

            restoredTables[tableName] = insertedForTable;
            totalRestored += insertedForTable;
        }

        await activeDb.exec('COMMIT;');
        console.log(`[RESTORE] Database restored successfully: ${totalRestored} records across ${Object.keys(restoredTables).length} tables.`);

        return {
            success: true,
            restoredTables,
            totalRestored,
            sourceTimestamp: parsed.metadata.timestamp,
            checksumVerified
        };
    } catch (err) {
        await activeDb.exec('ROLLBACK;');
        console.error('[RESTORE] Restoration failed, rolled back changes:', err);
        throw err;
    }
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('restore.ts')) {
    const fileArg = process.argv[2];
    if (!fileArg) {
        console.error('Usage: tsx server/db/restore.ts <path-to-backup.json>');
        process.exit(1);
    }

    restoreDatabaseFromFile(fileArg)
        .then(res => {
            console.log('✓ Database restoration completed successfully:', res);
            process.exit(0);
        })
        .catch(err => {
            console.error('✗ Restoration failed:', err);
            process.exit(1);
        });
}
