import jwt from 'jsonwebtoken';
import { UserRepository, userRepository } from '../repositories/user.repository.js';
import { RoleRepository, roleRepository } from '../repositories/role.repository.js';
import { AuditRepository, auditRepository } from '../repositories/audit.repository.js';
import { SettingsRepository, settingsRepository } from '../repositories/settings.repository.js';
import { JWT_SECRET } from '../middleware/auth.middleware.js';

export interface AuthSession {
    token: string;
    user: {
        id: number;
        email: string;
        name: string;
        role: string;
        roles: string[];
        status: string;
        attributes: Record<string, any>;
        privileges: string[];
        portalTabs: Record<string, boolean>;
        tablePermissions: Record<string, any>;
        referenceVisibilityRules: any[];
    };
}

export class AuthService {
    private jwtSecret: string;
    private settingsRepo: SettingsRepository;
    private failedAttempts = new Map<string, { count: number; lockedUntil?: number }>();

    constructor(
        private userRepo: UserRepository = userRepository,
        private roleRepo: RoleRepository = roleRepository,
        private auditRepo: AuditRepository = auditRepository,
        jwtSecretOrSettings?: string | SettingsRepository,
        jwtSecret?: string
    ) {
        if (typeof jwtSecretOrSettings === 'string') {
            this.jwtSecret = jwtSecretOrSettings;
            this.settingsRepo = settingsRepository;
        } else if (jwtSecretOrSettings) {
            this.settingsRepo = jwtSecretOrSettings;
            this.jwtSecret = jwtSecret || process.env.JWT_SECRET || JWT_SECRET;
        } else {
            this.settingsRepo = settingsRepository;
            this.jwtSecret = jwtSecret || process.env.JWT_SECRET || JWT_SECRET;
        }
    }

    async authenticate(email: string, password?: string): Promise<AuthSession> {
        if (!email || !email.trim()) {
            throw new Error('Email obligatoire');
        }
        if (!password || !password.trim()) {
            throw new Error('Mot de passe obligatoire');
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.userRepo.findByEmail(normalizedEmail);

        if (!user) {
            await this.auditRepo.log({
                actor: email,
                role: 'Inconnu',
                action: 'AUTH_FAILED',
                target: 'Auth',
                details: `Tentative de connexion avec email non trouvé: ${email}`
            });
            throw new Error('Identifiants incorrects. Veuillez utiliser un compte valide.');
        }

        if (user.status && user.status.toLowerCase() !== 'actif') {
            throw new Error('Compte désactivé. Contactez votre administrateur.');
        }

        // Vérifier les tentatives de connexion et le verrouillage selon la politique active (Zero Hardcoding)
        const passwordPolicy = await this.settingsRepo.getSettingValue('password_access_policy', {
            login_attempts_limit: 5
        });
        const attemptLimit = Number(passwordPolicy.login_attempts_limit) || 5;
        const currentAttempts = this.failedAttempts.get(normalizedEmail);

        if (currentAttempts && currentAttempts.count >= attemptLimit) {
            if (currentAttempts.lockedUntil && Date.now() < currentAttempts.lockedUntil) {
                const remainingMinutes = Math.ceil((currentAttempts.lockedUntil - Date.now()) / 60000);
                throw new Error(`Compte temporairement verrouillé suite à ${attemptLimit} tentatives infructueuses. Réessayez dans ${remainingMinutes} minute(s).`);
            } else if (currentAttempts.lockedUntil && Date.now() >= currentAttempts.lockedUntil) {
                // Lockout period expired
                this.failedAttempts.delete(normalizedEmail);
            }
        }

        // Strict verification against bcrypt password hash - no master passwords permitted
        const isValid = await this.userRepo.verifyPassword(password, user.password_hash);
        
        if (!isValid) {
            const updated = this.failedAttempts.get(normalizedEmail) || { count: 0 };
            updated.count += 1;
            if (updated.count >= attemptLimit) {
                updated.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
            }
            this.failedAttempts.set(normalizedEmail, updated);

            await this.auditRepo.log({
                actor: user.name,
                role: user.role,
                action: 'AUTH_FAILED',
                target: 'Auth',
                details: `Échec d'authentification par mot de passe pour ${email} (Tentative ${updated.count}/${attemptLimit})`
            });
            throw new Error('Identifiants incorrects. Mot de passe invalide.');
        } else {
            // Successful password verification -> reset failed attempts
            this.failedAttempts.delete(normalizedEmail);
        }

        // Aggregate privileges and permissions across all user roles
        const userRoles: string[] = Array.isArray(user.roles) && user.roles.length > 0
            ? user.roles
            : [user.role];

        const privilegeSet = new Set<string>();
        const mergedPortalTabs: Record<string, boolean> = {
            catalogue: false,
            'mes-demandes': false,
            corbeille: false,
            'historique-decisions': false,
            'tableau-de-bord': false,
            delegation: false,
            admin: false
        };
        const mergedTablePermissions: Record<string, any> = {};
        const mergedReferenceVisibilityRules: any[] = [];

        for (const roleName of userRoles) {
            const roleObj = await this.roleRepo.getByName(roleName);
            if (roleObj) {
                // Merge privileges
                (roleObj.privileges || []).forEach(p => privilegeSet.add(p));

                // Merge portal tabs
                if (roleObj.portalTabs) {
                    Object.entries(roleObj.portalTabs).forEach(([tab, enabled]) => {
                        if (enabled) mergedPortalTabs[tab] = true;
                    });
                }

                // Merge table permissions
                if (roleObj.tablePermissions) {
                    Object.entries(roleObj.tablePermissions).forEach(([tbl, perm]) => {
                        if (!mergedTablePermissions[tbl]) {
                            mergedTablePermissions[tbl] = { ...perm };
                        } else {
                            mergedTablePermissions[tbl].see = mergedTablePermissions[tbl].see || perm.see;
                            mergedTablePermissions[tbl].modify = mergedTablePermissions[tbl].modify || perm.modify;
                            mergedTablePermissions[tbl].delete = mergedTablePermissions[tbl].delete || perm.delete;
                            mergedTablePermissions[tbl].create = mergedTablePermissions[tbl].create || perm.create;
                            if (perm.dataScope === 'all') mergedTablePermissions[tbl].dataScope = 'all';
                        }
                    });
                }

                // Merge visibility rules
                if (roleObj.referenceVisibilityRules && Array.isArray(roleObj.referenceVisibilityRules)) {
                    roleObj.referenceVisibilityRules.forEach(rule => {
                        if (!mergedReferenceVisibilityRules.some(r => r.id === rule.id)) {
                            mergedReferenceVisibilityRules.push(rule);
                        }
                    });
                }
            }
        }

        // If no explicit privileges matched, assign baseline demandeur
        if (privilegeSet.size === 0) {
            privilegeSet.add('view_dashboard');
            privilegeSet.add('create_request');
            privilegeSet.add('view_own_requests');
            mergedPortalTabs.catalogue = true;
            mergedPortalTabs['mes-demandes'] = true;
            mergedPortalTabs['tableau-de-bord'] = true;
        }

        const privilegesArray = Array.from(privilegeSet);

        // Sign real JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                roles: userRoles,
                privileges: privilegesArray,
                name: user.name
            },
            this.jwtSecret,
            { expiresIn: '8h' }
        );

        await this.auditRepo.log({
            actor: user.name,
            role: user.role,
            action: 'AUTH_LOGIN_SUCCESS',
            target: 'Auth',
            details: `Connexion réussie - Rôles: [${userRoles.join(', ')}] - Privilèges: [${privilegesArray.join(', ')}]`
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                roles: userRoles,
                status: user.status,
                attributes: user.attributes,
                privileges: privilegesArray,
                portalTabs: mergedPortalTabs,
                tablePermissions: mergedTablePermissions,
                referenceVisibilityRules: mergedReferenceVisibilityRules
            }
        };
    }

    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch {
            throw new Error('Jeton d’authentification invalide ou expiré');
        }
    }
}

export const authService = new AuthService();
