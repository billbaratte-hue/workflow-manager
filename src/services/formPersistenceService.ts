import { FormTemplateItem, FormField } from '../pages/AdminFormulaires';
import {
    getFormulaires as apiGetFormulaires,
    getFormulaireById as apiGetFormulaireById,
    createFormulaire as apiCreateFormulaire,
    updateFormulaire as apiUpdateFormulaire,
    deleteFormulaire as apiDeleteFormulaire,
    duplicateFormulaire as apiDuplicateFormulaire
} from '../lib/api';

const STORAGE_KEY = 'portal_form_templates_v1';
const ACTIVE_FORM_ID_KEY = 'portal_active_form_id';
const FORMS_UPDATED_EVENT = 'portal:forms_updated';

// Formulaires par défaut intégrés pour la gestion des accès
export const DEFAULT_FORM_TEMPLATES: FormTemplateItem[] = [
    {
        id: 'form_meca_standard',
        name: 'Demande Clé Mécatronique Standard & Sécurisée',
        code: 'FORM-MECA-01',
        category_id: 1,
        description: 'Formulaire standard pour l’attribution d’une clé mécatronique EN 15864 / EN 16864, avec contrôle de site et motif d’intervention.',
        status: 'Actif',
        linked_process_id: 1,
        linked_tables: ['sites', 'equipments', 'durations', 'contractors'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fields: [
            {
                id: 'titre_mission',
                label: 'Intitulé de la mission ferroviaire',
                type: 'text',
                required: true,
                placeholder: 'Ex: Maintenance préventive aiguillage Gare de Lyon',
                help_text: 'Dénomination concise de l’opération technique.',
                col_span: 12
            },
            {
                id: 'site_id',
                label: 'Site / Emprise Ferroviaire d’intervention',
                type: 'table_ref',
                table_ref: 'sites',
                required: true,
                help_text: 'Sélectionnez le site ferroviaire sécurisé concerné.',
                col_span: 6
            },
            {
                id: 'equipment_type',
                label: 'Matériel ou Clé sollicitée',
                type: 'table_ref',
                table_ref: 'equipments',
                required: true,
                help_text: 'Clé mécatronique, cylindre électronique ou badge NFC.',
                col_span: 6
            },
            {
                id: 'intervention_duration',
                label: 'Durée de validité des droits d’accès',
                type: 'table_ref',
                table_ref: 'durations',
                required: true,
                help_text: 'Délai maximal avant révocation automatique des droits.',
                col_span: 6
            },
            {
                id: 'contractor_company',
                label: 'Entreprise intervenante / Direction',
                type: 'table_ref',
                table_ref: 'contractors',
                required: true,
                help_text: 'Entité titulaire du contrat ou service interne.',
                col_span: 6
            },
            {
                id: 'zone_securisee',
                label: 'Zone à accès réglementé / Voie spécifique',
                type: 'text',
                required: false,
                placeholder: 'Ex: Voie 4 - Zone d’aiguillage Ouest',
                col_span: 6
            },
            {
                id: 'contact_urgence',
                label: 'Numéro de contact d’urgence sur site',
                type: 'tel',
                required: true,
                placeholder: '06 12 34 56 78',
                help_text: 'Joignable impérativement pendant toute la durée de la mission.',
                col_span: 6
            },
            {
                id: 'motif_detaille',
                label: 'Description détaillée & Justification de l’intervention',
                type: 'textarea',
                required: true,
                placeholder: 'Détaillez le travail à effectuer, les consignes d’accès et les habilitations requises...',
                help_text: 'Indispensable pour l’instruction du dossier par le Responsable Sécurité.',
                col_span: 12
            },
            {
                id: 'attestation_nis2',
                label: 'Engagement conformité NIS 2 & Sécurité des installations',
                type: 'checkbox',
                required: true,
                help_text: 'L’agent s’engage à respecter la charte de sécurité ferroviaire.',
                default_value: true,
                col_span: 12
            }
        ]
    },
    {
        id: 'form_urgente_astreinte',
        name: 'Intervention d’Urgence / Astreinte Nocturne',
        code: 'FORM-URG-02',
        category_id: 1,
        description: 'Formulaire allégé pour astreintes et interventions critiques de nuit avec validation accélérée.',
        status: 'Actif',
        linked_process_id: 2,
        linked_tables: ['sites', 'equipments'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fields: [
            {
                id: 'titre_mission',
                label: 'Nature du sinistre ou motif d’urgence',
                type: 'text',
                required: true,
                placeholder: 'Incident caténaire ou dérangement d’installation...',
                col_span: 12
            },
            {
                id: 'site_id',
                label: 'Site Ferroviaire d’incident',
                type: 'table_ref',
                table_ref: 'sites',
                required: true,
                col_span: 6
            },
            {
                id: 'equipment_type',
                label: 'Type de clé ou passe requis',
                type: 'table_ref',
                table_ref: 'equipments',
                required: true,
                col_span: 6
            },
            {
                id: 'contact_urgence',
                label: 'Téléphone de l’agent d’astreinte',
                type: 'tel',
                required: true,
                placeholder: '06 00 00 00 00',
                col_span: 6
            },
            {
                id: 'date_debut',
                label: 'Date et heure de début d’intervention',
                type: 'datetime',
                required: true,
                col_span: 6
            },
            {
                id: 'motif_detaille',
                label: 'Détails des mesures conservatoires',
                type: 'textarea',
                required: true,
                placeholder: 'Précisez l’autorisation de travail ou le numéro d’avis d’incident...',
                col_span: 12
            }
        ]
    }
];

class FormPersistenceService {
    private isInitialized = false;

    /**
     * Lit les formulaires du localStorage en toute sécurité
     */
    private getLocal(): FormTemplateItem[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('[FormPersistenceService] Erreur lecture localStorage:', e);
            return [];
        }
    }

    /**
     * Écrit les formulaires dans le localStorage et émet un événement
     */
    private setLocal(forms: FormTemplateItem[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(FORMS_UPDATED_EVENT, { detail: { count: forms.length } }));
            }
        } catch (e) {
            console.error('[FormPersistenceService] Erreur écriture localStorage:', e);
        }
    }

    /**
     * Charge l'ensemble des formulaires dynamiques (synchronisation LocalStorage + API)
     */
    async getFormulaires(forceRefresh = false): Promise<FormTemplateItem[]> {
        const localForms = this.getLocal();

        // Si nous avons déjà des formulaires locaux et pas de rafraîchissement forcé
        if (!forceRefresh && localForms.length > 0 && this.isInitialized) {
            return localForms;
        }

        try {
            // Appel API vers le backend
            const res = await apiGetFormulaires();
            const apiForms: FormTemplateItem[] = Array.isArray(res.data) ? res.data : [];

            if (apiForms.length > 0) {
                // Fusionner intelligemment : donner la priorité aux modifications locales plus récentes si existantes
                const mergedMap = new Map<string, FormTemplateItem>();
                
                // Mettre d'abord les formulaires API
                apiForms.forEach(f => mergedMap.set(f.id, f));

                // Si des formulaires locaux ont été créés ou modifiés hors ligne
                localForms.forEach(lf => {
                    const existingApi = mergedMap.get(lf.id);
                    if (!existingApi) {
                        mergedMap.set(lf.id, lf);
                    } else if (lf.updated_at && (!existingApi.updated_at || new Date(lf.updated_at) > new Date(existingApi.updated_at))) {
                        mergedMap.set(lf.id, lf);
                    }
                });

                const mergedList = Array.from(mergedMap.values());
                this.setLocal(mergedList);
                this.isInitialized = true;
                return mergedList;
            }
        } catch (apiError) {
            console.warn('[FormPersistenceService] API indisponible ou en erreur, bascule vers le cache local/defaults:', apiError);
        }

        // Si l'API est vide ou a échoué mais qu'on a du local
        if (localForms.length > 0) {
            this.isInitialized = true;
            return localForms;
        }

        // Sinon initialiser avec les formulaires par défaut
        this.setLocal(DEFAULT_FORM_TEMPLATES);
        this.isInitialized = true;
        return DEFAULT_FORM_TEMPLATES;
    }

    /**
     * Récupère un formulaire par son ID
     */
    async getFormulaireById(id: string): Promise<FormTemplateItem | null> {
        const forms = await this.getFormulaires();
        return forms.find(f => f.id === id) || null;
    }

    /**
     * Sauvegarde ou met à jour un formulaire
     */
    async saveFormulaire(form: FormTemplateItem): Promise<FormTemplateItem> {
        const updatedForm: FormTemplateItem = {
            ...form,
            updated_at: new Date().toISOString()
        };

        // 1. Sauvegarde immédiate dans localStorage (Zéro latence pour l'utilisateur)
        const currentForms = this.getLocal();
        const existingIdx = currentForms.findIndex(f => f.id === updatedForm.id);
        let updatedList: FormTemplateItem[];

        if (existingIdx >= 0) {
            updatedList = [...currentForms];
            updatedList[existingIdx] = updatedForm;
        } else {
            updatedList = [updatedForm, ...currentForms];
        }

        this.setLocal(updatedList);

        // 2. Synchronisation asynchrone avec l'API backend
        try {
            if (existingIdx >= 0) {
                await apiUpdateFormulaire(updatedForm.id, updatedForm);
            } else {
                await apiCreateFormulaire(updatedForm);
            }
        } catch (apiErr) {
            console.warn('[FormPersistenceService] Synchro backend non disponible, conservé localement:', apiErr);
        }

        return updatedForm;
    }

    /**
     * Crée un nouveau formulaire
     */
    async createFormulaire(data: Partial<FormTemplateItem>): Promise<FormTemplateItem> {
        const newId = data.id || `form_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newForm: FormTemplateItem = {
            id: newId,
            name: data.name || 'Nouveau Formulaire Dynamique',
            code: data.code || `FORM-${Date.now().toString().slice(-4)}`,
            category_id: data.category_id || 1,
            description: data.description || '',
            status: data.status || 'Actif',
            fields: data.fields || [],
            linked_tables: data.linked_tables || ['sites'],
            linked_process_id: data.linked_process_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Sauvegarde locale
        const currentForms = this.getLocal();
        this.setLocal([newForm, ...currentForms]);

        // Appel API
        try {
            await apiCreateFormulaire(newForm);
        } catch (apiErr) {
            console.warn('[FormPersistenceService] Sauvegarde API échouée, formulaire conservé en local:', apiErr);
        }

        return newForm;
    }

    /**
     * Supprime un formulaire
     */
    async deleteFormulaire(id: string): Promise<void> {
        const currentForms = this.getLocal();
        const filtered = currentForms.filter(f => f.id !== id);
        this.setLocal(filtered);

        // Si c'était le formulaire actif par défaut, réinitialiser
        if (this.getActiveFormId() === id) {
            localStorage.removeItem(ACTIVE_FORM_ID_KEY);
        }

        try {
            await apiDeleteFormulaire(id);
        } catch (apiErr) {
            console.warn('[FormPersistenceService] Suppression API échouée:', apiErr);
        }
    }

    /**
     * Duplique un formulaire
     */
    async duplicateFormulaire(id: string): Promise<FormTemplateItem> {
        const currentForms = this.getLocal();
        const source = currentForms.find(f => f.id === id);
        if (!source) {
            throw new Error(`Formulaire source '${id}' introuvable.`);
        }

        const cloned: FormTemplateItem = {
            ...JSON.parse(JSON.stringify(source)),
            id: `form_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: `${source.name} (Copie)`,
            code: `${source.code}-COPY`,
            status: 'Brouillon',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.setLocal([cloned, ...currentForms]);

        try {
            await apiDuplicateFormulaire(id);
        } catch (apiErr) {
            console.warn('[FormPersistenceService] Duplication API échouée, conservé localement:', apiErr);
        }

        return cloned;
    }

    /**
     * Définit l'identifiant du formulaire actif choisi par l'utilisateur
     */
    setActiveFormId(id: string): void {
        try {
            localStorage.setItem(ACTIVE_FORM_ID_KEY, id);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(FORMS_UPDATED_EVENT, { detail: { activeFormId: id } }));
            }
        } catch (e) {}
    }

    /**
     * Récupère l'identifiant du formulaire actif choisi
     */
    getActiveFormId(): string | null {
        try {
            return localStorage.getItem(ACTIVE_FORM_ID_KEY);
        } catch (e) {
            return null;
        }
    }

    /**
     * Récupère le formulaire à utiliser pour une demande donnée (par process_id ou sélection active)
     */
    async resolveFormForRequest(processId?: number | null, preferredFormId?: string | null): Promise<FormTemplateItem | null> {
        const forms = await this.getFormulaires();
        if (forms.length === 0) return null;

        // 1. Si un ID spécifique est demandé
        if (preferredFormId) {
            const match = forms.find(f => f.id === preferredFormId);
            if (match) return match;
        }

        // 2. Si le formulaire actif global correspond
        const activeGlobalId = this.getActiveFormId();
        if (activeGlobalId) {
            const activeMatch = forms.find(f => f.id === activeGlobalId && f.status === 'Actif');
            if (activeMatch) return activeMatch;
        }

        // 3. Si un process_id est spécifié, chercher le formulaire associé
        if (processId) {
            const processForm = forms.find(f => f.linked_process_id === Number(processId) && f.status === 'Actif');
            if (processForm) return processForm;

            // Même en statut Brouillon si c'est le seul
            const anyProcessForm = forms.find(f => f.linked_process_id === Number(processId));
            if (anyProcessForm) return anyProcessForm;
        }

        // 4. Premier formulaire actif ou premier formulaire
        const firstActive = forms.find(f => f.status === 'Actif');
        return firstActive || forms[0];
    }
}

export const formPersistenceService = new FormPersistenceService();
