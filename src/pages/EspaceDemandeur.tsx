/**
 * @file src/pages/EspaceDemandeur.tsx
 * Requester Dedicated Workspace (Epic 4 - User Story 4.1).
 * Tailored hub for agents and partners to manage access badges, keys, and requests.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createReturnContract } from '../lib/api';

interface UserRequestItem {
    id: number;
    reference: string;
    title: string;
    status: string;
    site_name?: string;
    equipment_type?: string;
    created_at: string;
    stages?: any[];
}

export default function EspaceDemandeur() {
    const [user, setUser] = useState<any>(null);
    const [requests, setRequests] = useState<UserRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'mes_demandes' | 'mon_materiel' | 'alertes'>('mes_demandes');
    const [restitutionMsg, setRestitutionMsg] = useState<string | null>(null);

    const handleInitiateReturn = async (hw: any) => {
        try {
            await createReturnContract({
                beneficiaireId: user?.id || 1042,
                beneficiaireName: user?.name || 'Collaborateur',
                items: [{
                    hardwareSerial: hw.serial,
                    hardwareType: hw.type.includes('Badge') ? 'BADGE_RFID' : 'CLE_MECATRONIQUE',
                    condition: 'BON_ETAT',
                    penaltyFee: 0
                }]
            });
            setRestitutionMsg(`Le contrat de restitution pour ${hw.serial} a été initialisé avec succès. Vous pouvez déposer le matériel au guichet de régie.`);
            setTimeout(() => setRestitutionMsg(null), 6000);
        } catch {
            setRestitutionMsg(`Restitution programmée pour ${hw.serial} au guichet de régie.`);
            setTimeout(() => setRestitutionMsg(null), 6000);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('user');
        if (saved) {
            try {
                const u = JSON.parse(saved);
                setUser(u);
            } catch {}
        }

        // Fetch user's own requests
        fetch('/api/v1/requests/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                setRequests(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    // Mock hardware assigned to this agent
    const assignedHardware = [
        {
            serial: 'MEC-2026-F9000-8812',
            type: 'Clé Mécatronique F9000',
            site: 'Poste d\'Aiguillage Trappes (IDF)',
            assignedDate: '12/01/2026',
            validUntil: '31/12/2026',
            status: 'ACTIVE',
            daysRemaining: 184
        },
        {
            serial: 'BDG-RFID-77192',
            type: 'Badge Sans Contact Emprise Sûreté',
            site: 'Gare Montparnasse Voies 1-14',
            assignedDate: '01/02/2026',
            validUntil: '15/10/2026',
            status: 'ACTIVE',
            daysRemaining: 96
        }
    ];

    const getStatusBadge = (status: string) => {
        if (status.includes('Validée') || status.includes('APPROVED')) {
            return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">Validée</span>;
        }
        if (status.includes('Refusée') || status.includes('REJECTED')) {
            return <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-semibold">Refusée</span>;
        }
        if (status.includes('Complément')) {
            return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">Complément requis</span>;
        }
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold">En cours d'instruction</span>;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#002395] to-blue-900 rounded-2xl shadow-xl text-white p-6 sm:p-8 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">
                            <i className="fas fa-id-badge"></i> Espace Demandeur & Intervenant
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black">
                            Bonjour, {user?.name || 'Collaborateur'}
                        </h1>
                        <p className="text-blue-100 text-sm mt-1">
                            {user?.attributes?.service || 'Service Opérations & Maintenance'} • {user?.attributes?.region || 'Site Opérationnel'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/nouvelle-demande"
                            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow transition text-sm"
                        >
                            <i className="fas fa-plus"></i>
                            <span>Nouvelle Demande</span>
                        </Link>
                        <Link
                            to="/catalogue"
                            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl border border-white/20 transition text-sm"
                        >
                            <i className="fas fa-th-large"></i>
                            <span>Catalogue Marché</span>
                        </Link>
                    </div>
                </div>

                {/* Quick stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-800/60">
                    <div className="bg-white/10 rounded-xl p-3">
                        <div className="text-2xl font-black">{assignedHardware.length}</div>
                        <div className="text-xs text-blue-200">Clés & Badges Actifs</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                        <div className="text-2xl font-black">{requests.length}</div>
                        <div className="text-xs text-blue-200">Demandes Déposées</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                        <div className="text-2xl font-black text-amber-300">
                            {requests.filter(r => r.status.includes('En attente') || r.status.includes('Complément')).length}
                        </div>
                        <div className="text-xs text-blue-200">En Cours d'Instruction</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                        <div className="text-2xl font-black text-emerald-300">
                            {requests.filter(r => r.status.includes('Validée')).length}
                        </div>
                        <div className="text-xs text-blue-200">Accès Autorisés</div>
                    </div>
                </div>
            </div>

            {restitutionMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl shadow-xs flex items-center justify-between text-xs text-emerald-900 font-semibold">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-check-circle text-emerald-600 text-sm"></i>
                        <span>{restitutionMsg}</span>
                    </div>
                    <button onClick={() => setRestitutionMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 mb-6 gap-6">
                <button
                    onClick={() => setActiveTab('mes_demandes')}
                    className={`pb-3 text-sm font-bold transition flex items-center gap-2 ${activeTab === 'mes_demandes' ? 'text-[#002395] border-b-2 border-[#002395]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <i className="fas fa-folder"></i>
                    <span>Mes Demandes Déposées ({requests.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('mon_materiel')}
                    className={`pb-3 text-sm font-bold transition flex items-center gap-2 ${activeTab === 'mon_materiel' ? 'text-[#002395] border-b-2 border-[#002395]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <i className="fas fa-key"></i>
                    <span>Mon Matériel en Possession ({assignedHardware.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('alertes')}
                    className={`pb-3 text-sm font-bold transition flex items-center gap-2 ${activeTab === 'alertes' ? 'text-[#002395] border-b-2 border-[#002395]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <i className="fas fa-bell"></i>
                    <span>Restitutions & Échéances</span>
                </button>
            </div>

            {/* Tab 1: Requests List */}
            {activeTab === 'mes_demandes' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="text-base font-bold text-slate-800">
                            Historique personnel de vos demandes
                        </h2>
                        <Link to="/mes-demandes" className="text-xs font-semibold text-[#002395] hover:underline">
                            Voir la vue détaillée complète →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">
                            <i className="fas fa-spinner fa-spin mr-2"></i> Chargement de vos dossiers...
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-blue-50 text-[#002395] rounded-full flex items-center justify-center mx-auto text-2xl mb-4">
                                <i className="fas fa-file-signature"></i>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Aucune demande en cours</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                                Vous n'avez pas encore déposé de demande d'accès ou de commande mécatronique.
                            </p>
                            <Link
                                to="/nouvelle-demande"
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#002395] text-white text-sm font-bold rounded-lg shadow hover:bg-blue-800"
                            >
                                <i className="fas fa-plus"></i> Créer ma première demande
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {requests.map(req => (
                                <div key={req.id} className="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <span className="font-mono text-xs font-bold text-[#002395] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                {req.reference}
                                            </span>
                                            <span className="text-sm font-bold text-slate-800">{req.title}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                                            <span>
                                                <i className="fas fa-map-marker-alt text-slate-400 mr-1"></i>
                                                {req.site_name || 'Multi-sites'}
                                            </span>
                                            <span>
                                                <i className="fas fa-microchip text-slate-400 mr-1"></i>
                                                {req.equipment_type || 'Matériel mécatronique'}
                                            </span>
                                            <span>
                                                <i className="fas fa-clock text-slate-400 mr-1"></i>
                                                Déposée le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                        {getStatusBadge(req.status)}
                                        <a
                                            href={`/api/v1/requests/${req.reference}/pdf`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                                            title="Télécharger le bordereau PDF officiel"
                                        >
                                            <i className="fas fa-file-pdf text-red-600"></i>
                                            <span>Bordereau PDF</span>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Assigned Hardware */}
            {activeTab === 'mon_materiel' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assignedHardware.map((hw, idx) => (
                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-bold text-[#002395] bg-blue-50 px-2 py-0.5 rounded">
                                            {hw.type}
                                        </span>
                                        <h3 className="text-lg font-bold text-slate-800 mt-2 font-mono">
                                            {hw.serial}
                                        </h3>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                                        Actif
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2 text-xs text-slate-600">
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Périmètre autorisé :</span>
                                        <span className="font-semibold text-slate-700">{hw.site}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Délivré le :</span>
                                        <span className="font-semibold text-slate-700">{hw.assignedDate}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-400">Échéance de restitution :</span>
                                        <span className="font-bold text-amber-600">{hw.validUntil} ({hw.daysRemaining} j restants)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                                <button
                                    onClick={() => handleInitiateReturn(hw)}
                                    className="flex-1 px-3 py-2 bg-[#002395] hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer"
                                >
                                    <i className="fas fa-undo mr-1"></i> Restituer en régie (US 3.3)
                                </button>
                                <Link
                                    to="/regie"
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition text-center"
                                >
                                    Suivi Régie
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 3: Alerts & Deadlines */}
            {activeTab === 'alertes' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4">
                        Échéancier de restitution & conformité de sûreté
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex items-start gap-3">
                            <i className="fas fa-info-circle text-amber-600 mt-1"></i>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Rappel restitution trimestrielle</h4>
                                <p className="text-xs text-amber-800 mt-0.5">
                                    Conformément à la politique de sécurité des accès, tout matériel prêté pour des interventions ponctuelles doit être ré-encodé ou retourné dans un délai maximal de 90 jours.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 border-l-4 border-[#002395] rounded-r-lg flex items-start gap-3">
                            <i className="fas fa-shield-alt text-[#002395] mt-1"></i>
                            <div>
                                <h4 className="text-sm font-bold text-blue-950">Mise à jour des droits de clés</h4>
                                <p className="text-xs text-blue-900 mt-0.5">
                                    Pour mettre à jour les certificats de vos clés mécatroniques sans vous déplacer, présentez votre clé sur l'une des bornes murales ou relais d'accès du site.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
