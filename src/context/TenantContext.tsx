import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface TenantInfo {
    id: string;
    name: string;
    code: string;
    logo_url?: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    description?: string;
    css_variables?: Record<string, string>;
}

interface TenantContextType {
    tenant: TenantInfo;
    allTenants: TenantInfo[];
    loading: boolean;
    updateBranding: (data: Partial<TenantInfo>) => Promise<boolean>;
    uploadLogo: (logoUrlOrData: string) => Promise<boolean>;
    switchTenant: (tenantId: string) => Promise<void>;
    createTenant: (data: Partial<TenantInfo>) => Promise<TenantInfo | null>;
    refreshTenant: () => Promise<void>;
}

const DEFAULT_TENANT: TenantInfo = {
    id: 'default',
    name: "Portail d'Opérations & Habilitations",
    code: 'DEFAULT',
    logo_url: '',
    primary_color: '#1e3a8a', // Deep Blue
    secondary_color: '#0f172a', // Slate 900
    accent_color: '#f59e0b', // Amber 500
    description: 'Plateforme Marque Blanche Multi-Entreprises',
    css_variables: {
        '--brand-primary': '#1e3a8a',
        '--brand-secondary': '#0f172a',
        '--brand-accent': '#f59e0b',
    }
};

const TenantContext = createContext<TenantContextType>({
    tenant: DEFAULT_TENANT,
    allTenants: [DEFAULT_TENANT],
    loading: false,
    updateBranding: async () => false,
    uploadLogo: async () => false,
    switchTenant: async () => {},
    createTenant: async () => null,
    refreshTenant: async () => {}
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tenant, setTenant] = useState<TenantInfo>(() => {
        try {
            const saved = localStorage.getItem('active_tenant_branding');
            if (saved) return JSON.parse(saved);
        } catch {}
        return DEFAULT_TENANT;
    });
    const [allTenants, setAllTenants] = useState<TenantInfo[]>([DEFAULT_TENANT]);
    const [loading, setLoading] = useState(false);

    const applyCssVariables = (info: TenantInfo) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const primary = info.primary_color || '#1e3a8a';
        const secondary = info.secondary_color || '#0f172a';
        const accent = info.accent_color || '#f59e0b';

        root.style.setProperty('--brand-primary', primary);
        root.style.setProperty('--brand-secondary', secondary);
        root.style.setProperty('--brand-accent', accent);
        
        // Also update document title dynamically
        if (info.name) {
            document.title = info.name;
        }
    };

    const loadTenant = async () => {
        try {
            const currentTenantId = localStorage.getItem('tenant_id') || 'default';
            const res = await axios.get('/api/v1/tenant/current', {
                headers: { 'x-tenant-id': currentTenantId }
            });
            if (res.data?.tenant) {
                const loaded = res.data.tenant;
                setTenant(loaded);
                applyCssVariables(loaded);
                localStorage.setItem('active_tenant_branding', JSON.stringify(loaded));
            }
        } catch (e) {
            // Fallback to current state
            applyCssVariables(tenant);
        }
    };

    const loadAllTenants = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('/api/v1/tenant', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(res.data)) {
                setAllTenants(res.data);
            }
        } catch {}
    };

    useEffect(() => {
        applyCssVariables(tenant);
        loadTenant();
        loadAllTenants();
    }, []);

    const updateBranding = async (data: Partial<TenantInfo>): Promise<boolean> => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const currentTenantId = localStorage.getItem('tenant_id') || 'default';
            const res = await axios.patch('/api/v1/tenant/current', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-tenant-id': currentTenantId
                }
            });
            if (res.data?.tenant) {
                const updated = res.data.tenant;
                setTenant(updated);
                applyCssVariables(updated);
                localStorage.setItem('active_tenant_branding', JSON.stringify(updated));
                await loadAllTenants();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to update tenant branding:', e);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const uploadLogo = async (logoUrlOrData: string): Promise<boolean> => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const currentTenantId = localStorage.getItem('tenant_id') || 'default';
            const res = await axios.post('/api/v1/tenant/logo', { logo_url: logoUrlOrData }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-tenant-id': currentTenantId
                }
            });
            if (res.data?.logo_url) {
                const updated = { ...tenant, logo_url: res.data.logo_url };
                setTenant(updated);
                localStorage.setItem('active_tenant_branding', JSON.stringify(updated));
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to upload logo:', e);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const switchTenant = async (newTenantId: string): Promise<void> => {
        localStorage.setItem('tenant_id', newTenantId);
        await loadTenant();
        window.location.reload();
    };

    const createTenant = async (data: Partial<TenantInfo>): Promise<TenantInfo | null> => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/v1/tenant', data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.tenant) {
                await loadAllTenants();
                return res.data.tenant;
            }
            return null;
        } catch (e) {
            console.error('Failed to create tenant:', e);
            return null;
        }
    };

    return (
        <TenantContext.Provider value={{
            tenant,
            allTenants,
            loading,
            updateBranding,
            uploadLogo,
            switchTenant,
            createTenant,
            refreshTenant: loadTenant
        }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => useContext(TenantContext);
