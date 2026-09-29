import { RequestType, ItemType, HardwareOrigin, WorkflowRulesConfig } from '../types';

export interface WorkflowTemplateItem {
    item_type: ItemType;
    label: string;
    target_site_name?: string;
    designated_validator_name?: string;
    hardware_origin?: HardwareOrigin;
    hardware_serial_number?: string;
}

export interface WorkflowTemplate {
    id: string;
    process_number: number;
    code: string;
    name: string;
    short_title: string;
    category: 'Accès & Profils' | 'Équipements & Matériel' | 'Opérations Réseau' | 'Sécurité & Incidents';
    request_type: RequestType;
    default_title: string;
    default_description: string;
    default_site_name: string;
    has_special_tag: boolean;
    rules: WorkflowRulesConfig;
    default_items: WorkflowTemplateItem[];
    metadata?: Record<string, any>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'proc-1-habilitation',
        process_number: 1,
        code: 'PROC-01',
        name: 'Processus 1 : Habilitations & Droits d\'Accès Multi-Sites',
        short_title: 'Habilitation Multi-Sites',
        category: 'Accès & Profils',
        request_type: 'HABILITATION',
        default_title: 'Habilitation mécatronique Multi-Sites (Postes & Voies)',
        default_description: 'Demande simultanée de droits d\'accès techniques pour maintenance de nuit sur plusieurs sites ferroviaires',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: false,
        rules: {
            validation_mode: 'PARALLEL_ITEMS',
            require_parallel_item_approval: true,
            allowed_validator_roles: ['Validateur', 'Validateur de Site', 'Responsable Sécurité', 'Chef de Secteur'],
            requires_reception_pv: false,
            requires_gps: false,
            requires_gdpr: false,
            check_quota: false,
            requires_quote_po: false
        },
        default_items: [
            { item_type: 'ACCESS_RIGHT', label: 'Accès Poste Aiguillage Nord', target_site_name: 'Paris Gare du Nord', designated_validator_name: 'Valérie Validateur' },
            { item_type: 'ACCESS_RIGHT', label: 'Accès Voies de Maintenance', target_site_name: 'Technicentre Châtillon TGV', designated_validator_name: 'Sylvain Sécurité' },
            { item_type: 'ACCESS_RIGHT', label: 'Accès Armoires Relais', target_site_name: 'Gare de Lyon Part-Dieu', designated_validator_name: 'Richard Rails' }
        ]
    },
    {
        id: 'proc-2-user-account',
        process_number: 2,
        code: 'PROC-02',
        name: 'Processus 2 : Création de Compte & Charte RGPD',
        short_title: 'Création Compte & RGPD',
        category: 'Accès & Profils',
        request_type: 'USER_ACCOUNT',
        default_title: 'Création compte utilisateur Agent Technique (Interne 3 ans)',
        default_description: 'Ouverture de profil SI Mécatronique avec signature de la charte RGPD et proposition de clé mécatronique',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: false,
        rules: {
            validation_mode: 'CROSS_VALIDATION',
            require_manager_approval: true,
            require_validator_approval: true,
            allowed_manager_roles: ['Manager', 'Responsable d\'équipe', 'Chef de Projet'],
            allowed_validator_roles: ['Validateur', 'Responsable Sécurité'],
            requires_gdpr: true,
            auto_chain_key_order: true,
            check_quota: false,
            requires_quote_po: false
        },
        metadata: {
            user_type: 'Interne',
            validity_years: 3
        },
        default_items: [
            { item_type: 'USER_CREATION', label: 'Création profil SI & Badge Virtuel', target_site_name: 'Paris Gare du Nord' }
        ]
    },
    {
        id: 'proc-3-key-order',
        process_number: 3,
        code: 'PROC-03',
        name: 'Processus 3 : Commande de Clé & Quota S10 / Devis S9',
        short_title: 'Clé & Quota S10 / Devis S9',
        category: 'Équipements & Matériel',
        request_type: 'KEY_ORDER',
        default_title: 'Commande de Clé Mécatronique Programmable (Stock Fournisseur S9)',
        default_description: 'Attribution d\'une clé programmable avec contrôle dynamique de quota et devis différentiel',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: false,
        rules: {
            validation_mode: 'PARALLEL_ITEMS',
            check_quota: true,
            custom_quota_limit: 2,
            requires_quote_po: true,
            custom_quote_amount: 85.00,
            custom_quote_currency: 'EUR',
            auto_calculate_differential_quote: true,
            requires_reception_pv: true,
            max_reminder_bounces: 3,
            auto_incident_on_timeout: true
        },
        default_items: [
            { item_type: 'KEY', label: 'Clé Électronique Programmable IP67', hardware_origin: 'SUPPLIER_STOCK', target_site_name: 'Paris Gare du Nord' }
        ]
    },
    {
        id: 'proc-4-cylinder-order',
        process_number: 4,
        code: 'PROC-04',
        name: 'Processus 4 : Commande Cylindre & Commissioning GPS Terrain',
        short_title: 'Cylindre & GPS Terrain',
        category: 'Équipements & Matériel',
        request_type: 'CYLINDER_ORDER',
        default_title: 'Pose Cylindre Haute Sécurité EN 15864 (Commissioning GPS requis)',
        default_description: 'Installation de serrure électronique avec relevé géolocalisé de pose et validation PV',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: false,
        rules: {
            validation_mode: 'PARALLEL_ITEMS',
            requires_quote_po: true,
            custom_quote_amount: 145.00,
            requires_reception_pv: true,
            requires_gps: true,
            gps_max_distance_meters: 250,
            gps_max_accuracy_meters: 50,
            check_quota: true,
            custom_quota_limit: 5
        },
        default_items: [
            { item_type: 'CYLINDER', label: 'Cylindre Mécatronique Porte T1', hardware_origin: 'NEW_ORDER', target_site_name: 'Paris Gare du Nord' }
        ]
    },
    {
        id: 'proc-5-terminal-order',
        process_number: 5,
        code: 'PROC-05',
        name: 'Processus 5 : Borne de Rechargement & Règle TAG Spécial',
        short_title: 'Borne & TAG Spécial',
        category: 'Équipements & Matériel',
        request_type: 'TERMINAL_ORDER',
        default_title: 'Boîtier de Rechargement & Télé-actualisation (TAG Spécial requis)',
        default_description: 'Borne murale de synchronisation et recharge des clés mécatroniques sur site technique',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: true,
        rules: {
            validation_mode: 'PARALLEL_ITEMS',
            requires_special_tag: true,
            special_tag_label: 'BORNE_MURALE',
            requires_quote_po: true,
            custom_quote_amount: 320.00,
            requires_reception_pv: true,
            requires_gps: true,
            gps_max_distance_meters: 100,
            gps_max_accuracy_meters: 30
        },
        default_items: [
            { item_type: 'TERMINAL', label: 'Borne Murale Ethernet/4G', hardware_origin: 'NEW_ORDER', target_site_name: 'Paris Gare du Nord' }
        ]
    },
    {
        id: 'proc-6-mass-deploy',
        process_number: 6,
        code: 'PROC-06',
        name: 'Processus 6 : Déploiement Massif S29 & Validation Tripartite',
        short_title: 'Déploiement Massif Tripartite',
        category: 'Opérations Réseau',
        request_type: 'MASS_DEPLOY',
        default_title: 'Déploiement Massif S29 - Modernisation Ligne C RER',
        default_description: 'Import modèle Excel consolidé avec validation tripartite (Manager, Validateur Local, Référent National)',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: false,
        rules: {
            validation_mode: 'TRIPARTITE',
            require_manager_approval: true,
            require_validator_approval: true,
            require_national_arbitration: true,
            allowed_manager_roles: ['Manager', 'Directeur de Projet', 'Chef de Secteur'],
            allowed_validator_roles: ['Validateur', 'Responsable Sécurité'],
            allowed_national_roles: ['Référent National', 'Administrateur National'],
            check_quota: true,
            custom_quota_limit: 10,
            requires_quote_po: true
        },
        default_items: [
            { item_type: 'KEY', label: 'Lot 20 Clés électroniques Ligne C', hardware_origin: 'NEW_ORDER', target_site_name: 'Paris Gare du Nord' },
            { item_type: 'CYLINDER', label: 'Lot 50 Cylindres mécatroniques Ligne C', hardware_origin: 'NEW_ORDER', target_site_name: 'Paris Gare du Nord' }
        ]
    },
    {
        id: 'proc-7-incident',
        process_number: 7,
        code: 'PROC-07',
        name: 'Processus 7 : Incident Perte/Vol & Révocation Sécurité',
        short_title: 'Perte/Vol & Révocation Sécurité',
        category: 'Sécurité & Incidents',
        request_type: 'INCIDENT',
        default_title: 'Déclaration Perte / Vol de Clé avec Remplacement Sécurisé',
        default_description: 'Télé-révocation immédiate, diffusion de sécurité et remplacement sous exclusion mutuelle',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: false,
        rules: {
            validation_mode: 'PARALLEL_ITEMS',
            enable_e123_blacklist: true,
            auto_exclusion_rule: true,
            custom_quote_amount: 85.00,
            allowed_national_roles: ['Référent National', 'Administrateur National', 'Administrateur'],
            requires_quote_po: false
        },
        default_items: [
            { item_type: 'KEY', label: 'Clé mécatronique déclarée compromise', hardware_serial_number: 'KEY-VOL-2026', hardware_origin: 'USER_STOCK', target_site_name: 'Paris Gare du Nord' }
        ]
    },
    {
        id: 'proc-8-org-change',
        process_number: 8,
        code: 'PROC-08',
        name: 'Processus 8 : Réorganisation de Structure (TAG Spécial)',
        short_title: 'Réorganisation & TAG Spécial',
        category: 'Opérations Réseau',
        request_type: 'ORG_CHANGE',
        default_title: 'Modification Structure Organisationnelle Pôle Voies Nord',
        default_description: 'Dépôt de l\'organigramme cible S29 et restructuration des périmètres (Réservé TAG Spécial)',
        default_site_name: 'Paris Gare du Nord',
        has_special_tag: true,
        rules: {
            validation_mode: 'AUTO_FULFILL',
            requires_special_tag: true,
            special_tag_label: 'ORG_RESTRUCTURE',
            check_quota: false,
            requires_quote_po: false
        },
        default_items: [
            { item_type: 'ACCESS_RIGHT', label: 'Restructuration globale des droits d\'accès secteur Nord', target_site_name: 'Paris Gare du Nord' }
        ]
    }
];

export const CUSTOM_BLANK_TEMPLATE: WorkflowTemplate = {
    id: 'proc-custom-blank',
    process_number: 0,
    code: 'CUSTOM',
    name: 'Workflow Métier Personnalisé sur Mesure',
    short_title: 'Personnalisé',
    category: 'Opérations Réseau',
    request_type: 'HABILITATION',
    default_title: 'Nouveau Dossier d\'Accès Personnalisé',
    default_description: 'Workflow paramétré sur mesure avec règles et systèmes configurés',
    default_site_name: 'Paris Gare du Nord',
    has_special_tag: false,
    rules: {
        validation_mode: 'PARALLEL_ITEMS',
        allowed_manager_roles: ['Manager', 'Responsable d\'équipe', 'Chef de Projet'],
        allowed_validator_roles: ['Validateur', 'Validateur de Site', 'Responsable Sécurité'],
        allowed_national_roles: ['Référent National', 'Administrateur National'],
        requires_gps: false,
        gps_max_distance_meters: 250,
        gps_max_accuracy_meters: 50,
        requires_reception_pv: false,
        requires_gdpr: false,
        auto_chain_key_order: false,
        check_quota: false,
        custom_quota_limit: 3,
        max_reminder_bounces: 3,
        auto_incident_on_timeout: true,
        requires_quote_po: false,
        custom_quote_amount: 85.00,
        custom_quote_currency: 'EUR',
        requires_special_tag: false,
        special_tag_label: '',
        enable_e123_blacklist: false,
        auto_exclusion_rule: false
    },
    default_items: [
        { item_type: 'ACCESS_RIGHT', label: 'Droit d\'accès sur site principal', target_site_name: 'Paris Gare du Nord', designated_validator_name: 'Valérie Validateur' }
    ]
};

export function getTemplateByProcessNum(num: number): WorkflowTemplate | undefined {
    return WORKFLOW_TEMPLATES.find(t => t.process_number === num);
}

export function getTemplateById(id: string): WorkflowTemplate | undefined {
    if (id === CUSTOM_BLANK_TEMPLATE.id) return CUSTOM_BLANK_TEMPLATE;
    return WORKFLOW_TEMPLATES.find(t => t.id === id);
}
