import { getDatabase } from '../server/db/database.js';

async function updateFeatures() {
    const db = await getDatabase();
    await db.run(`
        UPDATE system_features 
        SET is_enabled = 1 
        WHERE key IN (
            'export_csv_advanced', 
            'metadata_schema', 
            'referentiel_types_structure', 
            'role_field_scope', 
            'role_simulation', 
            'syslog_audit_nis2', 
            'delegation_approval'
        )
    `);
    await db.run("UPDATE system_features SET is_enabled = 0 WHERE key = 'ai_demandes'");
    console.log("Core system features enabled, AI kept disabled.");
    await db.close();
    process.exit(0);
}

updateFeatures().catch(err => {
    console.error(err);
    process.exit(1);
});
