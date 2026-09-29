/**
 * @file server/db/seed.ts
 * Standardized Data Seeding Script for Mechatronic Portal (Epic 1 - User Story 1.3).
 * Populates baseline administrative users, roles, reference tables, and default settings.
 */

import { getDatabase, closeDatabase } from './database.js';
import { usersDatabase, rolesDatabase, referenceTablesDatabase } from './store.js';
import bcrypt from 'bcryptjs';

export async function runSeed(forceReset = false): Promise<void> {
    console.log('[SEED] Starting database initialization and data seeding...');
    const db = await getDatabase();

    if (forceReset) {
        console.log('[SEED] Resetting existing records in primary tables...');
        await db.exec(`
            DELETE FROM users;
            DELETE FROM roles;
        `);
    }

    // 1. Seed Roles
    const existingRoles = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM roles');
    if (!existingRoles || Number(existingRoles.count) === 0 || forceReset) {
        console.log(`[SEED] Seeding ${rolesDatabase.length} security roles...`);
        for (const role of rolesDatabase) {
            await db.run(
                `INSERT OR REPLACE INTO roles (id, name, description, privileges, portal_tabs, table_permissions, reference_visibility_rules)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                role.id,
                role.name,
                role.description || '',
                JSON.stringify(role.privileges || []),
                JSON.stringify(role.portalTabs || {}),
                JSON.stringify(role.tablePermissions || {}),
                JSON.stringify(role.referenceVisibilityRules || [])
            );
        }
    }

    // 2. Seed Baseline Users
    const existingUsers = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if (!existingUsers || Number(existingUsers.count) === 0 || forceReset) {
        console.log(`[SEED] Seeding ${usersDatabase.length} baseline users...`);
        const defaultHash = await bcrypt.hash('Securite2026!', 10);

        for (const user of usersDatabase) {
            await db.run(
                `INSERT OR REPLACE INTO users (id, email, password_hash, role, roles, name, status, attributes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                user.id,
                user.email.toLowerCase(),
                defaultHash,
                user.role,
                JSON.stringify(user.roles || [user.role]),
                user.name,
                user.status || 'Actif',
                JSON.stringify(user.attributes || {})
            );
        }
    }

    // 3. Ensure Baseline Reference Tables
    console.log(`[SEED] Verifying ${referenceTablesDatabase.length} reference tables...`);
    for (const tbl of referenceTablesDatabase) {
        const existing = await db.get('SELECT id FROM reference_tables WHERE LOWER(id) = LOWER(?)', tbl.id);
        if (!existing) {
            await db.run(
                `INSERT INTO reference_tables (
                    id, name, description, icon, category, is_system, allow_multiple,
                    grouping_column, show_in_forms, form_field_label, form_help_text,
                    is_required, columns, rows, metadata_fields, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                tbl.id,
                tbl.name,
                tbl.description || '',
                tbl.icon || 'fas fa-table',
                tbl.category || 'Organisation',
                tbl.is_system ? 1 : 0,
                tbl.allow_multiple ? 1 : 0,
                tbl.grouping_column || null,
                tbl.show_in_forms !== false ? 1 : 0,
                tbl.form_field_label || tbl.name,
                tbl.form_help_text || '',
                tbl.is_required ? 1 : 0,
                JSON.stringify(tbl.columns || []),
                JSON.stringify(tbl.rows || []),
                JSON.stringify(tbl.metadata_fields || []),
                JSON.stringify(tbl.metadata || {}),
                new Date().toISOString(),
                new Date().toISOString()
            );
        }
    }

    console.log('[SEED] ✓ Seeding completed successfully.');
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
    const isReset = process.argv.includes('--reset');
    runSeed(isReset)
        .then(() => {
            console.log('✓ Seeding process finished.');
            process.exit(0);
        })
        .catch(err => {
            console.error('✗ Seeding process failed:', err);
            process.exit(1);
        });
}
