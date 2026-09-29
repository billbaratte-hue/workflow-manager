/**
 * @file src/pages/Regie.tsx
 * Mechatronic Hardware Control Room & Régie Dispatch Workshop (Epic 3 - US 3.3 & Epic 4 - US 4.2).
 * Physical hardware operations, stock lifecycle, encoders, and hardware return contracts state machine.
 */

import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import {
    getReturnContracts,
    createReturnContract,
    transitionReturnContract,
    updateReturnContractStatus
} from '../lib/api';

interface StockItem {
    id: string;
    serial: string;
    type: string;
    location: string;
    status: 'DISPONIBLE' | 'ASSIGNE' | 'EN_REVISION' | 'PERDU_BLACKLIST';
    stockCategory: 'USER_STOCK' | 'SUPPLIER_STOCK';
    assignedTo?: string;
    assignedDate?: string;
}

export type ReturnContractState =
    | 'INITIALISE'
    | 'RESTITUTION_PLANIFIEE'
    | 'RECEPTION_REGIE'
    | 'INSPECTION_CONFORME'
    | 'DEGRADATION_CONSTATEE'
    | 'PERTE_VOL_DECLAREE'
    | 'SOLDE_ARCHIVE';

export interface ReturnItem {
    hardwareSerial: string;
    hardwareType: 'CLE_MECATRONIQUE' | 'BADGE_RFID' | 'CYLINDRE_TEST' | 'BORNE_PORTATIVE';
    condition?: 'NEUF' | 'BON_ETAT' | 'USURE_NORMALE' | 'DEGRADE' | 'INUTILISABLE' | 'MANQUANT';
    inspectionNotes?: string;
    penaltyFee?: number;
}

export interface ReturnContractRecord {
    id: string;
    requestId?: number;
    beneficiaireId: number;
    beneficiaireName: string;
    state: ReturnContractState;
    items: ReturnItem[];
    depositStatus: 'CONSERVEE' | 'RESTITUEE' | 'ENGAGEE_PENALITE';
    totalPenalty: number;
    receiptDate?: string;
    inspectedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export default function Regie() {
    const [activeTab, setActiveTab] = useState<'STOCK' | 'CONTRATS_RETOUR'>('STOCK');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Hardware Stock Items (US 4.2)
    const [stockItems, setStockItems] = useState<StockItem[]>([
        { id: '1', serial: 'MEC-2026-F9000-001', type: 'Clé Mécatronique F9000', location: 'Atelier Central Paris-Nord', status: 'DISPONIBLE', stockCategory: 'USER_STOCK' },
        { id: '2', serial: 'MEC-2026-F9000-002', type: 'Clé Mécatronique F9000', location: 'Atelier Lyon-Perrache', status: 'ASSIGNE', stockCategory: 'USER_STOCK', assignedTo: 'Jean Dupont (Agent)', assignedDate: '15/02/2026' },
        { id: '3', serial: 'MEC-2026-F9000-003', type: 'Clé Mécatronique F9000', location: 'Atelier Marseille St-Charles', status: 'DISPONIBLE', stockCategory: 'SUPPLIER_STOCK' },
        { id: '4', serial: 'CYL-2026-N2-044', type: 'Cylindre Européen Électronique', location: 'Magasin Central Réseau', status: 'DISPONIBLE', stockCategory: 'SUPPLIER_STOCK' },
        { id: '5', serial: 'BRN-2026-MOBI-12', type: 'Borne d\'Encodage Portative', location: 'Atelier Central Paris-Nord', status: 'DISPONIBLE', stockCategory: 'USER_STOCK' },
        { id: '6', serial: 'MEC-2026-F9000-999', type: 'Clé Mécatronique F9000', location: 'Inconnu (Voies Trappes)', status: 'PERDU_BLACKLIST', stockCategory: 'USER_STOCK' }
    ]);

    // Return Contracts State (US 3.3)
    const [contracts, setContracts] = useState<ReturnContractRecord[]>([]);
    const [loadingContracts, setLoadingContracts] = useState<boolean>(false);
    const [contractFilter, setContractFilter] = useState<string>('ALL');

    // Modals
    const [inspectingContract, setInspectingContract] = useState<ReturnContractRecord | null>(null);
    const [inspectedItemsDraft, setInspectedItemsDraft] = useState<ReturnItem[]>([]);
    const [inspectorName, setInspectorName] = useState<string>('Atelier Régie Paris-Nord');
    const [selectedPvContract, setSelectedPvContract] = useState<ReturnContractRecord | null>(null);
    const [showNewContractModal, setShowNewContractModal] = useState<boolean>(false);

    // New Contract Form State
    const [newBeneficiaireName, setNewBeneficiaireName] = useState('');
    const [newBeneficiaireId, setNewBeneficiaireId] = useState('1042');
    const [newSerial, setNewSerial] = useState('MEC-2026-F9000-002');
    const [newHardwareType, setNewHardwareType] = useState<ReturnItem['hardwareType']>('CLE_MECATRONIQUE');

    const loadContracts = async () => {
        setLoadingContracts(true);
        try {
            const res = await getReturnContracts();
            if (Array.isArray(res.data)) {
                setContracts(res.data);
            }
        } catch (e) {
            console.warn('Erreur chargement contrats retour:', e);
        } finally {
            setLoadingContracts(false);
        }
    };

    useEffect(() => {
        loadContracts();
    }, []);

    const handleBlacklist = (serial: string) => {
        setStockItems(prev => prev.map(item => item.serial === serial ? { ...item, status: 'PERDU_BLACKLIST' } : item));
        setActionSuccess(`La clé ${serial} a été immédiatement révoquée et inscrite sur la liste de révocation.`);
        setTimeout(() => setActionSuccess(null), 4000);
    };

    const handleRestitution = (serial: string) => {
        setStockItems(prev => prev.map(item => item.serial === serial ? { ...item, status: 'DISPONIBLE', assignedTo: undefined, assignedDate: undefined } : item));
        setActionSuccess(`La restitution du matériel ${serial} a été enregistrée avec succès. Clé réinitialisée.`);
        setTimeout(() => setActionSuccess(null), 4000);
    };

    // Open Inspection Modal
    const openInspection = (contract: ReturnContractRecord) => {
        setInspectingContract(contract);
        setInspectedItemsDraft(contract.items.map(it => ({
            ...it,
            condition: it.condition || 'BON_ETAT',
            penaltyFee: it.penaltyFee || 0,
            inspectionNotes: it.inspectionNotes || ''
        })));
    };

    // Calculate penalty on condition change
    const updateItemCondition = (index: number, condition: ReturnItem['condition']) => {
        setInspectedItemsDraft(prev => {
            const copy = [...prev];
            let fee = 0;
            if (condition === 'DEGRADE' || condition === 'INUTILISABLE') {
                fee = 45; // Tariff repair
            } else if (condition === 'MANQUANT') {
                fee = 145; // Tariff new key
            }
            copy[index] = {
                ...copy[index],
                condition,
                penaltyFee: fee
            };
            return copy;
        });
    };

    const updateItemNotes = (index: number, notes: string) => {
        setInspectedItemsDraft(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], inspectionNotes: notes };
            return copy;
        });
    };

    // Submit Inspection
    const handleSaveInspection = async () => {
        if (!inspectingContract) return;
        try {
            const res = await transitionReturnContract(inspectingContract.id, {
                inspectedItems: inspectedItemsDraft,
                inspectorName
            });
            if (res.data) {
                setActionSuccess(`Inspection validée pour le contrat ${inspectingContract.id}. Statut : ${res.data.state}.`);
                setInspectingContract(null);
                await loadContracts();
                setTimeout(() => setActionSuccess(null), 4000);
            }
        } catch (e: any) {
            alert("Erreur lors de l'enregistrement de l'inspection : " + (e.response?.data?.error || e.message));
        }
    };

    // Transition State (Planifier, Réceptionner, Solder)
    const handleTransitionState = async (contractId: string, nextState: ReturnContractState) => {
        try {
            await updateReturnContractStatus(contractId, nextState, 'Régisseur Central');
            setActionSuccess(`Contrat ${contractId} basculé vers le statut : ${nextState}`);
            await loadContracts();
            setTimeout(() => setActionSuccess(null), 4000);
        } catch (e: any) {
            alert("Erreur de mise à jour du contrat : " + (e.response?.data?.error || e.message));
        }
    };

    // Create New Return Contract
    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBeneficiaireName.trim()) return;

        try {
            const res = await createReturnContract({
                beneficiaireId: Number(newBeneficiaireId) || 1042,
                beneficiaireName: newBeneficiaireName,
                items: [
                    {
                        hardwareSerial: newSerial,
                        hardwareType: newHardwareType,
                        condition: 'BON_ETAT',
                        penaltyFee: 0
                    }
                ]
            });
            if (res.data) {
                setActionSuccess(`Nouveau contrat de restitution initialisé (${res.data.id}).`);
                setShowNewContractModal(false);
                setNewBeneficiaireName('');
                await loadContracts();
                setTimeout(() => setActionSuccess(null), 4000);
            }
        } catch (e: any) {
            alert("Erreur de création du contrat : " + (e.response?.data?.error || e.message));
        }
    };

    const filteredStock = stockItems.filter(item => {
        const matchesSearch = item.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (item.assignedTo && item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCat = filterCategory === 'ALL' || item.stockCategory === filterCategory;
        return matchesSearch && matchesCat;
    });

    const filteredContracts = contracts.filter(c => {
        const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.beneficiaireName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.items.some(it => it.hardwareSerial.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesState = contractFilter === 'ALL' || c.state === contractFilter;
        return matchesSearch && matchesState;
    });

    const getContractStateBadge = (state: ReturnContractState) => {
        switch (state) {
            case 'INITIALISE':
                return { label: 'Initialisé', bg: 'bg-blue-100 text-blue-900 border-blue-200' };
            case 'RESTITUTION_PLANIFIEE':
                return { label: 'Restitution Planifiée', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
            case 'RECEPTION_REGIE':
                return { label: 'Reçu en Régie', bg: 'bg-purple-100 text-purple-900 border-purple-200' };
            case 'INSPECTION_CONFORME':
                return { label: 'Inspection Conforme', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
            case 'DEGRADATION_CONSTATEE':
                return { label: 'Dégradation Constatée', bg: 'bg-orange-100 text-orange-900 border-orange-300' };
            case 'PERTE_VOL_DECLAREE':
                return { label: 'Perte / Vol Déclaré', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
            case 'SOLDE_ARCHIVE':
                return { label: 'Soldé & Archivé', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
            default:
                return { label: state, bg: 'bg-gray-100 text-gray-800 border-gray-200' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-[#002395] uppercase tracking-widest">
                        <i className="fas fa-warehouse"></i> Régie & Logistique Matérielle
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        Poste de Contrôle & Régie Mécatronique
                    </h1>
                    <p className="text-sm text-slate-500">
                        Gestion des stocks de clés F9000, bornes mobiles et machine à états des contrats de restitution (US 3.3)
                    </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {activeTab === 'STOCK' ? (
                        <>
                            <button
                                onClick={() => setSelectedAction('scan')}
                                className="inline-flex items-center gap-2 bg-[#002395] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
                            >
                                <i className="fas fa-qrcode"></i>
                                <span>Scanner Code Barre / QR</span>
                            </button>
                            <button
                                onClick={() => setSelectedAction('new_stock')}
                                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
                            >
                                <i className="fas fa-plus"></i>
                                <span>Entrée Stock Atelier</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setShowNewContractModal(true)}
                            className="inline-flex items-center gap-2 bg-[#002395] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
                        >
                            <i className="fas fa-file-contract"></i>
                            <span>Nouveau Contrat de Retour</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification alert */}
            {actionSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 text-sm font-semibold rounded-r-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-check-circle text-emerald-600"></i>
                        <span>{actionSuccess}</span>
                    </div>
                    <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Tab Navigation (US 4.2 Stocks vs US 3.3 Contrats de Restitution) */}
            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
                <button
                    onClick={() => setActiveTab('STOCK')}
                    className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                        activeTab === 'STOCK'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <i className="fas fa-key"></i>
                    <span>Inventaire des Stocks & Clés F9000</span>
                    <span className="text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-semibold">
                        {stockItems.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('CONTRATS_RETOUR')}
                    className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                        activeTab === 'CONTRATS_RETOUR'
                            ? 'border-[#002395] text-[#002395]'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <i className="fas fa-clipboard-check"></i>
                    <span>Contrats de Restitution & Pénalités (US 3.3)</span>
                    <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                        {contracts.length}
                    </span>
                </button>
            </div>

            {/* TAB 1 : INVENTAIRE DES STOCKS */}
            {activeTab === 'STOCK' && (
                <>
                    {/* Inventory KPI Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Stock Utilisateur (User Stock)</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {stockItems.filter(s => s.stockCategory === 'USER_STOCK').length}
                            </div>
                            <span className="text-[10px] text-blue-600 font-bold">Barème 45€ / unité</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Stock Fournisseur (Marché S9)</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {stockItems.filter(s => s.stockCategory === 'SUPPLIER_STOCK').length}
                            </div>
                            <span className="text-[10px] text-purple-600 font-bold">Barème 85€ / unité</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Clés actuellement Prêtées</span>
                            <div className="text-2xl font-black text-amber-600 mt-1">
                                {stockItems.filter(s => s.status === 'ASSIGNE').length}
                            </div>
                            <span className="text-[10px] text-slate-500">En intervention terrain</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Liste Noire & Pertes</span>
                            <div className="text-2xl font-black text-red-600 mt-1">
                                {stockItems.filter(s => s.status === 'PERDU_BLACKLIST').length}
                            </div>
                            <span className="text-[10px] text-red-600 font-bold">Révoqué au niveau national</span>
                        </div>
                    </div>

                    {/* Stock Search & Filter Bar */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-80">
                            <i className="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Rechercher numéro de série, agent..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395] focus:outline-hidden"
                            />
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setFilterCategory('ALL')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterCategory === 'ALL' ? 'bg-[#002395] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Tous
                            </button>
                            <button
                                onClick={() => setFilterCategory('USER_STOCK')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterCategory === 'USER_STOCK' ? 'bg-[#002395] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                User Stock
                            </button>
                            <button
                                onClick={() => setFilterCategory('SUPPLIER_STOCK')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterCategory === 'SUPPLIER_STOCK' ? 'bg-[#002395] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Supplier Stock
                            </button>
                        </div>
                    </div>

                    {/* Stock Data Table */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="py-3 px-4">Numéro de Série</th>
                                        <th className="py-3 px-4">Type de Matériel</th>
                                        <th className="py-3 px-4">Localisation / Atelier</th>
                                        <th className="py-3 px-4">Catégorie</th>
                                        <th className="py-3 px-4">Statut</th>
                                        <th className="py-3 px-4">Détenteur</th>
                                        <th className="py-3 px-4 text-right">Actions Régie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStock.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs">
                                                {item.serial}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                                                {item.type}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-500">
                                                {item.location}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.stockCategory === 'USER_STOCK' ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'}`}>
                                                    {item.stockCategory === 'USER_STOCK' ? 'User Stock' : 'Fournisseur'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                                    item.status === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800' :
                                                    item.status === 'ASSIGNE' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-600">
                                                {item.assignedTo ? (
                                                    <div>
                                                        <div className="font-semibold">{item.assignedTo}</div>
                                                        <div className="text-[10px] text-slate-400">depuis le {item.assignedDate}</div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right space-x-2">
                                                {item.status === 'ASSIGNE' && (
                                                    <button
                                                        onClick={() => handleRestitution(item.serial)}
                                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#002395] rounded text-xs font-bold transition cursor-pointer"
                                                        title="Enregistrer le retour en atelier"
                                                    >
                                                        Restituer
                                                    </button>
                                                )}
                                                {item.status !== 'PERDU_BLACKLIST' && (
                                                    <button
                                                        onClick={() => handleBlacklist(item.serial)}
                                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold transition cursor-pointer"
                                                        title="Blacklister / Déclarer Perdu"
                                                    >
                                                        <i className="fas fa-ban"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* TAB 2 : CONTRATS DE RESTITUTION MATÉRIELLE (US 3.3) */}
            {activeTab === 'CONTRATS_RETOUR' && (
                <div>
                    {/* Return Contracts Lifecycle Flow Banner */}
                    <div className="p-4 rounded-xl border border-blue-200 bg-linear-to-r from-blue-50 via-indigo-50 to-white shadow-2xs mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                            <span className="text-xs font-bold text-[#002395] uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-network-wired"></i> Cycle de Restitution & Gestion des Cautions
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Machine à États US 3.3
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">1. DÉPART</span>
                                <span className="font-bold text-blue-900">INITIALISÉ</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">2. PLANNING</span>
                                <span className="font-bold text-amber-700">RESTITUTION PLANIFIÉE</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">3. ATELIER</span>
                                <span className="font-bold text-purple-700">RÉCEPTION EN RÉGIE</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">4. CONTRÔLE</span>
                                <span className="font-bold text-emerald-700">INSPECTION CONFORME</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">5. ANOMALIE</span>
                                <span className="font-bold text-orange-700">DÉGRADATION (45€)</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">6. SINISTRE</span>
                                <span className="font-bold text-rose-700">PERTE / VOL (145€)</span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] text-slate-400 font-bold">7. ARCHIVE</span>
                                <span className="font-bold text-slate-700">SOLDÉ & ARCHIVÉ</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { key: 'ALL', label: 'Tous les contrats' },
                            { key: 'INITIALISE', label: 'Initialisés' },
                            { key: 'RESTITUTION_PLANIFIEE', label: 'Planifiés' },
                            { key: 'RECEPTION_REGIE', label: 'Reçus en Régie' },
                            { key: 'INSPECTION_CONFORME', label: 'Conformes' },
                            { key: 'DEGRADATION_CONSTATEE', label: 'Dégradations' },
                            { key: 'PERTE_VOL_DECLAREE', label: 'Pertes / Vols' },
                            { key: 'SOLDE_ARCHIVE', label: 'Soldés' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setContractFilter(f.key)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                    contractFilter === f.key
                                        ? 'bg-[#002395] text-white shadow-2xs'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Contracts Table */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                        {loadingContracts ? (
                            <div className="p-12 text-center text-slate-500">
                                <i className="fas fa-spinner fa-spin text-2xl mb-2 text-[#002395]"></i>
                                <p className="text-xs">Chargement des contrats de retour...</p>
                            </div>
                        ) : filteredContracts.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <i className="fas fa-inbox text-3xl mb-2 text-slate-300"></i>
                                <p className="text-sm font-semibold">Aucun contrat de retour ne correspond à ce filtre.</p>
                                <p className="text-xs text-slate-400 mt-1">Créez un nouveau contrat de restitution pour démarrer le cycle.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                        <tr>
                                            <th className="py-3 px-4">Contrat</th>
                                            <th className="py-3 px-4">Bénéficiaire / Agent</th>
                                            <th className="py-3 px-4">Matériels Restitués</th>
                                            <th className="py-3 px-4">Statut</th>
                                            <th className="py-3 px-4">Caution & Frais</th>
                                            <th className="py-3 px-4">Inspecteur / Date</th>
                                            <th className="py-3 px-4 text-right">Actions Restitution</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredContracts.map(c => {
                                            const badge = getContractStateBadge(c.state);
                                            return (
                                                <tr key={c.id} className="hover:bg-slate-50 transition">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#002395]">
                                                        {c.id}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                                                        {c.beneficiaireName}
                                                        <div className="text-[10px] text-slate-400 font-normal">ID: {c.beneficiaireId}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-600">
                                                        {c.items.map((it, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5 font-mono text-[11px]">
                                                                <span className="font-semibold text-slate-800">{it.hardwareSerial}</span>
                                                                {it.condition && (
                                                                    <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-600">
                                                                        {it.condition}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${badge.bg}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs">
                                                        <div className="font-semibold">
                                                            {c.totalPenalty > 0 ? (
                                                                <span className="text-red-700 font-bold">+{c.totalPenalty} € pénalité</span>
                                                            ) : (
                                                                <span className="text-emerald-700">0 € (Conforme)</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">
                                                            Caution : {c.depositStatus === 'RESTITUEE' ? 'Restituée' : c.depositStatus === 'ENGAGEE_PENALITE' ? 'Retenue' : 'Conservée'}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500">
                                                        {c.inspectedBy ? (
                                                            <div>
                                                                <div className="font-semibold text-slate-700">{c.inspectedBy}</div>
                                                                <div className="text-[10px] text-slate-400">
                                                                    {c.receiptDate ? new Date(c.receiptDate).toLocaleDateString('fr-FR') : '-'}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">En attente</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                                        {/* Transition buttons based on state */}
                                                        {c.state === 'INITIALISE' && (
                                                            <button
                                                                onClick={() => handleTransitionState(c.id, 'RESTITUTION_PLANIFIEE')}
                                                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-xs font-semibold border border-amber-200 transition cursor-pointer"
                                                                title="Fixer un rendez-vous de restitution"
                                                            >
                                                                Planifier
                                                            </button>
                                                        )}
                                                        {(c.state === 'INITIALISE' || c.state === 'RESTITUTION_PLANIFIEE') && (
                                                            <button
                                                                onClick={() => handleTransitionState(c.id, 'RECEPTION_REGIE')}
                                                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded text-xs font-semibold border border-purple-200 transition cursor-pointer"
                                                                title="Matériel déposé au guichet"
                                                            >
                                                                Réceptionner
                                                            </button>
                                                        )}
                                                        {(c.state === 'RECEPTION_REGIE' || c.state === 'INITIALISE' || c.state === 'RESTITUTION_PLANIFIEE') && (
                                                            <button
                                                                onClick={() => openInspection(c)}
                                                                className="px-2.5 py-1 bg-[#002395] hover:bg-blue-800 text-white rounded text-xs font-bold transition shadow-2xs cursor-pointer"
                                                                title="Vérifier l'intégrité physique du matériel"
                                                            >
                                                                Inspecter
                                                            </button>
                                                        )}
                                                        {['INSPECTION_CONFORME', 'DEGRADATION_CONSTATEE', 'PERTE_VOL_DECLAREE'].includes(c.state) && (
                                                            <button
                                                                onClick={() => handleTransitionState(c.id, 'SOLDE_ARCHIVE')}
                                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold border border-emerald-300 transition cursor-pointer"
                                                                title="Clôturer le contrat et archiver"
                                                            >
                                                                Solder
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedPvContract(c)}
                                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
                                                            title="Consulter le PV de restitution"
                                                        >
                                                            <i className="fas fa-file-invoice"></i> PV
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 1 : INSPECTION ET SOLDAGE MATÉRIEL (US 3.3) */}
            <Modal
                isOpen={!!inspectingContract}
                onClose={() => setInspectingContract(null)}
                title="Inspection Physique & Clôture de Restitution"
                maxWidth="2xl"
            >
                {inspectingContract && (
                    <div className="space-y-4 text-xs text-slate-700">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div>
                                <span className="font-bold text-[#002395] block text-sm">{inspectingContract.id}</span>
                                <span className="text-slate-600">Bénéficiaire : <strong>{inspectingContract.beneficiaireName}</strong></span>
                            </div>
                            <span className="text-[11px] font-mono bg-white px-2 py-1 rounded border border-blue-200 text-blue-900">
                                Contrat Restitution
                            </span>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-1">
                                Nom du Régisseur / Inspecteur d'Atelier :
                            </label>
                            <input
                                type="text"
                                value={inspectorName}
                                onChange={(e) => setInspectorName(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395]"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-2">
                                Contrôle des éléments matériels restitués :
                            </label>
                            <div className="space-y-3">
                                {inspectedItemsDraft.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-slate-900 text-xs">
                                                {item.hardwareSerial} ({item.hardwareType})
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                item.penaltyFee && item.penaltyFee > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                Pénalité : {item.penaltyFee || 0} €
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {[
                                                { val: 'BON_ETAT', label: 'Bon État (0€)', desc: 'Restitution conforme' },
                                                { val: 'DEGRADE', label: 'Dégradé (+45€)', desc: 'Broche tordue, usure' },
                                                { val: 'MANQUANT', label: 'Manquant / Perdu (+145€)', desc: 'Facturation clé perdue' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    type="button"
                                                    onClick={() => updateItemCondition(idx, opt.val as any)}
                                                    className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                                                        item.condition === opt.val
                                                            ? 'border-[#002395] bg-blue-50 text-[#002395] font-bold shadow-2xs'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <div className="text-xs">{opt.label}</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                                                </button>
                                            ))}
                                        </div>

                                        <input
                                            type="text"
                                            value={item.inspectionNotes || ''}
                                            onChange={(e) => updateItemNotes(idx, e.target.value)}
                                            placeholder="Remarques atelier (ex: traces d'impact, nettoyage effectué)..."
                                            className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary Box */}
                        <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-between">
                            <div>
                                <span className="font-bold text-slate-900 block">Total des Pénalités Applicables :</span>
                                <span className="text-[11px] text-slate-500">
                                    {inspectedItemsDraft.reduce((acc, curr) => acc + (curr.penaltyFee || 0), 0) > 0
                                        ? 'Caution engagée pour compensation des frais de réparation ou remplacement'
                                        : 'Restitution intégrale de la caution bancaire ou retenue sur salaire'}
                                </span>
                            </div>
                            <div className="text-xl font-black text-slate-900">
                                {inspectedItemsDraft.reduce((acc, curr) => acc + (curr.penaltyFee || 0), 0)} €
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setInspectingContract(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveInspection}
                                className="px-4 py-1.5 rounded-lg bg-[#002395] hover:bg-blue-800 text-white font-bold transition shadow-xs cursor-pointer"
                            >
                                Valider le PV d'Inspection
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL 2 : NOUVEAU CONTRAT DE RESTITUTION */}
            <Modal
                isOpen={showNewContractModal}
                onClose={() => setShowNewContractModal(false)}
                title="Création d'un Contrat de Restitution Matérielle (US 3.3)"
                maxWidth="md"
            >
                <form onSubmit={handleCreateContract} className="space-y-4 text-xs text-slate-700">
                    <p className="text-slate-500 leading-relaxed">
                        Initialise la procédure formelle de fin de prêt pour un jeu de clés mécatroniques, badges ou cylindres de test.
                    </p>

                    <div>
                        <label className="block font-bold text-slate-800 mb-1">Nom et Prénom de l'Agent Détenteur *</label>
                        <input
                            type="text"
                            value={newBeneficiaireName}
                            onChange={(e) => setNewBeneficiaireName(e.target.value)}
                            placeholder="Ex: Jean Dupont (Maintenance Voie)"
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#002395]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-slate-800 mb-1">ID Utilisateur</label>
                            <input
                                type="number"
                                value={newBeneficiaireId}
                                onChange={(e) => setNewBeneficiaireId(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-800 mb-1">Type d'Équipement</label>
                            <select
                                value={newHardwareType}
                                onChange={(e) => setNewHardwareType(e.target.value as any)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                            >
                                <option value="CLE_MECATRONIQUE">Clé Mécatronique F9000</option>
                                <option value="BADGE_RFID">Badge RFID Emprise</option>
                                <option value="BORNE_PORTATIVE">Borne d'Encodage Mobile</option>
                                <option value="CYLINDRE_TEST">Cylindre de Test</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-800 mb-1">Numéro de Série du Matériel *</label>
                        <input
                            type="text"
                            value={newSerial}
                            onChange={(e) => setNewSerial(e.target.value)}
                            placeholder="MEC-2026-F9000-002"
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setShowNewContractModal(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-[#002395] hover:bg-blue-800 text-white font-bold transition shadow-xs cursor-pointer"
                        >
                            Initialiser le Contrat
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL 3 : PROCÈS-VERBAL (PV) DE RESTITUTION MATÉRIELLE */}
            <Modal
                isOpen={!!selectedPvContract}
                onClose={() => setSelectedPvContract(null)}
                title="Procès-Verbal de Restitution & Clôture Matérielle"
                maxWidth="lg"
            >
                {selectedPvContract && (
                    <div className="space-y-4 text-xs text-slate-800">
                        {/* Header Document */}
                        <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                                <div>
                                    <div className="font-black text-sm text-[#002395]">DIRECTION SÛRETÉ & ACCÈS MÉCATRONIQUES</div>
                                    <div className="text-[10px] text-slate-500">Contrat Cadre • Référentiel Mécatronique</div>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {selectedPvContract.id}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                                <div><strong>Agent Déposant :</strong> {selectedPvContract.beneficiaireName}</div>
                                <div><strong>Statut Contrat :</strong> {selectedPvContract.state}</div>
                                <div><strong>Inspecté par :</strong> {selectedPvContract.inspectedBy || 'En attente de contrôle'}</div>
                                <div><strong>Date Réception :</strong> {selectedPvContract.receiptDate ? new Date(selectedPvContract.receiptDate).toLocaleString('fr-FR') : 'Non réceptionné'}</div>
                            </div>

                            {/* Table of items in PV */}
                            <table className="w-full text-left border border-slate-200 rounded text-xs bg-white">
                                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                                    <tr>
                                        <th className="p-2">Numéro de Série</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">État Constaté</th>
                                        <th className="p-2 text-right">Pénalité Retenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedPvContract.items.map((it, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 font-mono font-semibold">{it.hardwareSerial}</td>
                                            <td className="p-2">{it.hardwareType}</td>
                                            <td className="p-2 font-semibold">
                                                {it.condition || 'NON_INSPECTE'}
                                                {it.inspectionNotes && (
                                                    <div className="text-[10px] text-slate-400 font-normal">{it.inspectionNotes}</div>
                                                )}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                {it.penaltyFee ? `${it.penaltyFee} €` : '0 €'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                                <div>
                                    <strong>Statut de la Caution : </strong>
                                    <span className="font-semibold text-slate-700">
                                        {selectedPvContract.depositStatus === 'RESTITUEE' ? 'Restituée intégralement' : 'Retenue en dédommagement'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-500 mr-2">Total Soldé :</span>
                                    <span className="text-base font-black text-slate-900">{selectedPvContract.totalPenalty} €</span>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-white border border-slate-200 rounded-lg text-[11px]">
                            <div className="border-r border-slate-200 pr-3">
                                <div className="font-bold text-slate-700 mb-1">Visa de l'Agent Détenteur</div>
                                <div className="text-slate-500 italic mb-4">« Certifie avoir restitué les éléments ci-dessus »</div>
                                <div className="font-mono text-[10px] text-slate-400">Signature horodatée électroniquement</div>
                            </div>
                            <div>
                                <div className="font-bold text-slate-700 mb-1">Visa du Régisseur / Responsable Logistique</div>
                                <div className="text-slate-500 italic mb-4">« Conformité physique et matérielle vérifiée »</div>
                                <div className="font-mono text-[10px] text-emerald-700 font-semibold">Validé par l'Atelier Mécatronique</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <i className="fas fa-print"></i> Imprimer / Exporter PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedPvContract(null)}
                                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded font-semibold transition cursor-pointer"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
