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

export interface CustomTable {
    id: string;
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

export interface TableSummary {
    id: string;
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
    columns_count: number;
    rows_count: number;
    columns: TableColumn[];
    metadata_fields?: TableMetadataField[];
    metadata?: Record<string, any>;
}

export interface SystemFeature {
    key: string;
    label?: string;
    name?: string;
    description: string;
    category: string;
    is_enabled: boolean;
    requires_restart?: boolean;
    icon?: string;
    created_at?: string;
    updated_at?: string;
}

// Spécification Technique & Machine à États — Portail de Gestion des Accès Mécatroniques
export type ParentRequestStatus =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'ESCALATED_NATIONAL'
    | 'PENDING_VAL_PARALLEL'
    | 'PENDING_CROSS_VAL'
    | 'PENDING_GDPR'
    | 'PENDING_KEY_DECISION'
    | 'PENDING_QUOTE_PO'
    | 'ORDER_LINKED'
    | 'DISPATCHED_IN_TRANSIT'
    | 'AUTO_ESCALATED_INCIDENT'
    | 'COMMISSIONING_GPS'
    | 'ACTIVE_FULFILLED'
    | 'INCIDENT_REPORTED'
    | 'BLACKLIST_RESTRICTED'
    | 'ARCHIVED_COMPLETED'
    | 'ARCHIVED_REJECTED'
    | 'ARCHIVED_ABANDONED';

export type RequestItemStatus =
    | 'DRAFT'
    | 'PENDING_VAL_PARALLEL'
    | 'ITEM_APPROVED'
    | 'ITEM_REJECTED'
    | 'DISPATCHED_IN_TRANSIT'
    | 'COMMISSIONING_GPS'
    | 'ACTIVE_FULFILLED'
    | 'INCIDENT_REPORTED'
    | 'BLACKLIST_RESTRICTED'
    | 'ARCHIVED_COMPLETED'
    | 'ARCHIVED_REJECTED'
    | 'ARCHIVED_ABANDONED';

export type RequestType =
    | 'HABILITATION'      // Processus 1: Gestion des habilitations et droits d'accès
    | 'USER_ACCOUNT'     // Processus 2: Création de compte utilisateur
    | 'KEY_ORDER'        // Processus 3: Commande de clés mécatroniques
    | 'CYLINDER_ORDER'   // Processus 4: Commande de cylindres & cadenas
    | 'TERMINAL_ORDER'   // Processus 5: Commande de boîtiers de rechargement
    | 'MASS_DEPLOY'      // Processus 6: Déploiement massif (modèle Excel)
    | 'INCIDENT'         // Processus 7: Casse, Perte, Vol & Révocation de sécurité
    | 'ORG_CHANGE';      // Processus 8: Modification de la structure organisationnelle

export type ItemType =
    | 'ACCESS_RIGHT'
    | 'KEY'
    | 'CYLINDER'
    | 'PADLOCK'
    | 'TERMINAL'
    | 'USER_CREATION';

export type HardwareOrigin =
    | 'NEW_ORDER'        // Commande neuve fournisseur
    | 'SUPPLIER_STOCK'   // Stock tampon fournisseur déjà approvisionné
    | 'USER_STOCK';      // Stock interne réaffecté avec numéro de série vérifié

export interface RequestItem {
    id: string;
    parent_request_id: string;
    item_type: ItemType;
    label: string;
    target_site_id?: number | null;
    target_site_name?: string | null;
    designated_validator_id?: number | null;
    designated_validator_name?: string | null;
    hardware_serial_number?: string | null;
    hardware_origin?: HardwareOrigin | null;
    status: RequestItemStatus;
    approved_at?: string | null;
    rejection_reason?: string | null;
    gps_coordinates?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        recorded_at: string;
        installer_name?: string;
    } | null;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface WorkflowRulesConfig {
    // Mode de validation & circuits
    validation_mode?: 'PARALLEL_ITEMS' | 'CROSS_VALIDATION' | 'TRIPARTITE' | 'AUTO_FULFILL';
    sla_hours?: number;
    allowed_manager_roles?: string[];
    allowed_validator_roles?: string[];
    allowed_national_roles?: string[];
    require_parallel_item_approval?: boolean;
    require_manager_approval?: boolean;
    require_validator_approval?: boolean;
    require_national_arbitration?: boolean;

    // Règles Terrain & Commissioning
    requires_gps?: boolean;
    gps_max_distance_meters?: number;
    gps_max_accuracy_meters?: number;
    requires_reception_pv?: boolean;

    // Conformité & Enchaînements
    requires_gdpr?: boolean;
    auto_chain_key_order?: boolean;
    requires_batch_plan?: boolean;
    requires_incident_report?: boolean;
    requires_org_chart_validation?: boolean;

    // Quotas & Escalades
    check_quota?: boolean;
    custom_quota_limit?: number;
    quota_period_months?: number;
    max_reminder_bounces?: number;
    auto_incident_on_timeout?: boolean;

    // Finances & Devis
    requires_quote_po?: boolean;
    custom_quote_amount?: number;
    custom_quote_currency?: string;
    auto_calculate_differential_quote?: boolean;

    // Sécurité & Alertes
    requires_special_tag?: boolean;
    special_tag_label?: string;
    enable_e123_blacklist?: boolean;
    auto_exclusion_rule?: boolean;
}

export interface ParentRequest {
    id: string;
    request_number: string;
    request_type: RequestType;
    title: string;
    description?: string;
    requester_id: number;
    requester_name: string;
    requester_email?: string;
    manager_id?: number | null;
    manager_name?: string | null;
    validator_id?: number | null;
    validator_name?: string | null;
    site_id?: number | null;
    site_name?: string | null;
    status: ParentRequestStatus;
    external_order_ref?: string | null;
    quote_amount?: number;
    quote_currency?: string;
    quota_exceeded?: boolean;
    has_special_tag?: boolean;
    manager_approved?: boolean;
    validator_approved?: boolean;
    gdpr_accepted?: boolean;
    reception_pv_signed?: boolean;
    workflow_rules?: WorkflowRulesConfig;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    items?: RequestItem[];
}

export interface WorkflowReminder {
    id: string;
    target_entity_type: 'PARENT_REQUEST' | 'REQUEST_ITEM';
    target_entity_id: string;
    reminder_count: number;
    max_reminders: number;
    last_sent_at?: string | null;
    next_scheduled_at?: string | null;
    status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
}

export interface UserOrderQuota {
    user_id: number;
    user_name?: string;
    order_count: number;
    period_start_date: string;
    period_end_date?: string | null;
    quota_limit: number;
    last_escalation_at?: string | null;
}

export interface PortalAuditLog {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    performed_by: number;
    performed_by_name: string;
    details?: Record<string, any>;
    created_at: string;
}

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

export interface CustomStatusConfig {
    id: string;
    code: string;
    label: string;
    description: string;
    category: StatusCategory;
    specification_tag?: string; // Optional metadata tag (defaults to configurable metadata)
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

export type TransitionTriggerType =
    | 'APPROVAL'       // Approbation / Validation manuelle
    | 'REJECTION'      // Refus / Rejet
    | 'RETURN'         // Demande de complément / Renvoi arrière
    | 'AUTO'           // Automatique dès satisfaction des règles
    | 'CONDITIONAL'    // Branchement conditionnel (valeur de champ)
    | 'TIMEOUT';       // Escalade sur délai SLA dépassé

export interface WorkflowTransition {
    id: string;
    from_stage_id: string;
    to_stage_id: string;
    label: string;
    trigger_type: TransitionTriggerType;
    condition_description?: string;
    condition_field?: string;
    condition_operator?: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
    condition_value?: string;
    requires_comment?: boolean;
    requires_document?: boolean;
    button_label?: string;
    button_color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'purple' | 'gray';
}

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
    created_at?: string;
    updated_at?: string;
}


