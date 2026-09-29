/**
 * @file server/services/email.service.ts
 * Enterprise SMTP Email Dispatcher & Notification Delivery Service.
 * Transmits structured emails and attachments via Nodemailer with simulated fallback.
 */

import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content?: any;
        path?: string;
        contentType?: string;
    }>;
}

export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    recipientCount: number;
    mode: 'SMTP' | 'SIMULATED';
    error?: string;
}

class EmailService {
    private transporter: Transporter | null = null;
    private isConfigured: boolean = false;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASSWORD;
        const secure = process.env.SMTP_SECURE === 'true' || port === 465;

        if (host && user && pass) {
            try {
                this.transporter = nodemailer.createTransport({
                    host,
                    port,
                    secure,
                    auth: { user, pass },
                    tls: {
                        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
                    }
                });
                this.isConfigured = true;
            } catch (err) {
                console.warn('Erreur initialisation SMTP transporter:', err);
                this.transporter = null;
                this.isConfigured = false;
            }
        }
    }

    /**
     * Envoie un email transactionnel ou d'alerte opérationnelle
     */
    async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
        const recipients = Array.isArray(options.to) ? options.to : [options.to];
        const fromAddress = process.env.SMTP_FROM || 'Workflow Manager <notifications@workflow-manager.local>';

        if (this.isConfigured && this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: fromAddress,
                    to: recipients.join(', '),
                    subject: options.subject,
                    text: options.text || '',
                    html: options.html || options.text,
                    attachments: options.attachments
                });

                return {
                    success: true,
                    messageId: info.messageId,
                    recipientCount: recipients.length,
                    mode: 'SMTP'
                };
            } catch (err: any) {
                console.error('Erreur transmission email SMTP:', err);
                return {
                    success: false,
                    recipientCount: recipients.length,
                    mode: 'SMTP',
                    error: err.message
                };
            }
        }

        // Mode simulé pour développement ou absence de serveur SMTP externe
        const simId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        return {
            success: true,
            messageId: simId,
            recipientCount: recipients.length,
            mode: 'SIMULATED'
        };
    }

    /**
     * Vérifie la connectivité au serveur SMTP configuré
     */
    async verifyConnection(): Promise<{ connected: boolean; message: string }> {
        if (!this.isConfigured || !this.transporter) {
            return {
                connected: false,
                message: 'Aucun serveur SMTP configuré (mode simulation actif).'
            };
        }

        try {
            await this.transporter.verify();
            return {
                connected: true,
                message: 'Connexion SMTP établie et vérifiée avec succès.'
            };
        } catch (err: any) {
            return {
                connected: false,
                message: `Échec de connexion SMTP: ${err.message}`
            };
        }
    }
}

export const emailService = new EmailService();
