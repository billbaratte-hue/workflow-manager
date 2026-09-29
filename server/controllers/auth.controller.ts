import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { usersDatabase, rolesDatabase, userAttributesSchema, logAction, Role } from '../db/store.js';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { emailService } from '../services/email.service.js';
import { passwordResetRepository } from '../repositories/password-reset.repository.js';
import { JWT_SECRET } from '../middleware/auth.middleware.js';

export const login = async (req: any, res: any) => {
    try {
        const { email, password } = req.body;
        if (!email || !email.trim()) {
            return res.status(400).json({ error: "L'adresse email est requise." });
        }
        if (!password || !password.trim()) {
            return res.status(400).json({ error: "Le mot de passe est requis." });
        }

        try {
            const authResult = await authService.authenticate(email.trim(), password);
            return res.status(200).json({
                message: "Connexion réussie",
                token: authResult.token,
                user: authResult.user
            });
        } catch (authErr: any) {
            return res.status(401).json({ error: authErr.message || "Identifiants incorrects." });
        }
    } catch (error) {
        console.error("Erreur serveur lors de l'authentification:", error);
        res.status(500).json({ error: "Erreur serveur lors de l'authentification." });
    }
};

export const getUsers = async (req: any, res: any) => {
    try {
        const dbUsers = await userRepository.getAll();
        if (dbUsers && dbUsers.length > 0) {
            return res.json(dbUsers);
        }
    } catch (e) {
        console.warn("Could not load users from SQLite, falling back to in-memory store:", e);
    }
    return res.json(usersDatabase);
};

export const createUser = async (req: any, res: any) => {
    const { name, email, role, roles, attributes, password } = req.body;
    const resolvedRoles = Array.isArray(roles) && roles.length > 0
        ? roles
        : (role ? [role] : ["Demandeur"]);
    const primaryRole = resolvedRoles[0] || role || "Demandeur";
    const normalizedEmail = (email || `user${Date.now()}@entreprise.fr`).toLowerCase().trim();

    try {
        const generatedPass = password || (crypto.randomBytes(6).toString('hex') + 'A1!');
        const createdEntity = await userRepository.create({
            email: normalizedEmail,
            name: (name || "Nouvel Utilisateur").trim(),
            role: primaryRole,
            roles: resolvedRoles,
            password: generatedPass,
            status: "Actif",
            attributes: attributes || { region: "Île-de-France", service: "Exploitation" }
        });

        // Sync with in-memory store to prevent divergence
        const existingIdx = usersDatabase.findIndex(u => u.id === createdEntity.id || u.email.toLowerCase() === normalizedEmail);
        if (existingIdx >= 0) {
            usersDatabase[existingIdx] = createdEntity;
        } else {
            usersDatabase.push(createdEntity);
        }

        logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "CREATE_USER", createdEntity.email, `Création utilisateur ${createdEntity.name} (${resolvedRoles.join(', ')})`);
        return res.status(201).json({ success: true, user: createdEntity });
    } catch (err: any) {
        console.error("Could not persist user to SQLite:", err);
        return res.status(400).json({ error: err.message || "Erreur lors de la création de l'utilisateur." });
    }
};

export const register = async (req: any, res: any) => {
    try {
        const { name, email, password, attributes } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Nom, email et mot de passe sont obligatoires." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingInMem = usersDatabase.find(u => u.email.toLowerCase() === normalizedEmail);
        const existingInDb = await userRepository.findByEmail(normalizedEmail);
        if (existingInMem || existingInDb) {
            return res.status(400).json({ error: "Un compte avec cette adresse email existe déjà." });
        }

        // Validation dynamique de la complexité du mot de passe selon la politique active (Zero Hardcoding)
        const policy = await settingsRepository.getSettingValue('password_access_policy', {
            password_min_length: 5,
            password_max_length: 15,
            uppercase_required: true,
            lowercase_required: true,
            special_char_required: true,
            number_required: true,
            login_attempts_limit: 5,
            password_validity_days: 120,
            password_recovery: true,
            password_recovery_link_validity_days: 4,
            enforce_password_history: 1
        });

        if (password.length < (policy.password_min_length || 5)) {
            return res.status(400).json({ error: `Le mot de passe doit comporter au moins ${policy.password_min_length || 5} caractères.` });
        }
        if (password.length > (policy.password_max_length || 15)) {
            return res.status(400).json({ error: `Le mot de passe ne doit pas dépasser ${policy.password_max_length || 15} caractères.` });
        }
        if (policy.uppercase_required && !/[A-Z]/.test(password)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins une lettre majuscule." });
        }
        if (policy.lowercase_required && !/[a-z]/.test(password)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins une lettre minuscule." });
        }
        if (policy.number_required && !/[0-9]/.test(password)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins un chiffre." });
        }
        if (policy.special_char_required && !/[^A-Za-z0-9]/.test(password)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins un caractère spécial." });
        }

        // Security rule: Self-registration strictly defaults to "Demandeur".
        // Caller cannot pick their role.
        const resolvedRole = 'Demandeur';
        const userAttrs = attributes || { region: "Île-de-France", service: "Exploitation" };

        const createdEntity = await userRepository.create({
            email: normalizedEmail,
            name: name.trim(),
            role: resolvedRole,
            roles: [resolvedRole],
            password: password,
            status: "Actif",
            attributes: userAttrs
        });

        // Keep in-memory store in sync
        const existingIdx = usersDatabase.findIndex(u => u.id === createdEntity.id || u.email.toLowerCase() === normalizedEmail);
        if (existingIdx >= 0) {
            usersDatabase[existingIdx] = createdEntity;
        } else {
            usersDatabase.push(createdEntity);
        }

        const token = jwt.sign(
            { id: createdEntity.id, email: createdEntity.email, role: createdEntity.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        logAction("Système Inscription", "Demandeur", "REGISTER_USER", createdEntity.email, `Auto-inscription utilisateur ${createdEntity.name} (${createdEntity.email})`);
        return res.status(201).json({
            success: true,
            message: "Compte créé avec succès.",
            user: { ...createdEntity, token },
            token
        });
    } catch (err: any) {
        console.error("Erreur lors de l'enregistrement:", err);
        return res.status(500).json({ error: "Erreur serveur lors de la création du compte." });
    }
};

export const updateUser = async (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const user = usersDatabase.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.roles && Array.isArray(req.body.roles)) {
        user.roles = req.body.roles;
        user.role = req.body.roles[0] || user.role || 'Demandeur';
    } else if (req.body.role) {
        user.role = req.body.role;
        user.roles = [req.body.role];
    }
    if (req.body.status) user.status = req.body.status;
    if (req.body.attributes) {
        user.attributes = { ...user.attributes, ...req.body.attributes };
    }

    // Persist in SQLite
    try {
        await userRepository.update(id, {
            name: user.name,
            email: user.email,
            role: user.role,
            roles: user.roles,
            status: user.status,
            attributes: user.attributes
        });
    } catch (err) {
        console.warn("Could not update user in SQLite:", err);
    }

    logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "UPDATE_USER", user.email, `Modification utilisateur ${user.name} (${(user.roles || [user.role]).join(', ')})`);
    res.json({ success: true, user });
};

export const deleteUser = async (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const idx = usersDatabase.findIndex(u => u.id === id);
    if (idx > -1) usersDatabase.splice(idx, 1);

    try {
        await userRepository.delete(id);
    } catch (err) {
        console.warn("Could not delete user from SQLite:", err);
    }

    res.json({ success: true });
};

export const getUserAttributesSchema = (req: any, res: any) => res.json(userAttributesSchema);
export const addUserAttributeField = (req: any, res: any) => {
    if (req.body.id && req.body.label) {
        userAttributesSchema.push(req.body);
    }
    res.json({ success: true, schema: userAttributesSchema });
};

export const getRoles = async (req: any, res: any) => {
    try {
        const dbRoles = await roleRepository.getAll();
        if (dbRoles && dbRoles.length > 0) {
            return res.json(dbRoles);
        }
    } catch (e) {
        console.warn("Could not load roles from SQLite, falling back to in-memory store:", e);
    }
    return res.json(rolesDatabase);
};

export const createRole = async (req: any, res: any) => {
    try {
        const rawName = req.body.name;
        if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
            return res.status(400).json({ error: "L'intitulé du rôle est requis." });
        }

        const trimmedName = rawName.trim();

        // 1. Check for duplicate name (case-insensitive) in memory
        const memDuplicate = rolesDatabase.find(r => r.name.toLowerCase() === trimmedName.toLowerCase());
        if (memDuplicate) {
            return res.status(400).json({ error: `Un rôle intitulé "${trimmedName}" existe déjà dans le système.` });
        }

        // 2. Check for duplicate name in SQLite
        try {
            const dbDuplicate = await roleRepository.getByName(trimmedName);
            if (dbDuplicate) {
                // Ensure memory has it synced
                if (!rolesDatabase.some(r => r.id === dbDuplicate.id)) {
                    rolesDatabase.push(dbDuplicate);
                }
                return res.status(400).json({ error: `Un rôle intitulé "${trimmedName}" existe déjà dans le système.` });
            }
        } catch (e) {
            console.warn("Could not check duplicate role in SQLite:", e);
        }

        // 3. Compute safe nextId from both memory and SQLite
        let nextId = 1;
        try {
            const allDbRoles = await roleRepository.getAll();
            const maxDbId = allDbRoles.length ? Math.max(...allDbRoles.map(r => r.id)) : 0;
            const maxMemId = rolesDatabase.length ? Math.max(...rolesDatabase.map(r => r.id)) : 0;
            nextId = Math.max(maxDbId, maxMemId, 0) + 1;
        } catch {
            nextId = rolesDatabase.length ? Math.max(...rolesDatabase.map(r => r.id)) + 1 : 1;
        }

        const newRole = {
            id: nextId,
            name: trimmedName,
            description: req.body.description ? String(req.body.description).trim() : "",
            privileges: Array.isArray(req.body.privileges) ? req.body.privileges : ['view_dashboard', 'create_request'],
            portalTabs: req.body.portalTabs || {
                catalogue: true,
                'mes-demandes': true,
                corbeille: false,
                'historique-decisions': false,
                'tableau-de-bord': true,
                delegation: false,
                admin: false
            },
            tablePermissions: req.body.tablePermissions || {
                requests: { see: true, modify: true, delete: false, create: true, dataScope: 'own', allowedFields: ['general'] },
                tables: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
                processes: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
                catalogues: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
                users: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
                roles: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
                syslog: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] }
            },
            referenceVisibilityRules: Array.isArray(req.body.referenceVisibilityRules) ? req.body.referenceVisibilityRules : []
        };

        // 4. Persist in SQLite first
        let createdRole: Role = newRole;
        try {
            createdRole = await roleRepository.create({
                id: newRole.id,
                name: newRole.name,
                description: newRole.description,
                privileges: newRole.privileges,
                portalTabs: newRole.portalTabs,
                tablePermissions: newRole.tablePermissions,
                referenceVisibilityRules: newRole.referenceVisibilityRules
            });
        } catch (dbErr: any) {
            console.error("Erreur lors de la persistance SQLite du rôle:", dbErr);
            if (dbErr?.message?.includes('UNIQUE constraint failed') || dbErr?.code === 'ERR_SQLITE_ERROR') {
                return res.status(400).json({ error: `Un rôle portant l'intitulé "${trimmedName}" existe déjà.` });
            }
            return res.status(500).json({ error: `Erreur interne lors de la création du rôle: ${dbErr.message || 'Erreur base de données'}` });
        }

        // 5. Update in-memory database
        const existingIdx = rolesDatabase.findIndex(r => r.id === createdRole.id);
        if (existingIdx >= 0) {
            rolesDatabase[existingIdx] = createdRole;
        } else {
            rolesDatabase.push(createdRole);
        }

        logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "CREATE_ROLE", createdRole.name, `Création du rôle ${createdRole.name}`);
        return res.status(201).json({ success: true, role: createdRole });
    } catch (err: any) {
        console.error("Erreur inattendue createRole:", err);
        return res.status(500).json({ error: `Erreur lors de la création du rôle: ${err.message || 'Erreur serveur'}` });
    }
};

export const updateRole = async (req: any, res: any) => {
    try {
        const id = parseInt(req.params.id);
        let role = rolesDatabase.find(r => r.id === id);
        if (!role) {
            try {
                const dbRole = await roleRepository.getById(id);
                if (dbRole) {
                    rolesDatabase.push(dbRole);
                    role = dbRole;
                }
            } catch {}
        }

        if (!role) return res.status(404).json({ error: "Rôle non trouvé" });

        if (req.body.name !== undefined) {
            const trimmedName = String(req.body.name).trim();
            if (!trimmedName) {
                return res.status(400).json({ error: "L'intitulé du rôle ne peut pas être vide." });
            }
            // Check uniqueness in memory
            const dupMem = rolesDatabase.find(r => r.id !== id && r.name.toLowerCase() === trimmedName.toLowerCase());
            if (dupMem) {
                return res.status(400).json({ error: `Un autre rôle portant l'intitulé "${trimmedName}" existe déjà.` });
            }
            // Check uniqueness in SQLite
            try {
                const dupDb = await roleRepository.getByName(trimmedName);
                if (dupDb && dupDb.id !== id) {
                    return res.status(400).json({ error: `Un autre rôle portant l'intitulé "${trimmedName}" existe déjà.` });
                }
            } catch {}

            role.name = trimmedName;
        }

        if (req.body.description !== undefined) role.description = req.body.description;
        if (req.body.privileges !== undefined) role.privileges = req.body.privileges;
        if (req.body.portalTabs !== undefined) role.portalTabs = req.body.portalTabs;
        if (req.body.tablePermissions !== undefined) role.tablePermissions = req.body.tablePermissions;
        if (req.body.referenceVisibilityRules !== undefined) role.referenceVisibilityRules = req.body.referenceVisibilityRules;

        // Persist in SQLite
        try {
            await roleRepository.update(id, {
                name: role.name,
                description: role.description,
                privileges: role.privileges,
                portalTabs: role.portalTabs,
                tablePermissions: role.tablePermissions,
                referenceVisibilityRules: role.referenceVisibilityRules
            });
        } catch (err: any) {
            console.error("Could not update role in SQLite:", err);
            if (err?.message?.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: `Un rôle portant l'intitulé "${role.name}" existe déjà.` });
            }
            return res.status(500).json({ error: `Erreur lors de la mise à jour du rôle: ${err.message}` });
        }

        logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "UPDATE_ROLE", role.name, `Mise à jour des privilèges et visibilités du rôle ${role.name}`);
        return res.json({ success: true, role });
    } catch (err: any) {
        console.error("Erreur inattendue updateRole:", err);
        return res.status(500).json({ error: `Erreur serveur: ${err.message}` });
    }
};

export const deleteRole = async (req: any, res: any) => {
    try {
        const id = parseInt(req.params.id);
        const role = rolesDatabase.find(r => r.id === id);
        if (!role) return res.status(404).json({ error: "Rôle non trouvé." });

        if (role.name === 'Administrateur') {
            return res.status(400).json({ error: "Le rôle Administrateur est protégé et ne peut pas être supprimé." });
        }

        // Check if any users have this role
        const assignedUsers = usersDatabase.filter(u => u.role === role.name || (u.roles && u.roles.includes(role.name)));
        if (assignedUsers.length > 0) {
            return res.status(400).json({ error: `Impossible de supprimer ce rôle car ${assignedUsers.length} utilisateur(s) y sont actuellement rattachés.` });
        }

        const idx = rolesDatabase.findIndex(r => r.id === id);
        if (idx > -1) rolesDatabase.splice(idx, 1);

        try {
            await roleRepository.delete(id);
        } catch (err) {
            console.warn("Could not delete role from SQLite:", err);
        }

        logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "DELETE_ROLE", role.name, `Suppression du rôle ${role.name}`);
        return res.json({ success: true });
    } catch (err: any) {
        console.error("Erreur inattendue deleteRole:", err);
        return res.status(500).json({ error: `Erreur serveur: ${err.message}` });
    }
};

export const getPasswordPolicy = async (_req: any, res: any) => {
    try {
        const policy = await settingsRepository.getSettingValue('password_access_policy', {
            password_min_length: 5,
            password_max_length: 15,
            uppercase_required: true,
            lowercase_required: true,
            special_char_required: true,
            number_required: true,
            login_attempts_limit: 5,
            password_validity_days: 120,
            password_recovery: true,
            password_recovery_link_validity_days: 4,
            enforce_password_history: 1
        });
        return res.status(200).json(policy);
    } catch (e: any) {
        return res.status(200).json({
            password_min_length: 5,
            password_max_length: 15,
            uppercase_required: true,
            lowercase_required: true,
            special_char_required: true,
            number_required: true,
            login_attempts_limit: 5,
            password_validity_days: 120,
            password_recovery: true,
            password_recovery_link_validity_days: 4,
            enforce_password_history: 1
        });
    }
};

export const forgotPassword = async (req: any, res: any) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ error: "L'adresse email est requise." });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Politique de sécurité
        const policy = await settingsRepository.getSettingValue('password_access_policy', {
            password_recovery: true,
            password_recovery_link_validity_days: 1
        });

        if (policy.password_recovery === false) {
            return res.status(403).json({ error: "La réinitialisation de mot de passe en libre-service est désactivée par la politique de sécurité." });
        }

        // Validity period in minutes (default 60 minutes)
        const validityHours = policy.password_recovery_link_validity_days
            ? Math.min(policy.password_recovery_link_validity_days * 24, 72)
            : 1;
        const validityMinutes = Math.max(15, validityHours * 60);

        // Recherche utilisateur (SQLite ou mémoire)
        const user = await userRepository.findByEmail(normalizedEmail) || usersDatabase.find(u => u.email.toLowerCase() === normalizedEmail);

        if (user && user.status !== 'Désactivé') {
            const tenantId = (user as any).tenant_id || (req.headers['x-tenant-id'] as string) || 'default';
            const { token } = await passwordResetRepository.createToken(normalizedEmail, validityMinutes, tenantId);

            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
            const origin = req.headers.origin || `${protocol}://${host}`;
            const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

            await emailService.sendEmail({
                to: normalizedEmail,
                subject: "Réinitialisation de votre mot de passe - Portail Mécatronique",
                text: `Bonjour ${user.name},\n\nUne demande de réinitialisation de votre mot de passe a été demandée pour votre compte.\n\nVeuillez cliquer sur le lien suivant pour définir un nouveau mot de passe :\n${resetUrl}\n\nCe lien sécurisé est à usage unique et expire dans ${validityHours > 1 ? validityHours + ' heures' : '60 minutes'}.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité.\n\nCordialement,\nL'équipe Sécurité & Support Opérationnel`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <span style="background-color: #002395; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold;">Portail Mécatronique</span>
                            <h2 style="color: #0f172a; margin-top: 16px; margin-bottom: 8px;">Réinitialisation de mot de passe</h2>
                            <p style="color: #64748b; font-size: 14px; margin: 0;">Plateforme Sécurisée & Habilitations</p>
                        </div>
                        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Bonjour <strong>${user.name}</strong>,</p>
                        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                            Une demande de réinitialisation de votre mot de passe a été formulée pour votre adresse <strong>${normalizedEmail}</strong>.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #002395; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 35, 149, 0.2);">
                                Définir un nouveau mot de passe
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                            Si le bouton ci-dessus ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br/>
                            <a href="${resetUrl}" style="color: #002395; word-break: break-all;">${resetUrl}</a>
                        </p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <div style="background-color: #f8fafc; border-left: 4px solid #002395; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #475569;">
                            <strong>Garantie de Sécurité (NIS 2) :</strong> Ce lien est strictement personnel, à usage unique et expirera dans ${validityHours > 1 ? validityHours + ' heures' : '60 minutes'}. Si vous n'êtes pas à l'origine de cette demande, votre compte reste parfaitement protégé et aucune action n'est requise.
                        </div>
                    </div>
                `
            });

            logAction(user.name, user.role, 'PASSWORD_RESET_REQUESTED', normalizedEmail, `Demande de réinitialisation de mot de passe générée pour ${normalizedEmail}`);
        }

        // NIS 2 Anti-enumeration: Toujours renvoyer un statut 200 générique
        return res.status(200).json({
            success: true,
            message: "Si cette adresse email est associée à un compte actif, un lien de réinitialisation sécurisé vous a été envoyé par email."
        });
    } catch (err: any) {
        console.error("Erreur lors de la demande de réinitialisation de mot de passe:", err);
        return res.status(500).json({ error: "Une erreur est survenue lors du traitement de la demande." });
    }
};

export const verifyResetToken = async (req: any, res: any) => {
    try {
        const email = (req.query.email as string || '').trim().toLowerCase();
        const token = (req.query.token as string || '').trim();

        if (!email || !token) {
            return res.status(400).json({ valid: false, error: "Identifiants de vérification manquants." });
        }

        const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
        const result = await passwordResetRepository.verifyToken(email, token, tenantId);

        if (!result.valid) {
            return res.status(400).json({ valid: false, error: result.reason || "Lien invalide ou expiré." });
        }

        return res.status(200).json({
            valid: true,
            email
        });
    } catch (err: any) {
        console.error("Erreur lors de la validation du token de réinitialisation:", err);
        return res.status(500).json({ valid: false, error: "Erreur serveur lors de la validation du lien." });
    }
};

export const resetPassword = async (req: any, res: any) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: "L'adresse email, le jeton de sécurité et le nouveau mot de passe sont obligatoires." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const tenantId = (req.headers['x-tenant-id'] as string) || 'default';

        // 1. Vérification de la validité du token
        const check = await passwordResetRepository.verifyToken(normalizedEmail, token.trim(), tenantId);
        if (!check.valid || !check.record) {
            return res.status(400).json({ error: check.reason || "Ce lien de réinitialisation est invalide ou a expiré." });
        }

        // 2. Recherche du compte utilisateur
        let user = await userRepository.findByEmail(normalizedEmail);
        const memUser = usersDatabase.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!user && !memUser) {
            return res.status(404).json({ error: "Utilisateur introuvable." });
        }

        // 3. Validation de la politique de sécurité des mots de passe
        const policy = await settingsRepository.getSettingValue('password_access_policy', {
            password_min_length: 5,
            password_max_length: 15,
            uppercase_required: true,
            lowercase_required: true,
            special_char_required: true,
            number_required: true,
            enforce_password_history: 1
        });

        if (newPassword.length < (policy.password_min_length || 5)) {
            return res.status(400).json({ error: `Le mot de passe doit comporter au moins ${policy.password_min_length || 5} caractères.` });
        }
        if (newPassword.length > (policy.password_max_length || 15)) {
            return res.status(400).json({ error: `Le mot de passe ne doit pas dépasser ${policy.password_max_length || 15} caractères.` });
        }
        if (policy.uppercase_required && !/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins une lettre majuscule." });
        }
        if (policy.lowercase_required && !/[a-z]/.test(newPassword)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins une lettre minuscule." });
        }
        if (policy.number_required && !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins un chiffre." });
        }
        if (policy.special_char_required && !/[^A-Za-z0-9]/.test(newPassword)) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins un caractère spécial." });
        }

        // Vérification historique : ne pas réutiliser le mot de passe actuel si enforce_password_history actif
        const currentHash = user?.password_hash || (memUser as any)?.password_hash;
        if (currentHash && await userRepository.verifyPassword(newPassword, currentHash)) {
            return res.status(400).json({ error: "Le nouveau mot de passe doit être différent du mot de passe actuel." });
        }

        // 4. Mise à jour dans la base de données
        let updatedEntity: any = null;
        if (user) {
            updatedEntity = await userRepository.update(user.id, { password: newPassword });
        }

        // 5. Synchronisation de la base mémoire
        if (memUser) {
            const newHash = updatedEntity?.password_hash || (await import('bcryptjs')).default.hashSync(newPassword, 10);
            memUser.password_hash = newHash;
        }

        // 6. Consommation du jeton et invalidation des autres jetons de cet utilisateur
        await passwordResetRepository.consumeToken(check.record.id);
        await passwordResetRepository.invalidateAllForEmail(normalizedEmail);

        // 7. Audit log & notification
        const userName = user?.name || memUser?.name || normalizedEmail;
        const userRole = user?.role || memUser?.role || 'Demandeur';
        logAction(userName, userRole, 'PASSWORD_RESET_SUCCESS', normalizedEmail, `Réinitialisation réussie du mot de passe pour ${normalizedEmail}`);

        return res.status(200).json({
            success: true,
            message: "Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter."
        });
    } catch (err: any) {
        console.error("Erreur lors de la réinitialisation du mot de passe:", err);
        return res.status(500).json({ error: "Une erreur est survenue lors de la réinitialisation du mot de passe." });
    }
};

