import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useFeatures } from '../context/FeaturesContext';
import { useAdminNav } from '../context/AdminNavContext';

const STORAGE_COLLAPSED_KEY = 'portal_admin_sidebar_collapsed_sections';

export default function AdminLayout() {
    const location = useLocation();
    const { isFeatureEnabled } = useFeatures();
    const { navItems, navSections } = useAdminNav();

    // Store collapsed section keys in state with persistent localStorage
    const [collapsedSections, setCollapsedSections] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_COLLAPSED_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Save to localStorage when collapsedSections changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_COLLAPSED_KEY, JSON.stringify(collapsedSections));
        } catch {
            // ignore storage errors
        }
    }, [collapsedSections]);

    // Active sections sorted by display_order
    const sortedSections = [...navSections]
        .filter(sec => sec.is_visible)
        .sort((a, b) => a.display_order - b.display_order);

    const isItemActive = (path: string) => {
        if (path.includes('?')) {
            const [base, query] = path.split('?');
            const searchParam = query.split('=')[1];
            return location.pathname === base && location.search.includes(searchParam);
        }
        if (location.search.includes('section=')) {
            return false;
        }
        return location.pathname === path;
    };

    // Automatically expand the section that contains the current active route
    useEffect(() => {
        const activeItem = navItems.find(i => isItemActive(i.path));
        if (activeItem && collapsedSections.includes(activeItem.section)) {
            setCollapsedSections(prev => prev.filter(k => k !== activeItem.section));
        }
    }, [location.pathname, location.search, navItems]);

    const toggleSection = (sectionKey: string) => {
        setCollapsedSections(prev =>
            prev.includes(sectionKey)
                ? prev.filter(k => k !== sectionKey)
                : [...prev, sectionKey]
        );
    };

    const toggleAllSections = () => {
        if (collapsedSections.length === sortedSections.length) {
            // All collapsed -> expand all
            setCollapsedSections([]);
        } else {
            // Collapse all
            setCollapsedSections(sortedSections.map(s => s.key));
        }
    };

    const areAllCollapsed = sortedSections.length > 0 && collapsedSections.length === sortedSections.length;

    const renderNavItem = (item: any) => {
        const active = isItemActive(item.path);
        const featureDisabled = item.associated_feature_key ? !isFeatureEnabled(item.associated_feature_key) : false;

        return (
            <Link
                key={item.key}
                id={`nav-admin-${item.key}`}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                    active
                        ? 'bg-blue-50 text-[#002395] font-bold border-l-4 border-[#002395] shadow-xs'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#002395]'
                }`}
            >
                <span className="flex items-center truncate mr-2">
                    <i className={`${item.icon || 'fas fa-link'} mr-3 w-5 text-center flex-shrink-0 ${active ? 'text-[#002395]' : 'text-gray-500'}`}></i>
                    <span className="truncate">{item.label}</span>
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                    {featureDisabled && (
                        <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                            OFF
                        </span>
                    )}
                    {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${item.badge_color || 'bg-gray-100 text-gray-700'}`}>
                            {item.badge}
                        </span>
                    )}
                </span>
            </Link>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-72 flex-shrink-0">
                <div className="bg-white shadow-xs border border-gray-200 rounded-xl p-4 space-y-4">
                    {/* Header Volet */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="fas fa-bars-staggered text-[#002395]"></i>
                            Volet de Navigation
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                id="btn-toggle-all-sections"
                                onClick={toggleAllSections}
                                title={areAllCollapsed ? "Tout afficher" : "Tout masquer / replier"}
                                className="text-xs text-gray-500 hover:text-[#002395] hover:bg-gray-100 p-1 rounded transition"
                            >
                                <i className={`fas ${areAllCollapsed ? 'fa-angles-down' : 'fa-angles-up'}`}></i>
                            </button>
                            <Link
                                to="/admin/onglets-referentiels?section=sidebar_nav"
                                title="Configurer le volet de navigation et les sections"
                                className="text-xs text-[#002395] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded font-semibold transition flex items-center gap-1"
                            >
                                <i className="fas fa-cog"></i>
                                <span>Gérer</span>
                            </Link>
                        </div>
                    </div>

                    {/* Dynamic Sections rendering with show/hide collapsible ability */}
                    <div className="space-y-3">
                        {sortedSections.map(sec => {
                            const sectionItems = navItems
                                .filter(item => item.section === sec.key && item.is_visible)
                                .sort((a, b) => a.display_order - b.display_order);

                            if (sectionItems.length === 0) return null;

                            const isCollapsed = collapsedSections.includes(sec.key);

                            return (
                                <div key={sec.key} id={`section-admin-${sec.key}`} className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection(sec.key)}
                                        className="w-full text-[11px] font-bold text-gray-500 uppercase tracking-wider py-1 px-2 flex items-center justify-between rounded-md hover:bg-gray-50 hover:text-gray-900 transition group cursor-pointer"
                                        title={isCollapsed ? `Afficher les informations de la section ${sec.title}` : `Masquer les informations de la section ${sec.title}`}
                                    >
                                        <span className="flex items-center gap-1.5 truncate mr-1">
                                            <i className={`${sec.icon || 'fas fa-folder'} text-[#002395] w-4 text-center`}></i>
                                            <span className="truncate">{sec.title}</span>
                                            <span className="text-[10px] text-gray-400 group-hover:text-[#002395] font-normal">
                                                ({sectionItems.length})
                                            </span>
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {sec.badge && (
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${sec.badge_color || 'bg-gray-100 text-gray-700'}`}>
                                                    {sec.badge}
                                                </span>
                                            )}
                                            <i className={`fas fa-chevron-down text-[10px] text-gray-400 group-hover:text-gray-700 transition-transform duration-200 ${
                                                isCollapsed ? '-rotate-90' : 'rotate-0'
                                            }`}></i>
                                        </div>
                                    </button>

                                    {!isCollapsed && (
                                        <nav className="space-y-1 pl-1 pt-0.5">
                                            {sectionItems.map(renderNavItem)}
                                        </nav>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>
            <main className="flex-1 min-w-0">
                <Outlet />
            </main>
        </div>
    );
}
