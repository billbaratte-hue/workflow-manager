/**
 * @file src/pages/AssistantIA.tsx
 * Generative AI Assistant & Mechatronic Copilot Interface.
 * Interactive chat, request risk analyzer, justification drafter, and workflow generator.
 * Powered by Gemini 3.8 Flash with Sovereign Heuristic Engine fallback.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAI, analyzeRequestAI, assistDescriptionAI, suggestWorkflowAI, getAiStatus } from '../lib/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    suggestions?: string[];
    provider?: 'gemini' | 'sovereign_heuristic';
    model?: string;
}

const PRESET_PROMPTS = [
    {
        title: "Norme EN 15864",
        desc: "Spécifications des clés et serrures mécatroniques programmables",
        prompt: "Quelles sont les obligations et contraintes techniques imposées par la norme européenne EN 15864 pour les clés mécatroniques d'infrastructure ?",
        icon: "fas fa-key",
        color: "from-blue-600 to-indigo-700"
    },
    {
        title: "Perte / Vol E123",
        desc: "Procédure d'urgence pour clé compromise et liste noire",
        prompt: "Quelle est la procédure exacte de sécurité ferroviaire en cas de perte ou vol d'une clé mécatronique (procédure E123) ?",
        icon: "fas fa-exclamation-triangle",
        color: "from-amber-500 to-rose-600"
    },
    {
        title: "Habilitations H0B0 / B1V",
        desc: "Accréditations électriques pour interventions sous-stations",
        prompt: "Quelles habilitations électriques sont requises pour une intervention en sous-station ferroviaire ou à proximité de la caténaire 25kV ?",
        icon: "fas fa-bolt",
        color: "from-amber-600 to-yellow-600"
    },
    {
        title: "Cybersécurité NIS 2",
        desc: "Exigences de traçabilité et non-répudiation des accès",
        prompt: "Comment le portail mécatronique garantit-il la conformité à la directive européenne NIS 2 et l'intégrité des journaux d'accès Syslog ?",
        icon: "fas fa-shield-alt",
        color: "from-emerald-600 to-teal-700"
    }
];

export default function AssistantIA() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'chat' | 'analyzer' | 'drafter' | 'workflows'>('chat');
    const [aiStatus, setAiStatus] = useState<any>({
        available: true,
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        apiKeyConfigured: true
    });

    // Chat state
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Bonjour ! Je suis le **Copilote IA Mécatronique**, propulsé par **Gemini 3.8 Flash** avec moteur souverain de secours.\n\nJe suis à votre disposition pour vous accompagner dans :\n- L'évaluation des risques et la conformité aux normes ferroviaires **EN 15864** et **EN 16864**\n- La rédaction et l'enrichissement technique de vos justifications d'accès\n- Les protocoles de sécurité électrique (**H0B0 / B1V**) et les procédures d'incident (**E123**)\n- L'analyse des rôles et de la séparation des fonctions (**SoD** / **NIS 2**).\n\nPosez-moi une question ou utilisez l'un des modèles rapides ci-dessous !`,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            suggestions: [
                "Quelles sont les exigences de la norme EN 15864 ?",
                "Comment déclarer un vol de clé mécatronique (E123) ?",
                "Quelles habilitations électriques sont nécessaires pour les sous-stations ?"
            ],
            provider: 'gemini',
            model: 'gemini-3.8-flash'
        }
    ]);
    const [inputPrompt, setInputPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Analyzer state
    const [analyzerData, setAnalyzerData] = useState({
        title: 'Maintenance signaux et aiguillages Trappes',
        description: 'Remplacement préventif des moteurs d\'aiguillage en coupure de nuit sur la voie 2. Accès aux armoires mécatroniques.',
        site_name: 'Poste d\'Aiguillage Trappes',
        equipment_type: 'Clé Mécatronique EN 15864'
    });
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Drafter state
    const [draftInput, setDraftInput] = useState('Contrôle annuel des serrures sur les armoires de signalisation');
    const [draftSite, setDraftSite] = useState('Gare Montparnasse');
    const [draftEquipment, setDraftEquipment] = useState('Clé Mécatronique EN 15864');
    const [draftResult, setDraftResult] = useState<string | null>(null);
    const [isDrafting, setIsDrafting] = useState(false);

    // Workflow Generator state
    const [workflowPrompt, setWorkflowPrompt] = useState('Intervention urgente en nocturne avec habilitation caténaire requise et délai de réponse maximum de 4 heures.');
    const [workflowResult, setWorkflowResult] = useState<any>(null);
    const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);

    useEffect(() => {
        getAiStatus()
            .then(res => {
                if (res.data) setAiStatus(res.data);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const handleSendMessage = async (textToSend?: string) => {
        const query = (textToSend || inputPrompt).trim();
        if (!query || isLoading) return;

        const userMsg: Message = {
            id: String(Date.now()),
            role: 'user',
            content: query,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputPrompt('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const res = await chatAI({ message: query, history });

            if (res.data?.success) {
                const botMsg: Message = {
                    id: String(Date.now() + 1),
                    role: 'assistant',
                    content: res.data.reply,
                    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    suggestions: res.data.suggestions || [],
                    provider: res.data.provider,
                    model: res.data.model
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                throw new Error("Réponse inattendue de l'assistant.");
            }
        } catch (err: any) {
            const errorMsg: Message = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: "Une erreur est survenue lors de la communication avec l'assistant IA. Le moteur de secours souverain reste opérationnel pour vos demandes standards.",
                timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const res = await analyzeRequestAI(analyzerData);
            if (res.data?.success && res.data.analysis) {
                setAnalysisResult(res.data.analysis);
            }
        } catch (err) {
            console.error('Erreur analyse IA:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRunDraft = async () => {
        setIsDrafting(true);
        try {
            const res = await assistDescriptionAI({
                draftText: draftInput,
                equipment_type: draftEquipment,
                site_name: draftSite
            });
            if (res.data?.success && res.data.suggested_text) {
                setDraftResult(res.data.suggested_text);
            }
        } catch (err) {
            console.error('Erreur rédaction IA:', err);
        } finally {
            setIsDrafting(false);
        }
    };

    const handleRunWorkflow = async () => {
        setIsGeneratingWorkflow(true);
        try {
            const res = await suggestWorkflowAI({ description: workflowPrompt });
            if (res.data?.success) {
                setWorkflowResult(res.data);
            }
        } catch (err) {
            console.error('Erreur workflow IA:', err);
        } finally {
            setIsGeneratingWorkflow(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(id);
        setTimeout(() => setCopySuccess(null), 2500);
    };

    const handleInsertIntoRequest = (text: string) => {
        sessionStorage.setItem('prefilled_description', text);
        navigate('/nouvelle-demande');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#002395] via-blue-900 to-indigo-950 rounded-2xl shadow-xl text-white p-6 sm:p-8 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Intelligence Artificielle Générative</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
                            <i className="fas fa-brain text-yellow-400"></i>
                            <span>Assistant IA & Copilote Mécatronique</span>
                        </h1>
                        <p className="text-blue-100 text-sm mt-1 max-w-2xl">
                            Système d'assistance décisionnelle et de conformité aux normes EN 15864 / EN 16864 et cybersécurité NIS 2.
                        </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 text-xs font-mono">
                            <i className="fas fa-microchip text-yellow-400"></i>
                            <span className="text-slate-300">Modèle actif :</span>
                            <span className="font-bold text-white bg-blue-600/40 px-2 py-0.5 rounded border border-blue-400/30">
                                {aiStatus.model || 'gemini-3.8-flash'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                            <i className="fas fa-shield-alt"></i>
                            <span>Souveraineté NIS 2</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/15">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'chat'
                                ? 'bg-yellow-400 text-slate-900 shadow-lg'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <i className="fas fa-comments"></i>
                        <span>Copilote Conversationnel</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('analyzer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'analyzer'
                                ? 'bg-yellow-400 text-slate-900 shadow-lg'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <i className="fas fa-microscope"></i>
                        <span>Analyseur de Risque & Conformité</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('drafter')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'drafter'
                                ? 'bg-yellow-400 text-slate-900 shadow-lg'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <i className="fas fa-pen-nib"></i>
                        <span>Rédacteur de Justification</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'workflows'
                                ? 'bg-yellow-400 text-slate-900 shadow-lg'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <i className="fas fa-project-diagram"></i>
                        <span>Générateur de Workflows</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: CONVERSATIONAL COPILOT */}
            {activeTab === 'chat' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Chat Stream */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
                        {/* Messages Box */}
                        <div className="flex-1 p-5 overflow-y-auto space-y-4">
                            {messages.map((m) => {
                                const isUser = m.role === 'user';
                                return (
                                    <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isUser && (
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#002395] to-blue-700 text-white flex items-center justify-center shrink-0 text-xs shadow">
                                                <i className="fas fa-robot"></i>
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                                            isUser
                                                ? 'bg-[#002395] text-white rounded-tr-none'
                                                : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                                        }`}>
                                            <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-75">
                                                <span className="font-semibold">
                                                    {isUser ? 'Vous' : 'Copilote IA Mécatronique'}
                                                </span>
                                                <span>{m.timestamp}</span>
                                            </div>

                                            {/* Content */}
                                            <div className="whitespace-pre-line prose-sm">
                                                {m.content}
                                            </div>

                                            {/* Action bar for bot messages */}
                                            {!isUser && (
                                                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                        <span>{m.model || 'gemini-3.8-flash'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleCopy(m.content, m.id)}
                                                            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200/50 transition cursor-pointer"
                                                        >
                                                            <i className={`fas ${copySuccess === m.id ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                                                            <span>{copySuccess === m.id ? 'Copié !' : 'Copier'}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleInsertIntoRequest(m.content)}
                                                            className="text-[#002395] hover:text-blue-900 font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition cursor-pointer"
                                                        >
                                                            <i className="fas fa-plus-circle"></i>
                                                            <span>Insérer dans demande</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Suggested follow-up pills */}
                                            {!isUser && m.suggestions && m.suggestions.length > 0 && (
                                                <div className="mt-3 pt-2 border-t border-slate-200/50">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                                        Suggestions de questions :
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {m.suggestions.map((sug, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleSendMessage(sug)}
                                                                className="text-left text-xs bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-700 hover:text-[#002395] px-2.5 py-1 rounded-lg transition shadow-2xs cursor-pointer"
                                                            >
                                                                <i className="fas fa-arrow-right text-[10px] mr-1 text-slate-400"></i>
                                                                {sug}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {isUser && (
                                            <div className="h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs">
                                                <i className="fas fa-user"></i>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {isLoading && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-11">
                                    <i className="fas fa-spinner fa-spin text-blue-600"></i>
                                    <span>Gemini analyse et prépare la réponse...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Footer */}
                        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                            <input
                                id="ai-chat-input"
                                type="text"
                                value={inputPrompt}
                                onChange={(e) => setInputPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Posez une question sur les normes mécatroniques, habilitations, protocoles d'accès..."
                                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002395] focus:border-transparent"
                            />
                            <button
                                id="ai-chat-send"
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || !inputPrompt.trim()}
                                className="bg-[#002395] hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                                <span>Envoyer</span>
                                <i className="fas fa-paper-plane text-xs"></i>
                            </button>
                        </div>
                    </div>

                    {/* Sidebar with Preset Quick-Prompts */}
                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                <i className="fas fa-bolt text-yellow-500"></i>
                                <span>Modèles Rapides</span>
                            </h3>
                            <div className="space-y-2.5">
                                {PRESET_PROMPTS.map((p, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSendMessage(p.prompt)}
                                        className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 group-hover:text-[#002395]">
                                            <i className={`${p.icon} text-blue-600`}></i>
                                            <span>{p.title}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                            {p.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-sm text-xs space-y-2">
                            <div className="font-bold flex items-center gap-2 text-yellow-400">
                                <i className="fas fa-lock"></i>
                                <span>Conformité & Souveraineté</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-[11px]">
                                Les requêtes sont traitées conformément aux directives SecNumCloud et NIS 2. En l'absence de réseau externe, le moteur souverain heuristique prend le relais instantanément.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: REQUEST & RISK ANALYZER */}
            {activeTab === 'analyzer' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Form */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <i className="fas fa-file-signature text-[#002395]"></i>
                            <span>Paramètres de la Demande à Analyser</span>
                        </h3>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Titre de l'Intervention</label>
                            <input
                                type="text"
                                value={analyzerData.title}
                                onChange={(e) => setAnalyzerData({ ...analyzerData, title: e.target.value })}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#002395]"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Site Ferroviaire</label>
                                <input
                                    type="text"
                                    value={analyzerData.site_name}
                                    onChange={(e) => setAnalyzerData({ ...analyzerData, site_name: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#002395]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Équipement</label>
                                <input
                                    type="text"
                                    value={analyzerData.equipment_type}
                                    onChange={(e) => setAnalyzerData({ ...analyzerData, equipment_type: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#002395]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description Détaillée</label>
                            <textarea
                                rows={4}
                                value={analyzerData.description}
                                onChange={(e) => setAnalyzerData({ ...analyzerData, description: e.target.value })}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#002395]"
                            />
                        </div>
                        <button
                            id="btn-run-analysis"
                            onClick={handleRunAnalysis}
                            disabled={isAnalyzing}
                            className="w-full bg-[#002395] hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                            <i className={`fas ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-brain'}`}></i>
                            <span>{isAnalyzing ? 'Évaluation en cours...' : 'Lancer l\'Évaluation IA de Sécurité'}</span>
                        </button>
                    </div>

                    {/* Output Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        {analysisResult ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                        <i className="fas fa-clipboard-check text-emerald-600"></i>
                                        <span>Rapport d'Évaluation de Sécurité</span>
                                    </h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                                        analysisResult.risk_level === 'Élevé'
                                            ? 'bg-rose-100 text-rose-800'
                                            : analysisResult.risk_level === 'Modéré'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                        Risque : {analysisResult.risk_level}
                                    </span>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                                    <span className="font-bold text-slate-700 block mb-1">Urgence & Temporalité :</span>
                                    <p className="text-slate-600">{analysisResult.urgency}</p>
                                </div>

                                <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs">
                                    <span className="font-bold text-[#002395] block mb-1">Vérification de Conformité :</span>
                                    <p className="text-blue-900">{analysisResult.compliance_check}</p>
                                </div>

                                <div>
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Points Clés de Sécurité :</span>
                                    <ul className="space-y-1.5">
                                        {analysisResult.key_points?.map((pt: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                                <i className="fas fa-check-circle text-emerald-600 mt-0.5"></i>
                                                <span>{pt}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                                    <span className="font-bold text-amber-900 block mb-1">Recommandation au Validateur :</span>
                                    <p className="text-amber-800 font-medium">{analysisResult.recommendation}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                <i className="fas fa-microchip text-4xl text-slate-300 mb-3"></i>
                                <p className="text-sm font-semibold text-slate-600">Aucune analyse exécutée pour le moment</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Renseignez les détails de la demande à gauche puis cliquez sur "Lancer l'Évaluation IA" pour obtenir l'audit en temps réel.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: JUSTIFICATION DRAFTER */}
            {activeTab === 'drafter' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <i className="fas fa-pen-nib text-[#002395]"></i>
                            <span>Paramètres de Rédaction Assistée</span>
                        </h3>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Mots-clés ou Brouillon</label>
                            <textarea
                                rows={3}
                                value={draftInput}
                                onChange={(e) => setDraftInput(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#002395]"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Site</label>
                                <input
                                    type="text"
                                    value={draftSite}
                                    onChange={(e) => setDraftSite(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Matériel</label>
                                <input
                                    type="text"
                                    value={draftEquipment}
                                    onChange={(e) => setDraftEquipment(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <button
                            id="btn-run-draft"
                            onClick={handleRunDraft}
                            disabled={isDrafting}
                            className="w-full bg-[#002395] hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                            <i className={`fas ${isDrafting ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i>
                            <span>{isDrafting ? 'Rédaction en cours...' : 'Générer la Justification Formelle'}</span>
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        {draftResult ? (
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <i className="fas fa-file-alt text-blue-600"></i>
                                    <span>Texte Justificatif Recommandé</span>
                                </h4>
                                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 text-sm text-slate-800 leading-relaxed">
                                    "{draftResult}"
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => handleCopy(draftResult, 'draft')}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <i className={`fas ${copySuccess === 'draft' ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                                        <span>{copySuccess === 'draft' ? 'Copié dans le presse-papier !' : 'Copier le texte'}</span>
                                    </button>
                                    <button
                                        onClick={() => handleInsertIntoRequest(draftResult)}
                                        className="flex-1 bg-[#002395] hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <i className="fas fa-share-square"></i>
                                        <span>Créer la Demande</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                <i className="fas fa-feather-alt text-4xl text-slate-300 mb-3"></i>
                                <p className="text-sm font-semibold text-slate-600">En attente de génération</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Saisissez quelques mots-clés pour obtenir une rédaction enrichie et conforme aux exigences ferroviaires.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: WORKFLOW GENERATOR */}
            {activeTab === 'workflows' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <i className="fas fa-project-diagram text-[#002395]"></i>
                            <span>Générateur de Processus par IA</span>
                        </h3>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description du Processus Souhaité</label>
                            <textarea
                                rows={4}
                                value={workflowPrompt}
                                onChange={(e) => setWorkflowPrompt(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#002395]"
                            />
                        </div>
                        <button
                            id="btn-run-workflow"
                            onClick={handleRunWorkflow}
                            disabled={isGeneratingWorkflow}
                            className="w-full bg-[#002395] hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                            <i className={`fas ${isGeneratingWorkflow ? 'fa-spinner fa-spin' : 'fa-sitemap'}`}></i>
                            <span>{isGeneratingWorkflow ? 'Modélisation en cours...' : 'Modéliser le Workflow'}</span>
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        {workflowResult ? (
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <i className="fas fa-network-wired text-purple-600"></i>
                                    <span>{workflowResult.workflow_name}</span>
                                </h4>
                                <p className="text-xs text-slate-600">{workflowResult.description}</p>

                                <div>
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Étapes Séquentielles Modélisées :</span>
                                    <div className="space-y-2">
                                        {workflowResult.stages?.map((stg: any, i: number) => (
                                            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{i + 1}. {stg.name}</span>
                                                    <span className="text-slate-500">Rôle : {stg.assignedRole} • SLA : {stg.slaHours}h</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                                                    Obligatoire
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                <i className="fas fa-sitemap text-4xl text-slate-300 mb-3"></i>
                                <p className="text-sm font-semibold text-slate-600">Aucun workflow modélisé</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Exprimez vos exigences métier à gauche pour générer instantanément l'architecture d'un circuit de validation.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
