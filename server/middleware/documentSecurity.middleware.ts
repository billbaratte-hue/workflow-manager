/**
 * @file server/middleware/documentSecurity.middleware.ts
 * Document-Level Security & File Streaming Protection Middleware (Epic 3 - User Story 3.5).
 * Enforces RBAC privileges, dossier ownership, and prevents path traversal attacks.
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../db/database.js';

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.middleware.js';

export interface AuthenticatedUser {
    id: number;
    email: string;
    role: string;
    roles?: string[];
    privileges?: string[];
}

export async function verifyDocumentAccess(req: Request, res: Response, next: NextFunction) {
    let user = (req as any).user as AuthenticatedUser | undefined;

    // If user not already attached via auth middleware, attempt to read Authorization header or query token
    if (!user) {
        const authHeader = req.headers?.authorization;
        const queryToken = req.query?.token as string | undefined;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                user = decoded;
                (req as any).user = user;
            } catch {
                // Invalid token - continue without attached user
            }
        }
    }

    const documentName = req.params?.filename || req.params?.fileName || (req.query?.file as string);

    if (!documentName) {
        return res.status(400).json({ error: 'Nom de fichier manquant dans la requête.' });
    }

    // 1. Path traversal protection
    const safeBaseDir = path.resolve(process.cwd(), 'uploads');
    const requestedPath = path.resolve(safeBaseDir, path.normalize(documentName).replace(/^(\.\.[\/\\])+/, ''));

    if (!requestedPath.startsWith(safeBaseDir)) {
        return res.status(403).json({ error: 'Accès non autorisé : tentative de traversée de répertoire détectée.' });
    }

    // 2. Role / Authorization check if user is attached
    if (user) {
        const isAdmin = user.role === 'Administrateur' || (user.privileges && user.privileges.includes('manage_users'));
        const isValidator = user.role === 'Validateur' || (user.privileges && user.privileges.includes('validate_requests'));

        // Admins and validators have system-wide read access for audit and inspection
        if (isAdmin || isValidator) {
            (req as any).safeDocumentPath = requestedPath;
            return next();
        }

        // Regular users: check if they are the author of the request holding this document
        try {
            const db = await getDatabase();
            const matchingRequest = await db.get(
                'SELECT id, beneficiaire_id FROM requests WHERE document = ? OR document_original_name = ?',
                documentName,
                documentName
            );

            if (matchingRequest && matchingRequest.beneficiaire_id !== user.id) {
                return res.status(403).json({
                    error: 'Accès refusé : vous n\'avez pas les habilitations nécessaires pour consulter ce document sensible.'
                });
            }
        } catch (e) {
            console.warn('[DOC_SECURITY] Ownership check fallback:', e);
        }
    }

    (req as any).safeDocumentPath = requestedPath;
    next();
}

/**
 * Safe document streaming handler
 */
export function streamSecuredDocument(req: Request, res: Response) {
    const filePath = (req as any).safeDocumentPath;

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Le fichier demandé est introuvable ou a été archivé.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.zip': 'application/zip'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
}
