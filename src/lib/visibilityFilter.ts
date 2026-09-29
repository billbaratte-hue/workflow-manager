export interface ReferenceVisibilityRule {
    id: string;
    tableId: string;        // 'regions', 'directions', 'services', 'sites'
    tableName: string;      // 'Régions & Pôles Territoriaux', 'Directions Métier', etc.
    field: string;          // 'name', 'region', 'direction'
    operator: 'in' | 'equals';
    values: string[];       // e.g. ['Île-de-France'] or ['Direction Sûreté Ferroviaire']
    scopeTargets?: ('requests' | 'sites' | 'users' | 'all')[];
    label?: string;
}

export const DEFAULT_SERVICE_DIRECTION_MAPPING: Record<string, string> = {
    "Maintenance Voie": "Direction Générale Infrastructure",
    "Caténaires & Traction": "Direction Énergie & Traction",
    "Signalisation & Postes": "Direction des Installations de Sécurité",
    "Télécoms & Mécatronique": "Direction Télécoms & Systèmes",
    "Sécurité & Patrimoine": "Direction Sûreté Ferroviaire",
    "Exploitation & Circulation": "Direction Exploitation Réseau"
};

/**
 * Filter requests based on reference table visibility rules (e.g. Regions, Directions)
 */
export function isRequestVisible(
    req: any,
    rules: ReferenceVisibilityRule[] | undefined,
    sitesMap: Record<string, any> = {},
    servicesMap: Record<string, any> = {}
): boolean {
    if (!rules || rules.length === 0) return true;

    const applicableRules = rules.filter(r => 
        !r.scopeTargets || r.scopeTargets.includes('all') || r.scopeTargets.includes('requests')
    );
    if (applicableRules.length === 0) return true;

    return applicableRules.every(rule => {
        if (!rule.values || rule.values.length === 0) return true;

        if (rule.tableId === 'regions') {
            const site = req.site_id ? sitesMap[req.site_id] : (sitesMap[req.site_name] || null);
            const siteRegion = site?.region || req.region || req.beneficiaire_region;
            return rule.values.some(v => String(v || '').toLowerCase() === String(siteRegion || '').toLowerCase());
        }

        if (rule.tableId === 'directions') {
            const srv = servicesMap[req.beneficiaire_service] || servicesMap[req.service];
            const directMapping = DEFAULT_SERVICE_DIRECTION_MAPPING[req.beneficiaire_service] || DEFAULT_SERVICE_DIRECTION_MAPPING[req.service];
            const direction = req.direction || srv?.direction || directMapping;
            return rule.values.some(v => direction && String(v || '').toLowerCase() === String(direction).toLowerCase());
        }

        if (rule.tableId === 'services') {
            const srv = req.beneficiaire_service || req.service;
            return rule.values.some(v => String(v || '').toLowerCase() === String(srv || '').toLowerCase());
        }

        if (rule.tableId === 'sites') {
            const siteName = req.site_name || (req.site_id ? sitesMap[req.site_id]?.name : null);
            return rule.values.some(v => String(v || '').toLowerCase() === String(siteName || '').toLowerCase());
        }

        if (rule.tableId === 'equipments') {
            const eq = req.equipment_type || req.equipment || req.equipment_name || '';
            return rule.values.some(v => {
                const sEq = String(eq).toLowerCase();
                const sV = String(v || '').toLowerCase();
                return sEq && sV && (sEq.includes(sV) || sV.includes(sEq));
            });
        }

        if (rule.tableId === 'contractors') {
            const cont = req.team_company || req.contractor || req.prestataire || '';
            return rule.values.some(v => {
                const sCont = String(cont).toLowerCase();
                const sV = String(v || '').toLowerCase();
                return sCont && sV && (sCont.includes(sV) || sV.includes(sCont));
            });
        }

        // Generic matching for any custom or user-defined table
        const candidateFields = [
            rule.tableId,
            rule.field,
            `${rule.tableId}_id`,
            `${rule.tableId}_name`,
            `${rule.tableId}_code`
        ];

        for (const f of candidateFields) {
            if (f && req[f] !== undefined && req[f] !== null) {
                const valStr = String(req[f]).toLowerCase();
                if (rule.values.some(v => {
                    const sV = String(v || '').toLowerCase();
                    return valStr === sV || valStr.includes(sV);
                })) {
                    return true;
                }
            }
        }

        // Check if values appear in request title or description or custom fields
        const fullContent = `${req.title || ''} ${req.description || ''} ${JSON.stringify(req.custom_fields || {})}`.toLowerCase();
        return rule.values.some(v => fullContent.includes(String(v || '').toLowerCase()));
    });
}

/**
 * Filter railway sites based on reference table visibility rules
 */
export function isSiteVisible(
    site: any,
    rules: ReferenceVisibilityRule[] | undefined
): boolean {
    if (!rules || rules.length === 0) return true;

    const applicableRules = rules.filter(r => 
        !r.scopeTargets || r.scopeTargets.includes('all') || r.scopeTargets.includes('sites')
    );
    if (applicableRules.length === 0) return true;

    return applicableRules.every(rule => {
        if (!rule.values || rule.values.length === 0) return true;

        if (rule.tableId === 'regions') {
            return rule.values.some(v => String(v || '').toLowerCase() === String(site.region || '').toLowerCase());
        }

        if (rule.tableId === 'sites') {
            return rule.values.some(v => {
                const sV = String(v || '').toLowerCase();
                return sV === String(site.name || '').toLowerCase() || sV === String(site.code || '').toLowerCase();
            });
        }

        // Generic matching for any table in sites
        const siteStr = JSON.stringify(site).toLowerCase();
        return rule.values.some(v => siteStr.includes(String(v || '').toLowerCase()));
    });
}

/**
 * Filter user agents based on reference table visibility rules
 */
export function isUserVisible(
    user: any,
    rules: ReferenceVisibilityRule[] | undefined,
    servicesMap: Record<string, any> = {}
): boolean {
    if (!rules || rules.length === 0) return true;

    const applicableRules = rules.filter(r => 
        !r.scopeTargets || r.scopeTargets.includes('all') || r.scopeTargets.includes('users')
    );
    if (applicableRules.length === 0) return true;

    return applicableRules.every(rule => {
        if (!rule.values || rule.values.length === 0) return true;

        if (rule.tableId === 'regions') {
            const reg = user.attributes?.region;
            return rule.values.some(v => String(v || '').toLowerCase() === String(reg || '').toLowerCase());
        }

        if (rule.tableId === 'directions') {
            const srvName = user.attributes?.service;
            const srv = srvName ? servicesMap[srvName] : null;
            const directMapping = srvName ? DEFAULT_SERVICE_DIRECTION_MAPPING[srvName] : null;
            const dir = user.attributes?.direction || srv?.direction || directMapping;
            return rule.values.some(v => dir && String(v || '').toLowerCase() === String(dir).toLowerCase());
        }

        if (rule.tableId === 'services') {
            const srv = user.attributes?.service;
            return rule.values.some(v => String(v || '').toLowerCase() === String(srv || '').toLowerCase());
        }

        if (rule.tableId === 'sites') {
            const site = user.attributes?.site;
            return rule.values.some(v => String(v || '').toLowerCase() === String(site || '').toLowerCase());
        }

        // Generic matching for any table in user attributes or profile
        const userStr = `${user.name || ''} ${user.email || ''} ${user.role || ''} ${JSON.stringify(user.attributes || {})}`.toLowerCase();
        return rule.values.some(v => userStr.includes(String(v || '').toLowerCase()));
    });
}
