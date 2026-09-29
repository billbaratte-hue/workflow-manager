import { notificationsDB, requestsDB, notificationEmitter } from '../db/store.js';

/**
 * Récupère les notifications ciblées pour l'utilisateur connecté ou son rôle
 */
export const getNotifications = (req: any, res: any) => {
    try {
        const userId = Number(req.user?.id || req.query.user_id || 1042);
        const userRole = String(req.user?.role || req.query.role || 'Demandeur');

        const list = Array.isArray(notificationsDB) ? notificationsDB : [];
        const filtered = list.filter(n => {
            if (!n) return false;
            if (userRole === 'Administrateur') return true;
            if (n.target_user_id && n.target_user_id === userId) return true;
            if (n.target_role && (n.target_role === userRole || n.target_role === 'all')) return true;
            return false;
        });

        const unreadCount = filtered.filter(n => !n.read).length;
        const urgentCount = filtered.filter(n => !n.read && n.urgent).length;

        res.status(200).json({
            notifications: filtered,
            unread_count: unreadCount,
            urgent_count: urgentCount
        });
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(200).json({
            notifications: [],
            unread_count: 0,
            urgent_count: 0
        });
    }
};

/**
 * Marque une notification spécifique comme lue
 */
export const markAsRead = (req: any, res: any) => {
    try {
        const { id } = req.params;
        const notif = notificationsDB.find(n => n.id === id);
        if (!notif) {
            return res.status(404).json({ error: 'Notification introuvable.' });
        }
        notif.read = true;
        res.status(200).json({ message: 'Notification marquée comme lue', notification: notif });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
};

/**
 * Marque toutes les notifications applicables à l'utilisateur comme lues
 */
export const markAllAsRead = (req: any, res: any) => {
    try {
        const userId = Number(req.user?.id || req.body?.user_id || 1042);
        const userRole = String(req.user?.role || req.body?.role || 'Demandeur');

        notificationsDB.forEach(n => {
            if (
                userRole === 'Administrateur' ||
                (n.target_user_id && n.target_user_id === userId) ||
                (n.target_role && (n.target_role === userRole || n.target_role === 'all'))
            ) {
                n.read = true;
            }
        });

        res.status(200).json({ message: 'Toutes les notifications ont été marquées comme lues' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications.' });
    }
};

/**
 * Supprime une notification
 */
export const deleteNotification = (req: any, res: any) => {
    try {
        const { id } = req.params;
        const index = notificationsDB.findIndex(n => n.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Notification introuvable.' });
        }
        notificationsDB.splice(index, 1);
        res.status(200).json({ message: 'Notification supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
};

/**
 * Analyse en temps réel les alertes opérationnelles (urgences, échéances ferroviaires, compléments bloquants)
 */
export const getOperationalAlerts = (req: any, res: any) => {
    try {
        const userId = Number(req.user?.id || req.query.user_id || 1042);
        const userRole = String(req.user?.role || req.query.role || 'Demandeur');

        const alerts: Array<{
            id: string;
            type: 'urgent' | 'deadline' | 'action_required';
            title: string;
            message: string;
            reference: string;
            link: string;
            urgencyLevel: 'critique' | 'haute' | 'modérée';
            site_name?: string;
        }> = [];

        // 1. Détection des demandes urgentes / interventions de nuit pour les validateurs
        const requestsList = Array.isArray(requestsDB) ? requestsDB : [];
        if (userRole === 'Validateur Site' || userRole === 'Manager' || userRole === 'Administrateur') {
            requestsList.forEach(r => {
                if (!r) return;
                const status = String(r.status || '');
                const isPending = status.startsWith('En attente validation');
                const titleLower = String(r.title || '').toLowerCase();
                const descLower = String(r.description || '').toLowerCase();
                const urgencyLower = String(r.ai_analysis?.urgency || '').toLowerCase();
                const isNightOrUrgent = 
                    titleLower.includes('nuit') ||
                    titleLower.includes('urgence') ||
                    descLower.includes('nuit') ||
                    descLower.includes('urgent') ||
                    urgencyLower.includes('élev');

                if (isPending && isNightOrUrgent) {
                    alerts.push({
                        id: `ALERT-URG-${r.reference || r.id}`,
                        type: 'urgent',
                        title: `Intervention Prioritaire programmée - ${r.reference || 'Dossier'}`,
                        message: `La demande "${r.title || 'Demande sans titre'}" sur le site "${r.site_name || 'Réseau'}" nécessite une décision immédiate avant engagement des travaux sur voies.`,
                        reference: r.reference || '',
                        link: '/corbeille',
                        urgencyLevel: 'critique',
                        site_name: r.site_name
                    });
                }
            });
        }

        // 2. Détection des demandes en attente de complément pour le bénéficiaire ou l'administrateur
        requestsList.forEach(r => {
            if (!r) return;
            if (r.status === 'Complément requis' && (r.beneficiaire_id === userId || userRole === 'Administrateur' || req.user?.privileges?.includes('manage_users'))) {
                alerts.push({
                    id: `ALERT-COMPL-${r.reference || r.id}`,
                    type: 'action_required',
                    title: `Action requise sur votre demande ${r.reference || 'Dossier'}`,
                    message: `Le validateur attend des informations complémentaires : "${r.complement_request?.message || 'Précisions nécessaires'}". Le traitement est suspendu.`,
                    reference: r.reference || '',
                    link: '/mes-demandes',
                    urgencyLevel: 'haute',
                    site_name: r.site_name
                });
            }
        });

        res.status(200).json(alerts);
    } catch (error) {
        console.error('getOperationalAlerts error:', error);
        res.status(200).json([]);
    }
};

/**
 * Flux temps réel Server-Sent Events (SSE) pour les notifications push instantanées
 */
export const streamNotifications = (req: any, res: any) => {
    try {
        const userId = Number(req.user?.id || req.query.user_id);
        const userRole = String(req.user?.role || req.query.role || '');

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });

        res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

        const onNotification = (notif: any) => {
            const matches = (
                userRole === 'Administrateur' ||
                (notif.target_user_id && notif.target_user_id === userId) ||
                (notif.target_role && (notif.target_role === userRole || notif.target_role === 'all'))
            );
            if (matches) {
                res.write(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`);
            }
        };

        notificationEmitter.on('new_notification', onNotification);

        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 25000);

        req.on('close', () => {
            clearInterval(heartbeat);
            notificationEmitter.off('new_notification', onNotification);
        });
    } catch (err) {
        console.error('streamNotifications error:', err);
        res.status(500).end();
    }
};
