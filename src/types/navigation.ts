export interface AdminNavItem {
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
    associated_feature_key?: string; // e.g. 'referentiels_management' or 'syslog_audit_nis2'
    is_system?: boolean;
}

export interface AdminNavSection {
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
