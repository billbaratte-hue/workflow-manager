/**
 * @file src/i18n/LanguageContext.tsx
 * React Context pour l'internationalisation dynamique (i18n) de l'application.
 * Gestion de la langue active (Français / Anglais), persistance locale et interpolation.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
    availableLanguages: { code: Language; label: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const STORAGE_KEY = 'workflow_manager_lang';

const defaultContextValue: LanguageContextType = {
    language: 'fr',
    setLanguage: () => {},
    toggleLanguage: () => {},
    availableLanguages: [
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'en', label: 'English', flag: '🇬🇧' }
    ],
    t: (key: TranslationKey | string, params?: Record<string, string | number>): string => {
        const parts = key.split('.');
        let current: any = translations.fr;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                current = key;
                break;
            }
        }
        let result = typeof current === 'string' ? current : key;
        if (params && typeof result === 'string') {
            for (const [paramKey, paramVal] of Object.entries(params)) {
                result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
            }
        }
        return result;
    }
};

export function LanguageProvider({ 
    children, 
    initialLanguage 
}: { 
    children: ReactNode; 
    initialLanguage?: Language;
}) {
    const [language, setLanguageState] = useState<Language>(() => {
        if (initialLanguage) {
            return initialLanguage;
        }
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored === 'en' || stored === 'fr') {
            return stored;
        }
        return 'fr';
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch {}
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app_language_changed', { detail: language }));
        }
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

    const toggleLanguage = () => {
        setLanguageState(prev => (prev === 'fr' ? 'en' : 'fr'));
    };

    const t = (key: TranslationKey | string, params?: Record<string, string | number>): string => {
        const parts = key.split('.');
        let current: any = translations[language];

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                // Fallback to French if not found in current language
                let fallback: any = translations.fr;
                for (const fbPart of parts) {
                    if (fallback && typeof fallback === 'object' && fbPart in fallback) {
                        fallback = fallback[fbPart];
                    } else {
                        fallback = undefined;
                        break;
                    }
                }
                current = fallback !== undefined ? fallback : key;
                break;
            }
        }

        let result = typeof current === 'string' ? current : key;

        // Parameter interpolation, e.g. {count}
        if (params && typeof result === 'string') {
            for (const [paramKey, paramVal] of Object.entries(params)) {
                result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
            }
        }

        return result;
    };

    const availableLanguages = [
        { code: 'fr' as Language, label: 'Français', flag: '🇫🇷' },
        { code: 'en' as Language, label: 'English', flag: '🇬🇧' }
    ];

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, availableLanguages }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation(): LanguageContextType {
    const context = useContext(LanguageContext);
    return context || defaultContextValue;
}
