import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Catalogue from './pages/Catalogue';
import NouvelleDemande from './pages/NouvelleDemande';
import Corbeille from './pages/Corbeille';
import MesDemandes from './pages/MesDemandes';
import AdminProcessus from './pages/AdminProcessus';
import AdminFormulaires from './pages/AdminFormulaires';
import CataloguesAdmin from './pages/CataloguesAdmin';
import Roles from './pages/Roles';
import Utilisateurs from './pages/Utilisateurs';
import Delegation from './pages/Delegation';
import HistoriqueDecisions from './pages/HistoriqueDecisions';
import SyslogAudit from './pages/SyslogAudit';
import TableauDeBord from './pages/TableauDeBord';
import AdminTables from './pages/AdminTables';
import AdminNotifications from './pages/AdminNotifications';
import AdminOngletsReferentiels from './pages/AdminOngletsReferentiels';
import AdminParametresSysteme from './pages/AdminParametresSysteme';
import AdminStatuts from './pages/AdminStatuts';
import AdminReglesMetier from './pages/AdminReglesMetier';
import WorkflowStateMachine from './pages/WorkflowStateMachine';
import AdminWorkflowStudio from './pages/AdminWorkflowStudio';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import EspaceDemandeur from './pages/EspaceDemandeur';
import ConsoleNationale from './pages/ConsoleNationale';
import Regie from './pages/Regie';
import Recherche from './pages/Recherche';
import Documentation from './pages/Documentation';
import DocumentationAdmin from './pages/DocumentationAdmin';
import Entites from './pages/Entites';
import Referentiels from './pages/Referentiels';
import AdminBaseDeDonnees from './pages/AdminBaseDeDonnees';
import AdminSecuriteMotsDePasse from './pages/AdminSecuriteMotsDePasse';
import AdminMarqueBlanche from './pages/AdminMarqueBlanche';
import AssistantIA from './pages/AssistantIA';
import AdminLayout from './components/AdminLayout';
import NotificationCenter from './components/NotificationCenter';
import AlertBanner from './components/AlertBanner';
import GlobalSearch from './components/GlobalSearch';
import LanguageSelector from './components/LanguageSelector';
import { FeaturesProvider, useFeatures } from './context/FeaturesContext';
import { AdminNavProvider } from './context/AdminNavContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { loginUser } from './lib/api';

interface PortalTabConfigItem {
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

const DEFAULT_PORTAL_TABS: PortalTabConfigItem[] = [
    { id: "catalogue", key: "catalogue", label: "Catalogue", description: "Parcourir les processus opérationnels et initier des demandes d'intervention", icon: "fas fa-th-large", path: "/", badge: "Opérationnel", badge_color: "bg-blue-100 text-blue-800", is_active: true, display_order: 1, is_system: true },
    { id: "mes-demandes", key: "mes-demandes", label: "Mes Demandes", description: "Suivi en temps réel des demandes d'intervention et historique personnel", icon: "fas fa-folder", path: "/mes-demandes", badge: "", badge_color: "", is_active: true, display_order: 2, is_system: true },
    { id: "assistant-ia", key: "assistant-ia", label: "Assistant IA", description: "Copilote d'assistance mécatronique et conformité de sûreté (Gemini)", icon: "fas fa-robot", path: "/assistant-ia", badge: "Gemini", badge_color: "bg-purple-100 text-purple-800", is_active: false, display_order: 3, is_system: true },
    { id: "espace-demandeur", key: "espace-demandeur", label: "Espace Demandeur", description: "Gestion personnelle des clés, badges et matériels assignés", icon: "fas fa-id-badge", path: "/espace-demandeur", badge: "", badge_color: "", is_active: true, display_order: 4, is_system: true },
    { id: "workflows", key: "workflows", label: "Machine à États & Workflows", description: "Architecture Parent-Enfant & Machine à états du cycle de vie des demandes", icon: "fas fa-project-diagram", path: "/workflows", badge: "Workflows", badge_color: "bg-indigo-100 text-indigo-800", is_active: true, display_order: 4, is_system: true },
    { id: "corbeille", key: "corbeille", label: "Corbeille Validateur", description: "Validation hiérarchique et technique des accès et interventions", icon: "fas fa-inbox", path: "/corbeille", badge: "SLA 24h", badge_color: "bg-amber-100 text-amber-800", is_active: true, display_order: 5, required_privilege: "validate_requests", is_system: true },
    { id: "regie", key: "regie", label: "Régie Matérielle", description: "Poste de contrôle des stocks de matériel et équipements programmables", icon: "fas fa-warehouse", path: "/regie", badge: "Atelier", badge_color: "bg-cyan-100 text-cyan-800", is_active: true, display_order: 6, is_system: true },
    { id: "console-nationale", key: "console-nationale", label: "Console Nationale", description: "Supervision globale et gouvernance de sûreté", icon: "fas fa-broadcast-tower", path: "/console-nationale", badge: "Supervision", badge_color: "bg-purple-100 text-purple-800", is_active: true, display_order: 7, is_system: true },
    { id: "historique-decisions", key: "historique-decisions", label: "Historique des Décisions", description: "Journal d'audit des validations, refus et signatures électroniques", icon: "fas fa-history", path: "/historique-decisions", badge: "", badge_color: "", is_active: true, display_order: 8, is_system: true },
    { id: "tableau-de-bord", key: "tableau-de-bord", label: "Tableau de Bord", description: "Indicateurs d'activité, respect des SLA et volumes d'accès par site", icon: "fas fa-chart-line", path: "/tableau-de-bord", badge: "KPIs", badge_color: "bg-emerald-100 text-emerald-800", is_active: true, display_order: 9, is_system: true },
    { id: "recherche", key: "recherche", label: "Recherche", description: "Recherche transversale tous dossiers, agents et matériel", icon: "fas fa-search", path: "/recherche", badge: "", badge_color: "", is_active: true, display_order: 10, is_system: true },
    { id: "documentation", key: "documentation", label: "Documentation", description: "Guides, manuels d'utilisation et fiches d'assistance", icon: "fas fa-book", path: "/documentation", badge: "Guides", badge_color: "bg-slate-100 text-slate-800", is_active: true, display_order: 11, is_system: true },
    { id: "delegation", key: "delegation", label: "Délégations", description: "Délégations temporaires de pouvoir de validation et suppléance", icon: "fas fa-exchange-alt", path: "/delegation", badge: "", badge_color: "", is_active: true, display_order: 12, required_privilege: "validate_requests", is_system: true },
    { id: "admin", key: "admin", label: "Espace Administrateur", description: "Gouvernance des workflows, tables, catalogues et droits d'accès RBAC", icon: "fas fa-shield-alt", path: "/admin", badge: "Admin", badge_color: "bg-purple-100 text-purple-800", is_active: true, display_order: 13, required_privilege: "manage_users", is_system: true }
];

const TAB_I18N_KEYS: Record<string, string> = {
    'catalogue': 'nav.catalogue',
    'mes-demandes': 'nav.myRequests',
    'assistant-ia': 'nav.aiAssistant',
    'espace-demandeur': 'nav.demandeurSpace',
    'workflows': 'nav.workflows',
    'corbeille': 'nav.corbeille',
    'regie': 'nav.regie',
    'console-nationale': 'nav.nationalConsole',
    'historique-decisions': 'nav.decisionsHistory',
    'tableau-de-bord': 'nav.dashboard',
    'recherche': 'nav.search',
    'documentation': 'nav.documentation',
    'delegation': 'nav.delegations',
    'admin': 'nav.adminSpace'
};

function Navigation({ user, onLogout }: { user: any; onLogout: () => void }) {
    const { t } = useTranslation();
    const location = useLocation();
    const { tenant } = useTenant();
    const privileges: string[] = user.privileges || [];
    const hasPrivilege = (priv: string) => privileges.includes(priv) || user.role === 'Administrateur';
    const [portalTabs, setPortalTabs] = useState<PortalTabConfigItem[]>(DEFAULT_PORTAL_TABS);
    const { isFeatureEnabled } = useFeatures();

    const loadPortalTabs = () => {
        fetch('/api/v1/admin/portal-tabs')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setPortalTabs(data);
                }
            })
            .catch(() => {
                // Keep default if network not yet ready
            });
    };

    useEffect(() => {
        loadPortalTabs();
        const handleTabsUpdated = () => loadPortalTabs();
        window.addEventListener('portal_tabs_updated', handleTabsUpdated);
        return () => {
            window.removeEventListener('portal_tabs_updated', handleTabsUpdated);
        };
    }, []);

    // Granular portal tab access helper based on role configuration & feature flags
    const hasTabAccess = (tabKey: string) => {
        if (tabKey === 'assistant-ia' && !isFeatureEnabled('ai_demandes')) {
            return false;
        }
        if (tabKey === 'delegation' && !isFeatureEnabled('delegation_approval')) {
            return false;
        }
        if (user.role === 'Administrateur') return true;
        if (user.portalTabs && typeof user.portalTabs[tabKey] === 'boolean') {
            return user.portalTabs[tabKey];
        }
        // Fallbacks for standard legacy roles
        if (tabKey === 'corbeille' || tabKey === 'delegation') {
            return hasPrivilege('validate_requests');
        }
        if (tabKey === 'admin') {
            return hasPrivilege('manage_users');
        }
        return true;
    };

    const isAdminRoute = location.pathname.startsWith('/admin') || 
                         location.pathname.startsWith('/tables-admin') ||
                         location.pathname.startsWith('/notifications-admin') ||
                         location.pathname.startsWith('/catalogues-admin') || 
                         location.pathname.startsWith('/formulaires-admin') ||
                         location.pathname.startsWith('/statuts-admin') ||
                         location.pathname.startsWith('/regles-metiers') ||
                         location.pathname.startsWith('/roles') || 
                         location.pathname.startsWith('/utilisateurs') || 
                         location.pathname.startsWith('/onglets-referentiels') ||
                         location.pathname.startsWith('/syslog');

    return (
        <div>
            <nav
                className="text-white shadow-md transition-colors"
                style={{ backgroundColor: 'var(--brand-primary, #1e3a8a)' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-6">
                            {tenant?.logo_url ? (
                                <Link to="/" className="flex items-center">
                                    <img src={tenant.logo_url} alt={tenant.name} className="h-8 max-w-[140px] object-contain bg-white/20 p-1 rounded" />
                                </Link>
                            ) : (
                                <Link
                                    to="/"
                                    className="flex items-center gap-1.5 bg-white font-bold px-3 py-1 rounded tracking-wide shadow-sm"
                                    style={{ color: 'var(--brand-primary, #1e3a8a)' }}
                                >
                                    <i className="fas fa-cube text-xs"></i>
                                    <span>{tenant?.name || 'Portail Opérationnel'}</span>
                                </Link>
                            )}
                            <div className="flex space-x-2 text-sm font-medium">
                                <Link to="/" className={`px-3 py-2 rounded-md transition ${!isAdminRoute && location.pathname === '/' ? 'bg-black/25 font-semibold' : 'hover:bg-white/10'}`}>
                                    <i className="fas fa-book-open mr-1.5"></i> {t('nav.portalName')}
                                </Link>
                                {hasTabAccess('admin') && (
                                    <Link
                                        to="/admin"
                                        className={`px-3 py-2 rounded-md transition ${isAdminRoute ? 'bg-black/25 font-bold border-b-2' : 'hover:bg-white/10'}`}
                                        style={{ borderColor: 'var(--brand-accent, #f59e0b)' }}
                                    >
                                        <i className="fas fa-shield-alt mr-1.5"></i> {t('nav.adminSpace')}
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Barre de recherche globale transversale */}
                        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-3 my-auto">
                            <GlobalSearch user={user} />
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Sélecteur bilingue Français / Anglais */}
                            <LanguageSelector />

                            {/* Centre de notifications & alertes en temps réel */}
                            <NotificationCenter user={user} />

                            <div className="flex items-center space-x-2 p-1.5 rounded bg-black/20 border border-white/20">
                                <div className="bg-white/20 rounded-full h-7 w-7 flex items-center justify-center font-bold text-xs">
                                    {(user.name || 'OP').substring(0,2).toUpperCase()}
                                </div>
                                <div className="text-xs">
                                    <div className="font-semibold leading-tight">{user.name}</div>
                                    <div className="text-[10px]" style={{ color: 'var(--brand-accent, #f59e0b)' }}>{user.role}</div>
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="text-red-300 hover:text-white text-sm p-1.5 rounded hover:bg-white/10 transition cursor-pointer"
                                title={t('nav.logout')}
                            >
                                <i className="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            {!isAdminRoute && (
                <div
                    className="text-white shadow-inner py-2.5 transition-colors"
                    style={{ backgroundColor: 'var(--brand-secondary, #0f172a)' }}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
                        {portalTabs
                            .filter(t => t.is_active && t.key !== 'admin')
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(tab => {
                                if (!hasTabAccess(tab.key)) return null;
                                const isCurrent = location.pathname === tab.path;
                                return (
                                    <Link
                                        key={tab.key}
                                        to={tab.path}
                                        className={`hover:opacity-100 transition flex items-center gap-1.5 ${isCurrent ? 'font-bold underline' : 'opacity-85'}`}
                                        style={{ color: isCurrent ? 'var(--brand-accent, #f59e0b)' : undefined }}
                                        title={tab.description}
                                    >
                                        <i className={`${tab.icon} mr-0.5 text-xs`}></i>
                                        <span>{TAB_I18N_KEYS[tab.key] ? t(TAB_I18N_KEYS[tab.key]) : tab.label}</span>
                                        {tab.badge && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab.badge_color || 'bg-yellow-400 text-blue-950'}`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                    </div>
                </div>
            )}
            {/* Bannière d'alerte opérationnelle (interventions nocturnes / échéances critiques) */}
            <AlertBanner user={user} />
        </div>
    );
}

function CatalogueFlow() {
    const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
    const searchParams = new URLSearchParams(window.location.search);
    const queryFormId = searchParams.get('formId');
    const queryProcessId = searchParams.get('processId');

    if (selectedProcessId || queryFormId || queryProcessId) {
        return (
            <NouvelleDemande
                initialProcessId={selectedProcessId || (queryProcessId ? Number(queryProcessId) : null)}
                onBackToCatalogue={() => {
                    setSelectedProcessId(null);
                    if (queryFormId || queryProcessId) {
                        window.history.replaceState({}, '', window.location.pathname);
                    }
                }}
            />
        );
    }
    return <Catalogue onSelectProcess={(id) => setSelectedProcessId(id)} />;
}

function AuthenticatedApp({ user, onLogout }: { user: any; onLogout: () => void }) {
    const { isFeatureEnabled } = useFeatures();
    const privileges: string[] = user.privileges || [];
    const canSeeCorbeille = user.role === 'Administrateur' || (user.portalTabs && user.portalTabs.corbeille !== undefined ? !!user.portalTabs.corbeille : privileges.includes('validate_requests'));
    const canSeeDelegation = user.role === 'Administrateur' || (user.portalTabs && user.portalTabs.delegation !== undefined ? !!user.portalTabs.delegation : privileges.includes('validate_requests'));
    const canSeeAdmin = user.role === 'Administrateur' || (user.portalTabs && user.portalTabs.admin !== undefined ? !!user.portalTabs.admin : privileges.includes('manage_users'));

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navigation user={user} onLogout={onLogout} />
            <Routes>
                <Route path="/" element={<CatalogueFlow />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/nouvelle-demande" element={<NouvelleDemande initialProcessId={null} onBackToCatalogue={() => window.location.href = '/'} />} />
                <Route path="/mes-demandes" element={<MesDemandes />} />
                {isFeatureEnabled('ai_demandes') && <Route path="/assistant-ia" element={<AssistantIA />} />}
                {isFeatureEnabled('ai_demandes') && <Route path="/ai-assistant" element={<AssistantIA />} />}
                <Route path="/espace-demandeur" element={<EspaceDemandeur />} />
                <Route path="/workflows" element={<WorkflowStateMachine />} />
                {canSeeCorbeille && <Route path="/corbeille" element={<Corbeille />} />}
                <Route path="/historique-decisions" element={<HistoriqueDecisions />} />
                <Route path="/tableau-de-bord" element={<TableauDeBord />} />
                <Route path="/console-nationale" element={<ConsoleNationale />} />
                <Route path="/regie" element={<Regie />} />
                <Route path="/recherche" element={<Recherche />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/entites" element={<Entites />} />
                <Route path="/referentiels" element={<Referentiels />} />
                {canSeeDelegation && <Route path="/delegation" element={<Delegation />} />}
                {canSeeAdmin && (
                    <>
                        <Route path="/admin/processus/:processId/studio" element={<AdminWorkflowStudio />} />
                        <Route path="/admin/workflow-studio/:processId" element={<AdminWorkflowStudio />} />
                        <Route path="/admin/workflow-studio" element={<AdminWorkflowStudio />} />
                        <Route element={<AdminLayout />}>
                            {/* Points d'accès canoniques de l'Espace Administrateur */}
                            <Route path="/admin" element={<AdminProcessus />} />
                            <Route path="/admin/processus" element={<AdminProcessus />} />
                            <Route path="/admin/catalogues" element={<CataloguesAdmin />} />
                            <Route path="/admin/formulaires" element={<AdminFormulaires />} />
                            <Route path="/admin/statuts" element={<AdminStatuts />} />
                            <Route path="/admin/regles-metiers" element={<AdminReglesMetier />} />
                            <Route path="/admin/notifications" element={<AdminNotifications />} />
                            <Route path="/admin/tables" element={<AdminTables />} />

                            {/* Onglets & Référentiels isolé */}
                            <Route path="/admin/onglets-referentiels" element={<AdminOngletsReferentiels />} />

                            {/* Paramètres Système & Règles isolé avec son composant dédié */}
                            <Route path="/admin/parametres-systeme" element={<AdminParametresSysteme />} />

                            {/* Marque Blanche & Multi-Tenant (Epic 1) */}
                            <Route path="/admin/marque-blanche" element={<AdminMarqueBlanche />} />

                            <Route path="/admin/roles" element={<Roles />} />
                            <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
                            <Route path="/admin/securite-mots-de-passe" element={<AdminSecuriteMotsDePasse />} />
                            <Route path="/admin/passwords-access" element={<Navigate to="/admin/securite-mots-de-passe" replace />} />
                            <Route path="/admin/syslog" element={<SyslogAudit />} />
                            <Route path="/admin/documentation" element={<DocumentationAdmin />} />
                            <Route path="/admin/entites" element={<Entites />} />
                            <Route path="/admin/referentiels" element={<Referentiels />} />
                            <Route path="/admin/base-de-donnees" element={<AdminBaseDeDonnees />} />
                            <Route path="/admin/sauvegardes" element={<Navigate to="/admin/base-de-donnees" replace />} />
                            <Route path="/admin/console-nationale" element={<ConsoleNationale />} />
                            <Route path="/admin/regie" element={<Regie />} />

                            {/* Redirections transparentes des anciens chemins et alias vers les routes canoniques */}
                            <Route path="/formulaires-admin" element={<Navigate to="/admin/formulaires" replace />} />
                            <Route path="/statuts-admin" element={<Navigate to="/admin/statuts" replace />} />
                            <Route path="/regles-metiers" element={<Navigate to="/admin/regles-metiers" replace />} />
                            <Route path="/notifications-admin" element={<Navigate to="/admin/notifications" replace />} />
                            <Route path="/tables-admin" element={<Navigate to="/admin/tables" replace />} />
                            <Route path="/catalogues-admin" element={<Navigate to="/admin/catalogues" replace />} />
                            <Route path="/onglets-referentiels" element={<Navigate to="/admin/onglets-referentiels" replace />} />
                            <Route path="/parametres-systeme" element={<Navigate to="/admin/parametres-systeme" replace />} />
                            <Route path="/marque-blanche" element={<Navigate to="/admin/marque-blanche" replace />} />
                            <Route path="/roles" element={<Navigate to="/admin/roles" replace />} />
                            <Route path="/utilisateurs" element={<Navigate to="/admin/utilisateurs" replace />} />
                            <Route path="/syslog" element={<Navigate to="/admin/syslog" replace />} />
                        </Route>
                    </>
                )}
            </Routes>
        </div>
    );
}

function UnauthenticatedApp({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
    const location = useLocation();
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>(() => {
        if (typeof window !== 'undefined') {
            if (window.location.pathname === '/register') return 'register';
            if (window.location.pathname === '/forgot-password') return 'forgot-password';
        }
        return 'login';
    });

    useEffect(() => {
        if (location.pathname === '/register') {
            setAuthMode('register');
        } else if (location.pathname === '/forgot-password') {
            setAuthMode('forgot-password');
        } else if (location.pathname === '/login') {
            setAuthMode('login');
        }
    }, [location.pathname]);

    return (
        <Routes>
            <Route
                path="/register"
                element={
                    <Register
                        onRegisterSuccess={onLoginSuccess}
                        onNavigateToLogin={() => setAuthMode('login')}
                    />
                }
            />
            <Route
                path="/reset-password"
                element={
                    <ResetPassword
                        onNavigateToLogin={() => setAuthMode('login')}
                    />
                }
            />
            <Route
                path="/forgot-password"
                element={
                    <Login
                        onLoginSuccess={onLoginSuccess}
                        onNavigateToRegister={() => setAuthMode('register')}
                        onNavigateToForgotPassword={() => setAuthMode('forgot-password')}
                        initialShowForgotPassword={true}
                    />
                }
            />
            <Route
                path="*"
                element={
                    authMode === 'register' ? (
                        <Register
                            onRegisterSuccess={onLoginSuccess}
                            onNavigateToLogin={() => setAuthMode('login')}
                        />
                    ) : (
                        <Login
                            onLoginSuccess={onLoginSuccess}
                            onNavigateToRegister={() => setAuthMode('register')}
                            onNavigateToForgotPassword={() => setAuthMode('forgot-password')}
                            initialShowForgotPassword={authMode === 'forgot-password'}
                        />
                    )
                }
            />
        </Routes>
    );
}

export default function App() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (savedUser && token) {
            try {
                const parsed = JSON.parse(savedUser);
                setUser({ ...parsed, token });
            } catch (e) {
                console.error("Invalid user JSON in localStorage");
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <LanguageProvider>
            <TenantProvider>
                <FeaturesProvider>
                    <AdminNavProvider>
                        <Router>
                            {user ? (
                                <AuthenticatedApp user={user} onLogout={handleLogout} />
                            ) : (
                                <UnauthenticatedApp onLoginSuccess={(u) => setUser(u)} />
                            )}
                        </Router>
                    </AdminNavProvider>
                </FeaturesProvider>
            </TenantProvider>
        </LanguageProvider>
    );
}
