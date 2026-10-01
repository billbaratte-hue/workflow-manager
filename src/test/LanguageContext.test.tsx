import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useTranslation, STORAGE_KEY } from '../i18n/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

function TestConsumer() {
    const { language, setLanguage, t } = useTranslation();

    return (
        <div>
            <div data-testid="current-lang">{language}</div>
            <div data-testid="portal-name">{t('nav.portalName')}</div>
            <div data-testid="login-title">{t('auth.title')}</div>
            <div data-testid="interpolated">{t('catalogue.stagesCount', { count: 3 })}</div>
            <div data-testid="unknown-key">{t('non.existent.key')}</div>
            <button onClick={() => setLanguage('en')} data-testid="btn-en">Set English</button>
            <button onClick={() => setLanguage('fr')} data-testid="btn-fr">Set French</button>
        </div>
    );
}

describe('Internationalisation (i18n) & LanguageContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.lang = 'fr';
    });

    it('fournit le français par défaut et traduit les clés courantes', () => {
        render(
            <LanguageProvider>
                <TestConsumer />
            </LanguageProvider>
        );

        expect(screen.getByTestId('current-lang').textContent).toBe('fr');
        expect(screen.getByTestId('portal-name').textContent).toBe('Portail Opérationnel');
        expect(screen.getByTestId('login-title').textContent).toBe('Portail Mécatronique');
    });

    it('permet de basculer en anglais dynamiquement', () => {
        render(
            <LanguageProvider>
                <TestConsumer />
            </LanguageProvider>
        );

        fireEvent.click(screen.getByTestId('btn-en'));

        expect(screen.getByTestId('current-lang').textContent).toBe('en');
        expect(screen.getByTestId('portal-name').textContent).toBe('Operational Portal');
        expect(screen.getByTestId('login-title').textContent).toBe('Mechatronic Portal');
        expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
        expect(document.documentElement.lang).toBe('en');
    });

    it('interpole correctement les paramètres {param}', () => {
        render(
            <LanguageProvider>
                <TestConsumer />
            </LanguageProvider>
        );

        expect(screen.getByTestId('interpolated').textContent).toBe('3 étapes de validation');

        fireEvent.click(screen.getByTestId('btn-en'));
        expect(screen.getByTestId('interpolated').textContent).toBe('3 validation stages');
    });

    it('renvoie la clé elle-même si la traduction est introuvable', () => {
        render(
            <LanguageProvider>
                <TestConsumer />
            </LanguageProvider>
        );

        expect(screen.getByTestId('unknown-key').textContent).toBe('non.existent.key');
    });

    it('intègre le composant LanguageSelector avec interaction complète', () => {
        render(
            <LanguageProvider>
                <LanguageSelector />
                <TestConsumer />
            </LanguageProvider>
        );

        const enButton = screen.getByTestId('lang-btn-en');
        const frButton = screen.getByTestId('lang-btn-fr');

        expect(enButton).not.toBeNull();
        expect(frButton).not.toBeNull();

        // Bascule vers l'anglais
        fireEvent.click(enButton);
        expect(screen.getByTestId('portal-name').textContent).toBe('Operational Portal');

        // Bascule vers le français
        fireEvent.click(frButton);
        expect(screen.getByTestId('portal-name').textContent).toBe('Portail Opérationnel');
    });
});
