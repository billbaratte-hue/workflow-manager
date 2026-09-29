import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    CheckCheck,
    Check,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Info,
    Clock,
    ExternalLink,
    X,
    FileText,
    MessageSquare,
    HelpCircle
} from 'lucide-react';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from '../lib/api';

interface NotificationItem {
    id: string;
    target_user_id?: number;
    target_role?: string;
    type: 'new_request' | 'request_approved' | 'request_rejected' | 'complement_needed' | 'complement_submitted' | 'urgent_alert' | 'deadline_warning' | 'info';
    title: string;
    message: string;
    link?: string;
    reference?: string;
    urgent?: boolean;
    read: boolean;
    created_at: string;
}

interface NotificationCenterProps {
    user: any;
    onNotificationClick?: (link: string, reference?: string) => void;
}

export default function NotificationCenter({ user, onNotificationClick }: NotificationCenterProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent'>('all');
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevNotifCountRef = useRef<number>(0);

    const fetchNotifications = async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);
        try {
            const res = await getNotifications({ user_id: user.id, role: user.role });
            const list: NotificationItem[] = Array.isArray(res?.data?.notifications)
                ? res.data.notifications
                : (Array.isArray(res?.data) ? res.data : []);
            
            // Si une nouvelle notification urgente apparaît pendant la session
            if (prevNotifCountRef.current > 0 && list.length > prevNotifCountRef.current) {
                const newest = list[0];
                if (newest && !newest.read) {
                    setToastMessage(`Nouvelle alerte : ${newest.title}`);
                    setTimeout(() => setToastMessage(null), 6000);
                }
            }
            prevNotifCountRef.current = list.length;

            setNotifications(list);
            setUnreadCount(typeof res?.data?.unread_count === 'number' ? res.data.unread_count : list.filter(n => !n.read).length);
            setUrgentCount(typeof res?.data?.urgent_count === 'number' ? res.data.urgent_count : list.filter(n => !n.read && n.urgent).length);
        } catch (err: any) {
            if (err?.code !== 'ERR_NETWORK' && err?.message !== 'Network Error') {
                console.warn('Erreur chargement notifications:', err);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Polling régulier en temps réel toutes les 12 secondes
    useEffect(() => {
        fetchNotifications(false);
        const interval = setInterval(() => {
            fetchNotifications(true);
        }, 12000);

        return () => clearInterval(interval);
    }, [user]);

    // Fermeture du dropdown au clic à l'extérieur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsRead({ user_id: user.id, role: user.role });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            setUrgentCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteNotification(id);
            const target = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (target && !target.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleItemClick = (notif: NotificationItem) => {
        if (!notif.read) {
            handleMarkAsRead(notif.id);
        }
        setIsOpen(false);
        if (notif.link) {
            if (onNotificationClick) {
                onNotificationClick(notif.link, notif.reference);
            }
            navigate(notif.link);
        }
    };

    const formatTimeAgo = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffSeconds < 60) return "À l'instant";
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `Il y a ${diffHours} h`;
            const diffDays = Math.floor(diffHours / 24);
            return `Il y a ${diffDays} j`;
        } catch (e) {
            return '';
        }
    };

    const getIcon = (type: NotificationItem['type'], urgent?: boolean) => {
        if (urgent || type === 'urgent_alert') {
            return <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />;
        }
        switch (type) {
            case 'request_approved':
                return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
            case 'request_rejected':
                return <XCircle className="w-4 h-4 text-rose-600" />;
            case 'complement_needed':
                return <HelpCircle className="w-4 h-4 text-amber-600" />;
            case 'complement_submitted':
                return <MessageSquare className="w-4 h-4 text-blue-600" />;
            case 'deadline_warning':
                return <Clock className="w-4 h-4 text-orange-600" />;
            case 'new_request':
                return <FileText className="w-4 h-4 text-[#002395]" />;
            default:
                return <Info className="w-4 h-4 text-blue-600" />;
        }
    };

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const filteredNotifications = safeNotifications.filter(n => {
        if (!n) return false;
        if (activeTab === 'unread') return !n.read;
        if (activeTab === 'urgent') return n.urgent;
        return true;
    });

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Pop-up toast éphémère lors de nouvelle alerte reçue */}
            {toastMessage && (
                <div className="absolute top-12 right-0 z-50 w-72 bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-yellow-400 flex items-start gap-2.5 text-xs animate-bounce">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-bold text-yellow-300">Notification en temps réel</div>
                        <div className="text-gray-200 mt-0.5 leading-snug">{toastMessage}</div>
                    </div>
                    <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Bouton cloche */}
            <button
                id="btn-notification-bell"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-lg transition cursor-pointer flex items-center justify-center ${
                    isOpen 
                        ? 'bg-blue-800 text-yellow-300 shadow-inner' 
                        : 'text-blue-100 hover:text-white hover:bg-blue-800/80'
                }`}
                title="Notifications et alertes de sécurité"
                aria-label="Centre de notifications"
            >
                <Bell className="w-5 h-5" />
                
                {unreadCount > 0 && (
                    <span 
                        id="badge-notifications-count"
                        className={`absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-black rounded-full text-white shadow-sm flex items-center justify-center min-w-[18px] min-h-[18px] ${
                            urgentCount > 0 
                                ? 'bg-rose-600 ring-2 ring-rose-300 animate-pulse' 
                                : 'bg-amber-500'
                        }`}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div 
                    id="panel-notifications-dropdown"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-[#002395] px-4 py-3 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-yellow-300" />
                            <span className="font-bold text-sm">Notifications & Alertes</span>
                            {unreadCount > 0 && (
                                <span className="text-[11px] bg-blue-800 text-yellow-300 px-2 py-0.5 rounded-full font-bold">
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                id="btn-mark-all-read"
                                onClick={handleMarkAllAsRead}
                                className="text-[11px] font-semibold text-blue-200 hover:text-yellow-300 flex items-center gap-1 transition cursor-pointer"
                                title="Tout marquer comme lu"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Tout lire
                            </button>
                        )}
                    </div>

                    {/* Onglets Filtres */}
                    <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 py-2 text-center transition cursor-pointer border-b-2 ${
                                activeTab === 'all'
                                    ? 'border-[#002395] text-[#002395] bg-white font-bold'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Toutes ({notifications.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('unread')}
                            className={`flex-1 py-2 text-center transition cursor-pointer border-b-2 ${
                                activeTab === 'unread'
                                    ? 'border-[#002395] text-[#002395] bg-white font-bold'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Non lues ({unreadCount})
                        </button>
                        <button
                            onClick={() => setActiveTab('urgent')}
                            className={`flex-1 py-2 text-center transition cursor-pointer border-b-2 ${
                                activeTab === 'urgent'
                                    ? 'border-rose-600 text-rose-700 bg-white font-bold'
                                    : 'border-transparent text-gray-600 hover:text-rose-700'
                            }`}
                        >
                            Urgentes ({notifications.filter(n => n.urgent).length})
                        </button>
                    </div>

                    {/* Liste des notifications */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
                        {loading && notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-500">
                                Chargement des alertes en temps réel...
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="py-8 text-center px-4">
                                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 font-medium">
                                    {activeTab === 'unread' 
                                        ? 'Aucune notification non lue.' 
                                        : activeTab === 'urgent'
                                        ? 'Aucune alerte urgente pour le moment.'
                                        : 'Aucune notification reçue.'}
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    id={`notif-item-${n.id}`}
                                    onClick={() => handleItemClick(n)}
                                    className={`p-3 text-xs transition cursor-pointer flex gap-3 items-start group hover:bg-blue-50/60 ${
                                        !n.read 
                                            ? n.urgent 
                                                ? 'bg-rose-50/70 border-l-4 border-rose-500' 
                                                : 'bg-blue-50/40 border-l-4 border-[#002395]' 
                                            : 'bg-white opacity-85'
                                    }`}
                                >
                                    {/* Icône de statut */}
                                    <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                                        n.urgent 
                                            ? 'bg-rose-100 text-rose-700' 
                                            : !n.read 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {getIcon(n.type, n.urgent)}
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <div className="font-bold text-gray-900 truncate">
                                                {n.title}
                                            </div>
                                            <span className="text-[10px] text-gray-400 shrink-0">
                                                {formatTimeAgo(n.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-gray-600 text-[11px] leading-relaxed mb-1.5">
                                            {n.message}
                                        </p>

                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-1.5">
                                                {n.reference && (
                                                    <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 font-mono text-[10px] font-bold rounded">
                                                        {n.reference}
                                                    </span>
                                                )}
                                                {n.urgent && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold text-[9px] rounded">
                                                        URGENT
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                                {!n.read && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(n.id, e)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition"
                                                        title="Marquer comme lu"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(n.id, e)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded transition"
                                                    title="Supprimer la notification"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                {n.link && (
                                                    <span className="p-1 text-[#002395] hover:text-blue-900" title="Ouvrir">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-center text-[11px] text-gray-500 font-medium">
                        Rafraîchissement automatique en temps réel (12s)
                    </div>
                </div>
            )}
        </div>
    );
}
