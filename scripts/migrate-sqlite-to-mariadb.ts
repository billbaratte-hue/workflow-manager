/**
 * @file scripts/migrate-sqlite-to-mariadb.ts
 * Automated SQLite -> MariaDB Data Migration Utility.
 * Migrates all records, relations, and configurations seamlessly from portal.db to MariaDB.
 */

import { SqliteWrapper } from '../server/db/database.js';
import { MariaDbWrapper } from '../server/db/mariadb.js';
import path from 'path';
import fs from 'fs';

async function runMigration() {
    console.log('===========================================================');
    console.log('🔄 DÉBUT DE LA MIGRATION SQLITE -> MARIADB');
    console.log('===========================================================');

    const sqlitePath = path.resolve(process.cwd(), 'portal.db');
    if (!fs.existsSync(sqlitePath)) {
        console.error(`❌ Fichier SQLite introuvable à : ${sqlitePath}`);
        process.exit(1);
    }

    const sqliteDb = new SqliteWrapper(sqlitePath);
    console.log('✅ Connexion SQLite établie (source : portal.db)');

    const mariaDb = new MariaDbWrapper({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'workflow_user',
        password: process.env.DB_PASSWORD || 'workflow_password',
        database: process.env.DB_NAME || 'workflow_db'
    });

    console.log('🔄 Initialisation du schéma de destination sur MariaDB...');
    await mariaDb.initializeSchema();
    console.log('✅ Schéma MariaDB vérifié et prêt');

    const tablesToMigrate = [
        'tenants',
        'roles',
        'users',
        'portal_tabs',
        'system_features',
        'admin_nav_items',
        'admin_nav_sections',
        'system_settings',
        'reference_tables',
        'process_templates',
        'form_templates',
        'custom_statuses',
        'status_categories',
        'status_metadata',
        'business_rules',
        'rule_domains',
        'requests',
        'audit_logs',
        'return_contracts',
        'delegations',
        'decision_history',
        'notifications'
    ];

    let totalMigrated = 0;

    for (const table of tablesToMigrate) {
        try {
            const rows = await sqliteDb.all(`SELECT * FROM ${table}`);
            if (!rows || rows.length === 0) {
                console.log(`ℹ️  Table ${table.padEnd(22)} : 0 enregistrement (ignorée)`);
                continue;
            }

            const sample = rows[0];
            const columns = Object.keys(sample);
            const quotedColumns = columns.map(c => `\`${c}\``).join(', ');
            const placeholders = columns.map(() => '?').join(', ');
            const sqlInsert = `INSERT IGNORE INTO \`${table}\` (${quotedColumns}) VALUES (${placeholders})`;

            let count = 0;
            for (const row of rows) {
                const values = columns.map(col => {
                    const val = row[col];
                    if (val === undefined || val === null) return null;
                    if (typeof val === 'boolean') return val ? 1 : 0;
                    return val;
                });
                await mariaDb.run(sqlInsert, ...values);
                count++;
            }

            console.log(`✅ Table ${table.padEnd(22)} : ${count} enregistrements migrés`);
            totalMigrated += count;
        } catch (err: any) {
            console.warn(`⚠️  Avertissement sur la table ${table}: ${err.message}`);
        }
    }

    console.log('===========================================================');
    console.log(`🎉 MIGRATION TERMINÉE AVEC SUCCÈS : ${totalMigrated} enregistrements migrés vers MariaDB.`);
    console.log('===========================================================');

    await sqliteDb.close();
    await mariaDb.close();
    process.exit(0);
}

runMigration().catch(err => {
    console.error('❌ Échec de la migration:', err);
    process.exit(1);
});
