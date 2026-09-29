import React, { useState, useEffect } from 'react';
import { getDelegations, setDelegation, getUsers } from '../lib/api';
import PageHelpButton, { HelpSection } from '../components/PageHelpModal';
import { useFeatures } from '../context/FeaturesContext';
import { Link } from 'react-router-dom';

const delegationHelpSections: HelpSection[] = [
    {
        title: "Délégation de Pouvoirs",
        badge: "Continuité de Service",
        description: "Permet à un validateur de désigner un suppléant temporaire pour examiner et signer les demandes d'accès à sa place.",
        tips: [
            "Le suppléant hérite des droits de validation sur le périmètre du délégant",
            "Toutes les approbations effectuées sous mandat restent tracées et signées"
        ]
    }
];

export default function Delegation() {
    const { isFeatureEnabled, toggleFeature } = useFeatures();
    const isDelegationEnabled = isFeatureEnabled('delegation_approval');

    const [dels, setDels] = useState<Record<string, string>>({});
    const [users, setUsers] = useState<any[]>([]);
    const [delegatorId, setDelegatorId] = useState('201');
    const [delegateId, setDelegateId] = useState('305');
    const [message, setMessage] = useState('');
    const [isReactivating, setIsReactivating] = useState(false);

    const load = () => {
        getDelegations().then(res => setDels(res.data)).catch(console.error);
        getUsers().then(res => setUsers(res.data)).catch(console.error);
    };

    useEffect(() => { 
        if (isDelegationEnabled) {
            load(); 
        }
    }, [isDelegationEnabled]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setDelegation({ delegator_id: delegatorId, delegate_id: delegateId });
            setMessage("Délégation enregistrée avec succès !");
            load();
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setMessage(err.response?.data?.error || "Erreur lors de l'enregistrement de la délégation.");
        }
    };

    const handleReactivate = async () => {
        setIsReactivating(true);
        try {
            await toggleFeature('delegation_approval', true);
            load();
        } catch (err) {
            console.error("Erreur de réactivation:", err);
        } finally {
            setIsReactivating(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Délégations de Validation</h1>
                    <p className="text-sm text-gray-500">Transférer temporairement les pouvoirs de validation en cas d'absence</p>
                </div>
                <PageHelpButton
                    pageTitle="Délégations de Validation"
                    pageCategory="Suppléance"
                    description="Gérez la suppléance opérationnelle des validateurs de sécurité."
                    sections={delegationHelpSections}
                />
            </div>

            {!isDelegationEnabled && (
                <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                        <i className="fas fa-exclamation-triangle text-amber-600 text-lg mt-0.5"></i>
                        <div>
                            <h3 className="text-sm font-bold">Module Délégations Désactivé</h3>
                            <p className="text-xs text-amber-800 mt-0.5">
                                La fonctionnalité de délégation de pouvoir a été désactivée par un administrateur dans la console des modules. Les transferts de validation sont gelés.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleReactivate}
                            disabled={isReactivating}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <i className="fas fa-power-off"></i>
                            <span>{isReactivating ? 'Réactivation...' : 'Réactiver ce module'}</span>
                        </button>
                        <Link
                            to="/admin/onglets-referentiels?section=features"
                            className="text-xs text-amber-800 underline hover:text-amber-950 font-medium px-2 py-1"
                        >
                            Gérer les modules
                        </Link>
                    </div>
                </div>
            )}

            {message && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm font-medium">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-base font-bold text-gray-900 mb-4">Nouvelle Délégation</h2>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Délégant (Validateur titulaire)</label>
                            <select
                                value={delegatorId}
                                onChange={e => setDelegatorId(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-sm"
                            >
                                {users.filter(u => u.role !== 'Demandeur').map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Délégué (Suppléant)</label>
                            <select
                                value={delegateId}
                                onChange={e => setDelegateId(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-sm"
                            >
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="bg-[#002395] text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800 transition"
                        >
                            Enregistrer la délégation
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-base font-bold text-gray-900 mb-4">Délégations Actives</h2>
                    {Object.keys(dels).length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune délégation active pour le moment.</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(dels).map(([dId, sId]) => {
                                const delegator = users.find(u => String(u.id) === String(dId));
                                const delegate = users.find(u => String(u.id) === String(sId));
                                return (
                                    <div key={dId} className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-semibold text-gray-900">{delegator?.name || `ID ${dId}`}</span>
                                            <span className="text-xs text-gray-500 mx-2">délègue à</span>
                                            <span className="font-semibold text-blue-700">{delegate?.name || `ID ${sId}`}</span>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded">Active</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
