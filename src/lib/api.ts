import axios from 'axios';

const API_URL = ((import.meta as any).env?.VITE_API_URL as string) || '/api/v1';

const api = axios.create({ 
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Accept': 'application/json'
    }
});

api.interceptors.request.use(config => {
    let token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token && userStr) {
        try {
            const parsed = JSON.parse(userStr);
            if (parsed && parsed.token) {
                token = parsed.token;
                localStorage.setItem('token', token);
            }
        } catch {}
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantId = localStorage.getItem('tenant_id') || 'default';
    config.headers['x-tenant-id'] = tenantId;

    return config;
}, error => Promise.reject(error));

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            console.warn('Requête API non autorisée (401):', error.config?.url);
        }
        return Promise.reject(error);
    }
);

export const loginUser = (email: string, password?: string) => api.post('/auth/login', { email, password });
export const getCategories = () => api.get('/admin/categories');
export const createCategory = (data: any) => api.post('/admin/categories', data);
export const updateCategory = (id: number | string, data: any) => api.patch(`/admin/categories/${id}`, data);
export const updateCategoryStatus = (id: number | string, status: string) => api.patch(`/admin/categories/${id}`, { status });
export const deleteCategory = (id: number | string) => api.delete(`/admin/categories/${id}`);
export const getProcesses = () => api.get('/admin/processus');
export const createProcess = (data: any) => api.post('/admin/processus', data);
export const updateProcess = (id: number | string, data: any) => api.patch(`/admin/processus/${id}`, data);
export const deleteProcess = (id: number | string) => api.delete(`/admin/processus/${id}`);
export const duplicateProcess = (id: number | string) => api.post(`/admin/processus/${id}/duplicate`);
export const importProcesses = (data: any) => api.post('/admin/processus/import', data);
export const exportAllProcesses = () => api.get('/admin/processus/export/all');
export const resetProcessesToBlank = () => api.post('/admin/processus/reset-blank');
export const seedStandardProcesses = () => api.post('/admin/processus/seed-standard');

// Formulaires Dynamiques (Séparation Workflow vs Formulaires)
export const getFormulaires = () => api.get('/admin/formulaires');
export const getFormulaireById = (id: string) => api.get(`/admin/formulaires/${id}`);
export const createFormulaire = (data: any) => api.post('/admin/formulaires', data);
export const updateFormulaire = (id: string, data: any) => api.patch(`/admin/formulaires/${id}`, data);
export const deleteFormulaire = (id: string) => api.delete(`/admin/formulaires/${id}`);
export const duplicateFormulaire = (id: string) => api.post(`/admin/formulaires/${id}/duplicate`);

export const getUsers = () => api.get('/auth/users');
export const createUser = (data: any) => api.post('/auth/users', data);
export const updateUser = (id: number | string, data: any) => api.patch(`/auth/users/${id}`, data);
export const getRoles = () => api.get('/auth/roles');
export const createRole = (data: any) => api.post('/auth/roles', data);
export const updateRole = (id: number | string, data: any) => api.patch(`/auth/roles/${id}`, data);
export const deleteRole = (id: number | string) => api.delete(`/auth/roles/${id}`);
export const getAttributesSchema = () => api.get('/auth/attributes-schema');
export const addAttributeField = (data: any) => api.post('/auth/attributes-schema', data);

// Tables de Référence & Paramétrage Dynamique
export const getReferenceTables = () => api.get('/admin/tables');
export const getTables = getReferenceTables;
export const getTableById = (tableId: string) => api.get(`/admin/tables/${tableId}`);
export const createReferenceTable = (data: any) => api.post('/admin/tables', data);
export const updateReferenceTable = (tableId: string, data: any) => api.patch(`/admin/tables/${tableId}`, data);
export const deleteReferenceTable = (tableId: string) => api.delete(`/admin/tables/${tableId}`);
export const addTableRow = (tableId: string, rowData: any) => api.post(`/admin/tables/${tableId}/rows`, rowData);
export const updateTableRow = (tableId: string, rowId: string | number, rowData: any) => api.patch(`/admin/tables/${tableId}/rows/${rowId}`, rowData);
export const deleteTableRow = (tableId: string, rowId: string | number) => api.delete(`/admin/tables/${tableId}/rows/${rowId}`);
export const addTableColumn = (tableId: string, colData: any) => api.post(`/admin/tables/${tableId}/columns`, colData);
export const updateTableColumn = (tableId: string, columnKey: string, colData: any) => api.patch(`/admin/tables/${tableId}/columns/${columnKey}`, colData);
export const deleteTableColumn = (tableId: string, columnKey: string) => api.delete(`/admin/tables/${tableId}/columns/${columnKey}`);
export const addTableMetadataField = (tableId: string, fieldData: any) => api.post(`/admin/tables/${tableId}/metadata-fields`, fieldData);
export const updateTableMetadataField = (tableId: string, fieldKey: string, fieldData: any) => api.patch(`/admin/tables/${tableId}/metadata-fields/${fieldKey}`, fieldData);
export const deleteTableMetadataField = (tableId: string, fieldKey: string) => api.delete(`/admin/tables/${tableId}/metadata-fields/${fieldKey}`);
export const updateTableMetadataValues = (tableId: string, metadata: any, replace: boolean = false) => api.patch(`/admin/tables/${tableId}/metadata`, { metadata, replace });
export const deleteTableMetadataValue = (tableId: string, metaKey: string) => api.delete(`/admin/tables/${tableId}/metadata/${metaKey}`);

// Feature Flags & Modular Activation Options
export const getFeatures = () => api.get('/features');
export const updateFeature = (key: string, is_enabled: boolean) => api.patch(`/admin/features/${key}`, { is_enabled });
export const batchUpdateFeatures = (updates: Record<string, boolean>) => api.post('/admin/features/batch', { updates });

// Modèles de Notifications Prédéfinis (Espace Centralisé)
export const getNotificationTemplates = () => api.get('/admin/notification-templates');
export const createNotificationTemplate = (data: any) => api.post('/admin/notification-templates', data);
export const updateNotificationTemplate = (id: string, data: any) => api.patch(`/admin/notification-templates/${id}`, data);
export const deleteNotificationTemplate = (id: string) => api.delete(`/admin/notification-templates/${id}`);
export const duplicateNotificationTemplate = (id: string) => api.post(`/admin/notification-templates/${id}/duplicate`);
export const getPeopleFilterSettings = () => api.get('/admin/settings/people-filters');
export const updatePeopleFilterSettings = (filter_table_ids: string[]) => api.post('/admin/settings/people-filters', { filter_table_ids });

// Volet de Navigation Administrateur (Configuration personnalisée des éléments et des sections)
export const getAdminSidebarItems = () => api.get('/admin/sidebar-items');
export const createAdminSidebarItem = (data: any) => api.post('/admin/sidebar-items', data);
export const updateAdminSidebarItem = (key: string, data: any) => api.patch(`/admin/sidebar-items/${key}`, data);
export const deleteAdminSidebarItem = (key: string) => api.delete(`/admin/sidebar-items/${key}`);
export const batchUpdateAdminSidebarItems = (items: any[]) => api.put('/admin/sidebar-items', { items });
export const resetAdminSidebarItems = () => api.post('/admin/sidebar-items/reset');

// Sections du Volet de Navigation Administrateur
export const getAdminSidebarSections = () => api.get('/admin/sidebar-sections');
export const createAdminSidebarSection = (data: any) => api.post('/admin/sidebar-sections', data);
export const updateAdminSidebarSection = (key: string, data: any) => api.patch(`/admin/sidebar-sections/${key}`, data);
export const deleteAdminSidebarSection = (key: string) => api.delete(`/admin/sidebar-sections/${key}`);
export const batchUpdateAdminSidebarSections = (sections: any[]) => api.put('/admin/sidebar-sections', { sections });
export const resetAdminSidebarSections = () => api.post('/admin/sidebar-sections/reset');

// Requests and Sites
export const getSites = () => api.get('/requests/sites');
export const getRequests = () => api.get('/requests');
export const getRequestByRef = (ref: string) => api.get(`/requests/${ref}`);
export const getMyRequests = () => api.get('/requests/me');
export const createRequest = (data: any) => {
    if (data instanceof FormData) {
        return api.post('/requests', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return api.post('/requests', data);
};
export const updateRequestStatus = (ref: string, data: any) => api.patch(`/requests/${ref}`, data);
export const editRequest = (ref: string, data: { title?: string; description?: string; equipment_type?: string; site_name?: string }) => 
    api.patch(`/requests/${ref}`, { action: 'edit', ...data });
export const respondToComplement = (ref: string, response_text: string) => api.post(`/requests/${ref}/complement`, { response_text });
export const getDecisionHistory = () => api.get('/requests/decision-history');
export const getDelegations = () => api.get('/requests/delegations');
export const setDelegation = (data: any) => api.post('/requests/delegations', data);
export const getAuditLogs = () => api.get('/requests/audit-logs');
export const getExportExcelUrl = () => `${API_URL}/requests/export/excel`;
export const getExportPdfUrl = () => `${API_URL}/requests/export/pdf`;
export const getRequestPdfUrl = (reference: string) => `${API_URL}/requests/${encodeURIComponent(reference)}/pdf`;
export const getDocumentDownloadUrl = (filename: string) => `${API_URL}/requests/documents/${filename}`;

/**
 * Télécharge proprement l'autorisation d'accès PDF en gérant les tokens et erreurs HTTP
 */
export const downloadRequestPDF = async (reference: string): Promise<void> => {
    const cleanRef = (reference || '').trim();
    if (!cleanRef) throw new Error("Référence de demande invalide");

    const url = getRequestPdfUrl(cleanRef);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Accept': 'application/pdf, application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const parsed = JSON.parse(userStr);
            if (parsed?.email) headers['x-user-email'] = parsed.email;
            if (parsed?.role) headers['x-user-role'] = encodeURIComponent(parsed.role);
        } catch {}
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
        let msg = `Erreur HTTP ${response.status}`;
        try {
            const json = await response.json();
            if (json && json.error) msg = json.error;
        } catch {}
        throw new Error(msg);
    }

    const blob = await response.blob();
    if (!blob || blob.size < 50) {
        throw new Error("Le fichier PDF généré est vide.");
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = `autorisation_acces_${cleanRef}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
    }, 5000);
};

/**
 * Télécharge le registre PDF global des demandes
 */
export const downloadAllRequestsPDF = async (): Promise<void> => {
    const url = getExportPdfUrl();
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Accept': 'application/pdf, application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
        let msg = `Erreur export PDF (HTTP ${response.status})`;
        try {
            const json = await response.json();
            if (json && json.error) msg = json.error;
        } catch {}
        throw new Error(msg);
    }

    const blob = await response.blob();
    if (!blob || blob.size < 50) {
        throw new Error("Le fichier PDF reçu est vide.");
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = `demandes_acces.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
    }, 5000);
};

// AI Services
export const analyzeRequestAI = (data: {
    reference?: string;
    title: string;
    description: string;
    site_name?: string;
    equipment_type?: string;
}) => api.post('/ai/analyze-request', data);

export const assistDescriptionAI = (data: {
    draftText: string;
    equipment_type?: string;
    site_name?: string;
}) => api.post('/ai/assist-description', data);

export const recommendRoleFieldScopeAI = (data: {
    roleName: string;
    roleDesc?: string;
    tables: any[];
}) => api.post('/ai/recommend-role-field-scope', data);

export const auditRoleSimulationAI = (data: {
    role: any;
    tables?: any[];
    referenceTables?: any[];
}) => api.post('/ai/audit-role-simulation', data);

export const getAiStatus = () => api.get('/ai/status');

export const chatAI = (data: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}) => api.post('/ai/chat', data);

export const suggestWorkflowAI = (data: {
    description: string;
    constraints?: string;
}) => api.post('/ai/suggest-workflow', data);

// Notifications & Alertes en Temps Réel
export const getNotifications = (params?: { user_id?: number; role?: string }) => 
    api.get('/notifications', { params });

export const getOperationalAlerts = (params?: { user_id?: number; role?: string }) => 
    api.get('/notifications/alerts', { params });

export const markNotificationRead = (id: string) => 
    api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = (data?: { user_id?: number; role?: string }) => 
    api.post('/notifications/mark-all-read', data || {});

export const deleteNotification = (id: string) => 
    api.delete(`/notifications/${id}`);

// UX-01: Validation ou décision par lot
export const batchUpdateRequests = (data: {
    references: string[];
    action: 'approved' | 'rejected';
    motif?: string;
    user_id?: number;
    user_name?: string;
    user_role?: string;
}) => api.post('/requests/batch', data);

// Configurateur de Statuts (Status Configurator Zero-Code & Machine à États)
export const getStatuses = () => api.get('/admin/statuses');
export const getStatusByCode = (code: string) => api.get(`/admin/statuses/${encodeURIComponent(code)}`);
export const createStatus = (data: any) => api.post('/admin/statuses', data);
export const updateStatus = (code: string, data: any) => api.patch(`/admin/statuses/${encodeURIComponent(code)}`, data);
export const deleteStatus = (code: string) => api.delete(`/admin/statuses/${encodeURIComponent(code)}`);
export const duplicateStatus = (code: string) => api.post(`/admin/statuses/${encodeURIComponent(code)}/duplicate`);
export const batchUpdateStatusTransitions = (matrix: Array<{ code: string; allowed_transitions: string[] }>) =>
    api.post('/admin/statuses/matrix/transitions', { matrix });

// Catégories de Statuts (Phases de cycle de vie dynamiques)
export const getStatusCategories = () => api.get('/admin/statuses/categories');
export const createStatusCategory = (data: any) => api.post('/admin/statuses/categories', data);
export const updateStatusCategory = (code: string, data: any) => api.patch(`/admin/statuses/categories/${encodeURIComponent(code)}`, data);
export const deleteStatusCategory = (code: string) => api.delete(`/admin/statuses/categories/${encodeURIComponent(code)}`);

// Métadonnées du catalogue de statuts (Spécification / Référence personnalisable)
export const getStatusMetadata = () => api.get('/admin/statuses/metadata');
export const updateStatusMetadata = (data: any) => api.patch('/admin/statuses/metadata', data);

// Moteur de Règles Métiers Zero-Code (Business Rules Engine)
export const getBusinessRules = () => api.get('/admin/rules');
export const createBusinessRule = (data: any) => api.post('/admin/rules', data);
export const updateBusinessRule = (id: string, data: any) => api.patch(`/admin/rules/${encodeURIComponent(id)}`, data);
export const deleteBusinessRule = (id: string) => api.delete(`/admin/rules/${encodeURIComponent(id)}`);
export const toggleBusinessRule = (id: string) => api.post(`/admin/rules/${encodeURIComponent(id)}/toggle`);
export const duplicateBusinessRule = (id: string) => api.post(`/admin/rules/${encodeURIComponent(id)}/duplicate`);
export const testBusinessRule = (rule: any, testPayload: any) => api.post('/admin/rules/test', { rule, test_payload: testPayload });

// Domaines & Thématiques Métiers (Rule Domains)
export const getRuleDomains = () => api.get('/admin/rule-domains');
export const createRuleDomain = (data: any) => api.post('/admin/rule-domains', data);
export const updateRuleDomain = (id: string, data: any) => api.patch(`/admin/rule-domains/${encodeURIComponent(id)}`, data);
export const deleteRuleDomain = (id: string) => api.delete(`/admin/rule-domains/${encodeURIComponent(id)}`);
export const resetRuleDomains = () => api.post('/admin/rule-domains/reset');

// ==============================================================================
// Épique 3 : Moteurs Métiers Spécialisés & Services de Sécurité
// ==============================================================================

// US 3.1: Affectation Dynamique & Moteur de Routage Contextuel
export const evaluateAssignment = (requestData: any) =>
    api.post('/admin/assignment/evaluate', { request: requestData });

// US 3.2: Champs Conditionnels & Règles Formulaires Dynamiques
export const evaluateConditionalFields = (formData: any) =>
    api.post('/admin/rules/conditional-fields/evaluate', { formData });

// US 3.3: Contrats de Restitution Matérielle & Pénalités
export const getReturnContracts = (agentId?: number | string) =>
    api.get('/admin/hardware/contrats-retour', { params: agentId ? { agentId } : {} });
export const createReturnContract = (data: { beneficiaireId: number; beneficiaireName: string; items: any[]; requestId?: number }) =>
    api.post('/admin/hardware/contrats-retour', data);
export const transitionReturnContract = (id: string, data: { inspectedItems: any[]; inspectorName?: string }) =>
    api.post(`/admin/hardware/contrats-retour/${encodeURIComponent(id)}/transition`, data);
export const updateReturnContractStatus = (id: string, state: string, actor?: string) =>
    api.patch(`/admin/hardware/contrats-retour/${encodeURIComponent(id)}/status`, { state, actor });

// US 3.4: Rétention & Conformité RGPD
export const runGdprRetention = (config?: { rejectedDossiersRetentionDays?: number; completedDossiersRetentionDays?: number; anonymizeOnly?: boolean }) =>
    api.post('/admin/retention/run', config || {});
export const getGdprRetentionStatus = () =>
    api.get('/admin/retention/status');

// ==============================================================================
// Épique 1 : Architecture Multi-Tenant & Marque Blanche
// ==============================================================================
export const getTenantCurrent = () => api.get('/tenant/current');
export const updateTenantBranding = (data: any) => api.patch('/tenant/current', data);
export const uploadTenantLogo = (logo_url: string) => api.post('/tenant/logo', { logo_url });
export const getAllTenants = () => api.get('/tenant');
export const createTenant = (data: any) => api.post('/tenant', data);
export const deleteTenant = (tenantId: string) => api.delete(`/tenant/${encodeURIComponent(tenantId)}`);

// ==============================================================================
// Épique 2 : Import CSV générique avec mapping
// ==============================================================================
export const importTableCsv = (tableId: string, rows: any[]) =>
    api.post(`/admin/tables/${encodeURIComponent(tableId)}/import-csv`, { rows });

export default api;
