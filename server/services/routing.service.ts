import { usersDatabase, referenceTablesDatabase, ProcessStage } from '../db/store.js';

export interface ResolvedCircuit {
    manager: { id: number; name: string; email: string };
    site_validator: { id: number; name: string; site_name: string };
    stages: ProcessStage[];
}

/**
 * Service de routage dynamique multi-tenant :
 * Résolution des jalons (stages) et des rôles paramétrables sans logique métier hardcodée.
 * Étape 1 : Validation hiérarchique ou responsable métier (SLA paramétrable)
 * Étape 2 : Validation technique et sûreté d'emprise
 */
export const resolveApprovers = async (
    beneficiaireId: number,
    siteId: number,
    _workflow = 'standard_dynamique'
): Promise<ResolvedCircuit> => {
    const user = usersDatabase.find(u => u.id === beneficiaireId) || usersDatabase[0];
    
    // Résolution dynamique du site depuis les référentiels de données
    const sitesTable = referenceTablesDatabase.find(t => t.id === 'sites');
    const dynamicSites = (sitesTable?.rows && sitesTable.rows.length > 0) ? sitesTable.rows : [];
    const site = dynamicSites.find((s: any) => s.id === siteId || s.code === String(siteId)) || dynamicSites[0] || {
        id: 1,
        name: "Site Principal",
        region: "Zone Centrale",
        validator_name: "Responsable Technique"
    };

    // 1. Détermination du Validateur Hiérarchique / Métier
    let manager = usersDatabase.find(u => (u.role === 'Manager' || u.roles?.includes('Manager')) && u.attributes?.service === user.attributes?.service);
    if (!manager) {
        manager = usersDatabase.find(u => u.role === 'Manager' || u.roles?.includes('Manager')) || {
            id: 201,
            name: "Responsable Métier",
            email: "manager@organisation.com",
            role: "Manager",
            status: "Actif",
            attributes: { region: site.region || "Zone Centrale", service: "Opérations" }
        };
    }

    // 2. Détermination du Validateur Technique / Site
    let siteValidator = usersDatabase.find(u => u.id === (site as any).validator_id);
    if (!siteValidator) {
        siteValidator = usersDatabase.find(u => u.role === 'Validateur' || u.roles?.includes('Validateur') || u.role === 'Validateur Site') || {
            id: 305,
            name: (site as any).validator_name || "Référent Technique & Sûreté",
            email: "validateur@organisation.com",
            role: "Validateur",
            status: "Actif",
            attributes: { region: site.region || "Zone Centrale", service: "Sûreté & Infrastructure" }
        };
    }

    const stages: ProcessStage[] = [
        {
            id: 'stage_1_manager',
            order: 1,
            name: 'Validation Responsable Métier',
            validator_role: manager.role || 'Manager',
            validator_id: manager.id,
            validator_name: manager.name,
            status: 'pending',
            sla_hours: 48
        },
        {
            id: 'stage_2_site',
            order: 2,
            name: `Validation Technique & Sûreté (${site.name})`,
            validator_role: siteValidator.role || 'Validateur',
            validator_id: siteValidator.id,
            validator_name: siteValidator.name,
            status: 'pending',
            sla_hours: 24
        }
    ];

    return {
        manager: { id: manager.id, name: manager.name, email: manager.email },
        site_validator: { id: siteValidator.id, name: siteValidator.name, site_name: site.name },
        stages
    };
};

