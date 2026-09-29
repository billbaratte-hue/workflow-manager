/**
 * @file src/pages/Documentation.tsx
 * End-User Documentation & Knowledge Base Portal (Epic 4 - User Story 4.4).
 * Operational guides, mechatronic procedures, specifications, FAQ, and downloadable technical manuals.
 */

import React, { useState } from 'react';

interface DocArticle {
    id: string;
    title: string;
    category: 'GUIDES' | 'SPECIFICATIONS' | 'SURETE' | 'FAQ';
    summary: string;
    content: string;
    badge: string;
    lastUpdated: string;
}

export default function Documentation() {
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [activeArticle, setActiveArticle] = useState<DocArticle | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const articles: DocArticle[] = [
        {
            id: 'doc-01',
            title: 'Procédure Générale de Demande de Clé Mécatronique F9000',
            category: 'GUIDES',
            badge: 'Guide Utilisateur',
            summary: 'Étapes pas-à-pas pour formuler une demande d\'accès sur emprise ferroviaire et obtenir une clé encodée.',
            lastUpdated: '15/02/2026',
            content: `
### 1. Contexte & Objectif
Le système mécatronique régit l'accès physique aux installations et locaux techniques sensibles conformément aux normes européennes EN 15864 et EN 16864.

### 2. Étapes de la Demande
1. **Sélection du Processus :** Rendez-vous dans le catalogue et choisissez le formulaire adapté (ex: Émission Clé & Badge).
2. **Identification du Périmètre :** Précisez le site ou sélectionnez le mode multi-sites si votre intervention couvre plusieurs établissements.
3. **Transmission des Justificatifs :** Joignez votre ordre de mission ou attestation de sécurité le cas échéant.
4. **Validation Hiérarchique :** Votre manager d'équipe valide la légitimité opérationnelle dans un délai SLA de 24h.
5. **Validation Technique Site :** Le responsable de site autorise les plages horaires et les accès demandés.
6. **Mise à disposition en Régie :** Récupérez votre clé auprès de votre atelier de rattachement.
            `
        },
        {
            id: 'doc-02',
            title: 'Spécifications Techniques du Cahier des Charges',
            category: 'SPECIFICATIONS',
            badge: 'Cahier des Charges',
            summary: 'Architecture Parent-Enfant, matrice des 8 processus métiers et exigences de conformité.',
            lastUpdated: '01/01/2026',
            content: `
### Architecture des 8 Processus Métier
Le référentiel opérationnel formalise 8 processus stricts :
- **P1 :** Émission Initiale Clé & Badge
- **P2 :** Prolongation / Extension Temporelle
- **P3 :** Restitution de Matériel en Fin d'Intervention
- **P4 :** Déclaration de Perte / Vol (Télé-Révocation d'Urgence)
- **P5 :** Commande de Cylindres Électroniques avec Relevé GPS
- **P6 :** Déploiement Massif & Projets d'Infrastructure
- **P7 :** Maintenance & Échange Standard
- **P8 :** Habilitation Transverse & Changement d'Établissement
            `
        },
        {
            id: 'doc-03',
            title: 'Directive NIS 2 & Traçabilité des Événements Sûreté',
            category: 'SURETE',
            badge: 'Conformité NIS 2',
            summary: 'Obligations légales d\'auditabilité, intégrité des journaux syslog et révocation d\'urgence.',
            lastUpdated: '20/01/2026',
            content: `
### Exigences de Sécurité & Traçabilité
Le système applique un principe d'immuabilité et de conformité stricte sur toutes les opérations :
- **Signature Cryptographique :** Les bordereaux PDF générés comportent un sceau SHA-256.
- **Révocation Instantanée :** Toute clé égarée doit être déclarée sans délai pour propager la révocation de sécurité sur l'ensemble des bornes et lecteurs sous 1 heure.
            `
        },
        {
            id: 'doc-04',
            title: 'FAQ — Questions Fréquentes & Dépannage Borne',
            category: 'FAQ',
            badge: 'Support Opérationnel',
            summary: 'Comment réactiver une clé expirée ? Où trouver une borne de mise à jour ?',
            lastUpdated: '10/02/2026',
            content: `
### Questions Fréquentes :
**Q : Ma clé clignote rouge sur la serrure du poste d'aiguillage.**
*R :* Vos certificats journaliers ont expiré. Insérez votre clé dans n'importe quelle borne murale pendant 5 secondes pour rafraîchir vos droits d'accès.

**Q : Combien de temps puis-je conserver une clé de prêt ?**
*R :* La durée maximale par défaut est de 90 jours (S14). Une alerte de restitution vous est envoyée par notification 14 jours avant l'échéance.
            `
        }
    ];

    const filtered = articles.filter(a => {
        const matchesCat = selectedCategory === 'ALL' || a.category === selectedCategory;
        const matchesQuery = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             a.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesQuery;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-[#002395] to-blue-900 rounded-2xl p-8 text-white shadow-xl mb-8">
                <div className="max-w-2xl">
                    <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
                        Base de Connaissances & Référentiels Opérationnels
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">
                        Documentation & Procédures Mécatroniques
                    </h1>
                    <p className="text-slate-200 text-sm mt-2">
                        Consultez les guides officiels d'utilisation, le cahier des charges et les consignes de sûreté.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <a
                            href="/Documentation_Pack.zip"
                            download="Documentation_Pack.zip"
                            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow transition"
                        >
                            <i className="fas fa-file-archive"></i>
                            <span>Télécharger le Pack Complet (ZIP)</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                    {[
                        { key: 'ALL', label: 'Tous les guides' },
                        { key: 'GUIDES', label: 'Guides Utilisateurs' },
                        { key: 'SPECIFICATIONS', label: 'Spécifications Métier' },
                        { key: 'SURETE', label: 'Sûreté & NIS 2' },
                        { key: 'FAQ', label: 'FAQ / Dépannage' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setSelectedCategory(tab.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                selectedCategory === tab.key
                                    ? 'bg-[#002395] text-white shadow'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <i className="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Rechercher une procédure..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-none"
                    />
                </div>
            </div>

            {/* Articles Grid or Reader View */}
            {activeArticle ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <button
                        onClick={() => setActiveArticle(null)}
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#002395] hover:underline mb-6"
                    >
                        <i className="fas fa-arrow-left"></i>
                        <span>Retour à la liste des documents</span>
                    </button>

                    <div className="border-b border-slate-100 pb-6 mb-6">
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-[#002395]">
                            {activeArticle.badge}
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 mt-3">{activeArticle.title}</h2>
                        <p className="text-xs text-slate-400 mt-2">Dernière révision : {activeArticle.lastUpdated}</p>
                    </div>

                    <div className="prose max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {activeArticle.content}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map(article => (
                        <div
                            key={article.id}
                            onClick={() => setActiveArticle(article)}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#002395]">
                                        {article.badge}
                                    </span>
                                    <span className="text-xs text-slate-400">{article.lastUpdated}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 hover:text-[#002395] transition">
                                    {article.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    {article.summary}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-[#002395]">
                                <span>Lire la procédure complète</span>
                                <i className="fas fa-arrow-right text-[10px]"></i>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
