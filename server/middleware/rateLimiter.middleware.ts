/**
 * @file server/middleware/rateLimiter.middleware.ts
 * NIS 2 Security Compliance - Rate Limiting & Brute-Force Protection.
 */

import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 tentatives par fenêtre de 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        error: "Trop de tentatives de connexion infructueuses. Veuillez patienter 15 minutes avant de réessayer (Protection anti-brute-force NIS 2)."
    }
});

export const apiGeneralRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 requêtes par minute
    standardHeaders: true,
    legacyHeaders: false
});
