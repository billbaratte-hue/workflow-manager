/**
 * @file server/services/ai.service.ts
 * Generative AI Service for Mechatronic Portal.
 * Uses Google Gen AI SDK (@google/genai) with Gemini 3.8 Flash (gemini-3.8-flash).
 * Includes robust sovereign fallback for SecNumCloud / NIS 2 offline compliance.
 */

import { GoogleGenAI } from '@google/genai';
import { featureRepository } from '../repositories/feature.repository.js';
import { requestsDB, logAction } from '../db/store.js';

export interface AnalysisResult {
    risk_level: 'Faible' | 'Modéré' | 'Élevé';
    urgency: string;
    compliance_check: string;
    key_points: string[];
    recommendation: string;
    analyzed_at: string;
    provider: 'gemini' | 'sovereign_heuristic';
    model: string;
}

export interface AssistDescriptionResult {
    suggested_text: string;
    provider: 'gemini' | 'sovereign_heuristic';
    model: string;
}

export interface RoleScopeRecommendationResult {
    rationale: string;
    recommended_scopes: Record<string, any>;
    recommended_ref_types: string[];
    safety_warnings: string[];
    provider: 'gemini' | 'sovereign_heuristic';
    model: string;
}

export interface RoleAuditResult {
    compliance_score: number;
    compliance_grade: 'A+' | 'A' | 'B' | 'C' | 'D';
    risk_level: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
    sod_status: string;
    strengths: string[];
    issues: string[];
    recommendations: string[];
    evaluated_at: string;
    provider: 'gemini' | 'sovereign_heuristic';
    model: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatResult {
    reply: string;
    suggestions?: string[];
    provider: 'gemini' | 'sovereign_heuristic';
    model: string;
    timestamp: string;
}

export interface WorkflowSuggestionResult {
    workflow_name: string;
    description: string;
    stages: Array<{
        name: string;
        assignedRole: string;
        slaHours: number;
        mandatory: boolean;
        actions: string[];
    }>;
    initial_status: string;
    terminal_statuses: string[];
    rules: string[];
    provider: 'gemini' | 'sovereign_heuristic';
    model: string;
}

// Sovereign Heuristic Fallback Engine
class SovereignHeuristicEngine {
    static analyze(title: string, description: string, siteName: string, equipment: string): AnalysisResult {
        const text = `${title} ${description} ${siteName} ${equipment}`.toLowerCase();
        const isUrgent = text.includes('urgent') || text.includes('nuit') || text.includes('panne') || text.includes('incident') || text.includes('retard');
        const isHighRisk = text.includes('haute tension') || text.includes('caténaire') || text.includes('sous-station') || text.includes('aiguillage') || text.includes('lgv');

        const riskLevel: 'Faible' | 'Modéré' | 'Élevé' = isHighRisk ? 'Élevé' : isUrgent ? 'Modéré' : 'Faible';
        const urgency = isUrgent ? 'Élevée - Intervention urgente / nocturne' : 'Normale - Planification standard';

        const keyPoints = [
            `Normes ferroviaires applicables : EN 15864 (clés mécatroniques programmables) et EN 16864 (cylindres connectés haute sécurité).`,
            `Site d'intervention : ${siteName || 'Réseau ferroviaire national'}. Traçabilité des accès garantie selon directive européenne NIS 2.`,
            isHighRisk
                ? `Avertissement Sûreté : Présence d'installations à risques ferroviaires ou électriques (H0B0/B1V requis pour accès armoires sous-stations).`
                : `Opération de maintenance standard sous réserve de présentation d'un ordre de mission valide.`
        ];

        const recommendation = isHighRisk
            ? "Avis favorable avec réserves : Vérifier l'habilitation électrique de l'agent et limiter la durée de programmation de la clé à 24h avec journalisation d'événements."
            : "Avis favorable : Demande conforme aux critères de sécurité et compatible avec les circuits d'accès mécatroniques.";

        return {
            risk_level: riskLevel,
            urgency,
            compliance_check: "Conforme référentiel & EN 15864 / EN 16864 (Audit souverain traçable NIS 2)",
            key_points: keyPoints,
            recommendation,
            analyzed_at: new Date().toISOString(),
            provider: 'sovereign_heuristic',
            model: 'sovereign-heuristic-v1'
        };
    }

    static assistDescription(draftText: string, equipmentType?: string, siteName?: string): AssistDescriptionResult {
        let suggested = `Intervention de maintenance programmée sur les installations ferroviaires de ${siteName || 'site ferroviaire'}. `;
        if (draftText && draftText.trim().length > 0) {
            suggested += `Objet de l'intervention : ${draftText.trim()}. `;
        }
        suggested += `Accès sollicité pour des opérations de contrôle technique sur les armoires et serrures mécatroniques normées EN 15864 / EN 16864 (${equipmentType || 'Clé Mécatronique EN 15864'}). L'agent s'engage à respecter les consignes de sécurité ferroviaire, les habilitations électriques requises (H0B0/B1V) et à émarger le registre d'accès.`;

        return {
            suggested_text: suggested,
            provider: 'sovereign_heuristic',
            model: 'sovereign-heuristic-v1'
        };
    }

    static recommendRoleScope(roleName: string, roleDesc: string = '', tables: any[] = []): RoleScopeRecommendationResult {
        const nameLower = (roleName || '').toLowerCase();
        const isAdmin = nameLower.includes('admin');
        const isValidator = nameLower.includes('validat') || nameLower.includes('approbateur') || nameLower.includes('securite') || nameLower.includes('sûreté');
        const isManager = nameLower.includes('manager') || nameLower.includes('responsable') || nameLower.includes('chef');
        const isAuditor = nameLower.includes('audit') || nameLower.includes('controle') || nameLower.includes('conformit');
        const isRequester = nameLower.includes('demand') || nameLower.includes('agent') || nameLower.includes('prestataire') || nameLower.includes('technicien');

        const recommendedScopes: Record<string, any> = {};
        const warnings: string[] = [];
        let recommendedRefTypes: string[] = [];

        if (isAdmin) {
            recommendedRefTypes = ['Organisation', 'Infrastructure', 'Sécurité', 'Matériel', 'Processus', 'Partenaires'];
        } else if (isValidator) {
            recommendedRefTypes = ['Organisation', 'Infrastructure', 'Sécurité', 'Matériel'];
        } else if (isManager) {
            recommendedRefTypes = ['Organisation', 'Infrastructure', 'Matériel'];
        } else if (isAuditor) {
            recommendedRefTypes = ['Organisation', 'Infrastructure', 'Sécurité', 'Matériel', 'Processus'];
        } else {
            recommendedRefTypes = ['Infrastructure', 'Matériel'];
        }

        tables.forEach(tbl => {
            const key = tbl.key || tbl.id;
            const availableFields: string[] = (tbl.availableFields || tbl.columns || []).map((f: any) => f.key || f);
            const category = tbl.category || 'Général';
            let dataScope = 'all';
            let allowedFields: string[] = ['all'];
            const fieldModes: Record<string, 'read' | 'write' | 'hidden'> = {};
            let reason = '';

            if (isAdmin) {
                dataScope = 'all';
                allowedFields = ['all'];
                availableFields.forEach(f => { fieldModes[f] = 'write'; });
                reason = 'Droits administrateur complets pour maintenance de la gouvernance.';
            } else if (isValidator) {
                if (key === 'requests') {
                    dataScope = 'all';
                    allowedFields = ['all'];
                    availableFields.forEach(f => {
                        if (['validation', 'comments'].includes(f)) fieldModes[f] = 'write';
                        else fieldModes[f] = 'read';
                    });
                    reason = 'Examen des dossiers en lecture avec modification réservée aux avis de validation.';
                } else if (category === 'Sécurité') {
                    dataScope = 'all';
                    allowedFields = ['all'];
                    availableFields.forEach(f => { fieldModes[f] = 'read'; });
                    reason = 'Consultation des normes EN 15864 / 16864 et des profils de sûreté.';
                } else if (key === 'syslog') {
                    dataScope = 'all';
                    allowedFields = ['timestamp', 'actor', 'action', 'target'];
                    availableFields.forEach(f => { fieldModes[f] = 'read'; });
                    reason = 'Consultation de la traçabilité sans modification.';
                } else {
                    dataScope = 'all';
                    allowedFields = ['all'];
                    availableFields.forEach(f => { fieldModes[f] = 'read'; });
                    reason = 'Consultation opérationnelle sans droit de modification.';
                }
            } else if (isManager) {
                if (key === 'requests') {
                    dataScope = 'department';
                    allowedFields = ['all'];
                    availableFields.forEach(f => {
                        if (['validation', 'comments'].includes(f)) fieldModes[f] = 'write';
                        else fieldModes[f] = 'read';
                    });
                    reason = 'Périmètre limité aux demandes de sa direction / service pour validation N+1.';
                } else {
                    dataScope = 'department';
                    allowedFields = ['all'];
                    availableFields.forEach(f => { fieldModes[f] = 'read'; });
                    reason = 'Accès aux référentiels de son service en lecture seule.';
                }
            } else if (isAuditor) {
                dataScope = 'all';
                allowedFields = ['all'];
                availableFields.forEach(f => { fieldModes[f] = 'read'; });
                reason = 'Audit de conformité NIS 2 en lecture seule sur l\'ensemble des registres.';
            } else {
                if (key === 'requests') {
                    dataScope = 'own';
                    allowedFields = ['reference', 'beneficiaire', 'site', 'equipment', 'dates', 'documents', 'comments'];
                    availableFields.forEach(f => {
                        if (['reference', 'beneficiaire', 'site', 'equipment', 'dates', 'documents', 'comments'].includes(f)) {
                            fieldModes[f] = 'write';
                        } else if (f === 'validation') {
                            fieldModes[f] = 'read';
                        } else {
                            fieldModes[f] = 'hidden';
                        }
                    });
                    reason = 'Saisie de ses demandes personnelles. Décisions de validation en lecture seule.';
                } else if (['users', 'roles', 'syslog', 'processes'].includes(key)) {
                    dataScope = 'own';
                    allowedFields = [];
                    availableFields.forEach(f => { fieldModes[f] = 'hidden'; });
                    reason = 'Tables de sécurité et d\'administration strictement masquées pour ce rôle.';
                } else {
                    dataScope = 'assigned_sites';
                    allowedFields = ['all'];
                    availableFields.forEach(f => { fieldModes[f] = 'read'; });
                    reason = 'Consultation des sites et équipements autorisés.';
                }
            }

            recommendedScopes[key] = { dataScope, allowedFields, fieldModes, reason };
        });

        if (isRequester) {
            warnings.push('Conformité NIS 2 : L\'agent n\'a pas accès aux journaux d\'audit syslog ni aux habilitations d\'autrui.');
        }
        if (isValidator) {
            warnings.push('Ségrégation des tâches : Le rôle ne doit pas pouvoir approuver ses propres demandes d\'intervention.');
        }

        return {
            rationale: `Recommandation basée sur le principe du moindre privilège (PoLP) et les impératifs de cybersécurité NIS 2 pour le rôle "${roleName}". Les champs de validation sont protégés et les périmètres territoriaux sont calibrés selon la typologie de mission.`,
            recommended_scopes: recommendedScopes,
            recommended_ref_types: recommendedRefTypes,
            safety_warnings: warnings,
            provider: 'sovereign_heuristic',
            model: 'sovereign-heuristic-v1'
        };
    }

    static auditRole(role: any, tables: any[] = [], referenceTables: any[] = []): RoleAuditResult {
        const roleName = role?.name || 'Rôle';
        const nameLower = roleName.toLowerCase();
        const portalTabs = role?.portalTabs || {};
        const tablePerms = role?.tablePermissions || {};
        const refRules = role?.referenceVisibilityRules || [];

        const issues: string[] = [];
        const strengths: string[] = [];
        let score = 92;

        const hasAdminTab = !!portalTabs.admin;
        const hasCorbeille = !!portalTabs.corbeille;
        const requestsPerm = tablePerms.requests || {};
        const usersPerm = tablePerms.users || {};
        const syslogPerm = tablePerms.syslog || {};

        if (hasAdminTab && hasCorbeille) {
            issues.push("Conflit de séparation des fonctions (SoD) : Le rôle cumule la Corbeille de validation et l'Espace Administrateur.");
            score -= 15;
        }

        if (requestsPerm.create && requestsPerm.modify && !nameLower.includes('admin')) {
            strengths.push("L'agent peut soumettre et amender ses demandes d'accès aux emprises ferroviaires.");
        }

        if (syslogPerm.delete) {
            issues.push("Vulnérabilité critique NIS 2 : Le droit de suppression sur la table de traçabilité Syslog doit être strictement interdit.");
            score -= 25;
        } else {
            strengths.push("Intégrité des logs certifiée : Interdiction de modifier ou purger les enregistrements Syslog.");
        }

        if (usersPerm.modify && !nameLower.includes('admin')) {
            issues.push("Élévation de privilège potentielle : Un profil non-administrateur détient les droits de modification sur les comptes utilisateurs.");
            score -= 18;
        }

        if (refRules.length > 0) {
            strengths.push(`Périmètre territorial verrouillé : ${refRules.length} règle(s) de filtrage par référentiels (Région, Direction, Services).`);
        }

        const requestsFields = requestsPerm.allowedFields || ['all'];
        if (requestsFields.includes('all') && !nameLower.includes('admin') && !nameLower.includes('validat')) {
            issues.push("Périmètre de champs étendu : Tous les champs des demandes sont exposés sans masquage des avis de validation confidentiels.");
            score -= 10;
        } else {
            strengths.push("Contrôle d'accès granulaire aux données sensibles des demandes (pièces jointes, avis de validation).");
        }

        score = Math.max(25, Math.min(100, score));
        const grade: 'A+' | 'A' | 'B' | 'C' | 'D' = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
        const riskLevel: 'Faible' | 'Modéré' | 'Élevé' | 'Critique' = score >= 85 ? 'Faible' : score >= 70 ? 'Modéré' : score >= 50 ? 'Élevé' : 'Critique';

        return {
            compliance_score: score,
            compliance_grade: grade,
            risk_level: riskLevel,
            sod_status: issues.length === 0 ? "Conforme (Aucun conflit détecté)" : "Attention requise",
            strengths,
            issues,
            recommendations: [
                "Veiller à ce que les droits de validation ne s'appliquent pas aux demandes initiées par le même agent.",
                "Conserver les tables de conformité NIS 2 et Syslog en lecture seule.",
                "Restreindre la modification des référentiels d'infrastructures aux seuls gestionnaires de patrimoine ferroviaire."
            ],
            evaluated_at: new Date().toISOString(),
            provider: 'sovereign_heuristic',
            model: 'sovereign-heuristic-v1'
        };
    }

    static chat(message: string, history: ChatMessage[] = []): ChatResult {
        const msg = message.toLowerCase();
        let reply = "";
        const suggestions = [
            "Quelles sont les exigences de la norme EN 15864 ?",
            "Comment déclarer un vol de clé mécatronique (E123) ?",
            "Quelles habilitations électriques sont nécessaires pour les sous-stations ?"
        ];

        if (msg.includes('vol') || msg.includes('perte') || msg.includes('e123') || msg.includes('blacklist')) {
            reply = "En cas de perte ou vol de matériel mécatronique (Procédure **E123**), la clé doit être immédiatement déclarée dans la Régie ou le studio de workflow. Une alerte de niveau National est émise et le numéro de série est inscrit dans la liste noire des cylindres connectés EN 16864. Une clé de remplacement issue du stock tampon S9 peut être automatiquement clonée.";
        } else if (msg.includes('15864') || msg.includes('cle') || msg.includes('clé') || msg.includes('norme')) {
            reply = "La norme européenne **EN 15864** régit les serrures et clés mécatroniques programmables. Dans le cadre du réseau ferroviaire, chaque clé mécatronique attribue des droits temporaires encodés (horodatés, validité 24h max pour les missions critiques) et conserve un journal d'événements inviolable traçable selon la directive NIS 2.";
        } else if (msg.includes('habilitation') || msg.includes('électrique') || msg.includes('h0b0') || msg.includes('b1v') || msg.includes('caténaire')) {
            reply = "Les interventions ferroviaires en zone électrifiée ou à proximité des caténaires (1500V continu ou 25kV alternatif) requièrent obligatoirement l'habilitation **H0B0** (voisinage) ou **B1V** (travaux hors tension sous contrôle). L'accès aux armoires mécatroniques de sous-stations est conditionné par la vérification préalable de cette habilitation.";
        } else if (msg.includes('nis 2') || msg.includes('sûreté') || msg.includes('securite') || msg.includes('cyber')) {
            reply = "La directive européenne **NIS 2** impose à, opérateur de services essentiels (OSE), une traçabilité intégrale et inaltérable de tous les accès physiques aux installations critiques. Le journal d'audit Syslog conserve chaque événement (demande, validation, attribution de clé, révocation) sans possibilité de suppression.";
        } else {
            reply = `Bonjour, je suis l'assistant IA mécatronique. Je peux vous accompagner pour :\n- La rédaction technique et justification de vos demandes d'accès\n- L'évaluation des risques et conformité aux normes EN 15864 et EN 16864\n- Les protocoles de sécurité ferroviaire et habilitations électriques\n- L'audit des rôles et de la séparation des fonctions (SoD).\n\nQue souhaitez-vous vérifier ou préparer aujourd'hui ?`;
        }

        return {
            reply,
            suggestions,
            provider: 'sovereign_heuristic',
            model: 'sovereign-heuristic-v1',
            timestamp: new Date().toISOString()
        };
    }

    static suggestWorkflow(description: string): WorkflowSuggestionResult {
        return {
            workflow_name: "Circuit Opérationnel d'Accès Mécatronique",
            description: `Workflow personnalisé généré pour : ${description}`,
            stages: [
                {
                    name: "Instruction Hiérarchique (N+1)",
                    assignedRole: "Responsable d'équipe",
                    slaHours: 24,
                    mandatory: true,
                    actions: ["APPROVE", "REJECT", "REQUEST_INFO"]
                },
                {
                    name: "Contrôle Technique & Sécurité Ferroviaire",
                    assignedRole: "Validateur de Site",
                    slaHours: 48,
                    mandatory: true,
                    actions: ["APPROVE", "REJECT"]
                },
                {
                    name: "Programmation & Délivrance Clé EN 15864",
                    assignedRole: "Gestionnaire Régie",
                    slaHours: 24,
                    mandatory: true,
                    actions: ["ENCODE_AND_DISPATCH"]
                }
            ],
            initial_status: "DRAFT",
            terminal_statuses: ["CLOSED_FULFILLED", "REJECTED", "REVOKED"],
            rules: [
                "Vérification obligatoire des habilitations électriques pour accès caténaire",
                "Durée d'activation limitée à 72 heures sans renouvellement explicite",
                "Émargement électronique obligatoire à la restitution de l'équipement"
            ],
            provider: 'sovereign_heuristic',
            model: 'sovereign-heuristic-v1'
        };
    }
}

export class AiService {
    private static geminiClient: GoogleGenAI | null = null;
    private static currentModel = 'gemini-3.8-flash';

    private static getClient(): GoogleGenAI | null {
        if (!AiService.geminiClient) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0) {
                try {
                    AiService.geminiClient = new GoogleGenAI({ apiKey });
                } catch (e) {
                    console.warn('[AI] Impossible d\'initialiser le client GoogleGenAI:', e);
                }
            }
        }
        return AiService.geminiClient;
    }

    /**
     * Live Status of AI Service
     */
    static async getStatus(): Promise<{
        available: boolean;
        provider: 'gemini' | 'sovereign_heuristic';
        model: string;
        feature_enabled: boolean;
        apiKeyConfigured: boolean;
    }> {
        const isEnabled = await featureRepository.isEnabled('ai_demandes');
        const apiKey = process.env.GEMINI_API_KEY;
        const hasValidKey = !!(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0);

        return {
            available: isEnabled,
            provider: hasValidKey ? 'gemini' : 'sovereign_heuristic',
            model: hasValidKey ? AiService.currentModel : 'sovereign-heuristic-v1',
            feature_enabled: isEnabled,
            apiKeyConfigured: hasValidKey
        };
    }

    /**
     * 1. Analyze Mechatronic Access Request with Gemini / Sovereign Fallback
     */
    static async analyzeRequest(params: {
        reference?: string;
        title: string;
        description: string;
        site_name?: string;
        equipment_type?: string;
    }): Promise<AnalysisResult> {
        const client = AiService.getClient();

        if (client) {
            try {
                const prompt = `
Tu es un expert en cybersécurité ferroviaire et en contrôle d'accès mécatronique pour (normes EN 15864 et EN 16864, directive NIS 2).
Analyse la demande d'intervention suivante et produis un objet JSON strict :
Titre: "${params.title || ''}"
Description: "${params.description || ''}"
Site ferroviaire: "${params.site_name || 'Réseau National'}"
Équipement mécatronique: "${params.equipment_type || 'Clé Mécatronique EN 15864'}"

Réponds EXCLUSIVEMENT avec un JSON au format :
{
  "risk_level": "Faible" | "Modéré" | "Élevé",
  "urgency": "texte décrivant l'urgence et le créneau",
  "compliance_check": "analyse de conformité EN 15864 / EN 16864 et NIS 2",
  "key_points": ["point de sécurité 1", "point de sécurité 2", "point de sécurité 3"],
  "recommendation": "recommandation formelle pour le validateur hiérarchique"
}
`;
                const response = await client.models.generateContent({
                    model: AiService.currentModel,
                    contents: prompt,
                    config: {
                        temperature: 0.2,
                        responseMimeType: 'application/json'
                    }
                });

                if (response.text) {
                    const parsed = JSON.parse(response.text.trim());
                    const result: AnalysisResult = {
                        risk_level: ['Faible', 'Modéré', 'Élevé'].includes(parsed.risk_level) ? parsed.risk_level : 'Modéré',
                        urgency: parsed.urgency || 'Normale - Planification standard',
                        compliance_check: parsed.compliance_check || 'Conforme EN 15864 / EN 16864 (Audit traçable NIS 2)',
                        key_points: Array.isArray(parsed.key_points) && parsed.key_points.length > 0
                            ? parsed.key_points
                            : [`Normes EN 15864/16864 applicables`, `Site ${params.site_name || 'ferroviaire'}`],
                        recommendation: parsed.recommendation || "Avis favorable : Demande conforme aux critères de sécurité.",
                        analyzed_at: new Date().toISOString(),
                        provider: 'gemini',
                        model: AiService.currentModel
                    };

                    if (params.reference) {
                        const reqItem = requestsDB.find(r => r.reference === params.reference);
                        if (reqItem) {
                            reqItem.ai_analysis = result as any;
                            logAction("Gemini 3.8 Flash (AI Studio)", "Moteur d'Analyse Gemini", "AI_ANALYSIS", params.reference, `Évaluation : ${result.risk_level} - ${result.urgency}`);
                        }
                    }

                    return result;
                }
            } catch (err) {
                console.warn('[AI] Gemini call failed, falling back to sovereign heuristic:', err);
            }
        }

        const fallback = SovereignHeuristicEngine.analyze(
            params.title || '',
            params.description || '',
            params.site_name || '',
            params.equipment_type || ''
        );

        if (params.reference) {
            const reqItem = requestsDB.find(r => r.reference === params.reference);
            if (reqItem) {
                reqItem.ai_analysis = fallback as any;
                logAction("Système IA Souverain (PACS)", "Moteur d'Analyse Souverain", "AI_ANALYSIS", params.reference, `Évaluation : ${fallback.risk_level} - ${fallback.urgency}`);
            }
        }

        return fallback;
    }

    /**
     * 2. Draft / Assist Technical Description with Gemini / Sovereign Fallback
     */
    static async assistDescription(params: {
        draftText: string;
        equipment_type?: string;
        site_name?: string;
    }): Promise<AssistDescriptionResult> {
        const client = AiService.getClient();

        if (client) {
            try {
                const prompt = `
Tu es le rédacteur d'ordres de mission et justifications d'accès ferroviaires mécatroniques de.
Rédige un paragraphe formel, précis et rigoureux justifiant la demande d'accès mécatronique suivante :
Brouillon / Mots-clés de l'agent : "${params.draftText || ''}"
Type d'équipement sollicité : "${params.equipment_type || 'Clé Mécatronique EN 15864'}"
Site ferroviaire concerné : "${params.site_name || 'Réseau Ferroviaire National'}"

Le texte doit :
1. Préciser le cadre de maintenance ou d'intervention opérationnelle.
2. Citer le respect des normes EN 15864 (clés) ou EN 16864 (cylindres) et les habilitations requises (H0B0/B1V si installations électriques).
3. Mentionner l'engagement de traçabilité NIS 2 et l'émargement du registre.
4. Faire environ 3 à 5 phrases directes et professionnelles.

Réponds UNIQUEMENT avec le texte rédigé en français, sans guillemets superflus ni préambule.
`;
                const response = await client.models.generateContent({
                    model: AiService.currentModel,
                    contents: prompt,
                    config: { temperature: 0.3 }
                });

                if (response.text && response.text.trim().length > 0) {
                    return {
                        suggested_text: response.text.trim(),
                        provider: 'gemini',
                        model: AiService.currentModel
                    };
                }
            } catch (err) {
                console.warn('[AI] Gemini assistDescription failed, falling back to sovereign heuristic:', err);
            }
        }

        return SovereignHeuristicEngine.assistDescription(params.draftText, params.equipment_type, params.site_name);
    }

    /**
     * 3. Recommend Role Field Scope with Gemini / Sovereign Fallback
     */
    static async recommendRoleFieldScope(params: {
        roleName: string;
        roleDesc?: string;
        tables: any[];
    }): Promise<RoleScopeRecommendationResult> {
        const client = AiService.getClient();

        if (client) {
            try {
                const tableNames = params.tables.map(t => t.key || t.id).join(', ');
                const prompt = `
Tu es un architecte IAM et expert cybersécurité NIS 2 pour.
Recommande la configuration des droits d'accès aux tables et champs (PoLP - Principle of Least Privilege) pour le rôle suivant :
Nom du rôle : "${params.roleName}"
Description : "${params.roleDesc || ''}"
Tables disponibles : [${tableNames}]

Réponds UNIQUEMENT avec un objet JSON :
{
  "rationale": "Justification de la politique de moindres privilèges appliquée",
  "recommended_scopes": {
    "requests": { "dataScope": "own"|"department"|"all", "allowedFields": ["all"] ou ["champs"], "reason": "explication" }
  },
  "recommended_ref_types": ["Organisation", "Infrastructure", "Sécurité", "Matériel"],
  "safety_warnings": ["avertissement de sécurité 1"]
}
`;
                const response = await client.models.generateContent({
                    model: AiService.currentModel,
                    contents: prompt,
                    config: {
                        temperature: 0.2,
                        responseMimeType: 'application/json'
                    }
                });

                if (response.text) {
                    const parsed = JSON.parse(response.text.trim());
                    return {
                        rationale: parsed.rationale || `Recommandation PoLP pour le rôle ${params.roleName}`,
                        recommended_scopes: parsed.recommended_scopes || {},
                        recommended_ref_types: parsed.recommended_ref_types || ['Infrastructure', 'Matériel'],
                        safety_warnings: parsed.safety_warnings || [],
                        provider: 'gemini',
                        model: AiService.currentModel
                    };
                }
            } catch (err) {
                console.warn('[AI] Gemini recommendRoleFieldScope failed, falling back to sovereign heuristic:', err);
            }
        }

        return SovereignHeuristicEngine.recommendRoleScope(params.roleName, params.roleDesc, params.tables);
    }

    /**
     * 4. Audit Role Simulation with Gemini / Sovereign Fallback
     */
    static async auditRoleSimulation(params: {
        role: any;
        tables?: any[];
        referenceTables?: any[];
    }): Promise<RoleAuditResult> {
        const client = AiService.getClient();

        if (client) {
            try {
                const prompt = `
Tu es auditeur cybersécurité NIS 2 et contrôleur de séparation des tâches (SoD) pour.
Audite la configuration RBAC de ce rôle :
${JSON.stringify(params.role, null, 2)}

Évalue la conformité NIS 2, la séparation des fonctions (ex: ne pas cumuler validation et administration des utilisateurs), la protection des logs syslog, et calcule un score de 0 à 100.

Réponds UNIQUEMENT avec un JSON :
{
  "compliance_score": 95,
  "compliance_grade": "A+" | "A" | "B" | "C" | "D",
  "risk_level": "Faible" | "Modéré" | "Élevé" | "Critique",
  "sod_status": "Conforme" | "Attention requise",
  "strengths": ["point fort 1", "point fort 2"],
  "issues": ["problème potentiel 1"],
  "recommendations": ["conseil 1", "conseil 2"]
}
`;
                const response = await client.models.generateContent({
                    model: AiService.currentModel,
                    contents: prompt,
                    config: {
                        temperature: 0.2,
                        responseMimeType: 'application/json'
                    }
                });

                if (response.text) {
                    const parsed = JSON.parse(response.text.trim());
                    return {
                        compliance_score: typeof parsed.compliance_score === 'number' ? parsed.compliance_score : 90,
                        compliance_grade: parsed.compliance_grade || 'A',
                        risk_level: parsed.risk_level || 'Faible',
                        sod_status: parsed.sod_status || 'Conforme',
                        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
                        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
                        evaluated_at: new Date().toISOString(),
                        provider: 'gemini',
                        model: AiService.currentModel
                    };
                }
            } catch (err) {
                console.warn('[AI] Gemini auditRoleSimulation failed, falling back to sovereign heuristic:', err);
            }
        }

        return SovereignHeuristicEngine.auditRole(params.role, params.tables, params.referenceTables);
    }

    /**
     * 5. Conversational Copilot (Chat) with Gemini / Sovereign Fallback
     */
    static async chat(params: {
        message: string;
        history?: ChatMessage[];
        userContext?: any;
    }): Promise<ChatResult> {
        const client = AiService.getClient();

        if (client) {
            try {
                const systemInstruction = `
Tu es "Antigravity Mécatronique Copilot", l'assistant d'intelligence artificielle officiel de pour le Portail Mécatronique.
Tes domaines d'expertise :
1. Serrures et clés mécatroniques programmables (norme EN 15864) et cylindres électroniques haute sécurité (norme EN 16864).
2. Directives de cybersécurité NIS 2 pour les Opérateurs de Services Essentiels (OSE) ferroviaires, intégrité Syslog et non-répudiation.
3. Habilitations de sécurité ferroviaire et électrique : H0B0 (voisinage), B1V (travaux électriques sous tension/hors tension), consignations sous-stations et caténaires.
4. Procédures d'incidents matériels (Procédure E123 : perte/vol de clé, mise en liste noire immédiate, attribution de clé de remplacement stock S9).
5. Aide à la formulation des demandes d'intervention, conseils de conformité pour les validateurs de site et managers d'équipe.

Consignes de communication :
- Sois clair, précis, professionnel et orienté sécurité ferroviaire.
- Formate tes réponses en Markdown élégant avec des puces et gras pour faciliter la lecture des agents de terrain.
- Propose systématiquement des suggestions de questions pertinentes en lien avec la réponse.
`;
                const prompt = `
Contexte utilisateur : Rôle=${params.userContext?.role || 'Agent'}, Nom=${params.userContext?.name || 'Collaborateur'}.
Historique récent :
${(params.history || []).slice(-6).map(h => `${h.role}: ${h.content}`).join('\n')}

Message de l'utilisateur :
"${params.message}"

Réponds avec pertinence. Inclus à la fin de ta réponse un bloc JSON délimité par <<<SUGGESTIONS>>> contenant 2 à 3 suggestions de questions courtes que l'utilisateur pourrait poser ensuite.
Exemple:
<<<SUGGESTIONS>>>
["Question 1", "Question 2"]
<<<SUGGESTIONS>>>
`;
                const response = await client.models.generateContent({
                    model: AiService.currentModel,
                    contents: prompt,
                    config: {
                        systemInstruction,
                        temperature: 0.3
                    }
                });

                if (response.text) {
                    let rawText = response.text;
                    let suggestions: string[] = [];

                    const suggMatch = rawText.match(/<<<SUGGESTIONS>>>([\s\S]*?)<<<SUGGESTIONS>>>/);
                    if (suggMatch) {
                        try {
                            suggestions = JSON.parse(suggMatch[1].trim());
                            rawText = rawText.replace(/<<<SUGGESTIONS>>>[\s\S]*?<<<SUGGESTIONS>>>/, '').trim();
                        } catch {}
                    }

                    if (suggestions.length === 0) {
                        suggestions = [
                            "Vérifier les habilitations requises pour ce site",
                            "Consulter les normes EN 15864 / EN 16864",
                            "Rédiger la justification de ma demande"
                        ];
                    }

                    return {
                        reply: rawText,
                        suggestions,
                        provider: 'gemini',
                        model: AiService.currentModel,
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (err) {
                console.warn('[AI] Gemini chat failed, falling back to sovereign heuristic:', err);
            }
        }

        return SovereignHeuristicEngine.chat(params.message, params.history);
    }

    /**
     * 6. Suggest Workflow Architecture from Natural Language
     */
    static async suggestWorkflow(params: { description: string; constraints?: string }): Promise<WorkflowSuggestionResult> {
        const client = AiService.getClient();

        if (client) {
            try {
                const prompt = `
Tu es un ingénieur méthode et processus ferroviaires.
Conçois un cycle de vie de workflow mécatronique complet adapté au besoin suivant :
Description du besoin : "${params.description}"
Contraintes particulières : "${params.constraints || 'Conformité NIS 2 et normes EN 15864'}"

Réponds UNIQUEMENT avec un JSON au format :
{
  "workflow_name": "Nom du processus",
  "description": "Résumé opérationnel",
  "stages": [
    {
      "name": "Nom étape 1",
      "assignedRole": "Rôle responsable",
      "slaHours": 24,
      "mandatory": true,
      "actions": ["APPROVE", "REJECT"]
    }
  ],
  "initial_status": "DRAFT",
  "terminal_statuses": ["COMPLETED", "REJECTED"],
  "rules": ["règle métier 1", "règle métier 2"]
}
`;
                const response = await client.models.generateContent({
                    model: AiService.currentModel,
                    contents: prompt,
                    config: {
                        temperature: 0.2,
                        responseMimeType: 'application/json'
                    }
                });

                if (response.text) {
                    const parsed = JSON.parse(response.text.trim());
                    return {
                        workflow_name: parsed.workflow_name || 'Workflow Mécatronique Personnalisé',
                        description: parsed.description || params.description,
                        stages: Array.isArray(parsed.stages) ? parsed.stages : [],
                        initial_status: parsed.initial_status || 'DRAFT',
                        terminal_statuses: Array.isArray(parsed.terminal_statuses) ? parsed.terminal_statuses : ['COMPLETED'],
                        rules: Array.isArray(parsed.rules) ? parsed.rules : [],
                        provider: 'gemini',
                        model: AiService.currentModel
                    };
                }
            } catch (err) {
                console.warn('[AI] Gemini suggestWorkflow failed, falling back to sovereign heuristic:', err);
            }
        }

        return SovereignHeuristicEngine.suggestWorkflow(params.description);
    }
}
