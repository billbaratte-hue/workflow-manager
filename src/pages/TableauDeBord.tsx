import React, { useState, useEffect } from 'react';
import { getRequests, getCategories, getUsers } from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';

const tdbHelpSections: HelpSection[] = [
    {
        title: "Pilotage et KPI d'Accès",
        badge: "Supervision",
        description: "Vue d'ensemble des flux d'accès ferroviaires, taux d'approbation et répartition par catégorie d'intervention.",
        tips: [
            "Surveillez les volumes de demandes en attente pour éviter les goulots d'étranglement",
            "Analysez la répartition des demandes par criticité et par technicentre"
        ]
    }
];

export default function TableauDeBord() {
    const [requests, setRequests] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getRequests(), getCategories(), getUsers()]).then(([r, c, u]) => {
            setRequests(r.data);
            setCategories(c.data);
            setUsers(u.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const totalRequests = requests.length;
    const validated = requests.filter(r => r.status === 'Validée').length;
    const pending = requests.filter(r => r.status === 'En attente de validation').length;
    const rejected = requests.filter(r => r.status === 'Refusée').length;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Opérationnel</h1>
                    <p className="text-sm text-gray-500">Indicateurs clés du portail d'accès mécatronique</p>
                </div>
                <PageHelpButton
                    pageTitle="Tableau de Bord Opérationnel"
                    pageCategory="Pilotage"
                    description="Supervisez les indicateurs de performance des habilitations et flux d'accès."
                    sections={tdbHelpSections}
                />
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-500">Chargement des données...</div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-500 uppercase">Demandes Totales</div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">{totalRequests}</div>
                            <div className="text-xs text-blue-600 mt-2"><i className="fas fa-folder mr-1"></i> Toutes catégories</div>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-500 uppercase">En attente</div>
                            <div className="text-2xl font-bold text-amber-600 mt-1">{pending}</div>
                            <div className="text-xs text-amber-600 mt-2"><i className="fas fa-clock mr-1"></i> Action requise</div>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-500 uppercase">Validées</div>
                            <div className="text-2xl font-bold text-green-600 mt-1">{validated}</div>
                            <div className="text-xs text-green-600 mt-2"><i className="fas fa-check-circle mr-1"></i> Approuvées</div>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-500 uppercase">Refusées</div>
                            <div className="text-2xl font-bold text-red-600 mt-1">{rejected}</div>
                            <div className="text-xs text-red-600 mt-2"><i className="fas fa-ban mr-1"></i> Rejetées</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                                <i className="fas fa-layer-group text-[#002395] mr-2"></i> Catalogues Actifs ({categories.length})
                            </h2>
                            <div className="space-y-3">
                                {categories.map(cat => (
                                    <div key={cat.id} className="p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">{cat.name}</div>
                                            <div className="text-xs text-gray-500">{cat.description}</div>
                                        </div>
                                        <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">{cat.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                                <i className="fas fa-users text-[#002395] mr-2"></i> Annuaire des Agents ({users.length})
                            </h2>
                            <div className="space-y-3">
                                {users.slice(0, 5).map(u => (
                                    <div key={u.id} className="p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">{u.name}</div>
                                            <div className="text-xs text-gray-500">{u.email} • {u.attributes?.region || 'Réseau'}</div>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded">{u.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
