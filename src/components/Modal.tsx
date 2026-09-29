import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    showCloseButton?: boolean;
    closeOnBackdropClick?: boolean;
    closeOnEsc?: boolean;
    id?: string;
    className?: string;
    bodyClassName?: string;
    headerClassName?: string;
    footerClassName?: string;
}

const MAX_WIDTH_MAP: Record<NonNullable<ModalProps['maxWidth']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
};

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    maxWidth = 'lg',
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEsc = true,
    id,
    className = '',
    bodyClassName = '',
    headerClassName = '',
    footerClassName = ''
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    if (!isOpen) return null;

    const widthClass = MAX_WIDTH_MAP[maxWidth] || 'max-w-lg';

    return (
        <div
            id={id ? `${id}-backdrop` : undefined}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={(e) => {
                if (closeOnBackdropClick && e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                ref={modalRef}
                id={id}
                className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-full ${widthClass} max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150 ${className}`}
            >
                {/* Header (fixed, shrink-0) */}
                {(title || showCloseButton) && (
                    <div
                        className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80 ${headerClassName}`}
                    >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                            {icon && <div className="shrink-0">{icon}</div>}
                            <div className="min-w-0">
                                {typeof title === 'string' ? (
                                    <h3 className="text-base font-bold text-gray-900 truncate leading-snug">
                                        {title}
                                    </h3>
                                ) : (
                                    title
                                )}
                                {subtitle && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition shrink-0 ml-auto"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body (scrollable flexible, overflow-y-auto) */}
                <div
                    className={`p-6 overflow-y-auto flex-1 min-h-0 space-y-4 ${bodyClassName}`}
                >
                    {children}
                </div>

                {/* Footer (fixed, shrink-0) */}
                {footer && (
                    <div
                        className={`px-6 py-3.5 border-t border-gray-200 bg-gray-50/90 shrink-0 rounded-b-2xl ${footerClassName}`}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
