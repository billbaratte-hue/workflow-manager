import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { usersDatabase, rolesDatabase } from '../db/store.js';

// Cryptographically secure runtime secret if JWT_SECRET not provided via environment
const defaultSecret = crypto.randomBytes(64).toString('hex');
export const JWT_SECRET = process.env.JWT_SECRET || defaultSecret;

export function resolveUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const found = usersDatabase.find(u => u.email.toLowerCase() === normalized);
    if (!found) return null;

    const userRoles = found.roles || [found.role];
    const privilegesSet = new Set<string>();
    for (const rName of userRoles) {
        const roleDef = rolesDatabase.find(r => r.name.toLowerCase() === rName.toLowerCase());
        if (roleDef && roleDef.privileges) {
            roleDef.privileges.forEach(p => privilegesSet.add(p));
        }
    }

    return {
        id: found.id,
        email: found.email,
        name: found.name,
        role: found.role,
        roles: userRoles,
        privileges: Array.from(privilegesSet),
        status: found.status,
        attributes: found.attributes || {}
    };
}

export const verifyToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    
    // Strict requirement: valid Authorization Bearer header
    if (!authHeader) {
        return res.status(401).json({ error: "Accès refusé. Token d'authentification manquant." });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: "Format de token invalide. Format attendu: Bearer <token>" });
    }

    const token = parts[1];
    if (!token) {
        return res.status(401).json({ error: "Format de token invalide." });
    }

    // Strict signature verification - forged tokens or expired tokens are rejected immediately
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err || !decoded) {
            return res.status(401).json({ error: "Token invalide ou expiré." });
        }

        // Hydrate latest user identity & privileges if user exists in database
        if (decoded.email) {
            const resolved = resolveUserByEmail(decoded.email);
            if (resolved) {
                if (resolved.status && resolved.status.toLowerCase() !== 'actif') {
                    return res.status(401).json({ error: "Compte utilisateur inactif ou révoqué." });
                }
                req.user = resolved;
                return next();
            }
        }

        req.user = decoded;
        next();
    });
};

export const requirePrivilege = (requiredPrivilege: string) => {
    return (req: any, res: any, next: any) => {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });
        const isSuperAdmin = user.role === 'Administrateur';
        const hasPrivilege = user.privileges && user.privileges.includes(requiredPrivilege);
        if (!isSuperAdmin && !hasPrivilege) return res.status(403).json({ error: "Privilèges insuffisants pour accéder à cette ressource." });
        next();
    };
};
