import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, X, ShieldAlert, ChevronRight } from 'lucide-react';
import { getOperationalAlerts } from '../lib/api';

interface OperationalAlert {
    id: string;
    type: 'urgent' | 'deadline' | 'action_required';
    title: string;
    message: string;
    reference: string;
    link: string;
    urgencyLevel: 'critique' | 'haute' | 'modérée';
    site_name?: string;
}

interface AlertBannerProps {
    user: any;
}

export default function AlertBanner({ user }: AlertBannerProps) {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const loadAlerts = async () => {
        if (!user) return;
        try {
            const res = await getOperationalAlerts({ user_id: user.id, role: user.role });
            const list = Array.isArray(res?.data)
                ? res.data
                : (Array.isArray((res?.data as any)?.alerts) ? (res?.data as any).alerts : []);
            setAlerts(list);
        } catch (err: any) {
            // Log informative warning instead of unhandled console error for transient network retries
            if (err?.code !== 'ERR_NETWORK' && err?.message !== 'Network Error') {
                console.warn('Erreur chargement alertes opérationnelles:', err);
            }
        }
    };

    useEffect(() => {
        loadAlerts();
        const interval = setInterval(loadAlerts, 15000);
        return () => clearInterval(interval);
    }, [user]);

    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const activeAlerts = safeAlerts.filter(a => a && a.id && !dismissedIds.includes(a.id));

    if (activeAlerts.length === 0) return null;

    const currentAlert = activeAlerts[currentIndex] || activeAlerts[0];

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDismissedIds(prev => [...prev, id]);
        if (currentIndex >= activeAlerts.length - 1) {
            setCurrentIndex(0);
        }
    };

    const handleActionClick = (link: string) => {
        navigate(link);
    };

    const isCritical = currentAlert.urgencyLevel === 'critique';

    return (
        <div 
            id={`alert-banner-${currentAlert.id}`}
            className={`border-b transition-all duration-300 ${
                isCritical 
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md' 
                    : 'bg-amber-500 text-gray-950 border-amber-600 shadow-sm'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    {/* Badge & Description */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-full shrink-0 ${
                            isCritical ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-950'
                        }`}>
                            {isCritical ? (
                                <ShieldAlert className="w-4 h-4 animate-pulse" />
                            ) : (
                                <AlertTriangle className="w-4 h-4" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    isCritical ? 'bg-white text-rose-800' : 'bg-black text-amber-300'
                                }`}>
                                    {isCritical ? 'Urgence Prioritaire' : 'Alerte Échéance'}
                                </span>
                                <span className="font-bold truncate">
                                    {currentAlert.title}
                                </span>
                                {currentAlert.reference && (
                                    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold rounded ${
                                        isCritical ? 'bg-rose-700/80 text-white' : 'bg-amber-600/30 text-gray-900'
                                    }`}>
                                        {currentAlert.reference}
                                    </span>
                                )}
                            </div>
                            <p className={`mt-0.5 truncate text-[11px] ${
                                isCritical ? 'text-rose-100' : 'text-gray-900 font-medium'
                            }`}>
                                {currentAlert.message}
                            </p>
                        </div>
                    </div>

                    {/* Actions & Pagination */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {activeAlerts.length > 1 && (
                            <button
                                onClick={() => setCurrentIndex((currentIndex + 1) % activeAlerts.length)}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                                    isCritical 
                                        ? 'bg-rose-700 hover:bg-rose-800 text-white' 
                                        : 'bg-amber-600/40 hover:bg-amber-600/60 text-gray-950'
                                }`}
                                title="Alerte suivante"
                            >
                                {currentIndex + 1} / {activeAlerts.length} <ChevronRight className="w-3 h-3 inline ml-0.5" />
                            </button>
                        )}

                        <button
                            id="btn-alert-banner-action"
                            onClick={() => handleActionClick(currentAlert.link)}
                            className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                                isCritical 
                                    ? 'bg-white text-rose-800 hover:bg-rose-100' 
                                    : 'bg-gray-950 text-white hover:bg-gray-800'
                            }`}
                        >
                            <span>Traiter le dossier</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={(e) => handleDismiss(currentAlert.id, e)}
                            className={`p-1 rounded transition cursor-pointer ${
                                isCritical ? 'hover:bg-rose-700 text-rose-200 hover:text-white' : 'hover:bg-amber-600 text-gray-800 hover:text-gray-950'
                            }`}
                            title="Masquer l'alerte"
                            aria-label="Fermer la bannière d'alerte"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
