import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRequest, getSites, assistDescriptionAI, getTableById, evaluateAssignment, evaluateConditionalFields } from '../lib/api';
import { useFeatures } from '../context/FeaturesContext';
import { formPersistenceService } from '../services/formPersistenceService';
import { FormTemplateItem, FormField } from './AdminFormulaires';
import {
    ArrowLeft,
    UploadCloud,
    FileText,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    X,
    Shield,
    MapPin,
    Cpu,
    UserCheck,
    Clock,
    Users,
    UserPlus,
    Trash2,
    Building2,
    Compass,
    Layers,
    Search,
    CheckSquare,
    Square,
    Check,
    SlidersHorizontal,
    Tag,
    Star,
    ClipboardList,
    Database,
    Calendar,
    Hash,
    Mail,
    Phone,
    AlignLeft
} from 'lucide-react';

interface TeamMemberInput {
    name: string;
    role_or_qualification: string;
    company: string;
    phone: string;
}

interface NouvelleDemandeProps {
    initialProcessId: number | null;
    onBackToCatalogue: () => void;
}

export default function NouvelleDemande({ initialProcessId, onBackToCatalogue }: NouvelleDemandeProps) {
    const { isFeatureEnabled } = useFeatures();
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number>(1);
    
    // Dynamic Form Templates (persistance via formPersistenceService)
    const [availableFormTemplates, setAvailableFormTemplates] = useState<FormTemplateItem[]>([]);
    const [selectedFormTemplate, setSelectedFormTemplate] = useState<FormTemplateItem | null>(null);
    const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
    const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({});
    const [refTablesCache, setRefTablesCache] = useState<Record<string, any[]>>({});
    
    // Dynamic Table Configurations (Admin-driven)
    const [equipmentTableConfig, setEquipmentTableConfig] = useState<any>(null);
    const [siteTableConfig, setSiteTableConfig] = useState<any>(null);
    const [durationTableConfig, setDurationTableConfig] = useState<any>(null);
    const [equipmentRows, setEquipmentRows] = useState<any[]>([]);
    const [selectedEquipments, setSelectedEquipments] = useState<string[]>(['Clé Mécatronique EN 15864']);

    const [equipmentType, setEquipmentType] = useState('Clé Mécatronique EN 15864');
    const [equipmentOptions, setEquipmentOptions] = useState<string[]>([
        'Clé Mécatronique EN 15864',
        'Cylindre Électronique EN 16864',
        'Cadenas Bluetooth Haute Sécurité',
        'Badge RFID Emprise Ferroviaire'
    ]);
    const [contractorOptions, setContractorOptions] = useState<string[]>([
        'Direction des Infrastructures - Infralog',
        'Colas Rail',
        'ETF Ferroviaire',
        'TSO Caténaires & Voies',
        'Alstom Transport Services'
    ]);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [titre, setTitre] = useState('');
    const [description, setDescription] = useState('');
    const [interventionDuration, setInterventionDuration] = useState('Ponctuelle (24h)');
    const [durationOptions, setDurationOptions] = useState<Array<{ id: string; name: string; description?: string }>>([
        { id: '24h', name: 'Ponctuelle (24h)', description: 'Ponctuelle (24 heures) - Clé à révocation automatique' },
        { id: '7d', name: 'Hebdomadaire (7 jours)', description: 'Hebdomadaire (7 jours)' },
        { id: '30d', name: 'Mensuelle (30 jours)', description: 'Mensuelle (30 jours)' },
        { id: '1y', name: 'Permanente (1 an)', description: 'Permanente (1 an) - Réservé chefs d\'équipe' }
    ]);
    
    // UX-02: Mode Demande Groupée / Équipe
    const [isTeamRequest, setIsTeamRequest] = useState<boolean>(false);
    const [teamName, setTeamName] = useState<string>('');
    const [teamCompany, setTeamCompany] = useState<string>('Direction des Infrastructures - Infralog');
    const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([
        { name: 'Daniel Dupont (Chef d\'équipe)', role_or_qualification: 'Chef d\'équipe - C18 H0B0', company: 'Direction des Infrastructures', phone: '06 12 34 56 78' },
        { name: '', role_or_qualification: '', company: '', phone: '' }
    ]);

    // UX-03: Périmètre d'Intervention Multi-Sites / Multi-Régions
    const [isMultiSiteScope, setIsMultiSiteScope] = useState<boolean>(false);
    const [scopeType, setScopeType] = useState<'single_site' | 'multi_sites' | 'multi_regions'>('single_site');
    const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([1]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [siteSearchQuery, setSiteSearchQuery] = useState<string>('');
    const [activeRegionFilter, setActiveRegionFilter] = useState<string>('all');
    
    // File upload state (Étape B)
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AI Assistance state (Étape D)
    const [isAiAssisting, setIsAiAssisting] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Épique 3: Affectation Dynamique (US 3.1) & Champs Conditionnels (US 3.2)
    const [dynamicRouting, setDynamicRouting] = useState<{
        ruleApplied: string;
        stages: Array<{
            index: number;
            name: string;
            assignedRole: string;
            assignedUserName?: string;
            slaHours: number;
            mandatory: boolean;
        }>;
    } | null>(null);
    const [gpsLatitude, setGpsLatitude] = useState<string>('');
    const [gpsLongitude, setGpsLongitude] = useState<string>('');
    const [safetyAccreditation, setSafetyAccreditation] = useState<string>('');
    const [conditionalErrors, setConditionalErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        getSites()
            .then(res => {
                setSites(res.data);
                if (res.data && res.data.length > 0) {
                    setSelectedSiteId(res.data[0].id);
                    setSelectedSiteIds([res.data[0].id]);
                    if (res.data[0].region) {
                        setSelectedRegions([res.data[0].region]);
                    }
                }
            })
            .catch(err => console.error("Erreur chargement sites:", err));

        getTableById('sites')
            .then(res => {
                if (res.data) {
                    setSiteTableConfig(res.data);
                }
            })
            .catch(() => {});

        getTableById('equipments')
            .then(res => {
                if (res.data) {
                    setEquipmentTableConfig(res.data);
                    if (Array.isArray(res.data?.rows) && res.data.rows.length > 0) {
                        setEquipmentRows(res.data.rows);
                        const names = res.data.rows.map((r: any) => r.name || r.code).filter(Boolean);
                        if (names.length > 0) {
                            setEquipmentOptions(names);
                            setEquipmentType(names[0]);
                            setSelectedEquipments([names[0]]);
                        }
                    }
                }
            })
            .catch(() => {});

        getTableById('durations')
            .then(res => {
                if (res.data) {
                    setDurationTableConfig(res.data);
                    if (Array.isArray(res.data?.rows) && res.data.rows.length > 0) {
                        const items = res.data.rows.map((r: any) => ({
                            id: String(r.id || r.code),
                            name: String(r.name || r.code),
                            description: r.description ? String(r.description) : undefined
                        }));
                        setDurationOptions(items);
                        setInterventionDuration(items[0].name);
                    }
                }
            })
            .catch(() => {});

        getTableById('contractors')
            .then(res => {
                if (Array.isArray(res.data?.rows) && res.data.rows.length > 0) {
                    const names = res.data.rows.map((r: any) => r.name).filter(Boolean);
                    if (names.length > 0) {
                        setContractorOptions(names);
                    }
                }
            })
            .catch(() => {});

        getTableById('roles')
            .then(res => {
                if (Array.isArray(res.data?.rows) && res.data.rows.length > 0) {
                    const roleNames = res.data.rows.map((r: any) => r.name).filter(Boolean);
                    if (roleNames.length > 0) {
                        setAvailableRoles(roleNames);
                    }
                }
            })
            .catch(() => {});
    }, []);

    // Calcul automatique en temps réel de l'affectation dynamique (Epic 3 - US 3.1)
    useEffect(() => {
        let hours = 24;
        if (interventionDuration.includes('7d') || interventionDuration.includes('7 jours')) hours = 168;
        else if (interventionDuration.includes('30d') || interventionDuration.includes('30 jours')) hours = 720;
        else if (interventionDuration.includes('1y') || interventionDuration.includes('1 an')) hours = 8760;

        const currentSite = sites.find(s => s.id === selectedSiteId);
        const currentEquip = selectedEquipments[0] || equipmentType;

        evaluateAssignment({
            siteId: selectedSiteId,
            siteName: currentSite ? currentSite.name : 'Paris Gare du Nord',
            region: currentSite?.region,
            isTeamRequest,
            durationHours: hours,
            equipmentType: currentEquip
        }).then(res => {
            if (res.data) {
                setDynamicRouting(res.data);
            }
        }).catch(err => {
            console.warn('Erreur evaluateAssignment:', err);
        });
    }, [selectedSiteId, isTeamRequest, interventionDuration, selectedEquipments, equipmentType, sites]);

    // Validation en temps réel des champs conditionnels (Epic 3 - US 3.2)
    useEffect(() => {
        const currentEquip = selectedEquipments[0] || equipmentType;
        const errors: Record<string, string> = {};

        const requiresGps = currentEquip.includes('Cylindre') || currentEquip.includes('Borne');
        if (requiresGps && (!gpsLatitude || !gpsLongitude)) {
            errors.gps = 'Coordonnées GPS obligatoires pour la pose de ce matériel mécatronique.';
        }

        if (isTeamRequest && !teamName.trim()) {
            errors.team_name = 'Le nom de l\'équipe est obligatoire pour une demande collective.';
        }

        setConditionalErrors(errors);
    }, [selectedEquipments, equipmentType, gpsLatitude, gpsLongitude, isTeamRequest, teamName]);

    // Chargement dynamique du formulaire configuré par l'Administrateur
    useEffect(() => {
        let isMounted = true;

        const loadFormsAndResolve = async () => {
            try {
                const forms = await formPersistenceService.getFormulaires();
                if (!isMounted) return;
                setAvailableFormTemplates(forms);

                // Récupération éventuelle de formId dans l'URL
                const urlParams = new URLSearchParams(window.location.search);
                const queryFormId = urlParams.get('formId');

                const resolved = await formPersistenceService.resolveFormForRequest(initialProcessId, queryFormId);
                if (resolved && isMounted) {
                    applyFormTemplate(resolved);
                }
            } catch (err) {
                console.warn('Erreur résolution formulaire persistant:', err);
            }
        };

        loadFormsAndResolve();

        const handleFormsUpdateEvent = () => {
            loadFormsAndResolve();
        };

        window.addEventListener('portal:forms_updated', handleFormsUpdateEvent);
        return () => {
            isMounted = false;
            window.removeEventListener('portal:forms_updated', handleFormsUpdateEvent);
        };
    }, [initialProcessId]);

    const applyFormTemplate = async (template: FormTemplateItem) => {
        setSelectedFormTemplate(template);

        const initialValues: Record<string, any> = {};
        if (Array.isArray(template.fields)) {
            template.fields.forEach(f => {
                if (f.default_value !== undefined) {
                    initialValues[f.id] = f.default_value;
                } else if (f.type === 'checkbox') {
                    initialValues[f.id] = false;
                } else {
                    initialValues[f.id] = '';
                }
            });
        }

        setDynamicFormData(prev => ({
            ...initialValues,
            ...prev,
            ...(titre ? { titre, titre_mission: titre } : {}),
            ...(description ? { description, motif_demande: description, motif_detaille: description } : {})
        }));

        // Charger les tables référentielles nécessaires
        if (Array.isArray(template.fields)) {
            const tableNames = template.fields
                .filter(f => f.type === 'table_ref' && f.table_ref)
                .map(f => f.table_ref as string);

            for (const tbl of tableNames) {
                try {
                    const res = await getTableById(tbl);
                    if (res.data?.rows) {
                        setRefTablesCache(prev => ({ ...prev, [tbl]: res.data.rows }));
                    }
                } catch (e) {}
            }
        }
    };

    const handleDynamicFieldChange = (fieldId: string, value: any) => {
        setDynamicFormData(prev => ({ ...prev, [fieldId]: value }));
        if (dynamicErrors[fieldId]) {
            setDynamicErrors(prev => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
        }

        // Synchroniser avec les états standards si correspondant
        if (fieldId === 'titre_mission' || fieldId === 'titre') {
            setTitre(String(value));
        } else if (fieldId === 'motif_detaille' || fieldId === 'motif_demande' || fieldId === 'description') {
            setDescription(String(value));
        } else if (fieldId === 'site_id') {
            const parsed = Number(value);
            if (!isNaN(parsed) && parsed > 0) {
                setSelectedSiteId(parsed);
                setSelectedSiteIds([parsed]);
            }
        } else if (fieldId === 'equipment_type') {
            setEquipmentType(String(value));
            setSelectedEquipments([String(value)]);
        } else if (fieldId === 'intervention_duration') {
            setInterventionDuration(String(value));
        } else if (fieldId === 'contractor_company') {
            setTeamCompany(String(value));
        }
    };

    const renderDynamicField = (field: FormField) => {
        const value = dynamicFormData[field.id] !== undefined ? dynamicFormData[field.id] : (field.default_value || '');
        const error = dynamicErrors[field.id];
        const spanClass = field.col_span === 4 ? 'sm:col-span-4' : field.col_span === 6 ? 'sm:col-span-6' : 'sm:col-span-12';

        return (
            <div key={field.id} className={`${spanClass} space-y-1`}>
                <label className="block text-xs font-semibold text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        {field.label}
                        {field.required && <span className="text-red-500 font-bold">*</span>}
                    </span>
                    {field.type === 'table_ref' && (
                        <span className="text-[10px] text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                            Table: {field.table_ref}
                        </span>
                    )}
                </label>

                {/* Text / Email / Tel */}
                {(field.type === 'text' || field.type === 'email' || field.type === 'tel') && (
                    <input
                        type={field.type}
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || `Saisir ${field.label.toLowerCase()}...`}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    />
                )}

                {/* Number */}
                {field.type === 'number' && (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || '0'}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    />
                )}

                {/* Textarea */}
                {field.type === 'textarea' && (
                    <textarea
                        rows={3}
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || `Détaillez ${field.label.toLowerCase()}...`}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    />
                )}

                {/* Date / Datetime */}
                {(field.type === 'date' || field.type === 'datetime') && (
                    <input
                        type={field.type === 'date' ? 'date' : 'datetime-local'}
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    />
                )}

                {/* Select personnalisé */}
                {field.type === 'select' && (
                    <select
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    >
                        <option value="">Sélectionnez une option...</option>
                        {field.options ? (
                            field.options.split(/[\n,]+/).map((opt, idx) => {
                                const clean = opt.trim();
                                if (!clean) return null;
                                return <option key={idx} value={clean}>{clean}</option>;
                            })
                        ) : (
                            <option value="Option standard">Option standard</option>
                        )}
                    </select>
                )}

                {/* Table Référentielle */}
                {field.type === 'table_ref' && (
                    <select
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    >
                        <option value="">Sélectionnez un élément de référence...</option>
                        {field.table_ref === 'sites' ? (
                            sites.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.code}) - {s.region || 'National'}
                                </option>
                            ))
                        ) : field.table_ref === 'equipments' ? (
                            equipmentOptions.map((eq, i) => (
                                <option key={i} value={eq}>{eq}</option>
                            ))
                        ) : field.table_ref === 'durations' ? (
                            durationOptions.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))
                        ) : field.table_ref === 'contractors' ? (
                            contractorOptions.map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                            ))
                        ) : field.table_ref === 'roles' ? (
                            availableRoles.map((r, i) => (
                                <option key={i} value={r}>{r}</option>
                            ))
                        ) : refTablesCache[field.table_ref || ''] ? (
                            refTablesCache[field.table_ref || ''].map((row: any, i: number) => (
                                <option key={i} value={row.name || row.code || row.id}>
                                    {row.name || row.code || `Élément #${row.id}`}
                                </option>
                            ))
                        ) : (
                            <option value={value || 'Valeur par défaut'}>{value || 'Valeur par défaut'}</option>
                        )}
                    </select>
                )}

                {/* Checkbox */}
                {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleDynamicFieldChange(field.id, e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-700 font-medium">
                            {field.placeholder || "Valider et accepter cette condition"}
                        </span>
                    </label>
                )}

                {/* Radio */}
                {field.type === 'radio' && (
                    <div className="flex flex-wrap gap-3 pt-1">
                        {(field.options ? field.options.split(/[\n,]+/) : ['Oui', 'Non']).map((opt, i) => {
                            const clean = opt.trim();
                            if (!clean) return null;
                            return (
                                <label key={i} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                                    <input
                                        type="radio"
                                        name={`radio_${field.id}`}
                                        value={clean}
                                        checked={value === clean}
                                        onChange={() => handleDynamicFieldChange(field.id, clean)}
                                        className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                    />
                                    <span>{clean}</span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {/* GPS */}
                {field.type === 'gps' && (
                    <div className="relative">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "Ex: 48.8443, 2.3744 (Lat, Long)"}
                            className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden pl-8`}
                        />
                        <MapPin className="w-3.5 h-3.5 text-red-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                )}

                {/* Tag / Habilitation */}
                {field.type === 'tag' && (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleDynamicFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Ex: C18 H0B0, SST, Chef de bord"}
                        className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-hidden`}
                    />
                )}

                {/* Help text & error */}
                {field.help_text && !error && (
                    <p className="text-[11px] text-gray-500">{field.help_text}</p>
                )}
                {error && (
                    <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {error}
                    </p>
                )}
            </div>
        );
    };

    const selectedSite = sites.find(s => s.id === selectedSiteId) || sites[0];

    // Liste des régions disponibles
    const availableRegions = useMemo(() => {
        const set = new Set<string>();
        sites.forEach(s => {
            if (s.region) set.add(s.region);
        });
        return Array.from(set);
    }, [sites]);

    // Sites filtrés pour la sélection multi-sites
    const filteredSites = useMemo(() => {
        return sites.filter(s => {
            const matchesQuery = !siteSearchQuery.trim() ||
                s.name.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                s.code.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                s.region.toLowerCase().includes(siteSearchQuery.toLowerCase());
            const matchesRegion = activeRegionFilter === 'all' || s.region === activeRegionFilter;
            return matchesQuery && matchesRegion;
        });
    }, [sites, siteSearchQuery, activeRegionFilter]);

    // Sites couverts par la sélection actuelle
    const coveredSitesList = useMemo(() => {
        if (!isMultiSiteScope || scopeType === 'single_site') {
            return selectedSite ? [selectedSite] : [];
        }
        if (scopeType === 'multi_regions') {
            return sites.filter(s => selectedRegions.includes(s.region));
        }
        return sites.filter(s => selectedSiteIds.includes(s.id));
    }, [isMultiSiteScope, scopeType, selectedSite, sites, selectedRegions, selectedSiteIds]);

    const handleToggleSite = (siteId: number) => {
        setSelectedSiteIds(prev => {
            if (prev.includes(siteId)) {
                if (prev.length <= 1) return prev; // Conserver au moins 1 site
                return prev.filter(id => id !== siteId);
            } else {
                return [...prev, siteId];
            }
        });
    };

    // Configuration des sites : autorise ou interdit le multi-sites selon la table de référence
    const isSiteMultiAllowed = siteTableConfig?.allow_multiple !== false;

    // Bascule de sélection d'équipements (simple ou multiple selon la configuration de la table)
    const handleToggleEquipment = (eqName: string) => {
        if (equipmentTableConfig?.allow_multiple) {
            setSelectedEquipments(prev => {
                if (prev.includes(eqName)) {
                    if (prev.length <= 1) return prev; // Conserver au moins un équipement
                    return prev.filter(item => item !== eqName);
                }
                return [...prev, eqName];
            });
        } else {
            setSelectedEquipments([eqName]);
            setEquipmentType(eqName);
        }
    };

    // Groupement dynamique des équipements selon la colonne de regroupement (ex: category)
    const groupedEquipments = useMemo(() => {
        const groupCol = equipmentTableConfig?.grouping_column || 'category';
        const groups: Record<string, any[]> = {};
        
        if (equipmentRows && equipmentRows.length > 0) {
            equipmentRows.forEach(row => {
                const groupName = (row[groupCol] as string) || 'Équipements généraux';
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(row);
            });
        } else {
            groups['Équipements standards'] = equipmentOptions.map(opt => ({ name: opt }));
        }
        return groups;
    }, [equipmentRows, equipmentTableConfig, equipmentOptions]);

    const handleSelectAllFilteredSites = () => {
        const idsToAdd = filteredSites.map(s => s.id);
        setSelectedSiteIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    };

    const handleDeselectFilteredSites = () => {
        const idsToRemove = new Set(filteredSites.map(s => s.id));
        setSelectedSiteIds(prev => {
            const remaining = prev.filter(id => !idsToRemove.has(id));
            return remaining.length > 0 ? remaining : [sites[0]?.id || 1];
        });
    };

    const handleToggleRegion = (regionName: string) => {
        setSelectedRegions(prev => {
            if (prev.includes(regionName)) {
                if (prev.length <= 1) return prev; // Conserver au moins 1 région
                return prev.filter(r => r !== regionName);
            } else {
                return [...prev, regionName];
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAiAssist = async () => {
        if (!description && !titre) {
            setMessage({
                text: "Veuillez d'abord saisir un mot-clé ou un titre d'intervention (ex: Maintenance signaux de nuit).",
                type: 'error'
            });
            return;
        }

        setIsAiAssisting(true);
        setAiSuggestion(null);
        try {
            const res = await assistDescriptionAI({
                draftText: description || titre,
                equipment_type: equipmentType,
                site_name: selectedSite ? selectedSite.name : 'Réseau Ferroviaire'
            });

            if (res.data?.suggested_text) {
                setAiSuggestion(res.data.suggested_text);
            }
        } catch (err) {
            console.error("Erreur IA Assist:", err);
            setMessage({ text: "L'assistant IA est momentanément indisponible.", type: 'error' });
        } finally {
            setIsAiAssisting(false);
        }
    };

    const applyAiSuggestion = () => {
        if (aiSuggestion) {
            setDescription(aiSuggestion);
            setAiSuggestion(null);
        }
    };

    const addTeamMember = () => {
        setTeamMembers(prev => [...prev, { name: '', role_or_qualification: '', company: teamCompany || 'Direction des Infrastructures', phone: '' }]);
    };

    const updateTeamMember = (index: number, field: keyof TeamMemberInput, value: string) => {
        setTeamMembers(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const removeTeamMember = (index: number) => {
        if (teamMembers.length <= 1) return;
        setTeamMembers(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
        e.preventDefault();
        if (!titre.trim()) return;

        // Validation des champs dynamiques obligatoires
        if (selectedFormTemplate && Array.isArray(selectedFormTemplate.fields)) {
            const errs: Record<string, string> = {};
            for (const f of selectedFormTemplate.fields) {
                if (f.required) {
                    const val = dynamicFormData[f.id];
                    // Tolérance si le champ correspondant classique est déjà rempli
                    if ((f.id === 'titre' || f.id === 'titre_mission') && titre.trim()) continue;
                    if ((f.id === 'description' || f.id === 'motif_demande' || f.id === 'motif_detaille') && description.trim()) continue;
                    if (f.id === 'site_id' && selectedSiteId) continue;
                    if (f.id === 'equipment_type' && (equipmentType || selectedEquipments.length > 0)) continue;
                    if (f.id === 'intervention_duration' && interventionDuration) continue;

                    if (val === undefined || val === null || val === '' || (f.type === 'checkbox' && !val)) {
                        errs[f.id] = `Le champ "${f.label}" est obligatoire.`;
                    }
                }
            }

            if (Object.keys(errs).length > 0) {
                setDynamicErrors(errs);
                setMessage({
                    text: "Veuillez renseigner tous les champs obligatoires du formulaire dynamique.",
                    type: 'error'
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        }

        // Validation des règles conditionnelles de localisation et matériel (US 3.2)
        const finalEquipment = selectedEquipments.length > 0 ? selectedEquipments.join(', ') : equipmentType;
        const requiresGps = finalEquipment.includes('Cylindre') || finalEquipment.includes('Borne');
        if (requiresGps && (!gpsLatitude || !gpsLongitude) && !isDraft) {
            setMessage({
                text: "Les coordonnées GPS (Latitude et Longitude) sont obligatoires pour les commandes de cylindres et bornes mécatroniques (Conformité Sûreté / US 3.2).",
                type: 'error'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (isTeamRequest && !teamName.trim() && !isDraft) {
            setMessage({
                text: "Le nom du collectif ou de l'équipe projet est obligatoire pour une demande collective.",
                type: 'error'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const formData = new FormData();
            formData.append('titre', titre);
            formData.append('description', description);
            formData.append('equipment_type', finalEquipment);
            formData.append('selected_equipments', JSON.stringify(selectedEquipments));
            formData.append('intervention_duration', interventionDuration);
            formData.append('beneficiaire_id', String(user?.id || 1042));
            formData.append('is_draft', String(isDraft));

            if (gpsLatitude) formData.append('gps_latitude', gpsLatitude);
            if (gpsLongitude) formData.append('gps_longitude', gpsLongitude);
            if (dynamicRouting) {
                formData.append('stages', JSON.stringify(dynamicRouting.stages));
            }

            // Données du Formulaire Dynamique Persistant
            if (selectedFormTemplate) {
                formData.append('form_id', selectedFormTemplate.id);
                const enrichedData = {
                    ...dynamicFormData,
                    titre: titre || dynamicFormData.titre || dynamicFormData.titre_mission,
                    description: description || dynamicFormData.description || dynamicFormData.motif_demande || dynamicFormData.motif_detaille,
                    site_id: selectedSiteId,
                    equipment_type: finalEquipment,
                    intervention_duration: interventionDuration,
                    template_name: selectedFormTemplate.name,
                    template_code: selectedFormTemplate.code
                };
                formData.append('form_data', JSON.stringify(enrichedData));
                if (selectedFormTemplate.linked_process_id) {
                    formData.append('process_id', String(selectedFormTemplate.linked_process_id));
                } else if (initialProcessId) {
                    formData.append('process_id', String(initialProcessId));
                }
            } else if (initialProcessId) {
                formData.append('process_id', String(initialProcessId));
            }

            // UX-03: Données de périmètre multi-sites / multi-régions
            formData.append('is_multi_site', String(isMultiSiteScope));
            formData.append('scope_type', isMultiSiteScope ? scopeType : 'single_site');
            if (isMultiSiteScope) {
                if (scopeType === 'multi_sites') {
                    formData.append('selected_site_ids', JSON.stringify(selectedSiteIds));
                    formData.append('site_id', String(selectedSiteIds[0] || selectedSiteId));
                } else if (scopeType === 'multi_regions') {
                    formData.append('selected_regions', JSON.stringify(selectedRegions));
                    const coveredIds = sites.filter(s => selectedRegions.includes(s.region)).map(s => s.id);
                    formData.append('selected_site_ids', JSON.stringify(coveredIds));
                    formData.append('site_id', String(coveredIds[0] || selectedSiteId));
                }
            } else {
                formData.append('site_id', String(selectedSiteId));
            }

            // UX-02: Données de demande groupée
            formData.append('is_team_request', String(isTeamRequest));
            if (isTeamRequest) {
                formData.append('team_name', teamName || 'Équipe d\'intervention');
                formData.append('team_company', teamCompany);
                const validMembers = teamMembers.filter(m => m.name.trim() !== '');
                formData.append('team_members', JSON.stringify(validMembers));
            }

            if (selectedFile) {
                formData.append('document', selectedFile);
            }

            const res = await createRequest(formData);

            const scopeLabel = isMultiSiteScope
                ? (scopeType === 'multi_regions' ? `(Multi-Régions : ${selectedRegions.length})` : `(Multi-Sites : ${selectedSiteIds.length})`)
                : '';

            setMessage({
                text: isDraft
                    ? "Brouillon sauvegardé avec succès dans 'Mes Demandes'."
                    : `Demande ${res.data.reference} ${isTeamRequest ? "(Groupée / Équipe)" : ""} ${scopeLabel} transmise au circuit de validation (Manager N+1 & Sécurité Site).`,
                type: 'success'
            });

            setTimeout(() => {
                onBackToCatalogue();
            }, 1800);
        } catch (err: any) {
            console.error("Erreur création demande:", err);
            setMessage({
                text: err.response?.data?.error || "Erreur lors de la transmission de la demande.",
                type: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <button
                id="btn-back-catalogue"
                onClick={onBackToCatalogue}
                className="mb-6 inline-flex items-center text-sm font-semibold text-[#002395] hover:text-blue-900 transition gap-2 group"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Retour au catalogue d'équipements
            </button>

            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-blue-100 text-[#002395] rounded-lg">
                        <Cpu className="w-6 h-6" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Nouvelle Demande d'Accès Mécatronique</h1>
                        <p className="text-sm text-gray-600">
                            Conformité normes EN 15864 / EN 16864 & Traçabilité de sécurité NIS 2
                        </p>
                    </div>
                </div>
            </div>

            {message && (
                <div
                    id="alert-message"
                    className={`mb-6 p-4 rounded-lg flex items-start gap-3 border text-sm font-medium ${
                        message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>{message.text}</div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Column */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-xs">
                        
                        {/* Dynamic Form Configuration (Zero-Code Admin Driven) */}
                        <div className="p-4 sm:p-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-blue-50/40 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/70">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-xs shrink-0">
                                        <ClipboardList className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                                                {selectedFormTemplate ? selectedFormTemplate.name : "Formulaire d'Intervention Mécatronique"}
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300">
                                                ⭐ Formulaire Persisté (Zero-Code)
                                            </span>
                                            {selectedFormTemplate?.code && (
                                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-200">
                                                    {selectedFormTemplate.code}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-emerald-800 mt-0.5">
                                            {selectedFormTemplate?.description || "Ce formulaire dynamique est configuré dans l'Administration et persisté via le service de persistance."}
                                        </p>
                                    </div>
                                </div>

                                {/* Form Template Switcher */}
                                {availableFormTemplates.length > 1 && (
                                    <div className="shrink-0 flex items-center gap-2">
                                        <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">Modèle actif :</label>
                                        <select
                                            id="select-form-template"
                                            value={selectedFormTemplate?.id || ''}
                                            onChange={(e) => {
                                                const target = availableFormTemplates.find(f => f.id === e.target.value);
                                                if (target) applyFormTemplate(target);
                                            }}
                                            className="bg-white border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-600 outline-hidden shadow-2xs cursor-pointer"
                                        >
                                            {availableFormTemplates.map(tmpl => (
                                                <option key={tmpl.id} value={tmpl.id}>
                                                    {tmpl.name} ({tmpl.fields?.length || 0} champs)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Fields Grid configured in Admin */}
                            {selectedFormTemplate && selectedFormTemplate.fields && selectedFormTemplate.fields.length > 0 && (
                                <div className="mt-4 pt-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                            Champs configurés par l'administrateur ({selectedFormTemplate.fields.length})
                                        </span>
                                        <span className="text-[11px] text-gray-500">
                                            Les champs marqués (*) sont obligatoires
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                        {selectedFormTemplate.fields.map((field) => renderDynamicField(field))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* UX-02: Mode Demande Individuelle vs Demande Groupée Équipe */}
                        <div className="p-4 rounded-xl border border-blue-100 bg-linear-to-r from-blue-50/70 to-indigo-50/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-950 flex items-center gap-2">
                                            Demande Groupée d'Équipe (UX-02)
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                Gain Opérationnel
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            Autorise plusieurs agents ou sous-traitants sous un seul dossier et circuit de validation
                                        </div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="toggle-team-request"
                                        type="checkbox"
                                        checked={isTeamRequest}
                                        onChange={(e) => setIsTeamRequest(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002395]"></div>
                                </label>
                            </div>

                            {/* Section détails équipe si activée */}
                            {isTeamRequest && (
                                <div className="mt-4 pt-4 border-t border-blue-200/60 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5 text-blue-700" />
                                                Nom de l'équipe ou de la brigade *
                                            </label>
                                            <input
                                                id="input-team-name"
                                                type="text"
                                                value={teamName}
                                                onChange={(e) => setTeamName(e.target.value)}
                                                placeholder="Ex: Brigade Voie Infralog Nord #3"
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                                                Entreprise / Direction
                                            </label>
                                            <input
                                                id="input-team-company"
                                                type="text"
                                                value={teamCompany}
                                                onChange={(e) => setTeamCompany(e.target.value)}
                                                placeholder="Ex: Direction des Infrastructures, Colas Rail, ETF..."
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                                                Membres de l'équipe ({teamMembers.length})
                                            </label>
                                            <button
                                                id="btn-add-team-member"
                                                type="button"
                                                onClick={addTeamMember}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-md shadow-2xs hover:bg-blue-50 transition"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                                Ajouter un agent
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {teamMembers.map((member, idx) => (
                                                <div key={idx} className="p-2.5 bg-white border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                                    <div className="sm:col-span-4">
                                                        <input
                                                            type="text"
                                                            value={member.name}
                                                            onChange={(e) => updateTeamMember(idx, 'name', e.target.value)}
                                                            placeholder={idx === 0 ? "Nom (Chef d'équipe)" : "Nom et Prénom de l'agent"}
                                                            className="w-full bg-gray-50 border border-gray-300 rounded-md p-1.5 text-xs text-gray-900 focus:ring-1 focus:ring-blue-600 outline-hidden"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-4">
                                                        <input
                                                            type="text"
                                                            list="roles-reference-list"
                                                            value={member.role_or_qualification}
                                                            onChange={(e) => updateTeamMember(idx, 'role_or_qualification', e.target.value)}
                                                            placeholder="Habilitation (ex: C18 H0B0)"
                                                            className="w-full bg-gray-50 border border-gray-300 rounded-md p-1.5 text-xs text-gray-900 focus:ring-1 focus:ring-blue-600 outline-hidden"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <input
                                                            type="text"
                                                            value={member.phone}
                                                            onChange={(e) => updateTeamMember(idx, 'phone', e.target.value)}
                                                            placeholder="Téléphone portable"
                                                            className="w-full bg-gray-50 border border-gray-300 rounded-md p-1.5 text-xs text-gray-900 focus:ring-1 focus:ring-blue-600 outline-hidden"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-1 flex justify-end">
                                                        {teamMembers.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTeamMember(idx)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                                                title="Supprimer ce membre"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <datalist id="roles-reference-list">
                                            {availableRoles.map((role) => (
                                                <option key={role} value={role} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Titre de la demande *
                            </label>
                            <input
                                id="input-request-title"
                                type="text"
                                value={titre}
                                onChange={(e) => setTitre(e.target.value)}
                                required
                                placeholder="Ex: Clé d'intervention Poste Aiguillage Voie 2 - Maintenance S14"
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                            />
                        </div>

                        {/* Equipment & Duration selection (Configurable par les tables d'administration) */}
                        {equipmentTableConfig?.show_in_forms !== false && (
                            <div className="space-y-4">
                                {equipmentTableConfig?.allow_multiple ? (
                                    /* Mode Multi-Choix pour Équipements */
                                    <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                                                    <Cpu className="w-4 h-4 text-blue-700" />
                                                    {equipmentTableConfig?.form_field_label || "Équipements & Clés d'accès"}
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                                        <SlidersHorizontal className="w-2.5 h-2.5" />
                                                        Multi-sélection activée
                                                    </span>
                                                </label>
                                                <p className="text-[11px] text-gray-600 mt-0.5">
                                                    {equipmentTableConfig?.form_help_text || "Sélectionnez un ou plusieurs équipements ferroviaires faisant l'objet de l'intervention."}
                                                </p>
                                            </div>
                                            <div className="text-xs font-semibold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                                                {selectedEquipments.length} sélectionné(s)
                                            </div>
                                        </div>

                                        {/* Catégories ou Liste d'équipements */}
                                        <div className="space-y-2 pt-1">
                                            {Object.entries(groupedEquipments).map(([groupTitle, items]) => (
                                                <div key={groupTitle} className="space-y-1">
                                                    {Object.keys(groupedEquipments).length > 1 && (
                                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                            <Tag className="w-3 h-3 text-gray-400" />
                                                            {groupTitle}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(items as any[]).map((item: any, i: number) => {
                                                            const name = item.name || item.code || String(item);
                                                            const isSelected = selectedEquipments.includes(name);
                                                            return (
                                                                <button
                                                                    key={item.id || i}
                                                                    type="button"
                                                                    onClick={() => handleToggleEquipment(name)}
                                                                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                                                        isSelected
                                                                            ? 'bg-[#002395] text-white border-[#002395] shadow-2xs font-semibold'
                                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
                                                                    }`}
                                                                >
                                                                    {isSelected ? (
                                                                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                                                                    ) : (
                                                                        <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                    )}
                                                                    <span>{name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Mode Sélection Unique pour Équipements */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                                                <Cpu className="w-4 h-4 text-blue-700" />
                                                {equipmentTableConfig?.form_field_label || "Type d'équipement"}
                                            </label>
                                            <select
                                                id="select-equipment-type"
                                                value={equipmentType}
                                                onChange={(e) => {
                                                    setEquipmentType(e.target.value);
                                                    setSelectedEquipments([e.target.value]);
                                                }}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                                            >
                                                {Object.keys(groupedEquipments).length > 1 ? (
                                                    Object.entries(groupedEquipments).map(([groupTitle, items]) => (
                                                        <optgroup key={groupTitle} label={groupTitle}>
                                                            {(items as any[]).map((item: any) => {
                                                                const name = item.name || item.code;
                                                                return (
                                                                    <option key={name} value={name}>{name}</option>
                                                                );
                                                            })}
                                                        </optgroup>
                                                    ))
                                                ) : (
                                                    equipmentOptions.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))
                                                )}
                                            </select>
                                            {equipmentTableConfig?.form_help_text && (
                                                <p className="text-[11px] text-gray-500 mt-1">{equipmentTableConfig.form_help_text}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-blue-700" />
                                                {durationTableConfig?.form_field_label || "Plage d'activation souhaitée"}
                                            </label>
                                            <select
                                                id="select-duration"
                                                value={interventionDuration}
                                                onChange={(e) => setInterventionDuration(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                                            >
                                                {durationOptions.map((opt) => (
                                                    <option key={opt.id} value={opt.name}>
                                                        {opt.description ? `${opt.name} — ${opt.description}` : opt.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {durationTableConfig?.form_help_text && (
                                                <p className="text-[11px] text-gray-500 mt-1">{durationTableConfig.form_help_text}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Si en mode multi-équipements, afficher le champ durée en pleine largeur */}
                                {equipmentTableConfig?.allow_multiple && (
                                    <div className="max-w-md">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-blue-700" />
                                            {durationTableConfig?.form_field_label || "Plage d'activation souhaitée"}
                                        </label>
                                        <select
                                            id="select-duration-full"
                                            value={interventionDuration}
                                            onChange={(e) => setInterventionDuration(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                                        >
                                            {durationOptions.map((opt) => (
                                                <option key={opt.id} value={opt.name}>
                                                    {opt.description ? `${opt.name} — ${opt.description}` : opt.name}
                                                </option>
                                            ))}
                                        </select>
                                        {durationTableConfig?.form_help_text && (
                                            <p className="text-[11px] text-gray-500 mt-1">{durationTableConfig.form_help_text}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Épique 3 - US 3.2: Champs Conditionnels & Géolocalisation obligatoire pour Cylindres / Bornes */}
                        {(selectedEquipments.some(e => e.includes('Cylindre') || e.includes('Borne')) || equipmentType.includes('Cylindre') || equipmentType.includes('Borne')) && (
                            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-amber-700" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                                            Règle Métier Conditionnelle : Coordonnées GPS de Pose Obligatoires
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGpsLatitude('48.8809');
                                            setGpsLongitude('2.3553');
                                        }}
                                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded shadow-2xs hover:bg-amber-100 transition cursor-pointer"
                                    >
                                        <i className="fas fa-crosshairs mr-1"></i>
                                        Coordonnées de l'emprise du site
                                    </button>
                                </div>
                                <p className="text-xs text-amber-800">
                                    Conformément aux normes de sûreté d'installation, tout déploiement de cylindre mécatronique ou borne d'accès requiert la précision géographique d'implantation.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Latitude GPS (WGS84) *
                                        </label>
                                        <input
                                            id="input-gps-lat"
                                            type="text"
                                            value={gpsLatitude}
                                            onChange={(e) => setGpsLatitude(e.target.value)}
                                            placeholder="Ex: 48.8809"
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Longitude GPS (WGS84) *
                                        </label>
                                        <input
                                            id="input-gps-lon"
                                            type="text"
                                            value={gpsLongitude}
                                            onChange={(e) => setGpsLongitude(e.target.value)}
                                            placeholder="Ex: 2.3553"
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 font-mono"
                                        />
                                    </div>
                                </div>
                                {conditionalErrors.gps && (
                                    <div className="text-[11px] font-semibold text-red-700 flex items-center gap-1.5 pt-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                        <span>{conditionalErrors.gps}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* UX-03: Périmètre d'Intervention Géographique (Site, Multi-Sites ou Multi-Régions) */}
                        <div className="p-4 rounded-xl border border-emerald-200/80 bg-linear-to-r from-emerald-50/70 to-teal-50/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-700 text-white rounded-lg shadow-xs">
                                        <Compass className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-950 flex items-center gap-2">
                                            {siteTableConfig?.form_field_label || "Périmètre d'Intervention Géographique (Multi-Sites / Régions)"}
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                Multi-Implantations
                                            </span>
                                            {!isSiteMultiAllowed && (
                                                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                                                    Restreint par l'administration (Site unique)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {siteTableConfig?.form_help_text || "Autorise les accès sur un site précis, plusieurs sites ferroviaires ou des régions complètes"}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 hidden sm:inline">Périmètre étendu</span>
                                    <label className={`relative inline-flex items-center ${!isSiteMultiAllowed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            id="toggle-multi-site-scope"
                                            type="checkbox"
                                            disabled={!isSiteMultiAllowed}
                                            checked={isSiteMultiAllowed && isMultiSiteScope}
                                            onChange={(e) => {
                                                if (!isSiteMultiAllowed) return;
                                                const checked = e.target.checked;
                                                setIsMultiSiteScope(checked);
                                                if (checked && scopeType === 'single_site') {
                                                    setScopeType('multi_sites');
                                                } else if (!checked) {
                                                    setScopeType('single_site');
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Cas 1: Site Unique Standard (si toggle inactif) */}
                            {!isMultiSiteScope ? (
                                <div className="mt-3 pt-3 border-t border-emerald-200/60">
                                    <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                                        Site Ferroviaire d'Intervention
                                    </label>
                                    <select
                                        id="select-site"
                                        value={selectedSiteId}
                                        onChange={(e) => setSelectedSiteId(Number(e.target.value))}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
                                    >
                                        {sites.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} — Région {s.region} ({s.code})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                                        <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                                            Région : <strong className="text-gray-900">{selectedSite?.region}</strong>
                                        </span>
                                        <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                                            Sûreté : <strong className="text-emerald-800">{selectedSite?.validator_name}</strong>
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* Cas 2: Périmètre Étendu (Multi-Sites ou Multi-Régions) */
                                <div className="mt-4 pt-4 border-t border-emerald-200/60 space-y-4">
                                    {/* Segmented Mode Selector */}
                                    <div className="flex items-center gap-2 p-1 bg-white border border-emerald-200 rounded-lg max-w-md">
                                        <button
                                            id="tab-scope-multi-sites"
                                            type="button"
                                            onClick={() => setScopeType('multi_sites')}
                                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                                scopeType === 'multi_sites'
                                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                        >
                                            <MapPin className="w-3.5 h-3.5" />
                                            Multi-Sites Spécifiques ({selectedSiteIds.length})
                                        </button>
                                        <button
                                            id="tab-scope-multi-regions"
                                            type="button"
                                            onClick={() => setScopeType('multi_regions')}
                                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                                scopeType === 'multi_regions'
                                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Compass className="w-3.5 h-3.5" />
                                            Multi-Régions ({selectedRegions.length})
                                        </button>
                                    </div>

                                    {/* Sous-section 1: Multi-Sites Spécifiques */}
                                    {scopeType === 'multi_sites' && (
                                        <div className="space-y-3 bg-white p-3.5 rounded-lg border border-emerald-200/70">
                                            {/* Barre de recherche et filtres de région */}
                                            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                                                <div className="relative flex-1">
                                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        id="input-search-sites"
                                                        type="text"
                                                        value={siteSearchQuery}
                                                        onChange={(e) => setSiteSearchQuery(e.target.value)}
                                                        placeholder="Filtrer un site par nom, code ou région..."
                                                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-xs text-gray-900 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveRegionFilter('all')}
                                                        className={`text-[11px] px-2 py-1 rounded-md transition cursor-pointer ${
                                                            activeRegionFilter === 'all'
                                                                ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        Toutes
                                                    </button>
                                                    {availableRegions.map(reg => (
                                                        <button
                                                            key={reg}
                                                            type="button"
                                                            onClick={() => setActiveRegionFilter(reg)}
                                                            className={`text-[11px] px-2 py-1 rounded-md transition cursor-pointer ${
                                                                activeRegionFilter === reg
                                                                    ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {reg}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Boutons actions rapides */}
                                            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                                                <span className="text-gray-500 font-medium">
                                                    {selectedSiteIds.length} site(s) sélectionné(s) sur {sites.length}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAllFilteredSites}
                                                        className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold hover:underline cursor-pointer"
                                                    >
                                                        Tout cocher ({filteredSites.length})
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleDeselectFilteredSites}
                                                        className="text-gray-500 hover:text-gray-700 text-[11px] hover:underline cursor-pointer"
                                                    >
                                                        Tout décocher
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Grille des sites */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                                {filteredSites.map(s => {
                                                    const isChecked = selectedSiteIds.includes(s.id);
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            onClick={() => handleToggleSite(s.id)}
                                                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                                                                isChecked
                                                                    ? 'border-emerald-500 bg-emerald-50/60 shadow-2xs'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {}} // géré par le div parent
                                                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold text-gray-900 truncate">
                                                                    {s.name}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                                                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                                                        {s.code}
                                                                    </span>
                                                                    <span className="text-emerald-700 font-medium">
                                                                        {s.region}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Chips des sites sélectionnés */}
                                            {selectedSiteIds.length > 0 && (
                                                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                                                    <span className="text-[11px] text-gray-500 font-semibold mr-1">Sélection :</span>
                                                    {sites.filter(s => selectedSiteIds.includes(s.id)).map(s => (
                                                        <span
                                                            key={s.id}
                                                            className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] px-2 py-0.5 rounded-full font-medium"
                                                        >
                                                            <span className="truncate max-w-[150px]">{s.name.split('(')[0]}</span>
                                                            {selectedSiteIds.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleSite(s.id);
                                                                    }}
                                                                    className="hover:text-red-700 rounded-full p-0.5 cursor-pointer"
                                                                    title="Retirer ce site"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sous-section 2: Multi-Régions */}
                                    {scopeType === 'multi_regions' && (
                                        <div className="space-y-3 bg-white p-3.5 rounded-lg border border-emerald-200/70">
                                            <div className="text-xs text-gray-600 bg-emerald-50/80 p-2.5 rounded-md border border-emerald-200 flex items-center gap-2">
                                                <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
                                                <span>
                                                    L'accès conféré s'appliquera automatiquement à <strong>l'ensemble des sites et installations ferroviaires</strong> situés dans les régions sélectionnées.
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {availableRegions.map(reg => {
                                                    const isChecked = selectedRegions.includes(reg);
                                                    const regionSites = sites.filter(s => s.region === reg);
                                                    return (
                                                        <div
                                                            key={reg}
                                                            onClick={() => handleToggleRegion(reg)}
                                                            className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start gap-3 ${
                                                                isChecked
                                                                    ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {}}
                                                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-gray-900 text-xs">
                                                                        {reg}
                                                                    </span>
                                                                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                                                                        {regionSites.length} site(s)
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                                                                    {regionSites.map(st => (
                                                                        <div key={st.id} className="truncate text-gray-600 flex items-center gap-1">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                                            <span className="truncate">{st.name.split('(')[0]}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Couverture totale */}
                                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                                                <span>
                                                    Régions sélectionnées : <strong className="text-emerald-900">{selectedRegions.length}</strong>
                                                </span>
                                                <span className="text-emerald-800 font-semibold">
                                                    Couvre {coveredSitesList.length} site(s) ferroviaire(s)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Description with AI Assist */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                                    Justification du besoin & Modalités d'accès *
                                </label>
                                {isFeatureEnabled('ai_demandes') && (
                                    <button
                                        id="btn-ai-assist"
                                        type="button"
                                        onClick={handleAiAssist}
                                        disabled={isAiAssisting}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md transition"
                                        title="Générer une justification conforme aux normes de sécurité"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {isAiAssisting ? "Génération IA..." : "Assistant IA Conformité"}
                                    </button>
                                )}
                            </div>
                            <textarea
                                id="textarea-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                placeholder="Indiquez la zone technique précise, les armoires/serrures concernées et le contexte d'intervention ferroviaire..."
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                            />

                            {/* AI Suggestion Banner */}
                            {aiSuggestion && (
                                <div className="mt-3 p-3.5 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                                            <Sparkles className="w-4 h-4 text-purple-600" />
                                            Proposition rédigée par l'IA :
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAiSuggestion(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-purple-950 mb-2 leading-relaxed">
                                        "{aiSuggestion}"
                                    </p>
                                    <button
                                        id="btn-apply-ai-suggestion"
                                        type="button"
                                        onClick={applyAiSuggestion}
                                        className="text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition"
                                    >
                                        Appliquer cette justification
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Étape B : Upload de Pièce Justificative (Drag & Drop) */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-blue-700" />
                                Pièce Justificative / Habilitation (Optionnelle ou Obligatoire selon site)
                            </label>
                            
                            <div
                                id="drop-zone-document"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                    isDragging
                                        ? 'border-blue-500 bg-blue-50/50'
                                        : 'border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    id="file-input-document"
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    className="hidden"
                                />

                                {!selectedFile ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 mb-2 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                                            <UploadCloud className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            Glissez votre document ici ou <span className="text-[#002395] underline">parcourez vos fichiers</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Habilitation électrique (H0B0, B1V), Ordre de mission, Plan de prévention (PDF, JPG, PNG - max 15 Mo)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="p-2 bg-blue-100 text-[#002395] rounded-md">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 truncate max-w-xs">
                                                    {selectedFile.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {(selectedFile.size / 1024).toFixed(1)} Ko • Prêt pour le téléversement
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            id="btn-remove-file"
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFile();
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 transition"
                                            title="Supprimer le fichier"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
                            <button
                                id="btn-submit-request"
                                type="submit"
                                disabled={submitting}
                                className="w-full sm:w-auto bg-[#002395] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-900 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {submitting ? 'Transmission au circuit...' : 'Transmettre pour Validation'}
                            </button>
                            <button
                                id="btn-save-draft"
                                type="button"
                                disabled={submitting}
                                onClick={(e) => handleSubmit(e, true)}
                                className="w-full sm:w-auto bg-gray-100 text-gray-800 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition cursor-pointer"
                            >
                                Sauvegarder comme Brouillon
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Sidebar: Realtime Routing & Compliance Preview */}
                <div className="space-y-6">
                    {/* Site Information Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                            {isMultiSiteScope ? (
                                <Compass className="w-4 h-4 text-emerald-700" />
                            ) : (
                                <MapPin className="w-4 h-4 text-blue-700" />
                            )}
                            {isMultiSiteScope
                                ? (scopeType === 'multi_regions' ? 'Périmètre Régional' : 'Périmètre Multi-Sites')
                                : 'Site Sélectionné'}
                        </div>

                        {!isMultiSiteScope ? (
                            <>
                                <h4 className="font-semibold text-gray-900 text-base mb-1">{selectedSite?.name}</h4>
                                <p className="text-xs text-gray-500 mb-3">Région : {selectedSite?.region}</p>
                                
                                <div className="space-y-2 pt-3 border-t border-gray-100 text-xs text-gray-600">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Code Site :</span>
                                        <span className="font-mono font-medium text-gray-800">{selectedSite?.code}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Validateur Sûreté :</span>
                                        <span className="font-medium text-blue-900">{selectedSite?.validator_name}</span>
                                    </div>
                                </div>
                            </>
                        ) : scopeType === 'multi_regions' ? (
                            <>
                                <h4 className="font-semibold text-gray-900 text-base mb-1">
                                    {selectedRegions.length} Région{selectedRegions.length > 1 ? 's' : ''} Habilitée{selectedRegions.length > 1 ? 's' : ''}
                                </h4>
                                <p className="text-xs text-emerald-700 font-medium mb-3">
                                    Couvre {coveredSitesList.length} emprises ferroviaires
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs">
                                    {selectedRegions.map(reg => (
                                        <div key={reg} className="flex items-center justify-between bg-gray-50 p-1.5 rounded text-gray-700">
                                            <span className="font-medium">{reg}</span>
                                            <span className="text-[11px] text-gray-500">{sites.filter(s => s.region === reg).length} site(s)</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 className="font-semibold text-gray-900 text-base mb-1">
                                    {selectedSiteIds.length} Site{selectedSiteIds.length > 1 ? 's' : ''} Sélectionné{selectedSiteIds.length > 1 ? 's' : ''}
                                </h4>
                                <p className="text-xs text-emerald-700 font-medium mb-3">
                                    Périmètre multi-emprises spécifique
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs max-h-40 overflow-y-auto">
                                    {sites.filter(s => selectedSiteIds.includes(s.id)).map(s => (
                                        <div key={s.id} className="flex items-center justify-between bg-gray-50 p-1.5 rounded text-gray-700">
                                            <span className="font-medium truncate max-w-[130px]">{s.name.split('(')[0]}</span>
                                            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">{s.code}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="text-[11px] font-semibold uppercase text-gray-500 mb-1.5 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                Normes & Référentiels
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {(Array.isArray(selectedSite?.normes_applicables)
                                    ? selectedSite.normes_applicables
                                    : typeof selectedSite?.normes_applicables === 'string' && selectedSite.normes_applicables.trim()
                                        ? selectedSite.normes_applicables.split(',').map((s: string) => s.trim()).filter(Boolean)
                                        : ['EN 15864', 'EN 16864', 'NIS 2']
                                ).map((n: string) => (
                                    <span key={n} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium border border-gray-200">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Circuit de Validation Dynamique (Étape C - Epic 3: US 3.1) */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                <UserCheck className="w-4 h-4 text-blue-700" />
                                Circuit de Validation des Habilitations
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#002395] border border-blue-200">
                                US 3.1 Dynamique
                            </span>
                        </div>
                        
                        {dynamicRouting?.ruleApplied && (
                            <div className="mb-3 px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200 text-[10px] text-slate-700 flex items-center justify-between">
                                <span className="font-semibold">Règle appliquée :</span>
                                <span className="font-mono font-bold text-[#002395]">{dynamicRouting.ruleApplied}</span>
                            </div>
                        )}

                        <p className="text-xs text-gray-500 mb-4">
                            Séquence automatique générée en temps réel selon les attributs de la demande (durée, collectif, site) :
                        </p>

                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                            {dynamicRouting?.stages && dynamicRouting.stages.length > 0 ? (
                                dynamicRouting.stages.map((st, idx) => (
                                    <div key={idx} className="relative">
                                        <span className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                                            idx === dynamicRouting.stages.length - 1 ? 'bg-emerald-600 text-white' : 'bg-blue-700 text-white'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                                <span>{st.name}</span>
                                                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 text-blue-800">
                                                    SLA {st.slaHours}h
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-gray-600 font-medium">
                                                Rôle requis : <strong className="text-slate-800">{st.assignedRole}</strong>
                                                {st.assignedUserName ? ` — ${st.assignedUserName}` : ''}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {idx === 0 && isTeamRequest ? 'Contrôle collectif et hiérarchique' :
                                                 idx === dynamicRouting.stages.length - 1 ? 'Délivrance physique & horodatage immuable' :
                                                 'Validation technique de sécurité ferroviaire'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                /* Fallback d'affichage standard */
                                <>
                                    <div className="relative">
                                        <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                                            1
                                        </span>
                                        <div>
                                            <div className="text-xs font-semibold text-gray-900">Validation Responsable Sécurité Site</div>
                                            <div className="text-[11px] text-gray-500">{selectedSite?.validator_name || 'Validateur Site'}</div>
                                            <div className="text-[10px] text-blue-700 mt-0.5 font-medium">SLA 48h</div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                                            2
                                        </span>
                                        <div>
                                            <div className="text-xs font-semibold text-gray-900">Délivrance & Encodage Régie</div>
                                            <div className="text-[11px] text-gray-500">Régie Mécatronique</div>
                                            <div className="text-[10px] text-gray-500 mt-0.5 font-medium">SLA 24h</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
