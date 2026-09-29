import { describe, it, expect } from 'vitest';
import { emailService } from '../server/services/email.service.js';

describe('Email Service & SMTP Dispatcher', () => {
    it('doit envoyer un email en mode simulé lorsque SMTP non configuré', async () => {
        const result = await emailService.sendEmail({
            to: 'agent@entreprise.fr',
            subject: 'Notification d accès mécatronique',
            text: 'Votre demande a été approuvée avec succès.'
        });

        expect(result.success).toBe(true);
        expect(result.recipientCount).toBe(1);
        expect(result.mode).toBe('SIMULATED');
        expect(result.messageId).toMatch(/^SIM-/);
    });

    it('doit rapporter le statut de connexion sans planter', async () => {
        const status = await emailService.verifyConnection();
        expect(typeof status.connected).toBe('boolean');
        expect(typeof status.message).toBe('string');
    });
});
