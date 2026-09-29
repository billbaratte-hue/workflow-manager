/**
 * @file server/repositories/password-reset.repository.ts
 * Repository for secure password reset tokens storage and validation (NIS 2 compliant).
 * Stores only cryptographically hashed tokens with expiration and single-use enforcement.
 */

import crypto from 'crypto';
import { ISqliteDb, getDatabase } from '../db/database.js';

export interface PasswordResetEntity {
    id: string;
    email: string;
    token_hash: string;
    expires_at: string;
    used: number;
    created_at: string;
    tenant_id?: string;
}

export class PasswordResetRepository {
    private dbPromise?: Promise<ISqliteDb>;

    constructor(private customDb?: ISqliteDb) {}

    private async getDb(): Promise<ISqliteDb> {
        if (this.customDb) return this.customDb;
        if (!this.dbPromise) {
            this.dbPromise = getDatabase();
        }
        return this.dbPromise;
    }

    /**
     * Crée un token de réinitialisation sécurisé pour une adresse email.
     * Invalide les tokens précédents non utilisés pour cette adresse.
     */
    async createToken(
        email: string,
        validityMinutes: number = 60,
        tenantId: string = 'default'
    ): Promise<{ token: string; expiresAt: string; id: string }> {
        const db = await this.getDb();
        const normalizedEmail = email.toLowerCase().trim();

        // Invalidation préventive des tokens antérieurs pour cet email
        await db.run(
            `UPDATE password_resets SET used = 1 WHERE LOWER(email) = ? AND used = 0`,
            normalizedEmail
        );

        const id = `rst_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000).toISOString();
        const createdAt = new Date().toISOString();

        await db.run(
            `INSERT INTO password_resets (id, email, token_hash, expires_at, used, created_at, tenant_id)
             VALUES (?, ?, ?, ?, 0, ?, ?)`,
            id,
            normalizedEmail,
            tokenHash,
            expiresAt,
            createdAt,
            tenantId
        );

        return {
            token: rawToken,
            expiresAt,
            id
        };
    }

    /**
     * Vérifie la validité d'un token de réinitialisation sans le consommer.
     */
    async verifyToken(
        email: string,
        rawToken: string,
        tenantId: string = 'default'
    ): Promise<{ valid: boolean; reason?: string; record?: PasswordResetEntity }> {
        if (!email || !rawToken) {
            return { valid: false, reason: 'Identifiants de vérification manquants' };
        }

        const db = await this.getDb();
        const normalizedEmail = email.toLowerCase().trim();
        const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

        const query = tenantId && tenantId !== 'all'
            ? `SELECT * FROM password_resets WHERE LOWER(email) = ? AND token_hash = ? AND (tenant_id = ? OR tenant_id IS NULL)`
            : `SELECT * FROM password_resets WHERE LOWER(email) = ? AND token_hash = ?`;
        const params = tenantId && tenantId !== 'all' ? [normalizedEmail, tokenHash, tenantId] : [normalizedEmail, tokenHash];

        const row = await db.get<any>(query, ...params);

        if (!row) {
            return { valid: false, reason: 'Lien de réinitialisation introuvable ou invalide' };
        }

        if (Number(row.used) === 1) {
            return { valid: false, reason: 'Ce lien de réinitialisation a déjà été utilisé' };
        }

        const expiresTime = new Date(row.expires_at).getTime();
        if (Date.now() > expiresTime) {
            return { valid: false, reason: 'Ce lien de réinitialisation a expiré' };
        }

        return {
            valid: true,
            record: {
                id: row.id,
                email: row.email,
                token_hash: row.token_hash,
                expires_at: row.expires_at,
                used: Number(row.used),
                created_at: row.created_at,
                tenant_id: row.tenant_id
            }
        };
    }

    /**
     * Consomme le token (le marque comme utilisé).
     */
    async consumeToken(id: string): Promise<boolean> {
        const db = await this.getDb();
        const res = await db.run(`UPDATE password_resets SET used = 1 WHERE id = ?`, id);
        return (res.changes || 0) > 0;
    }

    /**
     * Invalide tous les tokens en attente pour un email donné.
     */
    async invalidateAllForEmail(email: string): Promise<void> {
        const db = await this.getDb();
        await db.run(
            `UPDATE password_resets SET used = 1 WHERE LOWER(email) = ? AND used = 0`,
            email.toLowerCase().trim()
        );
    }
}

export const passwordResetRepository = new PasswordResetRepository();
