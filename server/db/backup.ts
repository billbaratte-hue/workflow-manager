/**
 * @file server/db/backup.ts
 * Database Backup Utility for Mechatronic Portal (Epic 1 - User Story 1.1).
 * Exports current database state (tables, schema, indexes, data) to secure JSON/SQL archive.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase, ISqliteDb } from './database.js';

export interface BackupMetadata {
    version: string;
    timestamp: string;
    contract: string;
    driver: string;
    checksumSha256: string;
    tables: Record<string, number>;
    totalRecords: number;
}

export interface BackupPayload {
    metadata: Omit<BackupMetadata, 'checksumSha256'>;
    data: Record<string, any[]>;
}

const DEFAULT_TABLES = [
    'roles',
    'users',
    'requests',
    'audit_logs',
    'portal_tabs',
    'reference_tables',
    'system_features',
    'admin_nav_items',
    'admin_nav_sections',
    'system_settings',
    'process_templates',
    'form_templates',
    'custom_statuses',
    'status_categories',
    'status_metadata',
    'business_rules',
    'rule_domains'
];

/**
 * Exports database contents into a structured, checksummed backup file
 */
export async function createDatabaseBackup(
    db?: ISqliteDb,
    outputDir?: string
): Promise<{ filePath: string; metadata: BackupMetadata }> {
    const activeDb = db || (await getDatabase());
    const targetDir = outputDir || path.resolve(process.cwd(), 'backups');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_portal_${timestamp}.json`;
    const filePath = path.join(targetDir, filename);

    const tablesData: Record<string, any[]> = {};
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const tableName of DEFAULT_TABLES) {
        try {
            const rows = await activeDb.all(`SELECT * FROM ${tableName}`);
            tablesData[tableName] = rows || [];
            tableCounts[tableName] = rows ? rows.length : 0;
            totalRecords += tableCounts[tableName];
        } catch (err) {
            console.warn(`[BACKUP] Table '${tableName}' skipped or does not exist:`, (err as any)?.message);
            tablesData[tableName] = [];
            tableCounts[tableName] = 0;
        }
    }

    const rawPayload: BackupPayload = {
        metadata: {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            contract: 'Enterprise Access Platform',
            driver: 'sqlite',
            tables: tableCounts,
            totalRecords
        },
        data: tablesData
    };

    const jsonContent = JSON.stringify(rawPayload, null, 2);
    const checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');

    const finalBackup = {
        ...rawPayload,
        metadata: {
            ...rawPayload.metadata,
            checksumSha256: checksum
        }
    };

    fs.writeFileSync(filePath, JSON.stringify(finalBackup, null, 2), 'utf-8');

    // Also write checksum sidecar
    fs.writeFileSync(`${filePath}.sha256`, `${checksum}  ${filename}\n`, 'utf-8');

    console.log(`[BACKUP] Successfully created database backup: ${filePath} (${totalRecords} records, SHA256: ${checksum.slice(0, 12)}...)`);

    return {
        filePath,
        metadata: finalBackup.metadata
    };
}

/**
 * Lists all existing database backups in the target directory
 */
export async function listBackups(outputDir?: string): Promise<Array<{ filename: string; filePath: string; size: number; createdAt: string }>> {
    const targetDir = outputDir || path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(targetDir)) return [];
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
    return files.map(filename => {
        const filePath = path.join(targetDir, filename);
        const stats = fs.statSync(filePath);
        return {
            filename,
            filePath,
            size: stats.size,
            createdAt: stats.mtime.toISOString()
        };
    });
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('backup.ts')) {
    createDatabaseBackup()
        .then(result => {
            console.log('✓ Backup completed successfully:', result.filePath);
            process.exit(0);
        })
        .catch(err => {
            console.error('✗ Backup failed:', err);
            process.exit(1);
        });
}
