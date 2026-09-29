export type FieldCategoryKey = string;

export interface TargetFieldDefinition {
    key: string;
    label: string;
    description: string;
    category: string;
    categoryLabel: string;
    type: 'number' | 'string' | 'boolean' | 'date';
    exampleValue: string;
    suggestedOperator?: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
    formOrigin?: string;
    isCustom?: boolean;
}

export const FIELD_CATEGORIES: { id: FieldCategoryKey; label: string; iconName: string; color: string; bgBadge: string }[] = [
    { id: 'ALL', label: 'Tous les champs', iconName: 'Layers', color: 'text-gray-700', bgBadge: 'bg-gray-100 text-gray-800' },
    { id: 'QUOTA', label: 'Quotas & Clés Mécatroniques', iconName: 'Key', color: 'text-amber-700', bgBadge: 'bg-amber-100 text-amber-900 border-amber-200' },
    { id: 'FINANCE', label: 'Finances & Seuils Budgétaires', iconName: 'DollarSign', color: 'text-emerald-700', bgBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    { id: 'SECURITY', label: 'Sécurité, Habilitations & NIS 2', iconName: 'Shield', color: 'text-red-700', bgBadge: 'bg-red-100 text-red-900 border-red-200' },
    { id: 'IDENTITY', label: 'Demandeur, RH & Entreprises', iconName: 'Users', color: 'text-blue-700', bgBadge: 'bg-blue-100 text-blue-900 border-blue-200' },
    { id: 'GPS', label: 'Localisation, GPS & Emprises', iconName: 'MapPin', color: 'text-cyan-700', bgBadge: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
    { id: 'SLA', label: 'SLA & Contrôle 4-Yeux', iconName: 'Clock', color: 'text-purple-700', bgBadge: 'bg-purple-100 text-purple-900 border-purple-200' },
    { id: 'LOGISTICS', label: 'Logistique, Livraison & PV', iconName: 'Package', color: 'text-teal-700', bgBadge: 'bg-teal-100 text-teal-900 border-teal-200' },
    { id: 'GENERAL', label: 'Demande & Données Générales', iconName: 'FileText', color: 'text-indigo-700', bgBadge: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
    { id: 'CUSTOM_FORM', label: 'Champs des Formulaires Dynamiques', iconName: 'Database', color: 'text-pink-700', bgBadge: 'bg-pink-100 text-pink-900 border-pink-200' },
    { id: 'TABLE_REF', label: 'Tables de Référence & Paramétrage', iconName: 'Database', color: 'text-teal-700', bgBadge: 'bg-teal-100 text-teal-900 border-teal-200' }
];

export const BASE_TARGET_FIELDS: TargetFieldDefinition[] = [
    // 1. QUOTAS & MATÉRIEL MÉCATRONIQUE
    {
        key: 'hardware_active_count',
        label: 'Nombre de clés physiques actives',
        description: 'Volume total de clés mécatroniques ou badges simultanément actifs attribués à l\'agent.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'number',
        exampleValue: '3',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'quantite_demandee',
        label: 'Quantité d\'équipements demandée',
        description: 'Nombre de clés, badges ou cylindres sollicités dans la commande.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'number',
        exampleValue: '5',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'hardware_type',
        label: 'Type de matériel sollicité',
        description: 'Famille technique d\'équipement : CLE_ELECTRONIQUE, BADGE_RFID, CYLINDRE, LECTEUR.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'string',
        exampleValue: 'CLE_ELECTRONIQUE',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'cle_type',
        label: 'Modèle de clé mécatronique',
        description: 'Référence du modèle de clé (ex: S10, S15, F9000, Bluetooth, Optique).',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'string',
        exampleValue: 'S15',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'cylindre_type',
        label: 'Modèle de cylindre de fermeture',
        description: 'Type de cylindre : Électronique motorisé, Mécanique sécurisé, Demi-cylindre.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'string',
        exampleValue: 'CYLINDRE_ELECTRONIQUE',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'organigramme_cle',
        label: 'Code organigramme de fermeture',
        description: 'Identifiant de l\'organigramme d\'accès du site (ex: ORG-TER-042).',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'string',
        exampleValue: 'ORG-TER-042',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'depassement_quota_flag',
        label: 'Dépassement du quota autorisé',
        description: 'Indicateur booléen calculé signalant que la demande outrepasse le plafond usuel.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'stock_disponible_count',
        label: 'Stock physique disponible au magasin',
        description: 'Nombre de pièces actuellement disponibles en stock magasin avant réapprovisionnement.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'number',
        exampleValue: '0',
        suggestedOperator: 'LESS_THAN'
    },
    {
        key: 'numero_serie_cle',
        label: 'Numéro de série gravé de la clé',
        description: 'Identifiant physique matricule de la clé ou du cylindre.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'string',
        exampleValue: 'CL-2026-8841',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'cle_perdue_vol_flag',
        label: 'Signalement de perte ou de vol',
        description: 'Indique si la demande concerne le remplacement d\'une clé déclarée perdue ou volée.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'duree_retention_jours',
        label: 'Durée d\'emprunt prévue (jours)',
        description: 'Nombre de jours prévus avant restitution obligatoire de la clé.',
        category: 'QUOTA',
        categoryLabel: 'Quotas & Clés',
        type: 'number',
        exampleValue: '90',
        suggestedOperator: 'GREATER_THAN'
    },

    // 2. FINANCES & SEUILS BUDGÉTAIRES
    {
        key: 'montant_total_ht',
        label: 'Montant total HT de la commande (€)',
        description: 'Valeur financière globale hors taxes de l\'intervention ou de la commande matérielle.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'number',
        exampleValue: '1500',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'montant_total_ttc',
        label: 'Montant total TTC (€)',
        description: 'Valeur financière toutes taxes comprises.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'number',
        exampleValue: '1800',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'taux_tva',
        label: 'Taux de TVA applicable (%)',
        description: 'Taux de TVA renseigné (ex: 20%).',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'number',
        exampleValue: '20',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'devis_fournisseur_joint',
        label: 'Présence d\'un devis fournisseur signé',
        description: 'Vérifie si une pièce jointe type devis ou proposition commerciale est attachée.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'budget_alloue',
        label: 'Budget alloué sur la ligne (€)',
        description: 'Enveloppe budgétaire disponible sur le centre de responsabilité concerné.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'number',
        exampleValue: '5000',
        suggestedOperator: 'LESS_THAN'
    },
    {
        key: 'centre_financier',
        label: 'Code Centre Financier / Imputation',
        description: 'Code analytique comptable de l\'organisation (ex: CF-IDF-PARIS-EST).',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'string',
        exampleValue: 'CF-IDF-PARIS-EST',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'bon_commande_sap',
        label: 'Numéro de bon de commande ERP / SAP',
        description: 'Référence du bon d\'engagement généré dans l\'ERP d\'entreprise.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'string',
        exampleValue: 'SAP-450098231',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'depassement_budgetaire_flag',
        label: 'Dépassement de ligne budgétaire',
        description: 'Indique si l\'engagement dépasse l\'enveloppe prévisionnelle trimestrielle.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'valideur_budgetaire_requis',
        label: 'Validation Contrôle de Gestion requise',
        description: 'Exige expressément l\'accord du contrôleur budgétaire ou DAF.',
        category: 'FINANCE',
        categoryLabel: 'Finances & Seuils',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },

    // 3. SÉCURITÉ, HABILITATIONS & NIS 2
    {
        key: 'habilitation_electrique_code',
        label: 'Code d\'habilitation électrique',
        description: 'Titre d\'habilitation électrique selon NFC 18-510 (ex: B0, H0V, C2, BR, BC).',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'string',
        exampleValue: 'B0',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'habilitation_date_validite',
        label: 'Date d\'échéance de l\'habilitation',
        description: 'Date de fin de validité de l\'habilitation de l\'agent demandeur.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'date',
        exampleValue: '2026-12-31',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'consentement_rgpd_signe',
        label: 'Consentement RGPD & Traçabilité signé',
        description: 'Acceptation explicite de la charte de traçabilité des accès et données personnelles.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'formation_securite_validee',
        label: 'Formation Sécurité Ferroviaire validée',
        description: 'Attestation de réussite aux modules obligatoires de sécurité ferroviaire.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'agrement_actif',
        label: 'Agrément d\'accès & sécurité actif',
        description: 'Agrément officiel obligatoire pour les entreprises tierces et prestataires externes.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'niveau_confidentialite',
        label: 'Niveau de confidentialité du site',
        description: 'Classification de sûreté : STANDARD, DIFFUSION_RESTREINTE, SECRET_DEFENSE.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'string',
        exampleValue: 'SECRET_DEFENSE',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'visite_medicale_aptitude',
        label: 'Aptitude médicale ferroviaire valide',
        description: 'Certificat médical d\'aptitude aux postes de sécurité des circulations.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'date_fin_mission',
        label: 'Date de fin de mission prestataire',
        description: 'Date limite du contrat du prestataire externe (interdiction de clé au-delà).',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'date',
        exampleValue: '2026-09-30',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'score_risques_securite',
        label: 'Score de criticité de la zone (1-5)',
        description: 'Évaluation du niveau de risque opérationnel du site ou de la sous-station.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & Habilitations',
        type: 'number',
        exampleValue: '4',
        suggestedOperator: 'GREATER_THAN'
    },

    // 4. DEMANDEUR, RH & ENTREPRISES
    {
        key: 'requester_id',
        label: 'Identifiant unique du demandeur',
        description: 'ID utilisateur de la personne émettrice de la demande.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: '14',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'requester_email',
        label: 'E-mail professionnel du demandeur',
        description: 'Adresse e-mail professionnelle de l\'agent émetteur.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'agent.operationnel@entreprise.fr',
        suggestedOperator: 'CONTAINS'
    },
    {
        key: 'requester_service',
        label: 'Service d\'appartenance du demandeur',
        description: 'Unité ou service interne (ex: Maintenance, Infrastructure, Énergie).',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'Maintenance',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'requester_region',
        label: 'Région territoriale du demandeur',
        description: 'Direction régionale opérationnelle (ex: Île-de-France, AURA, Grand Est).',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'Île-de-France',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'matricule_agent',
        label: 'Matricule collaborateur (7 chiffres)',
        description: 'Identifiant RH interne officiel de l\'agent ou titulaire.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: '8492018',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'beneficiaire_type',
        label: 'Statut du bénéficiaire final',
        description: 'Catégorie : COLLABORATEUR_INTERNE, PRESTATAIRE_EXTERNE, SOUS_TRAITANT, STAGIAIRE.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'PRESTATAIRE_EXTERNE',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'beneficiaire_nom',
        label: 'Nom & prénom du bénéficiaire',
        description: 'Identité complète de l\'usager qui détiendra physiquement le matériel.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'Dupont Jean',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'beneficiaire_entreprise_externe',
        label: 'Raison sociale entreprise prestataire',
        description: 'Nom de la société externe titulaire du contrat (ex: Société Partenaire, Prestataire A).',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'Société Partenaire',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'direction_regionale',
        label: 'Direction Régionale / Établissement',
        description: 'Direction de rattachement administratif et budgétaire.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'Direction Territoriale Paris',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'etablissement_infralog',
        label: 'Établissement / Pôle Opérationnel',
        description: 'Entité opérationnelle responsable de la zone d\'infrastructure.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'string',
        exampleValue: 'Pôle Opérationnel Nord',
        suggestedOperator: 'EQUALS'
    },

    // 5. LOCALISATION, GPS & EMPRISES
    {
        key: 'gps_accuracy_meters',
        label: 'Précision du relevé GPS terrain (mètres)',
        description: 'Marge d\'incertitude de la géolocalisation mesurée par le terminal mobile.',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'number',
        exampleValue: '50',
        suggestedOperator: 'LESS_THAN'
    },
    {
        key: 'gps_latitude',
        label: 'Coordonnée GPS Latitude relevée',
        description: 'Latitude WGS84 envoyée lors du pointage de présence sur site.',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'number',
        exampleValue: '48.8566',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'gps_longitude',
        label: 'Coordonnée GPS Longitude relevée',
        description: 'Longitude WGS84 envoyée lors du pointage de présence sur site.',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'number',
        exampleValue: '2.3522',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'presence_terrain_confirmee',
        label: 'Présence physique sur site certifiée',
        description: 'Attestation de pointage électronique ou validation de proximité balise.',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'code_gare_uic',
        label: 'Code UIC de la gare ou du faisceau',
        description: 'Identifiant UIC national ferroviaire à 8 chiffres (ex: 87271007 Paris Nord).',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'string',
        exampleValue: '87271007',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'ligne_ferroviaire_rfm',
        label: 'Code ligne RFM (Réseau Ferré National)',
        description: 'Numéro officiel de ligne ferroviaire (ex: 001000 Paris-Lyon).',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'string',
        exampleValue: '001000',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'point_kilometrique_pk',
        label: 'Point Kilométrique (PK)',
        description: 'Position kilométrique le long de la voie ferroviaire (ex: PK 142+500).',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'string',
        exampleValue: 'PK 142+500',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'secteur_circulation',
        label: 'Secteur de circulation ferroviaire',
        description: 'Nom du poste ou du secteur de régulation (ex: Poste d\'Aiguillage 2).',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'string',
        exampleValue: 'Poste 2 Melun',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'zone_travaux_voie',
        label: 'Voie ou zone de travaux concernée',
        description: 'Désignation de la voie (Voie 1 Principale, Voie de Service, Faisceau Garage).',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'string',
        exampleValue: 'Voie 1 Principale',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'date_intervention_site',
        label: 'Date & heure d\'intervention sur site',
        description: 'Créneau horaire exact d\'accès aux installations ferroviaires.',
        category: 'GPS',
        categoryLabel: 'Terrain & GPS',
        type: 'date',
        exampleValue: '2026-10-15',
        suggestedOperator: 'GREATER_THAN'
    },

    // 6. SLA, WORKFLOW & GOUVERNANCE 4-YEUX
    {
        key: 'sla_elapsed_hours',
        label: 'Heures écoulées depuis la soumission',
        description: 'Temps d\'instruction comptabilisé en heures pour l\'alerte de dépassement SLA.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'number',
        exampleValue: '48',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'sla_target_hours',
        label: 'Délai SLA contractuel imparti (heures)',
        description: 'Durée maximale allouée à l\'étape selon la charte de service.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'number',
        exampleValue: '72',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'sla_breached_flag',
        label: 'Dépassement du délai SLA constaté',
        description: 'Indicateur booléen signalant qu\'un palier d\'escalade temporelle est franchi.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'validator_id',
        label: 'Identifiant du validateur de l\'étape',
        description: 'ID de l\'acteur assigné ou ayant instruit le dossier.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'string',
        exampleValue: '8',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'validator_role',
        label: 'Rôle d\'approbation requis',
        description: 'Rôle habilité à valider l\'étape (ex: Responsable Sûreté, Chef de Pôle).',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'string',
        exampleValue: 'Responsable Sûreté',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'validateur_different_demandeur',
        label: 'Séparation stricte Demandeur ≠ Validateur',
        description: 'Règle des 4-yeux : interdit à un agent d\'approuver sa propre demande.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'nombre_validations_effectuees',
        label: 'Nombre de visas déjà enregistrés',
        description: 'Compteur des approbations formelles recueillies sur le circuit.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'number',
        exampleValue: '2',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'double_approbation_requise',
        label: 'Contrôle à 4-yeux exigé',
        description: 'Impose un second valideur indépendant avant déverrouillage de la commande.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'validation_4yeux_respectee',
        label: 'Conformité 4-yeux auditée',
        description: 'Atteste que deux identifiants distincts ont consigné leur signature.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'escalation_level',
        label: 'Niveau d\'escalade hiérarchique (0, 1, 2)',
        description: '0 = Normal, 1 = Escalade N+1, 2 = Escalade Direction / Arbitrage.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'number',
        exampleValue: '1',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'rejection_count',
        label: 'Nombre de rejets ou renvois précédents',
        description: 'Historique des renvois pour compléments ou refus sur ce dossier.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'number',
        exampleValue: '0',
        suggestedOperator: 'GREATER_THAN'
    },

    // 7. LOGISTIQUE, LIVRAISON & CLÔTURE
    {
        key: 'mode_livraison',
        label: 'Mode de mise à disposition de la clé',
        description: 'Méthode : RETRAIT_ARMOIRE, ENVOI_SECURISÉ, REMISE_MAIN_PROPRE.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'string',
        exampleValue: 'RETRAIT_ARMOIRE',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'point_retrait_magasin',
        label: 'Point de retrait / Armoire connectée',
        description: 'Nom de l\'armoire intelligente ou du magasin régional (ex: Armoire-Paris-Est-02).',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'string',
        exampleValue: 'Armoire-Paris-Est-02',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'destinataire_livraison',
        label: 'Identité du réceptionnaire désigné',
        description: 'Personne formellement habilitée à signer l\'émargement de remise.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'string',
        exampleValue: 'Martin Sophie',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'tracking_colis_transporteur',
        label: 'Numéro de suivi de colis sécurisé',
        description: 'Référence d\'expédition scellée en transport blindé ou sécurisé.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'string',
        exampleValue: 'TRK-2026-9938',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'pv_reception_signe',
        label: 'PV de remise physique signé et téléversé',
        description: 'Document officiel de remise de clé signé par le détenteur.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'signature_agent_recue',
        label: 'Signature électronique certifiée reçue',
        description: 'Émargement électronique conforme horodaté et archivé.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'satisfaction_score',
        label: 'Score d\'évaluation qualité (1 à 5)',
        description: 'Note attribuée lors de la clôture de la prestation.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'number',
        exampleValue: '5',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'cloture_sans_reserve',
        label: 'Clôture de mission sans réserve',
        description: 'Confirme qu\'aucun incident ou dégradation n\'a été constaté à la restitution.',
        category: 'LOGISTICS',
        categoryLabel: 'Logistique & PV',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },

    // 8. DEMANDE & DONNÉES GÉNÉRALES
    {
        key: 'reference',
        label: 'Numéro de référence de la demande',
        description: 'Identifiant unique au format DEM-YYYY-XXXXX.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'DEM-2026-0042',
        suggestedOperator: 'CONTAINS'
    },
    {
        key: 'type_demande',
        label: 'Type d\'acte demandé',
        description: 'CREATION_ACCES, RENOUVELLEMENT, RESTITUTION_DEFINITIVE, SUSPENSION.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'CREATION_ACCES',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'motif_demande',
        label: 'Motif de l\'accès ou de l\'intervention',
        description: 'Raison opérationnelle formulée par le demandeur.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'Maintenance préventive caténaire',
        suggestedOperator: 'CONTAINS'
    },
    {
        key: 'urgence_level',
        label: 'Niveau d\'urgence opérationnelle',
        description: 'Priorité : NORMALE, URGENTE, CRITIQUE_SECOURS.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'CRITIQUE_SECOURS',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'statut_actuel',
        label: 'Code statut courant du dossier',
        description: 'Statut en cours de traitement (ex: EN_ATTENTE_VALIDATION_SURETE).',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'EN_ATTENTE_VALIDATION',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'statut_precedent',
        label: 'Code statut immédiatement antérieur',
        description: 'Statut d\'où provient le dossier avant la transition.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'BROUILLON',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'date_debut',
        label: 'Date de début de validité de l\'accès',
        description: 'Date de début d\'ouverture des droits mécatroniques.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'date',
        exampleValue: '2026-10-01',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'date_fin',
        label: 'Date d\'échéance de l\'accès',
        description: 'Date de désactivation programmée des cylindres et clés.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'date',
        exampleValue: '2026-12-31',
        suggestedOperator: 'LESS_THAN'
    },
    {
        key: 'duree_jours',
        label: 'Durée totale d\'accès (en jours)',
        description: 'Nombre de jours ouvrés ou calendaires demandés.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'number',
        exampleValue: '30',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'commentaire_demandeur',
        label: 'Commentaire libre du demandeur',
        description: 'Notes et précisions saisies dans le formulaire.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'Intervention de nuit voie 2',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'code_imputation_comptable',
        label: 'Code imputation analytique interne',
        description: 'Code d\'affectation de charge pour la facturation interne.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'COMPTA-77402-TER',
        suggestedOperator: 'IS_NOT_EMPTY'
    },
    {
        key: 'process_id',
        label: 'Identifiant du Processus Métier',
        description: 'ID numérique du processus de traitement sélectionné (ex: 1, 2, 3...).',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'number',
        exampleValue: '1',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'process_code',
        label: 'Code du Processus Métier',
        description: 'Code technique normalisé du processus (ex: P01, P02, KEY_STD, HABILITATION).',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'KEY_STD',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'site_id',
        label: 'Identifiant du Site ferroviaire',
        description: 'Identifiant unique du site ou de l\'emprise ferroviaire rattachée à la demande.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'number',
        exampleValue: '1',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'site_region',
        label: 'Région territoriale du site',
        description: 'Zone régionale de rattachement du site (Île-de-France, PACA, Auvergne-Rhône-Alpes, etc.).',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'string',
        exampleValue: 'Île-de-France',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'is_multi_site',
        label: 'Demande multi-sites (Plusieurs emprises)',
        description: 'Indique si l\'intervention s\'étend sur plusieurs sites ou une région ferroviaire entière.',
        category: 'GENERAL',
        categoryLabel: 'Données Générales',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'is_team_request',
        label: 'Demande groupée d\'équipe (UX-02)',
        description: 'Indique si le dossier est déposé pour une brigade collective d\'agents.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'team_members_count',
        label: 'Nombre d\'agents de la brigade',
        description: 'Effectif total d\'intervenants déclarés dans le dossier d\'équipe.',
        category: 'IDENTITY',
        categoryLabel: 'Demandeur & RH',
        type: 'number',
        exampleValue: '4',
        suggestedOperator: 'GREATER_THAN'
    },
    {
        key: 'has_document_attached',
        label: 'Justificatif ou Habilitation jointe',
        description: 'Vérifie si un document physique (PDF, attestation H0B0) a été téléversé.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & NIS 2',
        type: 'boolean',
        exampleValue: 'true',
        suggestedOperator: 'EQUALS'
    },
    {
        key: 'sla_remaining_hours',
        label: 'Délai SLA restant (heures)',
        description: 'Nombre d\'heures ouvrées restantes avant forclusion ou dépassement du délai garanti.',
        category: 'SLA',
        categoryLabel: 'SLA & 4-Yeux',
        type: 'number',
        exampleValue: '4',
        suggestedOperator: 'LESS_THAN'
    },
    {
        key: 'normes_applicables',
        label: 'Normes de sécurité exigées (EN 15864 / NIS 2)',
        description: 'Référentiels normatifs imposés par le site ou les équipements sollicités.',
        category: 'SECURITY',
        categoryLabel: 'Sécurité & NIS 2',
        type: 'string',
        exampleValue: 'NIS 2',
        suggestedOperator: 'CONTAINS'
    }
];

/**
 * Extrait dynamiquement tous les champs de référence des tables du portail
 */
export function extractTableFields(referenceTables: any[]): TargetFieldDefinition[] {
    if (!Array.isArray(referenceTables)) return [];

    const discovered: TargetFieldDefinition[] = [];
    const seenKeys = new Set<string>();

    for (const table of referenceTables) {
        const tableId = table.id || table.key || '';
        const tableName = table.name || table.label || tableId;
        const columns = table.columns || [];

        for (const col of columns) {
            const colKey = col.key || col.id || '';
            if (!colKey) continue;

            const qualifiedKey = `${tableId}.${colKey}`;
            if (seenKeys.has(qualifiedKey)) continue;
            seenKeys.add(qualifiedKey);

            let type: 'number' | 'string' | 'boolean' | 'date' = 'string';
            let suggestedOperator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY' = 'EQUALS';
            let exampleValue = 'Valeur test';

            if (col.type === 'number') {
                type = 'number';
                suggestedOperator = 'GREATER_THAN';
                exampleValue = '10';
            } else if (col.type === 'boolean') {
                type = 'boolean';
                suggestedOperator = 'EQUALS';
                exampleValue = 'true';
            } else if (col.type === 'date') {
                type = 'date';
                suggestedOperator = 'GREATER_THAN';
                exampleValue = '2026-12-31';
            } else if (col.options && Array.isArray(col.options) && col.options.length > 0) {
                suggestedOperator = 'EQUALS';
                exampleValue = String(col.options[0]);
            } else {
                suggestedOperator = 'CONTAINS';
                exampleValue = 'Saisie';
            }

            discovered.push({
                key: qualifiedKey,
                label: `[${tableName}] ${col.label || colKey}`,
                description: `Attribut de la table de référence "${tableName}". ${col.description || ''}`,
                category: 'TABLE_REF',
                categoryLabel: tableName,
                type,
                exampleValue,
                suggestedOperator,
                formOrigin: tableName
            });
        }
    }

    return discovered;
}

/**
 * Extrait dynamiquement tous les champs personnalisés définis dans la bibliothèque de formulaires
 */
export function extractFormFields(formTemplates: any[]): TargetFieldDefinition[] {
    if (!Array.isArray(formTemplates)) return [];

    const discovered: TargetFieldDefinition[] = [];
    const seenKeys = new Set<string>();

    for (const form of formTemplates) {
        const fields = form.fields || [];
        for (const f of fields) {
            const fieldKey = (f.id || f.name || '').trim();
            if (!fieldKey || seenKeys.has(fieldKey)) continue;

            seenKeys.add(fieldKey);

            let type: 'number' | 'string' | 'boolean' | 'date' = 'string';
            let suggestedOperator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY' = 'EQUALS';
            let exampleValue = 'Valeur test';

            if (f.type === 'number') {
                type = 'number';
                suggestedOperator = 'GREATER_THAN';
                exampleValue = '100';
            } else if (f.type === 'checkbox' || f.type === 'boolean') {
                type = 'boolean';
                suggestedOperator = 'EQUALS';
                exampleValue = 'true';
            } else if (f.type === 'date' || f.type === 'datetime') {
                type = 'date';
                suggestedOperator = 'GREATER_THAN';
                exampleValue = '2026-12-31';
            } else if (f.type === 'file') {
                suggestedOperator = 'IS_NOT_EMPTY';
                exampleValue = 'document.pdf';
            } else {
                suggestedOperator = 'CONTAINS';
                exampleValue = f.options ? (String(f.options).split(',')[0] || 'Valeur') : 'Saisie agent';
            }

            discovered.push({
                key: fieldKey,
                label: f.label ? `${f.label} (${fieldKey})` : fieldKey,
                description: `Champ dynamique configuré dans le formulaire "${form.name || form.title || form.id}".`,
                category: 'CUSTOM_FORM',
                categoryLabel: 'Formulaires Dynamiques',
                type,
                exampleValue,
                suggestedOperator,
                formOrigin: form.name || form.title || form.code || form.id
            });
        }
    }

    return discovered;
}

/**
 * Recherche un champ par sa clé dans la liste combinée
 */
export function findFieldByKey(key: string, fields: TargetFieldDefinition[]): TargetFieldDefinition | undefined {
    if (!key) return undefined;
    const cleanKey = key.trim().toLowerCase();
    return fields.find(f => f.key.toLowerCase() === cleanKey);
}
