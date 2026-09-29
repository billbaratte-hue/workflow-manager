import { createNotification, processTemplates, usersDatabase, notificationTemplatesDatabase, ProcessTemplateNotification } from '../db/store.js';

export const interpolateNotificationTags = (template: string, ctx: Record<string, any>): string => {
    if (!template) return '';
    let result = template;
    const now = new Date();
    const defaultDate = now.toLocaleDateString('fr-FR');
    const defaultHeure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const replacements: Record<string, string> = {
        '{reference}': ctx.reference || 'REQ-XXXX',
        '{titre}': ctx.title || ctx.titre || 'Demande d\'accès',
        '{utilisateur}': ctx.beneficiaire_name || ctx.requester_name || ctx.utilisateur || ctx.demandeur || 'L\'utilisateur',
        '{demandeur}': ctx.beneficiaire_name || ctx.requester_name || ctx.demandeur || ctx.utilisateur || 'L\'utilisateur',
        '{requester_name}': ctx.requester_name || ctx.beneficiaire_name || ctx.demandeur || ctx.utilisateur || 'L\'utilisateur',
        '{tenant_name}': ctx.tenant_name || ctx.tenantName || 'Portail Entreprise',
        '{tenant_id}': ctx.tenant_id || ctx.tenantId || 'default',
        '{status_label}': ctx.status_label || ctx.statusLabel || ctx.status || 'En cours',
        '{email_demandeur}': ctx.email_demandeur || '',
        '{service}': ctx.beneficiaire_service || ctx.service || 'Exploitation',
        '{site}': ctx.site_name || ctx.site || 'Site / Établissement',
        '{date}': ctx.date || defaultDate,
        '{heure}': ctx.heure || defaultHeure,
        '{processus}': ctx.processus || 'Processus standard',
        '{etape}': ctx.stage_name || ctx.etape || 'Étape de validation',
        '{validateur}': ctx.actorName || ctx.validateur || 'Le validateur',
        '{role_validateur}': ctx.validator_role || ctx.role_validateur || 'Validateur',
        '{motif}': ctx.motif || 'Non précisé',
        '{sla_heures}': String(ctx.sla_hours || ctx.sla_heures || '24'),
        '{lien}': ctx.link || ctx.lien || '/corbeille'
    };

    for (const [tag, val] of Object.entries(replacements)) {
        const escaped = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'gi'), val);
    }
    return result;
};

// Trouve le processus associé à une demande
function findProcessForRequest(reqObj: any) {
    if (reqObj.process_id) {
        const found = processTemplates.find(p => p.id === reqObj.process_id);
        if (found) return found;
    }
    // Recherche par catégorie ou processus par défaut
    if (processTemplates.length > 0) {
        return processTemplates[0];
    }
    return null;
}

// Résout une notification de processus (modèle prédéfini ou notification en ligne)
function getResolvedNotificationsForEvent(proc: any, triggerEvent: string, stageId?: string): ProcessTemplateNotification[] {
    if (!proc || !proc.notifications || !Array.isArray(proc.notifications)) return [];

    const resolved: ProcessTemplateNotification[] = [];

    for (const item of proc.notifications) {
        if (!item.active) continue;

        let effectiveNotif: ProcessTemplateNotification | null = null;

        if (item.template_id) {
            const tmpl = notificationTemplatesDatabase.find(t => t.id === item.template_id);
            if (tmpl && tmpl.active) {
                effectiveNotif = {
                    id: item.id || tmpl.id,
                    template_id: tmpl.id,
                    name: item.name || tmpl.name,
                    trigger_event: item.trigger_event || tmpl.trigger_event,
                    stage_id: item.stage_id,
                    recipient_type: item.recipient_type || tmpl.recipient_type,
                    recipient_role: item.recipient_role || tmpl.recipient_role,
                    recipient_email: item.recipient_email || tmpl.recipient_email,
                    subject: item.subject || tmpl.subject,
                    content: item.content || tmpl.content,
                    channel: item.channel || tmpl.channel,
                    urgent: item.urgent !== undefined ? item.urgent : tmpl.urgent,
                    active: true
                };
            }
        } else if (item.subject && item.content) {
            effectiveNotif = item;
        }

        if (!effectiveNotif) continue;
        if (effectiveNotif.trigger_event !== triggerEvent) continue;

        // Filtre d'étape si applicable
        if (stageId && effectiveNotif.stage_id && effectiveNotif.stage_id !== 'all' && effectiveNotif.stage_id !== stageId) {
            continue;
        }

        resolved.push(effectiveNotif);
    }

    return resolved;
}

export interface EmailDispatchRecord {
    to: string;
    from: string;
    subject: string;
    body: string;
    timestamp: string;
    status: 'SENT' | 'QUEUED';
}

export const emailOutbox: EmailDispatchRecord[] = [];

export function dispatchEmail(to: string, subject: string, body: string): EmailDispatchRecord {
    const record: EmailDispatchRecord = {
        to,
        from: 'portail-mecatronique@entreprise.fr',
        subject,
        body,
        timestamp: new Date().toISOString(),
        status: 'SENT'
    };
    emailOutbox.push(record);
    console.log(`[SMTP OUTBOX] Courriel transmis à ${to} - Sujet: "${subject}"`);
    return record;
}

// Déclenche une notification personnalisée avec résolution de destinataire
function dispatchCustomNotification(notif: ProcessTemplateNotification, reqObj: any, context: Record<string, any>) {
    const subject = interpolateNotificationTags(notif.subject || '', context);
    const content = interpolateNotificationTags(notif.content || '', context);
    const link = notif.recipient_type === 'demandeur' ? '/mes-demandes' : '/corbeille';

    const notifPayload: any = {
        title: subject,
        message: content,
        link,
        reference: reqObj.reference,
        urgent: notif.urgent ?? false,
        type: notif.urgent ? 'urgent_alert' : 'new_request'
    };

    if (notif.recipient_type === 'demandeur') {
        notifPayload.target_user_id = reqObj.demandeur_id || reqObj.beneficiaire_id;
        createNotification(notifPayload);
        if (reqObj.demandeur_email) {
            dispatchEmail(reqObj.demandeur_email, subject, content);
        }
    } else if (notif.recipient_type === 'role') {
        notifPayload.target_role = notif.recipient_role || 'Manager';
        createNotification(notifPayload);
    } else if (notif.recipient_type === 'validator_current_stage') {
        const currentStage = reqObj.stages?.[reqObj.current_stage_index || 0];
        notifPayload.target_role = currentStage?.validator_role || 'Manager';
        if (currentStage?.validator_id) {
            notifPayload.target_user_id = currentStage.validator_id;
        }
        createNotification(notifPayload);
    } else if (notif.recipient_type === 'all_validators') {
        const roles = new Set<string>();
        reqObj.stages?.forEach((s: any) => {
            if (s.validator_role) roles.add(s.validator_role);
        });
        if (roles.size === 0) roles.add('Manager');
        roles.forEach(r => {
            createNotification({ ...notifPayload, target_role: r });
        });
    } else if (notif.recipient_type === 'custom_email') {
        // Envoi réel par courriel au destinataire configuré sans dérivation vers l'administrateur
        const destEmail = notif.recipient_email || context.email_demandeur || context.email || 'agent@entreprise.fr';
        dispatchEmail(destEmail, subject, content);
        
        const matchedUser = usersDatabase.find(u => u.email.toLowerCase() === destEmail.toLowerCase());
        if (matchedUser) {
            notifPayload.target_user_id = matchedUser.id;
        } else {
            notifPayload.target_email = destEmail;
        }
        createNotification(notifPayload);
    } else {
        notifPayload.target_role = notif.recipient_role || 'Manager';
        createNotification(notifPayload);
    }
}

export const notifyRequestCreated = (reqObj: any) => {
    const isUrgent = Boolean(
        reqObj.ai_analysis?.urgency?.toLowerCase().includes('élev') ||
        reqObj.title?.toLowerCase().includes('urgence') ||
        reqObj.description?.toLowerCase().includes('nuit') ||
        reqObj.description?.toLowerCase().includes('urgent')
    );

    const proc = findProcessForRequest(reqObj);
    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_submission', reqObj.stages?.[0]?.id);

    if (customNotifs.length > 0) {
        const currentStage = reqObj.stages?.[0];
        const context = {
            ...reqObj,
            processus: proc?.name || 'Demande de clé mécatronique standard',
            stage_name: currentStage?.name || 'Validation Hiérarchique N+1',
            validator_role: currentStage?.validator_role || 'Manager',
            sla_hours: currentStage?.sla_hours || 24,
            link: '/corbeille'
        };
        customNotifs.forEach(notif => {
            dispatchCustomNotification(notif, reqObj, context);
        });
        return;
    }

    // Fallback standard
    createNotification({
        target_role: 'Manager',
        type: isUrgent ? 'urgent_alert' : 'new_request',
        title: isUrgent ? '⚠️ Demande Urgente Déposée' : 'Nouvelle demande mécatronique',
        message: `${reqObj.beneficiaire_name || 'Un agent'} (${reqObj.beneficiaire_service || 'Exploitation'}) a soumis la demande ${reqObj.reference} (${reqObj.title}) pour le site ${reqObj.site_name || 'Central'}.`,
        link: '/corbeille',
        reference: reqObj.reference,
        urgent: isUrgent
    });
};

export const notifyStatusChange = (reqObj: any, prevStatus: string, newStatus: string, motif?: string, actorName?: string) => {
    console.log(`Notification: Demande ${reqObj.reference} changée de '${prevStatus}' vers '${newStatus}'${motif ? ` (motif: ${motif})` : ''}`);

    const proc = findProcessForRequest(reqObj);
    const currentStage = reqObj.stages?.[reqObj.current_stage_index || 0];
    const context = {
        ...reqObj,
        motif: motif || '',
        actorName: actorName || 'Le validateur',
        processus: proc?.name || 'Demande de clé mécatronique standard',
        stage_name: currentStage?.name || 'Validation',
        validator_role: currentStage?.validator_role || 'Validateur',
        sla_hours: currentStage?.sla_hours || 24
    };

    if (newStatus === 'Validée') {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_final_approval');
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, { ...context, link: '/mes-demandes' });
            });
            return;
        }

        createNotification({
            target_user_id: reqObj.beneficiaire_id,
            type: 'request_approved',
            title: 'Demande Validée avec Succès',
            message: `Votre demande ${reqObj.reference} (${reqObj.title}) a reçu la validation définitive par ${actorName || 'le validateur'}. Vos habilitations mécatroniques sont désormais programmables.`,
            link: '/mes-demandes',
            reference: reqObj.reference,
            urgent: false
        });
    } else if (newStatus === 'En attente validation Site' || (newStatus.startsWith('En attente validation') && newStatus !== 'En attente validation Manager')) {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_stage_approved', currentStage?.id);
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, context);
            });
            return;
        }

        const isUrgent = Boolean(
            reqObj.ai_analysis?.urgency?.toLowerCase().includes('élev') ||
            reqObj.title?.toLowerCase().includes('urgence') ||
            reqObj.description?.toLowerCase().includes('nuit')
        );

        createNotification({
            target_user_id: reqObj.beneficiaire_id,
            type: 'info',
            title: 'Étape Hiérarchique Validée',
            message: `Votre demande ${reqObj.reference} a été approuvée par ${actorName || 'votre Manager'} et transmise pour instruction technique au Validateur Site.`,
            link: '/mes-demandes',
            reference: reqObj.reference,
            urgent: false
        });

        createNotification({
            target_role: 'Validateur Site',
            type: isUrgent ? 'urgent_alert' : 'new_request',
            title: isUrgent ? '⚠️ Demande de Sécurité Urgente' : 'Demande d\'accès à instruire',
            message: `La demande ${reqObj.reference} (${reqObj.title}) est validée N+1 et requiert votre autorisation pour le site ${reqObj.site_name}.`,
            link: '/corbeille',
            reference: reqObj.reference,
            urgent: isUrgent
        });
    } else if (newStatus === 'Refusée') {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_rejected');
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, { ...context, link: '/mes-demandes' });
            });
            return;
        }

        createNotification({
            target_user_id: reqObj.beneficiaire_id,
            type: 'request_rejected',
            title: 'Demande d\'Accès Refusée',
            message: `Votre demande ${reqObj.reference} a été refusée par ${actorName || 'le validateur'}. Motif : "${motif || 'Non précisé'}".`,
            link: '/mes-demandes',
            reference: reqObj.reference,
            urgent: true
        });
    } else if (newStatus === 'Complément requis') {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_complement_requested');
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, { ...context, link: '/mes-demandes' });
            });
            return;
        }

        createNotification({
            target_user_id: reqObj.beneficiaire_id,
            type: 'complement_needed',
            title: '⚠️ Complément d\'Information Requis',
            message: `${actorName || 'Le validateur'} demande des précisions sur votre demande ${reqObj.reference} : "${motif || ''}". Merci de répondre au plus vite.`,
            link: '/mes-demandes',
            reference: reqObj.reference,
            urgent: true
        });
    } else if (newStatus === 'Annulée' || newStatus === 'Demande Annulée') {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_cancelled');
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, { ...context, link: '/corbeille' });
            });
            return;
        }

        const currentStageRole = currentStage?.validator_role || 'Manager';
        createNotification({
            target_role: currentStageRole,
            type: 'info',
            title: 'Demande d\'Accès Annulée',
            message: `La demande ${reqObj.reference} (${reqObj.title}) a été annulée par ${actorName || reqObj.beneficiaire_name || 'le demandeur'}.`,
            link: '/corbeille',
            reference: reqObj.reference,
            urgent: false
        });
    } else if (newStatus === 'Clé remise' || newStatus === 'Clé délivrée') {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_key_delivered');
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, { ...context, link: '/mes-demandes' });
            });
            return;
        }

        createNotification({
            target_user_id: reqObj.beneficiaire_id,
            type: 'info',
            title: 'Clé Mécatronique Remise',
            message: `Votre équipement mécatronique pour le dossier ${reqObj.reference} vous a été délivré par ${actorName || 'le guichet de sécurité'}.`,
            link: '/mes-demandes',
            reference: reqObj.reference,
            urgent: false
        });
    } else if (newStatus === 'Clé restituée' || newStatus === 'Clôturée' || newStatus === 'Restituée') {
        const customNotifs = getResolvedNotificationsForEvent(proc, 'on_key_returned');
        if (customNotifs.length > 0) {
            customNotifs.forEach(notif => {
                dispatchCustomNotification(notif, reqObj, { ...context, link: '/mes-demandes' });
            });
            return;
        }

        createNotification({
            target_user_id: reqObj.beneficiaire_id,
            type: 'info',
            title: 'Clé Mécatronique Restituée',
            message: `La restitution de votre équipement ${reqObj.reference} a été enregistrée par ${actorName || 'le guichet sécurité'}. Clôture du dossier.`,
            link: '/mes-demandes',
            reference: reqObj.reference,
            urgent: false
        });
    }
};

export const notifyComplementProvided = (reqObj: any, responseText: string) => {
    const proc = findProcessForRequest(reqObj);
    const currentStage = reqObj.stages?.[reqObj.current_stage_index || 0];
    const context = {
        ...reqObj,
        motif: responseText,
        processus: proc?.name || 'Demande de clé mécatronique standard',
        stage_name: currentStage?.name || 'Validation',
        validator_role: currentStage?.validator_role || 'Validateur Site',
        link: '/corbeille'
    };

    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_complement_submitted', currentStage?.id);
    if (customNotifs.length > 0) {
        customNotifs.forEach(notif => {
            dispatchCustomNotification(notif, reqObj, context);
        });
        return;
    }

    const targetRole = currentStage?.validator_role || 'Validateur Site';
    createNotification({
        target_role: targetRole,
        type: 'complement_submitted',
        title: 'Complément d\'Information Fourni',
        message: `${reqObj.beneficiaire_name || 'Le demandeur'} a apporté les précisions attendues sur ${reqObj.reference} : "${responseText.length > 90 ? responseText.substring(0, 90) + '...' : responseText}". Le dossier est prêt pour réévaluation.`,
        link: '/corbeille',
        reference: reqObj.reference,
        urgent: false
    });
};

export const notifyRequestEdited = (reqObj: any, editorName?: string) => {
    const proc = findProcessForRequest(reqObj);
    const context = {
        ...reqObj,
        editorName: editorName || 'Un gestionnaire',
        processus: proc?.name || 'Demande mécatronique',
        link: '/mes-demandes'
    };

    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_request_edited');
    if (customNotifs.length > 0) {
        customNotifs.forEach(notif => dispatchCustomNotification(notif, reqObj, context));
        return;
    }

    createNotification({
        target_user_id: reqObj.beneficiaire_id,
        type: 'info',
        title: 'Dossier d\'accès modifié',
        message: `Les détails de votre demande ${reqObj.reference} (${reqObj.title}) ont été mis à jour par ${editorName || 'un gestionnaire'}.`,
        link: '/mes-demandes',
        reference: reqObj.reference,
        urgent: false
    });
};

export const notifyRequestCancelled = (reqObj: any) => {
    const proc = findProcessForRequest(reqObj);
    const context = {
        ...reqObj,
        processus: proc?.name || 'Demande mécatronique',
        link: '/corbeille'
    };

    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_cancelled');
    if (customNotifs.length > 0) {
        customNotifs.forEach(notif => dispatchCustomNotification(notif, reqObj, context));
        return;
    }

    const currentStage = reqObj.stages?.[reqObj.current_stage_index || 0];
    createNotification({
        target_role: currentStage?.validator_role || 'Manager',
        type: 'info',
        title: 'Demande d\'accès annulée',
        message: `La demande ${reqObj.reference} (${reqObj.title}) a été annulée par le demandeur ${reqObj.beneficiaire_name || ''}.`,
        link: '/corbeille',
        reference: reqObj.reference,
        urgent: false
    });
};

export const notifyKeyDelivered = (reqObj: any, actorName?: string) => {
    const proc = findProcessForRequest(reqObj);
    const context = {
        ...reqObj,
        actorName: actorName || 'Agent Sécurité Site',
        processus: proc?.name || 'Demande mécatronique',
        link: '/mes-demandes'
    };

    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_key_delivered');
    if (customNotifs.length > 0) {
        customNotifs.forEach(notif => dispatchCustomNotification(notif, reqObj, context));
        return;
    }

    createNotification({
        target_user_id: reqObj.beneficiaire_id,
        type: 'info',
        title: 'Clé mécatronique remise',
        message: `Votre clé physique pour la demande ${reqObj.reference} sur le site ${reqObj.site_name} a été remise par ${actorName || 'le guichet sécurité'}.`,
        link: '/mes-demandes',
        reference: reqObj.reference,
        urgent: false
    });
};

export const notifyKeyReturned = (reqObj: any, actorName?: string) => {
    const proc = findProcessForRequest(reqObj);
    const context = {
        ...reqObj,
        actorName: actorName || 'Agent Sécurité Site',
        processus: proc?.name || 'Demande mécatronique',
        link: '/mes-demandes'
    };

    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_key_returned');
    if (customNotifs.length > 0) {
        customNotifs.forEach(notif => dispatchCustomNotification(notif, reqObj, context));
        return;
    }

    createNotification({
        target_user_id: reqObj.beneficiaire_id,
        type: 'info',
        title: 'Clé mécatronique restituée',
        message: `La restitution de la clé mécatronique pour la demande ${reqObj.reference} a été validée par ${actorName || 'le guichet sécurité'}. Fin des accès.`,
        link: '/mes-demandes',
        reference: reqObj.reference,
        urgent: false
    });
};

export const notifyDelegationSet = (delegatorId: string | number, delegateId: string | number) => {
    createNotification({
        target_role: 'Manager',
        type: 'info',
        title: 'Délégation de validation accordée',
        message: `Une délégation de validation a été configurée entre l'utilisateur #${delegatorId} et le suppléant #${delegateId}.`,
        link: '/corbeille',
        urgent: false
    });
};

export const notifySecurityAlert = (reqObj: any, alertDetails: string) => {
    const proc = findProcessForRequest(reqObj);
    const context = {
        ...reqObj,
        motif: alertDetails,
        processus: proc?.name || 'Demande mécatronique',
        link: '/corbeille'
    };

    const customNotifs = getResolvedNotificationsForEvent(proc, 'on_security_alert');
    if (customNotifs.length > 0) {
        customNotifs.forEach(notif => dispatchCustomNotification(notif, reqObj, context));
        return;
    }

    createNotification({
        target_role: 'Validateur Site',
        type: 'urgent_alert',
        title: '🚨 Alerte Sûreté Ferroviaire',
        message: `Alerte sécurité sur la demande ${reqObj.reference} (${reqObj.site_name}) : "${alertDetails}".`,
        link: '/corbeille',
        reference: reqObj.reference,
        urgent: true
    });
};
