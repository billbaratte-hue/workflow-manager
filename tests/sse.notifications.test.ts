import { describe, it, expect, vi } from 'vitest';
import { notificationEmitter, createNotification } from '../server/db/store.js';

describe('Server-Sent Events (SSE) Real-Time Notification Stream', () => {
    it('doit propager un événement new_notification lors de createNotification()', () => {
        return new Promise<void>((resolve) => {
            const listener = (notif: any) => {
                expect(notif).toBeDefined();
                expect(notif.title).toBe('Test SSE Alerte');
                expect(notif.urgent).toBe(true);
                notificationEmitter.off('new_notification', listener);
                resolve();
            };

            notificationEmitter.on('new_notification', listener);

            createNotification({
                target_user_id: 1042,
                type: 'urgent_alert',
                title: 'Test SSE Alerte',
                message: 'Notification envoyée en temps réel',
                urgent: true
            });
        });
    });
});
