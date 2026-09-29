import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { usersDatabase, rolesDatabase, userAttributesSchema, logAction } from '../db/store.js';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
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
    const nextId = rolesDatabase.length ? Math.max(...rolesDatabase.map(r => r.id)) + 1 : 1;
    const newRole = {
        id: nextId,
        name: req.body.name || "Nouveau Rôle",
        description: req.body.description || "",
        privileges: Array.isArray(req.body.privileges) ? req.body.privileges : [],
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

    // Add to in-memory database
    rolesDatabase.push(newRole);

    // Persist in SQLite
    try {
        await roleRepository.create({
            id: newRole.id,
            name: newRole.name,
            description: newRole.description,
            privileges: newRole.privileges,
            portalTabs: newRole.portalTabs,
            tablePermissions: newRole.tablePermissions,
            referenceVisibilityRules: newRole.referenceVisibilityRules
        });
    } catch (err) {
        console.warn("Could not persist role in SQLite:", err);
    }

    logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "CREATE_ROLE", newRole.name, `Création du rôle ${newRole.name}`);
    res.status(201).json({ success: true, role: newRole });
};

export const updateRole = async (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const role = rolesDatabase.find(r => r.id === id);
    if (!role) return res.status(404).json({ error: "Rôle non trouvé" });

    if (req.body.name !== undefined) role.name = req.body.name;
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
    } catch (err) {
        console.warn("Could not update role in SQLite:", err);
    }

    logAction(req.user?.name || "Admin", req.user?.role || "Administrateur", "UPDATE_ROLE", role.name, `Mise à jour des privilèges et visibilités du rôle ${role.name}`);
    res.json({ success: true, role });
};

export const deleteRole = async (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const idx = rolesDatabase.findIndex(r => r.id === id);
    if (idx > -1) rolesDatabase.splice(idx, 1);

    try {
        await roleRepository.delete(id);
    } catch (err) {
        console.warn("Could not delete role from SQLite:", err);
    }

    res.json({ success: true });
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

