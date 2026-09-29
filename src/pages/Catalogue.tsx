import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProcesses, getMyRequests, getCategories } from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';

const catalogueHelpSections: HelpSection[] = [
    {
        title: "Catalogue des Procédures d'Accès",
        badge: "Services",
        description: "Sélectionnez le type d'intervention ou de matériel mécatronique nécessaire (clés CLIQ, badges Vigik/NFC, consignation de voie).",
        tips: [
            "Chaque formulaire est adapté selon la catégorie et les contraintes réglementaires de sécurité",
            "Les formulaires sont dynamiques et s'adaptent aux sites et zones ferroviaires demandés"
        ]
    }
];

interface CatalogueProps {
    onSelectProcess: (id: number) => void;
}

export default function Catalogue({ onSelectProcess }: CatalogueProps) {
    const [processes, setProcesses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getProcesses(), getMyRequests(), getCategories()]).then(([procRes, myReqRes, catRes]) => {
            setProcesses(procRes.data);
            setMyRequests(myReqRes.data);
            setCategories(catRes.data);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load catalogue:", err);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement du catalogue...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
            <main className="flex-1">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Catalogue des Services</h1>
                        <span className="text-sm text-gray-500">{processes.length} service(s) disponible(s)</span>
                    </div>
                    <PageHelpButton
                        pageTitle="Catalogue des Services"
                        pageCategory="Portail Agent"
                        description="Parcourez l'ensemble des procédures d'accès ferroviaires disponibles."
                        sections={catalogueHelpSections}
                    />
                </div>

                {/* Bannière d'accès direct Machine à États & Cycle de Vie */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-5 mb-8 shadow-sm border border-blue-700/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                Architecture Enterprise
                            </span>
                            <span className="bg-blue-400/20 text-blue-200 text-xs px-2 py-0.5 rounded font-medium border border-blue-400/30">
                                Cycle de Vie des Demandes
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            Machine à États & Architecture Parent-Enfant
                        </h2>
                        <p className="text-xs text-blue-200 mt-1 max-w-2xl">
                            Validation asynchrone multi-jalons, devis différentiel, contrôle dynamique de quota, double approbation croisée, validation terrain GPS et suspension de sécurité.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Link
                            to="/nouvelle-demande"
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition border border-white/20"
                        >
                            <i className="fas fa-plus-circle mr-2"></i> Nouvelle Demande
                        </Link>
                        <Link
                            to="/workflows"
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-lg text-sm font-bold transition shadow-sm"
                        >
                            <i className="fas fa-project-diagram mr-2"></i> Ouvrir la Machine à États
                        </Link>
                    </div>
                </div>
                <div className="space-y-8">
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                            <h2 className="text-lg font-bold mb-4 flex items-center">
                                <i className="fas fa-folder-open text-[#002395] mr-2"></i> {cat.name}
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">{cat.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {processes.filter(p => p.category_id == cat.id).map(proc => (
                                    <div
                                        key={proc.id}
                                        onClick={() => onSelectProcess(proc.id)}
                                        className="border border-gray-200 p-4 rounded-lg hover:shadow-md hover:border-blue-400 cursor-pointer flex items-center space-x-3 transition bg-gray-50/50"
                                    >
                                        <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                                            <i className="fas fa-key text-[#002395]"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-gray-900">{proc.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{proc.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
