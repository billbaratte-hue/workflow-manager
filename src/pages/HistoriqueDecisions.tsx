import React, { useState, useEffect } from 'react';
import { getDecisionHistory } from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';

const historiqueHelpSections: HelpSection[] = [
    {
        title: "Traçabilité des Décisions",
        badge: "Audit",
        description: "Ce registre consigne l'ensemble des arbitrages (validations, refus, compléments) effectués par les managers et validateurs de sites.",
        tips: [
            "Conforme aux exigences d'audit et de sûreté des accès de l'infrastructure",
            "Chaque décision conserve son horodatage certifié et l'identité du signataire"
        ]
    }
];

export default function HistoriqueDecisions() {
    const [hist, setHist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDecisionHistory().then(res => {
            setHist(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historique des Décisions</h1>
                    <p className="text-sm text-gray-500">Journal de traçabilité des arbitrages et validations</p>
                </div>
                <PageHelpButton
                    pageTitle="Historique des Décisions"
                    pageCategory="Traçabilité"
                    description="Consultez le journal des approbations et arbitrages mécatroniques."
                    sections={historiqueHelpSections}
                />
            </div>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réf</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Décision</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auteur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
                        ) : hist.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Aucun historique disponible.</td></tr>
                        ) : (
                            hist.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-blue-600 text-sm">{item.reference}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{item.title}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                                            item.decision === 'Validée' ? 'bg-green-100 text-green-800' :
                                            item.decision === 'Refusée' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {item.decision}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{item.author}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{new Date(item.date).toLocaleString('fr-FR')}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
