export interface AuditLog {
    id: number;
    timestamp: string;
    actor: string;
    role: string;
    action: string;
    target: string;
    details: string;
}

export interface ReferenceVisibilityRule {
    id: string;
    tableId: string;        // e.g. "regions", "directions", "services", "sites"
    tableName: string;      // e.g. "Régions", "Directions Métier", "Services", "Sites"
    field: string;          // e.g. "name", "region", "direction"
    operator: 'in' | 'equals';
    values: string[];       // e.g. ["Île-de-France"] or ["Direction Sûreté Ferroviaire"]
    scopeTargets?: ('requests' | 'sites' | 'users' | 'all')[]; // what is restricted to this region/direction
    label?: string;         // Descriptive label
}

export interface RoleTablePermission {
    see: boolean;      // Voir
    modify: boolean;   // Modifier
    delete: boolean;   // Supprimer
    create: boolean;   // Créer
    dataScope?: 'all' | 'department' | 'own' | 'assigned_sites';
    allowedFields?: string[];
}

export interface Role {
    id: number;
    name: string;
    description?: string;
    privileges: string[];
    portalTabs?: Record<string, boolean>; // e.g. { catalogue: true, 'mes-demandes': true, corbeille: true, ... }
    tablePermissions?: Record<string, RoleTablePermission>;
    referenceVisibilityRules?: ReferenceVisibilityRule[];
}

export interface User {
    id: number;
    email: string;
    role: string;
    roles?: string[];
    name: string;
    status: string;
    attributes: Record<string, any>;
}

export interface PortalSite {
    id: number;
    code: string;
    name: string;
    region: string;
    validator_id: number;
    validator_name: string;
    normes_applicables: string[];
}

export interface Category {
    id: number;
    name: string;
    description: string;
    status: string;
    norm_reference?: string;
}

export interface ProcessStage {
    id: string;
    order: number;
    name: string;
    validator_role: string;
    validator_id?: number;
    validator_name?: string;
    status: 'pending' | 'approved' | 'rejected' | 'complement_requested';
    validated_at?: string;
    comment?: string;
    sla_hours?: number;
}

export interface TableColumn {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean' | 'email' | 'date';
    options?: string[];
    table_ref?: string;
    display_field?: string;
    multiple?: boolean;
    required?: boolean;
    description?: string;
}

export type MetadataFieldType = 'tags' | 'category' | 'select' | 'text' | 'badge' | 'boolean' | 'number';

export interface TableMetadataField {
    key: string;
    label: string;
    type: MetadataFieldType;
    options?: string[];
    defaultValue?: any;
    description?: string;
    target?: 'table' | 'row' | 'both';
    required?: boolean;
    colorScheme?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'gray';
}

export interface CustomTable {
    id: string; // unique slug/identifier, e.g. "sites", "roles", "services", "regions"
    name: string;
    description: string;
    icon?: string;
    category?: string;
    is_system?: boolean;
    allow_multiple?: boolean;
    grouping_column?: string;
    show_in_forms?: boolean;
    form_field_label?: string;
    form_help_text?: string;
    is_required?: boolean;
    columns: TableColumn[];
    rows: Record<string, any>[];
    metadata_fields?: TableMetadataField[];
    metadata?: Record<string, any>;
}

export interface StageFulfillmentRule {
    id: string;
    type: 'FORM_COMPLETION' | 'FIELD_VALUE' | 'QUOTA_CHECK' | 'RGPD_CONSENT' | 'SPECIAL_TAG' | 'GPS_TERRAIN' | 'FEEDBACK_RECEIPT' | 'CUSTOM';
    title: string;
    description?: string;
    enabled: boolean;
    require_all_required?: boolean;
    field_ids?: string[];
    field_id?: string;
    operator?: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_NOT_EMPTY';
    expected_value?: string;
    quota_limit?: number;
    quota_scope?: 'USER' | 'SITE' | 'TEAM';
    quota_period?: 'MONTH' | 'YEAR' | 'ACTIVE_SIMULTANEOUS';
    tag_name?: string;
    gps_tolerance_meters?: number;
    receipt_type?: 'SIGNATURE' | 'PV_DELIVERY' | 'SATISFACTION_SURVEY' | 'CHECKLIST';
    custom_condition_text?: string;
}

export interface StageNotificationConfig {
    id: string;
    trigger: 'ON_ENTER' | 'ON_FULFILL' | 'ON_REJECT' | 'ON_SLA_BREACH';
    name?: string;
    recipient_type: 'DEMANDEUR' | 'CURRENT_VALIDATOR' | 'NEXT_VALIDATOR' | 'ALL_STAKEHOLDERS' | 'ROLE' | 'CUSTOM_EMAIL';
    recipient_role?: string;
    recipient_email?: string;
    subject: string;
    message: string;
    channel: 'IN_APP' | 'EMAIL' | 'BOTH';
    enabled: boolean;
}

export interface ProcessTemplateStage {
    id: string;
    order: number;
    name: string;
    status_key?: string;
    validator_role: string;
    validator_id?: number;
    validator_name?: string;
    sla_hours?: number;
    requires_document?: boolean;
    auto_approve_condition?: string;
    instruction?: string;
    approval_mode?: 'manual' | 'conditional' | 'auto';
    fulfillment_mode?: 'MANUAL_APPROVAL' | 'AUTO_WHEN_RULES_PASS' | 'MULTI_APPROVAL';
    position?: { x: number; y: number };
    transitions?: any[];
    rules?: StageFulfillmentRule[];
    notifications?: StageNotificationConfig[];
}

export type TriggerEventType =
    | 'on_submission'
    | 'on_stage_approved'
    | 'on_final_approval'
    | 'on_rejected'
    | 'on_complement_requested'
    | 'on_complement_submitted'
    | 'on_sla_warning'
    | 'on_request_edited'
    | 'on_cancelled'
    | 'on_key_delivered'
    | 'on_key_returned'
    | 'on_delegation_set'
    | 'on_security_alert';

export interface NotificationTemplate {
    id: string;
    name: string;
    category: string;
    description?: string;
    trigger_event: TriggerEventType;
    recipient_type: 'demandeur' | 'validator_current_stage' | 'all_validators' | 'role' | 'custom_email';
    recipient_role?: string;
    recipient_email?: string;
    subject: string;
    content: string;
    channel: 'app' | 'email' | 'both';
    urgent: boolean;
    active: boolean;
    is_system?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ProcessTemplateNotification {
    id: string;
    template_id?: string;
    name?: string;
    trigger_event?: TriggerEventType;
    stage_id?: string;
    recipient_type?: 'demandeur' | 'validator_current_stage' | 'all_validators' | 'role' | 'custom_email';
    recipient_role?: string;
    recipient_email?: string;
    subject?: string;
    content?: string;
    channel?: 'app' | 'email' | 'both';
    urgent?: boolean;
    active: boolean;
}

export interface ProcessTemplate {
    id: number;
    name: string;
    code?: string;
    category_id: number;
    description: string;
    status: string;
    stages: ProcessTemplateStage[];
    fields: any[];
    linked_tables?: string[];
    notifications?: ProcessTemplateNotification[];
    workflow_rules?: any;
    request_type?: string;
    has_special_tag?: boolean;
    transitions?: any[];
    metadata?: Record<string, any>;
}

export interface FormFieldConfig {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'table_ref' | 'checkbox' | 'radio' | 'file' | 'email' | 'tel' | 'gps' | 'tag';
    table_ref?: string;
    options?: string;
    required?: boolean;
    placeholder?: string;
    help_text?: string;
    default_value?: any;
    col_span?: number; // 12 = full, 6 = half, 4 = one-third
    validation_regex?: string;
}

export interface FormTemplate {
    id: string;
    name: string;
    code: string;
    category_id: number;
    description: string;
    status: string;
    fields: FormFieldConfig[];
    linked_tables?: string[];
    linked_process_id?: number;
    created_at?: string;
    updated_at?: string;
}

export let formTemplatesDatabase: FormTemplate[] = [];

export type StatusCategory =
    | 'INITIAL'
    | 'IN_REVIEW'
    | 'EXECUTION'
    | 'TERMINAL_SUCCESS'
    | 'TERMINAL_REJECT'
    | 'EXCEPTION'
    | 'ARCHIVED'
    | (string & {});

export interface StatusCategoryConfig {
    id: string;
    code: string;
    label: string;
    color: string;
    desc: string;
    display_order: number;
    is_system?: boolean;
}

export interface StatusMetadataConfig {
    specification_title: string;
    specification_code: string;
    specification_description: string;
    badge_label: string;
}

export let statusCategoriesDatabase: StatusCategoryConfig[] = [
    { id: "cat_initial", code: "INITIAL", label: "Phase Initiale", color: "bg-blue-100 text-blue-800 border-blue-200", desc: "Dépôt, brouillon et initialisation du dossier", display_order: 1, is_system: true },
    { id: "cat_in_review", code: "IN_REVIEW", label: "Instruction & Validations", color: "bg-amber-100 text-amber-800 border-amber-200", desc: "Circuits d'approbation hiérarchique et technique", display_order: 2, is_system: true },
    { id: "cat_execution", code: "EXECUTION", label: "Traitement & Logistique", color: "bg-teal-100 text-teal-800 border-teal-200", desc: "Devis, commande, expédition postale et relevé GPS", display_order: 3, is_system: true },
    { id: "cat_terminal_success", code: "TERMINAL_SUCCESS", label: "Accord & Service Fait", color: "bg-emerald-100 text-emerald-800 border-emerald-200", desc: "Validation complète, droits programmés", display_order: 4, is_system: true },
    { id: "cat_terminal_reject", code: "TERMINAL_REJECT", label: "Refus Déclaré", color: "bg-rose-100 text-rose-800 border-rose-200", desc: "Opposition motivée par un validateur", display_order: 5, is_system: true },
    { id: "cat_exception", code: "EXCEPTION", label: "Incidents & Escalades", color: "bg-red-100 text-red-800 border-red-200", desc: "Arbitrage et escalade, déclaration d'incident, suspension et révocation", display_order: 6, is_system: true },
    { id: "cat_archived", code: "ARCHIVED", label: "Archivage & Historique", color: "bg-gray-100 text-gray-800 border-gray-200", desc: "Clôture conforme à la traçabilité NIS 2", display_order: 7, is_system: true }
];

export let statusMetadataStore: StatusMetadataConfig = {
    specification_title: "Architecture Zero-Code des Statuts",
    specification_code: "",
    specification_description: "Référentiel des états opérationnels et machine à états",
    badge_label: ""
};

export interface RuleDomainConfig {
    id: string;
    code: string;
    label: string;
    description: string;
    color: string;
    bgBadge: string;
    iconName: string;
    display_order: number;
    is_system?: boolean;
}

export let initialRuleDomains: RuleDomainConfig[] = [
    { id: "dom_quota", code: "QUOTA", label: "Quotas & Équipements", description: "Plafonds de matériel, modèles d'équipements, stocks magasin et dérogations d'accès.", color: "text-amber-700", bgBadge: "bg-amber-100 text-amber-900 border-amber-200", iconName: "Key", display_order: 1, is_system: true },
    { id: "dom_finance", code: "FINANCE", label: "Finances & Seuils Budgétaires", description: "Engagements de dépenses, devis fournisseurs, centres financiers et seuils N+2.", color: "text-emerald-700", bgBadge: "bg-emerald-100 text-emerald-900 border-emerald-200", iconName: "DollarSign", display_order: 2, is_system: true },
    { id: "dom_security", code: "SECURITY", label: "Sécurité, Habilitations & NIS 2", description: "Habilitations d'accès, chartes RGPD, chartes de conformité et sûreté des sites.", color: "text-red-700", bgBadge: "bg-red-100 text-red-900 border-red-200", iconName: "Shield", display_order: 3, is_system: true },
    { id: "dom_identity", code: "IDENTITY", label: "Demandeur, RH & Entreprises", description: "Identifiants collaborateurs, prestataires externes, directions régionales et bénéficiaires.", color: "text-blue-700", bgBadge: "bg-blue-100 text-blue-900 border-blue-200", iconName: "Users", display_order: 4, is_system: true },
    { id: "dom_gps", code: "GPS", label: "Terrain, GPS & Localisation", description: "Géolocalisation d'intervention, coordonnées GPS, sites techniques et points de repère.", color: "text-cyan-700", bgBadge: "bg-cyan-100 text-cyan-900 border-cyan-200", iconName: "MapPin", display_order: 5, is_system: true },
    { id: "dom_sla", code: "SLA", label: "SLA & Contrôle 4-Yeux", description: "Délais contractuels, horodatage, escalades hiérarchiques et séparation stricte demandeur/validateur.", color: "text-purple-700", bgBadge: "bg-purple-100 text-purple-900 border-purple-200", iconName: "Clock", display_order: 6, is_system: true },
    { id: "dom_logistics", code: "LOGISTICS", label: "Logistique, Livraison & PV", description: "Mise à disposition sécurisée, transporteur et procès-verbaux de remise.", color: "text-teal-700", bgBadge: "bg-teal-100 text-teal-900 border-teal-200", iconName: "Package", display_order: 7, is_system: true },
    { id: "dom_workflow", code: "WORKFLOW", label: "Circuits & Transitions Workflow", description: "Règles régissant le passage d'une étape de workflow à une autre et autorisations d'aiguillage.", color: "text-indigo-700", bgBadge: "bg-indigo-100 text-indigo-900 border-indigo-200", iconName: "Compass", display_order: 8, is_system: true },
    { id: "dom_validation", code: "VALIDATION", label: "Contrôles de Saisie & Validations", description: "Validations de cohérence des données, pièces justificatives obligatoires et formats.", color: "text-orange-700", bgBadge: "bg-orange-100 text-orange-900 border-orange-200", iconName: "CheckCircle2", display_order: 9, is_system: true },
    { id: "dom_general", code: "GENERAL", label: "Données Générales & Métadonnées", description: "Attributs globaux de dossiers, types de demandes, dates limites et motifs.", color: "text-slate-700", bgBadge: "bg-slate-100 text-slate-800 border-slate-200", iconName: "FileText", display_order: 10, is_system: true },
    { id: "dom_custom", code: "CUSTOM", label: "Domaine Spécifique & Métier Libre", description: "Domaine paramétrable libre pour vos propres règles métiers et cas d'usage uniques.", color: "text-pink-700", bgBadge: "bg-pink-100 text-pink-900 border-pink-200", iconName: "Zap", display_order: 11, is_system: false }
];

export let ruleDomainsDatabase: RuleDomainConfig[] = [...initialRuleDomains];

export interface BusinessRule {
    id: string;
    code: string;
    title: string;
    description: string;
    category: string;
    trigger_event: 'ON_SUBMIT' | 'ON_STAGE_ENTER' | 'BEFORE_TRANSITION' | 'ON_SLA_BREACH' | 'ON_FIELD_CHANGE';
    target_field?: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY' | 'CUSTOM';
    expected_value?: string;
    action_type: 'BLOCK_TRANSITION' | 'REQUIRE_ADDITIONAL_ROLE' | 'TRIGGER_ALERT' | 'AUTO_FULFILL' | 'REQUIRE_JUSTIFICATIF' | 'CUSTOM';
    action_role?: string;
    error_message: string;
    is_active: boolean;
    priority: number;
    associated_processes: string[];
    created_at: string;
    updated_at: string;
}

export let businessRulesStore: BusinessRule[] = [
    {
        id: "RULE_QUOTA_S10",
        code: "RULE_QUOTA_S10",
        title: "Plafond Quota Matériel & Équipements Actifs",
        description: "Bloque la création d'une nouvelle demande si le demandeur possède déjà plus de 2 matériels physiques actifs simultanés sans dérogation.",
        category: "QUOTA",
        trigger_event: "ON_SUBMIT",
        target_field: "hardware_active_count",
        operator: "GREATER_THAN",
        expected_value: "2",
        action_type: "REQUIRE_ADDITIONAL_ROLE",
        action_role: "Responsable Sécurité",
        error_message: "Quota matériel dépassé (> 2 équipements actifs). Une dérogation arbitrée par le Responsable Sécurité est requise.",
        is_active: true,
        priority: 1,
        associated_processes: ["ALL"],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "RULE_DUAL_VALIDATION_4EYES",
        code: "RULE_DUAL_VALIDATION_4EYES",
        title: "Principe de Double Approbation Croisée (4-Yeux)",
        description: "Interdit formellement à un demandeur d'approuver sa propre demande même s'il possède les privilèges de validation.",
        category: "SECURITY",
        trigger_event: "BEFORE_TRANSITION",
        target_field: "validator_id",
        operator: "NOT_EQUALS",
        expected_value: "requester_id",
        action_type: "BLOCK_TRANSITION",
        error_message: "Conformité NIS 2 : L'auto-approbation est strictement interdite. Un validateur distinct doit statuer.",
        is_active: true,
        priority: 2,
        associated_processes: ["ALL"],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "RULE_FINANCIAL_THRESHOLD_N2",
        code: "RULE_FINANCIAL_THRESHOLD_N2",
        title: "Seuil Budgétaire & Validation Direction Financière (> 1500 €)",
        description: "Exige la validation hiérarchique N+2 ou Pôle Financier pour tout devis ou remplacement matériel dépassant 1 500 € HT.",
        category: "FINANCE",
        trigger_event: "BEFORE_TRANSITION",
        target_field: "montant_total_ht",
        operator: "GREATER_THAN",
        expected_value: "1500",
        action_type: "REQUIRE_ADDITIONAL_ROLE",
        action_role: "Administrateur National",
        error_message: "Le montant dépasse le seuil budgétaire de 1 500 € HT. Accord financier N+2 obligatoire.",
        is_active: true,
        priority: 3,
        associated_processes: ["ALL"],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "RULE_GPS_PRECISION_TERRAIN",
        code: "RULE_GPS_PRECISION_TERRAIN",
        title: "Tolérance Géolocalisation GPS Terrain (Précision ≤ 50m)",
        description: "Exige que le relevé GPS fourni par l'installateur sur site présente une précision certifiée inférieure ou égale à 50 mètres.",
        category: "GPS",
        trigger_event: "BEFORE_TRANSITION",
        target_field: "gps_accuracy_meters",
        operator: "LESS_THAN",
        expected_value: "50",
        action_type: "BLOCK_TRANSITION",
        error_message: "Précision GPS insuffisante (> 50 m). Veuillez réitérer le relevé terrain en vue directe des satellites.",
        is_active: true,
        priority: 4,
        associated_processes: ["CYLINDER_ORDER", "TERMINAL_ORDER"],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "RULE_SLA_BREACH_ESCALATION",
        code: "RULE_SLA_BREACH_ESCALATION",
        title: "Escalade Automatique sur Forclusion SLA (> 48h)",
        description: "Transfère automatiquement l'alerte au supérieur hiérarchique si une demande reste sans instruction au-delà du délai SLA.",
        category: "SLA",
        trigger_event: "ON_SLA_BREACH",
        target_field: "sla_elapsed_hours",
        operator: "GREATER_THAN",
        expected_value: "48",
        action_type: "TRIGGER_ALERT",
        action_role: "Responsable d'équipe",
        error_message: "Dépassement du délai SLA de 48h. Dossier placé sous surveillance et escaladé.",
        is_active: true,
        priority: 5,
        associated_processes: ["ALL"],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "RULE_RGPD_EXT_CONTRACT_CHECK",
        code: "RULE_RGPD_EXT_CONTRACT_CHECK",
        title: "Contrôle Date Fin de Contrat Externe (Conformité RGPD)",
        description: "Interdit l'attribution d'un compte ou d'un badge à un prestataire externe si la date de fin de mission n'est pas renseignée.",
        category: "SECURITY",
        trigger_event: "ON_SUBMIT",
        target_field: "date_fin_mission",
        operator: "IS_NOT_EMPTY",
        expected_value: "",
        action_type: "BLOCK_TRANSITION",
        error_message: "La date de fin de mission est obligatoire pour les intervenants externes (règle RGPD).",
        is_active: true,
        priority: 6,
        associated_processes: ["USER_ACCOUNT"],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    }
];

export interface CustomStatusConfig {
    id: string;
    code: string;
    label: string;
    description: string;
    category: StatusCategory;
    specification_tag?: string;
    badge_bg: string;
    badge_text: string;
    badge_border?: string;
    icon_name: string;
    is_initial?: boolean;
    is_terminal?: boolean;
    sla_default_hours?: number;
    requires_comment_on_enter?: boolean;
    requires_document_on_enter?: boolean;
    notify_demandeur_on_enter?: boolean;
    notify_validator_on_enter?: boolean;
    allowed_transitions?: string[];
    associated_processes?: string[];
    is_system?: boolean;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

export let statusesDatabase: CustomStatusConfig[] = [
    {
        id: "DRAFT",
        code: "DRAFT",
        label: "Brouillon",
        description: "Dossier en cours de constitution par l'agent demandeur. Non encore soumis aux validateurs.",
        category: "INITIAL",
        badge_bg: "bg-gray-100",
        badge_text: "text-gray-700",
        badge_border: "border-gray-200",
        icon_name: "FileText",
        is_initial: true,
        is_terminal: false,
        sla_default_hours: 0,
        allowed_transitions: ["SUBMITTED", "ARCHIVED_ABANDONED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 1,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "SUBMITTED",
        code: "SUBMITTED",
        label: "Soumis (En attente d'instruction)",
        description: "Dossier officiellement déposé et horodaté. Transmission automatique au premier jalon d'approbation.",
        category: "INITIAL",
        badge_bg: "bg-blue-50",
        badge_text: "text-blue-700",
        badge_border: "border-blue-200",
        icon_name: "Send",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 24,
        notify_demandeur_on_enter: true,
        notify_validator_on_enter: true,
        allowed_transitions: ["PENDING_MANAGER", "PENDING_VAL_PARALLEL", "ESCALATED_NATIONAL", "PENDING_GDPR", "ARCHIVED_REJECTED", "ARCHIVED_ABANDONED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 2,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_MANAGER",
        code: "PENDING_MANAGER",
        label: "Validation Hiérarchique (Manager N+1)",
        category: "IN_REVIEW",
        description: "Examen hiérarchique du besoin opérationnel et conformité de la demande de l'agent.",
        badge_bg: "bg-blue-50",
        badge_text: "text-blue-700",
        badge_border: "border-blue-200",
        icon_name: "Clock",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 24,
        notify_validator_on_enter: true,
        allowed_transitions: ["PENDING_SITE", "PENDING_VAL_PARALLEL", "PENDING_CROSS_VAL", "ITEM_APPROVED", "ITEM_REJECTED", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 3,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_SITE",
        code: "PENDING_SITE",
        label: "Validation Technique & Sécurité Site",
        category: "IN_REVIEW",
        description: "Contrôle de sûreté ferroviaire et faisabilité technique par le gestionnaire de l'emprise ferroviaire.",
        badge_bg: "bg-amber-50",
        badge_text: "text-amber-700",
        badge_border: "border-amber-200",
        icon_name: "Shield",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 48,
        notify_validator_on_enter: true,
        allowed_transitions: ["ITEM_APPROVED", "ITEM_REJECTED", "PENDING_KEY_DECISION", "PENDING_QUOTE_PO", "ACTIVE_FULFILLED", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 4,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_VAL_PARALLEL",
        code: "PENDING_VAL_PARALLEL",
        label: "Validation Parallèle Multi-Sites",
        category: "IN_REVIEW",
        description: "Instruction simultanée et indépendante par chaque validateur de site désigné dans la demande.",
        badge_bg: "bg-amber-50",
        badge_text: "text-amber-700",
        badge_border: "border-amber-200",
        icon_name: "Layers",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 48,
        notify_validator_on_enter: true,
        allowed_transitions: ["ITEM_APPROVED", "ITEM_REJECTED", "ACTIVE_FULFILLED", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 5,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_CROSS_VAL",
        code: "PENDING_CROSS_VAL",
        label: "Validation Croisée Métier",
        category: "IN_REVIEW",
        description: "Double avis technique conjoint requis pour installations sensibles ou zones de sécurité.",
        badge_bg: "bg-purple-50",
        badge_text: "text-purple-700",
        badge_border: "border-purple-200",
        icon_name: "Shuffle",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 36,
        notify_validator_on_enter: true,
        allowed_transitions: ["ITEM_APPROVED", "ITEM_REJECTED", "ESCALATED_NATIONAL", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 6,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_GDPR",
        code: "PENDING_GDPR",
        label: "Charte RGPD Requise (Consentement)",
        category: "IN_REVIEW",
        description: "Attente de signature électronique de la charte de confidentialité et traitement des données personnelles.",
        badge_bg: "bg-indigo-50",
        badge_text: "text-indigo-700",
        badge_border: "border-indigo-200",
        icon_name: "Lock",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 48,
        notify_demandeur_on_enter: true,
        allowed_transitions: ["SUBMITTED", "PENDING_MANAGER", "ARCHIVED_ABANDONED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 7,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_KEY_DECISION",
        code: "PENDING_KEY_DECISION",
        label: "Décision Attribution Clé (Stock / Achat)",
        category: "IN_REVIEW",
        description: "Arbitrage matériel : réaffectation d'une clé en stock tampon ou déclenchement d'un bon de commande.",
        badge_bg: "bg-blue-100",
        badge_text: "text-blue-800",
        badge_border: "border-blue-300",
        icon_name: "Key",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 24,
        allowed_transitions: ["PENDING_QUOTE_PO", "ORDER_LINKED", "ACTIVE_FULFILLED", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 8,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "PENDING_QUOTE_PO",
        code: "PENDING_QUOTE_PO",
        label: "Attente Bon de Commande",
        category: "EXECUTION",
        description: "Demande de devis émise et attente d'engagement budgétaire.",
        badge_bg: "bg-yellow-50",
        badge_text: "text-yellow-800",
        badge_border: "border-yellow-300",
        icon_name: "Receipt",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 72,
        allowed_transitions: ["ORDER_LINKED", "DISPATCHED_IN_TRANSIT", "ARCHIVED_ABANDONED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 9,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ORDER_LINKED",
        code: "ORDER_LINKED",
        label: "Commande Fournisseur Rattachée",
        category: "EXECUTION",
        description: "Numéro de commande d'achat (PO) validé et transmis au fabricant pour fabrication ou programmation.",
        badge_bg: "bg-teal-50",
        badge_text: "text-teal-700",
        badge_border: "border-teal-200",
        icon_name: "CheckSquare",
        is_initial: false,
        is_terminal: false,
        allowed_transitions: ["DISPATCHED_IN_TRANSIT", "COMMISSIONING_GPS", "ACTIVE_FULFILLED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 10,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "DISPATCHED_IN_TRANSIT",
        code: "DISPATCHED_IN_TRANSIT",
        label: "Expédié / En Transit",
        category: "EXECUTION",
        description: "Matériel expédié par voie postale sécurisée avec numéro de suivi colis.",
        badge_bg: "bg-cyan-50",
        badge_text: "text-cyan-700",
        badge_border: "border-cyan-200",
        icon_name: "Truck",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 48,
        notify_demandeur_on_enter: true,
        allowed_transitions: ["COMMISSIONING_GPS", "ACTIVE_FULFILLED", "AUTO_ESCALATED_INCIDENT"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 11,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "COMMISSIONING_GPS",
        code: "COMMISSIONING_GPS",
        label: "Pose & Relevé GPS Requis",
        category: "EXECUTION",
        description: "Attente de fixation physique du cylindre ou cadenas et renseignement des coordonnées GPS de pose.",
        badge_bg: "bg-orange-50",
        badge_text: "text-orange-700",
        badge_border: "border-orange-200",
        icon_name: "MapPin",
        is_initial: false,
        is_terminal: false,
        sla_default_hours: 24,
        allowed_transitions: ["ACTIVE_FULFILLED", "INCIDENT_REPORTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 12,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ACTIVE_FULFILLED",
        code: "ACTIVE_FULFILLED",
        label: "Actif / Service Fait",
        category: "TERMINAL_SUCCESS",
        description: "Droits programmés avec succès sur la clé ou l'équipement. L'agent dispose de l'accès opérationnel.",
        badge_bg: "bg-emerald-50",
        badge_text: "text-emerald-700",
        badge_border: "border-emerald-200",
        icon_name: "CheckCircle2",
        is_initial: false,
        is_terminal: true,
        notify_demandeur_on_enter: true,
        allowed_transitions: ["INCIDENT_REPORTED", "ARCHIVED_COMPLETED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 13,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ITEM_APPROVED",
        code: "ITEM_APPROVED",
        label: "Accès Site Validé",
        category: "TERMINAL_SUCCESS",
        description: "Ligne ou site unitaire approuvé au sein d'un dossier parent multi-sites.",
        badge_bg: "bg-emerald-50",
        badge_text: "text-emerald-700",
        badge_border: "border-emerald-200",
        icon_name: "Check",
        is_initial: false,
        is_terminal: false,
        allowed_transitions: ["ACTIVE_FULFILLED", "COMMISSIONING_GPS"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 14,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ITEM_REJECTED",
        code: "ITEM_REJECTED",
        label: "Accès Site Refusé",
        category: "TERMINAL_REJECT",
        description: "Accès refusé pour un site donné par le validateur compétent avec motif obligatoire consigné.",
        badge_bg: "bg-rose-50",
        badge_text: "text-rose-700",
        badge_border: "border-rose-200",
        icon_name: "X",
        is_initial: false,
        is_terminal: false,
        requires_comment_on_enter: true,
        allowed_transitions: ["ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 15,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ESCALATED_NATIONAL",
        code: "ESCALATED_NATIONAL",
        label: "Arbitrage & Escalade Quota",
        category: "EXCEPTION",
        description: "Dossier transféré à la Direction Sûreté suite à dépassement de quota ou arbitrage.",
        badge_bg: "bg-red-50",
        badge_text: "text-red-700",
        badge_border: "border-red-200",
        icon_name: "AlertTriangle",
        is_initial: false,
        is_terminal: false,
        notify_validator_on_enter: true,
        allowed_transitions: ["PENDING_SITE", "ACTIVE_FULFILLED", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 16,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "AUTO_ESCALATED_INCIDENT",
        code: "AUTO_ESCALATED_INCIDENT",
        label: "Incident Déclaré / Relance Échue",
        category: "EXCEPTION",
        description: "Procédure d'alerte déclenchée automatiquement suite à signalement d'incident ou relance expirée.",
        badge_bg: "bg-red-100",
        badge_text: "text-red-800",
        badge_border: "border-red-300",
        icon_name: "AlertOctagon",
        is_initial: false,
        is_terminal: false,
        requires_comment_on_enter: true,
        notify_validator_on_enter: true,
        allowed_transitions: ["BLACKLIST_RESTRICTED", "ARCHIVED_COMPLETED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 17,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "INCIDENT_REPORTED",
        code: "INCIDENT_REPORTED",
        label: "Incident Signalé",
        category: "EXCEPTION",
        description: "Anomalie matérielle, dégradation ou suspicion de compromission enregistrée sur l'équipement.",
        badge_bg: "bg-rose-100",
        badge_text: "text-rose-800",
        badge_border: "border-rose-300",
        icon_name: "AlertCircle",
        is_initial: false,
        is_terminal: false,
        requires_comment_on_enter: true,
        allowed_transitions: ["BLACKLIST_RESTRICTED", "ACTIVE_FULFILLED", "ARCHIVED_COMPLETED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 18,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "BLACKLIST_RESTRICTED",
        code: "BLACKLIST_RESTRICTED",
        label: "Suspension & Révocation Sécurité",
        category: "EXCEPTION",
        description: "Révocation immédiate de l'accès et inscription au registre des suspensions de sécurité.",
        badge_bg: "bg-zinc-900",
        badge_text: "text-zinc-100",
        badge_border: "border-zinc-700",
        icon_name: "Slash",
        is_initial: false,
        is_terminal: false,
        requires_comment_on_enter: true,
        allowed_transitions: ["ARCHIVED_COMPLETED", "ARCHIVED_REJECTED"],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 19,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ARCHIVED_COMPLETED",
        code: "ARCHIVED_COMPLETED",
        label: "Archivé (Clôturé avec succès)",
        category: "ARCHIVED",
        description: "Intervention menée à terme, clé restituée et traçabilité archivée conformément à la directive NIS 2.",
        badge_bg: "bg-gray-200",
        badge_text: "text-gray-800",
        badge_border: "border-gray-300",
        icon_name: "Archive",
        is_initial: false,
        is_terminal: true,
        allowed_transitions: [],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 20,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ARCHIVED_REJECTED",
        code: "ARCHIVED_REJECTED",
        label: "Archivé (Refusé)",
        category: "ARCHIVED",
        description: "Demande ayant reçu un avis défavorable motivé. Fin définitive du circuit.",
        badge_bg: "bg-red-200",
        badge_text: "text-red-900",
        badge_border: "border-red-300",
        icon_name: "XCircle",
        is_initial: false,
        is_terminal: true,
        requires_comment_on_enter: true,
        allowed_transitions: [],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 21,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    },
    {
        id: "ARCHIVED_ABANDONED",
        code: "ARCHIVED_ABANDONED",
        label: "Archivé (Abandonné / Sans suite)",
        category: "ARCHIVED",
        description: "Demande annulée par l'agent demandeur ou expirée suite à forclusion du délai de complément.",
        badge_bg: "bg-gray-300",
        badge_text: "text-gray-900",
        badge_border: "border-gray-400",
        icon_name: "MinusCircle",
        is_initial: false,
        is_terminal: true,
        allowed_transitions: [],
        associated_processes: ["ALL"],
        is_system: true,
        display_order: 22,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
    }
];

export interface TeamMember {
    name: string;
    role_or_qualification: string;
    company?: string;
    email?: string;
    phone?: string;
}

export interface RequestItem {
    id: number;
    reference: string;
    title: string;
    description: string;
    status: string; // 'Brouillon' | 'En attente validation Manager' | 'En attente validation Site' | 'Complément requis' | 'Validée' | 'Refusée'
    current_stage_index: number;
    stages: ProcessStage[];
    demandeur_id?: number;
    demandeur_name?: string;
    demandeur_email?: string;
    beneficiaire_id: number;
    beneficiaire_name?: string;
    beneficiaire_service?: string;
    site_id?: number;
    site_name?: string;
    equipment_type?: string;
    intervention_duration?: string;
    is_team_request?: boolean;
    team_name?: string;
    team_company?: string;
    team_members?: TeamMember[];
    is_multi_site?: boolean;
    scope_type?: 'single_site' | 'multi_sites' | 'multi_regions';
    selected_site_ids?: number[];
    selected_sites?: { id: number; name: string; region: string }[];
    selected_regions?: string[];
    created_at: string;
    process_id?: number;
    process_name?: string;
    process_code?: string;
    form_id?: string;
    form_data?: Record<string, any>;
    document?: string | null;
    document_original_name?: string | null;
    document_size?: number | null;
    document_mimetype?: string | null;
    complement_request?: {
        requested_by: string;
        requested_at: string;
        message: string;
        response?: string;
        responded_at?: string;
    } | null;
    ai_analysis?: {
        risk_level: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
        urgency: string;
        compliance_check: string;
        key_points: string[];
        recommendation: string;
        analyzed_at: string;
    } | null;
}

export interface DecisionHistoryItem {
    id: number;
    reference: string;
    title: string;
    decision: string;
    author: string;
    date: string;
    motif?: string;
}

export const portalSitesDatabase: PortalSite[] = [

    {
        id: 1,
        code: "SITE-PARIS-NORD",
        name: "Paris Gare du Nord (Postes & Voies Banlieue/GL)",
        region: "Île-de-France",
        validator_id: 305,
        validator_name: "Valérie Validateur (Sécurité Site Nord)",
        normes_applicables: ["EN 15864", "EN 16864", "NIS 2"]
    },
    {
        id: 2,
        code: "SITE-CHATILLON-TGV",
        name: "Technicentre Châtillon TGV & Ligne Atlantique",
        region: "Île-de-France",
        validator_id: 306,
        validator_name: "Sylvain Sécurité (Patrimoine Châtillon)",
        normes_applicables: ["EN 15864", "EN 16864"]
    },
    {
        id: 3,
        code: "SITE-LYON-PD",
        name: "Gare de Lyon Part-Dieu & Ligne LGV Sud-Est",
        region: "Auvergne-Rhône-Alpes",
        validator_id: 307,
        validator_name: "Richard Rails (Sécurité Lyon)",
        normes_applicables: ["EN 15864", "EN 16864", "NIS 2"]
    },
    {
        id: 4,
        code: "SITE-MARSEILLE-STC",
        name: "Marseille Saint-Charles & Tunnel de la Nerthe",
        region: "PACA",
        validator_id: 308,
        validator_name: "Patricia Poste (Sécurité PACA)",
        normes_applicables: ["EN 15864", "EN 16864"]
    },
    {
        id: 5,
        code: "SITE-STRASBOURG-VOIE",
        name: "Centre Exploitation Voie Strasbourg & Ligne Rhénane",
        region: "Grand Est",
        validator_id: 305,
        validator_name: "Valérie Validateur (Sécurité Grand Est)",
        normes_applicables: ["EN 15864", "EN 16864"]
    }
];

export let auditLogs: AuditLog[] = [
    {
        id: 1,
        timestamp: new Date().toISOString(),
        actor: "Admin Système",
        role: "Administrateur",
        action: "INITIALISATION_SYSTEME",
        target: "System",
        details: "Démarrage du portail Portail Mécatronique V56 avec conformité NIS 2 et normes mécatroniques EN 15864 / EN 16864"
    }
];

export let rolesDatabase: Role[] = [
    {
        id: 1,
        name: "Administrateur",
        description: "Supervision globale, paramétrage des processus, gestion des tables et sécurité RBAC",
        privileges: ["view_dashboard", "manage_users", "manage_processes", "validate_requests", "view_all", "export_data", "manage_delegations"],
        portalTabs: {
            catalogue: true,
            'mes-demandes': true,
            corbeille: true,
            'historique-decisions': true,
            'tableau-de-bord': true,
            delegation: true,
            admin: true
        },
        tablePermissions: {
            requests: { see: true, modify: true, delete: true, create: true, dataScope: 'all', allowedFields: ['all'] },
            tables: { see: true, modify: true, delete: true, create: true, dataScope: 'all', allowedFields: ['all'] },
            processes: { see: true, modify: true, delete: true, create: true, dataScope: 'all', allowedFields: ['all'] },
            catalogues: { see: true, modify: true, delete: true, create: true, dataScope: 'all', allowedFields: ['all'] },
            users: { see: true, modify: true, delete: true, create: true, dataScope: 'all', allowedFields: ['all'] },
            roles: { see: true, modify: true, delete: true, create: true, dataScope: 'all', allowedFields: ['all'] },
            syslog: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['all'] }
        },
        referenceVisibilityRules: []
    },
    {
        id: 2,
        name: "Manager",
        description: "Validation hiérarchique N+1, suivi des demandes de service et des brigades",
        privileges: ["view_dashboard", "validate_requests", "view_team_requests"],
        portalTabs: {
            catalogue: true,
            'mes-demandes': true,
            corbeille: true,
            'historique-decisions': true,
            'tableau-de-bord': true,
            delegation: true,
            admin: false
        },
        tablePermissions: {
            requests: { see: true, modify: true, delete: false, create: true, dataScope: 'department', allowedFields: ['general', 'validation', 'documents'] },
            tables: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            processes: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            catalogues: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            users: { see: true, modify: false, delete: false, create: false, dataScope: 'department', allowedFields: ['general'] },
            roles: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
            syslog: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] }
        },
        referenceVisibilityRules: [
            {
                id: 'rule-mgr-1',
                tableId: 'directions',
                tableName: 'Directions Métier & Pôles Centraux',
                field: 'name',
                operator: 'in',
                values: ['Direction Générale Infrastructure'],
                scopeTargets: ['requests', 'sites', 'users', 'all'],
                label: 'Voir tout ce qui est rattaché à la Direction Générale Infrastructure'
            }
        ]
    },
    {
        id: 3,
        name: "Validateur Site",
        description: "Contrôle technique et de sûreté ferroviaire sur site mécatronique",
        privileges: ["view_dashboard", "validate_requests", "export_data"],
        portalTabs: {
            catalogue: true,
            'mes-demandes': true,
            corbeille: true,
            'historique-decisions': true,
            'tableau-de-bord': true,
            delegation: true,
            admin: false
        },
        tablePermissions: {
            requests: { see: true, modify: true, delete: false, create: false, dataScope: 'assigned_sites', allowedFields: ['general', 'validation', 'documents'] },
            tables: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            processes: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            catalogues: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            users: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
            roles: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
            syslog: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] }
        },
        referenceVisibilityRules: [
            {
                id: 'rule-val-1',
                tableId: 'regions',
                tableName: 'Régions & Pôles Territoriaux',
                field: 'name',
                operator: 'in',
                values: ['Île-de-France'],
                scopeTargets: ['requests', 'sites', 'users', 'all'],
                label: 'Voir tout ce qui est rattaché à la Région Île-de-France'
            }
        ]
    },
    {
        id: 4,
        name: "Demandeur",
        description: "Agent terrain créateur de demandes d'accès et d'intervention",
        privileges: ["view_dashboard", "create_request", "view_own_requests"],
        portalTabs: {
            catalogue: true,
            'mes-demandes': true,
            corbeille: false,
            'historique-decisions': false,
            'tableau-de-bord': true,
            delegation: false,
            admin: false
        },
        tablePermissions: {
            requests: { see: true, modify: true, delete: true, create: true, dataScope: 'own', allowedFields: ['general', 'documents'] },
            tables: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            processes: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            catalogues: { see: true, modify: false, delete: false, create: false, dataScope: 'all', allowedFields: ['general'] },
            users: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
            roles: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] },
            syslog: { see: false, modify: false, delete: false, create: false, dataScope: 'own', allowedFields: [] }
        },
        referenceVisibilityRules: []
    }
];

export let peopleFilterSettings: string[] = ['roles', 'services', 'regions', 'sites'];

export let usersDatabase: User[] = [
    { id: 1042, email: "daniel@entreprise.fr", role: "Demandeur", roles: ["Demandeur"], name: "Daniel Dupont", status: "Actif", attributes: { region: "Île-de-France", service: "Maintenance Voie", site: "Paris Gare du Nord (Postes & Voies Banlieue/GL)" } },
    { id: 201, email: "manager@entreprise.fr", role: "Manager", roles: ["Manager", "Demandeur"], name: "Marc Martin (Manager N+1)", status: "Actif", attributes: { region: "Île-de-France", service: "Maintenance Voie", site: "Technicentre Châtillon TGV & Ligne Atlantique" } },
    { id: 202, email: "sophie.manager@entreprise.fr", role: "Manager", roles: ["Manager"], name: "Sophie Simon (Manager Énergie)", status: "Actif", attributes: { region: "Île-de-France", service: "Caténaires & Traction", site: "Paris Gare du Nord (Postes & Voies Banlieue/GL)" } },
    { id: 305, email: "validateur@entreprise.fr", role: "Validateur Site", roles: ["Validateur Site"], name: "Valérie Validateur", status: "Actif", attributes: { region: "Île-de-France", service: "Sécurité & Patrimoine", site: "Paris Gare du Nord (Postes & Voies Banlieue/GL)" } },
    { id: 306, email: "sylvain.securite@entreprise.fr", role: "Validateur Site", roles: ["Validateur Site", "Manager"], name: "Sylvain Sécurité", status: "Actif", attributes: { region: "Île-de-France", service: "Sécurité & Patrimoine", site: "Technicentre Châtillon TGV & Ligne Atlantique" } },
    { id: 307, email: "richard.rails@entreprise.fr", role: "Validateur Site", roles: ["Validateur Site"], name: "Richard Rails", status: "Actif", attributes: { region: "Auvergne-Rhône-Alpes", service: "Exploitation & Circulation", site: "Gare de Lyon Part-Dieu & Ligne LGV Sud-Est" } },
    { id: 1, email: "admin@entreprise.fr", role: "Administrateur", roles: ["Administrateur", "Manager", "Validateur Site"], name: "Admin Système", status: "Actif", attributes: { region: "Île-de-France", service: "Télécoms & Mécatronique", site: "Paris Gare du Nord (Postes & Voies Banlieue/GL)" } }
];

export let categoriesDatabase: Category[] = [
    { id: 1, name: "Contrôle d'accès mécatronique", description: "Clés intelligentes, cylindres électroniques programmables et cadenas normés EN 15864 / EN 16864", status: "Actif", norm_reference: "EN 15864 / EN 16864" },
    { id: 2, name: "Habilitations & Droits d'accès", description: "Badges physiques RFID, autorisations d'emprise ferroviaire et habilitations électriques", status: "Actif", norm_reference: "Norme NFC 18-510" },
    { id: 3, name: "Outillage de Voie Sécurisé", description: "Coffres forts de cantonnement, clés d'interverrouillage et aiguillages télécommandés", status: "Actif", norm_reference: "Directive NIS 2" }
];

export let notificationTemplatesDatabase: NotificationTemplate[] = [
    {
        id: "tmpl_notif_sub_accuse",
        name: "Accusé de réception - Dépôt de Demande",
        category: "Dépôt & Soumission",
        description: "Accusé de réception automatique transmis au demandeur dès la soumission de son dossier",
        trigger_event: "on_submission",
        recipient_type: "demandeur",
        subject: "Portail Mécatronique : Enregistrement de votre demande {reference}",
        content: "Bonjour {utilisateur},\n\nVotre demande {reference} ({titre}) sur le site {site} a bien été enregistrée le {date} à {heure}.\n\nElle a été transmise pour instruction à l'étape {etape}. Vous serez notifié en direct de l'avancement de votre dossier.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_sub_manager",
        name: "Alerte pour validation N+1 à la soumission",
        category: "Circuit de Validation",
        description: "Avertit le manager ou approbateur de la première étape qu'un nouveau dossier requiert son arbitrage",
        trigger_event: "on_submission",
        recipient_type: "validator_current_stage",
        recipient_role: "Manager",
        subject: "Nouvelle demande {reference} déposée par {utilisateur} pour le site {site}",
        content: "Bonjour,\n\nL'agent {utilisateur} ({service}) a soumis la demande d'accès {reference} ({titre}) pour le site {site} le {date} à {heure}.\n\nMerci d'instruire l'étape {etape} dans le délai imparti de {sla_heures}h.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_stage_approved",
        name: "Notification d'étape validée au demandeur",
        category: "Circuit de Validation",
        description: "Informe le demandeur du passage avec succès d'un jalon de validation intermédiaire",
        trigger_event: "on_stage_approved",
        recipient_type: "demandeur",
        subject: "Étape {etape} validée pour votre demande {reference}",
        content: "Bonjour {utilisateur},\n\nVotre demande {reference} a passé avec succès l'étape '{etape}' auprès de {validateur} le {date} et poursuit son circuit vers le validateur suivant.",
        channel: "app",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_next_validator",
        name: "Passage de relais - Validateur étape suivante",
        category: "Circuit de Validation",
        description: "Alerte envoyée au validateur de l'étape suivante dès que le jalon précédent est franchi",
        trigger_event: "on_stage_approved",
        recipient_type: "validator_current_stage",
        subject: "Dossier à instruire : Demande {reference} en attente sur l'étape {etape}",
        content: "Bonjour,\n\nLa demande {reference} ({utilisateur} - site {site}) a reçu un avis favorable sur l'étape antérieure et attend votre validation sur l'étape {etape}.\n\nConsultez votre Corbeille pour examiner les pièces justificatives.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_final_approval",
        name: "Accord définitif et programmation de clé",
        category: "Décisions & Refus",
        description: "Notification de validation finale autorisant la remise de clé et l'accès physique",
        trigger_event: "on_final_approval",
        recipient_type: "demandeur",
        subject: "Demande {reference} VALIDÉE pour le site {site}",
        content: "Bonjour {utilisateur},\n\nVotre demande {reference} ({titre}) sur le site {site} a été validée avec succès par {validateur} le {date}.\n\nVos habilitations et clés mécatroniques sont désormais programmables.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_rejected",
        name: "Notification de refus motivé au demandeur",
        category: "Décisions & Refus",
        description: "Avis défavorable transmis à l'agent avec le motif explicatif",
        trigger_event: "on_rejected",
        recipient_type: "demandeur",
        subject: "Refus de la demande {reference} ({site})",
        content: "Bonjour {utilisateur},\n\nVotre demande {reference} pour le site {site} n'a pas pu être validée par {validateur}.\n\nMotif : \"{motif}\".\n\nVous pouvez consulter votre dossier sur Mes Demandes pour plus de précisions ou redéposer un dossier conforme.",
        channel: "both",
        urgent: true,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_complement",
        name: "Alerte de complément d'information requis",
        category: "Circuit de Validation",
        description: "Sollicitation d'informations ou de pièces jointes supplémentaires",
        trigger_event: "on_complement_requested",
        recipient_type: "demandeur",
        subject: "Complément requis sur la demande {reference} ({site})",
        content: "Bonjour {utilisateur},\n\n{validateur} ({role_validateur}) demande des informations complémentaires sur votre dossier {reference} :\n\n\"{motif}\"\n\nMerci d'apporter ces éléments sur le portail pour finaliser l'instruction.",
        channel: "app",
        urgent: true,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_sla_warning",
        name: "Alerte Dépassement SLA / Retard d'instruction",
        category: "Alertes SLA",
        description: "Notification d'urgence envoyée aux validateurs en cas de franchissement du délai contractuel",
        trigger_event: "on_sla_warning",
        recipient_type: "validator_current_stage",
        subject: "⚠️ Alerte Retard SLA : Demande {reference} ({site})",
        content: "Attention : La demande {reference} déposée par {utilisateur} pour le site {site} dépasse l'engagement SLA ({sla_heures}h) sur l'étape {etape}.\n\nMerci de traiter le dossier prioritairement.",
        channel: "both",
        urgent: true,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_ht_safety",
        name: "Alerte Sécurité Haute Tension Traction",
        category: "Sûreté & Sécurité",
        description: "Contrôle impératif d'habilitation électrique H0B0 / B1V pour zones sous tension",
        trigger_event: "on_submission",
        recipient_type: "role",
        recipient_role: "Manager",
        subject: "Alerte Sécurité HT : Demande {reference} soumise par {utilisateur}",
        content: "Attention : l'agent {utilisateur} a formulé une demande d'accès zone traction électrique {reference} sur le site {site} le {date}.\n\nVeuillez contrôler l'attestation réglementaire H0B0 / B1V avant validation.",
        channel: "both",
        urgent: true,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_complement_provided",
        name: "Complément d'information apporté par le demandeur",
        category: "Compléments de Dossier",
        description: "Alerte envoyée au validateur lorsque le demandeur a déposé les pièces ou explications demandées",
        trigger_event: "on_complement_submitted",
        recipient_type: "validator_current_stage",
        subject: "Complément fourni sur le dossier {reference} ({utilisateur})",
        content: "Bonjour,\n\nL'agent {utilisateur} a apporté les précisions attendues sur le dossier {reference} (Site : {site}) :\n\n\"{motif}\"\n\nLe dossier est de nouveau prêt pour votre évaluation.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_key_delivered",
        name: "Mise à disposition et programmation de clé mécatronique",
        category: "Clés & Habilitations",
        description: "Notification informant l'agent que sa clé mécatronique physique est disponible pour retrait",
        trigger_event: "on_key_delivered",
        recipient_type: "demandeur",
        subject: "Votre clé mécatronique {reference} est disponible au retrait",
        content: "Bonjour {utilisateur},\n\nVotre équipement mécatronique pour le site {site} a été programmé avec succès.\n\nVous pouvez retirer votre clé au guichet de sécurité ou auprès du gestionnaire de site muni de votre badge professionnel.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_key_returned",
        name: "Confirmation de restitution de clé mécatronique",
        category: "Clés & Habilitations",
        description: "Accusé de restitution et désactivation des droits d'accès après intervention",
        trigger_event: "on_key_returned",
        recipient_type: "demandeur",
        subject: "Restitution confirmée : Clé mécatronique {reference}",
        content: "Bonjour {utilisateur},\n\nLa restitution de votre clé mécatronique pour le site {site} a été enregistrée le {date}.\n\nLes droits d'accès associés ont été clôturés conformément à la norme EN 15864.",
        channel: "app",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_delegation_set",
        name: "Notification de délégation de validation accordée",
        category: "Délégations & Rôles",
        description: "Informe un collaborateur qu'une délégation de signature lui a été conférée",
        trigger_event: "on_delegation_set",
        recipient_type: "role",
        recipient_role: "Manager",
        subject: "Délégation de validation accordée sur le portail mécatronique",
        content: "Bonjour,\n\nUne délégation de validation d'accès vous a été attribuée. Vous pouvez désormais instruire et signer les demandes en attente au nom du titulaire depuis votre Corbeille.",
        channel: "both",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_cancelled",
        name: "Annulation de demande par le demandeur",
        category: "Dépôt & Soumission",
        description: "Avertit les validateurs qu'un dossier en cours a été annulé ou retiré",
        trigger_event: "on_cancelled",
        recipient_type: "validator_current_stage",
        subject: "Demande {reference} annulée par {utilisateur}",
        content: "Bonjour,\n\nLa demande {reference} déposée par {utilisateur} pour le site {site} a été annulée. Aucune action n'est plus requise sur ce dossier.",
        channel: "app",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_request_edited",
        name: "Notification de modification du dossier",
        category: "Dépôt & Soumission",
        description: "Informe les parties prenantes lorsqu'un paramètre clé du dossier a été mis à jour",
        trigger_event: "on_request_edited",
        recipient_type: "demandeur",
        subject: "Mise à jour des informations du dossier {reference}",
        content: "Bonjour {utilisateur},\n\nLes informations de votre demande {reference} (Site : {site}) ont été mises à jour sur le portail le {date}.\n\nConsultez votre espace Mes Demandes pour vérifier les détails révisés.",
        channel: "app",
        urgent: false,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    },
    {
        id: "tmpl_notif_security_alert",
        name: "Alerte de Sûreté / Détection d'anomalie",
        category: "Sûreté & Sécurité",
        description: "Alerte prioritaire générée en cas d'incohérence, d'évaluation de risque élevé ou d'incident",
        trigger_event: "on_security_alert",
        recipient_type: "role",
        recipient_role: "Validateur Site",
        subject: "🚨 ALERTE SÛRETÉ : Anomalie détectée sur la demande {reference}",
        content: "ATTENTION SÉCURITÉ FERROVIAIRE :\n\nUne alerte de sûreté a été enregistrée sur le dossier {reference} concernant le site {site} :\n\"{motif}\"\n\nUn contrôle approfondi des habilitations et de l'habilitation électrique est impératif.",
        channel: "both",
        urgent: true,
        active: true,
        is_system: true,
        updated_at: "2026-03-15T10:00:00Z"
    }
];

export let processTemplates: ProcessTemplate[] = [
    {
        id: 1,
        name: "Demande de clé mécatronique standard",
        category_id: 1,
        description: "Attribution d'une clé programmable pour accès aux installations techniques de voies et postes de signalisation",
        status: "Publié",
        request_type: "KEY_ORDER",
        has_special_tag: false,
        workflow_rules: {
            validation_mode: "PARALLEL_ITEMS",
            sla_hours: 48,
            requires_gps: false,
            check_quota: true,
            custom_quota_limit: 3,
            quota_period_months: 12,
            requires_quote_po: false,
            requires_gdpr: true,
            requires_special_tag: false
        },
        linked_tables: ["sites", "services", "regions", "equipments"],
        stages: [
            { id: "s1", order: 1, name: "Validation Hiérarchique (Manager N+1)", validator_role: "Manager", sla_hours: 24, requires_document: false },
            { id: "s2", order: 2, name: "Validation Technique & Sécurité (Validateur Site)", validator_role: "Validateur Site", sla_hours: 48, requires_document: true }
        ],
        fields: [
            { id: "site_id", label: "Site Ferroviaire d'intervention", type: "select", table_ref: "sites", required: true },
            { id: "equipment_type", label: "Type d'équipement mécatronique", type: "select", table_ref: "equipments", required: true },
            { id: "service", label: "Service / Direction Référente", type: "select", table_ref: "services", required: false },
            { id: "region", label: "Région Territoriale", type: "select", table_ref: "regions", required: false },
            { id: "intervention_duration", label: "Durée d'intervention requise", type: "select", options: "Ponctuelle (24h),Hebdomadaire (7 jours),Mensuelle (30 jours),Annuelle (Habilitation permanente)", required: true }
        ],
        notifications: [
            {
                id: "p1_notif_1",
                template_id: "tmpl_notif_sub_manager",
                stage_id: "s1",
                active: true
            },
            {
                id: "p1_notif_2",
                template_id: "tmpl_notif_final_approval",
                stage_id: "all",
                active: true
            },
            {
                id: "p1_notif_3",
                template_id: "tmpl_notif_stage_approved",
                stage_id: "all",
                active: true
            },
            {
                id: "p1_notif_4",
                template_id: "tmpl_notif_rejected",
                stage_id: "all",
                active: true
            },
            {
                id: "p1_notif_5",
                template_id: "tmpl_notif_complement",
                stage_id: "all",
                active: true
            }
        ]
    },
    {
        id: 2,
        name: "Habilitation d'accès en zone de traction électrique",
        category_id: 2,
        description: "Accès haute tension caténaire et sous-stations électriques (nécessite attestation H0B0 / B1V)",
        status: "Publié",
        request_type: "HABILITATION",
        has_special_tag: true,
        workflow_rules: {
            validation_mode: "CROSS_VALIDATION",
            sla_hours: 24,
            requires_gps: false,
            check_quota: false,
            requires_quote_po: false,
            requires_gdpr: true,
            requires_special_tag: true,
            special_tag_label: "HABILITATION_HT_TRACTION"
        },
        linked_tables: ["sites", "services", "qualifications"],
        stages: [
            { id: "s1", order: 1, name: "Validation Manager Pôle Énergie", validator_role: "Manager", sla_hours: 24, requires_document: true },
            { id: "s2", order: 2, name: "Validation Responsable Sécurité Électrique Site", validator_role: "Validateur Site", sla_hours: 24, requires_document: true }
        ],
        fields: [
            { id: "site_id", label: "Site d'intervention", type: "select", table_ref: "sites", required: true },
            { id: "qualification", label: "Habilitation de Sécurité", type: "select", table_ref: "qualifications", required: true }
        ],
        notifications: [
            {
                id: "p2_notif_1",
                template_id: "tmpl_notif_ht_safety",
                stage_id: "s1",
                active: true
            },
            {
                id: "p2_notif_2",
                template_id: "tmpl_notif_sub_accuse",
                stage_id: "all",
                active: true
            },
            {
                id: "p2_notif_3",
                template_id: "tmpl_notif_final_approval",
                stage_id: "all",
                active: true
            }
        ]
    }
];

export let referenceTablesDatabase: CustomTable[] = [
    {
        id: "sites",
        name: "Sites Ferroviaires & Établissements",
        description: "Gares, technicentre, postes d'aiguillage et sous-stations sous contrôle d'accès",
        icon: "Building2",
        category: "Infrastructure",
        is_system: true,
        allow_multiple: true,
        grouping_column: "region",
        show_in_forms: true,
        form_field_label: "Périmètre d'Intervention Géographique",
        form_help_text: "Sélectionnez un site unitaire, plusieurs emprises ferroviaires ou un ensemble de régions",
        is_required: true,
        metadata_fields: [
            { key: "tags", label: "Étiquettes / Tags", type: "tags", options: ["Prioritaire", "Audit 2026", "Zone Sensible", "LGV", "Conforme NIS2"], target: "both", colorScheme: "purple" }
        ],
        metadata: {
            tags: ["Zone Sensible", "Conforme NIS2", "Prioritaire"],
            sub_category: "Gare Voyageurs",
            security_level: "Niveau 3 - Vital Réseau",
            last_audit: "2026-03-01",
            contact_email: "surete.ferroviaire@entreprise.fr"
        },
        columns: [
            { key: "code", label: "Code Site", type: "text", required: true },
            { key: "name", label: "Nom de l'établissement", type: "text", required: true },
            { key: "region", label: "Région", type: "select", options: ["Île-de-France", "Auvergne-Rhône-Alpes", "Grand Est", "PACA", "Nouvelle-Aquitaine", "Hauts-de-France", "Occitanie"], required: true },
            { key: "sub_category", label: "Catégorie d'Établissement", type: "select", table_ref: "categories_etablissement", display_field: "name", required: false, description: "Type d'établissement lié au référentiel des catégories" },
            { key: "security_level", label: "Niveau de Sécurité", type: "select", table_ref: "niveaux_securite", display_field: "name", required: false, description: "Niveau de sûreté ferroviaire lié au référentiel des niveaux de sécurité" },
            { key: "validator_name", label: "Validateur Référent", type: "text" },
            { key: "normes_applicables", label: "Normes Mécatroniques", type: "text" }
        ],
        rows: [
            { id: 1, code: "SITE-PARIS-NORD", name: "Paris Gare du Nord (Postes & Voies Banlieue/GL)", region: "Île-de-France", validator_name: "Valérie Validateur (Sécurité Site Nord)", normes_applicables: "EN 15864, EN 16864, NIS 2", tags: ["Prioritaire", "Zone Sensible"], sub_category: "Gare Voyageurs", security_level: "Niveau 3 - Vital Réseau" },
            { id: 2, code: "SITE-CHATILLON-TGV", name: "Technicentre Châtillon TGV & Ligne Atlantique", region: "Île-de-France", validator_name: "Sylvain Sécurité (Patrimoine Châtillon)", normes_applicables: "EN 15864, EN 16864", tags: ["LGV", "Audit 2026"], sub_category: "Technicentre Matériel", security_level: "Niveau 2 - Restreint" },
            { id: 3, code: "SITE-LYON-PD", name: "Gare de Lyon Part-Dieu & Ligne LGV Sud-Est", region: "Auvergne-Rhône-Alpes", validator_name: "Richard Rails (Sécurité Lyon)", normes_applicables: "EN 15864, EN 16864, NIS 2", tags: ["LGV", "Prioritaire", "Conforme NIS2"], sub_category: "Gare Voyageurs", security_level: "Niveau 3 - Vital Réseau" },
            { id: 4, code: "SITE-MARSEILLE-STC", name: "Marseille Saint-Charles & Tunnel de la Nerthe", region: "PACA", validator_name: "Patricia Poste (Sécurité PACA)", normes_applicables: "EN 15864, EN 16864", tags: ["Zone Sensible"], sub_category: "Gare Voyageurs", security_level: "Niveau 2 - Restreint" },
            { id: 5, code: "SITE-STRASBOURG-VOIE", name: "Centre Exploitation Voie Strasbourg & Ligne Rhénane", region: "Grand Est", validator_name: "Valérie Validateur (Sécurité Grand Est)", normes_applicables: "EN 15864, EN 16864", tags: ["Conforme NIS2"], sub_category: "Poste d'Aiguillage", security_level: "Niveau 2 - Restreint" }
        ]
    },
    {
        id: "categories_etablissement",
        name: "Catégories d'Établissement",
        description: "Référentiel des types d'emprises et établissements ferroviaires (ERP gares, technicentres, postes d'aiguillage, sous-stations)",
        icon: "Building2",
        category: "Infrastructure",
        is_system: false,
        allow_multiple: false,
        grouping_column: "classification",
        show_in_forms: true,
        form_field_label: "Catégorie d'Établissement",
        form_help_text: "Type d'établissement ou emprise ferroviaire d'intervention",
        is_required: true,
        columns: [
            { key: "code", label: "Code Catégorie", type: "text", required: true, description: "Code unique de la catégorie" },
            { key: "name", label: "Libellé de la catégorie", type: "text", required: true, description: "Intitulé complet de l'établissement" },
            { key: "classification", label: "Régime Juridique & Bâtiment", type: "select", options: ["ERP 1ère à 4ème Catégorie", "Bâtiment Industriel & Maintenance", "Poste & Emprise Exploitation Voie", "Installation Électrique HT Ferroviaire", "Bâtiment Logistique & Fret", "Immeuble de Grande Hauteur (IGH)"], required: true },
            { key: "public_admis", label: "Accueil du Public", type: "select", options: ["Oui (Public Large)", "Non (Strictement Réservé)", "Personnel & Prestataires Agréés", "Restreint / Visite Encadrée"], required: true },
            { key: "norme_securite", label: "Référence Normative", type: "text", required: false, description: "Arrêté, norme EN ou consigne RGS applicable" },
            { key: "criticite_defaut", label: "Niveau de Criticité Par Défaut", type: "select", options: ["Standard", "Restreint", "Vital Réseau (NIS 2)"], required: true },
            { key: "description", label: "Description & Modalités d'accès", type: "text", required: false }
        ],
        rows: [
            { id: 1, code: "GARE-VOY", name: "Gare Voyageurs", classification: "ERP 1ère à 4ème Catégorie", public_admis: "Oui (Public Large)", norme_securite: "Arrêté du 25 juin 1980 / ERP GA", criticite_defaut: "Vital Réseau (NIS 2)", description: "Gares et haltes voyageurs grandes lignes, régionales TER et Transilien avec flux voyageurs important." },
            { id: 2, code: "TECH-MAT", name: "Technicentre Matériel", classification: "Bâtiment Industriel & Maintenance", public_admis: "Personnel & Prestataires Agréés", norme_securite: "Code du Travail / RGS Standard IN 1414", criticite_defaut: "Restreint", description: "Ateliers de maintenance lourde, voies de remisage et fosses de visite du matériel roulant." },
            { id: 3, code: "POSTE-AIG", name: "Poste d'Aiguillage", classification: "Poste & Emprise Exploitation Voie", public_admis: "Non (Strictement Réservé)", norme_securite: "RGS IN 0013 / Directive NIS 2", criticite_defaut: "Vital Réseau (NIS 2)", description: "Postes d'aiguillage informatisés (PAI), mécaniques et commande centralisée du réseau." },
            { id: 4, code: "SS-ELEC", name: "Sous-Station Électrique", classification: "Installation Électrique HT Ferroviaire", public_admis: "Non (Strictement Réservé)", norme_securite: "NF C 15-100 / EN 50122-1 / UTE C 18-510", criticite_defaut: "Vital Réseau (NIS 2)", description: "Sous-stations de transformation haute tension et sectionneurs caténaires 1500V / 25kV." },
            { id: 5, code: "FRET-LOG", name: "Plateforme Fret", classification: "Bâtiment Logistique & Fret", public_admis: "Personnel & Prestataires Agréés", norme_securite: "Réglementation ICPE / RGS Fret", criticite_defaut: "Standard", description: "Gares de triage, terminaux combinés conteneurs et cours de débord fret." },
            { id: 6, code: "IGH-ADM", name: "Tour Administrative / IGH", classification: "Immeuble de Grande Hauteur (IGH)", public_admis: "Restreint / Visite Encadrée", norme_securite: "Arrêté IGH du 30 décembre 2011", criticite_defaut: "Restreint", description: "Immeubles tertiaires et sièges de direction d'exploitation ferroviaire." }
        ]
    },
    {
        id: "niveaux_securite",
        name: "Niveaux de Sécurité",
        description: "Référentiel des niveaux de sécurité, seuils d'habilitation mécatronique et exigences réglementaires NIS 2",
        icon: "Shield",
        category: "Sécurité",
        is_system: false,
        allow_multiple: false,
        grouping_column: "exigence_nis2",
        show_in_forms: true,
        form_field_label: "Niveau de Sécurité Requis",
        form_help_text: "Seuil de sûreté et préavis exigés pour l'accès aux emprises",
        is_required: true,
        columns: [
            { key: "code", label: "Code Niveau", type: "text", required: true, description: "Identifiant normalisé du niveau" },
            { key: "name", label: "Libellé du Niveau", type: "text", required: true, description: "Désignation claire du niveau de sécurité" },
            { key: "badge_color", label: "Couleur de Badge", type: "select", options: ["emerald", "blue", "amber", "rose", "purple"], required: true },
            { key: "delai_preavis", label: "Délai de Préavis d'Accès", type: "select", options: ["Sans préavis (Immédiat)", "24h à l'avance", "48h à l'avance", "72h à l'avance", "7 jours ouvrés"], required: true },
            { key: "exigence_nis2", label: "Exigence Directive NIS 2", type: "select", options: ["Non Concerné", "Mesures Standard NIS 2", "Entité Essentielle NIS 2 (Obligatoire)"], required: true },
            { key: "escorte_requise", label: "Escorte ou Surveillance", type: "select", options: ["Non", "Agent d'accompagnement recommandé", "Escorte de sûreté obligatoire", "Garde permanent sur zone"], required: true },
            { key: "double_validation", label: "Double Validation Hiérarchique", type: "select", options: ["Non", "Oui (Validateur N+1)", "Oui (Validateur N+1 + Pôle Sûreté)"], required: true },
            { key: "description", label: "Exigences & Consignes de Sûreté", type: "text", required: false }
        ],
        rows: [
            { id: 1, code: "SEC-N1", name: "Niveau 1 - Standard", badge_color: "blue", delai_preavis: "24h à l'avance", exigence_nis2: "Non Concerné", escorte_requise: "Non", double_validation: "Non", description: "Accès aux emprises à faible criticité avec titre d'habilitation mécatronique ordinaire." },
            { id: 2, code: "SEC-N2", name: "Niveau 2 - Restreint", badge_color: "amber", delai_preavis: "48h à l'avance", exigence_nis2: "Mesures Standard NIS 2", escorte_requise: "Agent d'accompagnement recommandé", double_validation: "Oui (Validateur N+1)", description: "Accès aux zones techniques protégées, ateliers et installations à risque modéré." },
            { id: 3, code: "SEC-N3", name: "Niveau 3 - Vital Réseau", badge_color: "rose", delai_preavis: "72h à l'avance", exigence_nis2: "Entité Essentielle NIS 2 (Obligatoire)", escorte_requise: "Escorte de sûreté obligatoire", double_validation: "Oui (Validateur N+1 + Pôle Sûreté)", description: "Emprises ferroviaires critiques : postes d'aiguillage, sous-stations électriques et centres de gestion des circulations." },
            { id: 4, code: "SEC-N4", name: "Niveau 4 - Point d'Importance Vitale (PIV)", badge_color: "purple", delai_preavis: "7 jours ouvrés", exigence_nis2: "Entité Essentielle NIS 2 (Obligatoire)", escorte_requise: "Garde permanent sur zone", double_validation: "Oui (Validateur N+1 + Pôle Sûreté)", description: "Sites classés Point d'Importance Vitale ou Secret Défense soumis à agrément ministériel et enquête administrative préalable." }
        ]
    },
    {
        id: "roles",
        name: "Rôles & Niveaux d'Accès",
        description: "Rôles organisationnels et profils de validation du système",
        icon: "Shield",
        category: "Sécurité",
        is_system: true,
        columns: [
            { key: "name", label: "Intitulé du Rôle", type: "text", required: true },
            { key: "privileges", label: "Privilèges accordés", type: "text", required: true },
            { key: "description", label: "Description du périmètre", type: "text" }
        ],
        rows: [
            { id: 1, name: "Administrateur", privileges: "view_dashboard, manage_users, manage_processes, validate_requests, view_all, export_data, manage_delegations", description: "Supervision globale, paramétrage des processus et gestion des tables" },
            { id: 2, name: "Manager", privileges: "view_dashboard, validate_requests, view_team_requests", description: "Validation hiérarchique N+1 des équipes de maintenance" },
            { id: 3, name: "Validateur Site", privileges: "view_dashboard, validate_requests, export_data", description: "Validation technique et de sûreté ferroviaire sur le site physique" },
            { id: 4, name: "Demandeur", privileges: "view_dashboard, create_request, view_own_requests", description: "Agent ou brigade sollicitant des accès aux équipements mécatroniques" }
        ]
    },
    {
        id: "services",
        name: "Services & Directions Métier",
        description: "Directions techniques, brigades et départements opérationnels Portail Mécatronique",
        icon: "Briefcase",
        category: "Organisation",
        is_system: false,
        columns: [
            { key: "code", label: "Code Service", type: "text", required: true },
            { key: "name", label: "Libellé du Service", type: "text", required: true },
            { key: "direction", label: "Direction de rattachement", type: "text" },
            { key: "responsable", label: "Responsable de Service", type: "text" }
        ],
        rows: [
            { id: 1, code: "SRV-VOIE", name: "Maintenance Voie", direction: "Direction Générale Infrastructure", responsable: "Marc Martin" },
            { id: 2, code: "SRV-CATENAIRES", name: "Caténaires & Traction", direction: "Direction Énergie & Traction", responsable: "Sophie Simon" },
            { id: 3, code: "SRV-SIGNA", name: "Signalisation & Postes", direction: "Direction des Installations de Sécurité", responsable: "Jean Signal" },
            { id: 4, code: "SRV-TELECOM", name: "Télécoms & Mécatronique", direction: "Direction Télécoms & Systèmes", responsable: "Alice Hertz" },
            { id: 5, code: "SRV-SURETE", name: "Sécurité & Patrimoine", direction: "Direction Sûreté Ferroviaire", responsable: "Valérie Validateur" },
            { id: 6, code: "SRV-EXPLOIT", name: "Exploitation & Circulation", direction: "Direction Exploitation Réseau", responsable: "Gérard Gare" }
        ]
    },
    {
        id: "regions",
        name: "Régions & Pôles Territoriaux",
        description: "Découpage territorial et directions de zone d'ingénierie",
        icon: "MapPin",
        category: "Organisation",
        is_system: false,
        columns: [
            { key: "code", label: "Code Région", type: "text", required: true },
            { key: "name", label: "Nom de la Région", type: "text", required: true },
            { key: "pole", label: "Pôle Territorial", type: "text" },
            { key: "contact", label: "Contact d'Astreinte", type: "text" }
        ],
        rows: [
            { id: 1, code: "REG-IDF", name: "Île-de-France", pole: "Zone Territoriale Paris & Couronne", contact: "astreinte.idf@entreprise.fr" },
            { id: 2, code: "REG-ARA", name: "Auvergne-Rhône-Alpes", pole: "Zone Territoriale Sud-Est", contact: "astreinte.ara@entreprise.fr" },
            { id: 3, code: "REG-GES", name: "Grand Est", pole: "Zone Territoriale Est & Rhin", contact: "astreinte.ges@entreprise.fr" },
            { id: 4, code: "REG-PAC", name: "PACA", pole: "Zone Territoriale Méditerranée", contact: "astreinte.paca@entreprise.fr" },
            { id: 5, code: "REG-NAQ", name: "Nouvelle-Aquitaine", pole: "Zone Territoriale Atlantique", contact: "astreinte.naq@entreprise.fr" },
            { id: 6, code: "REG-HDF", name: "Hauts-de-France", pole: "Zone Territoriale Nord", contact: "astreinte.hdf@entreprise.fr" }
        ]
    },
    {
        id: "directions",
        name: "Directions Métier & Pôles Centraux",
        description: "Grandes directions opérationnelles et d'ingénierie ferroviaire Portail Mécatronique",
        icon: "Compass",
        category: "Organisation",
        is_system: false,
        columns: [
            { key: "code", label: "Code Direction", type: "text", required: true },
            { key: "name", label: "Nom de la Direction", type: "text", required: true },
            { key: "pole", label: "Pôle d'Activité", type: "text" },
            { key: "directeur", label: "Directeur Référent", type: "text" }
        ],
        rows: [
            { id: 1, code: "DIR-INFRA", name: "Direction Générale Infrastructure", pole: "Infrastructures & Voies", directeur: "Marc Martin" },
            { id: 2, code: "DIR-ENERGIE", name: "Direction Énergie & Traction", pole: "Traction Électrique & Sous-stations", directeur: "Sophie Simon" },
            { id: 3, code: "DIR-SECURITE", name: "Direction des Installations de Sécurité", pole: "Signalisation & Automatismes", directeur: "Jean Signal" },
            { id: 4, code: "DIR-SURETE", name: "Direction Sûreté Ferroviaire", pole: "Sûreté, Emprises & Contrôle d'Accès", directeur: "Valérie Validateur" },
            { id: 5, code: "DIR-TELECOM", name: "Direction Télécoms & Systèmes", pole: "Télécommunications & Mécatronique", directeur: "Alice Hertz" },
            { id: 6, code: "DIR-EXPLOIT", name: "Direction Exploitation Réseau", pole: "Circulation & Gestion des Voies", directeur: "Gérard Gare" }
        ]
    },
    {
        id: "equipments",
        name: "Types d'Équipements Mécatroniques",
        description: "Catalogue des serrures, clés programmables, cylindres et cadenas normés",
        icon: "Cpu",
        category: "Matériel",
        is_system: false,
        allow_multiple: true,
        show_in_forms: true,
        form_field_label: "Type d'équipement mécatronique",
        form_help_text: "Clés électroniques programmables ou cylindres nécessaires",
        is_required: true,
        columns: [
            { key: "code", label: "Code Matériel", type: "text", required: true },
            { key: "name", label: "Désignation", type: "text", required: true },
            { key: "norme", label: "Norme de Conformité", type: "text" },
            { key: "criticity", label: "Niveau de Criticité", type: "select", options: ["Faible", "Modéré", "Élevé", "Critique"] }
        ],
        rows: [
            { id: 1, code: "EQ-CLE-15864", name: "Clé Mécatronique EN 15864", norme: "EN 15864 / NIS 2", criticity: "Critique" },
            { id: 2, code: "EQ-CYL-16864", name: "Cylindre Électronique EN 16864", norme: "EN 16864", criticity: "Élevé" },
            { id: 3, code: "EQ-CAD-BLE", name: "Cadenas Bluetooth Haute Sécurité", norme: "ISO 17712", criticity: "Élevé" },
            { id: 4, code: "EQ-SER-ELEC", name: "Serrure Électromécanique Connectée", norme: "EN 12209", criticity: "Modéré" },
            { id: 5, code: "EQ-BOX-CONS", name: "Boîtier de Consignation Traction 1500V", norme: "NFC 18-510", criticity: "Critique" }
        ]
    },
    {
        id: "durations",
        name: "Durées d'Intervention & Plages d'Accès",
        description: "Validités temporelles programmables sur les clés mécatroniques",
        icon: "Clock",
        category: "Processus",
        is_system: true,
        allow_multiple: false,
        show_in_forms: true,
        form_field_label: "Plage d'activation souhaitée",
        form_help_text: "Durée de validité temporelle avant expiration mécatronique",
        is_required: true,
        columns: [
            { key: "code", label: "Code Plage", type: "text", required: true },
            { key: "name", label: "Intitulé complet", type: "text", required: true },
            { key: "duration_hours", label: "Heures d'activation", type: "number", required: true },
            { key: "is_restricted", label: "Réservé chef de brigade", type: "boolean" }
        ],
        rows: [
            { id: 1, code: "DUR-24H", name: "Ponctuelle (24h)", duration_hours: 24, is_restricted: false },
            { id: 2, code: "DUR-7J", name: "Hebdomadaire (7 jours)", duration_hours: 168, is_restricted: false },
            { id: 3, code: "DUR-30J", name: "Mensuelle (30 jours)", duration_hours: 720, is_restricted: false },
            { id: 4, code: "DUR-1AN", name: "Permanente (1 an)", duration_hours: 8760, is_restricted: true }
        ]
    },
    {
        id: "contractors",
        name: "Prestataires & Entreprises Agréées",
        description: "Entreprises extérieures, sous-traitants et prestataires ferroviaires habilités",
        icon: "Users",
        category: "Partenaires",
        is_system: false,
        allow_multiple: false,
        show_in_forms: true,
        form_field_label: "Entreprise / Prestataire Extérieur",
        form_help_text: "Entreprise titulaire du marché de travaux",
        is_required: false,
        columns: [
            { key: "code", label: "Code Prestataire", type: "text", required: true },
            { key: "name", label: "Raison Sociale", type: "text", required: true },
            { key: "siret", label: "SIRET / Identifiant", type: "text" },
            { key: "safety_certified", label: "Agrément Sécurité Valide", type: "boolean" },
            { key: "contact_email", label: "Email Contact", type: "email" }
        ],
        rows: [
            { id: 1, code: "PR-INFRA", name: "Infralog Réseau", siret: "41228073700018", safety_certified: true, contact_email: "contact@infralog.entreprise.fr" },
            { id: 2, code: "PR-COLAS-RAIL", name: "Colas Rail", siret: "32999009800045", safety_certified: true, contact_email: "securite@colasrail.com" },
            { id: 3, code: "PR-ETF", name: "ETF Ferroviaire", siret: "44455566600021", safety_certified: true, contact_email: "direction@etf.fr" },
            { id: 4, code: "PR-TSO", name: "TSO Caténaires & Voies", siret: "77788899900012", safety_certified: true, contact_email: "operations@tso.fr" },
            { id: 5, code: "PR-ALSTOM", name: "Alstom Transport Services", siret: "38905844000109", safety_certified: true, contact_email: "service.rail@alstomgroup.com" }
        ]
    },
    {
        id: "qualifications",
        name: "Habilitations & Titres de Sécurité",
        description: "Habilitations électriques et autorisations d'emprise ferroviaire",
        icon: "CheckCircle",
        category: "Sécurité",
        is_system: false,
        allow_multiple: true,
        show_in_forms: true,
        form_field_label: "Habilitations & Titres de Sécurité",
        form_help_text: "Qualifications exigées pour l'emprise concernée",
        is_required: false,
        columns: [
            { key: "code", label: "Code Habilitation", type: "text", required: true },
            { key: "name", label: "Intitulé", type: "text", required: true },
            { key: "validity_months", label: "Validité (mois)", type: "number" },
            { key: "safety_level", label: "Niveau Exigé", type: "select", options: ["Niveau 1 (Base)", "Niveau 2 (Opérateur)", "Niveau 3 (Chef de manœuvre)", "Haute Tension H0B0/B1V"] }
        ],
        rows: [
            { id: 1, code: "HAB-H0B0", name: "C18 H0B0 (Sécurité Électrique)", validity_months: 36, safety_level: "Haute Tension H0B0/B1V" },
            { id: 2, code: "HAB-TESM", name: "TES M (Travaux Emprise Sécurisée)", validity_months: 24, safety_level: "Niveau 2 (Opérateur)" },
            { id: 3, code: "HAB-OP-V2", name: "Opérateur Voie Niveau 2", validity_months: 12, safety_level: "Niveau 2 (Opérateur)" },
            { id: 4, code: "HAB-NIS2", name: "Habilitation Mécatronique NIS 2", validity_months: 12, safety_level: "Niveau 3 (Chef de manœuvre)" }
        ]
    }
];

export let userAttributesSchema = [
    { id: "region", label: "Région", type: "select", options: "Île-de-France,Auvergne-Rhône-Alpes,Grand Est,PACA,Nouvelle-Aquitaine" },
    { id: "service", label: "Direction / Service Métier", type: "select", options: "Maintenance Voie,Caténaires & Traction,Signalisation & Postes,Télécoms & Mécatronique,Sécurité & Patrimoine" }
];

export let requestsDB: RequestItem[] = [
    {
        id: 1001,
        reference: "REQ-2026-1001",
        title: "Clé Mécatronique - Poste Aiguillage Paris Nord",
        description: "Remplacement d'urgence d'une clé mécatronique pour intervention de nuit sur les signaux S12 et S14 en gare de Paris Nord.",
        status: "En attente validation Site",
        current_stage_index: 1,
        beneficiaire_id: 1042,
        beneficiaire_name: "Daniel Dupont",
        beneficiaire_service: "Maintenance Voie",
        site_id: 1,
        site_name: "Paris Gare du Nord (Postes & Voies Banlieue/GL)",
        equipment_type: "Clé Mécatronique EN 15864",
        stages: [
            {
                id: "s1",
                order: 1,
                name: "Validation Hiérarchique (Manager N+1)",
                validator_role: "Manager",
                validator_id: 201,
                validator_name: "Marc Martin (Manager N+1)",
                status: "approved",
                validated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
                comment: "Demande approuvée. Agent régulier de l'équipe de maintenance voie."
            },
            {
                id: "s2",
                order: 2,
                name: "Validation Technique & Sécurité (Validateur Site)",
                validator_role: "Validateur Site",
                validator_id: 305,
                validator_name: "Valérie Validateur",
                status: "pending"
            }
        ],
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        document: null,
        document_original_name: null,
        ai_analysis: {
            risk_level: "Modéré",
            urgency: "Élevée (Intervention de nuit)",
            compliance_check: "Conforme EN 15864. Site critique Paris Nord soumis à NIS 2.",
            key_points: [
                "Intervention nocturne en zone à fort trafic ferroviaire",
                "Validation N+1 déjà obtenue sans réserve",
                "Habilitation requise : clé programmable avec horodatage strict"
            ],
            recommendation: "Avis favorable sous réserve de vérification de l'ordre de mission officiel du technicentre.",
            analyzed_at: new Date().toISOString()
        }
    },
    {
        id: 1002,
        reference: "REQ-2026-1002",
        title: "Cylindre Électronique - Technicentre Châtillon",
        description: "Pose d'un cylindre électronique connecté sur l'armoire de commande traction voie 3.",
        status: "Validée",
        current_stage_index: 2,
        beneficiaire_id: 1042,
        beneficiaire_name: "Daniel Dupont",
        beneficiaire_service: "Maintenance Voie",
        site_id: 2,
        site_name: "Technicentre Châtillon TGV & Ligne Atlantique",
        equipment_type: "Cylindre Électronique EN 16864",
        stages: [
            {
                id: "s1",
                order: 1,
                name: "Validation Hiérarchique (Manager N+1)",
                validator_role: "Manager",
                validator_id: 201,
                validator_name: "Marc Martin",
                status: "approved",
                validated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
                comment: "Approuvé par N+1"
            },
            {
                id: "s2",
                order: 2,
                name: "Validation Technique & Sécurité (Validateur Site)",
                validator_role: "Validateur Site",
                validator_id: 306,
                validator_name: "Sylvain Sécurité",
                status: "approved",
                validated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
                comment: "Conforme aux plans de sécurisation du technicentre. Programmation autorisée."
            }
        ],
        created_at: new Date(Date.now() - 3600000 * 50).toISOString(),
        document: null
    },
    {
        id: 1003,
        reference: "REQ-2026-1003",
        title: "Demande Groupée d'Équipe - Remplacement traverses secteur Lyon Part-Dieu",
        description: "Accès simultané pour une brigade de maintenance de 3 agents sur les armoires de signalisation et voies de garage Lyon Part-Dieu.",
        status: "En attente validation Manager",
        current_stage_index: 0,
        beneficiaire_id: 1042,
        beneficiaire_name: "Daniel Dupont",
        beneficiaire_service: "Maintenance Voie",
        site_id: 3,
        site_name: "Gare de Lyon Part-Dieu (Secteur Faisceau & Voies)",
        equipment_type: "Clé Mécatronique EN 15864",
        intervention_duration: "Hebdomadaire (7 jours)",
        is_team_request: true,
        team_name: "Brigade Voie & Aiguillages Rhône",
        team_company: "Infralog Réseau",
        team_members: [
            { name: "Daniel Dupont (Chef de bordée)", email: "daniel@entreprise.fr", role_or_qualification: "Opérateur Voie Niveau 3" },
            { name: "Lucas Moreau", email: "lucas.moreau@entreprise.fr", role_or_qualification: "Technicien Signalisation H0B0" },
            { name: "Camille Bernard", email: "camille.bernard@entreprise.fr", role_or_qualification: "Agent d'Équipement Voie" }
        ],
        stages: [
            {
                id: "s1",
                order: 1,
                name: "Validation Hiérarchique (Manager N+1)",
                validator_role: "Manager",
                validator_id: 201,
                validator_name: "Marc Martin (Manager N+1)",
                status: "pending"
            },
            {
                id: "s2",
                order: 2,
                name: "Validation Technique & Sécurité (Validateur Site)",
                validator_role: "Validateur Site",
                validator_id: 307,
                validator_name: "Richard Rails",
                status: "pending"
            }
        ],
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        document: null
    },
    {
        id: 1004,
        reference: "REQ-2026-1004",
        title: "Cadenas Mécatronique - Sous-station Traction Juvisy",
        description: "Consignation sécurisée des commutateurs 1500V pour visite périodique de sécurité.",
        status: "En attente validation Manager",
        current_stage_index: 0,
        beneficiaire_id: 1042,
        beneficiaire_name: "Daniel Dupont",
        beneficiaire_service: "Maintenance Voie",
        site_id: 1,
        site_name: "Paris Gare du Nord (Postes & Voies Banlieue/GL)",
        equipment_type: "Cadenas Bluetooth Haute Sécurité",
        intervention_duration: "Ponctuelle (24h)",
        stages: [
            {
                id: "s1",
                order: 1,
                name: "Validation Hiérarchique (Manager N+1)",
                validator_role: "Manager",
                validator_id: 201,
                validator_name: "Marc Martin (Manager N+1)",
                status: "pending"
            },
            {
                id: "s2",
                order: 2,
                name: "Validation Technique & Sécurité (Validateur Site)",
                validator_role: "Validateur Site",
                validator_id: 305,
                validator_name: "Valérie Validateur",
                status: "pending"
            }
        ],
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        document: null
    }
];

export let decisionHistory: DecisionHistoryItem[] = [
    { id: 1, reference: "REQ-2026-1002", title: "Cylindre Électronique - Technicentre Châtillon", decision: "Validée", author: "Marc Martin (Manager N+1)", date: new Date(Date.now() - 3600000 * 48).toISOString(), motif: "Validation étape 1 conforme" },
    { id: 2, reference: "REQ-2026-1002", title: "Cylindre Électronique - Technicentre Châtillon", decision: "Validée", author: "Sylvain Sécurité (Validateur Site)", date: new Date(Date.now() - 3600000 * 24).toISOString(), motif: "Validation étape 2 finale effectuée" },
    { id: 3, reference: "REQ-2026-1001", title: "Clé Mécatronique - Poste Aiguillage Paris Nord", decision: "Validée", author: "Marc Martin (Manager N+1)", date: new Date(Date.now() - 3600000 * 4).toISOString(), motif: "Validation hiérarchique étape 1 accordée" }
];

export let delegationMap: Record<string | number, string | number> = {};

export interface NotificationItem {
    id: string;
    target_user_id?: number;
    target_role?: string; // 'Demandeur' | 'Manager' | 'Validateur Site' | 'Administrateur' | 'all'
    type: 'new_request' | 'request_approved' | 'request_rejected' | 'complement_needed' | 'complement_submitted' | 'urgent_alert' | 'deadline_warning' | 'info';
    title: string;
    message: string;
    link?: string;
    reference?: string;
    urgent?: boolean;
    read: boolean;
    created_at: string;
}

export let notificationsDB: NotificationItem[] = [
    {
        id: "NOTIF-101",
        target_role: "Validateur Site",
        type: "urgent_alert",
        title: "Alerte Intervention Nocturne - Paris Nord",
        message: "Demande urgente REQ-2026-1001 (Poste Aiguillage Paris Nord) validée N+1, en attente de votre décision de sécurité avant début d'intervention de nuit.",
        link: "/corbeille",
        reference: "REQ-2026-1001",
        urgent: true,
        read: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
        id: "NOTIF-102",
        target_user_id: 1042,
        type: "request_approved",
        title: "Habilitation Mécatronique Validée",
        message: "Votre demande REQ-2026-1002 (Cylindre Électronique Châtillon) a reçu la validation finale par Sylvain Sécurité.",
        link: "/mes-demandes",
        reference: "REQ-2026-1002",
        urgent: false,
        read: false,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
        id: "NOTIF-103",
        target_user_id: 1042,
        type: "info",
        title: "Étape 1 Validée par votre Manager",
        message: "Votre demande REQ-2026-1001 a été approuvée par Marc Martin et transmise au Validateur Site Nord.",
        link: "/mes-demandes",
        reference: "REQ-2026-1001",
        urgent: false,
        read: true,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
        id: "NOTIF-104",
        target_role: "Manager",
        type: "info",
        title: "Rappel Conformité Habilitations",
        message: "Pensez à vérifier la validité des habilitations électriques (H0B0 / B1V) des agents avant validation des accès haute tension.",
        link: "/corbeille",
        urgent: false,
        read: false,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
];

export type DbSyncCallback = (sql: string, params: any[]) => void;
let dbSyncCallback: DbSyncCallback | null = null;

export function registerDbSync(cb: DbSyncCallback) {
    dbSyncCallback = cb;
}

export function recordDecision(entry: Omit<DecisionHistoryItem, 'id'>): DecisionHistoryItem {
    const nextId = (decisionHistory.length > 0 ? Math.max(...decisionHistory.map(d => d.id)) : 0) + 1;
    const item: DecisionHistoryItem = { id: nextId, ...entry };
    decisionHistory.push(item);
    if (dbSyncCallback) {
        dbSyncCallback(
            'INSERT INTO decision_history (reference, title, decision, author, motif, date) VALUES (?, ?, ?, ?, ?, ?)',
            [item.reference, item.title || null, item.decision, item.author, item.motif || null, item.date]
        );
    }
    return item;
}

export function createNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'read'> & { read?: boolean; target_email?: string }): NotificationItem {
    const newNotif: NotificationItem = {
        id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
        read: notif.read ?? false,
        ...notif
    };
    notificationsDB.unshift(newNotif);
    if (dbSyncCallback) {
        dbSyncCallback(
            'INSERT INTO notifications (id, target_user_id, target_role, target_email, type, title, message, link, reference, urgent, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                newNotif.id,
                newNotif.target_user_id || null,
                newNotif.target_role || null,
                (newNotif as any).target_email || null,
                newNotif.type,
                newNotif.title,
                newNotif.message,
                newNotif.link || null,
                newNotif.reference || null,
                newNotif.urgent ? 1 : 0,
                newNotif.read ? 1 : 0,
                newNotif.created_at
            ]
        );
    }
    return newNotif;
}

export function logAction(actor: string, role: string, action: string, target: string, details: string) {
    const ts = new Date().toISOString();
    auditLogs.push({
        id: auditLogs.length + 1,
        timestamp: ts,
        actor: actor || "Admin Système",
        role: role || "Administrateur",
        action,
        target,
        details
    });
    if (dbSyncCallback) {
        dbSyncCallback(
            'INSERT INTO audit_logs (actor, role, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [actor || "Admin Système", role || "Administrateur", action, target, details, ts]
        );
    }
}

export interface PortalTabConfig {
    id: string;
    key: string;
    label: string;
    description: string;
    icon: string;
    path: string;
    badge?: string;
    badge_color?: string;
    is_active: boolean;
    display_order: number;
    required_privilege?: string;
    is_system: boolean;
}

export let portalTabsDatabase: PortalTabConfig[] = [
    {
        id: "catalogue",
        key: "catalogue",
        label: "Catalogue",
        description: "Parcourir les processus mécatroniques et initier des demandes d'intervention",
        icon: "fas fa-th-large",
        path: "/",
        badge: "Opérationnel",
        badge_color: "bg-blue-100 text-blue-800",
        is_active: true,
        display_order: 1,
        is_system: true
    },
    {
        id: "mes-demandes",
        key: "mes-demandes",
        label: "Mes Demandes",
        description: "Suivi en temps réel des demandes d'intervention et historique personnel",
        icon: "fas fa-folder",
        path: "/mes-demandes",
        badge: "",
        badge_color: "",
        is_active: true,
        display_order: 2,
        is_system: true
    },
    {
        id: "assistant-ia",
        key: "assistant-ia",
        label: "Assistant IA",
        description: "Copilote d'assistance mécatronique et conformité de sûreté (Gemini)",
        icon: "fas fa-robot",
        path: "/assistant-ia",
        badge: "Gemini",
        badge_color: "bg-purple-100 text-purple-800",
        is_active: false,
        display_order: 3,
        is_system: true
    },
    {
        id: "workflows",
        key: "workflows",
        label: "Machine à États & Workflows",
        description: "Architecture Parent-Enfant & Machine à états du cycle de vie des demandes",
        icon: "fas fa-project-diagram",
        path: "/workflows",
        badge: "Workflows",
        badge_color: "bg-indigo-100 text-indigo-800",
        is_active: true,
        display_order: 3,
        is_system: true
    },
    {
        id: "corbeille",
        key: "corbeille",
        label: "Corbeille Validateur",
        description: "Validation hiérarchique et technique des accès et interventions",
        icon: "fas fa-inbox",
        path: "/corbeille",
        badge: "SLA 24h",
        badge_color: "bg-amber-100 text-amber-800",
        is_active: true,
        display_order: 4,
        required_privilege: "validate_requests",
        is_system: true
    },
    {
        id: "historique-decisions",
        key: "historique-decisions",
        label: "Historique des Décisions",
        description: "Journal d'audit des validations, refus et signatures électroniques",
        icon: "fas fa-history",
        path: "/historique-decisions",
        badge: "",
        badge_color: "",
        is_active: true,
        display_order: 5,
        is_system: true
    },
    {
        id: "tableau-de-bord",
        key: "tableau-de-bord",
        label: "Tableau de Bord",
        description: "Indicateurs d'activité, respect des SLA et volumes d'accès par site",
        icon: "fas fa-chart-line",
        path: "/tableau-de-bord",
        badge: "KPIs",
        badge_color: "bg-emerald-100 text-emerald-800",
        is_active: true,
        display_order: 6,
        is_system: true
    },
    {
        id: "delegation",
        key: "delegation",
        label: "Délégations",
        description: "Délégations temporaires de pouvoir de validation et suppléance",
        icon: "fas fa-exchange-alt",
        path: "/delegation",
        badge: "",
        badge_color: "",
        is_active: true,
        display_order: 7,
        required_privilege: "validate_requests",
        is_system: true
    },
    {
        id: "admin",
        key: "admin",
        label: "Espace Administrateur",
        description: "Gouvernance des workflows, tables, catalogues et droits d'accès RBAC",
        icon: "fas fa-shield-alt",
        path: "/admin",
        badge: "Admin",
        badge_color: "bg-purple-100 text-purple-800",
        is_active: true,
        display_order: 8,
        required_privilege: "manage_users",
        is_system: true
    }
];

export interface AdminNavItemConfig {
    id: string;
    key: string;
    label: string;
    path: string;
    icon: string;
    section: string;
    badge?: string;
    badge_color?: string;
    is_visible: boolean;
    display_order: number;
    associated_feature_key?: string;
    is_system?: boolean;
}

export interface AdminNavSectionConfig {
    id: string;
    key: string;
    title: string;
    icon: string;
    badge?: string;
    badge_color?: string;
    display_order: number;
    is_visible: boolean;
    is_system?: boolean;
}

export let adminNavSectionsDatabase: AdminNavSectionConfig[] = [
    {
        id: "section_security",
        key: "security",
        title: "Sécurité & Habilitations",
        icon: "fas fa-shield-alt",
        badge: "RBAC",
        badge_color: "bg-blue-100 text-[#002395]",
        display_order: 1,
        is_visible: true,
        is_system: true
    },
    {
        id: "section_business",
        key: "business",
        title: "Paramétrage Métier",
        icon: "fas fa-cogs",
        badge: "",
        badge_color: "",
        display_order: 2,
        is_visible: true,
        is_system: true
    },
    {
        id: "section_compliance",
        key: "compliance",
        title: "Conformité & Traçabilité",
        icon: "fas fa-fingerprint",
        badge: "",
        badge_color: "",
        display_order: 3,
        is_visible: true,
        is_system: true
    }
];

export let adminNavDatabase: AdminNavItemConfig[] = [
    {
        id: "admin_nav_roles",
        key: "roles",
        label: "Rôles & Visibilités",
        path: "/roles",
        icon: "fas fa-user-shield",
        section: "security",
        badge: "Matrice",
        badge_color: "bg-yellow-400 text-blue-950",
        is_visible: true,
        display_order: 1,
        is_system: true
    },
    {
        id: "admin_nav_users",
        key: "users",
        label: "Utilisateurs & Attributs",
        path: "/utilisateurs",
        icon: "fas fa-users",
        section: "security",
        badge: "",
        badge_color: "",
        is_visible: true,
        display_order: 2,
        is_system: true
    },
    {
        id: "admin_nav_password_access",
        key: "password_access",
        label: "Mots de Passe & Rétention",
        path: "/admin/securite-mots-de-passe",
        icon: "fas fa-key",
        section: "security",
        badge: "Accès",
        badge_color: "bg-blue-100 text-[#002395]",
        is_visible: true,
        display_order: 3,
        is_system: true
    },
    {
        id: "admin_nav_workflows",
        key: "workflows",
        label: "Gestion Workflows",
        path: "/admin",
        icon: "fas fa-sitemap",
        section: "business",
        badge: "Circuits",
        badge_color: "bg-blue-100 text-[#002395]",
        is_visible: true,
        display_order: 3,
        is_system: true
    },
    {
        id: "admin_nav_formulaires",
        key: "formulaires",
        label: "Concepteur Formulaires",
        path: "/admin/formulaires",
        icon: "fas fa-clipboard-list",
        section: "business",
        badge: "Forms",
        badge_color: "bg-emerald-100 text-emerald-800",
        is_visible: true,
        display_order: 4,
        is_system: true
    },
    {
        id: "admin_nav_statuts",
        key: "statuts",
        label: "Configurateur Statuts",
        path: "/admin/statuts",
        icon: "fas fa-tags",
        section: "business",
        badge: "États",
        badge_color: "bg-indigo-100 text-indigo-800",
        is_visible: true,
        display_order: 5,
        is_system: true
    },
    {
        id: "admin_nav_status_categories",
        key: "status_categories",
        label: "Catégories de Statuts",
        path: "/admin/statuts?tab=categories",
        icon: "fas fa-folder-tree",
        section: "business",
        badge: "Phases",
        badge_color: "bg-purple-100 text-purple-800",
        is_visible: true,
        display_order: 6,
        is_system: true
    },
    {
        id: "admin_nav_regles_metiers",
        key: "regles_metiers",
        label: "Règles Métiers",
        path: "/admin/regles-metiers",
        icon: "fas fa-cogs",
        section: "business",
        badge: "Moteur",
        badge_color: "bg-emerald-100 text-emerald-800",
        is_visible: true,
        display_order: 7,
        is_system: true
    },
    {
        id: "admin_nav_notifications",
        key: "notifications",
        label: "Modèles Notifications",
        path: "/notifications-admin",
        icon: "fas fa-bell",
        section: "business",
        badge: "Espace",
        badge_color: "bg-blue-100 text-[#002395]",
        is_visible: true,
        display_order: 6,
        is_system: true
    },
    {
        id: "admin_nav_onglets_referentiels",
        key: "onglets_referentiels",
        label: "Onglets & Référentiels",
        path: "/admin/onglets-referentiels",
        icon: "fas fa-sliders-h",
        section: "business",
        badge: "Spécial",
        badge_color: "bg-amber-100 text-amber-900",
        is_visible: true,
        display_order: 6,
        is_system: true
    },
    {
        id: "admin_nav_features",
        key: "features",
        label: "Activer / Désactiver Modules",
        path: "/admin/onglets-referentiels?section=features",
        icon: "fas fa-toggle-on",
        section: "business",
        badge: "ON / OFF",
        badge_color: "bg-purple-100 text-purple-900",
        is_visible: true,
        display_order: 7,
        is_system: true
    },
    {
        id: "admin_nav_system_settings",
        key: "system_settings",
        label: "Paramètres Système & Règles",
        path: "/admin/parametres-systeme",
        icon: "fas fa-sliders",
        section: "business",
        badge: "Zero-Code",
        badge_color: "bg-yellow-100 text-yellow-900",
        is_visible: true,
        display_order: 8,
        is_system: true
    },
    {
        id: "admin_nav_tenant_branding",
        key: "tenant_branding",
        label: "Marque Blanche & Multi-Tenant",
        path: "/admin/marque-blanche",
        icon: "fas fa-palette",
        section: "business",
        badge: "Tenant",
        badge_color: "bg-indigo-100 text-indigo-900",
        is_visible: true,
        display_order: 9,
        is_system: true
    },
    {
        id: "admin_nav_tables",
        key: "tables",
        label: "Tables de Référence",
        path: "/tables-admin",
        icon: "fas fa-table",
        section: "business",
        badge: "",
        badge_color: "",
        is_visible: true,
        display_order: 8,
        associated_feature_key: "referentiels_management",
        is_system: true
    },
    {
        id: "admin_nav_catalogues",
        key: "catalogues",
        label: "Catalogues & Services",
        path: "/catalogues-admin",
        icon: "fas fa-folder-plus",
        section: "business",
        badge: "",
        badge_color: "",
        is_visible: true,
        display_order: 9,
        is_system: true
    },
    {
        id: "admin_nav_syslog",
        key: "syslog",
        label: "Syslog & Audit NIS 2",
        path: "/syslog",
        icon: "fas fa-terminal",
        section: "compliance",
        badge: "",
        badge_color: "",
        is_visible: true,
        display_order: 9,
        associated_feature_key: "syslog_audit_nis2",
        is_system: true
    }
];

