import { useState, ReactNode } from 'react';
import { HelpCircle, X, Info, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';

export interface HelpSection {
    title: string;
    description: string;
    icon?: ReactNode;
    tips?: string[];
    badge?: string;
}

export interface PageHelpModalProps {
    pageTitle: string;
    pageCategory?: string;
    description: string;
    sections: HelpSection[];
    buttonText?: string;
    className?: string;
}

export function PageHelpButton({
    pageTitle,
    pageCategory = "Guide Utilisateur",
    description,
    sections,
    buttonText = "Aide & Guide",
    className = ""
}: PageHelpModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-blue-50/70 border border-gray-300 hover:border-blue-300 rounded-lg shadow-2xs hover:text-[#002395] transition cursor-pointer ${className}`}
                title={`Consulter l'aide et le guide pour : ${pageTitle}`}
            >
                <HelpCircle className="w-4 h-4 text-[#002395]" />
                <span>{buttonText}</span>
            </button>

            {isOpen && (
                <div 
                    className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-linear-to-r from-[#002395] to-blue-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <BookOpen className="w-5 h-5 text-yellow-300" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-white">
                                            {pageTitle}
                                        </h2>
                                        {pageCategory && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-800 text-yellow-300 border border-blue-700">
                                                {pageCategory}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-blue-100 mt-0.5">
                                        Manuel d'utilisation & Bonnes pratiques
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                                aria-label="Fermer l'aide"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-5 min-h-0">
                            {/* Summary description */}
                            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-950 flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-[#002395] shrink-0 mt-0.5" />
                                <div className="leading-relaxed font-medium">
                                    {description}
                                </div>
                            </div>

                            {/* Help Sections */}
                            <div className="space-y-4">
                                {sections.map((section, idx) => (
                                    <div 
                                        key={idx} 
                                        className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition shadow-2xs space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                                                {section.icon || <ChevronRight className="w-4 h-4 text-[#002395]" />}
                                                <span>{section.title}</span>
                                            </div>
                                            {section.badge && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                                    {section.badge}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {section.description}
                                        </p>

                                        {section.tips && section.tips.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100 space-y-1.5">
                                                {section.tips.map((tip, tIdx) => (
                                                    <div key={tIdx} className="flex items-start gap-2 text-[11px] text-gray-700">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                        <span className="leading-tight">{tip}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0 rounded-b-2xl text-xs">
                            <span className="text-gray-500 text-[11px]">
                                Système de Clés Mécatroniques d'Infrastructures
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#002395] hover:bg-blue-900 rounded-lg transition shadow-2xs cursor-pointer"
                            >
                                Compris, fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default PageHelpButton;
