import React, { useState } from 'react';
import { 
    Database, 
    Layers, 
    FileText, 
    Shield, 
    Sliders, 
    Users, 
    GitBranch, 
    Search,
    ChevronRight,
    Lock
} from 'lucide-react';

export interface AdminNavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ElementType;
    badge?: string;
    requiredPrivilege?: string;
    category?: 'general' | 'referentiels' | 'securite' | 'systeme';
}

export const DEFAULT_ADMIN_NAV_ITEMS: AdminNavItem[] = [
    { id: 'db', label: 'Base de Données & Sauvegardes', path: '/admin/base-de-donnees', icon: Database, category: 'systeme' },
    { id: 'referentiels', label: 'Tables Référentielles', path: '/admin/tables', icon: Layers, category: 'referentiels' },
    { id: 'formulaires', label: 'Concepteur Formulaires', path: '/admin/formulaires', icon: FileText, category: 'general' },
    { id: 'statuts', label: 'Machine à États & Statuts', path: '/admin/statuts', icon: GitBranch, category: 'systeme' },
    { id: 'regles', label: 'Règles Métier & Affectations', path: '/admin/regles-metier', icon: Sliders, category: 'general' },
    { id: 'roles', label: 'Rôles & Habilitations', path: '/admin/roles', icon: Shield, category: 'securite' },
    { id: 'users', label: 'Utilisateurs & Profils', path: '/admin/utilisateurs', icon: Users, category: 'securite' },
];

export interface AdminNavigationProps {
    currentPath?: string;
    onNavigate?: (path: string) => void;
    userPrivileges?: string[];
    items?: AdminNavItem[];
    className?: string;
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({
    currentPath = '/admin/base-de-donnees',
    onNavigate,
    userPrivileges = ['manage_users', 'validate_requests'],
    items = DEFAULT_ADMIN_NAV_ITEMS,
    className = ''
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = items.filter(item => {
        const matchesQuery = item.label.toLowerCase().includes(searchQuery.toLowerCase());
        const hasPrivilege = !item.requiredPrivilege || userPrivileges.includes(item.requiredPrivilege);
        return matchesQuery && hasPrivilege;
    });

    return (
        <nav 
            aria-label="Navigation Administrateur"
            className={`w-full bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden ${className}`}
        >
            <div className="p-4 border-b border-gray-100 bg-slate-50">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Administration du Portail
                </h2>
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Rechercher un module admin..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Rechercher un module"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0088CE] text-gray-800"
                    />
                </div>
            </div>

            <div className="divide-y divide-gray-50 py-1">
                {filteredItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                        Aucun module d'administration correspondant.
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentPath === item.path;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onNavigate?.(item.path)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                                    isActive
                                        ? 'bg-[#0088CE]/10 text-[#0088CE] font-semibold border-l-4 border-[#0088CE]'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0088CE]' : 'text-gray-500'}`} />
                                    <span>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {item.badge && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-medium">
                                            {item.badge}
                                        </span>
                                    )}
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </nav>
    );
};
