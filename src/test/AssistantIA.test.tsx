/**
 * @file src/test/AssistantIA.test.tsx
 * Tests for AssistantIA Generative AI Interface.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AssistantIA from '../pages/AssistantIA';

vi.mock('../lib/api', () => ({
    getAiStatus: vi.fn(() => Promise.resolve({
        data: {
            available: true,
            provider: 'gemini',
            model: 'gemini-3.8-flash',
            feature_enabled: true,
            apiKeyConfigured: true
        }
    })),
    chatAI: vi.fn((data: any) => Promise.resolve({
        data: {
            success: true,
            reply: `Analyse de sécurité pour la demande : ${data.message}. Norme EN 15864 validée.`,
            suggestions: ["Quelle est la procédure E123 ?", "Consulter les habilitations H0B0"],
            provider: 'gemini',
            model: 'gemini-3.8-flash'
        }
    })),
    analyzeRequestAI: vi.fn(() => Promise.resolve({
        data: {
            success: true,
            analysis: {
                risk_level: 'Modéré',
                urgency: 'Intervention planifiée de nuit',
                compliance_check: 'Conforme aux normes EN 15864 et directive NIS 2',
                key_points: ['Habilitation requise', 'Tracé de clé'],
                recommendation: 'Avis favorable avec réserves'
            }
        }
    })),
    assistDescriptionAI: vi.fn(() => Promise.resolve({
        data: {
            success: true,
            suggested_text: 'Intervention de maintenance préventive sur les armoires de Trappes conforme EN 15864.'
        }
    })),
    suggestWorkflowAI: vi.fn(() => Promise.resolve({
        data: {
            success: true,
            workflow_name: 'Workflow Urgence Nuit Test',
            description: 'Circuit d\'approbation accéléré pour intervention nocturne',
            stages: [
                { name: 'Validation Rapide', assignedRole: 'Validateur de Site', slaHours: 4, mandatory: true }
            ],
            rules: ['Habilitation électrique obligatoire']
        }
    }))
}));

describe('AssistantIA Page Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the Generative AI assistant header and active model badge', async () => {
        render(
            <MemoryRouter>
                <AssistantIA />
            </MemoryRouter>
        );

        expect(screen.getByText(/Assistant IA & Copilote Mécatronique/i)).not.toBeNull();
        expect(screen.getByText(/Copilote Conversationnel/i)).not.toBeNull();
        expect(screen.getByText(/Analyseur de Risque & Conformité/i)).not.toBeNull();
        expect(screen.getByText(/Rédacteur de Justification/i)).not.toBeNull();
        expect(screen.getByText(/Générateur de Workflows/i)).not.toBeNull();

        await waitFor(() => {
            expect(screen.getAllByText('gemini-3.8-flash').length).toBeGreaterThan(0);
        });
    });

    it('allows sending a chat message and receiving response with suggestions', async () => {
        render(
            <MemoryRouter>
                <AssistantIA />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText(/Posez une question sur les normes mécatroniques/i);
        const sendBtn = screen.getByText('Envoyer');

        fireEvent.change(input, { target: { value: 'Explication norme EN 15864' } });
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(screen.getByText(/Analyse de sécurité pour la demande : Explication norme EN 15864/i)).not.toBeNull();
            expect(screen.getByText('Quelle est la procédure E123 ?')).not.toBeNull();
        });
    });

    it('switches to the request analyzer tab and runs risk evaluation', async () => {
        render(
            <MemoryRouter>
                <AssistantIA />
            </MemoryRouter>
        );

        const analyzerTabBtn = screen.getByText(/Analyseur de Risque & Conformité/i);
        fireEvent.click(analyzerTabBtn);

        expect(screen.getByText(/Paramètres de la Demande à Analyser/i)).not.toBeNull();
        const evalBtn = screen.getByText(/Lancer l'Évaluation IA de Sécurité/i);
        fireEvent.click(evalBtn);

        await waitFor(() => {
            expect(screen.getByText(/Rapport d'Évaluation de Sécurité/i)).not.toBeNull();
            expect(screen.getByText(/Risque : Modéré/i)).not.toBeNull();
            expect(screen.getByText(/Conforme aux normes EN 15864 et directive NIS 2/i)).not.toBeNull();
        });
    });

    it('switches to the justification drafter and generates text', async () => {
        render(
            <MemoryRouter>
                <AssistantIA />
            </MemoryRouter>
        );

        const drafterTabBtn = screen.getByText(/Rédacteur de Justification/i);
        fireEvent.click(drafterTabBtn);

        expect(screen.getByText(/Paramètres de Rédaction Assistée/i)).not.toBeNull();
        const draftBtn = screen.getByText(/Générer la Justification Formelle/i);
        fireEvent.click(draftBtn);

        await waitFor(() => {
            expect(screen.getByText(/Texte Justificatif Recommandé/i)).not.toBeNull();
            expect(screen.getByText(/Intervention de maintenance préventive sur les armoires de Trappes conforme EN 15864/i)).not.toBeNull();
            expect(screen.getByText('Créer la Demande')).not.toBeNull();
        });
    });
});
