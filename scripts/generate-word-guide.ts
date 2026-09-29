/**
 * @file scripts/generate-word-guide.ts
 * Générateur automatisé du guide complet de l'application Workflow Manager au format Microsoft Word (.docx).
 */

import fs from 'fs';
import path from 'path';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    ShadingType,
    Header,
    Footer,
    PageNumber,
    NumberFormat
} from 'docx';

const COLOR_PRIMARY = '002395';     // Bleu Cobalt Opérationnel
const COLOR_SECONDARY = '0F172A';   // Slate Dark
const COLOR_ACCENT = '2563EB';      // Bleu Vif
const COLOR_BG_LIGHT = 'F8FAFC';    // Gris Clair Fond
const COLOR_BORDER = 'E2E8F0';      // Bordures
const COLOR_TEXT = '334155';        // Texte courant
const COLOR_SUCCESS = '059669';     // Vert Emeraude

function createTitle(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 180 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 32,
                color: COLOR_PRIMARY,
                font: 'Calibri'
            })
        ]
    });
}

function createSubTitle(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 26,
                color: COLOR_SECONDARY,
                font: 'Calibri'
            })
        ]
    });
}

function createH3(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 22,
                color: COLOR_ACCENT,
                font: 'Calibri'
            })
        ]
    });
}

function createParagraph(text: string, boldPrefix: string = ''): Paragraph {
    const children: TextRun[] = [];
    if (boldPrefix) {
        children.push(
            new TextRun({
                text: boldPrefix + ' ',
                bold: true,
                size: 22,
                color: COLOR_SECONDARY,
                font: 'Calibri'
            })
        );
    }
    children.push(
        new TextRun({
            text,
            size: 22,
            color: COLOR_TEXT,
            font: 'Calibri'
        })
    );

    return new Paragraph({
        spacing: { before: 80, after: 80, line: 280 },
        children
    });
}

function createBullet(text: string, boldPrefix: string = ''): Paragraph {
    const children: TextRun[] = [];
    if (boldPrefix) {
        children.push(
            new TextRun({
                text: boldPrefix + ' ',
                bold: true,
                size: 22,
                color: COLOR_SECONDARY,
                font: 'Calibri'
            })
        );
    }
    children.push(
        new TextRun({
            text,
            size: 22,
            color: COLOR_TEXT,
            font: 'Calibri'
        })
    );

    return new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40, line: 260 },
        children
    });
}

function createCallout(title: string, content: string): Table {
    const border = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: COLOR_PRIMARY
    };
    const noneBorder = {
        style: BorderStyle.NONE,
        size: 0,
        color: 'auto'
    };

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
                        borders: {
                            left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY },
                            top: noneBorder,
                            right: noneBorder,
                            bottom: noneBorder
                        },
                        margins: { top: 140, bottom: 140, left: 200, right: 200 },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `[INFO SÉCURITÉ] ${title}`,
                                        bold: true,
                                        size: 22,
                                        color: COLOR_PRIMARY,
                                        font: 'Calibri'
                                    })
                                ]
                            }),
                            new Paragraph({
                                spacing: { before: 60 },
                                children: [
                                    new TextRun({
                                        text: content,
                                        size: 20,
                                        color: COLOR_SECONDARY,
                                        font: 'Calibri'
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function createStyledTable(headers: string[], rowsData: string[][], colWidthsPercent: number[]): Table {
    const cellBorder = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: COLOR_BORDER
    };

    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
            width: { size: colWidthsPercent[i] || Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            borders: {
                top: cellBorder,
                bottom: cellBorder,
                left: cellBorder,
                right: cellBorder
            },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: h,
                            bold: true,
                            color: 'FFFFFF',
                            size: 20,
                            font: 'Calibri'
                        })
                    ]
                })
            ]
        }))
    });

    const bodyRows = rowsData.map((row, rIdx) => new TableRow({
        children: row.map((cellText, cIdx) => new TableCell({
            width: { size: colWidthsPercent[cIdx] || Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
            shading: {
                fill: rIdx % 2 === 0 ? 'FFFFFF' : COLOR_BG_LIGHT,
                type: ShadingType.CLEAR
            },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: {
                top: cellBorder,
                bottom: cellBorder,
                left: cellBorder,
                right: cellBorder
            },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: cellText,
                            size: 20,
                            color: COLOR_TEXT,
                            font: 'Calibri'
                        })
                    ]
                })
            ]
        }))
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows]
    });
}

async function buildWordDocument() {
    console.log('Construction du document Word...');

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Calibri',
                        size: 22,
                        color: COLOR_TEXT
                    }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch = 1440 twips
                            bottom: 1440,
                            left: 1440,
                            right: 1440
                        }
                    }
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: 'Workflow Manager — Plateforme Opérationnelle d\'Orchestration & Habilitations',
                                        size: 18,
                                        color: '94A3B8',
                                        font: 'Calibri'
                                    })
                                ]
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.JUSTIFIED,
                                children: [
                                    new TextRun({
                                        text: 'Confidentiel & Restreint — Conforme Directive NIS 2 / ISO 27001                Page ',
                                        size: 18,
                                        color: '94A3B8',
                                        font: 'Calibri'
                                    }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        size: 18,
                                        color: '94A3B8',
                                        font: 'Calibri'
                                    })
                                ]
                            })
                        ]
                    })
                },
                children: [
                    // PAGE DE COUVERTURE & TITRE PRINCIPAL
                    new Paragraph({
                        spacing: { before: 720, after: 180 },
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: 'PORTAIL OPÉRATIONNEL MÉCATRONIQUE',
                                bold: true,
                                size: 24,
                                color: COLOR_ACCENT,
                                font: 'Calibri'
                            })
                        ]
                    }),
                    new Paragraph({
                        spacing: { before: 120, after: 240 },
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: 'WORKFLOW MANAGER',
                                bold: true,
                                size: 54,
                                color: COLOR_PRIMARY,
                                font: 'Calibri'
                            })
                        ]
                    }),
                    new Paragraph({
                        spacing: { before: 0, after: 480 },
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: 'Guide Intégral & Manuel de Référence Opérationnel',
                                italics: true,
                                size: 28,
                                color: COLOR_SECONDARY,
                                font: 'Calibri'
                            })
                        ]
                    }),

                    createCallout(
                        'Périmètre & Conformité du Document',
                        'Ce document constitue le référentiel complet d\'architecture logicielle, de gouvernance des habilitations, des processus de validation et de la politique de sécurité NIS 2 / ISO 27001 de la solution Workflow Manager. Version 2.4.0 (Septembre 2026).'
                    ),

                    new Paragraph({ spacing: { before: 360, after: 120 } }),

                    // 1. VUE D'ENSEMBLE & ARCHITECTURE
                    createTitle('1. Vue d\'Ensemble & Architecture Technique'),
                    createParagraph(
                        'Workflow Manager est une solution complète conçue pour piloter le cycle de vie des accès physiques et logiques sur les sites opérationnels, la distribution des clés électroniques mécatroniques programmables (F9000), des badges RFID et la traçabilité intégrale des interventions.'
                    ),
                    createParagraph(
                        'L\'application repose sur une philosophie Zero-Hardcoding : l\'ensemble des processus, des formulaires, des tables de référence, des règles métier et de la matrice des statuts est entièrement configurable depuis l\'interface d\'administration sans modifier le code source.'
                    ),
                    createH3('Composants Technologiques Principaux'),
                    createBullet('Frontend React 19, TypeScript et Tailwind CSS pour une interface fluide, accessible (WCAG 2.1 AA) et responsive.', '• Interface Utilisateur :'),
                    createBullet('Serveur Express 4 et runtime Node.js avec architecture en couches (Contrôleurs, Services, Référentiels).', '• Backend :'),
                    createBullet('Abstraite via l\'interface unifiée ISqliteDb. Supporte SQLite (embarqué) et MariaDB / MySQL (haute disponibilité d\'entreprise).', '• Persistance Multi-Moteur :'),
                    createBullet('Cloisonnement étanche des données par tenant_id avec personnalisation de marque (logo, couleurs, charte graphique).', '• Multi-Tenant & Marque Blanche :'),
                    createBullet('Génération de jetons JWT sécurisés, rate limiting contre les attaques par force brute, hachage bcrypt et audit trails immuables.', '• Sécurité NIS 2 :'),

                    new Paragraph({ spacing: { before: 240, after: 120 } }),

                    // 2. PROFILS OPÉRATIONNELS & RBAC
                    createTitle('2. Profils Opérationnels & Matrice RBAC'),
                    createParagraph(
                        'La gestion des droits s\'appuie sur un système RBAC (Role-Based Access Control) couplé à des périmètres de données dynamiques (Data Scopes : propre compte, département, sites assignés, tous dossiers).'
                    ),
                    createStyledTable(
                        ['Rôle Opérationnel', 'Email Démo', 'Missions & Responsabilités', 'Périmètre Données'],
                        [
                            ['Administrateur', 'admin@entreprise.fr', 'Gouvernance totale, modélisation des processus, configuration des règles, tables de référence et gestion des rôles.', 'Global (Tous dossiers)'],
                            ['Validateur Site', 'validateur@entreprise.fr', 'Validation hiérarchique et technique des accès sur son périmètre géographique, habilité aux signatures électroniques.', 'Sites assignés'],
                            ['Manager N+1', 'manager@entreprise.fr', 'Approbation préalable des demandes déposées par les agents de son service ou équipe.', 'Département / Équipe'],
                            ['Demandeur', 'daniel@entreprise.fr', 'Initiation de dossiers d\'accès, suivi en temps réel, génération des bordereaux PDF, gestion du matériel.', 'Personnel (Propres dossiers)']
                        ],
                        [22, 25, 38, 15]
                    ),
                    createParagraph(
                        'Le mot de passe unifié pour l\'ensemble des comptes préconfigurés de démonstration est : Securite2026!'
                    ),

                    new Paragraph({ spacing: { before: 240, after: 120 } }),

                    // 3. PARCOURS UTILISATEUR OPÉRATIONNELS
                    createTitle('3. Parcours Utilisateur Opérationnels'),

                    createSubTitle('3.1 Espace Demandeur & Création de Dossiers'),
                    createParagraph(
                        'Les agents et prestataires tiers accèdent au Catalogue Opérationnel qui regroupe les 8 processus normalisés. Le formulaire dynamique guide la saisie :'
                    ),
                    createBullet('Choix du type d\'intervention (unitaire ou en équipe de sous-traitance avec déclaration de société et liste d\'agents).', '• Mode Équipe :'),
                    createBullet('Sélection possible de plusieurs gares ou centres techniques en un seul dossier.', '• Multi-Sites :'),
                    createBullet('Vérification automatique de la taille, de l\'extension et du type MIME pour bloquer tout fichier malveillant.', '• Dépôt de Pièces Jointes :'),
                    createBullet('Génération instantanée du Bordereau d\'Accès PDF horodaté contenant un QR Code officiel et le tampon de signature.', '• Bordereau PDF :'),

                    createSubTitle('3.2 Corbeille Validateur & Traitement des Demandes'),
                    createParagraph(
                        'La Corbeille offre aux managers et validateurs de site une vision claire et priorisée :'
                    ),
                    createBullet('Chaque dossier affiche un badge visuel (SLA 24h, 48h, Urgent) avec alerte sonore en cas de dépassement imminent.', '• Respect des SLA :'),
                    createBullet('Possibilité de sélectionner simultanément des dizaines de dossiers conformes pour les approuver ou les refuser en un clic.', '• Décisions par Lot (UX-01) :'),
                    createBullet('Dialogue structuré avec le demandeur pour obtenir une pièce complémentaire sans rejeter le dossier.', '• Demande de Compléments :'),
                    createBullet('Désignation d\'un suppléant en cas d\'absence pour assurer la continuité des validations.', '• Délégations :'),

                    createSubTitle('3.3 Régie Matérielle & Restitution Sécurisée'),
                    createParagraph(
                        'La Régie contrôle physiquement l\'équipement (clés électroniques F9000, badges RFID, programmateurs de poche) :'
                    ),
                    createBullet('Établissement d\'un contrat contradictoire lors de la remise et de la reprise du matériel.', '• Contrats de Restitution (US 3.3) :'),
                    createBullet('Calcul dynamique des pénalités financières et administratives en cas de retard, détérioration ou perte.', '• Pénalités :'),
                    createBullet('Révocation immédiate d\'une clé perdue ou volée avec propagation de l\'interdiction sur les serrures de site.', '• Révocation & Blacklisting :'),

                    createSubTitle('3.4 Console Nationale & Supervision'),
                    createParagraph(
                        'Offre au commandement national une cartographie globale des chantiers en cours, des volumes d\'accès par région et des anomalies de sécurité.'
                    ),

                    new Paragraph({ spacing: { before: 240, after: 120 } }),

                    // 4. MOTEURS MÉTIERS SPÉCIALISÉS
                    createTitle('4. Moteurs Métiers Spécialisés (Zero-Hardcoding)'),
                    createSubTitle('4.1 Machine à États & Workflows Parent-Enfant'),
                    createParagraph(
                        'Lorsqu\'une demande implique plusieurs sites, le moteur crée automatiquement des sous-dossiers enfants indépendants rattachés au dossier parent. Le dossier parent n\'atteint le statut final "Approuvé" que lorsque tous les sites enfants ont validé leur étape.'
                    ),

                    createSubTitle('4.2 Moteur de Règles Métier Zero-Code'),
                    createParagraph(
                        'Permet aux administrateurs de définir des automatisations sans écrire une ligne de code :'
                    ),
                    createBullet('ON_SUBMIT, ON_STATUS_CHANGE, ON_APPROVE, ON_REJECT.', '• Événements Déclencheurs :'),
                    createBullet('equals, not_equals, contains, greater_than, less_than, in_list, is_empty.', '• Opérateurs :'),
                    createBullet('Routage vers un validateur spécifique, refus automatique si pièce manquante, calcul de pénalité, alerte email.', '• Actions Automatisées :'),
                    createBullet('Environnement de simulation interactif permettant d\'injecter des données de test avant activation.', '• Bac à Sable :'),

                    createSubTitle('4.3 Moteur d\'Affectation Dynamique & Champs Conditionnels'),
                    createBullet('Détermine les validateurs requis selon les caractéristiques du site (niveau de sécurité Seveso, zone ferroviaire, haute tension).', '• Affectation Dynamique (US 3.1) :'),
                    createBullet('Affiche ou masque des champs du formulaire selon les choix précédents de l\'agent.', '• Champs Conditionnels (US 3.2) :'),

                    new Paragraph({ spacing: { before: 240, after: 120 } }),

                    // 5. ESPACE ADMINISTRATEUR
                    createTitle('5. Espace Administrateur & Studio Graphique'),
                    createParagraph(
                        'L\'Espace Administrateur (/admin) regroupe l\'ensemble des fonctions de gouvernance transversale :'
                    ),
                    createBullet('Studio graphique drag-and-drop pour orchestrer visuellement les étapes de validation et les délais SLA.', '• Workflow Studio :'),
                    createBullet('Création libre de formulaires et champs personnalisés rattachés aux processus.', '• Formulaires Dynamiques :'),
                    createBullet('Gestion dynamique des listes de référence (Sites, Régions, Équipements) avec création de colonnes à la volée et import CSV.', '• Tables de Référence :'),
                    createBullet('Création de statuts personnalisés, choix des couleurs de badges et matrice des transitions d\'états.', '• Configurateur de Statuts :'),
                    createBullet('Simulateur de rôles pour prévisualiser l\'interface telle que perçue par un utilisateur donné.', '• Simulateur de Rôles :'),

                    new Paragraph({ spacing: { before: 240, after: 120 } }),

                    // 6. SÉCURITÉ & CONFORMITÉ NIS 2
                    createTitle('6. Sécurité, Conformité NIS 2 & Gestion des Identités'),
                    createSubTitle('6.1 Politique de Sécurité des Mots de Passe'),
                    createParagraph(
                        'La politique de sécurité dynamique (password_access_policy) impose des règles strictes :'
                    ),
                    createBullet('Minimum 8 caractères, majuscule, minuscule, chiffre et caractère spécial obligatoires.', '• Complexité :'),
                    createBullet('Interdiction de réutiliser le mot de passe actuel lors d\'un changement.', '• Historique :'),
                    createBullet('Limitation à 5 tentatives infructueuses par IP avec blocage temporaire (express-rate-limit).', '• Anti-Brute Force :'),

                    createSubTitle('6.2 Récupération de Mot de Passe Sécurisée par Email'),
                    createParagraph(
                        'Le module de récupération par email garantit une sécurité maximale conforme aux standards bancaires et NIS 2 :'
                    ),
                    createBullet('L\'API renvoie toujours un message de confirmation neutre pour empêcher l\'énumération des comptes existants.', '• Anti-Énumération :'),
                    createBullet('Jeton de 32 octets aléatoires généré cryptographiquement. Seule l\'empreinte SHA-256 est persistée en base.', '• Empreinte SHA-256 :'),
                    createBullet('Validité limitée à 1 heure, invalidation des anciens jetons et destruction immédiate dès la première utilisation.', '• Usage Unique :'),
                    createBullet('Page dédiée (/reset-password) avec jauge dynamique de robustesse et checklist interactive des critères.', '• Interface Utilisateur :'),

                    createSubTitle('6.3 Journal d\'Audit & Conformité RGPD'),
                    createBullet('Chaque action système est inscrite dans la table audit_logs de façon inaltérable avec acteur, rôle, cible et horodatage ISO.', '• Journal Syslog :'),
                    createBullet('Purge ou anonymisation programmée des demandes obsolètes selon les règles de conservation.', '• Rétention RGPD :'),

                    new Paragraph({ spacing: { before: 240, after: 120 } }),

                    // 7. GUIDE D'EXPLOITATION & DÉPLOIEMENT
                    createTitle('7. Guide d\'Exploitation & Déploiement'),
                    createParagraph(
                        'Commandes principales pour l\'administration et le déploiement de la solution :'
                    ),
                    createStyledTable(
                        ['Commande Shell', 'Description & Rôle Opérationnel'],
                        [
                            ['npm run dev', 'Démarre le serveur complet en mode développement (Vite HMR + Express).'],
                            ['npm test', 'Lance l\'intégralité des 140 tests unitaires et d\'intégration (Vitest).'],
                            ['npm run test:e2e', 'Exécute les 13 scénarios de tests navigateurs de bout en bout (Playwright).'],
                            ['npm run lint', 'Vérifie l\'absence d\'erreurs de typage statique TypeScript (tsc --noEmit).'],
                            ['npm run build', 'Compile les assets frontend et génère le bundle serveur dist/server.cjs.'],
                            ['npm start', 'Démarre l\'application en mode production haute performance.']
                        ],
                        [35, 65]
                    ),

                    createH3('Bascule vers le Moteur MariaDB / MySQL'),
                    createParagraph(
                        'Pour passer d\'un mode SQLite local à une grappe MariaDB d\'entreprise, il suffit d\'alimenter les variables d\'environnement suivantes :'
                    ),
                    createBullet('DB_ENGINE=mariadb', '1. Moteur :'),
                    createBullet('DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME', '2. Identifiants :'),
                    createBullet('Le script scripts/init-mariadb.sql initialise automatiquement toutes les tables, index et clés étrangères.', '3. Schéma :')
                ]
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.resolve(process.cwd(), 'Workflow_Manager_Guide_Complet.docx');
    fs.writeFileSync(outputPath, buffer);

    // Copie également dans le dossier des artefacts
    const artifactDir = 'C:\\Users\\gbara\\.gemini\\antigravity\\brain\\9dd6865c-f7d0-4409-a1bc-88b28ddfd907';
    if (fs.existsSync(artifactDir)) {
        fs.writeFileSync(path.join(artifactDir, 'Workflow_Manager_Guide_Complet.docx'), buffer);
    }

    console.log(`Document Word généré avec succès (${(buffer.length / 1024).toFixed(1)} Ko) : ${outputPath}`);
}

buildWordDocument().catch(err => {
    console.error('Erreur lors de la génération du document Word:', err);
    process.exit(1);
});
