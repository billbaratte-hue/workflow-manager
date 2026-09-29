import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminNavItem, AdminNavSection } from '../types/navigation';
import { getAdminSidebarItems, getAdminSidebarSections } from '../lib/api';

const DEFAULT_ADMIN_SECTIONS: AdminNavSection[] = [
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

const DEFAULT_ADMIN_NAV: AdminNavItem[] = [
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
        id: "admin_nav_tables",
        key: "tables",
        label: "Tables de Référence",
        path: "/tables-admin",
        icon: "fas fa-table",
        section: "business",
        badge: "",
        badge_color: "",
        is_visible: true,
        display_order: 7,
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
        display_order: 8,
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
    },
    {
        id: "admin_nav_database",
        key: "database",
        label: "Base de Données & Sauvegardes",
        path: "/admin/base-de-donnees",
        icon: "fas fa-database",
        section: "compliance",
        badge: "ACID",
        badge_color: "bg-indigo-100 text-indigo-900",
        is_visible: true,
        display_order: 10,
        is_system: true
    }
];

interface AdminNavContextType {
    navItems: AdminNavItem[];
    navSections: AdminNavSection[];
    loading: boolean;
    refreshNav: () => Promise<void>;
    updateLocalItems: (items: AdminNavItem[]) => void;
    updateLocalSections: (sections: AdminNavSection[]) => void;
}

const AdminNavContext = createContext<AdminNavContextType>({
    navItems: DEFAULT_ADMIN_NAV,
    navSections: DEFAULT_ADMIN_SECTIONS,
    loading: false,
    refreshNav: async () => {},
    updateLocalItems: () => {},
    updateLocalSections: () => {}
});

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
    const [navItems, setNavItems] = useState<AdminNavItem[]>(DEFAULT_ADMIN_NAV);
    const [navSections, setNavSections] = useState<AdminNavSection[]>(DEFAULT_ADMIN_SECTIONS);
    const [loading, setLoading] = useState(false);

    const refreshNav = async () => {
        try {
            setLoading(true);
            const [itemsRes, sectionsRes] = await Promise.allSettled([
                getAdminSidebarItems(),
                getAdminSidebarSections()
            ]);

            if (itemsRes.status === 'fulfilled' && itemsRes.value.data && Array.isArray(itemsRes.value.data) && itemsRes.value.data.length > 0) {
                setNavItems(itemsRes.value.data);
            }
            if (sectionsRes.status === 'fulfilled' && sectionsRes.value.data && Array.isArray(sectionsRes.value.data) && sectionsRes.value.data.length > 0) {
                setNavSections(sectionsRes.value.data);
            }
        } catch (e) {
            console.warn('Could not load dynamic admin nav items or sections, using defaults:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshNav();

        const handleUpdate = () => {
            refreshNav();
        };
        window.addEventListener('portal_admin_nav_updated', handleUpdate);
        return () => window.removeEventListener('portal_admin_nav_updated', handleUpdate);
    }, []);

    const updateLocalItems = (items: AdminNavItem[]) => {
        setNavItems(items);
    };

    const updateLocalSections = (sections: AdminNavSection[]) => {
        setNavSections(sections);
    };

    return (
        <AdminNavContext.Provider value={{ navItems, navSections, loading, refreshNav, updateLocalItems, updateLocalSections }}>
            {children}
        </AdminNavContext.Provider>
    );
}

export function useAdminNav() {
    return useContext(AdminNavContext);
}
