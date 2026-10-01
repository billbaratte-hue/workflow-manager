/**
 * @file src/components/LanguageSelector.tsx
 * Sélecteur de langue bilingue (Français 🇫🇷 / English 🇬🇧).
 * Intégrable dans la barre de navigation supérieure ou sur l'écran d'authentification.
 */

import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';

interface LanguageSelectorProps {
    className?: string;
    variant?: 'compact' | 'badge' | 'buttons';
}

export default function LanguageSelector({ className = '', variant = 'compact' }: LanguageSelectorProps) {
    const { language, setLanguage, availableLanguages } = useTranslation();

    if (variant === 'buttons') {
        return (
            <div className={`inline-flex rounded-lg p-0.5 bg-black/20 border border-white/20 ${className}`}>
                {availableLanguages.map(item => (
                    <button
                        key={item.code}
                        type="button"
                        onClick={() => setLanguage(item.code)}
                        className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer ${
                            language === item.code
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                        title={item.label}
                    >
                        <span>{item.flag}</span>
                        <span>{item.code.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1 bg-black/20 hover:bg-black/30 p-1 rounded-lg border border-white/20 transition ${className}`}>
            <span className="text-xs ml-1" role="img" aria-label="Langue">
                <i className="fas fa-globe text-white/70 text-xs"></i>
            </span>
            <div className="flex text-xs font-bold">
                <button
                    type="button"
                    data-testid="lang-btn-fr"
                    aria-label="Français"
                    title="Français"
                    onClick={() => setLanguage('fr')}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        language === 'fr'
                            ? 'bg-white text-[#002395] font-black shadow-xs'
                            : 'text-white/70 hover:text-white'
                    }`}
                >
                    FR
                </button>
                <span className="text-white/40 self-center">|</span>
                <button
                    type="button"
                    data-testid="lang-btn-en"
                    aria-label="English"
                    title="English"
                    onClick={() => setLanguage('en')}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        language === 'en'
                            ? 'bg-white text-[#002395] font-black shadow-xs'
                            : 'text-white/70 hover:text-white'
                    }`}
                >
                    EN
                </button>
            </div>
        </div>
    );
}
